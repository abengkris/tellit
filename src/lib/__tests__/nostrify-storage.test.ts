/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { type NPostgresSchema, NPostgres } from '@nostrify/db';
import { Kysely } from 'kysely';
import postgres from 'postgres';
import { ENV } from '../env';
import { createStorage, getStorage } from '../nostrify-storage';

vi.mock('postgres', () => ({
  default: vi.fn().mockReturnValue({}),
}));

vi.mock('kysely', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    Kysely: vi.fn().mockImplementation(function(this: { migrate: unknown }) {
      this.migrate = vi.fn().mockResolvedValue({});
    }),
  };
});

vi.mock('kysely-postgres-js', () => ({
  PostgresJSDialect: vi.fn(),
}));

vi.mock('@nostrify/db', () => ({
  NPostgres: vi.fn().mockImplementation(function(this: { migrate: unknown }) {
    this.migrate = vi.fn().mockResolvedValue({});
  }),
}));

vi.mock('../env', () => ({
  ENV: {
    DATABASE: {
      URL: 'postgres://localhost:5432/test',
    },
  },
}));

describe('Nostrify Storage Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize NPostgres with a Kysely instance', async () => {
    const kysely = new Kysely({} as unknown as ConstructorParameters<typeof Kysely>[0]) as unknown as Kysely<NPostgresSchema>;
    const storage = await createStorage(kysely);
    expect(storage).toBeDefined();
    expect(NPostgres).toHaveBeenCalledWith(kysely);
  });

  it('should initialize NPostgres with a string URL', async () => {
    const url = 'postgres://localhost:5432/other';
    const storage = await createStorage(url);
    expect(storage).toBeDefined();
    expect(postgres).toHaveBeenCalledWith(url);
    expect(Kysely).toHaveBeenCalled();
    expect(NPostgres).toHaveBeenCalled();
  });

  it('should initialize NPostgres using ENV.DATABASE.URL if no arg provided', async () => {
    const storage = await createStorage();
    expect(storage).toBeDefined();
    expect(postgres).toHaveBeenCalledWith(ENV.DATABASE.URL);
    expect(NPostgres).toHaveBeenCalled();
  });

  it('should throw error if no URL is provided and ENV is empty', async () => {
    const originalUrl = ENV.DATABASE.URL;
    (ENV.DATABASE as Record<string, unknown>).URL = '';
    await expect(createStorage()).rejects.toThrow('Database URL is required to initialize storage.');
    (ENV.DATABASE as Record<string, unknown>).URL = originalUrl;
  });

  it('should handle getStorage as a singleton and call migrate', async () => {
    // We can't easily reset the singleton without vi.resetModules(), 
    // but we can at least verify it works the first time and returns the same instance.
    const storage1 = await getStorage();
    expect(storage1).toBeDefined();
    expect(storage1?.migrate).toHaveBeenCalled();

    const storage2 = await getStorage();
    expect(storage2).toBe(storage1);
  });
});
