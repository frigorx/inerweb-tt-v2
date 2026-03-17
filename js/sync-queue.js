/**
 * sync-queue.js — File d'attente de synchronisation en arrière-plan
 *
 * Gère l'envoi différé des actions vers le serveur Google Apps Script.
 * Les actions sont stockées dans IndexedDB (store 'syncQueue') et
 * dépilées progressivement, même en cas de coupure réseau.
 *
 * Dépendances globales : cfg.apiUrl, cfg.apiKey, apiCall(params)
 * Expose : window.syncQueue { init, push, flush, count, onDead }
 */
window.syncQueue = (function () {
  'use strict';

  // --- État interne ---
  var _db = null;           // Référence IndexedDB
  var _queue = [];           // Copie mémoire de la file
  var _timerID = null;       // ID du setInterval
  var _flushing = false;     // Verrou anti-concurrence
  var _initialized = false;  // Empêche les initialisations multiples
  var _onDeadCallback = null; // Callback pour les items abandonnés

  var MAX_RETRIES = 5;       // Tentatives max par action (augmenté de 3→5)
  var INTERVAL_MS = 5000;    // Fréquence de dépilage (5 s)
  var STORE_NAME = 'syncQueue';

  // =========================================================
  // Génération d'identifiant unique par action
  // =========================================================

  /**
   * Génère un uid court et unique pour chaque action.
   * Permet au serveur de dédupliquer les envois (sendBeacon + retry).
   */
  function _uid() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 8);
  }

  // =========================================================
  // Utilitaires IndexedDB
  // =========================================================

  /** Vérifie si le store existe dans la DB */
  function _hasStore() {
    return _db && _db.objectStoreNames.contains(STORE_NAME);
  }

  /**
   * Charge tous les items du store dans _queue.
   * Fusionne avec les items éventuellement déjà en mémoire
   * (push() appelé avant la fin du chargement).
   */
  function _loadFromDB() {
    return new Promise(function (resolve) {
      if (!_hasStore()) return resolve();
      try {
        var tx = _db.transaction(STORE_NAME, 'readonly');
        var store = tx.objectStore(STORE_NAME);
        var req = store.getAll();
        req.onsuccess = function () {
          var fromDB = req.result || [];
          // Fusionner : garder les items mémoire qui ne sont pas déjà dans la DB
          // (protège contre un push() concurrent pendant le chargement)
          var dbIds = {};
          fromDB.forEach(function (item) { if (item.id) dbIds[item.id] = true; });
          var orphans = _queue.filter(function (item) {
            return !item.id || !dbIds[item.id];
          });
          _queue = fromDB.concat(orphans);
          resolve();
        };
        req.onerror = function () { resolve(); };
      } catch (e) {
        console.warn('[syncQueue] Store indisponible, mode mémoire seul');
        resolve();
      }
    });
  }

  /**
   * Ajoute un item dans le store IndexedDB.
   * FIX #1 : ajout de reject dans le constructeur Promise.
   */
  function _addToDB(item) {
    return new Promise(function (resolve, reject) {
      if (!_hasStore()) return resolve();
      try {
        var tx = _db.transaction(STORE_NAME, 'readwrite');
        var store = tx.objectStore(STORE_NAME);
        var req = store.add(item);
        req.onsuccess = function () {
          item.id = req.result; // récupère l'auto-increment
          resolve(item);
        };
        req.onerror = function () { reject(req.error); };
      } catch (e) {
        reject(e);
      }
    });
  }

  /** Supprime un item du store par son id */
  function _removeFromDB(id) {
    return new Promise(function (resolve) {
      if (!_hasStore() || id == null) return resolve();
      try {
        var tx = _db.transaction(STORE_NAME, 'readwrite');
        var store = tx.objectStore(STORE_NAME);
        var req = store.delete(id);
        req.onsuccess = function () { resolve(); };
        req.onerror = function () { resolve(); };
      } catch (e) { resolve(); }
    });
  }

  /**
   * Met à jour un item existant dans IndexedDB (retries, etc.).
   * FIX #4 : persiste le compteur de retries pour survivre aux rechargements.
   */
  function _updateInDB(item) {
    return new Promise(function (resolve) {
      if (!_hasStore() || item.id == null) return resolve();
      try {
        var tx = _db.transaction(STORE_NAME, 'readwrite');
        var store = tx.objectStore(STORE_NAME);
        var req = store.put(item);
        req.onsuccess = function () { resolve(); };
        req.onerror = function () { resolve(); };
      } catch (e) { resolve(); }
    });
  }

  // =========================================================
  // Indicateur visuel (badge)
  // =========================================================

  /** Met à jour le badge #syncBadge avec le nombre d'items en attente */
  function _updateBadge() {
    var badge = document.getElementById('syncBadge');
    if (!badge) return;
    var n = _queue.length;
    badge.textContent = n > 0 ? n : '';
    badge.style.display = n > 0 ? 'inline-block' : 'none';
  }

  // =========================================================
  // Envoi d'une action unique
  // =========================================================

  /**
   * Tente d'envoyer une action au serveur via apiCall.
   * Injecte le uid dans les params pour permettre la déduplication serveur.
   * Retourne true en cas de succès, false sinon.
   */
  async function _sendItem(item) {
    try {
      // Injecter le uid pour déduplication côté serveur (FIX #6)
      var params = Object.assign({}, item.params, { _uid: item.uid });
      await apiCall(params);
      return true;
    } catch (err) {
      console.warn('[syncQueue] Échec envoi :', err.message || err);
      return false;
    }
  }

  // =========================================================
  // Dépilage de la queue
  // =========================================================

  /**
   * Traite tous les items de la queue, un par un.
   * FIX #2 : try/finally autour du verrou _flushing.
   * FIX #4 : persiste retries en DB après chaque échec.
   * FIX #7 : notifie via callback quand un item est abandonné.
   */
  async function _processQueue() {
    // Pas de double exécution
    if (_flushing) return;
    // Rien à faire
    if (_queue.length === 0) return;
    // Vérifier la connectivité (indicatif, pas fiable à 100%)
    if (typeof navigator.onLine !== 'undefined' && !navigator.onLine) return;

    _flushing = true;

    try {
      // Copie pour itérer sans conflit avec des push() concurrents
      var snapshot = _queue.slice();

      for (var i = 0; i < snapshot.length; i++) {
        var item = snapshot[i];
        var ok = await _sendItem(item);

        if (ok) {
          // Succès : retirer de la queue mémoire et du store
          _queue = _queue.filter(function (q) { return q !== item; });
          await _removeFromDB(item.id).catch(function () {});
        } else {
          // Échec : incrémenter le compteur de tentatives
          item.retries = (item.retries || 0) + 1;

          if (item.retries >= MAX_RETRIES) {
            // FIX #7 : notifier avant suppression (dead letter)
            console.error(
              '[syncQueue] Action abandonnée après ' + MAX_RETRIES + ' tentatives :',
              item.params
            );
            _notifyDead(item);
            _queue = _queue.filter(function (q) { return q !== item; });
            await _removeFromDB(item.id).catch(function () {});
          } else {
            // Persister le compteur de retries (FIX #4)
            await _updateInDB(item).catch(function () {});
          }
        }
      }
    } finally {
      // FIX #2 : libérer le verrou même en cas d'exception
      _flushing = false;
    }

    _updateBadge();
  }

  /**
   * Notifie l'appelant qu'un item a été définitivement abandonné.
   * Permet au code appelant d'afficher un toast ou de journaliser.
   */
  function _notifyDead(item) {
    if (typeof _onDeadCallback === 'function') {
      try {
        _onDeadCallback(item);
      } catch (e) {
        console.warn('[syncQueue] Erreur dans onDead callback :', e);
      }
    }
  }

  // =========================================================
  // Gestion de la fermeture de page
  // =========================================================

  /**
   * Tente d'envoyer les actions restantes via sendBeacon ou fetch keepalive.
   * FIX #3 : marque les items envoyés par beacon avec un flag 'beaconSent'.
   * Au rechargement, _processQueue ignorera ces items pendant un délai de grâce
   * pour éviter les doublons (le serveur devrait aussi dédupliquer via _uid).
   */
  function _onBeforeUnload() {
    if (_queue.length === 0) return;

    _queue.forEach(function (item) {
      // Marquer l'heure d'envoi beacon pour délai de grâce au rechargement
      item.beaconTs = Date.now();

      var payload = Object.assign({}, item.params, { _uid: item.uid });
      var url = cfg.apiUrl + '?key=' + encodeURIComponent(cfg.apiKey)
        + '&' + _serializeParams(payload);

      // Priorité à sendBeacon (fiable à la fermeture)
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url);
      } else {
        // Alternative : fetch avec keepalive
        try {
          fetch(url, { method: 'GET', keepalive: true });
        } catch (_) { /* dernier recours, rien à faire */ }
      }
    });

    // Persister le flag beaconTs en IndexedDB (synchrone best-effort)
    // Note : en beforeunload, les opérations async ne sont pas garanties,
    // mais IndexedDB est souvent honoré par les navigateurs.
    if (_hasStore()) {
      try {
        var tx = _db.transaction(STORE_NAME, 'readwrite');
        var store = tx.objectStore(STORE_NAME);
        _queue.forEach(function (item) {
          if (item.id != null) {
            store.put(item);
          }
        });
      } catch (_) { /* best-effort */ }
    }
  }

  /**
   * Sérialise un objet en query string.
   * FIX #9 : gère les valeurs objet/tableau via JSON.stringify.
   */
  function _serializeParams(params) {
    return Object.keys(params).map(function (k) {
      var v = params[k];
      // Sérialiser les objets/tableaux en JSON pour éviter [object Object]
      if (v !== null && typeof v === 'object') {
        v = JSON.stringify(v);
      }
      return encodeURIComponent(k) + '=' + encodeURIComponent(v == null ? '' : v);
    }).join('&');
  }

  // =========================================================
  // API publique
  // =========================================================

  /**
   * Initialise le module avec la référence IndexedDB existante.
   * Charge la queue persistée et démarre le timer de dépilage.
   * FIX #5 : protège contre les initialisations multiples.
   * @param {IDBDatabase} db - Base IndexedDB ouverte
   */
  async function init(db) {
    // FIX #5 : ne pas empiler les listeners et timers
    if (_initialized) {
      // Ré-initialisation : nettoyer l'ancien timer
      if (_timerID) { clearInterval(_timerID); _timerID = null; }
    }

    _db = db;
    _initialized = true;

    // Charger les items en attente depuis le store
    await _loadFromDB();

    // FIX #3 : délai de grâce pour les items envoyés par beacon.
    // Si un item a un beaconTs récent (< 30s), on considère que le beacon
    // a probablement abouti → on le supprime pour éviter le doublon.
    var now = Date.now();
    var BEACON_GRACE_MS = 30000; // 30 secondes de grâce
    var beaconItems = _queue.filter(function (item) {
      return item.beaconTs && (now - item.beaconTs) < BEACON_GRACE_MS;
    });
    for (var i = 0; i < beaconItems.length; i++) {
      var bi = beaconItems[i];
      _queue = _queue.filter(function (q) { return q !== bi; });
      await _removeFromDB(bi.id).catch(function () {});
    }
    if (beaconItems.length > 0) {
    }

    _updateBadge();

    // Démarrer le worker de dépilage
    _timerID = setInterval(_processQueue, INTERVAL_MS);

    // FIX #5 : utiliser des handlers nommés pour éviter les doublons de listeners
    window.removeEventListener('beforeunload', _onBeforeUnload);
    window.addEventListener('beforeunload', _onBeforeUnload);

    window.removeEventListener('online', _onOnline);
    window.addEventListener('online', _onOnline);

  }

  /** Handler nommé pour l'événement 'online' (FIX #5) */
  function _onOnline() {
    _processQueue();
  }

  /**
   * Ajoute une action à la file d'attente.
   * FIX #6 : chaque item reçoit un uid unique pour déduplication serveur.
   * @param {Object} params - Paramètres à passer à apiCall()
   */
  async function push(params) {
    var item = { params: params, retries: 0, ts: Date.now(), uid: _uid() };

    try {
      await _addToDB(item);
    } catch (err) {
      // FIX #1 : même si IndexedDB échoue, l'item reste en mémoire.
      // Il sera perdu au rechargement, mais au moins il sera tenté dans cette session.
      console.error('[syncQueue] Erreur IndexedDB lors de l\'ajout :', err);
    }

    _queue.push(item);
    _updateBadge();
  }

  /**
   * Force l'envoi immédiat de toute la queue.
   * @returns {Promise<void>}
   */
  async function flush() {
    await _processQueue();
  }

  /**
   * Retourne le nombre d'actions en attente.
   * @returns {number}
   */
  function count() {
    return _queue.length;
  }

  /**
   * Enregistre un callback appelé quand un item est définitivement abandonné.
   * Permet au code appelant de notifier l'utilisateur (toast, journal, etc.).
   * @param {Function} fn - function(item) appelée avec l'item abandonné
   */
  function onDead(fn) {
    _onDeadCallback = fn;
  }

  // --- Exposer l'API ---
  return { init: init, push: push, flush: flush, count: count, onDead: onDead };
})();
