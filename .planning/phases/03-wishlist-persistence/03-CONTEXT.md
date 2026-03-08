# Phase 3: Wishlist Persistence - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Authenticated users have a server-backed wishlist accessible from any device, abstracted behind a single `useWishlist()` hook that components use regardless of auth state. Includes full CRUD via tRPC (list, add, remove, update, reorder). Does NOT include localStorage-to-server merge (Phase 4), logout cleanup (Phase 4), or optimistic rollback (Phase 4).

</domain>

<decisions>
## Implementation Decisions

### Hook unifié useWishlist()

- Zustand remains the single source of truth read by components — in auth mode, mutations update Zustand AND call tRPC
- Direct replacement of all 4 consumer components (DestinationPanel, ComparisonDrawer, TripSummaryPanel, WishlistCounter) in one pass
- API surface: `wishlistItems`, `addToWishlist`, `removeFromWishlist` — no clearWishlist (Phase 4), no helpers (isInWishlist, getCountryItems)
- Lives at `src/hooks/useWishlist.ts` (next to useAuthGatedAction.ts)
- Reads authStore directly to detect auth mode — no provider/context needed
- Zustand persist middleware continues writing to localStorage even in auth mode — duplication accepted in Phase 3
- Optimistic updates from Phase 3: Zustand updated immediately, tRPC sync in background, basic error logging (no rollback UI)
- Auto-fetches server wishlist when user transitions from null to authenticated
- During fetch: keeps local data visible (no loading flash)

### Opérations CRUD serveur

- 5 tRPC endpoints: `wishlist.list` (query), `wishlist.add` (mutation), `wishlist.remove` (mutation), `wishlist.update` (mutation), `wishlist.reorder` (mutation)
- `list` uses publicProcedure (prepares for v2 wishlist sharing via URL — SOCL-01), all mutations use protectedProcedure
- `add` is an upsert — if poi_id already exists, updates fields silently (idempotent)
- `list` returns flat array of items (poi_id, country_code, daysMin, position) — no wishlist metadata
- `reorder` receives the complete array of poi_ids in new order — server updates all positions in batch
- `update` allows modifying daysMin for an existing item

### Comportement au login/chargement

- First login (server empty): keep local items in Zustand UI — don't wipe to empty. Items are NOT sent to server (no merge), just preserved visually
- Existing user (server has items): replace Zustand with server data — server is authoritative
- Fetch error on login: keep local data, retry silently (log error, no toast)
- Page refresh (auth session persisted): Zustand hydrates from localStorage instantly, then useWishlist() fetches server data to refresh

### Interaction avec useAuthGatedAction

- useAuthGatedAction remains the entry point for auth gating — separate from persistence logic in useWishlist()
- "Continuer sans compte" closes modal AND executes the pending action via localStorage (no lost action)
- After login via modal, pending action executes immediately — no waiting for server fetch to complete
- Auth gate applies only to add (not remove) — removing an item should never be blocked

### Claude's Discretion

- Exact Zod schemas for tRPC inputs
- Error retry strategy details (timing, max retries)
- Internal state management within useWishlist() (useEffect vs useCallback patterns)
- How to handle race conditions between auto-fetch and immediate pending action

</decisions>

<code_context>

## Existing Code Insights

### Reusable Assets

- `appStore.ts` (Zustand): has `WishlistItem` type, `wishlistItems`, `addToWishlist`, `removeFromWishlist`, `clearWishlist` with localStorage persist — useWishlist() wraps this
- `useAuthGatedAction.ts`: gates actions via authStore/authModalStore — stays as-is, useWishlist() is called inside the gated callback
- `protectedProcedure` (middleware.ts): validates Bearer token, injects `user` into tRPC context — ready for mutations
- `wishlistRouter` (routers/wishlist.ts): placeholder with empty `list` query — to be replaced with full CRUD
- `createSupabaseClient(accessToken)` in trpc.ts context: per-request Supabase client with user token for RLS

### Established Patterns

- tRPC routers in `src/server/routers/` merged in `router.ts`
- Zustand with persist middleware for client state
- Auth state in separate `authStore` (not appStore)
- Components import from stores via selector pattern: `useAppStore((s) => s.wishlistItems)`

### Integration Points

- 4 components to migrate: DestinationPanel, ComparisonDrawer, TripSummaryPanel, WishlistCounter — replace `useAppStore` wishlist selectors with `useWishlist()`
- `wishlistRouter` in `router.ts` already mounted on appRouter — just needs real endpoints
- `authStore` user state drives useWishlist() mode switching
- Auth modal `onClose` callback triggers pending action replay — useWishlist() must be ready to handle auth mode at that point

</code_context>

<specifics>
## Specific Ideas

- `list` endpoint public to prepare for v2 wishlist sharing (SOCL-01) — forward-thinking but zero extra work now
- "Stale-while-revalidate" pattern for page refresh: show localStorage cache immediately, refresh from server in background

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

_Phase: 03-wishlist-persistence_
_Context gathered: 2026-03-08_
