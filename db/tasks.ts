import { env } from 'cloudflare:workers';

export type TaskStatus = 'todo' | 'doing' | 'done';
export type TaskPriority = 'normal' | 'high';

export type TaskRecord = {
  id: number;
  title: string;
  category: string;
  assignee: string;
  dueTime: string;
  status: TaskStatus;
  priority: TaskPriority;
};

const seedTasks: Omit<TaskRecord, 'id'>[] = [
  { title: '玉ねぎをスライスする', category: '野菜', assignee: '田中', dueTime: '10:30', status: 'doing', priority: 'high' },
  { title: '鶏もも肉を20食分カット', category: '肉・魚', assignee: '佐藤', dueTime: '11:00', status: 'todo', priority: 'normal' },
  { title: 'ランチ用ソースを仕込む', category: 'ソース', assignee: '鈴木', dueTime: '11:15', status: 'todo', priority: 'normal' },
  { title: 'サラダを12皿盛り付け', category: '盛り付け', assignee: '', dueTime: '11:30', status: 'todo', priority: 'high' },
  { title: '米を4升炊く', category: '炊飯', assignee: '高橋', dueTime: '10:00', status: 'done', priority: 'normal' },
  { title: '冷蔵庫の温度を記録', category: '確認', assignee: '田中', dueTime: '09:30', status: 'done', priority: 'normal' },
];

function db() {
  if (!env.DB) throw new Error('Database is unavailable');
  return env.DB;
}

function mapRow(row: Record<string, unknown>): TaskRecord {
  return {
    id: Number(row.id),
    title: String(row.title),
    category: String(row.category),
    assignee: String(row.assignee),
    dueTime: String(row.due_time),
    status: String(row.status) as TaskStatus,
    priority: String(row.priority) as TaskPriority,
  };
}

export async function listTasks() {
  const database = db();
  let result = await database.prepare(`
    SELECT id, title, category, assignee, due_time, status, priority
    FROM tasks
    ORDER BY CASE status WHEN 'doing' THEN 0 WHEN 'todo' THEN 1 ELSE 2 END, due_time ASC, id ASC
  `).all();

  if (result.results.length === 0) {
    const previousUse = await database.prepare(`
      SELECT seq FROM sqlite_sequence WHERE name = 'tasks'
    `).first();
    if (!previousUse) {
      await database.batch(seedTasks.map((task) => database.prepare(`
        INSERT INTO tasks (title, category, assignee, due_time, status, priority)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(task.title, task.category, task.assignee, task.dueTime, task.status, task.priority)));
    }
    result = await database.prepare(`
      SELECT id, title, category, assignee, due_time, status, priority
      FROM tasks
      ORDER BY CASE status WHEN 'doing' THEN 0 WHEN 'todo' THEN 1 ELSE 2 END, due_time ASC, id ASC
    `).all();
  }

  return result.results.map(mapRow);
}

export async function createTask(task: Omit<TaskRecord, 'id' | 'status'>) {
  const result = await db().prepare(`
    INSERT INTO tasks (title, category, assignee, due_time, status, priority)
    VALUES (?, ?, ?, ?, 'todo', ?)
    RETURNING id, title, category, assignee, due_time, status, priority
  `).bind(task.title, task.category, task.assignee, task.dueTime, task.priority).first();
  if (!result) throw new Error('Task could not be created');
  return mapRow(result);
}

export async function updateTask(task: Omit<TaskRecord, 'status'>) {
  const result = await db().prepare(`
    UPDATE tasks
    SET title = ?, category = ?, assignee = ?, due_time = ?, priority = ?
    WHERE id = ?
    RETURNING id, title, category, assignee, due_time, status, priority
  `).bind(task.title, task.category, task.assignee, task.dueTime, task.priority, task.id).first();
  if (!result) throw new Error('Task not found');
  return mapRow(result);
}

export async function updateTaskStatus(id: number, status: TaskStatus, completedBy = '') {
  const database = db();
  const previous = await database.prepare(`
    SELECT id, title, category, assignee, due_time, status, priority
    FROM tasks WHERE id = ?
  `).bind(id).first();
  if (!previous) throw new Error('Task not found');

  if (status === 'done' && previous.status !== 'done') {
    if (!completedBy) throw new Error('Completed by is required');
    await database.batch([
      database.prepare(`UPDATE tasks SET status = ? WHERE id = ?`).bind(status, id),
      database.prepare(`
        INSERT INTO completion_history (task_id, task_title, completed_by)
        VALUES (?, ?, ?)
      `).bind(id, String(previous.title), completedBy),
    ]);
  } else {
    await database.prepare(`UPDATE tasks SET status = ? WHERE id = ?`).bind(status, id).run();
  }

  const result = await database.prepare(`
    SELECT id, title, category, assignee, due_time, status, priority
    FROM tasks WHERE id = ?
  `).bind(id).first();
  if (!result) throw new Error('Task not found');
  return mapRow(result);
}

export async function deleteTask(id: number) {
  const database = db();
  const existing = await database.prepare(`
    SELECT id, title, category, assignee, due_time, status, priority
    FROM tasks WHERE id = ?
  `).bind(id).first();
  if (!existing) throw new Error('Task not found');
  await database.prepare(`DELETE FROM tasks WHERE id = ?`).bind(id).run();
  return mapRow(existing);
}
