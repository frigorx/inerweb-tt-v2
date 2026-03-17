# Tests manuels — inerWeb TT-IA v7.6.0

## Connexion élève (inerweb_eleve.html)
- [ ] Saisir token valide → connexion réussie, données élève affichées
- [ ] Saisir token invalide → message d'erreur "Code non reconnu"
- [ ] Saisir "DEMO" → mode démo activé, données fictives chargées
- [ ] Saisir "TEST" → mode démo activé
- [ ] Vérifier que la clé API est envoyée dans la requête (onglet Réseau)

## Journal de bord élève
- [ ] Ajouter une entrée texte → entrée visible dans le journal
- [ ] Ajouter une photo → photo affichée en miniature
- [ ] Modifier une entrée → modification sauvegardée
- [ ] Supprimer une entrée → entrée retirée
- [ ] Synchroniser → bouton sync tourne, entrées marquées synced

## Connexion tuteur (inerweb_tuteur.html)
- [ ] Saisir code élève + token tuteur valides → connexion réussie
- [ ] Saisir identifiants invalides → message "Accès refusé"
- [ ] Scanner QR code valide → connexion réussie
- [ ] Vérifier que la clé API est envoyée dans la requête (onglet Réseau)

## Évaluation tuteur
- [ ] Évaluer des compétences → niveaux sélectionnés correctement
- [ ] Valider l'évaluation → envoi réussi, message de confirmation
- [ ] Évaluation hors ligne → sauvegarde locale, renvoi automatique au retour réseau

## Connexion prof (inerweb_prof.html)
- [ ] Ouvrir la page → dashboard affiché
- [ ] Sélectionner une classe → liste d'élèves chargée
- [ ] Créer une séance → séance visible dans la liste

## Évaluation prof
- [ ] Évaluer un élève (quick eval) → sauvegarde OK
- [ ] Évaluer via grille → toutes les compétences enregistrées
- [ ] Relire l'évaluation → données correctes

## Bilan CCF (ccf-bilan.html)
- [ ] Sélectionner un élève → bilan affiché
- [ ] Vérifier les notes calculées → cohérentes avec les évaluations

## Export
- [ ] Export PDF → fichier généré et téléchargeable
- [ ] Export CSV → fichier généré et téléchargeable

## Smoke test (tests/smoke-test.html)
- [ ] Ouvrir dans un navigateur → tous les tests passent (347+)
