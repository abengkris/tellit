"use client";

import React, { useState } from "react";
import { useNDK } from "@/hooks/useNDK";
import { useAuthStore } from "@/store/auth";
import { NDKEvent, NDKTag } from "@nostr-dev-kit/ndk";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck, Share2, AlertTriangle } from "lucide-react";
import { useUIStore } from "@/store/ui";
import { ENV } from "@/lib/env";

// Authorized pubkeys for publishing app metadata from environment variable
const AUTHORIZED_PUBKEYS = (ENV.ADMIN_PUBKEYS || "")
  .split(",")
  .map((pk) => pk.trim())
  .filter(Boolean);

// Fallback hardcoded defaults if environment is empty
if (AUTHORIZED_PUBKEYS.length === 0) {
  AUTHORIZED_PUBKEYS.push(
    "5e7ff05d59cb6808762cf1ed5a69ae2a21b8457056652fdc42970d36fc5c31d0",
    "07907690ce3fec30fb2089eb5a61c147548c244ba85605e713d7991cd4e015f6"
  );
}

const APP_IDENTIFIER = "tell-it-web";

export default function AppHandlerAdminPage() {
  const { ndk, isReady } = useNDK();
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const isAuthorized = user && AUTHORIZED_PUBKEYS.includes(user.pubkey);

  const publishAppHandler = async () => {
    if (!ndk || !isReady || !user) return;

    setLoading(true);
    try {
      const event = new NDKEvent(ndk);
      event.kind = 31990;
      
      // NIP-89 Tags
      const tags: NDKTag[] = [
        ["d", APP_IDENTIFIER],
        ["k", "1"],      // Supports Short Notes
        ["k", "30023"],  // Supports Articles
        ["k", "1068"],   // Supports Polls
        ["k", "1111"],   // Supports Comments
        ["web", "https://tellit.id/post/<bech32>", "nevent"],
        ["web", "https://tellit.id/article/<bech32>", "naddr"],
        ["web", "https://tellit.id/<bech32>", "nprofile"]
      ];

      event.tags = tags;
      
      // App Metadata in content (JSON stringified)
      event.content = JSON.stringify({
        name: "Tell it!",
        about: "Whatever it is, just Tell It. A modern, decentralized microblogging platform built on Nostr.",
        picture: "https://tellit.id/favicon.ico", // Replace with high-res logo later
        website: "https://tellit.id",
        lud16: "hello@tellit.id"
      });

      console.log("[Admin] Publishing NIP-89 App Handler...", event.rawEvent());
      
      await event.sign();
      await event.publish();
      
      setSuccess(true);
      addToast("Tell it! App Handler published successfully!", "success");
    } catch (err) {
      console.error("[Admin] Failed to publish app handler:", err);
      addToast("Failed to publish metadata. See console.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isReady) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 text-center space-y-4">
        <div className="size-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={32} />
        </div>
        <h1 className="text-2xl font-black">Unauthorized</h1>
        <p className="text-muted-foreground">
          This admin tool is restricted to the official Tell it! developers.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 py-12 space-y-8">
      <Card className="border-2 border-primary/20 shadow-xl overflow-hidden rounded-3xl">
        <CardHeader className="bg-primary/5 pb-8">
          <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs mb-2">
            <ShieldCheck size={16} />
            Developer Admin
          </div>
          <CardTitle className="text-3xl font-black">NIP-89 App Handler</CardTitle>
          <CardDescription className="text-base font-medium">
            Publish or update the official metadata for **Tell it!** across the Nostr ecosystem.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-8 space-y-6">
          <div className="bg-muted/50 p-6 rounded-2xl border border-border/50">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Share2 size={18} className="text-primary" />
              What will be published?
            </h3>
            <ul className="space-y-3 text-sm font-medium">
              <li className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-bold">Tell it!</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Identifier (d-tag):</span>
                <span className="font-mono text-xs">{APP_IDENTIFIER}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Website:</span>
                <span className="text-primary underline">https://tellit.id</span>
              </li>
              <li className="flex justify-between border-t border-border/50 pt-2">
                <span className="text-muted-foreground">Supported Kinds:</span>
                <span className="font-mono text-[10px]">1, 30023, 1068, 1111</span>
              </li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground italic leading-relaxed">
            Note: Publishing this Kind 31990 event will allow other clients to identify and link to Tell it! when they encounter your client tag on events. This is a one-time operation per update.
          </p>
        </CardContent>

        <CardFooter className="pb-8 flex flex-col gap-4">
          <Button 
            onClick={publishAppHandler} 
            disabled={loading || success}
            className="w-full h-14 rounded-2xl font-black text-lg shadow-lg shadow-primary/20"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin" size={20} />
                Publishing…
              </span>
            ) : success ? (
              "Metadata Published!"
            ) : (
              "Publish Official Metadata"
            )}
          </Button>
          
          {success && (
            <p className="text-center text-sm font-bold text-green-500 animate-in fade-in slide-in-from-bottom-2">
              Verification event sent to relays. It may take a few minutes to propagate.
            </p>
          )}
        </CardFooter>
      </Card>

      <div className="text-center">
        <p className="text-xs text-muted-foreground font-mono">
          Admin Pubkey: {user?.pubkey.slice(0, 8)}…{user?.pubkey.slice(-8)}
        </p>
      </div>
    </div>
  );
}
