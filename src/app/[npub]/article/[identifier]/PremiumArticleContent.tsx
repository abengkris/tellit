"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNDK } from "@/hooks/useNDK";
import { decodeNip19 } from "@/lib/utils/nip19";
import { NDKEvent, NDKSubscriptionCacheUsage, NDKRelaySet } from "@nostr-dev-kit/ndk";
import { ArticleView } from "@/components/article/ArticleView";

interface PremiumArticleContentProps {
  hexPubkey: string;
  identifier: string;
  slug: string;
}

export function PremiumArticleContent({ hexPubkey, identifier, slug }: PremiumArticleContentProps) {
  const { ndk, isReady } = useNDK();
  const [article, setArticle] = useState<NDKEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState(0);
  const router = useRouter();
  const fetchInitiated = useRef(false);

  // Debug logging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log("[PremiumArticle] Render state:", { hexPubkey, identifier, slug, isReady, hasNdk: !!ndk });
    }
  }, [hexPubkey, identifier, slug, isReady, ndk]);

  const fetchArticle = useCallback(async (force = false) => {
    if (!ndk || !hexPubkey || !identifier) return;
    
    setLoading(true);
    setAttempts(prev => prev + 1);
    
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 30000);

    try {
      let event: NDKEvent | null = null;
      const cacheUsage = force ? NDKSubscriptionCacheUsage.ONLY_RELAY : NDKSubscriptionCacheUsage.CACHE_FIRST;
      
      const articleRelayUrls = [
        "wss://relay.damus.io",
        "wss://relay.snort.social",
        "wss://nostr.wine",
        "wss://relay.nostr.band",
        "wss://nos.lol",
        "wss://relay.primal.net",
        "wss://purplepag.es"
      ];
      const articleRelaySet = NDKRelaySet.fromRelayUrls(articleRelayUrls, ndk);

      if (identifier.startsWith('naddr1')) {
        const { id: hexId } = decodeNip19(identifier);
        event = await ndk.fetchEvent(hexId, { cacheUsage, closeOnEose: true }, articleRelaySet);
      } else {
        const filter = { kinds: [30023], authors: [hexPubkey], "#d": [identifier] };
        event = await ndk.fetchEvent(filter, { cacheUsage, closeOnEose: true }, articleRelaySet);
        
        if (!event) {
          const broadFilter = { kinds: [30023], authors: [hexPubkey], limit: 50 };
          const allArticles = await ndk.fetchEvents(broadFilter, { cacheUsage, closeOnEose: true }, articleRelaySet);
          event = Array.from(allArticles).find(ev => 
            ev.tags.find(t => t[0] === 'd' && t[1] === identifier) || ev.id === identifier
          ) || null;
        }

        if (!event && !force) {
          const relayListEvents = await ndk.fetchEvents({ kinds: [10002], authors: [hexPubkey] }, { closeOnEose: true }, articleRelaySet);
          const relayListEvent = Array.from(relayListEvents)[0];
          if (relayListEvent) {
            const writeUrls = relayListEvent.tags.filter(t => t[0] === 'r' && (!t[2] || t[2] === 'write')).map(t => t[1]);
            if (writeUrls.length > 0) {
              const discoveredSet = NDKRelaySet.fromRelayUrls(writeUrls, ndk);
              event = await ndk.fetchEvent(filter, { closeOnEose: true }, discoveredSet);
            }
          }
        }
      }

      if (event) {
        setArticle(event);
      }
    } catch (err) {
      console.error("[PremiumArticle] Fetch fatal error:", err);
    } finally {
      clearTimeout(safetyTimeout);
      setLoading(false);
    }
  }, [ndk, hexPubkey, identifier]);

  useEffect(() => {
    if (isReady && ndk && !fetchInitiated.current) {
      fetchInitiated.current = true;
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
            Connecting to the Nostr network to fetch latest content...
          </p>
        </div>
        <div className="w-full max-w-sm bg-muted/40 rounded-3xl p-6 border border-border/50 backdrop-blur-sm">
          <div className="space-y-3 font-mono text-[10px] break-all uppercase leading-tight">
            <div className="grid grid-cols-3 gap-2">
              <span className="text-muted-foreground">Author</span>
              <span className="col-span-2 font-bold text-right text-foreground/80">{hexPubkey?.slice(0, 24)}...</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-muted-foreground">Unique ID</span>
              <span className="col-span-2 font-bold text-right text-foreground/80">{identifier?.slice(0, 24)}...</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-muted-foreground">Attempts</span>
              <span className="col-span-2 font-black text-right text-primary">{attempts}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <button onClick={() => fetchArticle(true)} className="group w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl">Force Sync</button>
          <a href={`https://njump.me/${hexPubkey}:${identifier}`} target="_blank" rel="noopener noreferrer" className="w-full py-4 bg-muted/50 rounded-2xl text-center font-black uppercase tracking-widest text-[10px]">Verify on Njump.me</a>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="p-12 text-center flex flex-col items-center gap-6">
        <div className="size-20 rounded-3xl bg-muted flex items-center justify-center text-muted-foreground/30"><RefreshCw size={40} /></div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight">Article Not Found</h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto font-medium">Deleted or unreachable relays.</p>
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
      slug={slug} 
      authorPubkey={hexPubkey} 
    />
  );
}
