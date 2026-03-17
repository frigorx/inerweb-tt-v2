# Analyse des TP existants — INERWEB

## Date : 2026-03-14
## Phase 3 — Bibliothèque TP universelle

---

## 1. État des lieux

### 1.1 Modules TP existants

| Module | Lignes | Rôle | Format |
|--------|--------|------|--------|
| `js/tp-manager.js` | 414 | Création/gestion de sessions TP | Objet activité (ACT-nnn) |
| `js/activites.js` | 1156 | Évaluation inline par critères | Grille NE/NA/EC/M/PM |
| `js/exposition.js` | 137 | % d'exposition (opportunités réalisées) | Calcul sur COMP+CRIT |
| `js/tache-complexe.js` | 146 | Rattrapage oral EP2 CCF | Structure pfmpData |

### 1.2 Structures de données actuelles

**Activité TP** (tp-manager.js) :
```
{id, titre, date, type, epreuve, epreuves, competences,
 compsEpreuves, phasesEleves, phasesElevesComps,
 evaluateur, phase, eleves, photos, docsEleve, docsProf,
 avecCorrection, obs}
```

**Séance Édu** (edu/index.html) :
```
{id, classe, type, date, horaire, sequence, contenu, competences}
```

**Séquence** (formations.json + SEQUENCES) :
```
{id, nom, comps}
```

### 1.3 Ce qui existe comme TP/ressources

Il n'existe **pas de bibliothèque TP proprement dite**. Les TP sont créés à la volée comme des "activités" rattachées à :
- une date
- une épreuve
- des compétences
- des élèves

Les TP ne sont pas des objets réutilisables : chaque session crée une nouvelle activité, même si le TP est identique.

### 1.4 Compétences et référentiels

| Formation | Épreuves | Nb compétences | Critères |
|-----------|----------|---------------|----------|
| CAP IFCA | EP2 (9), EP3 (9) | 18 | ~60 critères |
| Bac Pro MFER | E31 (12), E32 (9), E33 (5) | 26 | ~80 critères |
| 2nde TNE | Modules CT (8) | 8 | Pas de critères |
| PFMP | CP (8) | 8 | Pas de critères |

---

## 2. Formats rencontrés

| Format | Usage | Limites |
|--------|-------|---------|
| Activité (ACT-nnn) | Session TP en cours | Non réutilisable, lié à une date |
| Séance (sea-xxx) | Planning Édu | Pas de contenu TP détaillé |
| Séquence (S1-S4) | Progression | Pas de détail TP |
| Compétence (Cx.x) | Évaluation | Pas de lien avec ressource TP |

---

## 3. Doublons

- Les constantes de compétences sont dupliquées entre `inerweb_prof.html` et `data/formations.json`.
- Les séquences sont dupliquées entre `edu/index.html` (SEQUENCES) et `formations.json`.
- Les niveaux sont dupliqués entre plusieurs modules (résolu par `levels-registry.js`).

---

## 4. Manques identifiés

1. **Pas de catalogue TP** : chaque TP est recréé à chaque usage.
2. **Pas de fiche TP** : pas de description détaillée, matériel, durée, prérequis.
3. **Pas de réutilisation inter-filières** : un TP brasage en CAP ne peut pas être réutilisé en TNE.
4. **Pas de variantes** : un même TP ne peut pas avoir une version simplifiée ou avancée.
5. **Pas de recherche** : impossible de trouver un TP par thème ou compétence.
6. **Pas de partage** : impossible de partager un TP entre collègues.
7. **Pas de lien TP ↔ séquence** : le rattachement à la progression est manuel.

---

## 5. TP réutilisables entre filières

Les thèmes techniques communs à CAP IFCA, 2nde TNE et Bac Pro MFER :

| Thème TP | CAP IFCA | 2nde TNE | Bac Pro MFER |
|----------|----------|----------|-------------|
| Brasage fort | EP2 C3.4 | CT.3 Outillage | E31 C3.3 |
| Tirage au vide | EP3 C4.1 | — | E31 C4.1 |
| Charge en fluide | EP3 C4.2 | — | E31 C4.2 |
| Contrôle étanchéité | EP2 C3.9 / EP3 C4.3 | — | E31 C4.3 |
| Câblage électrique | EP2 C3.6 | CT.4 Câblage | E31 C3.5 |
| Lecture de schéma | — | CT.5 Schéma | E32 C5.1 |
| Mesures frigorifiques | EP3 C4.5 | CT.6 Mesures | E32 C5.3 |
| Sécurité EPI | — | CT.2 Sécurité | — |
| Tri déchets | EP2 C3.8 | CT.8 Environnement | E31 C3.8 |

---

## 6. Éléments à reprendre immédiatement

1. Les 18+26+8 = 52 compétences des 3 filières comme base de mapping.
2. Les critères d'évaluation (CRIT_EP2, CRIT_EP3, CRIT_E31, etc.) comme guide de grille.
3. Les situations EP3 (A/B/C) et E32/E33 (A/B/C/D/E) comme contextes de TP.
4. Les types d'activité (TP, TD, cours, interro, eval, autre).
5. Les 9 séquences (S1-S4 par formation) comme cibles de rattachement.

---

## 7. Éléments à documenter pour plus tard

1. Import de TP depuis fichiers externes (PDF, Word).
2. Intégration de médias (vidéos, photos de montage).
3. Système de notation automatique basé sur les critères.
4. Historique d'utilisation des TP (quand, par qui, avec quels résultats).
5. Suggestion automatique de TP par l'assistant IA.
