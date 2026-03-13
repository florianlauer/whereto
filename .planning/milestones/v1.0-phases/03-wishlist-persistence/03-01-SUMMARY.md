---
phase: 03-wishlist-persistence
plan: 01
subsystem: api
tags: [trpc, supabase, zustand, wishlist, crud, zod]

# Dependency graph
requires:
  - phase: 01-backend-foundation
    provides: "Supabase schema (wishlists, wishlist_items), tRPC setup, Hono serverless"
  - phase: 02-authentication
    provides: "protectedProcedure middleware, auth context with supabaseUser"
provides:
  - "5 tRPC endpoints: list, add, remove, update, reorder"
  - "days_min column on wishlist_items table"
  - "setWishlistItems Zustand action for server data replacement"
  - "getWishlistId helper for resolving user's wishlist"
affects: [03-02, 03-03, 04-wishlist-sync]

# Tech tracking
tech-stack:
  added: []
  patterns:
    [
      "snake_case to camelCase mapping in router layer",
      "getWishlistId shared helper for all mutations",
      "publicProcedure with accessToken check for graceful unauthenticated fallback",
    ]

key-files:
  created:
    - supabase/migrations/00002_add_days_min.sql
    - src/server/__tests__/wishlist.test.ts
  modified:
    - src/server/routers/wishlist.ts
    - src/stores/appStore.ts
    - src/lib/database.types.ts

key-decisions:
  - "list uses publicProcedure with accessToken guard -- returns [] for anonymous users instead of throwing"
  - "add uses upsert with onConflict to handle duplicate poi_id silently"
  - "reorder uses Promise.all for parallel position updates"

patterns-established:
  - "Router-level snake_case/camelCase mapping: DB columns stay snake_case, JS types stay camelCase"
  - "Shared getWishlistId helper resolves user's single wishlist for all mutations"

requirements-completed: [WISH-01, WISH-06]

# Metrics
duration: 4min
completed: 2026-03-08
---

# Phase 3 Plan 1: Wishlist CRUD Router Summary

**5 tRPC endpoints (list/add/remove/update/reorder) with Zod validation, snake_case mapping, days_min migration, and setWishlistItems store action**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-08T20:34:22Z
- **Completed:** 2026-03-08T20:38:39Z
- **Tasks:** 1
- **Files modified:** 5

## Accomplishments

- 5 fully validated tRPC endpoints for wishlist CRUD with proper auth guards
- DB migration for days_min column on wishlist_items
- 10 tests covering all endpoints (auth, camelCase mapping, CRUD operations)
- setWishlistItems action on Zustand store for server data replacement

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Failing tests for wishlist CRUD** - `d83aefb` (test)
2. **Task 1 (GREEN): Implement wishlist CRUD router** - `8e46354` (feat)

## Files Created/Modified

- `supabase/migrations/00002_add_days_min.sql` - Adds days_min integer column with default 1
- `src/server/routers/wishlist.ts` - 5 tRPC endpoints with Zod validation and snake/camelCase mapping
- `src/stores/appStore.ts` - Added setWishlistItems action for bulk replacement from server
- `src/lib/database.types.ts` - Added days_min field to wishlist_items types
- `src/server/__tests__/wishlist.test.ts` - 10 tests with chainable Supabase mock

## Decisions Made

- list uses publicProcedure with accessToken guard -- returns [] for anonymous users instead of throwing UNAUTHORIZED
- add uses upsert with onConflict to handle duplicate poi_id silently (idempotent)
- reorder uses Promise.all for parallel position updates (acceptable for small arrays)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed chainable Supabase mock in tests**

- **Found during:** Task 1 (TDD GREEN phase)
- **Issue:** Proxy-based mock used plain object as target, making it non-callable -- `.select()` threw "not a function"
- **Fix:** Changed proxy target to a function so chain methods are callable
- **Files modified:** src/server/**tests**/wishlist.test.ts
- **Verification:** All 10 tests pass
- **Committed in:** 8e46354 (part of GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 bug in test mock)
**Impact on plan:** Test infrastructure fix required for mocking pattern. No scope creep.

## Issues Encountered

None beyond the mock fix documented above.

## User Setup Required

None - no external service configuration required. Migration needs `bunx supabase db reset` to apply locally.

## Next Phase Readiness

- All 5 CRUD endpoints ready for hook integration (Plan 02)
- setWishlistItems action ready for sync hook to push server data into store
- Migration file ready for local and production deployment

---

_Phase: 03-wishlist-persistence_
_Completed: 2026-03-08_
