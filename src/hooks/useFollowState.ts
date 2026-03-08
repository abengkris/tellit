// src/hooks/useFollowState.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { getNDK } from "@/lib/ndk";
import { followUser, unfollowUser } from "@/lib/actions/follow";
import { useAuthStore } from "@/store/auth";

interface UseFollowStateReturn {
  isFollowing: boolean;
  followsMe: boolean;
  isLoading: boolean; // true saat sedang initial load
  isPending: boolean; // optimistic update sedang berlangsung
  toggle: () => Promise<void>;
}

export function useFollowState(targetPubkey: string): UseFollowStateReturn {
  const user = useAuthStore((s) => s.user);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followsMe, setFollowsMe] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);

  // Cek initial state dari kind:3 viewer & target
  useEffect(() => {
    if (!user?.pubkey || !targetPubkey) {
      setIsLoading(false);
      return;
    }

    const ndk = getNDK();

    // Parallel fetch: check if current user follows target, and if target follows current user
    const checkFollowing = ndk.fetchEvent({
      kinds: [3],
      authors: [user.pubkey],
    });
    const checkFollowsMe = ndk.fetchEvent({
      kinds: [3],
      authors: [targetPubkey],
    });

    Promise.allSettled([checkFollowing, checkFollowsMe])
      .then(([followingResult, followsMeResult]) => {
        if (followingResult.status === "fulfilled" && followingResult.value) {
          const contactList = followingResult.value;
          const isF = contactList.tags.some(
            (t) => t[0] === "p" && t[1] === targetPubkey
          );
          setIsFollowing(isF);
        }

        if (followsMeResult.status === "fulfilled" && followsMeResult.value) {
          const contactList = followsMeResult.value;
          const isFM = contactList.tags.some(
            (t) => t[0] === "p" && t[1] === user.pubkey
          );
          setFollowsMe(isFM);
        }
      })
      .finally(() => setIsLoading(false));
  }, [user?.pubkey, targetPubkey]);

  const toggle = useCallback(async () => {
    if (!user || isPending) return;

    // Optimistic update: ubah UI dulu
    const prevState = isFollowing;
    setIsFollowing(!prevState);
    setIsPending(true);

    const ndk = getNDK();
    try {
      const result = prevState
        ? await unfollowUser(ndk, targetPubkey)
        : await followUser(ndk, targetPubkey);

      if (!result.success) {
        // Rollback jika gagal (biasanya karena gagal sign atau fetch initial list)
        setIsFollowing(prevState);
        console.error("Follow/unfollow gagal:", result.error);
        setIsPending(false);
      } else {
        // Berikan delay kecil agar user "merasakan" aksi terjadi,
        // tapi tidak perlu menunggu relay response penuh.
        setTimeout(() => setIsPending(false), 500);
      }
    } catch {
      // Rollback
      setIsFollowing(prevState);
      setIsPending(false);
    }
  }, [user, targetPubkey, isFollowing, isPending]);

  return { isFollowing, followsMe, isLoading, isPending, toggle };
}
