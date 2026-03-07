import { router, publicProcedure } from "../trpc";

export const wishlistRouter = router({
  /** Placeholder -- Phase 3 fills this in with authenticated CRUD */
  list: publicProcedure.query(() => {
    return [];
  }),
});
