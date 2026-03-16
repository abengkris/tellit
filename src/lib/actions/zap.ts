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
): Promise<{ invoice: string | null; alreadyPaid: boolean; error?: string }> => {
  const tryZap = (wallet?: unknown, timeout = 20000): Promise<{ invoice: string | null; alreadyPaid: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const zapper = new NDKZapper(target, amount, "msat", { comment, ndk });
      
      if (wallet) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (zapper as any).wallet = wallet;
      }

      let capturedInvoice: string | null = null;
      let isResolved = false;

      zapper.on("ln_invoice", (invoice: { pr: string }) => {
        capturedInvoice = invoice.pr;
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
        .catch((err) => {
          if (isResolved) return;
          isResolved = true;
          resolve({ invoice: capturedInvoice, alreadyPaid: false, error: err?.message || "Zap failed" });
        });

      setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          resolve({ invoice: capturedInvoice, alreadyPaid: false, error: "Timeout" });
        }
      }, timeout);
    });
  };

  try {
    // 1. Try with primary wallet (ndk.wallet) - 10s timeout for first attempt
    let result = await tryZap(undefined, 10000);
    if (result.alreadyPaid) return result;

    // 2. If it failed with timeout, retry once more with a longer timeout
    if (result.error === "Timeout") {
      console.log("[Zap] First attempt timed out, retrying...");
      result = await tryZap(undefined, 15000);
    }

    return result;
  } catch (error) {
    console.error("Zap error:", error);
    return { invoice: null, alreadyPaid: false, error: "Unexpected error" };
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
