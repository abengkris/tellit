"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { TrendingTags } from "./TrendingTags";
import { WhoToFollow } from "../profile/WhoToFollow";
import { useAuthStore } from "@/store/auth";
import { Input } from "@/components/ui/input";
import Link from "next/link";

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
    <div className="flex flex-col gap-4 sticky top-4">
      <section className="relative group">
        <form onSubmit={handleSearch} className="relative">
          <label htmlFor="right-panel-search" className="sr-only">Search Nostr</label>
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
            <Search className="size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          </div>
          <Input
            id="right-panel-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Nostr..."
            className="pl-11 rounded-full bg-muted/50 border-transparent focus:bg-background transition-all text-sm h-11"
          />
        </form>
      </section>

      <TrendingTags />

      {isLoggedIn && (
        <WhoToFollow />
      )}

      <footer className="px-4 text-[11px] text-muted-foreground flex flex-col gap-1">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <Link href="#" className="hover:underline">Terms of Service</Link>
          <Link href="#" className="hover:underline">Privacy Policy</Link>
          <Link href="#" className="hover:underline">Cookie Policy</Link>
          <Link href="#" className="hover:underline">Accessibility</Link>
        </div>
        <p>© 2026 Tell it! Inc.</p>
      </footer>
    </div>
  );
};
