"use client";

import React from "react";
import { useNotifications, TellItNotification } from "@/hooks/useNotifications";
import { useProfile } from "@/hooks/useProfile";
import { Loader2, Heart, Repeat2, MessageCircle, Zap, UserPlus, Bell, Mic, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/common/Avatar";
import { shortenPubkey } from "@/lib/utils/nip19";
import { useRouter } from "next/navigation";

const NotificationIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'like': return <Heart size={20} className="text-pink-500" fill="currentColor" />;
    case 'repost': return <Repeat2 size={20} className="text-green-500" />;
    case 'reply': return <MessageCircle size={20} className="text-blue-500" fill="currentColor" />;
    case 'zap': return <Zap size={20} className="text-yellow-500" fill="currentColor" />;
    case 'mention': return <MessageCircle size={20} className="text-purple-500" />;
    case 'follow': return <UserPlus size={20} className="text-blue-400" />;
    default: return <Bell size={20} className="text-gray-400" />;
  }
};

const NotificationItem = ({ event }: { event: TellItNotification }) => {
  const { profile, profileUrl } = useProfile(event.pubkey);
  const router = useRouter();
  const display_name = profile?.display_name || profile?.name || shortenPubkey(event.pubkey);

  // Extract podcast metadata from zap tags
  const podcastItem = event.kind === 9735 ? event.tags.find(t => t[0] === 'i' && t[1]?.startsWith('podcast:item:guid:')) : null;
  const podcastUrl = podcastItem?.[2];
  const podcastName = podcastItem?.[1]?.replace("podcast:item:guid:", "");

  const getTargetHref = () => {
    if (event.type === 'follow') return profileUrl;
    
    // For interactions, find the target event
    const eTag = event.tags.find(t => t[0] === 'e' || t[0] === 'E');
    const aTag = event.tags.find(t => t[0] === 'a' || t[0] === 'A');
    
    if (event.type === 'reply' || event.type === 'mention') {
      // Link to the event itself to see the thread
      return `/post/${event.encode()}`;
    }

    if (eTag) return `/post/${eTag[1]}`;
    if (aTag) {
      // Handle NIP-33/Long-form links
      const parts = aTag[1].split(':');
      if (parts[0] === '30023') {
        return `/article/${event.encode()}`;
      }
    }

    return `/post/${event.encode()}`;
  };

  const handleNotificationClick = () => {
    if (event.type === 'zap' && podcastUrl) {
      window.open(podcastUrl, '_blank');
      return;
    }
    router.push(getTargetHref());
  };

  return (
    <div 
      onClick={handleNotificationClick}
      className="border-b border-gray-100 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors cursor-pointer"
    >
      <div className="flex p-4 space-x-3">
        <div className="shrink-0 pt-1">
          <NotificationIcon type={event.type} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <Link href={profileUrl} className="shrink-0 z-10" onClick={e => e.stopPropagation()}>
              <Avatar 
                pubkey={event.pubkey} 
                src={profile?.picture} 
                size={32} 
                nip05={profile?.nip05}
                className="w-8 h-8 rounded-full bg-gray-200"
              />
            </Link>
            <div className="flex flex-wrap items-center gap-x-1 min-w-0">
              <Link href={profileUrl} className="font-bold hover:underline truncate max-w-[150px] z-10" onClick={e => e.stopPropagation()}>
                {display_name}
              </Link>
              <span className="text-gray-500 text-sm whitespace-nowrap">
                {event.type === 'like' && "liked your post"}
                {event.type === 'repost' && "reposted your post"}
                {event.type === 'reply' && (event.kind === 1111 ? "commented on your article" : "replied to your post")}
                {event.type === 'zap' && (podcastName ? "zapped your podcast" : "zapped your post")}
                {event.type === 'mention' && (event.kind === 30023 ? "mentioned you in an article" : "mentioned you")}
                {event.type === 'follow' && "followed you"}
              </span>
            </div>
          </div>
          
          {podcastName && (
            <div className="mt-1 flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg text-xs font-bold w-fit border border-purple-500/10 animate-in fade-in slide-in-from-left-2 duration-300">
              <Mic size={14} />
              <span className="truncate max-w-[200px]">{podcastName}</span>
              {podcastUrl && <ExternalLink size={12} className="ml-0.5 opacity-50" />}
            </div>
          )}
          
          {event.content && event.type !== 'follow' && event.type !== 'like' && event.type !== 'repost' && !podcastName && (
            <div className="text-gray-600 dark:text-gray-400 text-sm border-l-2 border-gray-200 dark:border-gray-800 pl-3 py-1 italic line-clamp-2">
              {event.content}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function NotificationsPage() {
  const { notifications, markAsRead, loading, loadMore, hasMore } = useNotifications();

  React.useEffect(() => {
    markAsRead();
  }, [markAsRead]);

  return (
    <>
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 p-4">
        <h1 className="text-xl font-bold">Notifications</h1>
      </div>

      <div className="pb-20">
        {loading && notifications.length === 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-900 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-4 flex space-x-3">
                <div className="w-5 h-5 bg-gray-200 dark:bg-gray-800 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded-full" />
                    <div className="h-4 bg-gray-100 dark:bg-gray-900 rounded w-1/3" />
                  </div>
                  <div className="h-3 bg-gray-50 dark:bg-black rounded w-2/3 ml-10" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-500 text-center">
            <div className="bg-gray-100 dark:bg-gray-900 p-6 rounded-full mb-4">
              <Bell size={48} className="opacity-20" />
            </div>
            <p className="text-lg font-medium">No notifications yet</p>
            <p className="text-sm mt-2">Interactions with your posts will appear here.</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 dark:divide-gray-900">
              {notifications.map((notif) => (
                <NotificationItem key={notif.id} event={notif} />
              ))}
            </div>
            
            {hasMore && (
              <div className="p-8 text-center">
                <button 
                  onClick={() => loadMore()}
                  disabled={loading}
                  className="px-6 py-2 bg-gray-100 dark:bg-gray-900 rounded-full text-blue-500 text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Loading...
                    </span>
                  ) : "Show more notifications"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
