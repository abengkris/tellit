"use client";

import React, { useEffect, useState } from "react";
import { useFollowSuggestions } from "@/hooks/useFollowSuggestions";
import { Avatar } from "@/components/common/Avatar";
import { FollowButton } from "@/components/profile/FollowButton";
import Link from "next/link";
import { useNDK } from "@/hooks/useNDK";
import { UserIdentity } from "@/components/common/UserIdentity";

interface SuggestionCardProps {
  pubkey: string;
  followedByCount: number;
  showAbout?: boolean;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({ 
  pubkey, 
  followedByCount,
  showAbout = false
}) => {
  const { ndk } = useNDK();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (ndk && pubkey) {
      ndk.fetchEvent({ kinds: [0], authors: [pubkey] }).then((event) => {
        if (event) {
          try {
            setProfile(JSON.parse(event.content));
          } catch (e) {}
        }
      });
    }
  }, [ndk, pubkey]);

  const user = ndk?.getUser({ pubkey });
  const npub = user?.npub || pubkey;

  return (
    <div className="flex items-start justify-between gap-3 group">
      <Link href={`/${npub}`} className="shrink-0 pt-1">
        <Avatar 
          pubkey={pubkey} 
          src={profile?.picture} 
          size={48} 
          className="rounded-full ring-2 ring-transparent group-hover:ring-blue-500/20 transition-all"
        />
      </Link>
      
      <div className="flex-1 min-w-0">
        <Link href={`/${npub}`} className="block">
          <UserIdentity 
            pubkey={pubkey}
            displayName={profile?.name || profile?.displayName}
            nip05={profile?.nip05}
            variant="post"
          />
        </Link>
        <p className="text-[11px] text-gray-500 mt-0.5 font-medium">
          Followed by {followedByCount} people you follow
        </p>
        {showAbout && profile?.about && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
            {profile.about}
          </p>
        )}
      </div>

      <div className="shrink-0 pt-1">
        <FollowButton targetPubkey={pubkey} size="sm" />
      </div>
    </div>
  );
};

export const WhoToFollow = () => {
  const { suggestions, loading } = useFollowSuggestions(3);

  if (loading || suggestions.length === 0) return null;

  return (
    <div className="py-6 border-b border-gray-100 dark:border-gray-900 bg-gray-50/30 dark:bg-gray-900/10">
      <div className="px-6 mb-4 flex items-center justify-between">
        <h3 className="font-black text-lg text-gray-900 dark:text-white tracking-tight">Who to follow</h3>
      </div>

      <div className="space-y-5 px-6">
        {suggestions.map((suggestion) => (
          <SuggestionCard 
            key={suggestion.pubkey} 
            pubkey={suggestion.pubkey} 
            followedByCount={suggestion.followedByCount}
          />
        ))}
      </div>

      <div className="px-6 mt-6">
        <Link 
          href="/suggested" 
          className="inline-flex items-center text-blue-500 text-sm font-black hover:text-blue-600 transition-colors group"
        >
          Show more
          <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
};
