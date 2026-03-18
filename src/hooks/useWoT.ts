"use client";

import { useState, useEffect } from "react";
import { NDKWoT } from "@nostr-dev-kit/wot";
import { useNDK } from "@/hooks/useNDK";
import { db } from "@/lib/db";

type WoTStatus = "idle" | "loading" | "ready" | "error";

interface UseWoTReturn {
  wot: NDKWoT | CachedWoT | null;
  trustScores: Map<string, number>;
  status: WoTStatus;
  pubkeyCount: number;
}

const CACHE_EXPIRY = 3600000; // 1 hour in ms
const MAX_RETRIES = 3;

/**
 * Simple wrapper class for cached WoT data to mimic NDKWoT behavior.
 */
export class CachedWoT {
  public scores: Map<string, number>;
  public graph: Map<string, string[]>;
  public size: number;

  constructor(scoresObj: Record<string, number>, graphObj: Record<string, string[]>) {
    this.scores = new Map(Object.entries(scoresObj));
    this.graph = new Map(Object.entries(graphObj));
    this.size = this.scores.size;
  }

  /**
   * Returns the trust score for a given pubkey (0 to 1).
   */
  getScore(pubkey: string): number {
    return this.scores.get(pubkey) ?? 0;
  }

  /**
   * Returns follow metadata for a pubkey.
   */
  getNode(pubkey: string) {
    const followedBy = this.graph.get(pubkey);
    if (!followedBy) return null;
    return {
      pubkey,
      followedBy: new Set(followedBy)
    };
  }

  /**
   * Returns all pubkeys present in the cached graph.
   */
  getAllPubkeys(): string[] {
    return Array.from(this.scores.keys());
  }
}

let wotSingleton: NDKWoT | CachedWoT | null = null;
let wotSingletonPubkey: string | null = null;
let wotLoadPromise: Promise<void> | null = null;

/**
 * Hook to manage and provide the Web of Trust (WoT) graph.
 * Implements a 2-layer caching strategy: 
 * 1. In-memory singleton for instant access across components.
 * 2. Dexie (IndexedDB) persistence with 1-hour expiry.
 * 
 * @param viewerPubkey The pubkey of the user whose trust network we are building.
 */
export function useWoT(viewerPubkey: string | undefined): UseWoTReturn {
  const { ndk, isReady } = useNDK();
  const [status, setStatus] = useState<WoTStatus>("idle");
  const [pubkeyCount, setPubkeyCount] = useState(0);
  const [wot, setWot] = useState<NDKWoT | CachedWoT | null>(null);
  const [trustScores, setTrustScores] = useState<Map<string, number>>(new Map());
  const [retries, setRetries] = useState(0);

  useEffect(() => {
    if (!ndk || !isReady || !viewerPubkey) return;
    
    // 1. Check Memory Singleton (and ensure it belongs to the same pubkey)
    if (wotSingleton && wotSingletonPubkey === viewerPubkey) {
      if (wot !== wotSingleton) {
        const singleton = wotSingleton;
        const scores = singleton instanceof CachedWoT 
          ? singleton.scores 
          : singleton.getScores(singleton.getAllPubkeys());

        Promise.resolve().then(() => {
          setWot(singleton);
          setTrustScores(scores);
          setStatus("ready");
          setPubkeyCount(singleton.size);
        });
      }
      return;
    }

    // If pubkey changed, reset singleton
    if (wotSingletonPubkey !== viewerPubkey) {
      wotSingleton = null;
      wotSingletonPubkey = viewerPubkey;
      Promise.resolve().then(() => setRetries(0)); // Reset retries for new user
    }

    let isMounted = true;

    const checkCacheAndLoad = async () => {
      // 1.5. Pre-populate with direct follows for instant "Following" priority
      try {
        const user = ndk.getUser({ pubkey: viewerPubkey });
        const follows = await user.follows();
        if (isMounted && trustScores.size === 0) {
          const initialScores = new Map<string, number>();
          follows.forEach(f => initialScores.set(f.pubkey, 1.0));
          setTrustScores(initialScores);
          setPubkeyCount(follows.size);
          console.log(`[WoT] Pre-populated ${follows.size} direct follows.`);
        }
      } catch {
        console.warn("[WoT] Failed to pre-populate follows");
      }

      // 2. Check Dexie Cache
      let isCacheValid = false;
      try {
        const cachedEntry = await db.wotCache.get(viewerPubkey);
        
        if (cachedEntry && isMounted) {
          const age = Date.now() - cachedEntry.timestamp;
          const cachedInstance = new CachedWoT(cachedEntry.scores, cachedEntry.graph || {});
          
          wotSingleton = cachedInstance;
          wotSingletonPubkey = viewerPubkey;
          
          Promise.resolve().then(() => {
            if (isMounted) {
              setWot(cachedInstance);
              setTrustScores(cachedInstance.scores);
              setPubkeyCount(cachedInstance.size);
              setStatus("ready");
            }
          });
          
          if (age < CACHE_EXPIRY) {
            isCacheValid = true;
            console.log(`[WoT] Loaded from Dexie (${cachedInstance.size} users). Age: ${Math.round(age/60000)}m`);
          } else {
            console.log("[WoT] Dexie cache expired (>1h), will refresh in background.");
          }
        }
      } catch (e) {
        console.warn("[WoT] Failed to read Dexie cache", e);
      }

      // 3. Trigger Load if needed
      if (!isCacheValid && isMounted) {
        if (wotLoadPromise) return;

        Promise.resolve().then(() => {
          if (isMounted) setStatus(prev => prev === "ready" ? prev : "loading");
        });
        
        // If we are retrying, add a delay
        if (retries > 0) {
          const delay = Math.pow(2, retries) * 1000;
          console.log(`[WoT] Retrying load in ${delay}ms... (Attempt ${retries}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        if (!isMounted) return;
        console.log(`[WoT] Starting background load for ${viewerPubkey}...`);
        
        const instance = new NDKWoT(ndk, viewerPubkey);
        wotLoadPromise = instance
          .load({
            depth: 2,
            timeout: 30000,
            maxFollows: 150, 
          })
          .then(async () => {
            if (!isMounted) return;

            // Serialize scores and graph correctly using public methods
            const allPubkeys = instance.getAllPubkeys();
            const scoresMap = instance.getScores(allPubkeys);
            const scoresObj: Record<string, number> = {};
            const graphObj: Record<string, string[]> = {};
            
            scoresMap.forEach((score, pk) => {
              scoresObj[pk] = score;
              const node = instance.getNode(pk);
              if (node) {
                graphObj[pk] = Array.from(node.followedBy);
              }
            });

            // Save to Dexie
            try {
              await db.wotCache.put({
                pubkey: viewerPubkey,
                timestamp: Date.now(),
                scores: scoresObj,
                graph: graphObj
              });
            } catch (dbErr) {
              console.error("[WoT] Failed to save to Dexie:", dbErr);
            }

            wotSingleton = instance;
            wotSingletonPubkey = viewerPubkey;
            setWot(instance);
            setTrustScores(scoresMap);
            setStatus("ready");
            setPubkeyCount(instance.size);
            wotLoadPromise = null;
            setRetries(0); // Success! reset retries
            console.log(`[WoT] Finished loading and cached to Dexie. Size: ${instance.size}`);
          })
          .catch(err => {
            console.error("[WoT] Load failed:", err);
            wotLoadPromise = null; 
            if (isMounted) {
              if (retries < MAX_RETRIES) {
                setRetries(prev => prev + 1);
              } else {
                setStatus(prev => prev === "ready" ? prev : "error");
              }
            }
          });
      }
    };

    checkCacheAndLoad();

    return () => {
      isMounted = false;
    };
  }, [ndk, isReady, viewerPubkey, wot, status, retries, trustScores.size]);

  return { wot, trustScores, status, pubkeyCount };
}

/**
 * Resets the in-memory WoT singleton.
 */
export function resetWoT() {
  wotSingleton = null;
  wotSingletonPubkey = null;
  wotLoadPromise = null;
}
