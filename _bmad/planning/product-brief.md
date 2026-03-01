---
workflowType: product-brief
stepsCompleted: [brainstorm, research-market, research-domain, research-technical]
inputDocuments:
  - _bmad/planning/brainstorming-report.md
  - _bmad/planning/research/market-travel-discovery-2026-03-01.md
  - _bmad/planning/research/domain-travel-data-apis-2026-03-01.md
  - _bmad/planning/research/technical-mapping-stack-2026-03-01.md
createdAt: "2026-03-01"
---

# Product Brief — Whereto

## Vision Statement

**Whereto** permet aux **voyageurs curieux qui ne savent pas encore où aller** de
**découvrir leur prochaine destination sur une carte mondiale interactive filtrée par
budget et durée** afin de **transformer l'hésitation pré-voyage en décision concrète et
budgétée en quelques minutes.**

---

## Problem Statement

### La douleur

Chaque voyageur fait face à la même question paralysante : *"Où est-ce que je vais aller
avec mes X jours et Y€ ?"* La réponse n'est nulle part en un seul endroit. Il faut
aujourd'hui :
- Regarder des vlogs YouTube pour s'inspirer
- Lire des blogs pour estimer les coûts
- Ouvrir Google Maps pour localiser les POIs
- Checker Google Flights pour les prix de vols
- Aller sur TripAdvisor pour les avis

Ce processus prend des heures, parfois des jours. Et il suppose de déjà avoir une
destination en tête — ce qui n'est pas le point de départ de la majorité des voyageurs.

### Pourquoi les solutions existantes ne répondent pas

| Solution | Problème fondamental |
|----------|---------------------|
| Google Maps | Outil de navigation, assume que tu sais déjà où aller |
| TripAdvisor | Outil d'avis post-décision, pas de découverte pré-choix |
| Wanderlog | Planificateur d'itinéraire — nécessite une destination déjà choisie |
| Nomad List | Niche digital nomades, données remote-work centrées, $299/an |
| Google Flights | Filtre les vols, pas les destinations ni le coût total du voyage |

**Le gap** : Aucun outil mainstream ne permet de partir d'une carte du monde et de
filtrer les destinations accessibles par budget total + durée disponible + centres
d'intérêt. Ce besoin est structurellement difficile à combler pour les acteurs en place
(Google et Booking ne sont pas incentivés à aider l'utilisateur à optimiser son budget
— ils gagnent sur le trafic et les transactions).

### Fréquence et intensité

- Usage pré-voyage : décision prise en moyenne 4-8 semaines avant le départ
- 66% des millennials téléchargent une app de voyage avant chaque voyage
- 80% préfèrent planifier depuis une app (vs. agence ou blog)
- Gen Z = 40% des voyageurs, budget serré, fréquence élevée — le besoin de budget-awareness est structurel

---

## Target Users

### Persona A — Le voyageur ouvert (principal)

**Profil** : 25-40 ans, employé ou freelance, 2-4 voyages par an, budget moyen à serré.
Ne sait pas encore où aller mais a une fenêtre de disponibilité et un budget approximatif.

**Besoin principal** : "Dis-moi où je peux aller avec 10 jours et 1 500€ en juillet."

**Comportement actuel** : Passe 2-5h sur YouTube/blogs/Maps pour construire une shortlist
mentale, puis compare manuellement 2-3 destinations. Prend souvent la même destination
par dépit (manque d'exploration).

**Déclencheur d'adoption** : Voir une carte où toutes les destinations abordables
s'allument d'un coup — sensation de "ah, je ne savais pas que c'était possible".

---

### Persona B — Le voyageur budget-first (secondaire)

**Profil** : 18-28 ans (Gen Z), budget très serré ($500-1 500/voyage), voyage en solo ou
entre amis. Très sensible au coût total, pas seulement au vol.

**Besoin principal** : "Où est-ce que je peux aller pour pas cher en dehors des clichés ?"

**Comportement actuel** : Reddit, TikTok travel, Skyscanner en mode "partout", forums
backpacker. Processus long et non structuré.

**Déclencheur d'adoption** : Filtrer par budget journalier estimé sur une carte →
découvrir des destinations peu connues et accessibles.

---

### Persona C — Le planificateur en groupe (émergent)

**Profil** : Groupe de 2-5 personnes aux budgets et goûts différents, cherche un
consensus sur la destination.

**Besoin principal** : "On veut tous une destination différente — où est le compromis ?"

**Comportement actuel** : Threads WhatsApp interminables, chacun partage ses liens,
impossible de comparer objectivement.

**Déclencheur d'adoption** : Partager un lien Whereto avec filtres prédéfinis pour
arriver à un consensus visuel sur la carte.

---

## Key Features

### Must Have (sans ces features, le produit n'a pas de valeur)

**1. Carte mondiale interactive avec filtres globaux**
Permet à l'utilisateur de visualiser d'un coup d'œil toutes les destinations accessibles
selon son budget approximatif, la durée de son séjour et la saison.
→ Filtres : budget total estimé, nombre de jours, mois/saison, type d'activité

**2. Fiche destination — vue pays**
Au clic sur un pays, affiche une fiche synthétique : budget journalier estimé, meilleure
saison pour visiter, durée recommandée, top POIs, niveau de sécurité.

**3. Sélection de lieux à voir (wishlist grossière)**
Permet de cocher les villes/sites qui l'intéressent dans un pays et de voir le temps
estimé par lieu — sans ordonnancement ni itinéraire détaillé (c'est la v2).

**4. Score de match destination**
Calcule automatiquement si une destination est "dans les clous" du budget et de la durée
de l'utilisateur — affiche les destinations matchantes en premier/plus visiblement.

---

### Should Have (fort différenciant, mais le MVP peut vivre sans)

**5. Comparaison de destinations côte à côte**
Affiche 2-3 destinations en parallèle avec les mêmes métriques pour faciliter la
décision finale.

**6. Lien vers les vols (informatif)**
Redirige vers Google Flights / Kayak pour le vol depuis une localisation de départ — pas
de booking intégré en v1.

---

### Nice to Have (v2+)

- Itinéraire optimisé depuis la wishlist (v2)
- Sauvegarde de voyages et historique (v2, nécessite auth)
- Partage de destination avec un groupe + vote (v2)
- Alertes prix vols pour une destination sauvegardée (v2)

---

## Success Metrics

### Adoption (6 mois post-lancement)

| Métrique | Cible |
|----------|-------|
| Utilisateurs actifs mensuels | 5 000 MAU |
| Rétention J30 | > 25% |
| Sessions par utilisateur actif | > 2/mois |
| Taux de complétion du flow (filtre → fiche pays) | > 60% |

### Valeur

| Métrique | Cible |
|----------|-------|
| Temps moyen sur app par session | > 4 min |
| Taux de clic vers vols (lien Google Flights) | > 15% des sessions |
| NPS utilisateurs actifs | > 40 |

### Technique

| Métrique | Cible |
|----------|-------|
| Temps de chargement initial carte | < 2s (P90) |
| Disponibilité | > 99.5% |
| Score Lighthouse Performance | > 80 |

---

## Constraints & Assumptions

### Contraintes

- **Ressources** : Projet solo, développeur unique (Florian). Pas d'équipe, pas de budget
  marketing. Itérations rapides prioritaires sur l'exhaustivité.
- **Données coût de vie** : Pas d'API gratuite fiable en temps réel — utilisation d'un
  dataset statique (Kaggle CC0, ~5 000 villes, snapshot 2022). Acceptable pour une v1,
  mise à jour manuelle périodique.
- **Vols** : Pas d'intégration directe API vols en v1 (coût $100-500/mois en production).
  Redirection externe uniquement.
- **Stack imposé** : Vite + TanStack Router (SPA) + tRPC + Supabase + MapLibre GL JS
  (choix technologique arrêté en Phase 1 Research).

### Hypothèses à valider

1. **H1 — Qualité suffisante du dataset statique** : Les données Kaggle (2022) sont
   suffisamment récentes pour donner des estimations de budget crédibles. À valider avec
   quelques destinations connues de l'utilisateur cible.

2. **H2 — Carte-first comme vecteur de découverte** : L'interface carte est plus
   engageante qu'une liste filtrée pour ce cas d'usage. À mesurer via heatmaps et
   comparaison A/B éventuelle.

3. **H3 — Budget estimatif acceptable** : L'utilisateur accepte un budget "fourchette
   indicative" sans garantie de précision. Le produit n'est pas une promesse de prix —
   c'est un outil d'inspiration et d'exploration.

4. **H4 — Usage pré-voyage uniquement (v1)** : La valeur est dans la découverte et la
   sélection grossière, pas dans la planification détaillée. Valider que les utilisateurs
   ne cherchent pas immédiatement un itinéraire.

### Délai cible

MVP fonctionnel : **3-4 mois** à partir du début de l'implémentation (Phase 4).
Périmètre v1 = features Must Have uniquement.
