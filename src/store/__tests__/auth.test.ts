import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuthStore } from "../auth";

// Mock NDK and related classes
vi.mock("@nostr-dev-kit/ndk", () => {
  class MockNDKNip07Signer {
    user = vi.fn().mockResolvedValue({ pubkey: "mock-pubkey" });
    toPayload = vi.fn().mockReturnValue(JSON.stringify({ type: "nip07", payload: {} }));
  }
  class MockNDKPrivateKeySigner {
    privateKey: string;
    constructor(pk: string) { this.privateKey = pk; }
    user = vi.fn().mockResolvedValue({ pubkey: "mock-pubkey-from-pk" });
    toPayload = vi.fn().mockReturnValue(JSON.stringify({ type: "private-key", payload: "mock-pk" }));
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
      privateKey: "new-private-key",
      toPayload: vi.fn().mockReturnValue(JSON.stringify({ type: "private-key", payload: "new-pk" }))
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

// Mock Server Actions
vi.mock("@/lib/actions/auth", () => ({
  createSessionCookie: vi.fn().mockResolvedValue(undefined),
  deleteSessionCookie: vi.fn().mockResolvedValue(undefined),
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

  it("should handle logout", async () => {
    // Mock window.location
    const originalLocation = window.location;
    // @ts-expect-error - deleting window.location is required for mocking
    delete window.location;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.location = { ...originalLocation, href: "" } as any;

    useAuthStore.setState({
      isLoggedIn: true,
      publicKey: "some-key",
      loginType: "nip07"
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await useAuthStore.getState().logout(mockSessions as any);

    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(false);
    expect(state.publicKey).toBe(null);
    expect(state.loginType).toBe("none");
    expect(mockSessions.logout).toHaveBeenCalled();
    expect(window.location.href).toBe("/");

    // Restore window.location
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.location = originalLocation as any;
  });
});
