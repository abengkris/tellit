import { type NPostgresSchema, NPostgres } from '@nostrify/db';
import { Kysely } from 'kysely';
import { ENV } from './env';

/**
 * Extended schema for TellIt application, adding follows and WoT tables.
 */
export interface TellItSqlSchema extends NPostgresSchema {
  follows: {
    pubkey: string;
    follows: string; // JSON string for compatibility
    timestamp: number | undefined;
  };
  wot_scores: {
    pubkey: string;
    score: number;
    last_updated: number;
  };
}

let sqlStoreInstance: NPostgres | null = null;
let kyselyInstance: Kysely<TellItSqlSchema> | null = null;

/**
 * Creates a Kysely instance for the appropriate adapter.
 */
export async function createKyselyInstance(): Promise<Kysely<TellItSqlSchema>> {
  const isServer = typeof window === 'undefined';

  if (isServer) {
    const [{ PostgresJSDialect }, { default: postgres }] = await Promise.all([
      import('kysely-postgres-js'),
      import('postgres'),
    ]);

    const url = ENV.DATABASE.URL;
    if (!url) {
      throw new Error('DATABASE_URL is required for server-side SQL store.');
    }

    const sql = postgres(url);
    return new Kysely<TellItSqlSchema>({
      dialect: new PostgresJSDialect({
        postgres: sql,
      }),
    });
  } else {
    const [{ KyselyPGlite }] = await Promise.all([
      import('kysely-pglite'),
    ]);

    const kpg = new KyselyPGlite('idb://tellit-nostr-v1');
    return new Kysely<TellItSqlSchema>({
      dialect: kpg.dialect,
    });
  }
}

/**
 * Creates a Nostrify SQL Store (NPostgres) instance.
 */
export async function createSqlStore(): Promise<NPostgres> {
  const kysely = await getKysely();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NPostgres(kysely as any);
}

/**
 * Gets the singleton Kysely instance.
 */
export async function getKysely(): Promise<Kysely<TellItSqlSchema>> {
  if (!kyselyInstance) {
    kyselyInstance = await createKyselyInstance();
  }
  return kyselyInstance;
}

/**
 * Gets the singleton SQL store instance.
 */
export async function getSqlStore(): Promise<NPostgres> {
  if (!sqlStoreInstance) {
    sqlStoreInstance = await createSqlStore();
    // Automatically migrate the database schema on initialization
    await sqlStoreInstance.migrate();
    
    // Also ensure custom tables exist
    await ensureCustomTables(await getKysely());
  }
  return sqlStoreInstance;
}

/**
 * Ensures TellIt custom tables (follows, wot_scores) exist in the database.
 */
async function ensureCustomTables(db: Kysely<TellItSqlSchema>): Promise<void> {
  await db.schema
    .createTable('follows')
    .ifNotExists()
    .addColumn('pubkey', 'text', (col) => col.primaryKey())
    .addColumn('follows', 'text', (col) => col.notNull()) // Stored as JSON string
    .addColumn('timestamp', 'integer')
    .execute();

  await db.schema
    .createTable('wot_scores')
    .ifNotExists()
    .addColumn('pubkey', 'text', (col) => col.primaryKey())
    .addColumn('score', 'integer', (col) => col.notNull())
    .addColumn('last_updated', 'integer', (col) => col.notNull())
    .execute();
  
  // Add index for WoT scores
  await db.schema
    .createIndex('wot_scores_score_idx')
    .on('wot_scores')
    .column('score')
    .ifNotExists()
    .execute();
}
