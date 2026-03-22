import NDK from "@nostr-dev-kit/ndk";
import { WoTCrawler } from "../lib/wot/crawler";
import { WoTScorer } from "../lib/wot/scoring";

export class WoTServiceLocal {
  private ndk: NDK;
  private crawler: WoTCrawler;
  private scorer: WoTScorer;

  constructor(ndk: NDK) {
    this.ndk = ndk;
    this.crawler = new WoTCrawler(ndk);
    this.scorer = new WoTScorer();
  }

  /**
   * Performs a background sync of the WoT.
   * Fetches new follows and recalculates scores.
   */
  public async sync(rootPubkey: string): Promise<void> {
    const lastSyncKey = `wot_last_sync_${rootPubkey}`;
    const lastSync = localStorage.getItem(lastSyncKey);
    const now = Date.now();

    // Sync only once every 24 hours to save bandwidth/CPU
    if (lastSync && now - parseInt(lastSync) < 24 * 60 * 60 * 1000) {
      console.log("[WoTServiceLocal] Skipping sync, last sync was less than 24h ago.");
      return;
    }

    console.log("[WoTServiceLocal] Starting background WoT sync...");
    
    try {
      // 1. Crawl the graph (Depth 2)
      await this.crawler.crawl(rootPubkey, 2);
      
      // 2. Recalculate scores (via worker if possible)
      await this.scorer.run(rootPubkey, 2);
      
      localStorage.setItem(lastSyncKey, now.toString());
      console.log("[WoTServiceLocal] WoT sync complete.");
    } catch (error) {
      console.error("[WoTServiceLocal] WoT sync failed:", error);
    }
  }

  /**
   * Initial sync for new sessions or stale data.
   */
  public async startSync(rootPubkey: string) {
    // We run this in the background
    this.sync(rootPubkey).catch(console.error);
  }
}
