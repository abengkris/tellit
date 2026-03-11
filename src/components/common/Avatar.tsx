"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useBlossom } from "@/hooks/useBlossom";
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
 * A robust Avatar component that handles Nostr profile pictures with:
 * 1. Blossom optimization support via next/image or direct URL
 * 2. Automatic fallback to Robohash on error or missing src
 * 3. Next.js Image optimization for better performance
 */
export const Avatar: React.FC<AvatarProps> = ({ 
  pubkey, 
  src, 
  size = 40, 
  className = "",
  isLoading = false,
  "aria-hidden": ariaHidden
}) => {
  const { getOptimizedUrl } = useBlossom();
  
  const robohashUrl = useMemo(() => `https://robohash.org/${pubkey}?set=set1`, [pubkey]);

  // Initialize displayUrl immediately to avoid flickering
  const [displayUrl, setDisplayUrl] = useState<string>(() => {
    if (!src || src.trim() === "") return robohashUrl;
    return src;
  });
  
  const [hasFallenBack, setHasFallenBack] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Sync state when src or pubkey changes
  useEffect(() => {
    if (isLoading) return;

    if (!src || src.trim() === "") {
      setDisplayUrl(robohashUrl);
      setHasFallenBack(true);
      return;
    }

    setHasFallenBack(false);
    
    // If it's already a robohash or data URL, just use it
    if (src.includes('robohash.org') || src.startsWith('data:')) {
      setDisplayUrl(src);
      return;
    }

    // Attempt Blossom optimization
    let isMounted = true;
    setIsOptimizing(true);
    
    getOptimizedUrl(src, { width: size * 2, height: size * 2, format: 'webp' })
      .then(optimized => {
        if (isMounted) {
          setDisplayUrl(optimized || src);
          setIsOptimizing(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setDisplayUrl(src);
          setIsOptimizing(false);
        }
      });
      
    return () => { isMounted = false; };
  }, [src, robohashUrl, size, getOptimizedUrl, isLoading]);

  const handleError = useCallback(() => {
    if (hasFallenBack) return;
    
    // If the current URL fails, fallback to robohash
    setHasFallenBack(true);
    setDisplayUrl(robohashUrl);
  }, [hasFallenBack, robohashUrl]);

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
      <AvatarImage
        asChild
        src={displayUrl}
        onLoadingStatusChange={(status) => {
          if (status === 'error') handleError();
        }}
      >
        <Image
          src={displayUrl}
          alt={pubkey}
          width={size}
          height={size}
          className="aspect-square size-full object-cover rounded-full"
          onError={handleError}
          unoptimized={displayUrl.startsWith('data:') || displayUrl.includes('robohash.org')}
          priority={size > 100} // Higher priority for large avatars (profiles)
        />
      </AvatarImage>
      <AvatarFallback>
        <Image
          src={robohashUrl}
          alt=""
          width={size}
          height={size}
          className="aspect-square size-full object-cover rounded-full"
          unoptimized
        />
      </AvatarFallback>
    </ShadcnAvatar>
  );
};
