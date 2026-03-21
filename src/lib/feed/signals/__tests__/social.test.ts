import { describe, it, expect, beforeEach, vi } from "vitest";
import { fetchSocialSignals } from "../social";
import { db } from "@/lib/db";

// Mock Dexie
vi.mock("@/lib/db", () => {
  const store: Record<string, unknown> = {
    follows: {}
  };
  return {
    db: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      table: vi.fn((_name: string) => ({
        get: vi.fn(async (pubkey: string) => {
          const follows = store.follows as Record<string, { pubkey: string; follows: string[] }>;
          return follows[pubkey];
        }),
        where: vi.fn(() => ({
          equals: vi.fn((val: string) => ({
            toArray: vi.fn(async () => {
              const follows = store.follows as Record<string, { pubkey: string; follows: string[] }>;
              // Mock implementation for finding people who follow 'val'
              return Object.values(follows).filter((f) => f.follows.includes(val));
            })
          }))
        })),
        put: vi.fn(async (data: { pubkey: string; follows: string[] }) => {
          const follows = store.follows as Record<string, { pubkey: string; follows: string[] }>;
          follows[data.pubkey] = data;
        }),
        clear: vi.fn(async () => {
          store.follows = {};
        })
      }))
    }
  };
});

describe("Social Signal Extractor", () => {
  const me = "me";
  const friend = "friend";
  const stranger = "stranger";
  const mutualFriend = "mutualFriend";

  beforeEach(async () => {
    await db.table("follows").clear();
  });

  it("should identify Degree 1 (direct follows)", async () => {
    await db.table("follows").put({ pubkey: me, follows: [friend] });

    const signals = await fetchSocialSignals(me, [friend, stranger]);

    expect(signals.networkDegreeMap.get(friend)).toBe(1);
    expect(signals.networkDegreeMap.get(stranger)).toBeUndefined();
  });

  it("should identify Degree 2 and mutual count", async () => {
    // I follow friend
    await db.table("follows").put({ pubkey: me, follows: [friend] });
    // friend follows stranger
    await db.table("follows").put({ pubkey: friend, follows: [stranger] });

    const signals = await fetchSocialSignals(me, [stranger]);

    expect(signals.networkDegreeMap.get(stranger)).toBe(2);
    expect(signals.mutualsMap.get(stranger)).toBe(1);
  });

  it("should identify multiple mutuals", async () => {
    await db.table("follows").put({ pubkey: me, follows: [friend, mutualFriend] });
    await db.table("follows").put({ pubkey: friend, follows: [stranger] });
    await db.table("follows").put({ pubkey: mutualFriend, follows: [stranger] });

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
