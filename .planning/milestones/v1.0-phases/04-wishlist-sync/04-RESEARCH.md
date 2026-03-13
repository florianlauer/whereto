# Phase 4: Wishlist Sync - Research

**Researched:** 2026-03-13
**Domain:** React state management, optimistic updates, auth-transition sync, localStorage/Zustand
**Confidence:** HIGH

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Merge strategy (WISH-02):**

- On login (null → User transition), if localStorage has items: send all local items to server via batch upsert
- Server `add` is already an upsert by poi_id — call it for each local item (or add a bulk endpoint if simpler)
- Conflict resolution: server wins for items that exist on both sides
- Exception: if server has no items at all (new account), local items become the server state
- After merge, fetch full server wishlist to get canonical state → replace Zustand
- Merge order: local items appended after existing server items (position-wise)

**Clear localStorage after sync (WISH-03):**

- localStorage cleared ONLY after server confirms merge success
- If network fails mid-merge: keep localStorage intact, log error, retry silently on next auth state change
- Clear means: call `clearWishlist()` then immediately `setWishlistItems()` with server data
- Zustand persist middleware naturally updates localStorage with server-sourced data

**Optimistic updates + rollback (WISH-04):**

- Pattern: snapshot Zustand state before mutation → apply optimistic update → on server error, restore snapshot
- Rollback is silent (no toast/modal) — item reappears/disappears
- Console error logged for debugging
- No retry on mutation failure — user retries manually
- Applies to both `addToWishlist` and `removeFromWishlist` in `useWishlist()`

**Logout behavior (WISH-07):**

- On `signOut()`: clear Zustand wishlist state AND let persist middleware propagate to localStorage
- Timing: clear wishlist state synchronously in the `onAuthStateChange` callback when session becomes null
- After logout, user sees empty wishlist
- No confirmation dialog before clearing

### Claude's Discretion

- Whether to add a bulk merge tRPC endpoint vs reuse individual `add` calls
- Exact retry timing/strategy for failed merges
- Whether to use `useRef` snapshot or Zustand `getState()` for optimistic rollback
- Error boundary handling if something truly unexpected happens during sync

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                   | Research Support                                                                                                                                                                                                  |
| ------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WISH-02 | At first login, localStorage POIs are merged into DB (union, dedup by poi_id) | Merge logic hooks into existing `prevUserRef` auth-transition effect in `useWishlist`; `wishlist.add` is already an upsert with `onConflict` on `(wishlist_id, poi_id)`                                           |
| WISH-03 | localStorage cleared only after confirmed sync success                        | Zustand persist middleware writes to localStorage after every `set()` call; clearing happens via `clearWishlist()` + `setWishlistItems(serverData)` sequentially, only inside the `.then()` of a successful merge |
| WISH-04 | Optimistic updates — Zustand updated immediately, tRPC sync in background     | Current mutations (`addToWishlist`, `removeFromWishlist`) already update Zustand first; rollback requires capturing a snapshot before the optimistic update and restoring it in `.catch()`                        |
| WISH-07 | On logout, Zustand wishlist and localStorage are empty                        | `onAuthStateChange` fires synchronously with `session = null`; the callback must call `useAppStore.getState().clearWishlist()` at that point; persist middleware propagates the empty array to localStorage       |

</phase_requirements>

---

## Summary

Phase 4 is a pure behavioral enhancement on top of the Phase 3 infrastructure — no new UI components, no schema migrations. All four requirements are addressed by modifying two files: `src/hooks/useWishlist.ts` and `src/stores/authStore.ts`, with an optional third file `src/server/routers/wishlist.ts` if a bulk endpoint is added.

The biggest risk is the `onAuthStateChange` synchronous constraint. The Supabase client will deadlock if async work runs directly inside the callback. Logout cleanup (WISH-07) must therefore call `useAppStore.getState().clearWishlist()` synchronously from within the callback — this is safe because Zustand's `set()` is synchronous. The merge logic (WISH-02) however is async and must be triggered reactively via the `user` state change in React (`useEffect` watching `user`), which is already how `fetchServerWishlist` is wired.

The optimistic rollback pattern (WISH-04) requires only a snapshot variable: capture `useAppStore.getState().wishlistItems` before the local mutation, apply the mutation, then restore the snapshot in the tRPC `.catch()` handler. `useRef` is not needed — capturing via `getState()` at the moment of the action is sufficient and simpler.

**Primary recommendation:** Implement everything in `useWishlist.ts` — add merge logic to the existing `prevUserRef` auth-transition effect, add snapshot/rollback to existing mutations. Wire logout cleanup in `authStore.ts`'s `onAuthStateChange`. Optionally add a `bulkAdd` tRPC endpoint to reduce waterfall calls during merge.

---

## Standard Stack

### Core (already installed — no new dependencies)

| Library               | Version | Purpose                                  | Why Standard                                         |
| --------------------- | ------- | ---------------------------------------- | ---------------------------------------------------- |
| zustand               | ^5.x    | State management + localStorage persist  | Already in use; `persist` middleware handles storage |
| @trpc/client          | ^11.x   | tRPC mutations for server sync           | Already wired via `useTRPCClient()`                  |
| @tanstack/react-query | ^5.x    | Query cache invalidation after mutations | Already wired via `useQueryClient()`                 |
| @supabase/supabase-js | ^2.x    | Auth state subscription                  | `onAuthStateChange` already in `authStore.ts`        |

No new packages needed for this phase.

---

## Architecture Patterns

### Recommended Project Structure (unchanged)

```
src/
├── hooks/useWishlist.ts       # PRIMARY modification target
├── stores/authStore.ts        # Secondary modification — logout cleanup
└── server/routers/wishlist.ts # Optional — bulkAdd endpoint
```

### Pattern 1: Merge on Auth Transition

**What:** When `user` transitions from `null` to a User object, snapshot local wishlist items, upsert them all to server, then fetch canonical server state and replace Zustand.

**When to use:** Exactly once per login event, gated by `prevUserRef` check. Already established in Phase 3's `fetchServerWishlist` effect.

**Example — hooking into the existing transition effect:**

```typescript
// In useWishlist.ts — replaces the existing auth-transition effect
useEffect(() => {
  const prevUser = prevUserRef.current;
  prevUserRef.current = user;

  if (!prevUser && user) {
    // Capture local items BEFORE any async work
    const localItems = useAppStore.getState().wishlistItems;
    if (localItems.length > 0) {
      mergeLocalToServer(localItems);
    } else {
      fetchServerWishlist();
    }
  }
}, [user, fetchServerWishlist, mergeLocalToServer]);
```

### Pattern 2: Merge Sequence (WISH-02 + WISH-03)

**What:** Sequential: upsert all local items → fetch canonical server state → clear local + replace with server data. localStorage cleared only after the final fetch succeeds.

**Example:**

```typescript
const mergeLocalToServer = useCallback(
  async (localItems: WishlistItem[]) => {
    try {
      // Option A: individual upserts (reuse existing add endpoint)
      await Promise.all(
        localItems.map((item) =>
          client.wishlist.add.mutate({
            poiId: item.poiId,
            countryCode: item.countryCode,
            daysMin: item.daysMin,
          }),
        ),
      );

      // Option B: single bulkAdd call (add endpoint to wishlistRouter)
      // await client.wishlist.bulkAdd.mutate({ items: localItems })

      // Fetch canonical server state
      const serverItems = await queryClient.fetchQuery(trpc.wishlist.list.queryOptions());

      // Clear local + set server data atomically
      // Zustand persist will write server data to localStorage
      setWishlistItems(serverItems ?? []);
    } catch (err) {
      console.error("Failed to merge wishlist:", err);
      // Keep localStorage intact — will retry on next auth state change
    }
  },
  [client, queryClient, trpc, setWishlistItems],
);
```

### Pattern 3: Optimistic Updates with Rollback (WISH-04)

**What:** Snapshot state before mutation, apply optimistic update immediately, restore snapshot on server error.

**Example:**

```typescript
const addToWishlist = useCallback(
  (item: WishlistItem) => {
    // Snapshot before mutation
    const snapshot = useAppStore.getState().wishlistItems;
    addLocal(item);
    if (user) {
      client.wishlist.add
        .mutate({ poiId: item.poiId, countryCode: item.countryCode, daysMin: item.daysMin })
        .then(invalidateList)
        .catch((err: unknown) => {
          console.error("Failed to sync add:", err);
          // Silent rollback — item disappears from UI
          setWishlistItems(snapshot);
        });
    }
  },
  [addLocal, user, client, invalidateList, setWishlistItems],
);

const removeFromWishlist = useCallback(
  (poiId: string) => {
    const snapshot = useAppStore.getState().wishlistItems;
    removeLocal(poiId);
    if (user) {
      client.wishlist.remove
        .mutate({ poiId })
        .then(invalidateList)
        .catch((err: unknown) => {
          console.error("Failed to sync remove:", err);
          setWishlistItems(snapshot);
        });
    }
  },
  [removeLocal, user, client, invalidateList, setWishlistItems],
);
```

### Pattern 4: Synchronous Logout Cleanup (WISH-07)

**What:** `onAuthStateChange` fires synchronously. Zustand `getState().clearWishlist()` is also synchronous. Call it directly inside the callback when session becomes null.

**Critical constraint:** Do NOT await anything inside `onAuthStateChange`. This is an established project constraint documented in STATE.md: "onAuthStateChange callback is strictly synchronous to avoid Supabase deadlock pitfall."

**Example:**

```typescript
// In authStore.ts — inside initialize()
supabase.auth.onAuthStateChange((_event, session) => {
  set({
    session,
    user: session?.user ?? null,
  });
  // Synchronous cleanup when session is cleared
  if (!session) {
    useAppStore.getState().clearWishlist();
  }
});
```

### Pattern 5: Bulk Add Endpoint (Optional — Claude's Discretion)

**What:** A `bulkAdd` tRPC endpoint accepting an array of items, reducing N serial upsert calls to 1 round-trip.

**When to use:** If the average anonymous wishlist is expected to have more than ~3 items. For small wishlists, `Promise.all` on individual `add` calls is fine (parallel, not serial).

**Note:** `Promise.all` already runs calls in parallel, so the performance difference between individual `add` calls and a bulk endpoint is one HTTP round-trip vs N concurrent HTTP round-trips. At typical wishlist sizes (3-10 items), `Promise.all` is acceptable. A `bulkAdd` endpoint would be cleaner but requires more implementation effort.

**Example (server-side):**

```typescript
bulkAdd: protectedProcedure
  .input(z.object({
    items: z.array(z.object({
      poiId: z.string().min(1),
      countryCode: z.string().length(2),
      daysMin: z.number().int().positive(),
    })).min(1)
  }))
  .mutation(async ({ ctx, input }) => {
    const wishlistId = await getWishlistId(ctx.supabaseUser, ctx.user.id)
    const { data: existing } = await ctx.supabaseUser
      .from('wishlist_items')
      .select('id')
      .eq('wishlist_id', wishlistId)
    const basePosition = existing?.length ?? 0
    const rows = input.items.map((item, i) => ({
      wishlist_id: wishlistId,
      poi_id: item.poiId,
      country_code: item.countryCode,
      days_min: item.daysMin,
      position: basePosition + i,
    }))
    const { error } = await ctx.supabaseUser
      .from('wishlist_items')
      .upsert(rows, { onConflict: 'wishlist_id,poi_id' })
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to bulk add items' })
    return { success: true }
  }),
```

### Anti-Patterns to Avoid

- **Async work inside `onAuthStateChange`:** Causes Supabase client deadlock. All async merge work happens in React `useEffect`, never inside the Supabase callback.
- **Clearing localStorage before server confirms:** Violates WISH-03. Only call `setWishlistItems(serverData)` after `fetchQuery` succeeds.
- **Rollback by re-fetching server:** Slow, unnecessary. Snapshot restore is instant and correct.
- **Using `useState` for rollback snapshot:** Creates stale closure issues. Use `useAppStore.getState()` at the moment of the action.
- **Calling `clearWishlist()` in `signOut()` action:** Race condition — `signOut()` resolves before `onAuthStateChange` fires. The `onAuthStateChange` callback is the correct place.

---

## Don't Hand-Roll

| Problem                  | Don't Build                   | Use Instead                                                 | Why                                                   |
| ------------------------ | ----------------------------- | ----------------------------------------------------------- | ----------------------------------------------------- |
| Deduplication on merge   | Custom dedup logic            | Server `add` upsert with `onConflict: 'wishlist_id,poi_id'` | Already handles dedup in DB                           |
| localStorage persistence | Manual `localStorage.setItem` | Zustand `persist` middleware                                | Already configured — `set()` triggers automatic write |
| Parallel upserts         | Serial `await` loop           | `Promise.all`                                               | Already used in `reorder` — established pattern       |
| Auth state detection     | Custom event listener         | `prevUserRef` + `useEffect` pattern                         | Already in `useWishlist.ts:19-41`                     |

---

## Common Pitfalls

### Pitfall 1: The Supabase `onAuthStateChange` Async Deadlock

**What goes wrong:** Calling `await` inside `onAuthStateChange` — the Supabase client queues the next auth event, but the callback never returns, causing the queue to block.
**Why it happens:** Supabase processes auth events synchronously in a queue; async callbacks block the queue.
**How to avoid:** Only call synchronous functions inside `onAuthStateChange`. Schedule async work reactively via React `useEffect` watching the `user` state.
**Warning signs:** Auth state appears to "hang" after login; second login attempt doesn't fire; session never updates after token refresh.

### Pitfall 2: localStorage Cleared Before Sync Confirmation

**What goes wrong:** If `clearWishlist()` is called before `fetchQuery` resolves, a network error leaves the user with an empty wishlist and no data on the server.
**Why it happens:** Premature cleanup — developer calls clear immediately after sending upserts.
**How to avoid:** Only call `setWishlistItems(serverItems)` (which implicitly clears via replacement) inside the `.then()` handler of the final `fetchQuery` call.
**Warning signs:** User reports empty wishlist after login on slow connections.

### Pitfall 3: Stale Closure in Rollback Snapshot

**What goes wrong:** Capturing snapshot via a state variable from the closure (e.g., `const snapshot = wishlistItems`) captures the value at render time, not at action time — could be stale if multiple rapid actions occur.
**Why it happens:** React hooks close over render-time values.
**How to avoid:** Always capture snapshot via `useAppStore.getState().wishlistItems` at the moment the action is called, not at render time.
**Warning signs:** Rollback restores an outdated state instead of the immediate pre-action state.

### Pitfall 4: Logout Race Between `signOut()` and `onAuthStateChange`

**What goes wrong:** Calling `clearWishlist()` in the `signOut()` async action body — it runs before `onAuthStateChange` fires, potentially allowing a brief window where old wishlist data is visible while the session is still technically active.
**Why it happens:** `signOut()` resolves once Supabase receives the logout request, but the auth state update propagates asynchronously via `onAuthStateChange`.
**How to avoid:** Only clear wishlist in `onAuthStateChange` when `session === null`. This is the canonical source of truth for auth state.

### Pitfall 5: Missing `setWishlistItems` in `useWishlist` Deps

**What goes wrong:** `setWishlistItems` is used in `mergeLocalToServer` and rollback callbacks but wasn't previously in `useWishlist` — forgetting to add it to `useCallback` deps causes stale function references.
**Why it happens:** Lint rules may not catch all deps if `useAppStore` selector is added inside the callback rather than at hook level.
**How to avoid:** Add `const setWishlistItems = useAppStore((s) => s.setWishlistItems)` at hook level (it already exists in Phase 3 code), ensure it's included in all `useCallback` dep arrays.

---

## State of the Art

| Old Approach                                | Current Approach                                         | Impact                                                       |
| ------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------ |
| Refresh page after login to sync data       | Reactive auth-transition effect triggers fetch/merge     | No page refresh needed                                       |
| Store server data in React Query cache only | Zustand as source of truth, React Query for invalidation | Components don't need to be wrapped in React Query providers |
| Rollback via re-fetch                       | Snapshot restore                                         | Instant UX, no network round-trip                            |

---

## Code Examples

### Verified Pattern: Zustand `getState()` outside React for snapshots

Zustand's `getState()` is safe to call anywhere — inside callbacks, event handlers, async functions. It always returns the current state, not the render-time state.

```typescript
// Source: Zustand docs — reading state outside React components
const snapshot = useAppStore.getState().wishlistItems;
// This is always the current value, not the closure-captured value
```

### Verified Pattern: Zustand persist writes on every `set()`

The `persist` middleware intercepts every `set()` call. Calling `setWishlistItems(serverData)` automatically writes the new array to `localStorage['whereto-store']` via the `partialize` function (only `wishlistItems` is persisted).

```typescript
// appStore.ts:49 — partialize ensures only wishlistItems goes to localStorage
partialize: (state) => ({ wishlistItems: state.wishlistItems }),
```

So calling `setWishlistItems([])` then `setWishlistItems(serverItems)` results in the final server items being in localStorage.

### Verified Pattern: `Promise.all` for parallel upserts

Already used in `wishlistRouter.reorder` (line 178 of `src/server/routers/wishlist.ts`). Safe to use the same pattern client-side.

```typescript
await Promise.all(
  localItems.map((item) =>
    client.wishlist.add.mutate({
      poiId: item.poiId,
      countryCode: item.countryCode,
      daysMin: item.daysMin,
    }),
  ),
);
```

---

## Validation Architecture

### Test Framework

| Property           | Value                           |
| ------------------ | ------------------------------- |
| Framework          | Vitest + @testing-library/react |
| Config file        | `vitest.config.ts` (root)       |
| Quick run command  | `bun run test`                  |
| Full suite command | `bun run test`                  |

### Phase Requirements → Test Map

| Req ID  | Behavior                                                                                    | Test Type | Automated Command                                      | File Exists?                                            |
| ------- | ------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------ | ------------------------------------------------------- |
| WISH-02 | On login with local items, all items upserted to server, Zustand replaced with server state | unit      | `bun run test src/hooks/__tests__/useWishlist.test.ts` | ✅ (needs new tests)                                    |
| WISH-02 | Merge deduplication: server items not duplicated (upsert handles it)                        | unit      | `bun run test src/server/__tests__/wishlist.test.ts`   | ✅ (needs new test)                                     |
| WISH-03 | localStorage NOT cleared when server upsert fails mid-merge                                 | unit      | `bun run test src/hooks/__tests__/useWishlist.test.ts` | ✅ (needs new test)                                     |
| WISH-03 | localStorage IS cleared (replaced with server data) after successful merge                  | unit      | `bun run test src/hooks/__tests__/useWishlist.test.ts` | ✅ (needs new test)                                     |
| WISH-04 | `addToWishlist` rolls back Zustand on server error                                          | unit      | `bun run test src/hooks/__tests__/useWishlist.test.ts` | ✅ (needs new test)                                     |
| WISH-04 | `removeFromWishlist` rolls back Zustand on server error                                     | unit      | `bun run test src/hooks/__tests__/useWishlist.test.ts` | ✅ (needs new test)                                     |
| WISH-07 | On logout (session → null), Zustand wishlist is empty                                       | unit      | `bun run test src/stores/__tests__/authStore.test.ts`  | ✅ (needs new test)                                     |
| WISH-07 | After logout, `wishlistItems` in Zustand is `[]`                                            | unit      | `bun run test src/stores/__tests__/appStore.test.ts`   | ✅ (existing `clearWishlist` test covers the mechanism) |

### Sampling Rate

- **Per task commit:** `bun run test src/hooks/__tests__/useWishlist.test.ts`
- **Per wave merge:** `bun run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

None — existing test infrastructure covers all phase requirements. New test cases are added to existing test files, not new files.

---

## Open Questions

1. **Bulk endpoint vs `Promise.all` of individual `add` calls**
   - What we know: `Promise.all` is parallel (not serial), existing `add` endpoint is an upsert
   - What's unclear: At what wishlist size does a bulk endpoint meaningfully improve UX?
   - Recommendation: Use `Promise.all` with individual `add` calls for simplicity. Add a `bulkAdd` endpoint only if profiling shows it matters. The upsert behavior is identical either way.

2. **Retry strategy for failed merges**
   - What we know: CONTEXT.md says "retry silently on next auth state change"
   - What's unclear: "Next auth state change" could be a token refresh (happens every hour) — is that acceptable latency for a merge retry?
   - Recommendation: "Next auth state change" is sufficient. Merge is re-attempted whenever `user` transitions from `null → User`, which includes re-login. A token refresh does NOT change `user` object identity, so it won't trigger the merge effect again. This is correct behavior.

---

## Sources

### Primary (HIGH confidence)

- Direct codebase analysis — `src/hooks/useWishlist.ts`, `src/stores/appStore.ts`, `src/stores/authStore.ts`, `src/server/routers/wishlist.ts`
- Existing tests — `src/hooks/__tests__/useWishlist.test.ts`, `src/server/__tests__/wishlist.test.ts`, `src/stores/__tests__/appStore.test.ts`
- `.planning/phases/04-wishlist-sync/04-CONTEXT.md` — locked implementation decisions

### Secondary (MEDIUM confidence)

- STATE.md accumulated context — `onAuthStateChange` synchronous constraint verified as established project pattern
- Zustand persist middleware behavior — verified by reading `appStore.ts` configuration

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries already in use, no new dependencies
- Architecture: HIGH — patterns derived directly from existing code, decisions locked in CONTEXT.md
- Pitfalls: HIGH — Supabase deadlock constraint already encountered and documented in STATE.md

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable APIs, no fast-moving dependencies)
