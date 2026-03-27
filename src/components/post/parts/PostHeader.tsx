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
  BarChart2,
  ExternalLink,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";

import { useWoT } from "@/hooks/useWoT";
import { UserIdentity } from "@/components/common/UserIdentity";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCompactDate } from "@/lib/utils/date";
import { Avatar } from "@/components/common/Avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoredEvent } from "@/lib/feed/types";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PostHeaderProps {
  display_name: string;
  name?: string;
  avatar?: string;
  isLoading?: boolean;
  userNpub: string;
  profileUrl?: string;
  pubkey: string;
  nip05?: string;
  createdAt: number | undefined;
  isRepost?: boolean;
  isReply?: boolean;
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
  navigationHref?: string;
  onSummarizeClick?: () => void;
  variant?: "feed" | "detail";
  relevance?: ScoredEvent;
  showAvatar?: boolean;
}

export const PostHeader: React.FC<PostHeaderProps> = ({
  display_name,
  avatar,
  isLoading = false,
  userNpub,
  profileUrl,
  pubkey,
  nip05,
  createdAt,
  isRepost,
  isReply,
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
  name,
  navigationHref,
  onSummarizeClick,
  variant = "feed",
  relevance,
  showAvatar = true
}) => {
  const { score } = useWoT(pubkey);
  const formattedTime = formatCompactDate(createdAt);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const finalProfileUrl = profileUrl || `/${userNpub}`;

  const clientTag = tags?.find(t => t[0] === 'client');
  const clientName = clientTag?.[1];

  // NIP-32 Language Label
  const languageLabel = tags?.find(t => t[0] === 'l' && t[2] === 'ISO-639-1')?.[1];

  // NIP-48 Proxy Tag
  const proxyTag = tags?.find(t => t[0] === 'proxy');
  const proxyId = proxyTag?.[1];
  const proxyProtocol = proxyTag?.[2];

  if (variant === "detail") {
    return (
      <div className="flex flex-col min-w-0 z-10">
        {/* Repost Header */}
        {isRepost && (
          <div className="flex items-center space-x-2 text-muted-foreground text-[13px] font-bold mb-3 ml-0 truncate min-w-0">
            <Repeat2 size={16} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{repostAuthorName} reposted</span>
          </div>
        )}

        <div className="flex items-center justify-between mb-3 min-w-0">
          <div className="flex items-center space-x-3 truncate min-w-0" onClick={(e) => e.stopPropagation()}>
            {showAvatar && (
              <Link href={finalProfileUrl} aria-label={`View ${display_name}'s profile`} className="shrink-0">
                <Avatar 
                  pubkey={pubkey} 
                  src={avatar} 
                  isLoading={isLoading} 
                  size={52} 
                  nip05={nip05}
                  className="w-[52px] h-[52px] ring-1 ring-border/10" 
                  aria-hidden="true"
                />
              </Link>
            )}
            <div className="flex flex-col truncate min-w-0">
              <Link href={finalProfileUrl} className="flex flex-col truncate min-w-0 hover:underline">
                <span className="font-bold text-[17px] text-foreground leading-tight truncate">{display_name}</span>
                <span className="text-muted-foreground text-[15px] truncate">@{name || userNpub.slice(0, 12)}</span>
              </Link>
              {score > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 mt-0.5 cursor-help">
                      <ShieldCheck className={cn(
                        "size-3.5",
                        score > 80 ? "text-green-500" : "text-muted-foreground/60"
                      )} />
                      <span className="text-[11px] font-bold text-muted-foreground/60">
                        {score}% Trust
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px] font-bold uppercase tracking-widest p-2">
                    Web of Trust Score based on your connections
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {proxyProtocol && (
              <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-border/50 bg-muted/5">
                {proxyId?.startsWith('http') ? (
                  <a href={proxyId} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-1">
                    {proxyProtocol} <ExternalLink size={10} />
                  </a>
                ) : (
                  proxyProtocol
                )}
              </Badge>
            )}
            {languageLabel && (
              <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-border/50">
                {languageLabel}
              </Badge>
            )}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  aria-label="More options"
                  className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors shrink-0"
                >
                  <MoreHorizontal className="size-5" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" onCloseAutoFocus={(e) => e.preventDefault()}>
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
                {onSummarizeClick && (
                  <DropdownMenuItem onClick={onSummarizeClick} className="gap-2 text-purple-500 focus:text-purple-600 focus:bg-purple-500/10">
                    <BarChart2 className="size-4" aria-hidden="true" />
                    <span>Summarize with AI</span>
                  </DropdownMenuItem>
                )}
                {onDeleteClick && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onSelect={(e) => {
                        e.preventDefault();
                        setShowDeleteDialog(true);
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
        </div>

        {isReply && (
          <div className="text-[15px] text-muted-foreground mb-3">
            Replying to <Link href={`/${userNpub}`} className="text-primary hover:underline">@{name || userNpub.slice(0, 12)}</Link>
          </div>
        )}

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="rounded-3xl border-none shadow-2xl overflow-hidden max-w-[340px] sm:max-w-md p-0">
            <AlertDialogHeader className="p-8 pb-4">
              <div className="size-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
                <Trash2 className="size-6" />
              </div>
              <AlertDialogTitle className="text-xl font-black text-left">Delete post?</AlertDialogTitle>
              <AlertDialogDescription className="text-left text-muted-foreground text-sm font-medium leading-relaxed">
                This will remove this post from your profile and search results. This sends a request to relays, but decentralized deletion is not guaranteed across all clients and relays.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="bg-muted/30 p-4 px-8 flex-row items-center gap-3">
              <AlertDialogCancel className="flex-1 rounded-2xl h-12 font-black border-none bg-muted hover:bg-muted/80 m-0">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteClick?.();
                  setShowDeleteDialog(false);
                }}
                className="flex-1 rounded-2xl h-12 font-black bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg shadow-destructive/20 m-0"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <>
      {/* Repost Header */}
      {isRepost && (
        <div className={cn(
          "flex items-center space-x-2 text-muted-foreground text-xs font-bold mb-2 truncate min-w-0",
          showAvatar ? "ml-10" : "ml-0"
        )}>
          <Repeat2 size={14} className="shrink-0" aria-hidden="true" />
          <span className="truncate">{repostAuthorName} reposted</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-0.5 min-w-0">
        <div className="flex items-center space-x-1 truncate min-w-0" onClick={(e) => e.stopPropagation()}>
          {showAvatar && (
            <div className="mr-4 shrink-0 z-10">
              <Link href={finalProfileUrl} aria-label={`View ${display_name}'s profile`}>
                <Avatar 
                  pubkey={pubkey} 
                  src={avatar} 
                  isLoading={isLoading} 
                  size={48} 
                  nip05={nip05}
                  className="w-12 h-12 ring-4 ring-background" 
                  aria-hidden="true"
                />
              </Link>
            </div>
          )}
          <div className="flex items-center gap-1 truncate min-w-0">
            <Link href={finalProfileUrl} className="flex items-center gap-1 truncate min-w-0 hover:underline">
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
              {score > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center cursor-help">
                      <ShieldCheck className={cn(
                        "size-3",
                        score > 80 ? "text-green-500" : "text-muted-foreground/60"
                      )} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px] font-bold uppercase tracking-widest p-2">
                    WoT: {score}%
                  </TooltipContent>
                </Tooltip>
              )}
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
              {proxyProtocol && (
                <Badge variant="outline" className="h-4 px-1 rounded font-bold uppercase tracking-tighter text-[8px] bg-muted/5 text-muted-foreground border-border/50">
                  {proxyId?.startsWith('http') ? (
                    <a href={proxyId} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                      {proxyProtocol}
                    </a>
                  ) : (
                    proxyProtocol
                  )}
                </Badge>
              )}
            </div>
          </div>
          <span className="text-muted-foreground text-xs shrink-0 mt-1">·</span>
          {languageLabel && (
            <>
              <span className="text-muted-foreground text-[10px] font-black uppercase tracking-tighter mt-1.5 ml-0.5">{languageLabel}</span>
              <span className="text-muted-foreground text-xs shrink-0 mt-1 ml-0.5">·</span>
            </>
          )}
          {navigationHref ? (
            <Link 
              href={navigationHref} 
              className="text-muted-foreground text-xs whitespace-nowrap shrink-0 mt-1 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {formattedTime}
            </Link>
          ) : (
            <span className="text-muted-foreground text-xs whitespace-nowrap shrink-0 mt-1">
              {formattedTime}
            </span>
          )}

          {relevance && relevance.signals && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center shrink-0 mt-1 ml-1 cursor-help opacity-60 hover:opacity-100 transition-opacity">
                  <Sparkles className="size-3 text-blue-500" fill="currentColor" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px] text-[10px] font-bold uppercase tracking-widest p-2 bg-background border shadow-xl z-50">
                <div className="flex flex-col gap-1">
                  <span className="text-blue-500 mb-1">Recommended for you:</span>
                  {Object.entries(relevance.signals)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .slice(0, 3)
                    .map(([signal, value]) => {
                      let label = signal;
                      if (signal === 'isFollowing') label = 'Following';
                      if (signal === 'networkDegree2') label = 'In your network';
                      if (signal === 'interestMatch') label = 'Matches your interests';
                      if (signal === 'frequentInteraction') label = 'Someone you interact with';
                      if (signal === 'networkReaction') label = 'Liked by your friends';
                      if (signal === 'networkReply') label = 'Discussed by your friends';
                      if (signal === 'mutuals') label = 'Common connections';
                      if (signal === 'freshness') return null; // Skip freshness as a "reason"
                      
                      return (value as number) > 0 ? (
                        <div key={signal} className="flex justify-between gap-2">
                          <span>{label}</span>
                        </div>
                      ) : null;
                    })
                  }
                </div>
              </TooltipContent>
            </Tooltip>
          )}

          {clientName && (
            <span className="text-muted-foreground text-[10px] uppercase font-black tracking-tighter mt-1.5 opacity-40 ml-1 shrink-0">
              via {clientName}
            </span>
          )}
        </div>
        
        <DropdownMenu modal={false}>
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
          <DropdownMenuContent align="end" className="w-56" onCloseAutoFocus={(e) => e.preventDefault()}>
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
            {onSummarizeClick && (
              <DropdownMenuItem onClick={onSummarizeClick} className="gap-2 text-purple-500 focus:text-purple-600 focus:bg-purple-500/10">
                <BarChart2 className="size-4" aria-hidden="true" />
                <span>Summarize with AI</span>
              </DropdownMenuItem>
            )}
            {onDeleteClick && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onSelect={(e) => {
                    e.preventDefault();
                    setShowDeleteDialog(true);
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl overflow-hidden max-w-[340px] sm:max-w-md p-0">
          <AlertDialogHeader className="p-8 pb-4">
            <div className="size-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
              <Trash2 className="size-6" />
            </div>
            <AlertDialogTitle className="text-xl font-black text-left">Delete post?</AlertDialogTitle>
            <AlertDialogDescription className="text-left text-muted-foreground text-sm font-medium leading-relaxed">
              This will remove this post from your profile and search results. This sends a request to relays, but decentralized deletion is not guaranteed across all clients and relays.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="bg-muted/30 p-4 px-8 flex-row items-center gap-3">
            <AlertDialogCancel className="flex-1 rounded-2xl h-12 font-black border-none bg-muted hover:bg-muted/80 m-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.stopPropagation();
                onDeleteClick?.();
                setShowDeleteDialog(false);
              }}
              className="flex-1 rounded-2xl h-12 font-black bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg shadow-destructive/20 m-0"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
