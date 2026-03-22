import { ScoringContext, ScoredEvent } from "./types";
import { scoreEvent } from "./scorer";
import { NDKEvent } from "@nostr-dev-kit/ndk";

/**
 * Web Worker for scoring and ranking Nostr events.
 * Maintains persistent state to avoid re-serializing the entire feed every update.
 */

const eventMap = new Map<string, Record<string, unknown>>();
let currentContext: ScoringContext | null = null;

self.onmessage = (e: MessageEvent<{ 
  events?: Record<string, unknown>[], 
  context?: ScoringContext, 
  networkActivity?: Record<string, { reactions: Set<string>; replies: Set<string> }> 
}>) => {
  const { events, context, networkActivity } = e.data;
  
  // 1. Update Context if provided
  if (context) {
    currentContext = {
      ...context,
      followingSet: new Set(context.followingSet),
      interactionHistory: new Map(context.interactionHistory),
      networkDegreeMap: context.networkDegreeMap ? new Map(Object.entries(context.networkDegreeMap)) : undefined,
      mutualsMap: context.mutualsMap ? new Map(Object.entries(context.mutualsMap)) : undefined,
      interestsSet: context.interestsSet ? new Set(context.interestsSet) : undefined,
    };
  }

  // 2. Add new events to persistent map
  if (events && events.length > 0) {
    events.forEach(ev => {
      if (ev.id) eventMap.set(ev.id as string, ev);
    });
  }

  if (!currentContext) return;

  const networkActivityMap = networkActivity ? new Map(Object.entries(networkActivity)) : undefined;

  // 3. Score all events in memory
  const scoredEvents: ScoredEvent[] = [];
  
  eventMap.forEach((rawEvent) => {
    // Wrap in a minimal mock NDKEvent for the scorer
    const event = {
      ...rawEvent,
      tag: (name: string) => (rawEvent.tags as string[][]).find((t: string[]) => t[0] === name)
    } as unknown as NDKEvent;

    scoredEvents.push(scoreEvent(event, currentContext!, networkActivityMap));
  });

  // 4. Sort and return
  scoredEvents.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.event.created_at ?? 0) - (a.event.created_at ?? 0);
  });

  // Limit returned results to top 200 to keep transfer small
  self.postMessage(scoredEvents.slice(0, 200));
};
