/**
 * radar.js — Graphique radar (araignée) de progression des compétences
 * Dessin sur Canvas, aucune dépendance externe
 *
 * Globales : students, COMP_EP2, COMP_EP3, getLv, NV_PCT, validations
 */
;(function () {
  'use strict';

  var NV_VAL = { NE: 0, NA: 0, EC: 35, M: 70, PM: 100 };
  var COLORS = {
    formatif:     { fill: 'rgba(33,150,243,0.15)', stroke: '#2196F3', point: '#1565C0' },
    certificatif: { fill: 'rgba(255,152,0,0.15)',  stroke: '#FF9800', point: '#E65100' }
  };

  /**
   * Dessine un radar sur un canvas
   * @param {string} canvasId — ID du canvas
   * @param {Array} labels — ['C3.1','C3.4',...]
   * @param {Array} datasets — [{label:'Formatif', values:[0-100,...], color:{fill,stroke,point}}, ...]
   */
  function _drawRadar(canvasId, labels, datasets) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var cx = W / 2, cy = H / 2;
    var R = Math.min(cx, cy) - 30;
    var n = labels.length;
    if (n < 3) return;

    ctx.clearRect(0, 0, W, H);

    // Grille concentrique
    [0.25, 0.5, 0.75, 1].forEach(function(pct) {
      ctx.beginPath();
      for (var i = 0; i <= n; i++) {
        var angle = (Math.PI * 2 * i / n) - Math.PI / 2;
        var x = cx + R * pct * Math.cos(angle);
        var y = cy + R * pct * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Axes
    for (var i = 0; i < n; i++) {
      var angle = (Math.PI * 2 * i / n) - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + R * Math.cos(angle), cy + R * Math.sin(angle));
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Labels
      var lx = cx + (R + 18) * Math.cos(angle);
      var ly = cy + (R + 18) * Math.sin(angle);
      ctx.fillStyle = '#555';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[i], lx, ly);
    }

    // Niveaux sur l'axe vertical
    ctx.fillStyle = '#aaa';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'right';
    [25, 50, 75, 100].forEach(function(v, idx) {
      var pct = [0.25, 0.5, 0.75, 1][idx];
      ctx.fillText(v + '%', cx - 4, cy - R * pct + 3);
    });

    // Datasets
    datasets.forEach(function(ds) {
      ctx.beginPath();
      ds.values.forEach(function(v, i) {
        var angle = (Math.PI * 2 * i / n) - Math.PI / 2;
        var r = R * (v / 100);
        var x = cx + r * Math.cos(angle);
        var y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = ds.color.fill;
      ctx.fill();
      ctx.strokeStyle = ds.color.stroke;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Points
      ds.values.forEach(function(v, i) {
        var angle = (Math.PI * 2 * i / n) - Math.PI / 2;
        var r = R * (v / 100);
        var x = cx + r * Math.cos(angle);
        var y = cy + r * Math.sin(angle);
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = ds.color.point;
        ctx.fill();
      });
    });

    // Légende
    var ly = H - 12;
    var lx = 10;
    datasets.forEach(function(ds) {
      ctx.fillStyle = ds.color.stroke;
      ctx.fillRect(lx, ly - 4, 10, 10);
      ctx.fillStyle = '#333';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(ds.label, lx + 14, ly + 4);
      lx += ctx.measureText(ds.label).width + 30;
    });
  }

  // ── API : Radar pour un élève ──

  function renderStudentRadar(studentCode, ep, container) {
    var el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;

    var comps = (ep === 'EP2') ? (window.COMP_EP2 || []) : (window.COMP_EP3 || []);
    if (!comps.length) return;

    var canvasId = 'radar_' + ep + '_' + studentCode.replace(/[^a-zA-Z0-9]/g, '');
    var size = Math.min(el.offsetWidth || 300, 340);

    el.innerHTML = '<div style="text-align:center;margin-bottom:.3rem">'
      + '<span style="font-weight:700;font-size:.82rem">' + ep + ' \u2014 Profil comp\u00e9tences</span></div>'
      + '<canvas id="' + canvasId + '" width="' + size + '" height="' + size + '" '
      + 'style="max-width:100%;display:block;margin:0 auto"></canvas>';

    // Calculer les valeurs
    var labels = comps.map(function(c) { return c.code; });

    // Valeurs actuelles
    var currentValues = comps.map(function(c) {
      var lv = window.getLv(studentCode, ep, c.code) || 'NE';
      return NV_VAL[lv] || 0;
    });

    // Chercher les valeurs formatif vs certificatif
    var formatifValues = comps.map(function(c) {
      var entries = (window.validations[studentCode] || []).filter(function(v) {
        return v.epreuve === ep && v.competence === c.code && (!v.critere || v.critere === '') && v.phase === 'formatif';
      });
      if (!entries.length) return 0;
      entries.sort(function(a, b) { return (b.timestamp || '').localeCompare(a.timestamp || ''); });
      return NV_VAL[entries[0].niveau] || 0;
    });

    var certifValues = comps.map(function(c) {
      var entries = (window.validations[studentCode] || []).filter(function(v) {
        return v.epreuve === ep && v.competence === c.code && (!v.critere || v.critere === '') && v.phase === 'certificatif';
      });
      if (!entries.length) return 0;
      entries.sort(function(a, b) { return (b.timestamp || '').localeCompare(a.timestamp || ''); });
      return NV_VAL[entries[0].niveau] || 0;
    });

    var datasets = [];
    var hasFormatif = formatifValues.some(function(v) { return v > 0; });
    var hasCertif = certifValues.some(function(v) { return v > 0; });

    if (hasFormatif && hasCertif) {
      // Montrer les deux pour voir la progression
      datasets.push({ label: 'Formatif', values: formatifValues, color: COLORS.formatif });
      datasets.push({ label: 'Certificatif', values: certifValues, color: COLORS.certificatif });
    } else {
      // Montrer les valeurs actuelles
      var color = hasCertif ? COLORS.certificatif : COLORS.formatif;
      var label = hasCertif ? 'Certificatif' : 'Formatif';
      datasets.push({ label: label, values: currentValues, color: color });
    }

    // Petit délai pour que le canvas soit dans le DOM
    setTimeout(function() { _drawRadar(canvasId, labels, datasets); }, 50);
  }

  /** Rendu des deux radars EP2 + EP3 */
  function renderBothRadars(studentCode, container) {
    var el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;

    el.innerHTML = '<div id="radarEP2Zone" style="margin-bottom:1rem"></div>'
      + '<div id="radarEP3Zone"></div>';

    renderStudentRadar(studentCode, 'EP2', document.getElementById('radarEP2Zone'));
    renderStudentRadar(studentCode, 'EP3', document.getElementById('radarEP3Zone'));
  }

  // ── Exposition globale ──

  window.radarModule = {
    renderStudentRadar: renderStudentRadar,
    renderBothRadars: renderBothRadars
  };

})();
