import { Suspense } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileContent } from "./ProfileContent";
import { decodeNip19, shortenPubkey, toNpub } from "@/lib/utils/nip19";
import { resolveVanitySlug, isVanitySlug } from "@/lib/utils/identity";
import { connectNDK, getNDK } from "@/lib/ndk";
import { FeedSkeleton } from "@/components/feed/FeedSkeleton";
import { idLog } from "@/lib/utils/id-logger";

interface Props {
  params: Promise<{ npub: string }>;
}

async function resolveSlug(slug: string): Promise<string> {
  const tracker = idLog.trackResolution(slug);

  // 1. Check if it's an npub
  if (slug.startsWith("npub1")) {
    try {
      const { id } = decodeNip19(slug);
      tracker.success("nip19-npub", id);
      return id;
    } catch (err) {
      tracker.fail("nip19-npub", err);
      return "";
    }
  }

  // 2. Check if it's a vanity slug and resolve it via internal DB
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

  // 3. Fallback to hex decoding if it's a 64 char hex string
  if (/^[0-9a-fA-F]{64}$/.test(slug)) {
    tracker.success("hex-direct", slug);
    return slug;
  }

  tracker.fatal("Resolution exhausted, no pubkey found");
  return "";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { npub: slug } = await params;
  const hexPubkey = await resolveSlug(slug);
  
  if (!hexPubkey) {
    return { title: "Profile Not Found" };
  }
  
  try {
    const ndk = await connectNDK();
    const user = ndk.getUser({ pubkey: hexPubkey });
    const profile = await user.fetchProfile();
    
    const display_name = profile?.display_name ? String(profile.display_name) : (profile?.name ? String(profile.name) : shortenPubkey(toNpub(hexPubkey)));
    const about = profile?.about || `Check out ${display_name}'s profile on Tell it!`;
    const image = profile?.picture || `https://robohash.org/${hexPubkey}?set=set1`;

    return {
      title: display_name,
      description: about,
      openGraph: {
        title: `${display_name} (@${shortenPubkey(toNpub(hexPubkey))})`,
        description: about,
        images: [image],
      },
      twitter: {
        card: "summary",
        title: display_name,
        description: about,
        images: [image],
      },
    };
  } catch {
    return {
      title: "Profile",
    };
  }
}

export default async function ProfilePage({ params }: Props) {
  const { npub: slug } = await params;
  const hexPubkey = await resolveSlug(slug);

  if (!hexPubkey) {
    notFound();
  }

  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto" aria-busy="true" aria-label="Loading profile…">
        <div className="h-48 w-full bg-muted animate-pulse" />
        <div className="px-4 pb-4 animate-pulse">
          <div className="relative flex justify-between items-end -mt-16 mb-4">
            <div className="size-32 rounded-full bg-muted ring-4 ring-background shadow-lg shrink-0" />
            <div className="w-32 h-10 rounded-full bg-muted shrink-0" />
          </div>
          <div className="space-y-4">
            <div className="h-10 bg-muted rounded-xl w-1/3" />
            <div className="h-4 bg-muted rounded-full w-full" />
            <div className="h-4 bg-muted rounded-full w-2/3" />
          </div>
        </div>
        <div className="border-t border-border mt-6">
          <FeedSkeleton />
        </div>
      </div>
    }>
      <ProfileContent npubParam={toNpub(hexPubkey)} />
    </Suspense>
  );
}
