"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { useNDK } from "@/hooks/useNDK";
import { useUIStore } from "@/store/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { BadgeCheck, Loader2, ChevronLeft, Check, AlertCircle, Zap, RefreshCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { validateUsername } from "@/lib/nip05";
import { useDebounce } from "use-debounce";
import { updateProfileNIP05 } from "@/lib/actions/profile";
import { LNPaymentModal } from "@/components/common/LNPaymentModal";
import { useRelayList } from "@/hooks/useRelayList";

export default function VerifyPage() {
  const { user, isLoggedIn } = useAuthStore();
  const { ndk } = useNDK();
  const { addToast } = useUIStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const renewHandle = searchParams.get("renew");
  const { relays: userRelays } = useRelayList(user?.pubkey);
  
  const [handle, setHandle] = useState(renewHandle || "");
  const [debouncedHandle] = useDebounce(handle, 500);
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registeredHandle, setRegisteredHandle] = useState<string | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [hasHandles, setHasHandles] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Payment state
  const [paymentData, setPaymentData] = useState<{ pr: string; hash: string; amount: number } | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Check if user already has a handle on mount
  useEffect(() => {
    async function checkExistingHandle() {
      if (!user) return;
      try {
        const res = await fetch(`/api/nip05/register?pubkey=${user.pubkey}`);
        const data = await res.json();
        if (data.handles && data.handles.length > 0) {
          setHasHandles(true);
        }
      } catch (err) {
        console.error("Failed to check existing handle:", err);
      } finally {
        setIsInitialLoading(false);
      }
    }

    if (isLoggedIn) {
      checkExistingHandle();
    } else {
      setIsInitialLoading(false);
    }
  }, [isLoggedIn, user]);

  useEffect(() => {
    if (!debouncedHandle) {
      setIsAvailable(null);
      setError(null);
      return;
    }

    const validation = validateUsername(debouncedHandle);
    if (!validation.valid) {
      setError(validation.error || "Invalid handle");
      setIsAvailable(false);
      return;
    }

    setError(null);
    checkAvailability(debouncedHandle);
  }, [debouncedHandle]);

  const checkAvailability = async (name: string) => {
    setIsChecking(true);
    try {
      const res = await fetch(`/api/nip05/register?name=${name}`);
      const data = await res.json();
      setIsAvailable(data.available);
      setPrice(data.price);
      if (data.error) setError(data.error);
    } catch (err) {
      console.error(err);
    } finally {
      setIsChecking(false);
    }
  };

  const handleRegister = async () => {
    if (!isAvailable || !user) return;

    setIsRegistering(true);
    try {
      const res = await fetch("/api/nip05/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: handle,
          pubkey: user.pubkey,
          relays: userRelays.length > 0 ? userRelays.map(r => r.url) : ["wss://relay.damus.io", "wss://nos.lol"] 
        })
      });

      const data = await res.json();
      if (data.success) {
        setPaymentData({
          pr: data.paymentRequest,
          hash: data.paymentHash,
          amount: data.amount
        });
        setShowPaymentModal(true);
      } else {
        addToast(data.error || "Registration failed", "error");
      }
    } catch {
      addToast("An error occurred", "error");
    } finally {
      setIsRegistering(false);
    }
  };

  const handlePaid = (newHandle: string) => {
    setShowPaymentModal(false);
    setRegisteredHandle(newHandle);
    addToast("Payment successful! Your handle is active.", "success");
  };

  const handleUpdateProfile = async () => {
    if (!ndk || !registeredHandle) return;
    
    setIsUpdatingProfile(true);
    try {
      const success = await updateProfileNIP05(ndk, registeredHandle);
      if (success) {
        addToast("Profile updated with verified handle!", "success");
        router.push(`/${user?.npub}`);
      } else {
        addToast("Failed to update profile", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("An error occurred", "error");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin size-10 text-primary" />
        <p className="mt-4 text-muted-foreground font-medium">Checking verification status...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center space-y-4">
        <h1 className="text-2xl font-black">Login Required</h1>
        <p className="text-muted-foreground">You need to be logged in to verify your account.</p>
        <Button onClick={() => router.push("/")} className="rounded-full font-black">
          Go Home
        </Button>
      </div>
    );
  }

  if (registeredHandle) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-32 space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col items-center text-center space-y-6 pt-10">
          <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <BadgeCheck size={64} fill="currentColor" className="text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black italic">You are Verified!</h1>
            <p className="text-xl font-bold text-muted-foreground">
              Your new handle: <span className="text-primary">{registeredHandle}</span>
            </p>
          </div>
          
          <Card className="w-full max-w-md border-none shadow-lg bg-muted/30">
            <CardContent className="p-6 space-y-4">
              <p className="text-sm font-medium">
                Do you want to automatically add this handle to your Nostr profile?
              </p>
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={handleUpdateProfile} 
                  disabled={isUpdatingProfile}
                  className="h-14 rounded-2xl font-black text-lg shadow-lg"
                >
                  {isUpdatingProfile ? <Loader2 className="animate-spin mr-2" /> : <RefreshCw className="mr-2 size-5" />}
                  Update My Profile
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => router.push(`/${user?.npub}`)}
                  className="h-12 rounded-2xl font-bold text-muted-foreground"
                >
                  I&apos;ll do it later
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-32 space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()}
          className="rounded-full shrink-0"
        >
          <ChevronLeft className="size-6" />
        </Button>
        <h1 className="text-3xl font-black">{renewHandle ? "Renew Handle" : "Get Verified"}</h1>
      </div>

      <div className="grid gap-6">
        {hasHandles && (
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between animate-in slide-in-from-top duration-500">
            <div className="flex items-center gap-3 text-primary">
              <BadgeCheck className="size-5" />
              <p className="text-sm font-bold">You already have registered handles.</p>
            </div>
            <Button 
              variant="link" 
              onClick={() => router.push("/settings/handle")}
              className="font-black text-primary p-0 h-auto hover:no-underline"
            >
              Manage them →
            </Button>
          </div>
        )}

        <Card className="border-none shadow-xl bg-linear-to-br from-primary/5 to-purple-500/5 overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <BadgeCheck size={120} className="text-primary" />
          </div>
          
          <CardHeader className="relative z-10">
            <CardTitle className="text-2xl font-black flex items-center gap-2">
              <BadgeCheck className="text-primary size-6" />
              {renewHandle ? `Renew @${renewHandle}` : "Tell it! Verified"}
            </CardTitle>
            <CardDescription className="text-base font-medium">
              {renewHandle 
                ? "Extend your handle ownership for another year."
                : <>Get a professional <span className="text-primary font-black">@tellit.id</span> handle and a verified checkmark on your profile.</>
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 relative z-10">
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">Choose your handle</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="username"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value.toLowerCase())}
                      className="h-14 text-xl font-black rounded-2xl border-none bg-background shadow-inner pr-12"
                    />
                    <div className="absolute right-4 top-4">
                      {isChecking ? (
                        <Loader2 className="animate-spin text-muted-foreground size-6" />
                      ) : isAvailable === true ? (
                        <Check className="text-green-500 size-6" />
                      ) : isAvailable === false ? (
                        <AlertCircle className="text-destructive size-6" />
                      ) : null}
                    </div>
                  </div>
                  <div className="text-xl font-black text-muted-foreground">@tellit.id</div>
                </div>
                {error && <p className="text-destructive text-xs font-bold ml-1">{error}</p>}
                {isAvailable === true && !error && (
                  <p className="text-green-500 text-xs font-bold ml-1">Boom! This handle is available.</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-background/50 rounded-2xl border border-primary/10 space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Pricing Tiers</p>
                  <p className="font-bold text-sm text-primary">Standard (4+ chars)</p>
                  <p className="text-xs text-muted-foreground">10,000 Sats / year</p>
                </div>
                <div className="p-4 bg-background/50 rounded-2xl border border-primary/10 space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Pricing Tiers</p>
                  <p className="font-bold text-sm text-purple-500">Premium (2-3 chars)</p>
                  <p className="text-xs text-muted-foreground">50,000 Sats / year</p>
                </div>
                <div className="p-4 bg-background/50 rounded-2xl border border-primary/10 space-y-1 sm:col-span-2">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Pricing Tiers</p>
                  <p className="font-bold text-sm text-yellow-500">Ultra (1 char & Reserved)</p>
                  <p className="text-xs text-muted-foreground">100,000 Sats / year</p>
                </div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="bg-primary/5 border-t border-primary/10 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between w-full">
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Yearly payment</p>
                <div className="flex items-center gap-1">
                  <Zap className="text-yellow-500 size-5 fill-current" />
                  <span className="text-2xl font-black">{price ? price.toLocaleString() : "---"}</span>
                  <span className="text-sm font-bold text-muted-foreground">Sats</span>
                </div>
              </div>
              <Button
                size="lg"
                disabled={!isAvailable || !!error || isRegistering}
                onClick={handleRegister}
                className="rounded-2xl h-14 px-8 font-black text-lg shadow-lg shadow-primary/20"
              >
                {isRegistering ? <Loader2 className="animate-spin mr-2" /> : null}
                {renewHandle ? "Renew Now" : "Get Verified Now"}
              </Button>
            </div>
            <p className="text-[10px] text-center text-muted-foreground font-medium italic">
              Verification is linked to your current public key. Non-refundable.
            </p>
          </CardFooter>
        </Card>

        <div className="p-6 bg-muted/30 rounded-3xl space-y-4">
          <h2 className="font-black text-lg">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div>
              <p className="font-bold text-sm">What is NIP-05?</p>
              <p className="text-xs text-muted-foreground">It&apos;s a standard that allows Nostr users to map their public keys to a human-readable identifier, similar to an email address.</p>
            </div>
            <div>
              <p className="font-bold text-sm">How long does verification last?</p>
              <p className="text-xs text-muted-foreground">Verification is active for one year. You will need to renew it annually to maintain ownership of your handle.</p>
            </div>
            <div>
              <p className="font-bold text-sm">Why the tiered pricing?</p>
              <p className="text-xs text-muted-foreground">Short handles and common words are highly desirable. Tiered pricing helps ensure fair access and prevents mass squatting of premium identities.</p>
            </div>
          </div>
        </div>
      </div>

      {paymentData && (
        <LNPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          paymentRequest={paymentData.pr}
          paymentHash={paymentData.hash}
          amount={paymentData.amount}
          onPaid={handlePaid}
        />
      )}
    </div>
  );
}
