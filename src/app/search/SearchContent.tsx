"use client";

import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Search, Loader2, TrendingUp, X, CheckCircle2 } from "lucide-react";
import { useSearch } from "@/hooks/useSearch";
import { useDebounce } from "use-debounce";
import { PostCard } from "@/components/post/PostCard";
import Link from "next/link";
import Image from "next/image";
import { FeedSkeleton } from "@/components/feed/FeedSkeleton";
import { shortenPubkey } from "@/lib/utils/nip19";

export function SearchContent() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery] = useDebounce(searchInput, 300);
  const { posts, profiles, loading, loadMore, hasMore, directResult } = useSearch(debouncedQuery);

  const trendingTags = ["nostr", "bitcoin", "tellit", "art", "tech", "zap", "photography", "meme"];

  return (
    <MainLayout>
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="relative group">
          <label htmlFor="search-input" className="sr-only">Search people, hashtags, or content</label>
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
            <Search className="h-5 w-5" />
          </div>
          <input
            id="search-input"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search npub, note, #hashtag, or keyword…"
            className="block w-full pl-12 pr-12 py-3 border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-black transition-all font-medium"
            autoFocus
          />
          {searchInput && (
            <button 
              onClick={() => setSearchInput("")}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="p-0">
        {/* Direct Result (e.g. searching for a specific note/event) */}
        {directResult.event && (
          <section className="border-b-4 border-gray-100 dark:border-gray-900 animate-in slide-in-from-top duration-500">
            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 border-b border-blue-100 dark:border-blue-900/30">
              <span className="text-[10px] font-black uppercase tracking-tighter text-blue-500">Exact Match Found</span>
            </div>
            <PostCard event={directResult.event} />
          </section>
        )}

        {/* Initial/Empty Query State */}
        {!debouncedQuery && !loading && (
          <div className="animate-in fade-in duration-500">
            <div className="p-8 text-center text-gray-500">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-50 dark:bg-blue-900/10 text-blue-500 rounded-3xl mb-6">
                <Search size={40} />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Discovery</h2>
              <p className="text-sm max-w-xs mx-auto">Explore the Nostr network. Search for names, #hashtags, or paste a Nostr identifier (npub, note, nevent).</p>
            </div>

            <div className="px-6 py-4">
              <div className="flex items-center gap-2 mb-4 text-gray-400">
                <TrendingUp size={16} />
                <span className="text-xs font-black uppercase tracking-widest">Trending Topics</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {trendingTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSearchInput(`#${tag}`)}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-bold transition-all active:scale-95"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {loading && profiles.length === 0 && posts.length === 0 && !directResult.event && (
          <div className="p-6">
            <div className="h-4 w-32 bg-gray-100 dark:bg-gray-900 rounded-full animate-pulse mb-6" />
            <div className="flex overflow-x-auto pb-4 space-x-4 scrollbar-hide">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col items-center min-w-[120px] animate-pulse">
                  <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-gray-900 mb-3" />
                  <div className="h-3 w-20 bg-gray-100 dark:bg-gray-900 rounded mb-2" />
                  <div className="h-2 w-14 bg-gray-50 dark:bg-black rounded" />
                </div>
              ))}
            </div>
            <div className="mt-8">
              <FeedSkeleton />
            </div>
          </div>
        )}

        {debouncedQuery && profiles.length > 0 && (
          <section className="p-6 border-b border-gray-100 dark:border-gray-900 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">People</h2>
              <span className="text-[10px] font-bold bg-gray-100 dark:bg-gray-900 px-2 py-0.5 rounded-full text-gray-500">{profiles.length} found</span>
            </div>
            <div className="flex overflow-x-auto pb-4 gap-4 scrollbar-hide -mx-2 px-2">
              {profiles.map((user) => (
                <Link
                  key={user.pubkey}
                  href={`/${user.npub}`}
                  className={`flex flex-col items-center min-w-[130px] p-4 rounded-3xl transition-all text-center group ${
                    directResult.user?.pubkey === user.pubkey 
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" 
                    : "bg-gray-50 dark:bg-gray-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-transparent"
                  } border`}
                >
                  <div className="relative mb-3">
                    <Image
                      src={user.profile?.picture || `https://robohash.org/${user.pubkey}?set=set1`}
                      alt={user.profile?.name || "Profile"}
                      width={80}
                      height={80}
                      className="w-20 h-20 rounded-3xl object-cover bg-white dark:bg-black shadow-sm group-hover:scale-105 transition-transform duration-300"
                      unoptimized={true}
                    />
                    {(user.profile?.nip05 || directResult.user?.pubkey === user.pubkey) && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center border-2 border-white dark:border-black shadow-sm">
                        <CheckCircle2 size={12} fill="currentColor" className="text-white" />
                      </div>
                    )}
                  </div>
                  <p className="font-black text-sm truncate w-28 text-gray-900 dark:text-white">
                    {user.profile?.name || shortenPubkey(user.npub)}
                  </p>
                  <p className="text-[10px] text-gray-500 font-mono truncate w-28 mt-1">
                    {user.profile?.nip05 || shortenPubkey(user.npub, 10)}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {(posts.length > 0 || directResult.event) && (
          <section className="pb-20 animate-in fade-in duration-500">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 p-6">
              {directResult.event ? "Related Results" : "Posts & Articles"}
            </h2>
            <div className="divide-y divide-gray-100 dark:divide-gray-900">
              {posts
                .filter(post => post.id !== directResult.event?.id)
                .map((post) => (
                  <PostCard key={post.id} event={post} />
                ))
              }
            </div>
            {hasMore && posts.length >= 20 && (
              <div className="p-10 text-center border-t border-gray-100 dark:divide-gray-900">
                <button 
                  onClick={() => loadMore()}
                  disabled={loading}
                  className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl text-sm font-black transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={18} className="animate-spin" />
                      Loading Results…
                    </span>
                  ) : "Load More Content"}
                </button>
              </div>
            )}
          </section>
        )}

        {!loading && debouncedQuery && profiles.length === 0 && posts.length === 0 && !directResult.event && (
          <div className="text-center p-20 animate-in zoom-in-95 duration-300">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-2xl mb-6">
              <X size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">No matches found</h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">We couldn&apos;t find anything for &quot;{debouncedQuery}&quot;. Try a different keyword or hashtag.</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
