// src/app/[npub]/article/[identifier]/page.tsx
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PremiumArticleContent } from "./PremiumArticleContent";
import { decodeNip19 } from "@/lib/utils/nip19";
import { resolveVanitySlug, isVanitySlug } from "@/lib/utils/identity";
import { Loader2 } from "lucide-react";

interface Props {
  params: Promise<{ npub: string; identifier: string }>;
}

async function resolveSlug(slug: string): Promise<string> {
  if (slug.startsWith("npub1")) {
    try {
      const { id } = decodeNip19(slug);
      return id;
    } catch {
      return "";
    }
  }

  if (isVanitySlug(slug)) {
    const pubkey = await resolveVanitySlug(slug);
    if (pubkey) return pubkey;
  }

  if (/^[0-9a-fA-F]{64}$/.test(slug)) {
    return slug;
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
