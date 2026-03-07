import { router } from "./trpc";
import { healthRouter } from "./routers/health";
import { wishlistRouter } from "./routers/wishlist";
import { profileRouter } from "./routers/profile";

export const appRouter = router({
  health: healthRouter,
  wishlist: wishlistRouter,
  profile: profileRouter,
});

export type AppRouter = typeof appRouter;
