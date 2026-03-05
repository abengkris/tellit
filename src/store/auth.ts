import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import NDK, { NDKUser, NDKNip07Signer, NDKPrivateKeySigner } from "@nostr-dev-kit/ndk";
import { NDKSessionManager } from "@nostr-dev-kit/sessions";
import { resetWoT } from "@/hooks/useWoT";

interface AuthState {
  user: NDKUser | null;
  publicKey: string | null;
  privateKey: string | null; // For direct key login, though usually discouraged
  isLoggedIn: boolean;
  isLoading: boolean;
  loginType: 'nip07' | 'privateKey' | 'none';
  _hasHydrated: boolean;
  
  setHasHydrated: (state: boolean) => void;
  setLoginState: (isLoggedIn: boolean, publicKey: string | null) => void;
  login: (ndk: NDK, sessions: NDKSessionManager) => Promise<void>;
  loginWithPrivateKey: (ndk: NDK, sessions: NDKSessionManager, privateKey: string) => Promise<void>;
  generateNewKey: (ndk: NDK, sessions: NDKSessionManager) => Promise<string>;
  logout: (sessions: NDKSessionManager | null) => void;
  setUser: (user: NDKUser | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      publicKey: null,
      privateKey: null,
      isLoggedIn: false,
      isLoading: false,
      loginType: 'none',
      _hasHydrated: false,

      setHasHydrated: (state) => set({ _hasHydrated: state }),
      setLoginState: (isLoggedIn, publicKey) => set({ isLoggedIn, publicKey }),
      setUser: (user) => set({ user }),

      login: async (ndk, sessions) => {
        set({ isLoading: true });
        try {
          const signer = new NDKNip07Signer();
          const pubkey = await sessions.login(signer, {
            setActive: true
          });
          
          if (pubkey) {
            set({ 
              publicKey: pubkey, 
              isLoggedIn: true, 
              isLoading: false,
              loginType: 'nip07'
            });
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
            set({ 
              publicKey: pubkey, 
              privateKey: privateKey,
              isLoggedIn: true, 
              isLoading: false,
              loginType: 'privateKey'
            });
          }
        } catch (error) {
          console.error("Private key login failed:", error);
          set({ isLoading: false });
          throw error;
        }
      },

      generateNewKey: async (ndk, sessions) => {
        const { pubkey, signer } = await sessions.createAccount({
          // Automatic setup could be added here
        });
        
        const privateKey = signer.privateKey!;
        
        set({
          publicKey: pubkey,
          privateKey,
          isLoggedIn: true,
          isLoading: false,
          loginType: 'privateKey'
        });
        
        return privateKey;
      },

      logout: (sessions) => {
        resetWoT();
        if (sessions) {
          sessions.logout();
        }
        set({ 
          user: null, 
          publicKey: null, 
          privateKey: null, 
          isLoggedIn: false, 
          loginType: 'none' 
        });
      },
    }),
    {
      name: "tellit-auth",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: (state) => {
        return () => state?.setHasHydrated(true);
      },
      // We don't want to persist the NDKUser object itself as it's complex and has circular refs
      // Instead, we persist the pubkey and re-instantiate if needed (this part is tricky)
      partialize: (state) => ({ 
        publicKey: state.publicKey, 
        privateKey: state.privateKey, 
        isLoggedIn: state.isLoggedIn, 
        loginType: state.loginType 
      }),
    }
  )
);
