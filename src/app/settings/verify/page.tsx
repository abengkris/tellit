"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { BadgeCheck, ShieldCheck, Loader2, ChevronLeft, Check, AlertCircle, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { validateUsername } from "@/lib/nip05";
import { useDebounce } from "use-debounce";

export default function VerifyPage() {
  const { user, isLoggedIn } = useAuthStore();
  const { addToast } = useUIStore();
  const router = useRouter();
  
  const [handle, setHandle] = useState("");
  const [debouncedHandle] = useDebounce(handle, 500);
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

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
          relays: ["wss://relay.damus.io", "wss://nos.lol"] // Default relays
        })
      });

      const data = await res.json();
      if (data.success) {
        addToast("Premium NIP-05 registration coming soon with Lightning payments!", "info");
        // In the future, this would show the payment modal
      } else {
        addToast(data.error || "Registration failed", "error");
      }
    } catch {
      addToast("An error occurred", "error");
    } finally {
      setIsRegistering(false);
    }
  };

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
        <h1 className="text-3xl font-black">Get Verified</h1>
      </div>

      <div className="grid gap-6">
        <Card className="border-none shadow-xl bg-linear-to-br from-primary/5 to-purple-500/5 overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <BadgeCheck size={120} className="text-primary" />
          </div>
          
          <CardHeader className="relative z-10">
            <CardTitle className="text-2xl font-black flex items-center gap-2">
              <ShieldCheck className="text-primary size-6" />
              Tell it! Verified
            </CardTitle>
            <CardDescription className="text-base font-medium">
              Get a professional <span className="text-primary font-black">@tellit.id</span> handle and a verified checkmark on your profile.
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
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Premium Benefit</p>
                  <p className="font-bold text-sm">Professional Identity</p>
                  <p className="text-xs text-muted-foreground">Stand out with a short, memorable handle.</p>
                </div>
                <div className="p-4 bg-background/50 rounded-2xl border border-primary/10 space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Premium Benefit</p>
                  <p className="font-bold text-sm">Global Discovery</p>
                  <p className="text-xs text-muted-foreground">Easily found across all Nostr clients.</p>
                </div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="bg-primary/5 border-t border-primary/10 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between w-full">
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">One-time payment</p>
                <div className="flex items-center gap-1">
                  <Zap className="text-yellow-500 size-5 fill-current" />
                  <span className="text-2xl font-black">21,000</span>
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
                Get Verified Now
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
              <p className="font-bold text-sm">Why 21,000 Sats?</p>
              <p className="text-xs text-muted-foreground">This helps prevent squatting and supports the development of the Tell it! platform.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
