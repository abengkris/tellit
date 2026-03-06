"use client";

import { Loader2 } from "lucide-react";
import { useFollowState } from "@/hooks/useFollowState";
import { useAuthStore } from "@/store/auth";

interface FollowButtonProps {
  targetPubkey: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function FollowButton({
  targetPubkey,
  className = "",
  size = "md",
}: FollowButtonProps) {
  const currentUser = useAuthStore((s) => s.user);
  const { isFollowing, isLoading, isPending, toggle } =
    useFollowState(targetPubkey);

  // Don't show button for current user
  if (currentUser?.pubkey === targetPubkey) return null;

  const sizeClasses = {
    sm: "px-3 py-1 text-xs",
    md: "px-4 py-1.5 text-sm",
    lg: "px-6 py-2 text-base",
  };

  if (isLoading) {
    return (
      <div
        className={`
          ${sizeClasses[size]} rounded-full bg-zinc-800 animate-pulse w-20 h-8
          ${className}
        `}
      />
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation(); // don't trigger PostCard click
        toggle();
      }}
      disabled={isPending}
      className={`
        ${sizeClasses[size]}
        font-bold rounded-full border transition-all duration-200
        ${isPending ? "opacity-60 cursor-not-allowed" : "cursor-pointer active:scale-95 transition-transform"}
        ${
          isFollowing
            ? // State: following → hover shows "Unfollow"
              "bg-transparent border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:border-red-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 group"
            : // State: not following
              "bg-blue-500 text-white border-blue-500 hover:bg-blue-600 shadow-sm shadow-blue-500/20"
        }
        ${className}
      `}
    >
      {isPending ? (
        <span className="flex items-center gap-1.5">
          <Loader2 size={14} className="animate-spin" />
          {isFollowing ? "Unfollowing…" : "Following…"}
        </span>
      ) : isFollowing ? (
        <>
          <span className="group-hover:hidden">Following</span>
          <span className="hidden group-hover:inline">Unfollow</span>
        </>
      ) : (
        "Follow"
      )}
    </button>
  );
}
