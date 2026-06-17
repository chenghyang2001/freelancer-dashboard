/**
 * NextAuth Session 型別擴充
 *
 * 為什麼需要這個檔案：
 * NextAuth 預設的 Session['user'] 型別只有 name / email / image，
 * 沒有 role 欄位。TypeScript strict 模式下直接存取 session.user.role 會報錯。
 * 透過 module augmentation（宣告合併）擴充既有型別，
 * 讓整個專案都能型別安全地使用 session.user.role。
 */
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      /** 使用者角色：admin | team_member | client */
      role?: string
    } & DefaultSession['user']
  }
}
