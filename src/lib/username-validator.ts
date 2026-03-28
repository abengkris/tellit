/**
 * Username Registration Validator (NIP-05 Blacklist/Reserve List)
 * Highly scalable, high-performance validator for prevent cybersquatting, impersonation, and profanity.
 * Fully compatible with Next.js Edge Runtime.
 */

// --- Categories ---

const SYSTEM_RESERVED = [
  'admin', 'root', 'support', 'help', 'system', 'security', 'official', 'tellit', 
  'nostr', 'bitcoin', 'btc', 'lightning', 'satoshi', 'nakamoto', 'zap', 'relay', 
  'nip05', 'wallet', 'sats', 'staff', 'moderator', 'dev', 'developer', 'api', 
  'billing', 'payment', 'legal', 'terms', 'privacy', 'blog', 'status', 'test', 'demo',
  'verify', 'verified', 'check', 'notification', 'alert', 'message', 'mail', 'email'
];

const PROTECTED_IP = [
  'abeng', 'abengisme', 'bambang', 'kristianto', 'wordstr', 'pegadaianrasa', 
  'hantudidalammesin', 'ivana', 'caroline', 'sirait', 'meins'
];

const BRANDS = [
  'apple', 'google', 'microsoft', 'meta', 'facebook', 'instagram', 'whatsapp', 
  'x', 'twitter', 'tesla', 'gojek', 'tokopedia', 'shopee', 'bca', 'mandiri', 
  'bri', 'telkomsel', 'grab', 'dana', 'ovo', 'linkaja', 'amazon', 'netflix', 'disney'
];

const PUBLIC_FIGURES = [
  'presiden', 'menteri', 'kominfo', 'polri', 'kpk', 'tni', 'jokowi', 'prabowo', 
  'gibran', 'elonmusk', 'jackdorsey', 'saylor', 'vitalik', 'zuckerberg', 'anies', 'ganjar'
];

const PROFANITY_EN = [
  'porn', 'nsfw', 'xxx', 'onlyfans', 'fuck', 'shit', 'piss', 'cunt', 'bitch', 
  'asshole', 'dick', 'pussy', 'cock', 'bastard', 'slut', 'whore', 'faggot', 'nigger'
];

const PROFANITY_ID = [
  'anjing', 'babi', 'bangsat', 'kontol', 'memek', 'jembut', 'ngentot', 'dancok', 
  'asu', 'kampret', 'pepek', 'lante', 'jablay', 'bencong', 'maho', 'setan', 'iblis',
  'lonte', 'perek', 'itil', 'pelacur', 'bokep', 'sange', 'coli', 'tetek', 'toket',
  'judi', 'slot', 'gacor', 'togel', 'narkoba', 'sabu', 'shabu', 'cimeng', 'ganja'
];

const ALL_FORBIDDEN = [
  ...SYSTEM_RESERVED,
  ...PROTECTED_IP,
  ...BRANDS,
  ...PUBLIC_FIGURES,
  ...PROFANITY_EN,
  ...PROFANITY_ID
];

// --- Leetspeak Normalization ---

const LEET_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '@': 'a',
  '$': 's',
  '!': 'i',
  '|': 'i',
  '(': 'c',
  '[': 'c',
  '{': 'c',
  '#': 's',
  'v': 'u', // common in some variations
};

/**
 * Normalizes a string by converting leetspeak characters to their base counterparts.
 */
export function normalizeUsername(name: string): string {
  const normalized = name.toLowerCase();
  let result = '';
  for (const char of normalized) {
    result += LEET_MAP[char] || char;
  }
  return result;
}

// --- Bloom Filter Implementation (Edge Compatible) ---

/**
 * A lightweight Bloom Filter for O(k) membership testing.
 * size: Number of bits in the filter.
 * k: Number of hash functions.
 */
export class BloomFilter {
  private bits: Uint32Array;
  private size: number;
  private k: number;

  constructor(size: number, k: number) {
    this.size = size;
    this.k = k;
    this.bits = new Uint32Array(Math.ceil(size / 32));
  }

  private hash(str: string, seed: number): number {
    let h = seed;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 0x5bd1e995);
      h ^= h >>> 15;
    }
    return (h >>> 0) % this.size;
  }

  add(str: string) {
    for (let i = 0; i < this.k; i++) {
      const idx = this.hash(str, i);
      this.bits[idx >>> 5] |= 1 << (idx & 31);
    }
  }

  has(str: string): boolean {
    for (let i = 0; i < this.k; i++) {
      const idx = this.hash(str, i);
      if (!(this.bits[idx >>> 5] & (1 << (idx & 31)))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Serializes the filter to a base64 string for storage or middleware injection.
   */
  serialize(): string {
    return btoa(String.fromCharCode(...new Uint8Array(this.bits.buffer)));
  }

  /**
   * Deserializes the filter from a base64 string.
   */
  static deserialize(data: string, size: number, k: number): BloomFilter {
    const bf = new BloomFilter(size, k);
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    bf.bits = new Uint32Array(bytes.buffer);
    return bf;
  }
}

// --- Validator Singleton/Utility ---

const BLACKLIST_SET = new Set(ALL_FORBIDDEN);
const BLOOM_FILTER = new BloomFilter(8192, 7);

// Initialize Bloom Filter
ALL_FORBIDDEN.forEach(word => BLOOM_FILTER.add(word));

export interface ValidationResult {
  valid: boolean;
  reason?: 'reserved' | 'impersonation' | 'profanity' | 'invalid_format' | 'taken';
  error?: string;
}

const HIGH_RISK_WORDS = ['admin', 'tellit', 'nostr', 'official', 'support', 'verified', 'system'];

/**
 * High-performance username validator.
 */
export function validateUsernameRegistration(name: string): ValidationResult {
  // 1. Basic Format Check
  if (name.length < 1) return { valid: false, reason: 'invalid_format', error: 'Too short' };
  if (name.length > 20) return { valid: false, reason: 'invalid_format', error: 'Too long' };
  
  const regex = /^[a-z0-9_]+$/;
  if (!regex.test(name)) {
    return { valid: false, reason: 'invalid_format', error: 'Only a-z, 0-9, and underscores allowed' };
  }

  // 2. Normalized Leetspeak Check
  const normalized = normalizeUsername(name);

  // High-risk substring check
  for (const word of HIGH_RISK_WORDS) {
    if (normalized.includes(word)) {
      return { valid: false, reason: 'reserved', error: `Username cannot contain restricted word "${word}"` };
    }
  }

  // Fast-path Bloom Filter
  if (!BLOOM_FILTER.has(normalized)) {
    return { valid: true };
  }

  // Exact Check against Blacklist Set (Zero False Positives)
  if (BLACKLIST_SET.has(normalized)) {
    // Categorize for better error messages
    if (SYSTEM_RESERVED.includes(normalized)) return { valid: false, reason: 'reserved', error: 'System reserved name' };
    if (PROTECTED_IP.includes(normalized) || BRANDS.includes(normalized) || PUBLIC_FIGURES.includes(normalized)) {
      return { valid: false, reason: 'impersonation', error: 'Reserved or protected name' };
    }
    if (PROFANITY_EN.includes(normalized) || PROFANITY_ID.includes(normalized)) {
      return { valid: false, reason: 'profanity', error: 'Username contains restricted language' };
    }
    return { valid: false, reason: 'reserved', error: 'Username is not available' };
  }

  return { valid: true };
}
