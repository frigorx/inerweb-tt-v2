/**
 * phases.js — Module de gestion du cycle formatif / certificatif / clôturé
 * IIFE exposant window.phasesModule
 *
 * Globales attendues : curPhase, students, cur, appCfg, saveLocal(), toast()
 */
;(function () {
  'use strict';

  // Définition des 3 phases avec leurs métadonnées
  var PHASES = {
    formatif:     { label: 'Formatif',     badge: '\u{1F4D8}', color: '#2196F3', desc: 'Évaluations non officielles' },
    certificatif: { label: 'Certificatif', badge: '\u{1F4D9}', color: '#FF9800', desc: 'Évaluations officielles tracées' },
    cloture:      { label: 'Clôturé',      badge: '\u{1F512}', color: '#4CAF50', desc: 'Tout verrouillé' }
  };

  var ORDRE = ['formatif', 'certificatif', 'cloture'];

  // ── Helpers ──────────────────────────────────────────────

  /** Retrouve l'objet élève courant dans le tableau students */
  function _eleve() {
    if (!window.students || !window.cur) return null;
    return window.students.find(function (s) { return s.code === window.cur; }) || null;
  }

  /** Retourne la phase active pour l'élève courant (ou la globale) */
  function _phaseActive() {
    var el = _eleve();
    if (el && el.phase) return el.phase;
    return window.curPhase || 'formatif';
  }

  // ── API publique ─────────────────────────────────────────

  /** Initialise le module, restaure la phase depuis appCfg */
  function init() {
    if (window.appCfg && window.appCfg.phase) {
      window.curPhase = window.appCfg.phase;
    }
    if (!window.curPhase) {
      window.curPhase = 'formatif';
    }
    // S'assurer que chaque élève possède un champ phase
    if (window.students) {
      window.students.forEach(function (s) {
        if (!s.phase) s.phase = window.curPhase;
      });
    }
  }

  /**
   * Change la phase active (globale + élève courant)
   * @param {string} phase — 'formatif' | 'certificatif' | 'cloture'
   */
  function setPhase(phase) {
    if (!PHASES[phase]) return;

    // Mise à jour globale
    window.curPhase = phase;
    if (window.appCfg) window.appCfg.phase = phase;

    // Mise à jour par élève
    var el = _eleve();
    if (el) {
      el.phase = phase;
      // Verrouillage en clôture
      if (phase === 'cloture') {
        _verrouillerEleve(el);
      }
    }

    if (typeof window.saveLocal === 'function') window.saveLocal();
    if (typeof window.toast === 'function') {
      window.toast('Phase : ' + PHASES[phase].label + ' ' + PHASES[phase].badge);
    }
  }

  /**
   * Verrouille toutes les compétences d'un élève et enregistre la date
   * @param {Object} el — objet élève
   */
  function _verrouillerEleve(el) {
    el.dateCloture = new Date().toISOString();
    el.locked = true;
    // Verrouiller chaque compétence si elle existe
    if (el.competences && Array.isArray(el.competences)) {
      el.competences.forEach(function (c) { c.locked = true; });
    }
  }

  /** Retourne le HTML d'un badge indiquant la phase en cours */
  function renderBadge() {
    var ph = _phaseActive();
    var info = PHASES[ph];
    return '<span class="phase-badge" style="'
      + 'display:inline-flex;align-items:center;gap:4px;'
      + 'padding:2px 10px;border-radius:12px;font-size:13px;'
      + 'background:' + info.color + ';color:#fff;">'
      + info.badge + ' ' + info.label
      + '</span>';
  }

  /**
   * Affiche un groupe de boutons dans un conteneur pour changer de phase
   * @param {HTMLElement|string} container — élément ou sélecteur CSS
   */
  function renderToggle(container) {
    var el = typeof container === 'string'
      ? document.querySelector(container)
      : container;
    if (!el) return;

    var html = '<div class="phase-toggle" style="display:flex;gap:4px;">';
    ORDRE.forEach(function (key) {
      var info = PHASES[key];
      var actif = key === _phaseActive();
      html += '<button data-phase="' + key + '" style="'
        + 'padding:4px 12px;border:2px solid ' + info.color + ';'
        + 'border-radius:8px;cursor:pointer;font-size:13px;'
        + 'background:' + (actif ? info.color : 'transparent') + ';'
        + 'color:' + (actif ? '#fff' : info.color) + ';">'
        + info.badge + ' ' + info.label + '</button>';
    });
    html += '</div>';
    el.innerHTML = html;

    // Écoute des clics sur les boutons
    el.querySelectorAll('[data-phase]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setPhase(btn.getAttribute('data-phase'));
        renderToggle(el); // Re-rendre pour refléter l'état
      });
    });
  }

  /** Retourne true si la phase de l'élève courant est 'cloture' */
  function isLocked() {
    return _phaseActive() === 'cloture';
  }

  /** Retourne true si l'on peut encore modifier les évaluations */
  function canEdit() {
    return _phaseActive() !== 'cloture';
  }

  /** Retourne la phase à enregistrer pour une nouvelle entrée de journal */
  function getPhaseForEntry() {
    return _phaseActive();
  }

  // ── Exposition globale ───────────────────────────────────

  window.phasesModule = {
    init:             init,
    setPhase:         setPhase,
    renderBadge:      renderBadge,
    renderToggle:     renderToggle,
    isLocked:         isLocked,
    canEdit:          canEdit,
    getPhaseForEntry: getPhaseForEntry,
    PHASES:           PHASES
  };

})();
