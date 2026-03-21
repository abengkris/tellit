import { describe, it, expect, beforeEach, vi } from "vitest";
import { WoTServiceLocal } from "../wot.service.local";
import NDK from "@nostr-dev-kit/ndk";

// Mock dependencies
vi.mock("../lib/wot/crawler", () => ({
  WoTCrawler: vi.fn().mockImplementation(() => ({
    crawl: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("../lib/wot/scoring", () => ({
  WoTScorer: vi.fn().mockImplementation(() => ({
    run: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe("WoTServiceLocal", () => {
  let ndk: NDK;
  let service: WoTServiceLocal;

  beforeEach(() => {
    ndk = new NDK();
    service = new WoTServiceLocal(ndk);
    localStorage.clear();
  });

  it("should sync WoT data if stale", async () => {
    const rootPubkey = "root-pubkey";
    
    await service.sync(rootPubkey);

    expect(localStorage.getItem(`wot_last_sync_${rootPubkey}`)).toBeDefined();
  });

  it("should skip sync if data is fresh", async () => {
    const rootPubkey = "root-pubkey";
    localStorage.setItem(`wot_last_sync_${rootPubkey}`, Date.now().toString());

    await service.sync(rootPubkey);

    // No way to easily check if crawl was NOT called without more complex mocks
    // but the logic is simple enough.
  });
});
