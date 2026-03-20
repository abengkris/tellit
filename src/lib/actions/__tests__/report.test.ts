import { describe, it, expect, beforeEach, afterEach } from "vitest";
import NDK from "@nostr-dev-kit/ndk";
import { RelayPoolMock, EventGenerator, SignerGenerator } from "@nostr-dev-kit/ndk/test";
import { reportContent } from "../report";

describe("reportContent (NIP-56)", () => {
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
     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ndk.signer = SignerGenerator.getSigner("alice") as any;
  });

  afterEach(() => {
    pool.disconnectAll();
    pool.resetAll();
  });

  it("should publish a kind 1984 report with correct tags", async () => {
    const targetPubkey = "target-pubkey";
    const targetEventId = "target-event-id";
    const reason = "Spamming content";
    const relay = pool.getMockRelay("wss://relay.example.com");
    
    const success = await reportContent(ndk, "spam", targetPubkey, targetEventId, reason);
    expect(success).toBe(true);
    
    const sentEvents = relay?.messageLog
      .filter((m: { direction: string }) => m.direction === "out")
      .map((m: { message: string }) => JSON.parse(m.message))
      .filter((m: unknown[]) => m[0] === "EVENT" && (m[1] as { kind: number }).kind === 1984);

    expect(sentEvents?.length).toBe(1);
    const event = sentEvents?.[0][1];
    
    expect(event.content).toBe(reason);
    expect(event.tags).toContainEqual(["p", targetPubkey, "spam"]);
    expect(event.tags).toContainEqual(["e", targetEventId, "spam"]);
  });

  it("should support blob reporting with 'x' tag", async () => {
    const targetPubkey = "target-pubkey";
    const blobHash = "blob-sha256-hash";
    const serverUrl = "https://media.example.com";
    const relay = pool.getMockRelay("wss://relay.example.com");
    
    const success = await reportContent(ndk, "malware", targetPubkey, undefined, "Dangerous file", blobHash, serverUrl);
    expect(success).toBe(true);
    
    const sentEvents = relay?.messageLog
      .filter((m: { direction: string }) => m.direction === "out")
      .map((m: { message: string }) => JSON.parse(m.message))
      .filter((m: unknown[]) => m[0] === "EVENT" && (m[1] as { kind: number }).kind === 1984);

    expect(sentEvents?.length).toBe(1);
    const event = sentEvents?.[0][1];
    expect(event.tags).toContainEqual(["x", blobHash, "malware"]);
    expect(event.tags).toContainEqual(["server", serverUrl]);
  });
});
