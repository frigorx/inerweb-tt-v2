# Contrat API — inerWeb TT-IA v7.6.1

## Authentification

Toutes les requêtes nécessitent le paramètre `key` (clé API configurée dans les propriétés du script Google Apps Script).

- **GET** : `key` en paramètre d'URL
- **POST** : `key` en paramètre d'URL **ou** `apiKey` dans le body JSON

Le backend est **fail-closed** : si `API_KEY` n'est pas configurée côté serveur, tout est bloqué.

---

## Actions GET

| Action | Paramètres | Réponse | Pages concernées |
|--------|------------|---------|------------------|
| `ping` | key | `{status, version, timestamp}` | toutes (test connectivité) |
| `getSeances` | key, enseignant, [filtres] | `[{seance}]` | inerweb_prof.html |
| `getSeancesSemaine` | key, enseignant, weekStart | `[{seance}]` | inerweb_prof.html |
| `getEvents` | key, enseignant, limit | `[{event}]` | inerweb_prof.html |
| `getEleves` | key, classe | `[{eleve}]` | inerweb_prof.html |
| `getReferentiel` | key, diplomeId | `{referentiel}` | inerweb_prof.html |
| `getEvaluations` | key, eleveId, classe, formation | `[{evaluation}]` | inerweb_prof.html |
| `getBilanCCF` | key, eleveId, formation | `{bilan}` | ccf-bilan.html |
| `verifyEleveToken` | key, token, [eleve] | `{ok, success, eleve}` | inerweb_eleve.html |
| `verifyTuteurToken` | key, eleve, tuteur | `{ok, success, eleve, tuteur, entreprise}` | inerweb_tuteur.html |
| `getUsers` | key, adminKey | `{users}` | inerweb_admin.html |

### Notes sur verifyEleveToken (v7.6.0)
- Accepte `token` seul (recherche par token uniquement)
- Accepte `eleve` + `token` (recherche par code élève ET token)
- Le paramètre `eleve` est optionnel depuis v7.6.0

---

## Actions POST

Le body doit être un JSON valide avec `Content-Type: text/plain`.

**Note v7.6.1** : Le paramètre `action` peut être envoyé soit dans le body JSON (`body.action`), soit dans l'URL (`?action=...`). Le backend accepte les deux.

| Action | Body | Réponse | Pages concernées |
|--------|------|---------|------------------|
| `pushEvents` | `{apiKey, events:[]}` | `{success, count}` | inerweb_prof.html |
| `enrichirTexteED` | `{apiKey, seanceId, enseignant}` | `{texte}` | inerweb_prof.html |
| `askCopilot` | `{apiKey, texte, enseignant, style}` | `{reponse}` | inerweb_prof.html |
| `importEcoleDirecte` | `{apiKey, icalUrl, enseignant}` | `{success, count}` | inerweb_prof.html |
| `addUser` | `{apiKey, adminKey, user}` | `{success}` | inerweb_admin.html |
| `updateUser` | `{apiKey, adminKey, user}` | `{success}` | inerweb_admin.html |
| `deleteUser` | `{apiKey, adminKey, userId}` | `{success}` | inerweb_admin.html |
| `deleteEleve` | `{apiKey, eleve}` | `{success}` | inerweb_prof.html |
| `generateTokens` | `{apiKey, classe}` | `{success, tokens}` | inerweb_prof.html |
| `askGemini` | `{apiKey, ...params}` | `{reponse}` | inerweb_prof.html |
| `addJournalEntry` | `{apiKey, token, eleve, entry}` | `{ok, success}` | inerweb_eleve.html |
| `saveEvalTuteur` | `{apiKey, eleve, tuteur, data}` | `{ok, success}` | inerweb_tuteur.html |

---

## Codes d'erreur

| Code | Message | Cause |
|------|---------|-------|
| 403 | Accès refusé : Clé API invalide | `key`/`apiKey` manquant ou incorrect |
| — | Clé admin invalide | `adminKey` manquant ou incorrect (actions admin) |
| — | Action inconnue | Paramètre `action` non reconnu |
| — | JSON invalide | Body POST mal formé |
| — | Token invalide | Token élève non trouvé |
| — | Token tuteur invalide | Token tuteur non trouvé |
