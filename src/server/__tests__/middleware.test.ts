import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock the db module before importing anything that uses it
vi.mock("@/server/db", () => {
  const mockGetUser = vi.fn();
  return {
    supabaseAdmin: {},
    createSupabaseClient: vi.fn(() => ({
      auth: { getUser: mockGetUser },
    })),
    __mockGetUser: mockGetUser,
  };
});

import { createSupabaseClient } from "@/server/db";

describe("tRPC auth middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects without token: throws UNAUTHORIZED TRPCError", async () => {
    const { router, publicProcedure, createContext } = await import("@/server/trpc");
    const { protectedProcedure } = await import("@/server/middleware");

    const testRouter = router({
      protectedRoute: protectedProcedure.query(() => "ok"),
    });

    // Create caller with no Authorization header
    const caller = testRouter.createCaller(createContext());

    await expect(caller.protectedRoute()).rejects.toThrow(TRPCError);
    await expect(caller.protectedRoute()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects with invalid token: throws UNAUTHORIZED when getUser fails", async () => {
    const { router, createContext } = await import("@/server/trpc");
    const { protectedProcedure } = await import("@/server/middleware");

    // Mock getUser to return error
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error("invalid token"),
        }),
      },
    };
    vi.mocked(createSupabaseClient).mockReturnValue(mockClient as never);

    const testRouter = router({
      protectedRoute: protectedProcedure.query(() => "ok"),
    });

    // Create context with a bad token
    const ctx = createContext({
      req: new Request("http://localhost/api/trpc", {
        headers: { authorization: "Bearer bad-token" },
      }),
    });
    const caller = testRouter.createCaller(ctx);

    await expect(caller.protectedRoute()).rejects.toThrow(TRPCError);
    await expect(caller.protectedRoute()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("passes with valid token: adds user to context and succeeds", async () => {
    const { router, createContext } = await import("@/server/trpc");
    const { protectedProcedure } = await import("@/server/middleware");

    const mockUser = { id: "123", email: "test@test.com" };
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    };
    vi.mocked(createSupabaseClient).mockReturnValue(mockClient as never);

    const testRouter = router({
      protectedRoute: protectedProcedure.query(({ ctx }) => {
        return { userId: ctx.user.id, email: ctx.user.email };
      }),
    });

    const ctx = createContext({
      req: new Request("http://localhost/api/trpc", {
        headers: { authorization: "Bearer good-token" },
      }),
    });
    const caller = testRouter.createCaller(ctx);

    const result = await caller.protectedRoute();
    expect(result).toEqual({ userId: "123", email: "test@test.com" });
  });
});
