# inerWeb TT — Configuration complète
# Si tu pars demain, tout est ici.

## Google Apps Script (Backend PRODUCTION — ne pas toucher)
- Script ID : 1svzEe4-YHpzpvmDzTqPbFied7LLwsC5SvnwCL9uviX9oGQtQtCW8Unua
- URL API : https://script.google.com/macros/s/AKfycbzEbzLo57x0u0k2wjAzyLdZ42iVZdHdOwmPd5Ioe6fjApuSftuSckZ9svKpajbyjEuhVg/exec
- Google Sheet ID : 1bmrZJKSg3eeo-tBhenK5KtErRFt1g8p-Uf_JVklpLfU
- Google Sheet URL : https://docs.google.com/spreadsheets/d/1bmrZJKSg3eeo-tBhenK5KtErRFt1g8p-Uf_JVklpLfU/edit
- Clasp local : C:/Users/henni/appscript-inerweb-tt

## Clefs de sécurité (PRODUCTION)
- Clé maître (onglet CONFIG) : IFCA4-MMDU-GG7G-KX39
- Clé legacy (Code.gs) : IFCA-2026-PROF-FH13013

## GitHub — PRODUCTION (gelée)
- Repo : https://github.com/frigorx/inerweb-tt-fusion
- Pages : https://frigorx.github.io/inerweb-tt-fusion/inerweb_prof.html
- Local : C:/Users/henni/inerweb-tt-fusion

## GitHub — V2.0 (développement)
- Repo : https://github.com/frigorx/inerweb-tt-v2
- Pages : https://frigorx.github.io/inerweb-tt-v2/inerweb_prof.html
- Local : C:/Users/henni/inerweb-tt-v2

## GitHub — V4 (ancienne stable)
- Repo : https://github.com/frigorx/inerweb-tt-v4
- Pages : https://frigorx.github.io/inerweb-tt-v4/inerweb_prof.html
- Local : C:/Users/henni/inerweb-tt-v4

## Onglets du Google Sheet
- ELEVES : liste des élèves avec tokens
- VALIDATIONS : évaluations EP2/EP3
- NOTES : notes finales par épreuve
- PFMP_JOURNAL : journal de stage (textes + liens photos Drive)
- PFMP_EVAL : évaluations tuteur
- CUSTOM_CRITERIA : critères personnalisés par élève
- USERS : utilisateurs multi-profs
- ADMIN_LOG : log des actions admin
- CONFIG : clés de sécurité (master_key, admin_key)
- LOG : log des appels API

## Google Drive — Photos
- Dossier racine : inerWeb-TT-Photos (créé automatiquement dans le Drive du compte)
- Sous-dossiers par élève (ELV-xxx)
- Partage : lien public en lecture

## Structure des fichiers
- backup-complet/appscript/ : Code.gs + HTML Apps Script (backend complet)
- backup-complet/fusion-github/ : tout le frontend production
- backup-complet/sources-originales/ : v8 et v11 (les fichiers HTML originaux avant fusion)
- backup-complet/v4-stable/ : v4.8 (ancienne version stable)
- backup-database.json : export complet de toutes les données (élèves, validations, notes, journal, évaluations tuteur)

## Pour reconstruire depuis zéro
1. Créer un nouveau Google Sheet avec les onglets ci-dessus
2. Créer un projet Apps Script, coller Code.js
3. Déployer en webapp (Exécuter en tant que : moi, accès : tout le monde)
4. Mettre l'URL de déploiement dans la config de l'interface prof
5. Créer la clé master dans l'onglet CONFIG (colonne A: master_key, colonne B: ta clé)
6. Héberger le frontend sur GitHub Pages ou n'importe quel serveur statique
