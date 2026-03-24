"use client";

import React, { useEffect, useRef, useState, useLayoutEffect } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { PostCard } from "@/components/post/PostCard";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { FeedSkeleton } from "./FeedSkeleton";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { ScoredEvent } from "@/lib/feed/types";
import { WhoToFollow } from "@/components/profile/WhoToFollow";
import { Search, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface FeedListProps {
  posts: NDKEvent[];
  scoredEvents?: ScoredEvent[];
  isLoading: boolean;
  loadMore: () => void;
  hasMore: boolean;
  emptyMessage?: string;
  showSuggestions?: boolean;
}

export function FeedList({ 
  posts, 
  scoredEvents,
  isLoading, 
  loadMore, 
  hasMore, 
  emptyMessage = "Nothing to see here yet.",
  showSuggestions = false
}: FeedListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    if (parentRef.current) {
      setScrollMargin(parentRef.current.offsetTop);
    }
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: posts.length,
    estimateSize: () => 300,
    overscan: 10,
    scrollMargin,
  });

  const virtualItems = virtualizer.getVirtualItems();
  
  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { rootMargin: "400px" } 
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isLoading, loadMore]);

  return (
    <div className="relative">
      {/* Loading skeleton for initial load */}
      {isLoading && posts.length === 0 && (
        <FeedSkeleton />
      )}

      {/* Empty state */}
      {!isLoading && posts.length === 0 && (
        <div className="flex flex-col items-center">
          <div className="py-16 text-center px-4 w-full">
            <p className="text-4xl mb-3" aria-hidden="true">🌐</p>
            <p className="text-xl font-black">{emptyMessage}</p>
            <p className="text-sm mt-2 mb-8 max-w-xs mx-auto text-muted-foreground font-medium">Nostr is better with friends. Start by following someone or share your first thought!</p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" className="rounded-full font-black px-8 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                <Link href="/search" aria-label="Find people to follow">
                  <Search data-icon="inline-start" />
                  Find People to Follow
                </Link>
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="rounded-full font-black px-8"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                aria-label="Create your first post"
              >
                <Plus data-icon="inline-start" />
                Create a Post
              </Button>
            </div>
          </div>
          
          <div className="w-full max-w-lg">
            <Separator />
            <WhoToFollow />
          </div>
        </div>
      )}

      {/* Feed */}
      <div 
        ref={parentRef}
        className="relative w-full" 
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualItems.map((virtualItem) => {
          const event = posts[virtualItem.index];
          if (!event || !event.id) return null;
          
          const scoredEvent = scoredEvents?.find(se => se.event.id === event.id);
          const isLast = virtualItem.index === posts.length - 1;
          
          return (
            <div 
              key={virtualItem.key} 
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full flex flex-col"
              style={{ transform: `translateY(${virtualItem.start - virtualizer.options.scrollMargin}px)` }}
            >
              <ErrorBoundary fallback={
                <div className="p-4 text-xs text-muted-foreground italic border-b">
                  Failed to render post {event.id ? event.id.slice(0, 8) : "unknown"}…
                </div>
              }>
                <PostCard event={event} scoredEvent={scoredEvent} />
              </ErrorBoundary>
              {!isLast && <Separator />}
              
              {/* Insert suggestions after 5th item */}
              {showSuggestions && virtualItem.index === 4 && (
                <div className="bg-background">
                  <WhoToFollow />
                  <Separator />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Load more trigger + indicator */}
      <div ref={bottomRef} className="py-16 flex flex-col items-center justify-center">
        {hasMore && posts.length > 0 && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in duration-700">
            <div className="flex gap-1.5" aria-label="Loading more posts…">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 150}ms`, animationDuration: '1s' }}
                />
              ))}
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
              Fetching more magic
            </span>
          </div>
        )}
        {!hasMore && posts.length > 0 && (
          <div className="flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="w-8 h-1 bg-border rounded-full mb-2" />
            <p className="text-muted-foreground text-xs font-black uppercase tracking-widest">You&apos;ve reached the end</p>
          </div>
        )}
      </div>
    </div>
  );
}
