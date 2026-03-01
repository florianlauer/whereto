---
workflowType: brainstorming
createdAt: "2026-03-01"
---

# Brainstorming Report — Whereto

## Idée Centrale
Application de découverte et planification de voyage, carte-first, permettant de trouver
sa prochaine destination selon son budget, la durée envisagée et ses passions — puis d'explorer
les points d'intérêt du pays choisi et de sélectionner grossièrement ce qu'on veut voir.

## Problème Identifié
Il n'existe pas d'outil unique permettant de répondre à la question "Où devrais-je aller avec
X jours et Y€ ?" de manière visuelle et cartographique. Les voyageurs doivent aujourd'hui
cumuler YouTube vlogs + blogs + Google Maps + forums pour obtenir des informations fragmentées
sur les coûts, les durées recommandées et les incontournables d'une destination.

## Utilisateurs Impactés
Les voyageurs en général — du curieux qui ne sait pas encore où aller au voyageur qui cherche
à optimiser un budget et une durée de séjour. Pas de niche spécifique (≠ Nomad List qui cible
les digital nomades). Usage avant chaque voyage ou week-end prolongé.

## Hypothèses Clés
1. **Donnée agrégeable** : les données de coût de la vie, durée recommandée par lieu et POIs
   peuvent être récupérées/structurées (blogs, APIs, taux de change). C'est le défi technique
   central — à investiguer en phase Research.
2. **Carte-first** : l'expérience cartographique est le meilleur vecteur de découverte pour
   les voyageurs ouverts à toutes destinations.
3. **Gap marché réel** : aucun concurrent ne répond aujourd'hui à ce besoin complet.
4. **Usage pré-voyage uniquement** (v1) : la valeur principale est dans la phase de découverte
   et préparation, pas dans la journalisation post-voyage.

## Analyse Concurrentielle Rapide

| Outil | Ce qu'il fait | Gap |
|---|---|---|
| Google Maps | Cartographie + POIs | Pas de notion voyage, budget, durée |
| TripAdvisor | Avis + activités | Pas de planification, pas de carte mondiale |
| Wanderlog | Planification d'itinéraire | Nécessite de déjà savoir où aller |
| Nomad List | Budget + destinations nomades | Niche digitale nomade, pas grand public |
| PolarSteps | Journalisation post-voyage | Pas de pré-voyage |
| Roadtrippers | Planification road trip | Axé road trip US, pas international |

## Directions Explorées

### Direction A : "Le moteur de découverte" ✅ RETENUE
- Carte mondiale avec filtres (budget, durée, activités/passions, saison)
- Clic sur un pays → fiche + POIs qui apparaissent
- Sélection grossière des villes/lieux à voir + temps estimé par endroit (sans ordonnancement)
- Avantages : MVP rapide, valeur immédiate, fort différenciant
- Risques : dépend de la qualité de la donnée destination

### Direction B : "Le planificateur visuel"
- Itinéraire optimisé une fois la destination choisie
- Avantages : valeur forte en planification concrète
- Risques : assume destination déjà choisie — décalé vs. vision

### Direction C : "Le tout-en-un voyage"
- Découverte → sélection → planification → budget complet
- Avantages : vision complète long terme
- Risques : scope trop large pour une v1

## Direction Retenue
**Direction A — Le moteur de découverte**, avec un scope v1 clair :
- Vue mondiale carte-first avec filtres globaux
- Zoom pays → POIs + informations destination (coût de la vie, météo, durée recommandée)
- Sélection grossière des lieux à voir + temps estimé par endroit
- Les vols apparaissent en information uniquement (pas intégrés dans le budget)
- Pas de planification détaillée d'itinéraire (v2+)
- Pas d'historique de voyage (v2+)

## Vision Statement
**Whereto** permet aux **voyageurs curieux** de **découvrir leur prochaine destination sur
une carte interactive** afin de **transformer l'exploration du monde en décision de voyage
concrète et budgétée.**

## Prochaines Étapes Recommandées
- **Research marché** : valider le gap concurrentiel, identifier les solutions émergentes
- **Research domaine** : APIs de données voyage disponibles (POIs, coût de la vie, météo)
- **Research technique** : options cartographiques (Mapbox, Google Maps, MapLibre) et sources
  de données (TripAdvisor API, Foursquare, OpenStreetMap, Numbeo, etc.)
