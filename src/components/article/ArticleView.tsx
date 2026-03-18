"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { 
  Loader2, 
  ArrowLeft, 
  Calendar, 
  RefreshCw, 
  ExternalLink, 
  Share, 
  MessageSquare 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { useProfile } from "@/hooks/useProfile";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { PostActions } from "@/components/post/parts/PostActions";
import { usePostStats } from "@/hooks/usePostStats";
import { PostCard } from "@/components/post/PostCard";
import { useThread } from "@/hooks/useThread";
import { shortenPubkey, toNpub } from "@/lib/utils/nip19";
import { ArticleRenderer } from "@/components/article/ArticleRenderer";
import { getReadingTime, cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui";

interface ArticleViewProps {
  article: NDKEvent;
  slug?: string; // Optional vanity slug or npub for the author link
  authorPubkey: string;
}

export function ArticleView({ article, slug, authorPubkey }: ArticleViewProps) {
  const router = useRouter();
  const { addToast } = useUIStore();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showTitleInHeader, setShowTitleInHeader] = useState(false);
  
  const commentsRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLElement>(null);

  const { profile } = useProfile(article.pubkey || authorPubkey);
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
  } = usePostStats(article.id);

  const { 
    replies, 
    loadingReplies, 
    hasMoreReplies, 
    loadMoreReplies,
  } = useThread(article.id);

  const handleScroll = useCallback(() => {
    if (!articleRef.current) return;
    
    const element = articleRef.current;
    const totalHeight = element.clientHeight;
    const windowHeight = window.innerHeight;
    const scrollPosition = window.scrollY;
    
    const progress = (scrollPosition / (totalHeight - windowHeight + 400)) * 100;
    setScrollProgress(Math.min(100, Math.max(0, progress)));
    setShowTitleInHeader(scrollPosition > 400);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const handleShare = async () => {
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

  const title = article.tags.find(t => t[0] === 'title')?.[1] || "Untitled Article";
  const image = article.tags.find(t => t[0] === 'image')?.[1];
  const summary = article.tags.find(t => t[0] === 'summary')?.[1];
  const tags = article.tags.filter(t => t[0] === 't').map(t => t[1]);
  const publishedAt = article.created_at;
  const readingTime = getReadingTime(article.content || "");

  const authorLink = slug ? `/${slug}` : `/${toNpub(article.pubkey || authorPubkey)}`;

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
        
        <div className="flex-1 min-w-0 relative h-6 overflow-hidden">
          <h1 className={cn(
            "text-sm font-black truncate tracking-tight uppercase text-muted-foreground transition-all duration-500 absolute inset-0 flex items-center",
            showTitleInHeader ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
          )}>
            {title}
          </h1>
          <h1 className={cn(
            "text-xl font-[900] truncate tracking-tight transition-all duration-500 absolute inset-0 flex items-center",
            showTitleInHeader ? "opacity-0 translate-y-4 pointer-events-none" : "opacity-100 translate-y-0"
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

      <article ref={articleRef} className="pb-20 bg-background">
        {/* Hero Image */}
        {image && (
          <div className="w-full aspect-[21/9] relative overflow-hidden bg-muted border-b border-border">
            <Image 
              src={image} 
              alt={title}
              fill
              className="object-cover"
              unoptimized
              priority
            />
          </div>
        )}

        <div className="max-w-screen-md mx-auto p-6 sm:p-10">
          {/* Metadata Section */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4 text-sm text-muted-foreground mb-12 border-b border-border pb-8">
            <Link href={authorLink} className="flex items-center gap-3 group">
              <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-border group-hover:border-primary transition-colors shrink-0">
                <Image 
                  src={profile?.picture || `https://robohash.org/${article.pubkey || authorPubkey}?set=set1`}
                  fill
                  className="object-cover"
                  alt={profile?.name || "Author"}
                  unoptimized
                />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-foreground group-hover:text-primary transition-colors leading-tight">
                  {profile?.display_name || profile?.name || shortenPubkey(article.pubkey || authorPubkey)}
                </span>
                {publishedAt && (
                  <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">
                    {format(new Date(publishedAt * 1000), "MMM d, yyyy")}
                  </span>
                )}
              </div>
            </Link>

            <div className="flex items-center gap-4 ml-auto">
              <div className="hidden sm:flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-widest px-3 py-1 bg-muted rounded-full">
                <Calendar size={12} className="text-primary" />
                <span>{readingTime} min read</span>
              </div>
              
              <button 
                onClick={jumpToComments}
                className="flex items-center gap-1.5 font-black text-primary hover:text-primary/80 transition-colors uppercase text-[10px] tracking-widest group"
              >
                <MessageSquare size={14} className="group-hover:scale-110 transition-transform" />
                <span>{replies.length} comments</span>
              </button>
            </div>
          </div>

          <header className="mb-12">
            <h1 className="text-4xl sm:text-6xl font-[1000] mb-8 leading-[1.05] tracking-tighter text-foreground break-words">
              {title}
            </h1>

            {summary && (
              <div className="relative">
                <div className="absolute inset-y-0 -left-6 w-1.5 bg-primary rounded-full hidden sm:block" />
                <p className="text-xl sm:text-2xl text-muted-foreground font-medium leading-relaxed italic">
                  {summary}
                </p>
              </div>
            )}
          </header>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-12">
              {tags.map(tag => (
                <Link 
                  key={tag} 
                  href={`/search?q=${encodeURIComponent(tag)}`}
                  className="px-4 py-1.5 bg-muted/50 hover:bg-primary/10 hover:text-primary text-muted-foreground rounded-full text-[10px] font-black uppercase tracking-widest border border-border transition-all"
                >
                  # {tag}
                </Link>
              ))}
            </div>
          )}

          {/* Main Content */}
          <div className="mt-10 min-h-[300px]">
            <ArticleRenderer 
              content={article.content}
              event={article}
            />
          </div>

          {/* Footer Actions */}
          <div className="mt-20 pt-10 border-t border-border bg-muted/5 rounded-3xl p-6 sm:p-10">
            <div className="flex flex-col items-center gap-8 text-center max-w-sm mx-auto">
              <div className="space-y-2">
                <h4 className="font-black uppercase tracking-tighter text-2xl">Enjoyed this?</h4>
                <p className="text-sm text-muted-foreground font-medium">Show some love to the author by reacting or leaving a comment below.</p>
              </div>
              
              <div className="w-full scale-110 sm:scale-125 origin-center">
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
          </div>
        </div>

        {/* Discussion Section */}
        <div ref={commentsRef} className="mt-10 border-t-8 border-muted/20 scroll-mt-20">
          <div className="max-w-screen-md mx-auto">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="font-[1000] text-xl tracking-tight flex items-center gap-3">
                Discussion
                <span className="text-primary opacity-30 text-3xl font-black">/</span>
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-2xl text-sm font-black">{replies.length}</span>
              </h3>
            </div>

            <div className="flex flex-col divide-y divide-border/50">
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
                    <div className="p-12 text-center">
                      <button 
                        onClick={() => loadMoreReplies()}
                        disabled={loadingReplies}
                        className="px-10 py-4 bg-primary text-primary-foreground rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all shadow-xl shadow-primary/20"
                      >
                        {loadingReplies ? (
                          <span className="flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin" />
                            Synchronizing...
                          </span>
                        ) : "Show more comments"}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-20 text-center flex flex-col items-center gap-4">
                  <div className="size-16 rounded-3xl bg-muted flex items-center justify-center text-muted-foreground/20">
                    <MessageSquare size={32} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-foreground font-black uppercase tracking-widest text-xs">Silence is golden</p>
                    <p className="text-muted-foreground text-sm font-medium">Be the first to share your thoughts.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
