"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { NDKEvent, NDKFilter, NDKUser } from "@nostr-dev-kit/ndk";
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
  const { ndk, isReady } = useNDK();
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Map<string, Conversation>>(new Map());
  const [loading, setLoading] = useState(true);
  const processedEventIds = useRef<Set<string>>(new Set());

  const processGiftWrap = useCallback(async (giftWrap: NDKEvent): Promise<Message | null> => {
    if (processedEventIds.current.has(giftWrap.id)) return null;
    processedEventIds.current.add(giftWrap.id);

    try {
      // 1. Decrypt Gift Wrap (Kind 1059) to get Seal (Kind 13)
      const seal = await giftWrap.decrypt(user);
      if (!seal || seal.kind !== 13) return null;

      // 2. Decrypt Seal (Kind 13) to get Message (Kind 14)
      // Note: The sender of the seal is the actual sender of the message
      const sender = seal.pubkey;
      const messageEvent = await seal.decrypt(user);
      if (!messageEvent || messageEvent.kind !== 14) return null;

      // The recipient is the one tagged in the Kind 14 rumor
      const recipientTag = messageEvent.getMatchingTags("p")[0];
      const recipient = recipientTag ? recipientTag[1] : user!.pubkey;

      return {
        id: messageEvent.id,
        sender: sender,
        recipient: recipient,
        content: messageEvent.content,
        timestamp: messageEvent.created_at || giftWrap.created_at || 0,
        event: messageEvent
      };
    } catch (e) {
      // console.error("Failed to decrypt NIP-17 message:", e);
      return null;
    }
  }, [user]);

  const fetchMessages = useCallback(async () => {
    if (!ndk || !isReady || !user) return;

    setLoading(true);
    try {
      // Fetch incoming gift wraps (those sent TO me, including my own sent copies)
      const filter: NDKFilter = {
        kinds: [1059],
        "#p": [user.pubkey],
        limit: 100,
      };

      const giftWraps = await ndk.fetchEvents(filter);
      const newMessages: Message[] = [];

      for (const gw of Array.from(giftWraps)) {
        const msg = await processGiftWrap(gw);
        if (msg) newMessages.push(msg);
      }

      // Group by conversation
      setConversations((prev) => {
        const next = new Map(prev);
        newMessages.forEach((msg) => {
          // Chat partner is the person we are talking to.
          // If we sent the message (sender is me), chat partner is the recipient.
          // If we received the message (sender is not me), chat partner is the sender.
          const isMe = msg.sender === user.pubkey;
          const chatPartner = isMe ? msg.recipient : msg.sender;
          
          if (chatPartner === user.pubkey) return; // Ignore self-to-self if any

          const conv = next.get(chatPartner) || {
            pubkey: chatPartner,
            messages: [],
            unreadCount: 0,
            lastMessage: msg,
          };

          if (!conv.messages.find((m) => m.id === msg.id)) {
            conv.messages.push(msg);
            conv.messages.sort((a, b) => b.timestamp - a.timestamp);
            conv.lastMessage = conv.messages[0];
            next.set(chatPartner, conv);
          }
        });
        return next;
      });
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  }, [ndk, isReady, user, processGiftWrap]);

  useEffect(() => {
    fetchMessages();

    if (!ndk || !isReady || !user) return;

    // Real-time listener for NEW gift wraps
    const sub = ndk.subscribe(
      { kinds: [1059], "#p": [user.pubkey], since: Math.floor(Date.now() / 1000) },
      { closeOnEose: false }
    );

    sub.on("event", async (gw: NDKEvent) => {
      const msg = await processGiftWrap(gw);
      if (msg) {
        setConversations((prev) => {
          const next = new Map(prev);
          const isMe = msg.sender === user.pubkey;
          const chatPartner = isMe ? msg.recipient : msg.sender;
          
          if (chatPartner === user.pubkey) return next;

          const conv = next.get(chatPartner) || {
            pubkey: chatPartner,
            messages: [],
            unreadCount: 0,
            lastMessage: msg,
          };

          if (!conv.messages.find((m) => m.id === msg.id)) {
            conv.messages.unshift(msg);
            conv.messages.sort((a, b) => b.timestamp - a.timestamp);
            conv.lastMessage = conv.messages[0];
            if (!isMe) conv.unreadCount++;
            next.set(chatPartner, conv);
          }
          return next;
        });
      }
    });

    return () => sub.stop();
  }, [ndk, isReady, user, fetchMessages, processGiftWrap]);

  return { conversations: Array.from(conversations.values()), loading, refresh: fetchMessages };
}
