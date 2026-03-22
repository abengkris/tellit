'use server';

import { cookies } from 'next/headers';

/**
 * Server Actions for managing the session cookie.
 */

export async function createSessionCookie(pubkey: string) {
  const cookieStore = await cookies();
  
  // Set the session cookie for 7 days
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  cookieStore.set('session', pubkey, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function deleteSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}
