"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { useNDK } from "@/hooks/useNDK";
import { useUIStore } from "@/store/ui";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { BadgeCheck, Loader2, ChevronLeft, Calendar, Globe, Key, RefreshCw, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateProfileNIP05 } from "@/lib/actions/profile";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface HandleDetails {
  name: string;
  created_at: string;
  relays: string[];
}

export default function ManageHandlePage() {
  const { user, isLoggedIn } = useAuthStore();
  const { ndk } = useNDK();
  const { addToast } = useUIStore();
  const router = useRouter();
  const { profile, refresh: refreshProfile } = useProfile(user?.pubkey);
  
  const [handleDetails, setHandleDetails] = useState<HandleDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  useEffect(() => {
    async function fetchHandleDetails() {
      if (!user) return;
      try {
        const res = await fetch(`/api/nip05/register?pubkey=${user.pubkey}`);
        const data = await res.json();
        if (data.handleDetails) {
          setHandleDetails(data.handleDetails);
        } else {
          // If no handle found, redirect back to verify
          router.replace("/settings/verify");
        }
      } catch (err) {
        console.error("Failed to fetch handle details:", err);
        addToast("Failed to load handle details", "error");
      } finally {
        setLoading(false);
      }
    }

    if (isLoggedIn) {
      fetchHandleDetails();
    } else {
      setLoading(false);
    }
  }, [isLoggedIn, user, router, addToast]);

  const handleUpdateProfile = async () => {
    if (!ndk || !handleDetails) return;
    
    const fullHandle = `${handleDetails.name}@tellit.id`;
    setIsUpdatingProfile(true);
    try {
      const success = await updateProfileNIP05(ndk, fullHandle);
      if (success) {
        addToast("Profile updated with verified handle!", "success");
        refreshProfile();
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

  if (loading) {
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

  if (!handleDetails) return null;

  const fullHandle = `${handleDetails.name}@tellit.id`;
  const isProfileSynced = profile?.nip05 === fullHandle;

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
        <h1 className="text-3xl font-black">Manage Handle</h1>
      </div>

      <div className="grid gap-6">
        <Card className="border-none shadow-xl bg-linear-to-br from-primary/5 to-purple-500/5 overflow-hidden">
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
                  <Calendar size={12} /> Registered On
                </p>
                <p className="font-bold text-lg">
                  {format(new Date(handleDetails.created_at), "MMMM d, yyyy")}
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
                  <Key size={12} /> Public Key
                </p>
                <p className="font-mono text-xs break-all bg-background/50 p-2 rounded-lg border border-primary/5">
                  {user?.pubkey}
                </p>
              </div>
            </div>

            {!isProfileSynced && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl space-y-3">
                <p className="text-xs font-bold text-yellow-700 dark:text-yellow-500">
                  Your handle is active, but it&apos;s not yet displayed on your Nostr profile metadata.
                </p>
                <Button 
                  onClick={handleUpdateProfile} 
                  disabled={isUpdatingProfile}
                  className="w-full h-12 rounded-xl font-black bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg shadow-yellow-500/20"
                >
                  {isUpdatingProfile ? <Loader2 className="animate-spin mr-2" /> : <RefreshCw className="mr-2 size-4" />}
                  Sync to My Profile Now
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
              
              <Separator className="bg-border/50" />
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium">NIP-05 Status</span>
                <Badge variant="outline" className="text-green-500 border-green-500/20 bg-green-500/5">Active</Badge>
              </div>
            </div>
          </CardFooter>
        </Card>

        <div className="p-6 bg-muted/30 rounded-3xl space-y-4">
          <h2 className="font-black text-lg">Identity Controls</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your handle is permanent and linked to your public key. In the future, you will be able to manage relay assignments and transfer your identity to a new key.
          </p>
          <div className="pt-2">
            <Button variant="outline" disabled className="rounded-xl font-bold opacity-50 cursor-not-allowed">
              Transfer Handle (Coming Soon)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
