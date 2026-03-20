import NDK, { NDKEvent, NDKFilter } from "@nostr-dev-kit/ndk";
import redis from "@/lib/redis";
import { getNDK } from "@/lib/ndk";

const TTL_7_DAYS = 604800;
const MAX_CHUNK_SIZE = 150;
const DELAY_BETWEEN_CHUNKS = 1500;
const NDK_TIMEOUT = 8000;

/**
 * Utility to delay execution
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Utility for NDK fetch with timeout
 */
const fetchWithTimeout = async (
  ndk: NDK,
  filter: NDKFilter,
  timeoutMs: number = NDK_TIMEOUT
): Promise<Set<NDKEvent>> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      resolve(new Set());
    }, timeoutMs);

    ndk.fetchEvents(filter)
      .then((events) => {
        clearTimeout(timeout);
        resolve(events);
      })
      .catch((err) => {
        clearTimeout(timeout);
        reject(err);
      });
  });
};

export class WoTService {
  /**
   * Initialize D1 (Degree 1) and trigger D2 fetch in background
   */
  static async initializeWoT(pubkey: string): Promise<{ d1: string[]; cached: boolean; backgroundPromise?: Promise<void> }> {
    const d1Key = `wot:${pubkey}:d1`;
    
    // 1. Check Cache
    const cachedD1 = await redis.smembers(d1Key);
    if (cachedD1 && cachedD1.length > 0) {
      // Trigger D2 refresh anyway if needed, or just return
      // For this spec, we return immediately if cached
      return { d1: cachedD1, cached: true };
    }

    // 2. Synchronous D1 Fetch
    const ndk = getNDK();
    await ndk.connect();

    // Use fetchWithTimeout for D1 as well
    const events = await fetchWithTimeout(ndk, {
      kinds: [3],
      authors: [pubkey],
    });
    
    const contactList = Array.from(events)[0];

    const d1: string[] = [];
    if (contactList) {
      contactList.tags.forEach((tag) => {
        if (tag[0] === "p" && tag[1]) {
          d1.push(tag[1]);
        }
      });
    }

    // 3. Cache D1
    if (d1.length > 0) {
      const pipeline = redis.pipeline();
      pipeline.sadd(d1Key, ...d1);
      pipeline.expire(d1Key, TTL_7_DAYS);
      await pipeline.exec();
    }

    // 4. Return the background promise for D2 fetch
    const backgroundPromise = this.processD2InBackground(pubkey, d1).catch((err) => {
      console.error(`[WoTService] Error in background D2 process for ${pubkey}:`, err);
    });

    return { d1, cached: false, backgroundPromise };
  }

  /**
   * Fetch Degree 2 network in background
   */
  private static async processD2InBackground(userPubkey: string, d1: string[]) {
    if (d1.length === 0) return;

    const d2Key = `wot:${userPubkey}:d2`;
    const ndk = getNDK();
    await ndk.connect();

    const d1Set = new Set(d1);
    const d2Set = new Set<string>();

    // Chunk d1 to avoid large filters
    for (let i = 0; i < d1.length; i += MAX_CHUNK_SIZE) {
      const chunk = d1.slice(i, i + MAX_CHUNK_SIZE);
      
      try {
        const events = await fetchWithTimeout(ndk, {
          kinds: [3],
          authors: chunk,
        });

        events.forEach((event) => {
          event.tags.forEach((tag) => {
            if (tag[0] === "p" && tag[1]) {
              const p = tag[1];
              // Filter out self and D1
              if (p !== userPubkey && !d1Set.has(p)) {
                d2Set.add(p);
              }
            }
          });
        });

        // Throttling between chunks
        if (i + MAX_CHUNK_SIZE < d1.length) {
          await delay(DELAY_BETWEEN_CHUNKS);
        }
      } catch (err) {
        console.warn(`[WoTService] Chunk fetch failed for ${userPubkey}:`, err);
      }
    }

    // Cache D2
    if (d2Set.size > 0) {
      const d2Array = Array.from(d2Set);
      const pipeline = redis.pipeline();
      // Redis SADD can handle large arrays, but we might want to chunk it if it's massive
      // For WoT D2, it can easily be 10k+ pubkeys
      const REDIS_SADD_CHUNK_SIZE = 1000;
      for (let i = 0; i < d2Array.length; i += REDIS_SADD_CHUNK_SIZE) {
        pipeline.sadd(d2Key, ...d2Array.slice(i, i + REDIS_SADD_CHUNK_SIZE));
      }
      pipeline.expire(d2Key, TTL_7_DAYS);
      await pipeline.exec();
    }
    
    console.log(`[WoTService] Completed D2 fetch for ${userPubkey}. Found ${d2Set.size} unique pubkeys.`);
  }

  /**
   * Batch check trust levels for a list of pubkeys relative to a viewer
   * Returns a map of pubkey -> degree (0, 1, or 2)
   */
  static async checkTrust(viewerPubkey: string, pubkeys: string[]): Promise<Record<string, number>> {
    const d1Key = `wot:${viewerPubkey}:d1`;
    const d2Key = `wot:${viewerPubkey}:d2`;

    const results: Record<string, number> = {};
    
    // Check D1
    const d1Pipeline = redis.pipeline();
    pubkeys.forEach(pk => d1Pipeline.sismember(d1Key, pk));
    const d1Results = await d1Pipeline.exec();

    const checkD2: string[] = [];
    
    d1Results?.forEach((res, index) => {
      const isD1 = res[1] === 1;
      const pk = pubkeys[index];
      if (isD1) {
        results[pk] = 1;
      } else {
        checkD2.push(pk);
      }
    });

    if (checkD2.length > 0) {
      // Check D2 for remaining
      const d2Pipeline = redis.pipeline();
      checkD2.forEach(pk => d2Pipeline.sismember(d2Key, pk));
      const d2Results = await d2Pipeline.exec();

      d2Results?.forEach((res, index) => {
        const isD2 = res[1] === 1;
        const pk = checkD2[index];
        results[pk] = isD2 ? 2 : 0;
      });
    }

    return results;
  }

  /**
   * Get follow suggestions based on D2 network
   */
  static async getSuggestions(viewerPubkey: string, limit: number = 10): Promise<{ pubkey: string; followedByCount: number }[]> {
    const d2Key = `wot:${viewerPubkey}:d2`;
    
    // In Redis, we only store the set of D2 pubkeys.
    // To get "followedByCount", we would need to store the graph or 
    // perform multiple SINTER/SCARD operations.
    // For now, let's just return a random sample of D2 to keep it fast,
    // or we can stick to the current client-side logic if we want "mutuals" count.
    
    // Better: Return members of D2. Since it's a Set, SRANDMEMBER is perfect for variety.
    const suggestions = await redis.srandmember(d2Key, limit);
    
    if (!suggestions || suggestions.length === 0) return [];

    return suggestions.map(pk => ({
      pubkey: pk,
      followedByCount: 2 // Placeholder for degree 2
    }));
  }
}
