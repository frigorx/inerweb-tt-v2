# Analyse des systèmes d'évaluation existants

## Date : 2026-03-13
## Branche : convergence/inerweb-core

---

## 1. État des lieux

### 1.1 Système Édu v4 — Évaluation rapide "3 taps"

**Principe** : Saisie terrain ultra-rapide en 3 gestes :
1. Sélectionner un ou plusieurs élèves (tap sur carte)
2. Sélectionner une compétence
3. Attribuer un niveau (bouton 1/2/3/4/NE/ABS)

**Niveaux** :
| Code | Libellé | Couleur |
|------|---------|---------|
| 1 | Non maîtrisé | Rouge |
| 2 | Insuffisant | Ambre |
| 3 | Maîtrisé | Vert |
| 4 | Parfaitement maîtrisé | Bleu |
| NE | Non évalué | Gris |
| ABS | Absent | Gris clair |

**Stockage** : IndexedDB `inerwebEdu`, store `events`
```
{eventId, timestamp, type:'competence.evaluee', acteur, cible:eleveId,
 donnees:{competenceCode, seanceId, niveau}, synced}
```

**Cache mémoire** : `_evalCache["eleveId|compCode|seanceId"] = niveau`

**Backend** : `pushEvents()` batch → Google Apps Script EventLog

**CCF** : Compétence validée si niveau 3 ou 4 atteint au moins 3 fois.

---

### 1.2 Système PROG+ — Grilles par compétences

**Principe** : Évaluation structurée par épreuve, compétence, critère, contexte.

**Niveaux** :
| Code | Libellé | % |
|------|---------|---|
| NE | Non Évalué | 0 |
| NA | Non Acquis | 0 |
| EC | En Cours | 35 |
| M | Maîtrisé | 70 |
| PM | Parfaitement Maîtrisé | 100 |
| NE-ABS | Absent | 0 |
| NE-IMP | Impossible | 0 |
| NE-NON | Non présenté | 0 |
| NE-REF | Refus élève | 0 |

**Stockage** : `validations[code] = [{epreuve, competence, critere, niveau, evaluateur, timestamp, phase, contexte}]`

**Persistance** : localStorage `inerweb-tt-fe-v1` + IndexedDB optionnel

**Backend** : `apiCall({action:'saveValidation', eleve, data})` → CRUD unitaire

**Calcul note** : Somme pondérée (poids × coef_obligatoire) → note /20

---

### 1.3 Système Tuteur — Évaluation PFMP

**Principe** : Tuteur entreprise évalue via interface dédiée.

**Structure** :
```
pfmpData[code].evalTuteur.pfmp1 = {
  competences: {"C3.1": "M", ...},
  observations: {"C3.1": "Très bon travail..."},
  appreciation: "Texte général...",
  criteres: {assiduite: 4, initiative: 3, ...},
  date, tuteurNom, validee
}
```

**Niveaux tuteur** : NE / EC / M / PM (pas de NA, pas de NE-*)

**Intégration** : `integrerDansGrille()` → pousse chaque compétence dans EP2 via `pushVal()`

---

## 2. Doublons identifiés

| Aspect | Édu v4 | PROG+ | Impact |
|--------|--------|-------|--------|
| Stockage évaluations | IndexedDB events | localStorage validations[] | Données dupliquées |
| Cache niveaux | `_evalCache` | `getLv()` sur validations[] | Deux sources de vérité |
| Calcul progression | Comptage niveaux 3/4 | `getProgress()` via getFiliere | Résultats différents |
| Compétences | Constante SEQUENCES | Constante FILIERES.comps | Codes identiques, structures différentes |
| Backend sync | pushEvents batch | apiCall unitaire | Deux flux parallèles |
| Photos | IndexedDB store photos | Google Drive (non implémenté) | Pas de sync |

## 3. Différences de logique

### 3.1 Granularité
- **Édu** : Évaluation = (élève, compétence, séance, niveau). Pas de critère, pas de contexte.
- **PROG+** : Évaluation = (élève, épreuve, compétence, critère, niveau, contexte, phase, évaluateur).

### 3.2 Validation
- **Édu** : Compétence CCF validée si niveau ≥ 3 atteint 3 fois.
- **PROG+** : Note calculée par pondération. Clôture manuelle. Compétence verrouillable.

### 3.3 Temporalité
- **Édu** : Rattachée à une séance (date + horaire + classe).
- **PROG+** : Timestamp libre. Pas de concept de séance.

### 3.4 Traçabilité
- **Édu** : Event-sourcing natif. Immutable. Tout l'historique est conservé.
- **PROG+** : Array de validations. Dernière valeur = `sort(timestamp).desc[0]`.

## 4. Incompatibilités

| Incompatibilité | Détail | Criticité |
|-----------------|--------|-----------|
| Niveaux numériques vs lettres | 1/2/3/4 vs NE/NA/EC/M/PM | Haute |
| Pas de concept d'épreuve dans Édu | Édu = compétence seule, PROG+ = épreuve.compétence | Haute |
| Pas de critères dans Édu | PROG+ a CRIT_EP2, CRIT_EP3 avec sous-critères | Moyenne |
| Pas de séance dans PROG+ | Édu rattache chaque évaluation à une séance | Moyenne |
| IndexedDB vs localStorage | Deux stores incompatibles | Haute |
| Identifiants élèves | ELV-001 vs TNE-01 | Haute |
| Groupes | G1/G2 vs A/B | Basse |

## 5. Opportunités d'unification

1. **Event-sourcing pour tout** : PROG+ peut migrer vers des événements immutables (déjà amorcé via events-bridge.js).

2. **Table de niveaux commune** : Un registre unique avec conversions bidirectionnelles.

3. **Modèle d'évaluation extensible** : Un événement `eval.*` unique capable de porter épreuve, critère, contexte, séance (tous optionnels).

4. **Séance comme contexte** : PROG+ peut enrichir ses évaluations avec un rattachement séance.

5. **Projections CQRS** : Reconstruire `validations[]` et `_evalCache` depuis les mêmes événements.

6. **Registre élèves unique** : Un seul système source avec résolution d'alias.

7. **Radar unifié** : Les deux systèmes alimentent le même radar via une projection commune.
