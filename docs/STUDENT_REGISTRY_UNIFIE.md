# Registre élèves unifié INERWEB

## Date : 2026-03-13
## Version : 1.0

---

## 1. Problème

Deux systèmes indépendants gèrent les élèves :

| Aspect | PROG+ | Édu v4 |
|--------|-------|--------|
| Code | `ELV-001` | `TNE-01` |
| Stockage | localStorage + IDB | IndexedDB seul |
| Groupe | G1 / G2 | A / B |
| Classe | "CAP IFCA 1" | "CAP1 IFCA" |
| Champs | 15+ champs (PFMP, tokens, tél) | 6 champs (base) |

Risque : doublons, données divergentes, évaluations orphelines.

---

## 2. Solution

Un registre unifié `js/shared/student-registry.js` (`window.iwStudents`) qui :
- désigne **PROG+ comme source principale** (codes ELV-xxx) ;
- fusionne les élèves Édu comme **alias** ;
- normalise classes, groupes, noms ;
- dédoublonne par clé composite `NOM|PRENOM|CLASSE` ;
- expose une API unique pour tous les modules.

---

## 3. Schéma élève unifié

```javascript
{
  code: "ELV-001",           // Identifiant canonique (PROG+)
  nom: "DUPONT",             // Majuscules
  prenom: "Martin",          // Mixte
  classe: "CAP IFCA 1",     // Classe PROG+
  groupe: "A",               // Normalisé (A ou B)
  annee: 1,                  // Année scolaire
  statut: "actif",           // actif | absent | abandon
  referentiel: "CAP_IFCA",  // Code formation
  tokenEleve: "ABCD1234",   // Token accès élève
  tokenTuteur: "EFGH5678",  // Token accès tuteur
  telEleve: "",              // Téléphone élève
  telTuteur: "",             // Téléphone tuteur
  pfmp1Sem: 3,               // Semaines PFMP 1
  pfmp2Sem: 3,               // Semaines PFMP 2
  entrepriseNom: "",         // Entreprise stage
  tuteurNom: "",             // Tuteur entreprise
  photo: "",                 // DataURL base64
  source: "prog",            // Origine (prog | edu)
  aliases: ["CAP1-01"]      // Codes alternatifs (Édu)
}
```

---

## 4. Règles de fusion

1. **Matching** : `NOM + PRÉNOM + CLASSE` (normalisés, sans accents, insensible à la casse).
2. **Si match** : l'élève PROG+ est enrichi avec le code Édu comme alias. Photo Édu récupérée si absente côté PROG+.
3. **Si pas de match** : l'élève Édu est créé dans le registre avec source="edu".
4. **Résolution** : `iwStudents.resolve("CAP1-01")` → retourne l'élève PROG+ correspondant via alias.

---

## 5. Normalisation des groupes

| Entrée | Sortie |
|--------|--------|
| A, G1, Groupe A, Groupe 1 | A |
| B, G2, Groupe B, Groupe 2 | B |
| (vide) | "" |

---

## 6. API

| Méthode | Description |
|---------|-------------|
| `iwStudents.init()` | Charger et fusionner les deux sources |
| `iwStudents.getAll()` | Tous les élèves |
| `iwStudents.getByClasse(classe)` | Par classe |
| `iwStudents.resolve(code)` | Résolution code/alias |
| `iwStudents.search(query)` | Recherche nom/prénom |
| `iwStudents.checkDuplicate(nom, prenom, classe)` | Anti-doublon |
| `iwStudents.add(student)` | Ajouter au registre |
| `iwStudents.remove(code)` | Supprimer |
| `iwStudents.count([classe])` | Compter |
| `iwStudents.getClasses()` | Classes distinctes |

---

## 7. Migration recommandée

1. **Court terme** (actuel) : Registre en mémoire, fusion au chargement.
2. **Moyen terme** : Persistance dans IndexedDB `inerweb.students` unifié.
3. **Long terme** : Suppression du localStorage PROG+ pour les élèves.
