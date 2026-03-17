# Registre des activites de traitement
## inerWeb TT-IA — Suivi pedagogique

---

### Identification du traitement

| Champ | Valeur |
|-------|--------|
| **Nom du traitement** | Suivi pedagogique par competences |
| **Responsable** | [NOM ETABLISSEMENT] |
| **Date de creation** | [DATE] |
| **Derniere mise a jour** | [DATE] |

---

### Finalites

1. Suivi de la progression des eleves par competences
2. Gestion des evaluations formatives et CCF
3. Generation des bilans pour le livret scolaire

---

### Base legale

- **Mission d'interet public** (enseignement)
- **Obligation legale** (CCF, livret scolaire)

---

### Categories de donnees

| Categorie | Donnees | Stockage |
|-----------|---------|----------|
| Identite | Nom, prenom | Local chiffre uniquement |
| Scolarite | Classe, groupe | Cloud (pseudonymise) |
| Evaluations | Competences, niveaux | Cloud (pseudonymise) |
| Photos | Travaux d'eleves | Cloud (sans identification) |

---

### Categories de personnes

- Eleves de l'etablissement
- Enseignants utilisateurs

---

### Destinataires

| Destinataire | Donnees recues |
|--------------|----------------|
| Enseignants | Toutes (apres authentification) |
| Google (sous-traitant) | Donnees pseudonymisees uniquement |

---

### Transferts hors UE

| Sous-traitant | Localisation | Garanties |
|---------------|--------------|-----------|
| Google | UE / USA | Clauses contractuelles types |

---

### Durees de conservation

| Donnees | Duree | Justification |
|---------|-------|---------------|
| Identites | Fin annee + 1 mois | Gestion scolarite |
| Evaluations CCF | 6 ans | Obligation legale |
| Photos | 1 an | Usage pedagogique |

---

### Mesures de securite

- [ ] Chiffrement AES-256 des donnees locales
- [ ] Authentification par code PIN
- [ ] Verrouillage automatique apres inactivite
- [ ] Pseudonymisation avant envoi cloud
- [ ] Journal des acces
- [ ] Sauvegarde chiffree

---

### Droits des personnes

- [ ] Procedure d'acces documentee
- [ ] Procedure d'effacement disponible
- [ ] Export des donnees possible
- [ ] Information des usagers effectuee

---

**Signature responsable** : _________________________

**Date** : _________________________
