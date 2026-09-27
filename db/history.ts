import { getSql } from './client';

export type CompletionRecord = {
  id: number;
  taskId: number | null;
  taskTitle: string;
  completedBy: string;
  completedAt: string;
};

function asRows(result: unknown) {
  return result as Record<string, unknown>[];
}

function mapRow(row: Record<string, unknown>): CompletionRecord {
  const completedAt = row.completed_at instanceof Date
    ? row.completed_at.toISOString()
    : String(row.completed_at);
  return {
    id: Number(row.id),
    taskId: row.task_id === null ? null : Number(row.task_id),
    taskTitle: String(row.task_title),
    completedBy: String(row.completed_by),
    completedAt,
  };
}

export async function listCompletionHistory() {
  const sql = getSql();
  await sql.query(`
    INSERT INTO completion_history (task_id, task_title, completed_by)
    SELECT tasks.id, tasks.title, CASE WHEN tasks.assignee = '' THEN '未記録' ELSE tasks.assignee END
    FROM tasks
    WHERE tasks.status = 'done'
    ON CONFLICT (task_id) WHERE task_id IS NOT NULL DO NOTHING
  `);
  const result = await sql.query(`
    SELECT id, task_id, task_title, completed_by, completed_at
    FROM completion_history
    ORDER BY completed_at DESC, id DESC
    LIMIT 100
  `);
  return asRows(result).map(mapRow);
}
