import { ProfileMetadata } from "@/hooks/useProfile";
import { toNpub, getEventNip19 } from "@/lib/utils/nip19";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { idLog } from "./id-logger";

/**
 * List of reserved slugs that cannot be used as vanity usernames.
 * This prevents vanity usernames from conflicting with system routes.
 */
export const RESERVED_SLUGS = new Set([
  "settings",
  "notifications",
  "messages",
  "bookmarks",
  "api",
  "onboarding",
  "suggested",
  "wallet",
  "post",
  "article",
  "login",
  "search",
  "verified",
  "manifest.json",
  "manifest.webmanifest",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "og-image.png",
  "file.svg",
  "globe.svg",
  "next.svg",
  "vercel.svg",
  "window.svg",
  "favicon-16x16.png",
  "favicon-32x32.png",
  "apple-touch-icon.png",
  "android-chrome-192x192.png",
  "android-chrome-512x512.png",
  "error",
  "not-found"
]);

/**
 * Determines the "best" profile URL for a user.
 * Premium users with a @tellit.id NIP-05 get a vanity URL.
 * All others fall back to their npub.
 */
export function getProfileUrl(profile: ProfileMetadata | null | undefined): string {
  if (!profile || !profile.pubkey) return "/";

  // Check if user is a premium Tell it! user
  // nip05 is in the format "username@tellit.id"
  if (profile.nip05 && profile.nip05.endsWith("@tellit.id")) {
    const [username] = profile.nip05.split("@");
    if (username && !RESERVED_SLUGS.has(username.toLowerCase())) {
      const url = `/${username.toLowerCase()}`;
      idLog.debug(`Generated vanity profile URL: ${url}`, { pubkey: profile.pubkey });
      return url;
    }
  }

  // Fallback to npub for all other users
  try {
    const npub = toNpub(profile.pubkey);
    return `/${npub}`;
  } catch {
    return `/${profile.pubkey}`;
  }
}

/**
 * Determines the "best" post URL for an event.
 * Premium users get /username/status/id
 */
export function getPostUrl(event: NDKEvent, profile: ProfileMetadata | null | undefined): string {
  const noteId = getEventNip19(event);
  
  if (profile?.nip05?.endsWith("@tellit.id")) {
    const [username] = profile.nip05.split("@");
    if (username && !RESERVED_SLUGS.has(username.toLowerCase())) {
      return `/${username.toLowerCase()}/status/${noteId}`;
    }
  }

  return `/post/${noteId}`;
}

/**
 * Determines the "best" article URL for an event.
 * Premium users get /username/article/d-tag
 */
export function getArticleUrl(event: NDKEvent, profile: ProfileMetadata | null | undefined): string {
  const naddr = event.encode();
  const dTag = event.tags.find(t => t[0] === 'd')?.[1];
  
  if (profile?.nip05?.endsWith("@tellit.id")) {
    const [username] = profile.nip05.split("@");
    if (username && !RESERVED_SLUGS.has(username.toLowerCase())) {
      // Use d-tag for cleaner URLs if it's a safe slug
      const slug = dTag && !RESERVED_SLUGS.has(dTag.toLowerCase()) ? dTag : naddr;
      return `/${username.toLowerCase()}/article/${slug}`;
    }
  }

  return `/article/${naddr}`;
}

/**
 * Helper to check if a slug is a potential vanity username.
 */
export function isVanitySlug(slug: string): boolean {
  if (!slug) return false;
  
  // Strip leading @ if present
  const cleanSlug = slug.startsWith('@') ? slug.slice(1) : slug;
  if (!cleanSlug) return false;
  
  // If it's a reserved word, it's not a vanity username
  if (RESERVED_SLUGS.has(cleanSlug.toLowerCase())) return false;
  
  // If it's a standard Nostr identifier, it's not a vanity username
  if (cleanSlug.startsWith("npub1") || cleanSlug.startsWith("nprofile1")) return false;
  
  // Otherwise, treat as a potential vanity username
  return true;
}

/**
 * Resolves a vanity username to a hex pubkey using the handles table.
 */
export async function resolveVanitySlug(slug: string): Promise<string | null> {
  
  

  if (!slug || !isVanitySlug(slug)) return null;

  // Strip leading @ if present
  const name = (slug.startsWith('@') ? slug.slice(1) : slug).toLowerCase();

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("handles")
      .select("pubkey")
      .eq("name", name)
      .single();

    if (error || !data) {
      idLog.debug(`Vanity slug resolution failed for: ${name}`, error);
      return null;
    }
    
    idLog.debug(`Resolved vanity slug ${name} to ${data.pubkey}`);
    return data.pubkey;
  } catch (err) {
    idLog.error(`Failed to resolve vanity slug: ${slug}`, err);
    return null;
  }
}

export type HandleTier = 'ultra' | 'premium' | 'standard' | 'none';

/**
 * Checks the tier of a Tell it! handle based on its length.
 * Ultra: 1 character
 * Premium: 2-3 characters
 * Standard: 4+ characters
 */
export function getHandleTier(nip05: string | null | undefined): HandleTier {
  if (!nip05 || !nip05.endsWith("@tellit.id")) return 'none';
  
  const [name] = nip05.split("@");
  if (!name) return 'none';
  
  // 1 character is Ultra
  if (name.length === 1) return 'ultra';
  
  // 2-3 characters is Premium
  if (name.length >= 2 && name.length <= 3) return 'premium';
  
  // 4+ characters is Standard
  return 'standard';
}

