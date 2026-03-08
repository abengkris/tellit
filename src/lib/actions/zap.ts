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
      let capturedInvoice: string | null = null;
      let isResolved = false;

      // Listen for the invoice event
      zapper.on("ln_invoice", (invoice: { pr: string }) => {
        capturedInvoice = invoice.pr;
        
        // If NWC is NOT active, we resolve immediately with the invoice
        if (!ndk.wallet && !isResolved) {
          isResolved = true;
          resolve({ invoice: invoice.pr, alreadyPaid: false });
        }
      });
      
      // Handle potential errors
      zapper.on("notice", (msg: string) => {
        console.warn("Zapper notice:", msg);
      });

      // Start the zap process
      zapper.zap()
        .then((receipt) => {
          if (isResolved) return;
          
          if (receipt) {
            isResolved = true;
            resolve({ invoice: null, alreadyPaid: true });
          } else {
            // No receipt, but maybe we got an invoice?
            isResolved = true;
            resolve({ invoice: capturedInvoice, alreadyPaid: false });
          }
        })
        .catch((err) => {
          if (isResolved) return;
          
          console.warn("Zapper.zap error (might fallback to manual):", err);
          
          // If we have an invoice, resolve with it so user can pay manually
          if (capturedInvoice) {
            isResolved = true;
            resolve({ invoice: capturedInvoice, alreadyPaid: false });
          } else {
            isResolved = true;
            reject(err);
          }
        });
      
      // Safety timeout
      setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          if (capturedInvoice) {
            resolve({ invoice: capturedInvoice, alreadyPaid: false });
          } else {
            reject(new Error("Zap invoice timeout"));
          }
        }
      }, 30000);
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
