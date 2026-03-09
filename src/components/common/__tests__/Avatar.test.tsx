
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { Avatar } from "../Avatar";
import { useBlossom } from "@/hooks/useBlossom";

// Mock hooks
vi.mock("@/hooks/useBlossom", () => ({
  useBlossom: vi.fn(),
}));

describe("Avatar Component", () => {
  const pubkey = "test-pubkey";
  const originalSrc = "https://example.com/avatar.jpg";
  const optimizedSrc = "https://blossom.example.com/optimized/avatar.webp";
  const robohashSrc = `https://robohash.org/${pubkey}?set=set1`;

  beforeEach(() => {
    vi.clearAllMocks();
    (useBlossom as unknown as Mock).mockReturnValue({
      getOptimizedUrl: vi.fn().mockResolvedValue(originalSrc),
    });
  });

  it("should render a robohash fallback if no src is provided", () => {
    const { container } = render(<Avatar pubkey={pubkey} />);
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe(robohashSrc);
  });

  it("should render the original src initially", () => {
    const { container } = render(<Avatar pubkey={pubkey} src={originalSrc} />);
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe(originalSrc);
  });

  it("should attempt to load an optimized URL if provided by Blossom", async () => {
    (useBlossom as unknown as Mock).mockReturnValue({
      getOptimizedUrl: vi.fn().mockResolvedValue(optimizedSrc),
    });

    const { container } = render(<Avatar pubkey={pubkey} src={originalSrc} />);
    
    await waitFor(() => {
      const img = container.querySelector("img");
      expect(img?.getAttribute("src")).toBe(optimizedSrc);
    });
  });

  it("should fallback to original src if optimized URL fails", async () => {
    (useBlossom as unknown as Mock).mockReturnValue({
      getOptimizedUrl: vi.fn().mockResolvedValue(optimizedSrc),
    });

    const { container } = render(<Avatar pubkey={pubkey} src={originalSrc} />);
    
    // Wait for optimized to be set
    await waitFor(() => {
        const img = container.querySelector("img");
        expect(img?.getAttribute("src")).toBe(optimizedSrc);
    });

    const img = container.querySelector("img")!;
    // Simulate error on the optimized image
    fireEvent.error(img);

    // Should now be the original src
    expect(img.getAttribute("src")).toBe(originalSrc);
  });

  it("should fallback to robohash if both optimized and original src fail", async () => {
    (useBlossom as unknown as Mock).mockReturnValue({
      getOptimizedUrl: vi.fn().mockResolvedValue(optimizedSrc),
    });

    const { container } = render(<Avatar pubkey={pubkey} src={originalSrc} />);
    
    await waitFor(() => {
        const img = container.querySelector("img");
        expect(img?.getAttribute("src")).toBe(optimizedSrc);
    });

    const img = container.querySelector("img")!;
    
    // 1. Optimized fails
    fireEvent.error(img);
    expect(img.getAttribute("src")).toBe(originalSrc);

    // 2. Original fails
    fireEvent.error(img);
    expect(img.getAttribute("src")).toBe(robohashSrc);
  });

  it("should show a loading skeleton when isLoading is true", () => {
    const { container } = render(<Avatar pubkey={pubkey} isLoading={true} />);
    const skeleton = container.querySelector(".animate-pulse");
    expect(skeleton).toBeDefined();
    expect(container.querySelector("img")).toBeNull();
  });
});
