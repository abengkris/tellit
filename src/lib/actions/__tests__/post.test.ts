import { describe, it, expect, beforeEach, afterEach } from "vitest";
import NDK from "@nostr-dev-kit/ndk";
import { RelayPoolMock, UserGenerator, EventGenerator, SignerGenerator } from "@nostr-dev-kit/ndk/test";
import { publishPost } from "../post";

describe("publishPost with NDK Test Utils", () => {
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

  it("should publish a basic note", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ndk as any).signer = SignerGenerator.getSigner("alice");
    const relay = pool.getMockRelay("wss://relay.example.com");

    const content = "Hello Nostr!";
    const event = await publishPost(ndk, content);
    await event.publish();

    const sentEvents = relay?.messageLog
      .filter((m: { direction: string }) => m.direction === "out")
      .map((m: { message: string }) => JSON.parse(m.message))
      .filter((m: unknown[]) => m[0] === "EVENT" && (m[1] as { kind: number }).kind === 1);

    expect(sentEvents?.length).toBe(1);
    expect(sentEvents?.[0][1].content).toBe(content);
  });

  it("should publish a reply note with proper tags", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const alice = await UserGenerator.getUser("alice", ndk as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ndk as any).signer = SignerGenerator.getSigner("alice");

    const rootEvent = await EventGenerator.createEvent(1, "Root post", alice.pubkey);
    const content = "This is a reply";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const event = await publishPost(ndk, content, { replyTo: rootEvent as any });

    expect(event?.tags).toContainEqual(["e", rootEvent.id, "", "root"]);
    expect(event?.tags).toContainEqual(["p", alice.pubkey]);
  });
});
