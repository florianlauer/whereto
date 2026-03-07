---
storyId: "2.1"
slug: destination-panel
epic: epic-2
status: ready-for-dev
createdAt: "2026-03-01"
createdBy: Bob (bmad-scrum-master)
inputDocuments:
  - _bmad/planning/epics.md
  - _bmad/planning/architecture.md
  - src/components/map/useCountriesLayer.ts
  - src/components/map/MapView.tsx
  - src/lib/data.ts
  - src/stores/appStore.ts
---

# Story 2.1 — Fiche Destination (panel slide-in)

## User Story

As a **user who clicked on a country on the map**,
I want a detail panel to slide in from the right with key destination information,
so that I can evaluate the destination without leaving the map view.

---

## Context & Architecture

### Données disponibles (zero fetch)

Toutes les données nécessaires sont déjà en mémoire dans Zustand après le chargement initial :

```typescript
// src/stores/appStore.ts
const countries = useAppStore((s) => s.countries); // Record<string, Country>
const pois = useAppStore((s) => s.pois); // Record<string, POI[]>

// src/lib/data.ts — types
type Country = {
  code: string;
  name: string;
  region?: string;
  dailyBudgetLow: number;
  dailyBudgetMid: number;
  dailyBudgetHigh: number;
  bestMonths: number[]; // 1-12
  recommendedDaysMin: number;
  recommendedDaysMax: number;
  safetyScore: number; // 1-5
  dataYear: number;
};
type POI = {
  id: string;
  name: string;
  daysMin: number;
  daysMax: number;
  type: "city" | "nature" | "culture" | "beach" | "other";
};
```

Exemple de données réelles (countries.json) :

```json
"GE": { "name": "Géorgie", "region": "Caucasus",
        "dailyBudgetLow": 20, "dailyBudgetMid": 30, "dailyBudgetHigh": 55,
        "bestMonths": [4, 5, 6, 9, 10], "recommendedDaysMin": 7, "recommendedDaysMax": 14,
        "safetyScore": 4, "dataYear": 2022 }
```

### State ownership (ADR-005)

`selectedCountryCode: string | null` = UI state éphémère → **local useState dans `MapView`**.
Le pays sélectionné ne va pas dans l'URL ni dans Zustand.

### Scoring (déjà implémenté)

```typescript
// src/lib/scoring.ts — déjà disponible
import { calculateMatch, hasActiveFilters } from "@/lib/scoring";
import type { Filters, MatchLevel } from "@/lib/scoring";
// calculateMatch(country, filters) → 'great' | 'good' | 'poor' | 'no-data'
// hasActiveFilters(filters) → boolean
```

### Click sur la carte — pattern existant à étendre

`useCountriesLayer.ts` expose déjà `hoverInfo` via un `onHover` handler dans le GeoJsonLayer.
Même pattern pour le clic : ajouter un `onClick` handler qui appelle un callback.

```typescript
// Pattern actuel (hover) — à dupliquer pour le click :
onHover: (info: PickingInfo<Feature>) => {
  const iso = info.object?.properties?.iso_a2
  if (iso && countries[iso]) setHoverInfo({ ... })
  else setHoverInfo(null)
}
```

---

## Acceptance Criteria

### AC-1 : Clic ouvre le panel

Given the app has loaded and a country with data exists on the map,
When the user clicks on that country,
Then a panel slides in from the right in < 500ms (CSS transition),
And it displays : nom du pays, région, badge match score, budget journalier (low–high),
durée recommandée (min–max jours), meilleurs mois (noms abrégés), safety rating (étoiles 1-5),
liste des POIs (nom + durée estimée), disclaimer budget, lien Google Flights.

### AC-2 : Changement de pays sans fermeture

Given the destination panel is open on country A,
When the user clicks on a different country B with data,
Then the panel content is replaced by country B's data immediately,
And the panel does NOT close and reopen (pas de re-animation).

### AC-3 : Fermeture panel

Given the destination panel is open,
When the user clicks the ✕ button,
Then the panel slides out to the right and is removed from the DOM,
And the map returns to full-width display.

Given the destination panel is open,
When the user presses the Escape key,
Then the panel closes (même comportement que ✕).

### AC-4 : Disclaimer visible

Given any destination panel is open,
When the panel content is rendered,
Then the text "Estimations budgétaires indicatives (données 2022)" is visible
sans avoir à scroller (en bas du panel, sticky ou toujours visible).

### AC-5 : Lien Google Flights

Given the destination panel is open,
When the user clicks "Voir les vols →",
Then a new browser tab opens with Google Flights pre-filled for that country
(URL: `https://www.google.com/flights#search;t={iso_code}`).

### AC-6 : Pays sans data non cliquable

Given a country has no entry in countries.json (countries[iso] === undefined),
When the user clicks on it,
Then no panel opens and no error is thrown.

### AC-7 : Badge match score conditionnel

Given filters are active (hasActiveFilters returns true),
When the panel is displayed,
Then a badge shows the match level (great / good / poor) with the appropriate color.

Given no filters are active,
When the panel is displayed,
Then no match badge is shown.

---

## Tasks

### Task 1 — Étendre `useCountriesLayer` avec onClick

**Fichier** : `src/components/map/useCountriesLayer.ts`

Ajouter un paramètre `onCountryClick?: (code: string) => void` au hook.
Ajouter un handler `onClick` dans le `GeoJsonLayer` :

```typescript
// Signature du hook — ajouter onCountryClick
export function useCountriesLayer(
  mapStyle: MapStyle = 'dark',
  filters: Filters = {},
  onCountryClick?: (code: string) => void,
): { layer: GeoJsonLayer | null; hoverInfo: HoverInfo }

// Dans new GeoJsonLayer({ ... }) — ajouter :
onClick: (info: PickingInfo<Feature>) => {
  const iso = info.object?.properties?.iso_a2 as string | undefined
  if (iso && countries[iso] && onCountryClick) {
    onCountryClick(iso)
  }
},
```

**(AC: #1, #6)**

---

### Task 2 — Gérer `selectedCountryCode` dans `MapView`

**Fichier** : `src/components/map/MapView.tsx`

Ajouter le state local et le wiring :

```typescript
const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);

// Passer le callback au hook :
const { layer, hoverInfo } = useCountriesLayer(
  mapStyle,
  filters,
  setSelectedCountryCode, // ← nouveau
);
```

Rendre `<DestinationPanel>` conditionnellement (voir Task 3).

**(AC: #1, #2, #3)**

---

### Task 3 — Créer `DestinationPanel`

**Fichier** : `src/components/destination/DestinationPanel.tsx` (nouveau répertoire)

Panel slide-in depuis la droite. Contenu :

```
┌─────────────────────────────────────┐
│ [✕]  Géorgie          [match badge] │  ← header fixe
│       Caucasus                      │
├─────────────────────────────────────┤
│ 💰 Budget/jour    20€ – 55€         │
│ 📅 Durée          7 – 14 jours      │
│ 🌤 Meilleure saison  Avr Mai Juin   │  ← mois surlignés
│                      Sep Oct        │
│ 🛡 Sécurité       ★★★★☆            │
├─────────────────────────────────────┤
│ Points d'intérêt                    │
│  🏙 Tbilissi          2 – 3j        │
│  🌿 Kazbegi           1 – 2j        │
│  🏛 Signagi & Kakhétie 1 – 2j       │
│  🌿 Koutaïssi...      1 – 2j        │
├─────────────────────────────────────┤
│ ✈ Voir les vols →  [lien externe]   │
├─────────────────────────────────────┤
│ ⚠ Estimations indicatives (2022)    │  ← disclaimer sticky bottom
└─────────────────────────────────────┘
```

**Props :**

```typescript
type Props = {
  countryCode: string;
  filters: Filters;
  onClose: () => void;
};
```

**Styles clés :**

- Conteneur : `fixed right-0 top-0 bottom-0 w-96 z-20` (desktop)
- Background : `bg-gray-950/95 backdrop-blur-xl border-l border-white/10`
- Slide animation : CSS transition sur `translate-x`, monter via `useState` + `useEffect`
- Scroll interne : `overflow-y-auto` sur la zone de contenu
- Disclaimer : collé en bas, hors du scroll (`flex flex-col` + `mt-auto`)

**Icônes POI par type :**

```typescript
const POI_ICONS: Record<POI["type"], string> = {
  city: "🏙",
  nature: "🌿",
  culture: "🏛",
  beach: "🏖",
  other: "📍",
};
```

**Meilleurs mois :** afficher les 12 mois abrégés en ligne, surligner ceux dans `bestMonths`.

**Safety stars :** `Array.from({ length: 5 }, (_, i) => i < safetyScore ? '★' : '☆').join('')`

**Match badge :**

```typescript
const MATCH_LABELS: Record<MatchLevel, string> = {
  great: "Idéal",
  good: "Compatible",
  poor: "Difficile",
  "no-data": "",
};
const MATCH_CLASSES: Record<MatchLevel, string> = {
  great: "bg-green-500/20 text-green-400",
  good: "bg-yellow-500/20 text-yellow-400",
  poor: "bg-red-500/20 text-red-400",
  "no-data": "",
};
```

**Escape key :**

```typescript
useEffect(() => {
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }
  document.addEventListener("keydown", onKeyDown);
  return () => document.removeEventListener("keydown", onKeyDown);
}, [onClose]);
```

**(AC: #1, #2, #3, #4, #5, #7)**

---

### Task 4 — Intégrer le panel dans `MapView`

**Fichier** : `src/components/map/MapView.tsx`

```tsx
// Importer DestinationPanel
import { DestinationPanel } from "@/components/destination/DestinationPanel";

// Rendre dans le JSX, après la Map :
{
  selectedCountryCode && (
    <DestinationPanel
      countryCode={selectedCountryCode}
      filters={filters}
      onClose={() => setSelectedCountryCode(null)}
    />
  );
}
```

**(AC: #1, #2, #3)**

---

### Task 5 — Gérer le curseur pointer sur les pays cliquables

**Fichier** : `src/components/map/MapView.tsx`

Le curseur doit devenir `pointer` sur les pays avec data (déjà le cas pour `hoverInfo`).
Vérifier que `hoverInfo !== null` suffit (les pays sans data ne déclenchent pas de hoverInfo).

**(AC: #1)**

---

## Project Structure

```
src/
├── components/
│   ├── destination/              ← nouveau répertoire
│   │   └── DestinationPanel.tsx  ← nouveau fichier
│   └── map/
│       ├── useCountriesLayer.ts  ← modifier (Task 1)
│       └── MapView.tsx           ← modifier (Tasks 2, 4)
```

---

## Out of Scope (Story 2.2)

- Checkboxes wishlist sur les POIs
- WishlistCounter
- Bottom sheet mobile (peut être ajouté sans casser ce qui est en place)

---

## Definition of Done

- [ ] Clic sur un pays avec data → panel s'ouvre avec le bon contenu
- [ ] Clic sur un autre pays → contenu mis à jour sans fermeture/réouverture
- [ ] ✕ et Escape ferment le panel
- [ ] Disclaimer visible sans scroll
- [ ] Lien Google Flights ouvre dans un nouvel onglet
- [ ] Pays sans data → aucun panel, aucune erreur
- [ ] Badge match si filtres actifs, absent sinon
- [ ] `bun run build` passe sans erreur TypeScript
