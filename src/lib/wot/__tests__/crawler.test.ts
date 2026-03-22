import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import NDK from "@nostr-dev-kit/ndk";
import { RelayPoolMock, EventGenerator, SignerGenerator } from "@nostr-dev-kit/ndk/test";
import { WoTCrawler } from "../crawler";
import { db } from "../../db";

// Mock Dexie
vi.mock("../../db", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const store: Record<string, any> = {};
  return {
    db: {
       
      table: vi.fn((_name: string) => ({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        put: vi.fn(async (data: any) => {
          store[data.pubkey] = data;
        }),
        get: vi.fn(async (pubkey: string) => {
          return store[pubkey];
        }),
        clear: vi.fn(async () => {
          for (const key in store) delete store[key];
        }),
      })),
    },
  };
});

describe("WoTCrawler", () => {
  let ndk: NDK;
  let pool: RelayPoolMock;
  let crawler: WoTCrawler;

  const charliePubkey = "0000000000000000000000000000000000000000000000000000000000000003";

  beforeEach(async () => {
    pool = new RelayPoolMock();
    ndk = new NDK({ explicitRelayUrls: [] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ndk as any).pool = pool;
    pool.addMockRelay("wss://relay.example.com");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    EventGenerator.setNDK(ndk as any);
    
    crawler = new WoTCrawler(ndk);
    
    // Clear the database before each test
    await db.table("follows").clear();
  });

  afterEach(() => {
    pool.disconnectAll();
    pool.resetAll();
  });

  it("should crawl and store follows in Dexie", async () => {
    const relay = pool.getMockRelay("wss://relay.example.com");
    
    const signer = SignerGenerator.getSigner("alice");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ndk as any).signer = signer;
    const user = await signer.user();
    const alicePubkey = user.pubkey;

    const event = await EventGenerator.createEvent(3, "", alicePubkey);
    event.tags = [["p", charliePubkey]];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await event.sign(ndk.signer as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    relay?.on("subscription", async ({ id, filters }: { id: string; filters: any[] }) => {
      if (filters[0].authors?.includes(alicePubkey)) {
        await relay.simulateEvent(event, id);
        relay.simulateEOSE(id);
      } else {
        relay.simulateEOSE(id);
      }
    });

    await crawler.crawl(alicePubkey, 0);

    const follows = await db.table("follows").get(alicePubkey);
    expect(follows).toBeDefined();
    expect(follows.follows).toContain(charliePubkey);
  });

  it("should crawl multiple levels of follows", async () => {
    const relay = pool.getMockRelay("wss://relay.example.com");
    
    const aliceSigner = SignerGenerator.getSigner("alice");
    const bobSigner = SignerGenerator.getSigner("bob");
    
    const alice = await aliceSigner.user();
    const bob = await bobSigner.user();

    // Alice follows Bob
    const aliceFollows = await EventGenerator.createEvent(3, "", alice.pubkey);
    aliceFollows.tags = [["p", bob.pubkey]];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await aliceFollows.sign(aliceSigner as any);

    // Bob follows Charlie
    const bobFollows = await EventGenerator.createEvent(3, "", bob.pubkey);
    bobFollows.tags = [["p", charliePubkey]];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await bobFollows.sign(bobSigner as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    relay?.on("subscription", async ({ id, filters }: { id: string; filters: any[] }) => {
      if (filters[0].authors?.includes(alice.pubkey)) {
        await relay.simulateEvent(aliceFollows, id);
        relay.simulateEOSE(id);
      } else if (filters[0].authors?.includes(bob.pubkey)) {
        await relay.simulateEvent(bobFollows, id);
        relay.simulateEOSE(id);
      } else {
        relay.simulateEOSE(id);
      }
    });

    await crawler.crawl(alice.pubkey, 1);

    const aliceRecord = await db.table("follows").get(alice.pubkey);
    const bobRecord = await db.table("follows").get(bob.pubkey);
    
    expect(aliceRecord).toBeDefined();
    expect(aliceRecord.follows).toContain(bob.pubkey);
    expect(bobRecord).toBeDefined();
    expect(bobRecord.follows).toContain(charliePubkey);
  });
});
