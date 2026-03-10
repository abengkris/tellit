"use client";

import { useEffect } from "react";
import { UserX, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Profile Segment Error:", error);
  }, [error]);

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="bg-orange-50 dark:bg-orange-900/20 p-5 rounded-full mb-6">
          <UserX size={48} className="text-orange-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Could not load profile</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
          There was an issue fetching this Nostr profile or their contact list. It might be due to relay connection issues.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <button
            onClick={() => reset()}
            className="flex-1 flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-2xl transition-all"
          >
            <RotateCcw size={18} />
            <span>Try again</span>
          </button>
          <Link
            href="/"
            className="flex-1 flex items-center justify-center space-x-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 font-bold py-3 px-6 rounded-2xl transition-all"
          >
            <Home size={18} />
            <span>Go Home</span>
          </Link>
        </div>
      </div>
    </>
  );
}
