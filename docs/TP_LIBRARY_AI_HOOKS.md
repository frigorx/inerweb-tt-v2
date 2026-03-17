# Points d'entrée assistant IA — Bibliothèque TP

## Date : 2026-03-14

---

## 1. Objectif

Préparer les points d'entrée pour que le futur assistant pédagogique puisse interagir avec la bibliothèque TP sans modifier le code existant.

---

## 2. Commandes futures prévues

### 2.1 Analyse de TP
**Commande** : "Analyse ce TP"
**Point d'entrée** : `iwTpLibrary.getAIContext(tpId)`
**Retour** : `{tp, mappings, evalCards, formations}`

L'assistant reçoit la fiche complète du TP avec tous ses mappings et cartes d'évaluation.

### 2.2 Proposition de compétences
**Commande** : "Propose les compétences pour CAP IFCA"
**Point d'entrée** : `iwTpLibrary.getMapping(tpId, 'CAP_IFCA')`
**Retour** : Mapping avec compétences, niveaux attendus, critères

Si le mapping n'existe pas, l'assistant peut en créer un via `iwTpLibrary.addMapping()`.

### 2.3 Correspondances inter-filières
**Commande** : "Montre les correspondances entre CAP, TNE et Bac Pro"
**Point d'entrée** : `iwTpLibrary.generateAllEvalCards(tpId)`
**Retour** : Tableau de cartes d'évaluation, une par formation

### 2.4 Carte d'évaluation
**Commande** : "Génère une carte d'évaluation adaptée"
**Point d'entrée** : `iwTpLibrary.generateEvalCard(tpId, formation)`
**Retour** : Carte prête à remplir

### 2.5 Suggestion de TP par compétence
**Commande** : "Propose 3 TP pour travailler C3.4"
**Point d'entrée** : `iwTpLibrary.suggestForCompetence('C3.4', 'CAP_IFCA', {dureeMax: 180})`
**Retour** : Liste de TP triés par pertinence

### 2.6 TP par durée
**Commande** : "Propose un TP court pour 2h"
**Point d'entrée** : `iwTpLibrary.search({dureeMax: 120})`
**Retour** : TP de moins de 2h

### 2.7 Rattachement séquence
**Commande** : "Rattache ce TP à la séquence S4"
**Point d'entrée** : Ajout dans le mapping via `addMapping()` avec `sequencesSuggerees: ['S4']`

### 2.8 Recherche sémantique
**Commande** : "Trouve un TP sur le brasage"
**Point d'entrée** : `iwTpLibrary.aiSearch({query: 'brasage'})`
**Retour** : TP enrichis avec mappings

---

## 3. Fonctions API disponibles

| Fonction | Usage IA |
|----------|----------|
| `getAIContext(tpId)` | Contexte complet pour analyse |
| `aiSearch(criteria)` | Recherche enrichie |
| `suggestForCompetence(code, formation, constraints)` | Suggestion |
| `generateEvalCard(tpId, formation)` | Carte d'évaluation |
| `generateAllEvalCards(tpId)` | Comparaison inter-filières |
| `getMappings(tpId)` | Correspondances |
| `getById(tpId)` | Fiche TP |
| `search(filters)` | Recherche multicritère |
| `addTp(tp)` | Création TP |
| `addMapping(mapping)` | Ajout correspondance |

---

## 4. Format de prompt pour l'assistant

```
Tu es l'assistant pédagogique INERWEB.
Tu as accès à la bibliothèque TP via les fonctions iwTpLibrary.
Les formations disponibles sont : CAP_IFCA, BAC_MFER, TNE.
Les niveaux sont : 0=NE, 3=NA, 4=EC, 5=M, 6=PM.
Utilise iwLevels pour convertir les niveaux.
```

---

## 5. Prochaines étapes

1. Connecter l'assistant au module `iwTpLibrary`
2. Implémenter le traitement en langage naturel des commandes
3. Ajouter la génération automatique de mappings par l'IA
4. Permettre la création de TP guidée par l'assistant
