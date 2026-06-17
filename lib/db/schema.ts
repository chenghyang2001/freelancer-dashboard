/**
 * Drizzle ORM schema 定義
 * 包含 users / projects / tasks / project_members 四張資料表
 * 使用 Neon Serverless PostgreSQL 作為資料庫
 */
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core'

// --- Enum 定義 ---

/** 使用者角色：admin = 管理員、team_member = 團隊成員、client = 客戶 */
export const userRoleEnum = pgEnum('user_role', [
  'admin',
  'team_member',
  'client',
])

/** 任務狀態：todo → in_progress → review → done */
export const taskStatusEnum = pgEnum('task_status', [
  'todo',
  'in_progress',
  'review',
  'done',
])

/** 專案成員角色：owner = 擁有者、member = 成員、viewer = 唯讀觀察者 */
export const projectMemberRoleEnum = pgEnum('project_member_role', [
  'owner',
  'member',
  'viewer',
])

// --- 資料表定義 ---

/** 使用者資料表 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  /** email 全域唯一，用於登入 */
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('team_member'),
  created_at: timestamp('created_at').notNull().defaultNow(),
})

/** 專案資料表 */
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  /** client_id 關聯 users.id（代表此專案的客戶） */
  client_id: uuid('client_id')
    .notNull()
    .references(() => users.id),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

/** 任務資料表 */
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id')
    .notNull()
    .references(() => projects.id),
  title: text('title').notNull(),
  description: text('description'),
  status: taskStatusEnum('status').notNull().default('todo'),
  /** assignee_id 可為 null（尚未指派） */
  assignee_id: uuid('assignee_id').references(() => users.id),
  /** order 用於看板欄位內的排序 */
  order: integer('order').notNull().default(0),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

/** 專案成員關聯資料表（多對多） */
export const project_members = pgTable('project_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id')
    .notNull()
    .references(() => projects.id),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id),
  role: projectMemberRoleEnum('role').notNull().default('member'),
  created_at: timestamp('created_at').notNull().defaultNow(),
})

// --- 型別匯出 ---

export type User = typeof users.$inferSelect
export type Project = typeof projects.$inferSelect
export type Task = typeof tasks.$inferSelect
export type ProjectMember = typeof project_members.$inferSelect

/** 任務狀態的字串聯合型別 */
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'

/** 使用者角色的字串聯合型別 */
export type UserRole = 'admin' | 'team_member' | 'client'
