# Technology Stack — Auth + API + Persistence Layer

**Project:** Whereto (Epic 4 — Backend milestone)
**Researched:** 2026-03-07
**Scope:** Libraries to add for auth, API layer, and DB persistence on top of existing React 19 + Vite 6 + TanStack Router + Zustand 5 SPA

## Recommended Stack

### Authentication

| Technology              | Version | Purpose                                                     | Why                                                                                                                                                           | Confidence |
| ----------------------- | ------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `@supabase/supabase-js` | ^2.98   | Auth client (magic link, OAuth, email/password) + DB client | Single SDK for both auth and DB operations. Built-in session management via localStorage (perfect for SPA). No need for `@supabase/ssr` in a client-only SPA. | HIGH       |

**Do NOT use `@supabase/ssr`** -- it exists for SSR frameworks (Next.js, SvelteKit) where sessions need cookie-based storage. Whereto is a pure SPA; `supabase-js` handles auth sessions via localStorage natively. Adding `@supabase/ssr` adds complexity for zero benefit.

### API Layer

| Technology                   | Version | Purpose                         | Why                                                                                                                                                               | Confidence |
| ---------------------------- | ------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `@trpc/server`               | ^11.12  | Server-side router + procedures | tRPC v11 is stable. End-to-end type safety without codegen. v11 has improved error handling, middleware chaining, and smaller bundles vs v10.                     | HIGH       |
| `@trpc/client`               | ^11.12  | Client-side RPC calls           | Required peer of tRPC server. Provides `httpBatchLink` for batching multiple procedure calls into a single HTTP request.                                          | HIGH       |
| `@trpc/tanstack-react-query` | ^11.12  | React hooks for tRPC            | Newer package name (replaces `@trpc/react-query` in v11). Generates `useQuery`/`useMutation` hooks from tRPC router type. Requires `@tanstack/react-query` ^5.80. | HIGH       |
| `@tanstack/react-query`      | ^5.90   | Async state management          | Required by tRPC React integration. Handles caching, refetching, optimistic updates. Already fits the TanStack ecosystem (Router is in the project).              | HIGH       |
| `hono`                       | ^4.12   | HTTP server framework           | Lightweight (14KB), fetch-API native, perfect for Vercel Functions. Middleware ecosystem includes CORS, auth, logging. Much lighter than Express for serverless.  | HIGH       |
| `@hono/trpc-server`          | ^0.4    | tRPC-Hono bridge middleware     | Official Hono middleware that mounts a tRPC router as Hono middleware. One-liner: `app.use('/trpc/*', trpcServer({ router, createContext }))`.                    | HIGH       |

### Database

| Technology          | Version  | Purpose                                     | Why                                                                                                                                                               | Confidence |
| ------------------- | -------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Supabase PostgreSQL | (hosted) | Persistent storage for wishlists + profiles | Managed Postgres with RLS. Free tier: 500MB storage, 50K monthly active users. No ORM needed -- `supabase-js` query builder is sufficient for the 3-table schema. | HIGH       |

### Supporting Libraries

| Library     | Version                | Purpose                              | When to Use                                                                                                                | Confidence |
| ----------- | ---------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `zod`       | ^3 (already installed) | Input validation for tRPC procedures | Every tRPC mutation/query input. Already in the project for route search params.                                           | HIGH       |
| `superjson` | ^2                     | Data transformer for tRPC            | If you need to send Date objects or other non-JSON types through tRPC. Optional but recommended for `added_at` timestamps. | MEDIUM     |

## What NOT to Use

| Technology             | Why Not                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@supabase/ssr`        | SPA does not need cookie-based sessions. `supabase-js` handles auth via localStorage.                                                                               |
| `@trpc/react-query`    | Deprecated package name in tRPC v11. Use `@trpc/tanstack-react-query` instead.                                                                                      |
| Prisma / Drizzle ORM   | Overkill for 3 tables with simple CRUD. Supabase client query builder is sufficient. Adds cold start time to serverless functions.                                  |
| Express                | Heavy for serverless. Hono is ~14KB vs Express ~200KB, starts faster in cold boot, and is fetch-API native.                                                         |
| NextAuth / Auth.js     | Designed for Next.js SSR. Supabase Auth covers all needed providers (magic link, Google OAuth, email/password) with less setup.                                     |
| Clerk                  | Good product but paid beyond 10K MAU. Supabase Auth is free up to 50K MAU and already provides the DB.                                                              |
| tRPC v10               | v11 is stable (11.12.0). v10 APIs are legacy. v11 has better middleware, smaller bundles, and improved DX.                                                          |
| REST (express/fastify) | tRPC provides end-to-end type safety for a fullstack TypeScript project. No Swagger/OpenAPI maintenance needed. REST only justified if non-TS clients need the API. |

## Architecture Decisions

### Server-Side Supabase Client (service_role vs anon key)

The tRPC server on Vercel Functions should use the **service_role key** to bypass RLS when needed, but the recommended pattern is:

1. Client sends the Supabase JWT (from `supabase.auth.getSession()`) in the Authorization header
2. tRPC context creates a Supabase client with the **anon key** + user JWT, so RLS applies automatically
3. Service role key reserved for admin operations only (e.g., the `handle_new_user` trigger runs server-side)

This pattern means RLS does the authorization work, and tRPC procedures don't need manual `user_id` checks.

### tRPC Client Configuration

```typescript
// Recommended: httpBatchLink (batches multiple calls in one HTTP request)
// Endpoint: /api/trpc (mounted via Hono on Vercel Function at /api/[[...trpc]].ts)
import { httpBatchLink } from "@trpc/client";

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      headers: async () => {
        const { data } = await supabase.auth.getSession();
        return {
          Authorization: data.session ? `Bearer ${data.session.access_token}` : "",
        };
      },
    }),
  ],
});
```

### Vercel Function Entry Point

```typescript
// api/[[...trpc]].ts (catch-all route for tRPC)
import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "../src/server/routers";
import { createContext } from "../src/server/context";

const app = new Hono();
app.use("/*", cors());
app.use("/api/trpc/*", trpcServer({ router: appRouter, createContext }));

export default app;
```

### TanStack Query Integration

Since `@tanstack/react-query` is new to the project, it needs a `QueryClientProvider` at the root. This does NOT conflict with Zustand -- they serve different purposes:

- **Zustand**: synchronous client state (static data, localStorage wishlist, UI state)
- **TanStack Query**: async server state (authenticated wishlist from Supabase via tRPC)

After auth, the wishlist source of truth moves from Zustand/localStorage to TanStack Query/Supabase. The Zustand wishlist store remains for anonymous users.

## Peer Dependency Matrix

| Package                             | Requires                                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `@trpc/tanstack-react-query` ^11.12 | `@tanstack/react-query` ^5.80, `@trpc/client` 11.12, `@trpc/server` 11.12, `react` >=18.2, `typescript` >=5.7 |
| `@hono/trpc-server` ^0.4            | `@trpc/server` ^10.10 or >11.0.0-rc, `hono` >=4.0                                                             |
| `@trpc/client` ^11.12               | `@trpc/server` 11.12                                                                                          |

All peer dependencies are satisfied by the recommended versions. No conflicts with existing React 19 or TypeScript 5.

## Installation

```bash
# Auth + DB client
bun add @supabase/supabase-js

# tRPC (server + client + React integration)
bun add @trpc/server @trpc/client @trpc/tanstack-react-query

# TanStack Query (required by tRPC React)
bun add @tanstack/react-query

# Hono (server framework + tRPC middleware)
bun add hono @hono/trpc-server

# Optional but recommended
bun add superjson

# Dev dependencies
bun add -d @tanstack/react-query-devtools
```

## Environment Variables

```bash
# Client-side (VITE_ prefix -- safe to expose, these are public Supabase keys)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Server-side only (Vercel env vars -- NEVER in client bundle)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Version Verification

All versions verified against npm registry on 2026-03-07:

| Package                      | Latest on npm | Recommended |
| ---------------------------- | ------------- | ----------- |
| `@supabase/supabase-js`      | 2.98.0        | ^2.98       |
| `@trpc/server`               | 11.12.0       | ^11.12      |
| `@trpc/client`               | 11.12.0       | ^11.12      |
| `@trpc/tanstack-react-query` | 11.12.0       | ^11.12      |
| `@tanstack/react-query`      | 5.90.21       | ^5.90       |
| `hono`                       | 4.12.5        | ^4.12       |
| `@hono/trpc-server`          | 0.4.2         | ^0.4        |
| `superjson`                  | (latest)      | ^2          |

## Sources

- npm registry (direct version queries, 2026-03-07)
- https://trpc.io/docs/client/react/setup -- tRPC v11 React setup
- https://trpc.io/docs/server/adapters/fetch -- tRPC fetch adapter
- https://supabase.com/docs/guides/auth/quickstarts/react -- Supabase Auth for React SPA
- https://supabase.com/docs/guides/auth/server-side/overview -- @supabase/ssr not needed for SPA
- https://hono.dev/docs/getting-started/vercel -- Hono on Vercel
- https://github.com/honojs/middleware/tree/main/packages/trpc-server -- @hono/trpc-server usage
