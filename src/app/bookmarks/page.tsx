"use client";

import React from "react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { PostCard } from "@/components/post/PostCard";
import { FeedSkeleton } from "@/components/feed/FeedSkeleton";
import { Bookmark, Ghost } from "lucide-react";

export default function BookmarksPage() {
  const { events, loading } = useBookmarks();

  return (
    <>
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 p-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Bookmark className="text-blue-500" size={24} />
          Bookmarks
        </h1>
      </div>

      <div className="pb-20">
        {loading ? (
          <FeedSkeleton />
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-500 text-center">
            <div className="bg-gray-100 dark:bg-gray-900 p-6 rounded-full mb-4">
              <Bookmark size={48} className="opacity-20" />
            </div>
            <p className="text-lg font-medium">Save posts for later</p>
            <p className="text-sm mt-2">Bookmark posts to easily find them again. Only you can see your bookmarks.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-900">
            {events.map((event) => (
              <PostCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
