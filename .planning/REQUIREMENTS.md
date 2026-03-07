# Requirements: Whereto

**Defined:** 2026-03-07
**Core Value:** L'utilisateur transforme "ou est-ce que je vais ?" en un choix eclaire en quelques minutes, grace a une carte mondiale qui s'allume selon ses contraintes budget/duree/saison.

## v1 Requirements

Requirements for Epic 4 (Auth + Persistence). Maps to roadmap phases.

### Infrastructure

- [ ] **INFRA-01**: Tables `profiles`, `wishlists`, `wishlist_items` creees avec RLS active dans Supabase
- [ ] **INFRA-02**: API tRPC + Hono deployee en Vercel Function sur `/api/trpc/*`
- [ ] **INFRA-03**: Trigger DB auto-creation profile + wishlist au signup
- [ ] **INFRA-04**: Variables d'env securisees (`service_role` jamais expose cote client via `VITE_` prefix)

### Authentication

- [ ] **AUTH-01**: User peut creer un compte avec email et password
- [ ] **AUTH-02**: User peut se connecter via magic link email
- [ ] **AUTH-03**: User peut se connecter via Google OAuth
- [ ] **AUTH-04**: Session persistante via refresh token (survit au refresh browser)
- [ ] **AUTH-05**: Auth proposee au moment du "Save", jamais en gate sur la carte
- [ ] **AUTH-06**: Option "Continuer sans compte" toujours visible dans la modale auth
- [ ] **AUTH-07**: Apres OAuth redirect, les filtres URL sont preserves (meme vue carte)

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

| Requirement | Phase | Status  |
| ----------- | ----- | ------- |
| INFRA-01    | —     | Pending |
| INFRA-02    | —     | Pending |
| INFRA-03    | —     | Pending |
| INFRA-04    | —     | Pending |
| AUTH-01     | —     | Pending |
| AUTH-02     | —     | Pending |
| AUTH-03     | —     | Pending |
| AUTH-04     | —     | Pending |
| AUTH-05     | —     | Pending |
| AUTH-06     | —     | Pending |
| AUTH-07     | —     | Pending |
| WISH-01     | —     | Pending |
| WISH-02     | —     | Pending |
| WISH-03     | —     | Pending |
| WISH-04     | —     | Pending |
| WISH-05     | —     | Pending |
| WISH-06     | —     | Pending |
| WISH-07     | —     | Pending |

**Coverage:**

- v1 requirements: 18 total
- Mapped to phases: 0
- Unmapped: 18

---

_Requirements defined: 2026-03-07_
_Last updated: 2026-03-07 after initial definition_
