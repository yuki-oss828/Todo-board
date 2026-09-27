import { getSql } from './client';

export type StaffRecord = { id: number; name: string };

function asRows(result: unknown) {
  return result as Record<string, unknown>[];
}

function mapRow(row: Record<string, unknown>): StaffRecord {
  return { id: Number(row.id), name: String(row.name) };
}

export async function listStaff() {
  const result = await getSql().query(`SELECT id, name FROM staff_members ORDER BY id ASC`);
  return asRows(result).map(mapRow);
}

export async function addStaff(name: string) {
  const result = asRows(await getSql().query(`
    INSERT INTO staff_members (name) VALUES ($1)
    RETURNING id, name
  `, [name]))[0];
  if (!result) throw new Error('Staff member could not be created');
  return mapRow(result);
}

export async function deleteStaff(id: number) {
  const sql = getSql();
  const existing = asRows(await sql.query(`SELECT id, name FROM staff_members WHERE id = $1`, [id]))[0];
  if (!existing) throw new Error('Staff member not found');
  const member = mapRow(existing);
  const assigned = asRows(await sql.query(`
    SELECT COUNT(*)::integer AS count FROM tasks
    WHERE assignee = $1 AND status != 'done'
  `, [member.name]))[0];

  await sql.transaction([
    sql.query(`UPDATE tasks SET assignee = '' WHERE assignee = $1 AND status != 'done'`, [member.name]),
    sql.query(`UPDATE task_templates SET assignee = '' WHERE assignee = $1 AND active = TRUE`, [member.name]),
    sql.query(`DELETE FROM staff_members WHERE id = $1`, [id]),
  ]);

  return { staffMember: member, unassignedTaskCount: Number(assigned?.count ?? 0) };
}
