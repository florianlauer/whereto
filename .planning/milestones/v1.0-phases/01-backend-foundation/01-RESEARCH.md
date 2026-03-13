# Phase 1: Backend Foundation - Research

**Researched:** 2026-03-07
**Domain:** Supabase DB + tRPC + Hono API on Vercel Serverless
**Confidence:** HIGH

## Summary

Phase 1 stands up the backend infrastructure: Supabase schema with RLS, a tRPC API served through Hono on a Vercel serverless function, auto-creation triggers for profiles/wishlists, and the tRPC client wired into the existing React app. No UI changes, no auth UI.

The stack is well-established: tRPC v11 with the new `@trpc/tanstack-react-query` integration, Hono as the HTTP layer with `@hono/trpc-server` middleware, and `@supabase/supabase-js` for DB access. The project already has a `vercel.json` rewrite pointing `/api/*` to `/api/index.ts`, so the server entry point location is locked. Supabase CLI runs locally via Docker for a migrations-first development workflow.

**Primary recommendation:** Use Hono as the catch-all HTTP handler at `api/index.ts` with tRPC mounted on `/api/trpc/*`. Supabase client is instantiated server-side only using env vars (no `VITE_` prefix for service role key). Use the new tRPC v11 `@trpc/tanstack-react-query` integration (not the legacy `@trpc/react-query`).

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- One wishlist per user (enforced default, `wishlists` table exists for future extensibility)
- `wishlist_items` stores: poi_id, country_code, position (ordering column), created_at, updated_at
- DB schema is its own normalized source of truth -- a mapping layer translates between DB rows and the existing client-side `WishlistItem` type
- `profiles` table is minimal: id (FK to auth.users), created_at, updated_at -- no display fields for now
- Trigger auto-creates a `profiles` row and a default `wishlists` row on user signup
- Supabase CLI with local Docker for development (migrations-first workflow)
- Supabase CLI installed via devenv.nix (not npm)
- Basic seed data: 2-3 test users with sample wishlist items in `supabase/seed.sql`
- Existing cloud Supabase project -- user will provide project ref and keys for linking
- One tRPC router per domain (wishlist, profile, health) merged into an appRouter
- Phase 1 includes both server deployment AND tRPC client setup on the frontend (provider, hooks, React Query)
- Supabase codegen (`supabase gen types typescript`) generates a `Database` type from the live schema
- Generated type file committed to repo (e.g. `src/lib/database.types.ts`), updated via script when schema changes
- Zod validation on all tRPC mutation inputs (Zod already in dependencies)
- Client gets types through tRPC inference -- no manual type duplication

### Claude's Discretion

- Server code folder structure (api/ at root vs src/server/)
- API shape: Hono as catch-all for /api/\* with tRPC mounted, or tRPC-only
- RLS policy specifics
- Trigger implementation details
- React Query configuration

### Deferred Ideas (OUT OF SCOPE)

None -- discussion stayed within phase scope.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID       | Description                                                                | Research Support                                                                                                 |
| -------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| INFRA-01 | Tables `profiles`, `wishlists`, `wishlist_items` with RLS active           | Schema design locked in CONTEXT.md, RLS patterns documented below, Supabase migration workflow researched        |
| INFRA-02 | API tRPC + Hono deployed on Vercel Function at `/api/trpc/*`               | Hono + `@hono/trpc-server` middleware pattern, Vercel entry point at `api/index.ts`, fetchRequestHandler adapter |
| INFRA-03 | Trigger DB auto-creation profile + wishlist on signup                      | `SECURITY DEFINER` trigger pattern on `auth.users` INSERT, official Supabase docs pattern                        |
| INFRA-04 | Env vars secured (service*role never exposed client-side via VITE* prefix) | Supabase client instantiated server-side only with non-prefixed env vars, Vite only exposes `VITE_*` vars        |

</phase_requirements>

## Standard Stack

### Core

| Library                      | Version | Purpose                       | Why Standard                                                        |
| ---------------------------- | ------- | ----------------------------- | ------------------------------------------------------------------- |
| `@trpc/server`               | ^11.10  | Type-safe API layer           | Latest stable, TanStack Query v5 support, fetch adapter for Vercel  |
| `@trpc/client`               | ^11.10  | Client-side tRPC calls        | Required companion to @trpc/server                                  |
| `@trpc/tanstack-react-query` | ^11.10  | React integration for tRPC    | New v11 integration, replaces legacy @trpc/react-query, simpler API |
| `@tanstack/react-query`      | ^5      | Server state management       | Required by tRPC React integration, industry standard               |
| `hono`                       | ^4      | HTTP framework for API        | Lightweight, Vercel zero-config, tRPC middleware available          |
| `@hono/trpc-server`          | ^0.4    | Mount tRPC on Hono            | Official middleware from Hono ecosystem                             |
| `@hono/node-server`          | ^1      | Vercel Node.js adapter        | Provides `handle()` for Vercel serverless (Node.js runtime)         |
| `@supabase/supabase-js`      | ^2.98   | Supabase client (server-side) | Official JS SDK, typed with generated Database types                |
| `zod`                        | ^3      | Input validation              | Already in project, used for tRPC mutation inputs                   |

### Supporting

| Library                          | Version | Purpose                        | When to Use                       |
| -------------------------------- | ------- | ------------------------------ | --------------------------------- |
| `supabase` (CLI)                 | latest  | Local dev, migrations, codegen | Installed via devenv.nix, not npm |
| `@tanstack/react-query-devtools` | ^5      | Debug React Query cache        | Dev-only, optional but helpful    |

### Alternatives Considered

| Instead of                   | Could Use                                  | Tradeoff                                                                           |
| ---------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------- |
| Hono + tRPC                  | tRPC standalone (fetch adapter only)       | Hono adds health endpoint, future middleware flexibility; slight overhead          |
| `@hono/trpc-server`          | Manual `fetchRequestHandler` in Hono route | Middleware is cleaner, handles path stripping; manual approach has full control    |
| `@trpc/tanstack-react-query` | `@trpc/react-query` (legacy)               | Legacy still works but deprecated path; new integration is simpler and recommended |

**Installation:**

```bash
bun add @trpc/server @trpc/client @trpc/tanstack-react-query @tanstack/react-query hono @hono/trpc-server @hono/node-server @supabase/supabase-js
bun add -d @tanstack/react-query-devtools
```

## Architecture Patterns

### Recommended Project Structure (Claude's Discretion)

Recommendation: keep server code in `src/server/` to share the `@/` path alias and tsconfig, with only the Vercel entry point at `api/index.ts`.

```
api/
  index.ts              # Vercel entry point: creates Hono app, mounts tRPC, exports handle()
src/
  server/
    trpc.ts             # tRPC init (initTRPC, context creation)
    router.ts           # appRouter (merges domain routers)
    routers/
      health.ts         # health.ping procedure
      wishlist.ts       # wishlist CRUD (Phase 3 fills in, Phase 1 stubs)
      profile.ts        # profile procedures (Phase 1 stubs)
    db.ts               # Supabase client factory (server-side only)
  lib/
    database.types.ts   # Generated by `supabase gen types typescript`
    trpc.ts             # Client-side: createTRPCContext, TRPCProvider, useTRPC
  main.tsx              # Wrap app with TRPCProvider + QueryClientProvider
supabase/
  config.toml           # Supabase local config (created by `supabase init`)
  migrations/
    00001_initial_schema.sql  # profiles, wishlists, wishlist_items + RLS
  seed.sql              # Test data
```

### Pattern 1: Hono + tRPC Entry Point (Vercel Serverless)

**What:** Hono app at `api/index.ts` as catch-all, tRPC mounted as middleware
**When to use:** Always -- this is the server entry point

```typescript
// api/index.ts
import { Hono } from "hono";
import { handle } from "@hono/node-server/vercel";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "../src/server/router";
import { createContext } from "../src/server/trpc";

const app = new Hono().basePath("/api");

// Health check (non-tRPC)
app.get("/health", (c) => c.json({ ok: true }));

// Mount tRPC
app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
  }),
);

export default handle(app);
```

### Pattern 2: tRPC Init + Context with Supabase

**What:** Initialize tRPC with Supabase client in context
**When to use:** Server-side tRPC setup

```typescript
// src/server/trpc.ts
import { initTRPC } from "@trpc/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

// Server-side Supabase client (service role -- bypasses RLS)
const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export function createContext(opts?: FetchCreateContextFnOptions) {
  return { supabaseAdmin };
}

type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
```

Note: In Phase 2, the context will be extended to extract the user's JWT from the Authorization header and create a per-request Supabase client with the user's session (respecting RLS). For Phase 1, the admin client is sufficient for testing.

### Pattern 3: tRPC Client Setup (React)

**What:** Wire tRPC into the React app using v11 `@trpc/tanstack-react-query`
**When to use:** Client-side setup in `src/lib/trpc.ts` and `src/main.tsx`

```typescript
// src/lib/trpc.ts
import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { AppRouter } from "../server/router";

export const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>();
```

```typescript
// In src/main.tsx -- wrap the app
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { TRPCProvider } from "./lib/trpc";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
});

const trpcClient = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: "/api/trpc" })],
});

// Wrap: <QueryClientProvider> -> <TRPCProvider> -> <App/>
```

### Pattern 4: Database Migration (Supabase)

**What:** Schema creation via SQL migration file
**When to use:** First migration for initial tables

```sql
-- supabase/migrations/00001_initial_schema.sql

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Wishlists
create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id) -- one wishlist per user for now
);
alter table public.wishlists enable row level security;

-- Wishlist items
create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  poi_id text not null,
  country_code text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(wishlist_id, poi_id) -- no duplicate POIs per wishlist
);
alter table public.wishlist_items enable row level security;

-- RLS policies
-- Profiles: users can only read/update their own profile
create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id);

-- Wishlists: users can only access their own wishlist
create policy "Users can view own wishlists"
  on public.wishlists for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can update own wishlists"
  on public.wishlists for update
  to authenticated
  using ((select auth.uid()) = user_id);

-- Wishlist items: access through wishlist ownership
create policy "Users can view own wishlist items"
  on public.wishlist_items for select
  to authenticated
  using (
    wishlist_id in (
      select id from public.wishlists where user_id = (select auth.uid())
    )
  );

create policy "Users can insert own wishlist items"
  on public.wishlist_items for insert
  to authenticated
  with check (
    wishlist_id in (
      select id from public.wishlists where user_id = (select auth.uid())
    )
  );

create policy "Users can update own wishlist items"
  on public.wishlist_items for update
  to authenticated
  using (
    wishlist_id in (
      select id from public.wishlists where user_id = (select auth.uid())
    )
  );

create policy "Users can delete own wishlist items"
  on public.wishlist_items for delete
  to authenticated
  using (
    wishlist_id in (
      select id from public.wishlists where user_id = (select auth.uid())
    )
  );

-- Auto-creation trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  new_profile_id uuid;
begin
  insert into public.profiles (id)
  values (new.id);

  insert into public.wishlists (user_id)
  values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at auto-update trigger
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.wishlists
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.wishlist_items
  for each row execute function public.handle_updated_at();
```

### Anti-Patterns to Avoid

- **Exposing service_role key client-side:** Never use `VITE_SUPABASE_SERVICE_ROLE_KEY`. Vite bundles all `VITE_*` vars into the client bundle. The service role key must only be accessed via `process.env` in server code.
- **Using `auth.uid()` without `(select ...)` wrapper in RLS:** Performance trap -- `auth.uid()` gets called per-row without the select wrapper. Always use `(select auth.uid())` for caching.
- **INSERT policy with USING instead of WITH CHECK:** INSERT policies must use `WITH CHECK`, not `USING`. SELECT/DELETE use `USING`. UPDATE uses both.
- **Importing server code in client:** Use `import type` for the AppRouter type. Never import the actual router or context in client code.

## Don't Hand-Roll

| Problem              | Don't Build                          | Use Instead                     | Why                                                    |
| -------------------- | ------------------------------------ | ------------------------------- | ------------------------------------------------------ |
| Type-safe API        | Custom REST + manual types           | tRPC                            | End-to-end type inference, no codegen needed           |
| DB types from schema | Manual TypeScript interfaces         | `supabase gen types typescript` | Always in sync with actual schema                      |
| Input validation     | Manual checks in procedures          | Zod schemas in tRPC `.input()`  | Runtime validation + TypeScript inference in one       |
| Migration management | Raw SQL scripts with manual ordering | Supabase CLI migrations         | Versioned, reversible, applied in order                |
| React server state   | Custom fetch + useState              | React Query via tRPC            | Caching, dedup, background refetch, optimistic updates |

**Key insight:** The entire type chain flows automatically: DB schema -> codegen -> tRPC procedures -> client inference. No manual type duplication at any point.

## Common Pitfalls

### Pitfall 1: @hono/trpc-server + @trpc/server Version Mismatch

**What goes wrong:** TypeScript compilation errors (TS2332) when versions are incompatible
**Why it happens:** `@hono/trpc-server` 0.3.x had issues with `@trpc/server` 11.4.x. Documented in [honojs/middleware#1231](https://github.com/honojs/middleware/issues/1231).
**How to avoid:** Use `@hono/trpc-server` >=0.4.2 with `@trpc/server` >=11.10. Pin both and test TypeScript compilation early.
**Warning signs:** TS errors about incompatible types in trpcServer middleware.

### Pitfall 2: Trigger Blocking Signups

**What goes wrong:** If the `handle_new_user` trigger function fails (e.g., unique constraint violation, bad SQL), user signup is completely blocked.
**Why it happens:** The trigger runs inside the auth transaction. An error rolls back the entire signup.
**How to avoid:** Keep the trigger function minimal. Test it thoroughly with `supabase db reset`. Use `SECURITY DEFINER` so it runs with elevated privileges regardless of RLS.
**Warning signs:** Signups return 500 errors with no user created.

### Pitfall 3: Vercel Entry Point Path Mismatch

**What goes wrong:** API calls return the SPA HTML instead of JSON responses.
**Why it happens:** The `vercel.json` rewrite points `/api/*` to `/api/index.ts`. If the file isn't at that exact path, or the export is wrong, Vercel falls through to the SPA catch-all.
**How to avoid:** File must be at `api/index.ts` (root level, not `src/api/`). Must use `export default handle(app)` for Node.js runtime.
**Warning signs:** `/api/trpc/health.ping` returns HTML content-type.

### Pitfall 4: VITE\_ Prefix Leaking Secrets

**What goes wrong:** `SUPABASE_SERVICE_ROLE_KEY` appears in the client bundle, exposing full DB access.
**Why it happens:** Vite replaces all `import.meta.env.VITE_*` at build time. Accidentally naming a secret with `VITE_` prefix includes it in `dist/`.
**How to avoid:** Server env vars must NOT have `VITE_` prefix. Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are safe for client. Verify with `grep -r "service_role" dist/` after build.
**Warning signs:** `VITE_SUPABASE_SERVICE_ROLE_KEY` in `.env` or environment config.

### Pitfall 5: tsconfig Not Covering Server Code

**What goes wrong:** TypeScript errors or missing type checking for `api/` and `src/server/` directories.
**Why it happens:** Current `tsconfig.app.json` only includes `src/` and excludes test files. `api/` is at root level, not covered.
**How to avoid:** Either create a separate `tsconfig.server.json` that includes `api/` and `src/server/`, or add `api/` to existing includes. The Vercel build uses its own TypeScript compilation for `api/`, but local type-checking needs coverage.
**Warning signs:** IDE shows no errors in server code even with obvious type bugs.

### Pitfall 6: Circular Import Between Client and Server

**What goes wrong:** Client bundle includes server-side code (Supabase service role client, Node.js APIs).
**Why it happens:** Importing `AppRouter` directly (not `import type`) pulls in the entire server dependency tree.
**How to avoid:** Always use `import type { AppRouter }` in client code. The `type` modifier ensures it's erased at compile time.
**Warning signs:** Bundle size spike, `process.env` references in client bundle, build errors about Node.js modules.

## Code Examples

### Supabase Client Factory (Server-Side)

```typescript
// src/server/db.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";

// Admin client -- bypasses RLS, for triggers and admin operations
export const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Per-user client -- respects RLS (Phase 2: uses user's JWT)
export function createSupabaseClient(supabaseAccessToken?: string) {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    supabaseAccessToken
      ? { global: { headers: { Authorization: `Bearer ${supabaseAccessToken}` } } }
      : undefined,
  );
}
```

### Health Check tRPC Router

```typescript
// src/server/routers/health.ts
import { router, publicProcedure } from "../trpc";

export const healthRouter = router({
  ping: publicProcedure.query(() => {
    return { status: "ok", timestamp: new Date().toISOString() };
  }),
});
```

### App Router

```typescript
// src/server/router.ts
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
```

### Component Usage (v11 pattern)

```typescript
// In any React component
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc';

function HealthStatus() {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.health.ping.queryOptions());
  return <span>{data?.status}</span>;
}
```

### Supabase Type Generation Script

```bash
# Add to package.json scripts:
# "db:types": "supabase gen types typescript --local > src/lib/database.types.ts"
# Run after any migration change
```

## State of the Art

| Old Approach                      | Current Approach                   | When Changed    | Impact                                                 |
| --------------------------------- | ---------------------------------- | --------------- | ------------------------------------------------------ |
| `@trpc/react-query` (v10 pattern) | `@trpc/tanstack-react-query` (v11) | tRPC v11 (2025) | Simpler API, `useTRPC()` + standard React Query hooks  |
| `createTRPCReact` wrapper         | `createTRPCContext` + `useTRPC`    | tRPC v11        | More composable, works with React Query v5 natively    |
| `httpBatchLink` only              | `httpBatchStreamLink` available    | tRPC v11        | Streaming responses, progressive loading               |
| Supabase client v1                | supabase-js v2 (2.98.x)            | 2023+           | Better TypeScript, async auth, improved error handling |

**Deprecated/outdated:**

- `@trpc/react-query`: Still works but legacy path. New projects should use `@trpc/tanstack-react-query`
- `.interop()` mode from tRPC v9: Removed in v11

## Open Questions

1. **Vercel Node.js vs Edge runtime for API**
   - What we know: `handle()` from `@hono/node-server/vercel` targets Node.js runtime. Default Hono export targets Edge.
   - What's unclear: Whether the default export (Edge) works out of the box with vercel.json rewrites or if Node.js `handle()` is required.
   - Recommendation: Use `@hono/node-server/vercel` handle() for Node.js runtime. It's more compatible with `@supabase/supabase-js` and `process.env`. If Edge is preferred later, can swap to default export.

2. **TypeScript compilation for `api/` directory**
   - What we know: `tsconfig.app.json` only includes `src/`. Vercel handles its own TS compilation for serverless functions.
   - What's unclear: Whether a separate tsconfig is needed for local type-checking of `api/index.ts`.
   - Recommendation: Create a minimal `tsconfig.server.json` that includes both `api/` and `src/server/`. This ensures IDE support and `tsc --noEmit` catches errors.

## Validation Architecture

### Test Framework

| Property           | Value                       |
| ------------------ | --------------------------- |
| Framework          | vitest 3.x                  |
| Config file        | `vitest.config.ts` (exists) |
| Quick run command  | `bun run test`              |
| Full suite command | `bun run test`              |

### Phase Requirements -> Test Map

| Req ID   | Behavior                                  | Test Type                    | Automated Command                                        | File Exists? |
| -------- | ----------------------------------------- | ---------------------------- | -------------------------------------------------------- | ------------ |
| INFRA-01 | Tables exist with RLS active              | integration (Supabase local) | `supabase db reset && supabase test db`                  | No -- Wave 0 |
| INFRA-02 | tRPC call returns valid response          | integration                  | `vitest run src/server/__tests__/health.test.ts`         | No -- Wave 0 |
| INFRA-03 | Signup trigger creates profile + wishlist | integration (Supabase local) | `supabase test db` or manual test via Supabase Dashboard | No -- Wave 0 |
| INFRA-04 | Service role key not in client bundle     | smoke                        | `bun run build && ! grep -r "service_role" dist/`        | No -- Wave 0 |

### Sampling Rate

- **Per task commit:** `bun run test`
- **Per wave merge:** `bun run test && bun run build`
- **Phase gate:** Full suite green + build succeeds + grep check on dist/

### Wave 0 Gaps

- [ ] `src/server/__tests__/health.test.ts` -- covers INFRA-02 (tRPC health endpoint responds)
- [ ] `supabase/tests/` or pgTAP setup -- covers INFRA-01, INFRA-03 (schema + trigger verification). Alternative: manual verification via `supabase db reset` + Supabase Studio inspection.
- [ ] Build-time check script for INFRA-04 (grep dist/ for service_role key)
- [ ] vitest config may need a separate server config (no jsdom) for testing server code

## Sources

### Primary (HIGH confidence)

- [tRPC v11 official docs - Fetch adapter](https://trpc.io/docs/server/adapters/fetch) - fetchRequestHandler setup, context creation
- [tRPC v11 official docs - TanStack React Query setup](https://trpc.io/docs/client/tanstack-react-query/setup) - createTRPCContext, TRPCProvider, useTRPC pattern
- [tRPC v11 announcement](https://trpc.io/blog/announcing-trpc-v11) - v11 features, breaking changes from v10
- [Supabase docs - Managing user data](https://supabase.com/docs/guides/auth/managing-user-data) - handle_new_user trigger with SECURITY DEFINER
- [Supabase docs - Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) - RLS policy patterns, auth.uid() usage
- [Supabase docs - Local development](https://supabase.com/docs/guides/local-development/overview) - CLI workflow, migrations, seeding
- [Supabase docs - Generating types](https://supabase.com/docs/guides/api/rest/generating-types) - supabase gen types typescript
- [Hono docs - Vercel](https://hono.dev/docs/getting-started/vercel) - default export, handle() pattern

### Secondary (MEDIUM confidence)

- [honojs/middleware - @hono/trpc-server README](https://github.com/honojs/middleware/tree/main/packages/trpc-server) - trpcServer middleware usage, context access
- [honojs/middleware#1231](https://github.com/honojs/middleware/issues/1231) - Version compatibility issue between @hono/trpc-server and @trpc/server

### Tertiary (LOW confidence)

- npm version checks via WebSearch for @supabase/supabase-js (2.98.0), @trpc/server (11.10.0), @hono/trpc-server (0.4.2) -- versions may have updated since research

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - all libraries are well-documented, actively maintained, versions verified
- Architecture: HIGH - patterns come from official docs, project constraints are clear
- Pitfalls: HIGH - documented issues with sources, version compatibility confirmed
- Validation: MEDIUM - test strategy is sound but pgTAP/Supabase test tooling not deeply researched

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable ecosystem, 30-day validity)
