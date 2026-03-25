import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useNostrifyFeed } from '../useNostrifyFeed';

// Mock the dependencies
vi.mock('@/hooks/useNDK', () => ({
  useNDK: vi.fn().mockReturnValue({
    ndk: {
      // Mock NDK instance
    },
  }),
}));

vi.mock('@nostr-dev-kit/ndk', () => ({
  NDKEvent: vi.fn().mockImplementation(function (ndk, event) {
    return {
      ...event,
      ndk,
    };
  }),
}));

vi.mock('@/lib/nostrify-relay', () => ({
  createRelayPool: vi.fn().mockReturnValue({
    req: vi.fn().mockReturnValue((async function* () {
      yield ['EVENT', 'sub', { id: '1', kind: 1, content: 'test', created_at: 100, tags: [], pubkey: 'abc', sig: 'sig' }];
      yield ['EOSE', 'sub'];
    })()),
    query: vi.fn().mockResolvedValue([]),
    close: vi.fn(),
  }),
}));

vi.mock('@/lib/nostrify-storage', () => ({
  getStorage: vi.fn().mockResolvedValue({
    query: vi.fn().mockResolvedValue([]),
    event: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe('useNostrifyFeed', () => {
  it('should initialize with loading state and then provide posts', async () => {
    const authors = ['abc'];
    const kinds = [1];
    const { result } = renderHook(() => useNostrifyFeed({ authors, kinds }));

    expect(result.current.loading).toBe(true);
    expect(result.current.posts).toEqual([]);

    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });
    expect(result.current.posts).toHaveLength(1);
    expect(result.current.posts[0].id).toBe('1');
  });
});
