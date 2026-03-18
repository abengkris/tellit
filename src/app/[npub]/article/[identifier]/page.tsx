// src/app/[npub]/article/[identifier]/page.tsx
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PremiumArticleContent } from "./PremiumArticleContent";
import { decodeNip19 } from "@/lib/utils/nip19";
import { resolveVanitySlug, isVanitySlug } from "@/lib/utils/identity";
import { getNDK } from "@/lib/ndk";
import { idLog } from "@/lib/utils/id-logger";
import { Loader2 } from "lucide-react";

interface Props {
  params: Promise<{ npub: string; identifier: string }>;
}

async function resolveSlug(slug: string): Promise<string> {
  const tracker = idLog.trackResolution(slug);

  try {
    if (slug.startsWith("npub1")) {
      const { id } = decodeNip19(slug);
      tracker.success("nip19-npub", id);
      return id;
    }

    if (isVanitySlug(slug)) {
      const pubkey = await resolveVanitySlug(slug);
      if (pubkey) {
        tracker.success("internal-db", pubkey);
        return pubkey;
      }
      tracker.fail("internal-db", "Not found in handles table");

      // 2.5. Try NIP-05 resolution via NDK as a robust fallback
      try {
        const ndk = getNDK();
        const nip05 = slug.includes('@') ? slug : `${slug}@tellit.id`;
        idLog.debug(`Attempting NIP-05 fallback: ${nip05}`);
        const user = await ndk.fetchUser(nip05);
        if (user?.pubkey) {
          tracker.success("ndk-nip05", user.pubkey);
          return user.pubkey;
        }
        tracker.fail("ndk-nip05", "NDK fetchUser returned no pubkey");
      } catch (e) {
        tracker.fail("ndk-nip05-fatal", e);
      }
    }

    if (/^[0-9a-fA-F]{64}$/.test(slug)) {
      tracker.success("hex-direct", slug);
      return slug;
    }
  } catch (err) {
    tracker.fatal(err);
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
