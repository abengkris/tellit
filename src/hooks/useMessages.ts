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

  const mapNDKMessage = useCallback((ndkEvent: NDKEvent): Message => {
    const recipientTag = ndkEvent.getMatchingTags("p")[0];
    const recipient = recipientTag ? recipientTag[1] : (user?.pubkey || "");
    
    return {
      id: ndkEvent.id,
      sender: ndkEvent.pubkey,
      recipient: recipient,
      content: ndkEvent.content,
      timestamp: ndkEvent.created_at || 0,
      event: ndkEvent
    };
  }, [user]);

  const updateConversations = useCallback(() => {
    if (!messenger || !user) return;

    const ndkConversations = messenger.getConversations();
    const next = new Map<string, Conversation>();

    ndkConversations.forEach((conv: NDKConversation) => {
      // Find the other participant
      const chatPartner = Array.from(conv.participants).find(p => p !== user.pubkey);
      if (!chatPartner) return;

      const events = conv.getMessages();
      if (events.length === 0) return;

      const messages = events
        .map(mapNDKMessage)
        .sort((a, b) => b.timestamp - a.timestamp);

      next.set(chatPartner, {
        pubkey: chatPartner,
        messages: messages,
        lastMessage: messages[0],
        unreadCount: 0, // NDKMessenger might have its own unread tracking, but for now we simplify
      });
    });

    setConversations(next);
  }, [messenger, user, mapNDKMessage]);

  useEffect(() => {
    if (!messenger || !isReady || !user) return;

    setLoading(true);
    
    // Initial load
    updateConversations();
    setLoading(false);

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
