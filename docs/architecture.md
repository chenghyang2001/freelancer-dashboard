# freelancer-dashboard — 系統架構文件

**版本基準**：v0.1.0（2026-06-18）
**技術棧**：Next.js 15.5.18 App Router · React 19.1.0 · TypeScript 5 · NextAuth v5（5.0.0-beta.31）· Drizzle ORM 0.45.2 · Neon Serverless PostgreSQL · Tailwind CSS v4 · dnd-kit

> 本文件所有組件名、行數、版本均來自實際原始碼查證（package.json / lib / app / actions / middleware.ts），非記憶推測。

---

## 1. 系統概觀

freelancer-dashboard 是一個**自由工作者 / 接案團隊的客戶協作看板**。三種角色（管理員、團隊成員、客戶）登入同一套介面，看到依角色裁切的專案與任務，並透過拖曳式 Kanban 看板管理任務狀態。客戶端為唯讀，團隊端可拖曳。

```
                          ┌─────────────────────────────┐
       Browser            │     Next.js 15 App Router     │
   ┌───────────┐  HTTP    │  ┌────────────────────────┐  │
   │  Client    │────────▶│  │  middleware.ts (Edge)   │  │  第一道認證防線
   │ Components │         │  │  /dashboard/* 守衛      │  │
   │ (dnd-kit)  │◀────────│  └───────────┬────────────┘  │
   └─────┬─────┘  RSC     │              ▼               │
         │ Server Action  │  ┌────────────────────────┐  │
         └───────────────▶│  │  Server Components      │  │  第二道認證防線
                          │  │  (dashboard/* pages)    │  │  + 直接查 DB
                          │  └───────────┬────────────┘  │
                          │  ┌───────────▼────────────┐  │
                          │  │  Server Actions         │  │  第三道防線
                          │  │  (actions/tasks.ts)     │  │  + 防水平越權
                          │  └───────────┬────────────┘  │
                          │  ┌───────────▼────────────┐  │
                          │  │  lib/auth.ts (NextAuth) │  │
                          │  │  lib/db (Drizzle Proxy) │  │
                          │  └───────────┬────────────┘  │
                          └──────────────┼───────────────┘
                                         ▼ HTTP (neon-http)
                              ┌────────────────────┐
                              │ Neon PostgreSQL     │
                              │ users / projects /  │
                              │ tasks / members     │
                              └────────────────────┘
```

定位：以 **Server Components 直連資料庫**（不走自建 REST API）為主幹，僅保留 NextAuth 的 catch-all API route；寫入操作走 **Server Actions** 並在該層做最終權限防禦。

---

## 2. 組件與角色

| 分類 | 檔案 | 行數 | 角色 |
|------|------|-----:|------|
| **進入點** | `app/layout.tsx` | 34 | 根 layout（字型、全域樣式） |
| | `app/page.tsx` | 13 | 首頁（導向 dashboard / login） |
| | `app/(auth)/login/page.tsx` | 43 | 登入頁（route group 隔離） |
| **認證守衛** | `middleware.ts` | 43 | Edge 層路由保護（第一道防線） |
| | `app/dashboard/layout.tsx` | 30 | Server 層認證守衛（第二道防線） |
| **頁面（Server Components）** | `app/dashboard/page.tsx` | 77 | 專案總覽，依角色過濾 |
| | `app/dashboard/my-projects/page.tsx` | 92 | 我的專案 |
| | `app/dashboard/projects/[id]/page.tsx` | 91 | 專案看板，按 status 分欄 |
| **API Route** | `app/api/auth/[...nextauth]/route.ts` | 15 | NextAuth catch-all handler |
| **Server Action** | `actions/tasks.ts` | 94 | `updateTaskStatus`（含五段越權防禦） |
| **核心模組** | `lib/auth.ts` | 101 | NextAuth 配置（Credentials + JWT） |
| | `lib/db/index.ts` | 43 | Drizzle 連線（Proxy + lazy init） |
| | `lib/db/schema.ts` | 106 | 4 表 + 3 enum + 型別匯出 |
| | `lib/db/seed.ts` | 188 | Demo 種子資料 |
| | `lib/utils.ts` | 6 | `cn()` className 合併 |
| **互動元件（Client）** | `components/kanban-board.tsx` | 149 | DndContext + 樂觀更新 |
| | `components/kanban-column.tsx` | 73 | 可放置欄位（droppable） |
| | `components/task-card.tsx` | 73 | 可拖曳卡片（draggable） |
| | `components/login-form.tsx` | 128 | 登入表單 |
| **展示元件** | `components/sidebar.tsx` / `project-card.tsx` / `role-badge.tsx` / `sign-out-button.tsx` | — | 導覽與卡片 |
| **UI 基礎層** | `components/ui/*`（avatar/badge/button/card/separator） | — | shadcn 風格基礎元件 |
| **設定** | `drizzle.config.ts` / `next.config.ts` / `types/next-auth.d.ts` | — | ORM / 框架 / 型別擴充 |
| **外部服務** | Neon Serverless PostgreSQL | — | 唯一持久化儲存 |

### 資料模型（schema.ts）

| 資料表 | 關鍵欄位 | 關聯 |
|--------|---------|------|
| `users` | id, email(unique), password_hash, **role** | — |
| `projects` | id, name, description, **client_id** | client_id → users.id |
| `tasks` | id, title, **status**, assignee_id, order | project_id → projects.id；assignee_id → users.id（可 null） |
| `project_members` | id, **role** | project_id → projects.id；user_id → users.id |

**Enum**：`user_role`(admin/team_member/client)、`task_status`(todo/in_progress/review/done)、`project_member_role`(owner/member/viewer)。

---

## 3. 組件互動模式

### 三層認證防禦

```
請求 → [1] middleware.ts（Edge）  未登入進 /dashboard → redirect /login
       [2] dashboard/layout.tsx  session 為 null → redirect /login
       [3] actions/tasks.ts      寫入前再驗 session + 角色 + 成員資格
```

中介層順序：**middleware（粗篩）→ layout（守衛）→ Server Action（細驗 + 防越權）**。UI 層的 `isReadOnly` 只是體驗優化，真正的權限邊界在 Server Action。

### 狀態管理

- **伺服器狀態**：Server Components 每次請求直接查 DB；寫入後 `revalidatePath()` 失效快取。
- **客戶端狀態**：僅 KanbanBoard 用 `useState` + `useTransition` 做樂觀更新。無全域狀態庫（Zustand/Redux）。

### 關鍵約束

- `lib/db` 透過 **Proxy** 延遲初始化 → build 階段無 `DATABASE_URL` 也不會 throw。
- Server Action 失敗 → client 端 `window.location.reload()` 回滾樂觀更新。
- `notFound()` 必須放在 try/catch **之外**（它是 Next.js special error，被 catch 會壞掉 404）。

---

## 4. 使用者操作觸發的資料流

### 流程 A：登入

```
login-form.tsx (submit)
  └─▶ signIn('credentials') ─▶ lib/auth.ts authorize()
        ├─ Zod LoginSchema 驗證格式
        ├─ db 查 users（參數化 eq）
        ├─ bcrypt.compare(password, hash)
        └─ 回傳 user → jwt callback 寫入 role → session callback 注入 session.user.role
  └─▶ middleware 偵測已登入 ─▶ redirect /dashboard
```

### 流程 B：瀏覽專案總覽（依角色裁切）

```
GET /dashboard ─▶ dashboard/page.tsx (Server Component)
  ├─ auth() 取 session.role
  ├─ role === 'client' → 用 email 反查 user.id → WHERE client_id = id（只看自己的）
  └─ admin / team_member → SELECT * projects（看全部）
  └─▶ <ProjectCard> 響應式卡片格渲染
```

### 流程 C：拖曳任務改狀態（核心寫入流程）

```
task-card 拖曳 ─▶ kanban-board handleDragEnd
  ├─ [樂觀] setColumns 先在 client 移動卡片
  └─ startTransition ─▶ updateTaskStatus(taskId, newStatus, projectId)  [Server Action]
        ├─ ① session 存在？否 → throw 未授權
        ├─ ② role === 'client'？是 → throw 客戶不可改
        ├─ ③ task 存在？且 task.project_id === projectId？（防水平越權）
        ├─ ④ email 反查 currentUser.id
        ├─ ⑤ project_members 有 (projectId, userId)？否 → throw 無權限
        ├─ UPDATE tasks SET status, updated_at
        └─ revalidatePath(/dashboard/projects/{id})
  └─ 失敗 → console.error + window.location.reload()（回滾）
```

---

## 5. 關鍵架構決策（ADR 摘要）

| 決策 | 理由 | 代價 |
|------|------|------|
| Server Components 直連 DB，不自建 REST API | 省去 HTTP round-trip；不暴露 DB 連線給 client | 邏輯散在頁面，不易被外部系統重用 |
| `lib/db` 用 Proxy + lazy init | neon() 在頂層會驗 `DATABASE_URL`，build 階段未注入會 throw | 多一層 Proxy 間接；每次存取 Reflect.get |
| NextAuth Credentials + JWT 策略 | Demo 需預設帳號測角色切換，不依賴 OAuth；JWT 免 DB session 表 | role 需經 jwt→session 兩段傳遞；JWT 內 role 過期需重登 |
| 角色驗證放在 Server Action（而非僅 UI） | Client UI 可被繞過，Action 是最後防線 | 每次寫入多 3~4 次 DB 查詢 |
| 額外查 `project_members` 防越權 | 同角色不同使用者可傳別人 taskId 造成水平越權 | 寫入路徑變長、延遲增加 |
| Kanban 樂觀更新 + reload 回滾 | 避免卡片「跳回再移過去」的閃爍 | 失敗時整頁 reload，體驗較粗糙（非局部回滾） |
| 唯讀模式完全不渲染 DndContext | 省下 dnd-kit sensor 的 event handler 開銷 | 兩條渲染分支，需維護一致性 |

---

## 6. 部署與測試拓撲

```
開發  npm run dev (--turbopack)  →  localhost:3000
  │
  ├─ DB 初始化：drizzle-kit generate / migrate / push（db:push 直接同步 schema）
  ├─ 種子資料：npx tsx lib/db/seed.ts
  │     → 3 帳號（admin/team/client@demo.com，密碼 password）
  │     → 1 專案 + 6 任務 + 3 成員關聯
  │
打包  npm run build (--turbopack)  →  .next/
  │     （Proxy lazy init 確保 build 階段不需 DATABASE_URL）
  │
發佈  Vercel（next start）+ Neon（DATABASE_URL 放 Vercel Secrets）
  │
驗證  ESLint（npm run lint, eslint-config-next）
       手動 E2E：登入 admin/team/client → 驗各角色可見範圍 + 拖曳權限
```

**環境變數**：`DATABASE_URL`（Neon 連線字串）、`AUTH_SECRET`（NextAuth JWT 簽章）。

**已知限制**：

- 無自動化測試（單元 / 整合 / E2E 皆缺）。
- 任務只能改 status，無新增 / 刪除 / 重新指派 assignee 的寫入路徑。
- 樂觀更新失敗採整頁 reload，非局部回滾。
