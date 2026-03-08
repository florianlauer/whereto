import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "../src/server/router";
import { createContext } from "../src/server/trpc";

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true }));

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
  }),
);

const port = 3001;

serve({ fetch: app.fetch, port }, () => {
  console.log(`API dev server running on http://localhost:${port}`);
});
