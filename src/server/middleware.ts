import { TRPCError } from "@trpc/server";
import { middleware, baseProcedure } from "./trpc";

const isAuthed = middleware(async ({ ctx, next }) => {
  if (!ctx.accessToken) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Missing access token" });
  }

  // Use getUser() -- NOT getSession() -- to validate the token server-side
  const {
    data: { user },
    error,
  } = await ctx.supabaseUser.auth.getUser();

  if (error || !user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired token" });
  }

  return next({
    ctx: {
      ...ctx,
      user,
    },
  });
});

export const protectedProcedure = baseProcedure.use(isAuthed);
