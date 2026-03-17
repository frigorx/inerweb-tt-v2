# Architecture — INERWEB PROG+

## Vision
INERWEB est une plateforme modulaire pour le suivi pédagogique CCF multi-filière.

## Modules fonctionnels
```
INERWEB
├── PROG+ (progression pédagogique) ← ce projet
├── TT (TP interactifs) ← futur
├── EVAL (évaluations) ← intégré dans PROG+
├── PFMP (suivi entreprise) ← intégré dans PROG+
└── RADAR (alertes élèves) ← intégré dans PROG+
```

## Architecture technique
```
inerweb_prog_plus/
├── index.html           — Portail d'entrée
├── inerweb_prof.html    — Interface professeur
├── inerweb_eleve.html   — Interface élève
├── inerweb_tuteur.html  — Interface tuteur
├── progression.html     — Vue progression
├── js/
│   ├── core/            — Noyau technique
│   │   ├── core.js      — Utilitaires (esc, toast, etc.)
│   │   ├── state.js     — État centralisé (appState)
│   │   ├── api.js       — Appels API (POST/GET)
│   │   ├── utils.js     — Stockage + synchronisation
│   │   └── syncQueue.js — Queue offline-first
│   ├── prog/            — Progression pédagogique
│   │   ├── prog-model.js— Modèle filières/compétences
│   │   ├── prog-data.js — Calculs progression
│   │   └── prog-ui.js   — Rendu barres/pourcentages
│   ├── radar/           — Visualisation compétences
│   │   └── radarCompetences.js
│   ├── alerts/          — Système d'alertes
│   │   └── alertSystem.js
│   └── modules/         — Modules fonctionnels
│       ├── activites.js, alertes.js, documents.js...
├── data/
│   └── formations.json  — Référentiel pédagogique
├── docs/                — Documentation
└── tests/               — Tests de fumée
```

## Flux de données
1. Saisie → localStorage + IndexedDB
2. Online → apiCall() POST → Google Apps Script → Google Sheets
3. Offline → syncQueue.push() → retry automatique à la reconnexion
4. Sync → syncAll() → chargement complet depuis le serveur

## Modèle pédagogique
Filière → Formation → Année → Période → Séquence → Activité → Compétence

## Filières supportées
- CAP IFCA (EP2 + EP3)
- Bac Pro MFER (E31 + E32 + E33)
- 2nde TNE (CT)

## Sécurité
- XSS : esc() systématique sur innerHTML
- API : POST pour les écritures, clé dans body JSON
- Rôles : vérification côté client (limitation connue)
