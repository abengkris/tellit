import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { useAuthStore } from "@/store/auth";

export function useWoT(pubkey?: string) {
  const [score, setScore] = useState<number>(0);
  const [mutualCount, setMutualCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const { user: currentUser } = useAuthStore();

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
        // 1. Fetch Score
        const scoreRecord = await db.table("wotScores").get(pubkey);
        setScore(scoreRecord ? scoreRecord.score : 0);

        // 2. Fetch Mutuals (people the current user follows who also follow this pubkey)
        if (currentUser?.pubkey) {
          const myFollowsRecord = await db.table("follows").get(currentUser.pubkey);
          if (myFollowsRecord && myFollowsRecord.follows) {
            const myFollowsSet = new Set(myFollowsRecord.follows);
            
            // Find all people who follow this 'pubkey'
            const followersOfTarget = await db.table("follows")
              .where("follows")
              .equals(pubkey)
              .toArray();
            
            const mutuals = followersOfTarget.filter(f => myFollowsSet.has(f.pubkey));
            setMutualCount(mutuals.length);
          }
        }
      } catch (error) {
        console.error("Error fetching WoT data for", pubkey, error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pubkey, currentUser?.pubkey]);

  return useMemo(() => ({ 
    score, 
    mutualCount, 
    loading 
  }), [score, mutualCount, loading]);
}
