import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NPostgres } from '@nostrify/db';
import { getSqlStore, createSqlStore } from '../nostrify-sql-store';

// Mock NPostgres
vi.mock('@nostrify/db', () => ({
  NPostgres: vi.fn().mockImplementation(function(this: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    this.migrate = vi.fn().mockResolvedValue(undefined);
    this.event = vi.fn().mockResolvedValue(undefined);
    this.query = vi.fn().mockResolvedValue([]);
    this.count = vi.fn().mockResolvedValue({ count: 0 });
    this.remove = vi.fn().mockResolvedValue(undefined);
  }),
}));

// Mock adapters
vi.mock('kysely-postgres-js', () => ({
  PostgresJSDialect: vi.fn().mockImplementation(function() { return {}; }),
}));

vi.mock('postgres', () => ({
  default: vi.fn().mockReturnValue({}),
}));

vi.mock('kysely-pglite', () => ({
  KyselyPGlite: vi.fn().mockImplementation(function() { 
    return { dialect: {} }; 
  }),
}));

vi.mock('kysely', () => ({
  Kysely: vi.fn().mockImplementation(function() { return {}; }),
}));

vi.mock('../env', () => ({
  ENV: {
    DATABASE: {
      URL: 'postgres://localhost:5432/test',
    },
  },
}));

describe('Nostrify SQL Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize and return an NStore implementation', async () => {
    const store = await createSqlStore();
    expect(store).toBeDefined();
    expect(NPostgres).toHaveBeenCalled();
  });

  it('should use PostgresJSDialect on the server', async () => {
    // Force server environment
    const originalWindow = global.window;
    // @ts-expect-error - testing server-side
    delete global.window;

    await createSqlStore();
    
    const { PostgresJSDialect } = await import('kysely-postgres-js');
    expect(PostgresJSDialect).toHaveBeenCalled();

    global.window = originalWindow;
  });

  it('should use KyselyPGlite on the client', async () => {
    // Mock window to simulate client environment
    global.window = {} as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    await createSqlStore();
    
    const { KyselyPGlite } = await import('kysely-pglite');
    expect(KyselyPGlite).toHaveBeenCalled();

    // @ts-expect-error - cleanup
    delete global.window;
  });

  it('should support basic CRUD operations', async () => {
    const store = await createSqlStore();
    
    const event = { id: '1', kind: 1, pubkey: 'abc', content: 'test', created_at: 123, tags: [], sig: '...' };
    await store.event(event);
    expect(store.event).toHaveBeenCalledWith(event);

    const filters = [{ kinds: [1] }];
    await store.query(filters);
    expect(store.query).toHaveBeenCalledWith(filters);

    await store.count(filters);
    expect(store.count).toHaveBeenCalledWith(filters);

    await store.remove(filters);
    expect(store.remove).toHaveBeenCalledWith(filters);
  });

  it('should be a singleton when using getSqlStore', async () => {
    const store1 = await getSqlStore();
    const store2 = await getSqlStore();
    expect(store1).toBe(store2);
    expect(store1.migrate).toHaveBeenCalled();
  });
});
