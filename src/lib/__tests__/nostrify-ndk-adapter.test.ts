import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NDKEvent } from '@nostr-dev-kit/ndk';
import { NostrifyNDKCacheAdapter } from '../nostrify-ndk-adapter';

describe('NostrifyNDKCacheAdapter', () => {
  const mockStore = {
    event: vi.fn(),
    query: vi.fn(),
    remove: vi.fn(),
    count: vi.fn(),
  };

  const mockNDK = {
    // minimalist NDK mock
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize and set ready state', async () => {
    const adapter = new NostrifyNDKCacheAdapter(mockStore as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(adapter.ready).toBe(false);
    await adapter.initializeAsync();
    expect(adapter.ready).toBe(true);
  });

  it('should query the underlying store and return NDKEvents', async () => {
    const adapter = new NostrifyNDKCacheAdapter(mockStore as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    const mockEvents = [
      { id: '1', kind: 1, content: 'test 1', pubkey: 'p1', created_at: 100, tags: [], sig: 's1' },
    ];
    mockStore.query.mockResolvedValue(mockEvents);

    const mockSubscription = {
      filters: [{ kinds: [1] }],
      ndk: mockNDK,
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const results = await adapter.query(mockSubscription);
    
    expect(mockStore.query).toHaveBeenCalledWith(mockSubscription.filters);
    expect(results).toHaveLength(1);
    expect(results[0]).toBeInstanceOf(NDKEvent);
    expect(results[0].id).toBe('1');
  });

  it('should save event to the underlying store', async () => {
    const adapter = new NostrifyNDKCacheAdapter(mockStore as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    const mockEvent = {
      rawEvent: () => ({ id: '1', kind: 1 }),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    await adapter.setEvent(mockEvent);
    expect(mockStore.event).toHaveBeenCalledWith({ id: '1', kind: 1 });
  });

  it('should support discardUnpublishedEvent custom method', async () => {
    const adapter = new NostrifyNDKCacheAdapter(mockStore as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    await adapter.discardUnpublishedEvent('123');
    expect(mockStore.remove).toHaveBeenCalledWith([{ ids: ['123'] }]);
  });
});
