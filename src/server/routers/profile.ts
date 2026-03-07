import { router } from "../trpc";
import { protectedProcedure } from "../middleware";

export const profileRouter = router({
  /** Returns the authenticated user's profile info */
  me: protectedProcedure.query(({ ctx }) => {
    return { id: ctx.user.id, email: ctx.user.email };
  }),
});
