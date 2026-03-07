# Codebase Structure

**Analysis Date:** 2026-03-07

## Directory Layout

```
whereto/
├── public/                    # Static assets served as-is
│   ├── data/                  # JSON data files
│   │   ├── countries.json     # Country metadata (budget, seasons, safety)
│   │   └── pois.json          # Points of interest per country
│   ├── geo/                   # GeoJSON for map rendering
│   │   └── countries.geojson  # Country polygons (~12MB)
│   ├── favicon.png
│   ├── logo.png
│   └── logo-square.png
├── src/                       # Application source code
│   ├── components/            # React components by domain
│   │   ├── destination/       # Country detail & trip panels
│   │   ├── filters/           # Filter controls (budget, duration, month)
│   │   ├── map/               # Map rendering (MapLibre + deck.gl)
│   │   └── ErrorBoundary.tsx  # Root-level error boundary
│   ├── lib/                   # Pure logic & data utilities
│   │   ├── __tests__/         # Tests for lib modules
│   │   ├── data.ts            # Data types & static data loader
│   │   └── scoring.ts         # Filter matching & color mapping
│   ├── routes/                # TanStack Router file-based routes
│   │   ├── __root.tsx         # Root route (renders <Outlet />)
│   │   └── index.tsx          # Main page ("/") with filter validation
│   ├── stores/                # Zustand state management
│   │   ├── __tests__/         # Tests for stores
│   │   └── appStore.ts        # Global app store (data + wishlist)
│   ├── index.css              # Tailwind CSS import + global resets
│   ├── main.tsx               # App entry point (React root, data loading)
│   ├── routeTree.gen.ts       # Auto-generated route tree (DO NOT EDIT)
│   ├── test-setup.ts          # Vitest setup file
│   └── vite-env.d.ts          # Vite type declarations
├── index.html                 # HTML shell (mounts /src/main.tsx)
├── package.json               # Dependencies & scripts
├── bun.lock                   # Bun lockfile
├── vite.config.ts             # Vite + React + Tailwind + TanStack Router plugin
├── vitest.config.ts           # Vitest configuration
├── tsconfig.json              # TypeScript base config
├── tsconfig.app.json          # App-specific TS config
├── tsconfig.node.json         # Node/build TS config
├── vercel.json                # Vercel deployment config (SPA rewrite)
├── devenv.nix                 # Nix dev environment (devenv)
├── devenv.yaml                # devenv config
└── devenv.lock                # devenv lockfile
```

## Directory Purposes

**`src/components/map/`:**
- Purpose: Everything related to map rendering and interaction
- Contains: Main map view, deck.gl layer hook, tooltip, style toggle
- Key files:
  - `MapView.tsx`: Main map component orchestrating map styles, deck.gl overlay, panels, and controls
  - `useCountriesLayer.ts`: Custom hook building GeoJsonLayer with filter-based coloring and click/hover handling
  - `CountryTooltip.tsx`: Hover tooltip showing country name
  - `MapStyleToggle.tsx`: Dark/satellite toggle button + `MapStyle` type export

**`src/components/filters/`:**
- Purpose: Filter UI controls rendered in the top bar
- Contains: Filter bar container, individual filter dropdowns, shared slider component
- Key files:
  - `FilterBar.tsx`: Main filter bar with budget/duration/month buttons, voyage mode toggle, URL navigation
  - `BudgetFilter.tsx`: Budget range slider dropdown (10-500 EUR/day)
  - `DurationFilter.tsx`: Duration range slider dropdown (1-90 days)
  - `MonthFilter.tsx`: Month range slider dropdown (Jan-Dec)
  - `VoyageFilter.tsx`: Combined trip budget + duration sliders with computed daily budget
  - `RangeSlider.tsx`: Reusable dual-thumb slider (Radix UI)
  - `MatchBadge.tsx`: Bottom-center badge showing match count

**`src/components/destination/`:**
- Purpose: Country detail display and trip planning panels
- Contains: Slide-in panels and counters for selected countries and wishlists
- Key files:
  - `DestinationPanel.tsx`: Right slide-in panel with country stats, POI checklist, comparison/flights CTAs
  - `TripSummaryPanel.tsx`: Left slide-in panel with wishlist grouped by country, budget estimates
  - `ComparisonDrawer.tsx`: Bottom drawer comparing up to 3 countries side-by-side
  - `WishlistCounter.tsx`: Compact footer counter for selected POIs

**`src/lib/`:**
- Purpose: Pure business logic with no React dependencies (except type imports)
- Contains: Data loading, type definitions, scoring algorithms
- Key files:
  - `data.ts`: `Country` and `POI` types, `loadStaticData()` parallel fetch
  - `scoring.ts`: `calculateMatch()`, `countMatches()`, `hasActiveFilters()`, color constants

**`src/stores/`:**
- Purpose: Global state management
- Contains: Single Zustand store
- Key files:
  - `appStore.ts`: `useAppStore` hook -- holds static data (countries, pois, geojson) and persisted wishlist

**`src/routes/`:**
- Purpose: TanStack Router file-based route definitions
- Contains: Root route and index page route
- Key files:
  - `__root.tsx`: Minimal root route rendering `<Outlet />`
  - `index.tsx`: Main page route with Zod search param validation and `MapPage` component

**`public/data/`:**
- Purpose: Static JSON data served at runtime
- Contains: Country metadata and POI lists
- Key files:
  - `countries.json`: `Record<string, Country>` keyed by ISO alpha-2 code
  - `pois.json`: `Record<string, POI[]>` keyed by ISO alpha-2 code

**`public/geo/`:**
- Purpose: GeoJSON polygons for map rendering
- Contains: Single large GeoJSON file
- Key files:
  - `countries.geojson`: FeatureCollection with `iso_a2` property per feature (~12MB)

## Key File Locations

**Entry Points:**
- `index.html`: HTML shell mounting React
- `src/main.tsx`: React app bootstrap, data loading, router creation
- `src/routes/index.tsx`: Main (and only) page component

**Configuration:**
- `vite.config.ts`: Vite build config with path alias `@` -> `./src`
- `vitest.config.ts`: Test runner config
- `tsconfig.json`: Base TypeScript config
- `tsconfig.app.json`: App TypeScript config (strict, paths alias)
- `vercel.json`: Deployment SPA rewrites
- `devenv.nix`: Nix development environment

**Core Logic:**
- `src/lib/scoring.ts`: Filter matching algorithm
- `src/lib/data.ts`: Data types and loader
- `src/stores/appStore.ts`: Global state

**Testing:**
- `src/test-setup.ts`: Vitest setup
- `src/lib/__tests__/`: Tests for lib modules
- `src/stores/__tests__/`: Tests for stores
- `src/components/map/__tests__/`: Tests for map hooks

## Naming Conventions

**Files:**
- Components: `PascalCase.tsx` (e.g., `FilterBar.tsx`, `MapView.tsx`)
- Hooks: `camelCase.ts` prefixed with `use` (e.g., `useCountriesLayer.ts`)
- Logic modules: `camelCase.ts` (e.g., `data.ts`, `scoring.ts`)
- Stores: `camelCase.ts` (e.g., `appStore.ts`)
- Test files: `<module>.test.ts` inside `__tests__/` directories
- Auto-generated: `routeTree.gen.ts` (DO NOT EDIT)

**Directories:**
- Component groups: `kebab-case` (e.g., `destination/`, `filters/`, `map/`)
- Test directories: `__tests__/` co-located with source
- Route files: TanStack Router convention (`__root.tsx`, `index.tsx`)

## Where to Add New Code

**New Feature (e.g., new panel or view):**
- Primary code: `src/components/<domain>/NewComponent.tsx`
- Tests: `src/components/<domain>/__tests__/NewComponent.test.tsx`
- If it needs a new route: `src/routes/<route-name>.tsx` (auto-registered by TanStack Router plugin)

**New Filter:**
- Filter component: `src/components/filters/NewFilter.tsx`
- Add Zod field to `filterSchema` in `src/routes/index.tsx`
- Add filter logic to `computeFilters()` in `src/routes/index.tsx`
- Add matching logic to `calculateMatch()` in `src/lib/scoring.ts`
- Add button in `src/components/filters/FilterBar.tsx`

**New Data Type:**
- Type definition: `src/lib/data.ts`
- Static JSON: `public/data/<name>.json`
- Add fetch to `loadStaticData()` in `src/lib/data.ts`
- Add to Zustand store in `src/stores/appStore.ts`

**New Map Layer:**
- Hook: `src/components/map/useNewLayer.ts`
- Add to `DeckGLOverlay` layers array in `src/components/map/MapView.tsx`

**Pure Utility Function:**
- Shared helpers: `src/lib/<name>.ts`
- Tests: `src/lib/__tests__/<name>.test.ts`

**New Store Slice:**
- Add to existing store in `src/stores/appStore.ts` (single store pattern)
- If persisted, update `partialize` in the persist middleware config

## Special Directories

**`.tanstack/`:**
- Purpose: TanStack Router temporary/cache files
- Generated: Yes
- Committed: No (should be in .gitignore)

**`dist/`:**
- Purpose: Vite build output
- Generated: Yes (via `npm run build`)
- Committed: No

**`.planning/`:**
- Purpose: Project planning and codebase analysis documents
- Generated: By tooling
- Committed: Yes

**`_bmad/`:**
- Purpose: Legacy planning/implementation documents
- Generated: Manual
- Committed: Yes

---

*Structure analysis: 2026-03-07*
