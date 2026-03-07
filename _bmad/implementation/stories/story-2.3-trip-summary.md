---
storyId: "2.3"
slug: trip-summary
epic: epic-2
status: ready-for-dev
createdAt: "2026-03-01"
createdBy: Bob (bmad-scrum-master)
inputDocuments:
  - _bmad/planning/epics.md
  - _bmad/planning/architecture.md
  - src/stores/appStore.ts
  - src/components/destination/DestinationPanel.tsx
  - src/components/destination/WishlistCounter.tsx
---

# Story 2.3 — Vue récapitulative "Mon Voyage" (multi-pays)

## User Story

As a **user who has selected POIs across multiple countries**,
I want to see a summary view of my entire trip with all selected countries and POIs,
so that I can evaluate the full trip at a glance and plan next steps.

---

## Context & Architecture

### État du codebase au moment de cette story

**`src/stores/appStore.ts`** — AUCUNE modification requise :

```typescript
export type WishlistItem = {
  poiId: string; // ex: "ge-kazbegi"
  countryCode: string; // ex: "GE"
  daysMin: number; // valeur pour la somme
};

// Sélecteurs disponibles :
const wishlistItems = useAppStore((s) => s.wishlistItems); // WishlistItem[]
const countries = useAppStore((s) => s.countries); // Record<string, Country>
const pois = useAppStore((s) => s.pois); // Record<string, POI[]>
const removeFromWishlist = useAppStore((s) => s.removeFromWishlist); // (poiId: string) => void
const clearWishlist = useAppStore((s) => s.clearWishlist); // () => void

// Country type (depuis src/lib/data.ts) :
// { code, name, region, dailyBudgetLow, dailyBudgetHigh, dailyBudgetMid,
//   recommendedDaysMin, recommendedDaysMax, safetyScore, bestMonths, dataYear }

// POI type :
// { id, name, daysMin, daysMax, type }
```

**`src/components/destination/WishlistCounter.tsx`** — props actuelles à enrichir :

```typescript
// AVANT (actuel) :
type Props = { onClear: () => void };

// APRÈS (Task 2) :
type Props = { onClear: () => void; onOpen: () => void };
```

**`src/components/destination/DestinationPanel.tsx`** — ligne actuelle du WishlistCounter :

```tsx
// AVANT (ligne 287) :
<WishlistCounter onClear={clearWishlist} />

// APRÈS (Task 3) :
<WishlistCounter onClear={clearWishlist} onOpen={() => setTripSummaryOpen(true)} />
```

### Pattern d'animation (à reproduire pour TripSummaryPanel)

DestinationPanel slide depuis la **droite** :

```tsx
className={[
  'fixed right-0 top-0 bottom-0 z-20 flex w-[380px] flex-col',
  'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
  visible ? 'translate-x-0' : 'translate-x-full',
].join(' ')}
```

TripSummaryPanel slide depuis la **gauche** — même mécanique, classes miroir :

```tsx
className={[
  'fixed left-0 top-0 bottom-0 z-20 flex w-[360px] flex-col',
  'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
  visible ? 'translate-x-0' : '-translate-x-full',
].join(' ')}
```

Montée en visibilité (entrée) :

```tsx
useEffect(() => {
  const id = requestAnimationFrame(() => setVisible(true));
  return () => cancelAnimationFrame(id);
}, []);
```

Fermeture animée (sortie) :

```tsx
function handleClose() {
  setVisible(false);
  setTimeout(onClose, 300);
}
// + useEffect Escape key → handleClose()
```

### Logique de regroupement par pays

```typescript
// Dans TripSummaryPanel — calculer les groupes côté client :
const groups = Object.entries(
  wishlistItems.reduce<Record<string, WishlistItem[]>>((acc, item) => {
    if (!acc[item.countryCode]) acc[item.countryCode] = [];
    acc[item.countryCode].push(item);
    return acc;
  }, {}),
);
// groups = [["GE", [item1, item2]], ["AM", [item3]], ...]
```

### Calcul des budgets estimés

```typescript
// Par pays (countryCode = "GE") :
const countryItems = wishlistItems.filter((i) => i.countryCode === countryCode);
const countryDays = countryItems.reduce((acc, i) => acc + i.daysMin, 0);
const country = countries[countryCode];
const budgetMin = countryDays * country.dailyBudgetLow;
const budgetMax = countryDays * country.dailyBudgetHigh;

// Total toutes destinations :
const totalDays = wishlistItems.reduce((acc, i) => acc + i.daysMin, 0);
const totalBudgetMin = groups.reduce((acc, [code, items]) => {
  const days = items.reduce((s, i) => s + i.daysMin, 0);
  return acc + days * (countries[code]?.dailyBudgetLow ?? 0);
}, 0);
const totalBudgetMax = groups.reduce((acc, [code, items]) => {
  const days = items.reduce((s, i) => s + i.daysMin, 0);
  return acc + days * (countries[code]?.dailyBudgetHigh ?? 0);
}, 0);
```

### Layout cible du TripSummaryPanel

```
┌─────────────────────────────────────┐
│  ✕  Mon Voyage          (header)    │
├─────────────────────────────────────┤  ← scrollable
│                                     │
│  GÉORGIE         Caucasus           │
│  ─────────────────────────────────  │
│  • Tbilissi    2–3j           [✕]  │
│  • Kazbegi     1–2j           [✕]  │
│  Sous-total : ~3j · 60€–165€       │
│  [✈ Voir les vols →]               │
│                                     │
│  ARMÉNIE         Caucasus           │
│  ─────────────────────────────────  │
│  • Erevan      2j             [✕]  │
│  Sous-total : ~2j · 50€–120€       │
│  [✈ Voir les vols →]               │
│                                     │
├─────────────────────────────────────┤  ← sticky footer
│  🧳 3 POIs · ~5j · 110€–285€       │
│                          [Effacer]  │
└─────────────────────────────────────┘
```

---

## Acceptance Criteria

### AC-1 : Ouverture du TripSummaryPanel

Given the WishlistCounter is visible (wishlist non vide),
When the user clicks on the 🧳 badge (label "N POIs · ~Xj"),
Then the TripSummaryPanel slides in from the left.

### AC-2 : Contenu par pays

Given the TripSummaryPanel is open,
When it displays a country group,
Then it shows: country name + region, list of selected POIs with their duration, days subtotal, budget range estimate (countryDays × dailyBudgetLow → countryDays × dailyBudgetHigh), and a "Voir les vols" link.

### AC-3 : Retirer un POI depuis le panel

Given the TripSummaryPanel is open,
When the user clicks ✕ next to a POI,
Then `removeFromWishlist(poiId)` is called
And the POI disappears from the list immediately
And all totals (days, budget, POI count) update in real time.

Given removing a POI empties a country's group,
When that country has no more selected POIs,
Then the country section disappears from the panel.

Given removing the last POI in the wishlist,
When the wishlist becomes empty,
Then the TripSummaryPanel closes automatically (WishlistCounter returning null triggers unmount).

### AC-4 : Footer avec totaux globaux

Given 1+ POIs are in the wishlist,
When the footer is displayed,
Then it shows: `🧳 {N} POI{s} · ~{totalDays}j · {totalBudgetMin}€–{totalBudgetMax}€`
And a "Effacer" button that calls `clearWishlist()` and closes the panel.

### AC-5 : Fermeture

Given the TripSummaryPanel is open,
When the user presses Escape or clicks ✕ in the header,
Then the panel slides out to the left (300ms transition) and closes.

### AC-6 : Coexistence avec DestinationPanel

Given both TripSummaryPanel (left) and DestinationPanel (right) could be open simultaneously,
When both are rendered,
Then they do not overlap (widths 360px + 380px < 1280px desktop minimum).

---

## Tasks

### Task 1 — Créer `TripSummaryPanel.tsx`

**Fichier** : `src/components/destination/TripSummaryPanel.tsx` (nouveau)

```tsx
import { useEffect, useState } from "react";
import { useAppStore } from "@/stores/appStore";
import type { WishlistItem } from "@/stores/appStore";

type Props = {
  onClose: () => void;
};

export function TripSummaryPanel({ onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const wishlistItems = useAppStore((s) => s.wishlistItems);
  const countries = useAppStore((s) => s.countries);
  const pois = useAppStore((s) => s.pois);
  const removeFromWishlist = useAppStore((s) => s.removeFromWishlist);
  const clearWishlist = useAppStore((s) => s.clearWishlist);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 300);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Fermer automatiquement quand la wishlist se vide
  useEffect(() => {
    if (wishlistItems.length === 0) handleClose();
  }, [wishlistItems.length]);

  // Regrouper par pays
  const groups = Object.entries(
    wishlistItems.reduce<Record<string, WishlistItem[]>>((acc, item) => {
      if (!acc[item.countryCode]) acc[item.countryCode] = [];
      acc[item.countryCode].push(item);
      return acc;
    }, {}),
  );

  // Totaux globaux
  const totalDays = wishlistItems.reduce((acc, i) => acc + i.daysMin, 0);
  const totalBudgetMin = groups.reduce((acc, [code, items]) => {
    const days = items.reduce((s, i) => s + i.daysMin, 0);
    return acc + days * (countries[code]?.dailyBudgetLow ?? 0);
  }, 0);
  const totalBudgetMax = groups.reduce((acc, [code, items]) => {
    const days = items.reduce((s, i) => s + i.daysMin, 0);
    return acc + days * (countries[code]?.dailyBudgetHigh ?? 0);
  }, 0);
  const totalLabel = `${wishlistItems.length} POI${wishlistItems.length > 1 ? "s" : ""} · ~${totalDays}j · ${totalBudgetMin}€–${totalBudgetMax}€`;

  return (
    <div
      className={[
        "fixed left-0 top-0 bottom-0 z-20 flex w-[360px] flex-col",
        "border-r border-white/8 bg-[#0a0b0f]/96 shadow-[8px_0_40px_rgba(0,0,0,0.6)]",
        "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        visible ? "translate-x-0" : "-translate-x-full",
      ].join(" ")}
      style={{ backdropFilter: "blur(20px) saturate(180%)" }}
    >
      {/* Accent bar */}
      <div className="h-[2px] w-full bg-white/5" />

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4">
        <h2 className="text-lg font-bold tracking-tight text-white">Mon Voyage</h2>
        <button
          onClick={handleClose}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition hover:bg-white/8 hover:text-white"
          aria-label="Fermer"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M12 4L4 12M4 4l8 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Contenu scrollable */}
      <div className="relative flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto px-6 pb-4 scrollbar-none">
          <div className="space-y-6">
            {groups.map(([code, items]) => {
              const country = countries[code];
              if (!country) return null;
              const countryPois = pois[code] ?? [];
              const countryDays = items.reduce((acc, i) => acc + i.daysMin, 0);
              const budgetMin = countryDays * country.dailyBudgetLow;
              const budgetMax = countryDays * country.dailyBudgetHigh;
              const flightsUrl = `https://www.google.com/flights#search;t=${code}`;

              return (
                <div key={code}>
                  {/* Entête pays */}
                  <div className="mb-3">
                    {country.region && (
                      <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-gray-600">
                        {country.region}
                      </p>
                    )}
                    <p className="text-sm font-semibold text-white">{country.name}</p>
                  </div>

                  {/* Liste des POIs sélectionnés */}
                  <ul className="mb-3 space-y-1">
                    {items.map((item) => {
                      const poi = countryPois.find((p) => p.id === item.poiId);
                      if (!poi) return null;
                      return (
                        <li
                          key={item.poiId}
                          className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 hover:bg-white/5"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-gray-600">•</span>
                            <span className="truncate text-sm text-gray-300">{poi.name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs tabular-nums text-gray-600">
                              {poi.daysMin === poi.daysMax
                                ? `${poi.daysMin}j`
                                : `${poi.daysMin}–${poi.daysMax}j`}
                            </span>
                            <button
                              onClick={() => removeFromWishlist(item.poiId)}
                              className="flex h-4 w-4 items-center justify-center text-gray-600 transition hover:text-red-400"
                              aria-label={`Retirer ${poi.name}`}
                            >
                              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                <path
                                  d="M7 1L1 7M1 1l6 6"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Sous-total + budget */}
                  <div className="mb-3 rounded-lg bg-white/[0.03] px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Sous-total</span>
                      <span className="text-xs font-medium text-white">~{countryDays}j</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Budget estimé</span>
                      <span className="text-xs text-gray-400">
                        {budgetMin}€–{budgetMax}€
                      </span>
                    </div>
                  </div>

                  {/* Lien vols */}
                  <a
                    href={flightsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 transition-all hover:border-white/15 hover:bg-white/[0.06]"
                  >
                    <span className="text-sm text-gray-500 transition group-hover:text-gray-300">
                      ✈
                    </span>
                    <span className="text-xs text-gray-500 transition group-hover:text-gray-300">
                      Voir les vols
                    </span>
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      fill="none"
                      className="ml-auto text-gray-700 transition group-hover:text-gray-500"
                    >
                      <path
                        d="M3 2l4 3-4 3"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </a>

                  {/* Séparateur */}
                  <div className="mt-6 border-b border-white/5" />
                </div>
              );
            })}
          </div>
        </div>
        {/* Fade-out bas */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0a0b0f]/96 to-transparent" />
      </div>

      {/* Footer sticky — totaux globaux */}
      <div className="flex items-center justify-between border-t border-white/8 px-6 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm">🧳</span>
          <span className="truncate text-sm font-medium text-white">{totalLabel}</span>
        </div>
        <button
          onClick={() => {
            clearWishlist();
            handleClose();
          }}
          className="ml-3 shrink-0 text-xs text-gray-500 transition hover:text-white"
        >
          Effacer
        </button>
      </div>
    </div>
  );
}
```

**(AC: #1, #2, #3, #4, #5, #6)**

---

### Task 2 — Mettre à jour `WishlistCounter.tsx`

**Fichier** : `src/components/destination/WishlistCounter.tsx`

Ajouter la prop `onOpen` et rendre le badge cliquable :

```tsx
import { useAppStore } from "@/stores/appStore";

type Props = {
  onClear: () => void;
  onOpen: () => void; // ← nouveau
};

export function WishlistCounter({ onClear, onOpen }: Props) {
  const wishlistItems = useAppStore((s) => s.wishlistItems);
  if (wishlistItems.length === 0) return null;

  const totalDays = wishlistItems.reduce((acc, i) => acc + i.daysMin, 0);
  const label = `${wishlistItems.length} POI${wishlistItems.length > 1 ? "s" : ""} · ~${totalDays}j`;

  return (
    <div className="flex items-center justify-between border-t border-white/8 px-6 py-3">
      <button onClick={onOpen} className="flex items-center gap-2 transition hover:opacity-80">
        <span className="text-sm">🧳</span>
        <span className="text-sm font-medium text-white underline-offset-2 hover:underline">
          {label}
        </span>
      </button>
      <button onClick={onClear} className="text-xs text-gray-500 transition hover:text-white">
        Effacer
      </button>
    </div>
  );
}
```

**(AC: #1)**

---

### Task 3 — Câbler `TripSummaryPanel` dans `DestinationPanel.tsx`

**Fichier** : `src/components/destination/DestinationPanel.tsx`

**3a. Import** — ajouter en haut du fichier :

```tsx
import { TripSummaryPanel } from "./TripSummaryPanel";
```

**3b. State local** — dans la fonction `DestinationPanel`, après les états existants :

```tsx
const [tripSummaryOpen, setTripSummaryOpen] = useState(false);
```

**3c. WishlistCounter** — remplacer la ligne existante (ligne ~287) :

```tsx
// AVANT :
<WishlistCounter onClear={clearWishlist} />

// APRÈS :
<WishlistCounter
  onClear={clearWishlist}
  onOpen={() => setTripSummaryOpen(true)}
/>
```

**3d. TripSummaryPanel** — ajouter juste après la `</div>` fermante du panel principal
(avant le `return` closing, ou juste avant `{/* Disclaimer */}` section) :

```tsx
{
  tripSummaryOpen && <TripSummaryPanel onClose={() => setTripSummaryOpen(false)} />;
}
```

**(AC: #1, #5, #6)**

---

## Project Structure

```
src/components/destination/
├── DestinationPanel.tsx    ← modifier (Tasks 3a, 3b, 3c, 3d)
├── WishlistCounter.tsx     ← modifier (Task 2)
├── TripSummaryPanel.tsx    ← nouveau  (Task 1)
├── WishlistCounter.tsx     ← modifier (Task 2)
└── ComparisonDrawer.tsx    ← inchangé
```

Aucune modification du store (`appStore.ts`).

---

## Definition of Done

- [ ] Clic sur le 🧳 badge (WishlistCounter) ouvre TripSummaryPanel depuis la gauche
- [ ] TripSummaryPanel affiche chaque pays avec ses POIs sélectionnés
- [ ] Sous-total jours + budget estimé affiché par pays
- [ ] Lien "Voir les vols" présent pour chaque pays
- [ ] ✕ sur un POI le retire + totaux mis à jour en temps réel
- [ ] Footer sticky : total POIs · jours · budget global + bouton "Effacer"
- [ ] "Effacer" vide la wishlist et ferme le panel
- [ ] Wishlist vide → panel se ferme automatiquement
- [ ] Escape / ✕ header → slide-out gauche (300ms) puis fermeture
- [ ] `bun run build` sans erreur TypeScript

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes

- Task 1: Créé `TripSummaryPanel.tsx` — slide-in gauche, groupement par pays, sous-totaux jours + budget, lien vols par pays, fermeture auto si wishlist vide, footer totaux globaux
- Task 2: Mis à jour `WishlistCounter.tsx` — ajout prop `onOpen`, badge 🧳 rendu cliquable
- Task 3: Câblé dans `DestinationPanel.tsx` — import TripSummaryPanel, state `tripSummaryOpen`, passage `onOpen` à WishlistCounter, rendu conditionnel TripSummaryPanel

### File List

- src/components/destination/TripSummaryPanel.tsx (créé)
- src/components/destination/WishlistCounter.tsx (modifié)
- src/components/destination/DestinationPanel.tsx (modifié)
