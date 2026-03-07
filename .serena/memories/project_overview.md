# Project Overview: whereto

**Purpose:** Interactive travel destination explorer — a map-based SPA where users can filter countries by budget, duration, and travel month, view destination details, manage a wishlist, and compare countries.

**Tech Stack:**

- **Language:** TypeScript ^5 (strict mode)
- **Runtime:** Bun (package manager + runtime)
- **Framework:** React ^19 + Vite ^6
- **Routing:** TanStack Router ^1 (file-based)
- **Styling:** Tailwind CSS ^4 (via Vite plugin)
- **State:** Zustand ^5 (single store, localStorage persistence for wishlist)
- **Map:** MapLibre GL ^5.19 + react-map-gl ^8 + deck.gl ^9.2
- **Testing:** Vitest ^3 + Testing Library React ^16 + jsdom
- **Validation:** Zod ^3 (URL search params)
- **UI:** Radix UI (slider), sonner (toasts), CVA + clsx + tailwind-merge

**Dev Environment:** Nix (devenv.nix) + direnv

**Deployment:** Static SPA, Vercel config present (vercel.json with SPA rewrite)

**Data:** Static JSON files in `public/data/` (countries.json, pois.json) and GeoJSON in `public/geo/` (~12MB countries.geojson)
