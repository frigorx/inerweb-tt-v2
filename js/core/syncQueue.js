/**
 * core/syncQueue.js — Wrapper amélioré de sync-queue.js
 *
 * Réexporte les fonctions de window.syncQueue (js/sync-queue.js)
 * et ajoute un intercepteur intelligent pour les actions critiques.
 *
 * Dépend de : js/sync-queue.js (chargé avant ce fichier)
 * Expose : window.syncQueueWrapper
 */
window.syncQueueWrapper = (function () {
  'use strict';

  var _base = null; // Référence au module syncQueue existant (résolu au premier appel)

  function _getBase() {
    if (!_base && window.syncQueue) _base = window.syncQueue;
    return _base;
  }

  /**
   * Push une action dans la queue.
   * Proxy direct vers syncQueue.push()
   */
  async function push(params) {
    var base = _getBase();
    if (!base) {
      console.error('[syncQueueWrapper] syncQueue non chargé');
      return;
    }
    await base.push(params);
  }

  /**
   * Force le flush immédiat de la queue.
   */
  async function flush() {
    var base = _getBase();
    if (base) await base.flush();
  }

  /**
   * Retry = flush (la queue existante gère déjà les retries internes).
   */
  async function retry() {
    var base = _getBase();
    if (base) await base.flush();
  }

  /**
   * Charge les items en attente.
   * Avec IndexedDB, c'est géré par init(). Retourne le count.
   */
  async function loadPending() {
    var base = _getBase();
    return base ? base.count() : 0;
  }

  /**
   * Sauvegarde persistante — déjà gérée par IndexedDB dans sync-queue.js.
   * Exposé pour compatibilité API.
   */
  function savePending() {
    // Noop — la persistance est automatique via IndexedDB
  }

  /**
   * Nombre d'items en attente.
   */
  function count() {
    var base = _getBase();
    return base ? base.count() : 0;
  }

  /**
   * Initialise le wrapper (et le module de base si db fournie).
   */
  async function init(db) {
    var base = _getBase();
    if (base) await base.init(db);
  }

  /**
   * Enregistre un callback pour les items abandonnés (dead letter).
   */
  function onDead(fn) {
    var base = _getBase();
    if (base) base.onDead(fn);
  }

  /**
   * Intercepteur intelligent pour actions critiques.
   * Si online → exécute directement via apiCallFn.
   * Si offline ou échec → push dans la syncQueue pour envoi différé.
   *
   * @param {Object} params - Les paramètres de l'action API
   * @param {Function} apiCallFn - La fonction apiCall à utiliser
   * @param {Function} [toastFn] - Fonction toast pour les notifications
   * @returns {Promise<Object|null>} Résultat de apiCall ou null si mis en queue
   */
  async function smartSend(params, apiCallFn, toastFn) {
    if (navigator.onLine) {
      try {
        return await apiCallFn(params);
      } catch (e) {
        // Échec même en ligne → mettre en queue
        console.warn('[syncQueueWrapper] Échec online, mise en queue :', e.message);
        await push(params);
        if (typeof toastFn === 'function') toastFn('Sauvegardé hors-ligne', 'warn');
        return null;
      }
    } else {
      await push(params);
      if (typeof toastFn === 'function') toastFn('Sauvegardé hors-ligne', 'warn');
      return null;
    }
  }

  // --- API publique ---
  return {
    init: init,
    push: push,
    flush: flush,
    retry: retry,
    loadPending: loadPending,
    savePending: savePending,
    count: count,
    onDead: onDead,
    smartSend: smartSend
  };
})();
