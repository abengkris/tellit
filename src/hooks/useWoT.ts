import { useState, useEffect, useMemo } from "react";
import { getKysely } from "@/lib/nostrify-sql-store";
import { useAuthStore } from "@/store/auth";

export function useWoT(pubkey?: string) {
  const [score, setScore] = useState<number>(0);
  const [mutualCount, setMutualCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const { user: currentUser, publicKey } = useAuthStore();

  useEffect(() => {
    if (!pubkey) {
      setScore(0);
      setMutualCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchData = async () => {
      try {
        const sqlDb = await getKysely();

        // 1. Fetch Score
        const scoreRecord = await sqlDb
          .selectFrom('wot_scores')
          .selectAll()
          .where('pubkey', '=', pubkey)
          .executeTakeFirst();
        setScore(scoreRecord ? scoreRecord.score : 0);

        // 2. Fetch Mutuals (people the current user follows who also follow this pubkey)
        const myPubkey = currentUser?.pubkey || publicKey;
        if (myPubkey) {
          const myFollowsRecord = await sqlDb
            .selectFrom('follows')
            .selectAll()
            .where('pubkey', '=', myPubkey)
            .executeTakeFirst();

          if (myFollowsRecord && myFollowsRecord.follows) {
            try {
              const myFollows: string[] = JSON.parse(myFollowsRecord.follows);
              const myFollowsSet = new Set(myFollows);
              
              // Find all people who follow this 'pubkey'
              // We use LIKE to find the pubkey in the JSON array string
              const followersOfTarget = await sqlDb
                .selectFrom('follows')
                .selectAll()
                .where('follows', 'like', `%${pubkey}%`)
                .execute();
              
              const mutuals = followersOfTarget.filter(f => myFollowsSet.has(f.pubkey));
              setMutualCount(mutuals.length);
            } catch (e) {
              console.error("Failed to parse follows JSON:", e);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching WoT data for", pubkey, error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pubkey, currentUser?.pubkey, publicKey]);

  return useMemo(() => ({ 
    score, 
    mutualCount, 
    loading 
  }), [score, mutualCount, loading]);
}
