---

## workflowType: research
researchType: domain
topic: travel-data-apis
createdAt: "2026-03-01"

# Research Domaine — APIs de Données Voyage

## 1. Points d'Intérêt (POI)


| API                        | Couverture            | Pricing                                                 | Qualité                                              | Recommandation            |
| -------------------------- | --------------------- | ------------------------------------------------------- | ---------------------------------------------------- | ------------------------- |
| **Foursquare Places**      | 100M+ POIs, 200+ pays | Free 10K calls/mois, pay-as-you-go ensuite              | Excellente (16B+ check-ins, photos, avis)            | ⭐ MVP + production        |
| **Google Places**          | Très large            | 10K events/mois (free, post-mars 2025) puis pay-per-use | Excellente                                           | Complémentaire Foursquare |
| **OpenStreetMap/Overpass** | Global, communautaire | **100% gratuit, sans auth**                             | Variable (bonne en Europe/US, faible pays émergents) | MVP / prototype           |
| **Geoapify Places**        | 500+ catégories       | Free 3K credits/jour, $59/mois (10K/j)                  | Solide                                               | Alternative économique    |
| **HERE Places**            | 200+ pays             | Free 250K transactions/mois                             | Bonne                                                | Backup                    |


**Stratégie recommandée** : OSM (prototype) → Foursquare free tier (MVP) → Foursquare + Google hybride (growth)

---

## 2. Coût de Vie / Budget Voyage

> ⚠️ **Correction** : L'API Numbeo est **payante** ($260/mois minimum, usage commercial). Pas gratuite.
> Le scraping Numbeo est explicitement interdit dans leurs CGU.

| Source                        | Couverture                    | Pricing                           | Qualité                    | Recommandation                  |
| ----------------------------- | ----------------------------- | --------------------------------- | -------------------------- | ------------------------------- |
| **Kaggle Global CoL dataset** | ~5 000 villes, 55 colonnes    | **Gratuit (CC0 domaine public)**  | Bonne (source Numbeo 2022) | ⭐ MVP — à bundler statiquement |
| **LivingCost.net API**        | 9 294 villes, 320 indicateurs | Pricing opaque, contacter support | Bonne                      | Alternative si free tier obtenu |
| **World Bank Open Data**      | 209 pays                      | **Gratuit (CC BY-4.0)**           | Macro (CPI, inflation)     | Baseline country-level          |
| **Numbeo API**                | 12 661 villes                 | **$260/mois minimum**             | Excellente                 | ❌ Trop cher pour MVP           |
| **Teleport API**              | —                             | —                                 | —                          | ❌ **Défunt en 2026**           |

> ⚠️ **Réalité 2026** : Il n'existe pas d'API gratuite et fiable en temps réel pour le coût de vie des villes. Tous les agrégateurs sont passés en payant. La meilleure stratégie MVP est de **bundler un dataset statique** (Kaggle CC0 ~5 000 villes) côté serveur, avec une mise à jour manuelle périodique.

**Problème majeur** : Pas d'API commerciale solide pour le coût de l'hébergement.

- **Booking.com / Airbnb** : pas d'API publique de prix (partenariats enterprise requis)
- **Workaround** : Dataset Kaggle (coûts quotidiens) + lien Booking pour l'hébergement

**Stratégie recommandée** : Dataset Kaggle bundlé (coûts vie statiques, CC0) + World Bank (macro pays) + lien Booking pour hébergement

---

## 3. Météo / Meilleure Saison

> ⚠️ **Correction** : Weatherbit Climate Normals = tier **Plus à €180/mois**. Le free tier est non-commercial + 50 req/jour seulement.

| API                            | Type de donnée                                      | Pricing                                             | Usage commercial | Recommandation                        |
| ------------------------------ | --------------------------------------------------- | --------------------------------------------------- | ---------------- | ------------------------------------- |
| **NOAA CDO API**               | Normales climatiques 30 ans (temp, précip, vent)    | **Gratuit (données fédérales US = domaine public)** | ✅ Oui           | ⭐ MVP — normales historiques fiables |
| **Meteostat API**              | Normales climatiques 30 ans, bulk CSV               | Gratuit (vérifier CGU commerciales)                 | ⚠️ À vérifier    | Bonne alternative NOAA                |
| **Open-Meteo Historical**      | Données brutes depuis 1940 → calcul normales maison | Gratuit (non-commercial) / ~$20/mois (commercial)   | ✅ Payant        | Flexible mais nécessite traitement    |
| **Weatherbit Climate Normals** | Normales 30 ans prêtes à l'emploi                   | €180/mois (Plus)                                    | ✅ Oui           | ❌ Trop cher pour MVP                 |

**Insight** : Pour "quand partir", les **normales climatiques historiques** sont bien supérieures aux prévisions météo. NOAA CDO est la meilleure option gratuite (usage commercial libre, données gouvernementales US). Pas d'API dédiée "meilleure saison" — à construire à partir des normales mensuelles NOAA + curation légère.

---

## 4. Données Vols

| API                      | Couverture      | Pricing                                                         | Contraintes                             |
| ------------------------ | --------------- | --------------------------------------------------------------- | --------------------------------------- |
| **Amadeus Self-Service** | 400+ compagnies | Free 2K recherches/mois (test + prod), puis pay-per-transaction | Production nécessite contrat entreprise |
| **Skyscanner**           | Global          | Apify wrapper $12/mois + usage                                  | Partenariat direct nécessaire           |
| **Google Flights**       | Global          | **Pas d'API officielle**                                        | Scraping = violation CGU                |

**Réalité** : Budget minimum $100–200/mois pour les vols en production. Pas de solution gratuite viable à l'échelle.

**Stratégie v1** : Afficher les vols en informatif uniquement, rediriger vers Google Flights / Kayak (pas d'intégration directe). Investir l'API vols en v2.

---

## 5. Metadata Destinations (visa, sécurité, pays)

| API                      | Données                                                | Pricing                |
| ------------------------ | ------------------------------------------------------ | ---------------------- |
| **REST Countries**       | Pays, capitale, monnaie, langues, drapeaux, frontières | **Gratuit, sans auth** |
| **Travel Buddy AI Visa** | Visa 200+ passeports / 210 destinations                | Free tier disponible   |
| **Travel-Advisory.info** | Avis voyage, niveaux de risque par pays                | **Gratuit**            |
| **Riskline / Sitata**    | Visa + santé + sécurité complet                        | Enterprise uniquement  |

**Stratégie recommandée** : REST Countries (base) + Travel Buddy (visa) + Travel-Advisory.info (sécurité) = couverture quasi-complète quasi-gratuite

---

## Architecture de Données Recommandée

### Stack Tier 1 — MVP (< $50/mois)

| Besoin         | Solution                                 | Coût         |
| -------------- | ---------------------------------------- | ------------ |
| POIs           | OSM/Overpass + Foursquare free           | $0           |
| Coût de vie    | Dataset Kaggle CC0 (bundlé) + World Bank | $0           |
| Météo / saison | NOAA CDO API (normales 30 ans)           | $0           |
| Vols           | Lien externe Google Flights              | $0           |
| Info pays      | REST Countries                           | $0           |
| Visa           | Travel Buddy free                        | $0           |
| Sécurité       | Travel-Advisory.info                     | $0           |
| **Total**      |                                          | **~$0/mois** |

### Stack Tier 2 — Growth ($300–1 000/mois)

| Besoin              | Solution                    | Coût          |
| ------------------- | --------------------------- | ------------- |
| POIs enrichis       | Foursquare + Google Places  | $59–179/mois  |
| Vols intégrés       | Amadeus production          | $100–500/mois |
| Données hébergement | Partenariat Booking/Amadeus | Variable      |

---

## Contraintes et Risques Critiques

| Contrainte                         | Impact                                | Mitigation                                           |
| ---------------------------------- | ------------------------------------- | ---------------------------------------------------- |
| **Fraîcheur données coût de vie**  | Numbeo peut être obsolète (inflation) | Afficher date de dernière MAJ, croisement Foursquare |
| **Couverture OSM inégale**         | Pays émergents mal couverts           | Basculer sur Foursquare pour ces régions             |
| **Pas d'API hébergement publique** | Coût total voyage incomplet           | Estimation Numbeo + lien Booking                     |
| **Vols coûteux en production**     | Poste budget principal                | Reporter en v2, lien externe en v1                   |
| **Attribution requise**            | OSM impose mention dans l'UI          | Prévoir dans le design                               |
| **Données visa changeantes**       | Mises à jour fréquentes               | Travel Buddy (daily updates) + veille manuelle       |

---

## Sources

- Foursquare Places API — documentation officielle
- Numbeo API — numbeo.com/common/api.jsp
- Open-Meteo Seasonal — open-meteo.com
- Weatherbit Climate Normals — weatherbit.io
- Amadeus Self-Service — developers.amadeus.com
- Travel Buddy AI — travel-buddy.ai/api
- Travel-Advisory.info — travel-advisory.info/data-api
- REST Countries — restcountries.com
- ScrapingBee — Top 5 Flight APIs 2026
- Google Places Billing 2025 — developers.google.com
