import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import NDK from "@nostr-dev-kit/ndk";
import { RelayPoolMock, EventGenerator, SignerGenerator } from "@nostr-dev-kit/ndk/test";
import { WoTCrawler } from "../crawler";

// Mock Kysely
vi.mock("../../nostrify-sql-store", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const store: Record<string, any> = {};
  const mockKysely = {
    insertInto: vi.fn(() => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      values: vi.fn((data: any) => ({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onConflict: vi.fn((callback: any) => {
          // Simulate the onConflict callback
          const oc = {
            column: vi.fn(() => oc),
            doUpdateSet: vi.fn(() => ({
              execute: vi.fn(async () => {
                store[data.pubkey] = data;
              })
            }))
          };
          callback(oc);
          return oc.doUpdateSet();
        })
      }))
    })),
    selectFrom: vi.fn(() => ({
      selectAll: vi.fn(() => ({
        where: vi.fn((_col: string, _op: string, val: string) => ({
          executeTakeFirst: vi.fn(async () => store[val])
        }))
      }))
    }))
  };
  return {
    getKysely: vi.fn().mockResolvedValue(mockKysely),
    __mockStore: store
  };
});

describe("WoTCrawler", () => {
  let ndk: NDK;
  let pool: RelayPoolMock;
  let crawler: WoTCrawler;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockStore: any;

  const charliePubkey = "0000000000000000000000000000000000000000000000000000000000000003";

  beforeEach(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import("../../nostrify-sql-store") as any;
    mockStore = mod.__mockStore;
    for (const key in mockStore) delete mockStore[key];

    pool = new RelayPoolMock();
    ndk = new NDK({ explicitRelayUrls: [] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ndk as any).pool = pool;
    pool.addMockRelay("wss://relay.example.com");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    EventGenerator.setNDK(ndk as any);
    
    crawler = new WoTCrawler(ndk);
  });

  afterEach(() => {
    pool.disconnectAll();
    pool.resetAll();
  });

  it("should crawl and store follows in SQL", async () => {
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

    const record = mockStore[alicePubkey];
    expect(record).toBeDefined();
    expect(JSON.parse(record.follows)).toContain(charliePubkey);
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

    const aliceRecord = mockStore[alice.pubkey];
    const bobRecord = mockStore[bob.pubkey];
    
    expect(aliceRecord).toBeDefined();
    expect(JSON.parse(aliceRecord.follows)).toContain(bob.pubkey);
    expect(bobRecord).toBeDefined();
    expect(JSON.parse(bobRecord.follows)).toContain(charliePubkey);
  });
});
