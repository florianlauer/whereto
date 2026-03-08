# WhereTo

Application web interactive d'exploration de destinations de voyage. Une SPA cartographique permettant de filtrer les pays par budget, durée et période de voyage, consulter les détails des destinations, gérer une wishlist et comparer les pays.

## Stack technique

### Frontend

- **React 19** + **Vite 6** — SPA avec HMR
- **TanStack Router** — Routing file-based avec validation Zod des search params
- **Zustand** — State management (store unique, persistance localStorage pour la wishlist)
- **MapLibre GL** + **react-map-gl** + **deck.gl** — Carte interactive avec couches GeoJSON
- **Tailwind CSS 4** — Styling utility-first
- **Radix UI** — Composants accessibles (slider)
- **CVA** + **clsx** + **tailwind-merge** — Gestion des variants de composants

### Backend

- **Hono** — Serveur HTTP léger (entry point Vercel serverless)
- **tRPC** — API typée end-to-end avec TanStack React Query
- **Supabase** — Base de données PostgreSQL avec auth et Row Level Security
- Routers : `health`, `profile`, `wishlist`

### Tooling

- **TypeScript 5** — Mode strict
- **Bun** — Package manager et runtime
- **Vitest** + **Testing Library** — Tests unitaires
- **oxlint** / **oxfmt** — Linting et formatting
- **Nix** (devenv + direnv) — Environnement de dev reproductible

## Structure du projet

```
src/
├── components/
│   ├── destination/     # Panels détail pays, résumé trip, comparaison, wishlist
│   ├── filters/         # Barre de filtres (budget, durée, mois, type de voyage)
│   └── map/             # Carte MapLibre, couches deck.gl, tooltip, toggle style
├── lib/
│   ├── data.ts          # Types Country/POI, chargement données statiques
│   └── scoring.ts       # Calcul de matching pays/filtres, couleurs
├── routes/
│   ├── __root.tsx       # Route racine
│   └── index.tsx        # Page principale (filtres Zod + MapPage)
├── server/
│   ├── routers/         # tRPC routers (health, profile, wishlist)
│   ├── router.ts        # App router agrégé
│   ├── trpc.ts          # Config tRPC + context
│   └── db.ts            # Client Supabase serveur
├── stores/
│   └── appStore.ts      # Store Zustand (données + wishlist persistée)
└── main.tsx             # Point d'entrée

api/
└── index.ts             # Entry point Hono pour Vercel serverless

supabase/
├── migrations/          # Schema SQL (profiles, wishlists, wishlist_items + RLS)
├── seed.sql             # Données de seed
└── config.toml          # Config Supabase locale

public/
├── data/                # countries.json, pois.json
└── geo/                 # countries.geojson (~12MB)
```

## Prérequis

- [Nix](https://nixos.org/) avec devenv + direnv (recommandé), ou **Bun** installé manuellement
- [Supabase CLI](https://supabase.com/docs/guides/cli) pour le backend local

## Installation

```bash
# Cloner le repo
git clone <repo-url> && cd whereto

# Installer les dépendances
bun install

# Copier les variables d'environnement
cp .env.example .env
```

## Commandes

| Commande             | Description                                  |
| -------------------- | -------------------------------------------- |
| `bun run dev`        | Serveur de dev Vite                          |
| `bun run build`      | Build production (type-check + Vite)         |
| `bun run preview`    | Preview du build production                  |
| `bun run type`       | Type-check TypeScript (`tsc --noEmit`)       |
| `bun run test`       | Tests unitaires (Vitest)                     |
| `bun run test:watch` | Tests en mode watch                          |
| `bun run lint`       | Lint avec oxlint                             |
| `bun run format`     | Format avec oxfmt                            |
| `bun run db:types`   | Générer les types TypeScript depuis Supabase |

## Base de données

Le schema Supabase comprend :

- **profiles** — Profil utilisateur (créé automatiquement au signup)
- **wishlists** — Une wishlist par utilisateur (contrainte unique)
- **wishlist_items** — Items de wishlist liés à des POI (par `poi_id` + `country_code`)

Toutes les tables ont le **Row Level Security** activé — chaque utilisateur accède uniquement à ses propres données.

```bash
# Démarrer Supabase en local
supabase start

# Appliquer les migrations
supabase db reset
```

## Déploiement

Configuré pour **Vercel** avec :

- SPA rewrite (`/*` → `index.html`)
- API serverless (`/api/*` → `api/index.ts`)

## Licence

Projet privé.
