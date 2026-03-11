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
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { formatCompactDate } from "@/lib/utils/date";
import { Avatar } from "@/components/common/Avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PostHeaderProps {
  display_name: string;
  name?: string;
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
  display_name,
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
  tags,
  name
}) => {
  const formattedTime = formatCompactDate(createdAt);

  return (
    <>
      {/* Repost Header */}
      {isRepost && (
        <div className="flex items-center space-x-2 text-muted-foreground text-xs font-bold mb-2 ml-10 truncate min-w-0">
          <Repeat2 size={14} className="shrink-0" aria-hidden="true" />
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
                className="w-12 h-12 ring-4 ring-background" 
                aria-hidden="true"
              />
            </Link>
          </div>
          <div className="flex items-center gap-1 truncate min-w-0">
            <Link href={`/${userNpub}`} className="flex items-center gap-1 truncate min-w-0 hover:underline">
              <UserIdentity 
                pubkey={pubkey}
                display_name={display_name}
                name={name}
                nip05={nip05}
                variant="post"
                tags={tags}
              />
            </Link>
            <div className="flex items-center gap-1 shrink-0 mt-1">
              {isPinned && (
                <Badge variant="secondary" className="h-4 px-1.5 gap-1 text-primary bg-primary/10 border-primary/20 font-black uppercase text-[8px] tracking-tighter">
                  <Pin className="size-2" fill="currentColor" aria-hidden="true" />
                  <span>Pinned</span>
                </Badge>
              )}
              {isPoll && (
                <Badge variant="secondary" className="h-4 px-1.5 gap-1 text-orange-500 bg-orange-500/10 border-orange-500/20 font-black uppercase text-[8px] tracking-tighter">
                  <BarChart2 className="size-2" fill="currentColor" aria-hidden="true" />
                  <span>Poll</span>
                </Badge>
              )}
              {isArticle && (
                <Badge variant="secondary" className="h-4 px-1 rounded font-bold uppercase tracking-tighter text-[9px] bg-purple-500/10 text-purple-500 border-purple-500/20">
                  Article
                </Badge>
              )}
              {bot && (
                <Badge variant="secondary" className="h-4 px-1 rounded font-bold uppercase tracking-tighter text-[9px] bg-blue-500/10 text-blue-500 border-blue-500/20">
                  Bot
                </Badge>
              )}
            </div>
          </div>
          <span className="text-muted-foreground text-xs shrink-0 mt-1">·</span>
          <span className="text-muted-foreground text-xs whitespace-nowrap shrink-0 mt-1">
            {formattedTime}
          </span>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon-xs" 
              aria-label="More options"
              className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors shrink-0"
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {onPinClick && (
              <DropdownMenuItem onClick={onPinClick} className="gap-2">
                {isPinned ? <PinOff className="size-4" aria-hidden="true" /> : <Pin className="size-4" aria-hidden="true" />}
                <span>{isPinned ? "Unpin from Profile" : "Pin to Profile"}</span>
              </DropdownMenuItem>
            )}
            {onBookmarkClick && (
              <DropdownMenuItem onClick={onBookmarkClick} className="gap-2">
                <Bookmark className={cn("size-4", isBookmarked && "fill-current")} aria-hidden="true" />
                <span>{isBookmarked ? "Remove Bookmark" : "Save Bookmark"}</span>
              </DropdownMenuItem>
            )}
            {onMuteClick && (
              <DropdownMenuItem onClick={onMuteClick} className={cn("gap-2", !isMuted && "text-destructive focus:text-destructive")}>
                {isMuted ? <Volume2 className="size-4" aria-hidden="true" /> : <VolumeX className="size-4" aria-hidden="true" />}
                <span>{isMuted ? `Unmute @${display_name}` : `Mute @${display_name}`}</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {onReportClick && (
              <DropdownMenuItem onClick={onReportClick} className="gap-2">
                <Flag className="size-4" aria-hidden="true" />
                <span>Report Content</span>
              </DropdownMenuItem>
            )}
            {onMoreClick && (
              <DropdownMenuItem onClick={onMoreClick} className="gap-2">
                <Code className="size-4" aria-hidden="true" />
                <span>View Raw Data</span>
              </DropdownMenuItem>
            )}
            {onDeleteClick && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => {
                    if (confirm("Delete this post? This sends a request to relays, but decentralized deletion is not guaranteed across all clients and relays.")) {
                      onDeleteClick();
                    }
                  }} 
                  className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  <span>Delete Post</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
};
