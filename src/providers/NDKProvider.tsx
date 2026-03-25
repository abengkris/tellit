"use client";

import { createContext, useEffect, useLayoutEffect, useState, ReactNode, useRef, useMemo, useCallback } from "react";
import NDK, { NDKEvent, NDKCacheAdapter, NDKRelay, NDKRelayAuthPolicies, NDKNip46Signer, ndkSignerFromPayload } from "@nostr-dev-kit/ndk";
import NDKCacheAdapterDexie from "@nostr-dev-kit/ndk-cache-dexie";
import { NDKMessenger, CacheModuleStorage, NDKMessage } from "@nostr-dev-kit/messages";
import { NDKSessionManager, LocalStorage, NDKSession } from "@nostr-dev-kit/sessions";
import { NDKNWCWallet, NDKCashuWallet, NDKWebLNWallet, NDKNutzapMonitor, NDKWallet } from "@nostr-dev-kit/wallet";
import { NDKSync } from "@nostr-dev-kit/sync";
import { NDKStore } from "@nostrify/ndk";
import { NStore } from "@nostrify/nostrify";
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";
import { useWalletStore } from "@/store/wallet";
import { getNDK, DEFAULT_RELAYS } from "@/lib/ndk";
import { syncDMRelays } from "@/lib/actions/messages";
import { WoTServiceLocal } from "@/services/wot.service.local";
import { formatNDKError, NDKErrorType } from "@/lib/error-handler";

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
  nutzapMonitor: NDKNutzapMonitor | null;
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
  nutzapMonitor: null,
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
  const [nutzapMonitor, setNutzapMonitor] = useState<NDKNutzapMonitor | null>(null);
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
    cashuMints,
    setBalance, 
    setInfo,
    isLocked
  } = useWalletStore();
  
  const messengerRef = useRef<NDKMessenger | null>(null);
  const sessionsRef = useRef<NDKSessionManager | null>(null);
  const walletRef = useRef<NDKWallet | null>(null);
  const nutzapMonitorRef = useRef<NDKNutzapMonitor | null>(null);
  const initializingRef = useRef(false);
  const invalidSigCountByRelay = useRef(new Map<string, number>());
  const lastToastTime = useRef(0);

  const initWallet = useCallback(async (instance: NDK) => {
    if (stableDepsRef.current.isLocked) {
      if (instance.wallet) instance.wallet = undefined;
      setIsWalletReady(false);
      walletRef.current = null;
      return;
    }

    const type = stableDepsRef.current.walletType;
    if (type === 'none') {
      if (instance.wallet) instance.wallet = undefined;
      setIsWalletReady(false);
      walletRef.current = null;
      return;
    }

    console.log(`[NDKProvider] Initializing ${type} wallet...`);
    try {
      let wallet: NDKWallet | null = null;

      if (type === 'nwc' && stableDepsRef.current.nwcPairingCode) {
        wallet = new NDKNWCWallet(instance, { 
          pairingCode: stableDepsRef.current.nwcPairingCode,
          timeout: 30000
        });
      } else if (type === 'nip-60') {
        const cashuWallet = new NDKCashuWallet(instance);
        cashuWallet.mints = stableDepsRef.current.cashuMints;
        wallet = cashuWallet;
      } else if (type === 'webln') {
        wallet = new NDKWebLNWallet(instance);
      }

      if (!wallet) return;

      wallet.on("ready", () => {
        console.log(`[NDKProvider] ${type} wallet ready`);
        setIsWalletReady(true);
        walletRef.current = wallet;
        instance.wallet = wallet;
        
        if (nutzapMonitorRef.current) {
          nutzapMonitorRef.current.wallet = wallet;
        }

        stableDepsRef.current.addToast(`${type.toUpperCase()} Wallet connected`, "success");
        
        if (wallet instanceof NDKNWCWallet) {
          wallet.getInfo().then((info) => { if (info) stableDepsRef.current.setInfo(info); }).catch(() => {});
        }
        
        wallet.updateBalance?.().catch(() => {});
      });

      wallet.on("balance_updated", (balance?: { amount: number }) => {
        stableDepsRef.current.setBalance(balance?.amount || 0);
      });

      // @ts-expect-error - transaction event is emitted by NWC and Cashu wallets but might not be in base type
      wallet.on("transaction", (tx) => {
        console.log(`[NDKProvider] Wallet transaction detected:`, tx);
        if (tx.direction === 'in') {
          stableDepsRef.current.addToast(`Received ${tx.amount / 1000} sats!`, "success");
        } else if (tx.direction === 'out') {
          stableDepsRef.current.addToast(`Sent ${tx.amount / 1000} sats`, "info");
        }
        // Refresh balance on any transaction
        wallet.updateBalance?.().catch(() => {});
      });

      // Status check for immediate ready
      if (wallet.status === "ready") {
        setIsWalletReady(true);
        walletRef.current = wallet;
        instance.wallet = wallet;
        wallet.updateBalance?.().catch(() => {});
      }

      // If NIP-60, we need to start it
      if (wallet instanceof NDKCashuWallet) {
        wallet.start();
      }

    } catch (err) {
      console.error(`[NDKProvider] Failed to initialize ${type} wallet:`, err);
    }
  }, []);

  // Separate effect for wallet pairing code and lock state changes
  useEffect(() => {
    if (ndk) {
      // Use requestAnimationFrame to defer state update and avoid cascading renders
      requestAnimationFrame(() => {
        initWallet(ndk);
      });
    }
  }, [ndk, nwcPairingCode, cashuMints, walletType, isLocked, initWallet]);

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
    cashuMints,
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
      cashuMints,
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
      const formatted = formatNDKError(error, NDKErrorType.PUBLISH_FAILED);
      stableDepsRef.current.addToast(formatted.message, "error");
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
            
            // Defer WoT and other non-critical background tasks
            setTimeout(() => {
              // Trigger WoT initialization
              fetch("/api/wot/init", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pubkey: session.pubkey })
              }).catch(err => console.error("[NDKProvider] WoT init failed:", err));

              // Trigger Local WoT sync
              const wotLocal = new WoTServiceLocal(instance);
              wotLocal.startSync(session.pubkey);
            }, 3000);
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
      
      const handleSignerAuth = (url: string) => {
        console.log("[NDKProvider] Signer requested authentication:", url);
        stableDepsRef.current.addToast("Remote signer requires authentication.", "info", 10000, {
          label: "Authorize",
          onClick: () => window.open(url, '_blank')
        });
      };

      // 1. Initialize core NDK instance and cache
      setNdk(instance);
      const syncInstance = new NDKSync(instance);
      setSync(syncInstance);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setRelay(new NDKStore(instance as any));

      // 2. Start session and wallet initialization in parallel
      const sessionPromise = sessionManager.restore();
      const walletPromise = initWallet(instance);

      // 3. Handle signer restoration
      if (stableDepsRef.current.signerPayload) {
        ndkSignerFromPayload(stableDepsRef.current.signerPayload, instance).then((restoredSigner) => {
          if (restoredSigner) {
            console.log("[NDKProvider] Signer restored from payload");
            instance.signer = restoredSigner;
            if (restoredSigner instanceof NDKNip46Signer) restoredSigner.on("auth", handleSignerAuth);
            if (stableDepsRef.current.loginType === 'bunker') {
              restoredSigner.blockUntilReady().catch(e => console.error("Bunker signer failed to ready:", e));
            }
          }
        }).catch(e => console.error("Failed to restore signer from payload:", e));
      } else if (stableDepsRef.current.loginType === 'bunker' && stableDepsRef.current.bunkerUri) {
        try {
          const signer = NDKNip46Signer.bunker(
            instance, 
            stableDepsRef.current.bunkerUri, 
            stableDepsRef.current.bunkerLocalNsec || undefined
          );
          instance.signer = signer;
          signer.on("auth", handleSignerAuth);
          signer.blockUntilReady().catch(e => console.error("Bunker signer failed to ready:", e));
        } catch (e) {
          console.error("Failed to restore Bunker signer (legacy):", e);
        }
      }

      await Promise.all([sessionPromise, walletPromise]);

      const currentPubkey = sessionManager.activePubkey;

      // 4. Background tasks
      if (currentPubkey) {
        const user = instance.getUser({ pubkey: currentPubkey });
        const monitor = new NDKNutzapMonitor(instance, user, {});
        if (walletRef.current) monitor.wallet = walletRef.current;

        monitor.on("redeemed", (events, amount) => {
          console.log(`[NutzapMonitor] Redeemed ${amount} sats from ${events.length} nutzaps`);
          stableDepsRef.current.addToast(`Received ${amount} sats via Nutzap!`, "success");
          walletRef.current?.updateBalance?.();
        });

        monitor.on("failed", (event, error) => {
          console.error("[NutzapMonitor] Nutzap redemption failed", event.id, error);
        });

        nutzapMonitorRef.current = monitor;
        setNutzapMonitor(monitor);

        try {
          const storage = (dexieAdapter && currentPubkey) 
            ? new CacheModuleStorage(dexieAdapter as unknown as NDKCacheAdapter, currentPubkey) 
            : undefined;
          const msgInstance = new NDKMessenger(instance, { storage });
          messengerRef.current = msgInstance;
          setMessenger(msgInstance);
          return msgInstance;
        } catch (e) { console.error("Failed to initialize NDKMessenger:", e); }
      }
      
      return null;
    };

    initApp().then((msgInstance) => {
      console.log("[NDKProvider] App initialized, connecting...");
      const CONNECTION_TIMEOUT = 8000;
      const connectPromise = instance.connect(CONNECTION_TIMEOUT);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), CONNECTION_TIMEOUT));

      // 1. Unblock UI immediately so hooks can start serving from cache
      setIsReady(true);

      let tasksStarted = false;
      const startDeferredTasks = async () => {
        if (tasksStarted) return;
        tasksStarted = true;

        if (sessionManager.activePubkey && msgInstance) {
          try {
            console.log("[NDKProvider] Starting deferred tasks...");
            
            // Start messenger (DM sync)
            await msgInstance.start();
            syncDMRelays(msgInstance, DEFAULT_RELAYS).catch(() => {});
            
            // Background DM sync (Negentropy)
            if (instance.activeUser && sync) {
              const dmFilter = { 
                kinds: [1059, 14], 
                "#p": [instance.activeUser.pubkey],
                since: Math.floor(Date.now() / 1000) - (3 * 24 * 60 * 60) // Reduced to last 3 days
              };
              
              sync.sync(dmFilter, { autoFetch: true }).catch((err) => {
                // Suppress timeout errors in logs as they are intermittent and expected on some relays
                if (err?.message?.includes("timeout") || err?.message?.includes("Timeout")) {
                  console.warn("[NDKProvider] DM sync timed out on one or more relays, will retry on next boot.");
                } else {
                  console.error("[NDKProvider] DM sync failed:", err);
                }
              });
            }

            // Nutzap monitor
            if (nutzapMonitorRef.current) {
              nutzapMonitorRef.current.start({});
            }

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
          } catch (e) { console.error("[NDKProvider] Failed to start deferred tasks:", e); }
        }
      };

      // 2. Start deferred tasks early if connection is taking too long
      const taskTimer = setTimeout(startDeferredTasks, 2500);

      // 3. Connect in background and process unpublished events
      Promise.race([connectPromise, timeoutPromise])
        .then(async () => {
          console.log("[NDKProvider] Connected!");
          if (instance.cacheAdapter && (instance.cacheAdapter as ExtendedCacheAdapter).getUnpublishedEvents) {
            try {
              const unpublished = await (instance.cacheAdapter as ExtendedCacheAdapter).getUnpublishedEvents!();
              if (unpublished && unpublished.length > 0) {
                const seenUnpublishedIds = new Set<string>();
                const now = Math.floor(Date.now() / 1000);
                
                for (const item of unpublished) {
                  const event = item.event;
                  if (!event.id || seenUnpublishedIds.has(event.id)) continue;
                  
                  // Don't retry events created in the last 60 seconds
                  // to avoid racing with the current session's optimistic publishes
                  if (event.created_at && (now - event.created_at < 60)) continue;
                  
                  seenUnpublishedIds.add(event.id);
                  
                  event.ndk = instance;
                  event.publish().catch(() => {});
                }
              }
            } catch { /* ignore */ }
          }
          // Defer heavy non-critical tasks slightly if not already started
          clearTimeout(taskTimer);
          setTimeout(startDeferredTasks, 500);
        })
        .catch(async (err) => { 
          console.warn("[NDKProvider] Connection timeout or error, proceeding anyway:", err.message);
          clearTimeout(taskTimer);
          startDeferredTasks();
        });
    });

    return () => {
      unsubscribeSessions();
      if (messengerRef.current) try { messengerRef.current.destroy(); } catch { /* ignore */ }
      if (nutzapMonitorRef.current) try { nutzapMonitorRef.current.stop(); } catch { /* ignore */ }
      initializingRef.current = false;
    };
  }, [initWallet, ndk, isReady, sync]);

  const refreshBalance = useCallback(async () => {
    if (walletRef.current) {
      try {
        if (typeof walletRef.current.updateBalance === 'function') {
          await walletRef.current.updateBalance();
        }
        
        // After updating (or if no update method), check the balance property
        const balance = walletRef.current.balance;
        if (balance !== undefined && balance !== null) {
          if (typeof balance === 'number') {
            stableDepsRef.current.setBalance(balance);
          } else if (typeof (balance as { amount?: number }).amount === 'number') {
            stableDepsRef.current.setBalance((balance as { amount: number }).amount);
          }
        }
      } catch (err) {
        console.error("[NDKProvider] refreshBalance failed:", err);
      }
    }
  }, []);

  const contextValue = useMemo(() => ({ 
    ndk, 
    messenger, 
    sessions, 
    activeSession, 
    sync,
    relay,
    nutzapMonitor,
    isReady, 
    isWalletReady, 
    refreshBalance 
  }), [ndk, messenger, sessions, activeSession, sync, relay, nutzapMonitor, isReady, isWalletReady, refreshBalance]);

  return (
    <NDKContext.Provider value={contextValue}>
      {children}
    </NDKContext.Provider>
  );
};
