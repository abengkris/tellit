import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NDKProvider } from "../NDKProvider";

// Mock NDK Wallet
vi.mock("@nostr-dev-kit/wallet", () => ({
  NDKNutzapMonitor: vi.fn().mockImplementation(() => ({ on: vi.fn() })),
  NDKNWCWallet: vi.fn(),
  NDKCashuWallet: vi.fn(),
  NDKWebLNWallet: vi.fn(),
}));

// Mock NDK and lib/ndk
vi.mock("@nostr-dev-kit/ndk", async () => {
  const actual = await vi.importActual("@nostr-dev-kit/ndk");
  return {
    ...actual,
    default: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      pool: { on: vi.fn(), connectedRelays: vi.fn().mockReturnValue([]) },
      cacheAdapter: {},
      connect: vi.fn().mockResolvedValue(true),
      signer: {
        user: vi.fn().mockResolvedValue({ pubkey: "test-pubkey" }),
      },
      getUser: vi.fn().mockReturnValue({ 
        pubkey: "test-pubkey",
        fetchProfile: vi.fn().mockResolvedValue({ name: "test" }),
      }),
      relayAuthDefaultPolicy: vi.fn(),
    })),
  };
});

vi.mock("@/lib/ndk", () => ({
  getNDK: vi.fn().mockReturnValue({
    on: vi.fn(),
    pool: { on: vi.fn(), connectedRelays: vi.fn().mockReturnValue([]) },
    cacheAdapter: {},
    connect: vi.fn().mockResolvedValue(true),
    signer: {
      user: vi.fn().mockResolvedValue({ pubkey: "test-pubkey" }),
    },
    getUser: vi.fn().mockReturnValue({ 
      pubkey: "test-pubkey",
      fetchProfile: vi.fn().mockResolvedValue({ name: "test" }),
    }),
    relayAuthDefaultPolicy: vi.fn(),
  }),
  DEFAULT_RELAYS: [],
}));

// Mock Nostrify utilities
vi.mock("@/lib/nostrify-signer", () => ({
  createSigner: vi.fn().mockReturnValue({
    getPublicKey: vi.fn().mockResolvedValue("test-pubkey"),
    signEvent: vi.fn(),
  }),
}));

vi.mock("@/lib/nostrify-sql-store", () => ({
  getSqlStore: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/nostrify-ndk-adapter", () => ({
  NostrifyNDKCacheAdapter: vi.fn().mockImplementation(() => ({})),
}));

// Mock DB migration
vi.mock("@/lib/sync/db-migration", () => ({
  migrateDexieToSql: vi.fn().mockResolvedValue(undefined),
}));

// Mock UI Store
vi.mock("@/store/ui", () => ({
  useUIStore: () => ({
    addToast: vi.fn(),
    incrementUnreadMessagesCount: vi.fn(),
    relayAuthStrategy: 'ask',
  }),
}));

describe("NDKProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize without crashing", async () => {
    render(<NDKProvider><div>Test</div></NDKProvider>);
    expect(true).toBe(true);
  });
});
