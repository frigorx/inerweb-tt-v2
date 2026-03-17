# Audit technique — INERWEB PROG+ v5.2
## Date : 2026-03-13

### Architecture réelle
- Monolithe principal : inerweb_prof.html (~4100 lignes après extraction)
- Pages secondaires : inerweb_tuteur.html, inerweb_eleve.html, inerweb_admin.html
- Page progression : progression.html (nouveau)
- 8 modules noyau dans js/core/ et js/prog/
- 24 modules fonctionnels dans js/
- 2 modules spécialisés : js/radar/, js/alerts/
- Données : data/formations.json
- Tests : tests/smoke-test.html

### Dépendances externes
- Google Fonts (Nunito)
- jsPDF (génération PDF)
- SheetJS/XLSX (export Excel)
- BarcodeDetector API (scanner QR)
- Google Apps Script (backend REST)

### Modules actifs

#### Modules noyau (js/core/)
| Fichier | Rôle |
|---------|------|
| core.js | Utilitaires partagés (esc, toast, dateFR, safeParse, formatWA, etc.) |
| state.js | État centralisé (appState) |
| api.js | Appels API centralisés (POST/GET) |
| utils.js | Utilitaires de stockage + synchronisation |
| syncQueue.js | Queue synchronisation offline-first |

#### Modules progression (js/prog/)
| Fichier | Rôle |
|---------|------|
| prog-model.js | Modèle filières/compétences |
| prog-data.js | Calculs progression |
| prog-ui.js | Rendu barres/pourcentages |

#### Modules spécialisés
| Fichier | Rôle |
|---------|------|
| js/radar/radarCompetences.js | Radar de compétences avancé |
| js/alerts/alertSystem.js | Système d'alertes automatiques |

#### Modules fonctionnels (js/)
| Fichier | Rôle |
|---------|------|
| core.js | Utilitaires partagés (esc, toast, dateFR, safeParse, formatWA, etc.) |
| radar.js | Radars de compétences (Canvas, mini-radars dashboard) |
| jury.js | Gestion évaluateurs, commissions, désignation par épreuve |
| fusion-eval.js | Fusion non-destructive des évaluations entre collègues |
| rapport-pdf.js | Génération des rapports PDF |
| photos.js | Gestion des photos de stage |
| sync-queue.js | File de synchronisation offline-first |
| activites.js | Gestion des activités professionnelles |
| eval-tuteur.js | Évaluations côté tuteur |
| export-excel.js | Export vers Excel |
| export-mod.js | Module export (backup, restore, migration) |
| tp-manager.js | Gestion des travaux pratiques |
| exposition.js | Module exposition (oral) |
| tache-complexe.js | Module tâche complexe |
| historique.js | Historique des modifications |
| signatures.js | Gestion des signatures numériques |
| phases.js | Gestion des phases formatif/certificatif |
| impossibilites.js | Gestion des impossibilités d'évaluation |
| alertes.js | Système d'alertes |
| demo-guide.js | Guide interactif de démonstration |
| partenaires.js | Gestion entreprises partenaires |
| documents.js | Gestion documents partagés |
| journal-mod.js | Journal d'actions et backups |
| scanner.js | Scanner QR code |

### Modules nouveaux v5.2
- js/core/state.js — État centralisé appState
- js/core/api.js — Appels API centralisés
- js/core/utils.js — Utilitaires de stockage/sync
- js/core/syncQueue.js — Queue synchronisation wrapper
- js/prog/prog-model.js — Modèle filières
- js/prog/prog-data.js — Calculs progression
- js/prog/prog-ui.js — Rendu progression
- js/radar/radarCompetences.js — Radar avancé
- js/alerts/alertSystem.js — Alertes automatiques

### Corrections v5.2
- Bug 30 élèves supprimé (pagination par lots)
- TODO/FIXME résolus (exportIdentifiants, showKey, pré-remplissage evalData)
- alert()/confirm() remplacés par toast()/modale
- console.log debug supprimés
- Sync tuteur : retry automatique + anti-doublon
- POST pour toutes les écritures (tuteur + élève)
- onclick inline convertis en event listeners (navigation)

### Incohérences restantes
- inerweb_prof_v4.html : version archivée, non référencée
- Fonctions dupliquées entre modules core et inline prof.html (rétro-compat)
