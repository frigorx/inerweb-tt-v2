# Documentation RGPD — inerWeb TT-IA

## 1. Architecture de protection des donnees

### Principe : Pseudonymisation

Les donnees des eleves (noms, prenoms) ne quittent **jamais** votre appareil.
Seuls des **codes pseudonymes** (ex: ELV-A7K3) sont transmis aux services cloud.

```
VOTRE APPAREIL                           CLOUD (Google)
===============                          ==============
Noms reels --> Chiffrement AES-256
              |                          Codes uniquement
              +---> Codes ============>  ELV-A7K3, C3.4, M
```

### Protection locale

- **Chiffrement AES-256-GCM** de la table de correspondance
- **Code PIN** obligatoire pour acceder a l'application
- **Verrouillage automatique** apres 5 minutes d'inactivite
- **Limitation des tentatives** (5 essais, puis blocage 5 min)

---

## 2. Durees de conservation

| Donnees | Duree | Justification |
|---------|-------|---------------|
| Identites eleves | 13 mois | Fin annee scolaire + 1 mois |
| Evaluations CCF | 6 ans | Obligation legale |
| Journal d'acces | 1 an | Audit securite |
| Photos de travaux | 1 an | Usage pedagogique |

Une verification automatique est proposee chaque mois.

---

## 3. Droits des personnes

### Droit d'acces
L'eleve (ou son representant legal) peut demander l'export de ses donnees.
-> Menu **Config > RGPD > Exporter donnees eleve**

### Droit a l'effacement
Suppression complete d'un eleve et de toutes ses evaluations.
-> Menu **Config > RGPD > Supprimer eleve**

### Droit a la portabilite
Export en format JSON standard.
-> Menu **Config > RGPD > Export complet**

---

## 4. Sous-traitance (Google)

### Services utilises
- Google Sheets (stockage evaluations pseudonymisees)
- Google Drive (stockage fichiers TP)
- Google Apps Script (API backend)

### Garanties
- Donnees pseudonymisees uniquement (pas d'identification directe)
- Contrat Google Workspace conforme art. 28 RGPD
- Donnees hebergees en UE (selon configuration)

---

## 5. Procedure perte/vol d'appareil

En cas de perte ou vol de votre telephone/ordinateur :

1. **Changez immediatement** votre mot de passe Google
2. **Revoquez les acces** dans les parametres Google
3. **Prevenez l'etablissement** (DPO si applicable)
4. **Sur un nouvel appareil** : recreer un nouveau PIN

La table de correspondance chiffree sur l'ancien appareil
sera inutilisable sans le PIN.

---

## 6. Contact

**Responsable de traitement** : [Votre etablissement]
**DPO** : [Contact DPO si applicable]
**Developpeur** : Franck Henninot
