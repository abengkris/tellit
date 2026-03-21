import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useWoT } from "../useWoT";
import { db } from "@/lib/db";

// Mock Dexie
vi.mock("@/lib/db", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const store: Record<string, any> = {
    wotScores: {}
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
      })),
    },
  };
});

describe("useWoT hook", () => {
  const alice = "alice-pubkey";

  beforeEach(async () => {
    await db.table("wotScores").clear();
  });

  it("should return the trust score for a pubkey", async () => {
    await db.table("wotScores").put({ pubkey: alice, score: 75, lastUpdated: Date.now() });

    const { result } = renderHook(() => useWoT(alice));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.score).toBe(75);
  });

  it("should return 0 if no score is found", async () => {
    const { result } = renderHook(() => useWoT("unknown"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.score).toBe(0);
  });

  it("should handle null or undefined pubkey", async () => {
    const { result } = renderHook(() => useWoT(undefined));

    expect(result.current.loading).toBe(false);
    expect(result.current.score).toBe(0);
  });
});
