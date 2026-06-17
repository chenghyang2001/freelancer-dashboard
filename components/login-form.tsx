'use client'

/**
 * LoginForm — 登入表單 Client Component
 *
 * 為什麼用 'use client'：
 * 需要 useState（受控輸入）、useRouter（登入後跳頁）、
 * 以及 signIn（client-side next-auth/react），
 * 這些 API 都只能在瀏覽器端執行。
 *
 * 為什麼用 redirect: false：
 * signIn 預設會做伺服器端 redirect，在 App Router 下會丟失錯誤訊息。
 * redirect: false 讓我們自行判斷 result.error 並顯示繁中錯誤提示，
 * 成功則用 router.push 跳頁（可觸發 Next.js client-side navigation）。
 */
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        // NextAuth 把所有驗證失敗都歸類為 'CredentialsSignin'，
        // 對使用者顯示友善的繁中訊息，不洩漏是帳號錯還是密碼錯
        setError('電子郵件或密碼錯誤')
      } else {
        // router.refresh() 讓 Server Component 重新取得最新 session
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      // 網路錯誤或其他非預期例外
      setError('登入時發生錯誤，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>登入</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 電子郵件輸入 */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              電子郵件
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your@email.com"
              required
              autoComplete="email"
            />
          </div>

          {/* 密碼輸入 */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              密碼
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {/* 錯誤訊息區塊，只在有錯誤時顯示 */}
          {error && (
            <div
              role="alert"
              className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600"
            >
              {error}
            </div>
          )}

          {/* 提交按鈕，loading 時禁用防止重複送出 */}
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? '登入中...' : '登入'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
