import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatCompactDate } from "../date";

describe("Date Utilities", () => {
  const MOCK_NOW = new Date("2026-03-09T12:00:00Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(MOCK_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return 'unknown' for undefined timestamp", () => {
    expect(formatCompactDate(undefined)).toBe("unknown");
  });

  it("should return 'now' for very recent timestamps", () => {
    const timestamp = Math.floor(MOCK_NOW.getTime() / 1000) - 30; // 30 seconds ago
    expect(formatCompactDate(timestamp)).toBe("now");
  });

  it("should return minutes for timestamps within the hour", () => {
    const timestamp = Math.floor(MOCK_NOW.getTime() / 1000) - 10 * 60; // 10 minutes ago
    expect(formatCompactDate(timestamp)).toBe("10m");
  });

  it("should return hours for timestamps within the day", () => {
    const timestamp = Math.floor(MOCK_NOW.getTime() / 1000) - 5 * 60 * 60; // 5 hours ago
    expect(formatCompactDate(timestamp)).toBe("5h");
  });

  it("should return days for timestamps within the week", () => {
    const timestamp = Math.floor(MOCK_NOW.getTime() / 1000) - 3 * 24 * 60 * 60; // 3 days ago
    expect(formatCompactDate(timestamp)).toBe("3d");
  });

  it("should return month and day for older timestamps in the same year", () => {
    const timestamp = new Date("2026-01-15T10:00:00Z").getTime() / 1000;
    expect(formatCompactDate(timestamp)).toBe("Jan 15");
  });

  it("should return month, day, and year for timestamps from previous years", () => {
    const timestamp = new Date("2025-10-12T10:00:00Z").getTime() / 1000;
    expect(formatCompactDate(timestamp)).toBe("Oct 12, 2025");
  });
});
