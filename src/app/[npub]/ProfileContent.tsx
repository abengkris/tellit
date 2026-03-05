"use client";

import React, { use } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useProfile } from "@/hooks/useProfile";
import { useFeed } from "@/hooks/useFeed";
import { Calendar, Link as LinkIcon, Zap, Activity, Mail, Share, Copy, Check, MoreVertical, Edit2, X, Music, Tag } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";
import { useNDK } from "@/hooks/useNDK";
import { useFollowingList } from "@/hooks/useFollowingList";
import { useFollowerCount } from "@/hooks/useFollowers";
import { FollowButton } from "@/components/profile/FollowButton";
import { ProfileEditModal } from "@/components/profile/ProfileEditModal";
import { UserStatusModal } from "@/components/profile/UserStatusModal";
import { UserIdentity } from "@/components/common/UserIdentity";
import { ZapModal } from "@/components/common/ZapModal";
import { DropdownMenu } from "@/components/common/DropdownMenu";
import { Emojify } from "@/components/common/Emojify";
import { updateStatus } from "@/lib/actions/profile";
import { useZaps } from "@/hooks/useZaps";
import { useRelayList } from "@/hooks/useRelayList";
import { useUserStatus } from "@/hooks/useUserStatus";
import { useLists } from "@/hooks/useLists";
import { usePinnedPosts } from "@/hooks/usePinnedPosts";
import { FollowedBy } from "@/components/profile/FollowedBy";
import { ExternalIdentities } from "@/components/profile/ExternalIdentities";
import { PostCard } from "@/components/post/PostCard";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams, usePathname, useRouter } from "next/navigation";

import { FeedList } from "@/components/feed/FeedList";
import { FeedSkeleton } from "@/components/feed/FeedSkeleton";
import { format } from "date-fns";
import { decodeNip19, shortenPubkey, toNpub } from "@/lib/utils/nip19";

type ProfileTab = "posts" | "replies" | "media" | "articles" | "likes";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function ProfileContent({ npubParam }: { npubParam: string }) {
  const { id: hexPubkey } = decodeNip19(npubParam);
  
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [activeTab, setActiveTab] = React.useState<ProfileTab>((searchParams.get("tab") as ProfileTab) || "posts");

  // Sync state with URL when it changes
  React.useEffect(() => {
    const tab = searchParams.get("tab") as ProfileTab;
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (tab: ProfileTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };
  const { profile, loading: profileLoading } = useProfile(hexPubkey);
  const { relays: userRelays, loading: relaysLoading } = useRelayList(hexPubkey);
  const { generalStatus, musicStatus } = useUserStatus(hexPubkey);
  
  const { count: followingCount, loading: fwLoading } = useFollowingList(hexPubkey);
  const { count: followerCount, loading: fLoading } = useFollowerCount(hexPubkey);
  const { totalSats } = useZaps(hexPubkey, true);
  const { interests, pinnedEventIds, externalIdentities } = useLists(hexPubkey);
  const { pinnedPosts } = usePinnedPosts(hexPubkey, pinnedEventIds);

  const { ndk } = useNDK();
  const { user: currentUser } = useAuthStore();
  const { addToast } = useUIStore();

  // Map activeTab to useFeed parameters
  const { feedKinds, feedFilter } = React.useMemo(() => {
    if (activeTab === "likes") return { feedKinds: [7], feedFilter: "all" as const };
    if (activeTab === "articles") return { feedKinds: [30023], feedFilter: "all" as const };
    if (activeTab === "media") return { feedKinds: [1, 30023], feedFilter: "media" as const };
    if (activeTab === "replies") return { feedKinds: [1], feedFilter: "replies" as const };
    return { feedKinds: [1], feedFilter: "posts" as const };
  }, [activeTab]);
  
  // Stabilize authors array
  const authors = React.useMemo(() => [hexPubkey], [hexPubkey]);
  
  const { posts, loading: feedLoading, loadMore, hasMore } = useFeed(authors, feedKinds, feedFilter);

  // Scroll to top on tab change
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = React.useState(false);
  const [showZapModal, setShowZapModal] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const isOwnProfile = currentUser?.pubkey === hexPubkey;

  const handleCopyNpub = async () => {
    try {
      await navigator.clipboard.writeText(npubParam);
      setCopied(true);
      addToast("Npub copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      addToast("Failed to copy npub", "error");
    }
  };

  const avatar = profile?.picture || `https://robohash.org/${hexPubkey}?set=set1`;
  const displayName = profile?.name || profile?.displayName || shortenPubkey(npubParam);

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${displayName} on Tell it!`,
          text: profile?.about?.slice(0, 100) || `Check out ${displayName}'s profile on Tell it!`,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error("Error sharing:", err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        addToast("Profile link copied to clipboard!", "success");
      } catch (err) {
        console.error("Error copying to clipboard:", err);
        addToast("Failed to copy link", "error");
      }
    }
  };

  const safeHostname = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

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
          <div className="p-1 bg-white dark:bg-black rounded-full ring-4 ring-white dark:ring-black shrink-0">
            <Image 
              src={avatar} 
              alt={displayName} 
              width={128} 
              height={128} 
              className="w-32 h-32 rounded-full object-cover bg-gray-200" 
              unoptimized
            />
          </div>
          
          <div className="flex gap-2 items-center flex-wrap justify-end">
            {isOwnProfile ? (
              <div className="flex gap-2 items-center">
                <DropdownMenu
                  trigger={
                    <button className="p-2 border border-gray-300 dark:border-gray-700 rounded-full hover:bg-gray-50 dark:hover:bg-gray-900 transition-all text-gray-500">
                      <MoreVertical size={20} />
                    </button>
                  }
                  items={[
                    {
                      label: "Edit Profile",
                      onClick: () => setIsEditModalOpen(true),
                      icon: <Edit2 size={16} />
                    },
                    {
                      label: "Share Profile",
                      onClick: handleShare,
                      icon: <Share size={16} />
                    },
                    {
                      label: "Copy Npub",
                      onClick: handleCopyNpub,
                      icon: <Copy size={16} />
                    }
                  ]}
                />
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                {currentUser && (
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
                <DropdownMenu
                  trigger={
                    <button className="p-2 border border-gray-300 dark:border-gray-700 rounded-full hover:bg-gray-50 dark:hover:bg-gray-900 transition-all text-gray-500">
                      <MoreVertical size={20} />
                    </button>
                  }
                  items={[
                    {
                      label: "Share Profile",
                      onClick: handleShare,
                      icon: <Share size={16} />
                    },
                    {
                      label: "Copy Npub",
                      onClick: handleCopyNpub,
                      icon: <Copy size={16} />
                    }
                  ]}
                />
              </div>
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
              tags={profile?.tags}
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
          <div className="flex flex-wrap gap-2 py-1.5">
            {isOwnProfile && !generalStatus?.content && (
              <button 
                onClick={() => setIsStatusModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 text-gray-500 rounded-full text-[11px] font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-500 hover:border-blue-200 dark:hover:border-blue-800 transition-all group"
              >
                <Activity size={12} className="group-hover:animate-pulse" />
                <span>Set Status</span>
              </button>
            )}
            {generalStatus?.content && (
              <div 
                className={`flex items-center gap-1.5 px-3 py-1 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/10 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full text-[11px] font-bold animate-in fade-in zoom-in-95 duration-500 group relative`}
              >
                <Activity size={12} />
                <span 
                  className={isOwnProfile ? "cursor-pointer hover:underline" : ""} 
                  onClick={() => isOwnProfile && setIsStatusModalOpen(true)}
                >
                  <Emojify text={generalStatus.content} tags={profile?.tags} />
                </span>
                {generalStatus.link && (
                  <a href={generalStatus.link} target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition-colors" onClick={e => e.stopPropagation()}>
                    <LinkIcon size={10} />
                  </a>
                )}
                {isOwnProfile && (
                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (ndk) {
                        await updateStatus(ndk, "", "general");
                        window.location.reload();
                      }
                    }}
                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                    title="Clear status"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            )}
            {musicStatus?.content && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-pink-500/5 dark:bg-pink-500/10 border border-pink-500/10 dark:border-pink-500/20 text-pink-600 dark:text-pink-400 rounded-full text-[11px] font-bold animate-in fade-in zoom-in-95 duration-500">
                <Music size={12} className="animate-bounce" style={{ animationDuration: '3s' }} />
                <span><Emojify text={musicStatus.content} tags={profile?.tags} /></span>
                {musicStatus.link && (
                  <a href={musicStatus.link} target="_blank" rel="noopener noreferrer" className="hover:text-pink-500 transition-colors">
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
        </div>

        {profile?.about && (
          <div className="mt-4 text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
            <Emojify text={profile.about} tags={profile.tags} />
          </div>
        )}

        <ExternalIdentities identities={externalIdentities} />

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
          {profile?.lud16 && (
            <div className="flex items-center space-x-1 text-yellow-600 dark:text-yellow-500">
              <Zap size={16} fill="currentColor" />
              <span>{profile.lud16}</span>
            </div>
          )}
        </div>

        {!isOwnProfile && <FollowedBy pubkey={hexPubkey} />}

        {/* Stats */}
        <div className="flex gap-5 mt-4 text-sm">
          <Link
            href={`/${npubParam}/followers?tab=following`}
            className="hover:underline flex items-center gap-1"
          >
            <span className="font-bold text-gray-900 dark:text-white">
              {fwLoading ? "–" : followingCount.toLocaleString()}
            </span>
            <span className="text-gray-500 text-xs">Following</span>
          </Link>

          <Link href={`/${npubParam}/followers?tab=followers`} className="hover:underline flex items-center gap-1">
            <span className="font-bold text-gray-900 dark:text-white">
              {fLoading ? "–" : formatCount(followerCount)}
            </span>
            <span className="text-gray-500 text-xs">Followers</span>
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
            onClick={() => handleTabChange(tab)}
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
        {/* Pinned Posts Section */}
        {activeTab === "posts" && pinnedPosts.length > 0 && (
          <div className="border-b-4 border-gray-100 dark:border-gray-900 bg-blue-50/5">
            {pinnedPosts.map((post) => (
              <PostCard key={`pinned-${post.id}`} event={post} />
            ))}
          </div>
        )}

        <FeedList 
          posts={posts.filter(p => !pinnedEventIds.has(p.id))}
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
