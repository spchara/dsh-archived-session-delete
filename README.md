# dsh-archived-session-delete

给 DeepSeek Harness（DSH）Web 侧边栏的会话加删除键：**任何**会话都能从「…」菜单直接删，归档的还能用行尾图标和批量面板；确认框里可勾「今天不再提醒我」，确认后把会话日志从磁盘上抹掉。

## 安装

需要能跑 DSH Web 的环境（`dsh` 在 PATH 上，或用桌面版的插件管理界面）。

```powershell
# 方式一：直接从 GitHub 装
dsh plugin --profile web add github:spchara/dsh-archived-session-delete
```

```powershell
# 方式二：克隆到本地，用 link 安装（改代码时方便）
git clone https://github.com/spchara/dsh-archived-session-delete.git
dsh plugin --profile web add link:D:\path\to\dsh-archived-session-delete
```

也可以在 DSH 的「设置 → 插件」里用**从本地目录安装**，选中这个仓库目录。装完刷新页面；删掉 `archived-session-delete` 那一行即卸载。

## 用法

| 入口 | 出现在 | 说明 |
| --- | --- | --- |
| 「…」菜单 → **删除此会话** | **每一个**会话行 | 单条删除，红色，在「复制会话 ID」下面 |
| 悬停归档行 → 行尾**垃圾桶图标** | 仅归档会话 | 同上，一键触达 |
| 「…」菜单 → **批量删除归档会话…** | 归档会话 ≥ 2 条 | 勾选面板，可全选/清空 |
| 「…」菜单 → **恢复删除前的确认** | 「今天不再提醒」生效期间 | 立刻恢复确认 |

未归档的会话只走菜单：行尾那个图标只对归档行出现，避免在正常对话的行尾常驻一个销毁按钮（想反过来改，见「已知边界」）。

**今天不再提醒**：单条确认框和批量面板里都有这个勾选项。勾上并确认后，到当天 24:00 前再点删除键就直接执行，不再弹确认；期间菜单里会出现「恢复删除前的确认」。偏好存在浏览器 `localStorage`（`dsh.archived-session-delete.skipConfirmUntil`），按本地时间跨天自动失效。

**批量删除**：面板按归档顺序列出全部归档会话（标题取自会话列表），默认一个都不勾，按钮上写 `彻底删除 N 项`；删完弹结果通知（成功几个 / 失败几个 + 原因），6 秒自动消失。

**当前正在打开的会话删不了**：它在本进程里还活着，Host 会拒绝并提示先切到别的会话。这是有意为之——删除一个还持有写句柄的会话会留下损坏的日志。

**不可恢复**，没有回收站。

## 删了什么

对每条会话按顺序执行，前一步失败不会留下半截状态：

1. **会话日志目录** `<sessions>/<project>/<session-id>/` —— 整目录移除（含 lease、迁移临时文件）。先确认真是目录、删完真不在，否则判为失败、注册表原样保留，可重试。
2. **归档集合**（仅归档会话有）—— 归档行立刻从列表消失。
3. **置顶标记**。
4. **工作区归属** —— 每个仍登记该会话的 Workspace 上 `detachSession`。

第 2–4 步失败只作为 `warnings` 回传并写日志，不会假装还原已删的日志。

**不动**：内容寻址的附件对象（可能被别的会话共用）、其他会话、Workspace 目录本身。

## 接口

`POST /archived-session-delete/purge`，body `{ "sessionIds": ["s-1", "s-2"] }`（1–200 条，也接受单条 `sessionId` 写法）。

- 信封层拒绝：非 POST → 405、非 JSON → 415、id 形状可疑 / 空数组 / 超长 → 400、没有 `workspaceRegistry` 或 `sessionPersistence` → 501。
- 业务层（HTTP 200，逐条报告）：`[{ sessionId, ok: true, logDir, warnings }]` 或 `[{ sessionId, ok: false, code, message }]`，`code` 为 `session-not-found`（既无日志也不在归档集）/ `session-live`（当前打开）/ `delete-failed`（日志删不掉）。一条被拒不影响同批其他条。
- 浏览器请求先过 `connection.requestRejection`（Host/Origin 栅栏 + 登录凭据），不过直接 401/403，碰不到数据。

会话是否可删由持久层决定：有日志文件、或仍在归档集里，就算"存在"；都不是就按未知 id 拒绝，不会误报成功。

## 结构

| 文件 | 作用 |
| --- | --- |
| `index.js` | Host 半：路由、校验、逐条删除与注册表清理 |
| `client.js` | Client 半：3 个菜单项 + 行尾按钮 + 确认/批量面板 + 结果通知（都在已有 slot 里） |
| `cordis.patch.yml` | 插入 `archived-session-delete` 一行 |
| `locale/*.json` | 插件管理页显示的标题/描述 |
| `test/host.route.mjs` | Host 半自检（Cordis 严格的假 context + 真实临时目录） |

界面只用宿主现有 slot 契约（`sidebar.workspaces.session.menu.item` / `.row.action` / `shell.overlay`），归档与会话标题取自 slot 标准 props 的 `useWorkspaces` / `useSessions`，样式只用 `--dsw-alias-*` 主题变量。

## 开发

```powershell
node test/host.route.mjs     # 27 项检查：信封拒绝、逐条拒绝、单条/未归档删除、批量继续、拒绝路径不动数据
```

改 `client.js` 刷新页面即可；改 `index.js`（Host 半）需要重启 DSH 才会加载新模块。

## 已知边界

- 批量面板只列**归档**会话，按归档顺序，不做搜索/筛选（归档量很大时可以再加）。
- 行尾垃圾桶图标固定只对归档行显示：想让它也出现在普通会话上，把 `client.js` 里 `ArchiveDeleteRowButton` 的那句 `if (!archived) return null` 删掉即可。
- 搜索索引（sqlite）由它自己的文件观察器跟随清理，观察器没跑时要等下次扫描。
