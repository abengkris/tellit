import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNostrifyPublish } from '../useNostrifyPublish';

const { mockPool, mockSigner, mockStorage } = vi.hoisted(() => ({
  mockPool: {
    event: vi.fn().mockResolvedValue(undefined),
  },
  mockSigner: {
    getPublicKey: vi.fn().mockResolvedValue('pubkey'),
    signEvent: vi.fn().mockImplementation(async (e) => ({ ...e, id: 'id', sig: 'sig', pubkey: 'pubkey' })),
  },
  mockStorage: {
    event: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock dependencies
vi.mock('@/lib/nostrify-relay', () => ({
  createRelayPool: vi.fn().mockReturnValue(mockPool),
}));

vi.mock('@/lib/nostrify-signer', () => ({
  createSigner: vi.fn().mockReturnValue(mockSigner),
}));

vi.mock('@/lib/nostrify-storage', () => ({
  getStorage: vi.fn().mockResolvedValue(mockStorage),
}));

vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn().mockReturnValue({ privateKey: 'pk' }),
}));

describe('useNostrifyPublish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should publish a note', async () => {
    const { result } = renderHook(() => useNostrifyPublish());
    
    let event: any;
    await act(async () => {
      event = await result.current.publish({ kind: 1, content: 'test', tags: [] });
    });

    expect(event).toBeDefined();
    expect(event.content).toBe('test');
    expect(mockSigner.signEvent).toHaveBeenCalled();
    expect(mockStorage.event).toHaveBeenCalledWith(event);
    expect(mockPool.event).toHaveBeenCalledWith(event);
  });

  it('should handle react', async () => {
    const { result } = renderHook(() => useNostrifyPublish());
    
    let event: any;
    const targetEvent = { id: 'target_id', pubkey: 'target_pubkey', kind: 1 };
    
    await act(async () => {
      event = await result.current.react(targetEvent, '+');
    });

    expect(event.kind).toBe(7);
    expect(event.tags).toContainEqual(['e', 'target_id']);
    expect(event.tags).toContainEqual(['p', 'target_pubkey']);
    expect(event.tags).toContainEqual(['k', '1']);
  });

  it('should handle react with emoji', async () => {
    const { result } = renderHook(() => useNostrifyPublish());
    
    let event: any;
    const targetEvent = { id: 'target_id', pubkey: 'target_pubkey', kind: 1 };
    
    await act(async () => {
      event = await result.current.react(targetEvent, ':smile:', 'https://emoji.com/smile.png');
    });

    expect(event.tags).toContainEqual(['emoji', 'smile', 'https://emoji.com/smile.png']);
  });

  it('should handle repost', async () => {
    const { result } = renderHook(() => useNostrifyPublish());
    
    let event: any;
    const targetEvent = { id: 'target_id', pubkey: 'target_pubkey', kind: 1 };
    
    await act(async () => {
      event = await result.current.repost(targetEvent);
    });

    expect(event.kind).toBe(6);
    expect(event.tags).toContainEqual(['e', 'target_id']);
    expect(event.tags).toContainEqual(['p', 'target_pubkey']);
  });

  it('should log error on storage failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockStorage.event.mockRejectedValue(new Error('Storage failure'));
    
    const { result } = renderHook(() => useNostrifyPublish());
    
    await act(async () => {
      await result.current.publish({ kind: 1, content: 'test', tags: [] });
    });

    expect(consoleSpy).toHaveBeenCalledWith('Failed to save to local storage optimistically:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('should log error on relay failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockPool.event.mockRejectedValue(new Error('Relay failure'));
    
    const { result } = renderHook(() => useNostrifyPublish());
    
    await act(async () => {
      await result.current.publish({ kind: 1, content: 'test', tags: [] });
    });

    // Wait for the fire-and-forget promise to catch
    await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith('Failed to publish to relays:', expect.any(Error)));
    consoleSpy.mockRestore();
  });
});
