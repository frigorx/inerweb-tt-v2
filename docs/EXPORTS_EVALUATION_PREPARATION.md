# Préparation des exports d'évaluation

## Date : 2026-03-13
## Version : 1.0

---

## 1. Objectif

Préparer une base propre pour l'export des évaluations unifiées vers :
- École Directe (texte formaté) ;
- Excel (grilles et synthèses) ;
- PDF (bilans et rapports) ;
- Bilan PFMP ;
- Synthèse conseil de classe.

---

## 2. Points d'entrée existants

| Module | Fichier | Fonction | État |
|--------|---------|----------|------|
| Export Excel | `js/export-excel.js` | `exportModule.exportAll()` | Fonctionnel |
| Export PDF | `js/rapport-pdf.js` | Export rapport | Fonctionnel |
| Texte ÉD (Édu) | `edu/index.html` | `genED(seance)` | Fonctionnel |
| Export backup | `js/export-mod.js` | Backup/restore | Fonctionnel |

---

## 3. Nouveaux exports à préparer

### 3.1 Export notes unifiées

**Source** : `iwEvalProjections.getNote(eleveId, epreuve)` + `iwEvalProjections.getLastLevel()`

**Format cible** :
```
Classe | Élève | Épreuve | Note/20 | Éligibilité | % progression | Détail par compétence
```

**Point d'entrée** : `js/eval/eval-exports.js` → `iwEvalExports.exportNotes(classe, epreuves)`

### 3.2 Export appréciations

**Source** : `iwEvalProjections.getHistory()` + `iwEvalProjections.getComment()`

**Format cible** :
```
Élève : {nom prenom}
Compétences évaluées : X / Y
Points forts : {compétences niveau >= M}
Points à améliorer : {compétences niveau <= EC}
Appréciation : {commentaires compilés}
```

**Point d'entrée** : `iwEvalExports.exportAppreciations(classe)`

### 3.3 Export École Directe (unifié)

**Source** : Fusion de `genED()` (Édu) et données PROG+.

**Format cible** : Texte brut copiable, structuré par séance/épreuve.

**Point d'entrée** : `iwEvalExports.exportEcoleDirecte(eleveId, periode)`

### 3.4 Bilan PFMP

**Source** : `iwEvalProjections` filtré par `phase === 'pfmp'`

**Format cible** :
```
Élève | Entreprise | Tuteur | PFMP | Compétences | Niveaux | Appréciations
```

**Point d'entrée** : `iwEvalExports.exportBilanPFMP(classe)`

### 3.5 Synthèse conseil de classe

**Source** : `iwEvalProjections.getClasseProgression()` + `iwEvalProjections.getClasseRadarData()`

**Format cible** :
```
Classe : {nom}
Effectif : {n}
Progression moyenne : {x}%
Compétences les mieux maîtrisées : ...
Compétences en difficulté : ...
Élèves en alerte : ...
```

**Point d'entrée** : `iwEvalExports.exportSyntheseClasse(classe)`

---

## 4. Module d'export unifié

Fichier : `js/eval/eval-exports.js`

| Fonction | Description | État |
|----------|-------------|------|
| `exportNotes(classe, epreuves)` | Export CSV notes | Structure prête |
| `exportAppreciations(classe)` | Export texte appréciations | Structure prête |
| `exportEcoleDirecte(eleveId, periode)` | Texte ÉD formaté | Structure prête |
| `exportBilanPFMP(classe)` | Export CSV bilan PFMP | Structure prête |
| `exportSyntheseClasse(classe)` | Export texte synthèse | Structure prête |
| `generateCSV(headers, rows)` | Utilitaire CSV | Implémenté |
| `downloadFile(content, filename, type)` | Utilitaire téléchargement | Implémenté |

---

## 5. Architecture

```
iwEvalProjections (données)
     │
     ▼
iwEvalExports (formattage)
     │
     ├── CSV → download
     ├── Texte → clipboard / download
     └── JSON → backup
```

Les exports existants (`export-excel.js`, `rapport-pdf.js`) restent fonctionnels.
Le nouveau module les complète sans les remplacer.

---

## 6. Prochaines étapes

1. Finaliser `eval-exports.js` avec les formateurs complets.
2. Connecter au bouton export dans l'interface prof.
3. Ajouter le format Excel (via SheetJS si disponible).
4. Ajouter l'export PDF (via jsPDF si disponible).
