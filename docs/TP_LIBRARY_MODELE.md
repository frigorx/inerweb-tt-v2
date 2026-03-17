# Modèle universel du TP — INERWEB

## Date : 2026-03-14

---

## 1. Principe

Un TP est un **objet pédagogique neutre** : il décrit une activité technique sans être rattaché à un référentiel. Le rattachement aux compétences est fait via les **mappings référentiels** (voir TP_REFERENTIEL_MAPPINGS.md).

---

## 2. Schéma du TP

```javascript
{
  // Identité
  id: "TP-001",                    // Identifiant unique
  titre: "Brasage fort...",        // Titre principal
  sousTitre: "Initiation...",      // Sous-titre (optionnel)
  description: "Réalisation...",   // Description complète
  version: "1.0",                  // Version du TP
  statut: "valide",                // brouillon | valide | archive
  auteur: "F. Henninot",           // Auteur / source

  // Classification
  theme: "brasage",                // Thème technique
  type: "atelier",                 // atelier | technologie | securite | mesures |
                                   // electro | remediation | pfmp | autre
  difficulte: 2,                   // 1 (facile) à 3 (difficile)
  tags: ["brasage", "cuivre"],     // Tags libres pour recherche

  // Logistique
  duree: 240,                      // Durée estimée en minutes
  materiel: ["Poste brasage",...], // Liste matériel nécessaire
  prerequisMateriels: [...],       // Prérequis matériels obligatoires

  // Contenu pédagogique
  operations: [                    // Étapes du TP (ordonnées)
    "Préparation tubes",
    "Brasage fort argent",
    ...
  ],
  variantes: [                     // Variantes possibles
    "Version simplifiée : ...",
    "Version avancée : ..."
  ],
  remarquesPedago: "Insister...",  // Notes pour l'enseignant
  observationsUsage: "Durée...",   // Retours d'expérience

  // Partage
  scope: "common",                 // common | private
  owner: "",                       // Propriétaire si private
  provenance: ""                   // Source si partagé
}
```

---

## 3. Thèmes disponibles

| Thème | Description |
|-------|------------|
| brasage | Brasage fort, soudure, mise en forme |
| mise-en-service | Tirage au vide, charge, mise en route |
| electricite | Câblage, raccordement, mesures électriques |
| controle | Étanchéité, conformité, vérifications |
| mesures | Pressions, températures, Mollier |
| diagnostic | Pannes, dépannage, méthodologie |
| securite | EPI, consignes, prévention |
| technologie | Schémas, composants, théorie appliquée |
| maintenance | Préventive, corrective, remplacement |

---

## 4. Types de TP

| Type | Description |
|------|------------|
| atelier | Travail pratique en atelier |
| technologie | TD / cours appliqué |
| securite | Sensibilisation sécurité |
| mesures | Relevés et calculs |
| electro | Électrotechnique |
| remediation | Rattrapage / renforcement |
| pfmp | Activité PFMP / stage |

---

## 5. Niveaux de difficulté

| Niveau | Description | Public cible |
|--------|------------|-------------|
| 1 | Facile — découverte | 2nde TNE, CAP 1ère année |
| 2 | Intermédiaire — application | CAP 1ère/2ème année, Bac Pro |
| 3 | Avancé — autonomie | CAP 2ème année, Bac Pro Term |

---

## 6. Fichier de données

`data/tp-library/catalogue.json` — Catalogue complet des TP universels.

Structure :
```json
{
  "_meta": { "version": "1.0", ... },
  "tps": [ { ... }, { ... } ]
}
```
