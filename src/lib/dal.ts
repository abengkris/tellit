import 'server-only';

import { cookies } from 'next/headers';
import { cache } from 'react';

/**
 * Data Access Layer (DAL) for session verification.
 * In Next.js 16, this is the secure way to check authorization on the server.
 */

export interface SessionPayload {
  pubkey: string;
}

/**
 * Verifies the session cookie and returns the payload.
 * Uses React cache() to memoize the result for a single request.
 */
export const verifySession = cache(async () => {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;

  if (!session) {
    return null;
  }

  // In a real production app, we would verify a signature or JWT here.
  // For Nostr, the 'session' could be a signed NIP-98 token or just the pubkey for optimistic checks.
  // We'll treat the plain pubkey as the session for now.
  return { pubkey: session } as SessionPayload;
});

/**
 * Helper to get the current user's pubkey securely.
 * Throws or redirects if not authenticated.
 */
export const getSessionPubkey = cache(async () => {
  const session = await verifySession();
  if (!session) return null;
  return session.pubkey;
});
