"use client";

import React, { use } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostCard } from "@/components/post/PostCard";
import { Loader2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useThread } from "@/hooks/useThread";
import { decodeNip19 } from "@/lib/utils/nip19";

import { FeedSkeleton } from "@/components/feed/FeedSkeleton";
import { ThreadNode } from "@/components/post/ThreadNode";
import { PostComposer } from "@/components/post/PostComposer";

export function PostDetailContent({ noteId }: { noteId: string }) {
  const { id: hexId, relays } = decodeNip19(noteId);
  const { 
    focalPost, 
    ancestors, 
    replies, 
    loading, 
    loadingReplies, 
    hasMoreReplies, 
    loadMoreReplies,
    fetchRepliesFor
  } = useThread(hexId, relays);
  const router = useRouter();

  return (
    <MainLayout>
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center px-4 py-3 space-x-6">
        <button 
          onClick={() => router.back()} 
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">Thread</h1>
      </div>

      <div className="pb-20">
        {loading ? (
          <div className="animate-pulse">
            <div className="p-4 border-b border-gray-100 dark:border-gray-900 flex space-x-3">
              <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800" />
              <div className="flex-1 space-y-3 pt-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4" />
                <div className="h-4 bg-gray-100 dark:bg-gray-900 rounded w-full" />
              </div>
            </div>
            <div className="p-4 border-b-4 border-gray-100 dark:border-gray-900 flex flex-col space-y-4">
              <div className="flex space-x-3">
                <div className="w-14 h-14 rounded-full bg-gray-300 dark:bg-gray-700" />
                <div className="flex-1 space-y-3 pt-2">
                  <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4" />
                </div>
              </div>
              <div className="h-20 bg-gray-100 dark:bg-gray-900 rounded-2xl w-full" />
            </div>
            <FeedSkeleton />
          </div>
        ) : (
          <>
            {/* Ancestors with connecting lines */}
            <div className="flex flex-col">
              {ancestors.map((parent, index) => (
                <PostCard 
                  key={parent.id} 
                  event={parent} 
                  threadLine={index === ancestors.length - 1 ? "bottom" : "both"} 
                />
              ))}
            </div>

            {/* Focal Post - Highlighted and connected to ancestors */}
            {focalPost && (
              <>
                <div className="relative border-b border-gray-100 dark:border-gray-900">
                  <PostCard 
                    event={focalPost} 
                    isFocal={true} 
                    threadLine={ancestors.length > 0 ? "top" : "none"} 
                  />
                </div>
                
                {/* Inline Reply Composer */}
                <div className="border-b-8 border-gray-50 dark:border-gray-900/30">
                  <PostComposer 
                    replyTo={focalPost} 
                    placeholder="Post your reply"
                  />
                </div>
              </>
            )}
            
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30 text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center justify-between">
              <span>Replies</span>
              <span className="bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded text-[10px]">{replies.length}</span>
            </div>

            {/* Direct Replies & Nested Threading */}
            <div className="flex flex-col">
              {replies.length > 0 ? (
                <>
                  {replies.map(reply => (
                    <ThreadNode 
                      key={reply.id} 
                      event={reply} 
                      fetchReplies={fetchRepliesFor} 
                    />
                  ))}
                  {hasMoreReplies && (
                    <div className="p-8 text-center border-t border-gray-100 dark:border-gray-900">
                      <button 
                        onClick={() => loadMoreReplies()}
                        disabled={loadingReplies}
                        className="px-6 py-2 bg-gray-100 dark:bg-gray-900 rounded-full text-blue-500 text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                      >
                        {loadingReplies ? (
                          <span className="flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin" />
                            Loading...
                          </span>
                        ) : "Show more top-level replies"}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-12 text-center text-gray-500 italic text-sm">
                  No replies yet. Be the first to reply!
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
