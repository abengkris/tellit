import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface UIState {
  toasts: Toast[];
  unreadMessagesCount: number;
  activeChatPubkey: string | null;
  wotStrictMode: boolean;
  browserNotificationsEnabled: boolean;
  addToast: (message: string, type?: "success" | "error" | "info") => void;
  removeToast: (id: string) => void;
  setUnreadMessagesCount: (count: number) => void;
  incrementUnreadMessagesCount: () => void;
  setActiveChatPubkey: (pubkey: string | null) => void;
  setWotStrictMode: (enabled: boolean) => void;
  setBrowserNotificationsEnabled: (enabled: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      toasts: [],
      unreadMessagesCount: 0,
      activeChatPubkey: null,
      wotStrictMode: false,
      browserNotificationsEnabled: false,
      addToast: (message, type = "info") => {
        const id = Math.random().toString(36).substring(7);
        set((state) => ({
          toasts: [...state.toasts, { id, message, type }],
        }));
        setTimeout(() => {
          set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
          }));
        }, 3000);
      },
      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),
      setUnreadMessagesCount: (count) => set({ unreadMessagesCount: count }),
      incrementUnreadMessagesCount: () => set((state) => ({ unreadMessagesCount: state.unreadMessagesCount + 1 })),
      setActiveChatPubkey: (pubkey) => set({ activeChatPubkey: pubkey }),
      setWotStrictMode: (enabled) => set({ wotStrictMode: enabled }),
      setBrowserNotificationsEnabled: (enabled) => set({ browserNotificationsEnabled: enabled }),
    }),
    {
      name: "tellit-ui-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        wotStrictMode: state.wotStrictMode,
        browserNotificationsEnabled: state.browserNotificationsEnabled,
      }),
    }
  )
);
