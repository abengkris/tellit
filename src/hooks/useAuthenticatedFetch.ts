import { useCallback } from "react";
import { useNDK } from "./useNDK";
import { useAuthStore } from "@/store/auth";
import { generateNip98Token } from "@/lib/utils/nip98";

/**
 * A hook that provides a wrapper around the standard fetch API,
 * automatically signing and adding a NIP-98 Authorization header
 * for all internal API requests.
 */
export function useAuthenticatedFetch() {
  const { ndk, isReady } = useNDK();
  const { isLoggedIn, publicKey } = useAuthStore();

  const authenticatedFetch = useCallback(
    async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method || "GET";

      // Only attempt NIP-98 for local API calls or specific services
      const isInternal = url.startsWith("/") || url.includes(window.location.host);

      if (isInternal && isLoggedIn && ndk && isReady) {
        try {
          // Construct full URL for NIP-98 token (required by spec)
          const fullUrl = url.startsWith("/") ? `${window.location.origin}${url}` : url;
          const token = await generateNip98Token(ndk, fullUrl, method, init?.body);
          
          const headers = new Headers(init?.headers || {});
          headers.set("Authorization", `Nostr ${token}`);
          
          return fetch(input, { ...init, headers });
        } catch (error) {
          console.error("[useAuthenticatedFetch] Failed to generate NIP-98 token:", error);
          // Fallback to normal fetch if NIP-98 signing fails
        }
      }

      return fetch(input, init);
    },
    [ndk, isReady, isLoggedIn, publicKey]
  );

  return authenticatedFetch;
}
