'use client'

/**
 * TaskCard — 可拖曳的任務卡片
 *
 * 為什麼用 useDraggable 而非 useSortable：
 * 我們的看板只需要跨欄拖曳（改變 status），不需要欄內排序。
 * useDraggable 比 useSortable 輕量，不需要 SortableContext 包裝。
 *
 * 為什麼 disabled: isReadOnly：
 * dnd-kit 的 disabled prop 會停用拖曳事件但保留 DOM 結構，
 * 這樣唯讀卡片的樣式與互動版完全一致，只是不能拖。
 *
 * 為什麼用 CSS.Translate.toString 而非 CSS.Transform.toString：
 * Translate 只處理 x/y 位移，避免 transform 同時帶入非預期的 scale，
 * 拖曳時卡片大小保持不變。
 */

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import type { Task } from '@/lib/db/schema'

type TaskCardProps = {
  task: Task
  isReadOnly: boolean
}

export function TaskCard({ task, isReadOnly }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      // 唯讀模式停用拖曳，但保留 DOM 結構和樣式
      disabled: isReadOnly,
    })

  // transform 只在拖曳中才有值，靜止時為 undefined
  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  return (
    <Card
      ref={setNodeRef}
      style={style}
      // 唯讀模式不附加 dnd-kit 的 listeners 和 attributes（aria 等）
      {...(isReadOnly ? {} : { ...listeners, ...attributes })}
      className={[
        // 根據狀態切換游標：唯讀=default、可拖=grab、拖曳中=grabbing
        isReadOnly ? 'cursor-default' : 'cursor-grab',
        isDragging
          ? 'opacity-50 shadow-lg ring-2 ring-blue-400 cursor-grabbing'
          : '',
        'transition-shadow hover:shadow-md',
      ].join(' ')}
    >
      <CardContent className="p-3">
        <p className="text-sm font-medium text-gray-900">{task.title}</p>

        {/* description 可能為 null（schema 允許 null），渲染前需判斷 */}
        {task.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {task.description}
          </p>
        )}

        <p className="text-xs text-gray-400 mt-2">
          建立：{new Date(task.created_at).toLocaleDateString('zh-TW')}
        </p>
      </CardContent>
    </Card>
  )
}
