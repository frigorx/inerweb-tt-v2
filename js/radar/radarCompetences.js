/**
 * radarCompetences.js — Module radar de competences avance
 * Wrapper autour de radarModule (radar.js) + fonctions supplementaires
 *
 * Fournit :
 *  - renderClasseRadar(classeCode, container)  : radar agrege par classe
 *  - renderProgressionEleve(studentCode, container) : barres horizontales par epreuve
 *  - renderCouverture(classeCode, container) : couverture competences evaluees vs non
 *
 * Globales attendues : students, validations, FILIERES, getFiliere, getComps, getCrits, getLv
 * Depend de : window.radarModule (radar.js)
 */
;(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════
     CONSTANTES
     ══════════════════════════════════════════════════════ */
  var NV_VAL = { NE: 0, NA: 0, EC: 35, M: 70, PM: 100 };
  var NV_CLR = {
    NE: '#aaa', NA: '#e74c3c', EC: '#f39c12', M: '#27ae60', PM: '#2196F3'
  };
  var NV_LBL = {
    NE: 'Non \u00c9valu\u00e9', NA: 'Non Acquis', EC: 'En Cours',
    M: 'Ma\u00eetris\u00e9', PM: 'Parfait'
  };

  var BAR_COLORS = {
    validated: '#27ae60',
    partial:   '#f39c12',
    missing:   '#e0e0e0',
    na:        '#e74c3c'
  };

  var COUV_COLORS = {
    couverte:   '#27ae60',
    partielle:  '#f39c12',
    nonEvaluee: '#e74c3c'
  };

  /* ══════════════════════════════════════════════════════
     HELPERS INTERNES
     ══════════════════════════════════════════════════════ */

  /** Retrouve les eleves d'une classe */
  function _classeStudents(classeCode) {
    return (window.students || []).filter(function (s) {
      return s.classe === classeCode;
    });
  }

  /** Retrouve la filiere d'un eleve */
  function _filiere(student) {
    var fk = window.getFiliere ? window.getFiliere(student) : 'BAC_MFER';
    return window.FILIERES ? window.FILIERES[fk] : null;
  }

  /** Niveau d'un eleve pour une competence/epreuve */
  function _lv(code, ep, comp) {
    return (window.getLv ? window.getLv(code, ep, comp) : null) || 'NE';
  }

  /** Valeur numerique d'un niveau */
  function _val(niv) {
    return NV_VAL[niv] || 0;
  }

  /** Cree un canvas HiDPI dans un conteneur, retourne {canvas, ctx, W, H} */
  function _createCanvas(container, id, width, height) {
    var el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return null;

    var c = document.createElement('canvas');
    c.id = id;
    c.width = width;
    c.height = height;
    c.style.cssText = 'max-width:100%;display:block;margin:0 auto';

    var dpr = window.devicePixelRatio || 1;
    c.width = width * dpr;
    c.height = height * dpr;
    c.style.width = width + 'px';
    c.style.height = height + 'px';
    var ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);

    return { el: el, canvas: c, ctx: ctx, W: width, H: height };
  }

  /** Tronque un texte */
  function _truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.substring(0, max - 1) + '\u2026' : str;
  }

  /* ══════════════════════════════════════════════════════
     1. renderClasseRadar — Radar agrege par classe
     ══════════════════════════════════════════════════════ */

  /**
   * Affiche un radar agrege montrant la couverture de competences
   * pour toute une classe (moyenne des niveaux par competence).
   * Delegue le dessin a radarModule.renderClassRadar si disponible,
   * sinon dessine en autonome.
   */
  function renderClasseRadar(classeCode, container) {
    var el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;

    var sts = _classeStudents(classeCode);
    if (!sts.length) {
      el.innerHTML = '<div style="text-align:center;color:#999;font-size:.8rem;padding:1rem">'
        + 'Aucun \u00e9l\u00e8ve dans la classe ' + classeCode + '</div>';
      return;
    }

    // Determiner la filiere dominante
    var fil = _filiere(sts[0]);
    if (!fil || !fil.comps) {
      el.innerHTML = '<div style="text-align:center;color:#999;font-size:.8rem;padding:1rem">'
        + 'Fili\u00e8re non trouv\u00e9e</div>';
      return;
    }

    // Construire toutes les competences (toutes epreuves confondues)
    var allComps = [];
    var seen = {};
    var epreuves = Object.keys(fil.comps);
    epreuves.forEach(function (ep) {
      (fil.comps[ep] || []).forEach(function (c) {
        if (seen[c.code]) return;
        seen[c.code] = true;
        allComps.push({ code: c.code, nom: c.nom, full: c.full || c.nom, ep: ep });
      });
    });

    if (allComps.length < 3) {
      el.innerHTML = '<div style="text-align:center;color:#999;font-size:.8rem;padding:1rem">'
        + 'Pas assez de comp\u00e9tences</div>';
      return;
    }

    // Calculer les moyennes
    var labels = [];
    var values = [];
    var compData = [];

    allComps.forEach(function (comp) {
      var sum = 0;
      sts.forEach(function (s) {
        sum += _val(_lv(s.code, comp.ep, comp.code));
      });
      var avg = Math.round(sum / sts.length);
      var niv = avg >= 70 ? 'M' : avg >= 35 ? 'EC' : avg > 0 ? 'NA' : 'NE';
      labels.push(comp.code);
      values.push(avg);
      compData.push({
        code: comp.code, nom: comp.nom, full: comp.full,
        ep: comp.ep, niv: niv, pct: avg
      });
    });

    // Deleguer a radarModule si disponible (reutilise le dessin existant)
    if (window.radarModule && window.radarModule.renderClassRadar) {
      window.radarModule.renderClassRadar(el, { classe: classeCode });
      return;
    }

    // Fallback : dessin autonome simplifie
    var canvasId = 'rc_classe_' + classeCode.replace(/[^a-zA-Z0-9]/g, '');
    var w = Math.min(el.offsetWidth || 360, 400);

    el.innerHTML = '<canvas id="' + canvasId + '" width="' + w + '" height="' + w
      + '" style="max-width:100%;display:block;margin:0 auto"></canvas>'
      + '<div style="text-align:center;font-size:.72rem;color:#888;margin-top:.3rem">'
      + 'Classe ' + classeCode + ' \u2014 ' + sts.length + ' \u00e9l\u00e8ves \u2014 Moyenne par comp\u00e9tence</div>';

    setTimeout(function () {
      _drawRadarFallback(canvasId, labels, values, compData,
        (fil.abrege || '') + ' \u2014 Classe ' + classeCode);
    }, 60);
  }

  /** Dessin radar autonome (fallback si radarModule indisponible) */
  function _drawRadarFallback(canvasId, labels, values, compData, title) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var W = canvas.width, H = canvas.height;
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
    var cx = W / 2, cy = H / 2 + 8;
    var R = Math.min(cx, cy) - 40;
    var n = labels.length;
    if (n < 3) return;

    ctx.clearRect(0, 0, W * dpr, H * dpr);

    // Titre
    if (title) {
      ctx.fillStyle = '#1a2332';
      ctx.font = 'bold 12px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(title, cx, 16);
    }

    // Grille
    [0.25, 0.5, 0.75, 1].forEach(function (pct) {
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
    for (var i = 0; i < n; i++) {
      var angle = (Math.PI * 2 * i / n) - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + R * Math.cos(angle), cy + R * Math.sin(angle));
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      ctx.stroke();
      var lx = cx + (R + 20) * Math.cos(angle);
      var ly = cy + (R + 20) * Math.sin(angle);
      var clr = compData[i] ? (NV_CLR[compData[i].niv] || '#555') : '#555';
      ctx.fillStyle = clr;
      ctx.font = '600 9px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[i], lx, ly);
    }

    // Polygone
    ctx.beginPath();
    values.forEach(function (v, i) {
      var angle = (Math.PI * 2 * i / n) - Math.PI / 2;
      var r = R * (v / 100);
      var x = cx + r * Math.cos(angle);
      var y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,152,0,0.18)';
    ctx.fill();
    ctx.strokeStyle = '#FF9800';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Points
    values.forEach(function (v, i) {
      var angle = (Math.PI * 2 * i / n) - Math.PI / 2;
      var r = R * (v / 100);
      ctx.beginPath();
      ctx.arc(cx + r * Math.cos(angle), cy + r * Math.sin(angle), 3, 0, Math.PI * 2);
      ctx.fillStyle = '#E65100';
      ctx.fill();
    });

    // Niveaux
    ctx.fillStyle = '#bbb';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'right';
    [25, 50, 75, 100].forEach(function (v, idx) {
      ctx.fillText(v + '%', cx - 4, cy - R * [0.25, 0.5, 0.75, 1][idx] + 3);
    });
  }

  /* ══════════════════════════════════════════════════════
     2. renderProgressionEleve — Barres horizontales par epreuve
     ══════════════════════════════════════════════════════ */

  /**
   * Graphique barres horizontales montrant la progression par epreuve
   * (% de criteres valides M ou PM).
   */
  function renderProgressionEleve(studentCode, container) {
    var el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;

    var s = (window.students || []).find(function (x) { return x.code === studentCode; });
    if (!s) {
      el.innerHTML = '<div style="text-align:center;color:#999;font-size:.8rem;padding:1rem">'
        + '\u00c9l\u00e8ve non trouv\u00e9</div>';
      return;
    }

    var fil = _filiere(s);
    if (!fil || !fil.comps) {
      el.innerHTML = '<div style="text-align:center;color:#999;font-size:.8rem;padding:1rem">'
        + 'Fili\u00e8re non trouv\u00e9e</div>';
      return;
    }

    // Calculer la progression par epreuve
    var epreuves = Object.keys(fil.comps);
    var barData = [];

    epreuves.forEach(function (ep) {
      var comps = fil.comps[ep] || [];
      // Recueillir tous les criteres de cette epreuve
      var totalCrits = 0;
      var validatedCrits = 0;
      var ecCrits = 0;
      var naCrits = 0;

      comps.forEach(function (c) {
        // Utiliser getCrits si dispo, sinon compter la competence comme un critere
        var crits = window.getCrits ? window.getCrits(ep, c.code) : null;
        if (crits && crits.length) {
          crits.forEach(function (cr) {
            totalCrits++;
            var lv = _lv(studentCode, ep, cr.code || c.code);
            if (lv === 'M' || lv === 'PM') validatedCrits++;
            else if (lv === 'EC') ecCrits++;
            else if (lv === 'NA') naCrits++;
          });
        } else {
          totalCrits++;
          var lv = _lv(studentCode, ep, c.code);
          if (lv === 'M' || lv === 'PM') validatedCrits++;
          else if (lv === 'EC') ecCrits++;
          else if (lv === 'NA') naCrits++;
        }
      });

      var pctValid = totalCrits > 0 ? Math.round(validatedCrits / totalCrits * 100) : 0;
      var pctEC = totalCrits > 0 ? Math.round(ecCrits / totalCrits * 100) : 0;
      var pctNA = totalCrits > 0 ? Math.round(naCrits / totalCrits * 100) : 0;

      barData.push({
        label: ep,
        total: totalCrits,
        validated: validatedCrits,
        ec: ecCrits,
        na: naCrits,
        pctValid: pctValid,
        pctEC: pctEC,
        pctNA: pctNA
      });
    });

    if (!barData.length) {
      el.innerHTML = '<div style="text-align:center;color:#999;font-size:.8rem;padding:1rem">'
        + 'Aucune \u00e9preuve</div>';
      return;
    }

    // Dimensions canvas
    var barH = 28;
    var gap = 8;
    var labelW = 80;
    var marginTop = 36;
    var marginBottom = 20;
    var canvasW = Math.min(el.offsetWidth || 460, 500);
    var canvasH = marginTop + barData.length * (barH + gap) + marginBottom;

    var canvasId = 'rc_prog_' + studentCode.replace(/[^a-zA-Z0-9]/g, '');
    var setup = _createCanvas(el, canvasId, canvasW, canvasH);
    if (!setup) return;

    el.innerHTML = '';
    el.appendChild(setup.canvas);

    // Legende
    var leg = document.createElement('div');
    leg.style.cssText = 'display:flex;gap:.6rem;justify-content:center;flex-wrap:wrap;'
      + 'font-size:.68rem;color:#555;margin-top:.3rem';
    leg.innerHTML = '<span>\u{1F7E2} M/PM</span>'
      + '<span>\u{1F7E0} En cours</span>'
      + '<span>\u{1F534} Non Acquis</span>'
      + '<span>\u{2B1C} Non \u00c9valu\u00e9</span>';
    el.appendChild(leg);

    var ctx = setup.ctx;
    var W = setup.W;

    // Titre
    ctx.fillStyle = '#1a2332';
    ctx.font = 'bold 12px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Progression par \u00e9preuve \u2014 ' + (s.nom || '') + ' ' + (s.prenom || ''), W / 2, 18);

    var barAreaW = W - labelW - 60;

    barData.forEach(function (d, idx) {
      var y = marginTop + idx * (barH + gap);

      // Label epreuve
      ctx.fillStyle = '#333';
      ctx.font = '600 10px Nunito, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(_truncate(d.label, 12), labelW - 6, y + barH / 2);

      var bx = labelW;
      var bw = barAreaW;

      // Fond
      ctx.fillStyle = BAR_COLORS.missing;
      _roundRect(ctx, bx, y + 2, bw, barH - 4, 4);

      // Barre NA
      if (d.pctNA > 0) {
        var wNA = bw * d.pctNA / 100;
        ctx.fillStyle = BAR_COLORS.na;
        _roundRectLeft(ctx, bx, y + 2, wNA, barH - 4, 4);
      }

      // Barre EC (apres NA)
      var offsetEC = bw * d.pctNA / 100;
      if (d.pctEC > 0) {
        var wEC = bw * d.pctEC / 100;
        ctx.fillStyle = BAR_COLORS.partial;
        ctx.fillRect(bx + offsetEC, y + 2, wEC, barH - 4);
      }

      // Barre validee (apres NA + EC)
      var offsetV = offsetEC + bw * d.pctEC / 100;
      if (d.pctValid > 0) {
        var wV = bw * d.pctValid / 100;
        ctx.fillStyle = BAR_COLORS.validated;
        ctx.fillRect(bx + offsetV, y + 2, wV, barH - 4);
      }

      // Pourcentage texte
      ctx.fillStyle = '#333';
      ctx.font = 'bold 10px Nunito, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(d.pctValid + '%', bx + bw + 6, y + barH / 2);

      // Detail sous la barre
      ctx.fillStyle = '#999';
      ctx.font = '8px Nunito, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(d.validated + '/' + d.total + ' valid\u00e9s', bx, y + barH + 1);
    });
  }

  /** Rectangle arrondi (remplissage complet) */
  function _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }

  /** Rectangle arrondi cote gauche seulement */
  function _roundRectLeft(ctx, x, y, w, h, r) {
    if (w < r) r = w;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }

  /* ══════════════════════════════════════════════════════
     3. renderCouverture — Couverture competences evaluees
     ══════════════════════════════════════════════════════ */

  /**
   * Tableau/graphique montrant quelles competences sont couvertes
   * vs non evaluees pour la classe.
   */
  function renderCouverture(classeCode, container) {
    var el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;

    var sts = _classeStudents(classeCode);
    if (!sts.length) {
      el.innerHTML = '<div style="text-align:center;color:#999;font-size:.8rem;padding:1rem">'
        + 'Aucun \u00e9l\u00e8ve dans la classe ' + classeCode + '</div>';
      return;
    }

    var fil = _filiere(sts[0]);
    if (!fil || !fil.comps) {
      el.innerHTML = '<div style="text-align:center;color:#999;font-size:.8rem;padding:1rem">'
        + 'Fili\u00e8re non trouv\u00e9e</div>';
      return;
    }

    // Analyser couverture par competence
    var epreuves = Object.keys(fil.comps);
    var rows = [];

    epreuves.forEach(function (ep) {
      (fil.comps[ep] || []).forEach(function (c) {
        var evalCount = 0;  // nombre d'eleves qui ont ete evalues (pas NE)
        var mCount = 0;     // M ou PM
        var naCount = 0;    // NA
        var ecCount = 0;    // EC

        sts.forEach(function (s) {
          var lv = _lv(s.code, ep, c.code);
          if (lv !== 'NE') evalCount++;
          if (lv === 'M' || lv === 'PM') mCount++;
          else if (lv === 'NA') naCount++;
          else if (lv === 'EC') ecCount++;
        });

        var pctEval = Math.round(evalCount / sts.length * 100);
        var status = pctEval === 0 ? 'nonEvaluee' : pctEval < 50 ? 'partielle' : 'couverte';

        rows.push({
          ep: ep,
          code: c.code,
          nom: c.nom,
          total: sts.length,
          evalCount: evalCount,
          mCount: mCount,
          naCount: naCount,
          ecCount: ecCount,
          pctEval: pctEval,
          status: status
        });
      });
    });

    if (!rows.length) {
      el.innerHTML = '<div style="text-align:center;color:#999;font-size:.8rem;padding:1rem">'
        + 'Aucune comp\u00e9tence trouv\u00e9e</div>';
      return;
    }

    // Statistiques globales
    var nbCouv = rows.filter(function (r) { return r.status === 'couverte'; }).length;
    var nbPart = rows.filter(function (r) { return r.status === 'partielle'; }).length;
    var nbNon = rows.filter(function (r) { return r.status === 'nonEvaluee'; }).length;

    // Construire un graphique Canvas en barres + un tableau HTML
    var html = '';

    // Resume en haut
    html += '<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.6rem;justify-content:center">';
    html += '<span style="background:#27ae6022;color:#27ae60;padding:.2rem .6rem;border-radius:6px;'
      + 'font-size:.75rem;font-weight:700">' + nbCouv + ' couvertes</span>';
    html += '<span style="background:#f39c1222;color:#f39c12;padding:.2rem .6rem;border-radius:6px;'
      + 'font-size:.75rem;font-weight:700">' + nbPart + ' partielles</span>';
    html += '<span style="background:#e74c3c22;color:#e74c3c;padding:.2rem .6rem;border-radius:6px;'
      + 'font-size:.75rem;font-weight:700">' + nbNon + ' non \u00e9valu\u00e9es</span>';
    html += '</div>';

    // Canvas pour le graphique barres
    var canvasId = 'rc_couv_' + classeCode.replace(/[^a-zA-Z0-9]/g, '');
    var barH = 22;
    var gap = 4;
    var topMargin = 8;
    var canvasW = Math.min(el.offsetWidth || 500, 540);
    var canvasH = topMargin + rows.length * (barH + gap) + 10;
    html += '<canvas id="' + canvasId + '" width="' + canvasW + '" height="' + canvasH
      + '" style="max-width:100%;display:block;margin:0 auto"></canvas>';

    // Tableau HTML detail
    html += '<details style="margin-top:.5rem"><summary style="cursor:pointer;font-size:.78rem;'
      + 'font-weight:700;color:#1a2332">D\u00e9tail par comp\u00e9tence</summary>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:.72rem;margin-top:.3rem">';
    html += '<tr style="background:#f5f7fa"><th style="text-align:left;padding:.25rem .4rem">\u00c9pr.</th>'
      + '<th style="text-align:left;padding:.25rem .4rem">Code</th>'
      + '<th style="text-align:left;padding:.25rem .4rem">Comp\u00e9tence</th>'
      + '<th style="text-align:center;padding:.25rem .4rem">\u00c9valu\u00e9s</th>'
      + '<th style="text-align:center;padding:.25rem .4rem">M/PM</th>'
      + '<th style="text-align:center;padding:.25rem .4rem">EC</th>'
      + '<th style="text-align:center;padding:.25rem .4rem">NA</th>'
      + '<th style="text-align:center;padding:.25rem .4rem">Statut</th></tr>';

    rows.forEach(function (r) {
      var statusBadge = r.status === 'couverte'
        ? '<span style="color:#27ae60;font-weight:700">\u2714</span>'
        : r.status === 'partielle'
          ? '<span style="color:#f39c12;font-weight:700">\u25cf</span>'
          : '<span style="color:#e74c3c;font-weight:700">\u2716</span>';

      html += '<tr style="border-bottom:1px solid #eee">'
        + '<td style="padding:.2rem .4rem">' + r.ep + '</td>'
        + '<td style="padding:.2rem .4rem;font-weight:600">' + r.code + '</td>'
        + '<td style="padding:.2rem .4rem">' + _truncate(r.nom, 30) + '</td>'
        + '<td style="text-align:center;padding:.2rem .4rem">' + r.evalCount + '/' + r.total + '</td>'
        + '<td style="text-align:center;padding:.2rem .4rem;color:#27ae60">' + r.mCount + '</td>'
        + '<td style="text-align:center;padding:.2rem .4rem;color:#f39c12">' + r.ecCount + '</td>'
        + '<td style="text-align:center;padding:.2rem .4rem;color:#e74c3c">' + r.naCount + '</td>'
        + '<td style="text-align:center;padding:.2rem .4rem">' + statusBadge + '</td></tr>';
    });

    html += '</table></details>';

    el.innerHTML = html;

    // Dessiner le canvas barres
    setTimeout(function () {
      var canvas = document.getElementById(canvasId);
      if (!canvas) return;
      var ctx = canvas.getContext('2d');
      var dpr = window.devicePixelRatio || 1;
      canvas.width = canvasW * dpr;
      canvas.height = canvasH * dpr;
      canvas.style.width = canvasW + 'px';
      canvas.style.height = canvasH + 'px';
      ctx.scale(dpr, dpr);

      var labelW = 70;
      var barAreaW = canvasW - labelW - 50;

      rows.forEach(function (r, idx) {
        var y = topMargin + idx * (barH + gap);

        // Label
        ctx.fillStyle = '#555';
        ctx.font = '600 8px Nunito, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(r.code, labelW - 4, y + barH / 2);

        var bx = labelW;

        // Fond
        ctx.fillStyle = '#f0f0f0';
        _roundRect(ctx, bx, y + 2, barAreaW, barH - 4, 3);

        // Barre evaluee
        if (r.pctEval > 0) {
          var w = barAreaW * r.pctEval / 100;
          ctx.fillStyle = COUV_COLORS[r.status];
          _roundRect(ctx, bx, y + 2, Math.max(w, 3), barH - 4, 3);
        }

        // Pourcentage
        ctx.fillStyle = '#333';
        ctx.font = 'bold 9px Nunito, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(r.pctEval + '%', bx + barAreaW + 4, y + barH / 2);
      });
    }, 60);
  }

  /* ══════════════════════════════════════════════════════
     API GLOBALE
     ══════════════════════════════════════════════════════ */
  window.radarCompetences = {
    renderClasseRadar: renderClasseRadar,
    renderProgressionEleve: renderProgressionEleve,
    renderCouverture: renderCouverture
  };

})();
