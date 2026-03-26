"use client";

import React, { useState, useEffect, useMemo, memo } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { useProfile } from "@/hooks/useProfile";
import { usePostStats } from "@/hooks/usePostStats";
import { useNDK } from "@/hooks/useNDK";
import { useAuthStore } from "@/store/auth";
import Link from "next/link";
import { ZapModal } from "@/components/common/ZapModal";
import { PostHeader } from "./parts/PostHeader";
import { PostContentRenderer } from "./parts/PostContent";
import { PostActions } from "./parts/PostActions";
import { deletePost, requestSummarization } from "@/lib/actions/post";
import { useNostrifyPublish } from "@/hooks/useNostrifyPublish";
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
import { Avatar } from "../common/Avatar";
import { Card, CardContent } from "@/components/ui/card";

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
  const { react, repost } = useNostrifyPublish();
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
  
  const { profile: repostAuthorProfile } = useProfile(isRepost ? event?.pubkey : undefined);
  
  const displayEvent = isRepost && repostedEvent ? repostedEvent : event;
  const isArticle = displayEvent?.kind === 30023;
  const isPoll = displayEvent?.kind === 1068;
  
  const { profile, loading: profileLoading, profileUrl } = useProfile(displayEvent?.pubkey);
  const { 
    likes, 
    reposts: repostsCount, 
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
          // Ignore
        }
      }

      const eTag = event.tags.find(t => t[0] === 'e');
      const targetId = eTag?.[1];

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

  const avatar = profile?.picture || (profile as Record<string, unknown> | undefined)?.image as string | undefined;

  const repostAuthorName = useMemo(() => {
    if (!event) return "";
    return event.pubkey === currentUser?.pubkey 
      ? "You" 
      : (repostAuthorProfile?.display_name || repostAuthorProfile?.name || (event.pubkey ? shortenPubkey(event.pubkey) : ""));
  }, [event, currentUser?.pubkey, repostAuthorProfile]);

  const userNpub = useMemo(() => {
    try {
      return (displayEvent as NDKEvent & { author?: { npub?: string } }).author?.npub || "";
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

  if (!event || !event.id || !event.pubkey) {
    return (
      <div className="p-4 text-xs text-muted-foreground italic border-b opacity-50">
        Invalid event data
      </div>
    );
  }

  if (!displayEvent || !displayEvent.id) {
    return null;
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
    try {
      await repost(displayEvent);
    } catch (err) {
      console.error(err);
      addToast("Failed to repost", "error");
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (userLiked) return;
      await react(displayEvent, "+");
    } catch (err) {
      console.error(err);
      addToast("Failed to like post", "error");
    }
  };

  const handleEmojiReaction = async (emoji: { shortcode: string, url: string }) => {
    try {
      await react(displayEvent, `:${emoji.shortcode}:`, emoji.url);
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

  if (isDeleted) return null;

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
    <Card 
      className={cn(
        "border-0 border-b border-border/50 rounded-none bg-transparent hover:bg-muted/30 transition-colors",
        isFocal ? "bg-muted/10 border-b-0" : "",
        indent > 0 ? "ml-4 border-l border-border/50" : ""
      )}
    >
      <CardContent className={cn("p-4 pb-2", indent > 0 ? "pl-4" : "")}>
        <div className="flex space-x-3">
          {/* Thread lines */}
          <div className="flex flex-col items-center">
            <div className={cn("w-0.5 grow", (threadLine === "top" || threadLine === "both") ? "bg-border/50" : "bg-transparent")} />
            <Avatar 
              pubkey={displayEvent.pubkey} 
              src={avatar} 
              size={variant === "detail" ? 52 : 48}
              className="z-10"
            />
            <div className={cn("w-0.5 grow mt-2", (threadLine === "bottom" || threadLine === "both") ? "bg-border/50" : "bg-transparent")} />
          </div>

          <div className="flex-1 min-w-0">
            <PostHeader 
              display_name={display_name}
              avatar={avatar}
              isLoading={profileLoading}
              userNpub={userNpub}
              profileUrl={profileUrl}
              pubkey={displayEvent.pubkey}
              nip05={profile?.nip05}
              createdAt={displayEvent.created_at}
              isRepost={isRepost}
              isReply={false}
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
            
            {replyingToPubkey && variant === "feed" && (
              <div className="text-[13px] text-muted-foreground mt-0.5 mb-1">
                Replying to <Link href={`/p/${replyingToPubkey}`} className="text-primary hover:underline">@{shortenPubkey(replyingToPubkey)}</Link>
              </div>
            )}

            {(() => {
              const subj = displayEvent.tags.find(t => t[0] === 'subject')?.[1];
              if (!subj) return null;
              return (
                <div className={cn(
                  "font-bold text-foreground mb-1",
                  variant === "detail" ? "text-2xl mt-4" : "text-base"
                )}>
                  {subj}
                </div>
              );
            })()}

            <div className={cn(
              "mt-2",
              variant === "detail" ? "text-xl sm:text-2xl leading-normal mb-6 font-normal tracking-tight" : "text-[15px] sm:text-[16px] leading-relaxed"
            )}>
              <PostContentRenderer
                content={displayEvent.content || ""}
                event={displayEvent}
                replyingToPubkey={replyingToPubkey}
                isRepost={isRepost}
                isHighlight={isHighlight}
                isArticle={isArticle}
                isQuote={isQuote}
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

            <PostActions 
              eventId={displayEvent.id}
              authorPubkey={displayEvent.pubkey}
              likes={likes}
              reposts={repostsCount}
              comments={comments}
              quotes={quotes}
              combinedReposts={combinedReposts}
              bookmarks={bookmarks}
              zaps={totalSats}
              userReacted={userLiked ? "+" : null}
              userReposted={userReposted}
              onReplyClick={() => setShowReplyModal(true)}
              onRepostClick={handleRepost}
              onLikeClick={handleLike}
              onZapClick={() => setShowZapModal(true)}
              onQuoteClick={handleQuote}
              onEmojiReaction={handleEmojiReaction}
              onShareClick={handleShare}
              variant={variant}
            />
          </div>
        </div>
      </CardContent>

      {showZapModal && (
        <ZapModal 
          onClose={() => setShowZapModal(false)} 
          event={displayEvent}
        />
      )}
      {showRawModal && (
        <RawEventModal
          isOpen={showRawModal}
          onClose={() => setShowRawModal(false)}
          event={displayEvent}
        />
      )}
      {showReportModal && (
        <ReportModal
          targetPubkey={displayEvent.pubkey}
          targetEventId={displayEvent.id}
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
        />
      )}
      {showReplyModal && (
        <ReplyModal
          onClose={() => setShowReplyModal(false)}
          event={displayEvent}
        />
      )}
      {showQuoteModal && (
        <QuoteModal
          onClose={() => setShowQuoteModal(false)}
          event={displayEvent}
        />
      )}
    </Card>
  );
});

PostCard.displayName = "PostCard";
