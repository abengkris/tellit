// src/components/profile/FollowList.tsx
"use client";

import { useEffect, useState, useRef, Fragment } from "react";
import { getNDK } from "@/lib/ndk";
import { FollowButton } from "./FollowButton";
import { Avatar } from "@/components/common/Avatar";
import Link from "next/link";
import { nip19 } from "@nostr-dev-kit/ndk";
import { shortenPubkey } from "@/lib/utils/nip19";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { getProfileUrl } from "@/lib/utils/identity";

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
  profileUrl: string;
}

export function FollowList({
  pubkeys,
  loading = false,
  emptyMessage = "No users found.",
}: FollowListProps) {
  const [users, setUsers] = useState<Map<string, UserWithProfile>>(new Map());
  const fetchedRef = useRef(new Set<string>());

  // Lazy fetch profile — batch per 20
  useEffect(() => {
    const toFetch = pubkeys.filter((pk) => !fetchedRef.current.has(pk));
    if (!toFetch.length) return;

    toFetch.forEach((pk) => fetchedRef.current.add(pk));

    const ndk = getNDK();

    // Fetch profile (kind:0) for all pubkeys
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
            name: profile.display_name ?? profile.name,
            about: profile.about,
            picture: profile.picture,
            profileUrl: getProfileUrl({ ...profile, pubkey: event.pubkey })
          });
          return next;
        });
      } catch {}
    });

    return () => sub.stop();
  }, [pubkeys]);

  if (loading) {
    return (
      <div className="flex flex-col">
        {Array.from({ length: 5 }).map((_, i) => (
          <Fragment key={i}>
            <FollowItemSkeleton />
            {i < 4 && <Separator />}
          </Fragment>
        ))}
      </div>
    );
  }

  if (!pubkeys.length) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <p className="text-4xl mb-3">👥</p>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {pubkeys.map((pubkey, index) => {
        const user = users.get(pubkey);
        const npub = user?.npub ?? nip19.npubEncode(pubkey);
        const profileUrl = user?.profileUrl ?? `/${npub}`;
        const display_name = user?.name ?? shortenPubkey(npub);

        return (
          <Fragment key={pubkey}>
            <div
              className="flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors"
            >
              {/* Avatar */}
              <Link href={profileUrl} className="shrink-0">
                <Avatar
                  pubkey={pubkey}
                  src={user?.picture}
                  size={44}
                  className="rounded-full"
                />
              </Link>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <Link href={profileUrl} className="block">
                  <p className="font-bold hover:underline truncate">
                    {display_name}
                  </p>
                  <p className="text-muted-foreground text-sm truncate">
                    @{shortenPubkey(npub, 16)}
                  </p>
                </Link>
                {user?.about && (
                  <p className="text-muted-foreground text-sm mt-0.5 line-clamp-1">
                    {user.about}
                  </p>
                )}
              </div>

              {/* Follow button */}
              <div className="shrink-0">
                <FollowButton targetPubkey={pubkey} size="sm" />
              </div>
            </div>
            {index < pubkeys.length - 1 && <Separator />}
          </Fragment>
        );
      })}
    </div>
  );
}

function FollowItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4">
      <Skeleton className="size-11 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-28 rounded" />
        <Skeleton className="h-3 w-20 rounded" />
      </div>
      <Skeleton className="w-16 h-8 rounded-full shrink-0" />
    </div>
  );
}
