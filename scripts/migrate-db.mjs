import { readFile } from 'node:fs/promises';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL
  ?? process.env.POSTGRES_URL
  ?? process.env.POSTGRES_URL_NON_POOLING
  ?? process.env.SUPABASE_DB_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not configured');

const migration = await readFile(new URL('../drizzle-postgres/0000_initial.sql', import.meta.url), 'utf8');
const statements = migration
  .split(';')
  .map((statement) => statement.trim())
  .filter(Boolean);

const sql = postgres(databaseUrl, { prepare: false, max: 1 });
await sql.begin(async (transaction) => {
  for (const statement of statements) await transaction.unsafe(statement);
});
await sql.end();
console.log(`Applied ${statements.length} database statements.`);
