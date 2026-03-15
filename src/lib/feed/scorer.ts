import { NDKEvent } from "@nostr-dev-kit/ndk";

export interface ScoringContext {
  viewerPubkey: string;
  followingSet: Set<string>;        
  followsOfFollowsSet: Set<string>; 
  interactionHistory: Map<string, number>; 
  trustScores?: Map<string, number>; // pubkey -> score (0-1)
  mutualsMap?: Map<string, number>;  // pubkey -> count of mutual followers
}

export interface ScoredEvent {
  event: NDKEvent;
  score: number;
  signals: Record<string, number>; 
}

const WEIGHTS = {
  isFollowing: 60,        
  isFollowOfFollow: 25,   
  frequentInteraction: 40, 
  hasMedia: 8,            
  hasLongContent: 5,      
  isReply: -25,           
  isRepost: 10,           
  networkReaction: 15,    
  networkReply: 12,
  trustFactor: 40,        // multiplier for trust score (assumed 0-1)
  mutualsFactor: 15,      // multiplier for log10(mutuals)
} as const;

export function scoreEvent(
  event: NDKEvent,
  ctx: ScoringContext,
  networkActivity?: Map<string, { reactions: Set<string>; replies: Set<string> }>
): ScoredEvent {
  const signals: Record<string, number> = {};
  let score = 0;

  // --- Social graph signals ---
  if (ctx.followingSet.has(event.pubkey)) {
    signals.isFollowing = WEIGHTS.isFollowing;
    score += WEIGHTS.isFollowing;
  } else if (ctx.followsOfFollowsSet.has(event.pubkey)) {
    signals.isFollowOfFollow = WEIGHTS.isFollowOfFollow;
    score += WEIGHTS.isFollowOfFollow;
  }

  // Trust score boost (Web of Trust)
  if (ctx.trustScores) {
    const trust = ctx.trustScores.get(event.pubkey) ?? 0;
    if (trust > 0) {
      const trustBoost = trust * WEIGHTS.trustFactor;
      signals.trust = Math.round(trustBoost * 10) / 10;
      score += trustBoost;
    }
  }

  // Mutuals boost
  if (ctx.mutualsMap) {
    const mutuals = ctx.mutualsMap.get(event.pubkey) ?? 0;
    if (mutuals > 1) {
      // 1 + log10(mutuals) boost as per WOT_PLAN.md
      const mutualsBoost = (1 + Math.log10(mutuals)) * WEIGHTS.mutualsFactor;
      signals.mutuals = Math.round(mutualsBoost * 10) / 10;
      score += mutualsBoost;
    }
  }

  const interactionCount = ctx.interactionHistory.get(event.pubkey) ?? 0;
  if (interactionCount > 0) {
    const interactionBoost = Math.min(interactionCount * 8, WEIGHTS.frequentInteraction);
    signals.frequentInteraction = interactionBoost;
    score += interactionBoost;
  }

  // --- Content signals ---
  const content = event.content ?? "";
  if (content.length > 200) {
    signals.hasLongContent = WEIGHTS.hasLongContent;
    score += WEIGHTS.hasLongContent;
  }

  const hasMedia = /https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp|mp4|mov|webm)/i.test(content);
  if (hasMedia) {
    signals.hasMedia = WEIGHTS.hasMedia;
    score += WEIGHTS.hasMedia;
  }

  // Reposts
  if (event.kind === 6 || event.kind === 16) {
    signals.isRepost = WEIGHTS.isRepost;
    score += WEIGHTS.isRepost;
  }

  // Reply logic
  const eTags = event.tags.filter(t => t[0] === "e");
  const pTags = event.tags.filter(t => t[0] === "p");
  const isReply = eTags.length > 0;
  if (isReply) {
    const replyTarget = pTags[pTags.length - 1]?.[1];
    if (replyTarget && !ctx.followingSet.has(replyTarget) && replyTarget !== ctx.viewerPubkey) {
      signals.isReply = WEIGHTS.isReply;
      score += WEIGHTS.isReply;
    }
  }

  // --- Network engagement signals ---
  if (networkActivity) {
    const activity = networkActivity.get(event.id);
    if (activity) {
      if (activity.reactions.size > 0) {
        const reactionBoost = Math.min(
          activity.reactions.size * WEIGHTS.networkReaction,
          WEIGHTS.networkReaction * 6
        );
        signals.networkReaction = reactionBoost;
        score += reactionBoost;
      }
      if (activity.replies.size > 0) {
        const replyBoost = Math.min(
          activity.replies.size * WEIGHTS.networkReply,
          WEIGHTS.networkReply * 6
        );
        signals.networkReply = replyBoost;
        score += replyBoost;
      }
    }
  }

  // --- Smooth freshness decay ---
  // Using logarithmic decay: score -= log2(ageHours + 1) * intensity
  const ageHours = Math.max(0, (Date.now() / 1000 - (event.created_at ?? 0)) / 3600);
  const decayIntensity = 15;
  const freshnessScore = -(Math.log2(ageHours + 1) * decayIntensity);
  
  signals.freshness = Math.round(freshnessScore * 10) / 10;
  score += freshnessScore;

  return { event, score, signals };
}

export function rankEvents(
  events: NDKEvent[],
  ctx: ScoringContext,
  networkActivity?: Map<string, { reactions: Set<string>; replies: Set<string> }>
): ScoredEvent[] {
  return events
    .map(e => scoreEvent(e, ctx, networkActivity))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.event.created_at ?? 0) - (a.event.created_at ?? 0);
    });
}
