import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "../ui";

describe("UI Store", () => {
  beforeEach(() => {
    useUIStore.setState({
      toasts: [],
      unreadMessagesCount: 0,
      activeChatPubkey: null,
      wotStrictMode: false,
      browserNotificationsEnabled: false,
      defaultZapAmount: 21,
      hideBalance: false,
      relayAuthStrategy: "ask"
    });
  });

  it("should add a toast", () => {
    useUIStore.getState().addToast("Test message", "success");
    const state = useUIStore.getState();
    expect(state.toasts).toHaveLength(1);
    expect(state.toasts[0].message).toBe("Test message");
    expect(state.toasts[0].type).toBe("success");
    expect(state.toasts[0].id).toBeDefined();
  });

  it("should remove a toast", () => {
    useUIStore.getState().addToast("Test message");
    const id = useUIStore.getState().toasts[0].id;
    
    useUIStore.getState().removeToast(id);
    expect(useUIStore.getState().toasts).toHaveLength(0);
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
