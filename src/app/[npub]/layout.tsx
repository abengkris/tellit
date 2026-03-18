import { Metadata } from "next";
import { shortenPubkey, toNpub, decodeNip19 } from "@/lib/utils/nip19";
import { resolveVanitySlug, isVanitySlug } from "@/lib/utils/identity";
import { getNDK } from "@/lib/ndk";
import { idLog } from "@/lib/utils/id-logger";

async function resolveSlug(slug: string): Promise<string> {
  const tracker = idLog.trackResolution(slug);
  
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
  if (isVanitySlug(slug)) {
    const pubkey = await resolveVanitySlug(slug);
    if (pubkey) {
      tracker.success("internal-db", pubkey);
      return pubkey;
    }
    tracker.fail("internal-db", "Not found");

    // 2.5. Try NIP-05 resolution via NDK as a robust fallback
    try {
      const ndk = getNDK();
      const nip05 = slug.includes('@') ? slug : `${slug}@tellit.id`;
      const user = await ndk.fetchUser(nip05);
      if (user?.pubkey) {
        tracker.success("ndk-nip05", user.pubkey);
        return user.pubkey;
      }
      tracker.fail("ndk-nip05", "Not found");
    } catch (e) {
      tracker.fail("ndk-nip05-fatal", e);
    }
  }
  if (/^[0-9a-fA-F]{64}$/.test(slug)) {
    tracker.success("hex-direct", slug);
    return slug;
  }
  
  tracker.fatal("Resolution exhausted");
  return "";
}

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ npub: string }> 
}): Promise<Metadata> {
  const { npub: slug } = await params;
  
  try {
    const hexPubkey = await resolveSlug(slug);
    const displayId = hexPubkey ? shortenPubkey(toNpub(hexPubkey)) : slug;
    const title = `Profile (${displayId})`;
    
    return {
      title,
      description: `View ${displayId}'s profile on Tell it!, a decentralized microblogging platform.`,
      openGraph: {
        title: `${title} | Tell it!`,
        description: `View ${displayId}'s profile on Tell it!.`,
      },
    };
  } catch (err) {
    console.warn("[ProfileMetadata] Error resolving slug:", err);
    return {
      title: `Profile (${slug})`,
    };
  }
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
