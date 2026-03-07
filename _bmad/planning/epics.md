---
workflowType: epics
stepsCompleted: [epics-stories]
inputDocuments:
  - _bmad/planning/prd.md
  - _bmad/planning/architecture.md
createdAt: "2026-03-01"
mvpTarget: "Epic 1 + Story 2.1"
validatedWith: user (interactive session)
---

# Epic Breakdown — Whereto

## Requirements Inventory

| ID     | Requirement                                               | Priority    | Epic   |
| ------ | --------------------------------------------------------- | ----------- | ------ |
| FR-001 | Carte mondiale interactive colorée par score de match     | Must Have   | Epic 1 |
| FR-002 | Filtre par budget journalier (coût de vie, hors vol)      | Must Have   | Epic 1 |
| FR-003 | Filtre par durée de séjour                                | Must Have   | Epic 1 |
| FR-004 | Filtre par mois/saison                                    | Must Have   | Epic 1 |
| FR-005 | Score de match calculé et affiché visuellement            | Must Have   | Epic 1 |
| FR-008 | URL partageable avec filtres en query params              | Must Have   | Epic 1 |
| FR-006 | Fiche destination (budget, saison, durée, POIs, sécurité) | Must Have   | Epic 2 |
| FR-007 | Wishlist — sélection POIs + temps estimé cumulé           | Must Have   | Epic 2 |
| FR-009 | Lien vols (Google Flights) depuis la fiche                | Should Have | Epic 2 |
| FR-010 | Comparaison 2-3 destinations côte à côte                  | Should Have | Epic 3 |
| FR-011 | Compte utilisateur optionnel (magic link / OAuth)         | Should Have | Epic 4 |
| FR-012 | Sauvegarde wishlist persistante (auth)                    | Should Have | Epic 4 |

### NFR Coverage

| ID          | Métrique             | Couvert par                                            |
| ----------- | -------------------- | ------------------------------------------------------ |
| NFR-001     | Carte < 2s P90       | Story 1.1 (chargement parallèle + CDN Vercel)          |
| NFR-002     | Filtres < 300ms      | Story 1.3 (scoring client-side sur données en mémoire) |
| NFR-003     | Fiche < 500ms        | Story 2.1 (données POIs en mémoire, pas de fetch)      |
| NFR-004     | Lighthouse > 80      | Story 1.1 (Vite config) — vérification post-Epic 1     |
| NFR-007     | Supabase RLS         | Story 4.1 (migration DB + policies)                    |
| NFR-008     | Auth JWT             | Story 4.2 (Supabase Auth)                              |
| NFR-009     | WCAG 2.1 AA          | Notes dans chaque story UI                             |
| NFR-010     | Mobile responsive    | Notes dans stories 1.2, 2.1                            |
| NFR-011     | Disclaimer 2022      | Story 2.1 (fiche destination)                          |
| NFR-005/006 | Uptime + scalabilité | Couverts par architecture (Vercel + SPA statique)      |

---

## Epic List

- **Epic 1** : Carte interactive et filtres — le core de l'expérience ← **MVP commence ici**
- **Epic 2** : Fiche destination et wishlist — de l'exploration à la décision
- **Epic 3** : Comparaison — l'aide à la décision finale
- **Epic 4** : Compte utilisateur et persistance — la rétention

**Cible MVP minimum** : Epic 1 complet + Story 2.1 (carte filtrée + fiche destination).

---

## Epic 1 : Carte Interactive et Filtres

**Objectif** : L'utilisateur ouvre l'app, définit son budget/durée/mois, et voit la carte
mondiale se colorer en temps réel selon le score de match. C'est l'aha-moment — la valeur
principale du produit, sans compte ni backend requis.

**Prérequis** : Aucun (premier epic)
**FRs couverts** : FR-001, FR-002, FR-003, FR-004, FR-005, FR-008

---

### Story 1.1 : Setup du projet et chargement des données statiques

As a **developer**,
I want the project bootstrapped and all static destination data loaded before the map renders,
so that filtering and scoring work instantly with zero network requests after initial load.

**Acceptance Criteria :**

1. Given the app is opened for the first time,
   When the page loads,
   Then `countries.json`, `pois.json`, and `countries.geojson` are fetched in parallel
   And the map is interactive in < 2s on a 4G connection (Lighthouse P90 target).

2. Given the static files are fetched,
   When they are stored in the Zustand app store,
   Then `countries` and `pois` are accessible from any component without re-fetching.

3. Given one of the static files fails to fetch,
   When the error is caught,
   Then an ErrorBoundary displays a graceful fallback (not a blank screen)
   And the error is logged to the console.

4. Given the project is built with Vite,
   When `vite build` runs,
   Then the output compiles without errors
   And the vercel.json routes SPA fallback and `/api/*` correctly.

**Notes d'implémentation** (voir `architecture.md`) :

- Vite + React 19 + TanStack Router + Tailwind + shadcn/ui
- `src/lib/data.ts` → `loadStaticData()` avec `Promise.all`
- `src/stores/appStore.ts` → Zustand + persist middleware (partialize: wishlistItems seulement)
- GeoJSON source : Natural Earth 110m — valider que les codes `iso_a2` correspondent à `countries.json`
- `devenv.nix` : Node 22 + pnpm

---

### Story 1.2 : Rendu de la carte mondiale en état neutre

As a **first-time user**,
I want to see a full-screen dark world map when I open the app,
so that I immediately understand this is a map-first discovery experience.

**Acceptance Criteria :**

1. Given the app has loaded,
   When the user lands on the homepage,
   Then a full-screen dark world map is displayed (MapLibre GL JS + OpenFreeMap dark tiles)
   And all countries with data appear in a neutral muted color.

2. Given the map is displayed,
   When the user hovers over a country that has data,
   Then a tooltip appears with the country name
   And the country is visually highlighted (subtle opacity/border change).

3. Given a country has no entry in `countries.json`,
   When it is displayed on the map,
   Then it appears in `#2A2D3E` (darkest muted tone)
   And it is not clickable (no pointer cursor, no tooltip).

4. Given the user is on a mobile device (viewport width < 768px),
   When the map loads,
   Then it still occupies the full viewport
   And the FilterBar is compact (icons only, labels on tap/expand).

**Notes d'implémentation** :

- `src/components/map/MapView.tsx` : `<DeckGL controller={true}><Map mapStyle={...}/></DeckGL>`
- `src/components/map/CountriesLayer.ts` : `useCountriesLayer()` hook → GeoJsonLayer
- `src/components/map/CountryTooltip.tsx` : tooltip hover
- Tiles MVP : OpenFreeMap (style dark compatible Mapbox spec)
- Pays sans data : non-pickable dans le GeoJsonLayer (`pickable: false` par feature conditionnelle)

---

### Story 1.3 : Filtres et scoring — la carte s'allume

As a **user who doesn't know where to go**,
I want to set my daily budget, trip duration, and travel month,
so that the world map immediately shows which destinations match my criteria.

**Acceptance Criteria :**

1. Given the user sets a budget filter (e.g. 50€/day),
   When the filter is applied,
   Then the map updates in < 300ms
   And countries with `dailyBudgetMid ≤ 50` show in green (`#22C55E` at full opacity)
   And over-budget countries show in dimmed red (`#EF4444` at 40% opacity).

2. Given all three filters are active (budget + days + month),
   When the match score is computed for each country,
   Then countries matching all 3 criteria show in green (great)
   And countries matching 2 criteria show in amber (`#EAB308`)
   And countries matching 0–1 criteria show in dimmed red.

3. Given filters are set and the URL is copied and pasted in a new tab,
   When the new tab loads,
   Then the exact same filters are restored
   And the map shows the same color state.

4. Given the user changes a filter,
   When the URL updates (TanStack Router `navigate`),
   Then a new browser history entry is created
   And pressing the back button restores the previous filter state.

5. Given no filters are set,
   When the map is displayed,
   Then all countries show in neutral color
   And a badge reads "Set your budget to discover matching destinations".

6. Given filters are active,
   When the scoring is computed,
   Then a badge shows "X destinations match your criteria"
   And it updates in real time as filters change.

**Notes d'implémentation** :

- `src/lib/scoring.ts` : `calculateMatch()` + `MATCH_COLORS` (voir ADR-003)
- `src/routes/index.tsx` : `validateSearch` avec schema Zod `{ budget, days, month }`
- Mise à jour couleurs : `updateTriggers: { getFillColor: [budget, days, month] }` dans GeoJsonLayer
- `src/components/filters/FilterBar.tsx` + sous-composants BudgetFilter, DurationFilter, MonthFilter

---

## Epic 2 : Fiche Destination et Wishlist

**Objectif** : L'utilisateur clique sur un pays et obtient une fiche synthétique. Il peut sélectionner des POIs dans plusieurs pays pour construire un voyage multi-destinations, et voir le temps et le budget total s'accumuler.

**Prérequis** : Epic 1 terminé (carte interactive avec pays cliquables)
**FRs couverts** : FR-006, FR-007, FR-009

---

### Story 2.1 : Fiche destination (panel slide-in) ← **Fin du MVP minimum**

As a **user who clicked on a country on the map**,
I want a detail panel to slide in from the right with key destination information,
so that I can evaluate the destination without leaving the map view.

**Acceptance Criteria :**

1. Given the user clicks on a country with data,
   When the click is registered,
   Then a panel slides in from the right in < 500ms
   And it displays: country name, match score badge, daily budget estimate (low–high range), recommended duration, best season(s), safety rating (1–5), and top POIs list.

2. Given the panel is open,
   When the user clicks on a different country,
   Then the panel content replaces with the new destination without closing
   And the map pans slightly to keep the selected country visible.

3. Given the panel is open,
   When the user clicks ✕ or presses Escape,
   Then the panel closes and the map returns to full width.

4. Given any destination panel is displayed,
   When the data is shown,
   Then a disclaimer reads "Budget estimates are indicative (2022 data)"
   And it is visible without scrolling.

5. Given a country is clicked and FR-009 applies,
   When the user clicks "View flights →",
   Then they are redirected to Google Flights with the destination country pre-filled
   And the link opens in a new tab.

6. Given the user is on mobile,
   When they tap a country,
   Then the fiche appears as a bottom sheet (80% viewport height)
   And it can be dismissed by dragging down.

**Notes d'implémentation** :

- `src/components/destination/DestinationPanel.tsx` : slide-in (CSS transform translateX)
- Données depuis `useAppStore().countries[code]` et `useAppStore().pois[code]` — zéro fetch
- Google Flights URL : `https://www.google.com/flights#search;f=CDG;t={iata_or_country}`
- Bottom sheet mobile : `Sheet` de shadcn/ui (drawer variant)

---

### Story 2.2 : Wishlist multi-pays — sélection POIs et temps estimé

As a **user exploring a destination**,
I want to check the POIs I'm interested in and see the total estimated duration update,
so that I can quickly judge if the destination fits my available time.

**Acceptance Criteria :**

1. Given the destination panel shows a POI list,
   When the user checks a POI checkbox,
   Then the POI is visually marked as selected
   And the WishlistCounter at the bottom of the panel updates immediately with the new total.

2. Given multiple POIs are checked across different countries,
   When the WishlistCounter is displayed,
   Then it shows the sum of `daysMin` values with format "X POIs · ~Yj".

3. Given the user checked POIs in country A,
   When they open country B's panel,
   Then country A's POIs remain in the wishlist (Zustand store)
   And country B's POIs appear unchecked.

4. Given the user has selected POIs in multiple countries (e.g. Géorgie + Arménie),
   When the WishlistCounter is displayed in any destination panel,
   Then it shows the **total** across all countries (not just the current one)
   And the format is "{N} POIs · ~{Xj}" where N and X span all countries.

5. Given POIs are in the wishlist,
   When the user unchecks a POI,
   Then it is removed from the store and the total updates immediately.

6. Given the user closes the browser and reopens the app,
   When the app loads,
   Then the wishlist is restored from localStorage (Zustand persist)
   And previously checked POIs appear checked in their respective country panels.

**Notes d'implémentation** :

- Zustand `addToWishlist` / `removeFromWishlist` (voir ADR-005)
- `partialize` dans persist : seuls `wishlistItems` sont en localStorage
- `WishlistItem` type : `{ poiId: string, countryCode: string, daysMin: number }`

---

### Story 2.3 : Vue récapitulative du voyage multi-pays

As a **user who has selected POIs across multiple countries**,
I want to see a summary view of my entire trip with all selected countries and POIs,
so that I can evaluate the full trip at a glance and plan next steps.

**Acceptance Criteria :**

1. Given the WishlistCounter is visible,
   When the user clicks on it (or an expand icon),
   Then a "Mon Voyage" summary panel opens showing all countries with selected POIs, grouped by country.

2. Given the summary panel is open,
   When it displays a country with selected POIs,
   Then it shows: country name, selected POIs list, days subtotal for that country, estimated budget range (dailyBudgetLow × daysMin → dailyBudgetHigh × daysMax).

3. Given the summary panel is open,
   When the overall totals are displayed,
   Then it shows: total POI count, total days (sum of daysMin), and a "Voir les vols" link per country.

4. Given the user unchecks a POI from the summary view,
   When the removal is confirmed,
   Then the POI is removed from the wishlist and the totals update immediately.

**Notes d'implémentation** :

- `src/components/destination/TripSummaryPanel.tsx` — panel slide-in gauche ou bottom sheet
- Données depuis `useAppStore().wishlistItems` + `useAppStore().pois[countryCode]`
- Regroupement par `countryCode` côté client
- Budget estimé : `daysMin × country.dailyBudgetLow` → `(daysMin+daysMax)/2 × country.dailyBudgetHigh`

---

## Epic 3 : Comparaison de Destinations

**Objectif** : L'utilisateur compare 2–3 destinations côte à côte pour prendre sa décision.

**Prérequis** : Epic 2 (fiche destination fonctionnelle)
**FRs couverts** : FR-010

---

### Story 3.1 : Comparaison côte à côte

As a **user building a multi-country trip**,
I want to compare 2–3 candidate destinations side by side with the same metrics,
so that I can choose between destinations for the same trip without switching between panels.

**Acceptance Criteria :**

1. Given the destination panel is open,
   When the user clicks "Compare",
   Then the destination is added to a comparison list (max 3)
   And a comparison drawer appears at the bottom of the screen.

2. Given 2+ destinations are in the comparison list,
   When the comparison drawer is open,
   Then each destination is shown in a column with: daily budget range, recommended duration, best season(s), safety score, and match score badge.

3. Given 3 destinations are already in the comparison,
   When the user tries to add a 4th,
   Then a toast notification reads "Oldest destination removed"
   And the oldest is replaced by the new one.

4. Given the comparison drawer is open,
   When the user clicks ✕ on a column,
   Then that destination is removed
   And the drawer closes automatically when 0 destinations remain.

**Notes d'implémentation** :

- `comparisonList: string[]` (max 3 country codes) dans appStore ou état local MapPage
- `src/components/destination/ComparisonDrawer.tsx` (bottom drawer, grid colonnes)
- Toast : shadcn/ui Sonner

---

## Epic 4 : Compte Utilisateur et Persistance

**Objectif** : Auth optionnelle + wishlist persistante entre sessions.

**Prérequis** : Epic 2 (wishlist session), Story 4.1 (infra DB)
**FRs couverts** : FR-011, FR-012

---

### Story 4.1 : Setup infrastructure DB et tRPC

As a **developer**,
I want the Supabase DB and tRPC server configured before any auth feature ships,
so that the auth and wishlist features can build on a secure and typed foundation.

**Acceptance Criteria :**

1. Given the Supabase project is configured,
   When the migration is applied,
   Then tables `profiles`, `wishlists`, `wishlist_items` exist with correct schemas and RLS enabled.

2. Given RLS is active,
   When a user queries another user's wishlist via Supabase client,
   Then the result is empty (0 rows, not an error).

3. Given a new user signs up,
   When the auth trigger fires,
   Then a `profiles` row and a `wishlists` row are automatically created.

4. Given the tRPC server is set up (Hono + Vercel Function),
   When `GET /api/trpc/wishlist.get` is called without auth,
   Then it returns a `UNAUTHORIZED` tRPC error.

**Notes d'implémentation** :

- Migration SQL complète dans `architecture.md` (profiles, wishlists, wishlist_items, RLS, trigger)
- `api/index.ts` : Hono + `@hono/trpc-server` adapter
- `src/server/context.ts` : `createContext` extrait le user depuis le cookie Supabase
- Env vars : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

---

### Story 4.2 : Authentification optionnelle

As a **user who wants to save my wishlist**,
I want to sign in with my email or Google without losing my current selections,
so that my wishlist persists across devices.

**Acceptance Criteria :**

1. Given the user is not authenticated,
   When they click "Save" in the destination panel,
   Then an auth modal appears (non-blocking — map remains accessible behind)
   And a "Continue without account" option is clearly visible.

2. Given the auth modal is open,
   When the user enters their email and clicks "Send magic link",
   Then an email is sent via Supabase Auth
   And the modal shows "Check your inbox" feedback.

3. Given the user clicks "Continue with Google",
   When OAuth flow completes,
   Then they are redirected back to the app with the same URL (filters preserved)
   And the auth state is reflected in the UI (account icon in top bar).

4. Given the user just authenticated (any method),
   When the auth callback is processed,
   Then `wishlist.sync` is called with the current localStorage items
   And the localStorage wishlist is cleared after successful sync.

**Notes d'implémentation** :

- `src/components/auth/AuthModal.tsx` : shadcn/ui Dialog, email input + Google OAuth button
- `src/routes/auth/callback.tsx` : route de callback Supabase → sync → redirect à `/`
- Préserver les query params lors du redirect OAuth (encoder dans le `state` OAuth)
- `@supabase/ssr` pour la gestion des cookies en SPA Vite

---

### Story 4.3 : Wishlist persistante (utilisateur authentifié)

As an **authenticated user**,
I want my wishlist saved to my account,
so that I can continue trip planning from any device.

**Acceptance Criteria :**

1. Given the user is authenticated,
   When they check a POI,
   Then the item is saved in Supabase via `wishlist.sync` (upsert)
   And the UI updates immediately (optimistic update).

2. Given the user logs in from a new device,
   When the app loads and the user is authenticated,
   Then their wishlist is fetched from Supabase via `wishlist.get`
   And the previously checked POIs are restored.

3. Given the user unchecks a POI while authenticated,
   When the action is confirmed,
   Then `wishlist.remove` is called
   And the WishlistCounter updates immediately.

4. Given the user logs out,
   When logout is confirmed,
   Then `supabase.auth.signOut()` is called
   And the Zustand wishlist and localStorage are both cleared.

**Notes d'implémentation** :

- TanStack Query `useQuery` pour `trpc.wishlist.get` (déclenché quand `user !== null`)
- Mutations optimistes : update store Zustand avant confirmation tRPC
- Merge login : union localStorage + Supabase (upsert avec `UNIQUE(wishlist_id, poi_id)`)
- Logout : `clearWishlist()` dans appStore + `localStorage.removeItem('whereto-store')`

---

## FR Coverage Check

- [x] FR-001 → Story 1.2 + 1.3
- [x] FR-002 → Story 1.3 (BudgetFilter)
- [x] FR-003 → Story 1.3 (DurationFilter)
- [x] FR-004 → Story 1.3 (MonthFilter)
- [x] FR-005 → Story 1.3 (calculateMatch + GeoJsonLayer coloring)
- [x] FR-006 → Story 2.1 (DestinationPanel)
- [x] FR-007 → Story 2.2 (POIList + WishlistCounter)
- [x] FR-008 → Story 1.3 (validateSearch + URL query params)
- [x] FR-009 → Story 2.1 (lien Google Flights)
- [x] FR-010 → Story 3.1 (ComparisonDrawer — aide à choisir les étapes d'un voyage multi-pays)
- [x] FR-011 → Story 4.2 (AuthModal + Supabase Auth)
- [x] FR-012 → Story 4.3 (wishlist persistante via tRPC)
- [x] FR-013 → Story 2.3 (vue récapitulative voyage)

**Toutes les stories ont ≥ 2 ACs Given/When/Then. ✅**
**Aucune story ne nécessite une décision d'architecture non documentée. ✅**
**Séquençage respecté : infra avant feature, données avant UI. ✅**
