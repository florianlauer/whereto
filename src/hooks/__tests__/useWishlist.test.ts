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

  it("fetchServerWishlist path (empty local): if server returns empty, keeps Zustand state unchanged", async () => {
    // When local items are empty on auth transition, we call fetchServerWishlist (not merge)
    // fetchServerWishlist only calls setWishlistItems if server returns non-empty items
    useAppStore.setState({ wishlistItems: [] });
    mockFetchQuery.mockResolvedValue([]);
    currentUser = null;

    const useWishlist = await getHook();
    const { rerender } = renderHook(() => useWishlist());

    currentUser = mockUser;
    rerender();

    await vi.waitFor(() => {
      expect(mockFetchQuery).toHaveBeenCalled();
    });

    // No add.mutate called (merge path not taken)
    expect(mockMutateAdd).not.toHaveBeenCalled();
    // State remains empty (not wiped, just unchanged)
    expect(useAppStore.getState().wishlistItems).toEqual([]);
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

  it("addToWishlist rollback (WISH-04): restores snapshot when server mutation fails", async () => {
    currentUser = mockUser;
    const initialItems = [{ poiId: "fr-paris", countryCode: "FR", daysMin: 5 }];
    useAppStore.setState({ wishlistItems: initialItems });

    // Make server add fail
    mockMutateAdd.mockRejectedValueOnce(new Error("Network error"));

    const useWishlist = await getHook();
    const { result } = renderHook(() => useWishlist());

    act(() => {
      result.current.addToWishlist({ poiId: "ge-tbilisi", countryCode: "GE", daysMin: 2 });
    });

    // Optimistic update applied immediately
    expect(useAppStore.getState().wishlistItems).toHaveLength(2);

    // Wait for server failure + rollback
    await vi.waitFor(() => {
      expect(useAppStore.getState().wishlistItems).toEqual(initialItems);
    });
  });

  it("removeFromWishlist rollback (WISH-04): restores snapshot when server mutation fails", async () => {
    currentUser = mockUser;
    const initialItems = [
      { poiId: "fr-paris", countryCode: "FR", daysMin: 5 },
      { poiId: "ge-tbilisi", countryCode: "GE", daysMin: 2 },
    ];
    useAppStore.setState({ wishlistItems: initialItems });

    // Make server remove fail
    mockMutateRemove.mockRejectedValueOnce(new Error("Network error"));

    const useWishlist = await getHook();
    const { result } = renderHook(() => useWishlist());

    act(() => {
      result.current.removeFromWishlist("fr-paris");
    });

    // Optimistic update applied immediately
    expect(useAppStore.getState().wishlistItems).toHaveLength(1);

    // Wait for server failure + rollback
    await vi.waitFor(() => {
      expect(useAppStore.getState().wishlistItems).toEqual(initialItems);
    });
  });

  it("addToWishlist success (WISH-04): does NOT rollback when server mutation succeeds", async () => {
    currentUser = mockUser;
    const initialItems = [{ poiId: "fr-paris", countryCode: "FR", daysMin: 5 }];
    useAppStore.setState({ wishlistItems: initialItems });

    // Server add succeeds (default mock behavior)
    mockMutateAdd.mockResolvedValueOnce({ success: true });

    const useWishlist = await getHook();
    const { result } = renderHook(() => useWishlist());

    act(() => {
      result.current.addToWishlist({ poiId: "ge-tbilisi", countryCode: "GE", daysMin: 2 });
    });

    // Optimistic update applied
    expect(useAppStore.getState().wishlistItems).toHaveLength(2);

    // Wait for async to settle
    await vi.waitFor(() => {
      // State should remain with 2 items (no rollback)
      expect(useAppStore.getState().wishlistItems).toHaveLength(2);
    });
  });

  // --- WISH-02 / WISH-03: mergeLocalToServer tests ---

  it("(WISH-02) on null->User transition with local items, calls add.mutate for each item via Promise.all", async () => {
    const localItems = [
      { poiId: "ge-tbilisi", countryCode: "GE", daysMin: 2 },
      { poiId: "jp-tokyo", countryCode: "JP", daysMin: 5 },
    ];
    useAppStore.setState({ wishlistItems: localItems });
    mockFetchQuery.mockResolvedValue(localItems);
    currentUser = null;

    const useWishlist = await getHook();
    const { rerender } = renderHook(() => useWishlist());

    currentUser = mockUser;
    rerender();

    await vi.waitFor(() => {
      expect(mockMutateAdd).toHaveBeenCalledTimes(2);
    });

    expect(mockMutateAdd).toHaveBeenCalledWith({
      poiId: "ge-tbilisi",
      countryCode: "GE",
      daysMin: 2,
    });
    expect(mockMutateAdd).toHaveBeenCalledWith({
      poiId: "jp-tokyo",
      countryCode: "JP",
      daysMin: 5,
    });
  });

  it("(WISH-02) on null->User transition with empty local items, calls fetchServerWishlist (no add.mutate)", async () => {
    useAppStore.setState({ wishlistItems: [] });
    mockFetchQuery.mockResolvedValue([{ poiId: "jp-tokyo", countryCode: "JP", daysMin: 3 }]);
    currentUser = null;

    const useWishlist = await getHook();
    const { rerender } = renderHook(() => useWishlist());

    currentUser = mockUser;
    rerender();

    await vi.waitFor(() => {
      expect(mockFetchQuery).toHaveBeenCalled();
    });

    expect(mockMutateAdd).not.toHaveBeenCalled();
  });

  it("(WISH-02) after successful merge, setWishlistItems called with server-returned items", async () => {
    const localItems = [{ poiId: "ge-tbilisi", countryCode: "GE", daysMin: 2 }];
    const serverItems = [
      { poiId: "fr-paris", countryCode: "FR", daysMin: 5 },
      { poiId: "ge-tbilisi", countryCode: "GE", daysMin: 2 },
    ];
    useAppStore.setState({ wishlistItems: localItems });
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

  it("(WISH-03) when Promise.all rejects, Zustand state is NOT modified (items remain)", async () => {
    const localItems = [{ poiId: "ge-tbilisi", countryCode: "GE", daysMin: 2 }];
    useAppStore.setState({ wishlistItems: localItems });
    mockMutateAdd.mockRejectedValueOnce(new Error("Network error"));
    currentUser = null;

    const useWishlist = await getHook();
    const { rerender } = renderHook(() => useWishlist());

    currentUser = mockUser;
    rerender();

    // Let async operations settle
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Local items must remain intact
    expect(useAppStore.getState().wishlistItems).toEqual(localItems);
    // fetchQuery should NOT have been called (error happened before it)
    expect(mockFetchQuery).not.toHaveBeenCalled();
  });

  it("(WISH-03) when fetchQuery after merge fails, Zustand state is NOT modified", async () => {
    const localItems = [{ poiId: "ge-tbilisi", countryCode: "GE", daysMin: 2 }];
    useAppStore.setState({ wishlistItems: localItems });
    mockMutateAdd.mockResolvedValue({ success: true });
    mockFetchQuery.mockRejectedValueOnce(new Error("Fetch failed"));
    currentUser = null;

    const useWishlist = await getHook();
    const { rerender } = renderHook(() => useWishlist());

    currentUser = mockUser;
    rerender();

    // Wait for add calls
    await vi.waitFor(() => {
      expect(mockMutateAdd).toHaveBeenCalled();
    });

    // Let async operations settle
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Local items must remain intact (fetch failed, no setWishlistItems called)
    expect(useAppStore.getState().wishlistItems).toEqual(localItems);
  });
});
