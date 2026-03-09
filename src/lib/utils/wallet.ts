import * as nip06 from "nostr-tools/nip06";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";

/**
 * Generates a new 12-word mnemonic seed phrase.
 */
export function generateMnemonic(): string {
  return nip06.generateSeedWords();
}

/**
 * Validates a mnemonic seed phrase.
 */
export function validateMnemonic(mnemonic: string): boolean {
  return nip06.validateWords(mnemonic);
}

/**
 * Derives a private key from a mnemonic seed phrase.
 * Returns the hex string of the private key.
 */
export function mnemonicToPrivateKey(mnemonic: string): string {
  const bytes = nip06.privateKeyFromSeedWords(mnemonic);
  return bytesToHex(bytes);
}

/**
 * Converts a hex private key to bytes.
 */
export function privateKeyToBytes(hex: string): Uint8Array {
  return hexToBytes(hex);
}
