"use client";

import { useState, useEffect, useRef } from "react";
import { NDKWoT } from "@nostr-dev-kit/wot";
import { useNDK } from "@/hooks/useNDK";

type WoTStatus = "idle" | "loading" | "ready" | "error";

interface UseWoTReturn {
  wot: NDKWoT | null;
  status: WoTStatus;
  pubkeyCount: number;
}

let wotSingleton: NDKWoT | null = null;
let wotLoadPromise: Promise<void> | null = null;

export function useWoT(viewerPubkey: string | undefined): UseWoTReturn {
  const { ndk, isReady } = useNDK();
  const [status, setStatus] = useState<WoTStatus>(
    wotSingleton ? "ready" : "idle"
  );
  const [pubkeyCount, setPubkeyCount] = useState(
    wotSingleton ? wotSingleton.size : 0
  );
  const [wot, setWot] = useState<NDKWoT | null>(wotSingleton);

  useEffect(() => {
    if (!ndk || !isReady || !viewerPubkey) return;
    
    if (wotSingleton) {
      setWot(wotSingleton);
      setStatus("ready");
      setPubkeyCount(wotSingleton.size);
      return;
    }

    if (wotLoadPromise) {
      setStatus("loading");
      wotLoadPromise.then(() => {
        setWot(wotSingleton);
        setStatus("ready");
        setPubkeyCount(wotSingleton?.size ?? 0);
      });
      return;
    }

    setStatus("loading");
    console.log(`[WoT] Starting load for ${viewerPubkey}...`);
    // NDKWoT constructor now requires rootPubkey
    const instance = new NDKWoT(ndk, viewerPubkey);

    wotLoadPromise = instance
      .load({
        depth: 2,
        timeout: 30000, // Increased to 30s
        maxFollows: 150, 
      })
      .then(() => {
        wotSingleton = instance;
        setWot(instance);
        setStatus("ready");
        setPubkeyCount(instance.size);
        console.log(`[WoT] Finished loading. Size: ${instance.size}`);
      })
      .catch(err => {
        console.error("[WoT] Load failed or timed out:", err);
        setStatus("error");
        wotLoadPromise = null; 
      });
  }, [ndk, isReady, viewerPubkey]);

  return { wot, status, pubkeyCount };
}

export function resetWoT() {
  wotSingleton = null;
  wotLoadPromise = null;
}
