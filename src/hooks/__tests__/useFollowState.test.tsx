import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { useFollowState } from "../useFollowState";
import { getNDK } from "@/lib/ndk";
import { useAuthStore } from "@/store/auth";

// Mock dependencies
vi.mock("@/lib/ndk", () => ({
  getNDK: vi.fn(),
}));

vi.mock("@/store/auth", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("@/lib/actions/follow", () => ({
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
}));

describe("useFollowState", () => {
  const currentUserPubkey = "user-pubkey";
  const targetPubkey = "target-pubkey";

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation for useAuthStore
    (useAuthStore as unknown as Mock).mockImplementation((selector: (s: { user: { pubkey: string } }) => unknown) =>
      selector({ user: { pubkey: currentUserPubkey } })
    );
  });

  it("should detect if target user follows current user (followsMe: true)", async () => {
    const mockNDK = {
      fetchEvent: vi.fn().mockImplementation((filter: { authors: string[] }) => {
        if (filter.authors[0] === currentUserPubkey) {
          // Current user doesn't follow target
          return Promise.resolve({ tags: [] });
        }
        if (filter.authors[0] === targetPubkey) {
          // Target user follows current user
          return Promise.resolve({
            tags: [["p", currentUserPubkey]],
          });
        }
        return Promise.resolve(null);
      }),
    };
    (getNDK as unknown as Mock).mockReturnValue(mockNDK);

    const { result } = renderHook(() => useFollowState(targetPubkey));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isFollowing).toBe(false);
    expect(result.current.followsMe).toBe(true);
  });

  it("should detect if current user follows target (isFollowing: true)", async () => {
    const mockNDK = {
      fetchEvent: vi.fn().mockImplementation((filter: { authors: string[] }) => {
        if (filter.authors[0] === currentUserPubkey) {
          // Current user follows target
          return Promise.resolve({
            tags: [["p", targetPubkey]],
          });
        }
        if (filter.authors[0] === targetPubkey) {
          // Target user doesn't follow current user
          return Promise.resolve({ tags: [] });
        }
        return Promise.resolve(null);
      }),
    };
    (getNDK as unknown as Mock).mockReturnValue(mockNDK);

    const { result } = renderHook(() => useFollowState(targetPubkey));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isFollowing).toBe(true);
    expect(result.current.followsMe).toBe(false);
  });

  it("should handle when neither follows each other", async () => {
    const mockNDK = {
      fetchEvent: vi.fn().mockResolvedValue({ tags: [] }),
    };
    (getNDK as unknown as Mock).mockReturnValue(mockNDK);

    const { result } = renderHook(() => useFollowState(targetPubkey));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isFollowing).toBe(false);
    expect(result.current.followsMe).toBe(false);
  });
});
