/**
 * Host-half check for @local/archived-session-delete.
 *
 * Drives the registered route handler with fake request/response objects and a
 * fake registry over REAL temporary session directories.
 *
 * The fake backend follows the DEPLOYED contract, not a convenient one: on
 * 0.2.1 releases `sessionPersistence.stat()` returns `{ revision, sizeBytes,
 * formatStatus }` with NO `location`, so a deletion must resolve the session
 * directory from `$DSH_HOME/sessions/<project>/<id>/` itself. A snapshot that
 * yields no locatable directory must fail and leave the registry untouched —
 * the regression this file exists to lock down.
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
    logger: { warn() {}, debug() {} },
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
// The deferred queue and the sessions tree both hang off the Harness home.
process.env.DSH_HOME = root
const sessionsRoot = join(root, 'sessions')
const pendingFile = join(root, 'archived-session-delete', 'pending.json')

/** One Session's stored log at the layout the real backend uses. */
async function makeLog(id, project) {
  const dir = join(sessionsRoot, project, id)
  const file = join(dir, 'session.v4.jsonl.zstd')
  await mkdir(dir, { recursive: true })
  await writeFile(file, 'stored log\n', 'utf8')
  return { dir, file }
}

try {
  console.log(`module: ${name}, inject: ${inject.join(',')}`)

  const logs = new Map()
  logs.set('s-one', await makeLog('s-one', 'proj-one'))
  logs.set('s-two', await makeLog('s-two', 'proj-one'))
  logs.set('s-plain', await makeLog('s-plain', 'proj-two'))
  logs.set('s-live', await makeLog('s-live', 'proj-two'))
  logs.set('s-busy', await makeLog('s-busy', 'proj-two'))
  logs.set('s-kept', await makeLog('s-kept', 'proj-one'))
  // A backend answer whose path is a regular file, not a session directory.
  const notADir = join(root, 'proj', 's-bad')
  await mkdir(join(root, 'proj'), { recursive: true })
  await writeFile(notADir, 'not a directory\n', 'utf8')

  const archived = new Set(['s-one', 's-two', 's-live', 's-busy', 's-unlocatable', 's-bad'])
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
      if (id === 's-bad') {
        // 0.2.2-alpha style answer naming a path that is not a session directory.
        return { revision: 'rev-bad', location: { kind: 'jsonl', path: join(notADir, 'session.jsonl') } }
      }
      if (id === 's-unlocatable') {
        // A stored artifact the plugin cannot resolve: present, no location, no directory.
        return { revision: 'rev-x', sizeBytes: 1, formatStatus: 'current' }
      }
      const entry = logs.get(id)
      if (entry === undefined) return undefined
      // The real backend re-reads the file, so a deleted log is no longer found.
      if (await gone(entry.dir)) return undefined
      // The deployed 0.2.1 contract: NO location field.
      return { revision: revisions.get(id) ?? 'rev-1', sizeBytes: 12, formatStatus: 'current' }
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

  // ---- deletion with the DEPLOYED contract (no snapshot location) ----------
  res = await call(routes, { method: 'POST', contentType: 'application/json', body: '{"sessionIds":["s-one"]}' })
  const single = res.json().results[0]
  check('deletion without a snapshot location still succeeds', res.statusCode === 200
    && single.ok === true, res.body)
  check('the located directory is reported', single.logDir === logs.get('s-one').dir, String(single.logDir))
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

  // ---- REGRESSION: an unresolvable log must fail, never "succeed" ----------
  res = await call(routes, { method: 'POST', contentType: 'application/json', body: '{"sessionIds":["s-unlocatable"]}' })
  const unresolved = res.json().results[0]
  check('an unresolvable log reports delete-failed', res.statusCode === 200
    && unresolved.ok === false && unresolved.code === 'delete-failed', res.body)
  check('an unresolvable log is NOT unarchived', archived.has('s-unlocatable'))
  check('an unresolvable log returns no success envelope', unresolved.logDir === undefined)

  res = await call(routes, { method: 'POST', contentType: 'application/json', body: '{"sessionIds":["s-bad"]}' })
  check('a named path that is not a session directory reports delete-failed', res.statusCode === 200
    && res.json().results[0].code === 'delete-failed', res.body)
  check('a refused deletion keeps the archive record', archived.has('s-bad'))
  check('a refused deletion leaves that path alone', !(await gone(notADir)))

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
  const restart = makeContext({
    workspaceRegistry: registry,
    sessionPersistence: persistence,
    sessions: { get() { return undefined } },
  }, new Map())
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

  // ---- a queued entry whose log cannot be located stays queued -------------
  await writeFile(pendingFile, JSON.stringify({
    version: 1,
    entries: [{ sessionId: 's-unlocatable', revision: 'rev-x', queuedAt: '2026-01-01T00:00:00.000Z' }],
  }), 'utf8')
  await drainDeferred(restart)
  const stuck = JSON.parse(await readFile(pendingFile, 'utf8'))
  check('a queued log that cannot be located is retried later, not dropped', stuck.entries.length === 1
    && stuck.entries[0].sessionId === 's-unlocatable', JSON.stringify(stuck))

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
} finally {
  await rm(root, { recursive: true, force: true })
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
process.exitCode = failures === 0 ? 0 : 1
