/**
 * Sidebar — Server Component（不加 'use client'）
 *
 * 為什麼 Sidebar 是 Server Component：
 * 導覽連結、使用者資訊、角色判斷都是靜態渲染，
 * 不需要 useState/useEffect，保持 Server Component 可減少客戶端 JS bundle。
 * 唯一需要互動的「登出按鈕」抽出為獨立的 Client Component（<SignOutButton>）。
 */
import Link from 'next/link'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { RoleBadge } from '@/components/role-badge'
import { SignOutButton } from '@/components/sign-out-button'
import type { Session } from 'next-auth'

type SidebarProps = {
  user: Session['user']
}

/** 導覽項目定義，roles 欄位控制哪些角色可見 */
const navItems = [
  {
    href: '/dashboard',
    label: '專案總覽',
    roles: ['admin', 'team_member', 'client'],
  },
  {
    href: '/dashboard/my-projects',
    label: '我的專案（客戶視角）',
    roles: ['client'],
  },
]

export function Sidebar({ user }: SidebarProps) {
  const userRole = user?.role ?? 'client'

  // 根據角色過濾導覽項目
  const visibleItems = navItems.filter((item) =>
    item.roles.includes(userRole)
  )

  // 取名字首字母作為 Avatar fallback（最多 2 個字元）
  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside className="w-64 flex-shrink-0 bg-slate-900 flex flex-col h-full">
      {/* Logo 區 */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            FD
          </div>
          <span className="text-white font-semibold">Freelancer Dashboard</span>
        </div>
      </div>

      {/* 導覽連結 */}
      <nav className="flex-1 p-4 space-y-1">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-sm"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* 底部：使用者資訊 + 登出 */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-blue-600 text-white text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
        <RoleBadge role={userRole} />
        <SignOutButton />
      </div>
    </aside>
  )
}
