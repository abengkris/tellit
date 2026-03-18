"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { Loader2, ArrowLeft, Calendar, RefreshCw, ExternalLink, Share, MessageSquare } from "lucide-react";
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
import { getReadingTime, cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui";

interface PremiumArticleContentProps {
  hexPubkey: string;
  identifier: string;
  slug: string;
}

export function PremiumArticleContent({ hexPubkey, identifier, slug }: PremiumArticleContentProps) {
  const { ndk, isReady } = useNDK();
  const { addToast } = useUIStore();
  const [article, setArticle] = useState<NDKEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showTitleInHeader, setShowTitleInHeader] = useState(false);
  const router = useRouter();
  const fetchInitiated = useRef(false);
  
  const commentsRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLElement>(null);

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
  } = useThread(article?.id);

  const handleScroll = useCallback(() => {
    if (!articleRef.current) return;
    
    const element = articleRef.current;
    const totalHeight = element.clientHeight;
    const windowHeight = window.innerHeight;
    const scrollPosition = window.scrollY;
    
    // Progress calculation
    const progress = (scrollPosition / (totalHeight - windowHeight + 400)) * 100;
    setScrollProgress(Math.min(100, Math.max(0, progress)));
    
    // Header title visibility
    setShowTitleInHeader(scrollPosition > 400);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const fetchArticle = useCallback(async (force = false) => {
    if (!ndk || !hexPubkey || !identifier) {
      console.warn("[PremiumArticle] Skip fetch: missing requirements", { hasNdk: !!ndk, hexPubkey, identifier });
      return;
    }
    
    console.log(`[PremiumArticle] Starting ${force ? "FORCE " : ""}fetch cycle for:`, { slug, identifier, hexPubkey });
    setLoading(true);
    setAttempts(prev => prev + 1);
    
    const safetyTimeout = setTimeout(() => {
      console.warn("[PremiumArticle] Fetch timed out after 30s");
      setLoading(false);
    }, 30000);

    try {
      let event: NDKEvent | null = null;
      const cacheUsage = force ? NDKSubscriptionCacheUsage.ONLY_RELAY : NDKSubscriptionCacheUsage.CACHE_FIRST;
      
      // Article-specialized relays
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

      // A. If it's a NIP-19 naddr, decode and fetch directly
      if (identifier.startsWith('naddr1')) {
        const { id: hexId } = decodeNip19(identifier);
        event = await ndk.fetchEvent(hexId, { cacheUsage, closeOnEose: true }, articleRelaySet);
      } else {
        // B. Standard Filter: Kind + Author + D-Tag
        const filter = { kinds: [30023], authors: [hexPubkey], "#d": [identifier] };
        console.log("[PremiumArticle] Attempting filter fetch...");
        
        event = await ndk.fetchEvent(filter, { cacheUsage, closeOnEose: true }, articleRelaySet);
        
        // C. Broad Fallback (JS Filter): Relays sometimes fail on #d indexing
        if (!event) {
          console.log("[PremiumArticle] Filter fetch failed, trying broad author fetch...");
          const broadFilter = { kinds: [30023], authors: [hexPubkey], limit: 50 };
          const allArticles = await ndk.fetchEvents(broadFilter, { cacheUsage, closeOnEose: true }, articleRelaySet);
          
          event = Array.from(allArticles).find(ev => 
            ev.tags.find(t => t[0] === 'd' && t[1] === identifier) || ev.id === identifier
          ) || null;
        }

        // D. Outbox discovery (Search author's specific relays)
        if (!event && !force) {
          console.log("[PremiumArticle] Still not found, performing full outbox discovery...");
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
        console.log("[PremiumArticle] Success:", event.id);
        setArticle(event);
      } else {
        console.warn("[PremiumArticle] Exhausted all options. Event not found.");
      }
    } catch (err) {
      console.error("[PremiumArticle] Fetch fatal error:", err);
    } finally {
      clearTimeout(safetyTimeout);
      setLoading(false);
    }
  }, [ndk, hexPubkey, identifier, slug]);

  useEffect(() => {
    if (isReady && ndk && !fetchInitiated.current) {
      fetchInitiated.current = true;
      fetchArticle();
    }
  }, [isReady, ndk, fetchArticle]);

  const handleShare = async () => {
    if (!article) return;
    const title = article.tags.find(t => t[0] === "title")?.[1] || "Untitled Article";
    
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: `Read "${title}" on Tell it!`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        addToast("Link copied to clipboard!", "success");
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
  };

  const jumpToComments = () => {
    commentsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  if (loading && !article) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8 px-6">
        <div className="relative">
          <Loader2 className="animate-spin text-primary" size={56} strokeWidth={3} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="size-2.5 bg-primary rounded-full animate-pulse shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
          </div>
        </div>
        
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-[900] tracking-tight text-foreground">Finding Article</h2>
          <p className="text-muted-foreground text-sm font-medium max-w-xs mx-auto leading-relaxed">
            Connecting to the Nostr network to fetch the latest content from @{slug}...
          </p>
        </div>

        {/* Debug UI */}
        <div className="w-full max-w-sm bg-muted/40 rounded-3xl p-6 border border-border/50 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Network Status</span>
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${isReady ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"}`}>
              {isReady ? "Connected" : "Connecting"}
            </span>
          </div>
          
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
          <button 
            onClick={() => fetchArticle(true)}
            className="group w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={14} className="group-active:animate-spin" />
            Force Sync
          </button>
          
          <a 
            href={`https://njump.me/${hexPubkey}:${identifier}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 bg-muted/50 rounded-2xl text-center font-black uppercase tracking-widest text-[10px] hover:bg-accent transition-colors flex items-center justify-center gap-2"
          >
            Verify on Njump.me <ExternalLink size={12} />
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
          <h1 className="text-2xl font-[900] tracking-tight">Article Not Found</h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto font-medium">
            This content may have been deleted or is currently on unreachable relays.
          </p>
        </div>
        
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <button 
            onClick={() => fetchArticle(true)}
            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg"
          >
            Try Again
          </button>
          <button 
            onClick={() => router.back()}
            className="w-full py-4 bg-muted rounded-2xl font-black uppercase tracking-widest text-[10px]"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  const title = article.tags.find(t => t[0] === 'title')?.[1] || "Untitled Article";
  const image = article.tags.find(t => t[0] === 'image')?.[1];
  const summary = article.tags.find(t => t[0] === 'summary')?.[1];
  const tags = article.tags.filter(t => t[0] === 't').map(t => t[1]);
  const publishedAt = article.created_at;
  const readingTime = getReadingTime(article.content || "");

  return (
    <>
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border flex items-center px-4 py-3 gap-4">
        <button 
          onClick={() => router.back()} 
          className="p-2 hover:bg-accent rounded-full transition-colors shrink-0"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        
        <div className="flex-1 min-w-0 transition-all duration-300">
          <h1 className={cn(
            "text-sm font-black truncate tracking-tight uppercase text-muted-foreground transition-all duration-500",
            showTitleInHeader ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
          )}>
            {title}
          </h1>
          <h1 className={cn(
            "text-xl font-[900] truncate tracking-tight transition-all duration-500 absolute top-3",
            showTitleInHeader ? "opacity-0 translate-y-2 pointer-events-none" : "opacity-100 translate-y-0"
          )}>
            Article
          </h1>
        </div>

        <button 
          onClick={handleShare}
          className="p-2 hover:bg-accent rounded-full transition-colors shrink-0"
          aria-label="Share"
        >
          <Share size={20} />
        </button>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 h-[3px] bg-primary transition-all duration-150 z-30" style={{ width: `${scrollProgress}%` }} />
      </div>

      <article ref={articleRef} className="pb-20">
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
            
            <button 
              onClick={jumpToComments}
              className="flex items-center gap-1.5 font-bold text-primary hover:underline ml-auto"
            >
              <MessageSquare size={14} />
              <span>{replies.length} comments</span>
            </button>
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
        <div ref={commentsRef} className="border-t-8 border-muted/30 scroll-mt-20">
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
