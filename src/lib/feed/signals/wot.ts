import { getKysely } from "@/lib/nostrify-sql-store";

/**
 * Fetches Web of Trust scores for a list of pubkeys from the local SQL store.
 * @param pubkeys Array of pubkeys to fetch scores for.
 * @returns A Map of pubkey to trust score (0-100).
 */
export async function fetchWoTSignals(pubkeys: string[]): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  
  if (pubkeys.length === 0) return scores;

  try {
    const sqlDb = await getKysely();
    const records = await sqlDb
      .selectFrom('wot_scores')
      .selectAll()
      .where('pubkey', 'in', pubkeys)
      .execute();

    records.forEach(record => {
      scores.set(record.pubkey, record.score);
    });
  } catch (error) {
    console.error("Failed to fetch WoT signals:", error);
  }

  return scores;
}
