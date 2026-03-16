import { renderHook } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useFeed } from "../useFeed";
import NDK from "@nostr-dev-kit/ndk";
import { RelayPoolMock, EventGenerator, UserGenerator } from "@nostr-dev-kit/ndk/test";

// Mock NDKSync to avoid real Negentropy complex setup in basic hook test
vi.mock("@nostr-dev-kit/sync", () => {
  return {
    NDKSync: class {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ndk: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      constructor(ndk: any) { this.ndk = ndk; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      syncAndSubscribe = vi.fn().mockImplementation((filter: any, options: any) => {
        // Just return a regular subscription
        return Promise.resolve(this.ndk.subscribe(filter, options));
      });
    }
  };
});

describe("useFeed with Sync", () => {
  let ndk: NDK;
  let pool: RelayPoolMock;

  beforeEach(() => {
    pool = new RelayPoolMock();
    ndk = new NDK({ explicitRelayUrls: ["wss://test.relay"] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ndk as any).pool = pool;
    pool.addMockRelay("wss://test.relay");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    EventGenerator.setNDK(ndk as any);
  });

  afterEach(() => {
    pool.disconnectAll();
    pool.resetAll();
    vi.clearAllMocks();
  });

  it("should load events from mock relay", async () => {
    const alice = await UserGenerator.getUser("alice", ndk);
    
    // We need to wait for NDK to be ready in the hook
    const { result } = renderHook(() => useFeed([alice.pubkey]));

    expect(result.current.posts).toBeDefined();
  });
});
