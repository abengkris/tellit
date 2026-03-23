import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useBookmarks } from "../useBookmarks";
import NDK, { NDKEvent } from "@nostr-dev-kit/ndk";
import { RelayPoolMock } from "@nostr-dev-kit/ndk/test";

// Mock useNDK
const mockNDKContext = {
  ndk: null as NDK | null,
  isReady: false,
};

vi.mock("@/hooks/useNDK", () => ({
  useNDK: () => mockNDKContext,
}));

// Mock useLists
const mockListsContext = {
  bookmarkedEventIds: new Set<string>(),
  loading: true,
};

vi.mock("@/hooks/useLists", () => ({
  useLists: () => mockListsContext,
}));

describe("useBookmarks", () => {
  let ndk: NDK;
  let pool: RelayPoolMock;

  beforeEach(() => {
    pool = new RelayPoolMock();
    ndk = new NDK({ explicitRelayUrls: ["wss://test.relay"] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ndk as any).pool = pool;
    pool.addMockRelay("wss://test.relay");
    
    mockNDKContext.ndk = ndk;
    mockNDKContext.isReady = true;
    mockListsContext.loading = false;
    mockListsContext.bookmarkedEventIds = new Set();
  });

  afterEach(() => {
    pool.disconnectAll();
    pool.resetAll();
    vi.clearAllMocks();
  });

  it("should finish loading with empty bookmarks", async () => {
    const { result } = renderHook(() => useBookmarks());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.events).toHaveLength(0);
  });

  it("should fetch bookmarked events", async () => {
    const event1 = new NDKEvent(ndk, { id: "e1", kind: 1, content: "Post 1", created_at: 100 } as Record<string, unknown>);
    const event2 = new NDKEvent(ndk, { id: "e2", kind: 1, content: "Post 2", created_at: 200 } as Record<string, unknown>);
    
    // Mock fetchEvents
    ndk.fetchEvents = vi.fn().mockResolvedValue(new Set([event1, event2]));
    
    mockListsContext.bookmarkedEventIds = new Set(["e1", "e2"]);
    
    const { result } = renderHook(() => useBookmarks());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.events).toHaveLength(2);
    // Should be sorted by created_at descending
    expect(result.current.events[0].id).toBe("e2");
    expect(result.current.events[1].id).toBe("e1");
  });

  it("should handle safety timeout", async () => {
    vi.useFakeTimers();
    
    mockListsContext.bookmarkedEventIds = new Set(["e1"]);
    // fetchEvents never resolves
    ndk.fetchEvents = vi.fn().mockReturnValue(new Promise(() => {}));
    
    const { result } = renderHook(() => useBookmarks());
    expect(result.current.loading).toBe(true);

    act(() => {
      vi.advanceTimersByTime(5001);
    });
    
    expect(result.current.loading).toBe(false);
    
    vi.useRealTimers();
  });
});
