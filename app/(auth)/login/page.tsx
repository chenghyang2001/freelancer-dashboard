/**
 * 登入頁面（Server Component）
 *
 * 為什麼是 (auth) Route Group：
 * Next.js 的 Route Group（括號包住的目錄名）不影響 URL 路徑，
 * /login 的實際路由仍是 /login，括號只用於組織 layout 群組。
 * 這讓登入頁可以有自己的 layout（不含 dashboard sidebar），
 * 與主應用的 layout 區隔。
 *
 * 為什麼是 Server Component：
 * 頁面本身只渲染靜態 HTML 結構，互動邏輯全在 LoginForm（Client Component）。
 * Server Component 讓這層不打包進客戶端 JS bundle。
 */
import { LoginForm } from '@/components/login-form'

export const metadata = {
  title: '登入 | Freelancer Dashboard',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md px-4">
        {/* 品牌標題區塊 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Freelancer Dashboard</h1>
          <p className="text-gray-600 mt-2">登入你的帳號</p>
        </div>

        {/* 登入表單（Client Component，含互動邏輯） */}
        <LoginForm />

        {/* Demo 帳號提示，方便測試不同角色 */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-gray-600">
          <p className="font-medium mb-2">Demo 帳號：</p>
          <p>Admin: admin@demo.com / password</p>
          <p>Team: team@demo.com / password</p>
          <p>Client: client@demo.com / password</p>
        </div>
      </div>
    </div>
  )
}
