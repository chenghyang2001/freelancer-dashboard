'use client'

/**
 * KanbanBoard — 拖曳看板主元件
 *
 * 為什麼用樂觀更新（optimistic update）：
 * Server Action 需要網路往返，若等待完成才更新 UI，使用者拖曳後
 * 會看到卡片瞬間跳回原位再移過去，體驗很差。
 * 樂觀更新先在 client 端移動卡片，失敗時再 reload 整頁回滾。
 *
 * 為什麼 isReadOnly 時不包 DndContext：
 * dnd-kit 的 sensor 在唯讀模式下仍會綁定事件監聽，
 * 完全不渲染 DndContext 可以避免不必要的 event handler 開銷。
 */

import { useState, useTransition } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { KanbanColumn } from '@/components/kanban-column'
import { updateTaskStatus, TaskStatusType } from '@/actions/tasks'
import type { Task } from '@/lib/db/schema'

type KanbanBoardProps = {
  columns: Record<string, Task[]>
  projectId: string
  isReadOnly: boolean
}

const COLUMN_TITLES: Record<string, string> = {
  todo: '待辦',
  in_progress: '進行中',
  review: '審閱',
  done: '完成',
}

/** 欄位顯示順序：按工作流程從左到右排列 */
const COLUMN_ORDER = ['todo', 'in_progress', 'review', 'done']

export function KanbanBoard({
  columns: initialColumns,
  projectId,
  isReadOnly,
}: KanbanBoardProps) {
  const [columns, setColumns] = useState(initialColumns)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // 需要拖曳距離 8px 才觸發，避免誤觸點擊事件
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    // 沒有放到任何 droppable 區域，不處理
    if (!over) return

    const taskId = active.id as string
    const newStatus = over.id as TaskStatusType

    // 找出任務目前所在欄位
    let oldStatus: string | null = null
    for (const [status, taskList] of Object.entries(columns)) {
      if (taskList.find(t => t.id === taskId)) {
        oldStatus = status
        break
      }
    }

    // 找不到任務或狀態未變更，不做任何事
    if (!oldStatus || oldStatus === newStatus) return

    // 樂觀更新：先在 client 端移動卡片，不等 server 回應
    setColumns(prev => {
      const task = prev[oldStatus!].find(t => t.id === taskId)
      if (!task) return prev
      return {
        ...prev,
        [oldStatus!]: prev[oldStatus!].filter(t => t.id !== taskId),
        [newStatus]: [...(prev[newStatus] ?? []), { ...task, status: newStatus }],
      }
    })

    // 在背景同步到 server（useTransition 不阻塞 UI）
    startTransition(async () => {
      try {
        await updateTaskStatus(taskId, newStatus, projectId)
      } catch (error) {
        // Server Action 失敗：記錄錯誤並 reload 讓 UI 回到真實狀態
        console.error('[KanbanBoard] 更新任務狀態失敗：', error)
        window.location.reload()
      }
    })
  }

  // 唯讀模式：不包 DndContext，完全停用拖曳功能
  if (isReadOnly) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMN_ORDER.map(colId => (
          <KanbanColumn
            key={colId}
            id={colId}
            title={COLUMN_TITLES[colId]}
            tasks={columns[colId] ?? []}
            isReadOnly={true}
          />
        ))}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* isPending 時降低不透明度，提示使用者正在同步中 */}
      <div className={`flex gap-4 overflow-x-auto pb-4 ${isPending ? 'opacity-70' : ''}`}>
        {COLUMN_ORDER.map(colId => (
          <KanbanColumn
            key={colId}
            id={colId}
            title={COLUMN_TITLES[colId]}
            tasks={columns[colId] ?? []}
            isReadOnly={false}
          />
        ))}
      </div>
    </DndContext>
  )
}
