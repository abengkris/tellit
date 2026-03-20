"use client";

import React from "react";
import { 
  Avatar as ShadcnAvatar, 
  AvatarImage, 
  AvatarFallback 
} from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { useNIP05 } from "@/hooks/useNIP05";
import { getHandleTier, HandleTier } from "@/lib/utils/identity";

interface AvatarProps {
  pubkey: string;
  src?: string;
  size?: number;
  className?: string;
  isLoading?: boolean;
  nip05?: string;
  tier?: HandleTier; // Manual override
  "aria-hidden"?: boolean | "true" | "false";
}

/**
 * A simplified Avatar component that renders profile pictures with:
 * 1. Immediate fallback to Robohash if src is missing
 * 2. Next.js Image optimization
 * 3. Consistent styling across the app
 * 4. Tiered glow for Tell it! handles (Ultra, Premium, Standard)
 */
export const Avatar: React.FC<AvatarProps> = ({ 
  pubkey, 
  src, 
  size = 40, 
  className = "",
  isLoading = false,
  nip05,
  tier: tierProp,
  "aria-hidden": ariaHidden
}) => {
  const robohashUrl = `https://robohash.org/${pubkey}?set=set1`;
  const displayUrl = src || robohashUrl;

  // Internal tier check if nip05 is provided
  const nip05Status = useNIP05(pubkey, nip05);
  const activeTier = tierProp ?? (nip05Status === 'valid' ? getHandleTier(nip05) : 'none');

  if (isLoading) {
    return (
      <Skeleton 
        className={`rounded-full shrink-0 ${className}`}
        style={{ width: size, height: size }}
        aria-hidden={ariaHidden}
      />
    );
  }

  // Tiered glow styles
  let tierStyle = "";
  if (activeTier === 'ultra') {
    // Ultra (Gold/Amber) - Refined
    tierStyle = "ring-[1.5px] ring-amber-400/80 shadow-[0_0_10px_rgba(251,191,36,0.4)] dark:ring-amber-500/60 dark:shadow-[0_0_12px_rgba(245,158,11,0.25)] border-none";
  } else if (activeTier === 'premium') {
    // Premium (Diamond/Cyan) - Refined
    tierStyle = "ring-[1.5px] ring-cyan-400/80 shadow-[0_0_10px_rgba(34,211,238,0.4)] dark:ring-cyan-500/60 dark:shadow-[0_0_12px_rgba(6,182,212,0.25)] border-none";
  } else if (activeTier === 'standard') {
    // Standard (Blue) - Subtle Glow Added
    tierStyle = "ring-[1.5px] ring-blue-500/40 shadow-[0_0_8px_rgba(59,130,246,0.2)] dark:ring-blue-400/30 dark:shadow-[0_0_10px_rgba(37,99,235,0.15)] border-none";
  }

  return (
    <ShadcnAvatar size={size} className={`${tierStyle} ${className}`} aria-hidden={ariaHidden}>
      <AvatarImage asChild src={displayUrl}>
        <Image
          src={displayUrl}
          alt={pubkey}
          width={size}
          height={size}
          className="aspect-square size-full object-cover rounded-full"
          unoptimized={displayUrl.includes('robohash.org') || displayUrl.startsWith('data:')}
        />
      </AvatarImage>
      <AvatarFallback>
        <Image
          src={robohashUrl}
          alt={`Generated avatar for ${pubkey}`}
          width={size}
          height={size}
          className="aspect-square size-full object-cover rounded-full"
          unoptimized
        />
      </AvatarFallback>
    </ShadcnAvatar>
  );
};
