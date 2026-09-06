import { env } from 'cloudflare:workers';

export type StaffRecord = { id: number; name: string };

const initialNames = ['田中', '佐藤', '鈴木', '高橋'];

function db() {
  if (!env.DB) throw new Error('Database is unavailable');
  return env.DB;
}

function mapRow(row: Record<string, unknown>): StaffRecord {
  return { id: Number(row.id), name: String(row.name) };
}

export async function listStaff() {
  const database = db();
  let result = await database.prepare(`
    SELECT id, name FROM staff_members ORDER BY id ASC
  `).all();
  if (result.results.length === 0) {
    await database.batch(initialNames.map((name) => database.prepare(`
      INSERT OR IGNORE INTO staff_members (name) VALUES (?)
    `).bind(name)));
    result = await database.prepare(`
      SELECT id, name FROM staff_members ORDER BY id ASC
    `).all();
  }
  return result.results.map(mapRow);
}

export async function addStaff(name: string) {
  const result = await db().prepare(`
    INSERT INTO staff_members (name) VALUES (?)
    RETURNING id, name
  `).bind(name).first();
  if (!result) throw new Error('Staff member could not be created');
  return mapRow(result);
}
