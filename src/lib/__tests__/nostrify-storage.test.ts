/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { Kysely, DummyDriver, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler } from 'kysely';

describe('Nostrify Storage Manager', () => {
  it('should initialize NPostgres with a Kysely instance', async () => {
    const { createStorage } = await import('../nostrify-storage');
    
    const kysely = new Kysely({
      dialect: {
        createAdapter: () => new PostgresAdapter(),
        createDriver: () => new DummyDriver(),
        createIntrospector: (db) => new PostgresIntrospector(db),
        createQueryCompiler: () => new PostgresQueryCompiler(),
      },
    });

    const storage = createStorage(kysely as any);
    expect(storage).toBeDefined();
  });

  it('should be able to import getStorage', async () => {
    const { getStorage } = await import('../nostrify-storage');
    expect(getStorage).toBeDefined();
  });
});
