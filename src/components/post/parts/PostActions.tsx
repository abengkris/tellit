import React, { useState, useMemo, useEffect } from "react";
import { MessageCircle, Repeat2, Heart, Zap, Bookmark, Quote, Share, Loader2 } from "lucide-react";
import { useUIStore } from "@/store/ui";
import { useLists } from "@/hooks/useLists";
import { triggerConfetti, triggerZapConfetti } from "@/lib/utils/confetti";
import { useNDK } from "@/hooks/useNDK";
import { createZapInvoice } from "@/lib/actions/zap";
import { useReactions } from "@/hooks/useReactions";
import { UserListModal } from "@/components/common/UserListModal";
import { DropdownMenu } from "@/components/common/DropdownMenu";

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

export const PostActions: React.FC<PostActionsProps> = ({
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
}) => {
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
    
    // Check for WebLN
    if (typeof window !== "undefined" && window.webln && ndk && authorPubkey) {
      try {
        setIsZapping(true);
        await window.webln.enable();
        
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

        if (bolt11) {
          const response = await window.webln.sendPayment(bolt11);
          if (response.preimage) {
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

  const repostItems = [
    {
      label: "Repost",
      description: `${optimisticReposts} reposts`,
      icon: <Repeat2 size={18} />,
      onClick: handleRepostAction
    },
    {
      label: "Quote",
      description: `${optimisticQuotes} quotes`,
      icon: <Quote size={18} />,
      onClick: handleQuoteAction
    }
  ];

  return (
    <>
      <div className="flex items-center justify-between max-w-lg text-gray-500 -ml-2">
        {/* Reply */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onReplyClick?.(e);
          }}
          aria-label="Reply"
          className="group flex items-center space-x-1 hover:text-blue-500 transition-colors"
        >
          <div className="p-3 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 rounded-full transition-colors">
            <MessageCircle size={20} />
          </div>
          <span className="text-xs">{comments > 0 ? formatCount(comments) : ""}</span>
        </button>

        {/* Combined Repost & Quote */}
        <div className="flex items-center">
          <DropdownMenu
            align="left"
            position="up"
            items={repostItems}
            trigger={
              <button 
                aria-label="Repost and Quote options"
                className={`group flex items-center hover:text-green-500 transition-colors ${optimisticReposted ? 'text-green-500' : ''}`}
              >
                <div className="p-3 group-hover:bg-green-50 dark:group-hover:bg-green-900/20 rounded-full transition-colors">
                  <Repeat2 size={20} className={optimisticReposted ? "animate-in spin-in-180 duration-500" : ""} />
                </div>
              </button>
            }
          />
          <span 
            className="text-xs cursor-pointer hover:underline -ml-1 pr-2 py-2"
            onClick={openRepostsModal}
          >
            {optimisticCombined > 0 ? formatCount(optimisticCombined) : ""}
          </span>
        </div>

        {/* Like */}
        <div className="flex items-center">
          <button 
            onClick={handleLike}
            aria-label={optimisticReacted === '+' ? "Unlike" : "Like"}
            className={`group flex items-center hover:text-pink-500 transition-colors ${optimisticReacted === '+' ? 'text-pink-500' : ''}`}
          >
            <div className="p-3 group-hover:bg-pink-50 dark:group-hover:bg-pink-900/20 rounded-full transition-colors">
              <Heart size={20} fill={optimisticReacted === '+' ? 'currentColor' : 'none'} className={optimisticReacted === '+' ? "animate-in zoom-in-125 duration-300" : ""} />
            </div>
          </button>
          <span 
            className="text-xs cursor-pointer hover:underline -ml-1 pr-2 py-2"
            onClick={openLikesModal}
          >
            {optimisticLikes > 0 ? formatCount(optimisticLikes) : ""}
          </span>
        </div>

        {/* Zap */}
        <div className="flex items-center">
          <button 
            onClick={handleZap}
            onContextMenu={(e) => {
              e.preventDefault();
              onZapClick?.(e);
            }}
            aria-label="Zap"
            className="group flex items-center hover:text-yellow-500 transition-colors"
            disabled={isZapping}
          >
            <div className="p-3 group-hover:bg-yellow-50 dark:group-hover:bg-yellow-900/20 rounded-full transition-colors relative">
              {isZapping ? (
                <Loader2 size={20} className="animate-spin text-yellow-500" />
              ) : (
                <Zap size={20} className={optimisticZaps > 0 ? "text-yellow-500 fill-yellow-500" : ""} />
              )}
            </div>
          </button>
          <span 
            className={`text-xs cursor-pointer hover:underline -ml-1 pr-2 py-2 ${optimisticZaps > 0 ? "text-yellow-600 dark:text-yellow-400 font-bold" : ""}`}
            onClick={openZapsModal}
          >
            {optimisticZaps > 0 ? formatCount(optimisticZaps) : ""}
          </span>
        </div>

        {/* Bookmark */}
        <button 
          onClick={handleBookmark}
          aria-label={isBookmarked ? "Remove Bookmark" : "Bookmark"}
          className={`group flex items-center space-x-1 hover:text-blue-500 transition-colors ${isBookmarked ? 'text-blue-500' : ''}`}
        >
          <div className="p-3 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 rounded-full transition-colors">
            <Bookmark size={20} fill={isBookmarked ? 'currentColor' : 'none'} className={isBookmarked ? "animate-in zoom-in-125 duration-300" : ""} />
          </div>
          <span className="text-xs">{bookmarks > 0 ? formatCount(bookmarks) : ""}</span>
        </button>

        {/* Share */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onShareClick?.(e);
          }}
          aria-label="Share"
          className="group flex items-center space-x-1 hover:text-blue-500 transition-colors"
        >
          <div className="p-3 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 rounded-full transition-colors">
            <Share size={20} />
          </div>
        </button>
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
};
