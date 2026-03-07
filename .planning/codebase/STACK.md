# Technology Stack

**Analysis Date:** 2026-03-07

## Languages

**Primary:**

- TypeScript ^5 - All application code (`src/**/*.ts`, `src/**/*.tsx`)

**Secondary:**

- Nix - Development environment (`devenv.nix`)

## Runtime

**Environment:**

- Bun (specified in `devenv.nix`)
- Browser target: ES2022 (per `tsconfig.app.json`)

**Package Manager:**

- Bun
- Lockfile: `bun.lock` (present)

## Frameworks

**Core:**

- React ^19 - UI rendering (`react`, `react-dom`)
- TanStack Router ^1 - File-based routing (`@tanstack/react-router`)
- Tailwind CSS ^4 - Styling via Vite plugin (`@tailwindcss/vite`)

**Mapping/Visualization:**

- MapLibre GL ^5.19 - Base map rendering (`maplibre-gl`)
- react-map-gl ^8 - React wrapper for MapLibre (`react-map-gl/maplibre`)
- deck.gl ^9.2 - Data visualization overlay layers (`deck.gl`, `@deck.gl/mapbox`, `@deck.gl/core`)

**State Management:**

- Zustand ^5 - Global state with localStorage persistence (`zustand`, `zustand/middleware`)

**Testing:**

- Vitest ^3 - Test runner (`vitest.config.ts`)
- Testing Library React ^16 - Component testing (`@testing-library/react`)
- Testing Library jest-dom ^6 - DOM matchers (`@testing-library/jest-dom`)
- jsdom ^28 - Browser environment for tests

**Build/Dev:**

- Vite ^6 - Dev server and bundler (`vite.config.ts`)
- TypeScript ^5 - Type checking (`tsc -b`)
- TanStack Router Plugin ^1 - Auto-generates route tree (`@tanstack/router-plugin/vite`)

## Key Dependencies

**Critical:**

- `deck.gl` ^9.2 - Core map visualization layer (GeoPolygonLayer for countries)
- `maplibre-gl` ^5.19 - Map rendering engine (open-source, no API key required)
- `react-map-gl` ^8 - React integration for MapLibre
- `zustand` ^5 - Single global store with persist middleware

**UI:**

- `@radix-ui/react-slider` ^1.3 - Accessible slider component for filters
- `class-variance-authority` ^0.7 - Component variant management
- `clsx` ^2.1 + `tailwind-merge` ^3.5 - Conditional/merged Tailwind classes
- `sonner` ^2.0 - Toast notifications

**Validation:**

- `zod` ^3 - Schema validation

**Types:**

- `@types/geojson` ^7946 - GeoJSON type definitions

## Configuration

**TypeScript:**

- `tsconfig.json` - Project references root config
- `tsconfig.app.json` - App code (strict mode, ES2022, `@/*` path alias)
- `tsconfig.node.json` - Node/build config
- Path alias: `@/*` maps to `./src/*`

**Build:**

- `vite.config.ts` - Vite with React, Tailwind CSS, and TanStack Router plugins
- `vitest.config.ts` - jsdom environment, globals enabled, setup file at `src/test-setup.ts`
- Node memory increased for dev: `NODE_OPTIONS=--max-old-space-size=8192`

**Dev Environment:**

- `devenv.nix` - Nix-based dev shell (bun, actionlint, yamllint, docker, colima)
- `.envrc` - direnv integration

## NPM Scripts

```bash
bun run dev        # Start Vite dev server (with 8GB Node heap)
bun run build      # TypeScript check + Vite production build
bun run preview    # Preview production build
bun run type       # TypeScript type-check only (tsc --noEmit)
bun run test       # Run tests once (vitest run)
bun run test:watch # Run tests in watch mode (vitest)
```

## Platform Requirements

**Development:**

- Bun runtime
- Nix + direnv (recommended, via `devenv.nix`)

**Production:**

- Static site (SPA) - Vite builds to static files
- No server-side runtime required
- No deployment platform configured yet (no Vercel/Netlify config detected)

---

_Stack analysis: 2026-03-07_
