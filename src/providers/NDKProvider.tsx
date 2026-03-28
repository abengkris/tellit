"use client";

import { createContext, useEffect, useLayoutEffect, useState, ReactNode, useRef, useMemo, useCallback } from "react";
import NDK, { NDKCacheAdapter, NDKRelay, NDKNip46Signer, ndkSignerFromPayload, NDKPrivateKeySigner } from "@nostr-dev-kit/ndk";
import { NDKMessenger, CacheModuleStorage } from "@nostr-dev-kit/messages";
import { NDKSessionManager, NDKSession, LocalStorage } from "@nostr-dev-kit/sessions";
import { NDKNWCWallet, NDKCashuWallet, NDKWebLNWallet, NDKNutzapMonitor, NDKWallet } from "@nostr-dev-kit/wallet";
import { NDKSync } from "@nostr-dev-kit/sync";
import { NDKStore } from "@nostrify/ndk";
import { NStore, NostrSigner } from "@nostrify/nostrify";
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";
import { useWalletStore } from "@/store/wallet";
import { getNDK, DEFAULT_RELAYS } from "@/lib/ndk";
import { getSqlStore } from "@/lib/nostrify-sql-store";
import { NostrifyNDKCacheAdapter } from "@/lib/nostrify-ndk-adapter";
import { createSigner } from "@/lib/nostrify-signer";
import { syncDMRelays } from "@/lib/actions/messages";
import { migrateDexieToSql } from "@/lib/sync/db-migration";
import { formatNDKError, NDKErrorType } from "@/lib/error-handler";

type ExtendedCacheAdapter = NDKCacheAdapter & {
  discardUnpublishedEvent?: (eventId: string) => Promise<void>;
};

export interface NDKContextType {
  ndk: NDK | null;
  messenger: NDKMessenger | null;
  sessions: NDKSessionManager | null;
  activeSession: NDKSession | null;
  sync: NDKSync | null;
  relay: NStore | null;
  signer: NostrSigner | null;
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
  signer: null,
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
  const [signer, setSigner] = useState<NostrSigner | null>(null);
  const [nutzapMonitor, setNutzapMonitor] = useState<NDKNutzapMonitor | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isWalletReady, setIsWalletReady] = useState(false);
  
  const { 
    setUser, 
    setLoginState, 
    setAccounts, 
    privateKey, 
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
    nwcPairingCode, 
    cashuMints, 
    walletType, 
    setBalance, 
    setInfo,
    isLocked
  } = useWalletStore();

  const initializingRef = useRef(false);

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
    isLocked,
    privateKey
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
      isLocked,
      privateKey
    });
  }, [setUser, setLoginState, setAccounts, incrementUnreadMessagesCount, addToast, activeChatPubkey, browserNotificationsEnabled, relayAuthStrategy, nwcPairingCode, cashuMints, setBalance, setInfo, walletType, loginType, bunkerUri, bunkerLocalNsec, signerPayload, isLocked, privateKey]);

  const refreshBalance = useCallback(async () => {
    if (!ndk || !ndk.wallet) return;
    try {
      // @ts-expect-error - balance can be getter or method
      const balance = await (typeof ndk.wallet.balance === 'function' ? ndk.wallet.balance() : ndk.wallet.balance);
      if (balance) {

        setBalance(balance.amount);
      }
    } catch (e) {
      console.warn("[NDKProvider] Failed to refresh balance:", e);
    }
  }, [ndk, setBalance]);

  const initWallet = useCallback(async (ndkInstance: NDK) => {
    const { 
      walletType: type, 
      nwcPairingCode: nwc, 
      cashuMints: mints,
      addToast: toast,
      setInfo: setWalletInfo
    } = stableDepsRef.current;

    if (!type || type === "none") return;

    try {
      let wallet: NDKWallet | null = null;

      if (type === "nwc" && nwc) {
        wallet = new NDKNWCWallet(ndkInstance, { pairingCode: nwc });
      } else if (type === "nip-60") {
        wallet = new NDKCashuWallet(ndkInstance);
        if (mints && mints.length > 0) {
          (wallet as NDKCashuWallet).mints = mints;
        }
      } else if (type === "webln") {
        wallet = new NDKWebLNWallet(ndkInstance);
      }

      if (wallet) {
        ndkInstance.wallet = wallet;
        setIsWalletReady(true);
        
        // Fetch balance and info
        // @ts-expect-error - balance can be getter or method
        const balance = await (typeof wallet.balance === 'function' ? wallet.balance() : wallet.balance);
        if (balance) {
          setBalance(balance.amount);
        }

        // @ts-expect-error - info might not be defined on all wallet types
        const info = await wallet.info?.();
        if (info) {
          setWalletInfo(info);
        }

        toast(`Wallet connected: ${type.toUpperCase()}`, "success");
      }

      // If NIP-60, we need to start it
      if (wallet instanceof NDKCashuWallet) {
        wallet.start();
      }

    } catch (err) {
      console.error(`[NDKProvider] Failed to initialize ${type} wallet:`, err);
    }
  }, [setBalance]);

  // Separate effect for wallet pairing code and lock state changes
  useEffect(() => {
    if (ndk) {
      // Use requestAnimationFrame to defer state update and avoid cascading renders
      requestAnimationFrame(() => {
        initWallet(ndk);
      });
    }
  }, [ndk, nwcPairingCode, cashuMints, walletType, isLocked, initWallet]);

  useEffect(() => {
    const { privateKey: pk } = stableDepsRef.current;
    try {
      const s = createSigner({ privateKey: pk || undefined });
      setSigner(s);
    } catch (e) {
      console.warn("[NDKProvider] Failed to create Nostrify signer:", e);
      setSigner(null);
    }
  }, [privateKey]);

  useLayoutEffect(() => {
    if (typeof window === "undefined" || initializingRef.current) return;
    initializingRef.current = true;

    const instance = getNDK();

    // NIP-42 Relay Authentication
    instance.relayAuthDefaultPolicy = async (_relay: NDKRelay, _challenge: string) => {
      const strategy = stableDepsRef.current.relayAuthStrategy;
      if (strategy === 'never') return false;
      if (strategy === 'always') return true;
      
      return true;
    };

    const init = async () => {
      const { 
        setUser: setU, 
        setLoginState: setLS, 
        setAccounts: setA, 
        incrementUnreadMessagesCount: incUnread,
        loginType: lt,
        bunkerUri: bu,
        bunkerLocalNsec: bln,
        signerPayload: sp,
        isLocked: locked
      } = stableDepsRef.current;

      // Don't initialize if locked
      if (locked) {
        setIsReady(false);
        initializingRef.current = false;
        return;
      }

      try {
        if (lt === 'bunker' && bu) {
          const localSigner = bln ? new NDKPrivateKeySigner(bln) : undefined;
          const nip46Signer = new NDKNip46Signer(instance, bu, localSigner);
          instance.signer = nip46Signer;
          
          nip46Signer.on("authUrl", (url) => {
            window.open(url, "_blank", "width=600,height=600");
          });

          await nip46Signer.blockUntilReady();
        } else if (lt === 'nip07') {
          // Extension signer is handled by NDK automatically if available
        } else if (sp) {
          // Manual payload login
          const payloadSigner = await ndkSignerFromPayload(sp);
          if (payloadSigner) {
            instance.signer = payloadSigner;
          }
        }

        await instance.connect(5000);
        
        const currentPubkey = await instance.signer?.user().then(u => u.pubkey);
        if (currentPubkey) {
          const user = instance.getUser({ pubkey: currentPubkey });
          setU(user);
          setLS(true, currentPubkey);
          
          // Try to get multiple accounts if supported
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (typeof window !== "undefined" && (window as any).nostr?.getAccounts) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const accounts = await (window as any).nostr.getAccounts();
              if (accounts) setA(accounts);
            } catch { /* ignore */ }
          }
        }

        // 1. Initialize core NDK instance and cache
        try {
          const sqlStore = await getSqlStore();
          const adapter = new NostrifyNDKCacheAdapter(sqlStore) as ExtendedCacheAdapter;
          instance.cacheAdapter = adapter;
          
          // 1.1 Migrate Dexie data to SQL
          migrateDexieToSql().catch(err => console.error("[NDKProvider] Migration failed:", err));
        } catch (err) {
          console.error("[NDKProvider] Failed to initialize SQL cache adapter:", err);
        }

        setNdk(instance);
        const syncInstance = new NDKSync(instance);
        setSync(syncInstance);
        
        const sessionManager = new NDKSessionManager(instance, { storage: new LocalStorage() });
        setSessions(sessionManager);
        setActiveSession(null);

        setRelay(new NDKStore(instance));

        // Set up messenger
        const currentPubkeyForMsg = await instance.signer?.user().then(u => u.pubkey);
        
        // Setup nutzap monitor
        if (currentPubkeyForMsg) {
          const monitorUser = instance.getUser({ pubkey: currentPubkeyForMsg });
          const monitor = new NDKNutzapMonitor(instance, monitorUser, {});
          setNutzapMonitor(monitor);
        }

        try {
          const storage = (instance.cacheAdapter && currentPubkeyForMsg) 
            ? new CacheModuleStorage(instance.cacheAdapter as unknown as NDKCacheAdapter, currentPubkeyForMsg) 
            : undefined;
          const msgInstance = new NDKMessenger(instance, { storage });
          setMessenger(msgInstance);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          msgInstance.on("message", (message: any) => {
            if (message.pubkey !== currentPubkeyForMsg) {
              incUnread();
            }
          });

          // Perform initial relay sync for DM relays
          syncDMRelays(msgInstance, DEFAULT_RELAYS);

        } catch (e) {
          console.error("[NDKProvider] Failed to init messenger:", e);
        }

        setIsReady(true);
      } catch (err) {
        console.error("[NDKProvider] Initialization failed:", err);
        const formatted = formatNDKError(err as Error, NDKErrorType.PUBLISH_FAILED);
        addToast(formatted.message, "error");
      } finally {
        initializingRef.current = false;
      }
    };

    init();
  }, [addToast]);

  const contextValue = useMemo(() => ({ 
    ndk, 
    messenger, 
    sessions, 
    activeSession, 
    sync,
    relay,
    signer,
    nutzapMonitor,
    isReady, 
    isWalletReady, 
    refreshBalance 
  }), [ndk, messenger, sessions, activeSession, sync, relay, signer, nutzapMonitor, isReady, isWalletReady, refreshBalance]);

  return (
    <NDKContext.Provider value={contextValue}>
      {children}
    </NDKContext.Provider>
  );
};
