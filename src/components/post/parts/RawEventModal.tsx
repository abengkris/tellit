"use client";

import React from "react";
import { Code, Copy, Check } from "lucide-react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { useUIStore } from "@/store/ui";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RawEventModalProps {
  event: NDKEvent;
  isOpen: boolean;
  onClose: () => void;
}

export const RawEventModal: React.FC<RawEventModalProps> = ({ event, isOpen, onClose }) => {
  const [copied, setCopied] = React.useState(false);
  const { addToast } = useUIStore();

  const rawJson = JSON.stringify(event.rawEvent(), null, 2);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(rawJson);
    setCopied(true);
    addToast("Event JSON copied!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-0 gap-0 sm:max-w-2xl max-h-[80vh] flex flex-col overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 border-b shrink-0 flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2 text-muted-foreground font-black">
            <Code className="size-5" aria-hidden="true" />
            Raw Event Data
          </DialogTitle>
          <div className="mr-8">
            <Button 
              variant="ghost" 
              size="icon-sm"
              onClick={copyToClipboard}
              className="text-primary hover:bg-primary/10 rounded-full"
              aria-label="Copy JSON"
            >
              {copied ? <Check className="size-5" aria-hidden="true" /> : <Copy className="size-5" aria-hidden="true" />}
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 bg-muted/30">
          <pre className="p-6 text-[11px] font-mono text-foreground/80 whitespace-pre-wrap break-all leading-relaxed">
            {rawJson}
          </pre>
        </ScrollArea>

        <div className="p-4 border-t shrink-0 bg-background">
          <p className="text-[10px] text-muted-foreground text-center uppercase tracking-widest font-black opacity-50">
            Protocol Transparency · NIP-01
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
