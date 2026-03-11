import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { toast } from "sonner";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export type RelayAuthStrategy = "ask" | "always" | "never";

interface UIState {
  unreadMessagesCount: number;
  activeChatPubkey: string | null;
  wotStrictMode: boolean;
  browserNotificationsEnabled: boolean;
  defaultZapAmount: number;
  hideBalance: boolean;
  relayAuthStrategy: RelayAuthStrategy;
  addToast: (message: string, type?: "success" | "error" | "info", duration?: number, action?: ToastAction) => void;
  setUnreadMessagesCount: (count: number) => void;
  incrementUnreadMessagesCount: () => void;
  setActiveChatPubkey: (pubkey: string | null) => void;
  setWotStrictMode: (enabled: boolean) => void;
  setBrowserNotificationsEnabled: (enabled: boolean) => void;
  setDefaultZapAmount: (amount: number) => void;
  setHideBalance: (hide: boolean) => void;
  setRelayAuthStrategy: (strategy: RelayAuthStrategy) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      unreadMessagesCount: 0,
      activeChatPubkey: null,
      wotStrictMode: false,
      browserNotificationsEnabled: false,
      defaultZapAmount: 21,
      hideBalance: false,
      relayAuthStrategy: "ask",
      addToast: (message, type = "info", duration = 4000, action) => {
        const options = {
          duration,
          action: action ? {
            label: action.label,
            onClick: action.onClick,
          } : undefined,
        };

        switch (type) {
          case "success":
            toast.success(message, options);
            break;
          case "error":
            toast.error(message, options);
            break;
          default:
            toast.info(message, options);
            break;
        }
      },
      setUnreadMessagesCount: (count) => set({ unreadMessagesCount: count }),
      incrementUnreadMessagesCount: () => set((state) => ({ unreadMessagesCount: state.unreadMessagesCount + 1 })),
      setActiveChatPubkey: (pubkey) => set({ activeChatPubkey: pubkey }),
      setWotStrictMode: (enabled) => set({ wotStrictMode: enabled }),
      setBrowserNotificationsEnabled: (enabled) => set({ browserNotificationsEnabled: enabled }),
      setDefaultZapAmount: (amount) => set({ defaultZapAmount: amount }),
      setHideBalance: (hide) => set({ hideBalance: hide }),
      setRelayAuthStrategy: (strategy) => set({ relayAuthStrategy: strategy }),
    }),
    {
      name: "tellit-ui-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        wotStrictMode: state.wotStrictMode,
        browserNotificationsEnabled: state.browserNotificationsEnabled,
        defaultZapAmount: state.defaultZapAmount,
        hideBalance: state.hideBalance,
        relayAuthStrategy: state.relayAuthStrategy,
      }),
    }
  )
);
