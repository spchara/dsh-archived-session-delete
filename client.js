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

    /** Dictionaries for the visible copy; the locale service holds them per namespace. */
    const DICTIONARIES = {
      en: {
        'menu.delete': 'Delete archived conversation',
        'actions.delete': 'Delete this archived conversation permanently',
        'confirm.title': 'Delete this conversation permanently?',
        'confirm.desc': '“{title}” is removed from disk: its session log, its archive record, and its workspace entry are all deleted. This cannot be undone.',
        'confirm.untitled': 'Untitled conversation',
        'confirm.pending': 'Deleting…',
        'confirm.action': 'Delete permanently',
        'cancel': 'Cancel',
        'close': 'Close',
      },
      zh: {
        'menu.delete': '彻底删除此会话',
        'actions.delete': '彻底删除此归档会话',
        'confirm.title': '彻底删除这个会话？',
        'confirm.desc': '「{title}」将从磁盘删除：会话日志、归档记录与工作区归属一并清除，且无法恢复。',
        'confirm.untitled': '未命名会话',
        'confirm.pending': '正在删除…',
        'confirm.action': '彻底删除',
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
}
.asd-iconButton { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; margin: -4px; border: none; border-radius: var(--dsw-radius-xs, 4px); padding: 0; background: transparent; cursor: pointer; color: var(--dsw-alias-label-tertiary); }
.asd-iconButton:focus-visible { outline-offset: -2px; }
.asd-overlayRoot { pointer-events: auto; position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: max(24px, var(--dsh-frame-overlay-top, 24px)) 24px; }
.asd-mask { position: absolute; inset: var(--dsh-frame-chrome-top, 0px) 0 0; backdrop-filter: var(--dsw-mask-blur, blur(6px)); }
.asd-mask::after { content: ''; position: absolute; inset: 0; background: var(--dsw-alias-bg-mask-1); }
.asd-dialog { box-sizing: border-box; position: relative; z-index: 1; display: flex; flex-direction: column; gap: 20px; width: min(380px, 100%); padding: 0 0 24px; overflow: hidden; border: 0; border-radius: var(--dsw-radius-panel, 16px); background: var(--dsw-alias-bg-layer-2); box-shadow: var(--dsw-elevation-prominent, 0 12px 32px rgba(0, 0, 0, 0.24)); }
.asd-dialog:focus { outline: none; }
.asd-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 22px 14px 12px 24px; }
.asd-title { margin: 0; font-size: 16px; line-height: 24px; font-weight: 500; color: var(--dsw-alias-label-primary); }
.asd-close { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border: none; border-radius: var(--dsw-radius-sm, 6px); background: transparent; cursor: pointer; color: var(--dsw-alias-label-secondary); }
.asd-description { margin: 0; padding: 0 24px; font-size: 14px; line-height: 22px; color: var(--dsw-alias-label-primary); overflow-wrap: anywhere; }
.asd-body { display: flex; flex-direction: column; min-width: 0; margin-top: 20px; padding: 0 24px; gap: 8px; }
.asd-footer { display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 0 24px; }
.asd-button { box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; gap: 4px; height: 36px; padding: 0 14px; border: 0.5px solid transparent; border-radius: var(--dsw-radius-md, 8px); background: transparent; box-shadow: inset 0 0 0 var(--dsh-hairline-width, 0.5px) var(--dsw-alias-border-l3); cursor: pointer; font-size: 14px; line-height: 22px; color: var(--dsw-alias-label-primary); font-family: inherit; }
.asd-button:disabled { cursor: not-allowed; opacity: 0.4; }
.asd-dangerButton:not(:disabled) { color: var(--dsw-alias-state-error-primary); }
.asd-status { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); }
.asd-error { font-size: 12px; line-height: 18px; color: var(--dsw-alias-state-error-primary); overflow-wrap: anywhere; }
`

    /** The confirmation the menu row and hover button raise, read by the overlay occupant. */
    let pending = null
    const pendingListeners = new Set()

    /**
     * Publish a confirmation request (or clear it).
     * @param next - the request, or null to withdraw it.
     */
    function setPending(next) {
      pending = next
      for (const listener of [...pendingListeners]) listener()
    }

    /**
     * Subscribe one component to the pending confirmation.
     * @returns the current request, or null.
     */
    function usePending() {
      const [value, setValue] = React.useState(pending)
      React.useEffect(() => {
        const listener = () => setValue(pending)
        pendingListeners.add(listener)
        listener()
        return () => { pendingListeners.delete(listener) }
      }, [])
      return value
    }

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

    /** The × glyph for the dialog's close control. */
    function CloseIcon() {
      return h('svg', {
        viewBox: '0 0 16 16', width: 14, height: 14, fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round',
        'aria-hidden': true, focusable: 'false',
      },
        h('path', { d: 'M4 4l8 8M12 4l-8 8' }),
      )
    }

    /**
     * Read the archived-set membership of one Session.
     * @param useWorkspaces - the slot's standard selector hook for the Workspace snapshot.
     * @param sessionId - the row's Session.
     * @returns whether the Session is archived.
     */
    function useArchived(useWorkspaces, sessionId) {
      return useWorkspaces((snapshot) => Array.isArray(snapshot.archivedSessionIds)
        && snapshot.archivedSessionIds.includes(sessionId))
    }

    /**
     * One Session's "…" menu row (order 500, after the shipped session-id row).
     * Rendered only for an archived Session.
     */
    function ArchiveDeleteMenuItem(props) {
      const { sessionId, displayTitle, useWorkspaces, useMenuOpenState, t } = props
      if (typeof useWorkspaces !== 'function') return null
      const archived = useArchived(useWorkspaces, sessionId)
      const [, setMenuOpen] = useMenuOpenState()
      if (!archived) return null
      ensureStyles()
      return h('div', { className: `${KEY}-itemWrap` },
        h('div', { className: `${KEY}-separator`, role: 'separator' }),
        h('button', {
          type: 'button',
          role: 'menuitem',
          className: `${KEY}-item ${KEY}-danger`,
          onClick: () => {
            setMenuOpen(false)
            setPending({ sessionId, displayTitle })
          },
        },
          h('span', { className: `${KEY}-itemIcon` }, h(TrashIcon)),
          h('span', { className: `${KEY}-itemLabel` }, t('menu.delete')),
        ),
      )
    }

    /**
     * The hover button at the end of one Session row (order 300, after archive
     * and pin). Rendered only for an archived Session.
     */
    function ArchiveDeleteRowButton(props) {
      const { sessionId, displayTitle, useWorkspaces, t } = props
      if (typeof useWorkspaces !== 'function') return null
      const archived = useArchived(useWorkspaces, sessionId)
      if (!archived) return null
      ensureStyles()
      const label = t('actions.delete')
      return h('button', {
        type: 'button',
        className: `${KEY}-iconButton`,
        'aria-label': label,
        title: label,
        onClick: () => { setPending({ sessionId, displayTitle }) },
      }, h(TrashIcon))
    }

    /** The frame-wide confirmation dialog; renders nothing while no request is pending. */
    function ArchiveDeleteConfirmOverlay(props) {
      const request = usePending()
      if (request === null) return null
      ensureStyles()
      return h(ArchiveDeleteConfirmForm, { key: request.sessionId, request, t: props.t })
    }

    /** One request's dialog: in-flight and error state die with it. */
    function ArchiveDeleteConfirmForm({ request, t }) {
      const dialog = React.useRef(null)
      const [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState(null)

      const cancel = () => {
        if (busy) return
        setPending(null)
      }

      // Focus moves into the dialog and returns to the trigger afterwards;
      // Escape closes it exactly like the Cancel button.
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
          if (!busy) setPending(null)
        }
        document.addEventListener('keydown', onKeyDown, true)
        return () => { document.removeEventListener('keydown', onKeyDown, true) }
      }, [busy])

      const confirm = () => {
        if (busy) return
        setBusy(true)
        setError(null)
        purge(request.sessionId).then(() => {
          setBusy(false)
          setPending(null)
        }).catch((reason) => {
          setBusy(false)
          setError(reason instanceof Error ? reason.message : String(reason))
        })
      }

      const title = request.displayTitle === '' ? t('confirm.untitled') : request.displayTitle
      return h('div', { className: `${KEY}-overlayRoot`, role: 'presentation' },
        h('div', { className: `${KEY}-mask`, 'aria-hidden': true, onClick: cancel }),
        h('div', {
          ref: dialog,
          tabIndex: -1,
          className: `${KEY}-dialog`,
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': t('confirm.title'),
        },
          h('div', null,
            h('div', { className: `${KEY}-header` },
              h('h2', { className: `${KEY}-title` }, t('confirm.title')),
              h('button', {
                type: 'button',
                className: `${KEY}-close`,
                'aria-label': t('close'),
                disabled: busy,
                onClick: cancel,
              }, h(CloseIcon)),
            ),
            h('p', { className: `${KEY}-description` }, t('confirm.desc', { title })),
            h('div', { className: `${KEY}-body` },
              busy && h('div', { className: `${KEY}-status`, role: 'status' }, t('confirm.pending')),
              error !== null && h('div', { className: `${KEY}-error`, role: 'alert' }, error),
            ),
          ),
          h('div', { className: `${KEY}-footer` },
            h('button', {
              type: 'button', className: `${KEY}-button`, disabled: busy, onClick: cancel,
            }, t('cancel')),
            h('button', {
              type: 'button',
              className: `${KEY}-button ${KEY}-dangerButton`,
              disabled: busy,
              onClick: confirm,
            }, t('confirm.action')),
          ),
        ),
      )
    }

    /** Client services reached at call time, so a later service replacement is honoured. */
    let runtime = null

    /**
     * Ask the Host to delete one archived Session and refresh the Session list.
     * @param sessionId - the Session to remove.
     * @returns the Host's answer.
     * @throws when the Host refuses or the transport fails, with its own message.
     */
    async function purge(sessionId) {
      const response = await fetch(PURGE_ROUTE, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId }),
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
      // The archived set arrives over the Workspace follow stream; the Session
      // rows come from a list pull, which has to be asked for again.
      const sessions = runtime?.ctx?.get('sessions')
      if (sessions !== undefined && typeof sessions.refresh === 'function') {
        Promise.resolve(sessions.refresh()).catch(() => {})
      }
      return payload
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        runtime = { ctx }
        disposed = false
        ctx.effect(() => ctx.locale.register(NS, DICTIONARIES), 'archived-session-delete: dictionaries')
        ctx.effect(() => () => {
          disposed = true
          if (styleElement !== null) {
            styleElement.remove()
            styleElement = null
          }
          pending = null
          pendingListeners.clear()
        }, 'archived-session-delete: styles and pending request')

        ctx.slots.inject('sidebar.workspaces.session.menu.item', () => ctx.slots.register({
          name: 'sidebar.workspaces.session.menu.item',
          id: 'archived-session-delete.menu',
          order: 500,
          locale: NS,
        }, ArchiveDeleteMenuItem))

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
        }, ArchiveDeleteConfirmOverlay))
      },
    }
  },
})
