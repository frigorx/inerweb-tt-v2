/**
 * api.js — Appels API centralises v2.0
 * Utilise la configuration centralisee (inerweb.config.js)
 * Expose : window.apiCall, window.cleanUrl, window.DEFAULT_CFG, window.WRITE_ACTIONS, window.iwApi
 */
;(function(){
  'use strict';

  // ═══════════════════════════════════════════════════════════
  // RESOLUTION DE LA CONFIG (priorite : localStorage > iwConfig > fallback vide)
  // ═══════════════════════════════════════════════════════════

  function _getLocalConfig(){
    try {
      var s = localStorage.getItem('iw_config') || localStorage.getItem('inerweb-tt-fe-cfg');
      return s ? JSON.parse(s) : null;
    } catch(e){ return null; }
  }

  function getApiUrl(){
    var local = _getLocalConfig();
    if(local && local.apiUrl) return local.apiUrl;
    if(window.iwConfig && window.iwConfig.getApiUrl) return window.iwConfig.getApiUrl();
    if(window.INERWEB_CONFIG && window.INERWEB_CONFIG.API_URL) return window.INERWEB_CONFIG.API_URL;
    return '';
  }

  function getApiKey(){
    var local = _getLocalConfig();
    if(local && local.apiKey) return local.apiKey;
    if(window.INERWEB_CONFIG && window.INERWEB_CONFIG.API_KEY) return window.INERWEB_CONFIG.API_KEY;
    return '';
  }

  function getBaseUrl(){
    var local = _getLocalConfig();
    if(local && local.baseUrl) return local.baseUrl;
    if(window.iwConfig && window.iwConfig.getBaseUrl) return window.iwConfig.getBaseUrl();
    return location.href.replace(/\/[^\/]*$/, '/');
  }

  // ═══════════════════════════════════════════════════════════
  // DEFAULT_CFG — retro-compatible (calculee dynamiquement)
  // ═══════════════════════════════════════════════════════════

  var DEFAULT_CFG = {
    get apiUrl(){ return getApiUrl(); },
    get apiKey(){ return getApiKey(); },
    nomProf: '',
    get baseUrl(){ return getBaseUrl(); }
  };

  var WRITE_ACTIONS = ['saveValidation','addEleve','deleteEleve','cloturerEpreuve','addJournalEntry','saveConfig','addUser','deleteUser','pushEvents','generateTokens','updateUser','deleteUser'];

  function cleanUrl(raw) {
    raw = raw.replace(/\s+/g, '').trim();
    var all = [].concat(Array.from(raw.matchAll(/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/g)));
    if (all.length > 0) return 'https://' + all[all.length - 1][0];
    var id = raw.match(/AKfycb[A-Za-z0-9_-]+/);
    if (id) return 'https://script.google.com/macros/s/' + id[0] + '/exec';
    raw = raw.replace(/^(https?:\/\/|script\.\w+\/\/|https?\/\/)/i, '');
    return 'https://' + raw;
  }

  // ═══════════════════════════════════════════════════════════
  // APPEL API GENERIQUE
  // ═══════════════════════════════════════════════════════════

  async function apiCall(params) {
    var apiUrl = (typeof cfg !== 'undefined' && cfg.apiUrl) ? cfg.apiUrl : getApiUrl();
    if (!apiUrl) {
      console.warn('[API] Pas d\'URL API configuree — mode demo');
      return Promise.resolve({ ok: false, demo: true, error: 'Mode demo — API non configuree' });
    }

    var apiKey = (typeof cfg !== 'undefined' && cfg.apiKey) ? cfg.apiKey : getApiKey();
    params.key = apiKey;
    var isWrite = WRITE_ACTIONS.indexOf(params.action) !== -1;
    var r;
    if (isWrite) {
      var url = new URL(apiUrl);
      url.searchParams.set('action', params.action);
      var body = { key: params.key };
      Object.entries(params).forEach(function([k, v]) { if (k !== 'action' && k !== 'key') body[k] = v; });
      r = await fetch(url.toString(), { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body) });
    } else {
      var url2 = new URL(apiUrl);
      Object.entries(params).forEach(function([k, v]) { url2.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : v); });
      r = await fetch(url2.toString(), { method: 'GET', redirect: 'follow' });
    }
    var d = await r.json();
    if (d.error && d.code === 403) throw new Error('Acces refuse');
    if (d.error) throw new Error(d.error);
    return d;
  }

  // ═══════════════════════════════════════════════════════════
  // API PUBLIQUE
  // ═══════════════════════════════════════════════════════════

  window.apiCall = apiCall;
  window.cleanUrl = cleanUrl;
  window.DEFAULT_CFG = DEFAULT_CFG;
  window.WRITE_ACTIONS = WRITE_ACTIONS;

  window.iwApi = {
    call: apiCall,
    getUrl: getApiUrl,
    getKey: getApiKey,
    getBaseUrl: getBaseUrl
  };

  console.log('[API] Module API v2.0 — URL: ' + (getApiUrl() || '(non configuree)'));

})();
