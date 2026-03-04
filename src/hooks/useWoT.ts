"use client";

import { useState, useEffect } from "react";
import { NDKWoT } from "@nostr-dev-kit/wot";
import { useNDK } from "@/hooks/useNDK";

type WoTStatus = "idle" | "loading" | "ready" | "error";

interface UseWoTReturn {
  wot: NDKWoT | CachedWoT | null;
  status: WoTStatus;
  pubkeyCount: number;
}

const CACHE_KEY_PREFIX = "tellit_wot_cache_";
const CACHE_EXPIRY = 3600000; // 1 hour in ms

class CachedWoT {
  public scores: Map<string, number>;
  public size: number;

  constructor(scoresObj: Record<string, number>) {
    this.scores = new Map(Object.entries(scoresObj));
    this.size = this.scores.size;
  }

  getScore(pubkey: string): number {
    return this.scores.get(pubkey) ?? 0;
  }

  // Compatible with NDKWoT signature
  getAllPubkeys(_options?: { maxDepth?: number }): string[] {
    return Array.from(this.scores.keys());
  }
}

let wotSingleton: NDKWoT | CachedWoT | null = null;
let wotSingletonPubkey: string | null = null;
let wotLoadPromise: Promise<void> | null = null;

export function useWoT(viewerPubkey: string | undefined): UseWoTReturn {
  const { ndk, isReady } = useNDK();
  const [status, setStatus] = useState<WoTStatus>("idle");
  const [pubkeyCount, setPubkeyCount] = useState(0);
  const [wot, setWot] = useState<NDKWoT | CachedWoT | null>(null);

  useEffect(() => {
    if (!ndk || !isReady || !viewerPubkey) return;
    
    // 1. Check Memory Singleton (and ensure it belongs to the same pubkey)
    if (wotSingleton && wotSingletonPubkey === viewerPubkey) {
      if (wot !== wotSingleton) {
        setWot(wotSingleton);
        setStatus("ready");
        setPubkeyCount(wotSingleton.size);
      }
      return;
    }

    // If pubkey changed, reset singleton
    if (wotSingletonPubkey !== viewerPubkey) {
      wotSingleton = null;
      wotSingletonPubkey = viewerPubkey;
    }

    // 2. Check LocalStorage Cache
    const cacheKey = `${CACHE_KEY_PREFIX}${viewerPubkey}`;
    const cachedData = typeof window !== "undefined" ? localStorage.getItem(cacheKey) : null;
    let isCacheValid = false;

    if (cachedData) {
      try {
        const { timestamp, scores, rootPubkey } = JSON.parse(cachedData);
        const age = Date.now() - timestamp;
        
        // Ensure cache belongs to this user
        if (rootPubkey === viewerPubkey && Object.keys(scores).length > 0) {
          const cachedInstance = new CachedWoT(scores);
          wotSingleton = cachedInstance;
          wotSingletonPubkey = viewerPubkey;
          setWot(cachedInstance);
          setPubkeyCount(cachedInstance.size);
          setStatus("ready");
          
          if (age < CACHE_EXPIRY) {
            isCacheValid = true;
            console.log(`[WoT] Loaded from cache (${cachedInstance.size} users). Age: ${Math.round(age/60000)}m`);
          } else {
            console.log("[WoT] Cache expired (>1h), will refresh in background.");
          }
        }
      } catch (e) {
        console.warn("[WoT] Failed to parse cache", e);
      }
    }

    // 3. Trigger Load if needed
    if (!isCacheValid) {
      if (wotLoadPromise) {
        return;
      }

      setStatus(prev => prev === "ready" ? prev : "loading");
      console.log(`[WoT] Starting background load for ${viewerPubkey}...`);
      
      const instance = new NDKWoT(ndk, viewerPubkey);
      wotLoadPromise = instance
        .load({
          depth: 2,
          timeout: 30000,
          maxFollows: 150, 
        })
        .then(() => {
          // Convert Map to Object for storage
          const scoresObj: Record<string, number> = {};
          instance.scores.forEach((score, pk) => {
            scoresObj[pk] = score;
          });

          // Save to LocalStorage
          localStorage.setItem(cacheKey, JSON.stringify({
            timestamp: Date.now(),
            scores: scoresObj,
            rootPubkey: viewerPubkey
          }));

          wotSingleton = instance;
          wotSingletonPubkey = viewerPubkey;
          setWot(instance);
          setStatus("ready");
          setPubkeyCount(instance.size);
          wotLoadPromise = null;
          console.log(`[WoT] Finished loading and cached. Size: ${instance.size}`);
        })
        .catch(err => {
          console.error("[WoT] Load failed:", err);
          setStatus(prev => prev === "ready" ? prev : "error");
          wotLoadPromise = null; 
        });
    }
  }, [ndk, isReady, viewerPubkey, wot]);

  return { wot, status, pubkeyCount };
}

export function resetWoT() {
  wotSingleton = null;
  wotSingletonPubkey = null;
  wotLoadPromise = null;
}
