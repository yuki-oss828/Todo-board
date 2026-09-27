import { getSql } from './client';

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

const taskColumns = 'id, title, category, assignee, due_time, status, priority, work_date, template_id';

const seedTasks: Omit<TaskRecord, 'id' | 'workDate' | 'repeatDaily'>[] = [
  { title: 'カウンターを拭く', category: '開店前', assignee: '', dueTime: '', status: 'todo', priority: 'normal', templateId: 'opening-counter' },
  { title: 'ビールの調整をする', category: '開店前', assignee: '', dueTime: '', status: 'todo', priority: 'normal', templateId: 'opening-beer' },
  { title: '伝票を確認する', category: '開店前', assignee: '', dueTime: '', status: 'todo', priority: 'normal', templateId: 'opening-slips' },
  { title: '部屋をセットする', category: '開店前', assignee: '', dueTime: '', status: 'todo', priority: 'normal', templateId: 'opening-rooms' },
  { title: '氷を用意する', category: '開店前', assignee: '', dueTime: '', status: 'todo', priority: 'normal', templateId: 'opening-ice' },
  { title: 'コース料理を確認する', category: '開店前', assignee: '', dueTime: '', status: 'todo', priority: 'normal', templateId: 'opening-course' },
  { title: '1階トイレを確認する', category: '開店前', assignee: '', dueTime: '', status: 'todo', priority: 'normal', templateId: 'opening-toilet-1f' },
  { title: '2階のおしぼりウォーマーの電源を入れる', category: '開店前', assignee: '', dueTime: '', status: 'todo', priority: 'normal', templateId: 'opening-towels-2f' },
  { title: '2階のエアコンをつける', category: '開店前', assignee: '', dueTime: '', status: 'todo', priority: 'normal', templateId: 'opening-ac-2f' },
  { title: '2階トイレを確認する', category: '開店前', assignee: '', dueTime: '', status: 'todo', priority: 'normal', templateId: 'opening-toilet-2f' },
];

function asRows(result: unknown) {
  return result as Record<string, unknown>[];
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
  const result = await getSql().query(`
    SELECT ${taskColumns}
    FROM tasks
    WHERE work_date = $1
    ORDER BY CASE status WHEN 'doing' THEN 0 WHEN 'todo' THEN 1 ELSE 2 END, due_time ASC, id ASC
  `, [workDate]);
  return asRows(result).map(mapRow);
}

export async function listTasks(workDate: string) {
  const sql = getSql();
  const claimed = asRows(await sql.query(`
    INSERT INTO board_days (work_date) VALUES ($1)
    ON CONFLICT (work_date) DO NOTHING
    RETURNING work_date
  `, [workDate]));

  if (claimed.length === 0) return readTasks(workDate);

  try {
    const currentTasks = await readTasks(workDate);
    if (currentTasks.length > 0) return currentTasks;

    const previousRows = asRows(await sql.query(`
      SELECT MAX(work_date) AS work_date FROM tasks WHERE work_date < $1
    `, [workDate]));
    const previousDate = previousRows[0]?.work_date;

    if (typeof previousDate === 'string' && previousDate) {
      await sql.transaction([
        sql.query(`
          INSERT INTO tasks (title, category, assignee, due_time, status, priority, work_date, template_id)
          SELECT title, category, assignee, due_time, 'todo', priority, $1, NULL
          FROM tasks
          WHERE work_date = $2 AND status != 'done' AND template_id IS NULL
        `, [workDate, previousDate]),
        sql.query(`
          INSERT INTO tasks (title, category, assignee, due_time, status, priority, work_date, template_id)
          SELECT title, category, assignee, due_time, 'todo', priority, $1, id
          FROM task_templates WHERE active = TRUE
          ON CONFLICT (work_date, template_id) WHERE template_id IS NOT NULL DO NOTHING
        `, [workDate]),
      ]);
    } else {
      const usedRows = asRows(await sql.query(`SELECT EXISTS (SELECT 1 FROM tasks) AS used`));
      if (usedRows[0]?.used !== true) {
        await sql.transaction(seedTasks.flatMap((task) => [
          sql.query(`
            INSERT INTO task_templates (id, title, category, assignee, due_time, priority, active)
            VALUES ($1, $2, $3, $4, $5, $6, TRUE)
            ON CONFLICT (id) DO NOTHING
          `, [task.templateId, task.title, task.category, task.assignee, task.dueTime, task.priority]),
          sql.query(`
            INSERT INTO tasks (title, category, assignee, due_time, status, priority, work_date, template_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (work_date, template_id) WHERE template_id IS NOT NULL DO NOTHING
          `, [task.title, task.category, task.assignee, task.dueTime, task.status, task.priority, workDate, task.templateId]),
        ]));
      }

      await sql.query(`
        INSERT INTO tasks (title, category, assignee, due_time, status, priority, work_date, template_id)
        SELECT title, category, assignee, due_time, 'todo', priority, $1, id
        FROM task_templates WHERE active = TRUE
        ON CONFLICT (work_date, template_id) WHERE template_id IS NOT NULL DO NOTHING
      `, [workDate]);
    }

    return readTasks(workDate);
  } catch (error) {
    await sql.query(`DELETE FROM board_days WHERE work_date = $1`, [workDate]).catch(() => undefined);
    throw error;
  }
}

export async function createTask(task: TaskInput) {
  const sql = getSql();
  await sql.query(`INSERT INTO board_days (work_date) VALUES ($1) ON CONFLICT (work_date) DO NOTHING`, [task.workDate]);

  if (task.repeatDaily) {
    const templateId = crypto.randomUUID();
    const results = await sql.transaction([
      sql.query(`
        INSERT INTO task_templates (id, title, category, assignee, due_time, priority, active)
        VALUES ($1, $2, $3, $4, $5, $6, TRUE)
      `, [templateId, task.title, task.category, task.assignee, task.dueTime, task.priority]),
      sql.query(`
        INSERT INTO tasks (title, category, assignee, due_time, status, priority, work_date, template_id)
        VALUES ($1, $2, $3, $4, 'todo', $5, $6, $7)
        RETURNING ${taskColumns}
      `, [task.title, task.category, task.assignee, task.dueTime, task.priority, task.workDate, templateId]),
    ]);
    const result = asRows(results[1])[0];
    if (!result) throw new Error('Task could not be created');
    return mapRow(result);
  }

  const result = asRows(await sql.query(`
    INSERT INTO tasks (title, category, assignee, due_time, status, priority, work_date)
    VALUES ($1, $2, $3, $4, 'todo', $5, $6)
    RETURNING ${taskColumns}
  `, [task.title, task.category, task.assignee, task.dueTime, task.priority, task.workDate]))[0];
  if (!result) throw new Error('Task could not be created');
  return mapRow(result);
}

export async function updateTask(task: TaskUpdate) {
  const sql = getSql();
  const existing = asRows(await sql.query(`SELECT ${taskColumns} FROM tasks WHERE id = $1`, [task.id]))[0];
  if (!existing) throw new Error('Task not found');
  const current = mapRow(existing);

  if (task.repeatDaily && current.templateId) {
    await sql.transaction([
      sql.query(`UPDATE tasks SET title = $1, category = $2, assignee = $3, due_time = $4, priority = $5 WHERE id = $6`, [task.title, task.category, task.assignee, task.dueTime, task.priority, task.id]),
      sql.query(`UPDATE task_templates SET title = $1, category = $2, assignee = $3, due_time = $4, priority = $5, active = TRUE WHERE id = $6`, [task.title, task.category, task.assignee, task.dueTime, task.priority, current.templateId]),
    ]);
  } else if (task.repeatDaily) {
    const templateId = crypto.randomUUID();
    await sql.transaction([
      sql.query(`INSERT INTO task_templates (id, title, category, assignee, due_time, priority, active) VALUES ($1, $2, $3, $4, $5, $6, TRUE)`, [templateId, task.title, task.category, task.assignee, task.dueTime, task.priority]),
      sql.query(`UPDATE tasks SET title = $1, category = $2, assignee = $3, due_time = $4, priority = $5, template_id = $6 WHERE id = $7`, [task.title, task.category, task.assignee, task.dueTime, task.priority, templateId, task.id]),
    ]);
  } else if (current.templateId) {
    await sql.transaction([
      sql.query(`UPDATE tasks SET title = $1, category = $2, assignee = $3, due_time = $4, priority = $5, template_id = NULL WHERE id = $6`, [task.title, task.category, task.assignee, task.dueTime, task.priority, task.id]),
      sql.query(`UPDATE task_templates SET active = FALSE WHERE id = $1`, [current.templateId]),
    ]);
  } else {
    await sql.query(`UPDATE tasks SET title = $1, category = $2, assignee = $3, due_time = $4, priority = $5 WHERE id = $6`, [task.title, task.category, task.assignee, task.dueTime, task.priority, task.id]);
  }

  const result = asRows(await sql.query(`SELECT ${taskColumns} FROM tasks WHERE id = $1`, [task.id]))[0];
  if (!result) throw new Error('Task not found');
  return mapRow(result);
}

export async function updateTaskStatus(id: number, status: TaskStatus, completedBy = '') {
  const sql = getSql();
  const previous = asRows(await sql.query(`SELECT ${taskColumns} FROM tasks WHERE id = $1`, [id]))[0];
  if (!previous) throw new Error('Task not found');

  if (status === 'done' && previous.status !== 'done') {
    if (!completedBy) throw new Error('Completed by is required');
    await sql.transaction([
      sql.query(`UPDATE tasks SET status = $1 WHERE id = $2`, [status, id]),
      sql.query(`
        INSERT INTO completion_history (task_id, task_title, completed_by)
        VALUES ($1, $2, $3)
        ON CONFLICT (task_id) WHERE task_id IS NOT NULL DO NOTHING
      `, [id, String(previous.title), completedBy]),
    ]);
  } else {
    await sql.query(`UPDATE tasks SET status = $1 WHERE id = $2`, [status, id]);
  }

  const result = asRows(await sql.query(`SELECT ${taskColumns} FROM tasks WHERE id = $1`, [id]))[0];
  if (!result) throw new Error('Task not found');
  return mapRow(result);
}

export async function deleteTask(id: number) {
  const sql = getSql();
  const existing = asRows(await sql.query(`SELECT ${taskColumns} FROM tasks WHERE id = $1`, [id]))[0];
  if (!existing) throw new Error('Task not found');
  const task = mapRow(existing);

  if (task.templateId) {
    await sql.transaction([
      sql.query(`DELETE FROM tasks WHERE id = $1`, [id]),
      sql.query(`UPDATE task_templates SET active = FALSE WHERE id = $1`, [task.templateId]),
    ]);
  } else {
    await sql.query(`DELETE FROM tasks WHERE id = $1`, [id]);
  }
  return task;
}
