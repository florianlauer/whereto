---
phase: 04-wishlist-sync
verified: 2026-03-13T18:09:30Z
status: passed
score: 9/9 must-haves verified
re_verification: false
---

# Phase 4: Wishlist Sync Verification Report

**Phase Goal:** The transition between anonymous and authenticated modes is seamless — no data loss, instant UI feedback, clean logout
**Verified:** 2026-03-13T18:09:30Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                      | Status   | Evidence                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | On logout (session=null), Zustand wishlistItems is empty array                             | VERIFIED | `authStore.ts:44-46` — `if (!session) { useAppStore.getState().clearWishlist() }` in onAuthStateChange                           |
| 2   | localStorage whereto-store contains empty wishlistItems after logout                       | VERIFIED | Zustand persist middleware propagates `clearWishlist()` (set({wishlistItems:[]})) to localStorage automatically                  |
| 3   | addToWishlist rolls back Zustand state when server mutation fails                          | VERIFIED | `useWishlist.ts:96,103-105` — snapshot captured before addLocal, `setWishlistItems(snapshot)` in .catch()                        |
| 4   | removeFromWishlist rolls back Zustand state when server mutation fails                     | VERIFIED | `useWishlist.ts:114,121-123` — same snapshot-rollback pattern as add                                                             |
| 5   | User with localStorage items who logs in sees all items in server wishlist after merge     | VERIFIED | `useWishlist.ts:38-46` — Promise.all of add.mutate calls; `useWishlist.ts:49` fetchQuery after merge                             |
| 6   | Server items are not duplicated when local items overlap (upsert dedup)                    | VERIFIED | Dedup delegated to server upsert via `onConflict: 'wishlist_id,poi_id'`; client sends all local items unconditionally            |
| 7   | localStorage is NOT cleared when merge network request fails                               | VERIFIED | `useWishlist.ts:54-57` — catch block only logs, does not call setWishlistItems; test "(WISH-03) when Promise.all rejects" passes |
| 8   | localStorage IS replaced with server data only after successful merge + fetch              | VERIFIED | `useWishlist.ts:53` — `setWishlistItems(serverItems ?? [])` called only after both Promise.all and fetchQuery succeed            |
| 9   | On null->User transition with empty local items, fetchServerWishlist is called (not merge) | VERIFIED | `useWishlist.ts:70-74` — branches on `localItems.length > 0`; test "(WISH-02) on null->User with empty local" passes             |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact                                  | Expected                                      | Status   | Details                                                                                                                     |
| ----------------------------------------- | --------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| `src/stores/authStore.ts`                 | Logout cleanup via onAuthStateChange          | VERIFIED | Line 4 imports useAppStore; lines 44-46 call clearWishlist on session=null                                                  |
| `src/hooks/useWishlist.ts`                | Optimistic rollback + mergeLocalToServer      | VERIFIED | 131 lines; contains snapshot pattern (lines 96,114), mergeLocalToServer (lines 34-60), auth-transition effect (lines 63-76) |
| `src/stores/__tests__/authStore.test.ts`  | Tests for WISH-07 logout cleanup              | VERIFIED | 2 tests: "logout cleanup (WISH-07)" and "wishlistItems NOT cleared when session is non-null"                                |
| `src/hooks/__tests__/useWishlist.test.ts` | Tests for WISH-04 rollback + WISH-02/03 merge | VERIFIED | 8 new tests covering rollback (3), merge (3), safe-clear (2); 16 total tests all passing                                    |

### Key Link Verification

| From                       | To                       | Via                                                             | Status | Details                                                                                     |
| -------------------------- | ------------------------ | --------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| `src/stores/authStore.ts`  | `src/stores/appStore.ts` | `useAppStore.getState().clearWishlist()` in onAuthStateChange   | WIRED  | Line 45: `useAppStore.getState().clearWishlist()` confirmed at exact location               |
| `src/hooks/useWishlist.ts` | `src/stores/appStore.ts` | `setWishlistItems(snapshot)` in .catch() handler                | WIRED  | Lines 104 and 122: `setWishlistItems(snapshot)` in both add and remove .catch()             |
| `src/hooks/useWishlist.ts` | `tRPC wishlist.add`      | `Promise.all` of individual add.mutate calls during merge       | WIRED  | Lines 38-46: `await Promise.all(localItems.map((item) => client.wishlist.add.mutate(...)))` |
| `src/hooks/useWishlist.ts` | `tRPC wishlist.list`     | `fetchQuery` after merge to get canonical server state          | WIRED  | Line 49: `await queryClient.fetchQuery(trpc.wishlist.list.queryOptions())`                  |
| `src/hooks/useWishlist.ts` | `src/stores/appStore.ts` | `setWishlistItems(serverItems)` replaces local with server data | WIRED  | Line 53: `setWishlistItems(serverItems ?? [])` after confirmed merge success                |

### Requirements Coverage

| Requirement | Source Plan | Description                                                                         | Status    | Evidence                                                                                                                                            |
| ----------- | ----------- | ----------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| WISH-02     | 04-02       | Au premier login, les POIs localStorage sont mergés en DB (union, dedup par poi_id) | SATISFIED | mergeLocalToServer in useWishlist.ts:34-60; test "(WISH-02) on null->User transition with local items" passes                                       |
| WISH-03     | 04-02       | localStorage clearé seulement après confirmation de sync réussie                    | SATISFIED | catch block preserves state; tests "(WISH-03) when Promise.all rejects" and "(WISH-03) when fetchQuery after merge fails" both pass                 |
| WISH-04     | 04-01       | Updates optimistes — Zustand mis à jour immédiatement, tRPC sync en background      | SATISFIED | Snapshot-rollback in addToWishlist/removeFromWishlist; tests "(WISH-04): restores snapshot when server mutation fails" pass for both add and remove |
| WISH-07     | 04-01       | Au logout, wishlist Zustand et localStorage sont vides                              | SATISFIED | authStore.ts:44-46 clearWishlist on session=null; test "logout cleanup (WISH-07)" passes                                                            |

No orphaned requirements: all four IDs (WISH-02, WISH-03, WISH-04, WISH-07) claimed by plans and verified in code.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| None | —    | —       | —        | —      |

No TODO/FIXME comments, no placeholder returns, no stub implementations found in modified files.

### Human Verification Required

#### 1. Real login with localStorage data

**Test:** Open the app anonymously, add 2-3 POIs to wishlist (they persist in localStorage). Then sign up / sign in. Open Supabase Studio and check the `wishlist_items` table.
**Expected:** All locally-added POIs appear as rows in the user's `wishlist_items` entry; the in-app wishlist shows those same items.
**Why human:** Cannot automate Supabase Studio inspection or real OAuth flow in tests.

#### 2. Network failure during merge preserves data

**Test:** Open DevTools Network tab, add POIs anonymously, sign in while throttling to "Offline". Observe app state.
**Expected:** The wishlist remains populated in the UI (localStorage intact); no data loss visible.
**Why human:** Requires browser network throttling; can't simulate real Supabase network calls in unit tests.

#### 3. Logout clears wishlist on shared-computer scenario

**Test:** Sign in, add items, sign out. Check that the wishlist icon shows 0 items and localStorage `whereto-store` has `"wishlistItems":[]`.
**Expected:** Wishlist is empty immediately after logout; localStorage is cleared.
**Why human:** Requires verifying actual localStorage contents in a real browser; persist middleware behavior confirmed in tests but real browser check adds confidence.

### Gaps Summary

No gaps. All automated checks passed: 9/9 truths verified, 4 artifacts exist and are substantive, all 5 key links confirmed wired, all 4 requirements satisfied, 103/103 tests green with no regressions.

---

_Verified: 2026-03-13T18:09:30Z_
_Verifier: Claude (gsd-verifier)_
