import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import NDK, { NDKUser, NDKNip07Signer, NDKPrivateKeySigner, NDKNip46Signer } from "@nostr-dev-kit/ndk";
import { NDKSessionManager } from "@nostr-dev-kit/sessions";
import { createSessionCookie, deleteSessionCookie } from "@/lib/actions/auth";
import { useWalletStore } from "./wallet";

interface AuthState {
  user: NDKUser | null;
  publicKey: string | null;
  privateKey: string | null; 
  bunkerUri: string | null;
  bunkerLocalNsec: string | null;
  signerPayload: string | null; // Serialized signer for persistence
  accounts: string[]; // Array of public keys
  isLoggedIn: boolean;
  isLoading: boolean;
  loginType: 'nip07' | 'privateKey' | 'bunker' | 'none';
  _hasHydrated: boolean;
  
  setHasHydrated: (state: boolean) => void;
  setLoginState: (isLoggedIn: boolean, publicKey: string | null) => void;
  setAccounts: (accounts: string[]) => void;
  login: (ndk: NDK, sessions: NDKSessionManager) => Promise<void>;
  loginWithPrivateKey: (ndk: NDK, sessions: NDKSessionManager, privateKey: string) => Promise<void>;
  loginWithNcryptsec: (ndk: NDK, sessions: NDKSessionManager, ncryptsec: string, password: string) => Promise<void>;
  loginWithBunker: (ndk: NDK, sessions: NDKSessionManager, bunkerUri: string, localNsec?: string) => Promise<void>;
  generateNewKey: (ndk: NDK, sessions: NDKSessionManager) => Promise<string>;
  switchAccount: (pubkey: string, sessions: NDKSessionManager) => Promise<void>;
  removeAccount: (pubkey: string, sessions: NDKSessionManager) => Promise<void>;
  logout: (sessions: NDKSessionManager | null) => Promise<void>;
  logoutAll: (sessions: NDKSessionManager | null) => Promise<void>;
  setUser: (user: NDKUser | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      publicKey: null,
      privateKey: null,
      bunkerUri: null,
      bunkerLocalNsec: null,
      signerPayload: null,
      accounts: [],
      isLoggedIn: false,
      isLoading: false,
      loginType: 'none',
      _hasHydrated: false,

      setHasHydrated: (state) => set({ _hasHydrated: state }),
      setLoginState: (isLoggedIn, publicKey) => set({ isLoggedIn, publicKey }),
      setUser: (user) => set({ user }),
      setAccounts: (accounts) => set({ accounts }),

      login: async (ndk, sessions) => {
        set({ isLoading: true });
        try {
          const signer = new NDKNip07Signer();
          const pubkey = await sessions.login(signer, {
            setActive: true
          });
          
          if (pubkey) {
            const currentAccounts = get().accounts;
            const newAccounts = currentAccounts.includes(pubkey) 
              ? currentAccounts 
              : [...currentAccounts, pubkey];
              
            set({ 
              publicKey: pubkey, 
              accounts: newAccounts,
              isLoggedIn: true, 
              isLoading: false,
              loginType: 'nip07',
              signerPayload: signer.toPayload()
            });
            await createSessionCookie(pubkey);
          }
        } catch (error) {
          console.error("NIP-07 login failed:", error);
          set({ isLoading: false });
          throw error;
        }
      },

      loginWithPrivateKey: async (ndk, sessions, privateKey) => {
        set({ isLoading: true });
        try {
          const signer = new NDKPrivateKeySigner(privateKey);
          const pubkey = await sessions.login(signer, {
            setActive: true
          });

          if (pubkey) {
            const currentAccounts = get().accounts;
            const newAccounts = currentAccounts.includes(pubkey) 
              ? currentAccounts 
              : [...currentAccounts, pubkey];

            set({ 
              publicKey: pubkey, 
              privateKey: privateKey,
              accounts: newAccounts,
              isLoggedIn: true, 
              isLoading: false,
              loginType: 'privateKey',
              signerPayload: signer.toPayload()
            });
            await createSessionCookie(pubkey);
          }
        } catch (error) {
          console.error("Private key login failed:", error);
          set({ isLoading: false });
          throw error;
        }
      },

      loginWithNcryptsec: async (ndk, sessions, ncryptsec, password) => {
        set({ isLoading: true });
        try {
          const signer = NDKPrivateKeySigner.fromNcryptsec(ncryptsec, password);
          const privateKey = signer.privateKey!;
          
          const pubkey = await sessions.login(signer, {
            setActive: true
          });

          if (pubkey) {
            const currentAccounts = get().accounts;
            const newAccounts = currentAccounts.includes(pubkey) 
              ? currentAccounts 
              : [...currentAccounts, pubkey];

            set({ 
              publicKey: pubkey, 
              privateKey: privateKey,
              accounts: newAccounts,
              isLoggedIn: true, 
              isLoading: false,
              loginType: 'privateKey',
              signerPayload: signer.toPayload()
            });
            await createSessionCookie(pubkey);
          }
        } catch (error) {
          console.error("Ncryptsec login failed:", error);
          set({ isLoading: false });
          throw error;
        }
      },

      loginWithBunker: async (ndk, sessions, bunkerUri, localNsec) => {
        set({ isLoading: true });
        try {
          const signer = NDKNip46Signer.bunker(ndk, bunkerUri, localNsec);
          
          signer.on("auth", (url: string) => {
            window.open(url, '_blank');
          });

          const user = await signer.blockUntilReady();
          const pubkey = user.pubkey;

          if (pubkey) {
            const pubkey = await sessions.login(signer, {
              setActive: true
            });

            const currentAccounts = get().accounts;
            const newAccounts = currentAccounts.includes(pubkey) 
              ? currentAccounts 
              : [...currentAccounts, pubkey];

            set({ 
              publicKey: pubkey, 
              bunkerUri: bunkerUri,
              bunkerLocalNsec: signer.localSigner?.nsec || localNsec || null,
              accounts: newAccounts,
              isLoggedIn: true, 
              isLoading: false,
              loginType: 'bunker',
              signerPayload: signer.toPayload()
            });
            await createSessionCookie(pubkey);
          }
        } catch (error) {
          console.error("Bunker login failed:", error);
          set({ isLoading: false });
          throw error;
        }
      },

      generateNewKey: async (ndk, sessions) => {
        const { signer } = await sessions.createAccount({});
        
        const user = await signer.user();
        const pubkey = user.pubkey;
        const privateKey = signer.privateKey!;
        
        const currentAccounts = get().accounts;
        const newAccounts = [...currentAccounts, pubkey];

        set({
          publicKey: pubkey,
          privateKey,
          accounts: newAccounts,
          isLoggedIn: true,
          isLoading: false,
          loginType: 'privateKey',
          signerPayload: signer.toPayload()
        });
        await createSessionCookie(pubkey);
        
        return privateKey;
      },

      switchAccount: async (pubkey, sessions) => {
        set({ isLoading: true });
        try {
          await sessions.switchTo(pubkey);
          set({ isLoading: false });
        } catch (error) {
          console.error("Failed to switch account:", error);
          set({ isLoading: false });
          throw error;
        }
      },

      removeAccount: async (pubkey, sessions) => {
        sessions.logout(pubkey);
        const newAccounts = get().accounts.filter(a => a !== pubkey);
        
        if (get().publicKey === pubkey) {
          useWalletStore.getState().resetWallet();
          set({ 
            user: null, 
            publicKey: null, 
            privateKey: null, 
            bunkerUri: null,
            bunkerLocalNsec: null,
            signerPayload: null,
            isLoggedIn: false, 
            loginType: 'none' 
          });
          await deleteSessionCookie();
        }
        
        set({ accounts: newAccounts });
      },

      logout: async (sessions) => {
        useWalletStore.getState().resetWallet();
        if (sessions) {
          sessions.logout();
        }
        set({ 
          user: null, 
          publicKey: null, 
          privateKey: null, 
          bunkerUri: null,
          bunkerLocalNsec: null,
          signerPayload: null,
          isLoggedIn: false, 
          loginType: 'none' 
        });
        await deleteSessionCookie();
      },

      logoutAll: async (sessions) => {
        useWalletStore.getState().resetWallet();
        if (sessions) {
          const pubkeys = Array.from(sessions.getSessions().keys());
          pubkeys.forEach(pk => sessions.logout(pk));
        }
        set({ 
          user: null, 
          publicKey: null, 
          privateKey: null, 
          bunkerUri: null,
          bunkerLocalNsec: null,
          signerPayload: null,
          accounts: [],
          isLoggedIn: false, 
          loginType: 'none' 
        });
        await deleteSessionCookie();
      },
    }),
    {
      name: "tellit-auth",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: (state) => {
        return () => state?.setHasHydrated(true);
      },
      partialize: (state) => ({ 
        publicKey: state.publicKey, 
        privateKey: state.privateKey, 
        bunkerUri: state.bunkerUri,
        bunkerLocalNsec: state.bunkerLocalNsec,
        signerPayload: state.signerPayload,
        accounts: state.accounts,
        isLoggedIn: state.isLoggedIn, 
        loginType: state.loginType 
      }),
    }
  )
);
