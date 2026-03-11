"use client";

import React from "react";
import { useAuthStore } from "@/store/auth";
import { useProfile } from "@/hooks/useProfile";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function ProfileSettingsPage() {
  const { user, isLoggedIn } = useAuthStore();
  const { profile, loading } = useProfile(user?.pubkey);
  const router = useRouter();

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center space-y-4">
        <h1 className="text-2xl font-black">Login Required</h1>
        <p className="text-muted-foreground">You need to be logged in to edit your profile.</p>
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
        <h1 className="text-3xl font-black">Edit Profile</h1>
      </div>

      {loading && !profile ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin size-10 text-primary" />
          <p className="text-muted-foreground font-medium">Fetching profile from relays...</p>
        </div>
      ) : (
        <ProfileEditor 
          currentProfile={profile} 
          onSuccess={() => router.back()}
          onCancel={() => router.back()}
        />
      )}
    </div>
  );
}
