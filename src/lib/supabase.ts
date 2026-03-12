import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Robust Supabase client initialization.
 * Prevents build-time crashes if environment variables are missing.
 */
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!supabase) {
  if (process.env.NODE_ENV === 'production') {
    console.warn('Supabase credentials missing. NIP-05 features will be disabled.');
  }
}
