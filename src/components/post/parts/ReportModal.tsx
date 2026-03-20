"use client";

import React, { useState } from "react";
import { Flag, Loader2, AlertCircle, Ban } from "lucide-react";
import { useNDK } from "@/hooks/useNDK";
import { reportContent, ReportType } from "@/lib/actions/report";
import { useUIStore } from "@/store/ui";
import { useLists } from "@/hooks/useLists";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ReportModalProps {
  targetPubkey: string;
  targetEventId?: string;
  blobHash?: string;
  blobServer?: string;
  isOpen: boolean;
  onClose: () => void;
}

const REPORT_TYPES: { type: ReportType; label: string; description: string }[] = [
  { type: "spam", label: "Spam", description: "Malicious links, fake accounts, or repetitive content" },
  { type: "impersonation", label: "Impersonation", description: "Pretending to be someone else" },
  { type: "nudity", label: "Nudity or NSFW", description: "Sexually explicit content" },
  { type: "profanity", label: "Profanity", description: "Hate speech or offensive language" },
  { type: "illegal", label: "Illegal", description: "Content that violates local laws" },
  { type: "malware", label: "Malware", description: "Links to viruses or phishing sites" },
  { type: "other", label: "Other", description: "Something else not listed above" },
];

export const ReportModal: React.FC<ReportModalProps> = ({ 
  targetPubkey, 
  targetEventId, 
  blobHash,
  blobServer,
  isOpen, 
  onClose 
}) => {
  const { ndk } = useNDK();
  const { addToast } = useUIStore();
  const { muteUser } = useLists();
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMuting, setIsMuting] = useState(false);

  const handleMute = async () => {
    setIsMuting(true);
    try {
      const success = await muteUser(targetPubkey);
      if (success) {
        addToast("User muted successfully.", "success");
        onClose();
      } else {
        addToast("Failed to mute user.", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Error muting user.", "error");
    } finally {
      setIsMuting(false);
    }
  };

  const handleSubmit = async () => {
    if (!ndk || !selectedType) return;

    setIsSubmitting(true);
    try {
      const success = await reportContent(ndk, selectedType, targetPubkey, targetEventId, reason, blobHash, blobServer);
      if (success) {
        addToast("Report sent successfully. Thank you for keeping Tell it! safe.", "success");
        onClose();
      } else {
        addToast("Failed to send report.", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("An error occurred while reporting.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-0 gap-0 sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-destructive font-black">
            <Flag className="size-5" aria-hidden="true" />
            Report Content
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6 space-y-6">
            <div className="flex items-start gap-3 p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-[11px] text-amber-600 dark:text-amber-400 font-medium leading-relaxed">
              <AlertCircle size={16} className="shrink-0" aria-hidden="true" />
              <p>
                Reports are public events (kind 1984) sent to relays. They help clients and relays filter content but do not guarantee removal from the decentralized network.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Why are you reporting this?</label>
              <div className="space-y-2">
                {REPORT_TYPES.map((item) => (
                  <Button
                    key={item.type}
                    variant="outline"
                    onClick={() => setSelectedType(item.type)}
                    className={cn(
                      "w-full h-auto justify-start flex-col items-start p-4 rounded-2xl transition-all border-none shadow-sm gap-0.5",
                      selectedType === item.type
                        ? "bg-destructive/10 ring-1 ring-destructive"
                        : "bg-muted/30 hover:bg-accent"
                    )}
                  >
                    <p className={cn("font-black text-sm", selectedType === item.type ? "text-destructive" : "text-foreground")}>
                      {item.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium">{item.description}</p>
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="p-4 bg-muted/30 rounded-2xl flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="font-black text-sm">Don&apos;t want to see this user?</p>
                  <p className="text-muted-foreground text-[10px] font-medium leading-tight text-pretty">Muting hides their posts and replies globally.</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleMute}
                  disabled={isMuting}
                  className="rounded-full font-black px-4 bg-background hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                >
                  {isMuting ? <Loader2 className="animate-spin size-3.5" aria-hidden="true" /> : <Ban className="size-3.5" aria-hidden="true" />}
                  <span>Mute</span>
                </Button>
              </div>

              <div className="space-y-3 pb-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Additional Context (Optional)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide more details to help us understand the issue..."
                  rows={3}
                  className="w-full p-4 bg-muted/30 border-none rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm font-medium resize-none placeholder:text-muted-foreground/50"
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="p-6 border-t shrink-0">
          <Button
            onClick={handleSubmit}
            disabled={!selectedType || isSubmitting}
            className="w-full h-14 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-black rounded-2xl transition-all shadow-lg shadow-destructive/20 gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin size-5" aria-hidden="true" />
            ) : (
              <>
                <Flag className="size-5" aria-hidden="true" />
                <span>Submit Report</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
