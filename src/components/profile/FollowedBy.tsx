"use client";

import React, { useEffect, useState } from "react";
import { useFollowedBy } from "@/hooks/useFollowedBy";
import { Avatar } from "@/components/common/Avatar";
import Link from "next/link";
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import { NDKUser } from "@nostr-dev-kit/ndk";
import { shortenPubkey } from "@/lib/utils/nip19";

export const FollowedBy = ({ pubkey }: { pubkey: string }) => {
  const { followedBy, count, loading } = useFollowedBy(pubkey);
  const [displayUsers, setDisplayUsers] = useState<{ pubkey: string; name?: string; picture?: string; npub: string }[]>([]);

  useEffect(() => {
    if (followedBy.length > 0) {
      // Fetch profiles for the first 2 users to show names
      const firstTwo = followedBy.slice(0, 2);
      Promise.all(firstTwo.map(async (user) => {
        await user.fetchProfile();
        return {
          pubkey: user.pubkey,
          npub: user.npub,
          name: user.profile?.display_name ? String(user.profile.display_name) : (user.profile?.name ? String(user.profile.name) : undefined),
          picture: user.profile?.picture
        };
      })).then(setDisplayUsers);
    } else {
      if (displayUsers.length > 0) Promise.resolve().then(() => setDisplayUsers([]));
    }
  }, [followedBy]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || followedBy.length === 0) return null;

  return (
    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
      <div className="flex -space-x-2">
        {followedBy.slice(0, 3).map((user) => (
          <Avatar 
            key={user.pubkey} 
            pubkey={user.pubkey} 
            size={18} 
            className="ring-2 ring-white dark:ring-black rounded-full" 
          />
        ))}
      </div>
      <div className="leading-tight">
        Followed by{" "}
        {displayUsers.length > 0 ? (
          <>
            {displayUsers.map((user, i) => (
              <React.Fragment key={user.pubkey}>
                <Link href={`/${user.npub}`} className="text-gray-900 dark:text-gray-100 font-bold hover:underline">
                  {user.name || shortenPubkey(user.pubkey)}
                </Link>
                {i < displayUsers.length - 1 ? ", " : ""}
              </React.Fragment>
            ))}
            {count > displayUsers.length && (
              <> and {count - displayUsers.length} others you follow</>
            )}
          </>
        ) : (
          <>{count} people you follow</>
        )}
      </div>
    </div>
  );
};
