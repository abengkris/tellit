import { Metadata } from "next";
import { shortenPubkey, toNpub, decodeNip19 } from "@/lib/utils/nip19";
import { resolveVanitySlug, isVanitySlug } from "@/lib/utils/identity";

async function resolveSlug(slug: string): Promise<string> {
  if (slug.startsWith("npub1")) {
    const { id } = decodeNip19(slug);
    return id;
  }
  if (isVanitySlug(slug)) {
    const pubkey = await resolveVanitySlug(slug);
    if (pubkey) return pubkey;
  }
  if (/^[0-9a-fA-F]{64}$/.test(slug)) return slug;
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
