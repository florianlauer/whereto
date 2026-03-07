# Roadmap: Whereto Epic 4 (Auth + Persistence)

## Overview

This milestone adds a backend layer to the existing client-only SPA. The journey is strictly linear: first stand up the database and API infrastructure (no UI changes), then add authentication with all three methods, then wire up wishlist CRUD for authenticated users, and finally tackle the hardest piece -- merging anonymous localStorage data into the server and handling all the edge cases around sync, optimistic updates, and logout cleanup. Each phase builds on the previous one and delivers a testable, coherent capability.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3, 4): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Backend Foundation** - Supabase DB schema with RLS, tRPC + Hono API on Vercel Functions, env var security (completed 2026-03-07)
- [x] **Phase 2: Authentication** - Email/password, magic link, Google OAuth with non-blocking UX and session persistence (completed 2026-03-07)
- [ ] **Phase 3: Wishlist Persistence** - Authenticated wishlist CRUD via tRPC with unified useWishlist() hook
- [ ] **Phase 4: Wishlist Sync** - localStorage-to-server merge on login, optimistic updates, logout cleanup

## Phase Details

### Phase 1: Backend Foundation

**Goal**: The backend infrastructure exists and is reachable -- database tables with RLS, tRPC API deployed on Vercel, security enforced
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04
**Success Criteria** (what must be TRUE):

1. Tables `profiles`, `wishlists`, `wishlist_items` exist in Supabase with RLS policies active and enforced
2. A tRPC call to `/api/trpc/*` on Vercel returns a valid response (not SPA HTML)
3. Creating a user via Supabase Auth automatically creates a `profiles` row and a default `wishlists` row (trigger works through RLS)
4. The `SUPABASE_SERVICE_ROLE_KEY` is not present in the Vite client bundle (`dist/`)
   **Plans**: 2 plans

Plans:

- [x] 01-01-PLAN.md -- Supabase setup, DB schema migration, RLS, triggers, seed data, type generation
- [x] 01-02-PLAN.md -- tRPC + Hono API server, tRPC client in React, env var security

### Phase 2: Authentication

**Goal**: Users can create accounts and log in via any of three methods, stay logged in across sessions, and the auth experience never blocks map usage
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07
**Success Criteria** (what must be TRUE):

1. User can sign up with email/password, receive a magic link, or use Google OAuth -- all three methods work end-to-end on Vercel
2. User stays logged in after closing and reopening the browser (refresh token persists session)
3. Auth modal appears only when user tries to save to wishlist, never gates the map or filters -- "Continue without account" is always visible
4. After Google OAuth redirect, the user lands back on the same map view with filters preserved in the URL
5. User can sign out from the UI and the app returns to anonymous mode
   **Plans**: 2 plans

Plans:

- [ ] 02-01-PLAN.md -- Auth core: client Supabase instance, Zustand auth store, tRPC auth context + protected procedure
- [ ] 02-02-PLAN.md -- Auth UI: modal with 3 sign-in methods, auth-gated action hook, user menu with sign-out

### Phase 3: Wishlist Persistence

**Goal**: Authenticated users have a server-backed wishlist accessible from any device, abstracted behind a single hook that components use regardless of auth state
**Depends on**: Phase 2
**Requirements**: WISH-01, WISH-05, WISH-06
**Success Criteria** (what must be TRUE):

1. Authenticated user adds/removes a POI and it persists in Supabase (visible via Supabase Studio)
2. Components use `useWishlist()` hook and behave identically whether the user is anonymous (localStorage) or authenticated (tRPC) -- no component knows about the data source
3. User logs in on a different browser/device and sees the same wishlist
   **Plans**: TBD

Plans:

- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Wishlist Sync

**Goal**: The transition between anonymous and authenticated modes is seamless -- no data loss, instant UI feedback, clean logout
**Depends on**: Phase 3
**Requirements**: WISH-02, WISH-03, WISH-04, WISH-07
**Success Criteria** (what must be TRUE):

1. User builds a wishlist anonymously, creates an account, and all anonymous POIs appear in their server wishlist (merge with deduplication)
2. localStorage is cleared only after the server confirms sync success -- a network failure during sync does not lose data
3. Adding/removing a POI while authenticated updates the UI instantly (optimistic update), with rollback on server error
4. After logout, both Zustand store and localStorage are empty -- no wishlist data leaks on shared computers
   **Plans**: TBD

Plans:

- [ ] 04-01: TBD
- [ ] 04-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase                   | Plans Complete | Status      | Completed  |
| ----------------------- | -------------- | ----------- | ---------- |
| 1. Backend Foundation   | 2/2            | Complete    | 2026-03-07 |
| 2. Authentication       | 2/2 | Complete   | 2026-03-07 |
| 3. Wishlist Persistence | 0/?            | Not started | -          |
| 4. Wishlist Sync        | 0/?            | Not started | -          |
