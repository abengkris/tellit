import { describe, it, expect, beforeEach, vi } from "vitest";
import { WoTScorer } from "../scoring";

// Mock Kysely
vi.mock("../../nostrify-sql-store", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const store: Record<string, any> = {
    follows: {},
    wot_scores: {}
  };
  const mockKysely = {
    insertInto: vi.fn((table: string) => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      values: vi.fn((data: any) => ({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onConflict: vi.fn((callback: any) => {
          // Simulate the onConflict callback
          const oc = {
            column: vi.fn(() => oc),
            doUpdateSet: vi.fn(() => ({
              execute: vi.fn(async () => {
                store[table][data.pubkey] = data;
              })
            }))
          };
          callback(oc);
          return oc.doUpdateSet();
        })
      }))
    })),
    selectFrom: vi.fn((table: string) => ({
      selectAll: vi.fn(() => ({
        where: vi.fn((_col: string, _op: string, val: string) => ({
          executeTakeFirst: vi.fn(async () => store[table][val])
        }))
      }))
    }))
  };
  return {
    getKysely: vi.fn().mockResolvedValue(mockKysely),
    __mockStore: store
  };
});

describe("WoTScorer", () => {
  let scorer: WoTScorer;
  const alice = "alice-pubkey";
  const bob = "bob-pubkey";
  const charlie = "charlie-pubkey";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockStore: any;

  beforeEach(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import("../../nostrify-sql-store") as any;
    mockStore = mod.__mockStore;
    mockStore.follows = {};
    mockStore.wot_scores = {};
    
    scorer = new WoTScorer();
  });

  it("should calculate and store trust scores based on follow distances", async () => {
    // Setup follow relationships
    // Alice follows Bob
    mockStore.follows[alice] = { pubkey: alice, follows: JSON.stringify([bob]) };
    // Bob follows Charlie
    mockStore.follows[bob] = { pubkey: bob, follows: JSON.stringify([charlie]) };

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
