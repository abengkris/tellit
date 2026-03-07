"use client";

import React from "react";
import { 
  Repeat2, 
  MoreHorizontal, 
  Trash2, 
  Flag, 
  Code, 
  Pin, 
  PinOff, 
  VolumeX, 
  Volume2, 
  Bookmark,
  BarChart2
} from "lucide-react";
import Link from "next/link";

import { UserIdentity } from "@/components/common/UserIdentity";
import { DropdownMenu } from "@/components/common/DropdownMenu";
import { formatCompactDate } from "@/lib/utils/date";
import { Avatar } from "@/components/common/Avatar";

interface PostHeaderProps {
  displayName: string;
  avatar?: string;
  isLoading?: boolean;
  userNpub: string;
  pubkey: string;
  nip05?: string;
  createdAt: number | undefined;
  isRepost?: boolean;
  repostAuthorName?: string;
  onMoreClick?: () => void;
  onDeleteClick?: () => void;
  onReportClick?: () => void;
  onPinClick?: () => void;
  onMuteClick?: () => void;
  onBookmarkClick?: () => void;
  isPinned?: boolean;
  isMuted?: boolean;
  isBookmarked?: boolean;
  bot?: boolean | string;
  isArticle?: boolean;
  isPoll?: boolean;
  tags?: string[][];
}

export const PostHeader: React.FC<PostHeaderProps> = ({
  displayName,
  avatar,
  isLoading = false,
  userNpub,
  pubkey,
  nip05,
  createdAt,
  isRepost,
  repostAuthorName,
  onMoreClick,
  onDeleteClick,
  onReportClick,
  onPinClick,
  onMuteClick,
  onBookmarkClick,
  isPinned,
  isMuted,
  isBookmarked,
  bot,
  isArticle,
  isPoll,
  tags
}) => {
  const formattedTime = formatCompactDate(createdAt);

  const menuItems = [
    ...(onPinClick ? [{
      label: isPinned ? "Unpin from Profile" : "Pin to Profile",
      icon: isPinned ? <PinOff size={16} /> : <Pin size={16} />,
      onClick: onPinClick
    }] : []),
    ...(onBookmarkClick ? [{
      label: isBookmarked ? "Remove Bookmark" : "Save Bookmark",
      icon: <Bookmark size={16} fill={isBookmarked ? "currentColor" : "none"} />,
      onClick: onBookmarkClick
    }] : []),
    ...(onMuteClick ? [{
      label: isMuted ? `Unmute @${displayName}` : `Mute @${displayName}`,
      icon: isMuted ? <Volume2 size={16} /> : <VolumeX size={16} />,
      variant: isMuted ? undefined : "danger" as const,
      onClick: onMuteClick
    }] : []),
    ...(onDeleteClick ? [{
      label: "Delete Post",
      icon: <Trash2 size={16} />,
      variant: "danger" as const,
      onClick: () => {
        if (confirm("Delete this post? This sends a request to relays, but decentralized deletion is not guaranteed across all clients and relays.")) {
          onDeleteClick();
        }
      }
    }] : []),
    ...(onReportClick ? [{
      label: "Report Content",
      icon: <Flag size={16} />,
      onClick: onReportClick
    }] : []),
    ...(onMoreClick ? [{
      label: "View Raw Data",
      icon: <Code size={16} />,
      onClick: onMoreClick
    }] : [])
  ];

  return (
    <>
      {/* Repost Header */}
      {isRepost && (
        <div className="flex items-center space-x-2 text-gray-500 text-xs font-bold mb-2 ml-10 truncate min-w-0">
          <Repeat2 size={14} className="shrink-0" />
          <span className="truncate">{repostAuthorName} reposted</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-0.5 min-w-0">
        <div className="flex items-center space-x-1 truncate min-w-0" onClick={(e) => e.stopPropagation()}>
          <div className="mr-3 shrink-0 z-10">
            <Link href={`/${userNpub}`}>
              <Avatar 
                pubkey={pubkey} 
                src={avatar} 
                isLoading={isLoading} 
                size={48} 
                className="w-12 h-12 ring-4 ring-white dark:ring-black" 
              />
            </Link>
          </div>
          <div className="flex items-center gap-1 truncate min-w-0">
            <Link href={`/${userNpub}`} className="flex items-center gap-1 truncate min-w-0 hover:underline">
              <UserIdentity 
                pubkey={pubkey}
                displayName={displayName}
                nip05={nip05}
                variant="post"
                tags={tags}
              />
            </Link>
            {isPinned && (
              <div className="flex items-center gap-1 text-blue-500 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded font-black uppercase text-[8px] tracking-tighter mt-1 shrink-0">
                <Pin size={8} fill="currentColor" />
                <span>Pinned</span>
              </div>
            )}
            {isPoll && (
              <div className="flex items-center gap-1 text-orange-500 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded font-black uppercase text-[8px] tracking-tighter mt-1 shrink-0">
                <BarChart2 size={8} fill="currentColor" />
                <span>Poll</span>
              </div>
            )}
            {isArticle && (
              <span className="text-[9px] bg-purple-500/10 text-purple-500 border border-purple-500/20 px-1 rounded font-bold uppercase tracking-tighter shrink-0 mt-1">
                Article
              </span>
            )}
            {bot && (
              <span className="text-[9px] bg-blue-500/10 text-blue-500 border border-blue-500/20 px-1 rounded font-bold uppercase tracking-tighter shrink-0 mt-1">
                Bot
              </span>
            )}
          </div>
          <span className="text-gray-500 text-xs shrink-0 mt-1">·</span>
          <span className="text-gray-500 text-xs whitespace-nowrap shrink-0 mt-1">
            {formattedTime}
          </span>
        </div>
        
        <DropdownMenu
          trigger={
            <button 
              className="text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2 rounded-full transition-colors shrink-0" 
              title="Options"
            >
              <MoreHorizontal size={18} />
            </button>
          }
          items={menuItems}
        />
      </div>
    </>
  );
};
