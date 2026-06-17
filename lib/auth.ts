/**
 * Auth.js v5（NextAuth）認證配置
 *
 * 為什麼用 Credentials provider 而非 OAuth：
 * Demo 環境需要預設帳號（admin/team/client）直接測試角色切換，
 * 不依賴外部 Google / GitHub OAuth 的設定。
 *
 * 為什麼在 jwt callback 把 role 寫進 token：
 * NextAuth 預設的 Session user 型別沒有 role 欄位，
 * 必須透過 jwt → session 兩段傳遞才能讓前端讀到。
 */
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { db } from './db'
import { users } from './db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

/** 登入表單的 Zod schema，防止空白 email / password 進入 DB 查詢 */
const LoginSchema = z.object({
  email: z.string().email('請輸入有效的電子郵件'),
  password: z.string().min(1, '密碼不可為空'),
})

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      /**
       * authorize 回傳 null 代表驗證失敗（NextAuth 不拋出錯誤給前端）
       * 回傳 user object 代表驗證成功，NextAuth 將其序列化進 JWT
       */
      async authorize(credentials) {
        // Zod 驗證輸入格式
        const parsed = LoginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        let user: typeof users.$inferSelect | undefined
        try {
          // 查詢 DB，使用參數化查詢（eq 內部使用 prepared statement）
          const result = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
          user = result[0]
        } catch (err) {
          // DB 連線錯誤時不洩漏內部細節，只記錄 server log
          console.error('[auth] DB 查詢失敗：', err)
          return null
        }

        if (!user) return null

        // 比對 bcrypt hash，timing-safe（bcryptjs 內部實作）
        const valid = await bcrypt.compare(password, user.password_hash)
        if (!valid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          // role 不在 NextAuth 預設 User 型別，透過 jwt callback 傳遞
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    /**
     * jwt callback：登入時把 role 存進 JWT token
     * user 只在首次登入時存在（後續 refresh 時 user 為 undefined）
     */
    jwt({ token, user }) {
      if (user) {
        // NextAuth User 型別沒有 role，使用型別斷言取得自訂欄位
        token.role = (user as { role?: string }).role
      }
      return token
    },
    /**
     * session callback：把 JWT token 中的 role 寫進 session.user
     * 讓前端 useSession() 可以讀到 role
     */
    session({ session, token }) {
      if (token.role) {
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: {
    /** 自訂登入頁，避免使用 NextAuth 預設的英文登入頁 */
    signIn: '/login',
  },
  session: {
    /** JWT 策略：不需要 DB session 表，role 資訊存在 token 中 */
    strategy: 'jwt',
  },
})
