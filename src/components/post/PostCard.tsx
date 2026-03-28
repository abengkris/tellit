"use client";

import React, { useState, useEffect, useMemo, memo } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { type NostrEvent } from "@nostrify/types";
import { useProfile } from "@/hooks/useProfile";
import { usePostStats } from "@/hooks/usePostStats";
import { useNDK } from "@/hooks/useNDK";
import Link from "next/link";
import { 
  getPostUrl, 
  getArticleUrl, 
  deletePost, 
  requestSummarization 
} from "@/lib/actions/post";
import { pinPost, unpinPost, muteUser, unmuteUser } from "@/lib/actions/profile";
import { useUIStore } from "@/store/ui";
import { useLists } from "@/hooks/useLists";
import { getEventNip19, toNpub, shortenPubkey } from "@/lib/utils/nip19";
import { useNostrifyPublish } from "@/hooks/useNostrifyPublish";
import { PostHeader } from "./parts/PostHeader";
import { PostContentRenderer } from "./parts/PostContent";
import { PostActions } from "./parts/PostActions";
import { PollRenderer } from "./PollRenderer";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ScoredEvent } from "@/lib/feed/types";
import { ReplyModal } from "./parts/ReplyModal";
import { QuoteModal } from "./parts/QuoteModal";
import { RawEventModal } from "./parts/RawEventModal";
import { ZapModal } from "@/components/common/ZapModal";
import { Repeat2, FileText } from "lucide-react";

type ThreadLine = "none" | "top" | "bottom" | "both";

interface PostCardProps {
  event: NDKEvent | NostrEvent;
  scoredEvent?: ScoredEvent;
  threadLine?: ThreadLine;
  isFocal?: boolean;
  indent?: number;
  variant?: "feed" | "detail";
}

export const PostCard = memo(({ 
  event, 
  threadLine = "none",
  isFocal = false,
  indent = 0,
  variant = "feed"
}: PostCardProps) => {
  const [repostedEvent, setRepostedEvent] = useState<NDKEvent | NostrEvent | null>(null);
  const [repostLoading, setRepostLoading] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const { ndk, isReady } = useNDK();
  const { react, repost } = useNostrifyPublish();
  const { addToast } = useUIStore();
  const { isPinned, isMuted, isBookmarked, bookmarkPost, unbookmarkPost } = useLists();
  
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showRawEventModal, setShowRawEventModal] = useState(false);
  const [showZapModal, setShowZapModal] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

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
    bookmarks, 
    totalSats, 
    userLiked, 
    userReposted 
  } = usePostStats(displayEvent?.id);

  useEffect(() => {
    if (isRepost && isReady && ndk && event) {
      const content = ('content' in event) ? event.content : '';
      if (content && content.trim().startsWith('{')) {
        try {
          const raw = JSON.parse(content);
          if (raw.id && raw.pubkey && raw.content !== undefined) {
            Promise.resolve().then(() => {
              setRepostedEvent(raw as NostrEvent);
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

  const display_name = useMemo(() => {
    if (profileLoading) return "…";
    return profile?.display_name || profile?.name || "Anonymous";
  }, [profile, profileLoading]);

  const navigationHref = useMemo(() => {
    if (!displayEvent) return "#";
    const ndkEvent = displayEvent instanceof NDKEvent ? displayEvent : (ndk ? new NDKEvent(ndk, displayEvent) : null);
    if (!ndkEvent) return "#";

    if (isArticle) return getArticleUrl(ndkEvent, profile);
    return getPostUrl(ndkEvent, profile);
  }, [isArticle, displayEvent, profile, ndk]);

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await repost(displayEvent as any);
    } catch (err) {
      console.error(err);
      addToast("Failed to repost", "error");
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (userLiked) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await react(displayEvent as any, "+");
    } catch (err) {
      console.error(err);
      addToast("Failed to like post", "error");
    }
  };

  const handleEmojiReaction = async (emoji: { shortcode: string, url: string }) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await react(displayEvent as any, `:${emoji.shortcode}:`, emoji.url);
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
    if (!ndk || !displayEvent) return;
    setIsSummarizing(true);
    try {
      const ndkEvent = displayEvent instanceof NDKEvent ? displayEvent : new NDKEvent(ndk, displayEvent);
      await requestSummarization(ndk, ndkEvent);
      addToast("Summarization request sent!", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to request summary", "error");
    } finally {
      setIsSummarizing(false);
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
    <Card className={cn(
      "border-none shadow-none bg-transparent group/card transition-colors relative flex",
      variant === "feed" ? "hover:bg-muted/30" : "",
      isFocal ? "bg-muted/10 ring-1 ring-primary/10" : "",
      indent > 0 ? "border-l-2 border-primary/10 ml-4 pl-2" : ""
    )}>
      {/* Thread Lines */}
      {(threadLine === "top" || threadLine === "both") && (
        <div className="absolute top-0 left-[2.25rem] w-0.5 h-4 bg-border/50" />
      )}
      {(threadLine === "bottom" || threadLine === "both") && (
        <div className="absolute top-12 bottom-0 left-[2.25rem] w-0.5 bg-border/50" />
      )}

      <div className="flex-1 min-w-0 flex flex-col py-3 px-4">
        {/* Repost Header */}
        {isRepost && (
          <div className="flex items-center gap-2 mb-2 ml-10 text-muted-foreground/70 group-hover:text-muted-foreground transition-colors">
            <Repeat2 size={14} className="animate-in zoom-in duration-300" />
            <Link 
              href={`/p/${event.pubkey}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] font-black uppercase tracking-widest hover:text-primary transition-colors truncate"
            >
              {repostAuthorProfile?.display_name || repostAuthorProfile?.name || "Someone"} reposted
            </Link>
          </div>
        )}

        <div className="flex gap-3">
          {/* Avatar Container */}
          <div className="flex flex-col items-center shrink-0">
            <Link 
              href={profileUrl}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10"
            >
              <Skeleton className={cn("size-12 rounded-full absolute inset-0", !profileLoading && "hidden")} />
              <div className={cn("size-12 rounded-full overflow-hidden border-2 border-transparent hover:border-primary/20 transition-all", profileLoading && "opacity-0")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={profile?.picture || "/file.svg"} 
                  alt={display_name}
                  className="size-full object-cover"
                  loading="lazy"
                />
              </div>
            </Link>
          </div>

          {/* Post Content */}
          <div className="flex-1 min-w-0">
            <PostHeader 
              display_name={display_name}
              userNpub={profile ? toNpub(displayEvent.pubkey) : shortenPubkey(displayEvent.pubkey)}
              pubkey={displayEvent.pubkey}
              createdAt={displayEvent.created_at}
              nip05={profile?.nip05}
              isPinned={isPinned(displayEvent.id)}
              isMuted={isMuted(displayEvent.pubkey)}
              isBookmarked={isBookmarked(displayEvent.id)}
              onDeleteClick={handleDelete}
              onPinClick={handlePin}
              onMuteClick={handleMute}
              onBookmarkClick={handleBookmarkToggle}
              onRawEventClick={() => setShowRawEventModal(true)}
              onSummarizeClick={handleSummarize}
              isSummarizing={isSummarizing}
            />

            {/* Replying to... */}
            {replyingToPubkey && (
              <div className="mt-0.5 mb-1 text-[11px] text-muted-foreground font-medium">
                Replying to <Link href={`/p/${replyingToPubkey}`} className="text-primary hover:underline" onClick={e => e.stopPropagation()}>@{replyingToPubkey.slice(0, 8)}</Link>
              </div>
            )}

            <Link href={navigationHref} className="block">
              {isArticle ? (
                <Card className="p-4 bg-muted/20 border-border/50 rounded-2xl hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="size-8 text-primary" />
                    <div className="min-w-0">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <h3 className="font-bold truncate">{(displayEvent as any).tags.find((t: any[]) => t[0] === 'title')?.[1] || "Untitled Article"}</h3>
                      <p className="text-xs text-muted-foreground truncate">Kind 30023 • Long-form</p>
                    </div>
                  </div>
                </Card>
              ) : (
                <PostContentRenderer 
                  content={displayEvent.content} 
                  event={displayEvent}
                  variant={variant}
                  isHighlight={isHighlight}
                  isQuote={isQuote}
                />
              )}
            </Link>

            {isPoll && <PollRenderer event={displayEvent} />}

            <PostActions 
              likes={likes}
              reposts={repostsCount}
              comments={comments}
              quotes={quotes}
              bookmarks={bookmarks}
              zaps={totalSats}
              userReacted={userLiked ? '+' : null}
              userReposted={userReposted}
              eventId={displayEvent.id}
              authorPubkey={displayEvent.pubkey}
              onReplyClick={() => setShowReplyModal(true)}
              onRepostClick={handleRepost}
              onLikeClick={handleLike}
              onQuoteClick={handleQuote}
              onZapClick={() => setShowZapModal(true)}
              onShareClick={handleShare}
              onEmojiReaction={handleEmojiReaction}
              combinedReposts={0}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showZapModal && (
        <ZapModal
          onClose={() => setShowZapModal(false)}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          event={displayEvent as any}
          user={ndk?.getUser({ pubkey: displayEvent.pubkey })}
        />
      )}
      {showRawEventModal && (
        <RawEventModal
          isOpen={showRawEventModal}
          onClose={() => setShowRawEventModal(false)}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          event={displayEvent as any}
        />
      )}
      {showReplyModal && (
        <ReplyModal
          onClose={() => setShowReplyModal(false)}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          event={displayEvent as any}
        />
      )}
      {showQuoteModal && (
        <QuoteModal
          onClose={() => setShowQuoteModal(false)}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          event={displayEvent as any}
        />
      )}
    </Card>
  );
});

PostCard.displayName = "PostCard";
