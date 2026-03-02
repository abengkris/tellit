"use client";

import { useState, useEffect, useMemo } from "react";
import { useMessages, Message } from "@/hooks/useMessages";
import { useNDK } from "@/hooks/useNDK";
import { useAuthStore } from "@/store/auth";

export function useChat(targetPubkey: string) {
  const { conversations, loading, refresh } = useMessages();
  const { user } = useAuthStore();

  const messages = useMemo(() => {
    const conv = conversations.find(c => c.pubkey === targetPubkey);
    return conv ? [...conv.messages].sort((a, b) => a.timestamp - b.timestamp) : [];
  }, [conversations, targetPubkey]);

  return { messages, loading, user, refresh };
}
