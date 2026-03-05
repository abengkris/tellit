import { useEffect, useState } from "react";
import { useNDK } from "@/hooks/useNDK";

export function useFollowing(pubkey?: string) {
  const { ndk, isReady } = useNDK();
  const [following, setFollowing] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ndk || !isReady || !pubkey) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchFollowing = async () => {
      try {
        const contactListEvent = await ndk.fetchEvent(
          { kinds: [3], authors: [pubkey] },
          { relayGoalPerAuthor: 3 }
        );

        if (contactListEvent) {
          const pubkeys = contactListEvent.tags
            .filter((t) => t[0] === "p")
            .map((t) => t[1]);
          setFollowing(pubkeys);
        }
      } catch (error) {
        console.error("Error fetching following for", pubkey, error);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowing();
  }, [ndk, isReady, pubkey]);

  return { following, loading };
}
