# External Integrations

**Analysis Date:** 2026-03-07

## APIs & External Services

**Map Tile Providers:**
- OpenFreeMap - Dark vector map style (no API key required)
  - URL: `https://tiles.openfreemap.org/styles/dark`
  - Used in: `src/components/map/MapView.tsx`
  - Provides: Vector tiles (OpenMapTiles schema), glyphs, place labels
  - Auth: None (free, open-source)

- Esri World Imagery - Satellite raster tiles
  - URL: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`
  - Used in: `src/components/map/MapView.tsx`
  - Provides: Satellite imagery tiles (256px)
  - Auth: None (public endpoint)

## Data Storage

**Databases:**
- None - This is a fully client-side SPA

**Static Data Files:**
- `public/data/countries.json` - Country metadata (budget, best months, safety, recommended days)
- `public/data/pois.json` - Points of interest per country (cities, nature, culture, beach)
- `public/geo/countries.geojson` - Country boundary polygons for map rendering
- Loaded at startup via `fetch()` in `src/lib/data.ts`

**Client-Side Persistence:**
- localStorage via Zustand persist middleware
  - Key: `whereto-store`
  - Stores: wishlist items only (country code, POI ID, days)
  - Implementation: `src/stores/appStore.ts`

**File Storage:**
- Not applicable (no file uploads)

**Caching:**
- Module-level cache for map styles (in-memory, per session) in `src/components/map/MapView.tsx`
- No external caching service

## Authentication & Identity

**Auth Provider:**
- None - Anonymous-only application
- Wishlist is stored locally in the browser

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Datadog, etc.)
- Custom `ErrorBoundary` component at `src/components/ErrorBoundary.tsx`

**Logs:**
- `console.error` for data loading failures in `src/main.tsx`
- No structured logging

## CI/CD & Deployment

**Hosting:**
- Not configured (no Vercel, Netlify, or other deployment config detected)
- Application builds to static files (suitable for any static hosting)

**CI Pipeline:**
- Not configured (no `.github/workflows/` or other CI config detected)
- `devenv.nix` includes `actionlint` and `yamllint`, suggesting GitHub Actions may be planned

## Environment Configuration

**Required env vars:**
- None - The application has no server-side secrets or API keys
- `.envrc` exists for direnv/devenv shell activation only

**Secrets location:**
- Not applicable (no secrets needed)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## External Data Dependencies

**Runtime fetches (on app load):**
1. `/data/countries.json` - Country metadata
2. `/data/pois.json` - Points of interest
3. `/geo/countries.geojson` - GeoJSON boundaries
4. `https://tiles.openfreemap.org/styles/dark` - Map style definition

**Map tile requests (on user interaction):**
- OpenFreeMap vector tiles (via style definition)
- Esri satellite raster tiles (when satellite mode selected)

All external services are free/public and require no authentication.

---

*Integration audit: 2026-03-07*
