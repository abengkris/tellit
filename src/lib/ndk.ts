import NDK, { NDKRelay } from "@nostr-dev-kit/ndk";

export const DEFAULT_RELAYS = [
  "wss://relay.primal.net",
  "wss://nostr.wine",
  "wss://relay.nostr.band",
  "wss://nos.lol",
  "wss://purple.relayer.org",
  "wss://relay.snort.social",
  "wss://relay.damus.io", // Moved to end as fallback
];

let ndkInstance: NDK | null = null;

/**
 * NDK Network Debugging
 */
const netDebug = (msg: string, relay: NDKRelay, direction?: "send" | "recv") => {
  const isEnabled = (typeof window !== "undefined" && localStorage.getItem("debug")?.includes("ndk:net")) ||
                    (typeof process !== "undefined" && process.env.DEBUG?.includes("ndk:net"));

  if (isEnabled) {
    try {
      const hostname = new URL(relay.url).hostname;
      console.debug(`[NDK:${direction?.toUpperCase() || "NET"}] ${hostname}: ${msg}`);
    } catch {
      console.debug(`[NDK:${direction?.toUpperCase() || "NET"}] ${relay.url}: ${msg}`);
    }
  }
};

export function getNDK(): NDK {
  if (!ndkInstance) {
    ndkInstance = new NDK({
      explicitRelayUrls: DEFAULT_RELAYS,
      outboxRelayUrls: ["wss://purplepag.es", "wss://relay.nos.social", "wss://user.kindpag.es"],
      enableOutboxModel: true,
      filterValidationMode: "fix",
      netDebug,
    });

    // Signature Verification Sampling (Speed Optimization)
    // Verify 50% of events initially, scaling down to 5% as trust is established
    ndkInstance.initialValidationRatio = 0.5;
    ndkInstance.lowestValidationRatio = 0.05;

    // Custom validation ratio function for smart sampling
    ndkInstance.validationRatioFn = (relay, validatedEvents, nonValidatedEvents) => {
      // If we've seen enough events from this relay and they're valid, trust it more
      const totalSeen = validatedEvents + nonValidatedEvents;
      if (totalSeen > 1000) return 0.01; // 1% for very high volume trusted relays
      if (totalSeen > 500) return 0.05;  // 5%
      return 0.5; // 50% for new relays
    };

    // Offload signature verification to a Web Worker (Speed Optimization)
    if (typeof window !== "undefined") {
      try {
        // Next.js / Webpack 5 standard way to load workers
        const sigWorker = new Worker(
          new URL("@nostr-dev-kit/ndk/workers/sig-verification", import.meta.url),
          { type: "module" }
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ndkInstance as any).signatureVerificationWorker = sigWorker;
        console.log("[NDK] Signature verification offloaded to Web Worker");
      } catch (e) {
        console.warn("[NDK] Failed to initialize signature verification worker:", e);
      }
    }
  }
  return ndkInstance;
}

export async function connectNDK(timeout = 10000): Promise<NDK> {
  const ndk = getNDK();
  await ndk.connect(timeout);
  return ndk;
}
