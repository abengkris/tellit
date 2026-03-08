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
  try {
    const zapper = new NDKZapper(target, amount, "msat", { comment, ndk });

    return new Promise((resolve, reject) => {
      let invoiceSent = false;

      // Listen for the invoice event
      zapper.on("ln_invoice", (invoice: { pr: string }) => {
        invoiceSent = true;
        // If NWC is NOT active, we return the invoice immediately for manual/WebLN payment
        if (!ndk.wallet) {
          resolve({ invoice: invoice.pr, alreadyPaid: false });
        }
      });
      
      // Handle potential errors
      zapper.on("notice", (msg: string) => {
        console.warn("Zapper notice:", msg);
      });

      // Start the zap process
      zapper.zap().then((receipt) => {
        // If we have a receipt, it means NDK successfully zapped (likely via NWC)
        if (receipt) {
          resolve({ invoice: null, alreadyPaid: true });
        } else if (!invoiceSent) {
          // Fallback if no receipt and no invoice event yet
          resolve({ invoice: null, alreadyPaid: false });
        }
      }).catch((err) => {
        // If it's a wallet error but we have an invoice, the user can still pay manually
        if (invoiceSent && !ndk.wallet) {
           // already resolved
        } else if (invoiceSent) {
          resolve({ invoice: null, alreadyPaid: false }); // Avoid double resolving if possible
        } else {
          console.error("Zapper.zap error:", err);
          reject(err);
        }
      });
      
      // Safety timeout
      setTimeout(() => {
        if (!invoiceSent) {
          reject(new Error("Zap invoice timeout"));
        }
      }, 20000);
    });
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
