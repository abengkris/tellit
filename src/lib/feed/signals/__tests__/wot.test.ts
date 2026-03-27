import { describe, it, expect, beforeEach, vi } from "vitest";
import { fetchWoTSignals } from "../wot";

// Mock Kysely
vi.mock("@/lib/nostrify-sql-store", () => {
  const store: Record<string, any> = { // eslint-disable-line @typescript-eslint/no-explicit-any
    wot_scores: {}
  };

  const mockKysely = {
    selectFrom: vi.fn((_table: string) => ({
      selectAll: vi.fn(() => ({
        where: vi.fn((_col: string, _op: string, vals: string[]) => ({
          execute: vi.fn(async () => {
            return Object.values(store.wot_scores).filter((r: any) => vals.includes(r.pubkey)); // eslint-disable-line @typescript-eslint/no-explicit-any
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

describe("WoT Signal Extractor", () => {
  const pubkey1 = "pk1";
  const pubkey2 = "pk2";
  let mockStore: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  beforeEach(async () => {
    const mod = await import("@/lib/nostrify-sql-store") as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    mockStore = mod.__mockStore;
    mockStore.wot_scores = {};
  });

  it("should return a map of trust scores for provided pubkeys", async () => {
    mockStore.wot_scores[pubkey1] = { pubkey: pubkey1, score: 80 };
    mockStore.wot_scores[pubkey2] = { pubkey: pubkey2, score: 40 };

    const signals = await fetchWoTSignals([pubkey1, pubkey2]);

    expect(signals.size).toBe(2);
    expect(signals.get(pubkey1)).toBe(80);
    expect(signals.get(pubkey2)).toBe(40);
  });

  it("should return empty map if no pubkeys provided", async () => {
    const signals = await fetchWoTSignals([]);
    expect(signals.size).toBe(0);
  });

  it("should return only scores for found pubkeys", async () => {
    mockStore.wot_scores[pubkey1] = { pubkey: pubkey1, score: 80 };

    const signals = await fetchWoTSignals([pubkey1, "unknown"]);

    expect(signals.size).toBe(1);
    expect(signals.get(pubkey1)).toBe(80);
    expect(signals.get("unknown")).toBeUndefined();
  });
});
