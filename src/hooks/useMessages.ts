"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { NDKMessenger } from "@nostr-dev-kit/messages";
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
  const { messenger, isReady, ndk } = useNDK();
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Map<string, Conversation>>(new Map());
  const [loading, setLoading] = useState(true);
  const isInitialLoad = useRef(true);

  const mapNDKMessage = useCallback((ndkMessage: any): Message => {
    // NDKMessage might have .event (NDKEvent) or just be a plain object with rumor data
    let event = ndkMessage.event;
    
    // If no event instance, create one from rumor or the message itself
    if (!event || !(event instanceof NDKEvent)) {
      const rumor = ndkMessage.rumor || ndkMessage;
      event = new NDKEvent(ndk || undefined);
      event.id = ndkMessage.id || rumor.id;
      event.pubkey = ndkMessage.sender?.pubkey || rumor.pubkey;
      event.content = ndkMessage.content || rumor.content;
      event.created_at = ndkMessage.timestamp || rumor.created_at;
      event.kind = rumor.kind || 14;
      event.tags = rumor.tags || [];
    }

    const sender = ndkMessage.sender?.pubkey || event.pubkey || "";
    const recipient = ndkMessage.recipient?.pubkey || (event.getMatchingTags ? event.getMatchingTags("p")[0]?.[1] : "");
    
    return {
      id: ndkMessage.id || event.id,
      sender: sender,
      recipient: recipient,
      content: ndkMessage.content || event.content,
      timestamp: ndkMessage.created_at || event.created_at || 0,
      event: event,
      isRead: ndkMessage.read ?? true
    };
  }, [ndk]);

  const fetchConversations = useCallback(async () => {
    if (!messenger || !user) return;

    try {
      const ndkConversations = await messenger.getConversations();
      const next = new Map<string, Conversation>();

      for (const conv of ndkConversations) {
        const participants = Array.from(conv.participants);
        const chatPartnerUser = participants.find(p => {
          const pPubkey = typeof p === "string" ? p : (p as any).pubkey;
          return pPubkey !== user.pubkey;
        });

        if (!chatPartnerUser) continue;
        const chatPartnerPubkey = typeof chatPartnerUser === "string" ? chatPartnerUser : (chatPartnerUser as any).pubkey;

        const events = await conv.getMessages();
        if (events.length === 0) continue;

        const messages = events
          .map(msg => mapNDKMessage(msg))
          .sort((a, b) => b.timestamp - a.timestamp);
        
        const unreadCount = (conv as any).getUnreadCount ? (conv as any).getUnreadCount() : 0;

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
  }, [messenger, user, mapNDKMessage]);

  useEffect(() => {
    if (!messenger || !isReady || !user) return;

    if (isInitialLoad.current) {
      Promise.resolve().then(() => setLoading(true));
      fetchConversations().finally(() => {
        Promise.resolve().then(() => {
          setLoading(false);
          isInitialLoad.current = false;
        });
      });
    }

    const handleMessage = async () => {
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
