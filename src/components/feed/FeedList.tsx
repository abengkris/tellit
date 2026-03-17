"use client";

import React, { useEffect, useRef } from "react";
import { PostCard } from "@/components/post/PostCard";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { FeedSkeleton } from "./FeedSkeleton";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { WhoToFollow } from "@/components/profile/WhoToFollow";
import { Search, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface FeedListProps {
  posts: NDKEvent[];
  isLoading: boolean;
  loadMore: () => void;
  hasMore: boolean;
  emptyMessage?: string;
  showSuggestions?: boolean;
}

export function FeedList({ 
  posts, 
  isLoading, 
  loadMore, 
  hasMore, 
  emptyMessage = "Nothing to see here yet.",
  showSuggestions = false
}: FeedListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  
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
      <div className="flex flex-col">
        {posts.map((event, index) => {
          if (!event || !event.id) return null;
          
          return (
            <div 
              key={event.id} 
              className="flex flex-col"
              style={{ contentVisibility: "auto", containIntrinsicSize: "0 200px" }}
            >
              <ErrorBoundary fallback={
                <div className="p-4 text-xs text-muted-foreground italic border-b">
                  Failed to render post {event.id ? event.id.slice(0, 8) : "unknown"}…
                </div>
              }>
                <PostCard event={event} />
              </ErrorBoundary>
              {index < posts.length - 1 && <Separator />}
              {showSuggestions && index === 4 && (
                <div style={{ contentVisibility: "auto", containIntrinsicSize: "0 400px" }}>
                  <WhoToFollow />
                  <Separator />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Load more trigger + indicator */}
      <div ref={bottomRef} className="py-12 flex justify-center">
        {hasMore && posts.length > 0 && (
          <div className="flex gap-1.5" aria-label="Loading more posts…">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2.5 h-2.5 bg-primary/40 rounded-full animate-bounce motion-reduce:animate-none"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        )}
        {!hasMore && posts.length > 0 && (
          <p className="text-muted-foreground text-sm font-bold">You&apos;ve reached the end of the road</p>
        )}
      </div>
    </div>
  );
}
