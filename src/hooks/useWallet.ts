"use client";

import { useCallback, useMemo } from "react";
import { useNDK } from "./useNDK";
import { useWalletStore } from "@/store/wallet";
import { 
  NDKNWCWallet, 
  NDKCashuWallet, 
  NDKWebLNWallet, 
  NDKWalletTransaction
} from "@nostr-dev-kit/wallet";
import { NDKUser, NDKEvent, LnPaymentInfo } from "@nostr-dev-kit/ndk";
import { useUIStore } from "@/store/ui";

export function useWallet() {
  const { ndk, isReady } = useNDK();
  const { 
    walletType, 
    nwcPairingCode, 
    cashuMints,
    balance, 
    isLocked
  } = useWalletStore();
  const { addToast } = useUIStore();

  const wallet = useMemo(() => {
    if (!ndk || !isReady || isLocked) return null;

    if (walletType === 'nwc' && nwcPairingCode) {
      return new NDKNWCWallet(ndk, { pairingCode: nwcPairingCode });
    }

    if (walletType === 'nip-60') {
      const w = new NDKCashuWallet(ndk);
      w.mints = cashuMints;
      return w;
    }

    if (walletType === 'webln') {
      return new NDKWebLNWallet(ndk);
    }

    return null;
  }, [ndk, isReady, walletType, nwcPairingCode, cashuMints, isLocked]);

  const fetchTransactions = useCallback(async (): Promise<NDKWalletTransaction[]> => {
    if (!wallet) return [];
    try {
      return await wallet.fetchTransactions();
    } catch (err) {
      console.error("[useWallet] Failed to fetch transactions:", err);
      return [];
    }
  }, [wallet]);

  const payInvoice = useCallback(async (bolt11: string): Promise<boolean> => {
    if (!wallet) {
      addToast("No wallet connected", "error");
      return false;
    }

    try {
      addToast("Processing payment...", "info");
      const payment: LnPaymentInfo = { pr: bolt11 };
      const result = await wallet.lnPay(payment);
      
      if (result) {
        addToast("Payment successful!", "success");
        wallet.updateBalance?.();
        return true;
      }
      return false;
    } catch (err) {
      console.error("[useWallet] Payment failed:", err);
      addToast("Payment failed", "error");
      return false;
    }
  }, [wallet, addToast]);

  const makeInvoice = useCallback(async (amountMsat: number, description?: string): Promise<string | null> => {
    if (!wallet) {
      addToast("No wallet connected", "error");
      return null;
    }

    try {
      // Check if wallet supports making invoices
      // @ts-expect-error - makeInvoice might be missing from some NDK types
      if (typeof wallet.makeInvoice !== 'function') {
        addToast("Wallet does not support receiving payments", "error");
        return null;
      }

      // @ts-expect-error - makeInvoice might be missing from some NDK types
      const invoice = await wallet.makeInvoice(amountMsat, description);
      return invoice;
    } catch (err) {
      console.error("[useWallet] Failed to make invoice:", err);
      addToast("Failed to create invoice", "error");
      return null;
    }
  }, [wallet, addToast]);

  const zap = useCallback(async (target: NDKEvent | NDKUser, amount: number, comment?: string): Promise<boolean> => {
    if (!ndk) return false;

    try {
      // Use NDK's native zap method which automatically uses the configured wallet
      // We use any cast as zap might be missing from some NDK type definitions but present at runtime
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const zapResult = await (target as any).zap(amount * 1000, comment);
      if (zapResult) {
        addToast(`Zapped ${amount} sats!`, "success");
        return true;
      }
      return false;
    } catch (err) {
      console.error("[useWallet] Zap failed:", err);
      addToast("Zap failed", "error");
      return false;
    }
  }, [ndk, addToast]);

  return {
    wallet,
    walletType,
    balance,
    isLocked,
    payInvoice,
    makeInvoice,
    zap,
    fetchTransactions,
    refreshBalance: () => wallet?.updateBalance?.()
  };
}
