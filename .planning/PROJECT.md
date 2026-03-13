# Whereto

## What This Is

Whereto est une web app de découverte de destinations de voyage. L'utilisateur filtre par budget journalier, durée et mois de voyage, et la carte mondiale se colore en temps réel selon le score de match. Il peut ouvrir une fiche destination, sélectionner des POIs pour construire un voyage multi-pays, comparer des destinations côte à côte, et voir un récapitulatif de son voyage. Les utilisateurs authentifiés retrouvent leur wishlist sur tous leurs appareils.

## Core Value

L'utilisateur transforme "où est-ce que je vais ?" en un choix éclairé en quelques minutes, grâce à une carte mondiale qui s'allume selon ses contraintes budget/durée/saison.

## Requirements

### Validated

- ✓ Carte mondiale interactive colorée par score de match (FR-001) — v1.0
- ✓ Filtre par budget journalier (FR-002) — v1.0
- ✓ Filtre par durée de séjour (FR-003) — v1.0
- ✓ Filtre par mois/saison (FR-004) — v1.0
- ✓ Score de match calculé et affiché visuellement (FR-005) — v1.0
- ✓ URL partageable avec filtres en query params (FR-008) — v1.0
- ✓ Fiche destination avec budget, saison, durée, POIs, sécurité (FR-006) — v1.0
- ✓ Wishlist multi-pays avec sélection POIs et temps estimé (FR-007) — v1.0
- ✓ Lien vols Google Flights depuis la fiche (FR-009) — v1.0
- ✓ Vue récapitulative voyage multi-pays (FR-013) — v1.0
- ✓ Comparaison 2-3 destinations côte à côte (FR-010) — v1.0
- ✓ Infrastructure DB et API typée (Supabase + tRPC + Hono) — v1.0
- ✓ Auth optionnelle : magic link email, Google OAuth, email/password — v1.0
- ✓ Wishlist persistante cross-device pour utilisateurs authentifiés — v1.0

### Active

(Aucune — définir lors du prochain milestone avec `/gsd:new-milestone`)

### Out of Scope

- Enrichissement dataset (budgets, POIs, safety scores) — données actuelles sont des estimations non sourcées
- Chat temps réel / collaboration — Complexité trop élevée, pas core
- Application mobile native — Web-first, PWA suffisante
- Réservation intégrée (hôtels, vols) — On redirige vers Google Flights
- Multi-langue — UI en français uniquement
- Offline mode — la connexion est nécessaire pour la sync wishlist

## Context

**Codebase :** 5,492 LOC TypeScript. SPA React 19 + Vite 6 + TanStack Router + Tailwind CSS 4 + Zustand 5 + MapLibre GL + deck.gl. Backend : Supabase (PostgreSQL + Auth + RLS) + tRPC + Hono sur Vercel Functions. 105 tests.

**v1.0 shipped :** Carte interactive avec filtres, fiche destination, wishlist (localStorage + Supabase), auth (email, magic link, Google OAuth), merge local→server au login, optimistic updates, cross-device sync.

**Tech debt :** `db.ts` SUPABASE_ANON_KEY fallback bypasses RLS silently, `wishlist.update`/`wishlist.reorder` endpoints sans UI consumer.

**Dataset :** Les données actuelles (budgets, POIs, safety scores) sont des estimations non sourcées — suffisantes pour le MVP mais à fiabiliser.

## Constraints

- **Tech stack frontend :** React 19 + Vite + TanStack Router + Zustand + Tailwind
- **Backend :** Supabase + tRPC + Hono sur Vercel Functions
- **Auth :** Magic link + Google OAuth + email/password via Supabase Auth
- **Rétro-compatibilité :** Le mode anonyme (localStorage wishlist) doit continuer à fonctionner
- **Dev environment :** Bun + Nix (devenv.nix)

## Key Decisions

| Decision                         | Rationale                                                               | Outcome |
| -------------------------------- | ----------------------------------------------------------------------- | ------- |
| Supabase pour DB + Auth          | Intégré, gratuit au tier free, RLS natif, SDKs TypeScript               | ✓ Good  |
| tRPC + Hono pour API             | Type-safety end-to-end, léger, compatible Vercel Functions              | ✓ Good  |
| Merge localStorage → DB au login | Pas de perte de données pour les utilisateurs qui commencent en anonyme | ✓ Good  |
| Auth optionnelle (non bloquante) | L'app reste utilisable sans compte, auth suggérée au 3ème ajout POI     | ✓ Good  |
| SECURITY DEFINER trigger         | Bypass RLS pour auto-création profile+wishlist au signup                | ✓ Good  |
| protectedProcedure via getUser() | Validation server-side du token, pas juste getSession()                 | ✓ Good  |
| Sync onAuthStateChange           | Évite le deadlock Supabase — pas d'async dans le callback               | ✓ Good  |
| Fire-and-forget tRPC mutations   | useTRPCClient hors lifecycle React pour mutations background            | ✓ Good  |
| Snapshot-rollback optimistic     | Capture state avant mutation, restore dans .catch()                     | ✓ Good  |
| Soft auth gate (3ème ajout)      | Prompt auth non-bloquant après 3 POIs anonymes, sessionStorage reset    | ✓ Good  |

---

_Last updated: 2026-03-13 after v1.0 milestone_
