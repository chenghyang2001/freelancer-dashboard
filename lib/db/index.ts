/**
 * Drizzle ORM 資料庫連線（Lazy Init + Proxy Pattern）
 *
 * 為什麼用 Proxy 而不直接 `export const db = drizzle(...)`：
 * neon-http 在呼叫 `neon(url)` 時就會驗證 DATABASE_URL，
 * 若放在模組頂層，Next.js build 階段環境變數尚未注入會直接 throw。
 * Proxy 讓初始化延遲到第一次實際查詢才執行，build 時安全。
 */
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>

/** 單例快取，避免每次請求重複建立連線 */
let _db: DrizzleDb | null = null

/**
 * 取得 Drizzle 資料庫實例（首次呼叫時初始化）
 * 若 DATABASE_URL 未設定，明確拋出錯誤而非靜默失敗
 */
function getDb(): DrizzleDb {
  if (!_db) {
    const url = process.env.DATABASE_URL
    if (!url) {
      throw new Error(
        '缺少環境變數 DATABASE_URL。請在 .env.local 設定 Neon 連線字串。'
      )
    }
    _db = drizzle(neon(url), { schema })
  }
  return _db
}

/**
 * 資料庫操作的統一入口
 * 透過 Proxy 實現懶載入，所有 property 存取都會觸發 getDb()
 */
export const db = new Proxy({} as DrizzleDb, {
  get(_, prop) {
    return Reflect.get(getDb(), prop)
  },
})
