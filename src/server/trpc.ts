import { initTRPC } from "@trpc/server";
import { supabaseAdmin, createSupabaseClient } from "./db";

export function createContext(opts?: { req: Request }) {
  const authHeader = opts?.req?.headers.get("authorization");
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  return {
    supabaseAdmin,
    supabaseUser: createSupabaseClient(accessToken),
    accessToken,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
export const baseProcedure = t.procedure;
