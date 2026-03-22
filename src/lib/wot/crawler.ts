import NDK, { NDKFilter } from "@nostr-dev-kit/ndk";
import { db } from "../db";

export class WoTCrawler {
  private ndk: NDK;
  private isCrawling: boolean = false;

  constructor(ndk: NDK) {
    this.ndk = ndk;
  }

  /**
   * Crawls the follow graph for a given user up to a certain depth.
   * @param rootPubkey The pubkey to start the crawl from.
   * @param depth The maximum depth of the crawl (default 2).
   */
  public async crawl(rootPubkey: string, depth: number = 2): Promise<void> {
    if (this.isCrawling) return;
    this.isCrawling = true;

    try {
      let currentQueue = [rootPubkey];
      const visited = new Set<string>();

      for (let i = 0; i <= depth; i++) {
        const nextQueue: string[] = [];
        
        // Process current layer in batches
        const BATCH_SIZE = 50;
        for (let j = 0; j < currentQueue.length; j += BATCH_SIZE) {
          const batch = currentQueue.slice(j, j + BATCH_SIZE).filter(pk => !visited.has(pk));
          if (batch.length === 0) continue;

          // Mark batch as visited
          batch.forEach(pk => visited.add(pk));

          // Fetch Kind 3 events for the batch
          const filter: NDKFilter = { kinds: [3], authors: batch };
          const events = await this.ndk.fetchEvents(filter, { relayGoalPerAuthor: 1 });

          for (const event of events) {
            const follows = event.tags
              .filter(t => t[0] === "p")
              .map(t => t[1]);

            if (follows.length > 0) {
              // Store in Dexie
              await db.table("follows").put({
                pubkey: event.pubkey,
                follows: follows,
                timestamp: event.created_at
              });

              // Add to next queue if not at max depth
              if (i < depth) {
                nextQueue.push(...follows);
              }
            }
          }
        }

        currentQueue = nextQueue;
        if (currentQueue.length === 0) break;
      }
    } catch (error) {
      console.error("WoT Crawl failed:", error);
    } finally {
      this.isCrawling = false;
    }
  }
}
