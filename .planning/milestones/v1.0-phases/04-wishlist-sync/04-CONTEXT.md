# Phase 4: Wishlist Sync - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Seamless transition between anonymous and authenticated modes: merge localStorage POIs into server on first login, optimistic updates with rollback on failure, and clean logout that wipes all local wishlist data. Does NOT include new UI features, new endpoints beyond what's needed for merge, or changes to the wishlist CRUD flow established in Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Stratégie de merge au login (WISH-02)

- On login (null → User transition), if localStorage has items: send all local items to server via batch upsert
- Server `add` is already an upsert by poi_id — call it for each local item (or add a bulk endpoint if simpler)
- Conflict resolution: server wins for items that exist on both sides (server data is more recent by definition — user was authenticated when they created it)
- Exception: if server has no items at all (new account), local items become the server state
- After merge, fetch full server wishlist to get canonical state → replace Zustand
- Merge order: local items appended after existing server items (position-wise)

### Clear localStorage après sync (WISH-03)

- localStorage cleared ONLY after server confirms merge success (all upserts completed + final fetch succeeded)
- If network fails mid-merge: keep localStorage intact, log error, retry silently on next auth state change
- Clear means: call `clearWishlist()` from appStore which empties `wishlistItems` array, then immediately `setWishlistItems()` with server data
- Zustand persist middleware will naturally update localStorage with the server-sourced data

### Optimistic updates + rollback (WISH-04)

- Pattern: snapshot Zustand state before mutation → apply optimistic update → on server error, restore snapshot
- Rollback is silent (no toast/modal) — the item reappears/disappears and that's sufficient feedback
- Console error logged for debugging
- No retry on mutation failure — user can retry manually by clicking again
- Applies to both `addToWishlist` and `removeFromWishlist` in `useWishlist()`

### Comportement au logout (WISH-07)

- On `signOut()`: clear Zustand wishlist state AND let persist middleware propagate to localStorage
- Timing: clear wishlist state synchronously in the `onAuthStateChange` callback when session becomes null
- After logout, user sees empty wishlist (clean slate for next anonymous session or different user)
- No confirmation dialog before clearing — signing out implies accepting data is on the server

### Claude's Discretion

- Whether to add a bulk merge tRPC endpoint vs reuse individual `add` calls
- Exact retry timing/strategy for failed merges
- Whether to use `useRef` snapshot or Zustand `getState()` for optimistic rollback
- Error boundary handling if something truly unexpected happens during sync

</decisions>

<code_context>

## Existing Code Insights

### Reusable Assets

- `useWishlist()` (src/hooks/useWishlist.ts): already has auth transition detection via `prevUserRef` + `useEffect` — merge logic hooks into the same transition point
- `appStore.clearWishlist()`: exists but unused in Phase 3 — ready for logout cleanup
- `appStore.setWishlistItems()`: bulk replace function, used by `fetchServerWishlist()` — reusable for post-merge state
- `wishlist.add` tRPC endpoint: already an upsert with `onConflict` — handles dedup natively
- `useTRPCClient()`: fire-and-forget pattern established — same pattern for merge calls
- `invalidateList` callback in useWishlist: already invalidates query cache after mutations

### Established Patterns

- Zustand as single source of truth, tRPC sync in background (Phase 3 pattern)
- `onAuthStateChange` is synchronous — logout cleanup must be sync or triggered reactively
- Auth state in `authStore`, wishlist state in `appStore` — separation maintained
- Console.error for background sync failures (no user-facing errors for sync)

### Integration Points

- `useWishlist()` hook: main modification target — add merge logic to auth transition effect, add rollback to mutations
- `authStore.signOut()`: may need post-signout cleanup hook, or handle via `onAuthStateChange` detecting null session
- `appStore.clearWishlist()`: wire into logout flow
- `wishlistRouter`: may need a `merge` or `bulkAdd` endpoint for efficiency

</code_context>

<specifics>
## Specific Ideas

- User trusts Claude's judgment on all implementation details for this phase
- Keep the existing fire-and-forget pattern where possible, only add rollback complexity where WISH-04 requires it

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

_Phase: 04-wishlist-sync_
_Context gathered: 2026-03-13_
