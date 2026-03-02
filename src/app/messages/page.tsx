"use client";

import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useMessages, Conversation } from "@/hooks/useMessages";
import { useProfile } from "@/hooks/useProfile";
import { Loader2, MessageSquare, Search, Plus } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { shortenPubkey } from "@/lib/utils/nip19";

export default function MessagesPage() {
  const { conversations, loading } = useMessages();

  return (
    <MainLayout>
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 py-3">
        <h1 className="text-xl font-black">Messages</h1>
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full transition-colors">
          <Plus size={22} />
        </button>
      </div>

      <div className="flex flex-col h-full">
        {loading && conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p className="font-medium">Decrypting your messages...</p>
          </div>
        ) : conversations.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-900">
            {conversations
              .sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp)
              .map((conv) => (
                <ConversationItem key={conv.pubkey} conversation={conv} />
              ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/10 text-blue-500 rounded-3xl flex items-center justify-center mb-6">
              <MessageSquare size={40} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Welcome to your inbox!</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xs mb-8">
              Private messages on Nostr are secure and metadata-resistant using NIP-17.
            </p>
            <Link 
              href="/search" 
              className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-black transition-all shadow-lg shadow-blue-500/20 active:scale-95"
            >
              Start a conversation
            </Link>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

const ConversationItem = ({ conversation }: { conversation: Conversation }) => {
  const { profile } = useProfile(conversation.pubkey);
  const displayName = profile?.name || profile?.displayName || shortenPubkey(conversation.pubkey);
  const avatar = profile?.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conversation.pubkey}`;

  return (
    <Link 
      href={`/messages/${conversation.pubkey}`}
      className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors group"
    >
      <div className="relative shrink-0">
        <Image
          src={avatar}
          alt={displayName}
          width={56}
          height={56}
          className="w-14 h-14 rounded-full object-cover bg-gray-200 border border-gray-100 dark:border-gray-800"
          unoptimized
        />
        {conversation.unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full border-2 border-white dark:border-black">
            {conversation.unreadCount}
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="font-black text-gray-900 dark:text-white truncate group-hover:text-blue-500 transition-colors">
            {displayName}
          </span>
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {formatDistanceToNow(new Date(conversation.lastMessage.timestamp * 1000), { addSuffix: false })}
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate pr-4">
          {conversation.lastMessage.sender === conversation.pubkey ? "" : "You: "}
          {conversation.lastMessage.content}
        </p>
      </div>
    </Link>
  );
};
