# Domain Pitfalls

**Domain:** Adding Supabase Auth + tRPC + Hono backend to an existing client-only React SPA
**Researched:** 2026-03-07

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or security vulnerabilities.

### Pitfall 1: Leaking the Supabase service_role key to the client bundle

**What goes wrong:** The `SUPABASE_SERVICE_ROLE_KEY` ends up in the Vite client bundle. Since Vite exposes any env var prefixed with `VITE_`, a developer might accidentally name it `VITE_SUPABASE_SERVICE_ROLE_KEY` or import server-side code into a client module. The service_role key bypasses all RLS policies -- anyone with it has unrestricted read/write access to every table.

**Why it happens:** Vite's env var convention (`VITE_` prefix = public) is easy to confuse with server-only vars. The `src/server/` directory lives in the same `src/` tree as client code, making accidental imports possible. Tree-shaking does not protect against this if the import path is resolved.

**Consequences:** Full database compromise. Any user can read/modify/delete all profiles and wishlists.

**Warning signs:**

- `VITE_` prefix on any key containing `SERVICE_ROLE` or `SECRET`
- Import of `src/server/*` modules in any file under `src/components/` or `src/routes/`
- `SUPABASE_SERVICE_ROLE_KEY` visible in browser DevTools > Sources

**Prevention:**

- Server env vars must NEVER have the `VITE_` prefix. Use `SUPABASE_SERVICE_ROLE_KEY` (no prefix) -- Vite will not bundle it.
- Keep `src/server/` imports strictly within `api/index.ts` (Vercel Function entry point). Never import from `src/server/` in any client-side file.
- Add a build-time check: grep the Vite output (`dist/`) for the service_role key pattern and fail the build if found.
- In `vercel.json`, the `api/` directory runs as serverless functions with its own env scope -- keep all server code there or imported only from there.

**Phase:** Must be enforced from the very first commit that introduces Supabase. No exceptions.

**Confidence:** HIGH -- [Supabase official docs](https://supabase.com/docs/guides/api/api-keys) explicitly warn against exposing service_role keys.

---

### Pitfall 2: Using `getSession()` instead of `getUser()` for server-side auth verification

**What goes wrong:** In the tRPC `createContext`, you call `supabase.auth.getSession()` to get the current user. On the server, `getSession()` reads the JWT from storage but does NOT revalidate it against Supabase. A forged or expired token will still return a user object.

**Why it happens:** `getSession()` is the natural first choice -- the name suggests it does what you want. The Supabase docs mention this caveat but it is easy to miss. Many tutorials still use `getSession()`.

**Consequences:** Auth bypass. An attacker can send a crafted JWT and the tRPC context will treat them as authenticated.

**Warning signs:**

- `supabase.auth.getSession()` called in `src/server/context.ts` or any server-side code
- No call to `supabase.auth.getUser()` in the auth verification path

**Prevention:**

- In the tRPC `createContext`, always use `supabase.auth.getUser()` which makes a network call to Supabase to validate the JWT.
- Create the server-side Supabase client with the user's JWT from the `Authorization` header, then call `getUser()` on that client.
- Pattern:
  ```typescript
  // src/server/context.ts
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  ```

**Phase:** Must be correct in the initial auth + tRPC context setup. Retrofitting is a security incident.

**Confidence:** HIGH -- [Supabase official docs](https://supabase.com/docs/reference/javascript/auth-getsession) explicitly state "never trust getSession inside server code."

---

### Pitfall 3: Async operations inside `onAuthStateChange` callback causing deadlocks

**What goes wrong:** After login, you call `onAuthStateChange` to trigger the localStorage-to-Supabase sync (the `wishlist.sync` tRPC mutation). If the callback is async and awaits the sync, it can cause a deadlock -- the auth state change event never completes, the UI hangs, and the session is left in an inconsistent state.

**Why it happens:** Supabase's `onAuthStateChange` uses internal locks (LockManager API in browsers) to prevent race conditions during token refresh. An async callback that awaits network requests can hold the lock too long or create circular dependencies.

**Consequences:** App hangs after login. User sees a loading spinner forever. The wishlist sync never completes. On some browsers, the session is corrupted.

**Warning signs:**

- `await` keyword inside `onAuthStateChange` callback
- Login flow works in dev but hangs intermittently in production
- Auth state flickers between logged-in and logged-out

**Prevention:**

- Never `await` inside `onAuthStateChange`. Instead, fire-and-forget or use a separate effect:
  ```typescript
  onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" && session) {
      // DON'T await -- fire and forget, or set a flag
      syncWishlistRef.current = true;
    }
  });
  // Separate useEffect watches the flag and performs the async sync
  ```
- Alternatively, trigger the sync from the auth callback redirect handler (after OAuth callback completes), not from `onAuthStateChange`.

**Phase:** Auth integration phase. This bug is subtle and hard to reproduce -- design the sync flow correctly from the start.

**Confidence:** HIGH -- [Supabase GitHub issue #41968](https://github.com/supabase/supabase/issues/41968) documents this exact behavior. Official docs warn against async callbacks.

---

### Pitfall 4: localStorage-to-Supabase merge losing data or creating duplicates

**What goes wrong:** When a user logs in for the first time, their anonymous wishlist (localStorage) must be merged into their Supabase wishlist. Without careful upsert logic and conflict resolution, items are either duplicated (user logs in, logs out, adds items, logs in again) or lost (localStorage cleared before sync confirmation).

**Why it happens:** The merge has multiple edge cases:

1. User adds items anonymously, logs in (first sync -- straightforward)
2. User logs in, adds items via Supabase, logs out, adds items anonymously, logs in again (must merge both sets without duplicates)
3. Network failure during sync -- localStorage already cleared but Supabase insert failed
4. Race condition: two tabs open, both try to sync

**Consequences:** Users lose their carefully curated wishlist. This is the core value proposition of auth -- if it breaks, users lose trust.

**Warning signs:**

- `clearWishlist()` called before the tRPC `sync` mutation is confirmed
- No upsert/conflict strategy on `wishlist_items` table
- No deduplication logic (same POI added twice)

**Prevention:**

- Use Supabase `upsert` with `onConflict: 'wishlist_id,poi_id'` (already planned in the architecture -- good).
- Clear localStorage ONLY after the sync mutation returns success. Pattern:
  ```typescript
  const localItems = useAppStore.getState().wishlistItems;
  await trpc.wishlist.sync.mutate(localItems); // wait for confirmation
  useAppStore.getState().clearWishlist(); // NOW clear localStorage
  ```
- After clearing, immediately refetch from Supabase to set the canonical state.
- Handle the "re-login after anonymous additions" case: always merge (upsert), never replace.

**Phase:** Auth integration phase. The sync procedure is the most complex piece of Epic 4. Design it carefully with all edge cases covered.

**Confidence:** HIGH -- this is a well-known pattern in offline-first apps. The architecture doc already has the right upsert approach, but the clearing-before-confirmation trap is easy to fall into.

---

## Moderate Pitfalls

### Pitfall 5: tRPC + @hono/trpc-server version incompatibility

**What goes wrong:** `@hono/trpc-server` has peer dependency issues with `@trpc/server` v11.4.0+. TypeScript compilation fails with cryptic type errors (TS2332) that look like your code is wrong but are actually version mismatches.

**Why it happens:** The Hono middleware ecosystem moves at a different pace than tRPC. Breaking type changes in tRPC minor versions are not immediately reflected in `@hono/trpc-server`.

**Warning signs:**

- TypeScript errors in adapter code that you did not write
- Errors mentioning `inferRouterContext` or `AnyRouter` type mismatches
- Works at runtime but fails `tsc`

**Prevention:**

- Pin `@trpc/server` and `@hono/trpc-server` versions together. Before upgrading either, check [the Hono middleware issues](https://github.com/honojs/middleware/issues/1231).
- Start with `@trpc/server@^11.3.1` and `@hono/trpc-server@^0.3` (known-compatible combination as of early 2026).
- Run `tsc --noEmit` in CI -- do not rely on Vite's lenient type checking alone.

**Phase:** Initial backend setup. Pin versions on day one.

**Confidence:** MEDIUM -- [GitHub issue #1231](https://github.com/honojs/middleware/issues/1231) confirms the v11.4.x breakage. Specific compatible versions should be verified at implementation time.

---

### Pitfall 6: Vercel Function routing conflicts with SPA catch-all

**What goes wrong:** The SPA catch-all route (`"src": "/(.*)", "dest": "/index.html"`) in `vercel.json` intercepts `/api/*` requests before they reach the serverless function, or vice versa -- API routes return the SPA HTML instead of JSON.

**Why it happens:** Route order in `vercel.json` matters. If the catch-all is listed before the API route, all requests including `/api/trpc/*` get the SPA. Additionally, Vercel's automatic routing for the `api/` directory can conflict with custom `routes` in `vercel.json`.

**Consequences:** tRPC calls return HTML (the SPA) instead of JSON. Cryptic client-side errors like "Unexpected token < in JSON at position 0."

**Warning signs:**

- tRPC calls failing with parsing errors
- Network tab shows `/api/trpc/*` returning `text/html` content-type
- Works in `vite dev` but breaks on Vercel

**Prevention:**

- In `vercel.json`, list API routes BEFORE the SPA catch-all (order matters):
  ```json
  {
    "rewrites": [
      { "source": "/api/(.*)", "destination": "/api/index.ts" },
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  }
  ```
- Use `rewrites` not `routes` (the architecture doc uses `routes` which is the legacy Vercel config).
- Test the deployed Vercel preview before merging -- local `vite dev` does not simulate Vercel routing.

**Phase:** Initial backend deployment. Verify immediately on first Vercel preview deploy.

**Confidence:** HIGH -- standard Vercel SPA + API gotcha, well documented.

---

### Pitfall 7: Dual state sources for wishlist (Zustand + TanStack Query) getting out of sync

**What goes wrong:** After auth, the wishlist lives in two places: Zustand (for anonymous mode) and TanStack Query cache (for authenticated tRPC queries). If both are active simultaneously, mutations update one but not the other, and the UI shows stale or inconsistent data.

**Why it happens:** The current app reads wishlist from `useAppStore().wishlistItems`. After auth, wishlist should come from `trpc.wishlist.get.useQuery()`. If the component still reads from Zustand while the data lives in TanStack Query (or vice versa), you get ghost items or missing items.

**Consequences:** User adds an item via tRPC but the UI does not update (reading from stale Zustand). Or user sees items that were deleted (stale TanStack Query cache).

**Warning signs:**

- Components importing both `useAppStore` and `trpc.wishlist.get` for wishlist data
- Wishlist count badge shows different number than the wishlist panel
- Items reappear after deletion on page refresh

**Prevention:**

- Create a single `useWishlist()` hook that abstracts the source:
  ```typescript
  function useWishlist() {
    const { user } = useAuth();
    const local = useAppStore((s) => s.wishlistItems);
    const remote = trpc.wishlist.get.useQuery(undefined, { enabled: !!user });
    return user ? (remote.data ?? []) : local;
  }
  ```
- All components read wishlist ONLY through this hook. Never import `useAppStore().wishlistItems` directly in components.
- On login: sync localStorage to Supabase, clear Zustand, invalidate the TanStack Query cache.
- On logout: clear TanStack Query cache, Zustand starts fresh (or restores from localStorage if desired).

**Phase:** Auth integration phase. Design this abstraction before writing any UI changes.

**Confidence:** HIGH -- standard dual-state problem in offline-first/auth-optional architectures.

---

### Pitfall 8: OAuth callback URL misconfiguration on Vercel

**What goes wrong:** Google OAuth works in local dev (`localhost:5173`) but fails on Vercel. The OAuth callback redirects to the wrong URL, or Supabase rejects the callback because the redirect URL is not in the allowed list.

**Why it happens:** Supabase Auth requires explicit redirect URL allowlisting. Vercel generates unique preview URLs (`*.vercel.app`) for each deployment. If only the production domain is allowlisted, preview deploys break. Additionally, the callback URL must match exactly (including trailing slashes and protocol).

**Consequences:** OAuth login fails silently or with a cryptic error on deployed environments. Works perfectly in local dev.

**Warning signs:**

- Login works on `localhost` but not on Vercel preview/production
- Supabase logs show "Invalid redirect URL" errors
- OAuth popup opens but redirects to a blank page or error

**Prevention:**

- In Supabase Dashboard > Auth > URL Configuration:
  - Add production domain: `https://whereto.vercel.app`
  - Add wildcard for previews: `https://*-florianslauers-projects.vercel.app` (check your Vercel team slug)
  - Keep `http://localhost:5173` for local dev
- In the client code, compute the redirect URL dynamically:
  ```typescript
  const redirectTo = `${window.location.origin}/auth/callback`;
  supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
  ```
- Create an `/auth/callback` route in TanStack Router to handle the OAuth code exchange.

**Phase:** Auth setup phase. Configure before the first OAuth test.

**Confidence:** HIGH -- extremely common issue, well documented in [Supabase Auth docs](https://supabase.com/docs/guides/auth/quickstarts/react).

---

### Pitfall 9: RLS policies that block the trigger function for auto-creating profiles/wishlists

**What goes wrong:** The `handle_new_user()` trigger function (which creates a `profiles` row and a `wishlists` row on signup) fails silently because RLS blocks the INSERT. The user signs up successfully (auth works) but has no profile or wishlist row, causing all subsequent tRPC calls to fail.

**Why it happens:** The trigger is defined as `SECURITY DEFINER` (runs as the function owner, typically `postgres`), which should bypass RLS. But if the function owner does not have the right privileges, or if RLS policies are misconfigured (e.g., a `FOR ALL` policy that requires `auth.uid()` but the trigger runs outside an auth context), the insert silently fails or errors.

**Consequences:** New users cannot use the wishlist. The error surfaces later (on first tRPC call) with a confusing "wishlist not found" error, not at signup time.

**Warning signs:**

- Signup succeeds but `profiles` / `wishlists` tables are empty for the new user
- tRPC `wishlist.get` returns null/empty for a freshly signed up user
- Supabase logs show RLS violations on `profiles` or `wishlists` tables from the trigger

**Prevention:**

- Ensure the trigger function is `SECURITY DEFINER` AND owned by a superuser role (default in Supabase-managed Postgres).
- Test the trigger explicitly: sign up a test user and immediately check the `profiles` and `wishlists` tables.
- Add a fallback in the tRPC `wishlist.get` procedure: if no wishlist exists for the user, create one on the fly (defensive coding).
- Use Supabase's SQL editor to test the trigger in isolation before deploying.

**Phase:** Database schema setup. Test immediately after creating the migration.

**Confidence:** MEDIUM -- the architecture doc has the right `SECURITY DEFINER` approach, but real-world edge cases with RLS + triggers are well-documented as tricky. Verify with actual Supabase testing.

---

## Minor Pitfalls

### Pitfall 10: Supabase client instantiated multiple times in the SPA

**What goes wrong:** Each component or module that needs Supabase creates its own `createClient()` call. Multiple instances lead to duplicated auth listeners, token refresh conflicts, and wasted memory.

**Prevention:**

- Create a single Supabase client instance in `src/lib/supabase.ts` and export it. Import everywhere.
- For server-side (Vercel Functions), create the client per-request in `createContext` (this is correct -- each request needs its own client with the user's JWT).

**Phase:** Initial Supabase setup.

**Confidence:** HIGH.

---

### Pitfall 11: Forgetting to handle the "loading" auth state

**What goes wrong:** On app boot, `onAuthStateChange` has not fired yet. The app renders as if the user is anonymous, flashes the anonymous UI, then switches to authenticated UI once the session is restored. The wishlist flickers between localStorage data and Supabase data.

**Prevention:**

- Add an `isAuthLoading` state. Show a minimal loading indicator (or just delay wishlist rendering) until the first `onAuthStateChange` event fires.
- Do NOT show the auth modal or trigger sync during this loading state.

**Phase:** Auth UI integration.

**Confidence:** HIGH.

---

### Pitfall 12: Cold start latency on Vercel Functions surprising users

**What goes wrong:** The first tRPC call after a period of inactivity takes 500ms+ (cold start) instead of the expected <100ms. If the wishlist sync fires on login and hits a cold function, the user sees a noticeable delay.

**Prevention:**

- Expect cold starts and design the UX accordingly: show an optimistic UI (the local wishlist items) while the sync runs in the background.
- Do not block the UI on the sync response. Use TanStack Query's `onSuccess` to silently update.
- Vercel's Fluid Compute reduces cold starts to ~115ms, but this still matters for perceived performance.

**Phase:** Backend deployment optimization.

**Confidence:** MEDIUM.

---

## Phase-Specific Warnings

| Phase Topic                              | Likely Pitfall                                                                                 | Mitigation                                                                                               |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Database schema + migrations             | Pitfall 9 (RLS blocking trigger)                                                               | Test trigger immediately after migration. Add defensive fallback in API.                                 |
| Supabase client setup                    | Pitfall 1 (service_role leak), Pitfall 10 (multiple instances)                                 | Strict env var naming. Single client singleton.                                                          |
| tRPC + Hono backend setup                | Pitfall 5 (version compat), Pitfall 6 (Vercel routing)                                         | Pin versions. Test on Vercel preview immediately.                                                        |
| Auth integration                         | Pitfall 2 (getSession vs getUser), Pitfall 3 (async onAuthStateChange), Pitfall 8 (OAuth URLs) | Use getUser() server-side. No async in callbacks. Configure all redirect URLs upfront.                   |
| Wishlist sync (localStorage to Supabase) | Pitfall 4 (merge data loss), Pitfall 7 (dual state)                                            | Upsert with conflict resolution. Single useWishlist() hook abstraction. Clear only after confirmed sync. |
| UI polish                                | Pitfall 11 (loading flash), Pitfall 12 (cold start)                                            | Auth loading state. Optimistic UI during sync.                                                           |

---

## Sources

- [Supabase API Keys documentation](https://supabase.com/docs/guides/api/api-keys)
- [Supabase Auth getSession vs getUser](https://supabase.com/docs/reference/javascript/auth-getsession)
- [Supabase onAuthStateChange deadlock issue #41968](https://github.com/supabase/supabase/issues/41968)
- [Supabase Auth React quickstart](https://supabase.com/docs/guides/auth/quickstarts/react)
- [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase session management](https://supabase.com/docs/guides/auth/sessions)
- [@hono/trpc-server v11.4.x type error issue #1231](https://github.com/honojs/middleware/issues/1231)
- [Hono Vercel deployment guide](https://hono.dev/docs/getting-started/vercel)
- [tRPC adapters documentation](https://trpc.io/docs/server/adapters)
