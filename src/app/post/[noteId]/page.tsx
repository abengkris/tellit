import { Suspense } from "react";
import { Metadata } from "next";
import { PostDetailContent } from "./PostDetailContent";
import { decodeNip19 } from "@/lib/utils/nip19";
import { connectNDK } from "@/lib/ndk";
import { ArrowLeft } from "lucide-react";
import { FeedSkeleton } from "@/components/feed/FeedSkeleton";

interface Props {
  params: Promise<{ noteId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { noteId } = await params;
  const { id: hexId } = decodeNip19(noteId);
  
  try {
    const ndk = await connectNDK();
    const event = await ndk.fetchEvent(hexId);
    
    if (!event) return { title: "Post" };

    const profile = await event.author.fetchProfile();
    const display_name = profile?.display_name || profile?.name || "Someone";
    const content = event.content.slice(0, 160) + (event.content.length > 160 ? "..." : "");

    return {
      title: `${display_name}: "${content}"`,
      description: event.content.slice(0, 300),
      openGraph: {
        title: `Post by ${display_name}`,
        description: event.content.slice(0, 300),
        type: "article",
      },
      twitter: {
        card: "summary",
        title: `Post by ${display_name}`,
        description: event.content.slice(0, 300),
      },
    };
  } catch (err) {
    console.error("[Post Metadata] Error generating metadata:", err);
    return {
      title: "Post",
    };
  }
}

export default async function PostPage({ params }: Props) {
  const { noteId } = await params;

  return (
    <>
      <link rel="alternate" href={`nostr:${noteId}`} />
      <Suspense fallback={
      <>
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center px-4 py-3 space-x-6">
          <div className="p-2 rounded-full">
            <ArrowLeft size={20} className="text-gray-400" />
          </div>
          <h1 className="text-xl font-bold">Thread</h1>
        </div>
        <div className="animate-pulse">
          <div className="p-4 border-b border-gray-100 dark:border-gray-900 flex space-x-3">
            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800" />
            <div className="flex-1 space-y-3 pt-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4" />
              <div className="h-4 bg-gray-100 dark:bg-gray-900 rounded w-full" />
            </div>
          </div>
          <FeedSkeleton />
        </div>
      </>
    }>
      <PostDetailContent noteId={noteId} />
    </Suspense>
    </>
  );
}
