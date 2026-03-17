"use client";

import React, { useState, useMemo, useEffect, memo } from "react";
import { MessageCircle, Repeat2, Heart, Zap, Bookmark, Quote, Share, Loader2 } from "lucide-react";
import { useUIStore } from "@/store/ui";
import { useLists } from "@/hooks/useLists";
import { triggerConfetti, triggerZapConfetti } from "@/lib/utils/confetti";
import { useNDK } from "@/hooks/useNDK";
import { createZapInvoice } from "@/lib/actions/zap";
import { useReactions } from "@/hooks/useReactions";
import { UserListModal } from "@/components/common/UserListModal";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
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
  onShareClick?: (e: React.MouseEvent) => void;
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
  onShareClick
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
  const { ndk, refreshBalance } = useNDK();
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
      onLikeClick?.(e);
    }
  };

  const handleRepostAction = () => {
    if (!optimisticReposted) {
      setOptimisticReposted(true);
      setOptimisticReposts((prev: number) => prev + 1);
      setOptimisticCombined((prev: number) => prev + 1);
      addToast("Reposted!", "success");
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
          refreshBalance();
          return;
        }

        if (bolt11 && hasWebLN) {
          const response = await window.webln?.sendPayment(bolt11);
          if (response?.preimage) {
            triggerZapConfetti();
            setOptimisticZaps((prev: number) => prev + amount); // Add sats to counter
            addToast(`Zapped ${amount} sats!`, "success");
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
      <div className="flex items-center justify-between max-w-lg text-muted-foreground -ml-2">
        {/* Reply */}
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={(e) => {
                  e.stopPropagation();
                  onReplyClick?.(e);
                }}
                className="hover:text-primary hover:bg-primary/10 rounded-full"
                aria-label="Reply"
              >
                <MessageCircle className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Reply</TooltipContent>
          </Tooltip>
          <span className="text-xs ml-0.5">{comments > 0 ? formatCount(comments) : ""}</span>
        </div>

        {/* Repost & Quote */}
        <div className="flex items-center">
          <DropdownMenu modal={false}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                      "hover:text-green-500 hover:bg-green-500/10 rounded-full",
                      optimisticReposted && "text-green-500"
                    )}
                    aria-label="Repost and Quote options"
                  >
                    <Repeat2 className={cn("size-5", optimisticReposted && "animate-in spin-in-180 duration-500")} />
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
          <button 
            className="text-xs cursor-pointer hover:underline ml-0.5 pr-2 py-2 outline-none focus-visible:underline focus-visible:text-primary"
            onClick={openRepostsModal}
            aria-label={`${optimisticCombined} reposts and quotes`}
          >
            {optimisticCombined > 0 ? formatCount(optimisticCombined) : ""}
          </button>
        </div>

        {/* Like */}
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleLike}
                className={cn(
                  "hover:text-pink-500 hover:bg-pink-500/10 rounded-full",
                  optimisticReacted === '+' && "text-pink-500"
                )}
                aria-label={optimisticReacted === '+' ? "Unlike" : "Like"}
              >
                <Heart 
                  className={cn("size-5", optimisticReacted === '+' && "animate-in zoom-in-125 duration-300")} 
                  fill={optimisticReacted === '+' ? 'currentColor' : 'none'} 
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Like</TooltipContent>
          </Tooltip>
          <button 
            className="text-xs cursor-pointer hover:underline ml-0.5 pr-2 py-2 outline-none focus-visible:underline focus-visible:text-pink-500"
            onClick={openLikesModal}
            aria-label={`${optimisticLikes} likes`}
          >
            {optimisticLikes > 0 ? formatCount(optimisticLikes) : ""}
          </button>
        </div>

        {/* Zap */}
        <div className="flex items-center">
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
                disabled={isZapping}
                className="hover:text-yellow-500 hover:bg-yellow-500/10 rounded-full"
                aria-label="Zap"
              >
                {isZapping ? (
                  <Loader2 className="size-5 animate-spin text-yellow-500" />
                ) : (
                  <Zap className={cn("size-5", optimisticZaps > 0 && "text-yellow-500 fill-yellow-500")} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Zap (Right-click for custom)</TooltipContent>
          </Tooltip>
          <button 
            className={cn(
              "text-xs cursor-pointer hover:underline ml-0.5 pr-2 py-2 outline-none focus-visible:underline",
              optimisticZaps > 0 && "text-yellow-600 dark:text-yellow-400 font-bold"
            )}
            onClick={openZapsModal}
            aria-label={`${optimisticZaps} zaps`}
          >
            {optimisticZaps > 0 ? formatCount(optimisticZaps) : ""}
          </button>
        </div>

        {/* Bookmark */}
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleBookmark}
                className={cn(
                  "hover:text-primary hover:bg-primary/10 rounded-full",
                  isBookmarked && "text-primary"
                )}
                aria-label={isBookmarked ? "Remove Bookmark" : "Bookmark"}
              >
                <Bookmark 
                  className={cn("size-5", isBookmarked && "animate-in zoom-in-125 duration-300")} 
                  fill={isBookmarked ? 'currentColor' : 'none'} 
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Bookmark</TooltipContent>
          </Tooltip>
          <span className="text-xs ml-0.5">{bookmarks > 0 ? formatCount(bookmarks) : ""}</span>
        </div>

        {/* Share */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => {
                e.stopPropagation();
                onShareClick?.(e);
              }}
              className="hover:text-primary hover:bg-primary/10 rounded-full"
              aria-label="Share"
            >
              <Share className="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Share</TooltipContent>
        </Tooltip>
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
