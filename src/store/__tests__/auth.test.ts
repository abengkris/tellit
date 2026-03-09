import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuthStore } from "../auth";

// Mock NDK and related classes
vi.mock("@nostr-dev-kit/ndk", () => {
  class MockNDKNip07Signer {
    user = vi.fn().mockResolvedValue({ pubkey: "mock-pubkey" });
  }
  class MockNDKPrivateKeySigner {
    privateKey: string;
    constructor(pk: string) { this.privateKey = pk; }
    user = vi.fn().mockResolvedValue({ pubkey: "mock-pubkey-from-pk" });
  }
  return {
    default: vi.fn(),
    NDKUser: vi.fn().mockImplementation((opts) => ({
      pubkey: opts.pubkey
    })),
    NDKNip07Signer: MockNDKNip07Signer,
    NDKPrivateKeySigner: MockNDKPrivateKeySigner
  };
});

// Mock NDKSessionManager
const mockSessions = {
  login: vi.fn().mockResolvedValue("mock-pubkey"),
  createAccount: vi.fn().mockResolvedValue({
    signer: {
      user: vi.fn().mockResolvedValue({ pubkey: "new-pubkey" }),
      privateKey: "new-private-key"
    }
  }),
  logout: vi.fn()
};

// Mock useWalletStore
vi.mock("../wallet", () => ({
  useWalletStore: {
    getState: () => ({
      resetWallet: vi.fn()
    })
  }
}));

// Mock hooks/useWoT
vi.mock("@/hooks/useWoT", () => ({
  resetWoT: vi.fn()
}));

describe("Auth Store", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      publicKey: null,
      privateKey: null,
      isLoggedIn: false,
      isLoading: false,
      loginType: 'none',
      _hasHydrated: true
    });
    vi.clearAllMocks();
  });

  it("should have initial state", () => {
    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(false);
    expect(state.publicKey).toBe(null);
  });

  it("should set login state correctly", () => {
    useAuthStore.getState().setLoginState(true, "test-pubkey");
    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(true);
    expect(state.publicKey).toBe("test-pubkey");
  });

  it("should handle login with private key", async () => {
    const pk = "0000000000000000000000000000000000000000000000000000000000000001";
    mockSessions.login.mockResolvedValueOnce("pubkey-from-pk");
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await useAuthStore.getState().loginWithPrivateKey({} as any, mockSessions as any, pk);
    
    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(true);
    expect(state.publicKey).toBe("pubkey-from-pk");
    expect(state.privateKey).toBe(pk);
    expect(state.loginType).toBe("privateKey");
  });

  it("should handle logout", () => {
    useAuthStore.setState({
      isLoggedIn: true,
      publicKey: "some-key",
      loginType: "nip07"
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useAuthStore.getState().logout(mockSessions as any);

    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(false);
    expect(state.publicKey).toBe(null);
    expect(state.loginType).toBe("none");
    expect(mockSessions.logout).toHaveBeenCalled();
  });
});
