# Changelog — INERWEB TT-IA

## [7.7.1] - 2026-03-15

### Centre de communication complet (Stage → Comm.)
- Refonte complète du panel Communication avec sous-onglets **Tuteurs** / **Élèves**
- Sélection individuelle ou "Tous" via cases à cocher
- 4 modes d'envoi : 💬 SMS, 📱 WhatsApp, 📧 Email, 🚀 Les 3 d'un coup
- Message pré-rempli personnalisé avec lien token automatique
- Zone fichier par glisser-déposer (conventions, sujets d'examen...)
- Alerte visuelle si le mode choisi ne correspond pas à la préférence du tuteur
- Badge préférence contact visible sur chaque tuteur (⭐)
- Messages types conservés (Bienvenue / Rappel / Alerte) pour les tuteurs

## [7.7.0] - 2026-03-15

### Profil élève, communication & contacts
- **Profil élève** : modale "Complète ton profil" à la première connexion (téléphone + email)
  - Sauvegarde locale + sync API (`updateEleveProfil`)
  - Ne s'affiche qu'une fois (flag `_profilDemande`)
- **Communication élèves** (inerweb_prof) : boutons contact enrichis par élève
  - 📞 Appel, 💬 SMS, 📱 WhatsApp (avec message pré-rempli + lien token)
  - 📧 Email tuteur avec sujet/corps pré-remplis
  - Badge préférence contact tuteur (⭐)
  - Bouton "📣 Contacter la classe" avec modale récapitulative
- **Préférences contact tuteur** (inerweb_tuteur) : 4 cases à cocher (Tél/SMS/WhatsApp/Email)
  - Sync API (`savePrefContactTuteur`)
- **Fix** : `js/core/utils.js` — variable `online` non déclarée → `navigator.onLine`

## [7.6.3] - 2026-03-15

### Correction bug btoa UTF-8
- Correction : `_dp()` dans `inerweb_eleve.html` — btoa() crashait sur les emojis SVG (❄️🔧🔥⚡💨)
- Fix : `btoa(unescape(encodeURIComponent(svg)))` pour support UTF-8 complet
- VERSION_FRONT : 7.6.2 → 7.6.3

## [7.6.2] - 2026-03-15

### Déploiement GitHub Pages + Écran bienvenue
- Ajout écran de bienvenue élève (explication de l'outil, affiché une seule fois)
- Mise à jour cache Service Worker : v7.3 → v7.6
- VERSION_FRONT : 7.6.1 → 7.6.2

## [7.6.1] - 2026-03-15

### Phase 13.2bis — Correction POST Routing
- Correction bug critique : routage POST unifié (`body.action || e.parameter.action`)
- Correction `checkApiKey` : accepte `apiKey`/`key` depuis body OU params URL
- Ajout handler `addJournalEntry` — sauvegarde journal élève dans onglet "Journal"
- Ajout handler `saveEvalTuteur` — sauvegarde évaluation tuteur dans onglet "EvalTuteur" (avec vérification token)
- VERSION_FRONT : 7.6.0 → 7.6.1

## [7.6.0] - 2026-03-15

### Phase 13.2 — Consolidation & Corrections Auth
- **BREAKING** : Backend renommé `Code.gs`, anciennes versions archivées dans `backend/archives/`
- Correction bug critique : auth élève — `verifyEleveToken` accepte désormais le token seul (sans code élève)
- Correction bug critique : auth élève — ajout du paramètre `key` (clé API) dans `inerweb_eleve.html`
- Correction bug critique : auth tuteur — ajout du paramètre `key` (clé API) dans `inerweb_tuteur.html`
- Correction : ajout `apiKey` dans les appels POST (syncCloud élève, saveEvalTuteur, retryPending)
- Nouveau : `docs/API_CONTRAT.md` — documentation complète de l'API (GET + POST)
- Nouveau : `docs/TESTS_MANUELS.md` — checklist de tests manuels
- Nouveau : `backend/archives/` — anciennes versions conservées avec README
- Amélioration : `backend/README.md` mis à jour
- VERSION_FRONT : 7.5.0 → 7.6.0

## [7.5.0 / TT-IA v1.1] - 2026-03-14

### Phase 13.1 — Securisation RGPD
- `js/security/crypto.js` : Chiffrement AES-256-GCM (derive PBKDF2 depuis PIN)
- `js/security/pin-manager.js` : Gestion PIN 6+ chiffres, verrouillage auto 5min, 5 tentatives max
- `js/rgpd/data-retention.js` : Durees conservation legales + purge automatique mensuelle
- `js/core/identity-mapper.js` v2.0 : Table chiffree AES-256, migration auto ancien format
- `css/security.css` : Ecran verrouillage, modale RGPD
- `docs/RGPD_DOCUMENTATION.md` : Documentation complete RGPD
- `docs/REGISTRE_TRAITEMENT_TEMPLATE.md` : Template registre traitements
- Ecran PIN obligatoire au demarrage (avant chargement app)
- Verrouillage automatique apres 5 min inactivite
- Journal des acces (1000 dernieres entrees)
- Droit a l'oubli : suppression complete d'un eleve
- Droit d'acces : export donnees eleve JSON
- Purge automatique proposee chaque mois (13 mois identites, 6 ans CCF)
- Export obligatoire avant suppression
- Migration transparente : ancien format plain -> chiffre au premier deverrouillage
- VERSION_FRONT 7.4.0 -> 7.5.0, VERSION_TTIA 1.0.0 -> 1.1.0

## [7.4.0 / TTia v1.0] - 2026-03-14

### Phase 13 — Navigation Multi-Classe + API Drive + Evaluation Mobile + RGPD
- Navigation conditionnelle selon la classe sélectionnée (onglets grisés sans classe)
- Onglets dynamiques selon la formation : EP2/EP3 (CAP), E31/E32/E33 (BAC), Modules (TNE)
- Dashboard avec 3 cartes radars cliquables (CAP IFCA, BAC MFER, 2nde TNE)
- Indicateur de classe active dans le header (badge orange avec bouton fermer)
- État global `window.iwState` pour la gestion multi-classe
- Tab-panes EP2, EP3 et Modules avec sélecteurs d'élèves
- Module d'import TP depuis Google Drive (`js/drive/tp-import.js`)
- Bouton "Importer depuis Drive" dans la bibliothèque TP
- renderBilan() dynamique : affiche EP2/EP3 (CAP), E31/E32/E33 (BAC), message TNE
- popSelects() filtre les élèves par formation active
- renderEleves() filtre par formation active + filtre classe
- renderRadarUnified() détecte la formation de l'élève courant (plus de fallback CAP)
- renderProgressionGrid() utilise iwState (plus de fallback CAP systématique)
- goEval() navigue vers EP2 (CAP), E31 (BAC) ou Modules (TNE) selon la formation
- Appel updateTabsForFormation(null) au démarrage dans initApp()
- `js/core/identity-mapper.js` : Pseudonymisation RGPD (noms en local, codes vers cloud)
- `js/drive/drive-api.js` : Connexion API Google Drive (OAuth2, scan dossiers)
- `js/mobile/eval-mobile.js` : Evaluation rapide dictee vocale + photo + parsing
- `css/mobile.css` : Styles interface mobile evaluation
- Onglet "Eval+" dans la navigation (accessible toutes formations)
- Tab-pane eval-mobile avec interface dictee/photo/validation
- Sync automatique identity map depuis les eleves au demarrage
- Renommage projet : INERWEB TTia v1
- 19 nouveaux tests (T331-T349), total 349 tests
- VERSION_FRONT 7.3.0 → 7.4.0

## [7.3.0] - 2026-03-14

### Phase 12 — InerWeb Classroom (serveur local TP)
- Nouveau module `classroom/` : serveur Express + Socket.io pour TP en classe
- Serveur local réseau (0.0.0.0) — 100% hors ligne, pas d'internet requis
- Dashboard professeur temps réel (`teacher.html`) :
  - Grille élèves avec pastilles de statut colorées
  - QR code automatique pour connexion élèves
  - Sélection de TP, minuteur, statistiques live
  - Journal d'alertes (détection perte de focus)
  - Export ZIP des copies (CSV récapitulatif + réponses JSON + snapshots HTML)
- Interface élève mobile-first (`student.html`) :
  - Connexion par nom/prénom/classe
  - Chargement TP en iframe avec scan automatique des formulaires
  - Auto-sauvegarde toutes les 5 secondes via Socket.io
  - Mode kiosk : blocage clic droit, raccourcis, détection Visibility API
- TP exemple inclus (`exemple_qcm_froid.html`) : 10 questions froid/climatisation
- Lanceur Windows `LANCER.bat` : installation automatique + démarrage en un clic
- Route `/inerweb` pour accès aux TP existants du projet parent
- API REST : info serveur, QR code, liste sujets, élèves, export, reset
- Carte "Classroom" ajoutée dans le portail `index.html`
- VERSION_FRONT 7.2.0 → 7.3.0

## [7.2.0] - 2026-03-14

### Phase 11 — Documentation, Vitrine, Aide contextuelle, Auto-setup
- Nouvelle page `installation.html` : guide pas-a-pas pour debutant (6 etapes illustrees, FAQ)
- Nouvelle page `vitrine.html` : page de presentation interactive (hero, compteurs, carousel, avant/apres)
- Nouvelle page `first-setup.html` : assistant de premier lancement complet
  - 6 etapes : Bienvenue → Connexion API → Import eleves (CSV/manuel) → Tokens → QR codes → Termine
  - Test de connexion API en direct
  - Import CSV (point-virgule ou tabulation) avec detection auto de l'entete
  - Saisie manuelle d'eleves avec formulaire dynamique
  - Generation de tokens (8 caracteres, format identique au backend)
  - Tentative de synchronisation backend, fallback local
  - Apercu QR codes en direct (QRCodeJS)
  - Export PDF badges format carte de visite (85×54mm, jsPDF)
  - Sauvegarde config dans localStorage (format compatible inerweb_prof.html)
- Module `js/vitrine.js` : animations scroll, compteurs, carousel
- Module `js/help-overlay.js` : aide contextuelle integree (`iwHelpOverlay`)
  - Bouton `?` dans le header de inerweb_prof.html
  - 12 cles d'aide (dashboard, sync, filtres, fiches-eleves, eval-niveaux, radar, export-pdf, config, phases, tp-library, progression, stage)
  - Popovers positionnes dynamiquement avec titre, description, astuce, lien aide.html
  - Mode aide avec overlay semi-transparent et elements surlignes
- Attributs `data-help` ajoutes dans inerweb_prof.html (7 elements)
- Lien "Premiere installation" dans ecran de config de inerweb_prof.html
- Liens vitrine + setup + installation ajoutes dans index.html
- Version badge index.html mise a jour (v7.2)
- 10 tests ajoutes (T311-T320), total 320 tests

## [7.1.0] - 2026-03-14

### Phase 10bis — IA Gemini (RGPD-safe)
- Nouveau module `iwGemini` : integration IA Gemini 1.5 Flash
- 5 usages : enrichirTP, genererObjectifs, reformulerTexte, creerExercice, suggererEvaluation
- Protection RGPD : detection automatique de donnees personnelles (noms, emails, telephones, notes)
- Fonction `nettoyerTexte` : remplacement "eleve" par "apprenant" avant envoi IA
- Gestion quota journalier via localStorage (configurable dans inerweb.config.js)
- Backend : proxy Gemini securise (`handleGeminiRequest`, `construirePromptGemini`, `appelGeminiAPI`)
- Cle API Gemini cote serveur uniquement (PropertiesService, jamais exposee au client)
- Bouton IA integre dans le formulaire TP (`tp-form.js`)
- UI helper `creerBoutonIA` avec etat de chargement
- Configuration GEMINI enrichie dans `inerweb.config.js` (model, usages, contexteMetier)
- 10 tests ajoutes (T301-T310), total 310 tests

## [7.0.0] - 2026-03-14

### Phase 10 — Consolidation Beta
- **BREAKING** : Configuration centralisee obligatoire (`js/core/inerweb.config.js`)
- Suppression de toutes les URLs hardcodees dans les fichiers HTML
- Module `iwConfig` avec validation, helpers, getters
- Module `iwApi` refactore pour utiliser la config centralisee
- Backend v3.0.0 : endpoints auth (`verifyEleveToken`, `verifyTuteurToken`)
- Backend v3.0.0 : gestion users (`getUsers`, `addUser`, `updateUser`, `deleteUser`)
- Backend v3.0.0 : generation tokens (`generateTokensForClasse`)
- Backend v3.0.0 : suppression eleve (`deleteEleveAction`)
- Backend v3.0.0 : onglet `Users` dans `setupSpreadsheet()`
- `inerweb_eleve.html` utilise `iwConfig.getApiUrl()` au lieu d'URL hardcodee
- `inerweb_tuteur.html` utilise `iwConfig.getApiUrl()` au lieu d'URL hardcodee
- `inerweb_admin.html` utilise `iwConfig.getApiUrl()` au lieu d'URL hardcodee
- `inerweb_prof.html` utilise `iwConfig` pour baseUrl et DEFAULT_CFG
- Documentation installation mise a jour (prerequis serveur HTTP)
- Fichier `DETTE_TECHNIQUE.md` pour suivi ete 2026
- 5 tests ajoutes (T296-T300), total 300 tests

## [6.1.0] - 2026-03-14

### Phase 9 — Export PDF natif (jsPDF)
- Nouveau module `iwPdfExport` : génération PDF côté client avec jsPDF
- `bilanCcf(eleveId, formation)` : bilan CCF complet avec épreuves, notes, avis
- `bilanPfmp(eleveId, pfmpId)` : bilan PFMP avec entreprise, tuteur, évaluations
- `grilleProgression(classeId, formation)` : grille paysage élève × compétence
- `ficheTp(tp)` : fiche TP avec description, matériel, opérations
- Bouton PDF dans les cartes TP de l'explorateur (`pdf-tp`)
- Bouton PDF dans la carte de progression (`export-pdf`)
- Bouton « PDF » dans ccf-bilan.html (téléchargement natif jsPDF)
- Design professionnel : en-têtes colorés, badges formation, niveaux couleur
- Sanitisation automatique des noms de fichiers
- Notification après génération
- 7 tests ajoutés (T289–T295), total 295 tests

## [6.0.9] - 2026-03-14

### Phase 8 — Formulaire création/édition TP
- Nouveau module `iwTpForm` : création, édition, duplication de TP
- Modale responsive avec fieldsets repliables (anti-TDAH)
- Gestion listes dynamiques : matériel, prérequis, opérations, variantes
- Tags avec chips et validation Entrée
- `iwTpLibrary.updateTp()` : mise à jour TP existant
- `iwTpLibrary.deleteTp()` : suppression (scope private uniquement)
- Boutons modifier/dupliquer/supprimer dans les cartes TP de l'explorateur
- Bouton "Nouveau TP" dans tp-library.html
- Notification de confirmation après sauvegarde
- 7 tests ajoutés (T282–T288), total 288 tests

## [6.0.8] - 2026-03-14

### Phase 7bis — Correction alias types frontend/backend
- Ajout de 9 types alias dans TYPES_AUTORISES pour compatibilité avec eval-engine.js
- `eval.level_set`, `eval.created`, `eval.updated` → `updateEvaluationUnifiee()`
- `eval.grid_completed` → `updateEvaluationUnifiee()`
- `eval.bulk_applied` → `updateEvaluationUnifiee()`
- `eval.pfmp_recorded` → `updateEvaluationPFMP()`
- `eval.ccf_recorded` → `updateEvaluationCCF()`
- `eval.comment_added`, `eval.note_generated` → journalisés (pas de projection)
- CONFIG.VERSION : 2.5.0 → 2.5.1
- Bug fix critique : les évaluations frontend étaient rejetées par le backend

## [6.0.7] - 2026-03-14

### Phase 7 — Mise à jour Backend GS v2.5.0
- Extension TYPES_AUTORISES de 6 à 31 types d'événements
- Nouvelles projections : Évaluations_Unifiées, CCF_Log, PFMP_Log
- `updateProjections()` refactoré en switch couvrant tous les types
- `updateEvaluationUnifiee()` : projection eval.quick/grid/bulk/tp.evaluated
- `updateEvaluationPFMP()` : projection évaluations PFMP avec tuteur/entreprise
- `updateEvaluationCCF()` : projection évaluations CCF avec épreuve/note
- `updateEleve()` / `deleteEleve()` / `mergeEleve()` : gestion CRUD élèves
- `updateSeanceFromEvent()` / `deleteSeanceFromEvent()` : modification/suppression séances
- Nouvel endpoint GET `getEvaluations` : toutes les évaluations (unifiées + PFMP + CCF + legacy)
- Nouvel endpoint GET `getBilanCCF` : bilan CCF complet avec notes calculées et avis
- Fonctions utilitaires : `niveauToLabel_()`, `niveauToPoints_()`, `calculateNote_()`
- `setupSpreadsheet()` crée 3 nouveaux onglets (Évaluations_Unifiées, CCF_Log, PFMP_Log)
- `backend/README.md` mis à jour avec documentation complète
- CONFIG.VERSION : 2.4.0 → 2.5.0

## [6.0.6] - 2026-03-14

### Phase 6 — Carte de progression interactive
- Grille élève × compétence (`iwProgressionGrid`) dans l'onglet Progression
- Cellules colorées selon `iwLevels.color()` avec label du niveau
- Clic sur cellule → sélecteur rapide NA/EC/M/PM → `iwEval.quick()`
- Colonne moyenne de progression par élève
- Tri par nom, moyenne ou compétence (asc/desc)
- En-têtes sticky (scroll horizontal et vertical)
- Légende des niveaux intégrée
- Export CSV de la grille complète
- Résumé classe (effectif, moyenne, compétences)
- 7 tests ajoutés (T275–T281), total 281 tests

## [6.0.5] - 2026-03-14

### Phase 5 — Radar unifié + Export bilan CCF
- Radar SVG 3 couches (formatif/PFMP/CCF) dans `iwRadarUnified`
- Intégration radar dans l'onglet Bilan de prof.html
- Fonction `generateCcfBilan()` dans `iwEvalExports` — bilan structuré complet
- Calcul de note CCF pondéré (NE=0, NA=5, EC=10, M=15, PM=20)
- Page `ccf-bilan.html` — bilan imprimable avec notes, niveaux, avis
- Bouton « Bilan CCF » dans l'onglet Bilan
- Export PNG du radar
- 7 tests ajoutés (T268–T274), total 274 tests

## [6.0.4] - 2026-03-14

### Phase 4 — Intégration Explorateur TP dans Prof.html
- Nouvel onglet « 📚 TP » dans le tableau de bord professeur
- Initialisation paresseuse de l'explorateur TP (chargé au premier clic)
- Pré-filtrage automatique par formation selon la classe configurée
- Bouton « Évaluer » dans la fiche détaillée de chaque TP
- Modale d'évaluation TP (`iwTpEvalModal`) : sélection élève, grille compétences, soumission événements
- Correction code compétence orphelin C5.4 → C5.1 dans TP-011 BAC_MFER
- 7 tests ajoutés (T261–T267), total 267 tests

## [6.0.3] - 2026-03-14

### Phase 3 — Bibliothèque TP universelle
- Catalogue de 12 TP universels (`data/tp-library/catalogue.json`)
- 25 mappings TP ↔ formations (`data/tp-mappings/mappings.json`)
- Module `iwTpLibrary` : recherche, mappings, cartes d'évaluation, hooks IA
- Module `iwTpExplorer` : interface d'exploration avec filtres et détails
- Page autonome `tp-library.html` + carte portail
- Scopes commun/privé pour bibliothèque
- 30 tests ajoutés (T231–T260)

## [6.0.2] - 2026-03-13

### Phase 2 — Système d'évaluation unifié
- Registre de niveaux unifié (`iwLevels`) : 8 niveaux internes, conversion Édu ↔ PROG+
- Registre élèves unifié (`iwStudents`) : déduplication, résolution alias
- Moteur d'évaluation (`iwEval`) : quick, grid, pfmp, ccf, bulk
- Projections CQRS (`iwEvalProjections`) : rebuild, historique, radar, CCF
- Composants UI (`iwEvalUI`) : boutons, grilles, barres, timeline
- Module exports (`iwEvalExports`) : notes, appréciations, École Directe, bilan PFMP
- 80 tests ajoutés (T151–T230)

## [6.0.1] - 2026-03-13

### Phase 1 — CORE unifié event-sourcing
- Event-sourcing avec journal immuable (IndexedDB)
- Bridge événements Édu ↔ PROG+
- Synchronisation unifiée
- Registre de classes partagé
- 150 tests de base (T1–T150)

## [5.1.0] - 2026-03-12

### Corrections critiques
- Correction cfg.clef → cfg.apiKey (synchronisation journal morte)
- Correction recherche utilisateur u.cle → multi-clé (u.cle||u.apiKey||u.key)
- Correction données démo incohérentes (épreuves CAP vs MFER mélangées)
- 27 failles XSS corrigées dans inerweb_prof.html (innerHTML non échappé)
- Failles XSS corrigées dans photos.js (filename non sanitisé)
- Clé API déplacée de l'URL vers le body JSON pour les requêtes POST
- Appel fetch() direct contournant apiCall() remplacé

### Améliorations UX — Professeur
- Dashboard classe obligatoire (plus de "Toutes classes")
- Séparateurs visuels dans la barre de navigation
- Barres de progression filière-dynamiques dans les cartes élèves
- Mini-radars de compétences intégrés au dashboard
- Amélioration contraste filtre + labels statistiques

### Améliorations UX — Tuteur
- Barre de progression visuelle des critères validés
- Modale de confirmation avant envoi des évaluations
- Targets tactiles agrandis (44px minimum)

### Améliorations UX — Élève
- Boutons Modifier/Supprimer sur les entrées de journal en attente
- Distinction visuelle des entrées non synchronisées (bordure orange, badge "En attente")
- Modale de confirmation async (remplace confirm())
- Targets tactiles agrandis

### Sécurité
- API write via POST (plus de données sensibles dans l'URL)
- Échappement XSS systématique sur les données utilisateur
- Sanitisation des noms de fichiers photos
- alert() et console.log de debug supprimés en production

### Architecture
- Création de core.js (utilitaires partagés : esc, toast, dateFR, safeParse, etc.)
- Intégration core.js dans tuteur et élève
- Attributs ARIA ajoutés (role, aria-label, aria-live)
- Audit technique complet (AUDIT_TECHNIQUE.md)

### Évaluation / Jury
- Système de pool d'évaluateurs avec types (Enseignant, Professionnel, Tuteur, Externe)
- Commissions d'évaluation par épreuve
- Désignation par épreuve avec badges visuels
- Rétro-compatibilité avec l'ancien format jury

### Contact
- Champs téléphone élève et tuteur
- Boutons WhatsApp intégrés (💬E, 💬T)
- Bouton édition élève (✏️)
