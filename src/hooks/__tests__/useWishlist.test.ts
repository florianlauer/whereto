import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAppStore } from "@/stores/appStore";

// Mock authStore
const mockUser = { id: "user-1", email: "test@test.com" };
let currentUser: typeof mockUser | null = null;

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn((selector: (s: { user: typeof mockUser | null }) => unknown) =>
    selector({ user: currentUser }),
  ),
}));

// Mock tRPC client
const mockMutateAdd = vi.fn().mockResolvedValue({ success: true });
const mockMutateRemove = vi.fn().mockResolvedValue({ success: true });
const mockTRPCClient = {
  wishlist: {
    add: { mutate: mockMutateAdd },
    remove: { mutate: mockMutateRemove },
  },
};

vi.mock("@/lib/trpc", () => ({
  useTRPCClient: () => mockTRPCClient,
  useTRPC: () => ({
    wishlist: {
      list: {
        queryOptions: () => ({ queryKey: ["wishlist", "list"], queryFn: vi.fn() }),
      },
    },
  }),
}));

// Mock react-query
const mockFetchQuery = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    fetchQuery: mockFetchQuery,
  }),
}));

describe("useWishlist", () => {
  beforeEach(() => {
    currentUser = null;
    useAppStore.setState({ wishlistItems: [] });
    vi.clearAllMocks();
    mockFetchQuery.mockResolvedValue([]);
  });

  // Lazy import to ensure mocks are set up first
  async function getHook() {
    const mod = await import("../useWishlist");
    return mod.useWishlist;
  }

  it("returns wishlistItems, addToWishlist, removeFromWishlist from Zustand", async () => {
    const useWishlist = await getHook();
    const { result } = renderHook(() => useWishlist());

    expect(result.current.wishlistItems).toEqual([]);
    expect(typeof result.current.addToWishlist).toBe("function");
    expect(typeof result.current.removeFromWishlist).toBe("function");
  });

  it("in anonymous mode (user=null), addToWishlist only updates Zustand (no tRPC call)", async () => {
    currentUser = null;
    const useWishlist = await getHook();
    const { result } = renderHook(() => useWishlist());

    act(() => {
      result.current.addToWishlist({ poiId: "ge-tbilisi", countryCode: "GE", daysMin: 2 });
    });

    expect(useAppStore.getState().wishlistItems).toHaveLength(1);
    expect(mockMutateAdd).not.toHaveBeenCalled();
  });

  it("in auth mode (user present), addToWishlist updates Zustand AND calls tRPC", async () => {
    currentUser = mockUser;
    const useWishlist = await getHook();
    const { result } = renderHook(() => useWishlist());

    act(() => {
      result.current.addToWishlist({ poiId: "ge-tbilisi", countryCode: "GE", daysMin: 2 });
    });

    expect(useAppStore.getState().wishlistItems).toHaveLength(1);
    expect(mockMutateAdd).toHaveBeenCalledWith({
      poiId: "ge-tbilisi",
      countryCode: "GE",
      daysMin: 2,
    });
  });

  it("in auth mode, removeFromWishlist updates Zustand AND calls tRPC", async () => {
    currentUser = mockUser;
    useAppStore.setState({
      wishlistItems: [{ poiId: "ge-tbilisi", countryCode: "GE", daysMin: 2 }],
    });
    const useWishlist = await getHook();
    const { result } = renderHook(() => useWishlist());

    act(() => {
      result.current.removeFromWishlist("ge-tbilisi");
    });

    expect(useAppStore.getState().wishlistItems).toHaveLength(0);
    expect(mockMutateRemove).toHaveBeenCalledWith({ poiId: "ge-tbilisi" });
  });

  it("when user transitions from null to User, fetches server wishlist", async () => {
    const serverItems = [{ poiId: "jp-tokyo", countryCode: "JP", daysMin: 3 }];
    mockFetchQuery.mockResolvedValue(serverItems);
    currentUser = null;

    const useWishlist = await getHook();
    const { rerender } = renderHook(() => useWishlist());

    // Simulate auth transition
    currentUser = mockUser;
    rerender();

    // Wait for async fetch
    await vi.waitFor(() => {
      expect(mockFetchQuery).toHaveBeenCalled();
    });
  });

  it("if server returns items, calls setWishlistItems to replace Zustand", async () => {
    const serverItems = [{ poiId: "jp-tokyo", countryCode: "JP", daysMin: 3 }];
    mockFetchQuery.mockResolvedValue(serverItems);
    currentUser = null;

    const useWishlist = await getHook();
    const { rerender } = renderHook(() => useWishlist());

    currentUser = mockUser;
    rerender();

    await vi.waitFor(() => {
      expect(useAppStore.getState().wishlistItems).toEqual(serverItems);
    });
  });

  it("if server returns empty, keeps existing local items (no wipe)", async () => {
    const localItems = [{ poiId: "ge-tbilisi", countryCode: "GE", daysMin: 2 }];
    useAppStore.setState({ wishlistItems: localItems });
    mockFetchQuery.mockResolvedValue([]);
    currentUser = null;

    const useWishlist = await getHook();
    const { rerender } = renderHook(() => useWishlist());

    currentUser = mockUser;
    rerender();

    await vi.waitFor(() => {
      expect(mockFetchQuery).toHaveBeenCalled();
    });

    // Local items should remain untouched
    expect(useAppStore.getState().wishlistItems).toEqual(localItems);
  });

  it("on mount with existing user (page refresh), fetches server data in background", async () => {
    const serverItems = [{ poiId: "jp-tokyo", countryCode: "JP", daysMin: 3 }];
    mockFetchQuery.mockResolvedValue(serverItems);
    currentUser = mockUser;

    const useWishlist = await getHook();
    renderHook(() => useWishlist());

    await vi.waitFor(() => {
      expect(mockFetchQuery).toHaveBeenCalled();
    });

    expect(useAppStore.getState().wishlistItems).toEqual(serverItems);
  });
});
