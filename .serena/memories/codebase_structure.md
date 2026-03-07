# Codebase Structure

```
src/
├── components/
│   ├── destination/     # Country detail panels, trip summary, comparison drawer, wishlist counter
│   ├── filters/         # FilterBar, Budget/Duration/Month/Voyage filters, RangeSlider, MatchBadge
│   ├── map/             # MapView, useCountriesLayer hook, CountryTooltip, MapStyleToggle
│   └── ErrorBoundary.tsx
├── lib/
│   ├── __tests__/       # Tests for data.ts, scoring.ts
│   ├── data.ts          # Country/POI types, loadStaticData()
│   └── scoring.ts       # calculateMatch(), countMatches(), hasActiveFilters(), color constants
├── routes/
│   ├── __root.tsx       # Root route (Outlet)
│   └── index.tsx        # Main page with Zod search param validation + MapPage component
├── stores/
│   ├── __tests__/       # Tests for appStore
│   └── appStore.ts      # Single Zustand store (data + wishlist with localStorage persist)
├── main.tsx             # App entry point
├── index.css            # Tailwind imports + global resets
├── test-setup.ts        # Vitest setup
└── routeTree.gen.ts     # Auto-generated (DO NOT EDIT)

public/
├── data/
│   ├── countries.json   # Country metadata keyed by ISO alpha-2
│   └── pois.json        # POIs keyed by ISO alpha-2
└── geo/
    └── countries.geojson # Country polygons (~12MB)
```

## Where to Add New Code

- **New component:** `src/components/<domain>/NewComponent.tsx`
- **New filter:** Component in `src/components/filters/`, Zod field + logic in `src/routes/index.tsx`, matching in `src/lib/scoring.ts`
- **New data type:** Type in `src/lib/data.ts`, JSON in `public/data/`, fetch in `loadStaticData()`, add to store
- **New map layer:** Hook in `src/components/map/`, add to DeckGLOverlay in MapView.tsx
- **Pure utility:** `src/lib/<name>.ts` with tests in `src/lib/__tests__/`
