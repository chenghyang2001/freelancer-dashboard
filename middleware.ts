/**
 * Next.js Middleware — 認證路由保護
 *
 * 為什麼放在根目錄（與 app/ 同級）：
 * Next.js 的 middleware 只能放在根目錄或 src/ 根目錄，
 * 放在 app/ 裡面無法被 Next.js 識別。
 *
 * 為什麼使用 auth() 包裝而非手動解析 JWT：
 * auth() HOC 由 NextAuth v5 提供，會自動驗證 JWT、
 * 並將解析後的 session 注入 req.auth，省去手動 jwt.verify。
 *
 * 路由保護邏輯：
 * - /dashboard/* 未登入 → 導向 /login
 * - /login 已登入 → 導向 /dashboard（避免重複登入）
 */
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isOnDashboard = req.nextUrl.pathname.startsWith('/dashboard')
  const isOnLogin = req.nextUrl.pathname === '/login'

  // 未登入嘗試進入 dashboard → 強制導向登入頁
  if (isOnDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // 已登入嘗試進入登入頁 → 導向 dashboard（防止重複登入畫面）
  if (isOnLogin && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export const config = {
  /**
   * matcher 決定哪些路由會觸發此 middleware
   * :path* 表示所有子路由（如 /dashboard/projects/123）
   */
  matcher: ['/dashboard/:path*', '/login'],
}
