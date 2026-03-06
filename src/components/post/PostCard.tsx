"use client";

import React, { useState, useEffect, useMemo } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { useProfile } from "@/hooks/useProfile";
import { usePostStats } from "@/hooks/usePostStats";
import { useNDK } from "@/hooks/useNDK";
import { useAuthStore } from "@/store/auth";
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ZapModal } from "@/components/common/ZapModal";
import { PostHeader } from "./parts/PostHeader";
import { PostContentRenderer } from "./parts/PostContent";
import { PostActions } from "./parts/PostActions";
import { deletePost, repostEvent } from "@/lib/actions/post";
import { reactToEvent } from "@/lib/actions/reactions";
import { useUIStore } from "@/store/ui";
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import { useZaps } from "@/hooks/useZaps";
import { RawEventModal } from "./parts/RawEventModal";
import { ReportModal } from "./parts/ReportModal";
import { ReplyModal } from "./parts/ReplyModal";
import { QuoteModal } from "./parts/QuoteModal";
import { PollRenderer } from "./PollRenderer";
import { shortenPubkey } from "@/lib/utils/nip19";
import { nip19 } from "nostr-tools";
import { useLists } from "@/hooks/useLists";

type ThreadLine = "none" | "top" | "bottom" | "both";

interface PostCardProps {
  event: NDKEvent;
  threadLine?: ThreadLine;
  isFocal?: boolean;
  indent?: number;
}

export const PostCard: React.FC<PostCardProps> = ({ 
  event, 
  threadLine = "none",
  isFocal = false,
  indent = 0
}) => {
  const [repostedEvent, setRepostedEvent] = useState<NDKEvent | null>(null);
  const [repostLoading, setRepostLoading] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const { user: currentUser } = useAuthStore();
  const { ndk, isReady } = useNDK();
  const [showZapModal, setShowZapModal] = useState(false);
  const [showRawModal, setShowRawModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const { addToast } = useUIStore();
  const { 
    isPinned, pinPost, unpinPost, 
    isMuted, muteUser, unmuteUser,
    isBookmarked, bookmarkPost, unbookmarkPost
  } = useLists();

  const isRepost = event.kind === 6 || event.kind === 16;
  const isHighlight = event.kind === 9802;
  const { profile: repostAuthorProfile } = useProfile(isRepost ? event.pubkey : undefined);
  
  const displayEvent = isRepost && repostedEvent ? repostedEvent : event;
  const isArticle = displayEvent.kind === 30023;
  const isComment = displayEvent.kind === 1111;
  const isPoll = displayEvent.kind === 1068;
  const { profile } = useProfile(displayEvent.pubkey);
  const { 
    likes, 
    reposts, 
    comments, 
    quotes, 
    bookmarks,
    totalSats, 
    userLiked, 
    userReposted 
  } = usePostStats(displayEvent.id);

  useEffect(() => {
    if (isRepost && isReady && ndk) {
      // 1. Priority: Try to parse content as JSON if it contains the full event
      if (event.content && event.content.trim().startsWith('{')) {
        try {
          const raw = JSON.parse(event.content);
          // Basic validation that it looks like an event
          if (raw.id && raw.pubkey && raw.content !== undefined) {
            const ev = new NDKEvent(ndk, raw);
            setRepostedEvent(ev);
            setRepostLoading(false);
            return; // Success, no need to fetch
          }
        } catch {
          // Not valid JSON or partial, proceed to fetch
        }
      }

      // 2. Fallback: Fetch from relays if content is missing or invalid
      const eTag = event.tags.find(t => t[0] === 'e');
      const aTag = event.tags.find(t => t[0] === 'a');
      const targetId = eTag?.[1] || aTag?.[1];

      if (targetId) {
        setRepostLoading(true);
        ndk.fetchEvent(targetId)
          .then(ev => {
            if (ev) setRepostedEvent(ev);
            setRepostLoading(false);
          })
          .catch(() => setRepostLoading(false));
      }
    }
  }, [isRepost, event, isReady, ndk]);

  const displayName = useMemo(() => 
    profile?.name || profile?.displayName || shortenPubkey(displayEvent.pubkey),
  [profile, displayEvent.pubkey]);

  const avatar = useMemo(() => 
    profile?.picture || `https://robohash.org/${displayEvent.pubkey}?set=set1`,
  [profile, displayEvent.pubkey]);

  const repostAuthorName = useMemo(() => {
    return event.pubkey === currentUser?.pubkey 
      ? "You" 
      : (repostAuthorProfile?.name || repostAuthorProfile?.displayName || shortenPubkey(event.pubkey));
  }, [event.pubkey, currentUser?.pubkey, repostAuthorProfile]);

  const userNpub = displayEvent.author.npub;
  const eventNoteId = useMemo(() => {
    if (isArticle) {
      const dTag = displayEvent.tags.find(t => t[0] === 'd')?.[1] || "";
      return nip19.naddrEncode({
        kind: 30023,
        pubkey: displayEvent.pubkey,
        identifier: dTag
      });
    }
    return displayEvent.encode();
  }, [displayEvent, isArticle]);

  const navigationHref = useMemo(() => {
    if (isArticle) return `/article/${eventNoteId}`;
    
    // For comments (Kind 1111), if they are specifically on articles, 
    // we could route to /article/... but /post/... handles the thread view better for now.
    return `/post/${eventNoteId}`;
  }, [isArticle, eventNoteId]);

  const replyingToPubkey = useMemo(() => {
    const replyPTag = displayEvent.tags.find(t => t[0] === 'p' && t[3] === 'reply') || 
                      [...displayEvent.tags].reverse().find(t => t[0] === 'p');
    return replyPTag ? replyPTag[1] : null;
  }, [displayEvent.tags]);

  const handleDelete = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!ndk || !displayEvent.id) return;
    
    try {
      const success = await deletePost(ndk, displayEvent.id);
      if (success) {
        setIsDeleted(true);
        addToast("Post deletion request sent", "success");
      } else {
        addToast("Failed to delete post", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Error deleting post", "error");
    }
  };

  const handleQuote = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowQuoteModal(true);
  };

  const handleRepost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!ndk || !isReady) return;
    
    try {
      await repostEvent(ndk, displayEvent);
    } catch (err) {
      console.error(err);
      addToast("Failed to repost", "error");
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!ndk || !isReady) return;

    try {
      // If already liked, we don't have a direct "unlike" in NIP-25 
      // other than deleting the reaction event, which we don't track yet.
      // So we just allow liking.
      if (userLiked) return;
      await reactToEvent(ndk, displayEvent, "+");
    } catch (err) {
      console.error(err);
      addToast("Failed to like post", "error");
    }
  };

  const handlePin = async () => {
    if (isPinned(displayEvent.id)) {
      const success = await unpinPost(displayEvent.id);
      if (success) addToast("Unpinned from profile", "success");
    } else {
      const success = await pinPost(displayEvent.id);
      if (success) addToast("Pinned to profile!", "success");
    }
  };

  const handleMute = async () => {
    if (isMuted(displayEvent.pubkey)) {
      const success = await unmuteUser(displayEvent.pubkey);
      if (success) addToast(`Unmuted ${displayName}`, "success");
    } else {
      const success = await muteUser(displayEvent.pubkey);
      if (success) addToast(`Muted ${displayName}. They will no longer appear in your feeds.`, "success");
    }
  };

  const handleBookmarkToggle = async () => {
    if (isBookmarked(displayEvent.id)) {
      const success = await unbookmarkPost(displayEvent.id);
      if (success) addToast("Removed from bookmarks", "success");
    } else {
      const success = await bookmarkPost(displayEvent.id);
      if (success) addToast("Added to bookmarks!", "success");
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}${navigationHref}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${displayName} on Tell it!`,
          text: displayEvent.content.slice(0, 100) + (displayEvent.content.length > 100 ? '...' : ''),
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error("Error sharing:", err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        addToast("Link copied to clipboard!", "success");
      } catch (err) {
        console.error("Error copying to clipboard:", err);
        addToast("Failed to copy link", "error");
      }
    }
  };

  if (isDeleted || (currentUser?.pubkey !== displayEvent.pubkey && isMuted(displayEvent.pubkey))) return null;

  if (isRepost && repostLoading) {
    return (
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 animate-pulse">
        <div className="flex items-center space-x-2 text-gray-500 text-xs font-bold mb-2 ml-10">
          <div className="w-4 h-4 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="w-32 h-3 bg-gray-200 dark:bg-gray-800 rounded" />
        </div>
        <div className="flex gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800 shrink-0" />
          <div className="flex-1 space-y-2 mt-1">
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/4" />
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <article 
      className={`group relative flex flex-col p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors dark:border-gray-800 dark:hover:bg-gray-900/50 ${
        isFocal ? "bg-blue-50/5 dark:bg-blue-900/5 border-l-4 border-l-blue-500" : ""
      }`}
      style={{ paddingLeft: `${1 + indent * 1.5}rem` }}
    >
      {/* Stretched Link for Accessibility */}
      <Link 
        href={navigationHref}
        className="absolute inset-0 z-0"
        aria-label={`View ${isArticle ? 'article' : isComment ? 'comment' : 'post'} by ${displayName}`}
      />

      <div className="flex relative min-w-0 z-10 pointer-events-none">
        {/* Thread Lines */}
        {(threadLine === "top" || threadLine === "both") && (
          <div className="absolute top-[-1.5rem] left-6 w-0.5 h-[2.5rem] bg-gray-200 dark:bg-gray-800" />
        )}
        {(threadLine === "bottom" || threadLine === "both") && (
          <div className="absolute top-[3rem] bottom-[-1.5rem] left-6 w-0.5 bg-gray-200 dark:bg-gray-800" />
        )}

        {/* Content Area */}
        <div className="flex-1 min-w-0 overflow-hidden pointer-events-auto">
          <PostHeader
            displayName={displayName}
            avatar={avatar}
            userNpub={userNpub}
            pubkey={displayEvent.pubkey}
            nip05={profile?.nip05}
            createdAt={displayEvent.created_at}
            isRepost={isRepost}
            repostAuthorName={repostAuthorName}
            bot={profile?.bot}
            isArticle={isArticle}
            isPoll={isPoll}
            isPinned={isPinned(displayEvent.id)}
            isMuted={isMuted(displayEvent.pubkey)}
            isBookmarked={isBookmarked(displayEvent.id)}
            onPinClick={currentUser?.pubkey === displayEvent.pubkey ? handlePin : undefined}
            onMuteClick={currentUser?.pubkey !== displayEvent.pubkey ? handleMute : undefined}
            onBookmarkClick={handleBookmarkToggle}
            onDeleteClick={currentUser?.pubkey === displayEvent.pubkey ? handleDelete : undefined}
            onReportClick={currentUser?.pubkey !== displayEvent.pubkey ? () => setShowReportModal(true) : undefined}
            onMoreClick={() => setShowRawModal(true)}
            tags={isRepost ? (repostAuthorProfile?.tags || displayEvent.tags) : displayEvent.tags}
          />

          <PostContentRenderer
            content={displayEvent.content}
            replyingToPubkey={replyingToPubkey}
            isRepost={isRepost}
            isHighlight={isHighlight}
            isArticle={isArticle}
            event={displayEvent}
          />

          {isPoll && (
            <PollRenderer event={displayEvent} />
          )}

          <PostActions
            eventId={displayEvent.id}
            likes={likes}
            reposts={reposts}
            comments={comments}
            quotes={quotes}
            bookmarks={bookmarks}
            zaps={totalSats}
            userReacted={userLiked ? '+' : null}
            userReposted={userReposted}
            onZapClick={() => setShowZapModal(true)}
            onReplyClick={() => setShowReplyModal(true)}
            onLikeClick={handleLike}
            onRepostClick={handleRepost}
            onQuoteClick={handleQuote}
            onShareClick={handleShare}
          />
        </div>
      </div>

      {showReplyModal && (
        <div className="relative">
          <ReplyModal
            event={displayEvent}
            onClose={() => setShowReplyModal(false)}
          />
        </div>
      )}

      {showQuoteModal && (
        <div className="relative">
          <QuoteModal
            event={displayEvent}
            onClose={() => setShowQuoteModal(false)}
          />
        </div>
      )}

      {showZapModal && (
        <div className="relative">
          <ZapModal
            event={displayEvent}
            onClose={() => setShowZapModal(false)}
          />
        </div>
      )}

      {showRawModal && (
        <div className="relative">
          <RawEventModal
            event={displayEvent}
            isOpen={showRawModal}
            onClose={() => setShowRawModal(false)}
          />
        </div>
      )}

      {showReportModal && (
        <div className="relative">
          <ReportModal
            targetPubkey={displayEvent.pubkey}
            targetEventId={displayEvent.id}
            isOpen={showReportModal}
            onClose={() => setShowReportModal(false)}
          />
        </div>
      )}
    </article>
  );
};
