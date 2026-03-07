---
phase: 02-authentication
plan: 01
subsystem: auth
tags: [supabase, zustand, trpc, middleware, oauth, magic-link]

# Dependency graph
requires:
  - phase: 01-backend-foundation
    provides: tRPC setup with Hono adapter, Supabase admin client, createSupabaseClient
provides:
  - Client-side Supabase instance (src/lib/supabase.ts)
  - Auth Zustand store with 3 sign-in methods, signout, session init
  - tRPC auth context with Bearer token extraction
  - protectedProcedure middleware validating user via getUser()
  - Auth header injection in tRPC client
  - Mock supabase helper for future tests
affects: [02-authentication-ui, wishlist-crud, wishlist-sync]

# Tech tracking
tech-stack:
  added: []
  patterns: [zustand-auth-store, trpc-protected-procedure, sync-onAuthStateChange]

key-files:
  created:
    - src/lib/supabase.ts
    - src/stores/authStore.ts
    - src/server/middleware.ts
    - src/lib/__mocks__/supabase.ts
    - src/stores/__tests__/authStore.test.ts
    - src/server/__tests__/middleware.test.ts
  modified:
    - src/server/trpc.ts
    - src/main.tsx
    - src/server/routers/profile.ts

key-decisions:
  - "createContext accepts opts?.req from fetchRequestHandler -- compatible with @hono/trpc-server adapter"
  - "protectedProcedure uses getUser() not getSession() for server-side token validation"
  - "onAuthStateChange callback is strictly synchronous to avoid Supabase deadlock pitfall"
  - "Auth header injection via getState() (not hook) since it runs outside React render"

patterns-established:
  - "Auth store pattern: Zustand with initialize() returning unsubscribe, sync onAuthStateChange"
  - "Protected procedure pattern: middleware checks accessToken then getUser(), extends ctx with user"
  - "Mock pattern: src/lib/__mocks__/supabase.ts with vi.fn() for all auth methods"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-07]

# Metrics
duration: 5min
completed: 2026-03-07
---

# Phase 02 Plan 01: Auth Core Infrastructure Summary

**Zustand auth store with email/magic-link/Google sign-in, tRPC protected procedure middleware validating tokens via getUser(), and auth header injection in tRPC client**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-07T20:38:59Z
- **Completed:** 2026-03-07T20:44:08Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Auth store with all 3 sign-in methods (email, magic link, Google OAuth), signout, and session initialization
- tRPC auth context extracting Bearer token, protectedProcedure middleware rejecting unauthenticated requests
- Auth header injection in tRPC client and auth initialization on app mount
- 11 unit tests covering all auth store behaviors and middleware rejection/acceptance cases

## Task Commits

Each task was committed atomically:

1. **Task 1: Auth store + tests (RED)** - `c063092` (test)
2. **Task 1: Auth store implementation (GREEN)** - `9f6d24b` (feat)
3. **Task 2: Middleware tests (RED)** - `14292e8` (test)
4. **Task 2: tRPC auth context + middleware + wiring (GREEN)** - `479cefe` (feat)

_TDD tasks have RED (test) and GREEN (feat) commits_

## Files Created/Modified

- `src/lib/supabase.ts` - Client-side Supabase instance using VITE\_ env vars
- `src/stores/authStore.ts` - Zustand auth store with user, session, loading, and all auth actions
- `src/server/middleware.ts` - isAuthed middleware + protectedProcedure export
- `src/server/trpc.ts` - Updated createContext with Bearer token extraction and supabaseUser client
- `src/main.tsx` - Auth initialization on mount + auth header injection in tRPC httpBatchLink
- `src/server/routers/profile.ts` - profile.me now uses protectedProcedure
- `src/lib/__mocks__/supabase.ts` - Mock supabase auth for unit tests
- `src/stores/__tests__/authStore.test.ts` - 8 tests covering auth store behaviors
- `src/server/__tests__/middleware.test.ts` - 3 tests covering middleware rejection/acceptance

## Decisions Made

- createContext accepts opts?.req from fetchRequestHandler, compatible with @hono/trpc-server adapter which calls createContext(opts, c)
- protectedProcedure uses getUser() not getSession() for server-side token validation (security best practice)
- onAuthStateChange callback is strictly synchronous to avoid the documented Supabase deadlock pitfall
- Auth header injection uses getState() (not hook) since it runs outside React render cycle

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Auth plumbing complete, ready for Plan 02 (auth UI components)
- Auth store actions can be called from any React component
- protectedProcedure available for any tRPC router that needs authentication
- Mock supabase helper ready for future test files

---

_Phase: 02-authentication_
_Completed: 2026-03-07_
