"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { useNDK } from "@/hooks/useNDK";
import { useUIStore } from "@/store/ui";
import { useRelayList, RelayMetadata } from "@/hooks/useRelayList";
import { useRelayStatus } from "@/hooks/useRelayStatus";
import { updateRelayList } from "@/lib/actions/relays";
import { 
  Globe, 
  Plus, 
  Trash2, 
  RefreshCcw, 
  ShieldCheck, 
  Activity, 
  Server,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  Wifi,
  WifiOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { NDKRelayStatus } from "@nostr-dev-kit/ndk";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function RelaysPage() {
  const { user, isLoggedIn } = useAuthStore();
  const { ndk, isReady } = useNDK();
  const { addToast } = useUIStore();
  
  const { relays: savedRelays, loading: loadingRelays } = useRelayList(user?.pubkey);
  const { relays: currentStatus, connectedCount } = useRelayStatus();
  
  const [localRelays, setLocalRelays] = useState<RelayMetadata[]>([]);
  const [newRelayUrl, setNewRelayUrl] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Initialize local state from saved relays
  useEffect(() => {
    if (savedRelays.length > 0) {
      setLocalRelays(savedRelays);
    }
  }, [savedRelays]);

  const handleAddRelay = () => {
    let url = newRelayUrl.trim();
    if (!url) return;

    if (!url.startsWith("ws://") && !url.startsWith("wss://")) {
      url = "wss://" + url;
    }

    try {
      new URL(url);
    } catch {
      addToast("Invalid relay URL", "error");
      return;
    }

    if (localRelays.some(r => r.url === url)) {
      addToast("Relay already in list", "error");
      return;
    }

    setLocalRelays([...localRelays, { url, read: true, write: true }]);
    setNewRelayUrl("");
  };

  const handleRemoveRelay = (url: string) => {
    setLocalRelays(localRelays.filter(r => r.url !== url));
  };

  const handleToggleRead = (url: string) => {
    setLocalRelays(localRelays.map(r => 
      r.url === url ? { ...r, read: !r.read } : r
    ));
  };

  const handleToggleWrite = (url: string) => {
    setLocalRelays(localRelays.map(r => 
      r.url === url ? { ...r, write: !r.write } : r
    ));
  };

  const handleSave = async () => {
    if (!ndk) return;
    
    setIsUpdating(true);
    try {
      const success = await updateRelayList(ndk, localRelays);
      if (success) {
        addToast("Relay list updated on the network", "success");
      } else {
        addToast("Failed to update relay list", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("An error occurred while saving", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusIcon = (url: string) => {
    const status = currentStatus.find(s => s.url === url)?.status;
    
    switch (status) {
      case NDKRelayStatus.CONNECTED:
        return <div className="size-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />;
      case NDKRelayStatus.CONNECTING:
        return <div className="size-2 rounded-full bg-yellow-500 animate-pulse" />;
      case NDKRelayStatus.DISCONNECTED:
      case NDKRelayStatus.DISCONNECTING:
        return <div className="size-2 rounded-full bg-red-500" />;
      default:
        return <div className="size-2 rounded-full bg-gray-300" />;
    }
  };

  const getStatusText = (url: string) => {
    const status = currentStatus.find(s => s.url === url)?.status;
    switch (status) {
      case NDKRelayStatus.CONNECTED: return "Connected";
      case NDKRelayStatus.CONNECTING: return "Connecting";
      case NDKRelayStatus.DISCONNECTED: return "Disconnected";
      default: return "Offline";
    }
  };

  if (!isLoggedIn) return null;

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-32 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/settings">
            <ChevronLeft size={24} />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-black tracking-tight">Relays</h1>
          <p className="text-muted-foreground font-medium text-sm">Manage where your data is stored and fetched from.</p>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="rounded-3xl border-none bg-muted/30 shadow-none">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-2">
            <div className="p-3 bg-green-500/10 text-green-600 rounded-2xl">
              <Wifi size={24} />
            </div>
            <div>
              <div className="text-2xl font-black">{connectedCount}</div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Connected</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-3xl border-none bg-muted/30 shadow-none">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-2">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
              <Server size={24} />
            </div>
            <div>
              <div className="text-2xl font-black">{localRelays.length}</div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">In List</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add New Relay */}
      <Card className="rounded-3xl border-none bg-primary/5 shadow-none overflow-hidden">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Plus className="text-primary size-5" />
            <h2 className="font-black uppercase text-xs tracking-widest text-primary">Add New Relay</h2>
          </div>
          <div className="flex gap-2">
            <Input 
              placeholder="wss://relay.damus.io" 
              value={newRelayUrl}
              onChange={(e) => setNewRelayUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddRelay()}
              className="h-12 rounded-2xl border-none bg-background shadow-inner font-mono text-sm"
            />
            <Button 
              onClick={handleAddRelay}
              className="h-12 rounded-2xl px-6 font-black shadow-lg shadow-primary/20"
            >
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Relay List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Activity size={14} /> My Relay List (NIP-65)
          </h2>
          {loadingRelays && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
        </div>

        <div className="space-y-3">
          {localRelays.length === 0 && !loadingRelays && (
            <div className="text-center py-12 bg-muted/20 rounded-3xl border-2 border-dashed border-muted">
              <p className="text-sm font-medium text-muted-foreground">No relays in your list yet.</p>
            </div>
          )}

          {localRelays.map((relay) => (
            <Card key={relay.url} className="rounded-3xl border-none bg-muted/30 shadow-none hover:bg-muted/40 transition-colors">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="size-10 rounded-2xl bg-background flex items-center justify-center shrink-0 shadow-sm">
                    {getStatusIcon(relay.url)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate">{relay.url.replace("wss://", "").replace("ws://", "")}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      {getStatusText(relay.url)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 shrink-0">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground">Read</span>
                    <Switch 
                      checked={relay.read} 
                      onCheckedChange={() => handleToggleRead(relay.url)}
                      className="scale-75"
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground">Write</span>
                    <Switch 
                      checked={relay.write} 
                      onCheckedChange={() => handleToggleWrite(relay.url)}
                      className="scale-75"
                    />
                  </div>
                  <Separator orientation="vertical" className="h-8 bg-background/50" />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleRemoveRelay(relay.url)}
                    className="rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Action Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent z-20 pointer-events-none">
        <div className="max-w-2xl mx-auto pointer-events-auto">
          <Button 
            onClick={handleSave} 
            disabled={isUpdating || loadingRelays}
            className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/30 gap-2"
          >
            {isUpdating ? <Loader2 size={20} className="animate-spin" /> : <ShieldCheck size={20} />}
            {isUpdating ? "Publishing Changes..." : "Save Relay List"}
          </Button>
          <p className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-3">
            Your relay list will be published to the Nostr network (Kind 10002)
          </p>
        </div>
      </div>
    </div>
  );
}
