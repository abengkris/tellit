"use client";

import { useState } from "react";
import { ImetaData } from "@/lib/content/tokenizer";
import { Blurhash } from "react-blurhash";

export function ImageEmbed({ 
  url, 
  imeta, 
  className = "", 
  noMargin = false 
}: { 
  url: string; 
  imeta?: ImetaData;
  className?: string;
  noMargin?: boolean;
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

  const aspectRatio = imeta?.dimensions 
    ? `${imeta.dimensions.w} / ${imeta.dimensions.h}`
    : undefined;

  return (
    <div 
      className={`relative overflow-hidden bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-full ${!noMargin ? 'rounded-2xl mt-3' : ''} ${className}`}
      style={{ aspectRatio, minHeight: !loaded ? '200px' : 'auto' }}
    >
      {/* Placeholder: Blurhash or Skeleton */}
      {!loaded && (
        <div className="absolute inset-0 w-full h-full">
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
            <div className="w-full h-full animate-pulse bg-gray-200 dark:bg-gray-800" />
          )}
        </div>
      )}

      <img
        src={displayUrl}
        alt={imeta?.alt || "Post media"}
        className={`w-full h-auto max-h-[70vh] object-cover transition-opacity duration-500 block mx-auto cursor-pointer ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        loading="lazy"
        onClick={e => {
          e.stopPropagation();
          window.open(url, "_blank");
        }}
      />
    </div>
  );
}
