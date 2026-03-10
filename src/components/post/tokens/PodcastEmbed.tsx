"use client";

import React from "react";
import { Mic, ExternalLink, Play } from "lucide-react";

interface PodcastEmbedProps {
  itemGuid?: string;
  itemUrl?: string;
  podcastGuid?: string;
  podcastUrl?: string;
}

export function PodcastEmbed({ itemGuid, itemUrl, podcastGuid, podcastUrl }: PodcastEmbedProps) {
  if (!itemGuid && !podcastGuid) return null;

  const mainUrl = itemUrl || podcastUrl;
  const isFountain = mainUrl?.includes("fountain.fm");

  return (
    <div className="mt-3 border border-purple-500/20 bg-purple-500/5 rounded-2xl overflow-hidden">
      <div className="p-4 flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-purple-500/20">
          <Mic size={24} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
              Podcast {itemGuid ? "Episode" : "Show"}
            </span>
            {isFountain && (
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                Fountain
              </span>
            )}
          </div>
          
          <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
            {itemGuid?.replace("podcast:item:guid:", "") || podcastGuid?.replace("podcast:guid:", "")}
          </h4>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1 italic">
            GUID: {itemGuid || podcastGuid}
          </p>
        </div>
      </div>

      {mainUrl && (
        <a
          href={mainUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-between p-3 bg-purple-500/10 hover:bg-purple-500/20 transition-colors border-t border-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-xs"
        >
          <div className="flex items-center gap-2">
            <Play size={14} fill="currentColor" />
            <span>Listen to this episode</span>
          </div>
          <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
}
