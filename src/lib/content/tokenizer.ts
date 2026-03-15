import { nip19 } from "@nostr-dev-kit/ndk";

export type TokenType =
  | "text"
  | "mention"       // nostr:npub1 / nostr:nprofile1
  | "note_ref"      // nostr:note1 / nostr:nevent1
  | "naddr_ref"     // nostr:naddr1 (articles)
  | "hashtag"       // #bitcoin
  | "image"         // URL .jpg .png .gif .webp .avif .svg
  | "video"         // URL .mp4 .mov .webm
  | "audio"         // URL .mp3 .wav .aac .flac .m4a
  | "url"           // General URL
  | "lightning"     // lnbc...
  | "linebreak"     // \n
  | "emoji"         // :emoji: (handled via custom logic usually, but kept here for tokenizer flexibility)
  | "nip08";        // #[0] (to be resolved before tokenization)

export interface Token {
  type: TokenType;
  value: string;         // teks asli (raw dari content)
  decoded?: DecodedRef;  // untuk mention/note_ref
}

export interface DecodedRef {
  type: "npub" | "nprofile" | "note" | "nevent" | "naddr";
  pubkey?: string;
  eventId?: string;
  identifier?: string;
  kind?: number;
  relays?: string[];
}

/**
 * Tokenize Nostr content into manageable chunks.
 * Handles mentions, hashtags, media URLs, and lightning invoices.
 */
export function tokenize(content: string): Token[] {
  if (!content) return [];

  // 1. Regex patterns
  // Order matters: more specific first
  const patterns = [
    // Mentions & Note refs (NIP-19)
    /(nostr:(?:npub1|nprofile1|note1|nevent1|naddr1)[0-9a-z]+)/gi,
    // Hashtags
    /(#\w+)/g,
    // Lightning
    /(lnbc[0-9a-z]+1[0-9a-z]+)/gi,
    // URLs (Images/Videos/General)
    /(https?:\/\/[^\s]+)/gi,
    // Linebreaks
    /(\n)/g,
  ];

  const combinedRegex = new RegExp(patterns.map(p => p.source).join("|"), "gi");
  const parts = content.split(combinedRegex);
  const matches = content.match(combinedRegex) || [];

  const tokens: Token[] = [];
  let matchIndex = 0;

  for (const part of parts) {
    if (part === undefined) continue;

    if (matches[matchIndex] === part) {
      // It's a special token
      const value = part;
      let type: TokenType = "text";

      if (value.startsWith("nostr:")) {
        const bech32 = value.split(":")[1].toLowerCase();
        if (bech32.startsWith("npub1") || bech32.startsWith("nprofile1")) type = "mention";
        else if (bech32.startsWith("naddr1")) type = "naddr_ref";
        else type = "note_ref";
      } else if (value.startsWith("#")) {
        type = "hashtag";
      } else if (value.startsWith("lnbc")) {
        type = "lightning";
      } else if (value.match(/\n/)) {
        type = "linebreak";
      } else if (value.match(/^https?:\/\//i)) {
        type = "url"; // will be refined later based on extension
      }

      tokens.push({
        type,
        value,
        decoded: decodeRef(value, type),
      });
      matchIndex++;
    } else if (part !== "") {
      // It's plain text
      tokens.push({ type: "text", value: part });
    }
  }

  return tokens;
}

function decodeRef(value: string, type: TokenType): DecodedRef | undefined {
  if (type !== "mention" && type !== "note_ref" && type !== "naddr_ref") return undefined;

  try {
    const bech32Part = value.replace(/^nostr:/, "");
    const decoded = nip19.decode(bech32Part);

    if (decoded.type === "npub") {
      return { type: "npub", pubkey: decoded.data as string };
    }
    if (decoded.type === "nprofile") {
      const data = decoded.data as { pubkey: string; relays?: string[] };
      return { type: "nprofile", pubkey: data.pubkey, relays: data.relays };
    }
    if (decoded.type === "note") {
      return { type: "note", eventId: decoded.data as string };
    }
    if (decoded.type === "nevent") {
      const data = decoded.data as { id: string; relays?: string[]; author?: string; kind?: number };
      return { type: "nevent", eventId: data.id, relays: data.relays };
    }
    if (decoded.type === "naddr") {
      const data = decoded.data as { identifier: string; pubkey: string; kind: number; relays?: string[] };
      return { 
        type: "naddr", 
        pubkey: data.pubkey, 
        identifier: data.identifier, 
        kind: data.kind,
        relays: data.relays 
      };
    }
  } catch {
    // ignore invalid
  }
  return undefined;
}

/**
 * Resolves NIP-08 mentions (#[0]) using the event tags.
 * Replaces them with nostr:npub1... or nostr:note1... for the tokenizer.
 */
export function resolveDeprecatedMentions(content: string, tags: string[][]): string {
  if (!content || !tags.length) return content;

  return content.replace(/#\[(\d+)\]/g, (match, index) => {
    const i = parseInt(index);
    const tag = tags[i];
    if (!tag) return match;

    if (tag[0] === "p") {
      try {
        return `nostr:${nip19.npubEncode(tag[1])}`;
      } catch { return match; }
    }
    if (tag[0] === "e") {
      try {
        return `nostr:${nip19.noteEncode(tag[1])}`;
      } catch { return match; }
    }
    return match;
  });
}

/**
 * Parses imeta tags (NIP-92) for media information.
 */
export function parseImeta(tag: string[]): { url?: string; blurhash?: string; mimeType?: string; size?: string; dim?: string } | null {
  if (tag[0] !== 'imeta') return null;
  
  const result: Record<string, string> = {};
  for (let i = 1; i < tag.length; i++) {
    const [key, value] = tag[i].split(' ');
    if (key && value) result[key] = value;
    else if (tag[i].includes(' ')) {
        // Fallback for space separated values without explicit split
        const parts = tag[i].split(' ');
        if (parts.length >= 2) result[parts[0]] = parts[1];
    }
  }
  
  return {
    url: result.url,
    blurhash: result.blurhash,
    mimeType: result.m,
    size: result.size,
    dim: result.dim
  };
}

export interface ImetaMetadata {
  url?: string;
  blurhash?: string;
  mimeType?: string;
  size?: string;
  dim?: string;
  dimensions?: { w: number; h: number };
  alt?: string;
}

/**
 * Builds a map of URL -> imeta metadata.
 */
export function buildImetaMap(tags: string[][]): Map<string, ImetaMetadata> {
  const map = new Map<string, ImetaMetadata>();
  tags.forEach(tag => {
    const meta = parseImeta(tag);
    if (meta && meta.url) {
      map.set(meta.url, meta);
    }
  });
  return map;
}
