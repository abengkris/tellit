/**
 * Environment variable validation.
 */

export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    if (typeof window === 'undefined') {
      console.error(`Missing required environment variable: ${name}`);
      throw new Error(`Environment variable ${name} is not set.`);
    }
    return '';
  }
  return value;
}

export function getOptionalEnv(name: string): string | undefined {
  return process.env[name];
}

export const ENV = {
  SUPABASE: {
    URL: getOptionalEnv('NEXT_PUBLIC_SUPABASE_URL'),
    ANON_KEY: getOptionalEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    SERVICE_KEY: getOptionalEnv('TELLIT_SUPABASE_SERVICE_ROLE_KEY'),
  },
  BLINK: {
    API_KEY: getOptionalEnv('BLINK_API_KEY'),
    WALLET_ID: getOptionalEnv('BLINK_WALLET_ID'),
  }
};
