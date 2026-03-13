---
phase: 04-wishlist-sync
plan: 02
subsystem: wishlist
tags: [zustand, wishlist, merge, login, localStorage, trpc, optimistic]

# Dependency graph
requires:
  - phase: 04-01
    provides: useWishlist hook with optimistic rollback, appStore setWishlistItems
provides:
  - localStorage-to-server merge on first login (WISH-02)
  - localStorage preserved until merge confirmed successful (WISH-03)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Merge-on-login pattern: capture getState().wishlistItems at transition time, upsert via Promise.all, fetch canonical server state, replace local atomically"
    - "Error-safe local state: catch block returns without modifying Zustand/localStorage, preserving data for retry"

key-files:
  created: []
  modified:
    - src/hooks/useWishlist.ts
    - src/hooks/__tests__/useWishlist.test.ts

key-decisions:
  - "mergeLocalToServer uses Promise.all for parallel upserts (not sequential) — same pattern as wishlistRouter.reorder"
  - "Local items captured via useAppStore.getState().wishlistItems at transition time (not selector) to avoid stale closure"
  - "setWishlistItems(serverItems ?? []) replaces local atomically — server is canonical after successful merge"
  - "On any error in merge, catch block logs and returns — local state untouched, retry on next login"
  - "Auth-transition effect branches: localItems.length > 0 → merge, else → fetchServerWishlist (existing behavior preserved)"

requirements-completed: [WISH-02, WISH-03]

# Metrics
duration: 3min
completed: 2026-03-13
---

# Phase 4 Plan 02: Login Merge (localStorage to Server) Summary

**mergeLocalToServer upserts anonymous POIs to server via Promise.all on first login, then replaces Zustand/localStorage with canonical server state; localStorage preserved intact on any network failure**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-13T17:03:34Z
- **Completed:** 2026-03-13T17:06:45Z
- **Tasks:** 1 (TDD: RED + GREEN commits)
- **Files modified:** 2

## Accomplishments

- useWishlist: added `mergeLocalToServer(localItems)` callback using `useCallback` with proper deps
- useWishlist: auth-transition effect now branches — if local items exist at login, merge; else fetch
- mergeLocalToServer: parallel upserts via `Promise.all`, then `fetchQuery` for canonical state, then `setWishlistItems`
- mergeLocalToServer: catch block preserves all local state on any failure (network error or fetch failure)
- 5 new tests added for WISH-02/WISH-03 merge behavior; full suite 103/103 green
- Updated 1 existing test to reflect new semantics (empty local items → fetchServerWishlist path)

## Task Commits

Each task was committed atomically with TDD:

1. **RED: Failing tests for mergeLocalToServer (WISH-02/WISH-03)** - `7cfa85a` (test)
2. **GREEN: Implementation of mergeLocalToServer in useWishlist** - `7c957e2` (feat)

**Plan metadata:** (docs commit to follow)

_Note: TDD task with RED/GREEN commits_

## Files Created/Modified

- `src/hooks/useWishlist.ts` - Added mergeLocalToServer callback, updated auth-transition effect to branch on local items
- `src/hooks/__tests__/useWishlist.test.ts` - 5 new tests for merge behavior, 1 updated test for fetchServerWishlist path

## Decisions Made

- Parallel upserts via `Promise.all` (not serial) consistent with `wishlistRouter.reorder` pattern
- `useAppStore.getState().wishlistItems` at transition time avoids stale closure — same pattern as Plan 01
- `setWishlistItems(serverItems ?? [])` is intentional: after successful merge, server is canonical source of truth
- Catch block does nothing except log — local state is the safety net while server is unavailable

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated existing test semantics for fetchServerWishlist path**

- **Found during:** GREEN phase test run
- **Issue:** Test "if server returns empty, keeps existing local items (no wipe)" was written for old behavior where `fetchServerWishlist` was always called. With new merge logic, non-empty local items take the merge path, not the fetch path. Test was testing the wrong path.
- **Fix:** Rewrote test to explicitly test the `fetchServerWishlist` path (empty local items → fetch → empty server → state unchanged). Added comment clarifying the two paths.
- **Files modified:** `src/hooks/__tests__/useWishlist.test.ts`
- **Commit:** `7c957e2` (included in GREEN commit)

## Issues Encountered

Pre-existing lint errors in `AuthModal.tsx` (a11y) and `middleware.test.ts` (unused var) — out of scope, noted in place.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- WISH-02 and WISH-03 requirements complete
- Phase 4 fully complete: WISH-04 (rollback), WISH-07 (logout), WISH-02 (merge), WISH-03 (safe cleanup)
- All wishlist sync requirements met — project ready for v1.0 milestone review

---

_Phase: 04-wishlist-sync_
_Completed: 2026-03-13_
