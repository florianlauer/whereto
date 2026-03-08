import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock the db module before importing anything that uses it
vi.mock("@/server/db", () => {
  return {
    supabaseAdmin: {},
    createSupabaseClient: vi.fn(() => ({
      auth: { getUser: vi.fn() },
      from: vi.fn(),
    })),
  };
});

import { createSupabaseClient } from "@/server/db";

// Helper to build a chainable Supabase mock
// Every method call in the chain (.select(), .eq(), .single(), etc.) returns
// another chainable proxy. Awaiting the chain resolves to resolvedValue.
function createChainableMock(resolvedValue: { data: unknown; error: unknown }) {
  const handler = (): unknown => {
    const fn = (..._args: unknown[]) => handler();
    return new Proxy(fn, {
      get: (_target, prop) => {
        if (prop === "then") {
          return (resolve: (v: unknown) => void) => resolve(resolvedValue);
        }
        // Any property access returns a callable that continues the chain
        return (..._args: unknown[]) => handler();
      },
      apply: (_target, _thisArg, args) => {
        return fn(...args);
      },
    });
  };

  return handler;
}

function createMockClient(options: {
  getUser?: { data: { user: unknown }; error: unknown };
  fromResults?: Record<string, { data: unknown; error: unknown }>;
}) {
  const fromMock = vi.fn((table: string) => {
    const result = options.fromResults?.[table] ?? { data: null, error: null };
    return createChainableMock(result)();
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue(options.getUser ?? { data: { user: null }, error: null }),
    },
    from: fromMock,
  };
}

describe("wishlist tRPC router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("returns empty array when no access token (unauthenticated)", async () => {
      const { router, createContext } = await import("@/server/trpc");
      const { wishlistRouter } = await import("@/server/routers/wishlist");

      const testRouter = router({ wishlist: wishlistRouter });
      const ctx = createContext(); // no request = no token
      const caller = testRouter.createCaller(ctx);

      const result = await caller.wishlist.list();
      expect(result).toEqual([]);
    });

    it("returns camelCase items for authenticated user", async () => {
      const { router, createContext } = await import("@/server/trpc");
      const { wishlistRouter } = await import("@/server/routers/wishlist");

      const mockUser = { id: "user-123", email: "test@test.com" };
      const mockItems = [
        {
          id: "item-1",
          poi_id: "poi-abc",
          country_code: "FR",
          days_min: 3,
          position: 0,
          wishlist_id: "wl-1",
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
        },
        {
          id: "item-2",
          poi_id: "poi-def",
          country_code: "JP",
          days_min: 7,
          position: 1,
          wishlist_id: "wl-1",
          created_at: "2026-01-02",
          updated_at: "2026-01-02",
        },
      ];

      const mockClient = createMockClient({
        getUser: { data: { user: mockUser }, error: null },
        fromResults: {
          wishlists: { data: { id: "wl-1" }, error: null },
          wishlist_items: { data: mockItems, error: null },
        },
      });
      vi.mocked(createSupabaseClient).mockReturnValue(mockClient as never);

      const testRouter = router({ wishlist: wishlistRouter });
      const ctx = createContext({
        req: new Request("http://localhost/api/trpc", {
          headers: { authorization: "Bearer valid-token" },
        }),
      });
      const caller = testRouter.createCaller(ctx);

      const result = await caller.wishlist.list();
      expect(result).toEqual([
        { poiId: "poi-abc", countryCode: "FR", daysMin: 3, position: 0 },
        { poiId: "poi-def", countryCode: "JP", daysMin: 7, position: 1 },
      ]);
    });
  });

  describe("add", () => {
    it("upserts item for authenticated user", async () => {
      const { router, createContext } = await import("@/server/trpc");
      const { wishlistRouter } = await import("@/server/routers/wishlist");

      const mockUser = { id: "user-123", email: "test@test.com" };
      const mockClient = createMockClient({
        getUser: { data: { user: mockUser }, error: null },
        fromResults: {
          wishlists: { data: { id: "wl-1" }, error: null },
          wishlist_items: { data: null, error: null },
        },
      });
      vi.mocked(createSupabaseClient).mockReturnValue(mockClient as never);

      const testRouter = router({ wishlist: wishlistRouter });
      const ctx = createContext({
        req: new Request("http://localhost/api/trpc", {
          headers: { authorization: "Bearer valid-token" },
        }),
      });
      const caller = testRouter.createCaller(ctx);

      const result = await caller.wishlist.add({
        poiId: "poi-abc",
        countryCode: "FR",
        daysMin: 5,
      });
      expect(result).toEqual({ success: true });

      // Verify from was called with wishlist_items for upsert
      expect(mockClient.from).toHaveBeenCalledWith("wishlist_items");
    });

    it("throws UNAUTHORIZED without valid token", async () => {
      const { router, createContext } = await import("@/server/trpc");
      const { wishlistRouter } = await import("@/server/routers/wishlist");

      const testRouter = router({ wishlist: wishlistRouter });
      const ctx = createContext(); // no token
      const caller = testRouter.createCaller(ctx);

      await expect(
        caller.wishlist.add({ poiId: "poi-abc", countryCode: "FR", daysMin: 1 }),
      ).rejects.toThrow(TRPCError);
      await expect(
        caller.wishlist.add({ poiId: "poi-abc", countryCode: "FR", daysMin: 1 }),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });
  });

  describe("remove", () => {
    it("deletes item by poiId for authenticated user", async () => {
      const { router, createContext } = await import("@/server/trpc");
      const { wishlistRouter } = await import("@/server/routers/wishlist");

      const mockUser = { id: "user-123", email: "test@test.com" };
      const mockClient = createMockClient({
        getUser: { data: { user: mockUser }, error: null },
        fromResults: {
          wishlists: { data: { id: "wl-1" }, error: null },
          wishlist_items: { data: null, error: null },
        },
      });
      vi.mocked(createSupabaseClient).mockReturnValue(mockClient as never);

      const testRouter = router({ wishlist: wishlistRouter });
      const ctx = createContext({
        req: new Request("http://localhost/api/trpc", {
          headers: { authorization: "Bearer valid-token" },
        }),
      });
      const caller = testRouter.createCaller(ctx);

      const result = await caller.wishlist.remove({ poiId: "poi-abc" });
      expect(result).toEqual({ success: true });
    });

    it("throws UNAUTHORIZED without valid token", async () => {
      const { router, createContext } = await import("@/server/trpc");
      const { wishlistRouter } = await import("@/server/routers/wishlist");

      const testRouter = router({ wishlist: wishlistRouter });
      const ctx = createContext();
      const caller = testRouter.createCaller(ctx);

      await expect(caller.wishlist.remove({ poiId: "poi-abc" })).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });
  });

  describe("update", () => {
    it("modifies daysMin for existing item", async () => {
      const { router, createContext } = await import("@/server/trpc");
      const { wishlistRouter } = await import("@/server/routers/wishlist");

      const mockUser = { id: "user-123", email: "test@test.com" };
      const mockClient = createMockClient({
        getUser: { data: { user: mockUser }, error: null },
        fromResults: {
          wishlists: { data: { id: "wl-1" }, error: null },
          wishlist_items: { data: null, error: null },
        },
      });
      vi.mocked(createSupabaseClient).mockReturnValue(mockClient as never);

      const testRouter = router({ wishlist: wishlistRouter });
      const ctx = createContext({
        req: new Request("http://localhost/api/trpc", {
          headers: { authorization: "Bearer valid-token" },
        }),
      });
      const caller = testRouter.createCaller(ctx);

      const result = await caller.wishlist.update({ poiId: "poi-abc", daysMin: 10 });
      expect(result).toEqual({ success: true });
    });

    it("throws UNAUTHORIZED without valid token", async () => {
      const { router, createContext } = await import("@/server/trpc");
      const { wishlistRouter } = await import("@/server/routers/wishlist");

      const testRouter = router({ wishlist: wishlistRouter });
      const ctx = createContext();
      const caller = testRouter.createCaller(ctx);

      await expect(caller.wishlist.update({ poiId: "poi-abc", daysMin: 10 })).rejects.toMatchObject(
        { code: "UNAUTHORIZED" },
      );
    });
  });

  describe("reorder", () => {
    it("updates position for all items in order", async () => {
      const { router, createContext } = await import("@/server/trpc");
      const { wishlistRouter } = await import("@/server/routers/wishlist");

      const mockUser = { id: "user-123", email: "test@test.com" };
      const mockClient = createMockClient({
        getUser: { data: { user: mockUser }, error: null },
        fromResults: {
          wishlists: { data: { id: "wl-1" }, error: null },
          wishlist_items: { data: null, error: null },
        },
      });
      vi.mocked(createSupabaseClient).mockReturnValue(mockClient as never);

      const testRouter = router({ wishlist: wishlistRouter });
      const ctx = createContext({
        req: new Request("http://localhost/api/trpc", {
          headers: { authorization: "Bearer valid-token" },
        }),
      });
      const caller = testRouter.createCaller(ctx);

      const result = await caller.wishlist.reorder({
        poiIds: ["poi-def", "poi-abc", "poi-ghi"],
      });
      expect(result).toEqual({ success: true });
    });

    it("throws UNAUTHORIZED without valid token", async () => {
      const { router, createContext } = await import("@/server/trpc");
      const { wishlistRouter } = await import("@/server/routers/wishlist");

      const testRouter = router({ wishlist: wishlistRouter });
      const ctx = createContext();
      const caller = testRouter.createCaller(ctx);

      await expect(caller.wishlist.reorder({ poiIds: ["poi-abc"] })).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });
  });
});
