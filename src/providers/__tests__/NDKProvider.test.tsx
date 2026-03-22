import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NDKProvider } from "../NDKProvider";
import { formatNDKError, NDKErrorType } from "@/lib/error-handler";
import { NDKEvent } from "@nostr-dev-kit/ndk";

// Mock NDK and lib/ndk
vi.mock("@nostr-dev-kit/ndk", async () => {
  const actual = await vi.importActual("@nostr-dev-kit/ndk");
  return {
    ...actual,
    default: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      pool: { on: vi.fn() },
      cacheAdapter: {},
      connect: vi.fn().mockResolvedValue(true),
      signer: null,
      getUser: vi.fn().mockReturnValue({ pubkey: "test-pubkey" }),
      relayAuthDefaultPolicy: vi.fn(),
    })),
  };
});

vi.mock("@/lib/ndk", () => ({
  getNDK: vi.fn().mockReturnValue({
    on: vi.fn(),
    pool: { on: vi.fn() },
    cacheAdapter: {},
    connect: vi.fn().mockResolvedValue(true),
    signer: null,
    getUser: vi.fn().mockReturnValue({ pubkey: "test-pubkey" }),
    relayAuthDefaultPolicy: vi.fn(),
  }),
  DEFAULT_RELAYS: [],
}));

// Mock UI Store
const mockAddToast = vi.fn();
vi.mock("@/store/ui", () => ({
  useUIStore: () => ({
    addToast: mockAddToast,
    incrementUnreadMessagesCount: vi.fn(),
  }),
}));

// Mock Error Handler
vi.mock("@/lib/error-handler", () => ({
  formatNDKError: vi.fn().mockReturnValue({
    message: "Mocked Error Message",
    isCritical: true,
  }),
  NDKErrorType: {
    PUBLISH_FAILED: "PUBLISH_FAILED",
  },
}));

describe("NDKProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should listen for publish-failed events and show a toast using error-handler", async () => {
    let publishFailedHandler: (event: NDKEvent, error: Error) => void = () => {};

    const { getNDK } = await import("@/lib/ndk");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockNDKInstance = vi.mocked(getNDK)() as any;

    // Capture the handler from the mock instance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockNDKInstance.on.mockImplementation((event: string, handler: any) => {
      if (event === "event:publish-failed") {
        publishFailedHandler = handler;
      }
    });

    render(<NDKProvider><div>Test</div></NDKProvider>);

    // Trigger the event
    const mockEvent = { id: "test-event" } as NDKEvent;
    const mockError = new Error("Publish failed");
    
    publishFailedHandler(mockEvent, mockError);

    expect(formatNDKError).toHaveBeenCalledWith(mockError, NDKErrorType.PUBLISH_FAILED);
    expect(mockAddToast).toHaveBeenCalledWith("Mocked Error Message", "error");
  });
});
