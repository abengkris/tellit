import { type NPostgresSchema, NPostgres } from '@nostrify/db';
import { Kysely } from 'kysely';
import { ENV } from './env';

let sqlStoreInstance: NPostgres | null = null;

/**
 * Creates a Nostrify SQL Store (NPostgres) instance.
 * Automatically chooses the appropriate adapter based on the environment:
 * - Server: Uses postgres.js (production PostgreSQL)
 * - Client: Uses pglite (WASM PostgreSQL in-browser)
 */
export async function createSqlStore(): Promise<NPostgres> {
  const isServer = typeof window === 'undefined';

  if (isServer) {
    // Server-side initialization with postgres.js
    const [{ PostgresJSDialect }, { default: postgres }] = await Promise.all([
      import('kysely-postgres-js'),
      import('postgres'),
    ]);

    const url = ENV.DATABASE.URL;
    if (!url) {
      throw new Error('DATABASE_URL is required for server-side SQL store.');
    }

    const sql = postgres(url);
    const kysely = new Kysely<NPostgresSchema>({
      dialect: new PostgresJSDialect({
        postgres: sql,
      }),
    });

    return new NPostgres(kysely);
  } else {
    // Client-side initialization with pglite
    const [{ PGlite }, { PgliteDialect }] = await Promise.all([
      import('@electric-sql/pglite'),
      import('kysely-pglite'),
    ]);

    // Use a persistent path for pglite in the browser if possible
    // For now, using an in-memory or default indexedDB path
    const db = new PGlite('idb://tellit-nostr-v1');
    const kysely = new Kysely<NPostgresSchema>({
      dialect: new PgliteDialect({
        database: db,
      }) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    return new NPostgres(kysely);
  }
}

/**
 * Gets the singleton SQL store instance.
 * Automatically initializes and migrates if necessary.
 */
export async function getSqlStore(): Promise<NPostgres> {
  if (!sqlStoreInstance) {
    sqlStoreInstance = await createSqlStore();
    // Automatically migrate the database schema on initialization
    await sqlStoreInstance.migrate();
  }
  return sqlStoreInstance;
}
