import { describe, it, expect, beforeEach } from "vitest";
import { useWalletStore } from "../wallet";

describe("Wallet Store", () => {
  beforeEach(() => {
    useWalletStore.getState().resetWallet();
  });

  it("should have initial state", () => {
    const state = useWalletStore.getState();
    expect(state.walletType).toBe('none');
    expect(state.balance).toBe(null);
    expect(state.cashuMints).toContain('https://8333.space:3338');
  });

  it("should set wallet type", () => {
    useWalletStore.getState().setWalletType('cashu');
    expect(useWalletStore.getState().walletType).toBe('cashu');
  });

  it("should handle NWC pairing code and auto-set wallet type", () => {
    const code = "nostr+walletconnect://test";
    useWalletStore.getState().setNwcPairingCode(code);
    
    const state = useWalletStore.getState();
    expect(state.nwcPairingCode).toBe(code);
    expect(state.walletType).toBe('nwc');
  });

  it("should handle Cashu mints and keys", () => {
    const mints = ["https://mint1.com", "https://mint2.com"];
    const pk = "test-private-key";
    const mnemonic = "test mnemonic phrase here";
    
    useWalletStore.getState().setCashuMints(mints);
    useWalletStore.getState().setCashuPrivateKey(pk);
    useWalletStore.getState().setCashuMnemonic(mnemonic);
    
    const state = useWalletStore.getState();
    expect(state.cashuMints).toEqual(mints);
    expect(state.cashuPrivateKey).toBe(pk);
    expect(state.cashuMnemonic).toBe(mnemonic);
  });

  it("should set balance", () => {
    useWalletStore.getState().setBalance(1000);
    expect(useWalletStore.getState().balance).toBe(1000);
  });

  it("should reset wallet", () => {
    useWalletStore.getState().setWalletType('nwc');
    useWalletStore.getState().setBalance(500);
    
    useWalletStore.getState().resetWallet();
    
    const state = useWalletStore.getState();
    expect(state.walletType).toBe('none');
    expect(state.balance).toBe(null);
    expect(state.nwcPairingCode).toBe(null);
  });
});
