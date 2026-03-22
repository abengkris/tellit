import { describe, it, expect, beforeEach, vi } from "vitest";
import { fetchWoTSignals } from "../wot";
import { db } from "@/lib/db";

// Mock Dexie
vi.mock("@/lib/db", () => {
  const store: Record<string, unknown> = {
    wotScores: {}
  };
  return {
    db: {
       
      table: vi.fn((_name: string) => ({
        where: vi.fn(() => ({
          anyOf: vi.fn((vals: string[]) => ({
            toArray: vi.fn(async () => {
              const wotScores = store.wotScores as Record<string, { pubkey: string; score: number }>;
              return Object.values(wotScores).filter((r) => vals.includes(r.pubkey));
            })
          }))
        })),
        put: vi.fn(async (data: { pubkey: string; score: number }) => {
          const wotScores = store.wotScores as Record<string, { pubkey: string; score: number }>;
          wotScores[data.pubkey] = data;
        }),
        clear: vi.fn(async () => {
          store.wotScores = {};
        })
      }))
    }
  };
});

describe("WoT Signal Extractor", () => {
  const pubkey1 = "pk1";
  const pubkey2 = "pk2";

  beforeEach(async () => {
    await db.table("wotScores").clear();
  });

  it("should return a map of trust scores for provided pubkeys", async () => {
    await db.table("wotScores").put({ pubkey: pubkey1, score: 80 });
    await db.table("wotScores").put({ pubkey: pubkey2, score: 40 });

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
    await db.table("wotScores").put({ pubkey: pubkey1, score: 80 });

    const signals = await fetchWoTSignals([pubkey1, "unknown"]);

    expect(signals.size).toBe(1);
    expect(signals.get(pubkey1)).toBe(80);
    expect(signals.get("unknown")).toBeUndefined();
  });
});
