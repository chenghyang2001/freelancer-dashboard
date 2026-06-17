/**
 * Dashboard Layout — Server Component
 *
 * 為什麼在 layout 做認證守衛：
 * 所有 /dashboard/* 路由都必須登入，統一在 layout 攔截可避免
 * 每個子頁面重複寫 redirect 邏輯（DRY 原則）。
 * middleware.ts 做第一道防線，layout 做第二道（防 middleware 漏網）。
 */
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  // 未登入 → 導向登入頁
  if (!session) redirect('/login')

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar user={session.user} />
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  )
}
