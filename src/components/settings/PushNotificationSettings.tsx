"use client";

import React, { useState } from "react";
import { Bell, Loader2, ShieldCheck, ShieldAlert } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useUIStore } from "@/store/ui";
import { cn } from "@/lib/utils";

export function PushNotificationSettings() {
  const { subscription, permission, loading, subscribe, unsubscribe } = usePushNotifications();
  const { addToast } = useUIStore();
  const [toggling, setToggling] = useState(false);

  const isSubscribed = !!subscription;

  const handleToggle = async (enabled: boolean) => {
    setToggling(true);
    try {
      if (enabled) {
        await subscribe();
        addToast("Push notifications enabled!", "success");
      } else {
        await unsubscribe();
        addToast("Push notifications disabled", "info");
      }
    } catch (err) {
      console.error(err);
      addToast("Failed to update push settings", "error");
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <Card className="rounded-3xl border-none bg-muted/30 shadow-none">
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="animate-spin text-muted-foreground" size={20} />
        </CardContent>
      </Card>
    );
  }

  const isBlocked = permission === "denied";

  return (
    <Card className={cn(
      "rounded-3xl border-none bg-muted/30 shadow-none",
      isBlocked && "ring-1 ring-destructive/50"
    )}>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <div className={cn(
            "p-3 rounded-2xl shrink-0",
            isSubscribed ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            <Bell size={20} />
          </div>
          <div className="min-w-0">
            <div className="font-black truncate flex items-center gap-2">
              Push Notifications
              {isSubscribed && <ShieldCheck size={14} className="text-green-500" />}
              {isBlocked && <ShieldAlert size={14} className="text-destructive" />}
            </div>
            <div className="text-xs text-muted-foreground font-medium truncate">
              {isBlocked 
                ? "Blocked by browser settings" 
                : isSubscribed 
                  ? "You will receive real-time alerts" 
                  : "Get notified even when app is closed"
              }
            </div>
          </div>
        </div>
        <Switch
          checked={isSubscribed}
          onCheckedChange={handleToggle}
          disabled={toggling || isBlocked}
        />
      </CardContent>
      {isBlocked && (
        <div className="px-4 pb-4 text-[10px] text-destructive font-black uppercase tracking-tight text-center">
          ⚠️ Permission denied. Reset browser notification settings to enable.
        </div>
      )}
    </Card>
  );
}
