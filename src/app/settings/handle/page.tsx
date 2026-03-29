"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth";
import { useNDK } from "@/hooks/useNDK";
import { useUIStore } from "@/store/ui";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { BadgeCheck, Loader2, ChevronLeft, Calendar, Globe, RefreshCw, ExternalLink, Share2, Zap, Trash2, Plus, Server, Star, Bitcoin } from "lucide-react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateProfileNIP05 } from "@/lib/actions/profile";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { nip19 } from "@nostr-dev-kit/ndk";
import { cn } from "@/lib/utils";
import { useHandleStatus, PendingHandle } from "@/hooks/useHandleStatus";
import { useRelayList } from "@/hooks/useRelayList";
import { LNPaymentModal } from "@/components/common/LNPaymentModal";
import { HandleIntegrityBadge } from "@/components/profile/HandleIntegrityBadge";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { Avatar } from "@/components/common/Avatar";
import { decodeNip19, shortenPubkey } from "@/lib/utils/nip19";
import { 
  updateLightningAddressAction, 
  updateRelaysAction, 
  cancelRegistrationAction, 
  transferHandleAction,
  setPrimaryHandleAction
} from "@/lib/actions/server/nip05";
const LightningAddressDialog = ({ 
  handleName, 
  initialAddress,
  onSuccess 
}: { 
  handleName: string; 
  initialAddress?: string;
  onSuccess: () => void;
}) => {
  const { user } = useAuthStore();
  const { ndk } = useNDK();
  const { addToast } = useUIStore();
  const [address, setAddress] = useState(initialAddress || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = async () => {
    if (!ndk || !ndk.signer || !user) return;
    
    if (address && !address.includes("@")) {
      addToast("Invalid lightning address format (user@domain.com)", "error");
      return;
    }

    setIsUpdating(true);
    try {
      const event = new NDKEvent(ndk);
      event.kind = 4447;
      event.content = `Update Lightning Address for ${handleName} to ${address}`;
      event.tags = [
        ["handle", handleName],
        ["lightning_address", address]
      ];
      
      await event.sign();
      const res = await updateLightningAddressAction(event.rawEvent());

      if (res.success) {
        addToast(res.message || "Address updated", "success");
        
        // Auto-sync to profile to fix the "Not linked" issue
        if (address) {
          const fullHandle = `${handleName}@tellit.id`;
          await updateProfileNIP05(ndk, fullHandle);
        }

        setIsOpen(false);
        onSuccess();
      } else {
        addToast(res.error || "Failed to update address", "error");
      }
    } catch (err) {
      console.error("[LightningAddress] Error:", err);
      addToast("An error occurred", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-orange-500 hover:bg-orange-500/10">
          <Bitcoin size={12} />
          {initialAddress ? "Edit Lightning" : "Add Lightning"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black flex items-center gap-2">
            <Zap className="text-yellow-500 fill-current size-6" />
            Lightning Address
          </DialogTitle>
          <DialogDescription className="font-medium">
            Link your handle <span className="text-primary font-bold">@{handleName}</span> to a Lightning Address to receive zaps.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">
              Your Lightning Address (e.g. user@getalby.com)
            </label>
            <Input
              placeholder="user@provider.com"
              value={address}
              onChange={(e) => setAddress(e.target.value.toLowerCase())}
              className="h-14 rounded-2xl bg-muted/30 border-none text-lg font-bold"
            />
          </div>
          
          <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10 space-y-2">
            <p className="text-xs font-medium text-orange-600 dark:text-orange-400">
              Once linked, your handle <span className="font-black italic">{handleName}@tellit.id</span> will redirect payments to your address.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={handleSave} 
            disabled={isUpdating}
            className="w-full h-12 rounded-2xl font-black text-lg bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            {isUpdating ? <Loader2 className="animate-spin mr-2" /> : null}
            Save Address
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const RelayEditorDialog = ({ 
  handleName, 
  initialRelays,
  onSuccess 
}: { 
  handleName: string; 
  initialRelays: string[];
  onSuccess: () => void;
}) => {
  const { user } = useAuthStore();
  const { ndk } = useNDK();
  const { addToast } = useUIStore();
  const { relays: profileRelays } = useRelayList(user?.pubkey);
  const [relays, setRelays] = useState<string[]>(initialRelays);
  const [newRelay, setNewRelay] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleAddRelay = (url: string) => {
    const cleanUrl = url.trim();
    if (!cleanUrl) return;
    if (!cleanUrl.startsWith("wss://") && !cleanUrl.startsWith("ws://")) {
      addToast("Invalid relay URL", "error");
      return;
    }
    if (relays.includes(cleanUrl)) {
      addToast("Relay already added", "error");
      return;
    }
    setRelays([...relays, cleanUrl]);
    setNewRelay("");
  };

  const handleRemoveRelay = (url: string) => {
    setRelays(relays.filter(r => r !== url));
  };

  const handleSyncFromProfile = () => {
    const profileUrls = profileRelays.map(r => r.url);
    const combined = Array.from(new Set([...relays, ...profileUrls])).slice(0, 10);
    setRelays(combined);
    addToast("Synced from your profile relays", "success");
  };

  const handleSave = async () => {
    if (!ndk || !ndk.signer || !user) return;
    if (relays.length === 0) {
      addToast("At least one relay is required", "error");
      return;
    }

    setIsUpdating(true);
    try {
      const event = new NDKEvent(ndk);
      event.kind = 4445;
      event.content = `Update relays for ${handleName}`;
      event.tags = [
        ["handle", handleName],
        ["relays", ...relays]
      ];

      await event.sign();
      const res = await updateRelaysAction(event.rawEvent());

      if (res.success) {
        addToast(res.message || "Relays updated", "success");
        setIsOpen(false);
        onSuccess();
      } else {
        addToast(res.error || "Failed to update relays", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("An error occurred while updating relays", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10">
          <Server size={12} />
          Edit Relays
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Assign Relays</DialogTitle>
          <DialogDescription className="font-medium">
            These relays will be returned in your NIP-05 file for discovery.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex gap-2">
            <Input
              placeholder="wss://relay.example.com"
              value={newRelay}
              onChange={(e) => setNewRelay(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddRelay(newRelay)}
              className="h-12 rounded-xl bg-muted/30 border-none font-mono text-xs"
            />
            <Button onClick={() => handleAddRelay(newRelay)} className="h-12 w-12 rounded-xl p-0 shrink-0">
              <Plus size={20} />
            </Button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {relays.map((url) => (
              <div key={url} className="flex items-center justify-between p-3 rounded-2xl bg-muted/20 border border-muted group">
                <span className="text-xs font-mono truncate mr-2">{url.replace("wss://", "")}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleRemoveRelay(url)}
                  className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>

          {profileRelays.length > 0 && (
            <Button 
              variant="outline" 
              onClick={handleSyncFromProfile}
              className="w-full h-12 rounded-xl font-bold border-dashed border-primary/30 text-primary hover:bg-primary/5"
            >
              <RefreshCw size={16} className="mr-2" />
              Sync from Profile Relays
            </Button>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            onClick={handleSave} 
            disabled={isUpdating}
            className="w-full sm:flex-1 h-12 rounded-2xl font-black text-lg"
          >
            {isUpdating ? <Loader2 className="animate-spin mr-2" /> : null}
            Save Relays
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CancelRegistrationDialog = ({ 
  handleName, 
  paymentHash,
  onSuccess 
}: { 
  handleName: string; 
  paymentHash: string;
  onSuccess: () => void;
}) => {
  const { user } = useAuthStore();
  const { ndk } = useNDK();
  const { addToast } = useUIStore();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCancel = async () => {
    if (!ndk || !ndk.signer || !user) return;

    setIsDeleting(true);
    try {
      const event = new NDKEvent(ndk);
      event.kind = 4448;
      event.content = `Cancel registration ${paymentHash}`;
      event.tags = [["payment_hash", paymentHash]];
      await event.sign();

      const res = await cancelRegistrationAction(event.rawEvent());

      if (res.success) {
        addToast("Registration cancelled", "success");
        onSuccess();
      } else {
        addToast(res.error || "Failed to cancel", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("An error occurred", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          size="sm"
          variant="ghost"
          className="rounded-xl font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          Cancel
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-black">Cancel Registration?</AlertDialogTitle>
          <AlertDialogDescription className="font-medium">
            Are you sure you want to cancel your registration for <span className="text-primary font-bold">@{handleName}</span>? 
            This will release the handle for others to register.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="rounded-2xl font-bold h-12">No, Keep it</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault();
              handleCancel();
            }}
            disabled={isDeleting}
            className="rounded-2xl font-black h-12 bg-destructive hover:bg-destructive/90 text-white"
          >
            {isDeleting ? <Loader2 className="size-4 animate-spin mr-2" /> : <Trash2 size={16} className="mr-2" />}
            Yes, Cancel
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const TransferHandleDialog = ({ 
  handleName, 
  onSuccess 
}: { 
  handleName: string; 
  onSuccess: () => void;
}) => {

  const { user, accounts } = useAuthStore();
  const { ndk } = useNDK();
  const { addToast } = useUIStore();
  const [targetPubkey, setTargetPubkey] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const otherAccounts = accounts.filter(a => a !== user?.pubkey);

  const handleTransfer = async (pubkeyToUse: string) => {
    if (!ndk || !ndk.signer || !user) return;

    setIsTransferring(true);
    try {
      // 1. Create a signed event for transfer authorization
      const event = new NDKEvent(ndk);
      event.kind = 4444; // Custom kind for handle transfer
      event.content = `Transfer handle ${handleName} to ${pubkeyToUse}`;
      event.tags = [
        ["handle", handleName],
        ["new_pubkey", pubkeyToUse]
      ];

      
      await event.sign();
      const res = await transferHandleAction(event.rawEvent());

      if (res.success) {
        addToast(res.message || "Transfer successful", "success");
        setIsOpen(false);
        onSuccess();
      } else {
        addToast(res.error || "Transfer failed", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("An error occurred during transfer", "error");
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl font-bold border-primary/20 text-primary hover:bg-primary/5">
          Transfer Handle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Transfer Handle</DialogTitle>
          <DialogDescription className="font-medium">
            Move <span className="text-primary font-bold">@{handleName}</span> to a different public key. This action is permanent.
          </DialogDescription>
        </DialogHeader>


        <div className="space-y-6 py-4">
          {otherAccounts.length > 0 && (
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">
                Transfer to your other accounts
              </label>
              <div className="grid gap-2">
                {otherAccounts.map(pk => (
                  <Button
                    key={pk}
                    variant="outline"
                    className="h-14 justify-start gap-3 rounded-2xl border-muted bg-muted/20 hover:bg-primary/5 hover:border-primary/30 transition-all group"
                    onClick={() => handleTransfer(pk)}
                    disabled={isTransferring}
                  >
                    <Avatar pubkey={pk} size={32} />
                    <div className="flex flex-col items-start min-w-0">
                      <span className="text-sm font-bold truncate w-full">{shortenPubkey(pk)}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-black">Click to transfer</span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">
              Transfer to manual Pubkey (Hex)
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="npub... or hex"
                value={targetPubkey}
                onChange={(e) => setTargetPubkey(e.target.value)}
                className="h-12 rounded-xl bg-muted/30 border-none font-mono text-xs"
              />
              <Button 
                onClick={() => {
                  const pk = decodeNip19(targetPubkey).id;
                  if (!/^[0-9a-fA-F]{64}$/.test(pk)) {
                    addToast("Invalid pubkey", "error");
                    return;
                  }
                  handleTransfer(pk);
                }}
                disabled={!targetPubkey || isTransferring}
                className="h-12 px-6 rounded-xl font-black shrink-0"
              >
                Go
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-start">
          <p className="text-[10px] text-muted-foreground italic font-medium">
            You will need to sign this transaction with your current key.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function ManageHandlePage() {
  const { user, isLoggedIn } = useAuthStore();
  const { ndk } = useNDK();
  const { addToast } = useUIStore();
  const router = useRouter();
  const fetch = useAuthenticatedFetch();
  const { profile, refresh: refreshProfile } = useProfile(user?.pubkey);
  const { handles: activeHandles, pendingHandles, loading: statusLoading, refresh: refreshStatus } = useHandleStatus();
  
  const [loading, setLoading] = useState(true);
  const [updatingHandle, setUpdatingHandle] = useState<string | null>(null);

  // Payment Modal State
  const [selectedPending, setSelectedPending] = useState<PendingHandle | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    setLoading(statusLoading);
  }, [statusLoading]);

  const fetchHandleDetails = useCallback(async () => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchHandleDetails();
    } else {
      setLoading(false);
    }
  }, [isLoggedIn, fetchHandleDetails]);

  const handlePaid = (newHandle: string) => {
    setShowPaymentModal(false);
    setSelectedPending(null);
    addToast(`Payment successful! ${newHandle} is now active.`, "success");
    refreshStatus();
    refreshProfile();
  };

  const handleSetPrimary = async (handleName: string) => {
    if (!ndk || !ndk.signer || !user) return;

    try {
      const event = new NDKEvent(ndk);
      event.kind = 4446;
      event.content = `Set ${handleName} as primary handle`;
      event.tags = [["handle", handleName]];
      
      await event.sign();
      const res = await setPrimaryHandleAction(handleName, user.pubkey);

      if (res.success) {
        addToast("Primary handle set successfully", "success");
        refreshStatus();
      } else {
        addToast(res.error || "Failed to set primary", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("An error occurred", "error");
    }
  };

  const handleUpdateProfile = async (handleName: string) => {
    if (!ndk || !ndk.signer) return;
    
    const fullHandle = `${handleName}@tellit.id`;
    setUpdatingHandle(fullHandle);
    try {
      const success = await updateProfileNIP05(ndk, fullHandle);
      if (success) {
        addToast(`Profile updated with ${fullHandle}!`, "success");
        refreshProfile();
      } else {
        addToast("Failed to update profile", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("An error occurred", "error");
    } finally {
      setUpdatingHandle(null);
    }
  };

  const handleRegenerateInvoice = async (hash: string) => {
    if (!ndk || !ndk.signer || !user) return;

    try {
      const event = new NDKEvent(ndk);
      event.kind = 4449;
      event.content = `Regenerate invoice for ${hash}`;
      event.tags = [["payment_hash", hash]];
      await event.sign();

      const res = await fetch("/api/nip05/register", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: event.rawEvent() })
      });

      const data = await res.json();
      if (data.success) {
        addToast("New invoice generated!", "success");
        refreshStatus();
      } else {
        addToast(data.error || "Failed to regenerate", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("An error occurred", "error");
    }
  };

  if (loading && activeHandles.length === 0 && pendingHandles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin size-10 text-primary" />
        <p className="mt-4 text-muted-foreground font-medium">Loading handle details...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center space-y-4">
        <h1 className="text-2xl font-black">Login Required</h1>
        <p className="text-muted-foreground">You need to be logged in to manage your handle.</p>
        <Button onClick={() => router.push("/")} className="rounded-full font-black">
          Go Home
        </Button>
      </div>
    );
  }

  if (activeHandles.length === 0 && pendingHandles.length === 0) return null;

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-32 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.push("/settings")}
          className="rounded-full shrink-0"
        >
          <ChevronLeft className="size-6" />
        </Button>
        <h1 className="text-3xl font-black">Manage Handles</h1>
      </div>

      <div className="grid gap-8">
        {/* Pending Registrations */}
        {pendingHandles.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">
              Pending Registrations
            </h2>
            <div className="grid gap-4">
              {pendingHandles.map((ph) => {
                const isConflict = ph.status === 'conflict';
                
                return (
                  <Card key={ph.payment_hash} className={cn(
                    "border-2 border-dashed overflow-hidden transition-all",
                    isConflict
                      ? "border-orange-500/50 bg-orange-500/5"
                      : ph.isTaken 
                        ? "border-destructive/50 bg-destructive/10 grayscale-[0.5] opacity-80" 
                        : ph.isExpired 
                          ? "border-destructive/30 bg-destructive/5" 
                          : "border-blue-500/30 bg-blue-500/5"
                  )}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle className="text-xl font-black flex items-center gap-2">
                            <Zap className={cn(
                              "size-5 fill-current", 
                              isConflict ? "text-orange-500" : (ph.isTaken || ph.isExpired ? "text-destructive" : "text-blue-500")
                            )} />
                            {ph.name}@tellit.id
                          </CardTitle>
                          <CardDescription className="text-xs font-medium">
                            {isConflict
                              ? "Payment received, but handle was claimed by another user first."
                              : ph.isTaken 
                                ? "This handle has been claimed by someone else." 
                                : ph.isExpired 
                                  ? "Invoice has expired. Regenerate to pay." 
                                  : "Unpaid registration. Secure it before someone else does!"
                            }
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className={cn(
                          isConflict
                            ? "text-orange-500 border-orange-500/20 bg-orange-500/10"
                            : ph.isTaken || ph.isExpired
                              ? "text-destructive border-destructive/20 bg-destructive/10" 
                              : "text-blue-500 border-blue-500/20 bg-blue-500/10"
                        )}>
                          {isConflict ? "Payment Conflict" : (ph.isTaken ? "Already Taken" : ph.isExpired ? "Expired" : "Pending")}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    {isConflict && (
                      <CardContent className="pb-4">
                        <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-[11px] font-bold text-orange-700 dark:text-orange-400 space-y-2">
                          <p>We detected your payment, but someone else completed their payment for this handle slightly earlier.</p>
                          <p>Please contact <span className="underline">support@tellit.id</span> with your payment hash below for a refund or credit:</p>
                          <code className="block p-2 bg-background/50 rounded-lg text-[9px] break-all font-mono opacity-80 select-all">
                            {ph.payment_hash}
                          </code>
                        </div>
                      </CardContent>
                    )}

                    <CardFooter className="pt-0 pb-4 px-6 flex justify-between items-center gap-4">
                      <div className="text-sm font-bold">
                        {ph.amount.toLocaleString()} <span className="text-muted-foreground text-xs text-nowrap">Sats</span>
                      </div>
                      <div className="flex gap-2">
                        {!isConflict && (
                          <CancelRegistrationDialog 
                            handleName={ph.name} 
                            paymentHash={ph.payment_hash} 
                            onSuccess={refreshStatus} 
                          />
                        )}
                        {!ph.isTaken && !isConflict && (
                          <>
                            {ph.isExpired ? (
                              <Button 
                                size="sm"
                                onClick={() => handleRegenerateInvoice(ph.payment_hash)}
                                className="rounded-xl font-black bg-orange-500 hover:bg-orange-600 text-white"
                              >
                                <RefreshCw className="size-3 mr-1" />
                                Regenerate
                              </Button>
                            ) : (
                              <Button 
                                size="sm"
                                onClick={() => {
                                  setSelectedPending(ph);
                                  setShowPaymentModal(true);
                                }}
                                className="rounded-xl font-black bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                              >
                                Pay Now
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Handles */}
        <div className="space-y-4">
          <h2 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">
            Active Handles
          </h2>
          {activeHandles.length > 0 ? (
            <div className="grid gap-6">
              {activeHandles.map((handleDetails) => {
                const fullHandle = `${handleDetails.name}@tellit.id`;
                const isProfileSynced = profile?.nip05 === fullHandle;
                const isUpdating = updatingHandle === fullHandle;

                return (
                  <Card key={fullHandle} className="border-none shadow-xl bg-linear-to-br from-primary/5 to-purple-500/5 overflow-hidden">
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle className="text-2xl font-black flex items-center gap-2">
                            <BadgeCheck className="text-primary size-6" />
                            {fullHandle}
                            {handleDetails.is_primary && (
                              <Star className="size-5 fill-yellow-500 text-yellow-500" />
                            )}
                          </CardTitle>
                          <div className="flex flex-wrap items-center gap-2">
                            <CardDescription className="text-base font-medium">
                              Your premium Tell it! identity
                            </CardDescription>
                            <span className="text-muted-foreground opacity-20">•</span>
                            <RelayEditorDialog 
                              handleName={handleDetails.name} 
                              initialRelays={handleDetails.relays} 
                              onSuccess={refreshStatus} 
                            />
                            <span className="text-muted-foreground opacity-20">•</span>
                            <LightningAddressDialog 
                              handleName={handleDetails.name} 
                              initialAddress={handleDetails.lightning_address} 
                              onSuccess={refreshStatus} 
                            />
                          </div>
                          <div className="mt-2">
                            <HandleIntegrityBadge handle={handleDetails} onFixed={refreshProfile} />
                          </div>
                          {handleDetails.lightning_address && (
                            <p className="text-[10px] font-bold text-orange-500 flex items-center gap-1 mt-1">
                              <Zap size={10} className="fill-current" />
                              Zaps redirected to: {handleDetails.lightning_address}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-6 relative z-10">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                            <Calendar size={12} /> Expiration
                          </p>
                          <p className={cn(
                            "font-bold text-lg",
                            (() => {
                              const expiresAt = new Date(new Date(handleDetails.created_at).setFullYear(new Date(handleDetails.created_at).getFullYear() + 1));
                              const days = Math.ceil((expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                              return days <= 30 ? "text-orange-500" : "";
                            })()
                          )}>
                            {format(new Date(new Date(handleDetails.created_at).setFullYear(new Date(handleDetails.created_at).getFullYear() + 1)), "MMMM d, yyyy")}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                            <Globe size={12} /> Assigned Relays
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {handleDetails.relays.map((relay) => (
                              <Badge key={relay} variant="secondary" className="text-[10px] font-mono lowercase py-0 px-1.5">
                                {relay.replace("wss://", "")}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1 sm:col-span-2">
                          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                            <Share2 size={12} /> Nprofile (Shareable Profile)
                          </p>
                          <p className="font-mono text-xs break-all bg-background/50 p-2 rounded-lg border border-primary/5">
                            {user?.pubkey ? nip19.nprofileEncode({ pubkey: user.pubkey, relays: handleDetails.relays }) : "-"}
                          </p>
                        </div>
                      </div>

                      {!isProfileSynced && (
                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl space-y-3">
                          <p className="text-xs font-bold text-yellow-700 dark:text-yellow-500">
                            This handle is active, but it&apos;s not currently displayed on your Nostr profile metadata.
                          </p>
                          <Button 
                            onClick={() => handleUpdateProfile(handleDetails.name)} 
                            disabled={!!updatingHandle}
                            className="w-full h-12 rounded-xl font-black bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg shadow-yellow-500/20"
                          >
                            {isUpdating ? <Loader2 className="animate-spin mr-2" /> : <RefreshCw className="mr-2 size-4" />}
                            Sync this handle to Profile
                          </Button>
                        </div>
                      )}
                    </CardContent>
                    
                    <CardFooter className="bg-muted/30 border-t border-border/50 p-6">
                      <div className="flex flex-col gap-4 w-full">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground font-medium">Vanity URL</span>
                          <Link 
                            href={`/${handleDetails.name}`} 
                            className="text-primary font-black flex items-center gap-1 hover:underline"
                          >
                            tellit.id/{handleDetails.name}
                            <ExternalLink size={14} />
                          </Link>
                        </div>

                        <div className="flex items-center justify-between gap-4 pt-2 border-t border-border/20">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Status</span>
                            {(() => {
                              const expiresAt = new Date(new Date(handleDetails.created_at).setFullYear(new Date(handleDetails.created_at).getFullYear() + 1));
                              const days = Math.ceil((expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                              if (days <= 0) return <Badge variant="destructive" className="text-[10px]">Expired</Badge>;
                              if (days <= 30) return <Badge variant="outline" className="text-orange-500 border-orange-500/20 bg-orange-500/5 text-[10px]">Expiring Soon ({days}d)</Badge>;
                              return <Badge variant="outline" className="text-green-500 border-green-500/20 bg-green-500/5 text-[10px]">Active</Badge>;
                            })()}
                          </div>
                          <div className="flex gap-2">
                            {!handleDetails.is_primary && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetPrimary(handleDetails.name)}
                                className="rounded-xl font-bold text-muted-foreground hover:text-yellow-500"
                              >
                                Set Primary
                              </Button>
                            )}
                            {(() => {
                              const expiresAt = new Date(new Date(handleDetails.created_at).setFullYear(new Date(handleDetails.created_at).getFullYear() + 1));
                              const days = Math.ceil((expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                              if (days <= 30) return (
                                <Button 
                                  onClick={() => router.push(`/settings/verify?renew=${handleDetails.name}`)}
                                  className="rounded-xl font-black bg-orange-500 hover:bg-orange-600 text-white"
                                >
                                  Renew
                                </Button>
                              );
                              return null;
                            })()}
                            <TransferHandleDialog handleName={handleDetails.name} onSuccess={fetchHandleDetails} />
                          </div>
                        </div>
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center bg-muted/20 rounded-3xl border border-dashed border-muted-foreground/20">
              <p className="text-sm text-muted-foreground font-medium italic">No active handles found.</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-muted/30 rounded-3xl space-y-4">
          <h2 className="font-black text-lg">Identity Controls</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your handles are permanent and linked to your public key. You can register multiple handles and switch which one is displayed on your Nostr profile.
          </p>
          <div className="pt-2">
            <Button 
              onClick={() => router.push("/settings/verify")} 
              className="rounded-xl font-bold bg-primary text-primary-foreground"
            >
              Register Another Handle
            </Button>
          </div>
        </div>
      </div>

      {selectedPending && (
        <LNPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          paymentRequest={selectedPending.payment_request}
          paymentHash={selectedPending.payment_hash}
          amount={selectedPending.amount}
          onPaid={handlePaid}
        />
      )}
    </div>
  );
}
