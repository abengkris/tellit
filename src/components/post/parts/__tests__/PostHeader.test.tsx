import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PostHeader } from "../PostHeader";
import { TooltipProvider } from "@/components/ui/tooltip";

// Mock hooks
vi.mock("@/hooks/useWoT", () => ({
  useWoT: vi.fn((pubkey) => {
    if (pubkey === "trusted-pubkey") return { score: 90, loading: false };
    return { score: 0, loading: false };
  }),
}));

// Mock components to simplify and avoid act() warnings
vi.mock("@/components/common/UserIdentity", () => ({
  UserIdentity: () => <div data-testid="user-identity" />,
}));

vi.mock("@/components/common/Avatar", () => ({
  Avatar: () => <div data-testid="avatar" />,
}));

describe("PostHeader", () => {
  const defaultProps = {
    display_name: "Alice",
    userNpub: "npub1...",
    pubkey: "alice-pubkey",
    createdAt: Date.now() / 1000,
  };

  it("should render trust shield for trusted users", () => {
    const { container } = render(
      <TooltipProvider>
        <PostHeader {...defaultProps} pubkey="trusted-pubkey" />
      </TooltipProvider>
    );

    // Check for the ShieldCheck icon (lucide-shield-check class)
    const shield = container.querySelector(".lucide-shield-check");
    expect(shield).toBeDefined();
    expect(shield?.classList.contains("text-green-500")).toBe(true);
  });

  it("should not render trust shield for untrusted users", () => {
    const { container } = render(
      <TooltipProvider>
        <PostHeader {...defaultProps} pubkey="untrusted-pubkey" />
      </TooltipProvider>
    );

    const shield = container.querySelector(".lucide-shield-check");
    expect(shield).toBeNull();
  });
});
