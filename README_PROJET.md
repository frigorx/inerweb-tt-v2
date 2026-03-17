# inerWeb TT-IA — v7.6.0

Plateforme de pilotage pédagogique pour les formations Froid & Climatisation (CAP IFCA, Bac Pro MFER, 2nde TNE).

## Architecture

```
inerweb-tt-ia_v7.6.0/
├── index.html              ← Page d'accueil / vitrine
├── inerweb_prof.html       ← Interface enseignant (dashboard, séances, évals)
├── inerweb_eleve.html      ← Interface élève (journal PFMP, compétences)
├── inerweb_tuteur.html     ← Interface tuteur entreprise (éval PFMP)
├── inerweb_admin.html      ← Administration (users, config)
├── ccf-bilan.html          ← Bilan CCF
├── tp-library.html         ← Bibliothèque de TP
├── backend/
│   ├── Code.gs             ← Backend Google Apps Script (v3.0.0)
│   └── archives/           ← Anciennes versions (ne pas utiliser)
├── js/
│   ├── core/               ← Config, API, modules fondamentaux
│   ├── eval/               ← Moteur d'évaluation
│   ├── export/             ← Export PDF/Excel
│   ├── ia/                 ← Intégration Gemini (copilote IA)
│   ├── security/           ← Chiffrement, PIN, RGPD
│   └── ...
├── css/                    ← Styles
├── data/                   ← Données statiques (référentiels)
├── docs/                   ← Documentation technique
│   ├── API_CONTRAT.md      ← Contrat API front/back
│   └── TESTS_MANUELS.md   ← Checklist de tests
└── tests/
    └── smoke-test.html     ← Tests automatisés (347+)
```

## Stack technique

- **Frontend** : HTML/CSS/JS vanilla (pas de framework)
- **Backend** : Google Apps Script (déployé en Web App)
- **Base de données** : Google Sheets (event-sourcing + projections CQRS)
- **IA** : Google Gemini (copilote pédagogique)
- **Sécurité** : Chiffrement AES-256-GCM, PIN, RGPD

## Démarrage rapide

1. Configurer le backend (voir `backend/README.md`)
2. Copier l'URL de déploiement dans `js/core/inerweb.config.js`
3. Ouvrir `index.html` dans un navigateur

## Documentation

- `CHANGELOG.md` — Historique des versions
- `docs/API_CONTRAT.md` — Documentation de l'API
- `docs/TESTS_MANUELS.md` — Checklist de tests manuels
- `backend/README.md` — Guide de déploiement backend
