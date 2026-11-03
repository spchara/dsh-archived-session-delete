# dsh-archived-session-delete

给 DeepSeek Harness（DSH）Web 侧边栏里**已归档的对话**加一个删除键：点一下、确认一次，把这条会话从磁盘上彻底抹掉。

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

只对**已归档**的会话出现，两个入口：

- 会话行「…」菜单 → **彻底删除此会话**（红色，在「复制会话 ID」下面）
- 鼠标悬停归档行 → 行尾**垃圾桶图标**

点开后是确认框，写着会话标题和删除范围，确认后才真正执行。**不可恢复**，没有回收站。

## 删了什么

按顺序，前一步失败不会留下半截状态：

1. **会话日志目录** `<sessions>/<project>/<session-id>/` —— 整目录移除（含 lease、迁移临时文件）。先确认真是目录、删完真不在，否则报错返回、归档记录原样保留，可重试。
2. **归档集** —— 归档行立刻从列表消失。
3. **置顶标记**。
4. **工作区归属** —— 每个仍登记该会话的 Workspace 上 `detachSession`。

第 2–4 步失败只作为 `warnings` 回传并写日志，不会假装还原已删的日志。

**不动**：内容寻址的附件对象（可能被别的会话共用）、其他会话、Workspace 目录本身。

拒绝的情况：非 POST → 405、非 JSON → 415、`sessionId` 含路径符号 → 400、会话未归档 → 409、会话还活着 → 409、没有 `sessionPersistence` → 501、删日志失败 → 500（归档记录不动）。浏览器请求先过 `connection.requestRejection`（Host/Origin 栅栏 + 登录凭据），不过直接 401/403，碰不到数据。

## 结构

| 文件 | 作用 |
| --- | --- |
| `index.js` | Host 半：POST `/archived-session-delete/purge`，执行删除并维护注册表记录 |
| `client.js` | Client 半：菜单项（order 500）、行尾按钮（300）、确认弹窗（`shell.overlay` 400） |
| `cordis.patch.yml` | 插入 `archived-session-delete` 一行 |
| `locale/*.json` | 插件管理页显示的标题/描述 |
| `test/host.route.mjs` | Host 半自检（假 context + 真实临时目录） |

界面只用宿主现有 slot 契约（`sidebar.workspaces.session.menu.item` / `.row.action` / `shell.overlay`），归档状态取自 slot 标准 props 的 `useWorkspaces`，样式只用 `--dsw-alias-*` 主题变量。

## 开发

```powershell
node test/host.route.mjs     # 16 项检查：拒绝分支、成功删除、失败回滚
```

改 `client.js` 刷新页面即可；改 `index.js`（Host 半）需要重启 DSH 才会加载新模块。

## 已知边界

- 搜索索引（sqlite）由它自己的文件观察器跟随清理，观察器没跑时要等下次扫描。
- 想让普通会话也能删：去掉 `index.js` 里的 `session-not-archived` 检查，并去掉 `client.js` 里的 `archived` 判定。
