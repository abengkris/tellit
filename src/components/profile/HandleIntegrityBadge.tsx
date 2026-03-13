"use client";

import React from "react";
import { useVerifyHandle } from "@/hooks/useVerifyHandle";
import { HandleStatus } from "@/hooks/useHandleStatus";
import { BadgeCheck, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateProfileNIP05 } from "@/lib/actions/profile";
import { useNDK } from "@/hooks/useNDK";
import { useUIStore } from "@/store/ui";
import { Badge } from "@/components/ui/badge";

export const HandleIntegrityBadge = ({ handle, onFixed }: { handle: HandleStatus; onFixed: () => void }) => {
  const { result, loading, refresh } = useVerifyHandle(handle);
  const { ndk } = useNDK();
  const { addToast } = useUIStore();
  const [isFixing, setIsFixing] = React.useState(false);

  const handleFix = async () => {
    if (!ndk) return;
    setIsFixing(true);
    try {
      const success = await updateProfileNIP05(ndk, handle.fullHandle);
      if (success) {
        addToast("Profile updated! The checkmark should appear shortly.", "success");
        refresh();
        onFixed();
      } else {
        addToast("Failed to update profile", "error");
      }
    } catch (err) {
      addToast("An error occurred", "error");
    } finally {
      setIsFixing(false);
    }
  };

  if (loading) return <Loader2 className="size-4 animate-spin text-muted-foreground" />;

  if (result?.isValid) {
    return (
      <Badge variant="outline" className="bg-green-500/5 text-green-500 border-green-500/20 gap-1 h-6">
        <BadgeCheck size={12} fill="currentColor" />
        Verified on Profile
      </Badge>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
      <Badge variant="outline" className="bg-destructive/5 text-destructive border-destructive/20 gap-1 h-6">
        <AlertTriangle size={12} />
        Not Linked to Profile
      </Badge>
      <Button 
        size="sm" 
        variant="link" 
        className="h-6 p-0 text-[10px] font-black uppercase text-primary hover:no-underline"
        onClick={handleFix}
        disabled={isFixing}
      >
        {isFixing ? <Loader2 className="size-3 animate-spin mr-1" /> : <RefreshCw size={10} className="mr-1" />}
        Fix Now
      </Button>
    </div>
  );
};
