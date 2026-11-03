/**
 * Host-half check for @local/archived-session-delete.
 *
 * Drives the registered route handler with fake request/response objects and a
 * fake registry over REAL temporary session directories, so the deletion
 * semantics (log directory removed, registry cleaned up, per-Session refusals,
 * batch isolation) are exercised without the running profile or a browser.
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

/** One archived Session's log layout under the temporary root. */
async function makeLog(root, id) {
  const dir = join(root, 'proj', id)
  const file = join(dir, 'session.4.jsonl')
  await mkdir(dir, { recursive: true })
  await writeFile(file, '{"type":"turn/start"}\n', 'utf8')
  return { dir, file }
}

/** Whether a path is gone. */
async function gone(path) {
  try {
    await stat(path)
    return false
  } catch {
    return true
  }
}

const root = await mkdtemp(join(tmpdir(), 'asd-host-check-'))
try {
  console.log(`module: ${name}, inject: ${inject.join(',')}`)

  const logs = new Map()
  for (const id of ['s-one', 's-two', 's-live', 's-locked']) logs.set(id, await makeLog(root, id))

  const archived = new Set(['s-one', 's-two', 's-live', 's-locked'])
  const pinned = new Set(['s-one', 's-two'])
  const detached = []
  const workspaces = [
    { id: 'ws-one', sessionIds: ['s-one', 's-two'], async detachSession(id) { detached.push(id) } },
    { id: 'ws-two', sessionIds: ['s-two'], async detachSession(id) { detached.push(`two:${id}`) } },
  ]
  const registry = {
    get archivedSessionIds() { return [...archived] },
    async unarchiveSession(id) { archived.delete(id) },
    async unpinSession(id) { pinned.delete(id) },
    list() { return workspaces },
  }
  const persistence = {
    async stat(id) {
      if (id === 's-locked') return { location: { kind: 'jsonl', path: join(logs.get(id).file, 'not-a-dir', 'session.jsonl') } }
      const entry = logs.get(id)
      return entry === undefined ? undefined : { location: { kind: 'jsonl', path: entry.file } }
    },
  }
  const sessions = { get(id) { return id === 's-live' ? {} : undefined } }

  const routes = new Map()
  apply(makeContext({ workspaceRegistry: registry, sessionPersistence: persistence, sessions }, routes))
  check('route registered at the documented path', routes.has('/archived-session-delete/purge'))

  // ---- envelope guards -----------------------------------------------------
  let res = await call(routes, { method: 'GET', contentType: 'application/json', body: '' })
  check('GET is refused with 405', res.statusCode === 405, `status ${res.statusCode}`)

  res = await call(routes, { method: 'POST', contentType: 'text/plain', body: '{}' })
  check('non-JSON body is refused with 415', res.statusCode === 415, `status ${res.statusCode}`)

  res = await call(routes, { method: 'POST', contentType: 'application/json', body: '{"sessionIds":["../etc"]}' })
  check('path-like session id is refused with 400', res.statusCode === 400, `status ${res.statusCode}`)

  res = await call(routes, { method: 'POST', contentType: 'application/json', body: '{"sessionIds":[]}' })
  check('empty id list is refused with 400', res.statusCode === 400, `status ${res.statusCode}`)

  const tooMany = JSON.stringify({ sessionIds: Array.from({ length: 201 }, (_, index) => `s-${String(index)}`) })
  res = await call(routes, { method: 'POST', contentType: 'application/json', body: tooMany })
  check('over-long batch is refused with 400', res.statusCode === 400, `status ${res.statusCode}`)

  // ---- per-Session refusals (data, not HTTP failures) ----------------------
  res = await call(routes, { method: 'POST', contentType: 'application/json', body: '{"sessionIds":["s-other"]}' })
  check('unarchived session reports session-not-archived', res.statusCode === 200
    && res.json().results[0].ok === false
    && res.json().results[0].code === 'session-not-archived', res.body)

  res = await call(routes, { method: 'POST', contentType: 'application/json', body: '{"sessionIds":["s-live"]}' })
  check('live session reports session-live', res.statusCode === 200
    && res.json().results[0].code === 'session-live', res.body)

  // ---- one deletion --------------------------------------------------------
  res = await call(routes, { method: 'POST', contentType: 'application/json', body: '{"sessionIds":["s-one"]}' })
  const single = res.json().results[0]
  check('deletion answers 200 with an ok result', res.statusCode === 200 && single.ok === true, res.body)
  check('deletion reports the removed directory', single.logDir === logs.get('s-one').dir, String(single.logDir))
  check('no warnings on the happy path', Array.isArray(single.warnings) && single.warnings.length === 0)
  check('session log directory is removed from disk', await gone(logs.get('s-one').dir))
  check('archive record is cleared', !archived.has('s-one'))
  check('pin is cleared', !pinned.has('s-one'))
  check('every workspace account is detached', detached.includes('s-one'))

  res = await call(routes, { method: 'POST', contentType: 'application/json', body: '{"sessionIds":["s-one"]}' })
  check('repeating the deletion is refused, not repeated', res.statusCode === 200
    && res.json().results[0].code === 'session-not-archived', res.body)

  // ---- a batch keeps going past a refusal ----------------------------------
  detached.length = 0
  res = await call(routes, {
    method: 'POST',
    contentType: 'application/json',
    body: '{"sessionIds":["s-two","s-other","s-two"]}',
  })
  const batch = res.json().results
  check('batch answers one entry per distinct id', batch.length === 2, JSON.stringify(batch))
  check('batch deletes the archived Session', batch[0].sessionId === 's-two' && batch[0].ok === true)
  check('batch continues past a refused Session', batch[1].code === 'session-not-archived')
  check('batch removes that log too', await gone(logs.get('s-two').dir))
  check('batch detaches from every accounting workspace', detached.includes('s-two') && detached.includes('two:s-two'))

  // ---- a failed filesystem removal changes nothing -------------------------
  res = await call(routes, { method: 'POST', contentType: 'application/json', body: '{"sessionIds":["s-locked"]}' })
  check('a failing removal reports delete-failed', res.statusCode === 200
    && res.json().results[0].code === 'delete-failed', res.body)
  check('a failing removal keeps the archive record', archived.has('s-locked'))
  check('a failing removal keeps the log on disk', !(await gone(logs.get('s-locked').dir)))
} finally {
  await rm(root, { recursive: true, force: true })
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
process.exitCode = failures === 0 ? 0 : 1
