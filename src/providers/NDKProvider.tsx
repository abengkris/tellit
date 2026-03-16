"use client";

import { createContext, useEffect, useLayoutEffect, useState, ReactNode, useRef, useMemo, useCallback } from "react";
import NDK, { NDKEvent, NDKCacheAdapter, NDKRelay, NDKRelayAuthPolicies, NDKNip46Signer, ndkSignerFromPayload } from "@nostr-dev-kit/ndk";
import NDKCacheAdapterDexie from "@nostr-dev-kit/ndk-cache-dexie";
import { NDKMessenger, CacheModuleStorage, NDKMessage } from "@nostr-dev-kit/messages";
import { NDKSessionManager, LocalStorage, NDKSession } from "@nostr-dev-kit/sessions";
import { NDKNWCWallet } from "@nostr-dev-kit/wallet";
import { NDKSync } from "@nostr-dev-kit/sync";
import { NDKStore } from "@nostrify/ndk";
import { NStore } from "@nostrify/nostrify";
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";
import { useWalletStore } from "@/store/wallet";
import { getNDK, DEFAULT_RELAYS } from "@/lib/ndk";
import { syncDMRelays } from "@/lib/actions/messages";

interface ExtendedCacheAdapter extends NDKCacheAdapter {
  getUnpublishedEvents?: () => Promise<{ event: NDKEvent; relays?: string[]; lastTryAt?: number }[]>;
  discardUnpublishedEvent?: (eventId: string) => Promise<void>;
}

export interface NDKContextType {
  ndk: NDK | null;
  messenger: NDKMessenger | null;
  sessions: NDKSessionManager | null;
  activeSession: NDKSession | null;
  sync: NDKSync | null;
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
  sync: null,
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
  const [sync, setSync] = useState<NDKSync | null>(null);
  const [relay, setRelay] = useState<NStore | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isWalletReady, setIsWalletReady] = useState(false);
  
  const { 
    setUser, 
    setLoginState, 
    setAccounts, 
    loginType, 
    bunkerUri, 
    bunkerLocalNsec,
    signerPayload
  } = useAuthStore();
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
    setInfo,
    isLocked
  } = useWalletStore();
  
  const messengerRef = useRef<NDKMessenger | null>(null);
  const sessionsRef = useRef<NDKSessionManager | null>(null);
  const walletRef = useRef<NDKNWCWallet | null>(null);
  const initializingRef = useRef(false);
  const lastPairingCodeRef = useRef<string | null>(null);
  const invalidSigCountByRelay = useRef(new Map<string, number>());
  const lastToastTime = useRef(0);

  const initWallet = useCallback(async (instance: NDK) => {
    if (stableDepsRef.current.nwcPairingCode && !stableDepsRef.current.isLocked) {
      if (lastPairingCodeRef.current === stableDepsRef.current.nwcPairingCode && walletRef.current) {
        return;
      }

      console.log("[NDKProvider] Initializing NWC wallet...");
      try {
        const nwc = new NDKNWCWallet(instance, { 
          pairingCode: stableDepsRef.current.nwcPairingCode,
          timeout: 30000
        });
        
        nwc.on("ready", () => {
          console.log("[NDKProvider] NWC wallet ready");
          setIsWalletReady(true);
          walletRef.current = nwc;
          lastPairingCodeRef.current = stableDepsRef.current.nwcPairingCode;
          
          if (stableDepsRef.current.walletType === 'nwc') {
            instance.wallet = nwc;
            stableDepsRef.current.addToast("NWC Wallet connected", "success");
            nwc.getInfo().then((info) => { if (info) stableDepsRef.current.setInfo(info); }).catch(() => {});
            nwc.updateBalance().catch(() => {});
          }
        });

        nwc.on("balance_updated", (balance?: { amount: number }) => {
          if (stableDepsRef.current.walletType === 'nwc') stableDepsRef.current.setBalance(balance?.amount || 0);
        });

        // Some versions of NDK might already be ready if created with pairing code
        // and its internal async init finished quickly.
        // NDK-wallet usually emits "ready" even if we attach listener late, 
        // but let's check status if possible.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((nwc as any).status === "ready") {
          setIsWalletReady(true);
          walletRef.current = nwc;
          if (stableDepsRef.current.walletType === 'nwc') {
            instance.wallet = nwc;
            nwc.getInfo().then((info) => { if (info) stableDepsRef.current.setInfo(info); }).catch(() => {});
            nwc.updateBalance().catch(() => {});
          }
        }
      } catch (err) {
        console.error("[NDKProvider] Failed to initialize NWC wallet:", err);
      }
    } else {
      // Clear wallet if pairing code is gone or locked
      if (instance.wallet && instance.wallet instanceof NDKNWCWallet) {
        instance.wallet = undefined;
        setIsWalletReady(false);
        walletRef.current = null;
        lastPairingCodeRef.current = null;
      }
    }
  }, []);

  // Separate effect for wallet pairing code and lock state changes
  useEffect(() => {
    if (ndk) {
      initWallet(ndk);
    }
  }, [ndk, nwcPairingCode, isLocked, initWallet]);

  // Memoize stable refs for dependencies that change but shouldn't re-trigger NDK init
  const stableDepsRef = useRef({
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
    walletType,
    loginType,
    bunkerUri,
    bunkerLocalNsec,
    signerPayload,
    isLocked
  });

  useLayoutEffect(() => {
    Object.assign(stableDepsRef.current, {
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
      walletType,
      loginType,
      bunkerUri,
      bunkerLocalNsec,
      signerPayload,
      isLocked
    });
  });

  useEffect(() => {
    if (typeof window === "undefined" || initializingRef.current) return;
    initializingRef.current = true;

    let dexieAdapter: NDKCacheAdapterDexie | null = null;
    try {
      dexieAdapter = new NDKCacheAdapterDexie({ dbName: "ndk-cache" });
    } catch { /* ignore */ }

    const instance = getNDK();
    
    // Offload signature verification to a Web Worker (Speed Optimization)
    try {
      const sigWorker = new Worker(new URL('@nostr-dev-kit/ndk/workers/sig-verification', import.meta.url));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (instance as any).signatureVerificationWorker = sigWorker;
      console.log("[NDKProvider] Signature verification offloaded to Web Worker");
    } catch (e) {
      console.warn("[NDKProvider] Failed to initialize signature verification worker:", e);
    }

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

    // NIP-42 Relay Authentication
    instance.relayAuthDefaultPolicy = async (relay: NDKRelay, challenge: string) => {
      const strategy = stableDepsRef.current.relayAuthStrategy;
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
        stableDepsRef.current.addToast(`Relay ${relay.url} requested authentication.`, "info", 15000, {
          label: "Authenticate",
          onClick: () => {
            signInPolicy(relay, challenge)
              .then((result) => {
                if (result) {
                  stableDepsRef.current.addToast(`Authenticated to ${relay.url}`, "success");
                  resolve(true);
                } else {
                  resolve(false);
                }
              })
              .catch((err) => {
                console.error(`[NDKProvider] Authentication failed for ${relay.url}:`, err);
                stableDepsRef.current.addToast(`Authentication failed for ${relay.url}`, "error");
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
          stableDepsRef.current.addToast(`Disconnected from malicious relay: ${relayUrl}`, "error");
          lastToastTime.current = now;
        }
        return;
      }

      if (now - lastToastTime.current > TOAST_THROTTLE) {
        stableDepsRef.current.addToast(`Invalid signature detected from relay: ${relayUrl}`, "error");
        lastToastTime.current = now;
      }
    });

    instance.on("event:publish-failed", (event: NDKEvent, error: Error) => {
      console.error(`Event ${event.id} failed to publish:`, error);
      stableDepsRef.current.addToast(`Failed to publish event. It will be retried automatically.`, "error");
    });

    // We use any casting because some NDK versions emit these events but might not have them in all Type definitions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (instance as any).on("event:published", (event: NDKEvent) => {
      console.log(`Event ${event.id} published successfully!`);
      // Only show success toast for major user-initiated events like kind 1, 0, 3, etc.
      if ([0, 1, 3, 6, 7, 30023].includes(event.kind || -1)) {
        stableDepsRef.current.addToast("Successfully synced with relays", "success", 3000);
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (instance as any).on("local-cache:save", (event: NDKEvent) => {
      console.log(`Event ${event.id} saved to local cache`);
    });

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
      const pubkeys = Array.from(sessionManager.getSessions().keys());
      stableDepsRef.current.setAccounts(pubkeys);

      if (state.activePubkey) {
        const session = sessionManager.activeSession;
        if (session) {
          Promise.resolve().then(() => {
            setActiveSession(session);
            const user = sessionManager.activeUser || instance.getUser({ pubkey: session.pubkey });
            instance.activeUser = user; // Enable automatic mute list fetching
            stableDepsRef.current.setUser(user);
            stableDepsRef.current.setLoginState(true, session.pubkey);
          });
        }
      } else {
        Promise.resolve().then(() => {
          setActiveSession(null);
          instance.activeUser = undefined;
          stableDepsRef.current.setUser(null);
          stableDepsRef.current.setLoginState(false, null);
        });
      }
    });

    const initApp = async () => {
      console.log("[NDKProvider] Initializing App...");
      
      // 1. Try to restore signer from payload (Preferred method)
      if (stableDepsRef.current.signerPayload) {
        try {
          const restoredSigner = await ndkSignerFromPayload(stableDepsRef.current.signerPayload, instance);
          if (restoredSigner) {
            console.log("[NDKProvider] Signer restored from payload");
            instance.signer = restoredSigner;
            // Bunker signers might need to be "readied"
            if (stableDepsRef.current.loginType === 'bunker') {
              restoredSigner.blockUntilReady().catch(e => console.error("Bunker signer failed to ready:", e));
            }
          }
        } catch (e) {
          console.error("Failed to restore signer from payload:", e);
        }
      } 
      // 2. Legacy fallback for Bunker signer
      else if (stableDepsRef.current.loginType === 'bunker' && stableDepsRef.current.bunkerUri) {
        try {
          const signer = NDKNip46Signer.bunker(
            instance, 
            stableDepsRef.current.bunkerUri, 
            stableDepsRef.current.bunkerLocalNsec || undefined
          );
          instance.signer = signer;
          signer.blockUntilReady().catch(e => console.error("Bunker signer failed to ready:", e));
        } catch (e) {
          console.error("Failed to restore Bunker signer (legacy):", e);
        }
      }

      await sessionManager.restore();
      await initWallet(instance);
      setNdk(instance);
      setSync(new NDKSync(instance));
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
              // Publish preferred DM relays for NIP-17 discovery
              syncDMRelays(msgInstance, DEFAULT_RELAYS).catch(() => {});
              
              msgInstance.on("message", (message: NDKMessage) => {
                const currentPubkey = sessionManager.activePubkey;
                if (message.sender?.pubkey !== currentPubkey && message.recipient?.pubkey === currentPubkey) {
                  const isCurrentChat = stableDepsRef.current.activeChatPubkey === message.sender?.pubkey;
                  if (!isCurrentChat) {
                    stableDepsRef.current.incrementUnreadMessagesCount();
                    if (stableDepsRef.current.browserNotificationsEnabled && Notification.permission === "granted") {
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
  }, [initWallet]);

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
    sync,
    relay,
    isReady, 
    isWalletReady, 
    refreshBalance 
  }), [ndk, messenger, sessions, activeSession, sync, relay, isReady, isWalletReady]);

  return (
    <NDKContext.Provider value={contextValue}>
      {children}
    </NDKContext.Provider>
  );
};
