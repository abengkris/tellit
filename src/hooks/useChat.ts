"use client";

import { useState, useEffect, useCallback } from "react";
import { Message } from "@/hooks/useMessages";
import { useNDK } from "@/hooks/useNDK";
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";
import { NDKEvent, NDKUser } from "@nostr-dev-kit/ndk";
import { NDKMessage } from "@nostr-dev-kit/messages";
import { mapNDKMessage } from "@/lib/utils/messages";
import { sendMessage as sendChatMessage } from "@/lib/actions/messages";

export function useChat(targetPubkey: string) {
  const { messenger, isReady, ndk } = useNDK();
  const { user } = useAuthStore();
  const { setActiveChatPubkey } = useUIStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChatMessages = useCallback(async () => {
    if (!messenger || !user || !targetPubkey || !ndk) return;

    try {
      const recipientUser = ndk.getUser({ pubkey: targetPubkey });
      const conv = await messenger.getConversation(recipientUser);
      if (conv) {
        const events = await conv.getMessages();
        const mapped = events
          .map(msg => mapNDKMessage(msg, ndk))
          .sort((a, b) => a.timestamp - b.timestamp);
        setMessages(mapped);
      }
    } catch (err) {
      console.error("Failed to fetch chat messages:", err);
    } finally {
      setLoading(false);
    }
  }, [messenger, user, targetPubkey, ndk]);

  const markAsRead = useCallback(async () => {
    if (!messenger || !ndk || !targetPubkey) return;
    try {
      const recipientUser = ndk.getUser({ pubkey: targetPubkey });
      const conv = await messenger.getConversation(recipientUser);
      if (conv) conv.markAsRead();
    } catch (err) {
      console.warn("Failed to mark conversation as read:", err);
    }
  }, [messenger, ndk, targetPubkey]);

  const sendMessage = useCallback(async (content: string) => {
    if (!messenger || !ndk || !targetPubkey || !content.trim()) return false;
    try {
      const recipientUser = ndk.getUser({ pubkey: targetPubkey });
      const success = await sendChatMessage(messenger, recipientUser, content);
      if (success) fetchChatMessages();
      return success;
    } catch (err) {
      console.error("Failed to send message:", err);
      return false;
    }
  }, [messenger, ndk, targetPubkey, sendChatMessage, fetchChatMessages]);

  useEffect(() => {
    if (!messenger || !isReady || !user || !targetPubkey) return;

    setActiveChatPubkey(targetPubkey);
    fetchChatMessages();
    markAsRead();

    // Listen for new messages for this specific conversation
    const handleMessage = async (message: NDKMessage) => {
      // Robust sender/recipient detection using the shared logic via mapNDKMessage
      const mapped = mapNDKMessage(message, ndk);
      
      if (mapped.sender === targetPubkey || mapped.recipient === targetPubkey) {
        setMessages(prev => {
          if (prev.find(m => m.id === mapped.id)) return prev;
          return [...prev, mapped].sort((a, b) => a.timestamp - b.timestamp);
        });
        
        // Auto-mark as read if we are in the chat
        markAsRead();
      }
    };

    const handleError = (err: Error) => {
      console.error("NDKMessenger error in useChat:", err);
    };

    messenger.on("message", handleMessage);
    messenger.on("error", handleError);
    
    return () => {
      setActiveChatPubkey(null);
      messenger.off("message", handleMessage);
      messenger.off("error", handleError);
    };
  }, [messenger, isReady, user, targetPubkey, fetchChatMessages, ndk, setActiveChatPubkey, markAsRead]);

  return { messages, loading, user, refresh: fetchChatMessages, sendMessage, markAsRead };
}
