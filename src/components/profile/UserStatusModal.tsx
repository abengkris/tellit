"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Smile } from "lucide-react";
import { updateStatus } from "@/lib/actions/profile";
import { useNDK } from "@/hooks/useNDK";
import { useUIStore } from "@/store/ui";
import { useUserStatus } from "@/hooks/useUserStatus";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UserStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  pubkey: string;
  onSuccess?: () => void;
}

export const UserStatusModal: React.FC<UserStatusModalProps> = ({
  isOpen,
  onClose,
  pubkey,
  onSuccess
}) => {
  const { ndk } = useNDK();
  const { addToast } = useUIStore();
  const { generalStatus } = useUserStatus(pubkey);
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (generalStatus?.content) {
      setStatus(generalStatus.content);
    }
  }, [generalStatus, isOpen]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!ndk) return;

    setLoading(true);
    try {
      const success = await updateStatus(ndk, status, "general");
      if (success) {
        addToast("Status updated!", "success");
        onSuccess?.();
        onClose();
      } else {
        addToast("Failed to update status.", "error");
      }
    } catch {
      addToast("Error updating status.", "error");
    } finally {
      setLoading(false);
    }
  };

  const clearStatus = async () => {
    if (!ndk) return;
    setLoading(true);
    try {
      const success = await updateStatus(ndk, "", "general");
      if (success) {
        setStatus("");
        addToast("Status cleared", "success");
        onSuccess?.();
        onClose();
      }
    } catch {
      addToast("Failed to clear status", "error");
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "Building Tell it! 🚀",
    "Listening to music 🎵",
    "Coding in Termux 📱",
    "On a break ☕",
    "Traveling ✈️",
    "Sleeping 😴"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border-none shadow-2xl flex flex-col max-h-[80vh]">
        <DialogHeader className="p-4 border-b shrink-0 flex flex-row items-center justify-between">
          <DialogTitle className="font-black text-xl">Set Status</DialogTitle>
          <div className="mr-8">
            <Button
              onClick={() => handleSubmit()}
              disabled={loading}
              size="sm"
              className="px-6 rounded-full font-black shadow-lg shadow-primary/20"
            >
              {loading ? <Loader2 className="animate-spin size-4" aria-hidden="true" /> : "Update"}
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6 space-y-8">
            <div className="space-y-3">
              <Label htmlFor="status-input" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Current Activity</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-primary">
                  <Smile className="size-5" aria-hidden="true" />
                </div>
                <Input
                  id="status-input"
                  type="text"
                  autoFocus
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  placeholder="What's happening?"
                  className="h-14 rounded-2xl pl-12 bg-muted/30 border-none shadow-sm focus-visible:ring-primary/20 font-medium text-base"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Suggestions</Label>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    onClick={() => setStatus(s)}
                    className="rounded-full bg-muted/30 border-none shadow-sm hover:bg-primary/10 hover:text-primary transition-all h-9 px-4 font-medium"
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>

            {status && (
              <Button
                variant="ghost"
                onClick={clearStatus}
                disabled={loading}
                className="w-full h-12 text-destructive hover:bg-destructive/10 rounded-2xl font-black transition-colors"
              >
                Clear Current Status
              </Button>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
