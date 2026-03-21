import { ScoringContext, ScoredEvent, ScoringWorkerMessage } from "./types";
import { scoreEvent } from "./scorer";
import { NDKEvent } from "@nostr-dev-kit/ndk";

/**
 * Web Worker for high-performance scoring and ranking of Nostr events.
 * This worker runs in a background thread to keep the UI smooth (60fps).
 */

const eventCache = new Map<string, unknown>();
let lastContext: ScoringContext | null = null;

self.onmessage = (e: MessageEvent<ScoringWorkerMessage>) => {
  const message = e.data;

  if (message.type === 'SCORE_BATCH') {
    const { events, ctx, networkActivity } = message;

    // 1. Update Context (convert plain objects back to Sets/Maps)
    if (ctx) {
      lastContext = {
        ...ctx,
        followingSet: new Set(ctx.followingSet),
        interactionHistory: new Map(Object.entries(ctx.interactionHistory || {})),
        networkDegreeMap: ctx.networkDegreeMap ? new Map(Object.entries(ctx.networkDegreeMap)) : undefined,
        mutualsMap: ctx.mutualsMap ? new Map(Object.entries(ctx.mutualsMap)) : undefined,
        interestsSet: ctx.interestsSet ? new Set(ctx.interestsSet) : undefined,
        wotScores: ctx.wotScores ? new Map(Object.entries(ctx.wotScores)) : undefined,
      };
    }

    // 2. Cache new events
    if (events && events.length > 0) {
      events.forEach((ev: unknown) => {
        const event = ev as { id: string };
        if (event.id) eventCache.set(event.id, ev);
      });
    }

    if (!lastContext) {
      self.postMessage({ type: 'ERROR', error: 'No scoring context initialized' });
      return;
    }

    // 3. Score all cached events
    try {
      const results: ScoredEvent[] = [];
      const networkActivityMap = networkActivity 
        ? new Map(Object.entries(networkActivity as Record<string, { reactions: Set<string>; replies: Set<string> }>)) 
        : undefined;

      eventCache.forEach((rawEvent: unknown) => {
        const eventData = rawEvent as { tags: string[][] };
        // Create a minimal NDKEvent mock for the scorer logic
        const event = {
          ...eventData,
          tag: (name: string) => eventData.tags.find(t => t[0] === name)
        } as unknown as NDKEvent;

        results.push(scoreEvent(event, lastContext!, networkActivityMap));
      });

      // 4. Sort by score descending, then by creation date
      results.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (b.event.created_at ?? 0) - (a.event.created_at ?? 0);
      });

      // 5. Return top 200 results
      self.postMessage({ 
        type: 'BATCH_RESULTS', 
        results: results.slice(0, 200) 
      });
    } catch (err) {
      self.postMessage({ type: 'ERROR', error: (err as Error).message });
    }
  }
};
