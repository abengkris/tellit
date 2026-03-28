"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Message } from "@/hooks/useMessages";
import { useNDK } from "@/hooks/useNDK";
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";
import { NDKMessage, NDKConversation } from "@nostr-dev-kit/messages";
import { mapNDKMessage } from "@/lib/utils/messages";
import { sendMessage as sendChatMessage } from "@/lib/actions/messages";
import { sendNostrifyMessage } from "@/lib/actions/nostrify-actions";

export function useChat(targetPubkey: string) {
  const { messenger, isReady, ndk, sync, signer } = useNDK();
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
        // Initial load from local cache
        const events = await conv.getMessages();
        const mapped = events
          .map(msg => mapNDKMessage(msg, ndk))
          .sort((a, b) => a.timestamp - b.timestamp);
        setMessages(mapped);

        // Efficiency boost: Sync gaps with Negentropy if available
        if (sync) {
          console.log(`[useChat] Performing sync for ${targetPubkey}...`);
          const syncFilter = { 
            kinds: [1059, 14], 
            "#p": [user.pubkey, targetPubkey],
            since: Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60) // Sync last 30 days
          };
          
          sync.sync(syncFilter, { autoFetch: true }).then(() => {
            // Re-fetch from cache after sync to update state
            conv.getMessages().then(newEvents => {
              const remapped = newEvents
                .map(msg => mapNDKMessage(msg, ndk))
                .sort((a, b) => a.timestamp - b.timestamp);
              setMessages(remapped);
            });
          }).catch(e => console.warn("[useChat] Sync failed:", e));
        }
      }
    } catch (err) {
      console.error("Failed to fetch chat messages:", err);
    } finally {
      setLoading(false);
    }
  }, [messenger, user, targetPubkey, ndk, sync]);

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
    if (!content.trim()) return false;
    
    try {
      // 1. Try Nostrify if signer is available
      if (signer) {
        console.log("[useChat] Sending via Nostrify");
        const success = await sendNostrifyMessage(content, targetPubkey, signer);
        if (success) {
          // Trigger a re-fetch or wait for subscription to pick it up
          setTimeout(() => fetchChatMessages(), 500);
        }
        return success;
      }

      // 2. Fallback to NDK
      if (convRef.current) {
        console.log("[useChat] Sending via convRef.current");
        await convRef.current.sendMessage(content);
        return true;
      }
      
      if (!messenger || !ndk || !targetPubkey) return false;
      
      console.log("[useChat] Sending via messenger action");
      const recipientUser = ndk.getUser({ pubkey: targetPubkey });
      const success = await sendChatMessage(messenger, recipientUser, content);
      if (success) fetchChatMessages();
      return success;
    } catch (err) {
      console.error("Failed to send message:", err);
      return false;
    }
  }, [signer, targetPubkey, messenger, ndk, fetchChatMessages]);

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
