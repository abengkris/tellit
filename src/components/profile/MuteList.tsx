"use client";

import { useEffect, useState, useRef } from "react";
import { NDKUser } from "@nostr-dev-kit/ndk";
import { getNDK } from "@/lib/ndk";
import { Avatar } from "@/components/common/Avatar";
import Link from "next/link";
import { nip19 } from "nostr-tools";
import { shortenPubkey } from "@/lib/utils/nip19";
import { useLists } from "@/hooks/useLists";
import { useUIStore } from "@/store/ui";
import { Volume2, Loader2 } from "lucide-react";

interface MuteListProps {
  pubkeys: string[];
  loading?: boolean;
}

interface UserWithProfile {
  pubkey: string;
  npub: string;
  name?: string;
  about?: string;
  picture?: string;
}

export function MuteList({
  pubkeys,
  loading = false,
}: MuteListProps) {
  const [users, setUsers] = useState<Map<string, UserWithProfile>>(new Map());
  const [unmuting, setUnmuting] = useState<Set<string>>(new Set());
  const { unmuteUser } = useLists();
  const { addToast } = useUIStore();
  const fetchedRef = useRef(new Set<string>());

  useEffect(() => {
    const toFetch = pubkeys.filter((pk) => !fetchedRef.current.has(pk));
    if (!toFetch.length) return;

    toFetch.forEach((pk) => fetchedRef.current.add(pk));

    const ndk = getNDK();

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

  const handleUnmute = async (pubkey: string, name: string) => {
    setUnmuting(prev => new Set(prev).add(pubkey));
    try {
      const success = await unmuteUser(pubkey);
      if (success) {
        addToast(`Unmuted ${name}`, "success");
      } else {
        addToast(`Failed to unmute ${name}`, "error");
      }
    } catch (err) {
      addToast(`Error unmuting user`, "error");
    } finally {
      setUnmuting(prev => {
        const next = new Set(prev);
        next.delete(pubkey);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="divide-y divide-gray-100 dark:divide-zinc-800">
        {Array.from({ length: 5 }).map((_, i) => (
          <MuteItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!pubkeys.length) {
    return (
      <div className="py-16 text-center text-gray-500">
        <p className="text-4xl mb-3">🤫</p>
        <p>Your mute list is empty.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-zinc-800">
      {pubkeys.map((pubkey) => {
        const user = users.get(pubkey);
        const npub = user?.npub ?? nip19.npubEncode(pubkey);
        const display_name = user?.name ?? shortenPubkey(npub);
        const isUnmuting = unmuting.has(pubkey);

        return (
          <div
            key={pubkey}
            className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors"
          >
            <Link href={`/${npub}`} className="shrink-0">
              <Avatar
                pubkey={pubkey}
                src={user?.picture}
                size={44}
                className="rounded-full"
              />
            </Link>

            <div className="flex-1 min-w-0">
              <Link href={`/${npub}`} className="block">
                <p className="font-semibold text-gray-900 dark:text-white hover:underline truncate">
                  {display_name}
                </p>
                <p className="text-gray-500 text-sm truncate">
                  @{shortenPubkey(npub, 16)}
                </p>
              </Link>
            </div>

            <button
              onClick={() => handleUnmute(pubkey, display_name)}
              disabled={isUnmuting}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-900 dark:text-white rounded-full text-xs font-bold transition-all disabled:opacity-50"
            >
              {isUnmuting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Volume2 size={16} />
              )}
              <span>Unmute</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function MuteItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 animate-pulse">
      <div className="w-11 h-11 rounded-full bg-gray-100 dark:bg-zinc-800 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-gray-100 dark:bg-zinc-800 rounded w-28" />
        <div className="h-3 bg-gray-100 dark:bg-zinc-800 rounded w-20" />
      </div>
      <div className="w-24 h-8 bg-gray-100 dark:bg-zinc-800 rounded-full shrink-0" />
    </div>
  );
}
