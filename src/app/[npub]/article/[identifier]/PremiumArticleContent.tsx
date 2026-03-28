"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNDK } from "@/hooks/useNDK";
import { decodeNip19 } from "@/lib/utils/nip19";
import { type NostrFilter, type NostrEvent } from "@nostrify/types";
import { createRelayPool } from "@/lib/nostrify-relay";
import { getStorage } from "@/lib/nostrify-storage";
import { ArticleView } from "@/components/article/ArticleView";
import { DEFAULT_RELAYS } from "@/lib/ndk";

interface PremiumArticleContentProps {
  hexPubkey: string;
  identifier: string;
  slug: string;
}

const ARTICLE_RELAYS = [
  ...DEFAULT_RELAYS,
  "wss://nostr.wine",
  "wss://relay.nostr.band",
  "wss://relay.primal.net",
];

export function PremiumArticleContent({ hexPubkey, identifier, slug }: PremiumArticleContentProps) {
  const { isReady } = useNDK();
  const [article, setArticle] = useState<NostrEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState(0);
  const router = useRouter();
  const fetchInitiated = useRef(false);
  const poolRef = useRef<ReturnType<typeof createRelayPool> | null>(null);

  const fetchArticle = useCallback(async (force = false) => {
    if (!hexPubkey || !identifier) return;
    
    setLoading(true);
    setAttempts(prev => prev + 1);
    
    try {
      const storage = await getStorage();
      
      let filter: NostrFilter;
      if (identifier.startsWith('naddr1')) {
        const decoded = decodeNip19(identifier);
        filter = { ids: [decoded.id] };
      } else {
        filter = { kinds: [30023], authors: [hexPubkey], "#d": [identifier] };
      }

      // 1. Try Storage first
      if (storage && !force) {
        const cached = await storage.query([filter]);
        if (cached.length > 0) {
          setArticle(cached[0]);
          setLoading(false);
          return;
        }
      }

      // 2. Fetch from Relays
      if (!poolRef.current) {
        poolRef.current = createRelayPool(ARTICLE_RELAYS);
      }

      const stream = poolRef.current.req([filter]);
      for await (const msg of stream) {
        if (msg[0] === 'EVENT') {
          const event = msg[2];
          setArticle(event);
          if (storage) {
            storage.event(event).catch(() => {});
          }
          break; // Found the article
        } else if (msg[0] === 'EOSE') {
          break;
        }
      }
    } catch (err) {
      console.error("[PremiumArticle] Fetch fatal error:", err);
    } finally {
      setLoading(false);
    }
  }, [hexPubkey, identifier]);

  useEffect(() => {
    if (isReady && !fetchInitiated.current) {
      fetchInitiated.current = true;
      fetchArticle();
    }
  }, [isReady, fetchArticle]);

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
