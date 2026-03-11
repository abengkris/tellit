"use client";

import React from "react";
import { Server, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useRelayStatus } from "@/hooks/useRelayStatus";
import { NDKRelayStatus } from "@nostr-dev-kit/ndk";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface RelayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const getStatusColor = (status: NDKRelayStatus) => {
  switch (status) {
    case NDKRelayStatus.CONNECTED:
      return "text-green-500";
    case NDKRelayStatus.CONNECTING:
      return "text-yellow-500";
    case NDKRelayStatus.DISCONNECTED:
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
};

const getStatusLabel = (status: NDKRelayStatus) => {
  switch (status) {
    case NDKRelayStatus.CONNECTED:
      return "Connected";
    case NDKRelayStatus.CONNECTING:
      return "Connecting";
    case NDKRelayStatus.DISCONNECTED:
      return "Disconnected";
    default:
      return "Unknown";
  }
};

const getLatencyColor = (ms: number) => {
  if (ms < 200) return "text-green-500";
  if (ms < 500) return "text-yellow-500";
  return "text-destructive";
};

export const RelayModal: React.FC<RelayModalProps> = ({ isOpen, onClose }) => {
  const { relays } = useRelayStatus();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-0 gap-0 sm:max-w-md max-h-[80vh] flex flex-col overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-primary font-black">
            <Server className="size-5" />
            Network Status
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-4">
            <div className="p-4 bg-primary/10 rounded-2xl text-xs text-primary font-medium leading-relaxed border border-primary/20">
              <p className="font-black mb-1 uppercase tracking-wider">User Sovereignty & Transparency</p>
              Nostr is a decentralized protocol. Your data is stored across multiple independent servers (relays). Tell it! connects to these relays to fetch and publish your content.
            </div>

            <div className="space-y-2">
              {relays.map((relay) => (
                <div 
                  key={relay.url} 
                  className="flex items-center justify-between p-3 rounded-2xl border bg-muted/30"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold truncate pr-4">{relay.url}</span>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[10px] font-black uppercase tracking-wider", getStatusColor(relay.status))}>
                        {getStatusLabel(relay.status)}
                      </span>
                      {relay.status === NDKRelayStatus.CONNECTED && relay.latency !== undefined && (
                        <span className={cn("text-[10px] font-mono", getLatencyColor(relay.latency))}>
                          {Math.round(relay.latency)}ms
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {relay.status === NDKRelayStatus.CONNECTED ? (
                      <Wifi size={16} className={getLatencyColor(relay.latency || 0)} />
                    ) : (
                      <WifiOff size={16} className="text-destructive" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        <div className="p-6 border-t shrink-0">
          <Button
            variant="outline"
            className="w-full font-black h-12 rounded-xl"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="size-4" />
            Reconnect All
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
