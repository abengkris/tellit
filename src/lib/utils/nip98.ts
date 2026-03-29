import NDK, { NDKEvent } from "@nostr-dev-kit/ndk";

/**
 * Generates a NIP-98 Authorization token for an HTTP request.
 * NIP-98: Authentication for HTTP requests using Nostr.
 */
export async function generateNip98Token(
  ndk: NDK,
  url: string,
  method: string,
  body?: any
): Promise<string> {
  if (!ndk.signer) {
    throw new Error("No signer available for NIP-98 token generation");
  }

  const event = new NDKEvent(ndk);
  event.kind = 27235;
  event.content = "";
  event.tags = [
    ["u", url],
    ["method", method.toUpperCase()],
  ];

  // Optional: Add payload hash for POST/PUT requests
  if (body && (method.toUpperCase() === "POST" || method.toUpperCase() === "PUT")) {
    try {
      // In a real implementation, we would hash the body here (SHA-256)
      // For now, NIP-98 works fine without the payload tag for basic auth
    } catch (e) {
      console.warn("[NIP-98] Failed to hash body:", e);
    }
  }

  await event.sign();
  const eventJson = JSON.stringify(event.rawEvent());
  return btoa(eventJson);
}
