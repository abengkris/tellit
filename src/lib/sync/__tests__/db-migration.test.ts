import { describe, it, expect, vi, beforeEach } from 'vitest';
import { migrateDexieToSql } from '../db-migration';

// Mock Dexie
const mockDexieData = {
  follows: [
    { pubkey: 'alice', follows: ['bob'], timestamp: 100 }
  ],
  wotScores: [
    { pubkey: 'alice', score: 80, lastUpdated: 200 }
  ]
};

vi.mock('../../db', () => ({
  db: {
    table: vi.fn((name: string) => ({
      toArray: vi.fn(async () => {
        if (name === 'follows') return mockDexieData.follows;
        if (name === 'wotScores') return mockDexieData.wotScores;
        return [];
      })
    }))
  }
}));

// Mock Kysely
const mockInsert = {
  values: vi.fn(() => mockInsert),
  onConflict: vi.fn(() => mockInsert),
  doUpdateSet: vi.fn(() => mockInsert),
  execute: vi.fn(async () => undefined)
};

vi.mock('../../nostrify-sql-store', () => ({
  getKysely: vi.fn().mockResolvedValue({
    insertInto: vi.fn(() => mockInsert)
  })
}));

describe('Database Migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should migrate data from Dexie to SQL', async () => {
    // Mock browser environment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.window = {} as any; 

    const result = await migrateDexieToSql();
    
    expect(result).toBe(true);
    expect(localStorage.getItem('tellit_dexie_to_sql_migrated')).toBe('true');
    expect(mockInsert.execute).toHaveBeenCalledTimes(2);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).window;
  });

  it('should not migrate if already migrated', async () => {
    localStorage.setItem('tellit_dexie_to_sql_migrated', 'true');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.window = {} as any;

    const result = await migrateDexieToSql();
    
    expect(result).toBe(false);
    expect(mockInsert.execute).not.toHaveBeenCalled();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).window;
  });
});
