import { describe, it, expect } from "vitest";
import { encryptData, decryptData, hashPin } from "../encryption";

describe("Encryption Utilities", () => {
  const TEST_DATA = "sensitive-wallet-secret";
  const TEST_PIN = "123456";

  it("should encrypt and decrypt data correctly", async () => {
    const encrypted = await encryptData(TEST_DATA, TEST_PIN);
    expect(encrypted).toBeDefined();
    expect(typeof encrypted).toBe("string");
    
    const decrypted = await decryptData(encrypted, TEST_PIN);
    expect(decrypted).toBe(TEST_DATA);
  });

  it("should fail to decrypt with wrong PIN", async () => {
    const encrypted = await encryptData(TEST_DATA, TEST_PIN);
    
    await expect(decryptData(encrypted, "wrong-pin")).rejects.toThrow("Invalid PIN or corrupted data");
  });

  it("should produce different ciphertexts for same data and PIN (due to random IV/salt)", async () => {
    const e1 = await encryptData(TEST_DATA, TEST_PIN);
    const e2 = await encryptData(TEST_DATA, TEST_PIN);
    
    expect(e1).not.toBe(e2);
    
    // Both should still decrypt to same data
    expect(await decryptData(e1, TEST_PIN)).toBe(TEST_DATA);
    expect(await decryptData(e2, TEST_PIN)).toBe(TEST_DATA);
  });

  it("should hash a PIN for verification", async () => {
    const { hash, salt } = await hashPin(TEST_PIN);
    expect(hash).toBeDefined();
    expect(salt).toBeDefined();
    
    // Verify with same salt
    const saltBytes = new Uint8Array(
      atob(salt).split("").map((c) => c.charCodeAt(0))
    );
    const { hash: hash2 } = await hashPin(TEST_PIN, saltBytes);
    expect(hash).toBe(hash2);
    
    // Different PIN same salt should have different hash
    const { hash: hash3 } = await hashPin("654321", saltBytes);
    expect(hash).not.toBe(hash3);
  });
});
