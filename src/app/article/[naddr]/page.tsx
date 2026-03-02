"use client";

import React, { use, useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Loader2, ArrowLeft, Calendar, User, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNDK } from "@/hooks/useNDK";
import { decodeNip19 } from "@/lib/utils/nip19";
import { NDKEvent, NDKUser } from "@nostr-dev-kit/ndk";
import { useProfile } from "@/hooks/useProfile";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { PostContentRenderer } from "@/components/post/parts/PostContent";
import { PostActions } from "@/components/post/parts/PostActions";
import { usePostStats } from "@/hooks/usePostStats";
import { ThreadNode } from "@/components/post/ThreadNode";
import { useThread } from "@/hooks/useThread";
import { shortenPubkey } from "@/lib/utils/nip19";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ArticleDetailPage({ params }: { params: Promise<{ naddr: string }> }) {
  const { naddr } = use(params);
  const { id: hexId, relays, kind, pubkey, identifier } = decodeNip19(naddr);
  const { ndk, isReady } = useNDK();
  const [article, setArticle] = useState<NDKEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const { profile } = useProfile(article?.pubkey);
  const { 
    likes, 
    reposts, 
    comments, 
    quotes, 
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
  } = useThread(article?.id, relays);

  useEffect(() => {
    if (!ndk || !isReady) return;

    const fetchArticle = async () => {
      try {
        let event: NDKEvent | null = null;
        
        if (identifier && pubkey) {
          event = await ndk.fetchEvent({
            kinds: [30023],
            authors: [pubkey],
            "#d": [identifier]
          });
        } else if (hexId) {
          event = await ndk.fetchEvent(hexId);
        }

        if (event) {
          setArticle(event);
        }
      } catch (err) {
        console.error("Failed to fetch article:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [ndk, isReady, hexId, identifier, pubkey]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin text-blue-500" size={40} />
        </div>
      </MainLayout>
    );
  }

  if (!article) {
    return (
      <MainLayout>
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Article not found</h1>
          <button 
            onClick={() => router.back()}
            className="text-blue-500 hover:underline flex items-center justify-center gap-2 mx-auto"
          >
            <ArrowLeft size={20} /> Go back
          </button>
        </div>
      </MainLayout>
    );
  }

  const title = article.tags.find(t => t[0] === 'title')?.[1] || "Untitled Article";
  const image = article.tags.find(t => t[0] === 'image')?.[1];
  const summary = article.tags.find(t => t[0] === 'summary')?.[1];
  const tags = article.tags.filter(t => t[0] === 't').map(t => t[1]);
  const publishedAt = article.created_at;

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
        <h1 className="text-xl font-bold truncate">Article</h1>
      </div>

      <article className="pb-20">
        {/* Hero Image */}
        {image && (
          <div className="w-full aspect-video relative overflow-hidden bg-gray-100 dark:bg-gray-900">
            <img 
              src={image} 
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-4 sm:p-8">
          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6">
            <div className="flex items-center gap-2">
              <img 
                src={profile?.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${article.pubkey}`}
                className="w-6 h-6 rounded-full"
                alt={profile?.name || "Author"}
              />
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {profile?.name || profile?.displayName || shortenPubkey(article.pubkey)}
              </span>
            </div>
            {publishedAt && (
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                {formatDistanceToNow(new Date(publishedAt * 1000), { addSuffix: true })}
              </div>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">
            {title}
          </h1>

          {summary && (
            <p className="text-lg text-gray-600 dark:text-gray-400 italic mb-8 border-l-4 border-gray-200 dark:border-gray-800 pl-4">
              {summary}
            </p>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-gray-900 rounded-md text-xs text-gray-500 flex items-center gap-1">
                  <Tag size={10} /> {tag}
                </span>
              ))}
            </div>
          )}

          <div className="prose prose-blue dark:prose-invert max-w-none">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                img: ({ node, ...props }) => (
                  <img {...props} className="rounded-2xl border border-gray-200 dark:border-gray-800 w-full" />
                ),
                a: ({ node, ...props }) => (
                  <a {...props} className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer" />
                ),
              }}
            >
              {article.content}
            </ReactMarkdown>
          </div>

          <div className="mt-12 pt-6 border-t border-gray-100 dark:border-gray-900">
            <PostActions
              eventId={article.id}
              likes={likes}
              reposts={reposts}
              comments={comments}
              quotes={quotes}
              bookmarks={bookmarks}
              zaps={totalSats}
              userReacted={userLiked ? '+' : null}
              userReposted={userReposted}
            />
          </div>
        </div>

        {/* Replies Section */}
        <div className="border-t-8 border-gray-50 dark:border-gray-900/30">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black sticky top-[57px] z-10">
            <h3 className="font-bold">Comments</h3>
          </div>

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
                      ) : "Show more comments"}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="p-12 text-center text-gray-500 italic text-sm">
                No comments yet.
              </div>
            )}
          </div>
        </div>
      </article>
    </MainLayout>
  );
}
