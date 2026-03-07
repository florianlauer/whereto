---
phase: 01-backend-foundation
plan: 02
subsystem: api
tags: [trpc, hono, react-query, vercel-serverless, supabase, typescript]

# Dependency graph
requires:
  - phase: 01-backend-foundation/01
    provides: "Database schema with TypeScript types (database.types.ts)"
provides:
  - "tRPC server with health, wishlist, profile routers via Hono on Vercel"
  - "Client-side tRPC context (TRPCProvider, useTRPC) wired into React app"
  - "Server-side Supabase admin client (supabaseAdmin) for bypassing RLS"
  - "tsconfig.server.json covering api/ and src/server/"
  - "Env var security: service_role key excluded from client bundle"
affects: [02-auth, 03-wishlist-crud, 04-wishlist-sync]

# Tech tracking
tech-stack:
  added:
    [
      "@trpc/server@11.12.0",
      "@trpc/client@11.12.0",
      "@trpc/tanstack-react-query@11.12.0",
      "@tanstack/react-query@5.90.21",
      "hono@4.12.5",
      "@hono/trpc-server@0.4.2",
      "@hono/node-server@1.19.11",
      "@supabase/supabase-js@2.98.0",
      "@tanstack/react-query-devtools@5.91.3",
    ]
  patterns: [hono-trpc-serverless, trpc-v11-context-pattern, type-only-router-import]

key-files:
  created:
    - api/index.ts
    - src/server/trpc.ts
    - src/server/db.ts
    - src/server/router.ts
    - src/server/routers/health.ts
    - src/server/routers/wishlist.ts
    - src/server/routers/profile.ts
    - src/lib/trpc.ts
    - tsconfig.server.json
    - .env.example
  modified:
    - package.json
    - tsconfig.json
    - tsconfig.app.json
    - src/main.tsx
    - .gitignore

key-decisions:
  - "Hono with basePath('/api') as Vercel serverless entry -- aligns with existing vercel.json rewrite"
  - "tRPC v11 createTRPCContext pattern for React integration (type-only AppRouter import prevents server code leaking to client)"
  - "Excluded src/server from tsconfig.app.json to prevent DOM/JSX conflicts with server code"

patterns-established:
  - "Server entry: api/index.ts -> Hono app -> tRPC middleware on /trpc/*"
  - "tRPC context: createContext() returns { supabaseAdmin } -- expandable with user JWT in Phase 2"
  - "Client tRPC: import type AppRouter only -- never import server runtime code in client bundle"
  - "Stub routers: new domain routers start with placeholder procedures, filled in later phases"

requirements-completed: [INFRA-02, INFRA-04]

# Metrics
duration: 4min
completed: 2026-03-07
---

# Phase 1 Plan 02: API Skeleton Summary

**tRPC v11 server on Hono/Vercel with health/wishlist/profile routers, React QueryClient + TRPCProvider wiring, and verified env var isolation**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-07T19:59:19Z
- **Completed:** 2026-03-07T20:03:14Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments

- Full tRPC server with Hono entry point at api/index.ts, ready for Vercel serverless deployment
- Three domain routers (health, wishlist, profile) with stub procedures for progressive enhancement
- React app wired with TRPCProvider + QueryClientProvider, typed tRPC client ready for use
- Verified INFRA-04: no service_role key in client bundle (dist/)
- Server-side TypeScript config (tsconfig.server.json) integrated into project references

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create tRPC server with Hono entry point** - `7390db1` (feat)
2. **Task 2: Wire tRPC client into React app and verify security** - `e658d12` (feat)

## Files Created/Modified

- `api/index.ts` - Hono entry point with tRPC middleware for Vercel serverless
- `src/server/db.ts` - Supabase admin client factory (service_role, server-only)
- `src/server/trpc.ts` - tRPC initialization with context creation
- `src/server/router.ts` - App router merging all domain routers
- `src/server/routers/health.ts` - Health check router (ping query)
- `src/server/routers/wishlist.ts` - Stub wishlist router (Phase 3)
- `src/server/routers/profile.ts` - Stub profile router (Phase 2)
- `src/lib/trpc.ts` - Client-side tRPC context (TRPCProvider, useTRPC, useTRPCClient)
- `src/main.tsx` - Updated with QueryClientProvider + TRPCProvider wrapping
- `tsconfig.server.json` - Server TypeScript config covering api/ and src/server/
- `tsconfig.json` - Added server tsconfig reference
- `tsconfig.app.json` - Excluded src/server from client compilation
- `package.json` - Added tRPC, Hono, React Query, Supabase dependencies
- `.env.example` - Template for all required environment variables
- `.gitignore` - Added .env.local and supabase/.temp/

## Decisions Made

- Hono with basePath('/api') as Vercel serverless entry -- aligns with existing vercel.json rewrite
- tRPC v11 createTRPCContext pattern for React integration (type-only AppRouter import prevents server code leaking to client)
- Excluded src/server from tsconfig.app.json to prevent DOM/JSX type conflicts with server code

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Excluded src/server from tsconfig.app.json**

- **Found during:** Task 1
- **Issue:** Server code (using process.env, no DOM types) would fail compilation under tsconfig.app.json which includes DOM lib
- **Fix:** Added "src/server" to tsconfig.app.json exclude array
- **Files modified:** tsconfig.app.json
- **Verification:** `bun run type` passes cleanly (both client and server configs)
- **Committed in:** 7390db1 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for correct type separation between client and server code. No scope creep.

## Issues Encountered

None -- all verifications passed on first attempt.

## User Setup Required

None - no additional external service configuration required (env vars already configured in Plan 01).

## Next Phase Readiness

- tRPC API skeleton complete, ready for authenticated procedures in Phase 2
- Context expandable: add user JWT parsing to createContext() for protected procedures
- Stub routers in place for wishlist (Phase 3) and profile (Phase 2) domains
- health.ping endpoint ready for deployment verification

---

_Phase: 01-backend-foundation_
_Completed: 2026-03-07_
