"use client";

import React from "react";
import { NDKUser } from "@nostr-dev-kit/ndk";
import { shortenPubkey } from "@/lib/utils/nip19";
import { CheckCircle2 } from "lucide-react";
import { Avatar } from "./Avatar";

interface UserRecommendationProps {
  users: NDKUser[];
  onSelect: (user: NDKUser) => void;
  isLoading?: boolean;
}

export const UserRecommendation: React.FC<UserRecommendationProps> = ({ 
  users, 
  onSelect,
  isLoading 
}) => {
  if (users.length === 0 && !isLoading) return null;

  return (
    <div className="absolute z-50 bottom-full left-0 right-0 mb-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-h-64 overflow-y-auto animate-in slide-in-from-bottom-2 duration-200 overflow-hidden">
      <div className="p-3 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/50">
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Suggestions</span>
      </div>
      
      {isLoading && users.length === 0 ? (
        <div className="p-8 text-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-500">Searching your circle...</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 dark:divide-zinc-800/50">
          {users.map((user) => (
            <button
              key={user.pubkey}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect(user);
              }}
              className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors text-left group"
            >
              <div className="relative shrink-0">
                <Avatar 
                  pubkey={user.pubkey} 
                  src={user.profile?.picture || (user.profile as { image?: string })?.image} 
                  size={40} 
                  className="rounded-xl group-hover:scale-105 transition-transform" 
                />
                {user.profile?.nip05 && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900 shadow-sm">
                    <CheckCircle2 size={8} fill="currentColor" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-sm truncate text-gray-900 dark:text-zinc-100">
                    {user.profile?.display_name || user.profile?.name || shortenPubkey(user.pubkey)}
                  </span>
                  {user.profile?.nip05 && (
                    <span className="text-[10px] text-blue-500 font-medium truncate opacity-70">
                      {user.profile.nip05.replace(/^_@/, '')}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 font-mono truncate">
                  {shortenPubkey(user.npub, 16)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
      
      {users.length === 0 && !isLoading && (
        <div className="p-6 text-center text-xs text-gray-500">
          No matches found in your follows.
        </div>
      )}
    </div>
  );
};
