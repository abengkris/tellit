"use client";

import { useEffect, useState, useRef, Fragment } from "react";
import { getNDK } from "@/lib/ndk";
import { Avatar } from "@/components/common/Avatar";
import Link from "next/link";
import { nip19 } from "@nostr-dev-kit/ndk";
import { shortenPubkey } from "@/lib/utils/nip19";
import { useLists } from "@/hooks/useLists";
import { useUIStore } from "@/store/ui";
import { Volume2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { getProfileUrl } from "@/lib/utils/identity";

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
  nip05?: string;
  profileUrl: string;
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
      { 
        closeOnEose: true,
        includeMuted: true // We need to fetch profiles of muted users to show them in the list
      },
      {
        onEvent: (event) => {
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
                nip05: profile.nip05,
                profileUrl: getProfileUrl({ ...profile, pubkey: event.pubkey })
              });
              return next;
            });
          } catch {}
        }
      }
    );

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
    } catch (_err) {
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
      <div className="flex flex-col">
        {Array.from({ length: 5 }).map((_, i) => (
          <Fragment key={i}>
            <MuteItemSkeleton />
            {i < 4 && <Separator />}
          </Fragment>
        ))}
      </div>
    );
  }

  if (!pubkeys.length) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <p className="text-4xl mb-3">🤫</p>
        <p>Your mute list is empty.</p>
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
        const isUnmuting = unmuting.has(pubkey);

        return (
          <Fragment key={pubkey}>
            <div
              className="flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors"
            >
              <Link href={profileUrl} className="shrink-0">
                <Avatar
                  pubkey={pubkey}
                  src={user?.picture}
                  size={44}
                  nip05={user?.nip05}
                  className="rounded-full"
                />
              </Link>

              <div className="flex-1 min-w-0">
                <Link href={profileUrl} className="block">
                  <p className="font-black hover:underline truncate">
                    {display_name}
                  </p>
                  <p className="text-muted-foreground text-sm truncate">
                    @{shortenPubkey(npub, 16)}
                  </p>
                </Link>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleUnmute(pubkey, display_name)}
                disabled={isUnmuting}
                className="rounded-full font-black gap-2 h-9 px-4 bg-background border-none shadow-sm hover:bg-destructive/10 hover:text-destructive"
              >
                {isUnmuting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Volume2 className="size-4" aria-hidden="true" />
                )}
                <span>Unmute</span>
              </Button>
            </div>
            {index < pubkeys.length - 1 && <Separator />}
          </Fragment>
        );
      })}
    </div>
  );
}

function MuteItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4">
      <Skeleton className="size-11 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-28 rounded" />
        <Skeleton className="h-3 w-20 rounded" />
      </div>
      <Skeleton className="w-24 h-9 rounded-full shrink-0" />
    </div>
  );
}
