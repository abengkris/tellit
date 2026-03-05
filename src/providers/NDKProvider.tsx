"use client";

import { createContext, useEffect, useState, ReactNode, useRef } from "react";
import NDK, { NDKUser, NDKEvent, NDKCacheAdapter, NDKRelay } from "@nostr-dev-kit/ndk";
import NDKCacheAdapterDexie from "@nostr-dev-kit/ndk-cache-dexie";
import { NDKMessenger, CacheModuleStorage } from "@nostr-dev-kit/messages";
import { NDKSessionManager, LocalStorage, NDKSession } from "@nostr-dev-kit/sessions";
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";
import { getNDK } from "@/lib/ndk";

export interface NDKContextType {
  ndk: NDK | null;
  messenger: NDKMessenger | null;
  sessions: NDKSessionManager | null;
  activeSession: NDKSession | null;
  isReady: boolean;
}

export const NDKContext = createContext<NDKContextType>({
  ndk: null,
  messenger: null,
  sessions: null,
  activeSession: null,
  isReady: false,
});

export const NDKProvider = ({ children }: { children: ReactNode }) => {
  const [ndk, setNdk] = useState<NDK | null>(null);
  const [messenger, setMessenger] = useState<NDKMessenger | null>(null);
  const [sessions, setSessions] = useState<NDKSessionManager | null>(null);
  const [activeSession, setActiveSession] = useState<NDKSession | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  const { setUser, setLoginState } = useAuthStore();
  const { incrementUnreadMessagesCount, addToast } = useUIStore();
  
  const messengerRef = useRef<NDKMessenger | null>(null);
  const sessionsRef = useRef<NDKSessionManager | null>(null);

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;

    let dexieAdapter: NDKCacheAdapterDexie | null = null;
    try {
      dexieAdapter = new NDKCacheAdapterDexie({ dbName: "ndk-cache" });
    } catch (e) {
      console.error("Failed to initialize Dexie adapter:", e);
    }

    const instance = getNDK();
    
    // Set cache adapter if not already set
    if (!instance.cacheAdapter && dexieAdapter) {
      instance.cacheAdapter = dexieAdapter as unknown as NDKCacheAdapter;
    }

    // Performance Optimization: Validation Sampling
    instance.initialValidationRatio = 0.5;
    instance.lowestValidationRatio = 0.05;

    // Handle invalid signatures with throttling and relay management
    const invalidSigCountByRelay = new Map<string, number>();
    let lastToastTime = 0;
    const TOAST_THROTTLE = 5000;
    const DISCONNECT_THRESHOLD = 5;

    instance.on("event:invalid-sig", (event: NDKEvent, relay?: NDKRelay) => {
      const relayUrl = relay?.url || 'unknown';
      console.error("Invalid signature detected from relay:", relayUrl);
      
      const currentCount = (invalidSigCountByRelay.get(relayUrl) || 0) + 1;
      invalidSigCountByRelay.set(relayUrl, currentCount);

      const now = Date.now();
      
      if (currentCount >= DISCONNECT_THRESHOLD && relay) {
        relay.disconnect();
        if (now - lastToastTime > TOAST_THROTTLE) {
          addToast(`Disconnected from malicious relay: ${relayUrl}`, "error");
          lastToastTime = now;
        }
        return;
      }

      if (now - lastToastTime > TOAST_THROTTLE) {
        addToast(`Invalid signature detected from relay: ${relayUrl}`, "error");
        lastToastTime = now;
      }
    });

    // Handle publishing failures
    instance.on("event:publish-failed", (event: NDKEvent, error: Error) => {
      console.error(`Event ${event.id} failed to publish:`, error);
      addToast(`Failed to publish event to relays. It will be retried automatically.`, "error");
    });

    // Initialize Session Manager
    const sessionManager = new NDKSessionManager(instance, {
      storage: new LocalStorage("tellit-sessions"),
      autoSave: true,
      fetches: {
        follows: true,
        mutes: true,
        relayList: true
      }
    });
    sessionsRef.current = sessionManager;
    Promise.resolve().then(() => setSessions(sessionManager));

    // Subscribe to session changes to sync with store
    const unsubscribeSessions = sessionManager.subscribe((state) => {
      if (state.activePubkey) {
        const session = sessionManager.activeSession;
        if (session) {
          Promise.resolve().then(() => {
            setActiveSession(session);
            // sessionManager provides activeUser, fallback to ndk.getUser if needed
            const user = sessionManager.activeUser || instance.getUser({ pubkey: session.pubkey });
            setUser(user);
            setLoginState(true, session.pubkey);
          });
        }
      } else {
        Promise.resolve().then(() => {
          setActiveSession(null);
          setUser(null);
          setLoginState(false, null);
        });
      }
    });

    // Handle session restoration
    const initApp = async () => {
      // Restore sessions first
      await sessionManager.restore();
      
      setNdk(instance);

      // Retry unpublished events from cache
      if (instance.cacheAdapter && (instance.cacheAdapter as any).getUnpublishedEvents) {
        try {
          const unpublishedEvents = await (instance.cacheAdapter as any).getUnpublishedEvents();
          if (unpublishedEvents && unpublishedEvents.length > 0) {
            console.log(`Retrying ${unpublishedEvents.length} unpublished events from cache...`);
            unpublishedEvents.forEach((event: NDKEvent) => {
              event.ndk = instance;
              event.publish();
            });
          }
        } catch (e) {
          console.warn("Failed to retry unpublished events:", e);
        }
      }

      // Initialize Messenger safely if we have an active user
      const currentPubkey = sessionManager.activePubkey;
      let msgInstance: NDKMessenger | null = null;
      
      if (currentPubkey) {
        try {
          const storage = (dexieAdapter && currentPubkey) 
            ? new CacheModuleStorage(dexieAdapter as unknown as NDKCacheAdapter, currentPubkey) 
            : undefined;
          
          msgInstance = new NDKMessenger(instance, { storage });
          messengerRef.current = msgInstance;
          setMessenger(msgInstance);
        } catch (e) {
          console.error("Failed to initialize NDKMessenger:", e);
        }
      }

      return msgInstance;
    };

    initApp().then((msgInstance) => {
      const connectPromise = instance.connect();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Connection timeout")), 10000)
      );

      Promise.race([connectPromise, timeoutPromise])
        .then(async () => {
          setIsReady(true);
          console.log("NDK connected and sessions restored");
          
          if (sessionManager.activePubkey && msgInstance) {
            try {
              await msgInstance.start();
              msgInstance.on("message", (message: any) => {
                const currentPubkey = sessionManager.activePubkey;
                if (message.sender?.pubkey !== currentPubkey && message.recipient?.pubkey === currentPubkey) {
                  const isCurrentChat = window.location.pathname.includes(`/messages/${message.sender?.pubkey}`);
                  if (!isCurrentChat) {
                    incrementUnreadMessagesCount();
                  }
                }
              });
            } catch (e) {
              console.error("Failed to start NDKMessenger:", e);
            }
          }
        })
        .catch(async (err) => {
          console.warn("NDK connection partial or timed out:", err.message);
          setIsReady(true);
          if (sessionManager.activePubkey && msgInstance) {
            try { await msgInstance.start(); } catch (e) {}
          }
        });
    });

    return () => {
      unsubscribeSessions();
      if (messengerRef.current) {
        try { (messengerRef.current as any).destroy(); } catch (e) {}
      }
    };
  }, [setUser, setLoginState, incrementUnreadMessagesCount, addToast]);

  return (
    <NDKContext.Provider value={{ ndk, messenger, sessions, activeSession, isReady }}>
      {children}
    </NDKContext.Provider>
  );
};
