---
phase: 04-wishlist-sync
plan: 01
subsystem: auth
tags: [zustand, wishlist, optimistic-update, rollback, logout, supabase]

# Dependency graph
requires:
  - phase: 03-wishlist-persist
    provides: useWishlist hook with fire-and-forget server sync, appStore clearWishlist/setWishlistItems
provides:
  - Wishlist cleared synchronously on logout via onAuthStateChange (WISH-07)
  - Optimistic rollback in addToWishlist and removeFromWishlist on server error (WISH-04)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Snapshot-before-mutation pattern: capture getState().wishlistItems before optimistic update, restore in .catch()"
    - "Cross-store side effects in onAuthStateChange: synchronous clearWishlist() call after set() is safe"

key-files:
  created: []
  modified:
    - src/stores/authStore.ts
    - src/hooks/useWishlist.ts
    - src/stores/__tests__/authStore.test.ts
    - src/hooks/__tests__/useWishlist.test.ts

key-decisions:
  - "useAppStore imported directly (not via selector) in authStore for getState() cross-store call"
  - "clearWishlist() called synchronously after set() in onAuthStateChange — no async, respects Supabase deadlock constraint"
  - "Snapshot captured via useAppStore.getState() inside callback (not selector) to avoid stale closure"

patterns-established:
  - "Optimistic rollback pattern: snapshot = getState().items before mutation, setItems(snapshot) in .catch()"

requirements-completed: [WISH-04, WISH-07]

# Metrics
duration: 4min
completed: 2026-03-13
---

# Phase 4 Plan 01: Logout Cleanup and Optimistic Rollback Summary

**Wishlist cleared synchronously on Supabase logout via onAuthStateChange, with snapshot-based rollback in add/remove mutations on server failure**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-13T16:59:08Z
- **Completed:** 2026-03-13T17:04:00Z
- **Tasks:** 1 (TDD: RED + GREEN commits)
- **Files modified:** 4

## Accomplishments

- authStore: imports useAppStore and calls clearWishlist() when session becomes null in onAuthStateChange (WISH-07)
- useWishlist: addToWishlist captures pre-mutation snapshot, restores it via setWishlistItems in .catch() handler (WISH-04)
- useWishlist: removeFromWishlist applies same snapshot-rollback pattern (WISH-04)
- 5 new tests added (2 authStore, 3 useWishlist); full suite 98/98 green

## Task Commits

Each task was committed atomically with TDD:

1. **RED: Failing tests for logout cleanup + optimistic rollback** - `8e2789a` (test)
2. **GREEN: Implementation in authStore + useWishlist** - `b881131` (feat)

**Plan metadata:** (docs commit to follow)

_Note: TDD task with RED/GREEN commits_

## Files Created/Modified

- `src/stores/authStore.ts` - Added useAppStore import + clearWishlist() call on session=null
- `src/hooks/useWishlist.ts` - Added snapshot capture before addLocal/removeLocal, rollback in .catch()
- `src/stores/__tests__/authStore.test.ts` - 2 new tests for WISH-07 logout cleanup
- `src/hooks/__tests__/useWishlist.test.ts` - 3 new tests for WISH-04 rollback behavior

## Decisions Made

- Cross-store call from authStore to appStore via `useAppStore.getState().clearWishlist()` — direct import, no selector, keeps callback synchronous
- Snapshot captured via `useAppStore.getState().wishlistItems` inside the useCallback (not from selector at hook scope) to avoid stale closure capturing outdated state at callback creation time
- `setWishlistItems` added to useCallback dependency arrays for correctness

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Pre-existing lint warnings in unrelated files (AuthModal.tsx, middleware.test.ts) noted but out of scope.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- WISH-07 and WISH-04 requirements complete
- Ready for plan 04-02 (wishlist merge on login: local + server item merge strategy)

---

_Phase: 04-wishlist-sync_
_Completed: 2026-03-13_
