---
storyId: "1.3"
slug: filters-scoring
epic: epic-1
status: ready-for-dev
createdAt: "2026-03-01"
createdBy: Bob (bmad-scrum-master)
inputDocuments:
  - _bmad/planning/epics.md
  - _bmad/planning/architecture.md
  - _bmad/planning/ux-spec.md
  - _bmad/implementation/stories/story-1.2-map-neutral-render.md
---

# Story 1.3 — Filtres et scoring — la carte s'allume

## User Story

As a **user who doesn't know where to go**,
I want to set my daily budget, trip duration, and travel month,
so that the world map immediately shows which destinations match my criteria.

---

## Contexte

Story 1.2 a rendu la carte. `useCountriesLayer` colore les pays en mode neutre.
Cette story ajoute les filtres et le scoring : quand un filtre est actif, les couleurs
neutres laissent place aux couleurs de match (vert/ambre/rouge).

**Intégration clé avec story 1.2** :
- `useCountriesLayer` doit accepter `filters` en plus de `mapStyle`
- `getFillColor` remplace la logique neutre par `MATCH_COLORS[calculateMatch(...)]`
  quand au moins un filtre est actif
- `updateTriggers.getFillColor` doit inclure `[budget, days, month]`

**ADR-003** : scoring déterministe 3 critères (voir `architecture.md`)
**ADR-004** : filtres dans l'URL via TanStack Router `validateSearch` (déjà en place dans `src/routes/index.tsx`)

---

## Acceptance Criteria

### AC-1 : Scoring couleur avec filtre budget seul

```
Given the user sets a budget filter (e.g. 50€/day),
When the filter is applied,
Then the map updates in < 300ms (scoring client-side)
And countries with dailyBudgetMid ≤ 50 show in green (#22C55E, RGBA [34,197,94,220])
And countries with dailyBudgetMid > 50 show in dimmed red (#EF4444 @ 40%, RGBA [239,68,68,100])
And countries without data remain in #2A2D3E (RGBA [42,45,62,255]).
```

### AC-2 : Scoring multi-critères (3 filtres actifs)

```
Given all three filters are active (budget + days + month),
When the match score is computed for each country,
Then countries matching all 3 criteria show in green  (great  → [34,197,94,220])
And countries matching exactly 2 criteria show in amber (good → [234,179,8,220])
And countries matching 0 or 1 criteria show in dimmed red (poor → [239,68,68,100]).
```

### AC-3 : URL partageable — restauration des filtres

```
Given filters are set (e.g. /?budget=50&days=10&month=7),
When the URL is copied and opened in a new tab,
Then the exact same filter values are restored in the FilterBar
And the map shows the same color state.
```

### AC-4 : URL mise à jour sans historique accumulé

```
Given the user changes a filter value,
When the URL updates via TanStack Router navigate,
Then the URL reflects the new filter value (partageable)
And navigate uses replace: true — aucune entrée d'historique supplémentaire
And the browser back button renvoie à la page précédente (pas à l'état filtre précédent).
```

### AC-5 : Badge état vide (aucun filtre)

```
Given no filters are set,
When the map is displayed,
Then all countries with data appear in neutral color (story 1.2)
And a badge reads "Définissez votre budget pour découvrir les destinations"
And the badge is visible without obstructing the map (position fixe, bas de carte).
```

### AC-6 : Badge compteur (filtres actifs)

```
Given at least one filter is active,
When the scoring is computed,
Then a badge shows "X destinations correspondent à vos critères"
  where X = count of countries with matchLevel 'great' or 'good'
And the badge updates in real time as any filter changes.
```

### AC-7 : Reset des filtres

```
Given at least one filter is active,
When the user clicks the reset button (✕ dans le FilterBar),
Then all filter values are cleared from the URL
And the map returns to the neutral color state
And the badge reverts to the état vide message.
```

### AC-8 : FilterBar responsive mobile

```
Given the user is on a mobile device (viewport width < 768px),
When the FilterBar is displayed,
Then it shows icons only (no labels) by default
And tapping the FilterBar expands labels.
```

---

## Notes d'Implémentation

### Structure de fichiers à créer

```
src/
├── lib/
│   └── scoring.ts                    ← calculateMatch() + MATCH_COLORS + Filters type
└── components/
    └── filters/
        ├── FilterBar.tsx             ← conteneur top bar
        ├── BudgetFilter.tsx          ← input numérique €/jour
        ├── DurationFilter.tsx        ← input numérique jours
        └── MonthFilter.tsx           ← select mois (Jan–Déc)
```

Fichiers **modifiés** :
- `src/components/map/useCountriesLayer.ts` — accepte `filters: Filters`
- `src/routes/index.tsx` — intègre FilterBar + badge compteur
- `src/components/map/MapView.tsx` — passe les filtres à `useCountriesLayer`

### `src/lib/scoring.ts` — spec exacte (ADR-003)

```typescript
import type { Country } from './data'

export type MatchLevel = 'great' | 'good' | 'poor' | 'no-data'

export type Filters = {
  budget?: number   // €/jour
  days?: number     // durée séjour
  month?: number    // 1–12
}

export const MATCH_COLORS: Record<MatchLevel, [number, number, number, number]> = {
  great:     [34,  197, 94,  220],  // #22C55E
  good:      [234, 179, 8,   220],  // #EAB308
  poor:      [239, 68,  68,  100],  // #EF4444 @ 40%
  'no-data': [42,  45,  62,  255],  // #2A2D3E
}

export function hasActiveFilters(filters: Filters): boolean {
  return filters.budget !== undefined || filters.days !== undefined || filters.month !== undefined
}

export function countMatches(countries: Record<string, Country>, filters: Filters): number {
  if (!hasActiveFilters(filters)) return 0
  return Object.values(countries).filter((c) => {
    const level = calculateMatch(c, filters)
    return level === 'great' || level === 'good'
  }).length
}

export function calculateMatch(country: Country, filters: Filters): MatchLevel {
  if (!country.dailyBudgetMid) return 'no-data'

  const budgetMatch = filters.budget === undefined || country.dailyBudgetMid <= filters.budget
  const seasonMatch = filters.month === undefined || country.bestMonths.includes(filters.month)
  const durationMatch =
    filters.days === undefined ||
    (filters.days >= country.recommendedDaysMin && filters.days <= country.recommendedDaysMax)

  const score = [budgetMatch, seasonMatch, durationMatch].filter(Boolean).length
  if (score === 3) return 'great'
  if (score === 2) return 'good'
  return 'poor'
}
```

### Mise à jour `useCountriesLayer`

Signature étendue :
```typescript
export function useCountriesLayer(mapStyle: MapStyle = 'dark', filters: Filters = {}): {
  layer: GeoJsonLayer | null
  hoverInfo: HoverInfo
}
```

Logique `getFillColor` mise à jour :
```typescript
getFillColor: (feature: Feature) => {
  const iso = feature.properties?.iso_a2 as string | undefined
  const country = iso ? countries[iso] : undefined

  if (hoverInfo?.object === feature) return isSatellite ? COLOR_HOVER_SATELLITE : COLOR_HOVER
  if (!country) return isSatellite ? COLOR_NO_DATA_SATELLITE : COLOR_NO_DATA

  // Si filtres actifs → scoring colors
  if (hasActiveFilters(filters)) {
    const level = calculateMatch(country, filters)
    return isSatellite
      ? MATCH_COLORS_SATELLITE[level]  // versions semi-transparentes pour satellite
      : MATCH_COLORS[level]
  }

  // Aucun filtre → couleur neutre story 1.2
  return isSatellite ? COLOR_DATA_SATELLITE : COLOR_DATA_NEUTRAL
},
updateTriggers: {
  getFillColor: [hoverInfo?.object, mapStyle, filters.budget, filters.days, filters.month],
  ...
}
```

### FilterBar — layout UX (voir ux-spec.md)

Position : top bar fixe, `z-index` au-dessus de la carte.

```tsx
// src/components/filters/FilterBar.tsx
// Layout desktop : logo + 3 filtres inline + badge compteur
// Layout mobile (< 768px) : icônes only par défaut, expand au tap

<div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-3 bg-gray-950/80 px-4 py-2 backdrop-blur-sm">
  <span className="text-sm font-bold text-white">🌍 whereto</span>
  <BudgetFilter value={budget} onChange={...} />
  <DurationFilter value={days} onChange={...} />
  <MonthFilter value={month} onChange={...} />
  {hasActive && <button onClick={onReset}>✕</button>}
</div>
```

### Sous-composants filtres

**BudgetFilter** : input number, placeholder "Budget €/jour", min=10, max=500, step=5
**DurationFilter** : input number, placeholder "Durée (jours)", min=1, max=90
**MonthFilter** : select avec options Jan(1)…Déc(12), placeholder "Mois"

Chaque filtre appelle `navigate({ search: prev => ({ ...prev, [key]: value }), replace: false })`
pour créer une entrée historique (AC-4). Sur reset : `navigate({ search: {} })`.

### Badge compteur — position

Position : bas de carte, gauche. `absolute bottom-4 left-4 z-10`.
Styles : `rounded-full bg-gray-900/90 px-3 py-1.5 text-sm text-white backdrop-blur-sm`

### `src/routes/index.tsx` — MapPage mise à jour

```tsx
function MapPage() {
  const { budget, days, month } = Route.useSearch()
  const filters: Filters = { budget, days, month }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <FilterBar filters={filters} />
      <MapView filters={filters} />
      <MatchBadge filters={filters} />
    </div>
  )
}
```

`MapView` reçoit `filters` et les passe à `useCountriesLayer`.

---

## Definition of Done

- [ ] `src/lib/scoring.ts` — `calculateMatch()` + `MATCH_COLORS` + `hasActiveFilters()` + `countMatches()`
- [ ] Tests scoring : tous les cas de match (great/good/poor/no-data) couverts
- [ ] `useCountriesLayer` accepte `filters`, applique les couleurs de match quand actifs
- [ ] FilterBar avec 3 filtres (budget, durée, mois) + bouton reset
- [ ] URL partageable : filtres restaurés au rechargement (AC-3)
- [ ] Historique navigateur : retour arrière restaure les filtres (AC-4)
- [ ] Badge état vide (AC-5) + badge compteur (AC-6)
- [ ] FilterBar responsive — icônes mobile (AC-8)
- [ ] `bun run build` sans erreur
- [ ] `bun run test` : 18/18 + nouveaux tests scoring passent

---

## Dépendances

- **Bloquée par** : Story 1.2 ✅
- **Bloque** : Story 2.1 (fiche destination utilise le même `useCountriesLayer` + `onClick`)

---

## Points d'attention

- **`replace: true`** dans `navigate` (AC-4) — confirmé par Florian. L'URL reste partageable, mais le retour arrière ne restaure pas les filtres. Cohérent avec l'exemple dans `architecture.md`.
- Les couleurs satellite pour les match levels : versions semi-transparentes à définir (laisser l'imagerie transparaître).
- `countMatches` compte `great` + `good` (pas `poor`) — à valider avec l'UX.
