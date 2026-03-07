---
storyId: "2.2"
slug: wishlist-session
epic: epic-2
status: ready-for-dev
createdAt: "2026-03-01"
createdBy: Bob (bmad-scrum-master)
inputDocuments:
  - _bmad/planning/epics.md
  - _bmad/planning/architecture.md
  - src/stores/appStore.ts
  - src/components/destination/DestinationPanel.tsx
---

# Story 2.2 — Wishlist Session (sélection POIs + temps estimé)

## User Story

As a **user exploring a destination**,
I want to check the POIs I'm interested in and see the total estimated duration update,
so that I can quickly judge if the destination fits my available time.

---

## Context & Architecture

### Store wishlist — déjà entièrement implémenté (ADR-005)

```typescript
// src/stores/appStore.ts — AUCUNE modification requise

export type WishlistItem = {
  poiId: string        // identifiant unique du POI
  countryCode: string  // 'GE', 'FR', etc.
  daysMin: number      // valeur pour la somme du compteur
}

// Actions disponibles :
addToWishlist(item: WishlistItem)   // ajoute si pas déjà présent
removeFromWishlist(poiId: string)   // retire par poiId
clearWishlist()                      // vide tout

// Persistance : wishlistItems → localStorage via Zustand persist
// partialize: (state) => ({ wishlistItems: state.wishlistItems })
```

Données POI disponibles dans le store :

```typescript
const pois = useAppStore((s) => s.pois); // Record<string, POI[]>
// POI = { id, name, daysMin, daysMax, type }
```

### Layout cible dans DestinationPanel

```
┌─────────────────────────────────────┐
│  Header (fixe)                      │
├─────────────────────────────────────┤
│  Stats                              │
│  Saison                             │
│  POIs  ← ajouter checkboxes         │
│    ☐ Tbilissi           2–3j        │
│    ☑ Kazbegi            1–2j  ←sélectionné
│    ☐ Signagi            1–2j        │
│  Lien vols                          │
├─────────────────────────────────────┤  ← sticky, visible seulement si items > 0
│  🧳  2 POIs · ~3j        [Effacer]  │  ← WishlistCounter
├─────────────────────────────────────┤
│  Disclaimer (fixe)                  │
└─────────────────────────────────────┘
```

---

## Acceptance Criteria

### AC-1 : Checkbox par POI

Given the destination panel is open and shows a POI list,
When the user looks at the POI items,
Then each POI has a checkbox on the left of its row.

When the user clicks on a POI row (checkbox ou ligne entière),
Then the POI est ajouté à `wishlistItems` via `addToWishlist`
And la checkbox apparaît cochée visuellement
And le `WishlistCounter` se met à jour immédiatement.

### AC-2 : Format du WishlistCounter

Given one or more POIs are in the wishlist,
When the WishlistCounter is rendered,
Then it shows: "{N} POI{s} · ~{sum}j"
Where N = wishlistItems.length (total, toutes destinations confondues)
And sum = wishlistItems.reduce((acc, i) => acc + i.daysMin, 0).

Given the wishlist is empty,
When the panel is rendered,
Then the WishlistCounter is not visible (no empty state shown).

### AC-3 : Persistance cross-country

Given the user checked POI "ge-kazbegi" in the Géorgie panel,
When they close the panel and open the Serbie panel,
Then "ge-kazbegi" is still in wishlistItems (Zustand store)
And Serbia's POIs appear unchecked.

### AC-4 : Décocher un POI

Given a POI is checked (in wishlistItems),
When the user clicks its row again,
Then `removeFromWishlist(poiId)` is called
And the checkbox appears unchecked
And the WishlistCounter updates immediately.

### AC-5 : Persistance localStorage

Given the user checked POIs and refreshes the page,
When the app reloads,
Then `wishlistItems` is restored from localStorage
And the previously checked POIs appear checked when their panel is opened.
(This is guaranteed by the existing Zustand persist middleware — no extra code needed.)

### AC-6 : Bouton "Effacer" dans le counter

Given the WishlistCounter is visible,
When the user clicks "Effacer",
Then `clearWishlist()` is called
And all POIs appear unchecked
And the WishlistCounter disappears.

---

## Tasks

### Task 1 — Ajouter les checkboxes dans `DestinationPanel`

**Fichier** : `src/components/destination/DestinationPanel.tsx`

Lire `wishlistItems` depuis le store et les actions `addToWishlist` / `removeFromWishlist` :

```typescript
const wishlistItems = useAppStore((s) => s.wishlistItems);
const addToWishlist = useAppStore((s) => s.addToWishlist);
const removeFromWishlist = useAppStore((s) => s.removeFromWishlist);

function togglePoi(poi: POI) {
  const isChecked = wishlistItems.some((i) => i.poiId === poi.id);
  if (isChecked) {
    removeFromWishlist(poi.id);
  } else {
    addToWishlist({ poiId: poi.id, countryCode, daysMin: poi.daysMin });
  }
}
```

Dans la liste POI, modifier chaque `<li>` pour :

- Rendre la ligne cliquable (`onClick={() => togglePoi(poi)}`, `cursor-pointer`)
- Ajouter une checkbox visuelle custom à gauche (carré arrondi, coché = vert)
- État coché = `wishlistItems.some(i => i.poiId === poi.id)`

Style checkbox :

```tsx
// Non coché :
<span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-white/20" />
// Coché :
<span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-green-500 bg-green-500/20">
  <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2.5 2.5L8 3" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
</span>
```

**(AC: #1, #3, #4)**

---

### Task 2 — Créer `WishlistCounter`

**Fichier** : `src/components/destination/WishlistCounter.tsx` (nouveau)

Composant affiché dans `DestinationPanel` entre le contenu scrollable et le disclaimer.
Visible uniquement quand `wishlistItems.length > 0`.

```typescript
type Props = {
  onClear: () => void
}

export function WishlistCounter({ onClear }: Props) {
  const wishlistItems = useAppStore((s) => s.wishlistItems)
  if (wishlistItems.length === 0) return null

  const totalDays = wishlistItems.reduce((acc, i) => acc + i.daysMin, 0)
  const label = `${wishlistItems.length} POI${wishlistItems.length > 1 ? 's' : ''} · ~${totalDays}j`

  return (
    <div className="flex items-center justify-between border-t border-white/8 px-6 py-3">
      <div className="flex items-center gap-2">
        <span className="text-sm">🧳</span>
        <span className="text-sm font-medium text-white">{label}</span>
      </div>
      <button
        onClick={onClear}
        className="text-xs text-gray-500 transition hover:text-white"
      >
        Effacer
      </button>
    </div>
  )
}
```

**(AC: #2, #6)**

---

### Task 3 — Intégrer `WishlistCounter` dans `DestinationPanel`

**Fichier** : `src/components/destination/DestinationPanel.tsx`

Importer `WishlistCounter` et `clearWishlist` depuis le store.
Ajouter entre la zone scrollable et le disclaimer :

```tsx
const clearWishlist = useAppStore((s) => s.clearWishlist)

// Dans le JSX, après la div scrollable :
<WishlistCounter onClear={clearWishlist} />
```

**(AC: #2, #6)**

---

## Project Structure

```
src/components/destination/
├── DestinationPanel.tsx   ← modifier (Tasks 1, 3)
└── WishlistCounter.tsx    ← nouveau (Task 2)
```

Aucune modification du store (`appStore.ts`) — déjà prêt.

---

## Definition of Done

- [ ] Chaque POI a une checkbox, clic sur la ligne toggle l'état
- [ ] POI coché = visually distinct (border + bg verts)
- [ ] WishlistCounter visible avec format "N POIs · ~Xj" dès qu'un POI est coché
- [ ] WishlistCounter invisible si wishlist vide
- [ ] Bouton "Effacer" vide la wishlist et masque le counter
- [ ] Changer de pays → les sélections de l'ancien pays sont conservées dans le store
- [ ] Reload page → wishlist restaurée, POIs cochés correctement affichés
- [ ] `bun run build` sans erreur TypeScript
