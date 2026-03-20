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
  // 0. Ensure we have profile data for the target user if zapping an event or a user
  const targetUser = target instanceof NDKUser ? target : target.author;
  
  if (targetUser && (!targetUser.profile || (!targetUser.profile.lud16 && !targetUser.profile.lud06))) {
    console.log(`[Zap] Profile missing or incomplete for ${targetUser.pubkey}, fetching...`);
    await targetUser.fetchProfile();
  }

  const lud16 = targetUser?.profile?.lud16;
  const lud06 = targetUser?.profile?.lud06;

  if (!lud16 && !lud06) {
    return { 
      invoice: null, 
      alreadyPaid: false, 
      error: "Recipient has no Lightning Address (lud16) or LNURL (lud06). They cannot receive zaps." 
    };
  }

  const tryZap = (wallet?: unknown, timeout = 20000): Promise<{ invoice: string | null; alreadyPaid: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const zapper = new NDKZapper(target, amount, "msat", { comment, ndk });
      
      // Explicitly add tags for addressable events (kind 30000+)
      if (target instanceof NDKEvent) {
        if (target.kind! >= 30000 && target.kind! < 40000) {
          const dTag = target.tags.find(t => t[0] === 'd')?.[1] || "";
          zapper.tags.push(["a", `${target.kind}:${target.pubkey}:${dTag}`]);
        }
        zapper.tags.push(["k", String(target.kind)]);
      }

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
            console.log("[Zap] Zap receipt received via wallet payment");
            isResolved = true;
            resolve({ invoice: null, alreadyPaid: true });
          } else if (capturedInvoice) {
            console.log("[Zap] Zap initiated, invoice captured manually");
            isResolved = true;
            resolve({ invoice: capturedInvoice, alreadyPaid: false });
          } else {
            console.warn("[Zap] NDKZapper.zap() resolved without receipt or invoice");
            isResolved = true;
            resolve({ invoice: null, alreadyPaid: false, error: "No invoice received from LNURL endpoint. Try again later." });
          }
        })
        .catch((err) => {
          if (isResolved) return;
          isResolved = true;
          
          let friendlyError = err?.message || "Zap failed";
          if (friendlyError === "All zap attempts failed") {
            friendlyError = "All attempts failed. This usually means the recipient has no Lightning Address or their wallet is unreachable.";
          }
          
          resolve({ invoice: capturedInvoice, alreadyPaid: false, error: friendlyError });
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
