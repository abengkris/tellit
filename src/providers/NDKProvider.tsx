"use client";

import { createContext, useEffect, useState, ReactNode, useRef, useMemo } from "react";
import NDK, { NDKEvent, NDKCacheAdapter, NDKRelay, NDKRelayAuthPolicies } from "@nostr-dev-kit/ndk";
import NDKCacheAdapterDexie from "@nostr-dev-kit/ndk-cache-dexie";
import { NDKMessenger, CacheModuleStorage, NDKMessage } from "@nostr-dev-kit/messages";
import { NDKSessionManager, LocalStorage, NDKSession } from "@nostr-dev-kit/sessions";
import { NDKNWCWallet } from "@nostr-dev-kit/wallet";
import { NDKStore } from "@nostrify/ndk";
import { NStore } from "@nostrify/nostrify";
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
  relay: NStore | null;
  isReady: boolean;
  isWalletReady: boolean;
  refreshBalance: () => Promise<void>;
}

export const NDKContext = createContext<NDKContextType>({
  ndk: null,
  messenger: null,
  sessions: null,
  activeSession: null,
  relay: null,
  isReady: false,
  isWalletReady: false,
  refreshBalance: async () => {},
});

export const NDKProvider = ({ children }: { children: ReactNode }) => {
  const [ndk, setNdk] = useState<NDK | null>(null);
  const [messenger, setMessenger] = useState<NDKMessenger | null>(null);
  const [sessions, setSessions] = useState<NDKSessionManager | null>(null);
  const [activeSession, setActiveSession] = useState<NDKSession | null>(null);
  const [relay, setRelay] = useState<NStore | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isWalletReady, setIsWalletReady] = useState(false);
  
  const { setUser, setLoginState, setAccounts } = useAuthStore();
  const { 
    incrementUnreadMessagesCount, 
    addToast, 
    activeChatPubkey, 
    browserNotificationsEnabled,
    relayAuthStrategy
  } = useUIStore();
  
  const { 
    walletType, 
    nwcPairingCode, 
    setBalance, 
    setInfo 
  } = useWalletStore();
  
  const messengerRef = useRef<NDKMessenger | null>(null);
  const sessionsRef = useRef<NDKSessionManager | null>(null);
  const walletRef = useRef<NDKNWCWallet | null>(null);
  const initializingRef = useRef(false);
  const invalidSigCountByRelay = useRef(new Map<string, number>());
  const lastToastTime = useRef(0);

  // Memoize stable refs for dependencies that change but shouldn't re-trigger NDK init
  const depsRef = useRef({
    setUser,
    setLoginState,
    setAccounts,
    incrementUnreadMessagesCount,
    addToast,
    activeChatPubkey,
    browserNotificationsEnabled,
    relayAuthStrategy,
    nwcPairingCode,
    setBalance,
    setInfo,
    walletType
  });

  useEffect(() => {
    depsRef.current = {
      setUser,
      setLoginState,
      setAccounts,
      incrementUnreadMessagesCount,
      addToast,
      activeChatPubkey,
      browserNotificationsEnabled,
      relayAuthStrategy,
      nwcPairingCode,
      setBalance,
      setInfo,
      walletType
    };
  });

  useEffect(() => {
    if (typeof window === "undefined" || initializingRef.current) return;
    initializingRef.current = true;

    let dexieAdapter: NDKCacheAdapterDexie | null = null;
    try {
      dexieAdapter = new NDKCacheAdapterDexie({ dbName: "ndk-cache" });
    } catch { /* ignore */ }

    const instance = getNDK();
    
    if (!instance.cacheAdapter && dexieAdapter) {
      const adapter = dexieAdapter as unknown as ExtendedCacheAdapter;
      instance.cacheAdapter = adapter;

      adapter.discardUnpublishedEvent = async (eventId: string) => {
        try {
          // 1. Call the built-in method if available (handles memory)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (typeof (dexieAdapter as any).discardUnpublishedEvent === 'function') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (dexieAdapter as any).discardUnpublishedEvent(eventId);
          }

          // 2. Manually ensure it's deleted from the Dexie table
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (dexieAdapter && (dexieAdapter as any).db) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const dbInstance = (dexieAdapter as any).db;
            await dbInstance.unpublishedEvents.delete(eventId);
          }

          // 3. Force a dump to ensure persistence
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (typeof (dexieAdapter as any).dump === 'function') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (dexieAdapter as any).dump();
          }
        } catch (err) { 
          console.error("Failed to discard unpublished event:", err);
        }
      };
    }

    // Performance Optimization
    instance.initialValidationRatio = 0.5;
    instance.lowestValidationRatio = 0.05;

    // NIP-42 Relay Authentication
    instance.relayAuthDefaultPolicy = async (relay: NDKRelay, challenge: string) => {
      const strategy = depsRef.current.relayAuthStrategy;
      console.log(`[NDKProvider] Relay ${relay.url} requested authentication. Strategy: ${strategy}`);
      
      if (strategy === "never") return false;
      
      const signInPolicy = NDKRelayAuthPolicies.signIn({ ndk: instance });
      
      if (strategy === "always") {
        try {
          const result = await signInPolicy(relay, challenge);
          return !!result;
        } catch (err) {
          console.error(`[NDKProvider] Auto-authentication failed for ${relay.url}:`, err);
          return false;
        }
      }
      
      // Strategy is "ask"
      return new Promise<boolean>((resolve) => {
        depsRef.current.addToast(`Relay ${relay.url} requested authentication.`, "info", 15000, {
          label: "Authenticate",
          onClick: () => {
            signInPolicy(relay, challenge)
              .then((result) => {
                if (result) {
                  depsRef.current.addToast(`Authenticated to ${relay.url}`, "success");
                  resolve(true);
                } else {
                  resolve(false);
                }
              })
              .catch((err) => {
                console.error(`[NDKProvider] Authentication failed for ${relay.url}:`, err);
                depsRef.current.addToast(`Authentication failed for ${relay.url}`, "error");
                resolve(false);
              });
          }
        });
        
        // Timeout after 15s
        setTimeout(() => resolve(false), 15000);
      });
    };

    const TOAST_THROTTLE = 5000;
    const DISCONNECT_THRESHOLD = 5;

    instance.on("event:invalid-sig", (event: NDKEvent, relay?: NDKRelay) => {
      const relayUrl = relay?.url || 'unknown';
      console.error("Invalid signature detected from relay:", relayUrl);
      const currentCount = (invalidSigCountByRelay.current.get(relayUrl) || 0) + 1;
      invalidSigCountByRelay.current.set(relayUrl, currentCount);
      const now = Date.now();
      
      if (currentCount >= DISCONNECT_THRESHOLD && relay) {
        relay.disconnect();
        if (now - lastToastTime.current > TOAST_THROTTLE) {
          depsRef.current.addToast(`Disconnected from malicious relay: ${relayUrl}`, "error");
          lastToastTime.current = now;
        }
        return;
      }

      if (now - lastToastTime.current > TOAST_THROTTLE) {
        depsRef.current.addToast(`Invalid signature detected from relay: ${relayUrl}`, "error");
        lastToastTime.current = now;
      }
    });

    instance.on("event:publish-failed", (event: NDKEvent, error: Error) => {
      console.error(`Event ${event.id} failed to publish:`, error);
      depsRef.current.addToast(`Failed to publish event. It will be retried automatically.`, "error");
    });

    const initWallet = async () => {
      if (depsRef.current.nwcPairingCode) {
        try {
          const nwc = new NDKNWCWallet(instance, { 
            pairingCode: depsRef.current.nwcPairingCode,
            timeout: 30000
          });
          
          nwc.on("ready", () => {
            console.log("NWC wallet ready");
            setIsWalletReady(true);
            walletRef.current = nwc;
            
            if (depsRef.current.walletType === 'nwc') {
              instance.wallet = nwc;
              depsRef.current.addToast("NWC Wallet connected", "success");
              nwc.getInfo().then((info) => { if (info) depsRef.current.setInfo(info); }).catch(() => {});
              nwc.updateBalance().catch(() => {});
            }
          });

          nwc.on("balance_updated", (balance?: { amount: number }) => {
            if (depsRef.current.walletType === 'nwc') depsRef.current.setBalance(balance?.amount || 0);
          });
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
      console.log("[NDKProvider] Session state changed:", !!state.activePubkey);
      
      // Update accounts list
      const pubkeys = Array.from(sessionManager.sessions.keys());
      depsRef.current.setAccounts(pubkeys);

      if (state.activePubkey) {
        const session = sessionManager.activeSession;
        if (session) {
          Promise.resolve().then(() => {
            setActiveSession(session);
            const user = sessionManager.activeUser || instance.getUser({ pubkey: session.pubkey });
            depsRef.current.setUser(user);
            depsRef.current.setLoginState(true, session.pubkey);
          });
        }
      } else {
        Promise.resolve().then(() => {
          setActiveSession(null);
          depsRef.current.setUser(null);
          depsRef.current.setLoginState(false, null);
        });
      }
    });

    const initApp = async () => {
      console.log("[NDKProvider] Initializing App...");
      await sessionManager.restore();
      await initWallet();
      setNdk(instance);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setRelay(new NDKStore(instance as any));

      const currentPubkey = sessionManager.activePubkey;
      let msgInstance: NDKMessenger | null = null;
      if (currentPubkey) {
        try {
          const storage = (dexieAdapter && currentPubkey) 
            ? new CacheModuleStorage(dexieAdapter as unknown as NDKCacheAdapter, currentPubkey) 
            : undefined;
          msgInstance = new NDKMessenger(instance, { 
            storage
          });
          messengerRef.current = msgInstance;
          setMessenger(msgInstance);
        } catch (e) { console.error("Failed to initialize NDKMessenger:", e); }
      }
      return msgInstance;
    };

    initApp().then((msgInstance) => {
      console.log("[NDKProvider] App initialized, connecting...");
      const connectPromise = instance.connect();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000));

      Promise.race([connectPromise, timeoutPromise])
        .then(async () => {
          console.log("[NDKProvider] Connected!");
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
                  const isCurrentChat = depsRef.current.activeChatPubkey === message.sender?.pubkey;
                  if (!isCurrentChat) {
                    depsRef.current.incrementUnreadMessagesCount();
                    if (depsRef.current.browserNotificationsEnabled && Notification.permission === "granted") {
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
      initializingRef.current = false;
    };
   
  }, []); // Only run once on mount

  // Separate effect for wallet pairing code changes
  useEffect(() => {
    if (ndk && nwcPairingCode && !isWalletReady) {
      // Re-trigger wallet init if pairing code appears after initial load
      // But we need to handle this carefully to not double-init.
      // For now, let the user reload or implement a more robust wallet manager.
    }
  }, [ndk, nwcPairingCode, isWalletReady]);

  const refreshBalance = async () => {
    if (walletRef.current) {
      try {
        if (typeof walletRef.current.updateBalance === 'function') {
          await walletRef.current.updateBalance();
        }
      } catch { /* ignore */ }
    }
  };

  const contextValue = useMemo(() => ({ 
    ndk, 
    messenger, 
    sessions, 
    activeSession, 
    relay,
    isReady, 
    isWalletReady, 
    refreshBalance 
  }), [ndk, messenger, sessions, activeSession, relay, isReady, isWalletReady]);

  return (
    <NDKContext.Provider value={contextValue}>
      {children}
    </NDKContext.Provider>
  );
};
