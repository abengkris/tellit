"use client";

import Image from "next/image";
import React from "react";

interface AvatarProps {
  pubkey: string;
  src?: string;
  size?: number;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ pubkey, src, size = 40, className = "" }) => {
  const avatarUrl = src || `https://robohash.org/${pubkey}?set=set4`;

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
