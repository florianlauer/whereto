---
workflowType: ux-design
mode: light
stepsCompleted: [create-ux]
inputDocuments: [_bmad/planning/prd.md]
createdAt: "2026-03-01"
---

# UX Specification — Whereto

## Design Philosophy

**1. La carte est le héros**
L'interface s'efface devant la carte. Chaque pixel d'UI qui n'apporte pas de valeur
directe est retiré. Les filtres, les fiches, les panels sont des invités — la carte est
l'hôte permanente.

**2. L'aha-moment en 3 secondes**
Un nouvel utilisateur doit ressentir la valeur core du produit (les destinations qui
s'allument selon son budget) en moins de 3 secondes d'interaction. Aucun onboarding,
aucun formulaire bloquant, aucune création de compte avant l'expérience.

**3. Révélation progressive**
On ne montre que ce dont l'utilisateur a besoin à l'instant T. Les filtres avancés sont
accessibles mais pas imposés. Les détails d'une destination n'apparaissent qu'au clic.
La wishlist n'est visible que quand elle contient des éléments.

---

## User Personas — Contexte UX

| Persona | Env. d'utilisation | État émotionnel | Implications UX |
|---------|-------------------|-----------------|-----------------|
| A — Voyageur ouvert | Bureau, desktop, moment calme de planification | Curieux, indécis, ouvert à la surprise | La carte doit déclencher des "je ne savais pas que c'était possible" |
| B — Budget-first | Mobile ou desktop, rapide, goal-oriented | Focalisé sur le chiffre, méfiant des prix cachés | Les estimations de coût doivent être immédiatement visibles et honnêtes |
| C — Planificateur groupe | Desktop, partage d'écran ou lien partagé | Cherche un consensus | L'URL partageable doit restaurer fidèlement la vue |

---

## Layout Général — Desktop

```
┌─────────────────────────────────────────────────────────────────────┐
│  🌍 whereto   [Budget €/j ▼]  [Durée j ▼]  [Mois ▼]  [Filtres +]  │  ← Top bar
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                                                                     │
│              CARTE MONDIALE PLEIN ÉCRAN                             │
│              (MapLibre GL JS, fond dark)                            │
│                                                                     │
│   [pays colorés selon score de match]                               │
│                                                                     │
│                                          ┌─────────────────────┐   │
│                                          │  PANEL DESTINATION  │   │
│                                          │  (slide-in droite)  │   │
│                                          │                     │   │
│                                          │  Apparaît au clic   │   │
│                                          │  sur un pays        │   │
│                                          └─────────────────────┘   │
│                                                                     │
│  [Badge: X destinations dans les clous]                             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  COMPARAISON DRAWER (slide-up bas, visible si ≥1 pays)      │  │
│  │  [Géorgie ✕] [Serbie ✕] [Maroc ✕]   [Tout effacer]        │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**Comportement du panel contextuel :**
- Fermé par défaut — carte 100% de la largeur
- S'ouvre en slide-in depuis la droite au clic sur un pays (largeur ~380px)
- La carte se redimensionne légèrement à gauche (pas d'overlay) — la destination reste
  centrée et visible
- Fermeture : bouton ✕, clic sur un autre pays (remplace le contenu), clic en dehors
  du panel, ou touche Échap

---

## Journey Principal — Découverte budget + durée

### Écran 1 — Premier lancement (état vide)

**Objectif** : Immersion immédiate dans la carte, invitation à filtrer.

```
[Top bar avec filtres à valeurs neutres : "Budget" | "Durée" | "Mois"]
[Carte mondiale — tous les pays en couleur neutre/dim]
[Badge discret en bas à gauche : "Définissez votre budget pour voir les destinations"]
```

**États de la carte (couleurs de pays) :**
- Aucun filtre actif → tous les pays en teinte neutre (gris foncé légèrement lumineux)
- Filtres actifs → gradient vert/amber/rouge selon score de match
- Pays sans data → gris très foncé, non-cliquable, tooltip "Données non disponibles"

---

### Écran 2 — Filtres actifs

**Objectif** : Voir la carte "s'allumer" selon les critères. C'est l'aha-moment.

**Interaction filtres :**
- Clic sur "Budget €/j" → dropdown avec slider range (ex: 0—200€/jour)
- Clic sur "Durée" → dropdown avec slider simple (1—30 jours)
- Clic sur "Mois" → dropdown grid de mois (12 cases cliquables, multi-select)
- "Filtres +" → popover avec filtres optionnels : type d'activité (nature / culture / plage / urban)

**Mise à jour** : Chaque changement de filtre met à jour la carte en temps réel (< 300ms).
Le badge de résultats se met à jour : "34 destinations dans tes critères".

**Score de match (coloring) :**
- ✅ Vert intense → budget AND saison correspondent
- 🟡 Amber → budget OK, saison sub-optimale (ou inversement)
- 🔴 Rouge estompé → hors budget ou hors saison
- ⬛ Gris → pas de données

---

### Écran 3 — Fiche destination (panel slide-in)

**Objectif** : Obtenir les infos clés pour décider si cette destination vaut la peine.

```
┌─────────────────────────────────────┐
│  ✕                          🔖 Save │
│                                     │
│  🇬🇪 Géorgie                        │
│  ★★★★☆  Score : Très bon match      │
│                                     │
│  💰 Budget/jour estimé : 25-35€     │
│  ⏱ Durée recommandée : 7-14 jours  │
│  ☀️ Meilleure saison : Avr-Juin,    │
│      Sep-Oct                        │
│  🛡 Sécurité : ●●●●○ (sûr)         │
│                                     │
│  ─────── Points d'intérêt ────────  │
│  ☐ Tbilissi          ~2-3 jours     │
│  ☐ Kazbegi           ~2 jours       │
│  ☐ Batumi            ~2 jours       │
│  ☐ Kutaisi           ~1-2 jours     │
│                                     │
│  ┌──────────────────────────────────┐ │
│  │  🧳 4 POIs · ~9j (tous pays)   │ │
│  └──────────────────────────────────┘ │
│                                     │
│  [  ⚖️ Comparer cette destination  ]  │
│  [  ✈ Voir les vols →  ]              │
│                                     │
│  ⚠️ Données estimatives (2022)      │
└─────────────────────────────────────┘
```

**États des POIs :**
- Unchecked → affiche le nom + durée estimée
- Checked → ✅ coloré, durée s'ajoute au compteur wishlist
- Le compteur en bas se met à jour en temps réel

**Bouton Save :** visible uniquement si connecté. Si non connecté : clic → modal invite
à créer un compte (action non bloquante, "continuer sans compte" bien visible).

---

### Écran 4 — Comparaison côte à côte (Should Have)

Accessible via bouton "Comparer" dans la fiche destination.
Ouvre un drawer en bas de l'écran (ou replace le panel avec 2-3 colonnes) avec les
mêmes métriques pour 2-3 destinations sélectionnées.

---

### Écran 5 — Vue récapitulative "Mon Voyage" (Story 2.3)

**Objectif** : Voir l'ensemble du voyage multi-pays construit, avec le détail par pays et les totaux.

**Déclencheur** : Clic sur le WishlistCounter (🧳 badge) dans n'importe quel DestinationPanel.

**Layout** :
```
┌─────────────────────────────────────┐
│  ✕  Mon Voyage                      │
├─────────────────────────────────────┤
│  🇬🇪 Géorgie          ~4j           │
│     • Tbilissi    2-3j  [✕]        │
│     • Kazbegi     1-2j  [✕]        │
│     Budget estimé : 80€ – 220€     │
│     [✈ Voir les vols]              │
├─────────────────────────────────────┤
│  🇦🇲 Arménie          ~3j           │
│     • Erevan      2j    [✕]        │
│     • Lac Sevan   1j    [✕]        │
│     Budget estimé : 60€ – 150€     │
│     [✈ Voir les vols]              │
├─────────────────────────────────────┤
│  TOTAL                              │
│  4 POIs · ~7 jours                 │
│  Budget estimé : 140€ – 370€       │
└─────────────────────────────────────┘
```

---

## Composants Critiques

| Composant | Rôle | États |
|-----------|------|-------|
| **FilterBar** | Top bar avec les 3 filtres principaux | default, filter-active, loading, expanded (un dropdown ouvert) |
| **MapLayer** | Carte MapLibre avec coloring de pays | no-filter, filtered, hover-country, selected-country, loading |
| **CountryTooltip** | Mini tooltip au hover sur un pays | default (nom + score), no-data (grisé) |
| **DestinationPanel** | Panel slide-in droite — fiche pays | closed, open, loading, error, no-data |
| **POICheckbox** | Item sélectionnable dans la fiche | unchecked, checked, disabled |
| **WishlistCounter** | Badge récapitulatif wishlist MULTI-PAYS dans le panel — total tous pays confondus. Clic → ouvre vue récapitulative. | empty (masqué), 1+ item (visible + count), max-days-warning |
| **ScoreBadge** | Indicateur de match coloré | great-match (vert), good (amber), poor (rouge) |
| **MatchBadge** | Badge global "X destinations dans tes critères" | zero (message différent), 1-10, 11-50, 50+ |
| **ComparisonDrawer** | Drawer fixé en bas — comparaison 1-3 destinations côte à côte | hidden (0 pays), 1-3 pays (visible), max-3 (replace oldest + toast) |
| **TripSummaryPanel** | Panel récapitulatif voyage multi-pays | empty (masqué), 1-N pays avec POIs sélectionnés |

---

## Design System Minimal

### Palette — Dark / Atmosphérique

| Rôle | Couleur | Usage |
|------|---------|-------|
| Background app | `#0F1117` | Fond global derrière la carte |
| Surface panel | `#1A1D27` | Panel destination, dropdowns |
| Surface elevated | `#22263A` | Cards, tooltips |
| Border subtle | `#2E3349` | Séparateurs, bordures input |
| Text primary | `#F0F2FF` | Titres, valeurs importantes |
| Text secondary | `#8B91A8` | Labels, metadata |
| Text muted | `#4A5068` | Disclaimers, placeholders |
| Accent primary | `#5B7FFF` | CTA principaux, liens, focus rings |
| Match great | `#22C55E` | Pays très bien matchants |
| Match good | `#EAB308` | Pays partiellement matchants |
| Match poor | `#EF4444` | Pays hors critères |
| Match none | `#2A2D3E` | Pays sans données |

### Typographie

| Usage | Font | Taille | Poids |
|-------|------|--------|-------|
| App name / H1 | Inter | 20px | 700 |
| H2 (nom pays) | Inter | 18px | 600 |
| Body / labels | Inter | 14px | 400 |
| Caption / meta | Inter | 12px | 400 |
| Budget chiffre | Inter | 16px | 600 |

### Spacing

Base unit : **4px**. Échelle : 4, 8, 12, 16, 24, 32, 48px.

### Tone of voice

**Inspirant et direct.** Pas de jargon, pas de superlatifs marketing. Les données parlent
d'elles-mêmes. Messages courts : "Géorgie — 30€/jour · 10 jours · ✅ Dans tes critères"
plutôt que "Découvrez la magnifique Géorgie !". Les estimations sont présentées comme
telles ("estimé", "indicatif") — pas de fausse précision.

---

## Responsive Strategy

**Desktop-first** — breakpoints desktop prioritaires, mobile utilisable.

| Breakpoint | Layout |
|-----------|--------|
| ≥ 1280px (desktop) | Top bar complète + carte + panel slide-in |
| 768-1279px (tablet) | Top bar condensée (icônes + labels courts) + carte + panel slide-in |
| < 768px (mobile) | Top bar mini (budget + durée seulement) + carte plein écran + bottom sheet pour la fiche destination |

**Sur mobile :**
- Les filtres "Mois" et "Filtres +" sont dans un bottom sheet dédié
- La fiche destination s'ouvre en bottom sheet (80% de hauteur) plutôt qu'en panel latéral
- La carte reste accessible derrière le bottom sheet (drag down pour fermer)

---

## Accessibility

**Niveau visé : WCAG 2.1 AA** sur les éléments critiques.

- **Carte** : Les pays cliquables ont un `role="button"` et un `aria-label` (ex: "Géorgie — Bon match"). La carte n'est pas l'unique moyen d'accéder aux destinations (envisager une liste accessible en alternative).
- **Filtres** : Tous les inputs sont accessibles au clavier. Les dropdowns ferment à Échap.
- **Contrastes** : Text primary (`#F0F2FF`) sur surface (`#1A1D27`) = ratio ≈ 12:1 (AAA). Text secondary sur surface = ratio ≈ 4.5:1 (AA).
- **Focus** : Focus rings visibles (accent primary `#5B7FFF`, 2px solid, 2px offset).
- **Disclaimer** : Le texte "données estimatives" doit avoir un contraste suffisant et ne pas être masqué.
