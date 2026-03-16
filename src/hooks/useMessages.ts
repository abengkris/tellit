"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { NDKMessenger, NDKMessage } from "@nostr-dev-kit/messages";
import { useNDK } from "@/hooks/useNDK";
import { useAuthStore } from "@/store/auth";
import { mapNDKMessage, MappedMessage } from "@/lib/utils/messages";

export type Message = MappedMessage;

export interface Conversation {
  pubkey: string;
  lastMessage: Message;
  messages: Message[];
  unreadCount: number;
}

export function useMessages() {
  const { messenger, isReady, ndk } = useNDK();
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Map<string, Conversation>>(new Map());
  const [loading, setLoading] = useState(true);
  const isInitialLoad = useRef(true);

  const fetchConversations = useCallback(async () => {
    if (!messenger || !user) return;

    try {
      const ndkConversations = await messenger.getConversations();
      const next = new Map<string, Conversation>();

      for (const conv of ndkConversations) {
        const participants = Array.from(conv.participants);
        const chatPartnerUser = participants.find(p => {
          const pPubkey = typeof p === "string" ? p : p.pubkey;
          return pPubkey !== user.pubkey;
        });

        if (!chatPartnerUser) continue;
        const chatPartnerPubkey = typeof chatPartnerUser === "string" ? chatPartnerUser : chatPartnerUser.pubkey;

        const events = await conv.getMessages();
        if (events.length === 0) continue;

        const messages = events
          .map(msg => mapNDKMessage(msg, ndk))
          .sort((a, b) => b.timestamp - a.timestamp);
        
        const unreadCount = conv.getUnreadCount ? conv.getUnreadCount() : 0;

        next.set(chatPartnerPubkey, {
          pubkey: chatPartnerPubkey,
          messages: messages,
          lastMessage: messages[0],
          unreadCount,
        });
      }

      setConversations(next);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    }
  }, [messenger, user, ndk]);

  useEffect(() => {
    if (!messenger || !isReady || !user) return;

    if (isInitialLoad.current) {
      Promise.resolve().then(() => setLoading(true));
      fetchConversations().finally(() => {
        setLoading(false);
        isInitialLoad.current = false;
      });
    }

    const handleMessage = async (message: NDKMessage) => {
      // Find which conversation this message belongs to
      const otherPubkey = message.sender.pubkey === user.pubkey 
        ? message.recipient?.pubkey 
        : message.sender.pubkey;
      
      if (!otherPubkey) {
        // Fallback to full refresh if we can't determine the partner
        await fetchConversations();
        return;
      }

      // Update that specific conversation in the map
      const recipientUser = ndk?.getUser({ pubkey: otherPubkey });
      if (!recipientUser) return;

      const conv = await messenger.getConversation(recipientUser);
      if (!conv) return;

      const events = await conv.getMessages();
      const messages = events
        .map(msg => mapNDKMessage(msg, ndk))
        .sort((a, b) => b.timestamp - a.timestamp);
      
      const unreadCount = conv.getUnreadCount ? conv.getUnreadCount() : 0;

      setConversations(prev => {
        const next = new Map(prev);
        next.set(otherPubkey, {
          pubkey: otherPubkey,
          messages,
          lastMessage: messages[0],
          unreadCount,
        });
        return next;
      });
    };

    const handleError = (err: Error) => {
      console.error("NDKMessenger error:", err);
    };

    messenger.on("message", handleMessage);
    messenger.on("error", handleError);
    
    return () => {
      messenger.off("message", handleMessage);
      messenger.off("error", handleError);
    };
  }, [messenger, isReady, user, ndk, fetchConversations]);

  return { 
    conversations: conversations ? Array.from(conversations.values()) : [], 
    loading, 
    refresh: fetchConversations 
  };
}
