import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useWoT } from "../useWoT";
import { db } from "@/lib/db";

// Mock Dexie
vi.mock("@/lib/db", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const store: Record<string, any> = {
    wotScores: {},
    follows: {}
  };
  return {
    db: {
      table: vi.fn((name: string) => ({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        put: vi.fn(async (data: any) => {
          store[name][data.pubkey] = data;
        }),
        get: vi.fn(async (pubkey: string) => {
          return store[name][pubkey];
        }),
        clear: vi.fn(async () => {
          store[name] = {};
        }),
        where: vi.fn(() => ({
          equals: vi.fn((val: string) => ({
            toArray: vi.fn(async () => {
              // Simple mock implementation for 'follows' search
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              return Object.values(store.follows).filter((f: any) => f.follows.includes(val));
            })
          }))
        }))
      })),
    },
  };
});

// Mock Auth Store
vi.mock("@/store/auth", () => ({
  useAuthStore: () => ({
    user: { pubkey: "me" }
  }),
}));

describe("useWoT hook", () => {
  const alice = "alice-pubkey";

  beforeEach(async () => {
    await db.table("wotScores").clear();
    await db.table("follows").clear();
  });

  it("should return the trust score and mutual count for a pubkey", async () => {
    await db.table("wotScores").put({ pubkey: alice, score: 75, lastUpdated: Date.now() });
    
    // I follow Bob, and Bob follows Alice
    await db.table("follows").put({ pubkey: "me", follows: ["bob"] });
    await db.table("follows").put({ pubkey: "bob", follows: [alice] });

    const { result } = renderHook(() => useWoT(alice));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.score).toBe(75);
    expect(result.current.mutualCount).toBe(1);
  });

  it("should return 0 if no score or mutuals found", async () => {
    const { result } = renderHook(() => useWoT("unknown"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.score).toBe(0);
    expect(result.current.mutualCount).toBe(0);
  });

  it("should handle null or undefined pubkey", async () => {
    const { result } = renderHook(() => useWoT(undefined));

    expect(result.current.loading).toBe(false);
    expect(result.current.score).toBe(0);
  });
});
