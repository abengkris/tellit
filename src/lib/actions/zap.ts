import NDK, { NDKEvent, NDKUser, NDKZapper, NDKFilter } from "@nostr-dev-kit/ndk";

/**
 * Handle the zap process for a specific event or user.
 * @param ndk The NDK instance
 * @param amount Satoshis to send (in millisatoshis)
 * @param target The event or user to zap
 * @param comment Optional comment
 * @returns An object containing the BOLT11 invoice and whether it was already paid (via NWC)
 */
export const createZapInvoice = async (
  ndk: NDK,
  amount: number, // in millisats
  target: NDKEvent | NDKUser,
  comment: string = ""
): Promise<{ invoice: string | null; alreadyPaid: boolean }> => {
  const tryZap = (wallet?: unknown): Promise<{ invoice: string | null; alreadyPaid: boolean }> => {
    return new Promise((resolve) => {
      const zapper = new NDKZapper(target, amount, "msat", { comment, ndk });
      
      // If we are passing a specific wallet to try
      if (wallet) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (zapper as any).wallet = wallet;
      }

      let capturedInvoice: string | null = null;
      let isResolved = false;

      zapper.on("ln_invoice", (invoice: { pr: string }) => {
        capturedInvoice = invoice.pr;
        // If NO wallet is active (manual mode), resolve immediately
        if (!ndk.wallet && !wallet && !isResolved) {
          isResolved = true;
          resolve({ invoice: invoice.pr, alreadyPaid: false });
        }
      });

      zapper.zap()
        .then((receipt) => {
          if (isResolved) return;
          if (receipt) {
            isResolved = true;
            resolve({ invoice: null, alreadyPaid: true });
          } else {
            isResolved = true;
            resolve({ invoice: capturedInvoice, alreadyPaid: false });
          }
        })
        .catch(() => {
          if (isResolved) return;
          isResolved = true;
          // Return captured invoice so we can try fallback or manual
          resolve({ invoice: capturedInvoice, alreadyPaid: false });
        });

      setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          resolve({ invoice: capturedInvoice, alreadyPaid: false });
        }
      }, 20000);
    });
  };

  try {
    // 1. Try with primary wallet (ndk.wallet)
    const result = await tryZap();
    if (result.alreadyPaid) return result;

    // 2. If primary failed, return the current result (might have invoice)
    return result;
  } catch (error) {
    console.error("Zap error:", error);
    return { invoice: null, alreadyPaid: false };
  }
};

/**
 * Hook or function to listen for zap confirmation (kind:9735)
 */
export function listenForZapReceipt(
  ndk: NDK, 
  targetId: string, 
  onReceipt: (receipt: NDKEvent) => void,
  isUser = false
) {
  const filter: NDKFilter = {
    kinds: [9735],
  };

  if (isUser) {
    filter["#p"] = [targetId];
  } else {
    filter["#e"] = [targetId];
  }

  const sub = ndk.subscribe(filter, { closeOnEose: false });
  sub.on("event", (event: NDKEvent) => {
    onReceipt(event);
  });

  return () => sub.stop();
}
