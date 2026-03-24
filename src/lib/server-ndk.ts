import NDK, { NDKPrivateKeySigner } from "@nostr-dev-kit/ndk";
import { DEFAULT_RELAYS } from "./ndk";
import { ENV } from "./env";

let ndkInstance: NDK | null = null;

export async function getServerNDK(): Promise<NDK> {
  if (!ndkInstance) {
    ndkInstance = new NDK({
      explicitRelayUrls: DEFAULT_RELAYS,
    });

    const nsec = ENV.TELLIT_NSEC;
    if (nsec) {
      try {
        const signer = new NDKPrivateKeySigner(nsec);
        ndkInstance.signer = signer;
        await ndkInstance.connect();
        console.log("[ServerNDK] Connected with TELLIT_NSEC");
      } catch (e) {
        console.error("[ServerNDK] Failed to initialize signer:", e);
      }
    } else {
      console.warn("[ServerNDK] TELLIT_NSEC not set, server actions might fail");
      await ndkInstance.connect();
    }
  }
  return ndkInstance;
}
