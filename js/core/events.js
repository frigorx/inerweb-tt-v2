;(function(){
  'use strict';

  var DB_NAME = 'inerweb';
  var DB_VERSION = 1;
  var STORES = {
    events:      { keyPath: 'eventId', indexes: [['synced','synced'],['type','type'],['timestamp','timestamp'],['cible','cible']] },
    config:      { keyPath: 'key' },
    seances:     { keyPath: 'id', indexes: [['date','date'],['classe','classe']] },
    students:    { keyPath: 'code', indexes: [['classe','classe']] },
    validations: { keyPath: 'id' },
    pfmpData:    { keyPath: 'code' },
    photos:      { keyPath: 'id', indexes: [['type','type']] },
    documents:   { keyPath: 'id' },
    syncQueue:   { keyPath: 'id', autoIncrement: true }
  };

  // Types d'evenements autorises (whitelist)
  var EVENT_TYPES = [
    // Edu
    'seance.validee','seance.invalidee','seance.creee','seance.annulee',
    'competence.evaluee','texte_ed.genere','texte_ed.copie',
    'ical.imported','cfa.imported',
    // PROG+
    'validation.enregistree',  // critere valide NE/NA/EC/M/PM
    'observation.ajoutee',     // observation sur eleve
    'pfmp.evaluee',            // evaluation tuteur
    'jury.designe',            // evaluateur assigne
    'phase.changee',           // formatif->certificatif
    'document.partage',        // document ajoute
    'eleve.ajoute',            // nouvel eleve
    'eleve.modifie',           // modification
    'photo.ajoutee',           // photo stage
    'signature.enregistree',   // signature numerique
    'bilan.cloture',           // epreuve cloturee
    'bilan.deverrouille',      // epreuve deverrouillee
    'eleve.supprime',          // eleve supprime
    'journal.ajoute',          // entree journal
    // Evaluation unifiee (Phase 2)
    'eval.created',            // evaluation structuree
    'eval.updated',            // modification evaluation
    'eval.deleted',            // suppression logique
    'eval.level_set',          // saisie rapide (3 taps)
    'eval.comment_added',      // commentaire ajoute
    'eval.bulk_applied',       // evaluation par lot
    'eval.pfmp_recorded',      // evaluation PFMP
    'eval.ccf_recorded',       // evaluation CCF certificative
    'eval.grid_completed',     // grille completee
    'eval.note_generated'      // note calculee
  ];

  var _db = null;

  // Ouvrir la base
  function openDB(){
    return new Promise(function(resolve, reject){
      if(_db){ resolve(_db); return; }
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function(e){
        var db = e.target.result;
        Object.keys(STORES).forEach(function(name){
          if(!db.objectStoreNames.contains(name)){
            var cfg = STORES[name];
            var store = db.createObjectStore(name, { keyPath: cfg.keyPath, autoIncrement: cfg.autoIncrement || false });
            if(cfg.indexes){
              cfg.indexes.forEach(function(idx){
                store.createIndex(idx[0], idx[1], { unique: false });
              });
            }
          }
        });
      };
      req.onsuccess = function(e){ _db = e.target.result; resolve(_db); };
      req.onerror = function(e){ reject(e.target.error); };
    });
  }

  // Generer un eventId unique
  function genEventId(){
    return 'evt-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2,6);
  }

  // Creer un evenement
  function createEvent(type, cible, donnees, acteur, source){
    if(EVENT_TYPES.indexOf(type) === -1){
      console.warn('[events] Type non autorise :', type);
      return null;
    }
    return {
      eventId: genEventId(),
      timestamp: new Date().toISOString(),
      type: type,
      acteur: acteur || window._currentActeur || 'unknown',
      cible: cible || '',
      donnees: donnees || {},
      source: source || 'pwa',
      synced: false
    };
  }

  // Ecrire un evenement dans IndexedDB
  async function pushEvent(type, cible, donnees, acteur, source){
    var evt = createEvent(type, cible, donnees, acteur, source);
    if(!evt) return null;
    var db = await openDB();
    return new Promise(function(resolve, reject){
      var tx = db.transaction('events','readwrite');
      tx.objectStore('events').put(evt);
      tx.oncomplete = function(){ resolve(evt); };
      tx.onerror = function(e){ reject(e.target.error); };
    });
  }

  // Lire tous les evenements
  async function getAllEvents(){
    var db = await openDB();
    return new Promise(function(resolve, reject){
      var tx = db.transaction('events','readonly');
      var req = tx.objectStore('events').getAll();
      req.onsuccess = function(){ resolve(req.result || []); };
      req.onerror = function(e){ reject(e.target.error); };
    });
  }

  // Lire les evenements non synchronises
  async function getPendingEvents(){
    var db = await openDB();
    return new Promise(function(resolve, reject){
      var tx = db.transaction('events','readonly');
      var idx = tx.objectStore('events').index('synced');
      var req = idx.getAll(false);
      req.onsuccess = function(){ resolve(req.result || []); };
      req.onerror = function(e){ reject(e.target.error); };
    });
  }

  // Marquer des evenements comme synchronises
  async function markSynced(eventIds){
    var db = await openDB();
    return new Promise(function(resolve, reject){
      var tx = db.transaction('events','readwrite');
      var store = tx.objectStore('events');
      var done = 0;
      eventIds.forEach(function(id){
        var req = store.get(id);
        req.onsuccess = function(){
          if(req.result){
            req.result.synced = true;
            store.put(req.result);
          }
          done++;
          if(done === eventIds.length) resolve(done);
        };
      });
      if(!eventIds.length) resolve(0);
      tx.onerror = function(e){ reject(e.target.error); };
    });
  }

  // Lire les evenements par type
  async function getEventsByType(type){
    var db = await openDB();
    return new Promise(function(resolve, reject){
      var tx = db.transaction('events','readonly');
      var idx = tx.objectStore('events').index('type');
      var req = idx.getAll(type);
      req.onsuccess = function(){ resolve(req.result || []); };
      req.onerror = function(e){ reject(e.target.error); };
    });
  }

  // Lire les evenements par cible
  async function getEventsByCible(cible){
    var db = await openDB();
    return new Promise(function(resolve, reject){
      var tx = db.transaction('events','readonly');
      var idx = tx.objectStore('events').index('cible');
      var req = idx.getAll(cible);
      req.onsuccess = function(){ resolve(req.result || []); };
      req.onerror = function(e){ reject(e.target.error); };
    });
  }

  // Compter les evenements en attente
  async function pendingCount(){
    var evts = await getPendingEvents();
    return evts.length;
  }

  // -- CRUD generique sur les stores --

  async function dbGet(storeName, key){
    var db = await openDB();
    return new Promise(function(resolve, reject){
      var tx = db.transaction(storeName,'readonly');
      var req = tx.objectStore(storeName).get(key);
      req.onsuccess = function(){ resolve(req.result || null); };
      req.onerror = function(e){ reject(e.target.error); };
    });
  }

  async function dbPut(storeName, value){
    var db = await openDB();
    return new Promise(function(resolve, reject){
      var tx = db.transaction(storeName,'readwrite');
      tx.objectStore(storeName).put(value);
      tx.oncomplete = function(){ resolve(value); };
      tx.onerror = function(e){ reject(e.target.error); };
    });
  }

  async function dbGetAll(storeName){
    var db = await openDB();
    return new Promise(function(resolve, reject){
      var tx = db.transaction(storeName,'readonly');
      var req = tx.objectStore(storeName).getAll();
      req.onsuccess = function(){ resolve(req.result || []); };
      req.onerror = function(e){ reject(e.target.error); };
    });
  }

  async function dbDelete(storeName, key){
    var db = await openDB();
    return new Promise(function(resolve, reject){
      var tx = db.transaction(storeName,'readwrite');
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = function(){ resolve(true); };
      tx.onerror = function(e){ reject(e.target.error); };
    });
  }

  async function dbClear(storeName){
    var db = await openDB();
    return new Promise(function(resolve, reject){
      var tx = db.transaction(storeName,'readwrite');
      tx.objectStore(storeName).clear();
      tx.oncomplete = function(){ resolve(true); };
      tx.onerror = function(e){ reject(e.target.error); };
    });
  }

  // -- Projections (recalcul de l'etat depuis les evenements) --

  async function rebuildProjections(){
    var events = await getAllEvents();
    var validCache = {};
    var evalCache = {};

    events.sort(function(a,b){ return a.timestamp < b.timestamp ? -1 : 1; });

    events.forEach(function(e){
      // Seances
      if(e.type === 'seance.validee') validCache[e.cible] = true;
      if(e.type === 'seance.invalidee') validCache[e.cible] = false;

      // Evaluations (Edu style: niveaux 1-4)
      if(e.type === 'competence.evaluee'){
        var key = e.cible + '|' + (e.donnees.competenceCode||'') + '|' + (e.donnees.seanceId||'global');
        evalCache[key] = e.donnees.niveau;
      }

      // Validations (PROG+ style: NE/NA/EC/M/PM)
      if(e.type === 'validation.enregistree'){
        var key2 = e.cible + '|' + (e.donnees.epreuve||'') + '|' + (e.donnees.competence||'') + '|' + (e.donnees.critere||'');
        evalCache[key2] = e.donnees.niveau;
      }
    });

    return { validCache: validCache, evalCache: evalCache, eventCount: events.length };
  }

  // API publique
  window.iwEvents = {
    openDB: openDB,
    pushEvent: pushEvent,
    getAllEvents: getAllEvents,
    getPendingEvents: getPendingEvents,
    markSynced: markSynced,
    getEventsByType: getEventsByType,
    getEventsByCible: getEventsByCible,
    pendingCount: pendingCount,
    rebuildProjections: rebuildProjections,
    createEvent: createEvent,
    EVENT_TYPES: EVENT_TYPES,
    DB_NAME: DB_NAME,
    STORES: STORES,
    // CRUD generique
    dbGet: dbGet,
    dbPut: dbPut,
    dbGetAll: dbGetAll,
    dbDelete: dbDelete,
    dbClear: dbClear
  };

})();
