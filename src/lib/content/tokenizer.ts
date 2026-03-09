import { nip19 } from "nostr-tools";

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
  decoded?: DecodedRef;  // hasil decode bech32 (jika berlaku)
}

export interface DecodedRef {
  type: "npub" | "nprofile" | "note" | "nevent" | "naddr";
  pubkey?: string;   
  eventId?: string;  
  relays?: string[]; 
  identifier?: string; // for naddr
  kind?: number;       // for naddr
}

// URUTAN KRITIS sesuai hasil investigasi
const PATTERNS: { re: RegExp; type: TokenType }[] = [
  // 1. Nostr references (spesifik -> umum)
  { re: /nostr:nevent1[a-z0-9]+/gi,   type: "note_ref"   },
  { re: /nostr:naddr1[a-z0-9]+/gi,    type: "naddr_ref"  },
  { re: /nostr:nprofile1[a-z0-9]+/gi, type: "mention"    },
  { re: /nostr:note1[a-z0-9]+/gi,     type: "note_ref"   },
  { re: /nostr:npub1[a-z0-9]+/gi,     type: "mention"    },

  // 2. Lightning invoice (SEBELUM URL)
  { re: /\blnbc[a-zA-Z0-9]{20,}\b/g,    type: "lightning"  },

  // 4. Media URLs (SEBELUM URL biasa)
  { re: /https?:\/\/[^\s\])"'<>]+?\.(?:jpg|jpeg|png|gif|webp|avif|svg|jfif)(?:\?\S*)?/gi, type: "image" },
  { re: /https?:\/\/[^\s\])"'<>]+?\.(?:mp4|mov|webm|ogg)(?:\?\S*)?/gi,          type: "video" },
  { re: /https?:\/\/[^\s\])"'<>]+?\.(?:mp3|wav|aac|flac|m4a)(?:\?\S*)?/gi,      type: "audio" },

  // 5. URL biasa
  { re: /https?:\/\/[^\s\])"'<>]+/g,  type: "url"        },

  // 6. Hashtag
  { re: /#[a-zA-Z]\w*/g,              type: "hashtag"    },
];

export function tokenize(content: string): Token[] {
  if (!content) return [];

  interface RawMatch {
    start: number;
    end: number;
    value: string;
    type: TokenType;
  }

  const matches: RawMatch[] = [];

  for (const { re, type } of PATTERNS) {
    re.lastIndex = 0; 
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      matches.push({
        start: m.index,
        end: m.index + m[0].length,
        value: m[0],
        type,
      });
    }
  }

  matches.sort((a, b) => a.start - b.start);

  const filtered: RawMatch[] = [];
  let lastEnd = 0;
  for (const match of matches) {
    if (match.start >= lastEnd) {
      filtered.push(match);
      lastEnd = match.end;
    }
  }

  const tokens: Token[] = [];
  let cursor = 0;

  for (const match of filtered) {
    if (match.start > cursor) {
      const text = content.slice(cursor, match.start);
      tokens.push(...splitByLinebreak(text));
    }

    tokens.push({
      type: match.type,
      value: match.value,
      decoded: decodeRef(match.value, match.type),
    });

    cursor = match.end;
  }

  if (cursor < content.length) {
    tokens.push(...splitByLinebreak(content.slice(cursor)));
  }

  return tokens;
}

function splitByLinebreak(text: string): Token[] {
  const parts = text.split(/(\n)/);
  return parts
    .filter(p => p !== "")
    .map(p => ({
      type: p === "\n" ? "linebreak" : "text",
      value: p,
    } as Token));
}

function decodeRef(value: string, type: TokenType): DecodedRef | undefined {
  if (type !== "mention" && type !== "note_ref" && type !== "naddr_ref") return undefined;

  try {
    const bech32Part = value.replace(/^nostr:/, "");
    const decoded = nip19.decode(bech32Part);

    if (decoded.type === "npub") {
      return { type: "npub", pubkey: decoded.data };
    }
    if (decoded.type === "nprofile") {
      return { type: "nprofile", pubkey: decoded.data.pubkey, relays: decoded.data.relays };
    }
    if (decoded.type === "note") {
      return { type: "note", eventId: decoded.data };
    }
    if (decoded.type === "nevent") {
      return { type: "nevent", eventId: decoded.data.id, relays: decoded.data.relays };
    }
    if (decoded.type === "naddr") {
      return { 
        type: "naddr", 
        pubkey: decoded.data.pubkey, 
        identifier: decoded.data.identifier, 
        kind: decoded.data.kind,
        relays: decoded.data.relays 
      };
    }
  } catch {
    // ignore invalid
  }
  return undefined;
}

/**
 * Resolves NIP-08 #[index] mentions into nostr: references
 */
export function resolveDeprecatedMentions(content: string, tags: string[][]): string {
  return content.replace(/#\[(\d+)\]/g, (match, indexStr) => {
    const index = parseInt(indexStr);
    const tag = tags[index];
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

export interface ImetaData {
  url: string;
  mimeType?: string;
  blurhash?: string;
  dimensions?: { w: number; h: number };
  alt?: string;
  sha256?: string;
  fallbackUrls?: string[];
}

export function parseImeta(tag: string[]): ImetaData | null {
  if (tag[0] !== "imeta") return null;
  const result: Partial<ImetaData> & { url?: string } = {};
  const fallbackUrls: string[] = [];

  for (let i = 1; i < tag.length; i++) {
    const space = tag[i].indexOf(" ");
    if (space === -1) continue;
    const key = tag[i].slice(0, space);
    const val = tag[i].slice(space + 1);

    if (key === "url")       result.url = val;
    if (key === "m")         result.mimeType = val;
    if (key === "blurhash")  result.blurhash = val;
    if (key === "alt")       result.alt = val;
    if (key === "x")         result.sha256 = val;
    if (key === "fallback")  fallbackUrls.push(val);
    if (key === "dim") {
      const [w, h] = val.split("x").map(Number);
      if (w && h) result.dimensions = { w, h };
    }
  }

  if (!result.url) return null;
  return { ...result as ImetaData, fallbackUrls };
}

export function buildImetaMap(tags: string[][]): Map<string, ImetaData> {
  const map = new Map<string, ImetaData>();
  for (const tag of tags) {
    const meta = parseImeta(tag);
    if (meta) map.set(meta.url, meta);
  }
  return map;
}
