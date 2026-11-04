window.__ModuleLoader__.load({
  id: '@local/archived-session-delete',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Locale namespace for every visible string here. */
    const NS = 'archived-session-delete'
    /** Document-relative form of the Host route (the Host registers `/archived-session-delete/purge`). */
    const PURGE_ROUTE = 'archived-session-delete/purge'
    /** Shared class prefix: these rules live in the page, not in a CSS module. */
    const KEY = 'asd'
    /** Where the "today, do not ask" preference lives; one browser, one day at a time. */
    const SKIP_KEY = 'dsh.archived-session-delete.skipConfirmUntil'
    /** How long a result notice stays up. */
    const NOTICE_MS = 6000

    /** Dictionaries for the visible copy; the locale service holds them per namespace. */
    const DICTIONARIES = {
      en: {
        'menu.delete': 'Delete conversation',
        'menu.batch': 'Delete archived conversations…',
        'menu.restoreConfirm': 'Ask before deleting again',
        'actions.delete': 'Delete this archived conversation permanently',
        'actions.deleteDirect': 'Delete permanently (no confirmation today)',
        'confirm.title': 'Delete this conversation permanently?',
        'confirm.desc': '“{title}” is removed from disk: its session log, archive and workspace records are all cleared, and this cannot be undone.',
        'confirm.untitled': 'Untitled conversation',
        'confirm.rememberToday': 'Do not ask me again today',
        'confirm.pending': 'Deleting…',
        'confirm.action': 'Delete permanently',
        'batch.title': 'Delete archived conversations',
        'batch.desc': 'Select the conversations to remove. Their logs, archive records and workspace entries are deleted, and this cannot be undone.',
        'batch.selectAll': 'Select all',
        'batch.clearAll': 'Clear',
        'batch.count': '{n} of {total} selected',
        'batch.empty': 'No archived conversations.',
        'batch.action': 'Delete {n}',
        'batch.actionNone': 'Delete',
        'batch.rememberToday': 'Do not ask me again today',
        'notice.deleting': 'Deleting…',
        'notice.deleted': 'Deleted {n} conversation(s).',
        'notice.deferredOnly': 'Removed {m} conversation(s) from the list; they are still open, so their logs are cleared on the next DSH start.',
        'notice.deferredSuffix': ' ({m} still open: their logs are cleared on the next DSH start)',
        'notice.partial': 'Deleted {ok}, {failed} failed: {detail}',
        'notice.failed': 'Delete failed: {detail}',
        'notice.confirmOff': 'Delete confirmation is off for today.',
        'notice.confirmOn': 'Delete confirmation is back on.',
        'error.sessionBusy': 'This conversation is still working; delete it once the turn finishes.',
        'error.sessionLive': 'This conversation is open and has no stored log to queue.',
        'error.sessionNotFound': 'That conversation no longer exists (already deleted?).',
        'error.deleteFailed': 'The stored log could not be removed.',
        'cancel': 'Cancel',
        'close': 'Close',
      },
      zh: {
        'menu.delete': '删除此会话',
        'menu.batch': '批量删除归档会话…',
        'menu.restoreConfirm': '恢复删除前的确认',
        'actions.delete': '彻底删除此归档会话',
        'actions.deleteDirect': '彻底删除（今天不再确认）',
        'confirm.title': '彻底删除这个会话？',
        'confirm.desc': '「{title}」将从磁盘删除：会话日志、归档与工作区记录一并清除，且无法恢复。',
        'confirm.untitled': '未命名会话',
        'confirm.rememberToday': '今天不再提醒我',
        'confirm.pending': '正在删除…',
        'confirm.action': '彻底删除',
        'batch.title': '批量删除归档会话',
        'batch.desc': '勾选要删除的会话：日志、归档记录与工作区归属一并清除，且无法恢复。',
        'batch.selectAll': '全选',
        'batch.clearAll': '清空',
        'batch.count': '已选 {n} / {total}',
        'batch.empty': '没有归档会话。',
        'batch.action': '彻底删除 {n} 项',
        'batch.actionNone': '彻底删除',
        'batch.rememberToday': '今天不再提醒我',
        'notice.deleting': '正在删除…',
        'notice.deleted': '已删除 {n} 个会话。',
        'notice.deferredOnly': '已从列表移除 {m} 个会话；它们还开着，日志会在下次启动 DSH 时清理。',
        'notice.deferredSuffix': '（其中 {m} 个还开着，日志会在下次启动 DSH 时清理）',
        'notice.partial': '已删除 {ok} 个，{failed} 个失败：{detail}',
        'notice.failed': '删除失败：{detail}',
        'notice.confirmOff': '今天不再弹出删除确认。',
        'notice.confirmOn': '已恢复删除前的确认。',
        'error.sessionBusy': '这个会话还在跑，等这一轮结束再删。',
        'error.sessionLive': '这个会话开着，而且没有可排队的日志。',
        'error.sessionNotFound': '这个会话已经不在了（可能已被删除）。',
        'error.deleteFailed': '会话日志删不掉。',
        'cancel': '取消',
        'close': '关闭',
      },
    }

    /** Every rule the components add, scoped under the shared prefix. */
    const STYLES = `
.asd-itemWrap { position: relative; }
.asd-separator { height: 0.5px; margin: 3px 2px; background: var(--dsw-alias-border-l2); }
.asd-item { display: flex; align-items: center; gap: 6px; width: 100%; min-height: 34px; padding: 6px 8px; border: none; border-radius: var(--dsw-radius-md, 8px); background: transparent; cursor: pointer; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-primary); text-align: left; font-family: inherit; }
.asd-item:focus-visible { background: var(--dsw-alias-interactive-bg-hover); outline: none; }
.asd-itemIcon { display: inline-flex; flex: none; width: 14px; height: 14px; align-items: center; justify-content: center; }
.asd-itemIcon svg { width: 14px; height: 14px; }
.asd-itemLabel { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.asd-danger { color: var(--dsw-alias-state-error-primary); }
.asd-danger .asd-itemIcon { color: var(--dsw-alias-state-error-primary); }
.asd-danger:focus-visible:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover-danger); outline: none; }
@media (hover: hover) {
  .asd-item:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
  .asd-danger:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover-danger); }
  .asd-iconButton:hover { color: var(--dsw-alias-state-error-primary); }
  .asd-close:hover { background: var(--dsw-alias-interactive-bg-hover); }
  .asd-button:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
  .asd-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
}
.asd-iconButton { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; margin: -4px; border: none; border-radius: var(--dsw-radius-xs, 4px); padding: 0; background: transparent; cursor: pointer; color: var(--dsw-alias-label-tertiary); }
.asd-iconButton:focus-visible { outline-offset: -2px; }
.asd-overlayRoot { pointer-events: auto; position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: max(24px, var(--dsh-frame-overlay-top, 24px)) 24px; }
.asd-mask { position: absolute; inset: var(--dsh-frame-chrome-top, 0px) 0 0; backdrop-filter: var(--dsw-mask-blur, blur(6px)); }
.asd-mask::after { content: ''; position: absolute; inset: 0; background: var(--dsw-alias-bg-mask-1); }
.asd-dialog { box-sizing: border-box; position: relative; z-index: 1; display: flex; flex-direction: column; gap: 20px; width: min(400px, 100%); padding: 0 0 24px; overflow: hidden; border: 0; border-radius: var(--dsw-radius-panel, 16px); background: var(--dsw-alias-bg-layer-2); box-shadow: var(--dsw-elevation-prominent, 0 12px 32px rgba(0, 0, 0, 0.24)); }
.asd-dialogWide { width: min(540px, 100%); }
.asd-dialog:focus { outline: none; }
.asd-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 22px 14px 12px 24px; }
.asd-title { margin: 0; font-size: 16px; line-height: 24px; font-weight: 500; color: var(--dsw-alias-label-primary); }
.asd-close { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border: none; border-radius: var(--dsw-radius-sm, 6px); background: transparent; cursor: pointer; color: var(--dsw-alias-label-secondary); }
.asd-description { margin: 0; padding: 0 24px; font-size: 14px; line-height: 22px; color: var(--dsw-alias-label-primary); overflow-wrap: anywhere; }
.asd-body { display: flex; flex-direction: column; min-width: 0; margin-top: 20px; padding: 0 24px; gap: 10px; }
.asd-footer { display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 0 24px; }
.asd-button { box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; gap: 4px; height: 36px; padding: 0 14px; border: 0.5px solid transparent; border-radius: var(--dsw-radius-md, 8px); background: transparent; box-shadow: inset 0 0 0 var(--dsh-hairline-width, 0.5px) var(--dsw-alias-border-l3); cursor: pointer; font-size: 14px; line-height: 22px; color: var(--dsw-alias-label-primary); font-family: inherit; }
.asd-button:disabled { cursor: not-allowed; opacity: 0.4; }
.asd-dangerButton:not(:disabled) { color: var(--dsw-alias-state-error-primary); }
.asd-status { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); }
.asd-error { font-size: 12px; line-height: 18px; color: var(--dsw-alias-state-error-primary); overflow-wrap: anywhere; }
.asd-check { display: flex; align-items: center; gap: 8px; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-secondary); cursor: pointer; -webkit-user-select: none; user-select: none; }
.asd-check input { flex: none; width: 14px; height: 14px; margin: 0; cursor: pointer; accent-color: var(--dsw-alias-state-error-primary); }
.asd-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); }
.asd-linkButton { border: none; background: transparent; padding: 0; cursor: pointer; font-size: 12px; line-height: 18px; color: var(--dsw-alias-link); font-family: inherit; }
.asd-linkButton + .asd-linkButton { margin-left: 12px; }
.asd-list { display: flex; flex-direction: column; gap: 2px; max-height: 42vh; overflow-y: auto; margin: 0 -8px; padding: 0 8px; }
.asd-row { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: var(--dsw-radius-sm, 6px); cursor: pointer; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-primary); }
.asd-row input { flex: none; width: 14px; height: 14px; margin: 0; cursor: pointer; accent-color: var(--dsw-alias-state-error-primary); }
.asd-rowTitle { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.asd-empty { padding: 14px 0; text-align: center; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-tertiary); }
.asd-notice { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); pointer-events: auto; display: flex; align-items: center; gap: 10px; max-width: min(560px, calc(100vw - 48px)); padding: 10px 12px 10px 14px; border-radius: var(--dsw-radius-md, 8px); background: var(--dsw-alias-bg-overlay); box-shadow: var(--dsw-elevation-prominent, 0 12px 32px rgba(0, 0, 0, 0.24)); font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-primary); overflow-wrap: anywhere; }
.asd-noticeError { color: var(--dsw-alias-state-error-primary); }
.asd-noticeClose { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border: none; border-radius: var(--dsw-radius-xs, 4px); padding: 0; background: transparent; cursor: pointer; color: var(--dsw-alias-label-tertiary); }
`

    /** Translate for copy raised outside a render (notices built in a promise). */
    let translate = (key) => key

    /** Insert the plugin stylesheet once; the owning effect removes it on unload. */
    let styleElement = null
    let disposed = false

    /** Create the shared stylesheet if it is not in the document yet. */
    function ensureStyles() {
      if (styleElement !== null || disposed || typeof document === 'undefined') return
      const element = document.createElement('style')
      element.setAttribute('data-dsh-plugin', NS)
      element.textContent = STYLES
      document.head.append(element)
      styleElement = element
    }

    // ---------------------------------------------------------------- view state

    /** The open panel: null, a single-Session confirmation, or the batch picker. */
    let panel = null
    /** The last result notice, or null. */
    let notice = null
    /** Rearm counter, so a menu row re-renders when the preference flips. */
    let revision = 0
    /** Auto-dismiss timer for {@link notice}. */
    let noticeTimer = null
    const listeners = new Set()

    /** Notify every subscribed component. */
    function publish() {
      revision += 1
      for (const listener of [...listeners]) listener()
    }

    /**
     * Open or close a panel.
     * @param next - the panel, or null to close it.
     */
    function setPanel(next) {
      panel = next
      publish()
    }

    /**
     * Show one result notice; it clears itself after {@link NOTICE_MS}.
     * @param tone - 'busy', 'ok' or 'error'.
     * @param text - the already-localized message.
     */
    function showNotice(tone, text) {
      if (noticeTimer !== null) clearTimeout(noticeTimer)
      notice = { tone, text, seq: (notice === null ? 0 : notice.seq) + 1 }
      noticeTimer = setTimeout(() => {
        notice = null
        noticeTimer = null
        publish()
      }, NOTICE_MS)
      publish()
    }

    /** Drop the current notice (its close button, or teardown). */
    function clearNotice() {
      if (noticeTimer !== null) clearTimeout(noticeTimer)
      noticeTimer = null
      notice = null
      publish()
    }

    /**
     * Subscribe one component to the panel, the notice, and the preference.
     * @returns the current view state.
     */
    function useView() {
      const [view, setView] = React.useState({ panel, notice, revision })
      React.useEffect(() => {
        const listener = () => setView({ panel, notice, revision })
        listeners.add(listener)
        listener()
        return () => { listeners.delete(listener) }
      }, [])
      return view
    }

    // ------------------------------------------------- confirmation preference

    /** Epoch milliseconds of the next local midnight. */
    function startOfTomorrow() {
      const next = new Date()
      next.setHours(24, 0, 0, 0)
      return next.getTime()
    }

    /** Whether confirmations are suppressed for the rest of today. */
    function skipConfirmActive() {
      try {
        const raw = window.localStorage.getItem(SKIP_KEY)
        if (raw === null) return false
        const until = Number(raw)
        if (!Number.isFinite(until)) return false
        if (until > Date.now()) return true
        window.localStorage.removeItem(SKIP_KEY)
        return false
      } catch {
        // A blocked storage leaves the confirmation on, which is the safe side.
        return false
      }
    }

    /** Suppress confirmations until the next local midnight. */
    function rememberToday() {
      try {
        window.localStorage.setItem(SKIP_KEY, String(startOfTomorrow()))
      } catch {
        // Nothing to persist into; the dialog simply keeps asking.
      }
      publish()
    }

    /** Bring confirmations back. */
    function forgetToday() {
      try {
        window.localStorage.removeItem(SKIP_KEY)
      } catch {
        // Already gone.
      }
      publish()
    }

    // ---------------------------------------------------------------- glyphs

    /** The outline trash glyph the host's icon family uses. */
    function TrashIcon() {
      return h('svg', {
        viewBox: '0 0 16 16', width: 14, height: 14, fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': true, focusable: 'false',
      },
        h('path', { d: 'M2.75 4.75h10.5' }),
        h('path', { d: 'M6.25 4.75V3.5c0-.55.45-1 1-1h1.5c.55 0 1 .45 1 1v1.25' }),
        h('path', { d: 'M4.5 4.75l.55 7.4c.04.6.54 1.1 1.15 1.1h3.6c.61 0 1.11-.5 1.15-1.1l.55-7.4' }),
        h('path', { d: 'M6.75 7.25v3.5M9.25 7.25v3.5' }),
      )
    }

    /** The × glyph for close controls. */
    function CloseIcon() {
      return h('svg', {
        viewBox: '0 0 16 16', width: 14, height: 14, fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round',
        'aria-hidden': true, focusable: 'false',
      },
        h('path', { d: 'M4 4l8 8M12 4l-8 8' }),
      )
    }

    // ------------------------------------------------------------------- data

    /** Client services reached at call time, so a later replacement is honoured. */
    let runtime = null

    /**
     * Ask the Host to delete archived Sessions and refresh the Session list.
     * @param sessionIds - the Sessions to remove.
     * @returns one result entry per Session, as the Host reported them.
     * @throws when the request itself is refused (envelope, fence, transport).
     */
    async function purgeSessions(sessionIds) {
      const response = await fetch(PURGE_ROUTE, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionIds }),
      })
      let payload = null
      try {
        payload = await response.json()
      } catch {
        payload = null
      }
      if (!response.ok) {
        const message = payload !== null && typeof payload.message === 'string' && payload.message !== ''
          ? payload.message
          : `HTTP ${String(response.status)}`
        throw new Error(message)
      }
      const results = Array.isArray(payload?.results) ? payload.results : []
      // The archived set arrives over the Workspace follow stream; the Session
      // rows come from a list pull, which has to be asked for again.
      const sessions = runtime?.ctx?.get('sessions')
      if (sessions !== undefined && typeof sessions.refresh === 'function') {
        Promise.resolve(sessions.refresh()).catch(() => {})
      }
      return results
    }

    /** Host refusal codes with their own copy; anything else shows the Host's message. */
    const FAILURE_KEYS = {
      'session-busy': 'error.sessionBusy',
      'session-live': 'error.sessionLive',
      'session-not-found': 'error.sessionNotFound',
      'delete-failed': 'error.deleteFailed',
    }

    /**
     * Human text for one refused result entry.
     * @param entry - the Host's `{ code, message }` for one Session.
     * @returns localized copy for a known code, otherwise the Host's own message.
     */
    function describeFailure(entry) {
      const code = typeof entry?.code === 'string' ? entry.code : ''
      const key = FAILURE_KEYS[code]
      if (key !== undefined) return translate(key)
      const message = typeof entry?.message === 'string' ? entry.message : ''
      return message === '' ? code : message
    }

    /**
     * Delete the named Sessions and report the outcome as one notice.
     *
     * A Session that is still open cannot lose its log yet: the Host clears its
     * records now and queues the log for the next start, so the notice says how
     * many were removed outright and how many are waiting.
     *
     * @param sessionIds - the Sessions to remove.
     * @param labels - display titles by Session id, so a refusal names the row.
     */
    async function runDelete(sessionIds, labels = {}) {
      if (sessionIds.length === 0) return
      showNotice('busy', translate('notice.deleting'))
      let results
      try {
        results = await purgeSessions(sessionIds)
      } catch (failure) {
        showNotice('error', translate('notice.failed', { detail: messageOf(failure) }))
        return
      }
      const done = results.filter(entry => entry.ok === true)
      const deferred = done.filter(entry => entry.deferred === true).length
      const removed = done.length - deferred
      const failed = results.filter(entry => entry.ok !== true)
      const suffix = deferred === 0 ? '' : translate('notice.deferredSuffix', { m: deferred })
      if (failed.length === 0) {
        if (removed === 0) {
          showNotice('ok', translate('notice.deferredOnly', { m: deferred }))
          return
        }
        showNotice('ok', `${translate('notice.deleted', { n: removed })}${suffix}`)
        return
      }
      const detail = failed
        .map((entry) => {
          const id = typeof entry.sessionId === 'string' ? entry.sessionId : '?'
          const label = typeof labels[id] === 'string' && labels[id] !== '' ? labels[id] : id
          return `${label}: ${describeFailure(entry)}`
        })
        .join('; ')
      if (done.length === 0) {
        showNotice('error', translate('notice.failed', { detail }))
        return
      }
      showNotice('error', `${translate('notice.partial', { ok: done.length, failed: failed.length, detail })}${suffix}`)
    }

    /**
     * Readable message from an unknown failure.
     * @param failure - anything thrown.
     * @returns its message, or a string form.
     */
    function messageOf(failure) {
      return failure instanceof Error ? failure.message : String(failure)
    }

    // ------------------------------------------------------------ menu entries

    /**
     * Read whether one Session is archived.
     * @param useWorkspaces - the slot's standard selector hook.
     * @param sessionId - the row's Session.
     * @returns whether it is in the archive set.
     */
    function useArchivedRow(useWorkspaces, sessionId) {
      return useWorkspaces(snapshot => Array.isArray(snapshot.archivedSessionIds)
        && snapshot.archivedSessionIds.includes(sessionId))
    }

    /**
     * One-entry label map for a notice built outside render.
     * @param sessionId - the Session the label belongs to.
     * @param displayTitle - its row title, possibly empty.
     * @returns a map the notice can name the Session with.
     */
    function labelMap(sessionId, displayTitle) {
      return typeof displayTitle === 'string' && displayTitle !== '' ? { [sessionId]: displayTitle } : {}
    }

    /**
     * Menu row (order 500): delete this Session, archived or not. Every row
     * offers it — the archive set only decides whether a record other than the
     * log has to be cleared.
     */
    function ArchiveDeleteMenuItem(props) {
      const { sessionId, displayTitle, useMenuOpenState, t } = props
      const view = useView()
      const [, setMenuOpen] = useMenuOpenState()
      void view.revision
      ensureStyles()
      const direct = skipConfirmActive()
      return h('div', { className: `${KEY}-itemWrap` },
        h('div', { className: `${KEY}-separator`, role: 'separator' }),
        h('button', {
          type: 'button',
          role: 'menuitem',
          className: `${KEY}-item ${KEY}-danger`,
          onClick: () => {
            setMenuOpen(false)
            if (direct) void runDelete([sessionId], labelMap(sessionId, displayTitle))
            else setPanel({ kind: 'confirm', sessionId, displayTitle })
          },
        },
          h('span', { className: `${KEY}-itemIcon` }, h(TrashIcon)),
          h('span', { className: `${KEY}-itemLabel` }, t('menu.delete')),
        ),
      )
    }

    /** Menu row (order 505): bring the confirmation back while it is suppressed. */
    function ArchiveRestoreConfirmMenuItem(props) {
      const { useMenuOpenState, t } = props
      const view = useView()
      const [, setMenuOpen] = useMenuOpenState()
      if (!skipConfirmActive()) return null
      void view.revision
      ensureStyles()
      return h('button', {
        type: 'button',
        role: 'menuitem',
        className: `${KEY}-item`,
        onClick: () => {
          setMenuOpen(false)
          forgetToday()
          showNotice('ok', translate('notice.confirmOn'))
        },
      },
        h('span', { className: `${KEY}-itemLabel` }, t('menu.restoreConfirm')),
      )
    }

    /** Menu row (order 520): open the batch picker, once there is more than one archived Session. */
    function ArchiveBatchMenuItem(props) {
      const { useWorkspaces, useMenuOpenState, t } = props
      const view = useView()
      if (typeof useWorkspaces !== 'function') return null
      const count = useWorkspaces(snapshot => (Array.isArray(snapshot.archivedSessionIds)
        ? snapshot.archivedSessionIds.length
        : 0))
      const [, setMenuOpen] = useMenuOpenState()
      if (count < 2) return null
      void view.revision
      ensureStyles()
      return h('button', {
        type: 'button',
        role: 'menuitem',
        className: `${KEY}-item ${KEY}-danger`,
        onClick: () => {
          setMenuOpen(false)
          setPanel({ kind: 'batch' })
        },
      },
        h('span', { className: `${KEY}-itemIcon` }, h(TrashIcon)),
        h('span', { className: `${KEY}-itemLabel` }, t('menu.batch')),
      )
    }

    /** Hover button (order 300): delete this archived Session. */
    function ArchiveDeleteRowButton(props) {
      const { sessionId, displayTitle, useWorkspaces, t } = props
      const view = useView()
      if (typeof useWorkspaces !== 'function') return null
      const archived = useArchivedRow(useWorkspaces, sessionId)
      if (!archived) return null
      void view.revision
      ensureStyles()
      const direct = skipConfirmActive()
      const label = t(direct ? 'actions.deleteDirect' : 'actions.delete')
      return h('button', {
        type: 'button',
        className: `${KEY}-iconButton`,
        'aria-label': label,
        title: label,
        onClick: () => {
          if (direct) void runDelete([sessionId], labelMap(sessionId, displayTitle))
          else setPanel({ kind: 'confirm', sessionId, displayTitle })
        },
      }, h(TrashIcon))
    }

    // ---------------------------------------------------------------- panels

    /**
     * Shared dialog chrome: mask, card, header, Escape and focus return.
     * @param props - title, close label, busy flag, footer, and the body.
     * @returns the overlay tree.
     */
    function Dialog({ title, closeLabel, wide, busy, onClose, footer, children }) {
      const dialog = React.useRef(null)
      React.useEffect(() => {
        const node = dialog.current
        const previous = document.activeElement
        if (node !== null) node.focus()
        return () => {
          if (previous instanceof HTMLElement) previous.focus()
        }
      }, [])
      React.useEffect(() => {
        const onKeyDown = (event) => {
          if (event.key !== 'Escape') return
          event.stopPropagation()
          if (!busy) onClose()
        }
        document.addEventListener('keydown', onKeyDown, true)
        return () => { document.removeEventListener('keydown', onKeyDown, true) }
      }, [busy, onClose])
      return h('div', { className: `${KEY}-overlayRoot`, role: 'presentation' },
        h('div', { className: `${KEY}-mask`, 'aria-hidden': true, onClick: () => { if (!busy) onClose() } }),
        h('div', {
          ref: dialog,
          tabIndex: -1,
          className: `${KEY}-dialog${wide === true ? ` ${KEY}-dialogWide` : ''}`,
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': title,
        },
          h('div', { className: `${KEY}-header` },
            h('h2', { className: `${KEY}-title` }, title),
            h('button', {
              type: 'button',
              className: `${KEY}-close`,
              'aria-label': closeLabel,
              disabled: busy,
              onClick: onClose,
            }, h(CloseIcon)),
          ),
          children,
          footer,
        ),
      )
    }

    /** Whether a checkbox row is checked. */
    function isChecked(set, id) {
      return set.includes(id)
    }

    /** One Session's confirmation: remember-today checkbox plus the two actions. */
    function ConfirmPanel({ request, t }) {
      const [remember, setRemember] = React.useState(false)
      const [busy, setBusy] = React.useState(false)
      const close = () => { if (!busy) setPanel(null) }
      const confirm = () => {
        if (busy) return
        if (remember) rememberToday()
        setBusy(true)
        setPanel(null)
        void runDelete([request.sessionId], labelMap(request.sessionId, request.displayTitle))
      }
      const shown = typeof request.displayTitle === 'string' && request.displayTitle !== ''
        ? request.displayTitle
        : t('confirm.untitled')
      return h(Dialog, {
        title: t('confirm.title'),
        closeLabel: t('close'),
        busy,
        onClose: close,
        footer: h('div', { className: `${KEY}-footer` },
          h('button', { type: 'button', className: `${KEY}-button`, disabled: busy, onClick: close }, t('cancel')),
          h('button', {
            type: 'button',
            className: `${KEY}-button ${KEY}-dangerButton`,
            disabled: busy,
            onClick: confirm,
          }, t('confirm.action')),
        ),
      },
        h('p', { className: `${KEY}-description` }, t('confirm.desc', { title: shown })),
        h('div', { className: `${KEY}-body` },
          h('label', { className: `${KEY}-check` },
            h('input', {
              type: 'checkbox',
              checked: remember,
              onChange: (event) => { setRemember(event.target.checked) },
            }),
            h('span', null, t('confirm.rememberToday')),
          ),
        ),
      )
    }

    /** The batch picker: every archived Session, with select-all and a counted action. */
    function BatchPanel({ useSessions, useWorkspaces, t }) {
      const archivedIds = useWorkspaces(snapshot => (Array.isArray(snapshot.archivedSessionIds)
        ? snapshot.archivedSessionIds
        : []))
      const byId = useSessions(snapshot => snapshot.byId)
      const [selected, setSelected] = React.useState([])
      const [remember, setRemember] = React.useState(false)
      const [busy, setBusy] = React.useState(false)
      const total = archivedIds.length
      const close = () => { if (!busy) setPanel(null) }
      const toggle = (id) => {
        setSelected(current => (current.includes(id)
          ? current.filter(entry => entry !== id)
          : [...current, id]))
      }
      const confirm = () => {
        if (busy || selected.length === 0) return
        if (remember) rememberToday()
        setBusy(true)
        setPanel(null)
        const labels = {}
        for (const id of selected) labels[id] = titleOf(id)
        void runDelete(selected, labels)
      }
      const titleOf = (id) => {
        const row = byId === undefined ? undefined : byId[id]
        const label = row === undefined ? undefined : row.displayTitle
        return typeof label === 'string' && label !== '' ? label : t('confirm.untitled')
      }
      return h(Dialog, {
        title: t('batch.title'),
        closeLabel: t('close'),
        wide: true,
        busy,
        onClose: close,
        footer: h('div', { className: `${KEY}-footer` },
          h('button', { type: 'button', className: `${KEY}-button`, disabled: busy, onClick: close }, t('cancel')),
          h('button', {
            type: 'button',
            className: `${KEY}-button ${KEY}-dangerButton`,
            disabled: busy || selected.length === 0,
            onClick: confirm,
          }, selected.length === 0 ? t('batch.actionNone') : t('batch.action', { n: selected.length })),
        ),
      },
        h('p', { className: `${KEY}-description` }, t('batch.desc')),
        h('div', { className: `${KEY}-body` },
          h('div', { className: `${KEY}-toolbar` },
            h('span', null, t('batch.count', { n: selected.length, total })),
            h('span', null,
              h('button', {
                type: 'button',
                className: `${KEY}-linkButton`,
                disabled: busy,
                onClick: () => { setSelected([...archivedIds]) },
              }, t('batch.selectAll')),
              h('button', {
                type: 'button',
                className: `${KEY}-linkButton`,
                disabled: busy,
                onClick: () => { setSelected([]) },
              }, t('batch.clearAll')),
            ),
          ),
          total === 0
            ? h('div', { className: `${KEY}-empty` }, t('batch.empty'))
            : h('div', { className: `${KEY}-list` }, archivedIds.map(id => h('label', {
              key: id,
              className: `${KEY}-row`,
            },
              h('input', {
                type: 'checkbox',
                checked: isChecked(selected, id),
                onChange: () => { toggle(id) },
              }),
              h('span', { className: `${KEY}-rowTitle` }, titleOf(id)),
            ))),
          h('label', { className: `${KEY}-check` },
            h('input', {
              type: 'checkbox',
              checked: remember,
              onChange: (event) => { setRemember(event.target.checked) },
            }),
            h('span', null, t('batch.rememberToday')),
          ),
        ),
      )
    }

    /** The result notice, rendered by the same overlay entry. */
    function NoticeLine({ notice, t }) {
      return h('div', {
        className: `${KEY}-notice${notice.tone === 'error' ? ` ${KEY}-noticeError` : ''}`,
        role: notice.tone === 'error' ? 'alert' : 'status',
      },
        h('span', null, notice.text),
        h('button', {
          type: 'button',
          className: `${KEY}-noticeClose`,
          'aria-label': t('close'),
          onClick: clearNotice,
        }, h(CloseIcon)),
      )
    }

    /** The frame-wide entry: a panel, a notice, or nothing. */
    function ArchiveDeleteOverlay(props) {
      const view = useView()
      ensureStyles()
      if (view.panel === null && view.notice === null) return null
      return h(React.Fragment, null,
        view.panel !== null && view.panel.kind === 'confirm'
          ? h(ConfirmPanel, { key: `confirm:${view.panel.sessionId}`, request: view.panel, t: props.t })
          : null,
        view.panel !== null && view.panel.kind === 'batch'
          ? h(BatchPanel, { key: 'batch', useSessions: props.useSessions, useWorkspaces: props.useWorkspaces, t: props.t })
          : null,
        view.notice !== null ? h(NoticeLine, { key: `notice:${view.notice.seq}`, notice: view.notice, t: props.t }) : null,
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        runtime = { ctx }
        disposed = false
        translate = ctx.locale.bind(NS)
        ctx.effect(() => ctx.locale.register(NS, DICTIONARIES), 'archived-session-delete: dictionaries')
        ctx.effect(() => () => {
          disposed = true
          if (noticeTimer !== null) clearTimeout(noticeTimer)
          noticeTimer = null
          notice = null
          panel = null
          listeners.clear()
          if (styleElement !== null) {
            styleElement.remove()
            styleElement = null
          }
        }, 'archived-session-delete: styles and pending panels')

        ctx.slots.inject('sidebar.workspaces.session.menu.item', () => ctx.slots.register({
          name: 'sidebar.workspaces.session.menu.item',
          id: 'archived-session-delete.menu',
          order: 500,
          locale: NS,
        }, ArchiveDeleteMenuItem))

        ctx.slots.inject('sidebar.workspaces.session.menu.item', () => ctx.slots.register({
          name: 'sidebar.workspaces.session.menu.item',
          id: 'archived-session-delete.restore-confirm',
          order: 505,
          locale: NS,
        }, ArchiveRestoreConfirmMenuItem))

        ctx.slots.inject('sidebar.workspaces.session.menu.item', () => ctx.slots.register({
          name: 'sidebar.workspaces.session.menu.item',
          id: 'archived-session-delete.batch',
          order: 520,
          locale: NS,
        }, ArchiveBatchMenuItem))

        ctx.slots.inject('sidebar.workspaces.session.row.action', () => ctx.slots.register({
          name: 'sidebar.workspaces.session.row.action',
          id: 'archived-session-delete.row',
          order: 300,
          locale: NS,
        }, ArchiveDeleteRowButton))

        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'archived-session-delete.confirm',
          order: 400,
          locale: NS,
        }, ArchiveDeleteOverlay))
      },
    }
  },
})
