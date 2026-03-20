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
import { isPremiumHandle } from "@/lib/utils/identity";

interface AvatarProps {
  pubkey: string;
  src?: string;
  size?: number;
  className?: string;
  isLoading?: boolean;
  nip05?: string;
  isPremium?: boolean; // Can be passed manually
  "aria-hidden"?: boolean | "true" | "false";
}

/**
 * A simplified Avatar component that renders profile pictures with:
 * 1. Immediate fallback to Robohash if src is missing
 * 2. Next.js Image optimization
 * 3. Consistent styling across the app
 * 4. Premium gold/orange glow for valid premium handles
 */
export const Avatar: React.FC<AvatarProps> = ({ 
  pubkey, 
  src, 
  size = 40, 
  className = "",
  isLoading = false,
  nip05,
  isPremium: isPremiumProp,
  "aria-hidden": ariaHidden
}) => {
  const robohashUrl = `https://robohash.org/${pubkey}?set=set1`;
  const displayUrl = src || robohashUrl;

  // Internal premium check if nip05 is provided
  const nip05Status = useNIP05(pubkey, nip05);
  const isActuallyPremium = isPremiumProp ?? (nip05Status === 'valid' && isPremiumHandle(nip05));

  if (isLoading) {
    return (
      <Skeleton 
        className={`rounded-full shrink-0 ${className}`}
        style={{ width: size, height: size }}
        aria-hidden={ariaHidden}
      />
    );
  }

  const premiumGlow = isActuallyPremium ? "ring-2 ring-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)] dark:ring-amber-500/80 dark:shadow-[0_0_20px_rgba(245,158,11,0.3)] border-none" : "";

  return (
    <ShadcnAvatar size={size} className={`${premiumGlow} ${className}`} aria-hidden={ariaHidden}>
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
