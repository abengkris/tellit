import { db } from "../db";

export interface WoTScore {
  pubkey: string;
  score: number;
  lastUpdated: number;
}

export class WoTScorer {
  /**
   * Calculates and stores trust scores based on follow distance.
   * @param rootPubkey The pubkey to start the calculation from.
   * @param maxDepth The maximum depth to consider (default 2).
   */
  public async calculateScores(rootPubkey: string, maxDepth: number = 2): Promise<void> {
    const scores = new Map<string, number>();
    
    // Base score for the root user
    scores.set(rootPubkey, 100);

    let currentLayer = [rootPubkey];
    const layerDecay = [1, 0.5, 0.2, 0.1]; // Decay factors for each depth layer

    for (let depth = 0; depth <= maxDepth; depth++) {
      const nextLayer = new Set<string>();
      const decay = layerDecay[depth] || 0.05;

      for (const pubkey of currentLayer) {
        const parentScore = scores.get(pubkey) || 0;
        const followRecord = await db.table("follows").get(pubkey);

        if (followRecord && followRecord.follows) {
          for (const followedPubkey of followRecord.follows) {
            const addedScore = parentScore * decay * 0.5; // Simple additive score
            const currentScore = scores.get(followedPubkey) || 0;
            
            // Limit score to 100
            scores.set(followedPubkey, Math.min(100, currentScore + addedScore));
            
            if (depth < maxDepth) {
              nextLayer.add(followedPubkey);
            }
          }
        }
      }

      currentLayer = Array.from(nextLayer);
      if (currentLayer.length === 0) break;
    }

    // Store scores in Dexie
    const now = Date.now();
    const records: WoTScore[] = Array.from(scores.entries()).map(([pubkey, score]) => ({
      pubkey,
      score: Math.round(score),
      lastUpdated: now
    }));

    await db.table("wotScores").bulkPut(records);
  }

  /**
   * Retrieves a trust score for a pubkey.
   * @param pubkey The pubkey to check.
   */
  public async getScore(pubkey: string): Promise<number> {
    const record = await db.table("wotScores").get(pubkey);
    return record ? record.score : 0;
  }
}
