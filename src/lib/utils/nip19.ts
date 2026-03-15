import { nip19, NDKEvent, NDKUser } from "@nostr-dev-kit/ndk";

/**
 * Decodes a NIP-19 string and returns its ID and any associated relays.
 * Prefers NDK entity methods if you have an NDK instance.
 */
export function decodeNip19(nip19String: string): { 
  id: string; 
  relays?: string[]; 
  kind?: number;
  pubkey?: string;
  identifier?: string;
  author?: string;
  type?: string;
} {
  if (!nip19String) return { id: "" };
  
  const cleanString = nip19String.replace(/^nostr:/, "");
  
  // If it's already a hex string, return it as ID
  if (/^[0-9a-fA-F]{64}$/.test(cleanString)) {
    return { id: cleanString };
  }

  try {
    const decoded = nip19.decode(cleanString);

    switch (decoded.type) {
      case "npub":
        return { id: decoded.data as string, pubkey: decoded.data as string, type: "npub" };
      case "note":
        return { id: decoded.data as string, type: "note" };
      case "nprofile":
        const profileData = decoded.data as { pubkey: string; relays?: string[] };
        return { 
          id: profileData.pubkey, 
          relays: profileData.relays, 
          pubkey: profileData.pubkey,
          type: "nprofile" 
        };
      case "nevent":
        const eventData = decoded.data as { id: string; relays?: string[]; kind?: number; author?: string };
        return { 
          id: eventData.id, 
          relays: eventData.relays, 
          kind: eventData.kind, 
          author: eventData.author,
          pubkey: eventData.author,
          type: "nevent"
        };
      case "naddr":
        const addrData = decoded.data as { identifier: string; pubkey: string; kind: number; relays?: string[] };
        return { 
          id: addrData.identifier, 
          relays: addrData.relays, 
          kind: addrData.kind, 
          pubkey: addrData.pubkey,
          identifier: addrData.identifier,
          author: addrData.pubkey,
          type: "naddr"
        };
      case "nsec":
        return { id: decoded.data as string, type: "nsec" };
      default:
        return { id: cleanString };
    }
  } catch {
    return { id: cleanString };
  }
}


/**
 * Decodes a NIP-19 string (npub, nprofile, note, nevent, naddr) to its hex ID or pubkey.
 * Returns the original string if it's already hex or decoding fails.
 */
export function decodeToHex(nip19String: string): string {
  return decodeNip19(nip19String).id;
}

/**
 * Encodes a hex pubkey to npub.
 * Better: use user.npub if you have an NDKUser instance.
 */
export function toNpub(pubkey: string): string {
  try {
    if (!pubkey || pubkey.startsWith("npub")) return pubkey;
    return nip19.npubEncode(pubkey);
  } catch {
    return pubkey;
  }
}

/**
 * Encodes a pubkey and optional relays into an nprofile.
 */
export function toNProfile(pubkey: string, relays?: string[]): string {
  try {
    return nip19.nprofileEncode({ pubkey, relays });
  } catch {
    return toNpub(pubkey);
  }
}

/**
 * Encodes a hex event ID to note.
 * Better: use event.encode() if you have an NDKEvent instance.
 */
export function toNote(eventId: string): string {
  try {
    if (!eventId || eventId.startsWith("note")) return eventId;
    return nip19.noteEncode(eventId);
  } catch {
    return eventId;
  }
}

/**
 * Encodes an event ID, kind, and author into an nevent.
 */
export function toNEvent(id: string, author?: string, kind?: number, relays?: string[]): string {
  try {
    return nip19.neventEncode({ id, author, kind, relays });
  } catch {
    return toNote(id);
  }
}

/**
 * Shortens a pubkey (npub or hex) for display.
 */
export function shortenPubkey(pubkey: string, length = 8): string {
  if (!pubkey) return "";
  const str = pubkey.startsWith("npub") ? pubkey : toNpub(pubkey);
  if (str.length <= length * 2) return str;
  return `${str.slice(0, length)}…${str.slice(-4)}`;
}

/**
 * Helper to encode an NDK entity properly.
 */
export function encodeEntity(entity: NDKEvent | NDKUser): string {
  if (entity instanceof NDKUser) return entity.npub;
  return entity.encode();
}
