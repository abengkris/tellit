// src/app/[npub]/followers/page.tsx
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { FollowersContent } from "./FollowersContent";
import { decodeNip19 } from "@/lib/utils/nip19";
import { resolveVanitySlug, isVanitySlug } from "@/lib/utils/identity";
import { Loader2 } from "lucide-react";

interface Props {
  params: Promise<{ npub: string }>;
}

async function resolveSlug(slug: string): Promise<string> {
  // 1. Check if it's an npub
  if (slug.startsWith("npub1")) {
    try {
      const { id } = decodeNip19(slug);
      return id;
    } catch {
      return "";
    }
  }

  // 2. Check if it's a vanity slug and resolve it
  if (isVanitySlug(slug)) {
    const pubkey = await resolveVanitySlug(slug);
    if (pubkey) return pubkey;
  }

  // 3. Fallback to hex decoding if it's a 64 char hex string
  if (/^[0-9a-fA-F]{64}$/.test(slug)) {
    return slug;
  }

  return "";
}

export default async function FollowersPage({ params }: Props) {
  const { npub: slug } = await params;
  const hexPubkey = await resolveSlug(slug);

  if (!hexPubkey) {
    notFound();
  }

  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin size-10 text-primary" />
        <p className="mt-4 text-muted-foreground font-medium">Memuat koneksi...</p>
      </div>
    }>
      <FollowersContent hexPubkey={hexPubkey} slug={slug} />
    </Suspense>
  );
}
