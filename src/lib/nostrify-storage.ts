import { NPostgres, type NPostgresSchema } from '@nostrify/db';
import { Kysely } from 'kysely';
import { PostgresJSDialect } from 'kysely-postgres-js';
import postgres from 'postgres';
import { ENV } from './env';

let storageInstance: NPostgres | null = null;

/**
 * Creates an NPostgres storage instance using the provided Kysely instance or database URL.
 */
export function createStorage(dbOrUrl?: Kysely<NPostgresSchema> | string): NPostgres {
  if (dbOrUrl instanceof Kysely) {
    return new NPostgres(dbOrUrl);
  }

  const url = typeof dbOrUrl === 'string' ? dbOrUrl : ENV.DATABASE.URL;

  if (!url) {
    throw new Error('Database URL is required to initialize storage.');
  }

  const sql = postgres(url);
  const kysely = new Kysely<NPostgresSchema>({
    dialect: new PostgresJSDialect({
      postgres: sql,
    }),
  });

  return new NPostgres(kysely);
}

/**
 * Gets the singleton storage instance.
 */
export async function getStorage(): Promise<NPostgres> {
  if (!storageInstance) {
    storageInstance = createStorage();
    // Automatically migrate the database schema on first initialization
    await storageInstance.migrate();
  }
  return storageInstance;
}
