# Codebase Concerns

**Analysis Date:** 2026-03-07

## Tech Debt

**Duplicated MONTHS_SHORT constant:**
- Issue: `MONTHS_SHORT` is defined independently in three files with different formats: single-letter in `src/components/destination/DestinationPanel.tsx` and `src/components/destination/ComparisonDrawer.tsx`, and three-letter French abbreviations in `src/components/filters/FilterBar.tsx`.
- Files: `src/components/destination/DestinationPanel.tsx:8`, `src/components/destination/ComparisonDrawer.tsx:6`, `src/components/filters/FilterBar.tsx:9`
- Impact: Inconsistency risk when updating month display labels. Easy to change one and forget the others.
- Fix approach: Extract into a shared constants file (e.g., `src/lib/constants.ts`) with both short and abbreviated formats.

**Duplicated MATCH_CONFIG object:**
- Issue: `MATCH_CONFIG` mapping match levels to UI colors/labels is defined separately in `DestinationPanel` and `ComparisonDrawer` with slightly different shapes (one includes `border`, the other does not).
- Files: `src/components/destination/DestinationPanel.tsx:11-16`, `src/components/destination/ComparisonDrawer.tsx:8-13`
- Impact: Color/label inconsistencies between panel and comparison drawer if one is updated without the other.
- Fix approach: Extract a single shared `MATCH_CONFIG` into `src/lib/scoring.ts` or a shared UI config file.

**Duplicated slide-panel animation pattern:**
- Issue: `DestinationPanel`, `TripSummaryPanel`, and `ComparisonDrawer` all implement the same slide-in/out animation pattern with `visible` state, `requestAnimationFrame`, and `setTimeout(onClose, 300)`. This is copy-pasted ~3 times.
- Files: `src/components/destination/DestinationPanel.tsx:28-47`, `src/components/destination/TripSummaryPanel.tsx:10-25`, `src/components/destination/ComparisonDrawer.tsx:23-43`
- Impact: Bug-prone when animation timing or pattern needs updating. The `handleClose` function references a stale closure in the Escape key handler (see Known Bugs below).
- Fix approach: Extract a `useSlidePanel(onClose)` custom hook that returns `{ visible, handleClose }`.

**Duplicated Escape key handler:**
- Issue: Both `DestinationPanel` and `TripSummaryPanel` register identical `keydown` event listeners for Escape.
- Files: `src/components/destination/DestinationPanel.tsx:49-55`, `src/components/destination/TripSummaryPanel.tsx:27-33`
- Impact: Same stale closure bug in both places. Redundant code.
- Fix approach: Include in the `useSlidePanel` hook mentioned above.

**Google Flights URL pattern is hardcoded and possibly broken:**
- Issue: The Google Flights URL uses `https://www.google.com/flights#search;t=${countryCode}` which uses a 2-letter ISO code as the airport/destination parameter. This is not a reliable Google Flights URL format.
- Files: `src/components/destination/DestinationPanel.tsx:72`, `src/components/destination/TripSummaryPanel.tsx:105`
- Impact: Links likely do not navigate to a meaningful Google Flights search result.
- Fix approach: Use the correct Google Flights URL format, e.g., `https://www.google.com/travel/flights?q=flights+to+${countryName}` or a more reliable deep-link format.

**Static data loaded in zustand store without immutability protection:**
- Issue: `setStaticData` just merges `{ countries, pois, geojson }` directly into store state. Since this is a large GeoJSON (~12 MB), any accidental mutation would be silent and hard to debug.
- Files: `src/stores/appStore.ts:32`
- Impact: Low risk currently (data is read-only in practice), but no guardrail if future code mutates it.
- Fix approach: Consider `Object.freeze` on static data, or use `immer` middleware for zustand.

**`NODE_OPTIONS=--max-old-space-size=8192` in dev script:**
- Issue: The dev script explicitly sets 8 GB heap size, suggesting there was a memory issue at some point, likely related to the 12 MB GeoJSON file being processed by Vite.
- Files: `package.json:7`
- Impact: Masks a potential memory concern during development. May cause issues on machines with less RAM.
- Fix approach: Investigate if the GeoJSON file can be simplified/compressed, or if Vite config can be optimized.

## Known Bugs

**Stale closure in Escape key handler:**
- Symptoms: The Escape key listener in `DestinationPanel` and `TripSummaryPanel` captures `handleClose` at mount time. Since the `useEffect` has an empty dependency array `[]`, `handleClose` references the initial `onClose` prop, which may be stale if the parent re-renders with a different callback.
- Files: `src/components/destination/DestinationPanel.tsx:49-55`, `src/components/destination/TripSummaryPanel.tsx:27-33`
- Trigger: Parent component passes a new `onClose` callback after initial mount.
- Workaround: Currently works because `onClose` is typically stable, but this is fragile.

**TripSummaryPanel auto-close triggers on mount race:**
- Symptoms: The `useEffect` watching `wishlistItems.length === 0` will call `handleClose()` if the wishlist becomes empty. However, `handleClose` also has a stale closure issue (empty deps array).
- Files: `src/components/destination/TripSummaryPanel.tsx:36-38`
- Trigger: Clearing the last wishlist item while TripSummaryPanel is open.
- Workaround: Works in practice because the panel would close, but animation may be janky.

**Season filter does not handle wrap-around months:**
- Symptoms: If a user selects monthFrom=11 (November) and monthTo=2 (February), the scoring logic requires `m >= 11 && m <= 2`, which is never true. Countries with best months in Dec/Jan/Feb will show as "poor" match.
- Files: `src/lib/scoring.ts:60-65`
- Trigger: Set monthFrom > monthTo in the filter bar.
- Workaround: The MonthFilter UI may prevent this, but the scoring logic itself does not handle it.

## Security Considerations

**No input sanitization on search params:**
- Risk: URL search parameters are parsed via `z.coerce.number()` which coerces strings to numbers. While Zod provides basic validation (min/max on months), other numeric fields like `budgetMin`, `daysMin` have no upper/lower bounds.
- Files: `src/routes/index.tsx:8-21`
- Current mitigation: Zod schema provides type coercion. All data is client-side only.
- Recommendations: Add `.min()` and `.max()` bounds to all numeric search params to prevent absurd values (e.g., negative budgets, 999999-day trips).

**Static data served from public directory without integrity check:**
- Risk: `countries.json`, `pois.json`, and `countries.geojson` are fetched at runtime from `/data/` and `/geo/`. A compromised CDN or MITM (on HTTP) could inject malicious data.
- Files: `src/lib/data.ts:34-49`
- Current mitigation: None. Data is fetched and trusted as-is.
- Recommendations: For a personal project this is acceptable. For production, consider SRI hashes or bundling the JSON data at build time.

**localStorage persistence of wishlist:**
- Risk: Zustand `persist` middleware stores `wishlistItems` in localStorage under key `whereto-store`. No size limit or validation on deserialization.
- Files: `src/stores/appStore.ts:41-44`
- Current mitigation: `partialize` only persists `wishlistItems`.
- Recommendations: Add a version field and migration strategy. Validate shape on rehydration to prevent crashes from corrupted localStorage.

## Performance Bottlenecks

**12 MB GeoJSON loaded on every page visit:**
- Problem: `countries.geojson` is 12.4 MB and is fetched on every app load via `loadStaticData()`.
- Files: `src/lib/data.ts:44-46`, `public/geo/countries.geojson`
- Cause: Full-resolution country polygons served as a single uncompressed GeoJSON file.
- Improvement path: Simplify polygons using `mapshaper` (target ~2-3 MB). Enable gzip/brotli compression on the server (Vercel does this automatically). Consider TopoJSON format which is typically 80% smaller. Alternatively, use vector tiles.

**GeoJsonLayer recreated on every render in useCountriesLayer:**
- Problem: `useCountriesLayer` creates a new `GeoJsonLayer` instance on every call (no memoization). Since it depends on `hoverInfo` state which changes on mouse move, this triggers frequent layer recreation.
- Files: `src/components/map/useCountriesLayer.ts:46-100`
- Cause: `hoverInfo` is used inside `getFillColor` for hover highlighting, causing the entire layer config to be rebuilt on each hover event.
- Improvement path: Use `useMemo` for the layer, or separate hover state from layer creation. deck.gl's `updateTriggers` already handles incremental updates, but the JavaScript object allocation overhead on rapid mouse moves is unnecessary.

**Module-level style cache bypasses React lifecycle:**
- Problem: `cachedStyles` in `MapView.tsx` is a module-level mutable variable. While this works for caching, it creates a hidden global state that persists across hot-reloads in development, potentially causing stale style issues.
- Files: `src/components/map/MapView.tsx:96-97`
- Cause: Design choice to avoid re-fetching the dark map style.
- Improvement path: Use a React ref or a dedicated cache utility. Low priority.

## Fragile Areas

**MapView component (241 lines, high coupling):**
- Files: `src/components/map/MapView.tsx`
- Why fragile: Manages 5 distinct pieces of state (mapStyle, is3D, selectedCountryCode, comparisonList, tripSummaryOpen). Orchestrates DeckGL overlay, map styles, destination panel, comparison drawer, and trip summary. Any change to one panel's behavior requires understanding all the others.
- Safe modification: When adding new panels/overlays, extract the state management into a dedicated hook (e.g., `useMapPanels`). Keep the MapView component as a layout-only shell.
- Test coverage: No direct tests for MapView. Only `useCountriesLayer` has unit tests.

**Filter ↔ URL synchronization:**
- Files: `src/routes/index.tsx:30-51`, `src/components/filters/FilterBar.tsx:52-58`
- Why fragile: Two-way binding between URL search params and filter state. `computeFilters` in `index.tsx` translates `AppSearch` → `Filters`, while `FilterBar` writes back to search params via `navigate`. The voyage mode adds complexity with `tripBudget` / `tripDaysMin` / `tripDaysMax` being converted to `budgetMax` / `daysMin` / `daysMax`.
- Safe modification: Always update both `filterSchema` (Zod) and `computeFilters` together. Add integration tests for the round-trip.
- Test coverage: No tests for `computeFilters` or filter URL serialization.

**Comparison list limited to 3 with silent eviction:**
- Files: `src/components/map/MapView.tsx:158-165`
- Why fragile: When adding a 4th country, the oldest is silently removed with only a toast notification. User might not notice which country was removed. The `comparisonList` state is local to MapView and resets on page refresh.
- Safe modification: Consider persisting comparison list or making the eviction behavior more explicit in the UI.
- Test coverage: No tests.

## Scaling Limits

**Static JSON data model:**
- Current capacity: ~170 countries and their POIs stored in static JSON files.
- Limit: Adding more granular data (cities, regions, attractions with images) would balloon the JSON files beyond reasonable initial load sizes.
- Scaling path: Move to a backend API or database. Use pagination/lazy loading for POI data. Consider a serverless function for filtering.

**Client-side only scoring:**
- Current capacity: Works well with ~170 countries and simple filter criteria.
- Limit: If scoring becomes more complex (flights pricing, real-time availability), client-side computation won't scale.
- Scaling path: Move scoring to a server-side API endpoint.

## Dependencies at Risk

**`react-map-gl` v8 with MapLibre:**
- Risk: `react-map-gl` v8 was designed for Mapbox GL JS. MapLibre support works via the `react-map-gl/maplibre` entry point, but this is a community-maintained compatibility layer. The `as any` cast on `mapStyle` prop (`MapView.tsx:194`) is evidence of type mismatches.
- Impact: TypeScript errors, potential runtime issues on MapLibre updates.
- Migration plan: Monitor `react-map-gl` releases. Consider switching to `@vis.gl/react-maplibre` if it stabilizes.

**deck.gl v9 + MapboxOverlay interop:**
- Risk: Using `@deck.gl/mapbox` `MapboxOverlay` with MapLibre is an unofficial integration path. The `interleaved: true` option relies on internal MapLibre rendering pipeline.
- Impact: Could break on MapLibre major version bumps.
- Migration plan: Keep deck.gl and MapLibre versions pinned. Test thoroughly before upgrading either.

## Missing Critical Features

**No mobile/responsive layout:**
- Problem: The entire UI uses fixed pixel widths (`w-[380px]` for DestinationPanel, `w-[360px]` for TripSummaryPanel). No responsive breakpoints detected anywhere in the codebase.
- Blocks: Unusable on mobile devices. The FilterBar, panels, and map controls overlap on small screens.

**No accessibility beyond minimal aria-labels:**
- Problem: Only 10 total `aria-*` or `role=` attributes across the entire codebase. Interactive elements like POI checkboxes in DestinationPanel use `<li onClick>` instead of proper form elements. No keyboard navigation for filter panels. No focus trapping in slide panels.
- Blocks: Screen reader users cannot use the application. Keyboard-only users have limited navigation.

**No error recovery for partial data load failure:**
- Problem: `loadStaticData()` uses `Promise.all`, so if any one of the three fetches fails, the entire app shows the error boundary. No partial loading or retry mechanism.
- Files: `src/lib/data.ts:35-49`, `src/main.tsx:24-33`
- Blocks: A transient network error on one file blocks the entire app.

**No data validation on loaded JSON:**
- Problem: Fetched JSON files (`countries.json`, `pois.json`) are cast directly to TypeScript types without runtime validation. If the JSON structure is wrong (e.g., missing `dailyBudgetMid` field), the app will crash with unclear errors deep in scoring or rendering logic.
- Files: `src/lib/data.ts:37-38` (casts to `CountriesMap`), `src/lib/data.ts:40-41` (casts to `PoisMap`)
- Blocks: Silent failures when data format changes.

## Test Coverage Gaps

**No tests for any UI components:**
- What's not tested: All React components (DestinationPanel, FilterBar, MapView, TripSummaryPanel, ComparisonDrawer, WishlistCounter, MatchBadge, all filter components).
- Files: `src/components/**/*.tsx` (14 component files, 0 test files for components)
- Risk: UI regressions go unnoticed. The slide-panel animation bugs described above could have been caught with integration tests.
- Priority: High for FilterBar and DestinationPanel (most complex components).

**No tests for computeFilters (route-level logic):**
- What's not tested: The `computeFilters` function that converts URL search params to filter objects, including the voyage mode budget-to-daily conversion logic.
- Files: `src/routes/index.tsx:30-51`
- Risk: Budget calculation bugs in voyage mode (dividing total budget by trip days) could produce wrong daily budgets without detection.
- Priority: High -- this is core business logic.

**No integration/E2E tests:**
- What's not tested: Full user flows (apply filter -> map updates -> click country -> see panel -> add to wishlist -> view trip summary).
- Files: No E2E test directory or framework configured.
- Risk: Cross-component interactions and state management flows are completely untested.
- Priority: Medium -- the app is small enough that manual testing covers most cases, but as features grow this becomes critical.

**Existing test files cover only utils and hooks:**
- What is tested: `src/lib/__tests__/scoring.test.ts`, `src/lib/__tests__/data.test.ts`, `src/stores/__tests__/appStore.test.ts`, `src/components/map/__tests__/useCountriesLayer.test.ts`
- Coverage: Only pure logic and one custom hook. This is roughly 4 test files for 20+ source files.
- Priority: Acceptable for current project size but needs expansion as features are added.

---

*Concerns audit: 2026-03-07*
