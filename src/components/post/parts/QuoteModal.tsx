"use client";

import React from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { PostComposer } from "../PostComposer";
import { shortenPubkey } from "@/lib/utils/nip19";
import { useProfile } from "@/hooks/useProfile";
import { PostContentRenderer } from "./PostContent";
import { Avatar } from "@/components/common/Avatar";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";

interface QuoteModalProps {
  event: NDKEvent;
  onClose: () => void;
}

export const QuoteModal: React.FC<QuoteModalProps> = ({ event, onClose }) => {
  const { profile, loading: profileLoading } = useProfile(event.pubkey);
  
  const display_name = profile?.display_name || profile?.name || shortenPubkey(event.pubkey);
  const isArticle = event.kind === 30023;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden border-none shadow-2xl flex flex-col max-h-[90vh]">
        <DialogHeader className="p-4 border-b shrink-0">
          <DialogTitle className="text-center font-black text-lg">Quote</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 bg-background">
          {/* Composer */}
          <div className="pb-2">
            <PostComposer 
              quoteEvent={event} 
              onSuccess={onClose} 
              autoFocus={true}
              placeholder="Add a comment..."
            />
          </div>

          <Separator />

          {/* Quoted Post Preview */}
          <div className="p-4 sm:p-6 bg-muted/30">
            <Card className="rounded-2xl border-border overflow-hidden bg-background/50 shadow-none">
              <CardContent className="p-4 flex gap-3">
                <Avatar 
                  pubkey={event.pubkey} 
                  src={profile?.picture} 
                  size={24} 
                  isLoading={profileLoading}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-1 text-sm">
                    <span className="font-black truncate">{display_name}</span>
                    <span className="text-muted-foreground truncate font-medium">@{shortenPubkey(event.pubkey)}</span>
                  </div>
                  <div className="text-foreground/70 text-sm leading-relaxed line-clamp-10 overflow-hidden">
                    <PostContentRenderer 
                      content={event.content} 
                      event={event} 
                      renderMedia={false} 
                      renderQuotes={false}
                      isArticle={isArticle}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
