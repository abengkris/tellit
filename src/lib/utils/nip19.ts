import { nip19 } from "nostr-tools";

/**
 * Decodes a NIP-19 string and returns its ID and any associated relays.
 */
export function decodeNip19(nip19String: string): { 
  id: string; 
  relays?: string[]; 
  kind?: number;
  pubkey?: string;
  identifier?: string;
  author?: string;
} {
  if (!nip19String) return { id: "" };
  
  if (/^[0-9a-fA-F]{64}$/.test(nip19String)) {
    return { id: nip19String };
  }

  try {
    const decoded = nip19.decode(nip19String);
    
    switch (decoded.type) {
      case "npub":
      case "note":
        return { id: decoded.data as string };
      case "nprofile":
        return { id: decoded.data.pubkey, relays: decoded.data.relays, pubkey: decoded.data.pubkey };
      case "nevent":
        return { 
          id: decoded.data.id, 
          relays: decoded.data.relays, 
          kind: decoded.data.kind, 
          author: decoded.data.author,
          pubkey: decoded.data.author 
        };
      case "naddr":
        return { 
          id: decoded.data.identifier, 
          relays: decoded.data.relays, 
          kind: decoded.data.kind, 
          pubkey: decoded.data.pubkey,
          identifier: decoded.data.identifier,
          author: decoded.data.pubkey
        };
      default:
        return { id: nip19String };
    }
  } catch (e) {
    return { id: nip19String };
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
 */
export function toNpub(pubkey: string): string {
  try {
    if (!pubkey || pubkey.startsWith("npub")) return pubkey;
    return nip19.npubEncode(pubkey);
  } catch (e) {
    return pubkey;
  }
}

/**
 * Encodes a pubkey and optional relays into an nprofile.
 */
export function toNProfile(pubkey: string, relays?: string[]): string {
  try {
    return nip19.nprofileEncode({ pubkey, relays });
  } catch (e) {
    return toNpub(pubkey);
  }
}

/**
 * Encodes a hex event ID to note.
 */
export function toNote(eventId: string): string {
  try {
    if (!eventId || eventId.startsWith("note")) return eventId;
    return nip19.noteEncode(eventId);
  } catch (e) {
    return eventId;
  }
}

/**
 * Encodes an event ID, kind, and author into an nevent.
 */
export function toNEvent(id: string, author?: string, kind?: number, relays?: string[]): string {
  try {
    return nip19.neventEncode({ id, author, kind, relays });
  } catch (e) {
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
