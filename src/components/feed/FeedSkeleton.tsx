import React from "react";
import { PostSkeleton } from "@/components/post/PostSkeleton";

export const FeedSkeleton = () => {
  return (
    <div className="flex flex-col">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <PostSkeleton key={i} hasMedia={i % 3 === 0} />
      ))}
    </div>
  );
};
