/**
 * core/sync-unified.js — Synchronisation unifiee bidirectionnelle
 *
 * Pont entre le moteur d'evenements local (iwEvents) et les backends
 * Google Apps Script (Edu + PROG+).
 *
 * Depend de : js/core/events.js (iwEvents)
 * Expose : window.iwSync
 */
;(function(){
  'use strict';

  // ---- Configuration interne ----
  var _config = {
    eduUrl:  '',
    eduKey:  '',
    progUrl: '',
    progKey: '',
    acteur:  ''
  };

  var _autoSyncTimer = null;
  var _syncing = false;

  // ---- Types Edu (event-sourcing batch) ----
  var EDU_TYPES = [
    'seance.validee','seance.invalidee','seance.creee','seance.annulee',
    'competence.evaluee','texte_ed.genere','texte_ed.copie',
    'ical.imported','cfa.imported'
  ];

  // ---- Mapping PROG+ : type evenement → action API ----
  var PROG_MAP = {
    'validation.enregistree': 'saveValidation',
    'eleve.ajoute':           'addEleve',
    'eleve.modifie':          'addEleve',
    'bilan.cloture':          'cloturerEpreuve'
  };

  // Types PROG+ sans endpoint dédié → fallback localStorage
  var PROG_LOCAL_TYPES = [
    'observation.ajoutee','pfmp.evaluee','jury.designe',
    'phase.changee','document.partage','photo.ajoutee',
    'signature.enregistree'
  ];

  // ---- Helpers ----

  function isEduType(type){ return EDU_TYPES.indexOf(type) !== -1; }

  function isProgType(type){
    return !!PROG_MAP[type] || PROG_LOCAL_TYPES.indexOf(type) !== -1;
  }

  /**
   * POST generique vers un backend GAS
   */
  async function postGAS(url, key, action, payload){
    var endpoint = new URL(url);
    endpoint.searchParams.set('action', action);
    var body = Object.assign({}, payload, { key: key });
    var r = await fetch(endpoint.toString(), {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(body)
    });
    var d = await r.json();
    if(d.error && d.code === 403) throw new Error('Acces refuse');
    if(d.error) throw new Error(d.error);
    return d;
  }

  /**
   * Stocker un evenement localement (fallback CRUD)
   */
  function storeLocal(evt){
    var key = 'iwSync_local_' + evt.type;
    var arr = [];
    try { arr = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e){}
    arr.push(evt);
    localStorage.setItem(key, JSON.stringify(arr));
  }

  // ---- API publique ----

  /**
   * configure — Initialise les URLs et cles des backends
   */
  function configure(opts){
    if(opts.eduUrl)  _config.eduUrl  = opts.eduUrl;
    if(opts.eduKey)  _config.eduKey  = opts.eduKey;
    if(opts.progUrl) _config.progUrl = opts.progUrl;
    if(opts.progKey) _config.progKey = opts.progKey;
    if(opts.acteur)  _config.acteur  = opts.acteur;
    console.log('[iwSync] Configure', {
      edu: _config.eduUrl ? 'OK' : 'non',
      prog: _config.progUrl ? 'OK' : 'non'
    });
  }

  /**
   * syncEvents — Sync batch vers le backend Edu (event-sourcing)
   */
  async function syncEvents(){
    if(!_config.eduUrl) throw new Error('[iwSync] eduUrl non configuree');
    if(!navigator.onLine) throw new Error('[iwSync] Hors-ligne');

    var pending = await window.iwEvents.getPendingEvents();
    var eduEvents = pending.filter(function(e){ return isEduType(e.type); });

    if(eduEvents.length === 0) return { sent: 0, written: 0, duplicates: 0 };

    // POST batch vers backend Edu
    var result = await postGAS(_config.eduUrl, _config.eduKey, 'pushEvents', {
      events: eduEvents
    });

    // Marquer comme synced
    var ids = eduEvents.map(function(e){ return e.eventId; });
    await window.iwEvents.markSynced(ids);

    return {
      sent: eduEvents.length,
      written: result.written || eduEvents.length,
      duplicates: result.duplicates || 0
    };
  }

  /**
   * syncProg — Sync CRUD vers le backend PROG+
   */
  async function syncProg(){
    if(!_config.progUrl) throw new Error('[iwSync] progUrl non configuree');
    if(!navigator.onLine) throw new Error('[iwSync] Hors-ligne');

    var pending = await window.iwEvents.getPendingEvents();
    var progEvents = pending.filter(function(e){ return isProgType(e.type); });

    if(progEvents.length === 0) return { sent: 0, local: 0 };

    var sent = 0;
    var local = 0;
    var syncedIds = [];

    for(var i = 0; i < progEvents.length; i++){
      var evt = progEvents[i];
      var action = PROG_MAP[evt.type];

      if(action){
        // Appel API PROG+
        var payload = Object.assign({}, evt.donnees);

        // Ajouter la cible comme eleve si pertinent
        if(evt.cible) payload.eleve = evt.cible;

        try {
          await postGAS(_config.progUrl, _config.progKey, action, payload);
          syncedIds.push(evt.eventId);
          sent++;
        } catch(e){
          console.warn('[iwSync] Echec PROG+ pour', evt.eventId, ':', e.message);
          // Ne pas marquer comme synced, sera reessaye
        }
      } else {
        // Pas d'endpoint PROG+ → stocker localement
        storeLocal(evt);
        syncedIds.push(evt.eventId);
        local++;
      }
    }

    // Marquer les evenements traites
    if(syncedIds.length > 0){
      await window.iwEvents.markSynced(syncedIds);
    }

    return { sent: sent, local: local };
  }

  /**
   * syncAll — Synchronisation complete (les deux backends)
   */
  async function syncAll(){
    if(_syncing) return { edu: { skipped: true }, prog: { skipped: true } };
    _syncing = true;

    var results = { edu: null, prog: null };

    try {
      results.edu = await syncEvents();
    } catch(e){
      results.edu = { error: e.message };
    }

    try {
      results.prog = await syncProg();
    } catch(e){
      results.prog = { error: e.message };
    }

    _syncing = false;
    return results;
  }

  /**
   * startAutoSync — Timer automatique
   */
  function startAutoSync(intervalMs){
    intervalMs = intervalMs || 10000; // 10 secondes par defaut
    stopAutoSync();

    console.log('[iwSync] Auto-sync demarre, intervalle :', intervalMs, 'ms');

    _autoSyncTimer = setInterval(function(){
      if(!navigator.onLine){
        console.log('[iwSync] Hors-ligne, sync reportee');
        return;
      }
      syncAll().then(function(r){
        var eduSent = (r.edu && r.edu.sent) || 0;
        var progSent = (r.prog && r.prog.sent) || 0;
        if(eduSent > 0 || progSent > 0){
          console.log('[iwSync] Auto-sync :', eduSent, 'edu,', progSent, 'prog');
        }
      }).catch(function(e){
        console.warn('[iwSync] Erreur auto-sync :', e.message);
      });
    }, intervalMs);

    // Ecouter les evenements online pour retry immediat
    window.addEventListener('online', _onOnline);
    window.addEventListener('offline', _onOffline);
  }

  /**
   * stopAutoSync — Arrete le timer
   */
  function stopAutoSync(){
    if(_autoSyncTimer){
      clearInterval(_autoSyncTimer);
      _autoSyncTimer = null;
      console.log('[iwSync] Auto-sync arrete');
    }
    window.removeEventListener('online', _onOnline);
    window.removeEventListener('offline', _onOffline);
  }

  function _onOnline(){
    console.log('[iwSync] Connexion retablie, sync immediate...');
    syncAll().then(function(r){
      console.log('[iwSync] Sync post-reconnexion :', r);
    }).catch(function(e){
      console.warn('[iwSync] Erreur sync post-reconnexion :', e.message);
    });
  }

  function _onOffline(){
    console.log('[iwSync] Connexion perdue');
  }

  /**
   * isOnline — Etat de la connexion
   */
  function isOnline(){
    return navigator.onLine;
  }

  /**
   * pendingCount — Nombre d'evenements en attente
   */
  async function pendingCount(){
    return window.iwEvents.pendingCount();
  }

  // ---- Exposition ----
  window.iwSync = {
    configure:     configure,
    syncEvents:    syncEvents,
    syncProg:      syncProg,
    syncAll:       syncAll,
    startAutoSync: startAutoSync,
    stopAutoSync:  stopAutoSync,
    isOnline:      isOnline,
    pendingCount:  pendingCount
  };

})();
