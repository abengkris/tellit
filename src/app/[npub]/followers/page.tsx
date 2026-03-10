// src/app/[npub]/followers/page.tsx
"use client";

import React, { useState, useEffect, use } from "react";
import { useParams } from "next/navigation";
import { useFollowers } from "@/hooks/useFollowers";
import { useFollowingList } from "@/hooks/useFollowingList";
import { FollowList } from "@/components/profile/FollowList";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { decodeNip19 } from "@/lib/utils/nip19";

type Tab = "followers" | "following";

export default function FollowersPage() {
  const params = useParams();
  const npub = params.npub as string;
  const [tab, setTab] = useState<Tab>("followers");
  
  const { id: hexPubkey } = decodeNip19(npub);

  const { followers, loading: followersLoading } = useFollowers(hexPubkey || undefined);
  const { followingUsers, loading: followingLoading } = useFollowingList(hexPubkey || undefined);
  const followingPubkeys = followingUsers.map((u) => u.pubkey);

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
              onClick={() => setTab("followers")}
              count={followers.length}
              label="Pengikut"
              loading={followersLoading}
            />
            <TabButton
              active={tab === "following"}
              onClick={() => setTab("following")}
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
