// src/app/[npub]/status/[noteId]/page.tsx
import { Suspense } from "react";
import { PostDetailContent } from "@/app/post/[noteId]/PostDetailContent";
import { ArrowLeft } from "lucide-react";
import { FeedSkeleton } from "@/components/feed/FeedSkeleton";

interface Props {
  params: Promise<{ npub: string; noteId: string }>;
}

export default async function PremiumPostPage({ params }: Props) {
  const { noteId } = await params;

  return (
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
  );
}
