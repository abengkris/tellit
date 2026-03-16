import { describe, it, expect } from "vitest";
import { encodeVarInt, decodeVarInt, WrappedBuffer } from "@nostr-dev-kit/sync";

describe("Negentropy Protocol", () => {
    it("should encode and decode varint correctly", () => {
        const value = 123456;
        const encoded = encodeVarInt(value);
        expect(encoded).toBeDefined();
        expect(encoded.length).toBeGreaterThan(0);

        const buffer = new WrappedBuffer(encoded);
        const decoded = decodeVarInt(buffer);
        expect(decoded).toBe(value);
    });

    it("should handle small varints", () => {
        const value = 127;
        const encoded = encodeVarInt(value);
        expect(encoded.length).toBe(1);

        const buffer = new WrappedBuffer(encoded);
        const decoded = decodeVarInt(buffer);
        expect(decoded).toBe(value);
    });
});
