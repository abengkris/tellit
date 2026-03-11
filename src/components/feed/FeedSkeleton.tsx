import React, { Fragment } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export const FeedSkeleton = () => {
  return (
    <div className="flex flex-col">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Fragment key={i}>
          <div className="flex flex-col p-4">
            <div className="flex relative min-w-0">
              {/* Avatar Placeholder */}
              <div className="mr-3 shrink-0">
                <Skeleton className="size-12 rounded-full" />
              </div>

              {/* Content Area */}
              <div className="flex-1 min-w-0 overflow-hidden">
                {/* Header: Name and Npub */}
                <div className="flex items-center gap-2 mb-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-4" />
                </div>

                {/* Body: 2-3 lines of text */}
                <div className="space-y-2 mt-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-2/3" />
                </div>

                {/* Media Placeholder (Optional, for variety) */}
                {i % 2 === 0 && (
                  <Skeleton className="mt-3 aspect-video w-full rounded-2xl" />
                )}

                {/* Actions Placeholder */}
                <div className="flex items-center justify-between mt-4 max-w-sm pr-4">
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="size-8 rounded-full" />
                </div>
              </div>
            </div>
          </div>
          {i < 6 && <Separator />}
        </Fragment>
      ))}
    </div>
  );
};
