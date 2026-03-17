/**
 * prog-ui.js — Interface progression
 * Gere l'affichage des barres de progression et couleurs par niveau
 * Expose : window.progUI
 */
;(function(){
  'use strict';

  /* ═══ COULEURS PAR NIVEAU ═══ */
  var LV_COLORS = {
    'NE':     { bg: 'var(--gris2)',   text: 'var(--gris)',   cls: 'lv-ne' },
    'NA':     { bg: 'var(--rouge2)',  text: 'var(--rouge)',  cls: 'lv-na' },
    'EC':     { bg: 'var(--jaune2)', text: '#a06e00',       cls: 'lv-ec' },
    'M':      { bg: '#d4f4e2',       text: '#1a7d3e',       cls: 'lv-m' },
    'PM':     { bg: 'var(--bleu3)',  text: 'var(--bleu2)',  cls: 'lv-pm' },
    'NE-ABS': { bg: '#fde8e6',       text: 'var(--rouge)',  cls: 'lv-ne-abs' },
    'NE-IMP': { bg: 'var(--violet2)', text: 'var(--violet)', cls: 'lv-ne-imp' },
    'NE-NON': { bg: 'var(--jaune2)', text: '#7a5000',       cls: 'lv-ne-non' },
    'NE-REF': { bg: '#ffe0cc',       text: '#c0390f',       cls: 'lv-ne-ref' }
  };

  /* ═══ RENDU BARRE DE PROGRESSION ═══ */

  /**
   * Genere le HTML d'une barre de progression
   * @param {number} pct - Pourcentage 0-100
   * @param {string} color - Couleur CSS de la barre
   * @param {string} label - Label a afficher a gauche
   * @param {string} detail - Detail a afficher a droite (ex: "5/12")
   * @returns {string} HTML de la barre
   */
  function renderBar(pct, color, label, detail) {
    return '<div class="sc-bar-row">' +
      '<span style="color:' + color + ';font-weight:700;font-size:.7rem">' + (label || '') + '</span>' +
      '<div class="sc-track"><div class="sc-fill" style="width:' + pct + '%;background:' + color + '"></div></div>' +
      '<span style="font-size:.68rem">' + (detail || '') + '</span>' +
    '</div>';
  }

  /**
   * Genere les barres de progression pour un eleve (toutes epreuves)
   * @param {string} code - Code eleve
   * @returns {string} HTML des barres
   */
  function renderStudentBars(code) {
    var s = students.find(function(x) { return x.code === code; });
    if (!s) return '';
    var filKey = getFiliere(s);
    var fil = FILIERES[filKey];
    if (!fil) return '';
    var epreuves = fil.epreuves || [];
    var filColor = fil.couleur || '#6c757d';
    var v = validations[code] || [];
    var html = '';

    if (epreuves.length) {
      epreuves.forEach(function(ep) {
        var comps = (fil.comps || {})[ep] || [];
        var done = new Set(v.filter(function(x) { return x.epreuve === ep; }).map(function(x) { return x.competence; })).size;
        var pct = comps.length ? Math.round(done / comps.length * 100) : 0;
        html += renderBar(pct, filColor, ep, done + '/' + comps.length);
      });
    } else {
      // TNE: modules CT
      var comps = (fil.comps || {}).modules || [];
      var done = new Set(v.filter(function(x) { return x.epreuve === 'modules'; }).map(function(x) { return x.competence; })).size;
      var pct = comps.length ? Math.round(done / comps.length * 100) : 0;
      html += renderBar(pct, filColor, 'CT', done + '/' + comps.length);
    }

    return html;
  }

  /**
   * Retourne la classe CSS pour un niveau donne
   * @param {string} nv - Niveau (NE, NA, EC, M, PM, NE-ABS, etc.)
   * @returns {string} Classe CSS
   */
  function getLvClass(nv) {
    var info = LV_COLORS[nv] || LV_COLORS['NE'];
    return info.cls;
  }

  /**
   * Retourne les infos de couleur pour un niveau donne
   * @param {string} nv - Niveau
   * @returns {Object} {bg, text, cls}
   */
  function getLvColor(nv) {
    return LV_COLORS[nv] || LV_COLORS['NE'];
  }

  window.progUI = {
    LV_COLORS: LV_COLORS,
    renderBar: renderBar,
    renderStudentBars: renderStudentBars,
    getLvClass: getLvClass,
    getLvColor: getLvColor
  };

})();
