/**
 * sync-queue.js — File d'attente de synchronisation en arrière-plan
 *
 * Gère l'envoi différé des actions vers le serveur Google Apps Script.
 * Les actions sont stockées dans IndexedDB (store 'syncQueue') et
 * dépilées progressivement, même en cas de coupure réseau.
 *
 * Dépendances globales : cfg.apiUrl, cfg.apiKey, apiCall(params)
 * Expose : window.syncQueue { init, push, flush, count }
 */
window.syncQueue = (function () {
  'use strict';

  // --- État interne ---
  let _db = null;           // Référence IndexedDB
  let _queue = [];           // Copie mémoire de la file
  let _timerID = null;       // ID du setInterval
  let _flushing = false;     // Verrou anti-concurrence
  const MAX_RETRIES = 3;     // Tentatives max par action
  const INTERVAL_MS = 5000;  // Fréquence de dépilage (5 s)
  const STORE_NAME = 'syncQueue';

  // =========================================================
  // Utilitaires IndexedDB
  // =========================================================

  /** Vérifie si le store existe dans la DB */
  function _hasStore() {
    return _db && _db.objectStoreNames.contains(STORE_NAME);
  }

  /** Charge tous les items du store dans _queue */
  function _loadFromDB() {
    return new Promise(function (resolve) {
      if (!_hasStore()) return resolve();
      try {
        var tx = _db.transaction(STORE_NAME, 'readonly');
        var store = tx.objectStore(STORE_NAME);
        var req = store.getAll();
        req.onsuccess = function () {
          _queue = req.result || [];
          resolve();
        };
        req.onerror = function () { resolve(); };
      } catch (e) {
        console.warn('[syncQueue] Store indisponible, mode mémoire seul');
        resolve();
      }
    });
  }

  /** Ajoute un item dans le store IndexedDB */
  function _addToDB(item) {
    return new Promise(function (resolve) {
      if (!_hasStore()) return resolve();
      var tx = _db.transaction(STORE_NAME, 'readwrite');
      var store = tx.objectStore(STORE_NAME);
      var req = store.add(item);
      req.onsuccess = function () {
        item.id = req.result; // récupère l'auto-increment
        resolve(item);
      };
      req.onerror = function () { reject(req.error); };
    });
  }

  /** Supprime un item du store par son id */
  function _removeFromDB(id) {
    return new Promise(function (resolve) {
      if (!_hasStore()) return resolve();
      try {
        var tx = _db.transaction(STORE_NAME, 'readwrite');
        var store = tx.objectStore(STORE_NAME);
        var req = store.delete(id);
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
   * Retourne true en cas de succès, false sinon.
   */
  async function _sendItem(item) {
    try {
      await apiCall(item.params);
      return true;
    } catch (err) {
      console.warn('[syncQueue] Échec envoi :', err.message || err);
      return false;
    }
  }

  // =========================================================
  // Dépilage de la queue
  // =========================================================

  /** Traite tous les items de la queue, un par un */
  async function _processQueue() {
    // Pas de double exécution
    if (_flushing) return;
    // Rien à faire
    if (_queue.length === 0) return;
    // Vérifier la connectivité
    if (typeof navigator.onLine !== 'undefined' && !navigator.onLine) return;

    _flushing = true;

    // Copie pour itérer sans conflit
    var snapshot = _queue.slice();

    for (var i = 0; i < snapshot.length; i++) {
      var item = snapshot[i];
      var ok = await _sendItem(item);

      if (ok) {
        // Succès : retirer de la queue et du store
        _queue = _queue.filter(function (q) { return q.id !== item.id; });
        await _removeFromDB(item.id).catch(function () {});
      } else {
        // Échec : incrémenter le compteur de tentatives
        item.retries = (item.retries || 0) + 1;
        if (item.retries >= MAX_RETRIES) {
          console.error('[syncQueue] Action abandonnée après ' + MAX_RETRIES + ' tentatives :', item.params);
          _queue = _queue.filter(function (q) { return q.id !== item.id; });
          await _removeFromDB(item.id).catch(function () {});
        }
        // Si encore sous le seuil, on laisse dans la queue pour le prochain cycle
      }
    }

    _flushing = false;
    _updateBadge();
  }

  // =========================================================
  // Gestion de la fermeture de page
  // =========================================================

  /** Tente d'envoyer les actions restantes via sendBeacon ou fetch keepalive */
  function _onBeforeUnload() {
    if (_queue.length === 0) return;

    _queue.forEach(function (item) {
      var url = cfg.apiUrl + '?key=' + encodeURIComponent(cfg.apiKey)
        + '&' + _serializeParams(item.params);

      // Priorité à sendBeacon (fiable à la fermeture)
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url);
      } else {
        // Alternative : fetch avec keepalive
        try {
          fetch(url, { method: 'GET', keepalive: true });
        } catch (_) { /* rien à faire */ }
      }
    });
  }

  /** Sérialise un objet en query string */
  function _serializeParams(params) {
    return Object.keys(params).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');
  }

  // =========================================================
  // API publique
  // =========================================================

  /**
   * Initialise le module avec la référence IndexedDB existante.
   * Charge la queue persistée et démarre le timer de dépilage.
   * @param {IDBDatabase} db - Base IndexedDB ouverte
   */
  async function init(db) {
    _db = db;

    // Charger les items en attente depuis le store
    await _loadFromDB();
    _updateBadge();

    // Démarrer le worker de dépilage
    if (_timerID) clearInterval(_timerID);
    _timerID = setInterval(_processQueue, INTERVAL_MS);

    // Écouter la fermeture de page
    window.addEventListener('beforeunload', _onBeforeUnload);

    // Écouter le retour en ligne pour forcer un flush
    window.addEventListener('online', function () {
      console.log('[syncQueue] Réseau retrouvé, flush immédiat');
      _processQueue();
    });

    console.log('[syncQueue] Initialisé — ' + _queue.length + ' action(s) en attente');
  }

  /**
   * Ajoute une action à la file d'attente.
   * @param {Object} params - Paramètres à passer à apiCall()
   */
  async function push(params) {
    var item = { params: params, retries: 0, ts: Date.now() };

    try {
      await _addToDB(item);
    } catch (err) {
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

  // --- Exposer l'API ---
  return { init: init, push: push, flush: flush, count: count };
})();
