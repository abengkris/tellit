"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
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
      case 1: return "Short Note";
      case 0: return "Profile Update";
      case 3: return "Follow List";
      case 7: return "Reaction";
      case 6: return "Repost";
      case 10002: return "Relay List";
      default: return `Kind ${kind}`;
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 sm:p-6 pb-32">
        <header className="mb-8">
          <Link 
            href="/settings" 
            className="inline-flex items-center gap-1 text-gray-500 hover:text-blue-500 mb-4 transition-colors"
          >
            <ChevronLeft size={18} />
            <span className="text-sm font-bold">Back to Settings</span>
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-black">Outbox</h1>
            <button 
              onClick={fetchEvents}
              disabled={isLoading}
              className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all ${isLoading ? 'animate-spin' : ''}`}
            >
              <RefreshCw size={20} />
            </button>
          </div>
          <p className="text-gray-500 text-sm mt-2">
            Events that are saved locally but haven&apos;t reached enough relays yet.
          </p>
        </header>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-50 dark:bg-gray-900 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : unpublished.length > 0 ? (
          <div className="space-y-4">
            {unpublished.map((item) => (
              <div 
                key={item.event.id}
                className="bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl">
                      <FileText size={18} />
                    </div>
                    <div>
                      <h3 className="font-black text-sm">{getKindLabel(item.event.kind)}</h3>
                      <p className="text-[10px] font-mono text-gray-400">{item.event.id.slice(0, 16)}...</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      <Clock size={10} />
                      {item.event.created_at ? formatDistanceToNow(item.event.created_at * 1000, { addSuffix: true }) : 'unknown'}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-3 mb-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 break-all italic">
                    {item.event.content || "(No content)"}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => handlePublish(item)}
                    disabled={!!isProcessing}
                    className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isProcessing === item.event.id ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    Publish Now
                  </button>
                  <button 
                    onClick={() => handleDiscard(item.event.id)}
                    disabled={!!isProcessing}
                    className="p-2.5 bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all disabled:opacity-50"
                    title="Discard Event"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-gray-50 dark:bg-gray-900 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-gray-800">
            <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <RefreshCw size={40} className="opacity-50" />
            </div>
            <h2 className="text-xl font-bold mb-2">Queue is clear!</h2>
            <p className="text-gray-500 text-sm max-w-xs mx-auto">
              All your events have been successfully broadcasted to the network.
            </p>
          </div>
        )}

        <div className="mt-12 p-6 bg-yellow-500/5 rounded-3xl border border-yellow-500/10 flex gap-4">
          <AlertCircle className="text-yellow-500 shrink-0" size={24} />
          <div className="space-y-1">
            <h4 className="text-sm font-black text-yellow-700 dark:text-yellow-500 uppercase tracking-wider">Note about Outbox</h4>
            <p className="text-xs text-yellow-600/80 dark:text-yellow-500/60 leading-relaxed">
              Events usually stay here because of temporary connection issues or because specific relays are rejecting them (e.g. anti-spam filters or duplicate detection). 
              If an event fails repeatedly, it might be better to discard it.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
