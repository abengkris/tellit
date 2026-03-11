"use client";

import { useProfile } from "@/hooks/useProfile";
import Link from "next/link";
import { nip19 } from "nostr-tools";
import { shortenPubkey } from "@/lib/utils/nip19";
import { cn } from "@/lib/utils";

interface MentionLinkProps {
  pubkey: string;
  raw: string; // fallback jika pubkey kosong
  className?: string;
}

export function MentionLink({ pubkey, raw, className }: MentionLinkProps) {
  const { profile, loading } = useProfile(pubkey);

  // Resolve display name dengan prioritas:
  // name > display_name > nip05 username > npub (pendek)
  const nip05Name = profile?.nip05?.split("@")[0];
  const nip05Domain = profile?.nip05?.split("@")[1];
  
  const display_name = loading
    ? shortenPubkey(pubkey)
    : profile?.name
    ?? profile?.display_name
    ?? (nip05Name === "_" ? nip05Domain : nip05Name)
    ?? shortenPubkey(pubkey);

  const npub = pubkey ? nip19.npubEncode(pubkey) : "";

  return (
    <Link
      href={`/${npub || raw}`}
      className={cn(
        "text-primary hover:underline font-black min-w-0 truncate inline-block align-bottom max-w-[150px]",
        className
      )}
      onClick={e => e.stopPropagation()} // jangan trigger PostCard click
    >
      @{display_name}
    </Link>
  );
}
