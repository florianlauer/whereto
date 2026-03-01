---
workflowType: readiness
createdAt: "2026-03-01"
verdict: "PASS"
validatedWith: user (interactive session)
---

# Implementation Readiness Report — Whereto

## Verdict : PASS ✅

L'ensemble des artefacts est cohérent, validé interactivement, et suffisamment précis
pour démarrer l'implémentation. Un seul concern identifié sur la source des données POIs —
stratégie décidée (Kaggle CC0 + complément Wikidata) et traitée dans la Story 1.1.

---

## Checklist

### PRD ✅
- [x] PRD existe et est complet
- [x] Tous les FRs Must Have présents (FR-001 à FR-008)
- [x] NFRs avec métriques chiffrées (< 2s, < 300ms, < 500ms, > 99.5%, > 80 Lighthouse)
- [x] Out of scope défini (10 éléments explicites)
- [x] Aucune décision d'architecture dans le PRD

### Architecture ✅
- [x] 10 ADRs documentés, tous validés interactivement avec l'utilisateur
- [x] Aucun "à décider plus tard" sur des points structurants
- [x] Schéma DB complet (profiles, wishlists, wishlist_items + RLS + trigger)
- [x] Variables d'environnement listées
- [x] Structure de projet définie
- [x] Pattern DeckGL + react-map-gl clarifié et documenté
- [x] Un dev peut implémenter n'importe quelle story sans décision archi supplémentaire

### Epics & Stories ✅
- [x] 12 FRs couverts (Must Have + Should Have)
- [x] 9 stories, toutes avec ≥ 4 ACs Given/When/Then
- [x] Séquençage correct (infra → data → UI, lecture → écriture)
- [x] Aucune story ne dépasse 3 jours de dev estimé
- [x] MVP minimum défini : Epic 1 + Story 2.1

### UX ✅
- [x] Journeys principaux couverts (découverte, comparaison, partage URL)
- [x] 8 composants critiques identifiés avec leurs états
- [x] États vides, d'erreur et de chargement mentionnés
- [x] Design system complet (palette dark, Inter, spacing 4px)
- [x] Responsive strategy documentée

### Cohérence Globale ✅
- [x] Architecture compatible avec les NFRs (client-side scoring → NFR-002 garanti)
- [x] UX Spec réalisable avec la stack (MapLibre dark tiles, shadcn/ui Sheet pour bottom sheet)
- [x] Epics ordonnés pour livrer de la valeur rapidement (Epic 1 = valeur core autonome)

---

## Issues Identifiées

### ⚠️ CONCERN — Construction du dataset POIs (non bloquant pour Epic 1)

**Niveau** : Concern — non bloquant pour Epic 1, à résoudre avant Story 2.1.

**Description** : Le dataset Kaggle CC0 couvre le coût de vie (~5 000 villes, ~150 pays)
mais ne contient pas de données POIs structurées (noms, durées de visite, types).
Les données POIs doivent être construites séparément.

**Stratégie décidée** : Kaggle CC0 (coût de vie) + complément Wikidata (POIs touristiques,
open data CC0). Script de traitement à écrire en Story 1.1.

**Impact si non résolu avant Story 2.1** : Fiches destination sans POIs — expérience
dégradée mais pas bloquante (afficher "Données POIs bientôt disponibles" en fallback).

---

## Recommandation

**Démarrer l'implémentation — Epic 1 en priorité. ✅**

**Ordre recommandé :**
1. **Story 1.1** — Setup + dataset (inclut spike Kaggle + Wikidata)
2. **Story 1.2** — Carte neutre (peut démarrer en parallèle du dataset)
3. **Story 1.3** — Filtres + scoring (dès 1.2 terminé)
4. **Story 2.1** — Fiche destination (dès dataset validé) ← **fin MVP minimum**
5. **Story 2.2** — Wishlist session
6. **Story 4.1** — Infra DB + tRPC (peut démarrer en parallèle de l'Epic 2)
7. **Stories 4.2, 4.3** — Auth + wishlist persistante
8. **Story 3.1** — Comparaison (en dernier, Should Have)

**MVP minimum démontrable** (Epic 1 + Story 2.1) :
Carte filtrée + fiche destination = valeur core du produit, suffisant pour les premiers
retours utilisateurs avant d'investir dans la wishlist et l'auth.
