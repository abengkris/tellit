// src/app/[npub]/article/[identifier]/page.tsx
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PremiumArticleContent } from "./PremiumArticleContent";
import { decodeNip19 } from "@/lib/utils/nip19";
import { resolveVanitySlug, isVanitySlug } from "@/lib/utils/identity";
import { getNDK } from "@/lib/ndk";
import { Loader2 } from "lucide-react";

interface Props {
  params: Promise<{ npub: string; identifier: string }>;
}

async function resolveSlug(slug: string): Promise<string> {
  try {
    if (slug.startsWith("npub1")) {
      const { id } = decodeNip19(slug);
      return id;
    }

    if (isVanitySlug(slug)) {
      const pubkey = await resolveVanitySlug(slug);
      if (pubkey) return pubkey;

      // 2.5. Try NIP-05 resolution via NDK as a robust fallback
      try {
        const ndk = getNDK();
        const nip05 = slug.includes('@') ? slug : `${slug}@tellit.id`;
        const user = await ndk.fetchUser(nip05);
        if (user?.pubkey) return user.pubkey;
      } catch (e) {
        console.warn(`[resolveSlug] NDK NIP-05 fallback failed for ${slug}`, e);
      }
    }

    if (/^[0-9a-fA-F]{64}$/.test(slug)) {
      return slug;
    }
  } catch (err) {
    console.error(`[PremiumArticlePage] Failed to resolve slug: ${slug}`, err);
  }

  return "";
}

export default async function PremiumArticlePage({ params }: Props) {
  const { npub: slug, identifier } = await params;
  const hexPubkey = await resolveSlug(slug);

  if (!hexPubkey) {
    notFound();
  }

  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="text-muted-foreground font-medium text-center">Memuat artikel...</p>
      </div>
    }>
      <PremiumArticleContent hexPubkey={hexPubkey} identifier={identifier} slug={slug} />
    </Suspense>
  );
}
