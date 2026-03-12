import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ENV } from './env';

/**
 * Public client for client-side operations.
 */
export const supabase = (ENV.SUPABASE.URL && ENV.SUPABASE.ANON_KEY) 
  ? createClient(ENV.SUPABASE.URL, ENV.SUPABASE.ANON_KEY)
  : null;

/**
 * Admin client for server-side operations (bypasses RLS).
 */
export const supabaseAdmin = (ENV.SUPABASE.URL && ENV.SUPABASE.SERVICE_KEY)
  ? createClient(ENV.SUPABASE.URL, ENV.SUPABASE.SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

/**
 * Ensures the Supabase Admin client is available or throws a specific error.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    if (!ENV.SUPABASE.URL) throw new Error('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is missing from environment.');
    if (!ENV.SUPABASE.SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY or TELLIT_SUPABASE_SERVICE_ROLE_KEY is missing from environment.');
    throw new Error('Supabase Admin client could not be initialized.');
  }
  return supabaseAdmin;
}

// Diagnostic log for server-side
if (typeof window === 'undefined') {
  if (!ENV.SUPABASE.URL) console.warn('Supabase: NEXT_PUBLIC_SUPABASE_URL is missing');
  if (!ENV.SUPABASE.ANON_KEY) console.warn('Supabase: NEXT_PUBLIC_SUPABASE_ANON_KEY is missing');
  if (!ENV.SUPABASE.SERVICE_KEY) console.warn('Supabase: TELLIT_SUPABASE_SERVICE_ROLE_KEY is missing');
}
