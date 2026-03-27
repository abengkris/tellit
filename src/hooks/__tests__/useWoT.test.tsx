import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useWoT } from "../useWoT";

// Mock Kysely
vi.mock("@/lib/nostrify-sql-store", () => {
  const store: Record<string, any> = { // eslint-disable-line @typescript-eslint/no-explicit-any
    wot_scores: {},
    follows: {}
  };

  const mockKysely = {
    selectFrom: vi.fn((table: string) => ({
      selectAll: vi.fn(() => ({
        where: vi.fn((col: string, op: string, val: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
          executeTakeFirst: vi.fn(async () => {
            if (op === '=') return store[table][val];
            return null;
          }),
          execute: vi.fn(async () => {
            if (op === 'like') {
              const target = val.replace(/%/g, '');
              return Object.values(store[table]).filter((f: any) => f.follows.includes(target)); // eslint-disable-line @typescript-eslint/no-explicit-any
            }
            return [];
          })
        }))
      }))
    }))
  };

  return {
    getKysely: vi.fn().mockResolvedValue(mockKysely),
    // Helper for tests to populate mock store
    __mockStore: store
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
  let mockStore: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  beforeEach(async () => {
    const mod = await import("@/lib/nostrify-sql-store") as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    mockStore = mod.__mockStore;
    mockStore.wot_scores = {};
    mockStore.follows = {};
  });

  it("should return the trust score and mutual count for a pubkey", async () => {
    mockStore.wot_scores[alice] = { pubkey: alice, score: 75, last_updated: Date.now() };
    
    // I follow Bob, and Bob follows Alice
    mockStore.follows["me"] = { pubkey: "me", follows: JSON.stringify(["bob"]) };
    mockStore.follows["bob"] = { pubkey: "bob", follows: JSON.stringify([alice]) };

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
