import postgres from 'postgres';

type Executor = { unsafe: (text: string, values?: any[]) => Promise<Record<string, unknown>[]> };

type Query = Promise<Record<string, unknown>[]> & {
  run: (connection: Executor) => Promise<Record<string, unknown>[]>;
};

type Database = {
  query: (text: string, values?: unknown[]) => Query;
  transaction: (queries: Query[]) => Promise<Record<string, unknown>[][]>;
};

let database: Database | undefined;

function connectionString() {
  return process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_URL_NON_POOLING
    ?? process.env.SUPABASE_DB_URL
    ?? '';
}

function makeQuery(connection: Executor, text: string, values: unknown[] = []): Query {
  const run = (target: Executor) => target.unsafe(text, values as any[]);
  const query = {
    run,
    then: (onFulfilled: (value: Record<string, unknown>[]) => unknown, onRejected?: (reason: unknown) => unknown) => run(connection).then(onFulfilled, onRejected),
    catch: (onRejected: (reason: unknown) => unknown) => run(connection).catch(onRejected),
    finally: (onFinally: () => void) => run(connection).finally(onFinally),
  } as unknown as Query;
  return query;
}

export function getSql(): Database {
  if (database) return database;
  const url = connectionString();
  if (!url) throw new Error('A Supabase PostgreSQL connection string is not configured');

  const connection = postgres(url, { prepare: false, max: 5 });
  database = {
    query: (text, values = []) => makeQuery(connection, text, values),
    transaction: async (queries) => connection.begin(async (transaction: any) => {
      const results: Record<string, unknown>[][] = [];
      for (const query of queries) results.push(await query.run(transaction));
      return results;
    }) as Promise<Record<string, unknown>[][]>,
  };
  return database;
}
