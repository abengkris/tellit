/**
 * Encryption utilities for securing sensitive wallet data using Web Crypto API.
 * Uses AES-GCM for encryption and PBKDF2 for key derivation from a PIN.
 */

/**
 * Encrypts a string using a PIN.
 * @returns A base64 string containing salt, iv, and ciphertext.
 */
export async function encryptData(data: string, pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const key = await deriveKey(pin, salt);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(data)
  );

  const encryptedArray = new Uint8Array(encrypted);
  const result = new Uint8Array(salt.length + iv.length + encryptedArray.length);
  
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(encryptedArray, salt.length + iv.length);
  
  return btoa(String.fromCharCode(...result));
}

/**
 * Decrypts data using a PIN.
 * @throws Error if decryption fails (likely wrong PIN).
 */
export async function decryptData(encodedData: string, pin: string): Promise<string> {
  const decoder = new TextDecoder();
  const encryptedData = new Uint8Array(
    atob(encodedData).split("").map((c) => c.charCodeAt(0))
  );
  
  const salt = encryptedData.slice(0, 16);
  const iv = encryptedData.slice(16, 28);
  const ciphertext = encryptedData.slice(28);
  
  const key = await deriveKey(pin, salt);
  
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    return decoder.decode(decrypted);
  } catch (e) {
    throw new Error("Invalid PIN or corrupted data");
  }
}

/**
 * Derives a cryptographic key from a PIN and salt.
 */
async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const pinKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new Uint8Array(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    pinKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Generates a verification hash to check if a PIN is correct without 
 * having to try decrypting large amounts of data.
 */
export async function hashPin(pin: string, salt?: Uint8Array): Promise<{ hash: string; salt: string }> {
  const encoder = new TextEncoder();
  const s = salt || crypto.getRandomValues(new Uint8Array(16));
  
  const pinKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  
  const hashBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new Uint8Array(s),
      iterations: 100000,
      hash: "SHA-256",
    },
    pinKey,
    256
  );
  
  return {
    hash: btoa(String.fromCharCode(...new Uint8Array(hashBits))),
    salt: btoa(String.fromCharCode(...s))
  };
}
