# Project Research Summary

**Project:** Whereto
**Domain:** Adding backend infrastructure (auth, API, persistence) to an existing client-only travel discovery SPA
**Researched:** 2026-03-07
**Confidence:** HIGH

## Executive Summary

Whereto is a fully client-side React SPA (Vite 6, TanStack Router, Zustand, deck.gl/MapLibre) that needs user accounts and persistent wishlists without disrupting its zero-network-post-load core experience. The research converges on a clear approach: Supabase for auth and Postgres, tRPC v11 for end-to-end type-safe API, Hono as the lightweight serverless HTTP layer on Vercel Functions, and TanStack Query for server state management. This stack is mature, well-documented, and avoids over-engineering -- no ORM needed for 3 tables, no SSR framework needed for a pure SPA.

The recommended architecture adds a thin backend layer that only activates for user operations (auth, wishlist CRUD). Anonymous users never hit the backend -- the existing localStorage wishlist and static JSON data flow remain untouched. The critical integration challenge is the dual wishlist state: Zustand for anonymous users, TanStack Query for authenticated users, unified behind a single `useWishlist()` hook. The localStorage-to-Supabase merge on first login is the highest-complexity piece and requires careful upsert logic with conflict resolution.

The top risks are security-oriented: leaking the Supabase service_role key into the client bundle (full DB compromise), using `getSession()` instead of `getUser()` for server-side JWT verification (auth bypass), and async deadlocks inside Supabase's `onAuthStateChange` callback. All three have well-documented prevention strategies and must be addressed from the first commit. Version pinning between `@trpc/server` and `@hono/trpc-server` is also critical due to known type compatibility issues.

## Key Findings

### Recommended Stack

The stack is entirely within the existing TypeScript/React ecosystem. No new languages or paradigms. See [STACK.md](./STACK.md) for full details.

**Core technologies:**

- **Supabase (`@supabase/supabase-js` ^2.98):** Auth (magic link, Google OAuth, email/password) + managed Postgres with RLS. Single SDK for both concerns. Free tier covers 50K MAU.
- **tRPC v11 (`@trpc/server` + `@trpc/client` + `@trpc/tanstack-react-query` ^11.12):** End-to-end type-safe API layer. No codegen, no Swagger. Pairs with TanStack Query for caching and optimistic updates.
- **Hono (^4.12) + `@hono/trpc-server` (^0.4):** Lightweight (14KB) fetch-API-native HTTP framework for Vercel Functions. Replaces Express with 10x less bundle size.
- **TanStack Query (^5.90):** Async server state management for authenticated wishlist. Complements Zustand (sync client state) without overlap.

**Do NOT use:** `@supabase/ssr` (SPA does not need cookie sessions), Prisma/Drizzle (overkill for 3 tables), Express (too heavy for serverless), tRPC v10 (legacy).

### Expected Features

See [FEATURES.md](./FEATURES.md) for the full feature landscape.

**Must have (table stakes):**

- Email/password, Google OAuth, and magic link auth -- all three methods expected
- Auth is non-blocking -- prompt only at "Save to wishlist" action, never gate core map functionality
- Wishlist persists cross-device (the entire value proposition of adding accounts)
- localStorage merge on first login -- users must not lose anonymous wishlist data
- Optimistic UI updates for add/remove (serverless cold starts make blocking UX unacceptable)
- Sign out with full data cleanup (privacy on shared devices)
- Session persistence via refresh tokens (stay logged in across browser restarts)

**Should have (differentiators):**

- Context-aware auth prompt ("Sign in to save this destination") instead of generic login button
- Silent merge with toast confirmation ("3 destinations synced to your account")
- Minimal account indicator (avatar/initial in top bar, dropdown with sign-out only)

**Defer (v2+):**

- Shared wishlist via URL (high complexity, new RLS policies + routes)
- Multiple named wishlists/trips (schema supports it, UI does not)
- Offline queue/sync (map requires connectivity anyway)
- Password reset flow (magic link covers this use case)
- Full user profile page, social features, 2FA, admin dashboard

### Architecture Approach

The architecture preserves the existing zero-network core (map, filters, scoring) and adds backend only for user operations. Browser Supabase client handles auth flows and provides JWTs. tRPC client sends JWTs to Hono/tRPC server on Vercel Functions. Server verifies JWTs via `getUser()` and accesses Supabase Postgres with RLS. See [ARCHITECTURE.md](./ARCHITECTURE.md) for full diagrams and code patterns.

**Major components:**

1. **Vite SPA (existing, modified)** -- Map, filters, scoring remain client-only. New: auth modal, `useWishlist()` hook, QueryClientProvider
2. **Supabase JS Client (browser, new)** -- Auth flows only (signIn, signOut, onAuthStateChange). Provides JWT for tRPC Authorization header
3. **tRPC Client + TanStack Query (new)** -- Type-safe wishlist CRUD calls with caching and optimistic updates
4. **Hono + tRPC Server (new, Vercel Function)** -- API entry point at `/api/trpc/*`. Auth verification via JWT, wishlist procedures (get, sync, add, remove)
5. **Supabase PostgreSQL (new)** -- 3 tables: `profiles`, `wishlists`, `wishlist_items` with RLS policies
6. **Dual Wishlist State** -- Zustand for anonymous, TanStack Query for authenticated, unified via `useWishlist()` hook

### Critical Pitfalls

See [PITFALLS.md](./PITFALLS.md) for all 12 pitfalls with prevention strategies.

1. **Service role key leak to client bundle** -- Never prefix with `VITE_`. Keep server code imports strictly in `api/` entry point. Add build-time grep check.
2. **`getSession()` vs `getUser()` on server** -- Always use `getUser(token)` in tRPC context. `getSession()` does not verify JWTs server-side.
3. **Async deadlocks in `onAuthStateChange`** -- Never `await` inside the callback. Use fire-and-forget or a separate effect for the sync mutation.
4. **localStorage merge data loss** -- Clear localStorage ONLY after sync mutation returns success. Use upsert with `onConflict: 'wishlist_id,poi_id'`.
5. **tRPC + Hono version incompatibility** -- Pin `@trpc/server` and `@hono/trpc-server` versions together. Known type breakage in v11.4.x+.

## Implications for Roadmap

Based on combined research, the architecture has clear dependency chains that dictate phase ordering. The 4-phase structure from ARCHITECTURE.md is sound and aligns with feature priorities and pitfall mitigation.

### Phase 1: Database Schema + tRPC Server + Deployment

**Rationale:** Foundation phase -- nothing works without the database tables, RLS policies, and a deployed API endpoint. No frontend changes required, so it can be tested in isolation with curl/Postman.
**Delivers:** Supabase project with `profiles`, `wishlists`, `wishlist_items` tables + RLS policies + `handle_new_user` trigger. Hono + tRPC server with wishlist procedures deployed to Vercel Functions. `vercel.json` rewrites for SPA + API cohabitation.
**Addresses:** Infrastructure DB and typed API (Epic 4 story 4.1)
**Avoids:** Pitfall 1 (service_role key leak -- enforce env var naming from day one), Pitfall 5 (version compat -- pin versions immediately), Pitfall 6 (Vercel routing -- test on preview deploy), Pitfall 9 (RLS blocking trigger -- test trigger after migration)

### Phase 2: Auth Integration (Client + Server)

**Rationale:** Auth depends on the tRPC server being deployed (JWT verification in context). This phase adds auth flows without changing the wishlist behavior yet.
**Delivers:** Supabase browser client, auth modal (all 3 methods), auth state in Zustand, JWT forwarding to tRPC, protected procedure middleware, OAuth callback route. Account indicator + sign out in UI.
**Addresses:** Auth features (Epic 4 story 4.2 -- partial)
**Avoids:** Pitfall 2 (`getUser()` not `getSession()` from day one), Pitfall 3 (no async in `onAuthStateChange`), Pitfall 8 (configure all OAuth redirect URLs upfront), Pitfall 10 (single Supabase client instance), Pitfall 11 (auth loading state)

### Phase 3: Persistent Wishlist + localStorage Merge

**Rationale:** Highest complexity phase. Requires both the API layer (Phase 1) and auth (Phase 2) to be stable before integrating the dual wishlist state.
**Delivers:** `useWishlist()` unified hook, localStorage-to-Supabase sync on first login, authenticated wishlist CRUD via tRPC, optimistic updates, updated DestinationPanel and TripSummaryPanel.
**Addresses:** Persistent wishlist (Epic 4 story 4.3), localStorage merge (Epic 4 story 4.2 acceptance criteria #4)
**Avoids:** Pitfall 4 (merge data loss -- upsert + clear-after-confirm), Pitfall 7 (dual state -- single hook abstraction)

### Phase 4: Polish + Edge Cases

**Rationale:** Final phase handles UX polish and edge cases that only matter once the core flow works.
**Delivers:** Toast notifications for merge confirmation, error handling for all auth flows (expired magic link, cancelled OAuth, network error), cold start mitigation via optimistic UI, logout data cleanup.
**Addresses:** Differentiator features (context-aware prompt, merge toast, error messages)
**Avoids:** Pitfall 12 (cold start UX -- optimistic UI during sync)

### Phase Ordering Rationale

- **Strict dependency chain:** DB/API -> Auth -> Wishlist sync -> Polish. Each phase depends on the previous being stable.
- **Architecture alignment:** Phases match the component boundaries -- server-only (Phase 1), auth plumbing (Phase 2), data integration (Phase 3), UX (Phase 4).
- **Risk front-loading:** The most dangerous pitfalls (security: key leak, auth bypass) are addressed in Phases 1-2. The most complex integration (merge flow, dual state) is isolated in Phase 3 with stable foundations.
- **Testability:** Phase 1 can be validated without a browser. Phase 2 can be validated without touching wishlist logic. Phase 3 is the big integration test.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 1:** Vercel Function catch-all routing with Hono needs validation. The exact `vercel.json` rewrite pattern for SPA + API cohabitation should be tested on a preview deploy before building further. The `@hono/trpc-server` TypeScript types with tRPC v11.12 need verification against the installed version.
- **Phase 3:** The localStorage merge flow has subtle edge cases (re-login after anonymous additions, multi-tab sync, network failure mid-sync). The `useWishlist()` hook abstraction should be designed before any UI changes begin.

Phases with standard patterns (skip research-phase):

- **Phase 2:** Supabase Auth for React SPA is extremely well-documented. All three auth methods (email/password, Google OAuth, magic link) have official quickstarts. The protected procedure middleware is standard tRPC.
- **Phase 4:** Polish work follows established TanStack Query patterns (optimistic updates, error handling). No novel architecture.

## Confidence Assessment

| Area         | Confidence                        | Notes                                                                                                                                                 |
| ------------ | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack        | HIGH                              | All packages verified against npm registry. Versions confirmed compatible. Well-established ecosystem.                                                |
| Features     | HIGH                              | Clear feature landscape with sensible MVP/defer split. Domain is well-understood (travel app with accounts).                                          |
| Architecture | HIGH (core) / MEDIUM (deployment) | Core patterns (tRPC + Supabase + dual state) are well-documented. Vercel deployment specifics (catch-all routing, SPA+API cohabitation) need testing. |
| Pitfalls     | HIGH                              | Critical pitfalls backed by official docs and GitHub issues. Prevention strategies are concrete and actionable.                                       |

**Overall confidence:** HIGH

### Gaps to Address

- **Vercel catch-all routing:** The exact `vercel.json` rewrite syntax for Hono catch-all alongside Vite SPA needs testing on a real deploy. The architecture doc notes MEDIUM confidence here. Validate in Phase 1 before building further.
- **`@hono/trpc-server` TypeScript types with tRPC v11.12:** Known compatibility issues with v11.4+. The recommended ^0.4 version should work with ^11.12, but must be verified at install time. If types break, fallback to tRPC's native fetch adapter (no Hono middleware).
- **Server code tree-shaking:** `src/server/` lives inside the Vite source tree. Verify that no client code path resolves imports from `src/server/`. If it does, move server code to a top-level `server/` directory outside `src/`. The `VITE_` prefix safety net protects the service_role key even if code is bundled, but this should not be relied upon.
- **Supabase free tier limits:** 500MB storage and 50K MAU are generous for MVP, but the 500 concurrent connections limit on the free tier may matter if the app gains traction. Monitor via Supabase dashboard.

## Sources

### Primary (HIGH confidence)

- [Supabase Auth docs](https://supabase.com/docs/guides/auth/) -- auth flows, PKCE, getUser vs getSession, RLS
- [Supabase API Keys docs](https://supabase.com/docs/guides/api/api-keys) -- service_role key security
- [tRPC v11 official docs](https://trpc.io/docs/) -- setup, adapters, TanStack React Query integration
- [Hono official docs](https://hono.dev/docs/) -- Vercel deployment, middleware
- [npm registry](https://www.npmjs.com/) -- version verification (2026-03-07)

### Secondary (MEDIUM confidence)

- [@hono/trpc-server npm](https://www.npmjs.com/package/@hono/trpc-server) -- Hono-tRPC bridge, middleware API
- [Supabase onAuthStateChange deadlock issue #41968](https://github.com/supabase/supabase/issues/41968) -- async callback behavior
- [@hono/trpc-server type error issue #1231](https://github.com/honojs/middleware/issues/1231) -- v11.4.x compatibility
- [Vite + Vercel SPA routing](https://tone-row.com/blog/vite-vercel-client-side-routing-serverless-api) -- SPA + API cohabitation pattern

### Tertiary (LOW confidence)

- Community articles on Supabase + tRPC integration patterns -- useful for code examples but should be validated against official docs

---

_Research completed: 2026-03-07_
_Ready for roadmap: yes_
