import React from "react";

export const FeedSkeleton = () => {
  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-800">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex flex-col p-4 animate-pulse">
          <div className="flex relative min-w-0">
            {/* Avatar Placeholder */}
            <div className="mr-3 shrink-0">
              <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800" />
            </div>

            {/* Content Area */}
            <div className="flex-1 min-w-0 overflow-hidden">
              {/* Header: Name and Npub */}
              <div className="flex items-center gap-2 mb-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24" />
                <div className="h-3 bg-gray-100 dark:bg-gray-900 rounded w-16 mt-0.5" />
                <div className="h-3 bg-gray-100 dark:bg-gray-900 rounded w-4 mt-0.5" />
              </div>

              {/* Body: 2-3 lines of text */}
              <div className="space-y-2 mt-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full" />
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-11/12" />
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3" />
              </div>

              {/* Media Placeholder (Optional, for variety) */}
              {i % 2 === 0 && (
                <div className="mt-3 aspect-video w-full bg-gray-100 dark:bg-gray-900 rounded-2xl" />
              )}

              {/* Actions Placeholder */}
              <div className="flex items-center justify-between mt-4 max-w-sm">
                <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-900" />
                <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-900" />
                <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-900" />
                <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-900" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
