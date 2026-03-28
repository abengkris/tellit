"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NDKEvent, NDKUser } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/hooks/useNDK";
import { PostCard } from "@/components/post/PostCard";
import { Search, Loader2, User as UserIcon, MessageSquare, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUIStore } from "@/store/ui";
import { Avatar } from "@/components/common/Avatar";
import { shortenPubkey } from "@/lib/utils/nip19";
import { SimplifiedUser } from "@/components/common/UserRecommendation";

interface NostrWineEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

interface NostrWineResponse {
  status: string;
  data: NostrWineEvent[];
}

const NOSTR_WINE_API_URL = "https://api.nostr.wine/v1/search";
const RESULTS_PER_PAGE = 20;

export function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ndk, isReady } = useNDK();
  const { addToast } = useUIStore();
  
  const initialQuery = searchParams.get("q") || "";
  const initialTab = (searchParams.get("t") as 'posts' | 'users') || "posts";
  const initialPage = parseInt(searchParams.get("p") || "1");

  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<'posts' | 'users'>(initialTab);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [fetchedPosts, setFetchedPosts] = useState<NDKEvent[]>([]);
  const [directMatch, setDirectMatch] = useState<{ type: 'user' | 'event', data: NDKUser | NDKEvent } | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const performSearch = useCallback(async (searchQuery: string, searchTab: string, searchPage: number) => {
    if (!searchQuery.trim() || !ndk || !isReady) return;

    setLoading(true);
    setDirectMatch(null);
    
    try {
      // 0. Check if query is a pubkey or event ID
      if (searchPage === 1) {
        const isHex = /^[0-9a-fA-F]{64}$/.test(searchQuery);
        const isNip19 = searchQuery.startsWith("npub") || searchQuery.startsWith("nprofile") || 
                        searchQuery.startsWith("note") || searchQuery.startsWith("nevent") || 
                        searchQuery.startsWith("naddr");
        
        if (isNip19 || isHex) {
          if (searchQuery.startsWith("npub") || searchQuery.startsWith("nprofile") || (isHex && !searchQuery.startsWith("note"))) {
            try {
              const user = ndk.getUser({ 
                npub: searchQuery.startsWith("npub") ? searchQuery : undefined,
                pubkey: isHex ? searchQuery : undefined
              });
              if (user) {
                await user.fetchProfile();
                setDirectMatch({ type: 'user', data: user });
              }
            } catch {
              console.warn("Direct user fetch failed");
            }
          } else if (searchQuery.startsWith("note") || searchQuery.startsWith("nevent") || searchQuery.startsWith("naddr") || isHex) {
            try {
              const event = await ndk.fetchEvent(searchQuery);
              if (event) setDirectMatch({ type: 'event', data: event });
            } catch {
              console.warn("Direct event fetch failed");
            }
          }
        }
      }

      // 1. Fetch from api.nostr.wine
      const kinds = "1,30023"; 
      const url = `${NOSTR_WINE_API_URL}?query=${encodeURIComponent(searchQuery)}&kind=${kinds}&limit=${RESULTS_PER_PAGE}&page=${searchPage}&sort=relevance`;
      
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any);
          return event;
        });

        if (searchPage === 1) {
          setFetchedPosts(ndkEvents);
        } else {
          setFetchedPosts(prev => [...prev, ...ndkEvents]);
        }
        setHasMore(result.data.length === RESULTS_PER_PAGE);
      } else {
        if (searchPage === 1) setFetchedPosts([]);
        setHasMore(false);
      }
    } catch (err) {
      console.error("Search failed:", err);
      addToast("Search failed. Please try again later.", "error");
    } finally {
      setLoading(false);
    }
  }, [ndk, isReady, addToast]);

  useEffect(() => {
    if (initialQuery && isReady && ndk) {
      performSearch(initialQuery, initialTab, initialPage);
    }
  }, [initialQuery, initialTab, initialPage, isReady, ndk, performSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setPage(1);
    const params = new URLSearchParams();
    params.set("q", query);
    params.set("t", activeTab);
    params.set("p", "1");
    router.push(`/search?${params.toString()}`);
  };

  const handleTabChange = (tab: string) => {
    const newTab = tab as 'posts' | 'users';
    setActiveTab(newTab);
    const params = new URLSearchParams();
    params.set("q", query);
    params.set("t", newTab);
    params.set("p", page.toString());
    router.push(`/search?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    const params = new URLSearchParams();
    params.set("q", query);
    params.set("t", activeTab);
    params.set("p", newPage.toString());
    router.push(`/search?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectUser = (u: SimplifiedUser | NDKUser) => {
    router.push(`/p/${u.pubkey}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header with Search Input */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search posts, users, or IDs…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-12 rounded-2xl pl-12 bg-muted/30 border-none shadow-sm focus-visible:ring-primary/20 font-medium"
            />
            {loading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Loader2 className="size-4 animate-spin text-primary" />
              </div>
            )}
          </form>
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Results Info & Tabs */}
        {initialQuery && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-black">
                Search Results for <span className="text-primary">&ldquo;{initialQuery}&rdquo;</span>
              </h1>
              {fetchedPosts.length > 0 && (
                <Badge variant="secondary" className="font-black">
                  {fetchedPosts.length}+ found
                </Badge>
              )}
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-muted/30 rounded-2xl">
                <TabsTrigger value="posts" className="rounded-xl font-black text-xs uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <MessageSquare className="size-4 mr-2" />
                  Posts
                </TabsTrigger>
                <TabsTrigger value="users" className="rounded-xl font-black text-xs uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <UserIcon className="size-4 mr-2" />
                  Users
                </TabsTrigger>
              </TabsList>

              <TabsContent value="posts" className="mt-6 focus-visible:ring-0">
                {/* Direct Match Event */}
                {directMatch?.type === 'event' && (
                  <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <div className="size-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Direct ID Match</span>
                    </div>
                    <Card className="border-2 border-primary/10 overflow-hidden rounded-3xl shadow-xl shadow-primary/5">
                      <PostCard event={directMatch.data as NDKEvent} variant="detail" />
                    </Card>
                  </div>
                )}

                {/* Direct Match User (when in posts tab) */}
                {directMatch?.type === 'user' && (
                  <div className="mb-8 p-1">
                    <Button 
                      variant="outline" 
                      className="w-full h-auto p-4 justify-between rounded-2xl bg-muted/20 border-primary/10 hover:bg-muted/30 group"
                      onClick={() => handleSelectUser(directMatch.data as NDKUser)}
                    >
                      <div className="flex items-center gap-4">
                        <Avatar 
                          pubkey={(directMatch.data as NDKUser).pubkey} 
                          src={(directMatch.data as NDKUser).profile?.picture} 
                          size={48} 
                          className="rounded-xl shadow-lg group-hover:scale-105 transition-transform"
                        />
                        <div className="text-left">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Jump to User</p>
                          <p className="font-bold text-lg">{(directMatch.data as NDKUser).profile?.display_name || (directMatch.data as NDKUser).profile?.name || shortenPubkey((directMatch.data as NDKUser).pubkey)}</p>
                        </div>
                      </div>
                      <ChevronRight className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                )}

                {/* Search Results */}
                {loading && page === 1 ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex gap-4 p-4">
                        <Skeleton className="size-12 rounded-full shrink-0" />
                        <div className="flex-1 space-y-3">
                          <Skeleton className="h-4 w-1/4" />
                          <Skeleton className="h-20 w-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : fetchedPosts.length > 0 ? (
                  <div className="space-y-4">
                    {fetchedPosts.map((post) => (
                      <div key={post.id} className="border-b border-border/50 last:border-0">
                        <PostCard event={post} />
                      </div>
                    ))}
                    
                    {/* Pagination */}
                    {(hasMore || page > 1) && (
                      <div className="flex items-center justify-center gap-4 py-8">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={page === 1}
                          onClick={() => handlePageChange(page - 1)}
                          className="rounded-full font-black text-[10px] uppercase tracking-widest h-10 px-6"
                        >
                          <ChevronLeft className="size-4 mr-2" />
                          Prev
                        </Button>
                        <span className="font-black text-sm tabular-nums text-muted-foreground">
                          Page {page}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!hasMore}
                          onClick={() => handlePageChange(page + 1)}
                          className="rounded-full font-black text-[10px] uppercase tracking-widest h-10 px-6"
                        >
                          Next
                          <ChevronRight className="size-4 ml-2" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : !loading && (
                  <div className="py-20 text-center">
                    <div className="size-16 bg-muted/30 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <Search className="size-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg font-black">No posts found</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2 font-medium">
                      We couldn&apos;t find any posts matching your query. Try different keywords or check the ID.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="users" className="mt-6 focus-visible:ring-0">
                {/* Users search is currently limited to direct match or wine results filtered */}
                {directMatch?.type === 'user' ? (
                  <div className="space-y-4">
                    <Button 
                      variant="ghost" 
                      className="w-full h-auto p-4 justify-start rounded-2xl hover:bg-muted/30 group"
                      onClick={() => handleSelectUser(directMatch.data as NDKUser)}
                    >
                      <Avatar 
                        pubkey={(directMatch.data as NDKUser).pubkey} 
                        src={(directMatch.data as NDKUser).profile?.picture} 
                        size={64} 
                        className="rounded-2xl shadow-xl mr-4 group-hover:scale-105 transition-transform"
                      />
                      <div className="text-left flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-xl">{(directMatch.data as NDKUser).profile?.display_name || (directMatch.data as NDKUser).profile?.name || shortenPubkey((directMatch.data as NDKUser).pubkey)}</p>
                          <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20 font-black text-[8px] uppercase tracking-tighter h-4">Exact Match</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium mb-1">@{shortenPubkey((directMatch.data as NDKUser).npub, 12)}</p>
                        {(directMatch.data as NDKUser).profile?.about && (
                          <p className="text-xs text-muted-foreground line-clamp-2 italic font-medium leading-relaxed">&ldquo;{(directMatch.data as NDKUser).profile?.about}&rdquo;</p>
                        )}
                      </div>
                    </Button>
                  </div>
                ) : (
                  <div className="py-20 text-center">
                    <div className="size-16 bg-muted/30 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <UserIcon className="size-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg font-black">Find people</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2 font-medium">
                      Enter a pubkey, npub, or name to find people on the decentralized web.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {!initialQuery && (
          <div className="py-20 text-center animate-in fade-in duration-700">
            <div className="size-24 bg-primary/5 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
              <Search className="size-10 text-primary/40" />
            </div>
            <h2 className="text-2xl font-black mb-2">Explore Nostr</h2>
            <p className="text-muted-foreground max-w-sm mx-auto font-medium leading-relaxed">
              Search for your friends, discover interesting posts, or jump directly to an ID. Everything is searchable.
            </p>
            
            <div className="mt-12 grid grid-cols-2 gap-4 max-w-sm mx-auto">
              <Card className="bg-muted/20 border-none shadow-sm hover:bg-muted/30 transition-colors cursor-pointer p-4 rounded-3xl text-left">
                <Filter className="size-5 text-primary mb-2" />
                <p className="font-black text-xs uppercase tracking-widest mb-1">Keywords</p>
                <p className="text-[10px] text-muted-foreground font-medium">Search content</p>
              </Card>
              <Card className="bg-muted/20 border-none shadow-sm hover:bg-muted/30 transition-colors cursor-pointer p-4 rounded-3xl text-left">
                <UserIcon className="size-5 text-primary mb-2" />
                <p className="font-black text-xs uppercase tracking-widest mb-1">Pubkeys</p>
                <p className="text-[10px] text-muted-foreground font-medium">Jump to profile</p>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
