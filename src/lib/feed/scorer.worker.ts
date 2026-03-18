import { ScoringContext, scoreEvent } from "./scorer";
import { NDKEvent } from "@nostr-dev-kit/ndk";

/**
 * Web Worker for scoring and ranking Nostr events.
 * This prevents blocking the main thread during heavy feed processing.
 */

self.onmessage = (e: MessageEvent<{ 
  events: Record<string, unknown>[], 
  context: ScoringContext, 
  networkActivity?: Record<string, { reactions: Set<string>; replies: Set<string> }> 
}>) => {
  const { events, context, networkActivity } = e.data;
  
  // Re-map context sets and maps because they are lost during serialization
  const scoringContext: ScoringContext = {
    ...context,
    followingSet: new Set(context.followingSet),
    followsOfFollowsSet: new Set(context.followsOfFollowsSet),
    interactionHistory: new Map(context.interactionHistory),
    trustScores: context.trustScores ? new Map(Object.entries(context.trustScores)) : undefined,
    mutualsMap: context.mutualsMap ? new Map(Object.entries(context.mutualsMap)) : undefined,
    interestsSet: context.interestsSet ? new Set(context.interestsSet) : undefined,
  };

  const scoredEvents = events.map(rawEvent => {
    // Wrap in a minimal mock NDKEvent for the scorer
    const event = {
      ...rawEvent,
      tag: (name: string) => (rawEvent.tags as string[][]).find((t: string[]) => t[0] === name)
    } as unknown as NDKEvent;

    return scoreEvent(event, scoringContext, networkActivity);
  });

  // Sort by score and then by time
  scoredEvents.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.event.created_at ?? 0) - (a.event.created_at ?? 0);
  });

  self.postMessage(scoredEvents);
};
