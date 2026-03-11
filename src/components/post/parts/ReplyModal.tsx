"use client";

import React from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { PostComposer } from "../PostComposer";
import { shortenPubkey, toNpub } from "@/lib/utils/nip19";
import { useProfile } from "@/hooks/useProfile";
import { PostContentRenderer } from "./PostContent";
import Link from "next/link";
import { Avatar } from "@/components/common/Avatar";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface ReplyModalProps {
  event: NDKEvent;
  onClose: () => void;
}

export const ReplyModal: React.FC<ReplyModalProps> = ({ event, onClose }) => {
  const { profile, loading: profileLoading } = useProfile(event.pubkey);
  
  const display_name = profile?.display_name || profile?.name || shortenPubkey(event.pubkey);
  const isArticle = event.kind === 30023;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden border-none shadow-2xl flex flex-col max-h-[90vh]">
        <DialogHeader className="p-4 border-b shrink-0">
          <DialogTitle className="text-center font-black text-lg">Reply</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          {/* Parent Post Preview */}
          <div className="p-4 flex gap-3">
            <div className="flex flex-col items-center shrink-0">
              <Avatar 
                pubkey={event.pubkey} 
                src={profile?.picture} 
                size={48} 
                isLoading={profileLoading}
                aria-hidden="true"
              />
              <div className="w-0.5 grow bg-border my-2 rounded-full" />
            </div>
            <div className="flex-1 min-w-0 py-1">
              <div className="flex items-center gap-1 mb-1">
                <span className="font-black truncate">{display_name}</span>
                <span className="text-muted-foreground text-sm font-medium">@{shortenPubkey(event.pubkey)}</span>
              </div>
              <div className="text-foreground/80 text-sm leading-relaxed line-clamp-6">
                <PostContentRenderer 
                  content={event.content} 
                  event={event} 
                  renderMedia={false} 
                  renderQuotes={false}
                  isArticle={isArticle}
                />
              </div>
              <div className="mt-3 text-xs text-muted-foreground font-medium">
                Replying to <Link href={`/${toNpub(event.pubkey)}`} className="text-primary font-black hover:underline">@{display_name}</Link>
              </div>
            </div>
          </div>

          <Separator />

          {/* Composer */}
          <div className="bg-background">
            <PostComposer 
              replyTo={event} 
              onSuccess={onClose} 
              autoFocus={true}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
