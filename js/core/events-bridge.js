/**
 * INERWEB — Pont events-bridge v1.0
 * Intercepte les actions PROG+ pour les enregistrer dans le event log unifié.
 * Se branche APRÈS le chargement de events.js et api.js.
 * Aucune modification des fichiers existants nécessaire.
 */
(function(){
  'use strict';

  // Attendre que iwEvents et apiCall soient disponibles
  var checkInterval = setInterval(function(){
    if(!window.iwEvents || typeof window.apiCall !== 'function') return;
    clearInterval(checkInterval);
    bridgeApiCall();
  }, 200);

  // Timeout safety — arrêter après 10s si les dépendances ne chargent pas
  setTimeout(function(){ clearInterval(checkInterval); }, 10000);

  function bridgeApiCall(){
    var originalApiCall = window.apiCall;

    // Mapping action → type d'événement
    var actionToEvent = {
      'saveValidation':     'validation.enregistree',
      'addEleve':           'eleve.ajoute',
      'deleteEleve':        'eleve.supprime',
      'addJournalEntry':    'journal.ajoute',
      'cloturerEpreuve':    'bilan.cloture',
      'deverrouillerEpreuve':'bilan.deverrouille'
    };

    window.apiCall = async function(params){
      // Appeler la fonction originale
      var result = await originalApiCall(params);

      // Si l'action est mappée, écrire l'événement
      var eventType = actionToEvent[params.action];
      if(eventType){
        try {
          var cible = params.eleve || (params.data && params.data.nom ? params.data.nom + '_' + params.data.prenom : '') || '';
          var payload = {};

          switch(params.action){
            case 'saveValidation':
              payload = params.data || {};
              cible = params.eleve || '';
              break;
            case 'addEleve':
              payload = params.data || {};
              cible = (params.data.nom || '') + '_' + (params.data.prenom || '');
              break;
            case 'deleteEleve':
              payload = { code: params.eleve };
              cible = params.eleve || '';
              break;
            case 'addJournalEntry':
              payload = { entry: params.entry };
              cible = params.eleve || '';
              break;
            case 'cloturerEpreuve':
            case 'deverrouillerEpreuve':
              payload = params.data || {};
              cible = params.eleve || '';
              break;
          }

          window.iwEvents.pushEvent(eventType, cible, payload, 'prog');
        } catch(e){
          console.warn('[events-bridge] Erreur enregistrement événement:', e.message);
        }
      }

      return result;
    };

    console.log('[events-bridge] Pont activé — actions PROG+ → event log');
  }
})();
