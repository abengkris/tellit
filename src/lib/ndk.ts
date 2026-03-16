import NDK, { NDKRelay } from "@nostr-dev-kit/ndk";

export const DEFAULT_RELAYS = [
  "wss://relay.primal.net",
  "wss://nos.lol",
  "wss://relay.damus.io",
  "wss://relay.nostr.band",
  "wss://nostr.wine",
  "wss://relay.snort.social",
  "wss://purple.relayer.org",
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
  }
  return ndkInstance;
}

export async function connectNDK(timeout = 10000): Promise<NDK> {
  const ndk = getNDK();
  await ndk.connect(timeout);
  return ndk;
}
