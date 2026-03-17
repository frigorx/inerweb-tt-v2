# Génération de cartes d'évaluation — INERWEB

## Date : 2026-03-14

---

## 1. Principe

À partir d'un TP et d'une formation, le système génère automatiquement une **carte d'évaluation** contenant les compétences, critères, et niveaux attendus adaptés au contexte.

---

## 2. Processus de génération

```
TP (catalogue) + Formation (mapping) → Carte d'évaluation
```

1. Récupérer le TP depuis le catalogue
2. Récupérer le mapping pour la formation
3. Pour chaque compétence du mapping :
   - Extraire le code et le niveau attendu
   - Extraire les critères spécifiques
   - Préparer les champs de saisie (niveauObservé, commentaire)

---

## 3. Structure de la carte générée

```javascript
{
  tpId: "TP-001",
  tpTitre: "Brasage fort sur circuit cuivre",
  tpSousTitre: "...",
  formation: "CAP_IFCA",
  epreuve: "EP2",
  duree: 240,
  remarques: "TP fondamental du CAP",
  sequencesSuggerees: ["S4"],
  competences: [
    {
      code: "C3.4",
      niveauAttendu: 5,          // Maîtrisé
      niveauAttenduLabel: "Maîtrisé",
      contexte: "atelier",
      criteres: [
        { libelle: "Brasage fort étanche", niveauObserve: 0 },
        { libelle: "Dudgeon/Flare conformes", niveauObserve: 0 }
      ],
      niveauObserve: 0,          // À remplir par l'évaluateur
      commentaire: ""            // Commentaire libre
    }
  ]
}
```

---

## 4. API

| Fonction | Description |
|----------|-------------|
| `iwTpLibrary.generateEvalCard(tpId, formation)` | Génère une carte pour une formation |
| `iwTpLibrary.generateAllEvalCards(tpId)` | Génère les cartes pour toutes les formations |
| `iwTpLibrary.submitEvalCard(card, eleveId, opts)` | Enregistre les évaluations dans l'event log |

---

## 5. Compatibilité moteur d'évaluation

La carte générée est compatible avec `iwEval.grid()` :
- Chaque compétence évaluée → un événement `eval.created`
- Source = `'tp-library'`
- Épreuve, contexte, phase transmis automatiquement
- Enregistrement dans l'event log pour projections et radar

---

## 6. Flux d'utilisation

```
1. Enseignant ouvre la bibliothèque TP
2. Sélectionne un TP
3. Choisit la formation (CAP / Bac Pro / TNE)
4. Carte d'évaluation générée automatiquement
5. Pour chaque élève :
   a. Évalue les compétences (boutons niveau)
   b. Ajoute commentaire si besoin
6. Soumet → événements dans l'event log
7. Projections mises à jour (radar, progression, alertes)
```
