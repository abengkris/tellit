"use client";

import React, { useEffect, useState } from "react";
import { BadgeCheck, Loader2, Search, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/common/Avatar";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { useProfile } from "@/hooks/useProfile";

interface Handle {
  name: string;
  pubkey: string;
  created_at: string;
  relays: string[];
}

const DirectoryItem = ({ handle }: { handle: Handle }) => {
  const { profile, loading } = useProfile(handle.pubkey);
  const name = profile?.display_name || profile?.name || handle.name;

  return (
    <Link href={`/${handle.name}`}>
      <Card className="hover:bg-muted/30 transition-all border-none shadow-sm bg-muted/10 group">
        <CardContent className="p-4 flex items-center gap-4">
          <Avatar pubkey={handle.pubkey} size={48} isLoading={loading} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-black truncate group-hover:text-primary transition-colors">{name}</span>
              <BadgeCheck className="text-primary size-4 shrink-0" fill="currentColor" />
            </div>
            <p className="text-xs text-muted-foreground font-mono">@{handle.name}@tellit.id</p>
          </div>
          <div className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            View Profile
            <ExternalLink size={10} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default function DirectoryPage() {
  const [handles, setHandles] = useState<Handle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchDirectory() {
      try {
        const res = await fetch("/api/nip05/directory");
        const data = await res.json();
        setHandles(data.handles || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDirectory();
  }, []);

  const filteredHandles = handles.filter(h => 
    h.name.toLowerCase().includes(search.toLowerCase()) || 
    h.pubkey.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-32 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-black italic tracking-tighter flex items-center gap-3">
          <BadgeCheck size={40} className="text-primary" fill="currentColor" />
          Verified Directory
        </h1>
        <p className="text-muted-foreground font-medium">
          Discover the awesome people who have verified their identity on Tell it!
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-3.5 size-5 text-muted-foreground" />
        <Input 
          placeholder="Search by handle or pubkey..." 
          className="h-12 pl-12 rounded-2xl bg-muted/30 border-none font-bold"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="size-10 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground font-medium">Loading verified handles...</p>
        </div>
      ) : filteredHandles.length > 0 ? (
        <div className="grid gap-3">
          {filteredHandles.map((handle) => (
            <DirectoryItem key={handle.name} handle={handle} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-muted/10 rounded-3xl border border-dashed border-muted-foreground/20">
          <p className="text-muted-foreground font-medium italic">No verified handles found matching your search.</p>
          <Button 
            variant="link" 
            onClick={() => setSearch("")}
            className="text-primary font-black"
          >
            Clear search
          </Button>
        </div>
      )}

      <div className="p-8 bg-linear-to-br from-primary/5 to-purple-500/5 rounded-3xl border border-primary/10 text-center space-y-4">
        <h2 className="text-2xl font-black">Want to be here?</h2>
        <p className="text-muted-foreground font-medium">
          Get your own premium handle and stand out in the Nostr ecosystem.
        </p>
        <Link href="/settings/verify">
          <Button className="rounded-full h-12 px-8 font-black text-lg shadow-lg shadow-primary/20 mt-2">
            Get Verified Now
          </Button>
        </Link>
      </div>
    </div>
  );
}
