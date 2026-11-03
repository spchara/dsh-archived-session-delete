/**
 * Host-half check for @local/archived-session-delete.
 *
 * Drives the registered route handler with fake request/response objects and a
 * fake registry over a REAL temporary session directory, so the deletion
 * semantics (log directory removed, registry cleaned up, guards refused) are
 * exercised without the running profile or a browser.
 *
 * Run: node test/host.route.mjs
 */

import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply, inject, name } from '../index.js'

let failures = 0
const check = (label, condition, detail = '') => {
  if (condition) {
    console.log(`  ok   ${label}`)
    return
  }
  failures += 1
  console.log(`  FAIL ${label}${detail === '' ? '' : ` — ${detail}`}`)
}

/** Request stand-in: an async iterable body plus the fields the handler reads. */
function makeRequest(method, contentType, body) {
  const bytes = Buffer.from(body, 'utf8')
  return {
    method,
    headers: contentType === null ? {} : { 'content-type': contentType },
    destroyed: false,
    async *[Symbol.asyncIterator]() {
      yield bytes
    },
    resume() {},
  }
}

/** Response stand-in capturing status, headers, and body. */
function makeResponse() {
  const res = {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(key, value) { res.headers[key] = value },
    end(chunk) { if (chunk !== undefined) res.body += chunk; res.ended = true },
    json() { return JSON.parse(res.body) },
  }
  return res
}

/** Build one plugin context whose route handler can be invoked directly. */
function makeContext(services, routes) {
  const ctx = {
    logger: { warn() {} },
    effect(callback) {
      const disposer = callback()
      return typeof disposer === 'function' ? disposer : () => {}
    },
    webServer: {
      register(route) {
        routes.set(route.path, route.handler)
        return () => routes.delete(route.path)
      },
    },
    get(service) { return services[service] },
  }
  // Cordis refuses a bare `ctx.<service>` property that the plugin did not
  // declare in `inject`; reproduce that here so the check fails the same way
  // the browser did instead of passing on a lenient fake.
  for (const key of Object.keys(services)) {
    if (key === 'webServer') continue
    Object.defineProperty(ctx, key, {
      configurable: true,
      get() { throw new Error(`cannot get property "${key}" without inject`) },
    })
  }
  return ctx
}

/** Drive one request through the registered handler. */
async function call(routes, options) {
  const res = makeResponse()
  const handler = routes.get('/archived-session-delete/purge')
  if (handler === undefined) throw new Error('route not registered')
  await handler(makeRequest(options.method, options.contentType, options.body), res)
  return res
}

const root = await mkdtemp(join(tmpdir(), 'asd-host-check-'))
try {
  console.log(`module: ${name}, inject: ${inject.join(',')}`)

  // A real stored-log layout: <root>/<project>/<session>/<log file>
  const logDir = join(root, 'proj', 's-temp')
  const logFile = join(logDir, 'session.4.jsonl')
  await mkdir(logDir, { recursive: true })
  await writeFile(logFile, '{"type":"session/start"}\n', 'utf8')

  const archived = new Set(['s-temp', 's-live'])
  const pinned = new Set(['s-temp'])
  const detached = []
  const workspace = {
    id: 'ws-one',
    sessionIds: ['s-temp'],
    async detachSession(id) { detached.push(id) },
  }
  const registry = {
    get archivedSessionIds() { return [...archived] },
    async unarchiveSession(id) { archived.delete(id) },
    async unpinSession(id) { pinned.delete(id) },
    list() { return [workspace] },
  }
  const persistence = {
    async stat(id) {
      if (id === 's-temp') return { location: { kind: 'jsonl', path: logFile } }
      return undefined
    },
  }
  const sessions = { get(id) { return id === 's-live' ? {} : undefined } }

  const routes = new Map()
  const ctx = makeContext({ workspaceRegistry: registry, sessionPersistence: persistence, sessions }, routes)
  apply(ctx)
  check('route registered at the documented path', routes.has('/archived-session-delete/purge'))

  // 405 for a non-POST method.
  let res = await call(routes, { method: 'GET', contentType: 'application/json', body: '' })
  check('GET is refused with 405', res.statusCode === 405, `status ${res.statusCode}`)

  // 415 for a non-JSON media type.
  res = await call(routes, { method: 'POST', contentType: 'text/plain', body: '{}' })
  check('non-JSON body is refused with 415', res.statusCode === 415, `status ${res.statusCode}`)

  // 400 for a missing / malformed sessionId.
  res = await call(routes, { method: 'POST', contentType: 'application/json', body: '{"sessionId":"../etc"}' })
  check('path-like session id is refused with 400', res.statusCode === 400, `status ${res.statusCode}`)

  // 409 for a session outside the archive set.
  res = await call(routes, { method: 'POST', contentType: 'application/json', body: '{"sessionId":"s-other"}' })
  check('unarchived session is refused with 409', res.statusCode === 409 && res.json().code === 'session-not-archived')

  // 409 for a live session.
  res = await call(routes, { method: 'POST', contentType: 'application/json', body: '{"sessionId":"s-live"}' })
  check('live session is refused with 409', res.statusCode === 409 && res.json().code === 'session-live')

  // The real deletion.
  res = await call(routes, { method: 'POST', contentType: 'application/json', body: '{"sessionId":"s-temp"}' })
  const payload = res.json()
  check('deletion answers 200', res.statusCode === 200, `status ${res.statusCode} ${res.body}`)
  check('deletion reports the removed directory', payload.logDir === logDir, String(payload.logDir))
  check('no warnings on the happy path', Array.isArray(payload.warnings) && payload.warnings.length === 0)

  let logDirGone = false
  try {
    await stat(logDir)
  } catch {
    logDirGone = true
  }
  check('session log directory is removed from disk', logDirGone)
  check('archive record is cleared', !archived.has('s-temp'))
  check('pin is cleared', !pinned.has('s-temp'))
  check('workspace account is detached', detached.includes('s-temp'))

  // A second call is refused because the session is no longer archived.
  res = await call(routes, { method: 'POST', contentType: 'application/json', body: '{"sessionId":"s-temp"}' })
  check('repeating the deletion is refused, not repeated', res.statusCode === 409)

  // A failed filesystem removal must leave the archive record untouched.
  const lockedDir = join(root, 'proj', 's-locked')
  await mkdir(lockedDir, { recursive: true })
  const lockedFile = join(lockedDir, 'session.4.jsonl')
  await writeFile(lockedFile, 'x\n', 'utf8')
  archived.add('s-locked')
  const failRoutes = new Map()
  // Point the removal step under a regular file, so the directory removal is
  // refused by the filesystem itself (ENOTDIR) rather than by the fake.
  const failingPersistence = {
    async stat() {
      return { location: { kind: 'jsonl', path: join(lockedFile, 'not-a-dir', 'session.jsonl') } }
    },
  }
  apply(makeContext({ workspaceRegistry: registry, sessionPersistence: failingPersistence, sessions }, failRoutes))
  res = await call(failRoutes, { method: 'POST', contentType: 'application/json', body: '{"sessionId":"s-locked"}' })
  check('a failing removal answers 500', res.statusCode === 500, `status ${res.statusCode} ${res.body}`)
  check('a failing removal keeps the archive record', archived.has('s-locked'))
} finally {
  await rm(root, { recursive: true, force: true })
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
process.exitCode = failures === 0 ? 0 : 1
