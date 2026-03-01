---
workflowType: architecture
stepsCompleted: [architecture]
inputDocuments:
  - _bmad/planning/prd.md
  - _bmad/planning/ux-spec.md
  - _bmad/planning/research/technical-mapping-stack-2026-03-01.md
createdAt: "2026-03-01"
projectName: whereto
validatedWith: user (interactive session)
---

# Architecture Decision Document — Whereto

## Overview

Whereto est une SPA React centrée sur une carte mondiale interactive (MapLibre GL JS /
WebGL). Les données de destinations sont des assets statiques JSON chargés une seule fois
et stockés en mémoire — le filtrage et le scoring se font intégralement côté client.
Supabase gère l'authentification optionnelle et la wishlist persistante des utilisateurs
authentifiés. Un backend Hono + tRPC (Vercel Functions) expose les opérations utilisateur
de façon type-safe, avec un double objectif : apprentissage et production long-terme.

**Principe directeur** : Zero réseau post-chargement pour le flow principal (découverte,
filtrage, scoring). Le réseau n'intervient que pour les opérations utilisateur (auth,
wishlist persistante).

---

## Vue d'ensemble du Système

```
┌──────────────────────────────────────────────────────────────────────┐
│  BROWSER                                                             │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  SPA — Vite + React 19 + TanStack Router                     │   │
│  │                                                              │   │
│  │  ┌──────────────────────┐   ┌───────────────────────────┐   │   │
│  │  │  Carte               │   │  Filtres + Scoring         │   │   │
│  │  │  MapLibre GL JS      │   │  Client-side, < 1ms        │   │   │
│  │  │  react-map-gl        │   │  Source: countries.json    │   │   │
│  │  │  Deck.gl             │   │  (en mémoire Zustand)      │   │   │
│  │  └──────────────────────┘   └───────────────────────────┘   │   │
│  │                                                              │   │
│  │  ┌──────────────────────┐   ┌───────────────────────────┐   │   │
│  │  │  State               │   │  URL Query Params          │   │   │
│  │  │  Zustand             │   │  TanStack Router           │   │   │
│  │  │  - données statiques │   │  - filtres (budget/durée/  │   │   │
│  │  │  - wishlist multi-   │   │    mois) source of truth   │   │   │
│  │  │    pays (anon)       │   │  - partageable (FR-008)    │   │   │
│  │  │  - UI state          │   │                             │   │   │
│  │  │  - comparison list   │   │                             │   │   │
│  │  └──────────────────────┘   └───────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                          │ tRPC (auth requis)                        │
└──────────────────────────┼───────────────────────────────────────────┘
                           │
           ┌───────────────▼────────────────┐
           │  Vercel Functions              │
           │  Hono + tRPC Server            │
           │  (wishlist CRUD uniquement)    │
           └───────────────┬────────────────┘
                           │ Supabase SDK (service role)
           ┌───────────────▼────────────────┐
           │  Supabase                      │
           │  Postgres: wishlists, profiles │
           │  Auth: magic link, OAuth       │
           │  RLS: isolation par user       │
           └────────────────────────────────┘

  ┌───────────────────────────────────────────┐
  │  Vercel CDN (assets statiques)            │
  │  public/data/countries.json  (~50KB gz)   │
  │  public/data/pois.json       (~100KB gz)  │
  │  public/geo/countries.geojson (~300KB gz) │
  └───────────────────────────────────────────┘

  ┌───────────────────────────────────────────┐
  │  Tile Providers (fonds de carte)          │
  │  MVP : OpenFreeMap (gratuit, vector)      │
  │  Prod : Stadia Maps (~$20/mois)           │
  └───────────────────────────────────────────┘
```

---

## Architectural Decision Records

### ADR-001 : SPA Pure (pas de SSR)

**Choix** : Vite + React 19 + TanStack Router en mode SPA pur. Pas de SSR.

**Rationale** :
- MapLibre GL JS et Deck.gl sont des libs WebGL client-only. Le SSR ne peut pas hydrater
  une carte — il faudrait `dynamic({ ssr: false })` partout, pour zéro bénéfice.
- Le SEO n'est pas un objectif de v1 (pas de pages de destinations indexables).
- TanStack Start (RC) et Next.js ajoutent de la complexité sans ROI pour ce cas d'usage.

**Alternatives écartées** :
- TanStack Start RC : instable en mars 2026, gotcha tRPC dans le scaffold.
- Next.js : bon outil, mais surcharge pour une SPA carte-first.

**Tradeoffs** : Pas de meta tags dynamiques (SEO), FCP légèrement plus lent que SSR.
Compensé par le pre-loading CDN des assets statiques.

---

### ADR-002 : Données Destinations — Assets Statiques JSON

**Choix** : `countries.json`, `pois.json`, `countries.geojson` sont des fichiers JSON
statiques commités dans le repo, servis depuis le CDN Vercel. Chargés une fois au
démarrage, stockés en mémoire dans Zustand. Filtrage et scoring 100% client-side.

**Rationale** :
- ~150 pays = ~50KB de données. Négligeable en mémoire.
- Filtrage client-side sur 150 objets : < 1ms. NFR-002 (< 300ms) garanti sans effort.
- Dataset Kaggle CC0 statique (MAJ max 1x/an) — aucune raison d'avoir une DB pour ça.
- Zero latence réseau post-chargement pour le flow principal de l'app.

**Alternatives écartées** :
- Supabase Postgres + requête par filtre : latence réseau 100-300ms à chaque interaction,
  incompatible avec NFR-002.
- Hybride (statique pour la carte, Supabase pour les fiches) : deux sources à synchroniser,
  complexité sans bénéfice clair.

**Tradeoffs** : Mise à jour dataset = rebuild + redéploiement. Acceptable max 1x/an.
Bundle initial +~450KB (GeoJSON + JSON) — compensé par gzip CDN.

**Structure `countries.json` :**
```json
{
  "GE": {
    "code": "GE",
    "name": "Géorgie",
    "region": "Caucasus",
    "dailyBudgetLow": 20,
    "dailyBudgetMid": 30,
    "dailyBudgetHigh": 55,
    "bestMonths": [4, 5, 6, 9, 10],
    "recommendedDaysMin": 7,
    "recommendedDaysMax": 14,
    "safetyScore": 4,
    "dataYear": 2022
  }
}
```

**Structure `pois.json` :**
```json
{
  "GE": [
    { "id": "ge-tbilisi", "name": "Tbilissi", "daysMin": 2, "daysMax": 3, "type": "city" },
    { "id": "ge-kazbegi", "name": "Kazbegi", "daysMin": 1, "daysMax": 2, "type": "nature" }
  ]
}
```

---

### ADR-003 : Score de Match — Algorithme Déterministe Client-Side

**Choix** : Calcul côté client, règles déterministes sur 3 critères (budget, saison, durée).

```typescript
// src/lib/scoring.ts
export type MatchLevel = 'great' | 'good' | 'poor' | 'no-data'

export const MATCH_COLORS: Record<MatchLevel, [number, number, number, number]> = {
  great:   [34,  197, 94,  220],  // #22C55E
  good:    [234, 179, 8,   220],  // #EAB308
  poor:    [239, 68,  68,  100],  // #EF4444 @ 40%
  'no-data': [42, 45,  62,  255],  // #2A2D3E
}

export type Filters = {
  budgetMin?: number   // €/jour
  budgetMax?: number
  daysMin?: number
  daysMax?: number
  monthFrom?: number   // 1-12
  monthTo?: number     // 1-12
}

export function calculateMatch(country: Country, filters: Filters): MatchLevel {
  if (!country.dailyBudgetMid) return 'no-data'

  const budgetMatch = (filters.budgetMin === undefined || country.dailyBudgetMid >= filters.budgetMin)
                   && (filters.budgetMax === undefined || country.dailyBudgetMid <= filters.budgetMax)
  const seasonMatch = filters.monthFrom === undefined
    || country.bestMonths.some(m => m >= (filters.monthFrom ?? 1) && m <= (filters.monthTo ?? 12))
  const durationMatch = (filters.daysMin === undefined || country.recommendedDaysMax >= filters.daysMin)
                     && (filters.daysMax === undefined || country.recommendedDaysMin <= filters.daysMax)

  const score = [budgetMatch, seasonMatch, durationMatch].filter(Boolean).length
  if (score === 3) return 'great'
  if (score === 2) return 'good'
  return 'poor'
}
```

**Mode Voyage (multi-pays) :**
Quand l'utilisateur définit un budget total (ex: 2000€) et une durée (14 jours), la fonction
`computeFilters()` dans `routes/index.tsx` calcule le budget journalier effectif :
`budgetMax = Math.round(tripBudget / tripDaysMin)`. Ce budget effectif est ensuite utilisé
dans `calculateMatch` pour filtrer et colorer la carte.

---

### ADR-004 : Filtres — URL Query Params comme Source de Vérité

**Choix** : L'état des filtres vit dans l'URL via TanStack Router `validateSearch`.

**Rationale** : FR-008 exige un URL partageable qui restaure exactement la même vue.
Les query params sont la solution canonique — pas besoin de store global pour les filtres.
Le bouton "retour" navigateur restore les filtres précédents gratuitement.

**Format URL** :
- Mode simple : `/?budgetMin=20&budgetMax=80&daysMin=7&daysMax=14&monthFrom=4&monthTo=9`
- Mode voyage (multi-pays) : `/?tripBudget=2000&tripDaysMin=10&tripDaysMax=14&monthFrom=6&monthTo=8`

```typescript
// src/routes/index.tsx
import { z } from 'zod'

const filterSchema = z.object({
  budgetMin:    z.coerce.number().optional(),
  budgetMax:    z.coerce.number().optional(),
  daysMin:      z.coerce.number().optional(),
  daysMax:      z.coerce.number().optional(),
  tripBudget:   z.coerce.number().optional(),
  tripDaysMin:  z.coerce.number().optional(),
  tripDaysMax:  z.coerce.number().optional(),
  monthFrom:    z.coerce.number().min(1).max(12).optional(),
  monthTo:      z.coerce.number().min(1).max(12).optional(),
})

export const Route = createFileRoute('/')({
  validateSearch: filterSchema,
  component: MapPage,
})

// Mise à jour sans rechargement :
const navigate = useNavigate()
const updateFilter = (key: string, value: number) =>
  navigate({ search: prev => ({ ...prev, [key]: value }), replace: true })
```

---

### ADR-005 : State Management — Trois Couches

**Choix** : Trois niveaux de state, chacun avec sa responsabilité.

| State | Stockage | Outil | Scope |
|-------|----------|-------|-------|
| Filtres carte | URL query params | TanStack Router `useSearch` | Partageable |
| Données statiques (pays, POIs) | Mémoire | Zustand (read-only) | Global, chargé 1x |
| Wishlist session multi-pays (anonyme) | localStorage | Zustand + persist middleware | Survit rechargement |
| Wishlist persistante (auth) | Supabase | TanStack Query + tRPC | Synchronisée au login |
| Comparaison (liste de pays) | Mémoire React | useState local | Éphémère — non persisté |
| UI state (panel ouvert, pays sélectionné) | Mémoire React | useState local | Éphémère |

```typescript
// src/stores/appStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // Données statiques (chargées 1x, jamais mutées)
      countries: {} as CountriesMap,
      pois: {} as PoisMap,
      setStaticData: (data) => set(data),

      // Wishlist session anonyme
      wishlistItems: [] as WishlistItem[],
      addToWishlist: (item) =>
        set((s) => ({ wishlistItems: [...s.wishlistItems, item] })),
      removeFromWishlist: (poiId) =>
        set((s) => ({ wishlistItems: s.wishlistItems.filter(i => i.poiId !== poiId) })),
      clearWishlist: () => set({ wishlistItems: [] }),
    }),
    {
      name: 'whereto-store',
      // Seule la wishlist est persistée en localStorage
      partialize: (s) => ({ wishlistItems: s.wishlistItems }),
    }
  )
)
```

---

### ADR-006 : Backend — Hono + tRPC sur Vercel Functions

**Choix** : Hono + tRPC v11, déployé en Vercel Serverless Functions. Scope v1 :
uniquement les opérations wishlist pour les utilisateurs authentifiés.

**Rationale** : tRPC garantit la type-safety end-to-end (TypeScript client ↔ serveur)
sans génération de code. Objectif double : apprentissage de la stack + architecture
production préparée pour la v2 (itinéraires, recommandations server-side).

**Pourquoi tRPC n'est pas du REST :**
- REST : URLs sémantiques (`GET /wishlist/items`), contrat lisible par tout client HTTP.
- tRPC : appels de fonctions TypeScript (`wishlist.get.useQuery()`), type-safety totale
  mais couplage TypeScript obligatoire. Pas interopérable avec des clients non-TS.
- Pour Whereto (fullstack TypeScript solo) : tRPC est justifié.

**Procédures v1 :**
```typescript
// src/server/routers/wishlist.ts
export const wishlistRouter = router({
  get: protectedProcedure
    .query(({ ctx }) =>
      ctx.supabase.from('wishlist_items').select('*').eq('user_id', ctx.user.id)
    ),

  sync: protectedProcedure
    .input(z.array(wishlistItemSchema))
    .mutation(({ ctx, input }) =>
      // Merge localStorage items → Supabase (upsert, ignore doublons)
      ctx.supabase.from('wishlist_items').upsert(
        input.map(i => ({ ...i, user_id: ctx.user.id })),
        { onConflict: 'wishlist_id,poi_id' }
      )
    ),

  remove: protectedProcedure
    .input(z.object({ poiId: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.supabase.from('wishlist_items')
        .delete()
        .eq('user_id', ctx.user.id)
        .eq('poi_id', input.poiId)
    ),
})
```

**Setup Hono :**
```typescript
// api/index.ts (Vercel Function)
import { Hono } from 'hono'
import { trpcServer } from '@hono/trpc-server'
import { appRouter } from '../src/server/routers'

const app = new Hono()
app.use('/trpc/*', trpcServer({ router: appRouter, createContext }))
export default app
```

---

### ADR-007 : Carte — MapLibre GL JS + react-map-gl + Deck.gl

**Choix** : MapLibre GL JS (renderer WebGL), react-map-gl (wrapper React pour MapLibre),
Deck.gl (overlays données — coloring pays + futurs overlays v2).

**Clarification sur react-map-gl :**
MapLibre GL JS est une lib JavaScript vanilla qui manipule le DOM directement. Il n'a pas
de bindings React natifs. `react-map-gl` (maintenu par vis.gl, même équipe que Deck.gl)
est le wrapper React officiel. Il est nécessaire même quand on utilise Deck.gl :

```tsx
// Pattern standard Deck.gl + MapLibre en React
import DeckGL from '@deck.gl/react'
import Map from 'react-map-gl/maplibre'  // ← pont entre React et MapLibre

function MapView() {
  return (
    <DeckGL layers={[countriesLayer]} controller={true} initialViewState={...}>
      <Map mapStyle={OPENFREE_DARK_STYLE} />
    </DeckGL>
  )
}
```

**Pourquoi Deck.gl plutôt que MapLibre natif seul :**
- Deck.gl prépare la v2 (clusters de POIs, heatmaps, animations de transition).
- En v1, le coloring des 150 pays reste simple mais le pattern `updateTriggers` de Deck.gl
  est plus explicite et maintenable que `setPaintProperty` MapLibre pour React.
- Overhead bundle +~500KB (gzip : ~150KB) — accepté.

**Coloring des pays :**
```tsx
// src/components/map/CountriesLayer.tsx
import { GeoJsonLayer } from '@deck.gl/layers'
import { calculateMatch, MATCH_COLORS } from '@/lib/scoring'

export function useCountriesLayer(filters: Filters) {
  const { countries, geo } = useAppStore()

  return new GeoJsonLayer({
    id: 'countries-fill',
    data: geo,
    getFillColor: (f) => {
      const country = countries[f.properties.iso_a2]
      return MATCH_COLORS[calculateMatch(country, filters)]
    },
    getLineColor: [255, 255, 255, 20],
    lineWidthMinPixels: 0.5,
    pickable: true,
    updateTriggers: {
      getFillColor: [filters.budget, filters.days, filters.month],
    },
  })
}
```

**Tiles :**
- MVP : OpenFreeMap (gratuit, vector tiles, style dark compatible)
- Production : Stadia Maps ($20/mois) dès dépassement du fair use OSM

---

### ADR-008 : Authentification — Supabase Auth, Optionnelle

**Choix** : Supabase Auth (magic link + OAuth Google), sessions cookies httpOnly.
L'app fonctionne complètement sans compte — auth déclenchée uniquement par le désir
de persister la wishlist.

**Flux wishlist anonyme → authentifiée :**
```
1. Utilisateur anon sélectionne des POIs → localStorage (Zustand persist)
2. Clic "Sauvegarder" → auth modal (non bloquante)
3. Login via magic link ou OAuth
4. Callback auth → wishlist.sync(localStorage items) via tRPC
5. localStorage vidé, Zustand updated depuis Supabase
```

**Logout :**
```typescript
async function logout() {
  await supabase.auth.signOut()
  useAppStore.getState().clearWishlist()  // vide mémoire + localStorage
}
```

---

### ADR-009 : Déploiement — Vercel

**Choix** : Vercel pour frontend (SPA statique) + backend (Serverless Functions).

**Configuration :**
```json
// vercel.json
{
  "buildCommand": "vite build",
  "outputDirectory": "dist",
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/index.ts" },
    { "src": "/(.*)",     "dest": "/index.html"   }
  ]
}
```

**Coûts estimés :**
| Poste | MVP | Production (~5K MAU) |
|-------|-----|----------------------|
| Vercel | $0 | $0 (dans free tier) |
| Supabase | $0 (500MB, 50K auth) | $25/mois (Pro) |
| Stadia Maps | $0 (OSM) | $20/mois |
| **Total** | **$0** | **~$45/mois** |

---

### ADR-010 : Error Handling

**Choix** : React Error Boundaries pour les composants critiques + codes tRPC standardisés.

- `<ErrorBoundary>` autour de `<MapView>` et `<DestinationPanel>` — pas de crash global.
- Codes tRPC : `UNAUTHORIZED` → redirect auth modal, `NOT_FOUND` → état vide, `INTERNAL_SERVER_ERROR` → toast générique.
- v1 : console.error uniquement (pas de Sentry). Sentry ajouté à partir de 1K users actifs.

---

## Data Models (Supabase)

```sql
-- Profil utilisateur (auto-créé au signup)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wishlist persistante (1 par user)
CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Items wishlist (POIs par string ID, depuis pois.json)
CREATE TABLE wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id UUID NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  poi_id VARCHAR(100) NOT NULL,       -- ex: "ge-tbilisi"
  country_code VARCHAR(2) NOT NULL,   -- ex: "GE"
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wishlist_id, poi_id)
);

-- RLS : chaque user ne voit que ses données
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists     ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own profile"       ON profiles       FOR ALL USING (auth.uid() = id);
CREATE POLICY "own wishlist"      ON wishlists      FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own wishlist items" ON wishlist_items FOR ALL
  USING (wishlist_id IN (SELECT id FROM wishlists WHERE user_id = auth.uid()));

-- Auto-création profile + wishlist au signup
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles(id) VALUES (NEW.id);
  INSERT INTO wishlists(user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## Structure de Projet

```
whereto/
├── src/
│   ├── routes/
│   │   ├── __root.tsx              # Root layout (providers, ErrorBoundary global)
│   │   └── index.tsx               # Route "/" — MapPage, validateSearch filtres
│   ├── components/
│   │   ├── map/
│   │   │   ├── MapView.tsx         # DeckGL + react-map-gl/Map container
│   │   │   ├── CountriesLayer.ts   # useCountriesLayer() hook → GeoJsonLayer
│   │   │   └── CountryTooltip.tsx  # Tooltip hover (nom + ScoreBadge)
│   │   ├── filters/
│   │   │   ├── FilterBar.tsx       # Top bar container
│   │   │   ├── BudgetFilter.tsx    # Dropdown + slider €/j
│   │   │   ├── DurationFilter.tsx  # Dropdown + slider jours
│   │   │   └── MonthFilter.tsx     # Grid 12 mois
│   │   ├── destination/
│   │   │   ├── DestinationPanel.tsx   # Slide-in panel droit / bottom sheet mobile
│   │   │   ├── DestinationHeader.tsx  # Nom, flag, ScoreBadge
│   │   │   ├── DestinationMeta.tsx    # Budget/saison/durée/sécurité + disclaimer
│   │   │   ├── POIList.tsx            # Checkboxes POIs + durée
│   │   │   ├── WishlistCounter.tsx    # Badge "X lieux · ~Yj"
│   │   │   └── ComparisonDrawer.tsx   # Drawer bas — comparaison côte à côte
│   │   ├── auth/
│   │   │   └── AuthModal.tsx       # Magic link + OAuth, non bloquante
│   │   └── ui/                     # shadcn/ui (Button, Slider, Sheet, Toast...)
│   ├── stores/
│   │   └── appStore.ts             # Zustand (données statiques + wishlist session)
│   ├── lib/
│   │   ├── scoring.ts              # calculateMatch() + MATCH_COLORS
│   │   ├── data.ts                 # loadStaticData() — fetch JSON au démarrage
│   │   └── trpc.ts                 # tRPC client + TanStack Query provider
│   ├── server/
│   │   ├── context.ts              # createContext (Supabase client + user)
│   │   └── routers/
│   │       ├── index.ts            # appRouter (merge)
│   │       └── wishlist.ts         # wishlist.get / wishlist.sync / wishlist.remove
│   └── types/
│       ├── country.ts              # Country, MatchLevel
│       ├── poi.ts                  # POI, WishlistItem
│       └── filters.ts              # Filters (synced avec validateSearch schema)
├── api/
│   └── index.ts                    # Hono app → Vercel Function entry point
├── public/
│   ├── data/
│   │   ├── countries.json          # Dataset budget/saison/sécurité
│   │   └── pois.json               # POIs par pays
│   └── geo/
│       └── countries.geojson       # Natural Earth 110m (vérifier iso_a2 codes)
├── devenv.nix
├── package.json
└── vercel.json
```

---

## Variables d'Environnement

```bash
# Client (VITE_ prefix — exposées dans le bundle, valeurs publiques Supabase)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Serveur uniquement (Vercel env — JAMAIS dans le client)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## ADR-011 : Swappabilité des Providers — Pattern Adapter

**Principe** : Les providers externes (tiles cartographiques, datasets de destinations,
données POIs) doivent pouvoir être remplacés sans modifier les composants applicatifs.
Toute dépendance à un provider spécifique est isolée derrière une interface ou un wrapper.

### Providers concernés et points de changement anticipés

| Provider actuel | Remplacement potentiel | Raison de changer |
|----------------|------------------------|------------------|
| OpenFreeMap (tiles) | Stadia Maps, Mapbox | Volume, qualité styling |
| Kaggle CC0 (coût de vie) | Numbeo API, Expatistan | Fraîcheur des données |
| Wikidata (POIs) | Google Places, Foursquare | Couverture, qualité |
| MapLibre GL JS | Mapbox GL JS | Features premium, 3D |
| Supabase | PostgreSQL self-hosted, PlanetScale | Coût, contrôle |

### Règle d'implémentation : toujours passer par un adapter

**Tiles cartographiques** — isoler la config du style dans un seul fichier :
```typescript
// src/lib/map-provider.ts  ← LE seul endroit qui connaît OpenFreeMap
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark'
// Pour passer à Stadia Maps : changer cette ligne uniquement
// export const MAP_STYLE_URL = 'https://tiles.stadiamaps.com/styles/alidade_dark.json'
```

**Dataset destinations** — interface DataProvider, pas d'import direct :
```typescript
// src/lib/data-provider.ts
export interface DestinationDataProvider {
  loadCountries(): Promise<CountriesMap>
  loadPOIs(): Promise<PoisMap>
  loadGeoJSON(): Promise<GeoJSON.FeatureCollection>
}

// Implémentation v1 : fichiers statiques JSON
export class StaticJsonProvider implements DestinationDataProvider {
  async loadCountries() { return fetch('/data/countries.json').then(r => r.json()) }
  async loadPOIs()      { return fetch('/data/pois.json').then(r => r.json()) }
  async loadGeoJSON()   { return fetch('/geo/countries.geojson').then(r => r.json()) }
}

// Demain, remplacer par une API sans toucher à loadStaticData() ni aux composants :
// export class NumbeoProvider implements DestinationDataProvider { ... }
```

**Auth** — ne jamais appeler `supabase.auth.*` directement dans les composants :
```typescript
// src/lib/auth-provider.ts
export interface AuthProvider {
  signInWithEmail(email: string): Promise<void>
  signInWithOAuth(provider: 'google'): Promise<void>
  signOut(): Promise<void>
  getUser(): Promise<User | null>
}

// Implémentation Supabase :
export class SupabaseAuthProvider implements AuthProvider { ... }
// Migration vers Clerk ou Auth.js : nouvelle classe, zéro changement dans les composants
```

### Ce que cela implique concrètement pour les devs

- **Jamais d'import direct** de `maplibre-gl`, `@supabase/supabase-js`, ou d'URL de
  providers dans les composants React — toujours via les wrappers de `src/lib/`.
- **Les types** (`Country`, `POI`, `WishlistItem`) sont définis dans `src/types/` et
  sont indépendants des providers — ils ne changent pas quand on change de source.
- **Les tests** mockent les interfaces, pas les implémentations concrètes.

---

## Checklist Anti-Conflit Dev

- [x] Toutes les décisions structurantes documentées, aucun "à décider plus tard"
- [x] API tRPC définie (procédures + types input/output)
- [x] Stores Zustand définis (pas de décision state en story)
- [x] Schéma DB complet (pas de migration surprise)
- [x] Structure JSON des assets statiques définie
- [x] Variables d'environnement listées
- [x] Structure de projet définie
- [x] MATCH_COLORS dans `scoring.ts` (cohérence carte garantie)
- [x] Pattern DeckGL + react-map-gl documenté (pas d'ambiguïté sur les libs carte)
