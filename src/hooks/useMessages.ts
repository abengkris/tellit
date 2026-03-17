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
      console.log("[useMessages] Fetching conversations...");
      const ndkConversations = await messenger.getConversations();
      console.log(`[useMessages] Found ${ndkConversations.length} NDK conversations`);
      
      const next = new Map<string, Conversation>();

      for (const conv of ndkConversations) {
        const participants = Array.from(conv.participants);
        const chatPartnerUser = participants.find(p => {
          const pPubkey = typeof p === "string" ? p : p.pubkey;
          return pPubkey !== user.pubkey;
        });

        if (!chatPartnerUser) {
          console.log("[useMessages] No chat partner found in conversation", conv.id);
          continue;
        }
        
        const chatPartnerPubkey = typeof chatPartnerUser === "string" ? chatPartnerUser : chatPartnerUser.pubkey;

        const events = await conv.getMessages();
        console.log(`[useMessages] Conversation with ${chatPartnerPubkey} has ${events.length} messages`);
        
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

      console.log(`[useMessages] Final mapped conversations count: ${next.size}`);
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
        
        // If still no conversations after first load, try once more after a short delay
        // to allow relay subscription to return some events
        setTimeout(() => {
          if (conversations.size === 0) {
            console.log("[useMessages] Retrying initial fetch...");
            fetchConversations();
          }
        }, 3000);
      });
    }

    const handleMessage = async (message: NDKMessage) => {
      console.log("[useMessages] Received message event in handleMessage", message.id);
      
      // Find which conversation this message belongs to
      const otherPubkey = message.sender.pubkey === user.pubkey 
        ? message.recipient?.pubkey 
        : message.sender.pubkey;
      
      if (!otherPubkey) {
        console.warn("[useMessages] Could not determine other pubkey for message", message.id);
        return;
      }

      const mapped = mapNDKMessage(message, ndk);
      console.log(`[useMessages] Updating conversation map for ${otherPubkey}`);

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
          console.log(`[useMessages] Creating new conversation entry for ${otherPubkey}`);
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
