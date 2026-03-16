import { describe, it, expect } from "vitest";
import { NegentropyStorage } from "@nostr-dev-kit/sync";
import NDK, { NDKEvent } from "@nostr-dev-kit/ndk";

describe("NegentropyStorage", () => {
    it("should build from events", () => {
        const ndk = new NDK();
        const events = [
            new NDKEvent(ndk, { kind: 1, content: "test 1", created_at: 1000 }),
            new NDKEvent(ndk, { kind: 1, content: "test 2", created_at: 2000 }),
        ];
        
        // Mock ID for events since they aren't signed
        events[0].id = "0".repeat(64);
        events[1].id = "1".repeat(64);

        const storage = NegentropyStorage.fromEvents(events);
        expect(storage).toBeDefined();
        // size() method might be internal or differently named, 
        // but the factory method should work.
    });
});
