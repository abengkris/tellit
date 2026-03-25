/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNostrifyPausedFeed } from '../useNostrifyPausedFeed';
import { useNostrifyFeed } from '../useNostrifyFeed';

// Mock useNostrifyFeed
vi.mock('../useNostrifyFeed', () => ({
  useNostrifyFeed: vi.fn(),
}));

describe('useNostrifyPausedFeed', () => {
  it('should initialize with provided posts', () => {
    vi.mocked(useNostrifyFeed).mockReturnValue({
      posts: [{ id: '1', created_at: 100 } as any],
      loading: false,
      hasMore: true,
      loadMore: vi.fn(),
      refresh: vi.fn(),
    });

    const { result } = renderHook(() => useNostrifyPausedFeed({}));
    expect(result.current.posts).toHaveLength(1);
    expect(result.current.newCount).toBe(0);
  });

  it('should buffer new posts until flushed', () => {
    // Initial state
    vi.mocked(useNostrifyFeed).mockReturnValue({
      posts: [{ id: '1', created_at: 100 } as any],
      loading: false,
      hasMore: true,
      loadMore: vi.fn(),
      refresh: vi.fn(),
    });

    const { result, rerender } = renderHook(() => useNostrifyPausedFeed({}));
    expect(result.current.posts).toHaveLength(1);

    // Add a new post in the base hook
    vi.mocked(useNostrifyFeed).mockReturnValue({
      posts: [
        { id: '2', created_at: 200 } as any,
        { id: '1', created_at: 100 } as any,
      ],
      loading: false,
      hasMore: true,
      loadMore: vi.fn(),
      refresh: vi.fn(),
    });

    rerender();

    // Should still only show 1 post, but have newCount = 1
    expect(result.current.posts).toHaveLength(1);
    expect(result.current.newCount).toBe(1);

    // Flush
    act(() => {
      result.current.flushNewPosts();
    });

    expect(result.current.posts).toHaveLength(2);
    expect(result.current.newCount).toBe(0);
  });
});
