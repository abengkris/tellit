"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { TrendingTags } from "./TrendingTags";
import { WhoToFollow } from "../profile/WhoToFollow";
import { useAuthStore } from "@/store/auth";

export const RightPanel = () => {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { isLoggedIn } = useAuthStore();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery("");
    }
  };

  return (
    <div className="space-y-4 sticky top-4">
      <section className="relative group">
        <form onSubmit={handleSearch}>
          <label htmlFor="right-panel-search" className="sr-only">Search Nostr</label>
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input
            id="right-panel-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Nostr..."
            className="block w-full pl-11 pr-4 py-2.5 border border-transparent rounded-full bg-gray-100 dark:bg-gray-900 focus:outline-none focus:bg-white dark:focus:bg-black focus:ring-1 focus:ring-blue-500 transition-all text-sm"
          />
        </form>
      </section>

      <TrendingTags />

      {isLoggedIn && (
        <WhoToFollow />
      )}

      <footer className="px-4 text-[11px] text-gray-500 space-y-1">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <a href="#" className="hover:underline">Terms of Service</a>
          <a href="#" className="hover:underline">Privacy Policy</a>
          <a href="#" className="hover:underline">Cookie Policy</a>
          <a href="#" className="hover:underline">Accessibility</a>
        </div>
        <p>© 2026 Tell it! Inc.</p>
      </footer>
    </div>
  );
};
