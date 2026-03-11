"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useBlossom } from "@/hooks/useBlossom";
import { 
  Avatar as ShadcnAvatar, 
  AvatarImage, 
  AvatarFallback 
} from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

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
 * 1. Blossom optimization support
 * 2. Automatic fallback to Robohash on error or missing src
 * 3. Graceful loading states using shadcn/ui
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
  
  const getRobohash = useCallback((pk: string) => {
    return `https://robohash.org/${pk}?set=set1`;
  }, []);

  // Primary state for the image source
  const [displayUrl, setDisplayUrl] = useState<string>("");
  // Track if we've already tried falling back to the original src after an optimized one failed
  const [hasTriedOriginal, setHasTriedOriginal] = useState(false);
  // Track if we've already fallen back to robohash
  const [hasFallenBack, setHasFallenBack] = useState(false);

  // Initial set and reset on src/pubkey changes
  useEffect(() => {
    if (isLoading) return;

    if (!src || src.trim() === "") {
      setDisplayUrl(getRobohash(pubkey));
      setHasFallenBack(true);
      return;
    }

    setHasFallenBack(false);
    setHasTriedOriginal(false);

    // If it's already a robohash or data URL, don't optimize
    if (src.includes('robohash.org') || src.startsWith('data:')) {
      setDisplayUrl(src);
      return;
    }

    // Default to the provided src initially
    setDisplayUrl(src);

    // Attempt Blossom optimization if possible
    let isMounted = true;
    getOptimizedUrl(src, { width: size * 2, height: size * 2, format: 'webp' })
      .then(optimized => {
        if (isMounted && optimized && optimized !== src) {
          setDisplayUrl(optimized);
        }
      })
      .catch(() => {
        // Silent catch, we already set it to src
      });
      
    return () => { isMounted = false; };
  }, [src, pubkey, size, getOptimizedUrl, getRobohash, isLoading]);

  const handleError = () => {
    if (!src || hasFallenBack) return;

    if (!hasTriedOriginal && displayUrl !== src) {
      // If the optimized URL failed, try the original src
      setHasTriedOriginal(true);
      setDisplayUrl(src);
    } else {
      // If original src also fails, go to robohash
      setHasFallenBack(true);
      setDisplayUrl(getRobohash(pubkey));
    }
  };

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
        src={displayUrl || getRobohash(pubkey)}
        alt={pubkey}
        onError={handleError}
      />
      <AvatarFallback>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getRobohash(pubkey)}
          alt=""
          className="aspect-square size-full object-cover"
        />
      </AvatarFallback>
    </ShadcnAvatar>
  );
};
