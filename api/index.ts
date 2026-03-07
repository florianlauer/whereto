import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { handle } from "@hono/node-server/vercel";
import { appRouter } from "../src/server/router";
import { createContext } from "../src/server/trpc";

const app = new Hono().basePath("/api");

app.get("/health", (c) => {
  return c.json({ ok: true });
});

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
  }),
);

export default handle(app);
