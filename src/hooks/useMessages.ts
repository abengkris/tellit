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
      
      if (!otherPubkey) return;

      const mapped = mapNDKMessage(message, ndk);

      setConversations(prev => {
        const next = new Map(prev);
        const existing = next.get(otherPubkey);
        
        if (existing) {
          // Check if message already exists
          if (existing.messages.find(m => m.id === mapped.id)) return prev;
          
          const updatedMessages = [mapped, ...existing.messages]
            .sort((a, b) => b.timestamp - a.timestamp);
            
          next.set(otherPubkey, {
            ...existing,
            messages: updatedMessages,
            lastMessage: updatedMessages[0],
            // Increment unread count if message is from others
            unreadCount: mapped.sender === otherPubkey ? existing.unreadCount + 1 : existing.unreadCount
          });
        } else {
          // New conversation
          next.set(otherPubkey, {
            pubkey: otherPubkey,
            messages: [mapped],
            lastMessage: mapped,
            unreadCount: mapped.sender === otherPubkey ? 1 : 0
          });
        }
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
