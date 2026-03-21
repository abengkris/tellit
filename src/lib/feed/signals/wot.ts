import { db } from "@/lib/db";

/**
 * Fetches Web of Trust scores for a list of pubkeys from the local Dexie database.
 * @param pubkeys Array of pubkeys to fetch scores for.
 * @returns A Map of pubkey to trust score (0-100).
 */
export async function fetchWoTSignals(pubkeys: string[]): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  
  if (pubkeys.length === 0) return scores;

  try {
    const records = await db.table("wotScores")
      .where("pubkey")
      .anyOf(pubkeys)
      .toArray();

    records.forEach(record => {
      scores.set(record.pubkey, record.score);
    });
  } catch (error) {
    console.error("Failed to fetch WoT signals:", error);
  }

  return scores;
}
