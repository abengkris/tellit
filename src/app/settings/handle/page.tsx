"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth";
import { useNDK } from "@/hooks/useNDK";
import { useUIStore } from "@/store/ui";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { BadgeCheck, Loader2, ChevronLeft, Calendar, Globe, RefreshCw, ExternalLink, Share2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateProfileNIP05 } from "@/lib/actions/profile";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { nip19 } from "nostr-tools";
import { cn } from "@/lib/utils";
import { useHandleStatus, PendingHandle } from "@/hooks/useHandleStatus";
import { LNPaymentModal } from "@/components/common/LNPaymentModal";
import { Zap } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { Avatar } from "@/components/common/Avatar";
import { shortenPubkey } from "@/lib/utils/nip19";

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
    if (!ndk || !user) return;

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
      const signedEvent = event.rawEvent();

      // 2. Call the transfer API
      const res = await fetch("/api/nip05/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: signedEvent })
      });

      const data = await res.json();
      if (data.success) {
        addToast(data.message, "success");
        setIsOpen(false);
        onSuccess();
      } else {
        addToast(data.error || "Transfer failed", "error");
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
                  let pk = targetPubkey;
                  if (pk.startsWith('npub')) {
                    try {
                      pk = nip19.decode(pk).data as string;
                    } catch {
                      addToast("Invalid npub", "error");
                      return;
                    }
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

  const handleUpdateProfile = async (handleName: string) => {
    if (!ndk) return;
    
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
              {pendingHandles.map((ph) => (
                <Card key={ph.payment_hash} className="border-2 border-dashed border-blue-500/30 bg-blue-500/5 overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-xl font-black flex items-center gap-2">
                          <Zap className="text-blue-500 size-5 fill-current" />
                          {ph.name}@tellit.id
                        </CardTitle>
                        <CardDescription className="text-xs font-medium">
                          Unpaid registration. Secure it before someone else does!
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="text-blue-500 border-blue-500/20 bg-blue-500/10">
                        Pending
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardFooter className="pt-0 pb-4 px-6 flex justify-between items-center">
                    <div className="text-sm font-bold">
                      {ph.amount.toLocaleString()} <span className="text-muted-foreground text-xs text-nowrap">Sats</span>
                    </div>
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
                  </CardFooter>
                </Card>
              ))}
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
                          </CardTitle>
                          <CardDescription className="text-base font-medium">
                            Your premium Tell it! identity
                          </CardDescription>
                        </div>
                        <Badge variant={isProfileSynced ? "default" : "outline"} className={isProfileSynced ? "bg-green-500 hover:bg-green-600" : ""}>
                          {isProfileSynced ? "Synced to Profile" : "Not Synced"}
                        </Badge>
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
