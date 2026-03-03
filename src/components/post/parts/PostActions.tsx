import React, { useState, useMemo } from "react";
import { MessageCircle, Repeat2, Heart, Zap, Bookmark, Quote, Share } from "lucide-react";
import { useUIStore } from "@/store/ui";
import { useLists } from "@/hooks/useLists";

interface PostActionsProps {
  eventId: string;
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
  likes: initialLikes,
  reposts: initialReposts,
  comments,
  quotes,
  bookmarks,
  zaps = 0,
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
  const { addToast } = useUIStore();
  const { bookmarkedEventIds, bookmarkPost, unbookmarkPost } = useLists();

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
      addToast("Liked!", "success");
    }
    onLikeClick?.(e);
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

  const formatCount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  };

  const formatSats = (n: number) => {
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
        onClick={(e) => {
          e.stopPropagation();
          onZapClick?.(e);
        }}
        aria-label="Zap"
        className="group flex items-center space-x-1 hover:text-yellow-500 transition-colors"
      >
        <div className="p-3 group-hover:bg-yellow-50 dark:group-hover:bg-yellow-900/20 rounded-full transition-colors">
          <Zap size={20} className={zaps > 0 ? "text-yellow-500 fill-yellow-500" : ""} />
        </div>
        <span className={`text-xs ${zaps > 0 ? "text-yellow-600 dark:text-yellow-400 font-bold" : ""}`}>
          {zaps > 0 ? formatSats(zaps) : ""}
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
