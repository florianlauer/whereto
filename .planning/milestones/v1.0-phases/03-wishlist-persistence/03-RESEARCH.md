# Phase 3: Wishlist Persistence - Research

**Researched:** 2026-03-08
**Domain:** tRPC CRUD + Zustand dual-mode hook + Supabase Postgres
**Confidence:** HIGH

## Summary

Phase 3 builds server-backed wishlist persistence for authenticated users via 5 tRPC endpoints (list, add, remove, update, reorder), wrapped behind a unified `useWishlist()` hook that components consume identically regardless of auth state. The existing infrastructure is well-prepared: DB schema has `wishlist_items` with RLS, `protectedProcedure` validates tokens, and the Zustand store already manages local wishlist state with localStorage persist.

The primary technical challenge is the dual-mode hook pattern: Zustand remains the read source for components, but in auth mode mutations must synchronize to the server via tRPC in background. A secondary challenge is a **schema gap** -- the `wishlist_items` table lacks a `days_min` column that the `WishlistItem` type requires.

**Primary recommendation:** Add `days_min` column via migration first, then build tRPC CRUD endpoints, then create `useWishlist()` hook, then migrate the 4 consumer components.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- Zustand remains the single source of truth read by components -- in auth mode, mutations update Zustand AND call tRPC
- Direct replacement of all 4 consumer components (DestinationPanel, ComparisonDrawer, TripSummaryPanel, WishlistCounter) in one pass
- API surface: `wishlistItems`, `addToWishlist`, `removeFromWishlist` -- no clearWishlist (Phase 4), no helpers (isInWishlist, getCountryItems)
- Hook lives at `src/hooks/useWishlist.ts`
- Reads authStore directly to detect auth mode -- no provider/context needed
- Zustand persist middleware continues writing to localStorage even in auth mode
- Optimistic updates: Zustand updated immediately, tRPC sync in background, basic error logging (no rollback UI)
- Auto-fetches server wishlist when user transitions from null to authenticated
- During fetch: keeps local data visible (no loading flash)
- 5 tRPC endpoints: `wishlist.list` (query/publicProcedure), `wishlist.add`, `wishlist.remove`, `wishlist.update`, `wishlist.reorder` (mutations/protectedProcedure)
- `add` is an upsert -- if poi_id already exists, updates fields silently
- `list` returns flat array (poi_id, country_code, daysMin, position)
- `reorder` receives complete array of poi_ids in new order
- `update` allows modifying daysMin for an existing item
- First login (server empty): keep local items in Zustand UI, don't send to server
- Existing user (server has items): replace Zustand with server data
- Fetch error on login: keep local data, retry silently
- Page refresh: Zustand hydrates from localStorage, then useWishlist() fetches server data
- useAuthGatedAction remains separate from useWishlist()
- Auth gate applies only to add (not remove)

### Claude's Discretion

- Exact Zod schemas for tRPC inputs
- Error retry strategy details (timing, max retries)
- Internal state management within useWishlist() (useEffect vs useCallback patterns)
- How to handle race conditions between auto-fetch and immediate pending action

### Deferred Ideas (OUT OF SCOPE)

None -- discussion stayed within phase scope.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                    | Research Support                                                                                  |
| ------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| WISH-01 | User authentifie peut sauvegarder sa wishlist en DB via tRPC                   | tRPC CRUD endpoints (add, remove, update, reorder) with protectedProcedure + Supabase RLS         |
| WISH-05 | Hook `useWishlist()` unifie -- composants ignorent le mode anonyme/authentifie | Dual-mode hook pattern: reads Zustand, dispatches to localStorage or tRPC based on authStore.user |
| WISH-06 | User peut retrouver sa wishlist en se connectant depuis un autre device        | Server fetch on auth state transition (null -> user) replaces Zustand with server data            |

</phase_requirements>

## Standard Stack

### Core (already installed)

| Library                    | Version  | Purpose                               | Why Standard                                                |
| -------------------------- | -------- | ------------------------------------- | ----------------------------------------------------------- |
| @trpc/server               | ^11.12.0 | Server-side router + procedures       | Already in use, tRPC v11 pattern established in Phase 1     |
| @trpc/client               | ^11.12.0 | Client-side caller                    | Already configured with auth header injection               |
| @trpc/tanstack-react-query | ^11.12.0 | React hooks for tRPC                  | Already set up via `createTRPCContext` in `src/lib/trpc.ts` |
| @supabase/supabase-js      | ^2.98.0  | Database access (server-side via RLS) | Already in use, typed via `Database`                        |
| zustand                    | ^5       | Client state + localStorage persist   | Already manages wishlist state in `appStore.ts`             |
| zod                        | ^3       | Input validation for tRPC procedures  | Already a dependency, standard for tRPC input schemas       |

### No Additional Dependencies Needed

All required libraries are already installed. No new packages needed.

## Architecture Patterns

### Recommended Changes

```
src/
├── hooks/
│   └── useWishlist.ts          # NEW: unified hook (dual-mode)
├── server/
│   └── routers/
│       └── wishlist.ts         # REPLACE: placeholder -> full CRUD
├── stores/
│   └── appStore.ts             # MODIFY: add setWishlistItems() for server data replace
├── components/destination/
│   ├── DestinationPanel.tsx    # MODIFY: useAppStore -> useWishlist()
│   ├── ComparisonDrawer.tsx    # MODIFY: useAppStore -> useWishlist()
│   ├── TripSummaryPanel.tsx    # MODIFY: useAppStore -> useWishlist()
│   └── WishlistCounter.tsx     # MODIFY: useAppStore -> useWishlist()
└── supabase/migrations/
    └── 00002_add_days_min.sql  # NEW: add days_min column
```

### Pattern 1: Dual-Mode Hook (useWishlist)

**What:** A hook that returns the same API (`wishlistItems`, `addToWishlist`, `removeFromWishlist`) regardless of auth state. Internally reads `authStore.user` to decide whether to fire tRPC mutations alongside Zustand updates.

**When to use:** When the same UI must work identically for anonymous and authenticated users.

**Implementation approach:**

```typescript
// src/hooks/useWishlist.ts
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import { useTRPC } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback, useRef } from "react";

export function useWishlist() {
  const wishlistItems = useAppStore((s) => s.wishlistItems);
  const addLocal = useAppStore((s) => s.addToWishlist);
  const removeLocal = useAppStore((s) => s.removeFromWishlist);
  const setWishlistItems = useAppStore((s) => s.setWishlistItems);
  const user = useAuthStore((s) => s.user);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Auto-fetch when user transitions from null to authenticated
  const prevUserRef = useRef(user);
  useEffect(() => {
    const wasNull = prevUserRef.current === null;
    prevUserRef.current = user;
    if (wasNull && user) {
      // Fetch server wishlist, replace Zustand if server has items
      queryClient
        .fetchQuery(trpc.wishlist.list.queryOptions())
        .then((serverItems) => {
          if (serverItems.length > 0) {
            setWishlistItems(serverItems);
          }
          // If server empty, keep local items visible (no merge, no wipe)
        })
        .catch((err) => console.error("[useWishlist] fetch error:", err));
    }
  }, [user]);

  const addToWishlist = useCallback(
    (item: WishlistItem) => {
      addLocal(item); // Optimistic: update Zustand immediately
      if (user) {
        // Fire-and-forget tRPC mutation
        queryClient.fetchQuery(/* ... */); // or useMutation pattern
      }
    },
    [user, addLocal],
  );

  // Similar for removeFromWishlist

  return { wishlistItems, addToWishlist, removeFromWishlist };
}
```

### Pattern 2: tRPC Upsert with Supabase

**What:** The `add` endpoint uses Supabase's `upsert` with `onConflict` to handle idempotent adds.

**Implementation approach:**

```typescript
// In wishlist router
add: protectedProcedure
  .input(
    z.object({
      poiId: z.string(),
      countryCode: z.string(),
      daysMin: z.number().int().positive(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    // First get user's wishlist id
    const { data: wishlist } = await ctx.supabaseUser
      .from("wishlists")
      .select("id")
      .eq("user_id", ctx.user.id)
      .single();

    // Upsert the item
    const { error } = await ctx.supabaseUser.from("wishlist_items").upsert(
      {
        wishlist_id: wishlist.id,
        poi_id: input.poiId,
        country_code: input.countryCode,
        days_min: input.daysMin,
      },
      { onConflict: "wishlist_id,poi_id" },
    );

    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
  });
```

### Pattern 3: Batch Reorder

**What:** The `reorder` endpoint receives the full ordered list of poi_ids and updates all positions in a single transaction.

**Implementation approach:**

```typescript
reorder: protectedProcedure
  .input(z.object({ poiIds: z.array(z.string()) }))
  .mutation(async ({ ctx, input }) => {
    const { data: wishlist } = await ctx.supabaseUser
      .from("wishlists")
      .select("id")
      .eq("user_id", ctx.user.id)
      .single();

    // Update each item's position
    const updates = input.poiIds.map((poiId, index) =>
      ctx.supabaseUser
        .from("wishlist_items")
        .update({ position: index })
        .eq("wishlist_id", wishlist.id)
        .eq("poi_id", poiId),
    );

    await Promise.all(updates);
  });
```

### Anti-Patterns to Avoid

- **Importing tRPC hooks in components directly:** Components must only use `useWishlist()`, never call tRPC directly for wishlist operations.
- **Awaiting tRPC mutations before updating Zustand:** Zustand must be updated first (optimistic), tRPC fires in background.
- **Using React Query cache as the read source:** Zustand is the single source of truth. React Query is only used for the initial server fetch and fire-and-forget mutations.
- **Async operations in onAuthStateChange:** The authStore callback must stay synchronous (documented blocker from Phase 2). The auto-fetch must happen in useWishlist's useEffect, not in the auth state change handler.

## Don't Hand-Roll

| Problem               | Don't Build                               | Use Instead                                                 | Why                                                          |
| --------------------- | ----------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------ |
| Upsert logic          | Custom SELECT + conditional INSERT/UPDATE | Supabase `.upsert()` with `onConflict`                      | Handles race conditions, atomic                              |
| Input validation      | Manual checks in mutation                 | Zod schemas via tRPC `.input()`                             | Type-safe, auto-validated                                    |
| Auth token injection  | Manual header management                  | Existing `httpBatchLink` with `getState()` header injection | Already configured in Phase 2                                |
| Server client scoping | Manual token passing                      | `ctx.supabaseUser` from tRPC context                        | Already creates per-request client with user's token for RLS |

## Common Pitfalls

### Pitfall 1: Missing `days_min` Column

**What goes wrong:** The `wishlist_items` table has `poi_id`, `country_code`, `position` but NO `days_min` column. The `WishlistItem` Zustand type includes `daysMin`. The CONTEXT.md specifies `list` returns `daysMin` and `update` can modify it.
**Why it happens:** The initial schema was designed before the full CRUD requirements were specified.
**How to avoid:** Create a migration to add `days_min integer not null default 1` to `wishlist_items` BEFORE building endpoints. Regenerate types with `bun run db:types`.
**Warning signs:** TypeScript errors when trying to insert/select `days_min` from the table.

### Pitfall 2: Wishlist ID Lookup on Every Mutation

**What goes wrong:** Every mutation (add, remove, update, reorder) needs the user's `wishlist_id`. Querying it separately on each call adds latency.
**Why it happens:** The schema uses a separate `wishlists` table (1:1 with user) as an indirection layer.
**How to avoid:** Create a helper function `getWishlistId(supabaseUser, userId)` that all mutations share. Consider caching in the tRPC context if needed, but for Phase 3 a simple query per mutation is acceptable (wishlists table is tiny, indexed on `user_id` unique).

### Pitfall 3: Race Between Auto-Fetch and Pending Action

**What goes wrong:** User clicks "add to wishlist" while logged out -> auth modal opens -> user logs in -> `useWishlist` auto-fetch triggers AND the pending action fires simultaneously. The pending action's `addToWishlist` may run before the server fetch completes, causing stale state.
**Why it happens:** `authModalStore.executePending()` fires on login, and `useWishlist`'s useEffect also fires on user state change.
**How to avoid:** Since Zustand is the source of truth and the add is optimistic (Zustand first, then tRPC), this is actually safe: the add updates Zustand immediately, and the server fetch either confirms the data or replaces it. The only risk is if the server fetch replaces Zustand AFTER the add, losing the new item. Solution: if server returns items, merge (or simply accept that the item was also sent to server via tRPC, so it will be in the next fetch).

Actually, per CONTEXT.md: "After login via modal, pending action executes immediately -- no waiting for server fetch to complete." The add mutation fires to server AND updates Zustand. The server fetch that follows will include the newly added item (since the tRPC add was already sent). No real race condition if both happen.

### Pitfall 4: RLS Policy Requires Authenticated Role

**What goes wrong:** The `list` endpoint is `publicProcedure` but RLS policies on `wishlist_items` only grant SELECT to `authenticated` role. An unauthenticated call to `list` would return empty (RLS blocks).
**Why it happens:** CONTEXT.md says `list` is publicProcedure to prepare for future sharing (SOCL-01).
**How to avoid:** For now, `list` being public is fine -- unauthenticated calls return empty (which is correct). When SOCL-01 is implemented, a separate RLS policy for public access will be needed. No action needed in Phase 3.

### Pitfall 5: Column Name Casing (snake_case vs camelCase)

**What goes wrong:** Supabase returns `poi_id`, `country_code`, `days_min`, `position` (snake_case). Zustand and components use `poiId`, `countryCode`, `daysMin` (camelCase).
**Why it happens:** PostgreSQL convention vs JavaScript convention.
**How to avoid:** Map column names in the `list` query response and in mutation inputs. Do this mapping in the tRPC router, not in the hook.

## Code Examples

### Migration: Add days_min Column

```sql
-- 00002_add_days_min.sql
alter table public.wishlist_items
  add column days_min integer not null default 1;
```

### tRPC Router: Wishlist CRUD

```typescript
// src/server/routers/wishlist.ts
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { protectedProcedure } from "../middleware";

// Helper: get user's wishlist ID
async function getWishlistId(supabaseUser: SupabaseClient, userId: string) {
  const { data, error } = await supabaseUser
    .from("wishlists")
    .select("id")
    .eq("user_id", userId)
    .single();
  if (error || !data) throw new TRPCError({ code: "NOT_FOUND", message: "Wishlist not found" });
  return data.id;
}

export const wishlistRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.accessToken) return [];
    // Need to validate token for RLS
    const {
      data: { user },
      error: authError,
    } = await ctx.supabaseUser.auth.getUser();
    if (authError || !user) return [];

    const wishlistId = await getWishlistId(ctx.supabaseUser, user.id);
    const { data, error } = await ctx.supabaseUser
      .from("wishlist_items")
      .select("poi_id, country_code, days_min, position")
      .eq("wishlist_id", wishlistId)
      .order("position");

    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    // Map snake_case -> camelCase
    return (data ?? []).map((item) => ({
      poiId: item.poi_id,
      countryCode: item.country_code,
      daysMin: item.days_min,
      position: item.position,
    }));
  }),

  add: protectedProcedure
    .input(
      z.object({
        poiId: z.string().min(1),
        countryCode: z.string().length(2),
        daysMin: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const wishlistId = await getWishlistId(ctx.supabaseUser, ctx.user.id);
      // Count existing items for position
      const { count } = await ctx.supabaseUser
        .from("wishlist_items")
        .select("*", { count: "exact", head: true })
        .eq("wishlist_id", wishlistId);

      const { error } = await ctx.supabaseUser.from("wishlist_items").upsert(
        {
          wishlist_id: wishlistId,
          poi_id: input.poiId,
          country_code: input.countryCode,
          days_min: input.daysMin,
          position: count ?? 0,
        },
        { onConflict: "wishlist_id,poi_id" },
      );

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    }),

  remove: protectedProcedure
    .input(z.object({ poiId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const wishlistId = await getWishlistId(ctx.supabaseUser, ctx.user.id);
      const { error } = await ctx.supabaseUser
        .from("wishlist_items")
        .delete()
        .eq("wishlist_id", wishlistId)
        .eq("poi_id", input.poiId);

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    }),

  update: protectedProcedure
    .input(
      z.object({
        poiId: z.string().min(1),
        daysMin: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const wishlistId = await getWishlistId(ctx.supabaseUser, ctx.user.id);
      const { error } = await ctx.supabaseUser
        .from("wishlist_items")
        .update({ days_min: input.daysMin })
        .eq("wishlist_id", wishlistId)
        .eq("poi_id", input.poiId);

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    }),

  reorder: protectedProcedure
    .input(z.object({ poiIds: z.array(z.string().min(1)) }))
    .mutation(async ({ ctx, input }) => {
      const wishlistId = await getWishlistId(ctx.supabaseUser, ctx.user.id);
      await Promise.all(
        input.poiIds.map((poiId, index) =>
          ctx.supabaseUser
            .from("wishlist_items")
            .update({ position: index })
            .eq("wishlist_id", wishlistId)
            .eq("poi_id", poiId),
        ),
      );
    }),
});
```

### Zustand Store: Add setWishlistItems

```typescript
// Addition to appStore.ts
setWishlistItems: (items: WishlistItem[]) => set({ wishlistItems: items }),
```

### useWishlist Hook Structure

```typescript
// src/hooks/useWishlist.ts
export function useWishlist() {
  const wishlistItems = useAppStore((s) => s.wishlistItems)
  const addLocal = useAppStore((s) => s.addToWishlist)
  const removeLocal = useAppStore((s) => s.removeFromWishlist)
  const setItems = useAppStore((s) => s.setWishlistItems)
  const user = useAuthStore((s) => s.user)
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const prevUserRef = useRef<User | null>(null)

  // Auto-fetch on auth state transition
  useEffect(() => {
    const wasNull = prevUserRef.current === null
    prevUserRef.current = user
    if (wasNull && user) {
      queryClient.fetchQuery(trpc.wishlist.list.queryOptions())
        .then((items) => {
          if (items.length > 0) setItems(items)
        })
        .catch((err) => console.error('[useWishlist] fetch failed:', err))
    }
  }, [user])

  // Also fetch on mount if already authenticated (page refresh case)
  useEffect(() => {
    if (user) {
      queryClient.fetchQuery(trpc.wishlist.list.queryOptions())
        .then((items) => {
          if (items.length > 0) setItems(items)
        })
        .catch((err) => console.error('[useWishlist] refresh fetch failed:', err))
    }
  }, []) // Run once on mount

  const addToWishlist = useCallback((item: WishlistItem) => {
    addLocal(item)
    if (user) {
      // Fire-and-forget
      queryClient.getMutationCache() // or direct fetch
      fetch('/api/trpc/wishlist.add', { ... }) // or use mutation
    }
  }, [user, addLocal])

  const removeFromWishlist = useCallback((poiId: string) => {
    removeLocal(poiId)
    if (user) {
      // Fire-and-forget
    }
  }, [user, removeLocal])

  return { wishlistItems, addToWishlist, removeFromWishlist }
}
```

## State of the Art

| Old Approach               | Current Approach                                        | When Changed | Impact                                                      |
| -------------------------- | ------------------------------------------------------- | ------------ | ----------------------------------------------------------- |
| tRPC v10 `trpc.useQuery()` | tRPC v11 `useTRPC()` + `queryOptions()`                 | 2024         | Use `queryClient.fetchQuery(trpc.x.queryOptions())` pattern |
| `createTRPCReact()`        | `createTRPCContext()` from `@trpc/tanstack-react-query` | tRPC v11     | Already set up in `src/lib/trpc.ts`                         |

**Important for mutations in fire-and-forget mode:** Do NOT use React Query's `useMutation` hook (it ties to component lifecycle). Instead, use `trpc` client directly or `queryClient.fetchQuery` for mutations that should survive unmounts.

## Open Questions

1. **Fire-and-forget mutation pattern with tRPC v11**
   - What we know: `useTRPC()` gives access to query options. `useMutation` ties to component lifecycle.
   - What's unclear: Best pattern for fire-and-forget mutations that don't block UI in tRPC v11 with TanStack React Query.
   - Recommendation: Use `useTRPCClient()` (already exported from `src/lib/trpc.ts`) which returns the raw tRPC client. Call `client.wishlist.add.mutate(input)` directly -- this returns a Promise that can be `.catch()`-ed without blocking. This avoids React Query lifecycle entirely.

2. **Country code validation (2 chars vs ISO)**
   - What we know: `countryCode` is `z.string().length(2)` -- sufficient for Phase 3.
   - What's unclear: Whether a stricter ISO 3166-1 alpha-2 validation is needed.
   - Recommendation: Keep `.length(2)` for now. The client already uses valid country codes from the static dataset.

## Validation Architecture

### Test Framework

| Property           | Value                                                       |
| ------------------ | ----------------------------------------------------------- |
| Framework          | vitest (via `vitest.config.ts`)                             |
| Config file        | `vitest.config.ts` (jsdom environment, globals, `@/` alias) |
| Quick run command  | `bun run test`                                              |
| Full suite command | `bun run test`                                              |

### Phase Requirements -> Test Map

| Req ID  | Behavior                                               | Test Type | Automated Command                                      | File Exists? |
| ------- | ------------------------------------------------------ | --------- | ------------------------------------------------------ | ------------ |
| WISH-01 | tRPC wishlist CRUD operations persist to DB            | unit      | `bun run test src/server/__tests__/wishlist.test.ts`   | No - Wave 0  |
| WISH-05 | useWishlist() returns same API for anon and auth modes | unit      | `bun run test src/hooks/__tests__/useWishlist.test.ts` | No - Wave 0  |
| WISH-06 | Server fetch replaces Zustand on auth transition       | unit      | `bun run test src/hooks/__tests__/useWishlist.test.ts` | No - Wave 0  |

### Sampling Rate

- **Per task commit:** `bun run test`
- **Per wave merge:** `bun run test && bun run type`
- **Phase gate:** Full suite green + manual verification in Supabase Studio

### Wave 0 Gaps

- [ ] `src/server/__tests__/wishlist.test.ts` -- covers WISH-01 (tRPC router unit tests with mocked Supabase)
- [ ] `src/hooks/__tests__/useWishlist.test.ts` -- covers WISH-05, WISH-06 (hook behavior with mocked stores/tRPC)
- [ ] No framework gaps -- vitest + testing-library already configured

## Sources

### Primary (HIGH confidence)

- Codebase analysis: `src/stores/appStore.ts`, `src/server/routers/wishlist.ts`, `src/server/middleware.ts`, `src/server/trpc.ts`, `src/server/db.ts`, `src/stores/authStore.ts`, `src/hooks/useAuthGatedAction.ts`
- DB schema: `supabase/migrations/00001_initial_schema.sql`
- Generated types: `src/lib/database.types.ts`
- All 4 consumer components grep'd for wishlist usage patterns

### Secondary (MEDIUM confidence)

- tRPC v11 patterns -- based on existing codebase setup (`createTRPCContext`, `useTRPC`, `useTRPCClient`)
- Supabase `.upsert()` with `onConflict` -- standard Supabase JS SDK pattern

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH -- all libraries already installed and configured
- Architecture: HIGH -- patterns directly derived from existing codebase + locked CONTEXT.md decisions
- Pitfalls: HIGH -- identified through direct codebase analysis (schema gap, casing, RLS scope)

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable stack, no moving parts)
