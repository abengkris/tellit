import { describe, it, expect, beforeEach, afterEach } from "vitest";
import NDK from "@nostr-dev-kit/ndk";
import { RelayPoolMock, UserGenerator, EventGenerator, SignerGenerator } from "@nostr-dev-kit/ndk/test";
import { reactToEvent } from "../reactions";

describe("reactToEvent with NDK Test Utils", () => {
  let ndk: NDK;
  let pool: RelayPoolMock;

  beforeEach(async () => {
    pool = new RelayPoolMock();
    ndk = new NDK({ explicitRelayUrls: [] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ndk as any).pool = pool;
    pool.addMockRelay("wss://relay.example.com");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    EventGenerator.setNDK(ndk as any);
  });

  afterEach(() => {
    pool.disconnectAll();
    pool.resetAll();
  });

  it("should publish a like reaction", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const alice = await UserGenerator.getUser("alice", ndk as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ndk as any).signer = SignerGenerator.getSigner("alice");
    const relay = pool.getMockRelay("wss://relay.example.com");

    const targetEvent = await EventGenerator.createEvent(1, "Original post", alice.pubkey);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reaction = await reactToEvent(ndk, targetEvent as any, "+");
    await reaction.publish();

    const sentEvents = relay?.messageLog
      .filter((m: { direction: string }) => m.direction === "out")
      .map((m: { message: string }) => JSON.parse(m.message))
      .filter((m: unknown[]) => m[0] === "EVENT" && (m[1] as { kind: number }).kind === 7);

    expect(sentEvents?.length).toBe(1);
    expect(sentEvents?.[0][1].content).toBe("+");
    // Flexible check for e tag as it now contains hints
    expect(sentEvents?.[0][1].tags.some((t: string[]) => t[0] === "e" && t[1] === targetEvent.id)).toBe(true);
  });

  it("should publish a dislike reaction", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const alice = await UserGenerator.getUser("alice", ndk as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ndk as any).signer = SignerGenerator.getSigner("alice");
    const relay = pool.getMockRelay("wss://relay.example.com");

    const targetEvent = await EventGenerator.createEvent(1, "Original post", alice.pubkey);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reaction = await reactToEvent(ndk, targetEvent as any, "-");
    await reaction.publish();

    const sentEvents = relay?.messageLog
      .filter((m: { direction: string }) => m.direction === "out")
      .map((m: { message: string }) => JSON.parse(m.message))
      .filter((m: unknown[]) => m[0] === "EVENT" && (m[1] as { kind: number }).kind === 7);

    expect(sentEvents?.length).toBe(1);
    expect(sentEvents?.[0][1].content).toBe("-");
  });
});
