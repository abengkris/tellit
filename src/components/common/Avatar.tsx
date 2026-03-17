"use client";

import React from "react";
import { 
  Avatar as ShadcnAvatar, 
  AvatarImage, 
  AvatarFallback 
} from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";

interface AvatarProps {
  pubkey: string;
  src?: string;
  size?: number;
  className?: string;
  isLoading?: boolean;
  "aria-hidden"?: boolean | "true" | "false";
}

/**
 * A simplified Avatar component that renders profile pictures with:
 * 1. Immediate fallback to Robohash if src is missing
 * 2. Next.js Image optimization
 * 3. Consistent styling across the app
 */
export const Avatar: React.FC<AvatarProps> = ({ 
  pubkey, 
  src, 
  size = 40, 
  className = "",
  isLoading = false,
  "aria-hidden": ariaHidden
}) => {
  const robohashUrl = `https://robohash.org/${pubkey}?set=set1`;
  const displayUrl = src || robohashUrl;

  if (isLoading) {
    return (
      <Skeleton 
        className={`rounded-full shrink-0 ${className}`}
        style={{ width: size, height: size }}
        aria-hidden={ariaHidden}
      />
    );
  }

  return (
    <ShadcnAvatar size={size} className={className} aria-hidden={ariaHidden}>
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
