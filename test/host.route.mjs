/**
 * Host-half check for @local/archived-session-delete.
 *
 * Drives the registered route handler with fake request/response objects and a
 * fake registry over REAL temporary session directories, so the deletion
 * semantics (log directory removed, registry cleaned up, per-Session refusals,
 * batch isolation, deferred removal of a Session that is still open) are
 * exercised without the running profile or a browser.
 *
 * Run: node test/host.route.mjs
 */

import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply, drainDeferred, inject, name } from '../index.js'

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

/**
 * Build one plugin context whose route handler can be invoked directly.
 * @param services - service stand-ins reachable through `get`.
 * @param routes - sink for registered routes.
 * @param state - mutable test knobs (`activity`, `injected`).
 */
function makeContext(services, routes, state = {}) {
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
    // The startup drain is wired through `inject`; record it instead of running it.
    inject(deps, callback) {
      state.injected = deps
      state.injectedCallback = callback
      return () => {}
    },
    // `workspace/session-activity`: whatever the test declared as running work.
    waterfall(_name, _payload, fallback) {
      const activity = state.activity ?? []
      return activity.length === 0 ? fallback() : Promise.resolve(activity)
    },
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

/** One Session's log layout under the temporary root. */
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
// The deferred queue lives under the Harness home; point it at the temp root.
process.env.DSH_HOME = root
const pendingFile = join(root, 'archived-session-delete', 'pending.json')

try {
  console.log(`module: ${name}, inject: ${inject.join(',')}`)

  const logs = new Map()
  for (const id of ['s-one', 's-two', 's-plain', 's-live', 's-busy', 's-kept']) {
    logs.set(id, await makeLog(root, id))
  }
  // A backend answer that is not a session directory: this id's "log path"
  // hangs off a regular file, so the directory precheck must refuse it.
  const notADir = join(root, 'proj', 's-bad')
  await writeFile(notADir, 'not a directory\n', 'utf8')

  const archived = new Set(['s-one', 's-two', 's-live', 's-busy', 's-bad'])
  const pinned = new Set(['s-one', 's-two'])
  const detached = []
  const workspaces = [
    { id: 'ws-one', sessionIds: ['s-one', 's-two', 's-plain', 's-live'], async detachSession(id) { detached.push(id) } },
    { id: 'ws-two', sessionIds: ['s-two'], async detachSession(id) { detached.push(`two:${id}`) } },
  ]
  const registry = {
    get archivedSessionIds() { return [...archived] },
    async unarchiveSession(id) { archived.delete(id) },
    async unpinSession(id) { pinned.delete(id) },
    list() { return workspaces },
  }
  const revisions = new Map()
  const persistence = {
    async stat(id) {
      if (id === 's-bad') return { location: { kind: 'jsonl', path: join(notADir, 'session.jsonl') } }
      const entry = logs.get(id)
      if (entry === undefined) return undefined
      // The real backend re-reads the file, so a deleted log is no longer found.
      if (await gone(entry.dir)) return undefined
      return { location: { kind: 'jsonl', path: entry.file }, revision: revisions.get(id) ?? 'rev-1' }
    },
  }
  const live = new Set(['s-live', 's-busy'])
  const sessions = { get(id) { return live.has(id) ? {} : undefined } }

  const state = { activity: [] }
  const routes = new Map()
  const ctx = makeContext({ workspaceRegistry: registry, sessionPersistence: persistence, sessions }, routes, state)
  apply(ctx)
  check('route registered at the documented path', routes.has('/archived-session-delete/purge'))
  check('startup drain is wired through inject', Array.isArray(state.injected)
    && state.injected.includes('sessionPersistence')
    && state.injected.includes('workspaceRegistry'), JSON.stringify(state.injected))

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
  check('unknown id reports session-not-found', res.statusCode === 200
    && res.json().results[0].ok === false
    && res.json().results[0].code === 'session-not-found', res.body)

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
    && res.json().results[0].code === 'session-not-found', res.body)

  // ---- a Session that was never archived deletes just the same -------------
  detached.length = 0
  res = await call(routes, { method: 'POST', contentType: 'application/json', body: '{"sessionIds":["s-plain"]}' })
  const plain = res.json().results[0]
  check('unarchived Session is deleted', res.statusCode === 200 && plain.ok === true, res.body)
  check('unarchived Session loses its log too', await gone(logs.get('s-plain').dir))
  check('unarchived Session is detached from its workspace', detached.includes('s-plain'))

  // ---- a Session that is still open is deferred, not refused ---------------
  detached.length = 0
  res = await call(routes, { method: 'POST', contentType: 'application/json', body: '{"sessionIds":["s-live"]}' })
  const deferred = res.json().results[0]
  check('open Session answers ok with deferred', res.statusCode === 200
    && deferred.ok === true && deferred.deferred === true, res.body)
  check('open Session leaves its log for the next start', !(await gone(logs.get('s-live').dir)))
  check('open Session is removed from the archive set now', !archived.has('s-live'))
  check('open Session is detached from its workspace now', detached.includes('s-live'))
  const queued = JSON.parse(await readFile(pendingFile, 'utf8'))
  check('open Session is queued with its log revision', queued.entries.length === 1
    && queued.entries[0].sessionId === 's-live'
    && queued.entries[0].revision === 'rev-1', JSON.stringify(queued))

  // ---- a Session that is still working is refused --------------------------
  state.activity = [{ kind: 'turn' }]
  res = await call(routes, { method: 'POST', contentType: 'application/json', body: '{"sessionIds":["s-busy"]}' })
  check('working Session reports session-busy', res.statusCode === 200
    && res.json().results[0].code === 'session-busy', res.body)
  check('working Session keeps its log', !(await gone(logs.get('s-busy').dir)))
  state.activity = []

  // ---- the next start drains the queue -------------------------------------
  const restart = makeContext({ workspaceRegistry: registry, sessionPersistence: persistence, sessions: { get() { return undefined } } }, new Map())
  await drainDeferred(restart)
  check('drain removes the queued log', await gone(logs.get('s-live').dir))
  const afterDrain = JSON.parse(await readFile(pendingFile, 'utf8'))
  check('drain empties the queue', afterDrain.entries.length === 0, JSON.stringify(afterDrain))

  // ---- a log touched after queueing is left alone --------------------------
  live.add('s-kept')
  revisions.set('s-kept', 'rev-1')
  res = await call(routes, { method: 'POST', contentType: 'application/json', body: '{"sessionIds":["s-kept"]}' })
  check('a second open Session is queued too', res.json().results[0].deferred === true, res.body)
  revisions.set('s-kept', 'rev-2')
  await drainDeferred(restart)
  check('a log changed since queueing survives the drain', !(await gone(logs.get('s-kept').dir)))
  const keptQueue = JSON.parse(await readFile(pendingFile, 'utf8'))
  check('a changed log cancels its queued deletion', keptQueue.entries.length === 0, JSON.stringify(keptQueue))

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
  check('batch continues past a refused Session', batch[1].code === 'session-not-found')
  check('batch removes that log too', await gone(logs.get('s-two').dir))
  check('batch detaches from every accounting workspace', detached.includes('s-two') && detached.includes('two:s-two'))

  // ---- a refused path changes nothing --------------------------------------
  res = await call(routes, { method: 'POST', contentType: 'application/json', body: '{"sessionIds":["s-bad"]}' })
  check('a non-directory log path reports delete-failed', res.statusCode === 200
    && res.json().results[0].code === 'delete-failed', res.body)
  check('a refused deletion keeps the archive record', archived.has('s-bad'))
  check('a refused deletion leaves that path alone', !(await gone(notADir)))
} finally {
  await rm(root, { recursive: true, force: true })
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
process.exitCode = failures === 0 ? 0 : 1
