"use client";

import { useEffect } from "react";
import { FileWarning, RotateCcw, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PostError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Post Detail Segment Error:", error);
  }, [error]);

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-full mb-6">
          <FileWarning size={48} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Post not found</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
          We couldn&apos;t retrieve this post or its thread from the relays. It may have been deleted or the relays are unreachable.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <button
            onClick={() => reset()}
            className="flex-1 flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-2xl transition-all"
          >
            <RotateCcw size={18} />
            <span>Retry</span>
          </button>
          <button
            onClick={() => router.back()}
            className="flex-1 flex items-center justify-center space-x-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 font-bold py-3 px-6 rounded-2xl transition-all"
          >
            <ArrowLeft size={18} />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </>
  );
}
