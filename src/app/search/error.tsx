"use client";

import { useEffect } from "react";
import { SearchX, RotateCcw } from "lucide-react";

export default function SearchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Search Segment Error:", error);
  }, [error]);

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="bg-gray-100 dark:bg-gray-900 p-5 rounded-full mb-6">
          <SearchX size={48} className="text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Search failed</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
          Something went wrong while searching the Nostr network. Full-text search (NIP-50) requires specific relay support.
        </p>
        
        <button
          onClick={() => reset()}
          className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-2xl transition-all shadow-lg shadow-blue-500/20"
        >
          <RotateCcw size={18} />
          <span>Try again</span>
        </button>
      </div>
    </>
  );
}
