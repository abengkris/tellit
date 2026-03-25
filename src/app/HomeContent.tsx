"use client";

import React, { useState, useEffect, useCallback, useMemo, memo, useRef, useTransition } from "react";
import { PostComposer } from "@/components/post/PostComposer";
import { useAuthStore } from "@/store/auth";
import { useNDK } from "@/hooks/useNDK";
import { useRouter } from "next/navigation";
import { Sparkles, Users, Globe, Hash, Settings } from "lucide-react";
import { FeedList } from "@/components/feed/FeedList";
import { NewPostsIsland } from "@/components/feed/NewPostsIsland";
import { useForYouFeed } from "@/hooks/useForYouFeed";
import { ProfileSetupCard } from "@/components/profile/ProfileSetupCard";
import { InterestSelector } from "@/components/feed/InterestSelector";
import { useUIStore } from "@/store/ui";
import { useLists } from "@/hooks/useLists";
import { useFollowing } from "@/hooks/useFollowing";
import Link from "next/link";
import { BackToTop } from "@/components/layout/BackToTop";

import { useNostrifyPausedFeed } from "@/hooks/useNostrifyPausedFeed";

type FeedTab = "following" | "forYou" | "global" | string;

export function HomeContent() {
  const { isLoggedIn, user, publicKey, isLoading: isAuthLoading, _hasHydrated } = useAuthStore();
  const { isReady } = useNDK();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FeedTab>("forYou");
  const [isPending, startTransition] = useTransition();
  const { interests } = useLists();
  const isRedirectingRef = useRef(false);

  const handleTabChange = useCallback((tab: FeedTab) => {
    startTransition(() => {
      setActiveTab(tab);
    });
  }, []);

  const interestList = useMemo(() => Array.from(interests), [interests]);

  const { following: followingPubkeys } = useFollowing(publicKey || undefined);

  console.log("[HomeContent] Render", { 
    isLoggedIn, 
    isReady, 
    isAuthLoading, 
    _hasHydrated, 
    activeTab,
    hasUser: !!user,
    hasPubkey: !!publicKey
  });

  // Load persisted tab
  useEffect(() => {
    if (_hasHydrated) {
      const savedTab = localStorage.getItem("home_active_tab");
      if (savedTab) {
        // If it's a dynamic tag, verify it still exists in interests
        if (["forYou", "following", "global"].includes(savedTab)) {
          Promise.resolve().then(() => setActiveTab(savedTab));
        } else if (interests.has(savedTab)) {
          Promise.resolve().then(() => setActiveTab(savedTab));
        }
      }
    }
  }, [_hasHydrated, interests]);

  // Save active tab
  useEffect(() => {
    if (_hasHydrated) {
      localStorage.setItem("home_active_tab", activeTab);
    }
  }, [activeTab, _hasHydrated]);

  // Protected route check
  useEffect(() => {
    if (_hasHydrated && !isAuthLoading && !isLoggedIn && !isRedirectingRef.current) {
      console.log("[HomeContent] Not logged in, redirecting to /login");
      isRedirectingRef.current = true;
      router.push("/login");
    }
  }, [isLoggedIn, isAuthLoading, _hasHydrated, router]);

  if (!isLoggedIn || !publicKey) return null;

  return (
    <>
      <div className="sticky top-[56px] sm:top-0 z-10 w-full bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="hidden sm:flex px-4 py-3">
          <h1 className="text-xl font-bold">Home</h1>
        </div>
        
        <nav className="flex w-full overflow-x-auto no-scrollbar scroll-smooth touch-pan-x" role="tablist">
          {isPending && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500/30 animate-pulse z-20" />
          )}
          <div className="flex flex-nowrap min-w-full">
            <button
              role="tab"
              aria-selected={activeTab === "forYou"}
              onClick={() => handleTabChange("forYou")}
              className={`flex-none px-5 py-4 text-sm font-bold transition-colors hover:bg-gray-100 dark:hover:bg-gray-900 relative whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
                activeTab === "forYou" ? "text-blue-500" : "text-gray-500"
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Sparkles size={16} />
                <span>For You</span>
              </div>
              {activeTab === "forYou" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-full mx-3" />
              )}
            </button>
            
            <button
              role="tab"
              aria-selected={activeTab === "following"}
              onClick={() => handleTabChange("following")}
              className={`flex-none px-5 py-4 text-sm font-bold transition-colors hover:bg-gray-100 dark:hover:bg-gray-900 relative whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
                activeTab === "following" ? "text-blue-500" : "text-gray-500"
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Users size={16} />
                <span>Following</span>
              </div>
              {activeTab === "following" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-full mx-3" />
              )}
            </button>

            {interestList.map((tag) => (
              <button
                key={tag}
                role="tab"
                aria-selected={activeTab === tag}
                onClick={() => handleTabChange(tag)}
                className={`flex-none px-5 py-4 text-sm font-bold transition-colors hover:bg-gray-100 dark:hover:bg-gray-900 relative whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
                  activeTab === tag ? "text-blue-500" : "text-gray-500"
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Hash size={16} />
                  <span className="capitalize">{tag}</span>
                </div>
                {activeTab === tag && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-full mx-3" />
                )}
              </button>
            ))}

            <button
              role="tab"
              aria-selected={activeTab === "global"}
              onClick={() => handleTabChange("global")}
              className={`flex-none px-5 py-4 text-sm font-bold transition-colors hover:bg-gray-100 dark:hover:bg-gray-900 relative whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
                activeTab === "global" ? "text-blue-500" : "text-gray-500"
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Globe size={16} />
                <span>Global</span>
              </div>
              {activeTab === "global" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-full mx-3" />
              )}
            </button>

            <Link
              href="/settings/profile"
              prefetch={false}
              className="flex-none px-5 py-4 text-gray-400 hover:text-blue-500 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
              title="Manage Interests"
              aria-label="Manage Interests"
            >
              <Settings size={18} />
            </Link>
          </div>
        </nav>
      </div>

      <PostComposer />

      {isLoggedIn && user && (
        <ProfileSetupCard pubkey={user.pubkey} />
      )}

      <div className="pb-20">
        {activeTab === "forYou" && (
          <ForYouFeedTab 
            viewerPubkey={publicKey} 
            followingList={followingPubkeys} 
            interests={interestList}
          />
        )}
        
        {activeTab === "following" && (
          <FollowingFeedTab 
            followingList={followingPubkeys} 
            viewerPubkey={publicKey}
          />
        )}

        {activeTab === "global" && (
          <GlobalFeedTab />
        )}

        {interestList.includes(activeTab) && (
          <InterestsFeedTab interestList={[activeTab]} />
        )}
      </div>
      <BackToTop />
    </>
  );
}

const InterestsFeedTab = memo(({ interestList }: { interestList: string[] }) => {
  const { posts, newCount, isLoading, flushNewPosts, loadMore, hasMore } =
    useNostrifyPausedFeed({ kinds: [1, 6, 16, 1068, 30023], limit: 50 });

  const handleFlush = useCallback(() => {
    flushNewPosts();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [flushNewPosts]);

  return (
    <div className="relative">
      <NewPostsIsland count={newCount} onFlush={handleFlush} />
      
      <div className="flex items-center gap-2 px-4 py-3 bg-blue-50/30 dark:bg-blue-900/5 text-[10px] text-blue-600 dark:text-blue-400 border-b border-gray-100 dark:border-gray-900 font-bold uppercase tracking-widest">
        <span>Posts matching your interests: {interestList.join(", ")}</span>
      </div>

      <FeedList 
        posts={posts}
        isLoading={isLoading}
        isProcessing={isProcessing}
        loadMore={loadMore}
        hasMore={hasMore}
        emptyMessage="No posts found matching your interests. Try adding more in your profile!"
      />
    </div>
  );
});

InterestsFeedTab.displayName = "InterestsFeedTab";

const ForYouFeedTab = memo(({ 
  viewerPubkey, 
  followingList,
  interests
}: { 
  viewerPubkey: string; 
  followingList: string[];
  interests: string[];
}) => {
  const { posts, scoredEvents, newCount, isLoading, isProcessing, wotStatus, wotSize, hasInterests, flushNewPosts, loadMore, hasMore } = 
    useForYouFeed({ viewerPubkey, followingList, interests });

  const handleFlush = useCallback(() => {
    flushNewPosts();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [flushNewPosts]);

  return (
    <div className="relative">
      {!hasInterests && <InterestSelector />}

      <NewPostsIsland count={newCount} onFlush={handleFlush} />
      
      <WoTStatusBanner status={wotStatus} size={wotSize} />

      <FeedList 
        posts={posts}
        scoredEvents={scoredEvents}
        isLoading={isLoading}
        isProcessing={isProcessing}
        loadMore={loadMore}
        hasMore={hasMore}
        emptyMessage={hasInterests 
          ? "Looking for something for you… Try following more people or adding more interests!"
          : "Looking for something for you… Try following more people!"}
        showSuggestions={true}
      />
    </div>
  );
});

ForYouFeedTab.displayName = "ForYouFeedTab";

function WoTStatusBanner({
  status,
  size,
}: {
  status: "idle" | "loading" | "ready" | "error";
  size: number;
}) {
  const { wotStrictMode, setWotStrictMode } = useUIStore();

  if (status === "ready") {
    if (size <= 1) {
      return (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50/30 dark:bg-amber-900/5 text-[10px] text-amber-600 dark:text-amber-400 border-b border-gray-100 dark:border-gray-900 font-bold uppercase tracking-widest">
          <span>💡 Tip: Follow more people to build your Web of Trust</span>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-blue-50/30 dark:bg-blue-900/5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2 text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
          <span>Web of Trust active · {size.toLocaleString()} users</span>
        </div>
        
        <button 
          onClick={() => setWotStrictMode(!wotStrictMode)}
          className={`text-[9px] font-black px-2 py-1 rounded-md transition-all uppercase tracking-tighter ${
            wotStrictMode 
            ? "bg-blue-500 text-white shadow-sm" 
            : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-blue-500"
          }`}
        >
          {wotStrictMode ? "🛡️ Spam Shield ON" : "Shield OFF"}
        </button>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-blue-50/30 dark:bg-blue-900/5 text-[10px] text-blue-600 dark:text-blue-400 border-b border-gray-100 dark:border-gray-900 font-bold uppercase tracking-widest">
        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
        <span>Building Web of Trust…</span>
        </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-red-50/30 dark:bg-red-900/5 text-[10px] text-red-600 dark:text-red-400 border-b border-gray-100 dark:border-gray-900 font-bold uppercase tracking-widest">
        <span>⚠️ WoT failed to load — showing following feed only</span>
      </div>
    );
  }

  return null;
}

const FollowingFeedTab = memo(({ followingList, viewerPubkey }: { followingList: string[]; viewerPubkey: string }) => {
  const authors = useMemo(() => followingList.length > 0 ? followingList : [viewerPubkey], [followingList, viewerPubkey]);
  
  const { posts, newCount, isLoading, flushNewPosts, loadMore, hasMore } =
    useNostrifyPausedFeed({ authors, kinds: [1, 6, 16, 1068, 30023], limit: 50 });

  const handleFlush = useCallback(() => {
    flushNewPosts();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [flushNewPosts]);

  return (
    <div className="relative">
      <NewPostsIsland count={newCount} onFlush={handleFlush} />
      <FeedList 
        posts={posts}
        isLoading={isLoading}
        loadMore={loadMore}
        hasMore={hasMore}
        emptyMessage="Try following some people to see their posts here!" 
      />
    </div>
  );
});

FollowingFeedTab.displayName = "FollowingFeedTab";

const GlobalFeedTab = memo(() => {
  const { posts, newCount, isLoading, flushNewPosts, loadMore, hasMore } =
    useNostrifyPausedFeed({ kinds: [1, 6, 16, 1068, 30023], limit: 50 });

  const handleFlush = useCallback(() => {
    flushNewPosts();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [flushNewPosts]);

  return (
    <div className="relative">
      <NewPostsIsland count={newCount} onFlush={handleFlush} />
      <FeedList 
        posts={posts}
        isLoading={isLoading}
        loadMore={loadMore}
        hasMore={hasMore}
        emptyMessage="The global feed is empty? That's impossible!" 
        showSuggestions={true}
      />
    </div>
  );
});

GlobalFeedTab.displayName = "GlobalFeedTab";
