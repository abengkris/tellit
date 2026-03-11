import { describe, it, expect, beforeEach, vi } from "vitest";
import { useUIStore } from "../ui";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("UI Store", () => {
  beforeEach(() => {
    useUIStore.setState({
      unreadMessagesCount: 0,
      activeChatPubkey: null,
      wotStrictMode: false,
      browserNotificationsEnabled: false,
      defaultZapAmount: 21,
      hideBalance: false,
      relayAuthStrategy: "ask"
    });
    vi.clearAllMocks();
  });

  it("should call sonner success when adding a success toast", () => {
    useUIStore.getState().addToast("Success message", "success");
    expect(toast.success).toHaveBeenCalledWith("Success message", expect.any(Object));
  });

  it("should call sonner error when adding an error toast", () => {
    useUIStore.getState().addToast("Error message", "error");
    expect(toast.error).toHaveBeenCalledWith("Error message", expect.any(Object));
  });

  it("should call sonner info when adding an info toast", () => {
    useUIStore.getState().addToast("Info message", "info");
    expect(toast.info).toHaveBeenCalledWith("Info message", expect.any(Object));
  });

  it("should handle unread messages count", () => {
    useUIStore.getState().setUnreadMessagesCount(5);
    expect(useUIStore.getState().unreadMessagesCount).toBe(5);
    
    useUIStore.getState().incrementUnreadMessagesCount();
    expect(useUIStore.getState().unreadMessagesCount).toBe(6);
  });

  it("should set active chat pubkey", () => {
    useUIStore.getState().setActiveChatPubkey("test-pubkey");
    expect(useUIStore.getState().activeChatPubkey).toBe("test-pubkey");
  });

  it("should toggle settings", () => {
    useUIStore.getState().setWotStrictMode(true);
    expect(useUIStore.getState().wotStrictMode).toBe(true);
    
    useUIStore.getState().setBrowserNotificationsEnabled(true);
    expect(useUIStore.getState().browserNotificationsEnabled).toBe(true);
    
    useUIStore.getState().setDefaultZapAmount(100);
    expect(useUIStore.getState().defaultZapAmount).toBe(100);
    
    useUIStore.getState().setHideBalance(true);
    expect(useUIStore.getState().hideBalance).toBe(true);

    useUIStore.getState().setRelayAuthStrategy("always");
    expect(useUIStore.getState().relayAuthStrategy).toBe("always");
  });
});
