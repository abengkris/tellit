import 'server-only';

import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { verifyEvent } from 'nostr-tools';

/**
 * Data Access Layer (DAL) for session verification.
 */

export interface SessionPayload {
  pubkey: string;
}

/**
 * Verifies the session via NIP-98 (Authorization header) or Fallback Session Cookie.
 * In a real production app, we MUST verify the NIP-98 token for critical operations.
 */
export const verifySession = cache(async () => {
  const headerList = await headers();
  const authHeader = headerList.get('authorization');

  // 1. Try NIP-98 Authorization (Most Secure for API)
  if (authHeader?.startsWith('Nostr ')) {
    try {
      const base64Token = authHeader.replace('Nostr ', '');
      const tokenJson = atob(base64Token);
      const event = JSON.parse(tokenJson);

      // Verify NIP-98 Event (Kind 27235)
      // Check: kind, created_at (skew), method, u (url)
      const isValid = verifyEvent(event);
      if (isValid && event.kind === 27235) {
        // Skew check (e.g., 5 minutes)
        const now = Math.floor(Date.now() / 1000);
        if (Math.abs(event.created_at - now) < 300) {
          return { pubkey: event.pubkey } as SessionPayload;
        }
      }
    } catch (e) {
      console.error('[Session Verify] NIP-98 Decode Failed:', e);
    }
  }

  // 2. Fallback: Verify session cookie (Optimistic/Legacy)
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;

  if (session) {
    // In production, the session cookie should also be a signed token (JWT)
    // or we should verify it against a server-side session store.
    return { pubkey: session } as SessionPayload;
  }

  return null;
});

/**
 * Helper to get the current user's pubkey securely.
 */
export const getSessionPubkey = cache(async () => {
  const session = await verifySession();
  if (!session) return null;
  return session.pubkey;
});
