"use client";

import React, { useEffect, useRef } from "react";
import { PostCard } from "@/components/post/PostCard";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { FeedSkeleton } from "./FeedSkeleton";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { WhoToFollow } from "@/components/profile/WhoToFollow";
import { Search, Plus } from "lucide-react";
import Link from "next/link";

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
          <div className="py-16 text-center text-gray-500 px-4 w-full">
            <p className="text-4xl mb-3">🌐</p>
            <p className="text-lg font-black text-gray-900 dark:text-white">{emptyMessage}</p>
            <p className="text-sm mt-2 mb-8 max-w-xs mx-auto">Nostr is better with friends. Start by following someone or share your first thought!</p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link 
                href="/search"
                className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-black transition-all shadow-lg shadow-blue-500/20 active:scale-95"
              >
                <Search size={18} />
                Find People to Follow
              </Link>
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-900 dark:text-white rounded-2xl font-black transition-all active:scale-95"
              >
                <Plus size={18} />
                Create a Post
              </button>
            </div>
          </div>
          
          <div className="w-full max-w-lg border-t border-gray-100 dark:border-gray-900">
            <WhoToFollow />
          </div>
        </div>
      )}

      {/* Feed */}
      <div className="divide-y divide-gray-100 dark:divide-gray-900">
        {posts.map((event, index) => (
          <React.Fragment key={event.id}>
            <ErrorBoundary fallback={
              <div className="p-4 text-xs text-gray-500 italic border-b border-gray-100 dark:divide-gray-900">
                Failed to render post {event.id.slice(0, 8)}…
              </div>
            }>
              <PostCard event={event} />
            </ErrorBoundary>
            {showSuggestions && index === 4 && <WhoToFollow />}
          </React.Fragment>
        ))}
      </div>

      {/* Load more trigger + indicator */}
      <div ref={bottomRef} className="py-12 flex justify-center">
        {hasMore && posts.length > 0 && (
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 bg-blue-500/40 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        )}
        {!hasMore && posts.length > 0 && (
          <p className="text-gray-500 text-sm font-medium">You&apos;ve reached the end of the road</p>
        )}
      </div>
    </div>
  );
}
