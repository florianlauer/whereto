# Phase 1: Backend Foundation - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Stand up the backend infrastructure: Supabase DB schema with RLS, tRPC + Hono API deployed as a Vercel Function, env var security, and auto-creation triggers for profiles and wishlists on signup. Also wire the tRPC client into the React app so subsequent phases can use it immediately. No UI changes, no auth UI, no wishlist features.

</domain>

<decisions>
## Implementation Decisions

### Schema design

- One wishlist per user (enforced default, `wishlists` table exists for future extensibility)
- `wishlist_items` stores: poi_id, country_code, position (ordering column), created_at, updated_at
- DB schema is its own normalized source of truth — a mapping layer translates between DB rows and the existing client-side `WishlistItem` type
- `profiles` table is minimal: id (FK to auth.users), created_at, updated_at — no display fields for now
- Trigger auto-creates a `profiles` row and a default `wishlists` row on user signup

### Local dev workflow

- Supabase CLI with local Docker for development (migrations-first workflow)
- Supabase CLI installed via devenv.nix (not npm)
- Basic seed data: 2-3 test users with sample wishlist items in `supabase/seed.sql`
- Existing cloud Supabase project — user will provide project ref and keys for linking

### API & code organization

- One tRPC router per domain (wishlist, profile, health) merged into an appRouter
- Phase 1 includes both server deployment AND tRPC client setup on the frontend (provider, hooks, React Query)
- Claude's Discretion: server code folder structure (api/ at root vs src/server/) and API shape (Hono catch-all vs tRPC-only)

### Type sharing strategy

- Supabase codegen (`supabase gen types typescript`) generates a `Database` type from the live schema
- Generated type file committed to repo (e.g. `src/lib/database.types.ts`), updated via script when schema changes
- Zod validation on all tRPC mutation inputs (Zod already in dependencies)
- Client gets types through tRPC inference — no manual type duplication

### Claude's Discretion

- Server code folder structure (api/ at root vs src/server/)
- API shape: Hono as catch-all for /api/\* with tRPC mounted, or tRPC-only
- RLS policy specifics
- Trigger implementation details
- React Query configuration

</decisions>

<code_context>

## Existing Code Insights

### Reusable Assets

- `appStore.ts` (Zustand): already has `WishlistItem` type and wishlist state with localStorage persist — the mapping layer needs to bridge this shape to the DB schema
- `zod` already in dependencies — ready for tRPC input validation
- `vercel.json` already has `/api/*` rewrite to `/api/index.ts` — Vercel Function entry point is pre-configured

### Established Patterns

- Bun as package manager, Nix (devenv.nix) for dev tools
- oxlint + oxfmt for linting/formatting
- vitest for testing
- Static data in `public/data/` (countries.json, pois.json) — POI details stay client-side, DB only stores references (poi_id)

### Integration Points

- `vercel.json` rewrite already points to `/api/index.ts` — server entry point must be at this path
- tRPC client provider wraps the React app (likely in `src/main.tsx` or a layout route)
- `devenv.nix` needs Supabase CLI added to packages

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for the infrastructure setup.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

_Phase: 01-backend-foundation_
_Context gathered: 2026-03-07_
