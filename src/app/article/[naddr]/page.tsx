"use client";

import React, { use, useEffect, useState, useCallback } from "react";
import { Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNDK } from "@/hooks/useNDK";
import { decodeNip19 } from "@/lib/utils/nip19";
import { NDKEvent, NDKSubscriptionCacheUsage, NDKRelaySet } from "@nostr-dev-kit/ndk";
import { ArticleView } from "@/components/article/ArticleView";

export default function ArticleDetailPage({ params }: { params: Promise<{ naddr: string }> }) {
  const { naddr } = use(params);
  const { id: hexId, relays: hintRelays, pubkey: authorPubkey, identifier } = decodeNip19(naddr);
  const { ndk, isReady } = useNDK();
  const [article, setArticle] = useState<NDKEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState(0);
  const router = useRouter();
  
  const fetchArticle = useCallback(async (force = false) => {
    if (!ndk || !isReady) return;

    console.log("[ArticleDetail] Starting fetch cycle for:", { naddr, hexId, identifier, authorPubkey });
    setLoading(true);
    setAttempts(prev => prev + 1);

    const safetyTimeout = setTimeout(() => {
      console.warn("[ArticleDetail] Fetch timed out after 25s");
      setLoading(false);
    }, 25000);

    try {
      let event: NDKEvent | null = null;
      const cacheUsage = force ? NDKSubscriptionCacheUsage.ONLY_RELAY : NDKSubscriptionCacheUsage.CACHE_FIRST;
      
      // 1. Prepare Relay Sets (Hints + Specialized)
      const articleRelayUrls = Array.from(new Set([
        ...(hintRelays || []),
        "wss://relay.damus.io",
        "wss://relay.snort.social",
        "wss://nostr.wine",
        "wss://relay.nostr.band",
        "wss://nos.lol",
        "wss://relay.primal.net",
        "wss://purplepag.es"
      ]));
      const articleRelaySet = NDKRelaySet.fromRelayUrls(articleRelayUrls, ndk);

      // 2. Main Fetch (Direct Hex ID or Filter)
      if (hexId) {
        event = await ndk.fetchEvent(hexId, { cacheUsage, closeOnEose: true }, articleRelaySet);
      } 
      
      if (!event && authorPubkey && identifier) {
        const filter = { kinds: [30023], authors: [authorPubkey], "#d": [identifier] };
        event = await ndk.fetchEvent(filter, { cacheUsage, closeOnEose: true }, articleRelaySet);
        
        // 3. Robust Fallback
        if (!event) {
          const broadFilter = { kinds: [30023], authors: [authorPubkey], limit: 50 };
          const allArticles = await ndk.fetchEvents(broadFilter, { cacheUsage, closeOnEose: true }, articleRelaySet);
          
          event = Array.from(allArticles).find(ev => 
            ev.tags.find(t => t[0] === 'd' && t[1] === identifier) || ev.id === hexId
          ) || null;
        }
      }

      if (event) {
        setArticle(event);
      }
    } catch (err) {
      console.error("[ArticleDetail] Fetch error:", err);
    } finally {
      clearTimeout(safetyTimeout);
      setLoading(false);
    }
  }, [ndk, isReady, hexId, identifier, authorPubkey, hintRelays, naddr]);

  useEffect(() => {
    if (isReady && ndk) {
      fetchArticle();
    }
  }, [isReady, ndk, fetchArticle]);

  if (loading && !article) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8 px-6 text-center">
        <div className="relative">
          <Loader2 className="animate-spin text-primary" size={56} strokeWidth={3} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="size-2.5 bg-primary rounded-full animate-pulse shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-black tracking-tight">Finding Article</h2>
          <p className="text-muted-foreground text-sm font-medium max-w-xs mx-auto leading-relaxed">
            Searching the Nostr network using hints and popular relays...
          </p>
        </div>
        
        {/* Diagnostic Debug Info */}
        <div className="w-full max-w-sm bg-muted/40 rounded-3xl p-6 border border-border/50 backdrop-blur-sm">
          <div className="space-y-3 font-mono text-[10px] break-all uppercase leading-tight">
            <div className="grid grid-cols-3 gap-2">
              <span className="text-muted-foreground">ID</span>
              <span className="col-span-2 font-bold text-right text-foreground/80">{hexId?.slice(0, 24)}...</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-muted-foreground">Attempts</span>
              <span className="col-span-2 font-black text-right text-primary">{attempts}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-sm">
          <button 
            onClick={() => fetchArticle(true)}
            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={14} />
            Force Sync
          </button>
          <a 
            href={`https://njump.me/${naddr}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors flex items-center justify-center gap-2"
          >
            Check on njump.me <ExternalLink size={12} />
          </a>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="p-12 text-center flex flex-col items-center gap-6">
        <div className="size-20 rounded-3xl bg-muted flex items-center justify-center text-muted-foreground/30">
          <RefreshCw size={40} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight">Article Not Found</h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto font-medium">
            This content may have been deleted or is currently on unreachable relays.
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <button onClick={() => fetchArticle(true)} className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-xs">Try Again</button>
          <button onClick={() => router.back()} className="w-full py-4 bg-muted rounded-2xl font-black uppercase tracking-widest text-[10px]">Back</button>
        </div>
      </div>
    );
  }

  return (
    <ArticleView 
      article={article} 
      authorPubkey={article.pubkey || authorPubkey || ""}
    />
  );
}
