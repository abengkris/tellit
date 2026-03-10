"use client";

import React, { useEffect, useState } from "react";
import { Mic, ExternalLink, Play, Loader2 } from "lucide-react";
import Image from "next/image";

interface PodcastEmbedProps {
  itemGuid?: string;
  itemUrl?: string;
  podcastGuid?: string;
  podcastUrl?: string;
}

interface Metadata {
  title: string;
  description?: string;
  image?: string;
  siteName?: string;
  url: string;
}

export function PodcastEmbed({ itemGuid, itemUrl, podcastGuid, podcastUrl }: PodcastEmbedProps) {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const mainUrl = itemUrl || podcastUrl;
  const isFountain = mainUrl?.includes("fountain.fm");

  useEffect(() => {
    if (!mainUrl) {
      setLoading(false);
      return;
    }

    fetch(`/api/og?url=${encodeURIComponent(mainUrl)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(true);
        else setMetadata(data);
      })
      .catch(() => setError(true))
      .finally(() => {
        setLoading(false);
      });
  }, [mainUrl]);

  if (!itemGuid && !podcastGuid) return null;

  return (
    <div className="mt-3 border border-purple-500/20 bg-purple-500/5 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="p-4 flex items-start gap-4">
        {/* Artwork / Icon */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0">
          {metadata?.image ? (
            <div className="w-full h-full rounded-xl overflow-hidden shadow-lg shadow-purple-500/20">
              <Image 
                src={metadata.image} 
                alt={metadata.title || "Podcast artwork"} 
                fill 
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="w-full h-full rounded-xl bg-purple-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              {loading ? <Loader2 size={24} className="animate-spin" /> : <Mic size={32} />}
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
              Podcast {itemGuid ? "Episode" : "Show"}
            </span>
            {isFountain && (
              <span className="text-[9px] font-black uppercase tracking-widest text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                Fountain
              </span>
            )}
          </div>
          
          <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 leading-tight line-clamp-2">
            {metadata?.title || itemGuid?.replace("podcast:item:guid:", "") || podcastGuid?.replace("podcast:guid:", "")}
          </h4>
          
          {metadata?.description ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">
              {metadata.description}
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1 italic">
              GUID: {itemGuid || podcastGuid}
            </p>
          )}

          {metadata?.siteName && (
            <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-wider">
              {metadata.siteName}
            </p>
          )}
        </div>
      </div>

      {mainUrl && (
        <a
          href={mainUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-between p-3 bg-purple-500/10 hover:bg-purple-500/20 transition-all border-t border-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-xs group"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
              <Play size={12} fill="currentColor" />
            </div>
            <span>Listen {itemGuid ? "to this episode" : "to this show"}</span>
          </div>
          <ExternalLink size={14} className="opacity-50" />
        </a>
      )}
    </div>
  );
}
