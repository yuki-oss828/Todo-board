import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  category: text('category').notNull().default('仕込み'),
  assignee: text('assignee').notNull().default(''),
  dueTime: text('due_time').notNull(),
  status: text('status', { enum: ['todo', 'doing', 'done'] }).notNull().default('todo'),
  priority: text('priority', { enum: ['normal', 'high'] }).notNull().default('normal'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});
