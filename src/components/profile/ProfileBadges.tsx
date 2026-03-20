"use client";

import React from "react";
import { useBadges, BadgeInfo } from "@/hooks/useBadges";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar } from "@/components/common/Avatar";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";

interface ProfileBadgesProps {
  pubkey: string;
}

export function ProfileBadges({ pubkey }: ProfileBadgesProps) {
  const { badges, loading } = useBadges(pubkey);

  if (loading) {
    return (
      <div className="flex gap-2 py-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="size-8 rounded-full" />
        ))}
      </div>
    );
  }

  if (badges.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-2 py-2">
        {badges.map((badge, i) => (
          <BadgeItem key={`${badge.definition.id}-${i}`} badge={badge} />
        ))}
      </div>
    </TooltipProvider>
  );
}

function BadgeItem({ badge }: { badge: BadgeInfo }) {
  const { definition } = badge;
  const imageUrl = definition.thumb || definition.image;

  if (!imageUrl) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative group cursor-help transition-transform hover:scale-110 active:scale-95">
          <div className="size-8 sm:size-10 rounded-full overflow-hidden border border-border bg-muted/30 shadow-sm ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
            <Image 
              src={imageUrl} 
              alt={definition.name || "Badge"} 
              width={40} 
              height={40}
              className="object-cover size-full"
              unoptimized
            />
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="p-3 max-w-[200px] rounded-2xl border-none shadow-2xl bg-white dark:bg-gray-900">
        <div className="space-y-1.5">
          <p className="font-black text-xs uppercase tracking-widest text-primary">
            {definition.name || "Nostr Badge"}
          </p>
          {definition.description && (
            <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
              {definition.description}
            </p>
          )}
          <div className="pt-1 flex items-center gap-1.5 border-t border-border/50 mt-1.5">
            <Avatar pubkey={definition.issuerPubkey} size={14} className="size-3.5" />
            <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">
              Issued by Issuer
            </span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
