import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  category: text('category').notNull().default('仕込み'),
  assignee: text('assignee').notNull().default(''),
  dueTime: text('due_time').notNull(),
  status: text('status', { enum: ['todo', 'doing', 'done'] }).notNull().default('todo'),
  priority: text('priority', { enum: ['normal', 'high'] }).notNull().default('normal'),
  workDate: text('work_date').notNull().default('1970-01-01'),
  templateId: text('template_id'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_tasks_work_date_status').on(table.workDate, table.status),
  uniqueIndex('idx_tasks_work_date_template').on(table.workDate, table.templateId).where(sql`${table.templateId} IS NOT NULL`),
]);

export const boardDays = sqliteTable('board_days', {
  workDate: text('work_date').primaryKey(),
  initializedAt: text('initialized_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const taskTemplates = sqliteTable('task_templates', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  category: text('category').notNull().default('仕込み'),
  assignee: text('assignee').notNull().default(''),
  dueTime: text('due_time').notNull(),
  priority: text('priority', { enum: ['normal', 'high'] }).notNull().default('normal'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const staffMembers = sqliteTable('staff_members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex('idx_staff_members_name').on(table.name)]);

export const completionHistory = sqliteTable('completion_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: integer('task_id'),
  taskTitle: text('task_title').notNull(),
  completedBy: text('completed_by').notNull(),
  completedAt: text('completed_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index('idx_completion_history_completed_at').on(table.completedAt)]);
