import { NDKEvent } from "@nostr-dev-kit/ndk";

/**
 * Contextual data required to score a single event for a specific user.
 */
export interface ScoringContext {
  /** The pubkey of the user viewing the feed */
  viewerPubkey: string;
  /** Set of pubkeys the user is directly following */
  followingSet: Set<string>;        
  /** Map of pubkey to interaction count (replies, zaps, etc.) */
  interactionHistory: Map<string, number>; 
  /** Map of pubkey to network distance (1 = follows, 2 = follows of follows) */
  networkDegreeMap?: Map<string, number>; 
  /** Map of pubkey to count of mutual followers */
  mutualsMap?: Map<string, number>;  
  /** Set of hashtags/interests the user has expressed interest in (NIP-51) */
  interestsSet?: Set<string>;        
  /** Web of Trust scores from local Dexie database */
  wotScores?: Map<string, number>;
}

/**
 * The result of scoring an event, including the final score and contributing signals.
 */
export interface ScoredEvent {
  event: NDKEvent;
  score: number;
  /** Individual signal contributions to the final score */
  signals: Record<string, number>; 
}

/**
 * Weights used by the scoring algorithm.
 */
export const RANKING_WEIGHTS = {
  isFollowing: 60,        
  networkDegree1: 70,     // Verified D1 (direct network)
  networkDegree2: 35,     // Verified D2 (extended network)
  frequentInteraction: 40, 
  hasMedia: 8,            
  hasLongContent: 5,      
  isReply: -25,           
  isRepost: 10,           
  networkReaction: 15,    
  networkReply: 12,
  mutualsFactor: 15,      // multiplier for log10(mutuals)
  interestMatch: 50,      // Boost for matching user interests
  wotScoreFactor: 0.5,    // multiplier for raw WoT score (0-100)
} as const;

/**
 * Message protocol for the scoring Web Worker.
 */
export type ScoringWorkerMessage = 
  | { type: 'SCORE_BATCH', events: unknown[], ctx: ScoringContext, networkActivity?: unknown }
  | { type: 'BATCH_RESULTS', results: ScoredEvent[] }
  | { type: 'ERROR', error: string };
