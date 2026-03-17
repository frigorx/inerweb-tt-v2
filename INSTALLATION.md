# inerWeb TT — Filiere Energetique
# Guide d'installation et de configuration

## Version
- **Date** : 2026-03-14
- **Version frontend** : 7.3.0
- **Version backend** : 3.0.0

---

## Prerequis OBLIGATOIRES

### Serveur HTTP(S)
**INERWEB ne fonctionne PAS en ouvrant simplement les fichiers HTML.**

Vous devez utiliser un serveur web :
- **Local** : `python -m http.server 8080` ou Live Server (VS Code)
- **Hebergement** : GitHub Pages, Netlify, serveur etablissement

### Connexion internet
Pour la version actuelle, une connexion internet est necessaire pour :
- Les exports PDF (jsPDF via CDN)
- Les exports Excel (SheetJS via CDN)
- La generation de QR codes (QRCode.js via CDN)
- La communication avec le backend Google Apps Script

### Navigateur moderne
Chrome, Firefox, Edge ou Safari recent.

---

## Configuration

### 1. Fichier de configuration centralise

Modifier `js/core/inerweb.config.js` :

```javascript
API_URL: 'https://script.google.com/macros/s/VOTRE_ID/exec',
API_KEY: 'votre_cle',
BASE_URL: 'https://votre-domaine.fr/inerweb/',
```

Ce fichier est **le seul a modifier** pour configurer une instance.

### 2. Deployer le backend

1. Aller sur https://script.google.com/
2. Creer un nouveau projet
3. Copier le contenu de `backend/Code_edu_v3.0.0.gs`
4. Proprietes du script : configurer `API_KEY` et `ADMIN_KEY`
5. Executer `setupSpreadsheet()` pour creer les onglets
6. Deployer > Nouveau deploiement > Application Web
7. Copier l'URL dans `js/core/inerweb.config.js`

### 3. Tester

Ouvrir `index.html` via votre serveur web et verifier :
- [ ] Pas d'erreur dans la console
- [ ] L'onglet "Seances" charge
- [ ] L'ajout d'eleve fonctionne
- [ ] Les tests passent : `tests/smoke-test.html` (300 tests)

---

## Structure du projet

### Pages HTML (frontend)
| Fichier | Role |
|---------|------|
| index.html | Page d'accueil / portail d'entree |
| inerweb_prof.html | Interface professeur (principale) |
| inerweb_tuteur.html | Interface tuteur entreprise |
| inerweb_eleve.html | Interface eleve |
| inerweb_admin.html | Interface administration |
| tp-library.html | Bibliotheque de TP |
| ccf-bilan.html | Bilan CCF imprimable |
| aide.html | Page d'aide generale |
| aide_tuteur.html | Guide tuteur interactif |

### Modules JavaScript (js/)

#### Core (js/core/)
| Fichier | Role |
|---------|------|
| inerweb.config.js | Configuration centralisee (MODIFIER ICI) |
| api.js | Appels API vers le backend |
| events.js | Event-sourcing (journal immuable) |
| events-bridge.js | Bridge Edu / PROG+ |
| sync-unified.js | Synchronisation unifiee |
| core.js | Utilitaires partages (esc, toast, etc.) |
| state.js | Gestion de l'etat global |
| utils.js | Fonctions utilitaires |

#### Evaluation (js/eval/)
| Fichier | Role |
|---------|------|
| eval-engine.js | Moteur d'evaluation |
| eval-projections.js | Projections CQRS |
| eval-ui.js | Composants UI evaluation |
| eval-exports.js | Exports (notes, bilans, CSV) |

#### TP (js/tp/)
| Fichier | Role |
|---------|------|
| tp-library.js | Catalogue et recherche TP |
| tp-explorer-ui.js | Interface d'exploration TP |
| tp-eval-modal.js | Modale d'evaluation TP |
| tp-form.js | Formulaire creation/edition TP |

#### Autres modules
| Fichier | Role |
|---------|------|
| js/radar/radar-unified.js | Radar SVG 3 couches |
| js/progression/progression-grid.js | Grille de progression |
| js/export/pdf-export.js | Export PDF natif (jsPDF) |
| js/shared/levels-registry.js | Registre de niveaux |
| js/shared/student-registry.js | Registre eleves |
| js/shared/classes-registry.js | Registre classes |

### Backend
| Fichier | Role |
|---------|------|
| backend/Code_edu_v3.0.0.gs | Backend Google Apps Script v3.0.0 |
| backend/Code_edu_v2.5.1.gs | Archive backend v2.5.1 |

### Tests
| Fichier | Role |
|---------|------|
| tests/smoke-test.html | 300 tests de fumee (ouvrir dans le navigateur) |

---

## GitHub

**Depot** : https://github.com/frigorx/inerweb-tt-fe

---

## Filieres supportees
- **CAP IFCA** : Installateur en Froid et Conditionnement d'Air (EP2 + EP3)
- **Bac Pro MFER** : Metiers du Froid et des Energies Renouvelables (E31 + E32 + E33)
- **2nde TNE** : Transition Numerique et Energetique (modules CT)

---

## Problemes courants

### "Les donnees ne chargent pas"
Verifiez que vous utilisez un serveur HTTP, pas `file://`

### "API non configuree"
Modifiez `js/core/inerweb.config.js` avec votre URL Apps Script

### "Token invalide" pour eleve/tuteur
Regenerez les tokens via l'interface prof (onglet Eleves > Generer tokens)

### "Erreur de connexion"
Verifiez votre connexion internet et que l'URL API est correcte dans la config

---

*Document mis a jour le 2026-03-14 — INERWEB v7.3.0*
