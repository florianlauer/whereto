# Testing Patterns

**Analysis Date:** 2026-03-07

## Test Framework

**Runner:**
- Vitest 3.x
- Config: `vitest.config.ts`
- Environment: jsdom
- Globals: enabled (`describe`, `it`, `expect` available without import, but tests import them explicitly from `vitest`)

**Assertion Library:**
- Vitest built-in `expect` + `@testing-library/jest-dom` matchers (loaded via `src/test-setup.ts`)

**Run Commands:**
```bash
bun run test               # Run all tests (vitest run)
bun run test:watch         # Watch mode (vitest)
```

## Test File Organization

**Location:**
- Co-located `__tests__/` directories next to source files
- Pattern: `src/<module>/__tests__/<source>.test.ts`

**Naming:**
- `<source-filename>.test.ts` (not `.spec.ts`)
- All test files are `.ts` (not `.tsx`) even when testing hooks that use React

**Structure:**
```
src/
  lib/
    data.ts
    scoring.ts
    __tests__/
      data.test.ts
      scoring.test.ts
  stores/
    appStore.ts
    __tests__/
      appStore.test.ts
  components/
    map/
      useCountriesLayer.ts
      __tests__/
        useCountriesLayer.test.ts
```

**Test exclusion from build:** `tsconfig.app.json` excludes `src/**/__tests__/**`, `src/**/*.test.ts`, `src/**/*.test.tsx`, and `src/test-setup.ts`

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('functionName', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('AC-N: describes acceptance criteria behavior', async () => {
    // Arrange
    // Act
    // Assert
  })

  it('describes edge case or specific behavior', () => {
    // ...
  })
})
```

**Patterns:**
- Test names reference acceptance criteria with `AC-N:` prefix where applicable (e.g., `'AC-2/AC-3: fetches 3 files in parallel'`)
- Nested `describe` blocks for grouping related functionality (e.g., `describe('appStore') > describe('wishlist')`)
- `beforeEach` with `vi.restoreAllMocks()` for fetch-mocking tests
- `beforeEach` with `useAppStore.setState(...)` for store tests to reset state

## Mocking

**Framework:** Vitest built-in `vi`

**Patterns:**

**Global fetch mocking:**
```typescript
function mockFetch(responses: Record<string, object | null>) {
  return vi.fn((url: string) => {
    const key = Object.keys(responses).find((k) => url.includes(k))
    const data = key ? responses[key] : null
    if (data === null) {
      return Promise.resolve({ ok: false, status: 404 } as Response)
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
    } as Response)
  })
}

// Usage:
global.fetch = mockFetch({
  'countries.json': mockCountries,
  'pois.json': mockPois,
  'countries.geojson': mockGeojson,
})
```

**Zustand store state injection (no mock needed):**
```typescript
beforeEach(() => {
  useAppStore.setState({
    countries: {},
    pois: {},
    geojson: null,
    wishlistItems: [],
  })
})

// In test:
useAppStore.setState({ countries: mockCountries, geojson: mockGeojson })
```

**What to Mock:**
- `global.fetch` for data loading tests
- Store state via `useAppStore.setState()` for tests that need pre-populated data

**What NOT to Mock:**
- Zustand store logic (test via `getState()` / `setState()` directly)
- Pure functions (test with real inputs/outputs)
- React hooks (use `renderHook` from `@testing-library/react`)

## Fixtures and Factories

**Test Data:**

**Inline mock objects (co-located in test files):**
```typescript
const mockCountries = {
  GE: {
    code: 'GE',
    name: 'Georgie',
    dailyBudgetLow: 20,
    dailyBudgetMid: 30,
    dailyBudgetHigh: 55,
    bestMonths: [4, 5, 6, 9, 10],
    recommendedDaysMin: 7,
    recommendedDaysMax: 14,
    safetyScore: 4,
    dataYear: 2022,
  },
}
```

**Factory function pattern (for tests needing variations):**
```typescript
const makeCountry = (overrides: Partial<Country> = {}): Country => ({
  code: 'GE',
  name: 'Georgie',
  dailyBudgetLow: 20,
  dailyBudgetMid: 30,
  dailyBudgetHigh: 55,
  bestMonths: [4, 5, 6, 9, 10],
  recommendedDaysMin: 7,
  recommendedDaysMax: 14,
  safetyScore: 4,
  dataYear: 2022,
  ...overrides,
})

// Usage:
makeCountry({ dailyBudgetMid: 0 })
makeCountry({ bestMonths: [6, 7, 8] })
```

**Location:**
- All fixtures and factories defined at top of test files
- No shared fixture files or `__fixtures__` directory
- Each test file is self-contained with its own mock data

## Coverage

**Requirements:** None enforced (no coverage thresholds configured)

**View Coverage:**
```bash
npx vitest run --coverage     # No coverage script defined in package.json
```

## Test Types

**Unit Tests:**
- Pure function tests: `scoring.test.ts` (calculateMatch, hasActiveFilters, countMatches)
- Data loading tests: `data.test.ts` (loadStaticData with mocked fetch)
- Store logic tests: `appStore.test.ts` (state mutations via getState/setState)
- Hook tests: `useCountriesLayer.test.ts` (via `renderHook`)

**Integration Tests:**
- Not present. No tests that render full page components or test component interactions.

**E2E Tests:**
- Not present. No Playwright or Cypress configured.

## Common Patterns

**Async Testing:**
```typescript
it('fetches data and returns result', async () => {
  global.fetch = mockFetch({ ... })
  const data = await loadStaticData()
  expect(data.countries).toEqual(mockCountries)
})

it('throws on fetch failure', async () => {
  global.fetch = mockFetch({ 'countries.json': null })
  await expect(loadStaticData()).rejects.toThrow('Failed to load countries.json: 404')
})
```

**Hook Testing:**
```typescript
import { renderHook } from '@testing-library/react'

it('returns null layer when geojson is not loaded', () => {
  const { result } = renderHook(() => useCountriesLayer())
  expect(result.current.layer).toBeNull()
})

it('returns a GeoJsonLayer when geojson is loaded', () => {
  useAppStore.setState({ countries: mockCountries, geojson: mockGeojson })
  const { result } = renderHook(() => useCountriesLayer())
  expect(result.current.layer).not.toBeNull()
  expect(result.current.layer?.id).toBe('countries-layer')
})
```

**Store Testing (direct state manipulation, no rendering):**
```typescript
it('stores data via setStaticData', () => {
  useAppStore.getState().setStaticData(mockStaticData)
  const state = useAppStore.getState()
  expect(state.countries).toEqual(mockStaticData.countries)
})

it('adds item to wishlist', () => {
  useAppStore.getState().addToWishlist({ poiId: 'ge-tbilisi', countryCode: 'GE', daysMin: 2 })
  expect(useAppStore.getState().wishlistItems).toHaveLength(1)
})
```

**Accessing internal props with `@ts-expect-error`:**
```typescript
// When testing deck.gl layer accessor functions:
// @ts-expect-error - accessing internal accessor for test
const color = layer.props.getFillColor(unknownFeature)
expect(color).toEqual([42, 45, 62, 255])
```

## Test Inventory

| Test file | Source file | Test count | Focus |
|-----------|-----------|-----------|-------|
| `src/lib/__tests__/scoring.test.ts` | `src/lib/scoring.ts` | ~30 | calculateMatch, hasActiveFilters, countMatches, MATCH_COLORS |
| `src/lib/__tests__/data.test.ts` | `src/lib/data.ts` | 5 | loadStaticData fetch logic |
| `src/stores/__tests__/appStore.test.ts` | `src/stores/appStore.ts` | 8 | setStaticData, wishlist CRUD |
| `src/components/map/__tests__/useCountriesLayer.test.ts` | `src/components/map/useCountriesLayer.ts` | 5 | Layer creation, fill colors, hover |

## Untested Areas

- All React components (`FilterBar`, `MapView`, `DestinationPanel`, `MatchBadge`, etc.)
- Route definitions and search param validation (`src/routes/index.tsx`)
- `computeFilters` function in `src/routes/index.tsx`
- `ErrorBoundary` component behavior
- Voyage mode filter logic in `FilterBar`
- `ComparisonDrawer`, `TripSummaryPanel` components
- Map style loading (`useMapStyles` in `MapView.tsx`)

---

*Testing analysis: 2026-03-07*
