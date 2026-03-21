import { describe, it, expect, beforeEach, afterEach } from "vitest";
import NDK, { NDKFilter } from "@nostr-dev-kit/ndk";
import { RelayPoolMock, UserGenerator, EventGenerator, SignerGenerator } from "@nostr-dev-kit/ndk/test";
import { followUser, unfollowUser } from "../follow";

describe("follow/unfollow with NDK Test Utils", () => {
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

  it("should follow a new user and publish a kind:3 event", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ndk as any).signer = SignerGenerator.getSigner("alice");
    const relay = pool.getMockRelay("wss://relay.example.com");

    relay?.on("subscription", async ({ id, filters }: { id: string; filters: NDKFilter[] }) => {
      if (filters[0].kinds?.includes(3)) {
        relay.simulateEOSE(id);
      }
    });

    await followUser(ndk, "target-pubkey");

    // Wait for event to appear in relay log since publishing is now optimistic/async
    await new Promise((resolve) => setTimeout(resolve, 100));

    const sentEvents = relay?.messageLog
      .filter((m: { direction: string }) => m.direction === "out")
      .map((m: { message: string }) => JSON.parse(m.message))
      .filter((m: unknown[]) => m[0] === "EVENT" && (m[1] as { kind: number }).kind === 3);

    expect(sentEvents?.length).toBeGreaterThan(0);
    expect(sentEvents?.[0][1].tags).toContainEqual(["p", "target-pubkey"]);
  });

  it("should unfollow an existing user", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const alice = await UserGenerator.getUser("alice", ndk as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ndk as any).signer = SignerGenerator.getSigner("alice");
    const relay = pool.getMockRelay("wss://relay.example.com");

    const initialContactList = await EventGenerator.createEvent(3, "", alice.pubkey);
    initialContactList.tags = [["p", "target-pubkey"]];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await initialContactList.sign(ndk.signer as any);

    relay?.on("subscription", async ({ id, filters }: { id: string; filters: NDKFilter[] }) => {
      if (filters[0].kinds?.includes(3)) {
        await relay.simulateEvent(initialContactList, id);
        relay.simulateEOSE(id);
      }
    });

    await unfollowUser(ndk, "target-pubkey");

    // Wait for event to appear in relay log since publishing is now optimistic/async
    await new Promise((resolve) => setTimeout(resolve, 100));

    const sentEvents = relay?.messageLog
      .filter((m: { direction: string }) => m.direction === "out")
      .map((m: { message: string }) => JSON.parse(m.message))
      .filter((m: unknown[]) => m[0] === "EVENT" && (m[1] as { kind: number }).kind === 3);

    expect(sentEvents?.length).toBeGreaterThan(0);
    expect(sentEvents?.[0][1].tags).not.toContainEqual(["p", "target-pubkey"]);
  });
});
