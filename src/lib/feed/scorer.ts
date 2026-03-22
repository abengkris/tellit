import { NDKEvent } from "@nostr-dev-kit/ndk";
import { ScoringContext, ScoredEvent, RANKING_WEIGHTS as WEIGHTS } from "./types";
import { calculateInterestSignal } from "./signals/interests";

export function scoreEvent(
  event: NDKEvent,
  ctx: ScoringContext,
  networkActivity?: Map<string, { reactions: Set<string>; replies: Set<string> }>
): ScoredEvent {
  const signals: Record<string, number> = {};
  let score = 0;

  // --- Interests signals ---
  const interestBoost = calculateInterestSignal(event, ctx.interestsSet);
  if (interestBoost > 0) {
    signals.interestMatch = interestBoost;
    score += interestBoost;
  }

  // --- Social graph signals ---
  if (ctx.followingSet.has(event.pubkey)) {
    signals.isFollowing = WEIGHTS.isFollowing;
    score += WEIGHTS.isFollowing;
  } 

  // Network Degree boost
  if (ctx.networkDegreeMap) {
    const degree = ctx.networkDegreeMap.get(event.pubkey);
    if (degree === 1) {
      signals.networkDegree1 = WEIGHTS.networkDegree1;
      score += WEIGHTS.networkDegree1;
    } else if (degree === 2) {
      signals.networkDegree2 = WEIGHTS.networkDegree2;
      score += WEIGHTS.networkDegree2;
    }
  }

  // Web of Trust (WoT) boost
  if (ctx.wotScores) {
    const wotScore = ctx.wotScores.get(event.pubkey) ?? 0;
    if (wotScore > 0) {
      const wotBoost = wotScore * WEIGHTS.wotScoreFactor;
      signals.wot = wotBoost;
      score += wotBoost;
    }
  }

  // Mutuals boost
  if (ctx.mutualsMap) {
    const mutuals = ctx.mutualsMap.get(event.pubkey) ?? 0;
    if (mutuals > 1) {
      // 1 + log10(mutuals) boost
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
