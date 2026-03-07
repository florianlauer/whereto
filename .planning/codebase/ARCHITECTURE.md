# Architecture

**Analysis Date:** 2026-03-07

## Pattern Overview

**Overall:** Single-page application (SPA) with client-side rendering, static data fetching, and URL-driven state.

**Key Characteristics:**

- No backend API -- all data is static JSON served from `/public/data/` and `/public/geo/`
- Filter state lives in URL search params (validated with Zod), not in a global store
- Persistent user state (wishlist) managed via Zustand with localStorage persistence
- Map rendering powered by deck.gl (GeoJsonLayer) on top of MapLibre GL via react-map-gl
- Single route (`/`) -- the entire app is one map page with overlay panels

## Layers

**Data Layer:**

- Purpose: Define data types and load static JSON at startup
- Location: `src/lib/data.ts`
- Contains: Type definitions (`Country`, `POI`, `CountriesMap`, `PoisMap`), async `loadStaticData()` fetcher
- Depends on: Static files in `public/data/countries.json`, `public/data/pois.json`, `public/geo/countries.geojson`
- Used by: `src/main.tsx` (on startup), `src/stores/appStore.ts` (type imports)

**Scoring/Logic Layer:**

- Purpose: Calculate match levels between countries and user filters
- Location: `src/lib/scoring.ts`
- Contains: `calculateMatch()`, `countMatches()`, `hasActiveFilters()`, match color constants (`MATCH_COLORS`, `MATCH_COLORS_SATELLITE`)
- Depends on: Types from `src/lib/data.ts`
- Used by: `src/components/map/useCountriesLayer.ts`, `src/components/filters/MatchBadge.tsx`, `src/components/destination/DestinationPanel.tsx`, `src/components/destination/ComparisonDrawer.tsx`

**State Layer:**

- Purpose: Global app state -- static data cache and persisted wishlist
- Location: `src/stores/appStore.ts`
- Contains: Zustand store with `countries`, `pois`, `geojson` (static, set once) and `wishlistItems` (persisted to localStorage under key `whereto-store`)
- Depends on: Types from `src/lib/data.ts`
- Used by: All components that need country data or wishlist state

**Routing Layer:**

- Purpose: File-based routing with URL search param validation
- Location: `src/routes/index.tsx`, `src/routes/__root.tsx`
- Contains: Zod schema for filter search params, `computeFilters()` conversion, page component
- Depends on: TanStack Router, Zod
- Used by: Auto-generated route tree at `src/routeTree.gen.ts`

**Component Layer:**

- Purpose: UI rendering
- Location: `src/components/`
- Contains: Map components, filter controls, destination panels
- Depends on: State layer, scoring layer, routing layer

## Data Flow

**App Initialization:**

1. `src/main.tsx` renders `<App />` inside `<ErrorBoundary>` and `<StrictMode>`
2. `App` calls `loadStaticData()` which fetches 3 static JSON files in parallel
3. On success, data is stored in Zustand via `setStaticData()`
4. Once loaded, `<RouterProvider>` renders the route tree
5. `<Toaster>` (sonner) is mounted at root level for toast notifications

**Filter Application:**

1. User interacts with `FilterBar` which calls `navigate({ search: ... })` to update URL params
2. `Route.useSearch()` in `src/routes/index.tsx` reads validated params from URL
3. `computeFilters(search)` converts URL params into a `Filters` object (handling voyage mode conversion)
4. `Filters` object is passed as prop to `<MapView>` and `<MatchBadge>`
5. `useCountriesLayer` hook computes fill colors per-feature using `calculateMatch(country, filters)`
6. deck.gl `GeoJsonLayer` re-renders with new colors via `updateTriggers`

**Country Selection:**

1. User clicks a country on the map (deck.gl `onClick` handler in `useCountriesLayer`)
2. `onCountryClick` callback sets `selectedCountryCode` state in `MapView`
3. `DestinationPanel` slides in from the right showing country details
4. User can toggle POIs into the wishlist (stored in Zustand/localStorage)
5. User can add country to comparison (up to 3, managed locally in `MapView`)

**Wishlist / Trip Summary:**

1. POI selections stored in `appStore.wishlistItems` (persisted to localStorage)
2. `WishlistCounter` shows count in `DestinationPanel` footer
3. Clicking opens `TripSummaryPanel` (slides from left) with grouped POIs by country, budget estimates

**State Management:**

- **URL search params** (via TanStack Router): All filter state -- budget, duration, month, voyage mode params
- **Zustand store** (persisted to localStorage): Static data cache + wishlist items
- **Local component state** (useState): Selected country, comparison list, panel visibility, map style, 3D toggle, hover info

## Key Abstractions

**Filters:**

- Purpose: Normalized representation of user filter criteria
- Examples: `src/lib/scoring.ts` (type definition), `src/routes/index.tsx` (construction via `computeFilters`)
- Pattern: Computed from URL search params, all fields optional, passed as props down the component tree

**MatchLevel:**

- Purpose: Discrete scoring result for how well a country matches filters
- Examples: `src/lib/scoring.ts` (type + `calculateMatch`), `src/components/destination/DestinationPanel.tsx` (display)
- Pattern: `'great' | 'good' | 'poor' | 'no-data'` -- maps to colors for the map layer and badges in panels

**Static Data Maps:**

- Purpose: Lookup tables for countries and POIs, keyed by ISO country code
- Examples: `CountriesMap = Record<string, Country>`, `PoisMap = Record<string, POI[]>` in `src/lib/data.ts`
- Pattern: Loaded once at startup, stored in Zustand, accessed via `useAppStore` selector

**Map Styles:**

- Purpose: Dark and satellite base map configurations
- Examples: `useMapStyles()` hook in `src/components/map/MapView.tsx`
- Pattern: Module-level cache (`cachedStyles`), fetches OpenFreeMap dark style once, derives satellite style by swapping sources

## Entry Points

**Application Entry:**

- Location: `src/main.tsx`
- Triggers: Browser loads `index.html` which references `/src/main.tsx`
- Responsibilities: Create React root, load static data, mount router and toaster

**Route Entry (single page):**

- Location: `src/routes/index.tsx`
- Triggers: TanStack Router matches `/` path
- Responsibilities: Validate search params, compute filters, render MapPage layout (FilterBar + MapView + MatchBadge)

**Route Tree (auto-generated):**

- Location: `src/routeTree.gen.ts`
- Triggers: Generated by `@tanstack/router-plugin/vite` from files in `src/routes/`
- Responsibilities: Wire route definitions to router

## Error Handling

**Strategy:** ErrorBoundary at root + per-fetch error throwing

**Patterns:**

- `src/components/ErrorBoundary.tsx`: Class-based React error boundary wrapping the entire app. Displays reload button on unhandled errors.
- `src/lib/data.ts`: Each fetch checks `r.ok` and throws descriptive `Error` on failure
- `src/main.tsx`: Data loading errors are caught, stored in state, then re-thrown to trigger ErrorBoundary
- No try/catch in components -- errors propagate to ErrorBoundary

## Cross-Cutting Concerns

**Logging:** `console.error` only -- used in ErrorBoundary (`[ErrorBoundary] Caught error:`) and main (`[App] Failed to load static data:`). No structured logging framework.

**Validation:** Zod schema in `src/routes/index.tsx` validates URL search params. No other input validation (all data is static/read-only).

**Authentication:** None -- fully anonymous app. Wishlist persisted to localStorage only.

**Internationalization:** French-only UI. All labels, months, and messages are hardcoded in French across components.

---

_Architecture analysis: 2026-03-07_
