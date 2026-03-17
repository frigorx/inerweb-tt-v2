# INERWEB — Cartographie d'architecture de convergence
## Analyse comparative et plan de fusion Édu v4 + PROG+

**Date** : 2026-03-13
**Auteur** : Architecte logiciel (Claude)
**Version** : 1.0

---

## 1 — ANALYSE COMPARATIVE TECHNIQUE

### 1.1 Architecture logicielle

| Critère | inerWeb Édu v4 | INERWEB PROG+ |
|---------|---------------|----------------|
| **Pattern** | Event-sourcing + CQRS | CRUD classique |
| **Type** | SPA monolithique (1687 lignes) | Multi-pages (prof 4163 + tuteur 1283 + élève 990 + admin 854) |
| **Modularité** | Tout-en-un, pas de modules séparés | 34 modules JS organisés en core/, prog/, radar/, alerts/ |
| **État** | Variable locale `state` + `CFG` | `window.appState` + 21 alias defineProperty |
| **Rendu** | Fonctions render par vue (innerHTML) | Fonctions render par onglet (innerHTML) |
| **Navigation** | State machine (currentView) | Onglets avec switchTab() |

**Verdict** : Édu est plus moderne dans son approche (event-sourcing, SPA) mais monolithique. PROG+ est plus structuré en modules mais utilise un pattern CRUD plus classique.

### 1.2 Structure frontend

| Critère | Édu v4 | PROG+ |
|---------|--------|-------|
| **Fichiers HTML** | 1 (index.html) | 9 (prof, tuteur, élève, admin, progression, aide, demo, index, aide_tuteur) |
| **CSS** | Inline dans `<style>` (variables CSS modernes) | Inline dans `<style>` (mêmes variables CSS) |
| **Design system** | DM Sans, palette bleu/orange/vert | Nunito, palette bleu/orange/vert |
| **Responsive** | Mobile-first natif | Mobile-first |
| **Accessibilité** | Minimale | ARIA attributes, skip-links, focus-visible |
| **Interactions** | Event listeners propres | Mix onclick inline + event listeners |

**Verdict** : Design systems quasi-identiques (même palette de couleurs). Convergence facile côté visuel. PROG+ a une meilleure accessibilité.

### 1.3 Gestion des données

| Critère | Édu v4 | PROG+ |
|---------|--------|-------|
| **Source de vérité** | EventLog immutable (journal d'événements) | Variables globales (students, validations, notes) |
| **Stockage local** | IndexedDB v5 exclusivement (5 stores) | localStorage principal + IndexedDB (2 stores) |
| **Modèle élève** | `{id, code, nom, prenom, classe, groupe, photo}` anonymisé | `{code, nom, prenom, classe, filiere, tel, tuteur, observations...}` complet |
| **Modèle évaluation** | Event `competence.evaluee` → cache mémoire | Objet `validations[code][ep][comp][crit]` direct |
| **Niveaux** | 1-4 + NE + ABS (numérique) | NE/NA/EC/M/PM (lettres) |
| **Séances** | Objet structuré (id, classe, date, horaire, type, séquence) | Pas de concept de séance (suivi par compétence directement) |
| **Traçabilité** | Complète (chaque action = événement horodaté) | Partielle (timestamps sur validations, journal admin) |

**Verdict** : Le modèle event-sourcing d'Édu est supérieur pour la traçabilité et l'audit. Le modèle CRUD de PROG+ est plus simple mais moins robuste. La convergence doit adopter l'event-sourcing comme moteur de données.

### 1.4 Offline / PWA

| Critère | Édu v4 | PROG+ |
|---------|--------|-------|
| **Service Worker** | Oui (sw.js, cache-first assets, network-first API) | Non |
| **Manifest PWA** | Oui (installable) | Non |
| **Fonctionnement offline** | Complet (IndexedDB + sync batch) | Partiel (localStorage + syncQueue) |
| **Sync** | Batch d'événements via pushEvents (POST) | Action par action via apiCall (POST) |
| **Retry** | Auto (toutes les 10s si online) | syncQueue avec retry 5x + smartSend |
| **Anti-doublon** | eventId unique + vérification serveur | _uid dans syncQueue |
| **Détection réseau** | navigator.onLine + événements | navigator.onLine + événements |

**Verdict** : Édu est nettement plus avancé côté PWA/offline. Son Service Worker et sa stratégie de sync batch doivent devenir le standard INERWEB.

### 1.5 Backend

| Critère | Édu v4 | PROG+ |
|---------|--------|-------|
| **Code.gs** | v2.4.0 (1174 lignes), dans le dépôt | Absent du dépôt (déployé directement) |
| **URL API** | `AKfycbwpx...` | `AKfycbzEb...` |
| **Google Sheet** | `1RTJ9jFhQtHgfXBUqMgj01wH-8MNGMGjDSjcFjkYjleA` | Configurable par utilisateur |
| **Auth** | Clé API via ScriptProperties (fail-closed) | Clé API en paramètre config |
| **Modèle** | Event Log immutable + projections CQRS | CRUD direct sur les feuilles |
| **IA** | Gemini Flash intégré (copilote + enrichissement texte) | Aucun |
| **Onglets Sheet** | EventLog, Séances, Séquences, Élèves, Évaluations, Calendrier CFA, Enseignants, Logs IA, Referentiels, Config | Non documenté (dépend du déploiement) |
| **Sécurité** | Whitelist d'événements, validation IDs, sanitize JSON, LockService | Clé API simple, vérification rôle côté client |

**Verdict** : Le backend Édu est largement supérieur en termes de sécurité et d'architecture. Il doit servir de base pour le backend unifié.

### 1.6 Sécurité

| Critère | Édu v4 | PROG+ |
|---------|--------|-------|
| **XSS** | Pas de fonction esc() visible | esc() systématique, 27 failles corrigées v5.1 |
| **API** | Fail-closed, whitelist événements, sanitize | POST pour écritures, clé dans body |
| **Auth serveur** | ScriptProperties (non modifiable client) | localStorage (bypassable) |
| **Concurrence** | LockService (anti-race) | Aucune protection |
| **Idempotence** | Vérification eventId côté serveur | _uid côté client seulement |

**Verdict** : Chaque projet a des forces complémentaires. Édu est meilleur côté serveur, PROG+ est meilleur côté client (XSS). La fusion doit combiner les deux.

### 1.7 RGPD

| Critère | Édu v4 | PROG+ |
|---------|--------|-------|
| **Anonymisation** | Codes élèves (TNE-01), noms masquables | Noms en clair partout |
| **Consentement** | Toggle showNames/showTrombi | Aucun mécanisme |
| **Effacement** | Bouton "Effacer données locales" | Pas de bouton dédié |
| **Transit réseau** | Codes anonymes envoyés | Noms/prénoms envoyés |
| **Photos** | IndexedDB local uniquement | Google Drive (transit réseau) |

**Verdict** : Édu est conforme RGPD. PROG+ ne l'est pas. La convergence doit impérativement adopter le modèle d'anonymisation d'Édu.

### 1.8 Extensibilité

| Critère | Édu v4 | PROG+ |
|---------|--------|-------|
| **Ajout de filière** | Modifier SEQUENCES (hardcodé) | Modifier FILIERES + formations.json |
| **Ajout de module** | Ajouter une vue dans le SPA | Ajouter un fichier JS + onglet HTML |
| **Multi-enseignants** | Natif (CFG.teachers, dropdown) | Via système utilisateurs/rôles |
| **Multi-établissements** | Non prévu | Partiellement (appCfg.etablissement) |
| **Plugins** | Non prévu | Non prévu |

**Verdict** : PROG+ est plus extensible grâce à son architecture multi-fichiers. Édu est plus contraint par son monolithe SPA.

---

## 2 — BRIQUES RÉUTILISABLES

### 2.1 Briques à conserver d'Édu v4

| Brique | Fichier source | Justification |
|--------|---------------|---------------|
| **Moteur event-sourcing** | backend/Code.gs (pushEvents, EventLog, projections) | Traçabilité immuable, audit complet, idempotence serveur |
| **Backend Code.gs** | backend/Code.gs v2.4.0 | Seul backend documenté et versionné, sécurité fail-closed |
| **Service Worker** | app/sw.js | Offline-first robuste, cache-first assets |
| **PWA Manifest** | app/manifest.json | Installabilité, plein écran |
| **Sync batch** | index.html (syncPendingEvents) | Plus efficace qu'action par action |
| **IndexedDB v5** | index.html (dbOpen, dbGet, dbPut, dbGetAll) | Stores structurés, transactions ACID |
| **Copilote IA** | backend/Code.gs (askCopilot, enrichirTexteED) | Gemini intégré, prompt master, whitelist actions |
| **RGPD** | index.html (codes anonymes, toggles) | Conformité CNIL |
| **Agenda/Planning** | index.html (renderJour, renderSemaine, renderMois) | Outil quotidien terrain unique |
| **Évaluation 3 taps** | index.html (renderEval) | Ergonomie terrain rapide |
| **Import iCal** | index.html (parseICS) + backend/Code.gs | Intégration École Directe |
| **QR codes** | index.html (generateQR) | Identification élèves rapide |

### 2.2 Briques à conserver de PROG+

| Brique | Fichier source | Justification |
|--------|---------------|---------------|
| **Architecture multi-pages** | prof/tuteur/élève/admin | Séparation des rôles claire |
| **Modules JS organisés** | js/core/, js/prog/, js/radar/, js/alerts/ | Maintenabilité, extensibilité |
| **Référentiel formations** | data/formations.json | Modèle pédagogique complet (3 filières, toutes compétences) |
| **Radar compétences** | js/radar/radarCompetences.js | Visualisation graphique avancée |
| **Système d'alertes** | js/alerts/alertSystem.js | Détection proactive des élèves en difficulté |
| **Gestion jury/évaluateurs** | js/jury.js | Commissions CCF, pool d'évaluateurs |
| **Interface tuteur** | inerweb_tuteur.html | Évaluation PFMP terrain |
| **Interface élève** | inerweb_eleve.html | Journal de stage, photos |
| **Rapport PDF** | js/rapport-pdf.js | Génération bilans CCF |
| **Export Excel** | js/export-excel.js | Synthèse classe |
| **Signatures** | js/signatures.js | Signatures numériques canvas |
| **Protection XSS** | js/core/core.js (esc()) | Sanitisation systématique |
| **État centralisé** | js/core/state.js (appState) | Namespace propre avec alias rétro-compatibles |

### 2.3 Briques à créer (nouvelles)

| Brique | Rôle | Priorité |
|--------|------|----------|
| **Couche événements unifiée** | Adapter l'event-sourcing d'Édu pour supporter les actions PROG+ | Critique |
| **Registre classes unifié** | Fusionner les listes de classes des deux projets | Haute |
| **Mapping compétences** | Correspondance codes Édu (C1.1) ↔ PROG+ (critères par épreuve) | Haute |
| **Storage bridge** | Lecture croisée IndexedDB Édu ↔ PROG+ | Moyenne |
| **Auth unifiée** | Un seul système de clé API + rôles | Moyenne |
| **RGPD layer** | Anonymisation/désanonymisation transparente pour PROG+ | Haute |

---

## 3 — ARCHITECTURE CIBLE INERWEB

### 3.1 Vue d'ensemble

```
╔══════════════════════════════════════════════════════════════╗
║                        INERWEB                              ║
║                   Plateforme pédagogique                    ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   ║
║  │   EDU    │  │  PROG    │  │  EVAL    │  │  PFMP    │   ║
║  │ Agenda   │  │Progression│  │   CCF    │  │ Entreprise│   ║
║  │quotidien │  │pédagogique│  │Évaluations│  │  Stage   │   ║
║  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   ║
║       │              │              │              │         ║
║  ┌──────────┐  ┌──────────┐  ┌──────────┐                  ║
║  │  RADAR   │  │ LIBRARY  │  │AI COPILOT│                  ║
║  │ Alertes  │  │Ressources│  │ Gemini   │                  ║
║  │Compétences│  │Drive/PDF │  │ Assistant│                  ║
║  └────┬─────┘  └────┬─────┘  └────┬─────┘                  ║
║       │              │              │                        ║
║  ═════╪══════════════╪══════════════╪═══════════════════     ║
║       │              │              │                        ║
║  ┌───────────────────────────────────────────────────────┐  ║
║  │                    CORE                                │  ║
║  │  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌───────────┐ │  ║
║  │  │ Events  │ │ Storage  │ │  Sync   │ │   Auth    │ │  ║
║  │  │ Engine  │ │ IndexedDB│ │ Queue   │ │ API Keys  │ │  ║
║  │  └─────────┘ └──────────┘ └─────────┘ └───────────┘ │  ║
║  │  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌───────────┐ │  ║
║  │  │  State  │ │  RGPD    │ │   PWA   │ │Référentiels│ │  ║
║  │  │ Manager │ │  Layer   │ │   SW    │ │Formations │ │  ║
║  │  └─────────┘ └──────────┘ └─────────┘ └───────────┘ │  ║
║  └───────────────────────────────────────────────────────┘  ║
║                           │                                  ║
║  ┌───────────────────────────────────────────────────────┐  ║
║  │              BACKEND (Code.gs)                         │  ║
║  │  EventLog │ Projections │ Gemini │ Import │ CRUD      │  ║
║  └───────────────────────────────────────────────────────┘  ║
║                           │                                  ║
║  ┌───────────────────────────────────────────────────────┐  ║
║  │              GOOGLE SHEETS                             │  ║
║  │  EventLog │ Séances │ Élèves │ Évaluations │ Config   │  ║
║  └───────────────────────────────────────────────────────┘  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

### 3.2 Détail des modules

#### CORE — Noyau partagé
| Composant | Source | Rôle |
|-----------|--------|------|
| **Events Engine** | Édu v4 (pushEvents + EventLog) | Moteur event-sourcing central. Toutes les actions transitent par des événements immutables. |
| **Storage** | Édu v4 (IndexedDB v5) + PROG+ (state.js) | IndexedDB unique avec stores par domaine. État mémoire via appState. |
| **Sync Queue** | PROG+ (syncQueue.js) + Édu (syncPendingEvents) | Fusion : batch d'événements + retry intelligent + sendBeacon + anti-doublon |
| **Auth** | Édu v4 (fail-closed) + PROG+ (rôles) | Clé API serveur (ScriptProperties) + rôles utilisateur (prof/tuteur/élève/admin) |
| **State Manager** | PROG+ (state.js + appState) | Namespace centralisé avec alias, observable pour les vues |
| **RGPD Layer** | Édu v4 (codes anonymes) | Mapping code↔identité en local uniquement, toggle affichage, effacement |
| **PWA / SW** | Édu v4 (sw.js + manifest) | Service Worker unifié, cache-first assets, network-first API |
| **Référentiels** | PROG+ (formations.json) + Édu (SEQUENCES) | JSON unifié : filières, formations, séquences, compétences, critères |

#### EDU — Agenda enseignant
| Fonction | Source |
|----------|--------|
| Vue jour/semaine/mois | Édu v4 |
| Validation séance "C'est fait" | Édu v4 |
| Texte cahier de texte (École Directe) | Édu v4 |
| Import iCal | Édu v4 |
| Import CFA | Édu v4 |
| One-shot / Rattrapage batch | Édu v4 |
| Notifications 18h | Édu v4 |

#### PROG — Progression pédagogique
| Fonction | Source |
|----------|--------|
| Tableau de bord classe | PROG+ |
| Progression par filière (EP2/EP3, E31/E32/E33, CT) | PROG+ |
| Arborescence Année → Période → Séquence | PROG+ (progression.html) |
| Barres de progression par épreuve | PROG+ (prog-ui.js) |
| Mini-radars dans les cartes élèves | PROG+ (radar.js) |

#### EVAL — Évaluations et CCF
| Fonction | Source |
|----------|--------|
| Évaluation rapide 3 taps | Édu v4 |
| Grille compétences détaillée | PROG+ |
| Niveaux (NE/NA/EC/M/PM ↔ 1-4) | Mapping unifié |
| Seuil CCF (3 évals niveau 3+) | Édu v4 |
| Jury / commissions | PROG+ (jury.js) |
| Phase formatif/certificatif | PROG+ (phases.js) |
| Rapport PDF CCF | PROG+ (rapport-pdf.js) |

#### PFMP — Suivi entreprise
| Fonction | Source |
|----------|--------|
| Interface tuteur terrain | PROG+ |
| Interface élève (journal stage) | PROG+ |
| Photos de stage | PROG+ |
| Signatures numériques | PROG+ (signatures.js) |
| Guide tuteur interactif | PROG+ (aide_tuteur.html) |
| Évaluation tuteur PFMP | PROG+ (eval-tuteur.js) |

#### RADAR — Alertes et visualisation
| Fonction | Source |
|----------|--------|
| Radar compétences Canvas | PROG+ (radar.js) |
| Radar classe agrégé | PROG+ (radarCompetences.js) |
| Alertes automatiques (5 types) | PROG+ (alertSystem.js) |
| Couverture compétences | PROG+ (radarCompetences.js) |
| Streak et gamification | Édu v4 |

#### LIBRARY — Ressources pédagogiques
| Fonction | Source |
|----------|--------|
| Bibliothèque Drive | Édu v4 (driveFolders) |
| Documents partagés | PROG+ (documents.js) |
| Export Excel synthèse | PROG+ (export-excel.js) |

#### AI COPILOT — Assistant IA
| Fonction | Source |
|----------|--------|
| Copilote langage naturel | Édu v4 (askCopilot) |
| Enrichissement texte ÉD | Édu v4 (enrichirTexteED) |
| Prompt Master | Édu v4 (backend) |
| Quota Gemini (50/mois) | Édu v4 (backend) |

### 3.3 Interfaces utilisateur

```
INERWEB
├── /                     → Portail (choix du module)
├── /edu/                 → SPA Agenda enseignant (Édu v4)
├── /prof/                → Interface professeur (PROG+)
│   ├── Dashboard
│   ├── Élèves
│   ├── Activités
│   ├── Progression
│   ├── Bilan CCF
│   └── Config/Admin
├── /tuteur/              → Interface tuteur PFMP
├── /eleve/               → Interface élève (journal stage)
├── /progression/         → Vue progression pédagogique
└── /admin/               → Administration
```

---

## 4 — MOTEUR DE DONNÉES

### 4.1 Décision : Event-sourcing au cœur

**OUI, l'event-sourcing doit devenir le cœur du système.**

Justification :
- Traçabilité complète (qui a fait quoi, quand, pourquoi)
- Audit CCF exigé par les textes réglementaires
- Idempotence naturelle (pas de doublon)
- Rejeu possible pour recalculer l'état
- Compatible offline-first (événements en attente)
- Déjà implémenté et prouvé côté Édu v4

### 4.2 Types d'événements unifiés

```javascript
// Édu (existants)
'seance.validee'           // Séance marquée réalisée
'seance.invalidee'         // Annulation
'seance.creee'             // One-shot
'competence.evaluee'       // Niveau attribué
'texte_ed.genere'          // Cahier de texte
'ical.imported'            // Planning importé

// PROG+ (à créer)
'validation.enregistree'   // Critère validé (NE/NA/EC/M/PM)
'observation.ajoutee'      // Observation sur un élève
'pfmp.evaluee'             // Évaluation tuteur PFMP
'jury.designe'             // Évaluateur assigné à une épreuve
'phase.changee'            // Passage formatif → certificatif
'document.partage'         // Document ajouté
'eleve.ajoute'             // Nouvel élève
'eleve.modifie'            // Modification élève
'photo.ajoutee'            // Photo de stage
'signature.enregistree'    // Signature numérique
'bilan.cloture'            // Épreuve clôturée
```

### 4.3 Organisation IndexedDB

```javascript
const DB_NAME = 'inerweb';
const DB_VERSION = 1;

const STORES = {
  // CORE
  events:     { keyPath: 'eventId', indexes: ['synced', 'type', 'timestamp'] },
  config:     { keyPath: 'key' },

  // EDU
  seances:    { keyPath: 'id', indexes: ['date', 'classe'] },

  // PROG+
  students:   { keyPath: 'code', indexes: ['classe', 'filiere'] },
  validations:{ keyPath: 'id', indexes: ['code', 'epreuve'] },
  pfmpData:   { keyPath: 'code' },

  // SHARED
  photos:     { keyPath: 'id', indexes: ['type'] },  // trombi + stage
  documents:  { keyPath: 'id' },

  // SYNC
  syncQueue:  { keyPath: 'id', autoIncrement: true }
};
```

### 4.4 Structure des données pédagogiques

```javascript
// Référentiel unifié (formations.json enrichi)
{
  formations: [
    {
      id: 'CAP_IFCA',
      nom: 'CAP Installateur en Froid et Conditionnement d\'Air',
      classes: ['CAP IFCA 1', 'CAP IFCA 2'],  // PROG+
      aliases: ['CAP1 IFCA', 'CAP2 IFCA'],     // Édu
      epreuves: [...],
      sequences: [...]                           // Édu (séquences pédagogiques)
    }
  ],
  niveaux: {
    // Mapping unifié
    echelle_edu: { 1: 'Non maîtrisé', 2: 'Insuffisant', 3: 'Maîtrisé', 4: 'Parfait' },
    echelle_prog: { NE: 'Non Évalué', NA: 'Non Acquis', EC: 'En Cours', M: 'Maîtrisé', PM: 'Parfaitement Maîtrisé' },
    correspondance: { 1: 'NA', 2: 'EC', 3: 'M', 4: 'PM', NE: 'NE' }
  }
}
```

### 4.5 Synchronisation offline → backend

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Action      │     │  IndexedDB    │     │  Backend    │
│  utilisateur │────→│  store events │────→│  pushEvents │
│              │     │  synced:false │     │  EventLog   │
└─────────────┘     └──────────────┘     └─────────────┘
                           │                     │
                           │  ← synced:true ←────┘
                           │
                    ┌──────────────┐
                    │  Caches       │
                    │  mémoire      │
                    │  (projections)│
                    └──────────────┘

Stratégie :
1. Toute action → événement dans IndexedDB (immédiat, offline)
2. Cache mémoire recalculé (projections locales)
3. Si online → batch sync toutes les 10s
4. Si offline → accumulation, sync au retour réseau
5. sendBeacon en beforeunload (dernier recours)
```

---

## 5 — PLAN DE CONVERGENCE TECHNIQUE

### Phase 1 — Stabilisation architecture (Sprint 1-2)

| Étape | Action | Risque | Durée |
|-------|--------|--------|-------|
| 1.1 | Intégrer Édu v4 dans le repo (dossier edu/) | Faible | 1h |
| 1.2 | Intégrer Code.gs dans backend/ | Faible | 1h |
| 1.3 | Créer portail commun (index.html → choix EDU/PROG+) | Faible | 2h |
| 1.4 | Configurer Service Worker racine | Moyen | 3h |
| 1.5 | Créer manifest.json racine (PWA) | Faible | 1h |
| 1.6 | Tests de non-régression sur les deux modules | Critique | 4h |

**Livrable** : Les deux applications fonctionnent côte à côte, accessibles depuis un portail commun, sans interférence.

### Phase 2 — Migration données (Sprint 3-4)

| Étape | Action | Risque | Durée |
|-------|--------|--------|-------|
| 2.1 | Créer le référentiel formations.json unifié (classes + séquences) | Moyen | 4h |
| 2.2 | Créer le mapping niveaux (1-4 ↔ NE/NA/EC/M/PM) | Faible | 2h |
| 2.3 | Créer le storage bridge (lecture croisée IndexedDB) | Moyen | 6h |
| 2.4 | Migrer PROG+ vers event-sourcing (écriture) | Élevé | 8h |
| 2.5 | Unifier IndexedDB (une seule base, stores multiples) | Élevé | 6h |
| 2.6 | Adapter le backend pour accepter les nouveaux types d'événements | Moyen | 4h |

**Livrable** : Les deux modules écrivent dans le même EventLog. Les données sont lisibles par les deux côtés.

### Phase 3 — Fusion modules (Sprint 5-7)

| Étape | Action | Risque | Durée |
|-------|--------|--------|-------|
| 3.1 | Extraire les briques CORE partagées (events engine, storage, sync, auth) | Élevé | 8h |
| 3.2 | Créer le module EVAL unifié (3 taps + grille détaillée) | Élevé | 10h |
| 3.3 | Intégrer le copilote IA dans PROG+ | Moyen | 6h |
| 3.4 | Intégrer les alertes RADAR dans Édu | Moyen | 4h |
| 3.5 | Implémenter la couche RGPD sur PROG+ | Moyen | 6h |
| 3.6 | Unifier le système d'authentification | Moyen | 4h |

**Livrable** : Les modules partagent des briques communes. L'évaluation est unifiée.

### Phase 4 — Interface unifiée (Sprint 8-10)

| Étape | Action | Risque | Durée |
|-------|--------|--------|-------|
| 4.1 | Unifier le design system (une seule palette, une seule police) | Faible | 4h |
| 4.2 | Créer le dashboard unifié (agenda + progression + alertes) | Moyen | 8h |
| 4.3 | Navigation fluide entre EDU et PROG+ (sans rechargement) | Élevé | 10h |
| 4.4 | Mode élève unifié (journal + progression + agenda) | Moyen | 6h |
| 4.5 | Mode tuteur enrichi (agenda PFMP + évaluation) | Moyen | 6h |
| 4.6 | Tests end-to-end complets | Critique | 8h |

**Livrable** : INERWEB unifié avec navigation transparente entre tous les modules.

### Chronologie estimée

```
Sprint 1-2  │████████│ Phase 1 : Stabilisation
Sprint 3-4  │████████████████│ Phase 2 : Migration données
Sprint 5-7  │████████████████████████│ Phase 3 : Fusion modules
Sprint 8-10 │████████████████████████│ Phase 4 : Interface unifiée
            │                                              │
            Mars 2026                                  Été 2026
```

---

## 6 — RISQUES TECHNIQUES ET RECOMMANDATIONS

### 6.1 Dettes techniques

| Dette | Projet | Impact | Recommandation |
|-------|--------|--------|----------------|
| Monolithe SPA 1687 lignes | Édu | Maintenabilité | Découper en modules lors de la Phase 3 |
| Prof.html 4163 lignes | PROG+ | Maintenabilité | Continuer l'extraction (bilan, compétences) |
| Fonctions dupliquées prof.html ↔ core/ | PROG+ | Confusion | Supprimer les doublons quand les modules sont fiables |
| SEQUENCES hardcodés | Édu | Évolutivité | Migrer vers formations.json dès Phase 2 |
| Pas de tests automatisés | Les deux | Régression | Ajouter des tests E2E en Phase 4 |
| CSS inline dans chaque page | Les deux | Duplication | Extraire en fichier CSS commun |

### 6.2 Incompatibilités de modèle

| Incompatibilité | Détail | Solution |
|-----------------|--------|----------|
| **Niveaux d'évaluation** | Édu: 1-4 numérique / PROG+: NE/NA/EC/M/PM lettres | Table de correspondance bidirectionnelle |
| **Identifiants élèves** | Édu: `elv-tne-01` / PROG+: `ELV-001` | Mapping par {classe + nom + prénom} |
| **Identifiants séances** | Édu: `sea-DATE-classe-heure` / PROG+: pas de séances | Édu garde son format, PROG+ n'en a pas besoin |
| **Stockage photos** | Édu: IndexedDB (dataURL) / PROG+: Google Drive | Unifier sur IndexedDB local + sync Drive optionnelle |
| **API endpoints** | Deux URLs Google Apps Script différentes | Phase 1: garder les deux / Phase 3: unifier |

### 6.3 Risques RGPD

| Risque | Gravité | Mitigation |
|--------|---------|------------|
| PROG+ envoie des noms en clair au serveur | Élevée | Phase 3.5 : implémenter la couche RGPD |
| Photos élèves sur Google Drive | Moyenne | Migrer vers IndexedDB local + option Drive chiffrée |
| Pas de consentement explicite dans PROG+ | Moyenne | Ajouter un écran de consentement au premier lancement |
| Logs IA contiennent potentiellement des données | Faible | Le copilote ne reçoit que des codes anonymes (déjà ok) |

### 6.4 Risques performance

| Risque | Contexte | Mitigation |
|--------|----------|------------|
| EventLog croissant (milliers d'événements) | Rebuild des caches à chaque chargement | Pagination + cache persistent + rebuild incrémental |
| IndexedDB > 50 Mo (photos) | Photos dataURL volumineuses | Compression + limite de résolution + purge anciens |
| Sync batch volumineuse (100+ événements) | Reconnexion après longue période offline | Chunking (max 50 events/batch, déjà implémenté) |
| DOM lourd (200+ élèves) | Rendu de listes dans PROG+ | Virtualisation ou pagination |

### 6.5 Contraintes de déploiement

| Contrainte demandée | Faisabilité | Comment |
|--------------------|-------------|---------|
| **Fonctionner offline** | ✅ Natif | Service Worker + IndexedDB (déjà implémenté) |
| **Navigateur simple** | ✅ Natif | HTML/CSS/JS vanilla, pas de framework |
| **Déploiement clé USB** | ✅ Possible | Tous les fichiers sont statiques, pas de build. Copier le dossier sur USB, ouvrir index.html. Le backend Google reste en ligne. |
| **Serveur local** | ✅ Possible | `python -m http.server 8080` ou tout serveur statique |
| **Simple à maintenir** | ✅ Actuel | Pas de framework, pas de build, JS vanilla, fichiers indépendants |

### 6.6 Recommandations prioritaires

1. **Ne PAS fusionner le code tout de suite** — commencer par la Phase 1 (coexistence) et valider que rien ne casse
2. **Event-sourcing = priorité n°1** — c'est la fondation de la traçabilité CCF réglementaire
3. **RGPD = priorité n°2** — l'anonymisation doit être implémentée dans PROG+ avant toute mise en production avec de vrais élèves
4. **Garder les deux backends séparés** tant que le modèle de données n'est pas unifié
5. **Un seul formations.json** comme source de vérité pour les référentiels
6. **Tester sur 100+ élèves** avant chaque phase pour valider les performances

---

## ANNEXES

### A — Tableau de correspondance des niveaux

| Édu v4 | PROG+ | Signification | Couleur |
|--------|-------|---------------|---------|
| 1 | NA | Non acquis / Non maîtrisé | #e74c3c (rouge) |
| 2 | EC | En cours / Insuffisant | #f39c12 (orange) |
| 3 | M | Maîtrisé | #27ae60 (vert) |
| 4 | PM | Parfaitement maîtrisé | #2196F3 (bleu) |
| NE | NE | Non évalué | #999 (gris) |
| ABS | — | Absent (Édu uniquement) | #ccc |

### B — Registre classes unifié

| Classe (PROG+) | Classe (Édu) | Filière | Épreuves |
|----------------|-------------|---------|----------|
| CAP IFCA 1 | CAP1 IFCA | CAP_IFCA | EP2, EP3 |
| CAP IFCA 2 | CAP2 IFCA | CAP_IFCA | EP2, EP3 |
| 1ère MFER | — | MFER | E31, E32, E33 |
| Term MFER | TMFER | MFER | E31, E32, E33 |
| 2nde TNE | 2TNE | TNE | CT |
| — | CFA ÉTAM 1A | CFA_ETAM | — |
| — | CFA ÉTAM 2A | CFA_ETAM | — |
| — | CFA MPI 1A | CFA_MPI | — |
| — | CFA MPI 2A | CFA_MPI | — |
| — | TP Sup CVC | TP_CVC | — |

### C — Fichiers de référence

| Fichier | Lignes | Module |
|---------|--------|--------|
| inerweb_prof.html | 4163 | PROG+ |
| inerweb_tuteur.html | 1283 | PFMP |
| inerweb_eleve.html | 990 | PFMP |
| inerweb_admin.html | 854 | Admin |
| progression.html | 717 | PROG |
| edu/index.html | 1687 | EDU |
| backend/Code.gs | 1174 | Backend |
| data/formations.json | ~500 | Référentiels |
| js/ (34 fichiers) | ~8000 | Modules |
| **Total** | **~19 000** | |
