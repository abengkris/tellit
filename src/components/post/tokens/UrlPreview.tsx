"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

interface Metadata {
  title: string;
  description?: string;
  image?: string;
  siteName?: string;
  url: string;
}

export function UrlPreview({ url }: { url: string }) {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Avoid previewing media directly (handled by other components)
    const isMedia = /\.(jpg|jpeg|png|gif|webp|mp4|webm|ogg|mp3|wav|avif|svg)/i.test(url);
    if (isMedia) {
      setLoading(false);
      return;
    }

    fetch(`/api/og?url=${encodeURIComponent(url)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(true);
        else setMetadata(data);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [url]);

  if (loading || error || !metadata || !metadata.title) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="block mt-3 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
    >
      {metadata.image && (
        <div className="relative aspect-[1.91/1] w-full border-b border-gray-200 dark:border-gray-800">
          <Image
            src={metadata.image}
            alt={metadata.title}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}
      <div className="p-3 space-y-1">
        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
          {metadata.siteName || new URL(url).hostname}
        </p>
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1">
          {metadata.title}
        </h3>
        {metadata.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
            {metadata.description}
          </p>
        )}
      </div>
    </a>
  );
}
