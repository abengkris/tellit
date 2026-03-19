import { NDKEvent, NDKTag } from "@nostr-dev-kit/ndk";

/**
 * The address of the Kind 31990 App Handler event for Tell it!.
 * Format: 31990:<pubkey>:<d-identifier>
 */
const APP_PUBKEY = "5e7ff05d59cb6808762cf1ed5a69ae2a21b8457056652fdc42970d36fc5c31d0";
const APP_IDENTIFIER = "tell-it-web";
const RELAY_HINT = "wss://nos.lol";

/**
 * The standard client tag for "Tell it!".
 * Includes NIP-89 App Handler reference for discovery across the Nostr ecosystem.
 */
export const CLIENT_TAG: NDKTag = [
  "client", 
  "Tell it!", 
  `31990:${APP_PUBKEY}:${APP_IDENTIFIER}`, 
  RELAY_HINT
];

/**
 * Adds the "client" tag to a Nostr event if it doesn't already have one.
 * @param event The NDKEvent to tag
 */
export function addClientTag(event: NDKEvent): void {
  if (!event.tags) {
    event.tags = [CLIENT_TAG];
    return;
  }

  const hasClientTag = event.tags.some(t => t[0] === 'client');
  if (!hasClientTag) {
    event.tags.push(CLIENT_TAG);
  }
}
