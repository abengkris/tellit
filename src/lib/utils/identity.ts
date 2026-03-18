import { ProfileMetadata } from "@/hooks/useProfile";
import { toNpub } from "@/lib/utils/nip19";
import { getSupabaseAdmin } from "@/lib/supabase";

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
  "manifest.json",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
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
      return `/${username.toLowerCase()}`;
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

    if (error || !data) return null;
    return data.pubkey;
  } catch (err) {
    console.error(`[Identity] Failed to resolve vanity slug: ${slug}`, err);
    return null;
  }
}
