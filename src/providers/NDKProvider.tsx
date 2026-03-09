"use client";

import { createContext, useEffect, useState, ReactNode, useRef } from "react";
import NDK, { NDKEvent, NDKCacheAdapter, NDKRelay } from "@nostr-dev-kit/ndk";
import NDKCacheAdapterDexie from "@nostr-dev-kit/ndk-cache-dexie";
import { NDKMessenger, CacheModuleStorage, NDKMessage } from "@nostr-dev-kit/messages";
import { NDKSessionManager, LocalStorage, NDKSession } from "@nostr-dev-kit/sessions";
import { NDKNWCWallet } from "@nostr-dev-kit/wallet";
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";
import { useWalletStore } from "@/store/wallet";
import { getNDK } from "@/lib/ndk";

interface ExtendedCacheAdapter extends NDKCacheAdapter {
  getUnpublishedEvents?: () => Promise<{ event: NDKEvent; relays?: string[]; lastTryAt?: number }[]>;
  discardUnpublishedEvent?: (eventId: string) => Promise<void>;
}

export interface NDKContextType {
  ndk: NDK | null;
  messenger: NDKMessenger | null;
  sessions: NDKSessionManager | null;
  activeSession: NDKSession | null;
  isReady: boolean;
  refreshBalance: () => Promise<void>;
}

export const NDKContext = createContext<NDKContextType>({
  ndk: null,
  messenger: null,
  sessions: null,
  activeSession: null,
  isReady: false,
  refreshBalance: async () => {},
});

export const NDKProvider = ({ children }: { children: ReactNode }) => {
  const [ndk, setNdk] = useState<NDK | null>(null);
  const [messenger, setMessenger] = useState<NDKMessenger | null>(null);
  const [sessions, setSessions] = useState<NDKSessionManager | null>(null);
  const [activeSession, setActiveSession] = useState<NDKSession | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  const { setUser, setLoginState } = useAuthStore();
  const { 
    incrementUnreadMessagesCount, 
    addToast, 
    activeChatPubkey, 
    browserNotificationsEnabled 
  } = useUIStore();
  
  const { 
    walletType, 
    nwcPairingCode, 
    setBalance, 
    setInfo 
  } = useWalletStore();
  
  const messengerRef = useRef<NDKMessenger | null>(null);
  const sessionsRef = useRef<NDKSessionManager | null>(null);
  const nwcRef = useRef<NDKNWCWallet | null>(null);
  const walletRef = useRef<NDKNWCWallet | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let dexieAdapter: NDKCacheAdapterDexie | null = null;
    try {
      dexieAdapter = new NDKCacheAdapterDexie({ dbName: "ndk-cache" });
    } catch { /* ignore */ }

    const instance = getNDK();
    
    if (!instance.cacheAdapter && dexieAdapter) {
      const adapter = dexieAdapter as unknown as ExtendedCacheAdapter;
      instance.cacheAdapter = adapter;

      adapter.discardUnpublishedEvent = async (eventId: string) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (dexieAdapter && (dexieAdapter as any).db) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const dbInstance = (dexieAdapter as any).db;
            await dbInstance.unpublishedEvents.delete(eventId);
          } catch { /* ignore */ }
        }
      };
    }

    // Performance Optimization
    instance.initialValidationRatio = 0.5;
    instance.lowestValidationRatio = 0.05;

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

    instance.on("event:publish-failed", (event: NDKEvent, error: Error) => {
      console.error(`Event ${event.id} failed to publish:`, error);
      addToast(`Failed to publish event. It will be retried automatically.`, "error");
    });

    const initWallet = async () => {
      if (nwcPairingCode) {
        try {
          const nwc = new NDKNWCWallet(instance, { 
            pairingCode: nwcPairingCode,
            timeout: 30000
          });
          
          nwc.on("ready", () => {
            console.log("NWC wallet ready");
            if (walletType === 'nwc') {
              addToast("NWC Wallet connected", "success");
              nwc.getInfo().then((info) => { if (info) setInfo(info); }).catch(() => {});
              nwc.updateBalance().catch(() => {});
            }
          });

          nwc.on("balance_updated", (balance?: { amount: number }) => {
            if (walletType === 'nwc') setBalance(balance?.amount || 0);
          });

          nwcRef.current = nwc;
          if (walletType === 'nwc') {
            instance.wallet = nwc;
            walletRef.current = nwc;
          }
        } catch (err) {
          console.error("Failed to initialize NWC wallet:", err);
        }
      }
    };

    const sessionManager = new NDKSessionManager(instance, {
      storage: new LocalStorage("tellit-sessions"),
      autoSave: true,
      fetches: { follows: true, mutes: true, relayList: true }
    });
    sessionsRef.current = sessionManager;
    Promise.resolve().then(() => setSessions(sessionManager));

    const unsubscribeSessions = sessionManager.subscribe((state) => {
      if (state.activePubkey) {
        const session = sessionManager.activeSession;
        if (session) {
          Promise.resolve().then(() => {
            setActiveSession(session);
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

    const initApp = async () => {
      await sessionManager.restore();
      await initWallet();
      setNdk(instance);

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
        } catch (e) { console.error("Failed to initialize NDKMessenger:", e); }
      }
      return msgInstance;
    };

    initApp().then((msgInstance) => {
      const connectPromise = instance.connect();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000));

      Promise.race([connectPromise, timeoutPromise])
        .then(async () => {
          setIsReady(true);
          if (instance.cacheAdapter && (instance.cacheAdapter as ExtendedCacheAdapter).getUnpublishedEvents) {
            try {
              const unpublished = await (instance.cacheAdapter as ExtendedCacheAdapter).getUnpublishedEvents!();
              if (unpublished && unpublished.length > 0) {
                for (const item of unpublished) {
                  const event = item.event;
                  event.ndk = instance;
                  event.publish().catch(() => {});
                }
              }
            } catch { /* ignore */ }
          }
          
          if (sessionManager.activePubkey && msgInstance) {
            try {
              await msgInstance.start();
              msgInstance.on("message", (message: NDKMessage) => {
                const currentPubkey = sessionManager.activePubkey;
                if (message.sender?.pubkey !== currentPubkey && message.recipient?.pubkey === currentPubkey) {
                  const isCurrentChat = activeChatPubkey === message.sender?.pubkey;
                  if (!isCurrentChat) {
                    incrementUnreadMessagesCount();
                    if (browserNotificationsEnabled && Notification.permission === "granted") {
                      const sender = message.sender;
                      sender.fetchProfile().then(() => {
                        const title = String(sender.profile?.display_name || sender.profile?.name || "New Message");
                        new Notification(title, { body: message.content.slice(0, 100), icon: sender.profile?.picture || "/favicon.ico" });
                      });
                    }
                  }
                }
              });
            } catch { /* ignore */ }
          }
        })
        .catch(() => { setIsReady(true); });
    });

    return () => {
      unsubscribeSessions();
      if (messengerRef.current) try { messengerRef.current.destroy(); } catch { /* ignore */ }
    };
  }, [setUser, setLoginState, incrementUnreadMessagesCount, addToast, activeChatPubkey, browserNotificationsEnabled, nwcPairingCode, setBalance, setInfo, walletType]);

  const refreshBalance = async () => {
    if (walletRef.current) {
      try {
        if (typeof walletRef.current.updateBalance === 'function') {
          await walletRef.current.updateBalance();
        }
      } catch { /* ignore */ }
    }
  };

  return (
    <NDKContext.Provider value={{ ndk, messenger, sessions, activeSession, isReady, refreshBalance }}>
      {children}
    </NDKContext.Provider>
  );
};
