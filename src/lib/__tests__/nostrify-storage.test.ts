import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStorage, getStorage } from '../nostrify-storage';
import { Kysely } from 'kysely';
import { NPostgres } from '@nostrify/db';
import postgres from 'postgres';
import { ENV } from '../env';

vi.mock('postgres', () => ({
  default: vi.fn().mockReturnValue({}),
}));

vi.mock('kysely', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    Kysely: vi.fn().mockImplementation(function(this: any) {
      this.migrate = vi.fn().mockResolvedValue({});
    }),
  };
});

vi.mock('kysely-postgres-js', () => ({
  PostgresJSDialect: vi.fn(),
}));

vi.mock('@nostrify/db', () => ({
  NPostgres: vi.fn().mockImplementation(function(this: any) {
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
    // Reset singleton if possible, but it's a local variable in the module.
    // We might need to use vi.resetModules() or just accept it's a singleton.
  });

  it('should initialize NPostgres with a Kysely instance', async () => {
    const kysely = new Kysely({} as any);
    const storage = createStorage(kysely);
    expect(storage).toBeDefined();
    expect(NPostgres).toHaveBeenCalledWith(kysely);
  });

  it('should initialize NPostgres with a string URL', () => {
    const url = 'postgres://localhost:5432/other';
    const storage = createStorage(url);
    expect(storage).toBeDefined();
    expect(postgres).toHaveBeenCalledWith(url);
    expect(Kysely).toHaveBeenCalled();
    expect(NPostgres).toHaveBeenCalled();
  });

  it('should initialize NPostgres using ENV.DATABASE.URL if no arg provided', () => {
    const storage = createStorage();
    expect(storage).toBeDefined();
    expect(postgres).toHaveBeenCalledWith(ENV.DATABASE.URL);
    expect(NPostgres).toHaveBeenCalled();
  });

  it('should throw error if no URL is provided and ENV is empty', () => {
    ENV.DATABASE.URL = '' as any;
    expect(() => createStorage()).toThrow('Database URL is required to initialize storage.');
  });

  it('should handle getStorage as a singleton and call migrate', async () => {
    ENV.DATABASE.URL = 'postgres://localhost:5432/test';
    const storage1 = await getStorage();
    expect(storage1).toBeDefined();
    expect(storage1.migrate).toHaveBeenCalled();

    const storage2 = await getStorage();
    expect(storage2).toBe(storage1);
    // migrate should only be called once
    expect(storage1.migrate).toHaveBeenCalledTimes(1);
  });
});
