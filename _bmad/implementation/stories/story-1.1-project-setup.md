---
storyId: "1.1"
slug: project-setup
epic: epic-1
status: ready-for-dev
createdAt: "2026-03-01"
createdBy: Bob (bmad-scrum-master)
inputDocuments:
  - _bmad/planning/prd.md
  - _bmad/planning/architecture.md
  - _bmad/planning/epics.md
  - devenv.nix
---

# Story 1.1 — Setup du projet et chargement des données statiques

## User Story

As a **developer**,
I want the project bootstrapped and all static destination data loaded before the map renders,
so that filtering and scoring work instantly with zero network requests after initial load.

---

## Contexte

Point de départ : repo avec `devenv.nix` (bun, actionlint, yamllint, docker, colima). Aucun
scaffold Vite/React. Cette story créé l'intégralité de la base technique sur laquelle toutes
les stories suivantes s'appuient.

**Package manager** : bun (déjà dans devenv, préféré à pnpm pour ce projet)

**Stack à installer** (voir `architecture.md`) :
- Vite 6 + React 19 + TypeScript
- TanStack Router v1 (file-based routing)
- Zustand 5 + middleware persist
- Tailwind CSS v4 + shadcn/ui
- MapLibre GL JS + react-map-gl + Deck.gl (installés mais pas utilisés dans cette story)
- Zod (validation des filtres URL, story 1.3 — installer maintenant)

---

## Acceptance Criteria

### AC-1 : Scaffold Vite fonctionnel

```
Given a clean repo with only devenv.nix and _bmad/,
When `bun run dev` is executed,
Then the Vite dev server starts on localhost:5173 without errors
And the app renders a minimal React root (page blanche ou placeholder).
```

### AC-2 : Chargement parallèle des données statiques

```
Given the app is opened for the first time,
When the page loads,
Then `countries.json`, `pois.json`, and `countries.geojson` are fetched in parallel
  via `Promise.all` in `src/lib/data.ts → loadStaticData()`
And the resolved data is stored in the Zustand appStore via `setStaticData()`
And the map area is blocked (loading overlay) until all 3 files are resolved.
```

### AC-3 : Données accessibles dans le store

```
Given the static files are fetched and resolved,
When any component calls `useAppStore()`,
Then `store.countries` is a non-empty record keyed by ISO-2 country code
And `store.pois` is a non-empty record keyed by ISO-2 country code
And no re-fetch occurs on subsequent renders.
```

### AC-4 : ErrorBoundary sur fetch failure

```
Given one of the 3 static files fails to fetch (404 ou réseau),
When the error is caught in `loadStaticData()`,
Then an ErrorBoundary renders a message "Impossible de charger les données. Rechargez la page."
And the error is logged via `console.error`
And the screen is not blank (pas de crash React non géré).
```

### AC-5 : Fichiers de données présents et valides

```
Given the repo is cloned fresh,
When `public/data/countries.json` is opened,
Then it contains ≥ 50 country entries
And each entry has at minimum : code, name, dailyBudgetMid, bestMonths[], recommendedDaysMin,
  recommendedDaysMax, safetyScore.

When `public/data/pois.json` is opened,
Then it contains entries for ≥ 20 country codes
And each POI has : id, name, daysMin, daysMax, type.

When `public/geo/countries.geojson` is opened,
Then it is a valid GeoJSON FeatureCollection
And features have `properties.iso_a2` matching codes used in countries.json.
```

### AC-6 : Build de production sans erreurs

```
Given all code and data files are in place,
When `bun run build` is executed,
Then the output compiles without TypeScript errors and without Vite build errors
And `dist/` contains index.html + assets.
```

### AC-7 : vercel.json configuré

```
Given vercel.json exists at the root,
When the file is read,
Then it contains a SPA fallback rule (rewrites: "/*" → "/index.html")
And an `/api/*` route pointing to the Vercel Function entry (pour stories futures).
```

---

## Notes d'Implémentation

### Structure de fichiers à créer

```
whereto/
├── public/
│   ├── data/
│   │   ├── countries.json        ← dataset destinations
│   │   └── pois.json             ← POIs par pays
│   └── geo/
│       └── countries.geojson     ← Natural Earth 110m
├── src/
│   ├── lib/
│   │   └── data.ts               ← loadStaticData() + types
│   ├── stores/
│   │   └── appStore.ts           ← Zustand store
│   ├── components/
│   │   └── ErrorBoundary.tsx     ← ErrorBoundary React class component
│   ├── routes/
│   │   ├── __root.tsx            ← TanStack Router root layout
│   │   └── index.tsx             ← route `/` (placeholder pour story 1.2)
│   ├── main.tsx
│   └── App.tsx                   ← ou supprimer si TanStack Router gère tout
├── vercel.json
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### `src/lib/data.ts` — implémentation attendue

```typescript
export type Country = {
  code: string
  name: string
  region?: string
  dailyBudgetLow: number
  dailyBudgetMid: number
  dailyBudgetHigh: number
  bestMonths: number[]
  recommendedDaysMin: number
  recommendedDaysMax: number
  safetyScore: number
  dataYear: number
}

export type POI = {
  id: string
  name: string
  daysMin: number
  daysMax: number
  type: 'city' | 'nature' | 'culture' | 'beach' | 'other'
}

export type CountriesMap = Record<string, Country>
export type PoisMap = Record<string, POI[]>

export async function loadStaticData(): Promise<{
  countries: CountriesMap
  pois: PoisMap
  geojson: GeoJSON.FeatureCollection
}> {
  const [countries, pois, geojson] = await Promise.all([
    fetch('/data/countries.json').then(r => r.json()),
    fetch('/data/pois.json').then(r => r.json()),
    fetch('/geo/countries.geojson').then(r => r.json()),
  ])
  return { countries, pois, geojson }
}
```

### `src/stores/appStore.ts` — structure attendue

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CountriesMap, PoisMap } from '@/lib/data'

type WishlistItem = {
  poiId: string
  countryCode: string
  daysMin: number
}

type AppStore = {
  // Données statiques (read-only après chargement)
  countries: CountriesMap
  pois: PoisMap
  geojson: GeoJSON.FeatureCollection | null
  setStaticData: (data: { countries: CountriesMap; pois: PoisMap; geojson: GeoJSON.FeatureCollection }) => void

  // Wishlist anonyme (persistée dans localStorage)
  wishlistItems: WishlistItem[]
  addToWishlist: (item: WishlistItem) => void
  removeFromWishlist: (poiId: string) => void
  clearWishlist: () => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      countries: {},
      pois: {},
      geojson: null,
      setStaticData: (data) => set(data),

      wishlistItems: [],
      addToWishlist: (item) =>
        set((s) => ({ wishlistItems: [...s.wishlistItems, item] })),
      removeFromWishlist: (poiId) =>
        set((s) => ({ wishlistItems: s.wishlistItems.filter(i => i.poiId !== poiId) })),
      clearWishlist: () => set({ wishlistItems: [] }),
    }),
    {
      name: 'whereto-store',
      partialize: (state) => ({ wishlistItems: state.wishlistItems }),
    }
  )
)
```

### Données statiques — sources recommandées

**countries.geojson** — Natural Earth 110m countries :
- URL de téléchargement directe : `https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson`
- OU Natural Earth 110m depuis `naturalearthdata.com/downloads/110m-cultural-vectors/`
- Vérifier que les features ont `properties.iso_a2` (code ISO-2 à 2 lettres)
- Si `iso_a2 = "-99"` pour certains territoires → non-cliquables, normal

**countries.json + pois.json** — Dataset à créer manuellement (MVP) :
- Commencer avec ~30 destinations populaires couvrant toutes les régions
- Exemples inclus dans `architecture.md` (Géorgie : GE)
- Priorités géographiques : Europe de l'Est/Balkans, Asie du Sud-Est, Amérique Latine, Afrique du Nord — zones budget voyageur
- Ajouter disclaimer `dataYear: 2022` sur chaque entrée

### vercel.json

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.ts" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### devenv.nix — pas de modification requise

Bun est déjà présent. Node n'est pas nécessaire séparément (bun inclut un runtime compatible).

---

## Definition of Done

- [ ] `bun run dev` démarre sans erreur
- [ ] `bun run build` compile sans erreur TypeScript ni Vite
- [ ] `bun run typecheck` (si script configuré) passe à 0 erreur
- [ ] Les 3 fichiers de données sont présents dans `public/`
- [ ] `loadStaticData()` charge les 3 fichiers en parallèle
- [ ] L'appStore expose `countries`, `pois`, `geojson` après chargement
- [ ] Un ErrorBoundary catch les erreurs de fetch
- [ ] `vercel.json` configuré avec SPA fallback + `/api/*`
- [ ] Aucun `any` TypeScript non justifié (types stricts pour Country, POI, WishlistItem)

---

## Dépendances

- **Bloque** : Story 1.2 (MapView a besoin du geojson dans le store), Story 1.3 (scoring a besoin de countries)
- **Bloquée par** : Aucune (premier ticket)

---

## Estimation

**Complexité** : Medium
**Scope** : Setup complet + données — prévoir une session substantielle

Points d'attention :
- La création manuelle de `countries.json` (30+ pays) est la partie la plus longue
- Valider que `iso_a2` dans le GeoJSON correspond aux codes de `countries.json` avant de commit
