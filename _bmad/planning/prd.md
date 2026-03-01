---
workflowType: prd
stepsCompleted: [create-prd]
inputDocuments:
  - _bmad/planning/product-brief.md
  - _bmad/planning/brainstorming-report.md
  - _bmad/planning/research/market-travel-discovery-2026-03-01.md
  - _bmad/planning/research/domain-travel-data-apis-2026-03-01.md
  - _bmad/planning/research/technical-mapping-stack-2026-03-01.md
createdAt: "2026-03-01"
projectType: web-app
---

# Product Requirements Document — Whereto

## Executive Summary

Whereto est une web app de découverte de destinations de voyage qui permet à tout voyageur
ne sachant pas encore où aller de visualiser sur une carte mondiale les destinations
accessibles selon son budget journalier et sa durée disponible. En filtrant par coût de vie
quotidien, durée et saison, l'utilisateur transforme une question paralysante ("où est-ce
que je vais ?") en un choix éclairé en quelques minutes — sans avoir besoin d'une
destination de départ en tête.

---

## Vision & Goals

**Vision** : Être la première interface de découverte de destinations budget-aware — le
point de départ de chaque décision de voyage.

**Objectifs business — 6 mois post-lancement :**

| Objectif | Cible |
|----------|-------|
| Utilisateurs actifs mensuels | 5 000 MAU |
| Rétention J30 | > 25% |
| Taux de complétion du flow (filtres → fiche pays) | > 60% |
| Taux de clic vers vols (Google Flights) | > 15% des sessions |
| NPS utilisateurs actifs | > 40 |

---

## Target Users

### Persona A — Le voyageur ouvert (principal)

- **Profil** : 25-40 ans, employé ou freelance, 2-4 voyages/an, budget moyen à serré
- **Job-to-be-done** : "Dis-moi où je peux aller avec 10 jours et 50€/jour en juillet"
- **Frustrations actuelles** : Passe 2-5h sur YouTube/blogs/Maps pour construire une
  shortlist mentale, prend souvent la même destination par dépit
- **Déclencheur d'adoption** : Voir toutes les destinations abordables s'allumer d'un coup
  sur la carte — sensation de "ah, je ne savais pas que c'était possible"

### Persona B — Le voyageur budget-first (secondaire)

- **Profil** : 18-28 ans (Gen Z), budget serré (< 30€/jour), voyage solo ou entre amis
- **Job-to-be-done** : "Où est-ce que je peux aller pour pas cher en dehors des clichés ?"
- **Frustrations actuelles** : Reddit, TikTok travel, Skyscanner "partout" — processus long
  et non structuré
- **Déclencheur d'adoption** : Filtrer par budget journalier bas et découvrir des
  destinations peu connues et accessibles (Géorgie, Albanie, Bosnie...)

### Persona C — Le planificateur en groupe (émergent)

- **Profil** : Groupe de 2-5 personnes, budgets et goûts différents
- **Job-to-be-done** : "On veut tous une destination différente — où est le compromis ?"
- **Frustrations actuelles** : Threads WhatsApp interminables, impossible de comparer
  objectivement
- **Déclencheur d'adoption** : Partager l'URL filtrée pour visualiser ensemble les
  destinations matchantes (feature v2 enrichie — en v1 : usage individuel + partage d'URL)

---

## User Journeys

### Journey 1 — Découverte budget + durée (Persona A, flux principal)

**Avant Whereto :** 2-5h de recherche multi-onglets (Maps, blogs, YouTube, Skyscanner)
pour arriver à une shortlist floue de 2-3 destinations.

**Avec Whereto :**

1. Ouvre l'app → carte mondiale s'affiche immédiatement (aucune friction, pas de compte)
2. Définit ses filtres : budget 50€/jour, 10 jours, mois : juillet
3. La carte se met à jour : les pays "matchants" s'allument, les hors-budget s'estompent
4. Explore visuellement les zones qui s'allument (ex: Balkans, Asie du Sud-Est)
5. Clique sur un pays → fiche destination : budget/jour estimé, meilleure saison,
   durée recommandée, top POIs, niveau de sécurité
6. Sélectionne des villes/POIs dans la wishlist → voit le temps estimé s'accumuler
7. Clique "Voir les vols" → redirect Google Flights avec la destination pré-remplie
8. Décide en < 20 minutes (vs. 2-5h avant)

**Moment de vérité :** L'étape 3 — quand la carte s'allume selon ses filtres. C'est
l'instant "aha" qui crée l'engagement.

---

### Journey 2 — Découverte budget serré (Persona B)

1. Ouvre l'app → filtres immédiats : budget ≤ 25€/jour, 7-10 jours, mois flexible
2. Découvre des destinations inattendues bien notées dans son budget
3. Explore les fiches de 2-3 destinations peu connues
4. Compare côte à côte pour valider le meilleur rapport qualité/budget
5. Clique vers les vols

---

### Journey 3 — Partage d'URL (Persona C, usage simple v1)

1. Utilisateur A configure ses filtres (budget, durée, mois)
2. Partage l'URL avec les filtres encodés en query params à son groupe
3. Chaque membre peut visualiser la même carte filtrée et explorer indépendamment
4. Discussion synchronisée autour d'une référence commune (vs. threads WhatsApp)

*(La fonctionnalité vote/consensus est v2)*

---

## Functional Requirements

| ID | Requirement | Priority | Journey |
|----|-------------|----------|---------|
| FR-001 | Le système doit permettre à l'utilisateur de visualiser une carte mondiale interactive avec les destinations colorées selon leur niveau de match budgétaire | Must Have | J1, J2 |
| FR-002 | Le système doit permettre à l'utilisateur de filtrer les destinations par **budget journalier estimé** (coût de vie sur place, hors vol) | Must Have | J1, J2 |
| FR-003 | Le système doit permettre à l'utilisateur de filtrer les destinations par **durée de séjour** (en jours) | Must Have | J1, J2 |
| FR-004 | Le système doit permettre à l'utilisateur de filtrer les destinations par **mois ou saison** de voyage | Must Have | J1, J2 |
| FR-005 | Le système doit calculer un **score de match** pour chaque destination indiquant si elle est "dans les clous" des filtres de l'utilisateur — et trier/colorer les destinations en conséquence | Must Have | J1, J2 |
| FR-006 | Le système doit afficher une **fiche destination** au clic sur un pays, incluant : budget journalier estimé, meilleure saison, durée recommandée, top 3-5 POIs, niveau de sécurité | Must Have | J1, J2 |
| FR-007 | Le système doit permettre à l'utilisateur de **sélectionner des villes/POIs** dans un pays et d'afficher le temps de visite estimé cumulé pour sa sélection | Must Have | J1 |
| FR-008 | Le système doit permettre à l'utilisateur de partager sa configuration de filtres via une **URL avec query params** | Must Have | J3 |
| FR-009 | Le système doit proposer un lien vers **Google Flights** depuis une fiche destination, avec la destination pré-remplie (lien informatif, pas de booking intégré) | Should Have | J1, J2 |
| FR-010 | Le système doit permettre à l'utilisateur de **comparer 2-3 destinations côte à côte** avec les mêmes métriques | Should Have | J2 |
| FR-011 | Le système doit permettre à l'utilisateur de **créer un compte optionnel** (email/magic link ou OAuth) pour sauvegarder ses explorations | Should Have | J1 |
| FR-012 | Le système doit permettre à l'utilisateur authentifié de **sauvegarder une wishlist** entre sessions | Should Have | J1 |

---

## Non-Functional Requirements

| ID | Requirement | Métrique |
|----|-------------|---------|
| NFR-001 | Performance — chargement initial de la carte | < 2s (P90) sur connexion 4G |
| NFR-002 | Performance — application des filtres et mise à jour de la carte | < 300ms (perçu comme instantané) |
| NFR-003 | Performance — ouverture d'une fiche destination | < 500ms |
| NFR-004 | Lighthouse Performance score | > 80 sur desktop |
| NFR-005 | Disponibilité | > 99.5% uptime mensuel |
| NFR-006 | Scalabilité | Supporte 500 utilisateurs simultanés sans dégradation (SPA + données statiques = charge serveur minimale) |
| NFR-007 | Sécurité — données utilisateur | Supabase RLS activé sur toutes les tables utilisateur ; aucune donnée personnelle stockée pour les utilisateurs anonymes |
| NFR-008 | Sécurité — authentification | Auth optionnelle via Supabase Auth (magic link ou OAuth) ; sessions gérées par JWT Supabase |
| NFR-009 | Accessibilité | WCAG 2.1 AA sur les éléments critiques : filtres, carte (alt text), fiches destination, navigation clavier |
| NFR-010 | Responsive | Utilisable sur mobile (breakpoint ≥ 375px) — desktop-first, mobile acceptable |
| NFR-011 | Fraîcheur des données | Dataset statique (Kaggle CC0, ~5 000 villes, snapshot 2022) — mis à jour manuellement max 1x/an ; disclaimer affiché sur les estimations de coût |

---

## Acceptance Criteria — Haut niveau

Ces critères valident la livraison complète du MVP (features Must Have) :

1. **Carte fonctionnelle** : Un utilisateur peut ouvrir l'app, définir budget/durée/mois et
   voir la carte se mettre à jour en < 300ms avec des destinations coloriées selon le match.

2. **Fiche destination** : Au clic sur tout pays présent dans le dataset, une fiche s'ouvre
   avec au minimum : budget journalier estimé, meilleure saison, durée recommandée, et
   au moins 3 POIs. La fiche s'ouvre en < 500ms.

3. **Wishlist et temps estimé** : L'utilisateur peut sélectionner des villes/POIs dans une
   fiche pays et voir le total de jours estimés s'afficher. La sélection persiste pendant
   la session (et entre sessions si connecté).

4. **Score de match** : Les destinations "dans les clous" (budget ≤ filtre ET saison
   compatible) sont visuellement distinctes des destinations hors-critères.

5. **URL partageable** : Une URL copiée depuis l'app, ouverte dans un autre navigateur,
   restaure les mêmes filtres et la même vue carte.

6. **Expérience anonyme** : L'ensemble du flow de découverte (filtres → carte → fiche →
   wishlist session) fonctionne sans création de compte.

7. **Performance validée** : Chargement initial < 2s (P90) mesuré sur Lighthouse en mode
   desktop. Score Lighthouse Performance > 80.

---

## Success Metrics

Voir section "Vision & Goals" — métriques mesurables à 6 mois post-lancement.

**Métriques de validation post-MVP (J+30) :**

| Signal | Seuil OK |
|--------|----------|
| Taux de complétion flow (filtres → fiche) | > 60% |
| Durée médiane de session | > 4 min |
| Taux de rebond page d'accueil | < 50% |
| Erreurs JS (Sentry) | < 0.1% des sessions |

---

## Constraints

- **Ressources** : Projet solo (Florian). Itérations rapides sur fonctionnel — pas d'équipe
  QA, pas de budget marketing. Timeline : MVP en 3-4 mois.
- **Stack imposé** : Vite + TanStack Router (SPA) + tRPC + Supabase + MapLibre GL JS.
  Ces choix sont arrêtés depuis la Phase 1 — pas à remettre en question dans le PRD.
- **Données vols** : Pas d'intégration API vols en v1 (coût $100-500/mois). Redirection
  externe uniquement (Google Flights, Kayak).
- **Données coût de vie** : Dataset statique (Kaggle CC0). Les estimations sont des
  "fourchettes indicatives" — le produit n'est pas une promesse de prix. Disclaimer
  obligatoire sur l'UI.
- **Couverture géographique** : Limitée au dataset disponible (~5 000 villes dans ~150 pays).
  Des pays peu documentés peuvent être absents ou partiellement couverts.
- **Internationalisation** : v1 en français uniquement. L'app cible les utilisateurs
  francophones en priorité.

---

## Out of Scope — v1

1. **Itinéraire optimisé** : La wishlist affiche le temps estimé mais n'ordonne pas les
   étapes ni ne calcule de route. C'est la v2.
2. **Données de vols en temps réel** : Pas de prix de vols, pas d'API Skyscanner/Amadeus.
3. **Booking intégré** : Aucune transaction in-app. Pas de booking d'hébergement ou de vol.
4. **Fonctionnalités groupe collaboratives** : Partage de trip, vote sur destination,
   notifications. Uniquement partage d'URL avec filtres en v1.
5. **App native iOS/Android** : Web uniquement.
6. **Alertes prix** : Pas de notifications ou d'alertes pour les vols vers une destination
   sauvegardée.
7. **Multi-langue** : v1 = français. Internationalisation v2.
8. **Historique de voyages** : Pas de journal ou archive de voyages passés.
9. **Recommandations algorithmiques** (ML) : Le score de match est basé sur des règles
   déterministes (budget vs dataset), pas de machine learning.
10. **Avis utilisateurs** : Pas de système de notation ou de reviews sur les destinations.
