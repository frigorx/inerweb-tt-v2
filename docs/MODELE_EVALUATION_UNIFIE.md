# Modèle d'évaluation unifié INERWEB

## Date : 2026-03-13
## Version : 1.0

---

## 1. Principe

Un seul modèle d'évaluation capable de représenter :
- une évaluation rapide terrain (3 taps Édu) ;
- une évaluation structurée par grille (PROG+) ;
- une évaluation PFMP/tuteur ;
- une évaluation CCF certificative.

Le modèle est un **événement immutable** stocké dans l'event log central (`js/core/events.js`).

---

## 2. Structure de l'événement d'évaluation

```javascript
{
  // === Identité événement (auto) ===
  eventId: "evt-xxxxxxxxxxxx",       // UUID unique
  timestamp: "2026-03-13T14:30:00Z", // ISO 8601
  source: "prog" | "edu" | "tuteur", // Origine
  synced: false,                     // État synchronisation

  // === Type ===
  type: "eval.created",              // Type d'événement (voir §4)

  // === Acteur ===
  acteur: "ens-fh",                  // Identifiant évaluateur

  // === Cible ===
  cible: "ELV-001",                  // Code élève unifié

  // === Données d'évaluation ===
  donnees: {
    // --- Obligatoire ---
    competence: "C3.1",              // Code compétence
    niveau: 5,                       // Niveau interne standardisé (0-7)

    // --- Contexte (optionnel) ---
    epreuve: "EP2",                  // Code épreuve (null si hors CCF)
    critere: "",                     // Code critère spécifique
    contexte: "atelier",             // atelier|pfmp1|pfmp2|A|B|C|D|E|dossier
    seanceId: "sea-2026-03-13-...",  // Rattachement séance (null si libre)
    phase: "formatif",               // formatif|certificatif|pfmp|bilan

    // --- Métadonnées (optionnel) ---
    commentaire: "Bon travail...",   // Commentaire court
    evaluateur: "F. Henninot",       // Nom lisible
    tuteurNom: "",                   // Si source=tuteur
    activite: "",                    // Activité professionnelle
    session: "2025-2026",            // Session CCF
    bulk: false                      // Évaluation par lot
  }
}
```

---

## 3. Niveaux internes standardisés

Le système utilise un niveau interne numérique (0-7) avec conversion vers tous les formats d'affichage.

| Interne | Édu (1-4) | PROG+ (lettres) | Libellé long | Libellé court | % |
|---------|-----------|------------------|--------------|---------------|---|
| 0 | NE | NE | Non évalué | NE | 0 |
| 1 | ABS | NE-ABS | Absent | ABS | 0 |
| 2 | — | NE-IMP | Impossible | IMP | 0 |
| 3 | 1 | NA | Non acquis | NA | 0 |
| 4 | 2 | EC | En cours d'acquisition | EC | 35 |
| 5 | 3 | M | Maîtrisé | M | 70 |
| 6 | 4 | PM | Parfaitement maîtrisé | PM | 100 |
| 7 | — | — | Validé (certification) | VAL | 100 |

Voir `js/shared/levels-registry.js` pour l'implémentation.

---

## 4. Types d'événements

| Type | Description | Quand |
|------|-------------|-------|
| `eval.created` | Nouvelle évaluation | Saisie rapide ou grille |
| `eval.updated` | Modification d'évaluation | Correction de niveau |
| `eval.deleted` | Suppression logique | Annulation (soft delete) |
| `eval.level_set` | Niveau attribué (alias simplifié) | 3 taps Édu |
| `eval.comment_added` | Commentaire ajouté/modifié | Observation prof/tuteur |
| `eval.bulk_applied` | Évaluation par lot | Batch multi-élèves |
| `eval.pfmp_recorded` | Évaluation PFMP enregistrée | Tuteur ou prof stage |
| `eval.ccf_recorded` | Évaluation CCF enregistrée | Contexte certificatif |
| `eval.grid_completed` | Grille entièrement remplie | Toutes compétences évaluées |
| `eval.note_generated` | Note calculée automatiquement | Après calcNote() |

---

## 5. Scénarios d'usage

### 5.1 Saisie rapide terrain (3 taps)
```
Événement : eval.level_set
donnees: {
  competence: "C3.1",
  niveau: 5,              // Maîtrisé
  seanceId: "sea-xxx",
  phase: "formatif"
}
```

### 5.2 Grille structurée PROG+
```
Événement : eval.created
donnees: {
  competence: "C3.1",
  niveau: 4,              // En cours
  epreuve: "EP2",
  critere: "",
  contexte: "atelier",
  phase: "formatif",
  evaluateur: "F. Henninot"
}
```

### 5.3 Évaluation PFMP
```
Événement : eval.pfmp_recorded
donnees: {
  competence: "C4.1",
  niveau: 5,
  epreuve: "EP3",
  contexte: "pfmp1",
  phase: "pfmp",
  tuteurNom: "Jean Martin",
  commentaire: "Autonome sur la mise au vide"
}
```

### 5.4 Évaluation CCF
```
Événement : eval.ccf_recorded
donnees: {
  competence: "C3.1",
  niveau: 6,
  epreuve: "EP2",
  contexte: "A",
  phase: "certificatif",
  session: "2025-2026",
  evaluateur: "F. Henninot"
}
```

---

## 6. Projections

À partir des événements, on reconstruit :

| Projection | Clé | Valeur |
|------------|-----|--------|
| Dernier niveau | `eleve|competence` | Dernier niveau attribué |
| Dernier niveau par épreuve | `eleve|epreuve|competence` | Idem, scoped épreuve |
| Historique compétence | `eleve|competence` | Liste triée de tous les niveaux |
| Progression classe | `classe` | % compétences évaluées par élève |
| CCF validé | `eleve|competence` | Compteur niveaux ≥ 5 |
| Note épreuve | `eleve|epreuve` | Note /20 calculée |

---

## 7. Compatibilité

### 7.1 Rétro-compatibilité PROG+
Le pont `events-bridge.js` traduit chaque `apiCall({action:'saveValidation', ...})` en événement `eval.created` avec les champs PROG+ mappés.

### 7.2 Rétro-compatibilité Édu
Le module `eval-engine.js` expose `assignLevel(eleveId, compCode, seanceId, niveau)` qui crée un `eval.level_set` et met à jour le cache compatible Édu.

### 7.3 Rétro-compatibilité Tuteur
Le module `eval-engine.js` expose `recordPfmp(eleveId, compCode, niveau, pfmpNum, tuteurNom, commentaire)` qui crée un `eval.pfmp_recorded`.

---

## 8. Fichiers du modèle

| Fichier | Rôle |
|---------|------|
| `js/shared/levels-registry.js` | Table de niveaux + conversions |
| `js/eval/eval-engine.js` | Moteur d'évaluation unifié |
| `js/eval/eval-projections.js` | Projections CQRS depuis event log |
| `js/eval/eval-ui.js` | Composants UI d'évaluation |
| `js/core/events.js` | Event log (existant, étendu) |
| `js/core/events-bridge.js` | Pont PROG+ → events (existant) |
