import React, { useState, useMemo, useEffect } from "react";
import { MessageCircle, Repeat2, Heart, Zap, Bookmark, Quote, Share, Loader2 } from "lucide-react";
import { useUIStore } from "@/store/ui";
import { useLists } from "@/hooks/useLists";
import { triggerConfetti, triggerZapConfetti } from "@/lib/utils/confetti";
import { useNDK } from "@/hooks/useNDK";
import { createZapInvoice, listenForZapReceipt } from "@/lib/actions/zap";

interface PostActionsProps {
  eventId: string;
  authorPubkey?: string; // Needed for one-tap zap
  likes: number;
  reposts: number;
  comments: number;
  quotes: number;
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
  quotes,
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
  const [optimisticZaps, setOptimisticZaps] = useState(initialZaps || 0);
  const [isZapping, setIsZapping] = useState(false);
  
  const { addToast, defaultZapAmount } = useUIStore();
  const { ndk } = useNDK();
  const { bookmarkedEventIds, bookmarkPost, unbookmarkPost } = useLists();

  // Sync state with props when they change from relay updates
  useEffect(() => { setOptimisticLikes(initialLikes); }, [initialLikes]);
  useEffect(() => { setOptimisticReacted(initialUserReacted); }, [initialUserReacted]);
  useEffect(() => { setOptimisticReposted(initialUserReposted); }, [initialUserReposted]);
  useEffect(() => { setOptimisticReposts(initialReposts); }, [initialReposts]);
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
      setOptimisticLikes(prev => Math.max(0, prev - 1));
      setOptimisticReacted(null);
    } else {
      setOptimisticLikes(prev => prev + 1);
      setOptimisticReacted('+');
      triggerConfetti();
      addToast("Liked!", "success");
      onLikeClick?.(e);
    }
  };

  const handleRepost = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!optimisticReposted) {
      setOptimisticReposted(true);
      setOptimisticReposts(prev => prev + 1);
      addToast("Reposted!", "success");
      onRepostClick?.(e);
    }
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
        const bolt11 = await createZapInvoice(ndk, amount * 1000, event);
        
        if (bolt11) {
          const response = await window.webln.sendPayment(bolt11);
          if (response.preimage) {
            triggerZapConfetti();
            setOptimisticZaps(prev => prev + amount); // Add sats to counter
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

  const formatCount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  };

  return (
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

      {/* Repost */}
      <button 
        onClick={handleRepost}
        aria-label="Repost"
        className={`group flex items-center space-x-1 hover:text-green-500 transition-colors ${optimisticReposted ? 'text-green-500' : ''}`}
      >
        <div className="p-3 group-hover:bg-green-50 dark:group-hover:bg-green-900/20 rounded-full transition-colors">
          <Repeat2 size={20} className={optimisticReposted ? "animate-in spin-in-180 duration-500" : ""} />
        </div>
        <span className="text-xs">{optimisticReposts > 0 ? formatCount(optimisticReposts) : ""}</span>
      </button>

      {/* Like */}
      <button 
        onClick={handleLike}
        aria-label={optimisticReacted === '+' ? "Unlike" : "Like"}
        className={`group flex items-center space-x-1 hover:text-pink-500 transition-colors ${optimisticReacted === '+' ? 'text-pink-500' : ''}`}
      >
        <div className="p-3 group-hover:bg-pink-50 dark:group-hover:bg-pink-900/20 rounded-full transition-colors">
          <Heart size={20} fill={optimisticReacted === '+' ? 'currentColor' : 'none'} className={optimisticReacted === '+' ? "animate-in zoom-in-125 duration-300" : ""} />
        </div>
        <span className="text-xs">{optimisticLikes > 0 ? formatCount(optimisticLikes) : ""}</span>
      </button>

      {/* Zap */}
      <button 
        onClick={handleZap}
        onContextMenu={(e) => {
          e.preventDefault();
          onZapClick?.(e);
        }}
        aria-label="Zap"
        className="group flex items-center space-x-1 hover:text-yellow-500 transition-colors"
        disabled={isZapping}
      >
        <div className="p-3 group-hover:bg-yellow-50 dark:group-hover:bg-yellow-900/20 rounded-full transition-colors relative">
          {isZapping ? (
            <Loader2 size={20} className="animate-spin text-yellow-500" />
          ) : (
            <Zap size={20} className={optimisticZaps > 0 ? "text-yellow-500 fill-yellow-500" : ""} />
          )}
        </div>
        <span className={`text-xs ${optimisticZaps > 0 ? "text-yellow-600 dark:text-yellow-400 font-bold" : ""}`}>
          {optimisticZaps > 0 ? formatCount(optimisticZaps) : ""}
        </span>
      </button>

      {/* Quote */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onQuoteClick?.(e);
        }}
        aria-label="Quote"
        className="group flex items-center space-x-1 hover:text-blue-400 transition-colors"
      >
        <div className="p-3 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/10 rounded-full transition-colors">
          <Quote size={18} />
        </div>
        <span className="text-xs">{quotes > 0 ? formatCount(quotes) : ""}</span>
      </button>

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
  );
};
