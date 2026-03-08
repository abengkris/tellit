"use client";

import React from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { X } from "lucide-react";
import { PostComposer } from "../PostComposer";
import { shortenPubkey } from "@/lib/utils/nip19";
import { useProfile } from "@/hooks/useProfile";
import { PostContentRenderer } from "./PostContent";
import Image from "next/image";

interface QuoteModalProps {
  event: NDKEvent;
  onClose: () => void;
}

export const QuoteModal: React.FC<QuoteModalProps> = ({ event, onClose }) => {
  const { profile } = useProfile(event.pubkey);
  
  const display_name = profile?.display_name || profile?.name || shortenPubkey(event.pubkey);
  const avatar = profile?.picture || `https://robohash.org/${event.pubkey}?set=set1`;
  const isArticle = event.kind === 30023;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div 
        className="bg-white dark:bg-black w-full max-w-xl rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-900">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          <span className="font-bold text-lg">Quote</span>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Composer */}
        <div className="border-b border-gray-100 dark:border-gray-900 pb-2">
          <PostComposer 
            quoteEvent={event} 
            onSuccess={onClose} 
            autoFocus={true}
            placeholder="Add a comment..."
          />
        </div>

        {/* Quoted Post Preview */}
        <div className="p-6">
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden bg-gray-50/50 dark:bg-gray-900/30">
            <div className="p-4 flex gap-3">
              <div className="relative w-6 h-6 rounded-full overflow-hidden bg-gray-200 shrink-0">
                <Image 
                  src={avatar} 
                  alt={display_name} 
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-1 text-sm">
                  <span className="font-bold truncate">{display_name}</span>
                  <span className="text-gray-500 truncate">@{shortenPubkey(event.pubkey)}</span>
                </div>
                <div className="text-gray-600 dark:text-gray-300 text-sm line-clamp-4 overflow-hidden">
                  <PostContentRenderer 
                    content={event.content} 
                    event={event} 
                    renderMedia={false} 
                    renderQuotes={false}
                    isArticle={isArticle}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
