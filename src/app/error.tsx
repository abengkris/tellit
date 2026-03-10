"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-6">
          <AlertCircle size={48} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Something went wrong!</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
          An unexpected error occurred while communicating with the Nostr network.
        </p>
        <button
          onClick={() => reset()}
          className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-lg shadow-blue-500/20"
        >
          <RotateCcw size={20} />
          <span>Try again</span>
        </button>
      </div>
    </>
  );
}
