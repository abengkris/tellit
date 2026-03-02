"use client";

import { useState, useEffect, useCallback } from "react";
import { NDKEvent, NDKUser } from "@nostr-dev-kit/ndk";
import { NDKMessenger, NDKConversation } from "@nostr-dev-kit/messages";
import { useNDK } from "@/hooks/useNDK";
import { useAuthStore } from "@/store/auth";

export interface Message {
  id: string;
  sender: string;
  recipient: string;
  content: string;
  timestamp: number;
  event: NDKEvent;
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

  // ndkMessage is of type NDKMessage from @nostr-dev-kit/messages
  const mapNDKMessage = useCallback((ndkMessage: any): Message => {
    // If it has an event property, use it, otherwise use message properties
    const event = ndkMessage.event || ndkMessage;
    const sender = ndkMessage.sender?.pubkey || event.pubkey || "";
    const recipient = ndkMessage.recipient?.pubkey || (event.getMatchingTags ? event.getMatchingTags("p")[0]?.[1] : "");
    
    return {
      id: ndkMessage.id || event.id,
      sender: sender,
      recipient: recipient,
      content: ndkMessage.content || event.content,
      timestamp: ndkMessage.created_at || event.created_at || 0,
      event: event as NDKEvent
    };
  }, [user]);

  const updateConversations = useCallback(async () => {
    if (!messenger || !user) return;

    try {
      const ndkConversations = await messenger.getConversations();
      const next = new Map<string, Conversation>();

      for (const conv of ndkConversations) {
        // Find the other participant
        const participants = Array.from(conv.participants);
        const chatPartnerUser = participants.find(p => {
          if (typeof p === "string") return p !== user.pubkey;
          return (p as any).pubkey !== user.pubkey;
        });

        if (!chatPartnerUser) continue;
        const chatPartnerPubkey = typeof chatPartnerUser === "string" ? chatPartnerUser : (chatPartnerUser as any).pubkey;

        const events = await conv.getMessages();
        if (events.length === 0) continue;

        const messages = events
          .map(msg => mapNDKMessage(msg))
          .sort((a, b) => b.timestamp - a.timestamp);

        next.set(chatPartnerPubkey, {
          pubkey: chatPartnerPubkey,
          messages: messages,
          lastMessage: messages[0],
          unreadCount: 0,
        });
      }

      setConversations(next);
    } catch (err) {
      console.error("Failed to update conversations:", err);
    }
  }, [messenger, user, mapNDKMessage]);

  useEffect(() => {
    if (!messenger || !isReady || !user) return;

    const load = async () => {
      setLoading(true);
      await updateConversations();
      setLoading(false);
    };

    load();

    // Listen for new messages
    const handleMessage = () => {
      updateConversations();
    };

    messenger.on("message", handleMessage);
    
    return () => {
      messenger.off("message", handleMessage);
    };
  }, [messenger, isReady, user, updateConversations]);

  return { 
    conversations: Array.from(conversations.values()), 
    loading, 
    refresh: updateConversations 
  };
}
