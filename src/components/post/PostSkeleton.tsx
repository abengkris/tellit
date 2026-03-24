import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PostSkeletonProps {
  className?: string;
  hasMedia?: boolean;
}

export const PostSkeleton = ({ className, hasMedia = false }: PostSkeletonProps) => {
  return (
    <div className={cn("flex flex-col px-4 pt-3 pb-2 border-b border-border", className)}>
      <div className="flex relative min-w-0">
        {/* Avatar Area */}
        <div className="mr-3 shrink-0">
          <Skeleton className="size-12 rounded-full" />
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1.5">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-3 w-4 rounded ml-auto" />
          </div>

          {/* Text Content */}
          <div className="space-y-2.5 mt-2">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-[92%] rounded" />
            <Skeleton className="h-4 w-[65%] rounded" />
          </div>

          {/* Media */}
          {hasMedia && (
            <Skeleton className="mt-3 aspect-video w-full rounded-2xl" />
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-4 max-w-[320px] pr-4">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="size-8 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
