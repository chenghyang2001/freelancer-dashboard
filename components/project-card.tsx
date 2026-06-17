/**
 * ProjectCard — 專案卡片元件（Server Component）
 *
 * 為什麼用 Link 包住整個 Card：
 * 讓整張卡片都可點擊（UX 友善），不只限於標題文字。
 * Next.js Link 做 client-side navigation，不重新整頁。
 *
 * 注意：project.created_at 是 Drizzle 回傳的 Date 物件（非字串），
 * 直接呼叫 toLocaleDateString 即可，不需要 new Date() 包裝。
 */
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Project } from '@/lib/db/schema'

type ProjectCardProps = {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/dashboard/projects/${project.id}`} className="block">
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base leading-tight">{project.name}</CardTitle>
            {/* 目前 schema 無 status 欄位，固定顯示「進行中」，待 P5 擴充 */}
            <Badge
              variant="secondary"
              className="text-xs ml-2 flex-shrink-0"
            >
              進行中
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 line-clamp-2">
            {project.description ?? '尚無描述'}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            建立：
            {project.created_at.toLocaleDateString('zh-TW')}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
