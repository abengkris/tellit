"use client";

import React, { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { useSearch } from "@/hooks/useSearch";
import { Avatar } from "../common/Avatar";
import { useRouter } from "next/navigation";
import { toNpub } from "@/lib/utils/nip19";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface NewMessageModalProps {
  onClose: () => void;
}

export const NewMessageModal: React.FC<NewMessageModalProps> = ({ onClose }) => {
  const [query, setQuery] = useState("");
  const { profiles, loading } = useSearch(query);
  const router = useRouter();

  const handleSelectUser = (pubkey: string) => {
    const npub = toNpub(pubkey);
    router.push(`/messages/${npub}`);
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border-none shadow-2xl flex flex-col h-[80vh]">
        <DialogHeader className="p-4 border-b shrink-0">
          <DialogTitle className="font-black text-xl">New message</DialogTitle>
          <DialogDescription className="sr-only">
            Search for a person to start a private conversation.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 border-b shrink-0 bg-muted/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" aria-hidden="true" />
            <Input
              type="text"
              autoFocus
              placeholder="Search people..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-12 rounded-2xl bg-background border-none shadow-sm focus-visible:ring-primary/20 font-medium"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="flex flex-col">
            {loading && query.length >= 3 ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-primary size-8" aria-hidden="true" />
              </div>
            ) : profiles.length > 0 ? (
              profiles.map((user, index) => (
                <React.Fragment key={user.pubkey}>
                  <Button
                    variant="ghost"
                    onClick={() => handleSelectUser(user.pubkey)}
                    className="w-full h-auto flex items-center justify-start gap-3 p-4 rounded-none hover:bg-accent transition-colors"
                  >
                    <Avatar pubkey={user.pubkey} src={user.profile?.image} size={44} aria-hidden="true" />
                    <div className="min-w-0 flex-1 text-left">
                      <div className="font-black truncate">
                        {user.profile?.display_name || user.profile?.name || "Unknown"}
                      </div>
                      {user.profile?.nip05 && (
                        <div className="text-[11px] text-primary font-bold truncate opacity-80">{user.profile.nip05}</div>
                      )}
                    </div>
                  </Button>
                  {index < profiles.length - 1 && <Separator />}
                </React.Fragment>
              ))
            ) : query.length >= 3 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm font-medium">No results found for &quot;{query}&quot;</p>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground px-8">
                <div className="size-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="size-8 opacity-20" aria-hidden="true" />
                </div>
                <p className="text-sm font-bold leading-relaxed">
                  Search for people by name, npub, or NIP-05 to start a new private conversation.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
