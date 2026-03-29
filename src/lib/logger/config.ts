/**
 * Configuration for the Nostrify NIP-17 Logger.
 */
export interface LoggerConfig {
  /** Private key of the logger sender (hex or nsec). */
  senderNsec: string;
  /** Public key of the log receiver (hex). */
  receiverPubkey: string;
  /** List of relays to use for publishing logs. */
  relays: string[];
  /** Environment name (e.g., 'production', 'staging'). */
  env: string;
}

/**
 * Default relays to use if none are provided.
 */
export const DEFAULT_LOGGER_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.nostr.band",
  "wss://purple.relayer.org"
];

/**
 * Loads logger configuration from environment variables.
 * @returns The logger configuration.
 * @throws Error if required environment variables are missing.
 */
export function loadLoggerConfig(): LoggerConfig {
  const senderNsec = process.env.LOGGER_NSEC;
  const receiverPubkey = process.env.RECEIVER_PUBKEY;
  const env = process.env.NODE_ENV || 'development';
  const customRelays = process.env.LOGGER_RELAYS?.split(',').map(r => r.trim()).filter(Boolean);

  if (!senderNsec) {
    throw new Error("Missing LOGGER_NSEC environment variable");
  }

  if (!receiverPubkey) {
    throw new Error("Missing RECEIVER_PUBKEY environment variable");
  }

  return {
    senderNsec,
    receiverPubkey,
    relays: customRelays && customRelays.length > 0 ? customRelays : DEFAULT_LOGGER_RELAYS,
    env
  };
}
