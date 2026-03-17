# Correspondances TP ↔ Référentiels — INERWEB

## Date : 2026-03-14

---

## 1. Principe

Un même TP peut être utilisé dans plusieurs formations avec des **compétences et niveaux différents**. Le mapping fait le lien entre :
- le TP (objet neutre) ;
- la formation (CAP IFCA, Bac Pro MFER, 2nde TNE) ;
- les compétences concernées ;
- le niveau attendu ;
- le contexte d'évaluation ;
- les critères spécifiques.

---

## 2. Schéma du mapping

```javascript
{
  tpId: "TP-001",              // Référence TP
  formation: "CAP_IFCA",       // Code formation
  annee: [1, 2],               // Années concernées
  epreuve: "EP2",              // Épreuve (null si hors CCF)
  competences: [
    {
      code: "C3.4",            // Code compétence
      niveauAttendu: 5,        // Niveau interne (0-7)
      contexte: "atelier",     // Contexte (atelier, pfmp1, A, B, C, D, E, dossier)
      criteres: [              // Critères d'évaluation spécifiques
        "Brasage fort étanche",
        "Dudgeon/Flare conformes"
      ]
    }
  ],
  sequencesSuggerees: ["S4"],  // Séquences où rattacher
  dureeAdaptee: 240,           // Durée adaptée à la formation
  remarques: "..."             // Notes spécifiques formation
}
```

---

## 3. Exemple : TP-001 Brasage fort

| Formation | Épreuve | Compétences | Niveau attendu | Durée |
|-----------|---------|-------------|---------------|-------|
| CAP IFCA | EP2 | C3.4, C3.1, C3.8 | M (5) | 4h |
| 2nde TNE | — | CT.3, CT.2 | EC (4) | 3h |
| Bac Pro MFER | E31 | C3.3, C3.1 | M (5) | 3h |

Le TP est le même, mais :
- en **CAP** : on évalue le brasage (EP2 C3.4) avec 4 critères atelier ;
- en **TNE** : on évalue la découverte outillage (CT.3), niveau EC suffit ;
- en **Bac Pro** : on évalue les raccordements (E31 C3.3), exigence plus élevée.

---

## 4. Fichier de données

`data/tp-mappings/mappings.json`

---

## 5. API

| Fonction | Description |
|----------|-------------|
| `iwTpLibrary.getMappings(tpId)` | Tous les mappings d'un TP |
| `iwTpLibrary.getMapping(tpId, formation)` | Mapping pour une formation |
| `iwTpLibrary.getFormationsForTp(tpId)` | Formations disponibles |
| `iwTpLibrary.getTpsForCompetence(code, formation)` | TP par compétence |
| `iwTpLibrary.getTpsForSequence(seqId, formation)` | TP par séquence |
