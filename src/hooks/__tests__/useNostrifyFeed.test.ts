import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useNostrifyFeed } from '../useNostrifyFeed';
import { useNDK } from '@/hooks/useNDK';

const { mockPool, mockStorage } = vi.hoisted(() => ({
  mockPool: {
    req: vi.fn(),
    query: vi.fn(),
    close: vi.fn(),
  },
  mockStorage: {
    query: vi.fn(),
    event: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock the dependencies
vi.mock('@/hooks/useNDK', () => ({
  useNDK: vi.fn(),
}));

vi.mock('@nostr-dev-kit/ndk', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const NDKEvent = vi.fn().mockImplementation(function (this: any, ndk, event) {
    Object.assign(this, event);
    this.ndk = ndk;
  });  return { NDKEvent };
});

vi.mock('@/lib/nostrify-relay', () => ({
  createRelayPool: vi.fn().mockReturnValue(mockPool),
}));

vi.mock('@/lib/nostrify-storage', () => ({
  getStorage: vi.fn().mockResolvedValue(mockStorage),
}));

describe('useNostrifyFeed', () => {
  const mockedUseNDK = vi.mocked(useNDK);

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedUseNDK.mockReturnValue({ ndk: {} } as any);
    mockStorage.query.mockResolvedValue([]);
    mockPool.req.mockImplementation(() => {
      return (async function* () {
        await new Promise(resolve => setTimeout(resolve, 10));
        yield ['EVENT', 'sub', { id: '1', kind: 1, content: 'test', created_at: 100, tags: [], pubkey: 'abc', sig: 'sig' }];
        await new Promise(resolve => setTimeout(resolve, 10));
        yield ['EOSE', 'sub'];
      })();
    });
  });

  it('should initialize with no options', async () => {
    const { result } = renderHook(() => useNostrifyFeed());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 10000 });
  });

  it('should fetch from storage first', async () => {
    const storedEvent = { id: 'stored', kind: 1, content: 'stored', created_at: 200, tags: [], pubkey: 'abc', sig: 'sig' };
    mockStorage.query.mockResolvedValue([storedEvent]);
    
    const { result } = renderHook(() => useNostrifyFeed({ authors: ['abc'] }));
    
    await waitFor(() => expect(result.current.posts.some(p => p.id === 'stored')).toBe(true));
  });

  it('should handle loadMore', async () => {
    const { result } = renderHook(() => useNostrifyFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    
    const initialPostCount = result.current.posts.length;
    
    mockPool.req.mockImplementation(() => {
      return (async function* () {
        await new Promise(resolve => setTimeout(resolve, 10));
        yield ['EVENT', 'sub', { id: '2', kind: 1, content: 'more', created_at: 50, tags: [], pubkey: 'abc', sig: 'sig' }];
        await new Promise(resolve => setTimeout(resolve, 10));
        yield ['EOSE', 'sub'];
      })();
    });

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => expect(result.current.posts.length).toBeGreaterThan(initialPostCount));
  });

  it('should handle refresh', async () => {
    const { result } = renderHook(() => useNostrifyFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    
    mockPool.req.mockImplementation(() => {
      return (async function* () {
        await new Promise(resolve => setTimeout(resolve, 10));
        yield ['EVENT', 'sub', { id: 'refresh', kind: 1, content: 'new', created_at: 300, tags: [], pubkey: 'abc', sig: 'sig' }];
        await new Promise(resolve => setTimeout(resolve, 10));
        yield ['EOSE', 'sub'];
      })();
    });

    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => expect(result.current.posts.some(p => p.id === 'refresh')).toBe(true));
  });

  it('should handle errors in fetchFeed', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockStorage.query.mockRejectedValue(new Error('Storage failure'));
    
    const { result } = renderHook(() => useNostrifyFeed());
    
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(consoleSpy).toHaveBeenCalledWith('[useNostrifyFeed] Failed to fetch feed:', expect.any(Error));
    consoleSpy.mockRestore();
  });
});
