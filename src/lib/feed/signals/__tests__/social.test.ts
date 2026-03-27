import { describe, it, expect, beforeEach, vi } from "vitest";
import { fetchSocialSignals } from "../social";

// Mock Kysely
vi.mock("@/lib/nostrify-sql-store", () => {
  const store: Record<string, any> = { // eslint-disable-line @typescript-eslint/no-explicit-any
    follows: {}
  };

  const mockKysely = {
    selectFrom: vi.fn((_table: string) => ({
      selectAll: vi.fn(() => ({
        where: vi.fn((col: string, op: string, val: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
          executeTakeFirst: vi.fn(async () => {
            if (op === '=') {
              const record = store.follows[val];
              return record;
            }
            return null;
          }),
          execute: vi.fn(async () => {
            if (op === 'like') {
              const target = val.replace(/%/g, '');
              return Object.values(store.follows).filter((f: any) => f.follows.includes(target)); // eslint-disable-line @typescript-eslint/no-explicit-any
            }
            return [];
          })
        }))
      }))
    }))
  };

  return {
    getKysely: vi.fn().mockResolvedValue(mockKysely),
    __mockStore: store
  };
});

describe("Social Signal Extractor", () => {
  const me = "me";
  const friend = "friend";
  const stranger = "stranger";
  const mutualFriend = "mutualFriend";
  let mockStore: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  beforeEach(async () => {
    const mod = await import("@/lib/nostrify-sql-store") as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    mockStore = mod.__mockStore;
    mockStore.follows = {};
  });

  it("should identify Degree 1 (direct follows)", async () => {
    mockStore.follows[me] = { pubkey: me, follows: JSON.stringify([friend]) };

    const signals = await fetchSocialSignals(me, [friend, stranger]);

    expect(signals.networkDegreeMap.get(friend)).toBe(1);
    expect(signals.networkDegreeMap.get(stranger)).toBeUndefined();
  });

  it("should identify Degree 2 and mutual count", async () => {
    // I follow friend
    mockStore.follows[me] = { pubkey: me, follows: JSON.stringify([friend]) };
    // friend follows stranger
    mockStore.follows[friend] = { pubkey: friend, follows: JSON.stringify([stranger]) };

    const signals = await fetchSocialSignals(me, [stranger]);

    expect(signals.networkDegreeMap.get(stranger)).toBe(2);
    expect(signals.mutualsMap.get(stranger)).toBe(1);
  });

  it("should identify multiple mutuals", async () => {
    mockStore.follows[me] = { pubkey: me, follows: JSON.stringify([friend, mutualFriend]) };
    mockStore.follows[friend] = { pubkey: friend, follows: JSON.stringify([stranger]) };
    mockStore.follows[mutualFriend] = { pubkey: mutualFriend, follows: JSON.stringify([stranger]) };

    const signals = await fetchSocialSignals(me, [stranger]);

    expect(signals.networkDegreeMap.get(stranger)).toBe(2);
    expect(signals.mutualsMap.get(stranger)).toBe(2);
  });

  it("should handle empty target list", async () => {
    const signals = await fetchSocialSignals(me, []);
    expect(signals.networkDegreeMap.size).toBe(0);
    expect(signals.mutualsMap.size).toBe(0);
  });
});
