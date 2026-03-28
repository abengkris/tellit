"use client";

import React, { useEffect, useState } from "react";
import { useNDK } from "@/hooks/useNDK";
import { useAuthStore } from "@/store/auth";
import { fetchDraftWraps, deleteDraftWrap } from "@/lib/actions/drafts";
import { Loader2, Cloud, Trash2, Calendar, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { type NostrEvent } from "@nostrify/types";
import { type NDKEvent, type NDKUser } from "@nostr-dev-kit/ndk";

interface DraftsModalProps {
  onSelect: (draft: Partial<NostrEvent>) => void;
  onClose: () => void;
}

export function DraftsModal({ onSelect, onClose }: DraftsModalProps) {
  const { ndk } = useNDK();
  const { user } = useAuthStore();
  const [drafts, setDrafts] = useState<{ wrap: NDKEvent; draft: Partial<NostrEvent> }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!ndk || !user) return;
      try {
        const results = await fetchDraftWraps(ndk, user as unknown as NDKUser, 30023);
        setDrafts(results as { wrap: NDKEvent; draft: Partial<NostrEvent> }[]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [ndk, user]);

  const handleDelete = async (e: React.MouseEvent, identifier: string) => {
    e.stopPropagation();
    if (!ndk || !confirm("Delete this draft?")) return;
    
    try {
      await deleteDraftWrap(ndk, identifier);
      setDrafts(prev => prev.filter(d => d.wrap.tags.find((t: string[]) => t[0] === 'd')?.[1] !== identifier));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-950 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
              <Cloud size={20} />
            </div>
            <h2 className="text-xl font-black">Cloud Drafts</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <ScrollArea className="flex-1 p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-purple-500" size={32} />
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Fetching from relays...</p>
            </div>
          ) : drafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-10">
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-full text-gray-300">
                <FileText size={48} />
              </div>
              <p className="text-gray-500 font-medium">No cloud drafts found for Kind 30023.</p>
            </div>
          ) : (
            <div className="space-y-3 pb-6">
              {drafts.map((item, i) => {
                const identifier = item.wrap.tags.find((t: string[]) => t[0] === 'd')?.[1];
                const title = item.draft.tags?.find((t: string[]) => t[0] === 'title')?.[1] || "Untitled Article";
                const created_at = item.wrap.created_at || Math.floor(Date.now() / 1000);
                const date = new Date(created_at * 1000);

                return (
                  <div 
                    key={i}
                    onClick={() => onSelect(item.draft)}
                    className="group relative bg-gray-50 dark:bg-gray-900 hover:bg-purple-50 dark:hover:bg-purple-900/10 border border-gray-100 dark:border-gray-800 hover:border-purple-200 dark:hover:border-purple-800/50 p-4 rounded-2xl cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <div className="flex flex-col gap-1 pr-10">
                      <h3 className="font-black text-lg line-clamp-1">{title}</h3>
                      <div className="flex items-center gap-3 text-xs text-gray-400 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDistanceToNow(date)} ago
                        </span>
                        <span>•</span>
                        <span>{item.draft.content?.length || 0} chars</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => identifier && handleDelete(e, identifier)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
          <Button onClick={onClose} className="w-full rounded-2xl font-black h-12">Close</Button>
        </div>
      </div>
    </div>
  );
}
