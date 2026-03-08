"use client";

import { createContext, useEffect, useState, ReactNode, useRef } from "react";
import NDK, { NDKEvent, NDKCacheAdapter, NDKRelay, NDKKind, NDKNutzapState, NDKPrivateKeySigner } from "@nostr-dev-kit/ndk";
import NDKCacheAdapterDexie from "@nostr-dev-kit/ndk-cache-dexie";
import { NDKMessenger, CacheModuleStorage, NDKMessage } from "@nostr-dev-kit/messages";
import { NDKSessionManager, LocalStorage, NDKSession } from "@nostr-dev-kit/sessions";
import { NDKNWCWallet, NDKCashuWallet, NDKNutzapMonitor } from "@nostr-dev-kit/wallet";
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";
import { useWalletStore } from "@/store/wallet";
import { getNDK } from "@/lib/ndk";
import { db } from "@/lib/db";

interface ExtendedCacheAdapter extends NDKCacheAdapter {
  getUnpublishedEvents?: () => Promise<{ event: NDKEvent; relays?: string[]; lastTryAt?: number }[]>;
  discardUnpublishedEvent?: (eventId: string) => Promise<void>;
  getAllNutzapStates?: () => Promise<Map<string, NDKNutzapState>>;
  setNutzapState?: (id: string, stateChange: Partial<NDKNutzapState>) => Promise<void>;
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
    cashuMints, 
    cashuPrivateKey,
    setCashuPrivateKey,
    setBalance, 
    setInfo 
  } = useWalletStore();
  
  const messengerRef = useRef<NDKMessenger | null>(null);
  const sessionsRef = useRef<NDKSessionManager | null>(null);
  const nwcRef = useRef<NDKNWCWallet | null>(null);
  const cashuRef = useRef<NDKCashuWallet | null>(null);
  const walletRef = useRef<NDKNWCWallet | NDKCashuWallet | null>(null);
  const monitorRef = useRef<NDKNutzapMonitor | null>(null);

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;

    let dexieAdapter: NDKCacheAdapterDexie | null = null;
    try {
      dexieAdapter = new NDKCacheAdapterDexie({ dbName: "ndk-cache" });
    } catch {
      // Ignore
    }

    const instance = getNDK();
    
    // Set cache adapter if not already set
    if (!instance.cacheAdapter && dexieAdapter) {
      const adapter = dexieAdapter as unknown as ExtendedCacheAdapter;
      
      // Implement Nutzap state persistence methods on the adapter
      adapter.getAllNutzapStates = async () => {
        const states = new Map<string, NDKNutzapState>();
        try {
          const entries = await db.nutzapStates.toArray();
          for (const entry of entries) {
            states.set(entry.id, entry.state as NDKNutzapState);
          }
        } catch {
          // Ignore errors
        }
        return states;
      };

      adapter.setNutzapState = async (id: string, stateChange: Partial<NDKNutzapState>) => {
        try {
          await db.transaction("rw", db.nutzapStates, async () => {
            const existing = await db.nutzapStates.get(id);
            const newState = {
              ...((existing?.state as object) || {}),
              ...stateChange
            } as Partial<NDKNutzapState>;
            
            // Remove the nutzap event object before saving to avoid serialization issues
            if (newState.nutzap) {
              delete newState.nutzap;
            }

            await db.nutzapStates.put({
              id,
              state: newState
            });
          });
        } catch {
          // Ignore errors
        }
      };

      instance.cacheAdapter = adapter;

      // Implement discard method
      adapter.discardUnpublishedEvent = async (eventId: string) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (dexieAdapter && (dexieAdapter as any).db) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const dbInstance = (dexieAdapter as any).db;
            await dbInstance.unpublishedEvents.delete(eventId);
            console.log(`[NDK] Discarded unpublished event: ${eventId}`);
          } catch {
            // Ignore
          }
        }
      };
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

    // Initialize Wallet (NWC or Cashu)
    const initWallet = async () => {
      // 1. Always attempt to init NWC if code exists
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

      // 2. Always attempt to init Cashu if configured
      if (walletType === 'cashu' || (cashuMints && cashuMints.length > 0)) {
        try {
          let cashu: NDKCashuWallet | undefined;
          
          if (instance.signer) {
            const user = await instance.signer.user();
            const event = await instance.fetchEvent({
              kinds: [NDKKind.CashuWallet],
              authors: [user.pubkey]
            });
            
            if (event) {
              console.log("Restoring Cashu wallet from Nostr event");
              cashu = await NDKCashuWallet.from(event);
            }
          }

          if (!cashu && walletType === 'cashu') {
            cashu = new NDKCashuWallet(instance);
            cashu.mints = cashuMints;
          }

          if (cashu) {
            // Ensure we have a stable private key for P2PK
            // 1. Check if wallet already has keys (restored from Nostr)
            const walletKeys = Array.from(cashu.privkeys.values());
            
            if (walletKeys.length > 0) {
              // Sync the restored key to our store for local persistence
              const firstKey = walletKeys[0].privateKey;
              if (firstKey && firstKey !== cashuPrivateKey) {
                setCashuPrivateKey(firstKey);
              }
            } else {
              // Fresh local instance: use store key or generate new one
              let keyToUse = cashuPrivateKey;
              if (!keyToUse) {
                const signer = NDKPrivateKeySigner.generate();
                keyToUse = signer.privateKey;
                setCashuPrivateKey(keyToUse);
              }
              await cashu.addPrivkey(keyToUse);
            }

            cashu.on("ready", () => {
              console.log("Cashu wallet ready");
              if (walletType === 'cashu') {
                addToast("Cashu Wallet active", "success");
                setInfo({ alias: "Cashu Wallet", methods: ["cashuPay"] });
              }

              // Initialize Nutzap Monitor for automated redemption
              if (instance.signer) {
                instance.signer.user().then((user) => {
                  const monitor = new NDKNutzapMonitor(instance, user, {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    store: instance.cacheAdapter as any 
                  });
                  // IMPORTANT: monitor uses cashu wallet even if NWC is primary
                  monitor.wallet = cashu!;
                  monitor.on("redeemed", (nutzap) => {
                    console.log("Nutzap redeemed:", nutzap);
                    addToast(`Received and redeemed a nutzap!`, "success");
                  });
                  monitor.start({}).then(() => {
                    console.log("Nutzap monitor started");
                    monitorRef.current = monitor;
                  }).catch(() => { /* ignore */ });
                });
              }
            });

            cashu.on("balance_updated", (balance?: { amount: number }) => {
              if (walletType === 'cashu') setBalance(balance?.amount || 0);
            });

            cashuRef.current = cashu;
            if (walletType === 'cashu') {
              instance.wallet = cashu;
              walletRef.current = cashu;
            }
            cashu.start();
          }
        } catch (err) {
          console.error("Failed to initialize Cashu wallet:", err);
        }
      }
    };

    // initWallet() is now called inside initApp() after session restore

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
      
      // Now that session is restored, we can init wallets with signer
      await initWallet();
      
      setNdk(instance);

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

          // PROPER RETRY: Run after connection is established
          if (instance.cacheAdapter && (instance.cacheAdapter as ExtendedCacheAdapter).getUnpublishedEvents) {
            try {
              const unpublished = await (instance.cacheAdapter as ExtendedCacheAdapter).getUnpublishedEvents!();
              if (unpublished && unpublished.length > 0) {
                console.log(`[NDK] Found ${unpublished.length} unpublished events in cache. Retrying...`);
                
                for (const item of unpublished) {
                  const event = item.event;
                  event.ndk = instance;
                  
                  event.publish().then((relays) => {
                    if (relays.size > 0) {
                      console.log(`[NDK] Successfully published event ${event.id.slice(0, 8)} (Kind: ${event.kind}) to ${relays.size} relays.`);
                    }
                  }).catch((err) => {
                    console.error(`[NDK] Retry failed for event ${event.id.slice(0, 8)}:`, err.message);
                  });
                }
              }
            } catch (err) {
              console.warn("[NDK] Error during unpublished events fetch:", err);
            }
          }
          
          if (sessionManager.activePubkey && msgInstance) {
            try {
              await msgInstance.start();
              msgInstance.on("message", (message: NDKMessage) => {
                const currentPubkey = sessionManager.activePubkey;
                if (message.sender?.pubkey !== currentPubkey && message.recipient?.pubkey === currentPubkey) {
                  // Use activeChatPubkey from store for more reliable check
                  const isCurrentChat = activeChatPubkey === message.sender?.pubkey;
                  if (!isCurrentChat) {
                    incrementUnreadMessagesCount();

                    // Send browser notification if enabled
                    if (browserNotificationsEnabled && Notification.permission === "granted") {
                      const sender = message.sender;
                      sender.fetchProfile().then(() => {
                        const title = String(sender.profile?.display_name || sender.profile?.name || "New Message");
                        new Notification(title, {
                          body: message.content.slice(0, 100),
                          icon: sender.profile?.picture || "/favicon.ico"
                        });
                      });
                    }
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
            try { await msgInstance.start(); } catch { /* ignore */ }
          }
        });
    });

    return () => {
      unsubscribeSessions();
      if (messengerRef.current) {
        try { messengerRef.current.destroy(); } catch { /* ignore */ }
      }
      if (monitorRef.current) {
        try { monitorRef.current.stop(); } catch { /* ignore */ }
      }
    };
  }, [setUser, setLoginState, incrementUnreadMessagesCount, addToast, activeChatPubkey, browserNotificationsEnabled, nwcPairingCode, cashuMints, setBalance, setInfo, walletType]);

  const refreshBalance = async () => {
    if (walletRef.current) {
      try {
        // NDKNWCWallet might have a getBalance or similar, or it triggers balance_updated automatically
        if (typeof walletRef.current.updateBalance === 'function') {
          await walletRef.current.updateBalance();
        }
      } catch {
        // Ignore
      }
    }
  };

  return (
    <NDKContext.Provider value={{ ndk, messenger, sessions, activeSession, isReady, refreshBalance }}>
      {children}
    </NDKContext.Provider>
  );
};
