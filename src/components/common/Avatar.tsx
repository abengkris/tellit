"use client";

import Image from "next/image";
import React, { useState, useEffect } from "react";
import { useBlossom } from "@/hooks/useBlossom";

interface AvatarProps {
  pubkey: string;
  src?: string;
  size?: number;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ pubkey, src, size = 40, className = "" }) => {
  const { getOptimizedUrl } = useBlossom();
  
  // Use a derived initial state to avoid immediate effect-triggered re-render
  const getInitialUrl = () => {
    if (!src) return `https://robohash.org/${pubkey}?set=set1`;
    if (src.startsWith('data:')) return src;
    // We can't synchronously get optimized URL if it's async, 
    // so we start with original src and optimize in effect.
    return src;
  };

  const [avatarUrl, setAvatarUrl] = useState<string>(getInitialUrl);

  useEffect(() => {
    if (!src) {
      setAvatarUrl(`https://robohash.org/${pubkey}?set=set1`);
      return;
    }
    
    if (src.startsWith('data:')) {
      setAvatarUrl(src);
      return;
    }

    // Optimization: Request optimized avatar at 2x size for high-DPI displays
    let isMounted = true;
    getOptimizedUrl(src, { width: size * 2, height: size * 2, format: 'webp' })
      .then(url => {
        if (isMounted) setAvatarUrl(url);
      })
      .catch(() => {
        if (isMounted) setAvatarUrl(src);
      });
      
    return () => { isMounted = false; };
  }, [src, pubkey, size, getOptimizedUrl]);

  return (
    <div 
      className={`relative rounded-full overflow-hidden bg-gray-200 dark:bg-gray-800 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={avatarUrl}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        className="object-cover w-full h-full"
        unoptimized
      />
    </div>
  );
};
