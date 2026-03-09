import { describe, it, expect, beforeEach } from "vitest";
import { useWalletStore, EncryptedData } from "../wallet";

describe("Wallet Store - NWC & Encryption", () => {
  beforeEach(() => {
    useWalletStore.getState().resetWallet();
  });

  it("should initialize in an unlocked, unconfigured state", () => {
    const state = useWalletStore.getState();
    expect(state.isLocked).toBe(false);
    expect(state.pinHash).toBe(null);
    expect(state.encryptedData).toBe(null);
    expect(state.walletType).toBe('none');
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
    useWalletStore.setState({
      nwcPairingCode: "secret-nwc",
      isLocked: false,
      pinHash: "has-a-pin"
    });

    useWalletStore.getState().lock();

    const state = useWalletStore.getState();
    expect(state.isLocked).toBe(true);
    expect(state.nwcPairingCode).toBe(null);
    expect(state.pinHash).toBe("has-a-pin");
  });

  it("should restore sensitive data when unlocked", () => {
    const secrets: EncryptedData = {
      nwcPairingCode: "restored-nwc"
    };

    useWalletStore.getState().unlock(secrets);

    const state = useWalletStore.getState();
    expect(state.isLocked).toBe(false);
    expect(state.nwcPairingCode).toBe("restored-nwc");
  });

  it("should fully clear everything on reset", () => {
    useWalletStore.setState({
      nwcPairingCode: "secret-nwc",
      pinHash: "some-hash",
      encryptedData: "some-data",
      isLocked: true
    });

    useWalletStore.getState().resetWallet();

    const state = useWalletStore.getState();
    expect(state.nwcPairingCode).toBe(null);
    expect(state.pinHash).toBe(null);
    expect(state.encryptedData).toBe(null);
    expect(state.isLocked).toBe(false);
    expect(state.walletType).toBe('none');
  });
});
