/**
 * Reserved usernames that cannot be registered by users.
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
  // Check length
  if (name.length < 3) return { valid: false, error: 'Too short (min 3 characters)' };
  if (name.length > 20) return { valid: false, error: 'Too long (max 20 characters)' };

  // Alphanumeric + underscores only
  const regex = /^[a-z0-9_]+$/;
  if (!regex.test(name)) {
    return { valid: false, error: 'Only lowercase letters, numbers, and underscores allowed' };
  }

  // Check reserved
  if (RESERVED_USERNAMES.has(name)) {
    return { valid: false, error: 'This username is reserved' };
  }

  return { valid: true };
}
