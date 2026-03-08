"use client";

import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Search, Loader2, TrendingUp, X, CheckCircle2 } from "lucide-react";
import { useSearch } from "@/hooks/useSearch";
import { useDebounce } from "use-debounce";
import { PostCard } from "@/components/post/PostCard";
import Link from "next/link";
import Image from "next/image";
import { FeedSkeleton } from "@/components/feed/FeedSkeleton";
import { shortenPubkey } from "@/lib/utils/nip19";
import { useSearchParams, useRouter } from "next/navigation";
import { useFollowingList } from "@/hooks/useFollowingList";
import { useAuthStore } from "@/store/auth";
import { UserRecommendation } from "@/components/common/UserRecommendation";
import { NDKUser } from "@nostr-dev-kit/ndk";

export function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { followingUsers, loading: loadingFollowing } = useFollowingList(user?.pubkey);

  const initialQuery = searchParams.get("q") || "";
  
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");

  const [debouncedQuery] = useDebounce(searchInput, 300);
  const { posts, profiles, loading, loadMore, hasMore, directResult } = useSearch(debouncedQuery);

  // Mention filtering
  const filteredUsers = React.useMemo(() => {
    if (!mentionQuery) return followingUsers.slice(0, 8);
    const q = mentionQuery.toLowerCase();
    return followingUsers
      .filter(u => 
        String(u.profile?.name || "").toLowerCase().includes(q) || 
        String(u.profile?.display_name || "").toLowerCase().includes(q) ||
        String(u.profile?.nip05 || "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [followingUsers, mentionQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);

    if (value.startsWith("@")) {
      setMentionQuery(value.slice(1));
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const handleSelectUser = (u: NDKUser) => {
    setSearchInput(u.npub);
    setShowMentions(false);
  };

  // Sync URL with search input
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedQuery) {
      params.set("q", debouncedQuery);
    } else {
      params.delete("q");
    }
    
    // Update URL without a full page reload
    const queryStr = params.toString();
    const newUrl = queryStr ? `/search?${queryStr}` : "/search";
    
    // Only push if the query actually changed to avoid history spam
    if (window.location.search !== `?${queryStr}` && (window.location.search !== "" || queryStr !== "")) {
      router.replace(newUrl);
    }
  }, [debouncedQuery, router, searchParams]);

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
            onChange={handleSearchChange}
            placeholder="Search npub, note, #hashtag, or keyword…"
            className="block w-full pl-12 pr-12 py-3 border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-black transition-all font-medium"
            autoFocus
          />
          
          {showMentions && (
            <div className="absolute left-0 right-0 top-full mt-2">
              <UserRecommendation 
                users={filteredUsers} 
                onSelect={handleSelectUser} 
                isLoading={loadingFollowing}
              />
            </div>
          )}
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
        {/* Direct Results (Exact Matches) */}
        {(directResult.event || directResult.user) && (
          <section className="border-b-4 border-gray-100 dark:border-gray-900 animate-in slide-in-from-top duration-500">
            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 border-b border-blue-100 dark:border-blue-900/30 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-tighter text-blue-500 flex items-center gap-1.5">
                <CheckCircle2 size={12} />
                Exact Match Found
              </span>
            </div>
            
            {directResult.event && <PostCard event={directResult.event} />}
            
            {directResult.user && (
              <Link 
                href={`/${directResult.user.npub}`}
                className="flex items-center gap-4 p-6 bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <div className="relative">
                  <Image
                    src={directResult.user.profile?.picture || `https://robohash.org/${directResult.user.pubkey}?set=set1`}
                    alt={directResult.user.profile?.name || "Profile"}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-2xl object-cover bg-zinc-100 dark:bg-zinc-800 shadow-sm"
                    unoptimized
                  />
                  {directResult.user.profile?.nip05 && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center border-2 border-white dark:border-black shadow-sm">
                      <CheckCircle2 size={10} fill="currentColor" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-lg truncate">
                    {directResult.user.profile?.display_name || directResult.user.profile?.name || shortenPubkey(directResult.user.npub)}
                  </h3>
                  <p className="text-sm text-gray-500 font-mono truncate">
                    {directResult.user.profile?.nip05 
                      ? (directResult.user.profile.nip05.startsWith('_@') ? directResult.user.profile.nip05.substring(1) : directResult.user.profile.nip05)
                      : `@${directResult.user.profile?.name || shortenPubkey(directResult.user.npub, 12)}`}
                  </p>
                </div>
                <div className="bg-blue-500 text-white text-xs font-black px-4 py-2 rounded-xl shadow-lg shadow-blue-500/20">
                  View Profile
                </div>
              </Link>
            )}
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
          <div className="py-6 overflow-hidden">
            <div className="h-4 w-32 bg-gray-100 dark:bg-gray-900 rounded-full animate-pulse mb-6 px-6 mx-6" />
            <div className="flex overflow-x-auto pb-4 space-x-4 scrollbar-hide px-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex flex-col items-center min-w-[130px] max-w-[130px] animate-pulse">
                  <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-gray-900 mb-3" />
                  <div className="h-3 w-20 bg-gray-100 dark:bg-gray-900 rounded mb-2" />
                  <div className="h-2 w-14 bg-gray-50 dark:bg-black rounded" />
                </div>
              ))}
            </div>
            <div className="mt-8 px-0">
              <FeedSkeleton />
            </div>
          </div>
        )}

        {debouncedQuery && profiles.length > 0 && (
          <section className="py-6 border-b border-gray-100 dark:border-gray-900 animate-in fade-in duration-300 overflow-hidden">
            <div className="flex items-center justify-between mb-6 px-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">People</h2>
              <span className="text-[10px] font-bold bg-gray-100 dark:bg-gray-900 px-2 py-0.5 rounded-full text-gray-500">{profiles.length} found</span>
            </div>
            <div className="flex overflow-x-auto pb-4 gap-4 scrollbar-hide px-6">
              {profiles.map((user) => (
                <Link
                  key={user.pubkey}
                  href={`/${user.npub}`}
                  className={`flex flex-col items-center min-w-[130px] max-w-[130px] p-4 rounded-3xl transition-all text-center group ${
                    directResult.user?.pubkey === user.pubkey 
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" 
                    : "bg-gray-50 dark:bg-gray-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-transparent"
                  } border`}
                >
                  <div className="relative mb-3 shrink-0">
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
                  <p className="font-black text-sm truncate w-full text-gray-900 dark:text-white px-1">
                    {user.profile?.display_name || user.profile?.name || shortenPubkey(user.npub)}
                  </p>
                  <p className="text-[10px] text-gray-500 font-mono truncate w-full mt-1 px-1 lowercase">
                    {user.profile?.nip05 
                      ? (user.profile.nip05.startsWith('_@') ? user.profile.nip05.substring(1) : user.profile.nip05)
                      : `@${user.profile?.name || shortenPubkey(user.npub, 10)}`}
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
