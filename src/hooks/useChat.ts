"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Message } from "@/hooks/useMessages";
import { useNDK } from "@/hooks/useNDK";
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";
import { NDKUser } from "@nostr-dev-kit/ndk";
import { NDKMessage, NDKConversation } from "@nostr-dev-kit/messages";
import { mapNDKMessage } from "@/lib/utils/messages";
import { sendMessage as sendChatMessage } from "@/lib/actions/messages";

export function useChat(targetPubkey: string) {
  const { messenger, isReady, ndk } = useNDK();
  const { user } = useAuthStore();
  const { setActiveChatPubkey } = useUIStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const convRef = useRef<NDKConversation | null>(null);

  const fetchChatMessages = useCallback(async () => {
    if (!messenger || !user || !targetPubkey || !ndk) return;

    try {
      const recipientUser = ndk.getUser({ pubkey: targetPubkey });
      const conv = await messenger.getConversation(recipientUser);
      convRef.current = conv;
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
    if (convRef.current) {
      convRef.current.markAsRead();
    } else if (messenger && ndk && targetPubkey) {
      try {
        const recipientUser = ndk.getUser({ pubkey: targetPubkey });
        const conv = await messenger.getConversation(recipientUser);
        if (conv) conv.markAsRead();
      } catch (err) {
        console.warn("Failed to mark conversation as read:", err);
      }
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
  }, [messenger, ndk, targetPubkey, fetchChatMessages]);

  useEffect(() => {
    if (!messenger || !isReady || !user || !targetPubkey || !ndk) return;

    let mounted = true;

    const setupConversation = async () => {
      setActiveChatPubkey(targetPubkey);
      const recipientUser = ndk.getUser({ pubkey: targetPubkey });
      const conv = await messenger.getConversation(recipientUser);
      
      if (!mounted) return;
      convRef.current = conv;

      if (conv) {
        // Initial load
        const events = await conv.getMessages();
        if (!mounted) return;

        const mapped = events
          .map(msg => mapNDKMessage(msg, ndk))
          .sort((a, b) => a.timestamp - b.timestamp);
        setMessages(mapped);
        setLoading(false);
        conv.markAsRead();

        // Listen for new messages in this specific conversation
        const handleConvMessage = (message: NDKMessage) => {
          const mapped = mapNDKMessage(message, ndk);
          setMessages(prev => {
            if (prev.find(m => m.id === mapped.id)) return prev;
            return [...prev, mapped].sort((a, b) => a.timestamp - b.timestamp);
          });
          conv.markAsRead();
        };

        conv.on("message", handleConvMessage);
        
        return () => {
          conv.off("message", handleConvMessage);
        };
      }
    };

    const cleanupPromise = setupConversation();
    
    return () => {
      mounted = false;
      setActiveChatPubkey(null);
      cleanupPromise.then(cleanup => cleanup?.());
    };
  }, [messenger, isReady, user, targetPubkey, ndk, setActiveChatPubkey]);

  return { messages, loading, user, refresh: fetchChatMessages, sendMessage, markAsRead };
}
