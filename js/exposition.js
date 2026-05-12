/**
 * exposition.js — Module d'exposition pédagogique inerWeb TT CCF
 * Calcule et affiche le % d'opportunités d'évaluation réalisées vs possibles.
 */
window.expoModule = (function () {
  'use strict';

  /* ── Utilitaires internes ─────────────────────────────────── */

  /** Compte les critères évalués et totaux pour EP2 */
  function _compterEP2(code) {
    var done = 0, total = 0;
    if (typeof COMP_EP2 === 'undefined' || typeof CRIT_EP2 === 'undefined') return { done: 0, total: 0 };
    // validations[code] est un TABLEAU (pas un objet) — on compte directement
    var vals = (validations[code] && Array.isArray(validations[code])) ? validations[code] : [];
    COMP_EP2.forEach(function (comp) {
      var ctx = comp.lieux || [];
      ctx.forEach(function (lieu) {
        var crits = (CRIT_EP2[comp.code] && CRIT_EP2[comp.code][lieu]) || [];
        var cles = Array.isArray(crits) ? crits : Object.keys(crits);
        total += cles.length;
        cles.forEach(function (c) {
          var key = typeof c === 'string' ? c : '';
          var has = vals.some(function (v) {
            return v.epreuve === 'EP2' && v.competence === comp.code &&
              (v.critere === key || v.contexte === lieu) && v.niveau && v.niveau !== 'NE';
          });
          if (has) done++;
        });
      });
    });
    return { done: done, total: total };
  }

  /** Compte les critères évalués et totaux pour EP3 */
  function _compterEP3(code) {
    var done = 0, total = 0;
    if (typeof COMP_EP3 === 'undefined' || typeof CRIT_EP3 === 'undefined') return { done: 0, total: 0 };
    var vals = (validations[code] && Array.isArray(validations[code])) ? validations[code] : [];
    COMP_EP3.forEach(function (comp) {
      var sits = comp.sits || [];
      sits.forEach(function (sit) {
        var crits = (CRIT_EP3[comp.code] && CRIT_EP3[comp.code][sit]) || [];
        var cles = Array.isArray(crits) ? crits : Object.keys(crits);
        total += cles.length;
        cles.forEach(function (c) {
          var key = typeof c === 'string' ? c : '';
          var has = vals.some(function (v) {
            return v.epreuve === 'EP3' && v.competence === comp.code &&
              (v.critere === key || v.contexte === sit) && v.niveau && v.niveau !== 'NE';
          });
          if (has) done++;
        });
      });
    });
    return { done: done, total: total };
  }

  /* ── API publique ─────────────────────────────────────────── */

  /**
   * calc(studentCode) — Retourne les statistiques d'exposition
   * @returns {Object} {pct, done, total, ep2:{done,total}, ep3:{done,total}}
   */
  function calc(studentCode) {
    var ep2 = _compterEP2(studentCode);
    var ep3 = _compterEP3(studentCode);
    var done = ep2.done + ep3.done;
    var total = ep2.total + ep3.total;
    var pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { pct: pct, done: done, total: total, ep2: ep2, ep3: ep3 };
  }

  /**
   * renderBar(studentCode) — HTML d'une barre de progression colorée
   * Vert >= 80 %, orange 50-79 %, rouge < 50 %
   */
  function renderBar(studentCode) {
    var r = calc(studentCode);
    var couleur = r.pct >= 80 ? '#4caf50' : r.pct >= 50 ? '#ff9800' : '#f44336';
    return (
      '<div class="expo-bar" style="background:#eee;border-radius:4px;overflow:hidden;height:22px;position:relative">' +
        '<div style="width:' + r.pct + '%;background:' + couleur +
          ';height:100%;transition:width .3s"></div>' +
        '<span style="position:absolute;top:0;left:6px;line-height:22px;font-size:13px;color:#222">' +
          r.pct + '% (' + r.done + '/' + r.total + ' crit\u00e8res \u00e9valu\u00e9s)' +
        '</span>' +
      '</div>'
    );
  }

  /**
   * renderDetail(studentCode) — Tableau HTML détaillé par compétence
   */
  function renderDetail(studentCode) {
    if (typeof COMP_EP2 === 'undefined' || typeof CRIT_EP2 === 'undefined') return '';
    var vals = (validations[studentCode] && Array.isArray(validations[studentCode])) ? validations[studentCode] : [];
    var html = '<table class="expo-detail" style="border-collapse:collapse;width:100%;font-size:13px">';
    html += '<tr><th style="border:1px solid #ccc;padding:4px">\u00c9preuve</th>' +
      '<th style="border:1px solid #ccc;padding:4px">Comp\u00e9tence</th>' +
      '<th style="border:1px solid #ccc;padding:4px">Contexte</th>' +
      '<th style="border:1px solid #ccc;padding:4px">\u00c9valu\u00e9s / Total</th></tr>';

    function rowEP(ep, comp, ctxList, critTab) {
      ctxList.forEach(function (ctx) {
        var crits = (critTab[comp.code] && critTab[comp.code][ctx]) || [];
        var cles = Array.isArray(crits) ? crits : Object.keys(crits);
        var ok = 0;
        cles.forEach(function (c) {
          var key = typeof c === 'string' ? c : '';
          if (vals.some(function (v) { return v.epreuve === ep && v.competence === comp.code && (v.critere === key || v.contexte === ctx) && v.niveau && v.niveau !== 'NE'; })) ok++;
        });
        var style = ok === cles.length && cles.length > 0
          ? 'background:#e8f5e9' : ok === 0 ? 'background:#ffebee' : 'background:#fff8e1';
        html += '<tr style="' + style + '">' +
          '<td style="border:1px solid #ccc;padding:4px">' + ep + '</td>' +
          '<td style="border:1px solid #ccc;padding:4px">' + comp.code + '</td>' +
          '<td style="border:1px solid #ccc;padding:4px">' + ctx + '</td>' +
          '<td style="border:1px solid #ccc;padding:4px;text-align:center">' + ok + ' / ' + cles.length + '</td></tr>';
      });
    }

    COMP_EP2.forEach(function (comp) { rowEP('EP2', comp, comp.lieux || [], CRIT_EP2); });
    if (typeof COMP_EP3 !== 'undefined' && typeof CRIT_EP3 !== 'undefined') {
      COMP_EP3.forEach(function (comp) { rowEP('EP3', comp, comp.sits || [], CRIT_EP3); });
    }

    html += '</table>';
    return html;
  }

  /* ── Export ────────────────────────────────────────────────── */
  return { calc: calc, renderBar: renderBar, renderDetail: renderDetail };
})();
