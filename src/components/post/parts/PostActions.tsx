"use client";

import React, { useState, useMemo, useEffect, memo } from "react";
import { MessageCircle, Repeat2, Heart, Zap, Bookmark, Quote, Share, Smile } from "lucide-react";
import { useUIStore } from "@/store/ui";
import { useLists } from "@/hooks/useLists";
import { useEmojis } from "@/hooks/useEmojis";
import { triggerConfetti, triggerZapConfetti } from "@/lib/utils/confetti";
import { useNDK } from "@/hooks/useNDK";
import { useInteractionHistory } from "@/hooks/useInteractionHistory";
import { createZapInvoice } from "@/lib/actions/zap";
import { useReactions } from "@/hooks/useReactions";
import { UserListModal } from "@/components/common/UserListModal";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PostActionsProps {
  eventId: string;
  authorPubkey?: string; // Needed for one-tap zap
  likes: number;
  reposts: number;
  comments: number;
  quotes: number;
  combinedReposts: number;
  bookmarks: number;
  zaps?: number;
  userReacted?: string | null;
  userReposted?: boolean;
  onReplyClick?: (e: React.MouseEvent) => void;
  onRepostClick?: (e: React.MouseEvent) => void;
  onLikeClick?: (e: React.MouseEvent) => void;
  onZapClick?: (e: React.MouseEvent) => void;
  onQuoteClick?: (e: React.MouseEvent) => void;
  onEmojiReaction?: (emoji: { shortcode: string, url: string }) => void;
  onShareClick?: (e: React.MouseEvent) => void;
  variant?: "feed" | "detail";
}

export const PostActions = memo(({
  eventId,
  authorPubkey,
  likes: initialLikes,
  reposts: initialReposts,
  comments,
  quotes: initialQuotes,
  combinedReposts: initialCombined,
  bookmarks,
  zaps: initialZaps,
  userReacted: initialUserReacted,
  userReposted: initialUserReposted,
  onReplyClick,
  onRepostClick,
  onLikeClick,
  onZapClick,
  onQuoteClick,
  onEmojiReaction,
  onShareClick,
  variant = "feed"
}: PostActionsProps) => {
  const [optimisticLikes, setOptimisticLikes] = useState(initialLikes);
  const [optimisticReacted, setOptimisticReacted] = useState(initialUserReacted);
  const [optimisticReposted, setOptimisticReposted] = useState(initialUserReposted);
  const [optimisticReposts, setOptimisticReposts] = useState(initialReposts);
  const [optimisticQuotes, setOptimisticQuotes] = useState(initialQuotes);
  const [optimisticCombined, setOptimisticCombined] = useState(initialCombined);
  const [optimisticZaps, setOptimisticZaps] = useState(initialZaps || 0);
  const [isZapping, setIsZapping] = useState(false);
  
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const [reactionsTitle, setReactionsTitle] = useState("");
  const [reactionsPubkeys, setReactionsPubkeys] = useState<string[]>([]);

  const { addToast, defaultZapAmount } = useUIStore();
  const { ndk, refreshBalance, isReady } = useNDK();
  const { recordInteraction } = useInteractionHistory();
  const { emojis } = useEmojis();
  const { bookmarkedEventIds, bookmarkPost, unbookmarkPost } = useLists();
  const { likes: reactorPubkeys, reposts: reposterPubkeys, zaps: zapperPubkeys, loading: loadingReactions } = useReactions(eventId);

  // Sync state with props when they change from relay updates
  useEffect(() => { setOptimisticLikes(initialLikes); }, [initialLikes]);
  useEffect(() => { setOptimisticReacted(initialUserReacted); }, [initialUserReacted]);
  useEffect(() => { setOptimisticReposted(initialUserReposted); }, [initialUserReposted]);
  useEffect(() => { 
    setOptimisticReposts(initialReposts); 
    setOptimisticQuotes(initialQuotes);
    setOptimisticCombined(initialCombined);
  }, [initialReposts, initialQuotes, initialCombined]);
  useEffect(() => { setOptimisticZaps(initialZaps || 0); }, [initialZaps]);

  const isBookmarked = useMemo(() => bookmarkedEventIds.has(eventId), [bookmarkedEventIds, eventId]);

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isBookmarked) {
      const success = await unbookmarkPost(eventId);
      if (success) addToast("Removed from bookmarks", "success");
    } else {
      const success = await bookmarkPost(eventId);
      if (success) addToast("Saved to bookmarks!", "success");
    }
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (optimisticReacted === '+') {
      setOptimisticLikes((prev: number) => Math.max(0, prev - 1));
      setOptimisticReacted(null);
    } else {
      setOptimisticLikes((prev: number) => prev + 1);
      setOptimisticReacted('+');
      triggerConfetti();
      addToast("Liked!", "success");
      if (authorPubkey) recordInteraction(authorPubkey, 1);
      onLikeClick?.(e);
    }
  };

  const handleEmojiReaction = (emoji: { shortcode: string, url: string }) => {
    setOptimisticReacted(`:${emoji.shortcode}:`);
    triggerConfetti();
    addToast(`Reacted with :${emoji.shortcode}:`, "success");
    if (authorPubkey) recordInteraction(authorPubkey, 1);
    onEmojiReaction?.(emoji);
  };

  const handleRepostAction = () => {
    if (!optimisticReposted) {
      setOptimisticReposted(true);
      setOptimisticReposts((prev: number) => prev + 1);
      setOptimisticCombined((prev: number) => prev + 1);
      addToast("Reposted!", "success");
      if (authorPubkey) recordInteraction(authorPubkey, 2);
      // Create a dummy event for the callback if needed
      const e = { stopPropagation: () => {} } as React.MouseEvent;
      onRepostClick?.(e);
    }
  };

  const handleQuoteAction = () => {
    const e = { stopPropagation: () => {} } as React.MouseEvent;
    onQuoteClick?.(e);
  };

  const handleZap = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // One-tap zap check: NWC (ndk.wallet) or WebLN
    const hasNWC = !!ndk?.wallet;
    const hasWebLN = typeof window !== "undefined" && !!window.webln;

    if ((hasNWC || hasWebLN) && ndk && authorPubkey) {
      try {
        setIsZapping(true);
        if (hasWebLN && !hasNWC) await window.webln?.enable();
        
        // Fetch event to ensure we have the full object for zapping
        const event = await ndk.fetchEvent(eventId);
        if (!event) throw new Error("Could not find event to zap");

        const amount = defaultZapAmount || 21;
        const { invoice: bolt11, alreadyPaid } = await createZapInvoice(ndk, amount * 1000, event);
        
        if (alreadyPaid) {
          triggerZapConfetti();
          setOptimisticZaps((prev: number) => prev + amount); // Add sats to counter
          addToast(`Zapped ${amount} sats via wallet!`, "success");
          if (authorPubkey) recordInteraction(authorPubkey, 3);
          refreshBalance();
          return;
        }

        if (bolt11 && hasWebLN) {
          const response = await window.webln?.sendPayment(bolt11);
          if (response?.preimage) {
            triggerZapConfetti();
            setOptimisticZaps((prev: number) => prev + amount); // Add sats to counter
            addToast(`Zapped ${amount} sats!`, "success");
            if (authorPubkey) recordInteraction(authorPubkey, 3);
            return;
          }
        }
      } catch (err) {
        console.warn("One-tap zap failed, falling back to modal", err);
      } finally {
        setIsZapping(false);
      }
    }
    
    // Fallback to modal
    onZapClick?.(e);
  };

  const openLikesModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (optimisticLikes === 0) return;
    setReactionsTitle("Liked by");
    setReactionsPubkeys(reactorPubkeys);
    setShowReactionsModal(true);
  };

  const openRepostsModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (optimisticCombined === 0) return;
    setReactionsTitle("Reposted by");
    setReactionsPubkeys(reposterPubkeys);
    setShowReactionsModal(true);
  };

  const openZapsModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (optimisticZaps === 0) return;
    setReactionsTitle("Zapped by");
    setReactionsPubkeys(zapperPubkeys.map(z => z.pubkey));
    setShowReactionsModal(true);
  };

  const formatCount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  };

  return (
    <>
      <div className={cn(
        "flex items-center justify-between max-w-md text-muted-foreground -ml-2 mt-1",
        variant === "detail" ? "py-3 border-y border-border/50 mt-4 px-2" : ""
      )}>
        {/* Reply */}
        <div className="flex items-center group">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={(e) => {
                  e.stopPropagation();
                  onReplyClick?.(e);
                }}
                className="size-9 p-0 hover:text-blue-500 hover:bg-blue-500/10 rounded-full transition-colors"
                aria-label="Reply"
              >
                <MessageCircle className="size-[18px]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Reply</TooltipContent>
          </Tooltip>
          {variant === "feed" && comments > 0 && (
            <span className="text-[13px] ml-1 group-hover:text-blue-500 transition-colors">{formatCount(comments)}</span>
          )}
        </div>

        {/* Repost & Quote */}
        <div className="flex items-center group">
          <DropdownMenu modal={false}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                      "size-9 p-0 hover:text-green-500 hover:bg-green-500/10 rounded-full transition-colors",
                      optimisticReposted && "text-green-500"
                    )}
                    aria-label="Repost and Quote options"
                  >
                    <Repeat2 className={cn("size-[18px]", optimisticReposted && "animate-in spin-in-180 duration-500")} />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">Repost / Quote</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
              <DropdownMenuItem onClick={handleRepostAction} className="gap-2">
                <Repeat2 className="size-4" />
                <span>Repost</span>
                <span className="ml-auto text-xs text-muted-foreground">{optimisticReposts}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleQuoteAction} className="gap-2">
                <Quote className="size-4" />
                <span>Quote</span>
                <span className="ml-auto text-xs text-muted-foreground">{optimisticQuotes}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {variant === "feed" && optimisticCombined > 0 && (
            <button 
              className="text-[13px] ml-1 group-hover:text-green-500 transition-colors"
              onClick={openRepostsModal}
              disabled={!isReady}
              aria-label={`${optimisticCombined} reposts and quotes`}
            >
              {formatCount(optimisticCombined)}
            </button>
          )}
        </div>

        {/* Like & Custom Emoji */}
        <div className="flex items-center group">
          <DropdownMenu modal={false}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                      "size-9 p-0 hover:text-pink-500 hover:bg-pink-500/10 rounded-full transition-colors",
                      optimisticReacted && optimisticReacted !== "" && "text-pink-500"
                    )}
                    aria-label={optimisticReacted === '+' ? "Unlike" : "Like or React"}
                  >
                    <Heart 
                      className={cn("size-[18px]", optimisticReacted && optimisticReacted !== "" && "animate-in zoom-in-125 duration-300")} 
                      fill={optimisticReacted && optimisticReacted !== "" ? 'currentColor' : 'none'} 
                    />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">Like / React</TooltipContent>
            </Tooltip>
            
            <DropdownMenuContent align="start" className="w-48 max-h-64 overflow-y-auto">
              <DropdownMenuItem onClick={handleLike} className="gap-2 font-black uppercase tracking-widest text-[10px]">
                <Heart className="size-4" fill={optimisticReacted === '+' ? 'currentColor' : 'none'} />
                <span>{optimisticReacted === '+' ? "Unlike" : "Like"}</span>
              </DropdownMenuItem>
              
              {emojis.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Smile className="size-3" />
                    Custom Emojis
                  </div>
                  <div className="grid grid-cols-4 gap-1 p-2">
                    {emojis.map((emoji) => (
                      <button
                        key={emoji.shortcode}
                        onClick={() => handleEmojiReaction(emoji)}
                        disabled={!isReady}
                        className="p-1 hover:bg-accent rounded-md transition-colors aspect-square flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
                        title={emoji.shortcode}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={emoji.url} alt={emoji.shortcode} className="size-6 object-contain" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {variant === "feed" && optimisticLikes > 0 && (
            <button 
              className="text-[13px] ml-1 group-hover:text-pink-500 transition-colors"
              onClick={openLikesModal}
              disabled={!isReady}
              aria-label={`${optimisticLikes} likes`}
            >
              {formatCount(optimisticLikes)}
            </button>
          )}
        </div>

        {/* Zap */}
        <div className="flex items-center group">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleZap}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onZapClick?.(e);
                }}
                loading={isZapping}
                className="size-9 p-0 hover:text-yellow-500 hover:bg-yellow-500/10 rounded-full transition-colors"
                aria-label="Zap"
              >
                {!isZapping && (
                  <Zap className={cn("size-[18px]", optimisticZaps > 0 && "text-yellow-500 fill-yellow-500")} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Zap (Right-click for custom)</TooltipContent>
          </Tooltip>
          {variant === "feed" && optimisticZaps > 0 && (
            <button 
              className={cn(
                "text-[13px] ml-1 transition-colors group-hover:text-yellow-500",
                optimisticZaps > 0 && "text-yellow-600 dark:text-yellow-400 font-bold"
              )}
              onClick={openZapsModal}
              disabled={!isReady}
              aria-label={`${optimisticZaps} zaps`}
            >
              {formatCount(optimisticZaps)}
            </button>
          )}
        </div>

        {/* Share & Bookmark */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleBookmark}
                className={cn(
                  "size-9 p-0 hover:text-blue-500 hover:bg-blue-500/10 rounded-full transition-colors",
                  isBookmarked && "text-blue-500"
                )}
                aria-label={isBookmarked ? "Remove Bookmark" : "Bookmark"}
              >
                <Bookmark 
                  className={cn("size-[18px]", isBookmarked && "animate-in zoom-in-125 duration-300")} 
                  fill={isBookmarked ? 'currentColor' : 'none'} 
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Bookmark</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={(e) => {
                  e.stopPropagation();
                  onShareClick?.(e);
                }}
                className="size-9 p-0 hover:text-blue-500 hover:bg-blue-500/10 rounded-full transition-colors"
                aria-label="Share"
              >
                <Share className="size-[18px]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Share</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <UserListModal
        isOpen={showReactionsModal}
        onClose={() => setShowReactionsModal(false)}
        title={reactionsTitle}
        pubkeys={reactionsPubkeys}
        loading={loadingReactions}
      />
    </>
  );
});
PostActions.displayName = "PostActions";
