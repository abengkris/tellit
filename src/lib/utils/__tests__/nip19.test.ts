import { describe, it, expect } from "vitest";
import { 
  decodeNip19, 
  decodeToHex, 
  toNpub, 
  toNote, 
  shortenPubkey 
} from "../nip19";

describe("NIP-19 Utilities", () => {
  const TEST_PUBKEY = "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245";
  const TEST_NPUB = "npub1xtscya34g58tk0z605fvr788k263gsu6cy9x0mhnm87echrgufzsevkk5s";
  const TEST_NOTE_ID = "0000000000000000000000000000000000000000000000000000000000000001";
  const TEST_NOTE_BECH32 = "note1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqsxthhhz";

  describe("decodeNip19", () => {
    it("should decode npub to hex pubkey", () => {
      const result = decodeNip19(TEST_NPUB);
      expect(result.id).toBe(TEST_PUBKEY);
    });

    it("should decode note to hex id", () => {
      const result = decodeNip19(TEST_NOTE_BECH32);
      expect(result.id).toBe(TEST_NOTE_ID);
    });

    it("should return hex string as is if already hex", () => {
      const result = decodeNip19(TEST_PUBKEY);
      expect(result.id).toBe(TEST_PUBKEY);
    });

    it("should return original string if decoding fails", () => {
      const result = decodeNip19("not-a-nip19");
      expect(result.id).toBe("not-a-nip19");
    });

    it("should return empty id for empty string", () => {
      const result = decodeNip19("");
      expect(result.id).toBe("");
    });
  });

  describe("decodeToHex", () => {
    it("should extract hex from npub", () => {
      expect(decodeToHex(TEST_NPUB)).toBe(TEST_PUBKEY);
    });

    it("should extract hex from note", () => {
      expect(decodeToHex(TEST_NOTE_BECH32)).toBe(TEST_NOTE_ID);
    });
  });

  describe("toNpub", () => {
    it("should encode hex pubkey to npub", () => {
      expect(toNpub(TEST_PUBKEY)).toBe(TEST_NPUB);
    });

    it("should return string if already npub", () => {
      expect(toNpub(TEST_NPUB)).toBe(TEST_NPUB);
    });
  });

  describe("toNote", () => {
    it("should encode hex id to note", () => {
      expect(toNote(TEST_NOTE_ID)).toBe(TEST_NOTE_BECH32);
    });
  });

  describe("shortenPubkey", () => {
    it("should shorten an npub", () => {
      const shortened = shortenPubkey(TEST_NPUB);
      expect(shortened).toContain("…");
      expect(shortened.length).toBeLessThan(TEST_NPUB.length);
    });

    it("should shorten a hex pubkey by converting to npub first", () => {
      const shortened = shortenPubkey(TEST_PUBKEY);
      expect(shortened.startsWith("npub")).toBe(true);
      expect(shortened).toContain("…");
    });

    it("should return empty string for empty input", () => {
      expect(shortenPubkey("")).toBe("");
    });
  });
});
