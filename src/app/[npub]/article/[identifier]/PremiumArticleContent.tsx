// src/app/[npub]/article/[identifier]/PremiumArticleContent.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Loader2, ArrowLeft, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNDK } from "@/hooks/useNDK";
import { decodeNip19 } from "@/lib/utils/nip19";
import { NDKEvent, NDKSubscriptionCacheUsage, NDKRelaySet } from "@nostr-dev-kit/ndk";
import { useProfile } from "@/hooks/useProfile";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { PostActions } from "@/components/post/parts/PostActions";
import { usePostStats } from "@/hooks/usePostStats";
import { PostCard } from "@/components/post/PostCard";
import { useThread } from "@/hooks/useThread";
import { shortenPubkey } from "@/lib/utils/nip19";
import { ArticleRenderer } from "@/components/article/ArticleRenderer";

interface PremiumArticleContentProps {
  hexPubkey: string;
  identifier: string;
  slug: string;
}

export function PremiumArticleContent({ hexPubkey, identifier, slug }: PremiumArticleContentProps) {
  const { ndk, isReady } = useNDK();
  const [article, setArticle] = useState<NDKEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const { profile } = useProfile(article?.pubkey || hexPubkey);
  const { 
    likes, 
    reposts, 
    comments, 
    quotes, 
    combinedReposts,
    bookmarks,
    totalSats, 
    userLiked, 
    userReposted 
  } = usePostStats(article?.id);

  const { 
    replies, 
    loadingReplies, 
    hasMoreReplies, 
    loadMoreReplies,
    fetchRepliesFor
  } = useThread(article?.id);

  useEffect(() => {
    if (!ndk || !isReady || !hexPubkey || !identifier) {
      console.log("[PremiumArticle] Requirements not yet met:", { 
        hasNdk: !!ndk, 
        isReady, 
        hasPubkey: !!hexPubkey, 
        hasIdentifier: !!identifier 
      });
      return;
    }

    const fetchArticle = async () => {
      console.log("[PremiumArticle] Starting fetch cycle for:", { slug, identifier, hexPubkey });
      setLoading(true);
      
      const safetyTimeout = setTimeout(() => {
        console.warn("[PremiumArticle] Fetch timed out after 20s");
        setLoading(false);
      }, 20000);

      try {
        let event: NDKEvent | null = null;
        
        // 1. If it's a NIP-19 naddr, decode and fetch directly
        if (identifier.startsWith('naddr1')) {
          console.log("[PremiumArticle] Identifier is naddr, decoding...");
          const { id: hexId } = decodeNip19(identifier);
          event = await ndk.fetchEvent(hexId);
        } else {
          // 2. Parallel Fetch: Try d-tag AND hex ID simultaneously
          console.log("[PremiumArticle] Attempting parallel d-tag and hex ID fetch...");
          
          const dTagFilter = { kinds: [30023], authors: [hexPubkey], "#d": [identifier] };
          const isHexId = /^[0-9a-fA-F]{64}$/.test(identifier);

          const fetchPromises = [
            ndk.fetchEvent(dTagFilter, { cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST, closeOnEose: true })
          ];

          if (isHexId) {
            fetchPromises.push(ndk.fetchEvent({ ids: [identifier] }, { closeOnEose: true }));
          }

          const results = await Promise.all(fetchPromises);
          event = results.find(r => !!r) || null;
          
          // 3. Fallback: Outbox discovery with broad relay search
          if (!event && hexPubkey) {
            console.log("[PremiumArticle] Not found in initial pass, searching author relays...");
            
            // Try to find kind 10002 on a dedicated profile relay if not found on defaults
            const profileRelayUrls = ["wss://purplepag.es", "wss://relay.damus.io", "wss://nos.lol"];
            const profileRelays = NDKRelaySet.fromRelayUrls(profileRelayUrls, ndk);
            
            const relayListEvents = await ndk.fetchEvents({
              kinds: [10002],
              authors: [hexPubkey]
            }, { closeOnEose: true }, profileRelays);
            
            const relayListEvent = Array.from(relayListEvents)[0];
            
            if (relayListEvent) {
              const writeRelayUrls = relayListEvent.tags
                .filter(t => t[0] === 'r' && (!t[2] || t[2] === 'write'))
                .map(t => t[1]);

              if (writeRelayUrls.length > 0) {
                console.log("[PremiumArticle] Author write relays discovered:", writeRelayUrls);
                const authorRelaySet = NDKRelaySet.fromRelayUrls(writeRelayUrls, ndk);
                event = await ndk.fetchEvent(dTagFilter, { closeOnEose: true }, authorRelaySet);
              }
            }
          }
          
          // 4. Final attempt: broad d-tag search on all relays
          if (!event) {
            console.log("[PremiumArticle] Final attempt: broad d-tag search...");
            event = await ndk.fetchEvent(dTagFilter, { closeOnEose: true });
          }
        }

        if (event) {
          console.log("[PremiumArticle] Found article successfully:", event.id);
          setArticle(event);
        } else {
          console.warn("[PremiumArticle] No article found after all attempts");
        }
      } catch (err) {
        console.error("[PremiumArticle] Fetch error:", err);
      } finally {
        clearTimeout(safetyTimeout);
        setLoading(false);
      }
    };

    fetchArticle();
  }, [ndk, isReady, hexPubkey, identifier, slug]);

  if (loading && !article) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
        <div className="relative">
          <Loader2 className="animate-spin text-primary" size={48} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="size-2 bg-primary rounded-full animate-pulse" />
          </div>
        </div>
        
        <div className="text-center space-y-2">
          <p className="text-lg font-black tracking-tight">Memuat Artikel</p>
          <p className="text-muted-foreground text-sm font-medium">Sedang mencari di jaringan Nostr...</p>
        </div>

        {/* Diagnostic Debug Info */}
        <div className="w-full max-w-xs bg-muted/50 rounded-2xl p-4 border border-border mt-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 border-b border-border pb-2">Debug Info</p>
          <div className="space-y-2 font-mono text-[9px] break-all uppercase">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Author:</span>
              <span className="font-bold text-right">{hexPubkey?.slice(0, 16)}...</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">ID/D-Tag:</span>
              <span className="font-bold text-right">{identifier?.slice(0, 16)}...</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-bold text-primary text-right">{isReady ? "NDK Ready" : "NDK Connecting"}</span>
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-2 rounded-full border border-border text-xs font-black uppercase tracking-widest hover:bg-accent transition-colors"
        >
          Muat Ulang Paksa
        </button>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="p-8 text-center flex flex-col items-center gap-4">
        <h1 className="text-2xl font-black">Article not found</h1>
        <p className="text-muted-foreground text-sm max-w-xs">
          This article could not be located for this user.
        </p>
        <button 
          onClick={() => router.back()}
          className="mt-4 px-8 py-3 bg-primary text-primary-foreground rounded-full font-black shadow-lg shadow-primary/20 hover:scale-105 transition-transform flex items-center gap-2"
        >
          <ArrowLeft size={20} /> Go Back
        </button>
      </div>
    );
  }

  const title = article.tags.find(t => t[0] === 'title')?.[1] || "Untitled Article";
  const image = article.tags.find(t => t[0] === 'image')?.[1];
  const summary = article.tags.find(t => t[0] === 'summary')?.[1];
  const tags = article.tags.filter(t => t[0] === 't').map(t => t[1]);
  const publishedAt = article.created_at;
  const readingTime = Math.ceil(article.content.split(/\s+/).length / 200);

  return (
    <>
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border flex items-center px-4 py-3 space-x-6">
        <button 
          onClick={() => router.back()} 
          className="p-2 hover:bg-accent rounded-full transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black truncate">Article</h1>
      </div>

      <article className="pb-20">
        {/* Hero Image */}
        {image && (
          <div className="w-full aspect-[21/9] relative overflow-hidden bg-muted border-b border-border">
            <Image 
              src={image} 
              alt={title}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}

        <div className="max-w-screen-md mx-auto p-6 sm:p-10">
          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground mb-8 border-b border-border pb-6">
            <Link href={`/${slug}`} className="flex items-center gap-2 group">
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-border shrink-0">
                <Image 
                  src={profile?.picture || `https://robohash.org/${article.pubkey}?set=set1`}
                  fill
                  className="object-cover"
                  alt={profile?.name || "Author"}
                  unoptimized
                />
              </div>
              <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                {profile?.display_name || profile?.name || shortenPubkey(article.pubkey)}
              </span>
            </Link>
            {publishedAt && (
              <div className="flex items-center gap-1.5 font-medium">
                <Calendar size={14} className="text-muted-foreground" />
                {format(new Date(publishedAt * 1000), "MMM d, yyyy")}
              </div>
            )}
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
              <span>{readingTime} min read</span>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl font-[900] mb-6 leading-[1.1] tracking-tight text-foreground">
            {title}
          </h1>

          {summary && (
            <p className="text-xl sm:text-2xl text-muted-foreground font-medium leading-relaxed mb-10 border-l-4 border-primary pl-6">
              {summary}
            </p>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-12">
              {tags.map(tag => (
                <span key={tag} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-black uppercase tracking-wide border border-primary/10">
                  # {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-10">
            <ArticleRenderer 
              content={article.content}
              event={article}
            />
          </div>

          <div className="mt-12 pt-6 border-t border-border">
            <PostActions
              eventId={article.id}
              likes={likes}
              reposts={reposts}
              comments={comments}
              quotes={quotes}
              combinedReposts={combinedReposts}
              bookmarks={bookmarks}
              zaps={totalSats}
              userReacted={userLiked ? '+' : null}
              userReposted={userReposted}
              variant="detail"
            />
          </div>
        </div>

        {/* Replies Section */}
        <div className="border-t-8 border-muted/30">
          <div className="p-4 border-b border-border bg-background sticky top-[57px] z-10 flex items-center justify-between">
            <h3 className="font-black text-sm uppercase tracking-widest text-muted-foreground">Comments</h3>
            <span className="bg-muted px-2 py-0.5 rounded text-[10px] font-black">{replies.length}</span>
          </div>

          <div className="flex flex-col">
            {replies.length > 0 ? (
              <>
                {replies.map(reply => (
                  <PostCard 
                    key={reply.id} 
                    event={reply} 
                    variant="feed"
                  />
                ))}
                {hasMoreReplies && (
                  <div className="p-8 text-center border-t border-border">
                    <button 
                      onClick={() => loadMoreReplies()}
                      disabled={loadingReplies}
                      className="px-8 py-3 bg-muted rounded-full text-primary text-sm font-black uppercase tracking-widest hover:bg-accent disabled:opacity-50 transition-all active:scale-95"
                    >
                      {loadingReplies ? (
                        <span className="flex items-center gap-2">
                          <Loader2 size={16} className="animate-spin" />
                          Loading...
                        </span>
                      ) : "Show more comments"}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="p-12 text-center text-muted-foreground italic text-sm font-medium">
                No comments yet.
              </div>
            )}
          </div>
        </div>
      </article>
    </>
  );
}
