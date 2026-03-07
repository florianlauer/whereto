import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { AppRouter } from "../server/router";

const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>();

export { TRPCProvider, useTRPC, useTRPCClient };
