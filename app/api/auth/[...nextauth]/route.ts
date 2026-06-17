/**
 * NextAuth v5 API Route（Catch-all handler）
 *
 * 為什麼是 [...nextauth]（catch-all segment）：
 * NextAuth 需要處理多個端點（/api/auth/signin、/api/auth/signout、
 * /api/auth/session、/api/auth/csrf 等），catch-all route 讓 NextAuth
 * 自行路由這些請求，不需要一一手動建立。
 *
 * GET/POST 分別處理：
 * - GET：session 查詢、signout redirect、csrf token
 * - POST：signIn 提交、signout 操作
 */
import { handlers } from '@/lib/auth'

export const { GET, POST } = handlers
