"use client";

import React from "react";
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
    <>
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-border flex items-center px-4 py-2 space-x-8 h-14">
        <button 
          onClick={() => router.back()} 
          className="p-2 hover:bg-accent rounded-full transition-colors -ml-2"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">Post</h1>
      </div>

      <div className="pb-20">
        {loading ? (
          <div className="animate-pulse">
            <div className="p-4 border-b border-border/50 flex space-x-3">
              <div className="w-12 h-12 rounded-full bg-muted" />
              <div className="flex-1 space-y-3 pt-1">
                <div className="h-4 bg-muted rounded w-1/4" />
                <div className="h-4 bg-muted rounded w-full" />
              </div>
            </div>
            <FeedSkeleton />
          </div>
        ) : !focalPost ? (
          <div className="p-12 text-center flex flex-col items-center gap-4">
            <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-2">
              <Loader2 size={32} className="text-muted-foreground opacity-20" />
            </div>
            <h2 className="text-xl font-black">Post not found</h2>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              This note may have been deleted or the relays are currently unreachable.
            </p>
            <button 
              onClick={() => router.back()}
              className="mt-4 px-8 py-3 bg-primary text-primary-foreground rounded-full font-black shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
            >
              Go Back
            </button>
          </div>
        ) : (
          <>
            {/* Ancestors with connecting lines */}
            <div className="flex flex-col">
              {ancestors.map((parent, index) => (
                <PostCard 
                  key={parent.id} 
                  event={parent} 
                  threadLine={index === 0 ? "bottom" : "both"} 
                  variant="feed"
                />
              ))}
            </div>

            {/* Focal Post */}
            {focalPost && (
              <div className="relative">
                <PostCard 
                  event={focalPost} 
                  isFocal={true} 
                  variant="detail"
                  threadLine={ancestors.length > 0 ? "top" : "none"} 
                />
                
                {/* Inline Reply Composer */}
                <div className="border-b border-border px-4 py-1">
                  <PostComposer 
                    replyTo={focalPost} 
                    placeholder="Post your reply"
                    autoFocus={false}
                  />
                </div>
              </div>
            )}
            
            {/* Direct Replies Only (Flattened) */}
            <div className="flex flex-col">
              {replies.length > 0 ? (
                <>
                  {replies.map((reply, index) => (
                    <PostCard 
                      key={reply.id} 
                      event={reply} 
                      variant="feed"
                      threadLine={index === 0 && ancestors.length === 0 && !focalPost ? "none" : "none"}
                    />
                  ))}
                  {hasMoreReplies && (
                    <div className="p-8 text-center border-t border-border/50">
                      <button 
                        onClick={() => loadMoreReplies()}
                        disabled={loadingReplies}
                        className="px-6 py-2 bg-muted rounded-full text-primary text-[15px] font-bold hover:bg-accent disabled:opacity-50 transition-colors"
                      >
                        {loadingReplies ? (
                          <span className="flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin" />
                            Loading…
                          </span>
                        ) : "Show more replies"}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-12 text-center text-muted-foreground italic text-[15px]">
                  No replies yet. Be the first to reply!
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
