/**
 * 專案看板頁面（Server Component）
 *
 * 為什麼在 Server Component 查詢 DB：
 * 查詢不需要瀏覽器互動，在 server 端執行可避免 client 暴露 DB 連線，
 * 並讓 Next.js 快取機制（revalidatePath）正常運作。
 *
 * 為什麼傳 isReadOnly 給 KanbanBoard：
 * client 角色的使用者只能查看不能拖曳，在頂層決定後往下傳，
 * 避免每個子元件都需要讀 session。
 *
 * 為什麼將 notFound() 移到 try/catch 之外：
 * notFound() 拋出的是 Next.js 內部的 special error（非標準 Error），
 * 若放在 try 區塊內會被 catch 捕獲，導致 404 頁面無法正常渲染。
 * 分離「DB 查詢失敗（網路/連線錯誤）」和「查無資料（業務邏輯）」兩種情境。
 */

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks, projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { KanbanBoard } from '@/components/kanban-board'
import type { Task } from '@/lib/db/schema'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: PageProps) {
  // Next.js 15 的 params 是 Promise，必須 await 才能取得路由參數
  const { id } = await params
  const session = await auth()

  let project: typeof projects.$inferSelect | null = null
  let taskList: Task[] = []

  try {
    // 查詢專案資訊：DB 成功但查無資料 → null
    const [proj] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
    project = proj ?? null

    // 查詢該專案的所有任務
    taskList = await db
      .select()
      .from(tasks)
      .where(eq(tasks.project_id, id))
  } catch (err) {
    // DB/網路錯誤 → 讓 Next.js Error Boundary 處理，不靜默吃掉
    console.error('[ProjectPage] 資料查詢失敗：', err)
    throw err
  }

  // try/catch 之外做業務邏輯判斷：notFound() 不在 catch 範圍內，能正確觸發 404
  if (!project) notFound()

  // client 角色進入唯讀模式（禁止拖曳）
  const isReadOnly = session?.user?.role === 'client'

  // 按 status 分組，供 KanbanBoard 渲染各欄
  const columns: Record<string, Task[]> = {
    todo: taskList.filter(t => t.status === 'todo'),
    in_progress: taskList.filter(t => t.status === 'in_progress'),
    review: taskList.filter(t => t.status === 'review'),
    done: taskList.filter(t => t.status === 'done'),
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {project.name}
        </h1>
        <p className="text-gray-600 mt-1">
          共 {taskList.length} 個任務
          {isReadOnly && (
            <span className="ml-2 text-sm text-amber-600">（唯讀模式）</span>
          )}
        </p>
      </div>
      <KanbanBoard
        columns={columns}
        projectId={id}
        isReadOnly={isReadOnly}
      />
    </div>
  )
}
