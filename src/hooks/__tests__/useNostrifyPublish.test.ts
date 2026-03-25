import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNostrifyPublish } from '../useNostrifyPublish';

// Mock dependencies
vi.mock('@/lib/nostrify-relay', () => ({
  createRelayPool: vi.fn().mockReturnValue({
    event: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/lib/nostrify-signer', () => ({
  createSigner: vi.fn().mockReturnValue({
    getPublicKey: vi.fn().mockResolvedValue('pubkey'),
    signEvent: vi.fn().mockImplementation(async (e) => ({ ...e, id: 'id', sig: 'sig', pubkey: 'pubkey' })),
  }),
}));

vi.mock('@/lib/nostrify-storage', () => ({
  getStorage: vi.fn().mockResolvedValue({
    event: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe('useNostrifyPublish', () => {
  it('should publish a note', async () => {
    const { result } = renderHook(() => useNostrifyPublish());
    
    let event;
    await act(async () => {
      event = await result.current.publish({ kind: 1, content: 'test', tags: [] });
    });

    expect(event).toBeDefined();
    expect(event.content).toBe('test');
    expect(event.id).toBe('id');
  });
});
