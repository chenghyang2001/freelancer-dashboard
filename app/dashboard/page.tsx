/**
 * Dashboard 首頁 — Server Component
 *
 * 為什麼在 Server Component 直接查 DB 而非打 API：
 * Next.js App Router 的 Server Component 可直接存取 DB（不走 HTTP round-trip），
 * 效能更好且不需要額外的 /api/projects 端點。
 *
 * 角色過濾邏輯說明：
 * - admin / team_member：查詢所有專案（無 WHERE 條件）
 * - client：只查詢 client_id = 當前使用者 ID 的專案
 *   JWT token 中的 user.id 需要 P4 才完整，此處改以 email 二次查詢 users 表取得 id
 */
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { projects, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { ProjectCard } from '@/components/project-card'

export default async function DashboardPage() {
  const session = await auth()
  const role = session?.user?.role ?? 'client'

  // 查詢專案清單，依角色決定範圍
  let projectList: (typeof projects.$inferSelect)[] = []
  try {
    if (role === 'client') {
      // client 角色：先用 email 查出 user.id，再過濾 client_id
      // 原因：JWT 中的 user.id 需要 P4 的 jwt callback 擴充才可靠，此處用 email 迂迴
      const userEmail = session?.user?.email ?? ''
      if (userEmail) {
        const [currentUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, userEmail))

        if (currentUser) {
          projectList = await db
            .select()
            .from(projects)
            .where(eq(projects.client_id, currentUser.id))
        }
      }
    } else {
      // admin / team_member：看全部專案
      projectList = await db.select().from(projects)
    }
  } catch (e) {
    // DB 查詢失敗時降級顯示空清單，不讓整頁 crash
    console.error('[dashboard] 查詢專案失敗：', e)
    projectList = []
  }

  return (
    <div>
      {/* 頁面標題 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">專案總覽</h1>
        <p className="text-gray-600 mt-1">管理你的所有客戶專案</p>
      </div>

      {projectList.length === 0 ? (
        /* 無資料時的空狀態提示 */
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">目前沒有專案</p>
          <p className="text-sm mt-1">請確認資料庫已執行 seed 腳本</p>
        </div>
      ) : (
        /* 響應式卡片格 */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectList.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}
