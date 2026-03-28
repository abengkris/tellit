import { validateUsernameRegistration } from './username-validator';

/**
 * Reserved usernames that cannot be registered by users.
 * @deprecated Use validateUsernameRegistration from username-validator.ts for comprehensive checks.
 */
export const RESERVED_USERNAMES = new Set([
  'admin',
  'tellit',
  'support',
  'root',
  'official',
  'verified',
  'help',
  'contact',
  'info',
  'staff',
  'moderator',
  'dev',
  'developer',
  'api',
  'billing',
  'payment',
  'security',
  'legal',
  'terms',
  'privacy',
  'blog',
  'status',
  'test',
  'demo',
]);

/**
 * Validates a username against format rules and reserved list.
 */
export function validateUsername(name: string): { valid: boolean; error?: string } {
  // Use the advanced high-performance validator
  const result = validateUsernameRegistration(name);
  
  if (!result.valid) {
    return { valid: false, error: result.error };
  }

  // We no longer block reserved names entirely, we just charge more for them
  // unless they are critically restricted (to be defined if needed)

  return { valid: true };
}

/**
 * Pricing tiers in Satoshi
 */
export const PRICING = {
  STANDARD: 10000,
  PREMIUM: 50000,
  ULTRA: 100000
};

/**
 * Calculates the price for a handle based on its name.
 */
export function calculateHandlePrice(name: string): number {
  const normalized = name.toLowerCase();

  // 1. Reserved/Ultra Tier (1 character, or specific reserved words)
  if (normalized.length === 1 || RESERVED_USERNAMES.has(normalized)) {
    return PRICING.ULTRA;
  }

  // 2. Premium Tier (2 to 3 characters)
  if (normalized.length >= 2 && normalized.length <= 3) {
    return PRICING.PREMIUM;
  }

  // 3. Standard Tier (4 or more characters)
  return PRICING.STANDARD;
}
