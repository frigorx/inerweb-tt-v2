/**
 * state.js — Gestion centralisee de l'etat (appState namespace)
 * Extrait de inerweb_prof.html [B] ETAT GLOBAL
 * Doit etre charge APRES core.js
 */
;(function(){
  'use strict';

  /* ═══ ÉTAT GLOBAL (appState namespace) ═══ */
  window.appState = {
    data:    { students:[], validations:{}, notes:{}, pfmpData:{}, partenaires:[], customCriteria:{}, compLocks:{}, sharedDocs:[] },
    config:  { cfg:{}, appCfg:{} },
    admin:   { users:[], classes:[], adminJournal:[] },
    ui:      { cur:null, curCtx:'atelier', curSit:'A', curPhase:'formatif' },
    session: { online:false, demoMode:false, isAdmin:false, currentUser:null }
  };

  /* Helper : defineProperty sécurisé (ne crashe pas si la propriété existe déjà) */
  function safeProp(obj, name, target, key) {
    try {
      Object.defineProperty(obj, name, {
        get: function(){ return target[key]; },
        set: function(v){ target[key] = v; },
        configurable: true,
        enumerable: true
      });
    } catch(e) {
      // La propriété existe déjà et n'est pas configurable — on la laisse
    }
  }

  /* Alias retro-compatibles (getters/setters bidirectionnels) */
  // — data —
  safeProp(window, 'students',        appState.data, 'students');
  safeProp(window, 'validations',     appState.data, 'validations');
  safeProp(window, 'notes',           appState.data, 'notes');
  safeProp(window, 'pfmpData',        appState.data, 'pfmpData');
  safeProp(window, 'partenaires',     appState.data, 'partenaires');
  safeProp(window, 'customCriteria',  appState.data, 'customCriteria');
  safeProp(window, 'compLocks',       appState.data, 'compLocks');
  safeProp(window, 'sharedDocs',      appState.data, 'sharedDocs');
  // — config —
  safeProp(window, 'cfg',    appState.config, 'cfg');
  safeProp(window, 'appCfg', appState.config, 'appCfg');
  // — admin —
  safeProp(window, 'users',        appState.admin, 'users');
  safeProp(window, 'classes',      appState.admin, 'classes');
  safeProp(window, 'adminJournal', appState.admin, 'adminJournal');
  // — ui —
  safeProp(window, 'cur',      appState.ui, 'cur');
  safeProp(window, 'curCtx',   appState.ui, 'curCtx');
  safeProp(window, 'curSit',   appState.ui, 'curSit');
  safeProp(window, 'curPhase', appState.ui, 'curPhase');
  // — session —
  safeProp(window, 'online',      appState.session, 'online');
  safeProp(window, 'demoMode',    appState.session, 'demoMode');
  safeProp(window, 'isAdmin',     appState.session, 'isAdmin');
  safeProp(window, 'currentUser', appState.session, 'currentUser');

})();
