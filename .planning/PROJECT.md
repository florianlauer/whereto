# Whereto

## What This Is

Whereto est une web app de découverte de destinations de voyage. L'utilisateur filtre par budget journalier, durée et mois de voyage, et la carte mondiale se colore en temps réel selon le score de match. Il peut ouvrir une fiche destination, sélectionner des POIs pour construire un voyage multi-pays, comparer des destinations côte à côte, et voir un récapitulatif de son voyage.

## Core Value

L'utilisateur transforme "où est-ce que je vais ?" en un choix éclairé en quelques minutes, grâce à une carte mondiale qui s'allume selon ses contraintes budget/durée/saison.

## Requirements

### Validated

- [x] Carte mondiale interactive colorée par score de match (FR-001) — Epic 1
- [x] Filtre par budget journalier (FR-002) — Epic 1
- [x] Filtre par durée de séjour (FR-003) — Epic 1
- [x] Filtre par mois/saison (FR-004) — Epic 1
- [x] Score de match calculé et affiché visuellement (FR-005) — Epic 1
- [x] URL partageable avec filtres en query params (FR-008) — Epic 1
- [x] Fiche destination avec budget, saison, durée, POIs, sécurité (FR-006) — Epic 2
- [x] Wishlist multi-pays avec sélection POIs et temps estimé (FR-007) — Epic 2
- [x] Lien vols Google Flights depuis la fiche (FR-009) — Epic 2
- [x] Vue récapitulative voyage multi-pays (FR-013) — Epic 2
- [x] Comparaison 2-3 destinations côte à côte (FR-010) — Epic 3

### Active

- [ ] Infrastructure DB et API typée (Supabase + tRPC + Hono) — Epic 4
- [ ] Auth optionnelle : magic link email, Google OAuth, email/password — Epic 4
- [ ] Wishlist persistante cross-device pour utilisateurs authentifiés — Epic 4

### Out of Scope

- Enrichissement dataset (budgets, POIs, safety scores) — Backlog, pas prioritaire pour ce milestone
- Chat temps réel / collaboration — Complexité trop élevée, pas core
- Application mobile native — Web-first
- Réservation intégrée (hôtels, vols) — On redirige vers Google Flights
- Multi-langue — UI en français uniquement pour v1

## Context

**Codebase existante :** SPA React 19 + Vite 6 + TanStack Router + Tailwind CSS 4 + Zustand 5 + MapLibre GL + deck.gl. Données statiques en JSON (countries.json, pois.json) et GeoJSON. Déployé en statique sur Vercel.

**Epics 1-3 terminés :** Carte interactive avec filtres, fiche destination, wishlist session (localStorage), comparaison. Tout fonctionne côté client sans backend.

**Ce milestone (Epic 4) :** Ajouter un backend léger pour auth et persistance. La wishlist passe de localStorage à Supabase pour les utilisateurs authentifiés, tout en gardant le mode anonyme fonctionnel.

**Architecture prévue (du BMAD) :**

- Supabase : DB PostgreSQL + Auth (magic link, Google OAuth, email/password)
- tRPC + Hono : API typée déployée en Vercel Function (`/api/*`)
- Tables : `profiles`, `wishlists`, `wishlist_items` avec RLS
- Merge localStorage → Supabase à la première connexion

**Dataset :** Les données actuelles (budgets, POIs, safety scores) sont des estimations non sourcées — suffisantes pour le MVP mais à fiabiliser avant mise en production publique.

## Constraints

- **Tech stack frontend :** React 19 + Vite + TanStack Router + Zustand + Tailwind — déjà en place, ne pas changer
- **Backend :** Supabase + tRPC + Hono sur Vercel Functions — décidé dans l'architecture BMAD
- **Auth :** Magic link + Google OAuth + email/password via Supabase Auth
- **Rétro-compatibilité :** Le mode anonyme (localStorage wishlist) doit continuer à fonctionner
- **Dev environment :** Bun + Nix (devenv.nix)

## Key Decisions

| Decision                         | Rationale                                                               | Outcome   |
| -------------------------------- | ----------------------------------------------------------------------- | --------- |
| Supabase pour DB + Auth          | Intégré, gratuit au tier free, RLS natif, SDKs TypeScript               | — Pending |
| tRPC + Hono pour API             | Type-safety end-to-end, léger, compatible Vercel Functions              | — Pending |
| Merge localStorage → DB au login | Pas de perte de données pour les utilisateurs qui commencent en anonyme | — Pending |
| Auth optionnelle (non bloquante) | L'app reste utilisable sans compte, auth proposée au moment du "Save"   | — Pending |

---

_Last updated: 2026-03-07 after initialization_
