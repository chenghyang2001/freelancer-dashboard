'use server'

/**
 * 任務 Server Actions
 *
 * 為什麼在 Server Action 中做角色驗證：
 * Client Component 的 UI 可以被繞過（直接呼叫 action），
 * 必須在 action 層再做一次 session 驗證作為最後防線。
 *
 * 為什麼額外查 project_members：
 * 光驗角色不夠，同角色的不同使用者可傳入別人 taskId 造成水平越權。
 * 必須確認「此 task 屬於 projectId」且「登入者是此 project 的成員」。
 */

import { db } from '@/lib/db'
import { tasks, project_members, users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'

export type TaskStatusType = 'todo' | 'in_progress' | 'review' | 'done'

/**
 * 更新任務狀態（Kanban 拖曳後呼叫）
 *
 * 為什麼禁止 client 角色修改：
 * 客戶只有唯讀查看權限，拖曳功能在 UI 層已停用，
 * 但仍需在 action 層防禦直接 API 呼叫。
 *
 * 為什麼要驗 task.project_id === projectId：
 * 防止攻擊者傳入合法的 projectId（自己有權限），
 * 但 taskId 指向另一個 project 的任務（水平越權）。
 */
export async function updateTaskStatus(
  taskId: string,
  newStatus: TaskStatusType,
  projectId: string
): Promise<void> {
  const session = await auth()

  // 未登入直接拒絕
  if (!session) {
    throw new Error('未授權：請先登入')
  }

  // client 角色無修改權限
  if (session.user?.role === 'client') {
    throw new Error('客戶無法修改任務狀態')
  }

  try {
    // 1. 確認任務存在
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId))
    if (!task) throw new Error('任務不存在')

    // 2. 確認任務屬於指定的 project（防止 projectId 偽造造成的水平越權）
    if (task.project_id !== projectId) throw new Error('任務與專案不符')

    // 3. 透過 email 查出登入者的 user.id（JWT 只存 email，沒有 id）
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user?.email ?? ''))
    if (!currentUser) throw new Error('使用者不存在')

    // 4. 確認登入者是此 project 的成員（防止跨 project 水平越權）
    const [membership] = await db
      .select()
      .from(project_members)
      .where(
        and(
          eq(project_members.project_id, projectId),
          eq(project_members.user_id, currentUser.id)
        )
      )
    // client 角色已在上方攔截；這裡確認登入者有任何成員記錄
    if (!membership) throw new Error('無此專案的存取權限')

    // 5. 通過所有驗證後執行更新
    await db
      .update(tasks)
      .set({
        status: newStatus,
        updated_at: new Date(),
      })
      .where(eq(tasks.id, taskId))
  } catch (err) {
    console.error('[updateTaskStatus] 操作失敗：', err)
    throw err
  }

  // 讓專案頁面重新驗證（清除 Next.js cache）
  revalidatePath(`/dashboard/projects/${projectId}`)
}
