/**
 * INERWEB TT-IA — Sync IdentityVault FH↔TM v1.0
 *
 * Le blob iw_identity_encrypted local est partagé entre profs via la Sheet
 * (feuille IdentityVault). Le serveur ne déchiffre JAMAIS — il stocke et
 * renvoie un opaque base64. La phrase prof (PIN) est partagée hors ligne.
 *
 * Cycle de vie :
 *   - Au boot après iw:unlocked → pullVault() : récupère version distante,
 *     l'écrase localement si plus récente
 *   - Après chaque iwIdentity.register/remove/update → pushVault() : push
 *     du blob local avec contrôle de version optimiste
 *
 * Dépendances : iwCrypto, iwPin, iwIdentity, fenêtre iwConfig
 */
(function() {
  'use strict';

  var STORAGE_KEY = 'iw_identity_encrypted';
  var META_KEY = 'iw_identity_meta';
  var SYNC_KEY = 'iw_identity_sync';
  var VERSION_KEY = 'iw_identity_version';

  var _syncing = false;
  var _lastPullAt = 0;
  var _pendingPush = false;
  var _pushDebounce = null;

  function getCfg() {
    try {
      var raw = localStorage.getItem('inerweb-tt-fe-cfg');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    if (window.INERWEB_CONFIG && window.INERWEB_CONFIG.API_URL) {
      return { apiUrl: window.INERWEB_CONFIG.API_URL, apiKey: window.INERWEB_CONFIG.API_KEY, nomProf: 'inconnu' };
    }
    return null;
  }

  function getLocalVersion() {
    return parseInt(localStorage.getItem(VERSION_KEY) || '0', 10);
  }
  function setLocalVersion(v) {
    localStorage.setItem(VERSION_KEY, String(v));
  }

  /**
   * Récupère le vault distant. Si plus récent que le local, écrase le
   * iw_identity_encrypted local et recharge iwIdentity.
   */
  async function pullVault() {
    if (_syncing) return { ok: false, reason: 'sync_en_cours' };
    var cfg = getCfg();
    if (!cfg || !cfg.apiUrl || !cfg.apiKey) return { ok: false, reason: 'config_absente' };
    if (!window.iwPin || !window.iwPin.isUnlocked()) return { ok: false, reason: 'verrouille' };

    _syncing = true;
    try {
      var url = new URL(cfg.apiUrl);
      url.searchParams.set('action', 'getIdentityVault');
      url.searchParams.set('key', cfg.apiKey);
      var r = await fetch(url.toString(), { method: 'GET', redirect: 'follow' });
      var d = await r.json();
      if (d.error) {
        console.warn('[identity-sync] pull erreur:', d.error);
        return { ok: false, reason: d.error };
      }
      var remoteVersion = Number(d.version || 0);
      var localVersion = getLocalVersion();
      if (remoteVersion === 0) {
        // Vault distant vide, rien à faire (premier prof à initialiser)
        return { ok: true, action: 'remote_vide', localVersion: localVersion };
      }
      if (remoteVersion <= localVersion) {
        return { ok: true, action: 'local_a_jour', version: localVersion };
      }
      // Le distant est plus récent → on tente de le déchiffrer pour valider
      // avec la phrase PIN actuelle avant de l'adopter
      var pin = window.iwPin.getPin();
      try {
        var json = await window.iwCrypto.decrypt(d.blob, pin);
        JSON.parse(json); // sanity check
      } catch (e) {
        return {
          ok: false,
          reason: 'phrase_incompatible',
          message: 'Le vault distant a été créé avec une autre phrase PIN.'
        };
      }
      // OK on adopte
      localStorage.setItem(STORAGE_KEY, d.blob);
      setLocalVersion(remoteVersion);
      localStorage.setItem(META_KEY, JSON.stringify({
        lastModified: d.updatedAt,
        lastPulledBy: d.updatedBy,
        version: remoteVersion
      }));
      // Recharger iwIdentity à partir du nouveau blob
      if (window.iwIdentity && window.iwIdentity.load) {
        await window.iwIdentity.load();
      }
      _lastPullAt = Date.now();
      document.dispatchEvent(new CustomEvent('iw:vault_pulled', { detail: { version: remoteVersion } }));
      return { ok: true, action: 'adopte_distant', version: remoteVersion, by: d.updatedBy };
    } catch (e) {
      console.error('[identity-sync] pullVault exception:', e);
      return { ok: false, reason: 'exception', message: e.message };
    } finally {
      _syncing = false;
    }
  }

  /**
   * Push le blob local vers le serveur avec contrôle de version optimiste.
   * Si conflit → tente un pull puis ré-essaie 1 fois.
   */
  async function pushVault() {
    if (_syncing) {
      // Débouncer : on garde l'intention, on déclenche après
      _pendingPush = true;
      return { ok: false, reason: 'sync_en_cours_reportee' };
    }
    var cfg = getCfg();
    if (!cfg || !cfg.apiUrl || !cfg.apiKey) return { ok: false, reason: 'config_absente' };
    if (!window.iwPin || !window.iwPin.isUnlocked()) return { ok: false, reason: 'verrouille' };

    var blob = localStorage.getItem(STORAGE_KEY);
    if (!blob) return { ok: false, reason: 'rien_a_pusher' };

    _syncing = true;
    try {
      var url = new URL(cfg.apiUrl);
      url.searchParams.set('action', 'saveIdentityVault');
      var body = {
        key: cfg.apiKey,
        action: 'saveIdentityVault',
        blob: blob,
        updatedBy: cfg.nomProf || 'inconnu',
        expectedVersion: getLocalVersion()
      };
      var r = await fetch(url.toString(), {
        method: 'POST', redirect: 'follow',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(body)
      });
      var d = await r.json();
      if (d.error === 'conflit_version') {
        // Quelqu'un a poussé entre temps. Pull, merge à venir (V1 : on adopte le distant)
        console.warn('[identity-sync] conflit version, pull et fusion');
        _syncing = false;
        var pulled = await pullVault();
        if (pulled.ok) {
          // Merge des entrées locales non encore propagées : V1 = simple,
          // on suppose que seul un prof modifie à la fois. Sinon, on relance push.
          return await pushVault();
        }
        return { ok: false, reason: 'conflit_irrecuperable' };
      }
      if (d.error) {
        return { ok: false, reason: d.error };
      }
      setLocalVersion(Number(d.version || 0));
      localStorage.setItem(META_KEY, JSON.stringify({
        lastModified: d.updatedAt,
        lastPushedBy: cfg.nomProf,
        version: d.version
      }));
      document.dispatchEvent(new CustomEvent('iw:vault_pushed', { detail: { version: d.version } }));
      return { ok: true, version: d.version };
    } catch (e) {
      console.error('[identity-sync] pushVault exception:', e);
      return { ok: false, reason: 'exception', message: e.message };
    } finally {
      _syncing = false;
      if (_pendingPush) {
        _pendingPush = false;
        setTimeout(function() { pushVault(); }, 100);
      }
    }
  }

  /** Push différé (debounce 1.5s) pour grouper les modifs en rafale */
  function pushVaultDebounced() {
    if (_pushDebounce) clearTimeout(_pushDebounce);
    _pushDebounce = setTimeout(function() {
      _pushDebounce = null;
      pushVault();
    }, 1500);
  }

  // ──── Hooks sur iwIdentity ────
  // À chaque mutation du mapping local, on déclenche un push différé
  function wrapIdentity() {
    if (!window.iwIdentity || window.iwIdentity._syncWrapped) return;
    var methodsThatMutate = ['register', 'remove', 'syncFromStudents', 'purgeOld', 'clear'];
    methodsThatMutate.forEach(function(m) {
      if (typeof window.iwIdentity[m] !== 'function') return;
      var orig = window.iwIdentity[m].bind(window.iwIdentity);
      window.iwIdentity[m] = async function() {
        var r = await orig.apply(null, arguments);
        pushVaultDebounced();
        return r;
      };
    });
    window.iwIdentity._syncWrapped = true;
  }

  // ──── Boot ────
  document.addEventListener('iw:unlocked', async function() {
    wrapIdentity();
    // Petit délai pour laisser identity-mapper.load() finir
    setTimeout(async function() {
      var r = await pullVault();
      console.log('[identity-sync] pull au boot:', r);
    }, 500);
  });

  // Re-pull périodique léger (5 min) pour détecter les changements de l'autre prof
  setInterval(function() {
    if (window.iwPin && window.iwPin.isUnlocked()) {
      pullVault().catch(function() {});
    }
  }, 5 * 60 * 1000);

  window.iwIdentitySync = {
    pull: pullVault,
    push: pushVault,
    pushDebounced: pushVaultDebounced,
    getVersion: getLocalVersion
  };
})();
