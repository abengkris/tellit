import { describe, it, expect, vi } from "vitest";
import { triggerConfetti, triggerZapConfetti } from "../confetti";
import confetti from "canvas-confetti";

// Mock canvas-confetti
vi.mock("canvas-confetti", () => {
  return {
    default: vi.fn()
  };
});

describe("Confetti Utilities", () => {
  it("should trigger zap confetti with correct colors", () => {
    triggerZapConfetti(0.5, 0.5);
    expect(confetti).toHaveBeenCalledWith(expect.objectContaining({
      colors: ['#fbbf24', '#f59e0b', '#d97706'],
      particleCount: 100
    }));
  });

  it("should trigger celebratory confetti", () => {
    vi.useFakeTimers();
    triggerConfetti();
    
    // It uses setInterval, so we fast-forward
    vi.advanceTimersByTime(300);
    
    expect(confetti).toHaveBeenCalled();
    
    vi.useRealTimers();
  });
});
