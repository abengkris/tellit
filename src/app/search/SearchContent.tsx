"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Search, Loader2, TrendingUp, X, CheckCircle2 } from "lucide-react";
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
import { NDKEvent, NDKUser } from "@nostr-dev-kit/ndk";
import { getProfileUrl } from "@/lib/utils/identity";
import { useNDK } from "@/hooks/useNDK";
import { useTrending } from "@/hooks/useTrending";
import { useTrendingPosts } from "@/hooks/useTrendingPosts";

// Constants for API and pagination
const NOSTR_WINE_API_URL = "https://api.nostr.wine/search";
const RESULTS_PER_PAGE = 20;

// Define types for API response
interface NostrWineEvent {
  content: string;
  created_at: number;
  id: string;
  kind: number;
  pubkey: string;
  sig: string;
  tags: string[][];
}

interface NostrWineResponse {
  data: NostrWineEvent[];
  pagination: {
    last_page: boolean;
    limit: number;
    next_url: string | null;
    page: number;
    total_pages: number;
    total_records: number;
  };
}

export function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { ndk, isReady } = useNDK();
  const { followingUsers, loading: loadingFollowing } = useFollowingList(user?.pubkey);
  const { trending, loading: loadingTrending } = useTrending();
  const { trendingPosts, loading: loadingTrendingPosts } = useTrendingPosts(ndk, { hours: 24, order: "replies" });

  const initialQuery = searchParams.get("q") || "";
  
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");

  const [debouncedQuery] = useDebounce(searchInput, 500);

  // New state variables for search results
  const [fetchedPosts, setFetchedPosts] = useState<NDKEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [directMatch, setDirectMatch] = useState<{ type: 'user' | 'event', data: NDKUser | NDKEvent } | null>(null);

  // Function to fetch search results
  const fetchSearchResults = useCallback(async (query: string, page: number) => {
    if (!query || !ndk || !isReady) {
      if (!query) {
        setFetchedPosts([]);
        setDirectMatch(null);
        setHasMorePosts(true);
        setSearchError(null);
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    setSearchError(null);
    
    // Clear previous results for new search
    if (page === 1) {
      setFetchedPosts([]);
      setDirectMatch(null);
    }

    try {
      // 0. Handle direct matches (npub, note, nevent, nprofile, naddr)
      if (page === 1) {
        const isHex = /^[0-9a-fA-F]{64}$/.test(query);
        const isNip19 = query.startsWith("npub") || query.startsWith("nprofile") || 
                        query.startsWith("note") || query.startsWith("nevent") || 
                        query.startsWith("naddr");
        
        if (isNip19 || isHex) {
          if (query.startsWith("npub") || query.startsWith("nprofile") || (isHex && !query.startsWith("note"))) {
            try {
              const user = ndk.getUser({ 
                npub: query.startsWith("npub") ? query : undefined,
                pubkey: isHex ? query : undefined
              });
              if (user) {
                await user.fetchProfile();
                setDirectMatch({ type: 'user', data: user });
              }
            } catch {
              console.warn("Direct user fetch failed");
            }
          } else if (query.startsWith("note") || query.startsWith("nevent") || query.startsWith("naddr") || isHex) {
            try {
              const event = await ndk.fetchEvent(query);
              if (event) setDirectMatch({ type: 'event', data: event });
            } catch {
              console.warn("Direct event fetch failed");
            }
          }
        }
      }

      // 1. Fetch from api.nostr.wine
      // Documentation parameters: query, kind, since, until, limit, pubkey, sort, page, order, first_seen
      const kinds = "1,30023"; // Search for posts and long-form articles
      const url = `${NOSTR_WINE_API_URL}?query=${encodeURIComponent(query)}&kind=${kinds}&limit=${RESULTS_PER_PAGE}&page=${page}&sort=relevance`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const result: NostrWineResponse = await response.json();

      if (result.data && result.data.length > 0) {
        const ndkEvents = result.data.map(rawEvent => {
          const event = new NDKEvent(ndk, {
            id: rawEvent.id,
            pubkey: rawEvent.pubkey,
            created_at: rawEvent.created_at,
            kind: rawEvent.kind,
            tags: rawEvent.tags,
            content: rawEvent.content,
            sig: rawEvent.sig
          });
          return event;
        });

        setFetchedPosts(prevPosts => page === 1 ? ndkEvents : [...prevPosts, ...ndkEvents]);
        setHasMorePosts(!result.pagination.last_page);
        setCurrentPage(page);
      } else {
        if (page === 1) setFetchedPosts([]);
        setHasMorePosts(false);
      }

    } catch (error: unknown) {
      console.error("Search API error:", error);
      setSearchError(`Failed to fetch search results: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  }, [ndk, isReady]);

  // Trigger search when debouncedQuery changes
  useEffect(() => {
    if (debouncedQuery && debouncedQuery.length >= 2) {
      fetchSearchResults(debouncedQuery, 1);
    } else if (!debouncedQuery) {
      setFetchedPosts([]);
      setDirectMatch(null);
      setHasMorePosts(true);
      setSearchError(null);
      setIsLoading(false);
      setCurrentPage(1);
    }
  }, [debouncedQuery, fetchSearchResults]);

  // Load more function
  const loadMorePosts = useCallback(() => {
    if (!isLoading && hasMorePosts && debouncedQuery) {
      fetchSearchResults(debouncedQuery, currentPage + 1);
    }
  }, [isLoading, hasMorePosts, debouncedQuery, currentPage, fetchSearchResults]);

  // Mention filtering
  const filteredUsers = useMemo(() => {
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
      // Clear mention query if it's not a mention anymore
      if (mentionQuery) {
        setMentionQuery("");
      }
    }
  };

  const handleSelectUser = (u: NDKUser) => {
    setSearchInput(u.npub); // Set input to npub for search
    setMentionQuery(""); 
    setShowMentions(false);
    // Optionally trigger search for npub here if direct user lookup is implemented
  };

  // Sync URL with search input (debounced to avoid history spam)
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedQuery) {
      params.set("q", debouncedQuery);
    } else {
      params.delete("q");
    }
    
    const queryStr = params.toString();
    const newUrl = queryStr ? `/search?${queryStr}` : "/search";
    
    if (window.location.search !== `?${queryStr}` && (window.location.search !== "" || queryStr !== "")) {
      router.replace(newUrl, { scroll: false });
    }
  }, [debouncedQuery, router, searchParams]);

  const displayTrending = useMemo(() => {
    if (trending.length > 0) return trending.map(t => t.tag);
    return ["nostr", "bitcoin", "tellit", "art", "tech", "zap", "photography", "meme"];
  }, [trending]);

  return (
    <>
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
              onClick={() => {
                setSearchInput("");
                // Need to update debouncedQuery state as well to trigger the search effect
                // Since debouncedQuery is derived, we can't directly set it. Setting searchInput will cause debouncedQuery to eventually become empty.
                // To clear results immediately, we manually reset states.
                setFetchedPosts([]); 
                setDirectMatch(null);
                setHasMorePosts(true);
                setSearchError(null);
                setIsLoading(false);
                setCurrentPage(1);
                setMentionQuery(""); // Clear mention query too
                setShowMentions(false);
              }}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="p-0">
        {/* Direct Results (Exact Matches) - Placeholder, requires specific API support */}
        {directMatch && (
          <section className="border-b-4 border-gray-100 dark:border-gray-900 animate-in slide-in-from-top duration-500">
            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 border-b border-blue-100 dark:border-blue-900/30 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-tighter text-blue-500 flex items-center gap-1.5">
                <CheckCircle2 size={12} />
                Exact Match Found
              </span>
            </div>
            
            {directMatch.type === 'event' && <PostCard event={directMatch.data as NDKEvent} />}
            {directMatch.type === 'user' && (() => {
              const userMatch = directMatch.data as NDKUser;
              return (
                <Link 
                  href={getProfileUrl(userMatch)} 
                  className="flex items-center gap-4 p-6 bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="relative">
                    <Image
                      src={userMatch.profile?.picture || `https://robohash.org/${userMatch.pubkey}?set=set1`}
                      alt={userMatch.profile?.name || "Profile"}
                      width={64}
                      height={64}
                      className="w-16 h-16 rounded-2xl object-cover bg-zinc-100 dark:bg-zinc-800 shadow-sm"
                      unoptimized
                    />
                    {userMatch.profile?.nip05 && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center border-2 border-white dark:border-black shadow-sm">
                        <CheckCircle2 size={10} fill="currentColor" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-lg truncate">
                      {userMatch.profile?.display_name || userMatch.profile?.name || shortenPubkey(userMatch.pubkey)}
                    </h3>
                    <p className="text-sm text-gray-500 font-mono truncate">
                      {userMatch.profile?.nip05 
                        ? (userMatch.profile.nip05.startsWith('_@') ? userMatch.profile.nip05.substring(1) : userMatch.profile.nip05)
                        : `@${userMatch.profile?.name || shortenPubkey(userMatch.pubkey, 12)}`}
                    </p>
                  </div>
                  <div className="bg-blue-500 text-white text-xs font-black px-4 py-2 rounded-xl shadow-lg shadow-blue-500/20">
                    View Profile
                  </div>
                </Link>
              );
            })()}
          </section>
        )}

        {/* Initial/Empty Query State */}
        {!debouncedQuery && !isLoading && fetchedPosts.length === 0 && !directMatch && searchError === null && (
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
                {loadingTrending && trending.length === 0 ? (
                  <div className="flex flex-wrap gap-2 animate-pulse">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="h-9 w-20 bg-gray-100 dark:bg-gray-900 rounded-2xl" />
                    ))}
                  </div>
                ) : (
                  displayTrending.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setSearchInput(`#${tag}`)}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-bold transition-all active:scale-95"
                    >
                      #{tag}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Trending Posts Section */}
            <div className="mt-4">
              <div className="px-6 py-4 flex items-center gap-2 text-gray-400 border-t border-gray-100 dark:border-gray-900">
                <TrendingUp size={16} />
                <span className="text-xs font-black uppercase tracking-widest">Trending Posts</span>
              </div>
              
              {loadingTrendingPosts ? (
                <div className="mt-2">
                  <FeedSkeleton />
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-900">
                  {trendingPosts.map((post) => (
                    <PostCard key={post.id} event={post} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && fetchedPosts.length === 0 && !directMatch && (
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

        {/* Posts Results */}
        {fetchedPosts.length > 0 && (
          <section className="pb-20 animate-in fade-in duration-500">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 p-6">
              {directMatch?.type === 'event' ? "Related Results" : "Posts"}
            </h2>
            <div className="divide-y divide-gray-100 dark:divide-gray-900">
              {fetchedPosts.map((post) => (
                <PostCard key={post.id} event={post} />
              ))}
            </div>
            {hasMorePosts && fetchedPosts.length >= RESULTS_PER_PAGE && (
              <div className="p-10 text-center border-t border-gray-100 dark:divide-gray-900">
                <button 
                  onClick={loadMorePosts}
                  disabled={isLoading}
                  className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl text-sm font-black transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? (
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
        
        {/* No results found state */}
        {!isLoading && debouncedQuery && fetchedPosts.length === 0 && !directMatch && searchError === null && (
          <div className="text-center p-20 animate-in zoom-in-95 duration-300">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-2xl mb-6">
              <X size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">No matches found</h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">We couldn&apos;t find anything for &quot;{debouncedQuery}&quot;. Try a different keyword or hashtag.</p>
          </div>
        )}
        
        {/* Error state */}
        {searchError && (
          <div className="text-center p-20 animate-in zoom-in-95 duration-300">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-2xl mb-6">
              <X size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Search Error</h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">{searchError}</p>
          </div>
        )}
      </div>
    </>
  );
}
