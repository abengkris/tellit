import { NDKCacheAdapter, NDKEvent, NDKSubscription } from '@nostr-dev-kit/ndk';
import { type NStore } from '@nostrify/types';

/**
 * Adapter that allows using a Nostrify NStore as an NDK cache adapter.
 */
export class NostrifyNDKCacheAdapter implements NDKCacheAdapter {
  public locking = true;
  public ready = false;

  constructor(private store: NStore) {}

  public async initializeAsync(): Promise<void> {
    this.ready = true;
  }

  public async query(subscription: NDKSubscription): Promise<NDKEvent[]> {
    const filters = subscription.filters;
    // Map NDK filters to Nostrify filters if needed (they are mostly compatible)
    const events = await this.store.query(filters);
    
    // NDK expects NDKEvent instances
    const ndkEvents = events.map(e => {
      const ndkEvent = new NDKEvent(subscription.ndk, e);
      return ndkEvent;
    });

    return ndkEvents;
  }

  public async setEvent(event: NDKEvent): Promise<void> {
    await this.store.event(event.rawEvent() as any); // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  /**
   * Custom method used by TellIt application to manually discard unpublished events.
   */
  public async discardUnpublishedEvent(eventId: string): Promise<void> {
    if (this.store.remove) {
      await this.store.remove([{ ids: [eventId] }]);
    }
  }

  public async getUnpublishedEvents(): Promise<{ event: NDKEvent; relays?: string[]; lastTryAt?: number }[]> {
    // In Nostrify, unpublished events are not tracked in the same way as NDKCacheAdapterDexie.
    // However, we can query for events that might be local-only if we had a way to mark them.
    // For now, returning empty array to satisfy the interface.
    return [];
  }

  // Optional methods that can be implemented for better performance/functionality
  public async deleteEventIds(eventIds: string[]): Promise<void> {
    if (this.store.remove) {
      await this.store.remove([{ ids: eventIds }]);
    }
  }
}
