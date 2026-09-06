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
  workDate: string;
  templateId: string | null;
  repeatDaily: boolean;
};

export type TaskInput = Omit<TaskRecord, 'id' | 'status' | 'templateId'>;
export type TaskUpdate = Omit<TaskRecord, 'status' | 'workDate' | 'templateId'>;

const seedTasks: Omit<TaskRecord, 'id' | 'workDate' | 'templateId' | 'repeatDaily'>[] = [
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
  const templateId = typeof row.template_id === 'string' && row.template_id ? row.template_id : null;
  return {
    id: Number(row.id),
    title: String(row.title),
    category: String(row.category),
    assignee: String(row.assignee),
    dueTime: String(row.due_time),
    status: String(row.status) as TaskStatus,
    priority: String(row.priority) as TaskPriority,
    workDate: String(row.work_date),
    templateId,
    repeatDaily: templateId !== null,
  };
}

async function readTasks(workDate: string) {
  const result = await db().prepare(`
    SELECT id, title, category, assignee, due_time, status, priority, work_date, template_id
    FROM tasks
    WHERE work_date = ?
    ORDER BY CASE status WHEN 'doing' THEN 0 WHEN 'todo' THEN 1 ELSE 2 END, due_time ASC, id ASC
  `).bind(workDate).all();
  return result.results.map(mapRow);
}

export async function listTasks(workDate: string) {
  const database = db();
  await database.prepare(`
    UPDATE tasks SET work_date = ? WHERE work_date = '1970-01-01'
  `).bind(workDate).run();

  const initialized = await database.prepare(`
    SELECT work_date FROM board_days WHERE work_date = ?
  `).bind(workDate).first();

  if (!initialized) {
    const currentTasks = await readTasks(workDate);
    if (currentTasks.length === 0) {
      const previousDate = await database.prepare(`
        SELECT MAX(work_date) AS work_date FROM tasks WHERE work_date < ?
      `).bind(workDate).first<{ work_date: string | null }>();

      if (previousDate?.work_date) {
        await database.batch([
          database.prepare(`
            INSERT INTO tasks (title, category, assignee, due_time, status, priority, work_date, template_id)
            SELECT title, category, assignee, due_time, 'todo', priority, ?, NULL
            FROM tasks
            WHERE work_date = ? AND status != 'done' AND template_id IS NULL
          `).bind(workDate, previousDate.work_date),
          database.prepare(`
            INSERT OR IGNORE INTO tasks (title, category, assignee, due_time, status, priority, work_date, template_id)
            SELECT title, category, assignee, due_time, 'todo', priority, ?, id
            FROM task_templates WHERE active = 1
          `).bind(workDate),
          database.prepare(`INSERT INTO board_days (work_date) VALUES (?)`).bind(workDate),
        ]);
      } else {
        const previousUse = await database.prepare(`
          SELECT seq FROM sqlite_sequence WHERE name = 'tasks'
        `).first();
        const statements = [];
        if (!previousUse) {
          statements.push(...seedTasks.map((task) => database.prepare(`
            INSERT INTO tasks (title, category, assignee, due_time, status, priority, work_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind(task.title, task.category, task.assignee, task.dueTime, task.status, task.priority, workDate)));
        }
        statements.push(
          database.prepare(`
            INSERT OR IGNORE INTO tasks (title, category, assignee, due_time, status, priority, work_date, template_id)
            SELECT title, category, assignee, due_time, 'todo', priority, ?, id
            FROM task_templates WHERE active = 1
          `).bind(workDate),
          database.prepare(`INSERT INTO board_days (work_date) VALUES (?)`).bind(workDate),
        );
        await database.batch(statements);
      }
    } else {
      await database.prepare(`INSERT INTO board_days (work_date) VALUES (?)`).bind(workDate).run();
    }
  }

  return readTasks(workDate);
}

export async function createTask(task: TaskInput) {
  const database = db();
  await database.prepare(`INSERT OR IGNORE INTO board_days (work_date) VALUES (?)`).bind(task.workDate).run();

  if (task.repeatDaily) {
    const templateId = crypto.randomUUID();
    await database.batch([
      database.prepare(`
        INSERT INTO task_templates (id, title, category, assignee, due_time, priority, active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).bind(templateId, task.title, task.category, task.assignee, task.dueTime, task.priority),
      database.prepare(`
        INSERT INTO tasks (title, category, assignee, due_time, status, priority, work_date, template_id)
        VALUES (?, ?, ?, ?, 'todo', ?, ?, ?)
      `).bind(task.title, task.category, task.assignee, task.dueTime, task.priority, task.workDate, templateId),
    ]);
    const result = await database.prepare(`
      SELECT id, title, category, assignee, due_time, status, priority, work_date, template_id
      FROM tasks WHERE work_date = ? AND template_id = ?
    `).bind(task.workDate, templateId).first();
    if (!result) throw new Error('Task could not be created');
    return mapRow(result);
  }

  const result = await database.prepare(`
    INSERT INTO tasks (title, category, assignee, due_time, status, priority, work_date)
    VALUES (?, ?, ?, ?, 'todo', ?, ?)
    RETURNING id, title, category, assignee, due_time, status, priority, work_date, template_id
  `).bind(task.title, task.category, task.assignee, task.dueTime, task.priority, task.workDate).first();
  if (!result) throw new Error('Task could not be created');
  return mapRow(result);
}

export async function updateTask(task: TaskUpdate) {
  const database = db();
  const existing = await database.prepare(`
    SELECT id, title, category, assignee, due_time, status, priority, work_date, template_id
    FROM tasks WHERE id = ?
  `).bind(task.id).first();
  if (!existing) throw new Error('Task not found');
  const current = mapRow(existing);

  if (task.repeatDaily && current.templateId) {
    await database.batch([
      database.prepare(`
        UPDATE tasks SET title = ?, category = ?, assignee = ?, due_time = ?, priority = ? WHERE id = ?
      `).bind(task.title, task.category, task.assignee, task.dueTime, task.priority, task.id),
      database.prepare(`
        UPDATE task_templates SET title = ?, category = ?, assignee = ?, due_time = ?, priority = ?, active = 1 WHERE id = ?
      `).bind(task.title, task.category, task.assignee, task.dueTime, task.priority, current.templateId),
    ]);
  } else if (task.repeatDaily) {
    const templateId = crypto.randomUUID();
    await database.batch([
      database.prepare(`
        INSERT INTO task_templates (id, title, category, assignee, due_time, priority, active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).bind(templateId, task.title, task.category, task.assignee, task.dueTime, task.priority),
      database.prepare(`
        UPDATE tasks SET title = ?, category = ?, assignee = ?, due_time = ?, priority = ?, template_id = ? WHERE id = ?
      `).bind(task.title, task.category, task.assignee, task.dueTime, task.priority, templateId, task.id),
    ]);
  } else if (current.templateId) {
    await database.batch([
      database.prepare(`
        UPDATE tasks SET title = ?, category = ?, assignee = ?, due_time = ?, priority = ?, template_id = NULL WHERE id = ?
      `).bind(task.title, task.category, task.assignee, task.dueTime, task.priority, task.id),
      database.prepare(`UPDATE task_templates SET active = 0 WHERE id = ?`).bind(current.templateId),
    ]);
  } else {
    await database.prepare(`
      UPDATE tasks SET title = ?, category = ?, assignee = ?, due_time = ?, priority = ? WHERE id = ?
    `).bind(task.title, task.category, task.assignee, task.dueTime, task.priority, task.id).run();
  }

  const result = await database.prepare(`
    SELECT id, title, category, assignee, due_time, status, priority, work_date, template_id
    FROM tasks WHERE id = ?
  `).bind(task.id).first();
  if (!result) throw new Error('Task not found');
  return mapRow(result);
}

export async function updateTaskStatus(id: number, status: TaskStatus, completedBy = '') {
  const database = db();
  const previous = await database.prepare(`
    SELECT id, title, category, assignee, due_time, status, priority, work_date, template_id
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
    SELECT id, title, category, assignee, due_time, status, priority, work_date, template_id
    FROM tasks WHERE id = ?
  `).bind(id).first();
  if (!result) throw new Error('Task not found');
  return mapRow(result);
}

export async function deleteTask(id: number) {
  const database = db();
  const existing = await database.prepare(`
    SELECT id, title, category, assignee, due_time, status, priority, work_date, template_id
    FROM tasks WHERE id = ?
  `).bind(id).first();
  if (!existing) throw new Error('Task not found');
  const task = mapRow(existing);
  if (task.templateId) {
    await database.batch([
      database.prepare(`DELETE FROM tasks WHERE id = ?`).bind(id),
      database.prepare(`UPDATE task_templates SET active = 0 WHERE id = ?`).bind(task.templateId),
    ]);
  } else {
    await database.prepare(`DELETE FROM tasks WHERE id = ?`).bind(id).run();
  }
  return task;
}
