// src/hooks/useFollowers.ts
"use client";

import { useState, useEffect } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { getNDK } from "@/lib/ndk";

interface UseFollowersReturn {
  followers: string[];       // array pubkey follower
  count: number;             // jumlah follower
  loading: boolean;
  // Apakah count adalah estimasi (dari COUNT verb) atau exact
  isEstimate: boolean;
}

export function useFollowers(pubkey: string | undefined): UseFollowersReturn {
  const [followers, setFollowers] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isEstimate] = useState(false);

  useEffect(() => {
    if (!pubkey) {
      if (loading) Promise.resolve().then(() => setLoading(false));
      return;
    }
    Promise.resolve().then(() => setLoading(true));

    const ndk = getNDK();
    const seen = new Set<string>();

    // Subscribe ke kind:3 yang mengandung p-tag target
    // Ini akan stream follower secara real-time
    const sub = ndk.subscribe(
      {
        kinds: [3],
        "#p": [pubkey],
        limit: 500,
      },
      { closeOnEose: true },
      {
        onEvent: (event: NDKEvent) => {
          // Setiap event kind:3 yang punya p-tag menunjuk ke pubkey kita
          // = author event tersebut adalah follower kita
          if (!seen.has(event.pubkey)) {
            seen.add(event.pubkey);
            setFollowers((prev) => {
              if (prev.includes(event.pubkey)) return prev;
              return [...prev, event.pubkey];
            });
            setCount((c) => c + 1);
          }
        },
        onEose: () => {
          setLoading(false);
        }
      }
    );

    return () => sub.stop();
  }, [pubkey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { followers, count, loading, isEstimate };
}

/**
 * Versi ringan: hanya ambil COUNT, tidak fetch semua data.
 * Pakai NIP-45 COUNT verb jika relay mendukung.
 * Lebih cepat untuk tampilan angka follower di profil.
 */
export function useFollowerCount(pubkey: string | undefined): {
  count: number;
  loading: boolean;
} {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pubkey) {
      if (loading) Promise.resolve().then(() => setLoading(false));
      return;
    }
    if (!loading) Promise.resolve().then(() => setLoading(true));

    const ndk = getNDK();
    const seen = new Set<string>();

    // Fetch kind:3 dengan limit kecil, hitung dari EOSE
    // Karena tidak semua relay support COUNT (NIP-45)
    const sub = ndk.subscribe(
      {
        kinds: [3],
        "#p": [pubkey],
        limit: 1000,
      },
      { closeOnEose: true },
      {
        onEvent: (event: NDKEvent) => {
          seen.add(event.pubkey);
          setCount(seen.size);
        },
        onEose: () => {
          Promise.resolve().then(() => setLoading(false));
          sub.stop();
        }
      }
    );

    return () => sub.stop();
  }, [pubkey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { count, loading };
}
