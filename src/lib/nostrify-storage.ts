import { type NPostgres, type NPostgresSchema } from '@nostrify/db';
import { type Kysely } from 'kysely';
import { ENV } from './env';

let storageInstance: NPostgres | null = null;

/**
 * Creates an NPostgres storage instance using the provided Kysely instance or database URL.
 * Note: This function only works on the server as it requires Node.js modules.
 */
export async function createStorage(dbOrUrl?: Kysely<NPostgresSchema> | string): Promise<NPostgres> {
  const isServer = typeof window === 'undefined';
  
  if (!isServer) {
    throw new Error('createStorage can only be called on the server.');
  }

  // Dynamically import Node-specific modules
  const [{ NPostgres }, { Kysely }, { PostgresJSDialect }, { default: postgres }] = await Promise.all([
    import('@nostrify/db'),
    import('kysely'),
    import('kysely-postgres-js'),
    import('postgres'),
  ]);

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NPostgres(kysely as any);
}

/**
 * Gets the singleton storage instance.
 * On the client, this returns null to avoid build/runtime errors with Node modules.
 */
export async function getStorage(): Promise<NPostgres | null> {
  if (typeof window !== 'undefined') {
    return null;
  }

  if (!storageInstance) {
    storageInstance = await createStorage();
    // Automatically migrate the database schema on first initialization
    await storageInstance.migrate();
  }
  return storageInstance;
}
