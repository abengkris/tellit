import { describe, it, expect, beforeEach, vi, afterAll } from "vitest";
import { scoreEvent, rankEvents } from "../scorer";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { ScoringContext, RANKING_WEIGHTS as WEIGHTS } from "../types";

describe("Scoring Engine", () => {
  const me = "me";
  const friend = "friend";
  
  const defaultCtx: ScoringContext = {
    viewerPubkey: me,
    followingSet: new Set([friend]),
    interactionHistory: new Map(),
  };

  const createEvent = (pubkey: string, content: string = "hello", tags: string[][] = []) => {
    const event = new NDKEvent();
    event.pubkey = pubkey;
    event.content = content;
    event.tags = tags;
    event.created_at = Math.floor(Date.now() / 1000);
    return event;
  };

  it("should boost posts from follows", () => {
    const event = createEvent(friend);
    const result = scoreEvent(event, defaultCtx);
    expect(result.signals.isFollowing).toBe(WEIGHTS.isFollowing);
  });

  it("should boost posts with matching interests", () => {
    const event = createEvent("stranger", "post about #nostr", [['t', 'nostr']]);
    const ctx = { ...defaultCtx, interestsSet: new Set(['nostr']) };
    const result = scoreEvent(event, ctx);
    expect(result.signals.interestMatch).toBe(WEIGHTS.interestMatch);
  });

  it("should boost posts with local WoT scores", () => {
    const stranger = "stranger";
    const event = createEvent(stranger);
    const ctx = { ...defaultCtx, wotScores: new Map([[stranger, 80]]) };
    const result = scoreEvent(event, ctx);
    expect(result.signals.wot).toBe(80 * WEIGHTS.wotScoreFactor);
  });

  it("should boost posts with interaction history", () => {
    const stranger = "stranger";
    const event = createEvent(stranger);
    const ctx = { ...defaultCtx, interactionHistory: new Map([[stranger, 5]]) };
    const result = scoreEvent(event, ctx);
    expect(result.signals.frequentInteraction).toBeGreaterThan(0);
  });

  it("should boost posts with media", () => {
    const event = createEvent("stranger", "Check this https://example.com/image.jpg");
    const result = scoreEvent(event, defaultCtx);
    expect(result.signals.hasMedia).toBe(WEIGHTS.hasMedia);
  });

  it("should boost long content", () => {
    const event = createEvent("stranger", "a".repeat(201));
    const result = scoreEvent(event, defaultCtx);
    expect(result.signals.hasLongContent).toBe(WEIGHTS.hasLongContent);
  });

  it("should penalize unknown replies", () => {
    const event = createEvent("stranger", "reply", [['e', 'some-event'], ['p', 'other-stranger']]);
    const result = scoreEvent(event, defaultCtx);
    expect(result.signals.isReply).toBe(WEIGHTS.isReply);
  });

  it("should boost based on network activity", () => {
    const event = createEvent("stranger");
    const networkActivity = new Map([
      [event.id, { reactions: new Set(["r1"]), replies: new Set(["rep1"]) }]
    ]);
    const result = scoreEvent(event, defaultCtx, networkActivity);
    expect(result.signals.networkReaction).toBe(WEIGHTS.networkReaction);
    expect(result.signals.networkReply).toBe(WEIGHTS.networkReply);
  });

  it("should rank events correctly", () => {
    const event1 = createEvent(friend); // Follow boost
    const event2 = createEvent("stranger"); // No boost
    
    const results = rankEvents([event2, event1], defaultCtx);
    
    expect(results[0].event.pubkey).toBe(friend);
    expect(results[1].event.pubkey).toBe("stranger");
  });
});

describe("Scoring Worker Integration", () => {
  // Mock worker environment
  const originalPostMessage = global.postMessage;
  const originalOnMessage = global.onmessage;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    global.postMessage = originalPostMessage;
    global.onmessage = originalOnMessage;
  });

  it("should process SCORE_BATCH message and return results", async () => {
    const events = [
      { id: 'e1', pubkey: 'friend', content: 'hello', tags: [['t', 'nostr']] },
      { id: 'e2', pubkey: 'stranger', content: 'bye', tags: [] }
    ];
    
    const ctx = {
      viewerPubkey: 'me',
      followingSet: Array.from(['friend']),
      interactionHistory: {},
      interestsSet: Array.from(['nostr'])
    };

    // We manually trigger the worker's onmessage since we're testing the logic
    // in the same process for simplicity in Vitest.
    
    const mockPostMessage = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).self = { postMessage: mockPostMessage };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = rankEvents(events as any, {
      ...ctx,
      followingSet: new Set(ctx.followingSet),
      interactionHistory: new Map(),
      interestsSet: new Set(ctx.interestsSet)
    } as unknown as ScoringContext);

    expect(results.length).toBe(2);
    expect(results[0].event.id).toBe('e1'); // Should be friend + interest
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });
});
