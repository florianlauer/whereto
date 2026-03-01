---
workflowType: research
researchType: technical
topic: mapping-stack
createdAt: "2026-03-01"
---

# Research Technique — Stack Cartographique

## Comparatif Librairies de Cartographie

| Librairie | Coût | Technologie | Performance | Recommandation |
|-----------|------|------------|-------------|----------------|
| **MapLibre GL JS** | **Gratuit (open source BSD-2)** | WebGL | 60 FPS, millions de features | ⭐ MVP + production |
| **Mapbox GL JS** | 50K map loads/mois gratuits, $5/1K ensuite | WebGL | Identique MapLibre | Migration facile si besoin |
| **Leaflet.js** | Gratuit | DOM (pas WebGL) | Excellent < 50K features, dégrade au-delà | Apps simples / très léger |
| **Google Maps JS API** | 10K–100K events/mois (free), puis $2–30/1K | Propriétaire | Bon | Cher à l'échelle, lock-in |
| **Deck.gl** | Gratuit (Uber, open source) | WebGL/WebGPU (v9) | Excellent pour overlays | Complément MapLibre pour visualisations |
| **Apple MapKit JS** | Écosystème Apple | Propriétaire | N/A | Non retenu (web généraliste) |

---

## Providers de Tuiles / Fonds de Carte

| Provider | Free Tier | Pricing Startup | Couverture | Notes |
|----------|-----------|-----------------|-----------|-------|
| **OpenStreetMap (OSM)** | Illimité | Gratuit | Global | Attribution requise; idéal MVP |
| **Stadia Maps** | 200K crédits/mois | $20/mois (1M crédits) | Global | Compatible Mapbox styles, jusqu'à 90% moins cher que Mapbox |
| **MapTiler** | Gratuit (non-commercial) | $24.90/mois | Global | Tuiles custom, satellite |
| **Mapbox** | 50K map loads/mois | $5/1K loads | Global | Premium styling, features avancées |

---

## Wrappers React

| Lib | DL/semaine | GitHub Stars | Usage |
|-----|-----------|-------------|-------|
| **react-map-gl** | 753K | 8 237 | Mapbox GL / MapLibre + React, composants contrôlés, grands datasets |
| **react-leaflet** | 743K | 5 468 | Leaflet + React, API plus simple |

**Recommandation** : `react-map-gl` avec backend `maplibre-gl` (configuration explicite dans le code)

---

## Stack Recommandé — MVP

```
Frontend :          Vite + React 19 + TanStack Router (SPA pur)
Data fetching :     TanStack Query v5 + tRPC v11
Backend :           Hono + tRPC
Auth :              Supabase Auth (cookie httpOnly)
DB :                Supabase (Postgres + RLS)
UI :                shadcn/ui + Tailwind CSS

Librairie carte :   MapLibre GL JS    (gratuit, open source)
Tiles basemap :     OpenFreeMap       (gratuit, vector) → Stadia Maps ($20/mois) en prod commerciale
Tiles satellite :   OpenAerialMap     (gratuit, CC-BY 4.0) → Stadia Alidade Satellite ($80/mois) en prod
Overlays données :  Deck.gl           (gratuit)
Wrapper React :     react-map-gl      (avec maplibre-gl)
```

> **Pourquoi SPA pur (pas SSR) ?** La carte nécessite WebGL côté client de toute façon.
> SSR n'apporte aucun bénéfice SEO sur une app carte-first. TanStack Start en RC ajoute
> de la complexité sans ROI. Auth fonctionne très bien en SPA avec Supabase + cookies.

### Pourquoi ce stack

1. **Zéro coût de licence** jusqu'à très grande échelle
2. **Aucun vendor lock-in** — 100% open source
3. **Production-ready** — utilisé par des entreprises à grande échelle
4. **Compatibilité Mapbox** — styles Mapbox fonctionnent avec MapLibre, migration aisée si besoin
5. **Performance** — 60 FPS desktop/mobile avec WebGL
6. **Overlays complexes** — Deck.gl gère parfaitement les filtres POI, zones budget, etc.

### Coût estimé MVP

| Poste | Coût |
|-------|------|
| MapLibre GL JS | $0 |
| OSM tiles | $0 |
| Stadia Maps (production) | $20/mois |
| Deck.gl | $0 |
| **Total carte** | **$0–20/mois** |

---

## Notes de Performance

- MapLibre GL JS : 60 FPS avec **millions** de features (WebGL)
- Leaflet : plus rapide pour < 50K features, dégrade significativement au-delà
- Deck.gl : overhead négligeable sur les overlays quand optimisé
- WebGPU disponible dans Deck.gl v9 (future-proof)

---

## Quand Changer de Stack

| Trigger | Action |
|---------|--------|
| Besoin de styling premium / 3D | Basculer sur Mapbox GL JS (payant) |
| Dépassement OSM acceptable use | Passer Stadia Maps (tier payant) |
| > 1M utilisateurs actifs | Réévaluer Mapbox vs infrastructure propre de tuiles |

---

## Tuiles Satellite

| Provider | Qualité | Pricing | Couverture | Recommandation |
|----------|---------|---------|-----------|----------------|
| **OpenAerialMap** | Variable (communautaire) | **Gratuit (CC-BY 4.0)** | Global (inégal) | ⭐ MVP gratuit |
| **MapTiler** | Jusqu'à 8cm/pixel (premium) | Free = zoom 0–5 seulement | Global | Prototype basse résolution |
| **ESRI World Imagery** | Professionnelle (NASA/USGS) | Gratuit avec compte ArcGIS (limites) | Global | Auth requise, qualité pro |
| **Mapbox Satellite** | Bonne | 200K tiles/mois gratuits puis pay-per-use | Global | Free tier généreux pour MVP |
| **Stadia Maps Alidade Satellite** | 1.5m global / 30cm zones précises | **$80/mois minimum** | Global | ⭐ Production — meilleur rapport qualité |
| **Jawg Maps** | Très bonne | Free tier (limites floues) | Europe principalement | Limité géographiquement |

**Caractéristiques Stadia Satellite (production)** :
- Résolution : 1.5m global, 50cm Amérique du Nord/Europe, 30cm zones de précision
- Fraîcheur : < 1 an en ville, < 3 ans globalement, < 5% de nuages
- Attribution : "© CNES, Distribution Airbus DS, © Airbus DS, © PlanetObserver"
- URL : `https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}.jpg`

**Stratégie** : OpenAerialMap (MVP gratuit) → Stadia Alidade Satellite ($80/mois) dès qu'on a des utilisateurs actifs.

---

## Compatibilité TanStack Start + tRPC

**Verdict : Compatible ✅ — avec quelques points d'attention**

### TanStack Start + tRPC
- tRPC v11 supporte officiellement TanStack Start via `@trpc/tanstack-react-query`
- **Gotcha connu (déc. 2025 – fév. 2026)** : le scaffold `pnpm create @tanstack/start` génère un projet avec tRPC mal configuré → `TRPCProvider` manquant dans le root layout. À corriger manuellement.
- Alternative légère : `createServerFn` (Server Functions TanStack Start natif) pour les cas simples

### TanStack Start + MapLibre / Deck.gl
- Les libs WebGL sont client-side uniquement → conflit potentiel avec le SSR de TanStack Start
- **Solution propre** : `ssr: false` sur la route de la carte (Selective SSR)
```typescript
export const Route = createFileRoute('/map')({
  component: MapPage,
  ssr: false,  // MapLibre ne charge que côté client
})
```
- Plus élégant que `dynamic(…, { ssr: false })` de Next.js

### Maturité TanStack Start (mars 2026)
- Statut : **Release Candidate (v1 RC)** — feature-complete, API stable, pas encore 1.0
- Utilisé en production par des early adopters
- Bundles 30–35% plus légers que Next.js (pas de RSC overhead)
- Déployable partout (Vite-based, pas de vendor lock-in Vercel)

### Comparaison rapide

| Critère | TanStack Start | Next.js 16 |
|---------|---------------|-----------|
| tRPC | ✅ Supporté (bug scaffold) | ✅ Stable |
| Maps (SSR) | `ssr: false` par route | `dynamic({ ssr: false })` |
| Bundles | 30–35% plus légers | Plus lourds (RSC) |
| Stabilité | RC (bientôt 1.0) | Stable, battle-tested |
| Hébergement | Anywhere (Vite) | Best on Vercel |

**Recommandation** : TanStack Start est un excellent choix pour découvrir la stack, compatible avec tout le stack carto. Prévoir de corriger manuellement la config tRPC.

---

## Sources
- MapLibre GL JS — maplibre.org + GitHub
- Mapbox GL JS Pricing — docs.mapbox.com
- Google Maps JavaScript API Billing — developers.google.com (2025)
- Leaflet vs MapLibre — blog.jawg.io
- Deck.gl Documentation — deck.gl
- Stadia Maps Pricing + Alidade Satellite — stadiamaps.com
- MapTiler Satellite — maptiler.com/satellite
- OpenAerialMap — openaerialmap.org
- TanStack Start RC — tanstack.com/blog
- tRPC v11 TanStack integration — trpc.io/blog
- TanStack Start Selective SSR — tanstack.com/start/docs
- GitHub issue tRPC scaffold #271 — github.com/TanStack/create-tsrouter-app
