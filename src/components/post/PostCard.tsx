"use client";

import React, { useState, useEffect, useMemo, memo } from "react";
import { NDKEvent, isEventOriginalPost } from "@nostr-dev-kit/ndk";
import { useProfile } from "@/hooks/useProfile";
import { usePostStats } from "@/hooks/usePostStats";
import { useNDK } from "@/hooks/useNDK";
import { useAuthStore } from "@/store/auth";
import Link from "next/link";
import { ZapModal } from "@/components/common/ZapModal";
import { PostHeader } from "./parts/PostHeader";
import { PostContentRenderer } from "./parts/PostContent";
import { PostActions } from "./parts/PostActions";
import { deletePost, repostEvent } from "@/lib/actions/post";
import { reactToEvent } from "@/lib/actions/reactions";
import { useUIStore } from "@/store/ui";
import { RawEventModal } from "./parts/RawEventModal";
import { ReportModal } from "./parts/ReportModal";
import { ReplyModal } from "./parts/ReplyModal";
import { QuoteModal } from "./parts/QuoteModal";
import { PollRenderer } from "./PollRenderer";
import { shortenPubkey } from "@/lib/utils/nip19";
import { useLists } from "@/hooks/useLists";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ThreadLine = "none" | "top" | "bottom" | "both";

interface PostCardProps {
  event: NDKEvent;
  threadLine?: ThreadLine;
  isFocal?: boolean;
  indent?: number;
}

export const PostCard = memo(({ 
  event, 
  threadLine = "none",
  isFocal = false,
  indent = 0
}: PostCardProps) => {
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
  const isReply = !isEventOriginalPost(event);
  const { profile: repostAuthorProfile } = useProfile(isRepost ? event.pubkey : undefined);
  
  const displayEvent = isRepost && repostedEvent ? repostedEvent : event;
  const isArticle = displayEvent.kind === 30023;
  const isPoll = displayEvent.kind === 1068;
  const { profile, loading: profileLoading, profileUrl } = useProfile(displayEvent.pubkey);
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
  } = usePostStats(displayEvent.id);

  useEffect(() => {
    if (isRepost && isReady && ndk) {
      if (event.content && event.content.trim().startsWith('{')) {
        try {
          const raw = JSON.parse(event.content);
          if (raw.id && raw.pubkey && raw.content !== undefined) {
            const ev = new NDKEvent(ndk, raw);
            Promise.resolve().then(() => {
              setRepostedEvent(ev);
              setRepostLoading(false);
            });
            return;
          }
        } catch {
          // Ignore parse errors
        }
      }

      const eTag = event.tags.find(t => t[0] === 'e');
      const aTag = event.tags.find(t => t[0] === 'a');
      const targetId = eTag?.[1] || aTag?.[1];

      if (targetId) {
        Promise.resolve().then(() => setRepostLoading(true));
        ndk.fetchEvent(targetId)
          .then(ev => {
            if (ev) setRepostedEvent(ev);
            setRepostLoading(false);
          })
          .catch(() => setRepostLoading(false));
      }
    }
  }, [isRepost, event, isReady, ndk]);

  const display_name = useMemo(() => 
    profile?.display_name || profile?.name || shortenPubkey(displayEvent.pubkey),
  [profile, displayEvent.pubkey]);

  const avatar = profile?.picture || (profile as { image?: string })?.image;

  const repostAuthorName = useMemo(() => {
    return event.pubkey === currentUser?.pubkey 
      ? "You" 
      : (repostAuthorProfile?.display_name || repostAuthorProfile?.name || shortenPubkey(event.pubkey));
  }, [event.pubkey, currentUser?.pubkey, repostAuthorProfile]);

  const userNpub = displayEvent.author.npub;
  const eventNoteId = useMemo(() => {
    return displayEvent.encode();
  }, [displayEvent]);

  const navigationHref = useMemo(() => {
    if (isArticle) return `/article/${eventNoteId}`;
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
      if (success) addToast(`Unmuted ${display_name}`, "success");
    } else {
      const success = await muteUser(displayEvent.pubkey);
      if (success) addToast(`Muted ${display_name}. They will no longer appear in your feeds.`, "success");
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
          title: `Post by ${display_name} on Tell it!`,
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
      <div className="p-4 border-b border-border animate-pulse">
        <div className="flex items-center gap-2 mb-3 ml-10">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-3 w-32 rounded" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="size-12 rounded-full shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <Skeleton className="h-4 w-1/4 rounded" />
            <Skeleton className="h-4 w-full rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <article 
      className={cn(
        "group relative flex flex-col p-4 border-b border-border hover:bg-accent/30 transition-colors overflow-visible",
        isFocal && "bg-primary/5 border-l-4 border-l-primary"
      )}
      style={{ paddingLeft: `${1 + indent * 1.5}rem` }}
    >
      <Link 
        href={navigationHref}
        className="absolute inset-0 z-0"
        aria-label={`View post by ${display_name}`}
      />

      <div className="flex relative min-w-0 z-10 pointer-events-none">
        {/* Simplified Thread Lines */}
        {(threadLine === "top" || threadLine === "both") && (
          <div className="absolute top-[-1.5rem] left-5 w-0.5 h-[2.5rem] bg-border/50" />
        )}
        {(threadLine === "bottom" || threadLine === "both") && (
          <div className="absolute top-[3.5rem] bottom-[-1.5rem] left-5 w-0.5 bg-border/50" />
        )}

        {/* Content Area */}
        <div className="flex-1 min-w-0 overflow-visible pointer-events-auto z-10">
          <PostHeader
            display_name={display_name}
            name={profile?.name}
            avatar={avatar}
            isLoading={profileLoading}
            userNpub={userNpub}
            profileUrl={profileUrl}
            pubkey={displayEvent.pubkey}
            nip05={profile?.nip05}
            createdAt={displayEvent.created_at}
            isRepost={isRepost}
            isReply={isReply}
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
            navigationHref={navigationHref}
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
            authorPubkey={displayEvent.pubkey}
            likes={likes}
            reposts={reposts}
            comments={comments}
            quotes={quotes}
            combinedReposts={combinedReposts}
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
}, (prevProps, nextProps) => {
  return prevProps.event.id === nextProps.event.id && 
         prevProps.threadLine === nextProps.threadLine && 
         prevProps.isFocal === nextProps.isFocal &&
         prevProps.indent === nextProps.indent;
});
PostCard.displayName = "PostCard";
