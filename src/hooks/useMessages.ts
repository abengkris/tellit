"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { NDKEvent, NDKUser } from "@nostr-dev-kit/ndk";
import { NDKMessenger, NDKConversation, NDKMessage } from "@nostr-dev-kit/messages";
import { useNDK } from "@/hooks/useNDK";
import { useAuthStore } from "@/store/auth";

export interface Message {
  id: string;
  sender: string;
  recipient: string;
  content: string;
  timestamp: number;
  event: NDKEvent;
  isRead: boolean;
}

export interface Conversation {
  pubkey: string;
  lastMessage: Message;
  messages: Message[];
  unreadCount: number;
}

export function useMessages() {
  const { messenger, isReady } = useNDK();
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Map<string, Conversation>>(new Map());
  const [loading, setLoading] = useState(true);
  const isInitialLoad = useRef(true);

  const mapNDKMessage = useCallback((ndkMessage: NDKMessage): Message => {
    const event = ndkMessage.event;
    const sender = ndkMessage.sender?.pubkey || event.pubkey || "";
    const recipient = ndkMessage.recipient?.pubkey || (event.getMatchingTags ? event.getMatchingTags("p")[0]?.[1] : "");
    
    return {
      id: ndkMessage.id || event.id,
      sender: sender,
      recipient: recipient,
      content: ndkMessage.content || event.content,
      timestamp: ndkMessage.created_at || event.created_at || 0,
      event: event as NDKEvent,
      isRead: true // NDKMessenger doesn't expose isRead easily yet, defaulting to true
    };
  }, []);

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
          .map(mapNDKMessage)
          .sort((a, b) => b.timestamp - a.timestamp);

        next.set(chatPartnerPubkey, {
          pubkey: chatPartnerPubkey,
          messages: messages,
          lastMessage: messages[0],
          unreadCount: 0, // Placeholder
        });
      }

      setConversations(next);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    }
  }, [messenger, user, mapNDKMessage]);

  useEffect(() => {
    if (!messenger || !isReady || !user) return;

    if (isInitialLoad.current) {
      setLoading(true);
      fetchConversations().finally(() => {
        setLoading(false);
        isInitialLoad.current = false;
      });
    }

    // Listen for new messages to update state incrementally or refresh
    const handleMessage = async (message: NDKMessage) => {
      // For simplicity and to ensure correct grouping, we refresh the list
      // In a more optimized version, we would find the specific conversation and update it
      await fetchConversations();
    };

    messenger.on("message", handleMessage);
    
    return () => {
      messenger.off("message", handleMessage);
    };
  }, [messenger, isReady, user, fetchConversations]);

  return { 
    conversations: conversations ? Array.from(conversations.values()) : [], 
    loading, 
    refresh: fetchConversations 
  };
}
