# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev          # Dev server (Vite)
bun run build        # Type-check + production build
bun run test         # Tests (vitest run)
bun run test:watch   # Tests watch mode
bun run type         # tsc --noEmit
bun run lint         # oxlint
bun run format       # oxfmt --write src
bun run db:types     # Generate TS types from Supabase schema
```

## Architecture

**Frontend SPA** (React 19 + Vite 6) with a **tRPC backend** (Hono on Vercel serverless) and **Supabase** (Postgres + auth + RLS).

- `src/routes/index.tsx` — Main page: filters live in URL search params (Zod-validated), renders MapPage
- `src/components/map/` — MapLibre GL + deck.gl layers for country visualization
- `src/components/filters/` — Filter bar components, scoring logic in `src/lib/scoring.ts`
- `src/components/destination/` — Country detail, comparison, wishlist UI
- `src/stores/appStore.ts` — Single Zustand store (data + wishlist with localStorage persist)
- `src/server/` — tRPC routers (health, profile, wishlist), Supabase server client in `db.ts`
- `api/index.ts` — Hono entry point for Vercel serverless (`/api/trpc/*`)
- `public/data/` — Static JSON (countries, POIs); `public/geo/` — GeoJSON polygons

## Code Style

- No semicolons, single quotes, 2-space indent, trailing commas
- Named exports only, `import type` for type-only imports, no barrel files
- `type` over `interface`, Props as `type Props = { ... }`
- UI text in French, code comments mix FR/EN
