"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useNDK } from "@/hooks/useNDK";
import { useUIStore } from "@/store/ui";
import { 
  Send, 
  Trash2, 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  FileText,
  ChevronLeft
} from "lucide-react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ExtendedCacheAdapter {
  getUnpublishedEvents?: () => Promise<{ event: NDKEvent; relays?: string[]; lastTryAt?: number }[]>;
  discardUnpublishedEvent?: (eventId: string) => Promise<void>;
}

export default function UnpublishedPage() {
  const { ndk, isReady } = useNDK();
  const { addToast } = useUIStore();
  
  const [unpublished, setUnpublished] = useState<{ event: NDKEvent; relays?: string[]; lastTryAt?: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!ndk?.cacheAdapter) return;
    
    setIsLoading(true);
    try {
      const adapter = ndk.cacheAdapter as ExtendedCacheAdapter;
      if (adapter.getUnpublishedEvents) {
        const events = await adapter.getUnpublishedEvents();
        // Sort by newest first
        setUnpublished([...events].sort((a, b) => (b.event.created_at || 0) - (a.event.created_at || 0)));
      }
    } catch (err) {
      console.error("Failed to fetch unpublished events:", err);
    } finally {
      setIsLoading(false);
    }
  }, [ndk]);

  useEffect(() => {
    if (isReady) fetchEvents();
  }, [isReady, fetchEvents]);

  const handlePublish = async (item: { event: NDKEvent }) => {
    const event = item.event;
    event.ndk = ndk!;
    
    setIsProcessing(event.id);
    try {
      const relays = await event.publish();
      if (relays.size > 0) {
        addToast(`Published to ${relays.size} relays!`, "success");
        // Remove from local list
        setUnpublished(prev => prev.filter(i => i.event.id !== event.id));
      } else {
        addToast("No relays accepted the event. Check console for details.", "error");
      }
    } catch (err) {
      console.error("Manual publish failed:", err);
      const msg = err instanceof Error ? err.message : "Unknown error";
      addToast(`Failed: ${msg}`, "error");
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDiscard = async (eventId: string) => {
    if (!confirm("Are you sure you want to discard this event? It will be deleted from your local outbox.")) return;
    
    const adapter = ndk?.cacheAdapter as ExtendedCacheAdapter;
    if (adapter?.discardUnpublishedEvent) {
      try {
        await adapter.discardUnpublishedEvent(eventId);
        setUnpublished(prev => prev.filter(i => i.event.id !== eventId));
        addToast("Event discarded", "info");
      } catch {
        addToast("Failed to discard event", "error");
      }
    }
  };

  const getKindLabel = (kind?: number) => {
    switch (kind) {
      case 0: return "Profile Update";
      case 1: return "Short Note";
      case 3: return "Follow List";
      case 5: return "Deletion Request";
      case 6: return "Repost";
      case 7: return "Reaction";
      case 16: return "Generic Repost";
      case 1068: return "Poll";
      case 1111: return "Comment";
      case 10002: return "Relay List";
      case 30023: return "Long-form Article";
      case 30030: return "Emoji List";
      case 31923: return "Community";
      default: return `Kind ${kind}`;
    }
  };

  const handlePublishAll = async () => {
    if (!ndk || unpublished.length === 0) return;
    
    setIsProcessing("all");
    let successCount = 0;
    
    for (const item of unpublished) {
      try {
        const event = item.event;
        event.ndk = ndk;
        const relays = await event.publish();
        if (relays.size > 0) successCount++;
      } catch (err) {
        console.error(`Failed to publish event ${item.event.id}:`, err);
      }
    }
    
    if (successCount > 0) {
      addToast(`Successfully published ${successCount} events!`, "success");
      fetchEvents();
    } else {
      addToast("Failed to publish events. Check your connection.", "error");
    }
    setIsProcessing(null);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:p-6 pb-32">
      <header className="mb-10">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-3 text-muted-foreground hover:text-primary gap-1 font-black uppercase tracking-widest text-[10px]">
          <Link href="/settings">
            <ChevronLeft className="size-3.5" aria-hidden="true" />
            <span>Back to Settings</span>
          </Link>
        </Button>
        
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-black tracking-tight">Local Outbox</h1>
          <div className="flex items-center gap-2">
            {unpublished.length > 1 && (
              <Button 
                onClick={handlePublishAll}
                disabled={!!isProcessing}
                size="sm"
                className="rounded-full font-black shadow-lg shadow-primary/20 gap-2"
              >
                {isProcessing === "all" ? <RefreshCw className="size-3.5 animate-spin" aria-hidden="true" /> : <Send className="size-3.5" aria-hidden="true" />}
                <span>Publish All ({unpublished.length})</span>
              </Button>
            )}
            <Button 
              variant="outline"
              size="icon"
              onClick={fetchEvents}
              disabled={isLoading}
              className={cn("rounded-full border-border bg-background shadow-sm", isLoading && "animate-spin")}
              aria-label="Refresh outbox"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground text-sm mt-3 font-medium">
          Events that are saved locally but haven&apos;t reached enough relays yet.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 rounded-3xl bg-muted/50" />
          ))}
        </div>
      ) : unpublished.length > 0 ? (
        <div className="space-y-4">
          {unpublished.map((item) => (
            <Card 
              key={item.event.id}
              className="rounded-3xl border-border bg-background shadow-sm hover:shadow-md transition-all group overflow-hidden"
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 text-primary rounded-2xl">
                      <FileText className="size-5" aria-hidden="true" />
                    </div>
                    <div>
                      <CardTitle className="font-black text-sm uppercase tracking-tight">{getKindLabel(item.event.kind)}</CardTitle>
                      <p className="text-[10px] font-mono text-muted-foreground opacity-70">{item.event.id.slice(0, 16)}…</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="bg-muted text-[9px] font-black uppercase tracking-widest gap-1 py-0.5">
                      <Clock className="size-2.5" aria-hidden="true" />
                      {item.event.created_at ? formatDistanceToNow(item.event.created_at * 1000, { addSuffix: true }) : 'unknown'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-5 pb-4">
                <div className="bg-muted/30 rounded-2xl p-4 border border-border/50">
                  <p className="text-xs text-foreground/70 leading-relaxed line-clamp-3 break-all italic font-medium">
                    {item.event.content || "(No content)"}
                  </p>
                </div>
              </CardContent>

              <CardFooter className="px-5 pb-5 pt-0 flex gap-2">
                <Button 
                  onClick={() => handlePublish(item)}
                  disabled={!!isProcessing}
                  className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-xl text-xs gap-2 transition-all active:scale-95 shadow-lg shadow-primary/10"
                >
                  {isProcessing === item.event.id ? (
                    <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="size-4" aria-hidden="true" />
                  )}
                  Publish Now
                </Button>
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDiscard(item.event.id)}
                  disabled={!!isProcessing}
                  className="size-11 bg-muted/50 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                  aria-label="Discard Event"
                >
                  <Trash2 className="size-5" aria-hidden="true" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-muted/20 rounded-[3rem] border-2 border-dashed border-border/50">
          <div className="size-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <RefreshCw className="size-10 opacity-40" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-black mb-2 tracking-tight">Queue is clear!</h2>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto font-medium">
            All your events have been successfully broadcasted to the network.
          </p>
        </div>
      )}

      <div className="mt-12 p-6 bg-amber-500/5 rounded-3xl border border-amber-500/10 flex gap-4">
        <AlertCircle className="text-amber-500 shrink-0 size-6" aria-hidden="true" />
        <div className="space-y-1.5">
          <h4 className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Note about Outbox</h4>
          <p className="text-xs text-amber-700/70 dark:text-amber-400/60 font-medium leading-relaxed">
            Events usually stay here because of temporary connection issues or because specific relays are rejecting them (e.g. anti-spam filters or duplicate detection). 
            If an event fails repeatedly, it might be better to discard it.
          </p>
        </div>
      </div>
    </div>
  );
}
