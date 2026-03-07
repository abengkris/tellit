"use client";

import React from "react";
import { useTrending } from "@/hooks/useTrending";
import Link from "next/link";
import { TrendingUp } from "lucide-react";

export const TrendingTags = () => {
  const { trending, loading, error } = useTrending();

  const formatCount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M notes`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K notes`;
    return `${n} notes`;
  };

  if (error) return null;

  return (
    <section className="bg-gray-50 dark:bg-gray-900 rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800 animate-in fade-in duration-500">
      <div className="p-4 pb-2 flex items-center gap-2">
        <TrendingUp size={18} className="text-blue-500" />
        <h2 className="text-xl font-black">Trending</h2>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {loading ? (
          // Skeletons
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 space-y-2 animate-pulse">
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/4" />
            </div>
          ))
        ) : trending.length > 0 ? (
          trending.map((item) => (
            <Link 
              key={item.tag}
              href={`/search?q=${encodeURIComponent('#' + item.tag)}`}
              className="block p-4 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors group"
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-blue-500 transition-colors">
                Trending
              </p>
              <p className="font-black text-base text-gray-900 dark:text-white">
                #{item.tag}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatCount(item.count)}
              </p>
            </Link>
          ))
        ) : (
          <div className="p-8 text-center text-gray-500 italic text-sm">
            No trends found right now.
          </div>
        )}
        
        <Link 
          href="/search" 
          className="block p-4 text-blue-500 text-sm font-black hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
        >
          Show more
        </Link>
      </div>
    </section>
  );
};
