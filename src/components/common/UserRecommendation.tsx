"use client";

import React, { Fragment } from "react";
import { NDKUser } from "@nostr-dev-kit/ndk";
import { shortenPubkey } from "@/lib/utils/nip19";
import { CheckCircle2 } from "lucide-react";
import { Avatar } from "./Avatar";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

interface UserRecommendationProps {
  users: NDKUser[];
  onSelect: (user: NDKUser) => void;
  isLoading?: boolean;
}

export const UserRecommendation: React.FC<UserRecommendationProps> = ({ 
  users, 
  onSelect,
  isLoading 
}) => {
  if (users.length === 0 && !isLoading) return null;

  return (
    <Card className="absolute z-50 bottom-full left-0 right-0 mb-2 shadow-2xl max-h-64 overflow-y-auto animate-in slide-in-from-bottom-2 duration-200 p-0 overflow-hidden">
      <CardHeader className="p-3 bg-muted/50 border-b">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Suggestions</span>
      </CardHeader>
      
      <CardContent className="p-0">
        {isLoading && users.length === 0 ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-2 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            {users.map((user, index) => (
              <Fragment key={user.pubkey}>
                <Button
                  variant="ghost"
                  className="w-full justify-start h-auto gap-3 p-3 rounded-none hover:bg-accent transition-colors text-left group"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect(user);
                  }}
                >
                  <div className="relative shrink-0">
                    <Avatar 
                      pubkey={user.pubkey} 
                      src={user.profile?.picture || (user.profile as { image?: string })?.image} 
                      size={40} 
                      nip05={user.profile?.nip05}
                      className="rounded-xl group-hover:scale-105 transition-transform" 
                    />
                    {user.profile?.nip05 && (
                      <div className="absolute -bottom-1 -right-1 size-4 bg-blue-500 text-white rounded-full flex items-center justify-center border-2 border-background shadow-sm">
                        <CheckCircle2 size={8} fill="currentColor" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-sm truncate">
                        {user.profile?.display_name || user.profile?.name || shortenPubkey(user.pubkey)}
                      </span>
                      {user.profile?.nip05 && (
                        <span className="text-[10px] text-blue-500 font-medium truncate opacity-70">
                          {user.profile.nip05.replace(/^_@/, '')}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">
                      {shortenPubkey(user.npub, 16)}
                    </p>
                  </div>
                </Button>
                {index < users.length - 1 && <Separator />}
              </Fragment>
            ))}
          </div>
        )}
        
        {users.length === 0 && !isLoading && (
          <div className="p-6 text-center text-xs text-muted-foreground">
            No matches found in your follows.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
