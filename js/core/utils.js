/**
 * utils.js — Utilitaires supplementaires
 * Extrait de inerweb_prof.html
 * Expose : window.setSyncState, window.saveLocal, window.saveLocalData,
 *          window.loadLocalData, window.updateAll, window.updateStor,
 *          window.syncAll, window.loadLocal, window.pushVal
 */
;(function(){
  'use strict';

  /* ═══ STORAGE KEYS ═══ */
  var SK = 'inerweb-tt-fe-v1';
  var SCFG = 'inerweb-tt-fe-cfg';
  var SPART = 'inerweb-tt-fe-parts';
  var SUSERS = 'inerweb-tt-fe-users';
  var SCLASSES = 'inerweb-tt-fe-classes';
  var SJOURNAL = 'inerweb-tt-fe-journal';

  window.SK = SK;
  window.SCFG = SCFG;
  window.SPART = SPART;
  window.SUSERS = SUSERS;
  window.SCLASSES = SCLASSES;
  window.SJOURNAL = SJOURNAL;

  /* ═══ SYNC STATE ═══ */
  function setSyncState(s) {
    var d = document.getElementById('syncDot'), l = document.getElementById('syncLbl');
    if (!d || !l) return;
    d.className = 'sync-dot';
    if (s === 'ok') { l.textContent = 'Synchronise'; }
    if (s === 'syncing') { d.classList.add('syncing'); l.textContent = 'Sync...'; }
    if (s === 'error') { d.classList.add('offline'); l.textContent = 'Hors-ligne'; }
  }

  /* ═══ SAVE LOCAL ═══ */
  function saveLocal() {
    saveLocalData().catch(function() { toast('Erreur sauvegarde', 'err'); });
  }

  async function saveLocalData() {
    var data = { id: 'main', students: students, validations: validations, notes: notes, pfmpData: pfmpData, appCfg: appCfg, customCriteria: customCriteria, compLocks: compLocks, sharedDocs: sharedDocs, lastSave: new Date().toISOString() };
    if (window.db) { await saveIDB('data', data); }
    try { localStorage.setItem(SK, JSON.stringify({ students: students, validations: validations, notes: notes, pfmpData: pfmpData, appCfg: appCfg, customCriteria: customCriteria, compLocks: compLocks, sharedDocs: sharedDocs })); } catch(e) {}
    updateStor();
  }

  async function loadLocalData() {
    if (window.db) {
      var d = await loadIDB('data', 'main');
      if (d) {
        students = d.students || []; validations = d.validations || {}; notes = d.notes || {};
        pfmpData = d.pfmpData || {}; appCfg = d.appCfg || {};
        customCriteria = d.customCriteria || {}; compLocks = d.compLocks || {}; sharedDocs = d.sharedDocs || [];
        window.students = students; window.validations = validations; window.appCfg = appCfg;
        return true;
      }
    }
    var raw = localStorage.getItem(SK);
    if (!raw) return false;
    var p;
    try { p = JSON.parse(raw); } catch(e) { console.warn('[loadLocalData] JSON corrompu'); return false; }
    students = p.students || []; validations = p.validations || {}; notes = p.notes || {};
    pfmpData = p.pfmpData || {}; appCfg = p.appCfg || {};
    customCriteria = p.customCriteria || {}; compLocks = p.compLocks || {}; sharedDocs = p.sharedDocs || [];
    window.students = students; window.validations = validations; window.appCfg = appCfg;
    return true;
  }

  function loadLocal() {
    loadLocalData().then(function() {
      try { partenaires = JSON.parse(localStorage.getItem(SPART) || '[]'); } catch(e) { partenaires = []; }
    }).catch(function() {});
  }

  /* ═══ STORAGE INDICATOR ═══ */
  function updateStor() {
    var used = new Blob([localStorage.getItem(SK) || '']).size;
    var el = document.getElementById('storTxt');
    if (el) el.textContent = (used / 1024 / 1024).toFixed(1) + ' MB / 5 MB';
    var f = document.getElementById('storFill');
    if (f) {
      var p = Math.min(used / (5 * 1024 * 1024) * 100, 100);
      f.style.width = p + '%';
      f.className = 'stor-fill' + (p > 80 ? ' danger' : p > 50 ? ' warn' : '');
    }
  }

  /* ═══ UPDATE ALL ═══ */
  function updateAll() {
    if (typeof populateClassFilters === 'function') populateClassFilters();
    if (typeof renderDash === 'function') renderDash();
    if (typeof renderEleves === 'function') renderEleves();
    if (typeof popSelects === 'function') popSelects();
    updateStor();
    if (appCfg.etablissement) {
      var hdr = document.getElementById('hdrEtab');
      if (hdr) hdr.textContent = appCfg.etablissement + ' \u2014 Session ' + (appCfg.session || 2026);
    }
  }

  /* syncAll et pushVal sont définis dans inerweb_prof.html (version corrigée) */
  /* Ce module ne les expose plus pour éviter les conflits */

  // Exposer sur window (sauf syncAll et pushVal)
  window.setSyncState = setSyncState;
  window.saveLocal = saveLocal;
  window.saveLocalData = saveLocalData;
  window.loadLocalData = loadLocalData;
  window.loadLocal = loadLocal;
  window.updateStor = updateStor;
  window.updateAll = updateAll;

})();
