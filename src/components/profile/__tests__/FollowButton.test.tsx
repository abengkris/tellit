import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { FollowButton } from "../FollowButton";
import { useFollowState } from "@/hooks/useFollowState";
import { useAuthStore } from "@/store/auth";

// Mock dependencies
vi.mock("@/hooks/useFollowState", () => ({
  useFollowState: vi.fn(),
}));

vi.mock("@/store/auth", () => ({
  useAuthStore: vi.fn(),
}));

describe("FollowButton", () => {
  const targetPubkey = "target-pubkey";
  const currentUserPubkey = "current-user-pubkey";

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuthStore as unknown as Mock).mockImplementation((selector: (s: { user: { pubkey: string } }) => unknown) =>
      selector({ user: { pubkey: currentUserPubkey } })
    );
  });

  it("should display 'Follow' by default", () => {
    (useFollowState as unknown as Mock).mockReturnValue({
      isFollowing: false,
      followsMe: false,
      isLoading: false,
      isPending: false,
      toggle: vi.fn(),
    });

    render(<FollowButton targetPubkey={targetPubkey} />);
    expect(screen.getByText("Follow")).toBeDefined();
  });

  it("should display 'Follow back' if they follow me but I don't follow them", () => {
    (useFollowState as unknown as Mock).mockReturnValue({
      isFollowing: false,
      followsMe: true,
      isLoading: false,
      isPending: false,
      toggle: vi.fn(),
    });

    render(<FollowButton targetPubkey={targetPubkey} />);
    expect(screen.getByText("Follow back")).toBeDefined();
  });

  it("should display 'Following' if I follow them", () => {
    (useFollowState as unknown as Mock).mockReturnValue({
      isFollowing: true,
      followsMe: true,
      isLoading: false,
      isPending: false,
      toggle: vi.fn(),
    });

    render(<FollowButton targetPubkey={targetPubkey} />);
    expect(screen.getByText("Following")).toBeDefined();
  });

  it("should display 'Following…' when pending follow", () => {
    (useFollowState as unknown as Mock).mockReturnValue({
      isFollowing: false, // MUST BE FALSE TO BE FOLLOWING
      followsMe: true,
      isLoading: false,
      isPending: true,
      toggle: vi.fn(),
    });

    render(<FollowButton targetPubkey={targetPubkey} />);
    expect(screen.getByText("Following…")).toBeDefined();
  });

  it("should display 'Unfollowing…' when pending unfollow", () => {
    (useFollowState as unknown as Mock).mockReturnValue({
      isFollowing: true, // MUST BE TRUE TO BE UNFOLLOWING
      followsMe: true,
      isLoading: false,
      isPending: true,
      toggle: vi.fn(),
    });

    render(<FollowButton targetPubkey={targetPubkey} />);
    expect(screen.getByText("Unfollowing…")).toBeDefined();
  });
});
