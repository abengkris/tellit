import { getKysely } from "@/lib/nostrify-sql-store";

export interface SocialSignals {
  networkDegreeMap: Map<string, number>;
  mutualsMap: Map<string, number>;
}

/**
 * Fetches social graph signals (degree and mutual follows) for a list of pubkeys.
 * @param viewerPubkey The pubkey of the user viewing the feed.
 * @param targetPubkeys Array of pubkeys to fetch signals for.
 * @returns An object containing maps for network degree and mutual follow counts.
 */
export async function fetchSocialSignals(viewerPubkey: string, targetPubkeys: string[]): Promise<SocialSignals> {
  const networkDegreeMap = new Map<string, number>();
  const mutualsMap = new Map<string, number>();

  if (targetPubkeys.length === 0) return { networkDegreeMap, mutualsMap };

  try {
    const sqlDb = await getKysely();

    // 1. Fetch viewer's follows
    const viewerFollowsRecord = await sqlDb
      .selectFrom('follows')
      .selectAll()
      .where('pubkey', '=', viewerPubkey)
      .executeTakeFirst();
    
    let viewerFollows = new Set<string>();
    if (viewerFollowsRecord && viewerFollowsRecord.follows) {
      try {
        viewerFollows = new Set<string>(JSON.parse(viewerFollowsRecord.follows));
      } catch (e) {
        console.error("Failed to parse viewer follows JSON:", e);
      }
    }

    // 2. Identify Degree 1 (Direct Follows)
    targetPubkeys.forEach(pk => {
      if (viewerFollows.has(pk)) {
        networkDegreeMap.set(pk, 1);
      }
    });

    // 3. Batch fetch followers of targets to find mutuals and Degree 2
    // For each target pubkey, we want to know if anyone the viewer follows also follows them.
    for (const targetPk of targetPubkeys) {
      if (networkDegreeMap.get(targetPk) === 1) {
        // Already known as D1
        continue;
      }

      // Find all people who follow this target
      const followersOfTarget = await sqlDb
        .selectFrom('follows')
        .selectAll()
        .where('follows', 'like', `%${targetPk}%`)
        .execute();

      const mutuals = followersOfTarget.filter(f => viewerFollows.has(f.pubkey));
      
      if (mutuals.length > 0) {
        mutualsMap.set(targetPk, mutuals.length);
        networkDegreeMap.set(targetPk, 2);
      }
    }
  } catch (error) {
    console.error("Failed to fetch social signals:", error);
  }

  return { networkDegreeMap, mutualsMap };
}
