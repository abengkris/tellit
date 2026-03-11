"use client";

import React, { Fragment } from "react";
import { useFollowSuggestions } from "@/hooks/useFollowSuggestions";
import { Avatar } from "@/components/common/Avatar";
import { FollowButton } from "@/components/profile/FollowButton";
import Link from "next/link";
import { UserIdentity } from "@/components/common/UserIdentity";
import { useProfile } from "@/hooks/useProfile";
import { toNpub } from "@/lib/utils/nip19";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowRight } from "lucide-react";

interface SuggestionCardProps {
  pubkey: string;
  followedByCount: number;
  showAbout?: boolean;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({ 
  pubkey, 
  followedByCount,
  showAbout = false
}) => {
  const { profile } = useProfile(pubkey);
  const npub = toNpub(pubkey);

  return (
    <div className="flex items-start justify-between gap-3 group px-4 py-3 hover:bg-accent/30 transition-colors">
      <Link href={`/${npub}`} className="shrink-0">
        <Avatar 
          pubkey={pubkey} 
          src={profile?.picture} 
          size={48} 
          className="rounded-full ring-2 ring-transparent group-hover:ring-primary/20 transition-all"
        />
      </Link>
      
      <div className="flex-1 min-w-0">
        <Link href={`/${npub}`} className="block">
          <UserIdentity 
            pubkey={pubkey}
            display_name={profile?.display_name}
            name={profile?.name}
            nip05={profile?.nip05}
            variant="post"
            tags={profile?.tags}
          />
        </Link>
        <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
          Followed by {followedByCount} people you follow
        </p>
        {showAbout && profile?.about && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
            {profile.about}
          </p>
        )}
      </div>

      <div className="shrink-0 pt-1">
        <FollowButton targetPubkey={pubkey} size="sm" />
      </div>
    </div>
  );
};

export const WhoToFollow = () => {
  const { suggestions, loading } = useFollowSuggestions(3);

  if (loading) {
    return (
      <Card className="rounded-3xl border-none shadow-none bg-muted/30">
        <CardHeader className="p-4 pb-2">
          <Skeleton className="h-6 w-1/2" />
        </CardHeader>
        <CardContent className="p-0">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 flex items-center gap-3">
              <Skeleton className="size-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <Card className="rounded-3xl border-none shadow-none bg-muted/30 overflow-hidden">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="font-black text-xl tracking-tight">Who to follow</CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <div className="flex flex-col">
          {suggestions.map((suggestion, index) => (
            <Fragment key={suggestion.pubkey}>
              <SuggestionCard 
                pubkey={suggestion.pubkey} 
                followedByCount={suggestion.followedByCount}
              />
              {index < suggestions.length - 1 && <Separator className="bg-muted-foreground/10" />}
            </Fragment>
          ))}
        </div>
      </CardContent>

      <CardFooter className="p-0 border-t border-muted-foreground/10">
        <Button asChild variant="ghost" className="w-full justify-start p-4 text-primary font-black hover:bg-accent/50 rounded-none h-auto">
          <Link href="/suggested" className="flex items-center justify-between w-full group">
            Show more
            <ArrowRight className="size-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};
