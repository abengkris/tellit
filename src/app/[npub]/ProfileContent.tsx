"use client";

import React from "react";
import { useProfile } from "@/hooks/useProfile";
import { useFeed } from "@/hooks/useFeed";
import { Calendar, Link as LinkIcon, Zap, Activity, Mail, Share, Copy, MoreVertical, Edit2, X, Music, Tag, Clock, RefreshCw, VolumeX, Volume2, Flag, Cake } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";
import { useNDK } from "@/hooks/useNDK";
import { useFollowingList } from "@/hooks/useFollowingList";
import { useFollowerCount } from "@/hooks/useFollowers";
import { FollowButton } from "@/components/profile/FollowButton";
import { UserStatusModal } from "@/components/profile/UserStatusModal";
import { UserIdentity } from "@/components/common/UserIdentity";
import { ZapModal } from "@/components/common/ZapModal";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
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
import { MediaGrid } from "@/components/profile/MediaGrid";
import { FormattedAbout } from "@/components/profile/FormattedAbout";
import { ProfileBadges } from "@/components/profile/ProfileBadges";
import { Avatar } from "@/components/common/Avatar";
import { useWoT } from "@/hooks/useWoT";
import { ShieldCheck, Users } from "lucide-react";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams, usePathname, useRouter } from "next/navigation";

import { FeedList } from "@/components/feed/FeedList";
import { FeedSkeleton } from "@/components/feed/FeedSkeleton";
import { format } from "date-fns";
import { decodeNip19, shortenPubkey } from "@/lib/utils/nip19";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ProfileTab = "posts" | "replies" | "media" | "articles" | "highlights";

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
  const { profile, loading: profileLoading, profileUrl, refresh: refreshProfile } = useProfile(hexPubkey);
  const { score, mutualCount } = useWoT(hexPubkey);
  const { relays: userRelays, loading: relaysLoading } = useRelayList(hexPubkey);
  const { generalStatus, musicStatus } = useUserStatus(hexPubkey);
  
  const { count: followingCount, loading: fwLoading } = useFollowingList(hexPubkey);
  const { count: followerCount, loading: fLoading } = useFollowerCount(hexPubkey);
  const { totalSats } = useZaps(hexPubkey, true);
  const { interests, pinnedEventIds, externalIdentities } = useLists(hexPubkey);
  const { muteUser, unmuteUser, isMuted } = useLists();
  const { pinnedPosts } = usePinnedPosts(hexPubkey, pinnedEventIds);

  const { ndk } = useNDK();
  const { user: currentUser } = useAuthStore();
  const { addToast } = useUIStore();

  // Map activeTab to useFeed parameters
  const { feedKinds, feedFilter } = React.useMemo(() => {
    if (activeTab === "highlights") return { feedKinds: [9802], feedFilter: "all" as const };
    if (activeTab === "articles") return { feedKinds: [30023], feedFilter: "all" as const };
    if (activeTab === "media") return { feedKinds: [1, 20, 1063, 30023], feedFilter: "media" as const };
    if (activeTab === "replies") return { feedKinds: [1, 1111], feedFilter: "replies" as const };
    return { feedKinds: [1, 6, 16, 1068], feedFilter: "posts" as const };
  }, [activeTab]);
  
  // Stabilize authors array
  const authors = React.useMemo(() => [hexPubkey], [hexPubkey]);
  
  const { posts, loading: feedLoading, loadMore, hasMore } = useFeed(authors, feedKinds, feedFilter);

  // Scroll to top on tab change
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  const [isStatusModalOpen, setIsStatusModalOpen] = React.useState(false);
  const [showZapModal, setShowZapModal] = React.useState(false);
  const [showDatesModal, setShowDatesModal] = React.useState(false);
  const isOwnProfile = currentUser?.pubkey === hexPubkey;

  const handleCopyNpub = async () => {
    try {
      await navigator.clipboard.writeText(npubParam);
      addToast("Npub copied to clipboard!", "success");
    } catch (err) {
      console.error("Failed to copy:", err);
      addToast("Failed to copy npub", "error");
    }
  };

  const handleMute = async () => {
    const muted = isMuted(hexPubkey);
    const success = muted ? await unmuteUser(hexPubkey) : await muteUser(hexPubkey);
    if (success) {
      addToast(muted ? `Unmuted ${display_name}` : `Muted ${display_name}`, "success");
    } else {
      addToast("Failed to update mute list", "error");
    }
  };

  const display_name = profile?.display_name || profile?.name || shortenPubkey(npubParam);

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${display_name} on Tell it!`,
          text: profile?.about?.slice(0, 100) || `Check out ${display_name}'s profile on Tell it!`,
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
      <>
        <div className="h-32 sm:h-48 bg-muted animate-pulse" />
        <div className="px-4 pb-4 animate-pulse">
          <div className="relative flex justify-between items-end -mt-10 sm:-mt-16 mb-4">
            <div className="size-20 sm:size-32 rounded-full bg-muted ring-4 ring-background" />
            <div className="w-32 h-10 rounded-full bg-muted" />
          </div>
          <div className="space-y-3">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </div>
        <FeedSkeleton />
      </>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="h-32 sm:h-48 bg-muted relative overflow-hidden">
        {profile?.banner ? (
          <Image src={profile.banner} alt="Banner" fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full bg-linear-to-r from-primary/20 to-purple-500/20" />
        )}
      </div>

      <div className="px-4 pb-4 border-b border-border">
        <div className="relative flex justify-between items-end -mt-10 sm:-mt-16 mb-4">
          <div className="p-1 bg-background rounded-full ring-4 ring-background shrink-0 overflow-hidden">
            <Avatar 
              pubkey={hexPubkey} 
              src={profile?.picture || (profile as { image?: string })?.image} 
              size={128} 
              nip05={profile?.nip05}
              className="!size-20 sm:!size-32 border-none shadow-none" 
              aria-hidden="true"
            />
          </div>
          
          <div className="flex gap-2 items-center flex-wrap justify-end">
            <div className="flex gap-2 items-center">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={refreshProfile}
                disabled={profileLoading}
                className="rounded-full h-10 w-10 text-muted-foreground border-border hover:bg-accent"
                title="Refresh Profile"
              >
                <RefreshCw className={cn("size-5", profileLoading && "animate-spin")} aria-hidden="true" />
                <span className="sr-only">Refresh profile</span>
              </Button>

              {!isOwnProfile && currentUser && (
                <>
                  <Button asChild variant="outline" size="icon" className="rounded-full h-10 w-10 text-primary border-border hover:bg-primary/10">
                    <Link href={`/messages/${npubParam}`} aria-label="Message User">
                      <Mail className="size-5" aria-hidden="true" />
                    </Link>
                  </Button>
                  <FollowButton targetPubkey={hexPubkey} size="lg" />
                </>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="rounded-full h-10 w-10 text-muted-foreground border-border hover:bg-accent">
                    <MoreVertical className="size-5" aria-hidden="true" />
                    <span className="sr-only">More options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {isOwnProfile && (
                    <DropdownMenuItem onClick={() => router.push("/settings/profile")} className="gap-2">
                      <Edit2 className="size-4" aria-hidden="true" />
                      <span>Edit Profile</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleShare} className="gap-2">
                    <Share className="size-4" aria-hidden="true" />
                    <span>Share Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyNpub} className="gap-2">
                    <Copy className="size-4" aria-hidden="true" />
                    <span>Copy Npub</span>
                  </DropdownMenuItem>
                  {!isOwnProfile && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={handleMute} 
                        className={cn("gap-2", !isMuted(hexPubkey) && "text-destructive focus:text-destructive")}
                      >
                        {isMuted(hexPubkey) ? <Volume2 className="size-4" aria-hidden="true" /> : <VolumeX className="size-4" aria-hidden="true" />}
                        <span>{isMuted(hexPubkey) ? "Unmute User" : "Mute User"}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addToast("Report feature coming soon", "info")} className="gap-2 text-destructive focus:text-destructive">
                        <Flag className="size-4" aria-hidden="true" />
                        <span>Report User</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <UserIdentity 
              pubkey={hexPubkey}
              display_name={profile?.display_name}
              name={profile?.name}
              nip05={profile?.nip05}
              variant="profile"
              tags={profile?.tags}
            />
            {profile?.pronouns && (
              <Badge variant="secondary" className="h-5 px-1.5 font-medium rounded-md mt-1 lowercase">
                {profile.pronouns}
              </Badge>
            )}
            {profile?.bot && (
              <Badge variant="secondary" className="h-5 px-1.5 font-black uppercase tracking-widest text-[9px] bg-primary/10 text-primary border-primary/20 rounded-md mt-1">
                Bot
              </Badge>
            )}
            {score > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 font-black uppercase tracking-widest text-[9px] bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 rounded-md mt-1 gap-1">
                <ShieldCheck size={10} />
                WoT: {score}%
              </Badge>
            )}
            {mutualCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 font-black uppercase tracking-widest text-[9px] bg-primary/10 text-primary border-primary/20 rounded-md mt-1 gap-1">
                <Users size={10} />
                Trusted by {mutualCount} friends
              </Badge>
            )}
          </div>
          
          {/* User Status Badges */}
          <div className="flex flex-wrap gap-2 py-1.5">
            {isOwnProfile && !generalStatus?.content && (
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => setIsStatusModalOpen(true)}
                className="h-7 px-3 bg-muted/40 border border-border text-muted-foreground rounded-full text-[11px] font-black hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all group gap-1.5"
              >
                <Activity size={12} className="group-hover:animate-pulse" aria-hidden="true" />
                <span>SET STATUS</span>
              </Button>
            )}
            {generalStatus?.content && (
              <div 
                className={`flex items-center gap-1.5 px-3 py-1 bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 text-primary rounded-full text-[11px] font-black animate-in fade-in zoom-in-95 duration-500 group relative uppercase tracking-tight`}
              >
                <Activity size={12} aria-hidden="true" />
                <span 
                  className={isOwnProfile ? "cursor-pointer hover:underline" : ""} 
                  onClick={() => isOwnProfile && setIsStatusModalOpen(true)}
                >
                  <Emojify text={generalStatus.content} tags={profile?.tags} />
                </span>
                {generalStatus.link && (
                  <a href={generalStatus.link} target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity" onClick={e => e.stopPropagation()} aria-label="Status link">
                    <LinkIcon size={10} aria-hidden="true" />
                  </a>
                )}
                {isOwnProfile && (
                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (ndk) {
                        await updateStatus(ndk, "", "general");
                        router.refresh();
                      }
                    }}
                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                    title="Clear status"
                  >
                    <X size={10} aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
            {musicStatus?.content && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-pink-500/5 dark:bg-pink-500/10 border border-pink-500/10 dark:border-pink-500/20 text-pink-600 dark:text-pink-400 rounded-full text-[11px] font-black animate-in fade-in zoom-in-95 duration-500 uppercase tracking-tight">
                <Music size={12} className="animate-bounce" style={{ animationDuration: '3s' }} aria-hidden="true" />
                <span><Emojify text={musicStatus.content} tags={profile?.tags} /></span>
                {musicStatus.link && (
                  <a href={musicStatus.link} target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity" aria-label="Music link">
                    <LinkIcon size={10} aria-hidden="true" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* NIP-58 Badges */}
          <ProfileBadges pubkey={hexPubkey} />

          {/* Interests (NIP-51) */}
          {interests.size > 0 && (
            <div className="flex flex-wrap gap-2 py-1 animate-in fade-in slide-in-from-left duration-700">
              {Array.from(interests).map((interest) => (
                <Button key={interest} asChild variant="ghost" className="h-6 px-2.5 bg-muted/50 border border-border text-muted-foreground rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-all gap-1.5">
                  <Link href={`/search?q=%23${interest}`}>
                    <Tag size={10} aria-hidden="true" />
                    <span>#{interest}</span>
                  </Link>
                </Button>
              ))}
            </div>
          )}
        </div>

        {profile?.about && (
          <div className="mt-4 text-foreground leading-relaxed">
            <FormattedAbout text={profile.about} tags={profile.tags} />
          </div>
        )}

        <ExternalIdentities identities={externalIdentities} />

        <div className="mt-4 flex flex-wrap gap-4 text-muted-foreground text-sm font-medium">
          {profile?.website && (
            <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-1 hover:underline text-primary">
              <LinkIcon size={16} aria-hidden="true" />
              <span>{safeHostname(profile.website)}</span>
            </a>
          )}
          {profile?.birthday && (
            <div className="flex items-center space-x-1 cursor-default" title="Birthday">
              <Cake size={16} className="text-pink-500" aria-hidden="true" />
              <span>
                {profile.birthday.day && profile.birthday.month ? (
                  <>
                    {format(new Date(2000, profile.birthday.month - 1, profile.birthday.day), "MMMM d")}
                    {profile.birthday.year ? `, ${profile.birthday.year}` : ""}
                  </>
                ) : profile.birthday.year ? (
                  profile.birthday.year
                ) : "-"}
              </span>
            </div>
          )}
          <button 
            onClick={() => setShowDatesModal(true)}
            className="flex items-center space-x-1 hover:text-primary transition-colors cursor-pointer"
            aria-label="View profile history"
          >
            <Calendar size={16} aria-hidden="true" />
            <span>
              {profile?.published_at 
                ? format(new Date(profile.published_at * 1000), "MMM yyyy")
                : (profile?.created_at ? format(new Date(profile.created_at * 1000), "MMM yyyy") : "-")
              }
            </span>
          </button>
          {profile?.lud16 && (
            <button 
              onClick={() => setShowZapModal(true)}
              className="flex items-center space-x-1 text-yellow-600 dark:text-yellow-500 hover:underline transition-all group"
              title={`Zap ${profile.lud16}`}
            >
              <Zap size={16} fill="currentColor" className="group-hover:scale-110 transition-transform" aria-hidden="true" />
              <span className="font-bold">{profile.lud16}</span>
            </button>
          )}
        </div>

        {!isOwnProfile && <FollowedBy pubkey={hexPubkey} />}

        {/* Stats */}
        <div className="flex gap-5 mt-4 text-sm">
          <Link
            href={`${profileUrl}/followers?tab=following`}
            className="hover:underline flex items-center gap-1 group"
          >
            <span className="font-black text-foreground">
              {fwLoading ? "–" : followingCount.toLocaleString()}
            </span>
            <span className="text-muted-foreground text-xs font-medium">Following</span>
          </Link>

          <Link href={`${profileUrl}/followers?tab=followers`} className="hover:underline flex items-center gap-1 group">
            <span className="font-black text-foreground">
              {fLoading ? "–" : formatCount(followerCount)}
            </span>
            <span className="text-muted-foreground text-xs font-medium">Followers</span>
          </Link>

          <div className="flex items-center gap-1 cursor-default">
            <Zap size={14} className="text-yellow-500" fill="currentColor" aria-hidden="true" />
            <span className="font-black text-foreground">
              {formatCount(totalSats)}
            </span>
          </div>

          {!relaysLoading && userRelays.length > 0 && (
            <div className="flex items-center gap-1 cursor-default" title={userRelays.map(r => r.url).join("\n")}>
              <Activity size={14} className="text-green-500" aria-hidden="true" />
              <span className="font-black text-foreground">
                {userRelays.length}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => handleTabChange(val as ProfileTab)} className="w-full">
        <TabsList className="w-full h-14 bg-background border-b border-border rounded-none p-0 flex">
          {(["posts", "replies", "media", "articles", "highlights"] as const).map((tab) => (
            <TabsTrigger 
              key={tab} 
              value={tab} 
              className="flex-1 h-full rounded-none font-black text-xs uppercase tracking-widest data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none relative after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-12 after:h-1 after:bg-primary after:rounded-full after:opacity-0 data-[state=active]:after:opacity-100 after:transition-opacity border-none"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Feed */}
      <div className="pb-20">
        {/* Pinned Posts Section */}
        {activeTab === "posts" && pinnedPosts.length > 0 && (
          <div className="border-b-4 border-muted/50 bg-primary/5">
            {pinnedPosts.map((post) => (
              <PostCard key={`pinned-${post.id}`} event={post} />
            ))}
          </div>
        )}

        {activeTab === "media" ? (
          <MediaGrid posts={posts} isLoading={feedLoading} />
        ) : (
          <FeedList 
            posts={posts.filter(p => !pinnedEventIds.has(p.id))}
            isLoading={feedLoading}
            loadMore={loadMore}
            hasMore={hasMore}
            emptyMessage={`No ${activeTab} to show.`}
          />
        )}
      </div>

      <UserStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        pubkey={hexPubkey}
      />

      {showZapModal && (
        <ZapModal
          user={ndk?.getUser({ pubkey: hexPubkey })}
          onClose={() => setShowZapModal(false)}
        />
      )}

      {/* Profile History Modal */}
      <Dialog open={showDatesModal} onOpenChange={setShowDatesModal}>
        <DialogContent className="sm:max-w-xs p-0 gap-0 overflow-hidden border-none shadow-2xl flex flex-col max-h-[80vh]">
          <div className="p-5 border-b shrink-0 flex flex-row items-center justify-between">
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Clock className="text-primary size-5" aria-hidden="true" />
              Profile History
            </DialogTitle>
            <DialogDescription className="sr-only">
              History of when this profile was created and last updated on the Nostr network.
            </DialogDescription>
          </div>
          
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                  <Calendar size={20} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Joined</p>
                  <p className="text-sm font-black">
                    {profile?.published_at 
                      ? format(new Date(profile.published_at * 1000), "MMMM d, yyyy")
                      : "Unknown"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 text-green-500 rounded-2xl">
                  <RefreshCw size={20} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Last Updated</p>
                  <p className="text-sm font-black">
                    {profile?.created_at 
                      ? format(new Date(profile.created_at * 1000), "MMMM d, yyyy · HH:mm")
                      : "Unknown"}
                  </p>
                </div>
              </div>
            </div>
          </ScrollArea>
          
          <div className="p-4 border-t bg-muted/30">
            <Button 
              onClick={() => setShowDatesModal(false)}
              className="w-full h-12 rounded-2xl font-black shadow-lg"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
