/**
 * Drizzle Kit 設定檔
 * 用於 db:generate / db:migrate / db:push 指令
 * dialect 設為 postgresql（對應 Neon Serverless PostgreSQL）
 */
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import type { Config } from 'drizzle-kit'

export default {
  /** schema 定義位置 */
  schema: './lib/db/schema.ts',
  /** migration 檔案輸出目錄 */
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    /** build 時不需要此變數，僅 migrate/push 時使用 */
    url: process.env.DATABASE_URL!,
  },
} satisfies Config
