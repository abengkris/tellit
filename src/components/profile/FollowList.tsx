// src/components/profile/FollowList.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { NDKUser } from "@nostr-dev-kit/ndk";
import { getNDK } from "@/lib/ndk";
import { FollowButton } from "./FollowButton";
import { Avatar } from "@/components/common/Avatar";
import Link from "next/link";
import { nip19 } from "nostr-tools";
import { shortenPubkey } from "@/lib/utils/nip19";

interface FollowListProps {
  pubkeys: string[];
  loading?: boolean;
  emptyMessage?: string;
}

interface UserWithProfile {
  pubkey: string;
  npub: string;
  name?: string;
  about?: string;
  picture?: string;
}

export function FollowList({
  pubkeys,
  loading = false,
  emptyMessage = "Belum ada.",
}: FollowListProps) {
  const [users, setUsers] = useState<Map<string, UserWithProfile>>(new Map());
  const fetchedRef = useRef(new Set<string>());

  // Lazy fetch profile — batch per 20
  useEffect(() => {
    const toFetch = pubkeys.filter((pk) => !fetchedRef.current.has(pk));
    if (!toFetch.length) return;

    toFetch.forEach((pk) => fetchedRef.current.add(pk));

    const ndk = getNDK();

    // Fetch profile (kind:0) untuk semua pubkey
    const sub = ndk.subscribe(
      { kinds: [0], authors: toFetch },
      { closeOnEose: true }
    );

    sub.on("event", (event) => {
      try {
        const profile = JSON.parse(event.content);
        const npub = nip19.npubEncode(event.pubkey);
        setUsers((prev) => {
          const next = new Map(prev);
          next.set(event.pubkey, {
            pubkey: event.pubkey,
            npub,
            name: profile.name ?? profile.display_name,
            about: profile.about,
            picture: profile.picture,
          });
          return next;
        });
      } catch {}
    });

    return () => sub.stop();
  }, [pubkeys]);

  if (loading) {
    return (
      <div className="divide-y divide-zinc-800">
        {Array.from({ length: 5 }).map((_, i) => (
          <FollowItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!pubkeys.length) {
    return (
      <div className="py-16 text-center text-zinc-500">
        <p className="text-4xl mb-3">👥</p>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-800">
      {pubkeys.map((pubkey) => {
        const user = users.get(pubkey);
        const npub = user?.npub ?? nip19.npubEncode(pubkey);
        const display_name = user?.name ?? shortenPubkey(npub);

        return (
          <div
            key={pubkey}
            className="flex items-center gap-3 p-4 hover:bg-zinc-900/50 transition-colors"
          >
            {/* Avatar */}
            <Link href={`/${npub}`} className="shrink-0">
              <Avatar
                pubkey={pubkey}
                src={user?.picture}
                size={44}
                className="rounded-full"
              />
            </Link>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <Link href={`/${npub}`} className="block">
                <p className="font-semibold text-white hover:underline truncate">
                  {display_name}
                </p>
                <p className="text-zinc-500 text-sm truncate">
                  @{shortenPubkey(npub, 16)}
                </p>
              </Link>
              {user?.about && (
                <p className="text-zinc-400 text-sm mt-0.5 line-clamp-1">
                  {user.about}
                </p>
              )}
            </div>

            {/* Follow button */}
            <div className="shrink-0">
              <FollowButton targetPubkey={pubkey} size="sm" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FollowItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 animate-pulse">
      <div className="w-11 h-11 rounded-full bg-zinc-800 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-zinc-800 rounded w-28" />
        <div className="h-3 bg-zinc-800 rounded w-20" />
      </div>
      <div className="w-16 h-7 bg-zinc-800 rounded-full shrink-0" />
    </div>
  );
}
