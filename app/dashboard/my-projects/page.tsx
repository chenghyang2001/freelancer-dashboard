import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { projects, tasks, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { KanbanBoard } from '@/components/kanban-board'

// 客戶入口（Client Portal）— 只允許 client 角色進入
// admin / team_member 進入此頁一律導向 /dashboard，避免誤用客戶視角
export default async function MyProjectsPage() {
  const session = await auth()

  if (!session) redirect('/login')
  // 非 client 角色導向主 dashboard，避免 admin/team 誤入客戶視角
  if (session.user?.role !== 'client') redirect('/dashboard')

  let clientProjects: Array<{ id: string; name: string; description: string | null }> = []
  let tasksByProject: Record<string, typeof tasks.$inferSelect[]> = {}

  try {
    // 透過 session email 找到對應 user 記錄，再查詢其名下的專案
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user?.email ?? ''))

    if (currentUser) {
      clientProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.client_id, currentUser.id))

      // 逐專案查詢任務；專案數量通常少（client 不會掛幾十個），N+1 可接受
      for (const proj of clientProjects) {
        const projTasks = await db
          .select()
          .from(tasks)
          .where(eq(tasks.project_id, proj.id))
        tasksByProject[proj.id] = projTasks
      }
    }
  } catch (e) {
    // 查詢失敗時降級為空清單，避免整頁白畫面
    console.error('客戶專案查詢失敗:', e)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">我的專案進度</h1>
        <p className="text-gray-600 mt-1">即時查看你的專案任務狀態（唯讀）</p>
      </div>

      {clientProjects.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">目前沒有指派的專案</p>
          <p className="text-sm mt-1">請聯絡你的專案負責人</p>
        </div>
      ) : (
        <div className="space-y-8">
          {clientProjects.map(project => {
            const projectTasks = tasksByProject[project.id] ?? []
            // 依 status 分欄，提供給 KanbanBoard 的 columns 結構
            const columns = {
              todo: projectTasks.filter(t => t.status === 'todo'),
              in_progress: projectTasks.filter(t => t.status === 'in_progress'),
              review: projectTasks.filter(t => t.status === 'review'),
              done: projectTasks.filter(t => t.status === 'done'),
            }
            return (
              <div key={project.id}>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">{project.name}</h2>
                  {project.description && (
                    <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                  )}
                  {/* 明確提示 client 目前是唯讀模式，避免誤以為操作無效 */}
                  <p className="text-xs text-amber-600 mt-1">👁 唯讀模式 — 僅供查看，無法修改任務</p>
                </div>
                <KanbanBoard
                  columns={columns}
                  projectId={project.id}
                  isReadOnly={true}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
