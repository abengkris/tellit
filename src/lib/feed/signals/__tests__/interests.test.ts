import { describe, it, expect } from "vitest";
import { calculateInterestSignal } from "../interests";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { RANKING_WEIGHTS as WEIGHTS } from "../../types";

describe("Interest Signal Extractor", () => {
  const createMockEvent = (hashtags: string[]) => {
    const event = new NDKEvent();
    event.tags = hashtags.map(h => ['t', h]);
    return event;
  };

  it("should return base boost for a single match", () => {
    const event = createMockEvent(["nostr", "bitcoin"]);
    const interests = new Set(["nostr"]);
    const score = calculateInterestSignal(event, interests);
    expect(score).toBe(WEIGHTS.interestMatch);
  });

  it("should return double boost for multiple matches", () => {
    const event = createMockEvent(["nostr", "bitcoin", "tech"]);
    const interests = new Set(["nostr", "bitcoin"]);
    const score = calculateInterestSignal(event, interests);
    expect(score).toBe(WEIGHTS.interestMatch * 2);
  });

  it("should cap at double boost for 3+ matches", () => {
    const event = createMockEvent(["nostr", "bitcoin", "tech", "web3"]);
    const interests = new Set(["nostr", "bitcoin", "tech", "web3"]);
    const score = calculateInterestSignal(event, interests);
    expect(score).toBe(WEIGHTS.interestMatch * 2);
  });

  it("should return 0 for no matches", () => {
    const event = createMockEvent(["other"]);
    const interests = new Set(["nostr"]);
    const score = calculateInterestSignal(event, interests);
    expect(score).toBe(0);
  });

  it("should be case-insensitive", () => {
    const event = createMockEvent(["Nostr"]);
    const interests = new Set(["nostr"]);
    const score = calculateInterestSignal(event, interests);
    expect(score).toBe(WEIGHTS.interestMatch);
  });

  it("should return 0 if interests set is empty", () => {
    const event = createMockEvent(["nostr"]);
    const score = calculateInterestSignal(event, new Set());
    expect(score).toBe(0);
  });
});
