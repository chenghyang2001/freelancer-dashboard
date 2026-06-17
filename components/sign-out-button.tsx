'use client'

/**
 * SignOutButton — 唯一需要 'use client' 的 Sidebar 子元件
 *
 * 為什麼獨立抽成 Client Component：
 * signOut() 來自 'next-auth/react'，必須在瀏覽器環境執行（onClick 事件）。
 * 若整個 Sidebar 加 'use client' 會把所有 server-only 邏輯（角色過濾等）
 * 移到客戶端，浪費 bundle size。最小化 Client Component 邊界是 Next.js 最佳實踐。
 */
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="w-full mt-2 text-slate-400 hover:text-white hover:bg-slate-800 justify-start"
    >
      登出
    </Button>
  )
}
