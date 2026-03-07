# Coding Conventions

**Analysis Date:** 2026-03-07

## Naming Patterns

**Files:**
- Components: PascalCase (`FilterBar.tsx`, `MapView.tsx`, `DestinationPanel.tsx`)
- Hooks: camelCase with `use` prefix (`useCountriesLayer.ts`)
- Lib/utilities: camelCase (`data.ts`, `scoring.ts`)
- Stores: camelCase (`appStore.ts`)
- Routes: lowercase (`index.tsx`, `__root.tsx`)
- Test files: same name as source + `.test.ts` suffix (`data.test.ts`, `appStore.test.ts`)
- Generated files: camelCase with `.gen.ts` suffix (`routeTree.gen.ts`)

**Functions:**
- Use camelCase for all functions: `loadStaticData`, `calculateMatch`, `hasActiveFilters`
- React components use PascalCase: `FilterBar`, `MapView`, `CountryTooltip`
- Helper components co-located in same file use PascalCase: `StatRow` in `DestinationPanel.tsx`
- Event handlers use camelCase with action prefix: `handleClose`, `togglePoi`, `toggleComparison`
- Label helpers use camelCase with noun suffix: `budgetLabel()`, `durationLabel()`, `monthLabel()`

**Variables:**
- camelCase for all variables: `mockCountries`, `filtersActive`, `countryPois`
- Constants use UPPER_SNAKE_CASE: `MATCH_COLORS`, `INITIAL_VIEW_STATE`, `DARK_STYLE_URL`, `MONTHS_SHORT`
- Color tuples use UPPER_SNAKE_CASE: `COLOR_DATA_NEUTRAL`, `COLOR_HOVER_SATELLITE`
- Boolean variables use `is`/`has` prefix: `isActive`, `isBest`, `isChecked`, `isVoyageMode`, `isSatellite`

**Types:**
- PascalCase for all types and type aliases: `Country`, `POI`, `Filters`, `MatchLevel`, `AppSearch`
- Suffixed `Map` for Record types: `CountriesMap`, `PoisMap`
- Component props defined as `type Props = { ... }` (not interfaces, not exported unless needed elsewhere)
- Use `type` keyword, not `interface`, throughout the codebase

## Code Style

**Formatting:**
- No Prettier or ESLint config detected -- formatting is manual/editor-based
- 2-space indentation
- Single quotes for strings
- No semicolons (inferred from all source files)
- Trailing commas in multiline structures
- Max line length is flexible (~120 chars common)

**Linting:**
- No ESLint, Biome, or other linter configured
- TypeScript strict mode enforced via `tsconfig.app.json`:
  - `strict: true`
  - `noUnusedLocals: true`
  - `noUnusedParameters: true`
  - `noFallthroughCasesInSwitch: true`
  - `noUncheckedSideEffectImports: true`
- One intentional `@ts-expect-error` usage in test code (`useCountriesLayer.test.ts:62`)
- One `eslint-disable-next-line` comment in `MapView.tsx:193` for `@typescript-eslint/no-explicit-any`

**TypeScript:**
- Target: ES2022
- Module: ESNext with bundler resolution
- Strict mode with all strict sub-options enabled
- `type` imports preferred: `import type { Feature } from 'geojson'`

## Import Organization

**Order:**
1. React imports (`import { useState, useEffect } from 'react'`)
2. Third-party libraries (`@tanstack/react-router`, `zustand`, `zod`, `deck.gl`, `sonner`)
3. Internal absolute imports using `@/` alias (`@/stores/appStore`, `@/lib/scoring`, `@/components/...`)
4. Relative imports for co-located modules (`'./useCountriesLayer'`, `'../data'`)
5. CSS imports last (`'./index.css'`)

**Path Aliases:**
- `@/` maps to `./src/` (configured in `vite.config.ts`, `vitest.config.ts`, and `tsconfig.json`)
- Use `@/` for cross-directory imports; use relative paths only for same-directory or parent-directory within the same feature

**Import style:**
- Named imports preferred: `import { useAppStore } from '@/stores/appStore'`
- Namespace imports for Radix UI: `import * as Slider from '@radix-ui/react-slider'`
- Type-only imports use `import type`: `import type { FeatureCollection } from 'geojson'`

## Error Handling

**Patterns:**
- Fetch errors: check `response.ok`, throw descriptive `Error` with status code
  ```typescript
  if (!r.ok) throw new Error(`Failed to load countries.json: ${r.status}`)
  ```
- Promise chains: `.catch((err: Error) => ...)` with `console.error` and state update
- React error boundary (`ErrorBoundary` class component) wraps the entire app at `src/main.tsx`
- Error boundary logs via `console.error('[ErrorBoundary] Caught error:', error, info)`
- Re-throw pattern: set error in state, then `if (error) throw error` to trigger error boundary
- No try/catch blocks in application code -- errors propagate to boundary
- Early returns for missing data: `if (!country) return null` in components

## Logging

**Framework:** `console` (native browser console)

**Patterns:**
- Prefix logs with bracketed module name: `[App]`, `[ErrorBoundary]`
- Use `console.error` for failures: `console.error('[App] Failed to load static data:', err)`
- No structured logging library
- No debug/info level logging in production code

## Comments

**When to Comment:**
- Section separators in JSX: `{/* Header */}`, `{/* Stats */}`, `{/* POIs */}`, `{/* CTA */}`
- Algorithm explanations in scoring logic: `// Budget: active if budgetMin or budgetMax defined`
- French comments for UI sections: `{/* Contenu scrollable avec fade-out bas */}`
- Inline doc for constants: `// Semi-transparent versions for satellite mode`
- No JSDoc or TSDoc usage

**Language:** Comments mix French and English. UI text is French. Code comments lean English for logic, French for UI descriptions.

## Function Design

**Size:**
- Components: small to medium (30-300 lines). Largest is `DestinationPanel.tsx` (~330 lines) and `FilterBar.tsx` (~293 lines)
- Utility functions: concise, single-purpose (5-20 lines)
- Helper functions co-located within component files (e.g., `StatRow` in `DestinationPanel.tsx`)

**Parameters:**
- Destructured props for components: `({ countryCode, filters, onClose }: Props)`
- Default parameter values inline: `filters: Filters = {}`, `mapStyle: MapStyle = 'dark'`
- Optional props marked with `?` in type: `isInComparison?: boolean`

**Return Values:**
- Components return JSX or `null` for conditional rendering
- Custom hooks return typed objects: `{ layer, hoverInfo }`
- Pure functions return typed values: `MatchLevel`, `boolean`, `number`

## State Management

**Global state:** Zustand store at `src/stores/appStore.ts`
- Single store with `persist` middleware for localStorage
- Partialize: only `wishlistItems` persisted
- Selector pattern: `useAppStore((s) => s.countries)` -- always use individual selectors, not full state

**Local state:** React `useState` for component-scoped UI state (panels, visibility, hover)

**URL state:** TanStack Router search params validated with Zod schema at `src/routes/index.tsx`
- Filter state lives in URL search params, not in Zustand
- Navigation via `useNavigate` with `replace: true` for filter updates

## Component Patterns

**Component structure:**
1. Imports
2. Constants (UPPER_SNAKE_CASE)
3. Type definitions (`type Props = { ... }`)
4. Named export function component
5. Helper components at bottom of file (not exported)

**Styling:**
- Tailwind CSS v4 via `@tailwindcss/vite` plugin
- Classes composed via array `.join(' ')` pattern (not `clsx` in components, though `clsx` is a dependency)
- `class-variance-authority` and `tailwind-merge` are dependencies but not actively used in current components
- Inline `style` attribute for dynamic positioning and backdrop filters

**Event handling:**
- `void` prefix for fire-and-forget navigation: `void navigate({ to: '/', ... })`
- Cleanup in useEffect return: `return () => document.removeEventListener(...)`

## Module Design

**Exports:**
- Named exports only (`export function`, `export type`, `export const`)
- No default exports anywhere in the codebase
- Types exported when needed by other modules: `export type Country`, `export type Filters`
- Constants exported when shared: `export const MATCH_COLORS`

**Barrel Files:**
- No barrel files / index re-exports. Import directly from source files.

---

*Convention analysis: 2026-03-07*
