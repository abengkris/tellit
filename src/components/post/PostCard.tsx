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
import { deletePost, repostEvent, requestSummarization } from "@/lib/actions/post";
import { reactToEvent } from "@/lib/actions/reactions";
import { useUIStore } from "@/store/ui";
import { RawEventModal } from "./parts/RawEventModal";
import { ReportModal } from "./parts/ReportModal";
import { ReplyModal } from "./parts/ReplyModal";
import { QuoteModal } from "./parts/QuoteModal";
import { PollRenderer } from "./PollRenderer";
import { shortenPubkey, getEventNip19 } from "@/lib/utils/nip19";
import { getPostUrl, getArticleUrl } from "@/lib/utils/identity";
import { formatFullTimestamp } from "@/lib/utils/date";
import { useLists } from "@/hooks/useLists";
import { ScoredEvent } from "@/lib/feed/types";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ThreadLine = "none" | "top" | "bottom" | "both";

interface PostCardProps {
  event: NDKEvent;
  scoredEvent?: ScoredEvent;
  threadLine?: ThreadLine;
  isFocal?: boolean;
  indent?: number;
  variant?: "feed" | "detail";
}

export const PostCard = memo(({ 
  event, 
  scoredEvent,
  threadLine = "none",
  isFocal = false,
  indent = 0,
  variant = "feed"
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

  const isRepost = event?.kind === 6 || event?.kind === 16;
  const isHighlight = event?.kind === 9802;
  const isQuote = event?.tags.some(t => t[0] === 'q');
  const isReply = event ? (!isEventOriginalPost(event) && !isQuote) : false;
  
  // Call hooks unconditionally
  const { profile: repostAuthorProfile } = useProfile(isRepost ? event?.pubkey : undefined);
  
  const displayEvent = isRepost && repostedEvent ? repostedEvent : event;
  const isArticle = displayEvent?.kind === 30023;
  const isPoll = displayEvent?.kind === 1068;
  
  const { profile, loading: profileLoading, profileUrl } = useProfile(displayEvent?.pubkey);
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
  } = usePostStats(displayEvent?.id);

  useEffect(() => {
    if (isRepost && isReady && ndk && event) {
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
    profile?.display_name || profile?.name || (displayEvent?.pubkey ? shortenPubkey(displayEvent.pubkey) : ""),
  [profile, displayEvent?.pubkey]);

  const avatar = profile?.picture || (profile as { image?: string })?.image;

  const repostAuthorName = useMemo(() => {
    if (!event) return "";
    return event.pubkey === currentUser?.pubkey 
      ? "You" 
      : (repostAuthorProfile?.display_name || repostAuthorProfile?.name || (event.pubkey ? shortenPubkey(event.pubkey) : ""));
  }, [event, currentUser?.pubkey, repostAuthorProfile]);

  const userNpub = useMemo(() => {
    try {
      return displayEvent?.author?.npub || "";
    } catch {
      return "";
    }
  }, [displayEvent]);

  const navigationHref = useMemo(() => {
    if (!displayEvent) return "#";
    if (isArticle) return getArticleUrl(displayEvent, profile);
    return getPostUrl(displayEvent, profile);
  }, [isArticle, displayEvent, profile]);

  const replyingToPubkey = useMemo(() => {
    if (!displayEvent?.tags) return null;
    const replyPTag = displayEvent.tags.find(t => t[0] === 'p' && t[3] === 'reply') || 
                      [...displayEvent.tags].reverse().find(t => t[0] === 'p');
    return replyPTag ? replyPTag[1] : null;
  }, [displayEvent?.tags]);

  // NOW we can have early returns
  // Safety check: if event is missing essential fields, return a small error UI or null
  if (!event || !event.id || !event.pubkey) {
    return (
      <div className="p-4 text-xs text-muted-foreground italic border-b opacity-50">
        Invalid event data
      </div>
    );
  }

  // Ensure displayEvent is valid
  if (!displayEvent || !displayEvent.id) {
    return null; // Or some fallback
  }

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

  const handleEmojiReaction = async (emoji: { shortcode: string, url: string }) => {
    if (!ndk || !isReady) return;
    try {
      await reactToEvent(ndk, displayEvent, `:${emoji.shortcode}:`, emoji.url);
    } catch (err) {
      console.error(err);
      addToast("Failed to send reaction", "error");
    }
  };

  const handlePin = async () => {
    if (!displayEvent.id) return;
    if (isPinned(displayEvent.id)) {
      const success = await unpinPost(displayEvent.id);
      if (success) addToast("Unpinned from profile", "success");
    } else {
      const success = await pinPost(displayEvent.id);
      if (success) addToast("Pinned to profile!", "success");
    }
  };

  const handleMute = async () => {
    if (!displayEvent.pubkey) return;
    if (isMuted(displayEvent.pubkey)) {
      const success = await unmuteUser(displayEvent.pubkey);
      if (success) addToast(`Unmuted ${display_name}`, "success");
    } else {
      const success = await muteUser(displayEvent.pubkey);
      if (success) addToast(`Muted ${display_name}. They will no longer appear in your feeds.`, "success");
    }
  };

  const handleBookmarkToggle = async () => {
    if (!displayEvent.id) return;
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
    const nostrUri = `nostr:${getEventNip19(displayEvent)}`;
    const shareText = (displayEvent.content || "").slice(0, 100) + 
                    ((displayEvent.content || "").length > 100 ? '…' : '') + 
                    `\n\n${nostrUri}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${display_name} on Tell it!`,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error("Error sharing:", err);
        }
      }
    } else {
      try {
        // We'll copy both or just URL? Usually URL is preferred for clipboard,
        // but we can offer a better dropdown if needed. 
        // For now, let's keep clipboard to just the URL but add the URI to share.
        await navigator.clipboard.writeText(shareUrl);
        addToast("Link copied to clipboard!", "success");
      } catch (err) {
        console.error("Error copying to clipboard:", err);
        addToast("Failed to copy link", "error");
      }
    }
  };

  const handleSummarize = async () => {
    if (!ndk) return;
    try {
      addToast("Requesting AI summary...", "info");
      await requestSummarization(ndk, displayEvent);
      addToast("Summary requested! It may take a moment for DVMs to respond.", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to request summary", "error");
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

  try {
    return (
      <article 
        className={cn(
          "group relative flex flex-col px-4 pt-3 pb-2 border-b border-border hover:bg-accent/5 transition-colors overflow-visible",
          variant === "detail" && "hover:bg-transparent px-4 py-0 border-b-0",
          isFocal && "bg-transparent border-l-0"
        )}
        style={{ paddingLeft: `${1 + indent * 1.5}rem` }}
      >
        {variant === "feed" && (
          <Link 
            href={navigationHref}
            className="absolute inset-0 z-0"
            aria-label={`View post by ${display_name}`}
          />
        )}

        <div className="flex relative min-w-0 z-10 pointer-events-none">
          {/* Refined Thread Lines - Centered at 1.5rem (center of w-12 avatar) */}
          {(threadLine === "top" || threadLine === "both") && (
            <div className="absolute top-[-1.5rem] left-[1.5rem] w-0.5 h-[2.5rem] bg-border/60 -translate-x-1/2" />
          )}
          {(threadLine === "bottom" || threadLine === "both") && (
            <div className="absolute top-[3.5rem] bottom-[-1.5rem] left-[1.5rem] w-0.5 bg-border/60 -translate-x-1/2" />
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
              onSummarizeClick={handleSummarize}
              tags={isRepost ? (repostAuthorProfile?.tags || displayEvent.tags) : displayEvent.tags}
              navigationHref={navigationHref}
              variant={variant}
              relevance={scoredEvent}
            />

            {(() => {
              const subject = displayEvent.tags.find(t => t[0] === 'subject')?.[1];
              if (!subject) return null;
              return (
                <div className={cn(
                  "font-bold text-foreground mb-1",
                  variant === "detail" ? "text-2xl mt-4" : "ml-14 text-base"
                )}>
                  {subject}
                </div>
              );
            })()}

            <div className={cn(
              "mt-2",
              variant === "detail" ? "text-xl sm:text-2xl leading-normal mb-6 font-normal tracking-tight" : "text-[15px] sm:text-[16px] ml-14 leading-relaxed"
            )}>
              <PostContentRenderer
                content={displayEvent.content || ""}
                replyingToPubkey={replyingToPubkey}
                isRepost={isRepost}
                isHighlight={isHighlight}
                isArticle={isArticle}
                isQuote={isQuote}
                event={displayEvent}
                className={variant === "detail" ? "prose-2xl" : ""}
                variant={variant}
              />
            </div>

            {isPoll && (
              <div className={cn(variant !== "detail" && "ml-14 mt-3")}>
                <PollRenderer event={displayEvent} />
              </div>
            )}

            {variant === "detail" && (
              <div className="flex flex-col mt-6">
                <div className="py-4 text-muted-foreground text-[15px] border-t border-border/50 flex items-center justify-between">
                  <span>{formatFullTimestamp(displayEvent.created_at)}</span>
                  {(() => {
                    const clientTag = displayEvent.tags.find(t => t[0] === 'client');
                    const clientName = clientTag?.[1];
                    if (!clientName) return null;
                    return (
                      <span className="flex items-center gap-1.5 shrink-0">
                        <span className="opacity-50">·</span>
                        <span className="text-primary font-bold">via {clientName}</span>
                      </span>
                    );
                  })()}
                </div>
                
                {(combinedReposts > 0 || likes > 0 || totalSats > 0 || comments > 0) && (
                  <div className="py-4 border-t border-border/50 flex items-center gap-6 text-[15px]">
                    {comments > 0 && (
                      <div className="flex items-center gap-1 hover:underline cursor-pointer" onClick={() => {}}>
                        <span className="font-bold text-foreground">{comments.toLocaleString()}</span>
                        <span className="text-muted-foreground">Comments</span>
                      </div>
                    )}
                    {combinedReposts > 0 && (
                      <div className="flex items-center gap-1 hover:underline cursor-pointer" onClick={() => {}}>
                        <span className="font-bold text-foreground">{combinedReposts.toLocaleString()}</span>
                        <span className="text-muted-foreground">Reposts</span>
                      </div>
                    )}
                    {likes > 0 && (
                      <div className="flex items-center gap-1 hover:underline cursor-pointer" onClick={() => {}}>
                        <span className="font-bold text-foreground">{likes.toLocaleString()}</span>
                        <span className="text-muted-foreground">Likes</span>
                      </div>
                    )}
                    {totalSats > 0 && (
                      <div className="flex items-center gap-1 hover:underline cursor-pointer" onClick={() => {}}>
                        <span className="font-bold text-foreground">{totalSats.toLocaleString()}</span>
                        <span className="text-muted-foreground">Sats</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className={cn(variant !== "detail" && "ml-14 mt-1")}>
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
                onEmojiReaction={handleEmojiReaction}
                onRepostClick={handleRepost}
                onQuoteClick={handleQuote}
                onShareClick={handleShare}
                variant={variant}
              />
            </div>
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
  } catch (err) {
    console.error("[PostCard] Render crash for event:", event.id, err);
    return (
      <div className="p-4 text-xs text-muted-foreground italic border-b opacity-50">
        Error rendering post content
      </div>
    );
  }
}, (prevProps, nextProps) => {
  return prevProps?.event?.id === nextProps?.event?.id && 
         prevProps?.threadLine === nextProps?.threadLine && 
         prevProps?.isFocal === nextProps?.isFocal &&
         prevProps?.indent === nextProps?.indent;
});
PostCard.displayName = "PostCard";
