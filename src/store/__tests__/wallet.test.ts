import { describe, it, expect, beforeEach } from "vitest";
import { useWalletStore, EncryptedData } from "../wallet";

describe("Wallet Store - Encryption", () => {
  beforeEach(() => {
    useWalletStore.getState().resetWallet();
  });

  it("should initialize in an unlocked, unconfigured state", () => {
    const state = useWalletStore.getState();
    expect(state.isLocked).toBe(false);
    expect(state.pinHash).toBe(null);
    expect(state.encryptedData).toBe(null);
  });

  it("should handle setPin correctly", () => {
    const mockHash = "mock-hash";
    const mockSalt = "mock-salt";
    const mockEncrypted = "mock-encrypted-blob";
    
    useWalletStore.getState().setPin(mockHash, mockSalt, mockEncrypted);
    
    const state = useWalletStore.getState();
    expect(state.pinHash).toBe(mockHash);
    expect(state.pinSalt).toBe(mockSalt);
    expect(state.encryptedData).toBe(mockEncrypted);
    expect(state.isLocked).toBe(false);
  });

  it("should clear sensitive data when locked", () => {
    // 1. Setup an unlocked state with data
    useWalletStore.setState({
      nwcPairingCode: "secret-nwc",
      cashuPrivateKey: "secret-pk",
      isLocked: false,
      pinHash: "has-a-pin"
    });

    // 2. Lock it
    useWalletStore.getState().lock();

    const state = useWalletStore.getState();
    expect(state.isLocked).toBe(true);
    expect(state.nwcPairingCode).toBe(null);
    expect(state.cashuPrivateKey).toBe(null);
    expect(state.pinHash).toBe("has-a-pin"); // Meta-data stays
  });

  it("should restore sensitive data when unlocked", () => {
    const secrets: EncryptedData = {
      nwcPairingCode: "restored-nwc",
      cashuPrivateKey: "restored-pk"
    };

    useWalletStore.getState().unlock(secrets);

    const state = useWalletStore.getState();
    expect(state.isLocked).toBe(false);
    expect(state.nwcPairingCode).toBe("restored-nwc");
    expect(state.cashuPrivateKey).toBe("restored-pk");
  });

  it("should fully clear everything on reset", () => {
    useWalletStore.setState({
      pinHash: "some-hash",
      encryptedData: "some-data",
      isLocked: true
    });

    useWalletStore.getState().resetWallet();

    const state = useWalletStore.getState();
    expect(state.pinHash).toBe(null);
    expect(state.encryptedData).toBe(null);
    expect(state.isLocked).toBe(false);
  });
});
