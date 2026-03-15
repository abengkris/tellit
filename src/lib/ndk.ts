import NDK, { NDKRelay } from "@nostr-dev-kit/ndk";

const DEFAULT_RELAYS = [
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
  }
  return ndkInstance;
}

export async function connectNDK(timeout = 10000): Promise<NDK> {
  const ndk = getNDK();
  await ndk.connect(timeout);
  return ndk;
}
