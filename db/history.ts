import { env } from 'cloudflare:workers';

export type CompletionRecord = {
  id: number;
  taskId: number | null;
  taskTitle: string;
  completedBy: string;
  completedAt: string;
};

function db() {
  if (!env.DB) throw new Error('Database is unavailable');
  return env.DB;
}

function mapRow(row: Record<string, unknown>): CompletionRecord {
  return {
    id: Number(row.id),
    taskId: row.task_id === null ? null : Number(row.task_id),
    taskTitle: String(row.task_title),
    completedBy: String(row.completed_by),
    completedAt: String(row.completed_at),
  };
}

export async function listCompletionHistory() {
  const database = db();
  await database.prepare(`
    INSERT INTO completion_history (task_id, task_title, completed_by)
    SELECT tasks.id, tasks.title, CASE WHEN tasks.assignee = '' THEN '未記録' ELSE tasks.assignee END
    FROM tasks
    WHERE tasks.status = 'done'
      AND NOT EXISTS (
        SELECT 1 FROM completion_history WHERE completion_history.task_id = tasks.id
      )
  `).run();
  const result = await database.prepare(`
    SELECT id, task_id, task_title, completed_by, completed_at
    FROM completion_history
    ORDER BY completed_at DESC, id DESC
    LIMIT 100
  `).all();
  return result.results.map(mapRow);
}
