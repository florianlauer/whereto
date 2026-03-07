---
storyId: "3.1"
slug: comparison
epic: epic-3
status: in-progress
createdAt: "2026-03-01"
createdBy: Bob (bmad-scrum-master)
inputDocuments:
  - _bmad/planning/epics.md
  - _bmad/planning/architecture.md
  - src/stores/appStore.ts
  - src/components/destination/DestinationPanel.tsx
  - src/components/map/MapView.tsx
---

# Story 3.1 — Comparaison côte à côte

## User Story

As a **user who has shortlisted 2–3 destinations**,
I want to compare them side by side with the same metrics,
so that I can make a final decision without switching between panels.

---

## Context & Architecture

### État de comparaison — local dans MapView

```typescript
// src/components/map/MapView.tsx
const [comparisonList, setComparisonList] = useState<string[]>([]);
// Max 3 country codes. Pas persisté (session uniquement).

function addToComparison(code: string) {
  setComparisonList((prev) => {
    if (prev.includes(code)) return prev.filter((c) => c !== code); // toggle off
    if (prev.length >= 3) {
      toast("Destination la plus ancienne retirée");
      return [...prev.slice(1), code];
    }
    return [...prev, code];
  });
}
```

### Layout ComparisonDrawer

```
┌──────────────────────────────────────────────────────────┐
│  Comparaison  [Tout effacer]                       [✕]  │
├──────────────────┬──────────────────┬────────────────────┤
│  Géorgie   [✕]  │  Serbie   [✕]   │  Maroc      [✕]  │
│  ● Idéal        │  ● Compatible    │  ● Idéal          │
│  40€ – 80€/j    │  60€ – 120€/j   │  30€ – 70€/j      │
│  7 – 14j        │  5 – 10j        │  10 – 21j         │
│  ●●●●○          │  ●●●○○          │  ●●●●○            │
└──────────────────┴──────────────────┴────────────────────┘
```

---

## Acceptance Criteria

### AC-1 : Bouton "Comparer" dans DestinationPanel

Given the destination panel is open,
When the user looks at the bottom of the panel,
Then a "Comparer" button is visible.

When the user clicks "Comparer",
Then the destination is added to the comparison list (max 3)
And a ComparisonDrawer slides up from the bottom of the screen.

### AC-2 : Format du ComparisonDrawer

Given 2+ destinations are in the comparison list,
When the ComparisonDrawer is open,
Then each destination is shown in a column with:

- country name + region
- match badge (if filters active)
- budget range (low–high €/j)
- recommended duration (min–max j)
- safety score (dots 1–5)

### AC-3 : Limite de 3 destinations

Given 3 destinations are in the comparison,
When the user adds a 4th via "Comparer",
Then a toast reads "Destination la plus ancienne retirée"
And the oldest is replaced.

### AC-4 : Retirer une destination

Given the ComparisonDrawer is open with 2+ destinations,
When the user clicks ✕ on a column,
Then that destination is removed from the list.

Given only 1 destination remains and the user removes it,
Then the ComparisonDrawer closes automatically.

### AC-5 : Toggle état dans DestinationPanel

Given a destination is in the comparison list,
When its panel is open,
Then the button shows "Dans la comparaison" (état actif visuel)
And clicking it removes the destination from the comparison.

---

## Tasks

### Task 1 — Installer sonner et ajouter le Toaster

**Fichiers** : `package.json`, `src/main.tsx`

```bash
bun add sonner
```

Dans `main.tsx`, importer et placer `<Toaster>` :

```tsx
import { Toaster } from "sonner";
// Dans App() return :
<>
  <RouterProvider router={router} />
  <Toaster position="bottom-center" theme="dark" />
</>;
```

**(AC: #3)**

---

### Task 2 — Créer `ComparisonDrawer`

**Fichier** : `src/components/destination/ComparisonDrawer.tsx` (nouveau)

Props :

```typescript
type Props = {
  codes: string[];
  filters: Filters;
  onRemove: (code: string) => void;
  onClearAll: () => void;
};
```

Slide-up depuis le bas avec transition CSS (même pattern que DestinationPanel).
Grille `grid-cols-{N}` dynamique selon le nombre de destinations.

**(AC: #2, #4)**

---

### Task 3 — Modifier DestinationPanel

**Fichier** : `src/components/destination/DestinationPanel.tsx`

Ajouter props :

```typescript
type Props = {
  // ... existant ...
  isInComparison?: boolean;
  onCompare?: () => void;
};
```

Ajouter bouton "Comparer" / "Dans la comparaison" après la section Google Flights.

**(AC: #1, #5)**

---

### Task 4 — Câbler dans MapView

**Fichier** : `src/components/map/MapView.tsx`

- `comparisonList` state (useState)
- `addToComparison(code)` avec logique max-3 + toast
- Passer `isInComparison` et `onCompare` à `DestinationPanel`
- Rendre `<ComparisonDrawer>` conditionnel

**(AC: #1, #3, #4)**

---

## Project Structure

```
src/components/destination/
├── DestinationPanel.tsx    ← modifier (Tasks 3)
├── WishlistCounter.tsx     ← inchangé
└── ComparisonDrawer.tsx    ← nouveau (Task 2)
```

Aucune modification du store (`appStore.ts`) — état local MapView.

---

## Definition of Done

- [ ] Bouton "Comparer" visible dans DestinationPanel
- [ ] Clic → destination ajoutée + drawer slide-up
- [ ] Max 3 : toast + remplacement de l'ancienne
- [ ] ✕ par colonne retire la destination
- [ ] Drawer se ferme quand liste vide
- [ ] Toggle : re-clic retire la destination, bouton change d'état
- [ ] `bun run build` sans erreur TypeScript
