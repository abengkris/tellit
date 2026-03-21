import { describe, it, expect, beforeEach, vi } from "vitest";
import { WoTScorer } from "../scoring";
import { db } from "../../db";

// Mock Dexie
vi.mock("../../db", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const store: Record<string, any> = {
    follows: {},
    wotScores: {}
  };
  return {
    db: {
      table: vi.fn((name: string) => ({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        put: vi.fn(async (data: any) => {
          store[name][data.pubkey] = data;
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        bulkPut: vi.fn(async (records: any[]) => {
          records.forEach(r => { store[name][r.pubkey] = r; });
        }),
        get: vi.fn(async (pubkey: string) => {
          return store[name][pubkey];
        }),
        clear: vi.fn(async () => {
          store[name] = {};
        }),
      })),
    },
  };
});

describe("WoTScorer", () => {
  let scorer: WoTScorer;
  const alice = "alice-pubkey";
  const bob = "bob-pubkey";
  const charlie = "charlie-pubkey";

  beforeEach(async () => {
    scorer = new WoTScorer();
    await db.table("follows").clear();
    await db.table("wotScores").clear();
  });

  it("should calculate and store trust scores based on follow distances", async () => {
    // Setup follow relationships
    // Alice follows Bob
    await db.table("follows").put({ pubkey: alice, follows: [bob] });
    // Bob follows Charlie
    await db.table("follows").put({ pubkey: bob, follows: [charlie] });

    await scorer.calculateScores(alice, 2);

    const aliceScore = await scorer.getScore(alice);
    const bobScore = await scorer.getScore(bob);
    const charlieScore = await scorer.getScore(charlie);

    expect(aliceScore).toBe(100);
    expect(bobScore).toBeGreaterThan(0);
    expect(bobScore).toBeLessThan(100);
    expect(charlieScore).toBeGreaterThan(0);
    expect(charlieScore).toBeLessThan(bobScore);
  });
});
