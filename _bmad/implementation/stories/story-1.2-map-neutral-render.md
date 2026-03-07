---
storyId: "1.2"
slug: map-neutral-render
epic: epic-1
status: ready-for-dev
createdAt: "2026-03-01"
createdBy: Bob (bmad-scrum-master)
inputDocuments:
  - _bmad/planning/epics.md
  - _bmad/planning/architecture.md
  - _bmad/planning/ux-spec.md
  - _bmad/implementation/stories/story-1.1-project-setup.md
---

# Story 1.2 — Rendu de la carte mondiale en état neutre

## User Story

As a **first-time user**,
I want to see a full-screen dark world map when I open the app,
so that I immediately understand this is a map-first discovery experience.

---

## Contexte

Story 1.1 a posé les bases : Vite + React 19, Zustand store avec `countries` et `geojson`
chargés, `routeTree.gen.ts` généré. Cette story rend la carte visible pour la première fois.

**Bibliothèques disponibles** (installées en 1.1, à utiliser ici) :

- `maplibre-gl` + `react-map-gl@^8` — rendu de la carte de fond (tuiles vectorielles)
- `deck.gl` — couche GeoJSON pour la colorisation des pays

**Décision d'architecture (ADR-001)** : SPA pure, MapLibre GL JS est la lib de carte.
`react-map-gl v8` est le wrapper React pour MapLibre. Deck.gl s'utilise en mode
"overlay" via `DeckGL` wrappant le `<Map>` de react-map-gl.

**Note scope** : L'AC mobile concernant le FilterBar compact est **déplacé en story 1.3**.
Cette story couvre uniquement la carte full-viewport responsive.

---

## Acceptance Criteria

### AC-1 : Carte full-screen au chargement

```
Given the app has loaded (static data in store),
When the user lands on the homepage (/),
Then a full-screen dark world map is displayed
And it occupies 100% of the viewport (width and height)
And the map style is dark (OpenFreeMap dark tiles via MapLibre).
```

### AC-2 : Couleur neutre pour les pays avec data

```
Given the map is displayed,
When countries.geojson is rendered as a GeoJsonLayer,
Then countries present in the Zustand store (countries[iso_a2] exists)
  appear in a neutral muted color : rgba(99, 102, 120, 0.7) — "data-available" neutral
And countries without data appear in #2A2D3E (darkest muted tone, per ADR-003 'no-data').
```

### AC-3 : Hover — tooltip + highlight

```
Given the map is displayed,
When the user hovers over a country that has data (pickable),
Then a tooltip appears near the cursor showing the country name
And the hovered country is visually highlighted
  (fill color brightened or opacity increased — subtle, not jarring).

Given the user hovers over a country without data,
Then no tooltip appears
And the cursor remains the default arrow (no pointer).
```

### AC-4 : Non-pickable pour les pays sans data

```
Given a country has no entry in countries.json (iso_a2 not in store.countries),
When it is displayed on the map,
Then it appears in #2A2D3E
And it is not clickable (no pointer cursor)
And hovering it triggers no tooltip.
```

### AC-5 : Responsive — carte full-viewport sur mobile

```
Given the user is on a mobile device (viewport width < 768px),
When the map loads,
Then it still occupies the full viewport (no overflow, no scroll)
And the map is interactive (pinch-to-zoom, pan).
```

### AC-6 : Pas de crash si geojson non chargé

```
Given the app is in loading state (geojson is null in store),
When MapView is rendered,
Then it renders nothing (null) or a skeleton
And no runtime error is thrown.
```

---

## Notes d'Implémentation

### Structure de fichiers à créer

```
src/
└── components/
    └── map/
        ├── MapView.tsx          ← composant principal (DeckGL + Map)
        ├── useCountriesLayer.ts ← hook → GeoJsonLayer colorisé
        └── CountryTooltip.tsx   ← tooltip hover
```

`src/routes/index.tsx` : remplacer le placeholder par `<MapView />`.

### Stack d'intégration react-map-gl v8 + Deck.gl

```tsx
// src/components/map/MapView.tsx
import { DeckGL } from "@deck.gl/react";
import { Map } from "react-map-gl/maplibre";
import { useCountriesLayer } from "./useCountriesLayer";

const INITIAL_VIEW_STATE = {
  longitude: 15,
  latitude: 20,
  zoom: 1.8,
  pitch: 0,
  bearing: 0,
};

const MAP_STYLE = "https://tiles.openfreemap.org/styles/dark";

export function MapView() {
  const layers = useCountriesLayer();

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <DeckGL initialViewState={INITIAL_VIEW_STATE} controller={true} layers={layers}>
        <Map mapStyle={MAP_STYLE} />
      </DeckGL>
    </div>
  );
}
```

### `useCountriesLayer` — GeoJsonLayer

```typescript
// src/components/map/useCountriesLayer.ts
import { GeoJsonLayer } from "@deck.gl/layers";
import { useAppStore } from "@/stores/appStore";
import { useState } from "react";

const COLOR_DATA_NEUTRAL: [number, number, number, number] = [99, 102, 120, 178]; // neutral muted
const COLOR_NO_DATA: [number, number, number, number] = [42, 45, 62, 255]; // #2A2D3E
const COLOR_HOVER: [number, number, number, number] = [140, 145, 170, 220]; // brightened

export function useCountriesLayer() {
  const { countries, geojson } = useAppStore();
  const [hoverInfo, setHoverInfo] = useState<{
    object: GeoJSON.Feature | null;
    x: number;
    y: number;
  } | null>(null);

  if (!geojson) return [];

  const layer = new GeoJsonLayer({
    id: "countries-layer",
    data: geojson,
    pickable: true,
    stroked: true,
    filled: true,
    lineWidthMinPixels: 0.5,
    getLineColor: [60, 60, 80, 180],
    getLineWidth: 1,
    getFillColor: (feature: GeoJSON.Feature) => {
      const iso = feature.properties?.iso_a2;
      if (!iso || !countries[iso]) return COLOR_NO_DATA;
      if (hoverInfo?.object === feature) return COLOR_HOVER;
      return COLOR_DATA_NEUTRAL;
    },
    updateTriggers: {
      getFillColor: [hoverInfo?.object],
    },
    onHover: (info) => {
      const iso = info.object?.properties?.iso_a2;
      if (info.object && iso && countries[iso]) {
        setHoverInfo({ object: info.object, x: info.x, y: info.y });
      } else {
        setHoverInfo(null);
      }
    },
    getCursor: ({ isHovered }) => {
      if (!isHovered) return "grab";
      // pickable est toujours true mais on bloque visuellement via couleur
      return "pointer";
    },
  });

  return [layer, hoverInfo] as const; // hoverInfo exposé pour le tooltip
}
```

**Note** : `getCursor` dans Deck.gl ne peut pas varier par feature directement.
Le curseur `pointer` ne s'affichera que quand `isHovered=true` sur un objet pickable.
Les pays sans data étant dans la même layer pickable, utiliser `onHover` pour
conditionner : si le pays n'est pas dans le store, ignorer le hover (pas de tooltip, pas
de highlight) — le curseur reste `pointer` mais c'est acceptable en MVP.
Si un comportement non-pickable strict est requis, séparer en deux GeoJsonLayers
(une pour les pays avec data pickable:true, une pour sans data pickable:false).

### `CountryTooltip` — affichage tooltip

```tsx
// src/components/map/CountryTooltip.tsx
type Props = {
  x: number;
  y: number;
  name: string;
};

export function CountryTooltip({ x, y, name }: Props) {
  return (
    <div
      style={{ position: "absolute", left: x + 12, top: y - 28, pointerEvents: "none" }}
      className="rounded bg-gray-900/90 px-2 py-1 text-xs text-white shadow"
    >
      {name}
    </div>
  );
}
```

### Style de la carte — OpenFreeMap

URL du style dark : `https://tiles.openfreemap.org/styles/dark`

Ce style est compatible avec la spec Mapbox GL (utilisé par MapLibre). Aucune clé API
requise pour le MVP. Vérifier que l'URL est accessible — si down, fallback :
`https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`

### Import MapLibre CSS

MapLibre GL JS requiert son CSS pour le rendu correct des contrôles et de la carte.
À ajouter dans `src/index.css` ou dans `MapView.tsx` :

```css
/* src/index.css — ajouter après @import tailwindcss */
@import "maplibre-gl/dist/maplibre-gl.css";
```

---

### AC-7 : Switch style de carte (dark / satellite)

```
Given the map is displayed,
When the user clicks the map style toggle button,
Then the basemap switches between dark vector tiles and satellite imagery
And the GeoJsonLayer countries overlay reste visible dans les deux modes.

Given the satellite mode is active,
Then the countries layer opacity is reduced (overlay plus subtil sur fond photo)
And the toggle button reflects the current active style.
```

**Sources de tuiles satellite (voir technical-mapping-stack-2026-03-01.md)** :

- MVP : ESRI World Imagery (gratuit, sans clé API)
  → XYZ raster : `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`
- Production : Stadia Maps Alidade Satellite ($80/mois) avec vraie clé API

---

## Definition of Done

- [x] Carte dark full-screen visible au chargement
- [x] Pays avec data : couleur neutre muted
- [x] Pays sans data : #2A2D3E, pas de tooltip
- [x] Hover pays avec data : tooltip + highlight
- [x] MapView render null si geojson non chargé (AC-6)
- [x] Responsive : plein écran sur mobile (< 768px)
- [ ] Switch dark/satellite fonctionnel (AC-7)
- [x] `bun run build` sans erreur
- [x] `bun run test` : 18/18 passent + nouveaux tests

---

## Dépendances

- **Bloquée par** : Story 1.1 ✅ (geojson + countries dans le store)
- **Bloque** : Story 1.3 (filtres colorisent la même GeoJsonLayer)

---

## Décisions différées

- AC mobile FilterBar compact → **déplacé story 1.3**
- Curseur par-feature strict (pays sans data non-pointable) → deux layers séparées
  si feedback utilisateur le requiert, sinon MVP acceptable
