"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Message } from "@/hooks/useMessages";
import { useNDK } from "@/hooks/useNDK";
import { useAuthStore } from "@/store/auth";
import { NDKMessage } from "@nostr-dev-kit/messages";
import { NDKEvent } from "@nostr-dev-kit/ndk";

export function useChat(targetPubkey: string) {
  const { messenger, isReady } = useNDK();
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

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
      isRead: true
    };
  }, []);

  const fetchChatMessages = useCallback(async () => {
    if (!messenger || !user || !targetPubkey) return;

    try {
      const conv = await messenger.getConversation(targetPubkey);
      if (conv) {
        const events = await conv.getMessages();
        const mapped = events
          .map(mapNDKMessage)
          .sort((a, b) => a.timestamp - b.timestamp);
        setMessages(mapped);
      }
    } catch (err) {
      console.error("Failed to fetch chat messages:", err);
    } finally {
      setLoading(false);
    }
  }, [messenger, user, targetPubkey, mapNDKMessage]);

  useEffect(() => {
    if (!messenger || !isReady || !user || !targetPubkey) return;

    fetchChatMessages();

    // Listen for new messages for this specific conversation
    const handleMessage = async (message: NDKMessage) => {
      const sender = message.sender?.pubkey || message.event.pubkey;
      const recipient = message.recipient?.pubkey || message.event.getMatchingTags("p")[0]?.[1];
      
      if (sender === targetPubkey || recipient === targetPubkey) {
        const mapped = mapNDKMessage(message);
        setMessages(prev => {
          if (prev.find(m => m.id === mapped.id)) return prev;
          return [...prev, mapped].sort((a, b) => a.timestamp - b.timestamp);
        });
      }
    };

    messenger.on("message", handleMessage);
    
    return () => {
      messenger.off("message", handleMessage);
    };
  }, [messenger, isReady, user, targetPubkey, fetchChatMessages, mapNDKMessage]);

  return { messages, loading, user, refresh: fetchChatMessages };
}
