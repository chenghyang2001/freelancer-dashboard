/**
 * 資料庫 Seed 腳本
 * 建立 demo 用途的初始資料：3 名使用者、1 個專案、6 個任務、3 筆成員關聯
 *
 * 執行方式：npx tsx lib/db/seed.ts
 * 前置條件：DATABASE_URL 環境變數已設定，資料表已透過 db:push 或 db:migrate 建立
 */
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import bcrypt from 'bcryptjs'
import { db } from './index'
import { users, projects, tasks, project_members } from './schema'

/** bcrypt hash rounds（10 是業界常用平衡值：安全 vs 效能） */
const BCRYPT_ROUNDS = 10

async function seed(): Promise<void> {
  console.log('開始執行 seed...')

  // --- 1. 建立使用者 ---
  const passwordHash = await bcrypt.hash('password', BCRYPT_ROUNDS)

  const [adminUser, teamUser, clientUser] = await Promise.all([
    db
      .insert(users)
      .values({
        name: 'Admin User',
        email: 'admin@demo.com',
        password_hash: passwordHash,
        role: 'admin',
      })
      .onConflictDoNothing()
      .returning(),

    db
      .insert(users)
      .values({
        name: 'Team Member',
        email: 'team@demo.com',
        password_hash: passwordHash,
        role: 'team_member',
      })
      .onConflictDoNothing()
      .returning(),

    db
      .insert(users)
      .values({
        name: 'Client User',
        email: 'client@demo.com',
        password_hash: passwordHash,
        role: 'client',
      })
      .onConflictDoNothing()
      .returning(),
  ])

  /**
   * onConflictDoNothing 回傳空陣列代表記錄已存在
   * 需要從資料庫重新查詢取得實際 id
   */
  const { eq } = await import('drizzle-orm')

  const fetchUser = async (email: string) => {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
    if (result.length === 0) throw new Error(`找不到使用者 ${email}`)
    return result[0]
  }

  const admin = adminUser[0] ?? (await fetchUser('admin@demo.com'))
  const team = teamUser[0] ?? (await fetchUser('team@demo.com'))
  const client = clientUser[0] ?? (await fetchUser('client@demo.com'))

  console.log(`✓ 使用者建立完成（admin: ${admin.id}）`)

  // --- 2. 建立專案 ---
  const [projectRecord] = await db
    .insert(projects)
    .values({
      name: 'Marketing Website Redesign',
      description: '重新設計行銷官網，提升品牌形象與轉換率',
      /** client_id 指向客戶使用者，代表此專案的委託方 */
      client_id: client.id,
    })
    .onConflictDoNothing()
    .returning()

  let project = projectRecord
  if (!project) {
    /** 若已存在則查詢第一個同名專案 */
    const { eq: eqOp } = await import('drizzle-orm')
    const existing = await db
      .select()
      .from(projects)
      .where(eqOp(projects.name, 'Marketing Website Redesign'))
      .limit(1)
    if (existing.length === 0) throw new Error('找不到或無法建立專案')
    project = existing[0]
  }

  console.log(`✓ 專案建立完成（id: ${project.id}）`)

  // --- 3. 建立任務（每種 status 各 1-2 個） ---
  await db
    .insert(tasks)
    .values([
      {
        project_id: project.id,
        title: '設計首頁 Hero 區塊',
        description: '包含主視覺、標語文案與 CTA 按鈕設計',
        status: 'todo',
        assignee_id: team.id,
        order: 1,
      },
      {
        project_id: project.id,
        title: '建立導覽選單',
        description: '響應式 Navbar，包含 Mobile hamburger 選單',
        status: 'todo',
        assignee_id: team.id,
        order: 2,
      },
      {
        project_id: project.id,
        title: '開發聯絡表單',
        description: '前後端驗證 + Email 通知整合',
        status: 'in_progress',
        assignee_id: team.id,
        order: 1,
      },
      {
        project_id: project.id,
        title: '整合 Google Analytics',
        description: 'GA4 事件追蹤，覆蓋頁面瀏覽與轉換目標',
        status: 'in_progress',
        assignee_id: admin.id,
        order: 2,
      },
      {
        project_id: project.id,
        title: '撰寫使用者測試報告',
        description: '彙整 5 位受測者的 UX 測試結果',
        status: 'review',
        assignee_id: team.id,
        order: 1,
      },
      {
        project_id: project.id,
        title: '修正 SEO meta 標籤',
        description: 'Open Graph / Twitter Card / 結構化資料補齊',
        status: 'done',
        assignee_id: team.id,
        order: 1,
      },
    ])
    .onConflictDoNothing()

  console.log(`✓ 任務建立完成（共 6 個）`)

  // --- 4. 建立專案成員關聯 ---
  await db
    .insert(project_members)
    .values([
      { project_id: project.id, user_id: admin.id, role: 'owner' },
      { project_id: project.id, user_id: team.id, role: 'member' },
      { project_id: project.id, user_id: client.id, role: 'viewer' },
    ])
    .onConflictDoNothing()

  console.log(`✓ 專案成員關聯建立完成`)
  console.log('Seed 完成！')
}

/** 保護：只在直接執行時才跑 seed，避免被 import 時觸發 */
if (require.main === module) {
  seed()
    .then(() => {
      process.exit(0)
    })
    .catch((err: unknown) => {
      console.error('Seed 失敗：', err)
      process.exit(1)
    })
}
