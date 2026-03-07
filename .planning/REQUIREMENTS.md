# Requirements: Whereto

**Defined:** 2026-03-07
**Core Value:** L'utilisateur transforme "ou est-ce que je vais ?" en un choix eclaire en quelques minutes, grace a une carte mondiale qui s'allume selon ses contraintes budget/duree/saison.

## v1 Requirements

Requirements for Epic 4 (Auth + Persistence). Maps to roadmap phases.

### Infrastructure

- [x] **INFRA-01**: Tables `profiles`, `wishlists`, `wishlist_items` creees avec RLS active dans Supabase
- [x] **INFRA-02**: API tRPC + Hono deployee en Vercel Function sur `/api/trpc/*`
- [x] **INFRA-03**: Trigger DB auto-creation profile + wishlist au signup
- [x] **INFRA-04**: Variables d'env securisees (`service_role` jamais expose cote client via `VITE_` prefix)

### Authentication

- [x] **AUTH-01**: User peut creer un compte avec email et password
- [x] **AUTH-02**: User peut se connecter via magic link email
- [x] **AUTH-03**: User peut se connecter via Google OAuth
- [x] **AUTH-04**: Session persistante via refresh token (survit au refresh browser)
- [x] **AUTH-05**: Auth proposee au moment du "Save", jamais en gate sur la carte
- [x] **AUTH-06**: Option "Continuer sans compte" toujours visible dans la modale auth
- [x] **AUTH-07**: Apres OAuth redirect, les filtres URL sont preserves (meme vue carte)

### Wishlist Persistante

- [ ] **WISH-01**: User authentifie peut sauvegarder sa wishlist en DB via tRPC
- [ ] **WISH-02**: Au premier login, les POIs localStorage sont merges en DB (union, dedup par poi_id)
- [ ] **WISH-03**: localStorage cleare seulement apres confirmation de sync reussie
- [ ] **WISH-04**: Updates optimistes — Zustand mis a jour immediatement, tRPC sync en background
- [ ] **WISH-05**: Hook `useWishlist()` unifie — composants ignorent le mode anonyme/authentifie
- [ ] **WISH-06**: User peut retrouver sa wishlist en se connectant depuis un autre device
- [ ] **WISH-07**: Au logout, wishlist Zustand et localStorage sont vides

## v2 Requirements

### Data Quality

- **DATA-01**: Dataset budgets journaliers source depuis Numbeo / Budget Your Trip
- **DATA-02**: POIs sources depuis Wikidata / OpenTripMap
- **DATA-03**: Safety scores sources depuis FCDO / State Dept advisories
- **DATA-04**: Couverture 80+ pays

### Social

- **SOCL-01**: Partage de wishlist via URL publique
- **SOCL-02**: Wishlist collaborative (multi-utilisateurs)

## Out of Scope

| Feature                             | Reason                                                                |
| ----------------------------------- | --------------------------------------------------------------------- |
| Supabase anonymous sign-in          | Complexite inutile (quota, CAPTCHA, cleanup cron, linkIdentity merge) |
| GitHub OAuth                        | Pas pertinent pour le public cible voyage                             |
| Reservation integree (hotels, vols) | On redirige vers Google Flights, pas de booking                       |
| Chat temps reel                     | Complexite trop elevee, pas core                                      |
| Application mobile native           | Web-first                                                             |
| Multi-langue                        | UI en francais uniquement pour v1                                     |
| Payments / premium tier             | Pas de monetisation en v1                                             |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase   | Status   |
| ----------- | ------- | -------- |
| INFRA-01    | Phase 1 | Complete |
| INFRA-02    | Phase 1 | Complete |
| INFRA-03    | Phase 1 | Complete |
| INFRA-04    | Phase 1 | Complete |
| AUTH-01     | Phase 2 | Complete |
| AUTH-02     | Phase 2 | Complete |
| AUTH-03     | Phase 2 | Complete |
| AUTH-04     | Phase 2 | Complete |
| AUTH-05     | Phase 2 | Complete |
| AUTH-06     | Phase 2 | Complete |
| AUTH-07     | Phase 2 | Complete |
| WISH-01     | Phase 3 | Pending  |
| WISH-02     | Phase 4 | Pending  |
| WISH-03     | Phase 4 | Pending  |
| WISH-04     | Phase 4 | Pending  |
| WISH-05     | Phase 3 | Pending  |
| WISH-06     | Phase 3 | Pending  |
| WISH-07     | Phase 4 | Pending  |

**Coverage:**

- v1 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0

---

_Requirements defined: 2026-03-07_
_Last updated: 2026-03-07 after roadmap creation_
