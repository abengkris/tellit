"use client";

import { useEffect, useState } from "react";
import { NDKEvent, NDKRelaySet } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/hooks/useNDK";
import { useProfile } from "@/hooks/useProfile";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { nip19 } from "nostr-tools";
import Image from "next/image";
import { PostContentRenderer } from "../parts/PostContent";
import { shortenPubkey } from "@/lib/utils/nip19";

interface QuoteEmbedProps {
  eventId: string;
  hintRelays?: string[];
  className?: string;
}

export function QuoteEmbed({ eventId, hintRelays, className = "" }: QuoteEmbedProps) {
  const { ndk, isReady } = useNDK();
  const [event, setEvent] = useState<NDKEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!ndk || !isReady || !eventId) return;
    
    const relaySet = hintRelays && hintRelays.length > 0 
      ? NDKRelaySet.fromRelayUrls(hintRelays, ndk) 
      : undefined;

    ndk.fetchEvent(eventId, undefined, relaySet)
      .then(ev => {
        if (ev) setEvent(ev);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [ndk, isReady, eventId, hintRelays]);

  if (loading) {
    return (
      <div className={`border border-gray-200 dark:border-gray-800 rounded-2xl p-4 animate-pulse bg-gray-50/50 dark:bg-gray-900/20 mt-3 ${className}`}>
        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/3 mb-2" />
        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-2/3" />
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className={`border border-gray-200 dark:border-gray-800 rounded-2xl p-4 text-gray-500 text-sm mt-3 ${className}`}>
        Post not found or deleted.
      </div>
    );
  }

  return <QuoteEmbedContent event={event} className={className} />;
}

function QuoteEmbedContent({ event, className }: { event: NDKEvent; className: string }) {
  const { profile } = useProfile(event.pubkey);
  const npub = nip19.npubEncode(event.pubkey);
  const noteId = event.encode();

  return (
    <Link
      href={`/post/${noteId}`}
      onClick={e => e.stopPropagation()}
      className={`block border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50 rounded-2xl p-4 transition-colors mt-3 overflow-hidden w-full ${className}`}
    >
      {/* Author mini */}
      <div className="flex items-center gap-2 mb-2 min-w-0">
        <Image
          src={profile?.picture ?? `https://robohash.org/${event.pubkey}?set=set1`}
          alt=""
          width={20}
          height={20}
          className="w-5 h-5 rounded-full object-cover bg-gray-200 shrink-0"
          unoptimized
        />
        <span className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate min-w-0">
          {profile?.name ?? shortenPubkey(event.pubkey)}
        </span>
        {profile?.bot && (
          <span className="text-[8px] bg-blue-500/10 text-blue-500 border border-blue-500/20 px-1 rounded font-bold uppercase tracking-tighter shrink-0">
            Bot
          </span>
        )}
        <span className="text-gray-500 text-xs shrink-0 whitespace-nowrap">
          · {formatDistanceToNow(new Date((event.created_at ?? 0) * 1000), { addSuffix: true })}
        </span>
      </div>

      {/* Content — tanpa render quote di dalam quote (max 1 level) */}
      <PostContentRenderer
        content={event.content}
        event={event}
        renderMedia={true}
        renderQuotes={false}   // ← Tidak ada quote di dalam quote
        maxLines={4}
        isQuote={true}
      />
    </Link>
  );
}
