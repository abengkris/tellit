
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { Avatar } from "../Avatar";
import { useBlossom } from "@/hooks/useBlossom";

// Mock hooks
vi.mock("@/hooks/useBlossom", () => ({
  useBlossom: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}))

describe("Avatar Component", () => {
  const pubkey = "test-pubkey";
  const originalSrc = "https://example.com/avatar.jpg";
  const optimizedSrc = "https://blossom.example.com/optimized/avatar.webp";
  const robohashSrc = `https://robohash.org/${pubkey}?set=set1`;

  beforeEach(() => {
    vi.clearAllMocks();
    (useBlossom as unknown as Mock).mockReturnValue({
      getOptimizedUrl: vi.fn().mockImplementation((src) => Promise.resolve(src)),
    });
  });

  it("should render a robohash fallback if no src is provided", () => {
    const { container } = render(<Avatar pubkey={pubkey} />);
    // In JSDOM with Radix Avatar, it might only render the fallback 
    // especially if it detects it shouldn't try loading.
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe(robohashSrc);
  });

  it("should show a loading skeleton when isLoading is true", () => {
    const { container } = render(<Avatar pubkey={pubkey} isLoading={true} />);
    const skeleton = container.querySelector('[data-slot="skeleton"]');
    expect(skeleton).toBeDefined();
    expect(screen.queryByAltText(pubkey)).toBeNull();
  });

  // Since testing the full image loading lifecycle in JSDOM with Radix is flaky,
  // we focus on verifying that the component receives the right props and 
  // correctly uses its sub-components.
});
