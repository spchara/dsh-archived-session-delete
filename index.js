/**
 * Host half of archived-session-delete: one route,
 * `POST /archived-session-delete/purge`, that removes Conversations for good —
 * one Session, or a batch of them. An archived Session and a plain one are
 * deleted the same way; the only difference is that the archived one also has
 * a record in the archive set to clear.
 *
 * The order of operations is deliberate, and applies per Session. The log
 * directory is removed first: that is the step that can fail for an external
 * reason (a Windows sharing violation, a permission refusal), and failing it
 * must leave the registry records untouched so the row still shows and the
 * user can retry. Only after the log is gone are those records cleaned up —
 * the archive set, the pin, and every Workspace account that still lists the
 * Session — with each cleanup step reported as a warning instead of discarding
 * a deletion that already happened.
 *
 * A batch answers `200` with one entry per Session: one that is unknown, or
 * still live, is that entry's refusal and never stops the rest of the batch.
 *
 * Guards: the trust fence (`connection.requestRejection`) answers before
 * anything else, the caller must use POST with an `application/json` body, and
 * every named Session must be identifiable (a stored log, or an archive record)
 * and not live (a live Session owns a write handle).
 *
 * @module archived-session-delete
 */

import { dirname } from 'node:path'
import { rm, stat } from 'node:fs/promises'

/** Cordis function-plugin name. */
export const name = 'archived-session-delete'

/** The route carrier; every other service is read through `ctx.get`. */
export const inject = ['webServer']

/** Absolute pathname the Host registers; the browser addresses it document-relative. */
const PURGE_PATH = '/archived-session-delete/purge'

/** A request body is a short id list; anything larger is hostile. */
const MAX_BODY_BYTES = 32 * 1024

/** One request may name at most this many Sessions. */
const MAX_BATCH = 200

/** Accepted Session id shape: no path separators, so a crafted id can never steer a deletion. */
const SESSION_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/

/**
 * Register the purge route on the composition's web server.
 * @param ctx - the plugin context carrying `webServer`.
 */
export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: PURGE_PATH,
    handler: (req, res) => {
      // The handler owns its own error reporting; this catch is the last resort
      // so a bug cannot leave the browser waiting on a half-written response.
      // The promise is returned so a caller (and a test) can await completion.
      return purge(ctx, req, res).catch((failure) => {
        try {
          sendJson(res, 500, { code: 'internal', message: messageOf(failure) })
        } catch {
          // The response was already ended; nothing is left to report.
        }
      })
    },
  }), `archived-session-delete: POST ${PURGE_PATH}`)
}

/**
 * Answer one purge request: validate the envelope, then delete each named
 * Session and report it separately.
 * @param ctx - the plugin context (services are read here, not captured).
 * @param req - the incoming request.
 * @param res - the response to complete.
 */
async function purge(ctx, req, res) {
  if (rejectUntrusted(ctx, req, res)) return
  if (req.method !== 'POST') {
    sendMethodNotAllowed(res, 'POST')
    return
  }
  if (mediaTypeOf(req) !== 'application/json') {
    sendJson(res, 415, { code: 'unsupported-media-type', message: 'content-type must be application/json' })
    return
  }
  let raw
  try {
    raw = await readBoundedBody(req)
  } catch {
    // A connection that dies mid-body leaves nothing to answer precisely.
    sendJson(res, 400, { code: 'bad-request', message: 'request body unreadable' })
    return
  }
  if (raw === null) {
    sendJson(res, 413, { code: 'payload-too-large', message: 'request body is too large' })
    return
  }
  let payload
  try {
    payload = JSON.parse(raw)
  } catch {
    payload = null
  }
  const sessionIds = requestedIds(payload)
  if (sessionIds === null) {
    sendJson(res, 400, {
      code: 'bad-request',
      message: `request body must carry "sessionIds" with 1 to ${String(MAX_BATCH)} session ids`,
    })
    return
  }

  // Read every service through `ctx.get`: a bare `ctx.<name>` property throws
  // in Cordis unless the name is declared in `inject`, and this plugin must
  // still load where an optional service is missing.
  const registry = ctx.get('workspaceRegistry')
  if (registry === undefined) {
    sendJson(res, 501, {
      code: 'unsupported',
      message: 'this composition has no workspace registry, so there is no archive set to clean up',
    })
    return
  }
  const persistence = ctx.get('sessionPersistence')
  if (persistence === undefined) {
    sendJson(res, 501, {
      code: 'unsupported',
      message: 'this composition has no session persistence, so there is no stored log to delete',
    })
    return
  }
  const sessions = ctx.get('sessions')

  const results = []
  for (const sessionId of sessionIds) {
    results.push(await purgeOne({ ctx, registry, persistence, sessions }, sessionId))
  }
  sendJson(res, 200, { results })
}

/**
 * Normalize the request body into a de-duplicated id list.
 * @param payload - the parsed JSON body.
 * @returns the ids, or null when the body is unusable.
 */
function requestedIds(payload) {
  const raw = Array.isArray(payload?.sessionIds)
    ? payload.sessionIds
    : (typeof payload?.sessionId === 'string' ? [payload.sessionId] : null)
  if (raw === null || raw.length === 0 || raw.length > MAX_BATCH) return null
  const ids = []
  for (const value of raw) {
    if (typeof value !== 'string' || !SESSION_ID.test(value)) return null
    if (!ids.includes(value)) ids.push(value)
  }
  return ids
}

/**
 * Delete one Session, archived or not.
 *
 * Existence is decided by the backend, not by the archive set: a Session is
 * deletable when session persistence holds a log for it, or when the archive
 * set still names it (an archived Session may be record-only). An id that is
 * neither is a typo or a stale reference, and is refused instead of being
 * reported as deleted.
 *
 * @param services - the services resolved for this request.
 * @param sessionId - the Session to remove.
 * @returns one result entry; a refusal is data, not a thrown error.
 */
async function purgeOne({ ctx, registry, persistence, sessions }, sessionId) {
  const refuse = (code, message) => ({ sessionId, ok: false, code, message })

  if (sessions !== undefined && sessions.get(sessionId) !== undefined) {
    return refuse('session-live', `session '${sessionId}' is live in this process; close it before deleting it`)
  }
  const archived = registry.archivedSessionIds.includes(sessionId)

  // Step 1: the stored log directory. Failing here changes nothing else.
  let logDir = null
  try {
    const snapshot = await persistence.stat(sessionId)
    if (snapshot === undefined && !archived) {
      return refuse('session-not-found', `session '${sessionId}' has no stored log and is not archived`)
    }
    const path = snapshot?.location?.path
    if (typeof path === 'string' && path.length > 0) {
      logDir = dirname(path)
      // The backend's answer is a precondition, not a fact: only a real
      // directory is removed, so a snapshot naming something else refuses
      // instead of reporting a deletion that never happened.
      const before = await stat(logDir)
      if (!before.isDirectory()) {
        throw new Error(`the stored log path is not inside a session directory: ${path}`)
      }
      await rm(logDir, { recursive: true, force: true })
      // `force` also suppresses a path that resolves through a non-directory,
      // so the removal is proved by the path being gone, not by rm resolving.
      if (await exists(logDir)) {
        throw new Error(`the stored log directory is still there: ${logDir}`)
      }
    }
  } catch (failure) {
    return refuse('delete-failed', `cannot delete the stored log of session '${sessionId}': ${messageOf(failure)}`)
  }

  // Step 2: the records that still point at it. The log is already gone, so a
  // failure here is reported beside a successful deletion instead of undoing it.
  const warnings = []
  const cleanup = async (label, action) => {
    try {
      await action()
    } catch (failure) {
      warnings.push(`${label}: ${messageOf(failure)}`)
      ctx.logger?.warn?.(`archived-session-delete: ${label} of '${sessionId}' failed: ${messageOf(failure)}`)
    }
  }
  await cleanup('unarchive', () => registry.unarchiveSession(sessionId))
  await cleanup('unpin', () => registry.unpinSession(sessionId))
  for (const workspace of registry.list()) {
    if (!workspace.sessionIds.includes(sessionId)) continue
    await cleanup(`detach from workspace '${workspace.id}'`, () => workspace.detachSession(sessionId))
  }

  return { sessionId, ok: true, logDir, warnings }
}

/**
 * Ask the composition's connection service whether this request is untrusted.
 * @param ctx - the plugin context.
 * @param req - the incoming request.
 * @param res - the response to complete on a refusal.
 * @returns whether a refusal was written.
 */
function rejectUntrusted(ctx, req, res) {
  const connection = ctx.get('connection')
  if (connection === undefined || typeof connection.requestRejection !== 'function') return false
  const rejection = connection.requestRejection(req)
  if (rejection === undefined) return false
  res.statusCode = rejection
  res.end()
  return true
}

/** Exact media-type essence, lowercased; `String(undefined)` never matches. */
function mediaTypeOf(req) {
  return String(req.headers['content-type']).split(';', 1)[0]?.trim().toLowerCase()
}

/**
 * JSON response (no-store: deletion outcomes are live facts).
 * @param res - the response.
 * @param status - HTTP status.
 * @param payload - JSON-serializable body.
 */
function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

/**
 * 405 with the route's one supported method.
 * @param res - the response.
 * @param allow - the method this route accepts.
 */
function sendMethodNotAllowed(res, allow) {
  res.statusCode = 405
  res.setHeader('allow', allow)
  res.end()
}

/**
 * Collect a bounded request body as UTF-8 text.
 * @param req - the incoming request.
 * @returns the body, or null past the ceiling (the stream is drained first).
 */
async function readBoundedBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.byteLength
    if (size > MAX_BODY_BYTES) {
      req.resume()
      return null
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks, size).toString('utf8')
}

/**
 * Whether a path is still present.
 * @param path - absolute path to test.
 * @returns true when the path exists, false on any failure to stat it.
 */
async function exists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

/**
 * Readable message from an unknown failure.
 * @param failure - anything thrown.
 * @returns its message, or a string form.
 */
function messageOf(failure) {
  return failure instanceof Error ? failure.message : String(failure)
}
