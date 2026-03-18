import { Metadata } from "next";
import { decodeNip19 } from "@/lib/utils/nip19";
import { getNDK } from "@/lib/ndk";
import { NDKRelaySet, NDKSubscriptionCacheUsage } from "@nostr-dev-kit/ndk";

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ naddr: string }> 
}): Promise<Metadata> {
  const { naddr } = await params;
  
  try {
    const { id: hexId, relays: hintRelays, pubkey: authorPubkey, identifier } = decodeNip19(naddr);
    const ndk = getNDK();
    
    // Connect briefly to fetch metadata
    await ndk.connect(5000);

    const relayUrls = Array.from(new Set([
      ...(hintRelays || []),
      "wss://relay.damus.io",
      "wss://relay.nostr.band",
      "wss://relay.primal.net"
    ]));
    const relaySet = NDKRelaySet.fromRelayUrls(relayUrls, ndk);

    let article = null;
    if (hexId) {
      article = await ndk.fetchEvent(hexId, { cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST }, relaySet);
    }

    if (!article && authorPubkey && identifier) {
      const filter = { kinds: [30023], authors: [authorPubkey], "#d": [identifier] };
      article = await ndk.fetchEvent(filter, { cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST }, relaySet);
    }

    if (article) {
      const title = article.tags.find(t => t[0] === 'title')?.[1] || "Untitled Article";
      const summary = article.tags.find(t => t[0] === 'summary')?.[1] || "Read this article on Tell it!";
      const image = article.tags.find(t => t[0] === 'image')?.[1];

      return {
        title: `${title} | Tell it!`,
        description: summary,
        openGraph: {
          title: `${title} | Tell it!`,
          description: summary,
          images: image ? [{ url: image }] : undefined,
          type: "article",
        },
        twitter: {
          card: "summary_large_image",
          title,
          description: summary,
          images: image ? [image] : undefined,
        },
      };
    }
  } catch (err) {
    console.warn("[ArticleMetadata] Failed to fetch metadata:", err);
  }

  // Fallback metadata
  const title = `Article ${naddr.slice(0, 8)}...`;
  return {
    title: `${title} | Tell it!`,
    description: "Read this article on Tell it!, a decentralized microblogging platform.",
    openGraph: {
      title: `${title} | Tell it!`,
      description: "Read this article on Tell it!.",
    },
  };
}

export default function ArticleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
