/**
 * radar.js — Diagrammes radar multi-filière
 * Canvas pur, aucune dépendance externe
 *
 * Fournit :
 *  - Mini-radar dans chaque fiche élève du dashboard (avec clic interactif)
 *  - Radar individuel grand format (bilan)
 *  - Radar classe (moyenne)
 *  - Radar comparaison élève vs classe
 *
 * Globales attendues : students, validations, notes,
 *   FILIERES, getFiliere, getComps, getEpreuves, getLv, NV_PCT
 */
;(function () {
  'use strict';

  var NV_VAL = { NE: 0, NA: 0, EC: 35, M: 70, PM: 100 };
  var NV_LBL = { NE: 'Non Évalué', NA: 'Non Acquis', EC: 'En Cours', M: 'Maîtrisé', PM: 'Parfait' };
  var NV_CLR = { NE: '#aaa', NA: '#e74c3c', EC: '#f39c12', M: '#27ae60', PM: '#2196F3' };
  var PALETTE = [
    { fill: 'rgba(33,150,243,0.15)',  stroke: '#2196F3', point: '#1565C0' },
    { fill: 'rgba(255,107,53,0.15)',   stroke: '#FF6B35', point: '#c0390f' },
    { fill: 'rgba(142,68,173,0.15)',   stroke: '#8e44ad', point: '#6c3483' },
    { fill: 'rgba(39,174,96,0.15)',    stroke: '#27ae60', point: '#1a7d3e' },
    { fill: 'rgba(22,160,133,0.15)',   stroke: '#16a085', point: '#0d6b56' },
  ];
  var CLASS_COLOR = { fill: 'rgba(255,152,0,0.18)', stroke: '#FF9800', point: '#E65100' };
  var ELEVE_COLOR = { fill: 'rgba(33,150,243,0.18)', stroke: '#2196F3', point: '#1565C0' };

  // ══════════════════════════════════════════════════════
  // TOOLTIP GLOBAL (partagé par tous les radars)
  // ══════════════════════════════════════════════════════
  var _tooltip = null;
  function _getTooltip() {
    if (_tooltip) return _tooltip;
    var d = document.createElement('div');
    d.id = 'radar-tooltip';
    d.style.cssText = 'position:fixed;z-index:9999;background:#fff;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.2);padding:.65rem .85rem;font-family:Nunito,sans-serif;font-size:.78rem;max-width:260px;pointer-events:none;opacity:0;transition:opacity .15s;line-height:1.5;color:#333';
    document.body.appendChild(d);
    _tooltip = d;
    return d;
  }
  function _showTooltip(x, y, html) {
    var t = _getTooltip();
    t.innerHTML = html;
    t.style.opacity = '1';
    t.style.pointerEvents = 'auto';
    // Positionner
    var tw = t.offsetWidth, th = t.offsetHeight;
    var left = x + 12, top = y - th / 2;
    if (left + tw > window.innerWidth - 10) left = x - tw - 12;
    if (top < 5) top = 5;
    if (top + th > window.innerHeight - 5) top = window.innerHeight - th - 5;
    t.style.left = left + 'px';
    t.style.top = top + 'px';
  }
  function _hideTooltip() {
    var t = _getTooltip();
    t.style.opacity = '0';
    t.style.pointerEvents = 'none';
  }

  // Fermer au clic ailleurs
  document.addEventListener('click', function(e) {
    if (_tooltip && !_tooltip.contains(e.target) && !e.target.closest('canvas')) _hideTooltip();
  });

  // ══════════════════════════════════════════════════════
  // DESSIN RADAR GÉNÉRIQUE
  // ══════════════════════════════════════════════════════
  function _drawRadar(canvasId, labels, datasets, opts) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var W = canvas.width, H = canvas.height;
    // HiDPI
    if (!canvas._scaled) {
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.scale(dpr, dpr);
      canvas._scaled = true;
    }
    W = parseInt(canvas.style.width);
    H = parseInt(canvas.style.height);
    var cx = W / 2, cy = H / 2;
    var margin = (opts && opts.mini) ? 22 : 36;
    var R = Math.min(cx, cy) - margin;
    var n = labels.length;
    if (n < 3) return;

    ctx.clearRect(0, 0, W * dpr, H * dpr);

    // Titre
    if (opts && opts.title && !opts.mini) {
      ctx.fillStyle = '#1a2332';
      ctx.font = 'bold 12px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(opts.title, cx, 16);
      cy += 7;
    }

    // Grille
    var gridLevels = (opts && opts.mini) ? [0.5, 1] : [0.25, 0.5, 0.75, 1];
    gridLevels.forEach(function(pct) {
      ctx.beginPath();
      for (var i = 0; i <= n; i++) {
        var angle = (Math.PI * 2 * i / n) - Math.PI / 2;
        var x = cx + R * pct * Math.cos(angle);
        var y = cy + R * pct * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#e8e8e8';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Axes + labels
    var fontSize = (opts && opts.mini) ? 7 : 9;
    var labelDist = (opts && opts.mini) ? R + 14 : R + 20;
    for (var i = 0; i < n; i++) {
      var angle = (Math.PI * 2 * i / n) - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + R * Math.cos(angle), cy + R * Math.sin(angle));
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      ctx.stroke();
      var lx = cx + labelDist * Math.cos(angle);
      var ly = cy + labelDist * Math.sin(angle);
      // Colorer le label selon le niveau (premier dataset)
      var labelColor = '#555';
      if (opts && opts.compData && opts.compData[i]) {
        labelColor = NV_CLR[opts.compData[i].niv] || '#555';
      }
      ctx.fillStyle = labelColor;
      ctx.font = '600 ' + fontSize + 'px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[i], lx, ly);
    }

    // Niveaux verticaux (sauf mini)
    if (!(opts && opts.mini)) {
      ctx.fillStyle = '#bbb';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'right';
      [25, 50, 75, 100].forEach(function(v, idx) {
        ctx.fillText(v + '%', cx - 4, cy - R * [0.25, 0.5, 0.75, 1][idx] + 3);
      });
    }

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
      ctx.lineWidth = (opts && opts.mini) ? 1.5 : 2;
      ctx.stroke();

      // Points
      var ptR = (opts && opts.mini) ? 2.5 : 3;
      ds.values.forEach(function(v, i) {
        var angle = (Math.PI * 2 * i / n) - Math.PI / 2;
        var r = R * (v / 100);
        var x = cx + r * Math.cos(angle);
        var y = cy + r * Math.sin(angle);
        ctx.beginPath();
        ctx.arc(x, y, ptR, 0, Math.PI * 2);
        ctx.fillStyle = ds.color.point;
        ctx.fill();
      });
    });

    // Légende (sauf mini)
    if (!(opts && opts.mini) && datasets.length > 0) {
      var legY = H - 8;
      var legX = 10;
      datasets.forEach(function(ds) {
        ctx.fillStyle = ds.color.stroke;
        ctx.fillRect(legX, legY - 4, 8, 8);
        ctx.fillStyle = '#333';
        ctx.font = '600 9px Nunito, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(ds.label, legX + 11, legY + 3);
        legX += ctx.measureText(ds.label).width + 26;
      });
    }

    // Stocker les métadonnées pour l'interaction clic
    canvas._radarMeta = { cx: cx, cy: cy, R: R, n: n, labels: labels, datasets: datasets, opts: opts };
  }

  // ══════════════════════════════════════════════════════
  // INTERACTION CLIC SUR RADAR
  // ══════════════════════════════════════════════════════
  function _setupClick(canvas, compData) {
    if (canvas._clickBound) return;
    canvas._clickBound = true;
    canvas.style.cursor = 'pointer';
    canvas.addEventListener('click', function(e) {
      var m = canvas._radarMeta;
      if (!m || !compData) return;
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      // Trouver la branche la plus proche
      var bestIdx = -1, bestDist = Infinity;
      for (var i = 0; i < m.n; i++) {
        var angle = (Math.PI * 2 * i / m.n) - Math.PI / 2;
        // Point sur l'axe à la distance du label
        var px = m.cx + (m.R * 0.7) * Math.cos(angle);
        var py = m.cy + (m.R * 0.7) * Math.sin(angle);
        var d = Math.sqrt((mx - px) * (mx - px) + (my - py) * (my - py));
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      }
      if (bestIdx >= 0 && bestDist < m.R * 0.6 && compData[bestIdx]) {
        var c = compData[bestIdx];
        var nivClr = NV_CLR[c.niv] || '#aaa';
        var html = '<div style="font-weight:800;color:#1b3a63;margin-bottom:.3rem">' + c.code + ' — ' + c.nom + '</div>';
        html += '<div style="margin-bottom:.2rem">' + (c.full || '') + '</div>';
        html += '<div style="display:inline-block;padding:.15rem .5rem;border-radius:4px;background:' + nivClr + '20;color:' + nivClr + ';font-weight:800;font-size:.75rem">' + (NV_LBL[c.niv] || c.niv) + ' (' + (c.pct || 0) + '%)</div>';
        if (c.ep) html += '<div style="font-size:.68rem;color:#888;margin-top:.2rem">Épreuve : ' + c.ep + '</div>';
        _showTooltip(e.clientX, e.clientY, html);
      } else {
        _hideTooltip();
      }
    });
  }

  // ══════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════
  function _getStudentComps(studentCode) {
    var s = (window.students || []).find(function(x) { return x.code === studentCode; });
    if (!s) return null;
    var filKey = window.getFiliere ? window.getFiliere(s) : 'BAC_MFER';
    var fil = window.FILIERES ? window.FILIERES[filKey] : null;
    if (!fil) return null;
    return { student: s, filKey: filKey, fil: fil };
  }

  function _compValue(studentCode, ep, compCode) {
    var lv = window.getLv ? window.getLv(studentCode, ep, compCode) : null;
    return NV_VAL[lv || 'NE'] || 0;
  }

  function _compLevel(studentCode, ep, compCode) {
    return (window.getLv ? window.getLv(studentCode, ep, compCode) : null) || 'NE';
  }

  /** Construit les compData pour un élève (toutes épreuves) */
  function _buildCompData(studentCode, info) {
    var compData = [];
    var epreuves = Object.keys(info.fil.comps);
    var seen = {};
    epreuves.forEach(function(ep) {
      (info.fil.comps[ep] || []).forEach(function(c) {
        if (seen[c.code]) return;
        seen[c.code] = true;
        var niv = _compLevel(studentCode, ep, c.code);
        var pct = NV_VAL[niv] || 0;
        compData.push({ code: c.code, nom: c.nom, full: c.full || c.nom, ep: ep, niv: niv, pct: pct });
      });
    });
    return compData;
  }

  // ══════════════════════════════════════════════════════
  // MINI-RADAR (pour fiche élève dashboard)
  // ══════════════════════════════════════════════════════
  function renderMiniRadar(studentCode, container) {
    var el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    var info = _getStudentComps(studentCode);
    if (!info) return;

    var compData = _buildCompData(studentCode, info);
    if (compData.length < 3) return;

    var canvasId = 'mini_' + studentCode.replace(/[^a-zA-Z0-9]/g, '');
    var w = Math.min(el.offsetWidth || 160, 180);

    el.innerHTML = '<canvas id="' + canvasId + '" width="' + w + '" height="' + w + '" style="display:block;margin:0 auto"></canvas>';

    var labels = compData.map(function(c) { return c.code; });
    var values = compData.map(function(c) { return c.pct; });
    var datasets = [{ label: '', values: values, color: ELEVE_COLOR }];

    setTimeout(function() {
      _drawRadar(canvasId, labels, datasets, { mini: true, compData: compData });
      var cv = document.getElementById(canvasId);
      if (cv) _setupClick(cv, compData);
    }, 60);
  }

  // ══════════════════════════════════════════════════════
  // Rendu batch : tous les mini-radars du dashboard
  // ══════════════════════════════════════════════════════
  function renderAllMiniRadars() {
    var containers = document.querySelectorAll('[data-mini-radar]');
    containers.forEach(function(el) {
      var code = el.getAttribute('data-mini-radar');
      if (code) renderMiniRadar(code, el);
    });
  }

  // ══════════════════════════════════════════════════════
  // RADAR ÉLÈVE GRAND FORMAT (bilan)
  // ══════════════════════════════════════════════════════
  function renderStudentRadar(studentCode, container) {
    var el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    var info = _getStudentComps(studentCode);
    if (!info) { el.innerHTML = '<div style="text-align:center;color:#999;font-size:.78rem;padding:1rem">Aucune donnée</div>'; return; }

    var compData = _buildCompData(studentCode, info);
    if (compData.length < 3) return;

    var canvasId = 'radar_elv_' + studentCode.replace(/[^a-zA-Z0-9]/g, '');
    var w = Math.min(el.offsetWidth || 340, 380);

    el.innerHTML = '<canvas id="' + canvasId + '" width="' + w + '" height="' + w + '" style="max-width:100%;display:block;margin:0 auto"></canvas>'
      + '<div style="text-align:center;font-size:.68rem;color:#999;margin-top:.3rem">💡 Cliquez sur une compétence pour voir le détail</div>';

    var labels = compData.map(function(c) { return c.code; });
    var values = compData.map(function(c) { return c.pct; });
    var datasets = [{ label: info.student.nom + ' ' + (info.student.prenom || ''), values: values, color: ELEVE_COLOR }];

    var title = info.fil.abrege + ' — Profil compétences';
    setTimeout(function() {
      _drawRadar(canvasId, labels, datasets, { title: title, compData: compData });
      var cv = document.getElementById(canvasId);
      if (cv) _setupClick(cv, compData);
    }, 60);
  }

  // ══════════════════════════════════════════════════════
  // RADAR PAR ÉPREUVE
  // ══════════════════════════════════════════════════════
  function renderStudentRadarByEp(studentCode, ep, container) {
    var el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    var info = _getStudentComps(studentCode);
    if (!info) return;

    var comps = info.fil.comps[ep] || [];
    if (comps.length < 3) { el.innerHTML = '<div style="text-align:center;color:#999;font-size:.75rem">Pas assez de compétences</div>'; return; }

    var compData = comps.map(function(c) {
      var niv = _compLevel(studentCode, ep, c.code);
      return { code: c.code, nom: c.nom, full: c.full || c.nom, ep: ep, niv: niv, pct: NV_VAL[niv] || 0 };
    });

    var canvasId = 'radar_' + ep + '_' + studentCode.replace(/[^a-zA-Z0-9]/g, '');
    var w = Math.min(el.offsetWidth || 300, 340);

    el.innerHTML = '<canvas id="' + canvasId + '" width="' + w + '" height="' + w + '" style="max-width:100%;display:block;margin:0 auto"></canvas>';

    var labels = comps.map(function(c) { return c.code; });
    var values = compData.map(function(c) { return c.pct; });
    var datasets = [{ label: 'Progression', values: values, color: PALETTE[0] }];

    setTimeout(function() {
      _drawRadar(canvasId, labels, datasets, { title: ep, compData: compData });
      var cv = document.getElementById(canvasId);
      if (cv) _setupClick(cv, compData);
    }, 60);
  }

  // ══════════════════════════════════════════════════════
  // RADAR CLASSE
  // ══════════════════════════════════════════════════════
  function renderClassRadar(container, filterOpts) {
    var el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    var sts = window.students || [];
    if (!sts.length) { el.innerHTML = '<div style="text-align:center;color:#999;font-size:.8rem;padding:1rem">Aucun élève</div>'; return; }

    var opts = filterOpts || {};
    var filtered = sts.filter(function(s) {
      if (opts.classe && opts.classe !== 'all' && s.classe !== opts.classe) return false;
      if (opts.annee && opts.annee !== 'all' && String(s.annee || 1) !== opts.annee) return false;
      if (opts.groupe && opts.groupe !== 'all' && (s.groupe || '') !== opts.groupe) return false;
      return true;
    });
    if (!filtered.length) { el.innerHTML = '<div style="text-align:center;color:#999;font-size:.8rem;padding:1rem">Aucun élève pour ce filtre</div>'; return; }

    var byFil = {};
    filtered.forEach(function(s) {
      var fk = window.getFiliere ? window.getFiliere(s) : 'BAC_MFER';
      if (!byFil[fk]) byFil[fk] = [];
      byFil[fk].push(s);
    });

    var filKeys = Object.keys(byFil);
    var html = '';

    filKeys.forEach(function(fk) {
      var fil = window.FILIERES ? window.FILIERES[fk] : null;
      if (!fil) return;
      var epreuves = Object.keys(fil.comps);
      epreuves.forEach(function(ep) {
        var comps = fil.comps[ep] || [];
        if (comps.length < 3) return;
        var cid = 'radar_class_' + fk + '_' + ep;
        var w = Math.min((el.offsetWidth || 340) / Math.min(epreuves.length, 2) - 10, 340);
        w = Math.max(w, 240);
        html += '<div style="display:inline-block;vertical-align:top;margin:.25rem">'
          + '<canvas id="' + cid + '" width="' + w + '" height="' + w + '" style="max-width:100%;display:block"></canvas></div>';
      });
    });

    el.innerHTML = html || '<div style="text-align:center;color:#999;font-size:.8rem;padding:1rem">Pas assez de données</div>';

    setTimeout(function() {
      filKeys.forEach(function(fk, fIdx) {
        var fil = window.FILIERES ? window.FILIERES[fk] : null;
        if (!fil) return;
        var group = byFil[fk];
        var epreuves = Object.keys(fil.comps);

        epreuves.forEach(function(ep) {
          var comps = fil.comps[ep] || [];
          if (comps.length < 3) return;
          var cid = 'radar_class_' + fk + '_' + ep;
          var labels = comps.map(function(c) { return c.code; });

          var compData = comps.map(function(c) {
            var sum = 0;
            group.forEach(function(s) { sum += _compValue(s.code, ep, c.code); });
            var avg = Math.round(sum / group.length);
            var niv = avg >= 70 ? 'M' : avg >= 35 ? 'EC' : avg > 0 ? 'NA' : 'NE';
            return { code: c.code, nom: c.nom, full: c.full || c.nom, ep: ep, niv: niv, pct: avg };
          });

          var avgValues = compData.map(function(c) { return c.pct; });
          var datasets = [{
            label: (fil.abrege || fk) + ' — Moyenne (' + group.length + ' élèves)',
            values: avgValues,
            color: PALETTE[fIdx % PALETTE.length]
          }];

          _drawRadar(cid, labels, datasets, { title: (fil.abrege || fk) + ' — ' + ep, compData: compData });
          var cv = document.getElementById(cid);
          if (cv) _setupClick(cv, compData);
        });
      });
    }, 80);
  }

  // ══════════════════════════════════════════════════════
  // RADAR COMPARAISON ÉLÈVE vs CLASSE
  // ══════════════════════════════════════════════════════
  function renderCompareRadar(studentCode, container) {
    var el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    var info = _getStudentComps(studentCode);
    if (!info) { el.innerHTML = ''; return; }

    var classMates = (window.students || []).filter(function(s) {
      return s.classe === info.student.classe;
    });
    if (classMates.length < 2) { el.innerHTML = ''; return; }

    var epreuves = Object.keys(info.fil.comps);
    var html = '';

    epreuves.forEach(function(ep) {
      var comps = info.fil.comps[ep] || [];
      if (comps.length < 3) return;
      var cid = 'radar_cmp_' + ep + '_' + studentCode.replace(/[^a-zA-Z0-9]/g, '');
      var w = Math.min(el.offsetWidth || 340, 360);
      html += '<canvas id="' + cid + '" width="' + w + '" height="' + w + '" style="max-width:100%;display:block;margin:.5rem auto"></canvas>';
    });

    el.innerHTML = html;

    setTimeout(function() {
      epreuves.forEach(function(ep) {
        var comps = info.fil.comps[ep] || [];
        if (comps.length < 3) return;
        var cid = 'radar_cmp_' + ep + '_' + studentCode.replace(/[^a-zA-Z0-9]/g, '');
        var labels = comps.map(function(c) { return c.code; });

        var compData = comps.map(function(c) {
          var niv = _compLevel(studentCode, ep, c.code);
          var pct = NV_VAL[niv] || 0;
          var sum = 0;
          classMates.forEach(function(s) { sum += _compValue(s.code, ep, c.code); });
          var avg = Math.round(sum / classMates.length);
          return { code: c.code, nom: c.nom, full: c.full || c.nom, ep: ep, niv: niv, pct: pct, avg: avg };
        });

        var elvValues = compData.map(function(c) { return c.pct; });
        var avgValues = compData.map(function(c) { return c.avg; });

        var datasets = [
          { label: info.student.nom + ' ' + (info.student.prenom || ''), values: elvValues, color: ELEVE_COLOR },
          { label: 'Moyenne classe (' + classMates.length + ')', values: avgValues, color: CLASS_COLOR }
        ];

        _drawRadar(cid, labels, datasets, { title: ep + ' — Élève vs Classe', compData: compData });
        var cv = document.getElementById(cid);
        if (cv) _setupClick(cv, compData);
      });
    }, 80);
  }

  // ══════════════════════════════════════════════════════
  // API GLOBALE
  // ══════════════════════════════════════════════════════
  window.radarModule = {
    renderMiniRadar: renderMiniRadar,
    renderAllMiniRadars: renderAllMiniRadars,
    renderStudentRadar: renderStudentRadar,
    renderStudentRadarByEp: renderStudentRadarByEp,
    renderClassRadar: renderClassRadar,
    renderCompareRadar: renderCompareRadar,
    renderBothRadars: function(code, container) { renderStudentRadar(code, container); }
  };

})();
