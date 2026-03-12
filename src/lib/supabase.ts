import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.TELLIT_SUPABASE_SERVICE_ROLE_KEY;

/**
 * Public client for client-side operations.
 */
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Admin client for server-side operations (bypasses RLS).
 */
export const supabaseAdmin = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Diagnostic log for server-side
if (typeof window === 'undefined') {
  if (!supabaseUrl) console.warn('Supabase: NEXT_PUBLIC_SUPABASE_URL is missing');
  if (!supabaseAnonKey) console.warn('Supabase: NEXT_PUBLIC_SUPABASE_ANON_KEY is missing');
  if (!supabaseServiceKey) console.warn('Supabase: TELLIT_SUPABASE_SERVICE_ROLE_KEY is missing');
}
