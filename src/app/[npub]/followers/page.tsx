// src/app/[npub]/followers/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useFollowers } from "@/hooks/useFollowers";
import { useFollowingList } from "@/hooks/useFollowingList";
import { useResolveIdentity } from "@/hooks/useIdentity";
import { FollowList } from "@/components/profile/FollowList";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

type Tab = "followers" | "following";

export default function FollowersPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const npub = params.npub as string;
  
  const initialTab = (searchParams.get("tab") as Tab) || "followers";
  const [tab, setTab] = useState<Tab>(initialTab);
  
  const { hexPubkey, loading: resolving } = useResolveIdentity(npub);

  const { followers, loading: followersLoading } = useFollowers(hexPubkey || undefined);
  const { followingUsers, loading: followingLoading } = useFollowingList(hexPubkey || undefined);
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
    router.replace(`/${npub}/followers?${newSearchParams.toString()}`, { scroll: false });
  };

  if (resolving) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin size-10 text-primary" />
        <p className="mt-4 text-muted-foreground font-medium">Memuat koneksi...</p>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-4 px-4 py-3">
            <Link href={`/${npub}`} className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="font-bold text-lg">Koneksi</h1>
          </div>

          {/* Tabs */}
          <div className="flex">
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
    </>
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
        flex-1 py-3 text-sm font-semibold transition-all border-b-2
        ${active
          ? "text-blue-500 border-blue-500"
          : "text-gray-500 border-transparent hover:text-gray-700 dark:hover:text-gray-300"
        }
      `}
    >
      {label}
      {" "}
      {loading && count === 0 ? (
        <span className="text-gray-400">...</span>
      ) : (
        <span className={active ? "text-blue-400" : "text-gray-400"}>
          {count > 999 ? `${(count / 1000).toFixed(1)}K` : count}
        </span>
      )}
    </button>
  );
}
