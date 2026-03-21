import { useState, useEffect } from "react";
import { db } from "@/lib/db";

export function useWoT(pubkey?: string) {
  const [score, setScore] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!pubkey) {
      setScore(0);
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchScore = async () => {
      try {
        const record = await db.table("wotScores").get(pubkey);
        if (record) {
          setScore(record.score);
        } else {
          setScore(0);
        }
      } catch (error) {
        console.error("Error fetching WoT score for", pubkey, error);
      } finally {
        setLoading(false);
      }
    };

    fetchScore();

    // Dexie doesn't have a built-in event listener for single record changes
    // unless we use dexie-react-hooks or a custom observer.
    // For now, we'll just fetch once on mount/pubkey change.
  }, [pubkey]);

  return { score, loading };
}
