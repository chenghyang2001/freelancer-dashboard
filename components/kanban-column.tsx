'use client'

/**
 * KanbanColumn — 看板欄位元件（Drop Zone）
 *
 * 為什麼 isReadOnly 時不設 ref：
 * useDroppable 的 setNodeRef 會向 dnd-kit 登記這個 DOM 節點為 drop zone，
 * 唯讀模式下不需要接受 drop，傳 undefined 可避免事件監聽器洩漏。
 *
 * 為什麼 min-h-[120px]：
 * 空欄位需要有足夠高度讓使用者可以拖入，否則 drop zone 面積為零
 * 導致無法放置。
 */

import { useDroppable } from '@dnd-kit/core'
import { TaskCard } from '@/components/task-card'
import { Badge } from '@/components/ui/badge'
import type { Task } from '@/lib/db/schema'

type KanbanColumnProps = {
  id: string
  title: string
  tasks: Task[]
  isReadOnly: boolean
}

/** 各欄位對應的背景色，用色調暗示工作階段 */
const COLUMN_COLORS: Record<string, string> = {
  todo: 'bg-slate-100',
  in_progress: 'bg-blue-50',
  review: 'bg-amber-50',
  done: 'bg-green-50',
}

export function KanbanColumn({
  id,
  title,
  tasks,
  isReadOnly,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={isReadOnly ? undefined : setNodeRef}
      className={[
        'flex-shrink-0 w-72 rounded-xl p-3',
        COLUMN_COLORS[id] ?? 'bg-gray-100',
        // isOver 時顯示藍色邊框，提示使用者可以放置
        isOver ? 'ring-2 ring-blue-400' : '',
      ].join(' ')}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700 text-sm">{title}</h3>
        <Badge variant="secondary" className="text-xs">
          {tasks.length}
        </Badge>
      </div>

      {/* min-h-[120px] 確保空欄位有足夠的 drop zone 面積 */}
      <div className="space-y-2 min-h-[120px]">
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} isReadOnly={isReadOnly} />
        ))}
        {tasks.length === 0 && (
          <div className="text-center text-gray-400 text-xs py-8">
            {isReadOnly ? '此欄位無任務' : '拖曳任務至此'}
          </div>
        )}
      </div>
    </div>
  )
}
