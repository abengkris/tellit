import { NDKEvent } from "@nostr-dev-kit/ndk";
import { RANKING_WEIGHTS as WEIGHTS } from "../types";

/**
 * Calculates the interest matching score for an event based on user interests (NIP-51).
 * @param event The Nostr event to score.
 * @param interestsSet Set of hashtags the user is interested in.
 * @returns The matching boost score.
 */
export function calculateInterestSignal(event: NDKEvent, interestsSet?: Set<string>): number {
  if (!interestsSet || interestsSet.size === 0) return 0;

  const eventTags = new Set(
    event.tags
      .filter(t => t[0] === 't')
      .map(t => t[1].toLowerCase())
  );

  let matches = 0;
  interestsSet.forEach(interest => {
    if (eventTags.has(interest.toLowerCase())) {
      matches++;
    }
  });

  if (matches === 0) return 0;

  // Boost for matching a topic user is interested in, capped at 2x base boost
  return Math.min(matches * WEIGHTS.interestMatch, WEIGHTS.interestMatch * 2);
}
