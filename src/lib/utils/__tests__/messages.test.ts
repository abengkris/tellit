import { describe, it, expect, vi, Mock } from "vitest";
import { mapNDKMessage } from "../messages";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { NDKMessage } from "@nostr-dev-kit/messages";

// Mock NDKEvent as a class
vi.mock("@nostr-dev-kit/ndk", () => {
  class MockNDKEvent {
    ndk: unknown;
    id: string = "";
    pubkey: string = "";
    content: string = "";
    created_at: number = 0;
    kind: number = 14;
    tags: string[][] = [];
    constructor(ndk: unknown) { this.ndk = ndk; }
    getMatchingTags = vi.fn().mockReturnValue([]);
  }
  return {
    default: vi.fn(),
    NDKEvent: MockNDKEvent
  };
});

describe("Message Utilities", () => {
  describe("mapNDKMessage", () => {
    it("should map a complete NDKMessage with an event instance", () => {
      // Create an actual instance of our mock
      const mockEvent = new NDKEvent(undefined);
      mockEvent.id = "event-id";
      mockEvent.pubkey = "sender-pubkey";
      mockEvent.content = "hello";
      mockEvent.created_at = 123456789;
      (mockEvent.getMatchingTags as Mock).mockReturnValue([["p", "recipient-pubkey"]]);

      const mockNDKMessage = {
        id: "msg-id",
        sender: { pubkey: "sender-pubkey" },
        recipient: { pubkey: "recipient-pubkey" },
        content: "hello",
        timestamp: 123456789,
        event: mockEvent,
        read: false
      } as unknown as NDKMessage;

      const result = mapNDKMessage(mockNDKMessage);

      expect(result.id).toBe("msg-id");
      expect(result.sender).toBe("sender-pubkey");
      expect(result.recipient).toBe("recipient-pubkey");
      expect(result.content).toBe("hello");
      expect(result.timestamp).toBe(123456789);
      expect(result.isRead).toBe(false);
    });

    it("should handle NDKMessage without event instance (rumor)", () => {
      const mockNDKMessage = {
        id: "msg-id",
        sender: { pubkey: "sender-pubkey" },
        content: "rumor content",
        timestamp: 987654321,
        rumor: {
          id: "rumor-id",
          pubkey: "sender-pubkey",
          content: "rumor content",
          created_at: 987654321,
          kind: 14,
          tags: [["p", "recipient-pubkey"]]
        },
        read: true
      } as unknown as NDKMessage;

      const result = mapNDKMessage(mockNDKMessage);

      expect(result.id).toBe("msg-id");
      expect(result.sender).toBe("sender-pubkey");
      expect(result.content).toBe("rumor content");
      expect(result.isRead).toBe(true);
    });
  });
});
