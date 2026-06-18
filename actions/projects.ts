"use server";

/**
 * 專案 Server Actions（CRUD）
 *
 * 為什麼在 Server Action 中做角色驗證：
 * Client Component 的 UI 雖已依角色隱藏寫入按鈕，但攻擊者可直接呼叫 action，
 * 必須在 action 層再做一次 session 驗證作為最後防線（與 actions/tasks.ts 同模式）。
 *
 * 授權模型（使用者拍板）：
 * - 建立／編輯：admin + team_member 皆可（client 唯讀）
 * - 刪除：僅 admin（破壞性操作收斂到管理員）
 *
 * 為什麼只擋角色而不查 project_members：
 * 專案層級的建立／刪除屬於全域管理操作（非單一專案成員權限），
 * 與 tasks 的水平越權情境不同，因此只需角色閘門。
 */

import { db } from "@/lib/db";
import { projects, users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { z } from "zod";

/**
 * 專案輸入的共用 Zod schema
 *
 * 為什麼 name 用 trim + min/max：
 * 防止全空白字串繞過 min(1)，並限制長度避免超長字串塞爆 DB 欄位。
 *
 * 為什麼 description 用 optional 而非 nullable：
 * 前端 textarea 永遠送字串（空字串代表未填），不會送 null；
 * 落庫時再由各 action 自行把空字串轉成 null（schema 的 description 欄位可為 null）。
 */
const ProjectSchema = z.object({
  name: z.string().trim().min(1, "專案名稱不可為空").max(200, "專案名稱過長"),
  description: z.string().trim().max(2000, "描述過長").optional(),
  client_id: z.string().uuid("無效的客戶 ID"),
});

/** 三個 action 共用的輸入型別（與 ProjectSchema 對齊，禁用 any） */
export type ProjectInput = z.infer<typeof ProjectSchema>;

/**
 * 驗證登入者具備寫入權限，回傳 session
 *
 * 為什麼抽成共用函式並用 adminOnly 參數區分：
 * create/update（一般寫入）與 delete（僅 admin）的前置檢查只差一個角色等級，
 * 集中一處避免重複邏輯（DRY），同時保留兩種權限梯度。
 *
 * @param opts.adminOnly 為 true 時要求 admin 角色（刪除專用）；
 *                       否則僅擋 client（建立／編輯）。
 */
async function assertWriteAccess(opts?: { adminOnly?: boolean }) {
  const session = await auth();

  // 未登入直接拒絕（兩種模式共用）
  if (!session) {
    throw new Error("未授權：請先登入");
  }

  const role = session.user?.role;

  if (opts?.adminOnly) {
    // 刪除：只有 admin 可執行（team_member 與 client 皆擋）
    if (role !== "admin") {
      throw new Error("只有管理員可以刪除專案");
    }
  } else {
    // 一般寫入：client 角色唯讀，admin / team_member 放行
    if (role === "client") {
      throw new Error("客戶無法執行此操作");
    }
  }

  return session;
}

/**
 * 驗證傳入的 client_id 確實對應一個 role='client' 的使用者
 *
 * 為什麼必須驗：
 * client_id 由前端送入，若不檢查，攻擊者可把專案掛到任意 user.id（甚至 admin），
 * 造成資料完整性破口。此處強制 client_id 必須是真正的客戶。
 */
async function assertValidClient(client_id: string): Promise<void> {
  const [c] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, client_id));
  if (!c || c.role !== "client") {
    throw new Error("無效的客戶");
  }
}

/**
 * 建立專案
 *
 * 為什麼 description 用 `|| null`：
 * 空字串在 UI 上等同「未填描述」，存 null 讓 schema 語意一致
 * （DB 的 description 欄位 nullable，list 時以 ?? 後援顯示）。
 */
export async function createProject(input: ProjectInput): Promise<void> {
  await assertWriteAccess();

  // Zod 驗證輸入，失敗時拋出可讀錯誤（parse 會自帶中文訊息）
  const { name, description, client_id } = ProjectSchema.parse(input);

  // client_id 必須是真正的客戶（在 try 之前，讓「無效的客戶」訊息原樣回傳）
  await assertValidClient(client_id);

  try {
    await db.insert(projects).values({
      name,
      description: description || null,
      client_id,
    });
  } catch (err) {
    // 記錄完整錯誤供除錯，但對外只給通用訊息避免洩漏 DB 結構（FK 名稱／欄位名）
    console.error("[createProject] 操作失敗：", err);
    throw new Error("操作失敗，請稍後再試");
  }

  revalidatePath("/dashboard");
}

/**
 * 更新專案
 *
 * 為什麼手動寫 updated_at：
 * schema 的 updated_at 只有 defaultNow()（僅 INSERT 時生效），
 * UPDATE 不會自動刷新，必須顯式帶入 new Date()。
 */
export async function updateProject(
  id: string,
  input: ProjectInput,
): Promise<void> {
  await assertWriteAccess();

  const { name, description, client_id } = ProjectSchema.parse(input);

  // client_id 必須是真正的客戶（在 try 之前，讓「無效的客戶」訊息原樣回傳）
  await assertValidClient(client_id);

  try {
    await db
      .update(projects)
      .set({
        name,
        description: description || null,
        client_id,
        updated_at: new Date(),
      })
      .where(eq(projects.id, id));
  } catch (err) {
    console.error("[updateProject] 操作失敗：", err);
    throw new Error("操作失敗，請稍後再試");
  }

  // 列表與詳情頁都需刷新（詳情頁可能顯示舊的專案名稱／描述）
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/projects/${id}`);
}

/**
 * 刪除專案（連帶刪除其任務與成員關聯）— 僅 admin
 *
 * 為什麼用單一 data-modifying CTE 而非三次依序 await：
 * 本專案用 drizzle-orm/neon-http 驅動（見 lib/db/index.ts），neon-http 是無狀態
 * HTTP 查詢，不支援 db.transaction()。改用一條含 CTE 的 SQL 一次送出，PostgreSQL
 * 會把整條語句視為單一原子操作，避免「先刪子、刪父前失敗」殘留孤兒資料。
 *
 * 為什麼必須先刪子資料：
 * projects 被 tasks.project_id 與 project_members.project_id 外鍵引用，
 * 且 schema 未設定 onDelete cascade，直接刪 projects 會違反外鍵約束。
 *
 * 安全性：${id} 經 Drizzle 的 sql template 參數化插值（非字串拼接），符合
 * SQL 注入防禦規範。
 */
export async function deleteProject(id: string): Promise<void> {
  await assertWriteAccess({ adminOnly: true });

  try {
    await db.execute(sql`
      WITH d_tasks AS (DELETE FROM tasks WHERE project_id = ${id}),
           d_members AS (DELETE FROM project_members WHERE project_id = ${id})
      DELETE FROM projects WHERE id = ${id}
    `);
  } catch (err) {
    console.error("[deleteProject] 操作失敗：", err);
    throw new Error("操作失敗，請稍後再試");
  }

  // 列表與該專案詳情頁都需刷新（詳情頁已不存在，清除其 cache 避免殘影）
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/projects/${id}`);
}
