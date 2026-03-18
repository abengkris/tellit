// src/app/[npub]/followers/FollowersContent.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useFollowers } from "@/hooks/useFollowers";
import { useFollowingList } from "@/hooks/useFollowingList";
import { FollowList } from "@/components/profile/FollowList";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

type Tab = "followers" | "following";

interface FollowersContentProps {
  hexPubkey: string;
  slug: string; // The original vanity name or npub from URL
}

export function FollowersContent({ hexPubkey, slug }: FollowersContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const initialTab = (searchParams.get("tab") as Tab) || "followers";
  const [tab, setTab] = useState<Tab>(initialTab);
  
  const { followers, loading: followersLoading } = useFollowers(hexPubkey);
  const { followingUsers, loading: followingLoading } = useFollowingList(hexPubkey);
  const followingPubkeys = followingUsers.map((u) => u.pubkey);

  // Sync tab state with URL
  useEffect(() => {
    const t = searchParams.get("tab") as Tab;
    if (t && (t === "followers" || t === "following")) {
      setTab(t);
    }
  }, [searchParams]);

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set("tab", newTab);
    router.replace(`/${slug}/followers?${newSearchParams.toString()}`, { scroll: false });
  };

  return (
    <div className="max-w-2xl mx-auto border-x border-border min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-6 px-4 py-3">
          <Link href={`/${slug}`} className="p-2 hover:bg-accent rounded-full transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-black text-xl tracking-tight">Koneksi</h1>
        </div>

        {/* Tabs */}
        <div className="flex px-2">
          <TabButton
            active={tab === "followers"}
            onClick={() => handleTabChange("followers")}
            count={followers.length}
            label="Pengikut"
            loading={followersLoading}
          />
          <TabButton
            active={tab === "following"}
            onClick={() => handleTabChange("following")}
            count={followingPubkeys.length}
            label="Mengikuti"
            loading={followingLoading}
          />
        </div>
      </header>

      {/* List */}
      <div className="pb-20">
        {tab === "followers" ? (
          <FollowList
            pubkeys={followers}
            loading={followersLoading}
            emptyMessage="Belum ada pengikut."
          />
        ) : (
          <FollowList
            pubkeys={followingPubkeys}
            loading={followingLoading}
            emptyMessage="Belum mengikuti siapapun."
          />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  count,
  label,
  loading,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  label: string;
  loading: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 py-4 text-sm font-black uppercase tracking-widest transition-all relative
        ${active
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground"
        }
      `}
    >
      <div className="flex items-center justify-center gap-2">
        <span>{label}</span>
        {loading && count === 0 ? (
          <Loader2 className="size-3 animate-spin opacity-50" />
        ) : (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
            {count > 999 ? `${(count / 1000).toFixed(1)}K` : count}
          </span>
        )}
      </div>
      {active && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full" />
      )}
    </button>
  );
}
