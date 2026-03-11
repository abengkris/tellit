"use client";

import { Loader2 } from "lucide-react";
import { useFollowState } from "@/hooks/useFollowState";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  targetPubkey: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "default";
}

export function FollowButton({
  targetPubkey,
  className = "",
  size = "md",
}: FollowButtonProps) {
  const currentUser = useAuthStore((s) => s.user);
  const { isFollowing, followsMe, isLoading, isPending, toggle } =
    useFollowState(targetPubkey);

  // Don't show button for current user
  if (currentUser?.pubkey === targetPubkey) return null;

  if (isLoading) {
    return (
      <Skeleton
        className={cn(
          "rounded-full w-20 h-8",
          size === "sm" && "w-16 h-7",
          size === "lg" && "w-24 h-10",
          className
        )}
      />
    );
  }

  const shadcnSize = size === "md" ? "default" : size;

  return (
    <Button
      variant={isFollowing ? "outline" : "default"}
      size={shadcnSize as "default" | "sm" | "lg"}
      onClick={(e) => {
        e.stopPropagation(); // don't trigger PostCard click
        toggle();
      }}
      disabled={isPending}
      className={cn(
        "rounded-full font-black transition-all group",
        !isFollowing && "bg-primary hover:bg-primary/90 shadow-md shadow-primary/20",
        isFollowing && "hover:border-destructive hover:text-destructive hover:bg-destructive/10",
        className
      )}
    >
      {isPending ? (
        <span className="flex items-center gap-1.5">
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          {isFollowing ? "Unfollowing…" : "Following…"}
        </span>
      ) : isFollowing ? (
        <>
          <span className="group-hover:hidden">Following</span>
          <span className="hidden group-hover:inline">Unfollow</span>
        </>
      ) : followsMe ? (
        "Follow back"
      ) : (
        "Follow"
      )}
    </Button>
  );
}
