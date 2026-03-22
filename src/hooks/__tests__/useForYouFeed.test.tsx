import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useForYouFeed } from "../useForYouFeed";

// Mock dependencies
vi.mock("@/hooks/useNDK", () => ({
  useNDK: () => ({ 
    ndk: { 
      subscribe: vi.fn(() => ({ stop: vi.fn() })) 
    }, 
    isReady: true, 
    sync: null 
  }),
}));

vi.mock("./useWoTNetwork", () => ({
  useWoTNetwork: () => ({ network: {}, loading: false }),
}));

vi.mock("@/store/ui", () => ({
  useUIStore: () => ({ wotStrictMode: false }),
}));

vi.mock("./useInteractionHistory", () => ({
  useInteractionHistory: () => ({ topInteracted: () => [], historyMap: new Map() }),
}));

vi.mock("@/lib/feed/signals/wot", () => ({
  fetchWoTSignals: vi.fn().mockResolvedValue(new Map()),
}));

// Mock Worker
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let workerInstance: any = null;
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    workerInstance = this;
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).Worker = MockWorker;

// Mock window.scrollY
Object.defineProperty(window, 'scrollY', {
  value: 0,
  configurable: true,
  writable: true
});

describe("useForYouFeed", () => {
  const options = {
    viewerPubkey: "me",
    followingList: ["friend"],
    interests: ["nostr"],
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    workerInstance = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).scrollY = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should handle scroll stability by buffering rankings when scrolled down", async () => {
    const { result } = renderHook(() => useForYouFeed(options));

    // 1. Simulate scrolled down
    await act(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).scrollY = 500;
    });

    // 2. Simulate worker returning results
    const mockResults = {
      type: 'BATCH_RESULTS',
      results: [{ event: { id: 'e1', content: 'test' }, score: 100, signals: {} }]
    };

    await act(async () => {
      workerInstance.onmessage({ data: mockResults } as MessageEvent);
    });

    // Should NOT apply to posts immediately because scrolled down
    expect(result.current.posts.length).toBe(0);

    // 3. Flush new posts
    await act(async () => {
      result.current.flushNewPosts();
    });

    // Now it should be applied
    expect(result.current.posts.length).toBe(1);
    expect(result.current.posts[0].content).toBe('test');
  });

  it("should apply rankings immediately when at top", async () => {
    const { result } = renderHook(() => useForYouFeed(options));

    // 1. Ensure at top
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).scrollY = 0;

    // 2. Simulate worker returning results
    const mockResults = {
      type: 'BATCH_RESULTS',
      results: [{ event: { id: 'e1', content: 'test' }, score: 100, signals: {} }]
    };

    await act(async () => {
      workerInstance.onmessage({ data: mockResults } as MessageEvent);
    });

    // Should apply to posts immediately because at top
    expect(result.current.posts.length).toBe(1);
  });
});
