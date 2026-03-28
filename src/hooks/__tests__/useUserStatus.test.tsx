import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUserStatus } from '../useUserStatus';
import { getStorage } from '@/lib/nostrify-storage';
import { createRelayPool } from '@/lib/nostrify-relay';

// Mock Nostrify utilities
vi.mock('@/lib/nostrify-storage', () => ({
  getStorage: vi.fn(),
}));

vi.mock('@/lib/nostrify-relay', () => ({
  createRelayPool: vi.fn(),
}));

describe('useUserStatus', () => {
  const mockPubkey = 'test-pubkey';
  const mockEvent = {
    kind: 30315,
    pubkey: mockPubkey,
    content: 'Listening to music',
    tags: [
      ['d', 'music'],
      ['expiration', '9999999999'],
      ['r', 'https://example.com/song']
    ],
    created_at: 1000
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and parse user status from storage', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getStorage as unknown as any).mockResolvedValue({
      query: vi.fn().mockResolvedValue([mockEvent]),
    });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createRelayPool as unknown as any).mockReturnValue({
      req: vi.fn().mockReturnValue((async function* () {
        yield ['EOSE', 'sub1'];
      })()),
    });

    const { result } = renderHook(() => useUserStatus(mockPubkey));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.musicStatus).toEqual({
      content: 'Listening to music',
      type: 'music',
      link: 'https://example.com/song',
      expiration: 9999999999
    });
  });

  it('should handle real-time updates from relay', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getStorage as unknown as any).mockResolvedValue({
      query: vi.fn().mockResolvedValue([]),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createRelayPool as unknown as any).mockReturnValue({
      req: vi.fn().mockReturnValue((async function* () {
        yield ['EVENT', 'sub1', mockEvent];
        yield ['EOSE', 'sub1'];
      })()),
    });

    const { result } = renderHook(() => useUserStatus(mockPubkey));

    await waitFor(() => expect(result.current.musicStatus).toBeDefined());

    expect(result.current.musicStatus?.content).toBe('Listening to music');
  });
});
