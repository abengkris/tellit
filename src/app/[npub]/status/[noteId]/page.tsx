// src/app/[npub]/status/[noteId]/page.tsx
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PostDetailContent } from "@/app/post/[noteId]/PostDetailContent";
import { decodeNip19 } from "@/lib/utils/nip19";
import { resolveVanitySlug, isVanitySlug } from "@/lib/utils/identity";
import { ArrowLeft } from "lucide-react";
import { FeedSkeleton } from "@/components/feed/FeedSkeleton";

interface Props {
  params: Promise<{ npub: string; noteId: string }>;
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

export default async function PremiumPostPage({ params }: Props) {
  const { npub: slug, noteId } = await params;
  const hexPubkey = await resolveSlug(slug);

  if (!hexPubkey) {
    notFound();
  }

  return (
    <Suspense fallback={
      <>
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border flex items-center px-4 py-3 space-x-6">
          <div className="p-2 rounded-full">
            <ArrowLeft size={20} className="text-muted-foreground" />
          </div>
          <h1 className="text-xl font-black">Thread</h1>
        </div>
        <div className="animate-pulse">
          <div className="p-4 border-b border-border flex space-x-3">
            <div className="w-12 h-12 rounded-full bg-muted" />
            <div className="flex-1 space-y-3 pt-1">
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-4 bg-muted rounded w-full" />
            </div>
          </div>
          <FeedSkeleton />
        </div>
      </>
    }>
      {/* We use noteId directly as PostDetailContent handles both hex and NIP-19 */}
      <PostDetailContent noteId={noteId} />
    </Suspense>
  );
}
