"use client";

import { useState } from "react";
import { ImetaMetadata } from "@/lib/content/tokenizer";
import { Blurhash } from "react-blurhash";

export function ImageEmbed({ 
  url, 
  imeta, 
  className = "", 
  noMargin = false,
  objectFit = "contain",
  onClick
}: { 
  url: string; 
  imeta?: ImetaMetadata;
  className?: string;
  noMargin?: boolean;
  objectFit?: "contain" | "cover";
  onClick?: () => void;
}) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // We'll skip optimization for now to ensure maximum compatibility
  const displayUrl = url;

  if (error) {
    return (
      <div className="mt-3 p-4 bg-gray-100 dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center gap-2 text-gray-500">
        <span className="text-xs font-bold uppercase tracking-widest">Failed to load image</span>
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-[10px] text-blue-500 hover:underline break-all text-center px-4"
        >
          {url}
        </a>
      </div>
    );
  }

  const aspectRatio = (imeta?.dimensions?.w && imeta?.dimensions?.h)
    ? `${imeta.dimensions.w} / ${imeta.dimensions.h}`
    : undefined;

  return (
    <div 
      className={`relative overflow-hidden bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 mx-auto ${!noMargin ? 'rounded-2xl mt-3' : ''} ${className}`}
      style={{ 
        aspectRatio, 
        maxHeight: '80vh',
        width: aspectRatio ? 'auto' : '100%',
        maxWidth: '100%',
        minHeight: !loaded && !aspectRatio ? '200px' : 'auto' 
      }}
    >
      {/* Placeholder: Blurhash or Skeleton */}
      {!loaded && (
        <div className="absolute inset-0 w-full h-full z-0">
          {imeta?.blurhash ? (
            <Blurhash
              hash={imeta.blurhash}
              width="100%"
              height="100%"
              resolutionX={32}
              resolutionY={32}
              punch={1}
            />
          ) : (
            <div className="w-full h-full animate-pulse bg-gray-200 dark:bg-zinc-800" />
          )}
        </div>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={displayUrl}
        alt={imeta?.alt || "Post media"}
        className={`w-full h-full max-h-[80vh] transition-opacity duration-500 block mx-auto cursor-pointer relative z-10 ${
          objectFit === "cover" ? "object-cover" : "object-contain"
        } ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        loading="lazy"
        decoding="async"
        onClick={e => {
          e.stopPropagation();
          onClick?.();
        }}
      />
    </div>
  );
}
