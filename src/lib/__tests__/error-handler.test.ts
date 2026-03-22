import { describe, it, expect, vi } from "vitest";
import { formatNDKError, NDKErrorType } from "../error-handler";

describe("error-handler", () => {
  describe("formatNDKError", () => {
    it("should handle publish-failed errors", () => {
      const error = new Error("Relay rejected event: blocked");
      const formatted = formatNDKError(error, NDKErrorType.PUBLISH_FAILED);
      
      expect(formatted.message).toContain("Failed to publish");
      expect(formatted.isCritical).toBe(true);
    });

    it("should handle connection errors", () => {
      const error = new Error("WebSocket closed");
      const formatted = formatNDKError(error, NDKErrorType.CONNECTION_FAILED);
      
      expect(formatted.message).toContain("Relay connection lost");
      expect(formatted.isCritical).toBe(false);
    });

    it("should provide a default message for unknown errors", () => {
      const error = new Error("Something went wrong");
      const formatted = formatNDKError(error);
      
      expect(formatted.message).toBe("An unexpected error occurred");
      expect(formatted.isCritical).toBe(false);
    });

    it("should log the error to the console if it's not critical", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const error = new Error("Relay connection lost");
      formatNDKError(error, NDKErrorType.CONNECTION_FAILED);
      
      expect(consoleSpy).toHaveBeenCalledWith("[NDK Error]: Relay connection lost", error);
      consoleSpy.mockRestore();
    });
  });
});
