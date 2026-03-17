# Bibliothèque commune / privée — INERWEB

## Date : 2026-03-14

---

## 1. Deux niveaux de bibliothèque

### Bibliothèque commune (`scope: "common"`)
- TP partagés à l'échelle de la filière
- Disponibles pour tous les enseignants
- Stockés dans `data/tp-library/catalogue.json`
- Versionnés dans le dépôt Git
- Non modifiables sans validation

### Bibliothèque privée (`scope: "private"`)
- TP créés par l'enseignant pour son usage
- Stockés dans `localStorage` (`iw-tp-catalogue`)
- Non partagés par défaut
- Modifiables librement

---

## 2. Champs liés au partage

```javascript
{
  scope: "common" | "private",      // Niveau de partage
  owner: "ens-fh",                   // Propriétaire (si private)
  provenance: "adaptation TP-001",   // Source d'origine (si adapté)
  statut: "brouillon" | "valide" | "archive"
}
```

---

## 3. Cycle de vie

```
Création privée (brouillon)
  ↓
Validation privée (valide)
  ↓
Proposition de partage (futur)
  ↓
Publication commune (commun + valide)
```

---

## 4. Actions prévues (futur)

| Action | Description | État |
|--------|-------------|------|
| Créer un TP privé | Via interface ou assistant | Prévu |
| Dupliquer un TP commun | Copie en privé pour adaptation | Prévu |
| Proposer un TP au partage | Soumettre pour validation | Futur |
| Publier un TP | Passer de private à common | Futur |
| Archiver un TP | Retirer sans supprimer | Prévu |

---

## 5. Implémentation actuelle

- `iwTpLibrary.addTp(tp)` — Ajoute un TP (scope par défaut = private)
- `iwTpLibrary.saveLocal()` — Sauvegarde privée dans localStorage
- `iwTpLibrary.loadPrivate()` — Charge les TP privés au démarrage
- `iwTpLibrary.search({scope: 'common'})` — Filtrer par scope
