import { router, publicProcedure } from "../trpc";

export const profileRouter = router({
  /** Placeholder -- Phase 2 fills this in with authenticated user profile */
  me: publicProcedure.query(() => {
    return null;
  }),
});
