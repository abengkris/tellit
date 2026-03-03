"use client";

import React, { use } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useProfile } from "@/hooks/useProfile";
import { useFeed } from "@/hooks/useFeed";
import { PostCard } from "@/components/post/PostCard";
import { Loader2, Calendar, MapPin, Link as LinkIcon, Zap, Activity, Mail } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useNDK } from "@/hooks/useNDK";
import { useFollowingList } from "@/hooks/useFollowingList";
import { useFollowerCount } from "@/hooks/useFollowers";
import { FollowButton } from "@/components/profile/FollowButton";
import { ProfileEditModal } from "@/components/profile/ProfileEditModal";
import { UserStatusModal } from "@/components/profile/UserStatusModal";
import { UserIdentity } from "@/components/common/UserIdentity";
import { ZapModal } from "@/components/common/ZapModal";
import { useZaps } from "@/hooks/useZaps";
import { useRelayList } from "@/hooks/useRelayList";
import { useUserStatus } from "@/hooks/useUserStatus";
import { useLists } from "@/hooks/useLists";
import { Music, Activity as StatusIcon, Tag } from "lucide-react";
import { FollowedBy } from "@/components/profile/FollowedBy";

import Image from "next/image";
import Link from "next/link";

import { FeedList } from "@/components/feed/FeedList";
import { FeedSkeleton } from "@/components/feed/FeedSkeleton";
import { format } from "date-fns";
import { decodeNip19, shortenPubkey } from "@/lib/utils/nip19";

type ProfileTab = "posts" | "replies" | "media" | "articles" | "likes";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function ProfilePage({ params }: { params: Promise<{ npub: string }> }) {
  const { npub: npubParam } = use(params);
  const { id: hexPubkey } = decodeNip19(npubParam);
  
  const [activeTab, setActiveTab] = React.useState<ProfileTab>("posts");
  const { profile, loading: profileLoading } = useProfile(hexPubkey);
  const { relays: userRelays, loading: relaysLoading } = useRelayList(hexPubkey);
  const { generalStatus, musicStatus } = useUserStatus(hexPubkey);
  
  const { count: followingCount, loading: fwLoading } = useFollowingList(hexPubkey);
  const { count: followerCount, loading: fLoading } = useFollowerCount(hexPubkey);
  const { totalSats } = useZaps(hexPubkey, true);
  const { interests } = useLists(hexPubkey);

  const { ndk } = useNDK();
  const { user: currentUser } = useAuthStore();

  // Determine feed parameters based on tab
  const feedKinds = React.useMemo(() => {
    if (activeTab === "likes") return [7];
    if (activeTab === "articles") return [30023];
    return [1];
  }, [activeTab]);

  const disableFiltering = activeTab === "replies" || activeTab === "likes" || activeTab === "articles";
  
  const { posts, loading: feedLoading, loadMore, hasMore } = useFeed([hexPubkey], feedKinds, disableFiltering);

  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = React.useState(false);
  const [showZapModal, setShowZapModal] = React.useState(false);
  const isOwnProfile = currentUser?.pubkey === hexPubkey;

  const avatar = profile?.picture || `https://robohash.org/${hexPubkey}?set=set1`;
  const displayName = profile?.name || profile?.displayName || shortenPubkey(npubParam);

  const safeHostname = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  // Custom filter for tabs
  const filteredPosts = React.useMemo(() => {
    if (activeTab === "replies") {
      return posts.filter(p => p.tags.some(t => t[0] === 'e'));
    }
    if (activeTab === "posts") {
      return posts.filter(p => !p.tags.some(t => t[0] === 'e'));
    }
    if (activeTab === "media") {
      return posts.filter(p => {
        const hasMediaUrl = p.content.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|mov|mp4|webm)/i);
        const hasImeta = p.tags.some(t => t[0] === 'imeta');
        return hasMediaUrl || hasImeta;
      });
    }
    return posts;
  }, [posts, activeTab]);

  if (profileLoading) {
    return (
      <MainLayout>
        <div className="h-48 bg-gray-200 dark:bg-gray-800 animate-pulse" />
        <div className="px-4 pb-4 animate-pulse">
          <div className="relative flex justify-between items-end -mt-16 mb-4">
            <div className="w-32 h-32 rounded-full bg-gray-300 dark:bg-gray-700 ring-4 ring-white dark:ring-black" />
            <div className="w-32 h-10 rounded-full bg-gray-200 dark:bg-gray-800" />
          </div>
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
            <div className="h-4 bg-gray-100 dark:bg-gray-900 rounded w-full" />
            <div className="h-4 bg-gray-100 dark:bg-gray-900 rounded w-2/3" />
          </div>
        </div>
        <FeedSkeleton />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Header */}
      <div className="h-48 bg-gray-200 dark:bg-gray-800 relative overflow-hidden">
        {profile?.banner ? (
          <Image src={profile.banner} alt="Banner" fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-400 to-purple-500 opacity-20" />
        )}
      </div>

      <div className="px-4 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div className="relative flex justify-between items-end -mt-16 mb-4">
          <div className="p-1 bg-white dark:bg-black rounded-full ring-4 ring-white dark:ring-black">
            <Image 
              src={avatar} 
              alt={displayName} 
              width={128} 
              height={128} 
              className="w-32 h-32 rounded-full object-cover bg-gray-200" 
              unoptimized
            />
          </div>
          
          <div className="flex gap-2 items-center">
            {isOwnProfile ? (
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="px-6 py-2 border border-gray-300 dark:border-gray-700 rounded-full font-bold hover:bg-gray-50 dark:hover:bg-gray-900 transition-all"
              >
                Edit Profile
              </button>
            ) : currentUser && (
              <>
                <Link
                  href={`/messages/${npubParam}`}
                  className="p-2 border border-gray-300 dark:border-gray-700 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-all"
                  aria-label="Message User"
                >
                  <Mail size={20} />
                </Link>
                <button
                  onClick={() => setShowZapModal(true)}
                  className="p-2 border border-gray-300 dark:border-gray-700 rounded-full hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-yellow-500 transition-all"
                  aria-label="Zap User"
                >
                  <Zap size={20} fill="currentColor" />
                </button>
                <FollowButton targetPubkey={hexPubkey} size="lg" />
              </>
            )}
          </div>
        </div>

        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <UserIdentity 
              pubkey={hexPubkey}
              displayName={profile?.name || profile?.displayName}
              nip05={profile?.nip05}
              variant="profile"
            />
            {profile?.pronouns && (
              <span className="text-xs text-gray-500 font-medium bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded mt-1">
                {profile.pronouns}
              </span>
            )}
            {profile?.bot && (
              <span className="text-[10px] bg-blue-500/10 text-blue-500 border border-blue-500/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest mt-1">
                Bot
              </span>
            )}
          </div>
          
          {/* User Status Badges */}
          <div className="flex flex-wrap gap-2 py-1">
            {isOwnProfile && !generalStatus?.content && (
              <button 
                onClick={() => setIsStatusModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-800 text-gray-500 rounded-full text-xs font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <StatusIcon size={12} />
                <span>Set Status</span>
              </button>
            )}
            {generalStatus?.content && (
              <button 
                onClick={() => isOwnProfile && setIsStatusModalOpen(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold animate-in fade-in zoom-in-95 duration-500 ${isOwnProfile ? 'cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40' : ''}`}
              >
                <StatusIcon size={12} />
                <span>{generalStatus.content}</span>
                {generalStatus.link && (
                  <a href={generalStatus.link} target="_blank" rel="noopener noreferrer" className="hover:text-blue-500" onClick={e => e.stopPropagation()}>
                    <LinkIcon size={10} />
                  </a>
                )}
              </button>
            )}
            {musicStatus?.content && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-pink-50 dark:bg-pink-900/20 border border-pink-100 dark:border-pink-800 text-pink-600 dark:text-pink-400 rounded-full text-xs font-bold animate-in fade-in zoom-in-95 duration-500">
                <Music size={12} />
                <span>{musicStatus.content}</span>
                {musicStatus.link && (
                  <a href={musicStatus.link} target="_blank" rel="noopener noreferrer" className="hover:text-pink-500">
                    <LinkIcon size={10} />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Interests (NIP-51) */}
          {interests.size > 0 && (
            <div className="flex flex-wrap gap-2 py-1 animate-in fade-in slide-in-from-left duration-700">
              {Array.from(interests).map((interest) => (
                <Link
                  key={interest}
                  href={`/search?q=%23${interest}`}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-500 hover:border-blue-200 transition-all"
                >
                  <Tag size={10} />
                  <span>#{interest}</span>
                </Link>
              ))}
            </div>
          )}

          <p className="text-gray-500 text-xs font-mono break-all bg-gray-50 dark:bg-gray-900 p-2 rounded-xl border border-gray-100 dark:border-gray-800">
            {npubParam}
          </p>
        </div>

        {profile?.about && (
          <div className="mt-4 text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
            {profile.about}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-4 text-gray-500 text-sm">
          {profile?.website && (
            <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-1 hover:underline text-blue-500">
              <LinkIcon size={16} />
              <span>{safeHostname(profile.website)}</span>
            </a>
          )}
          <div className="flex items-center space-x-1">
            <Calendar size={16} />
            <span>
              {profile?.published_at 
                ? `${format(new Date(profile.published_at * 1000), "MMMM yyyy")}` 
                : "-"
              }
            </span>
          </div>
        </div>

        {!isOwnProfile && <FollowedBy pubkey={hexPubkey} />}

        {/* Stats */}
        <div className="flex gap-5 mt-4">
          <Link
            href={`/${npubParam}/followers?tab=following`}
            className="hover:underline flex items-center gap-1"
          >
            <span className="font-bold text-gray-900 dark:text-white">
              {fwLoading ? "–" : followingCount.toLocaleString()}
            </span>
            <span className="text-gray-500">Following</span>
          </Link>

          <Link href={`/${npubParam}/followers?tab=followers`} className="hover:underline flex items-center gap-1">
            <span className="font-bold text-gray-900 dark:text-white">
              {fLoading ? "–" : formatCount(followerCount)}
            </span>
            <span className="text-gray-500">Followers</span>
          </Link>

          <div className="flex items-center gap-1 cursor-default">
            <Zap size={14} className="text-yellow-500" fill="currentColor" />
            <span className="font-bold text-gray-900 dark:text-white">
              {formatCount(totalSats)}
            </span>
          </div>

          {!relaysLoading && userRelays.length > 0 && (
            <div className="flex items-center gap-1 cursor-default" title={userRelays.map(r => r.url).join("\n")}>
              <Activity size={14} className="text-green-500" />
              <span className="font-bold text-gray-900 dark:text-white">
                {userRelays.length}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800" role="tablist">
        {(["posts", "replies", "media", "articles", "likes"] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 text-sm font-bold capitalize transition-colors relative ${
              activeTab === tab ? "text-blue-500" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-blue-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="pb-20">
        <FeedList 
          posts={filteredPosts}
          isLoading={feedLoading}
          loadMore={loadMore}
          hasMore={hasMore}
          emptyMessage={`No ${activeTab} to show.`}
        />
      </div>

      <ProfileEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentProfile={profile}
        onSuccess={() => {
          // Force reload to see changes
          window.location.reload();
        }}
      />

      <UserStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        pubkey={hexPubkey}
      />

      {showZapModal && ndk && (
        <ZapModal
          user={ndk.getUser({ pubkey: hexPubkey })}
          onClose={() => setShowZapModal(false)}
        />
      )}
    </MainLayout>
  );
}
