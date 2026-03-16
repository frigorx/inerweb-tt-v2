/**
 * eval-tuteur.js — Évaluation par le tuteur de stage en entreprise
 * Module Fusion — CAP Installateur en Froid et Conditionnement d'Air (CCF/PFMP)
 *
 * Utilise la DÉLÉGATION D'ÉVÉNEMENTS (pas de onclick inline)
 * pour compatibilité maximale mobile/tablette.
 *
 * Globales : students, pfmpData, partenaires, COMP_EP2, CRIT2,
 *            cur, NV_LBL, pushVal(), saveLocal(), toast(),
 *            showModal(), closeModal()
 */
;(function () {
  'use strict';

  // ── Constantes ──

  var NIVEAUX = ['NE', 'EC', 'M', 'PM'];
  var NIV_COLORS = {
    NE: { bg: '#e0e0e0', txt: '#666' },
    EC: { bg: '#fff3cd', txt: '#856404' },
    M:  { bg: '#d4edda', txt: '#155724' },
    PM: { bg: '#cce5ff', txt: '#004085' }
  };

  var CRITERES_GLOBAUX = [
    { id: 'assiduite',     label: 'Assiduité / Ponctualité' },
    { id: 'initiative',    label: 'Initiative / Autonomie' },
    { id: 'qualite',       label: 'Qualité du travail' },
    { id: 'comportement',  label: 'Comportement / Savoir-être' }
  ];

  // ── Helpers ──

  function _dateFR(iso) {
    if (!iso) return '—';
    var p = iso.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  function _today() {
    return new Date().toISOString().split('T')[0];
  }

  function _student(code) {
    return (window.students || []).find(function (s) { return s.code === code; }) || {};
  }

  function _compsPfmp(pfmpNum) {
    var lieu = 'pfmp' + pfmpNum;
    return (window.COMP_EP2 || []).filter(function (c) {
      return c.lieux && c.lieux.indexOf(lieu) !== -1;
    });
  }

  function _ensurePfmpData(code) {
    if (!window.pfmpData) window.pfmpData = {};
    if (!window.pfmpData[code]) window.pfmpData[code] = {};
    if (!window.pfmpData[code].evalTuteur) window.pfmpData[code].evalTuteur = {};
    return window.pfmpData[code].evalTuteur;
  }

  function _getEval(code, pfmpNum) {
    var et = _ensurePfmpData(code);
    return et['pfmp' + pfmpNum] || null;
  }

  function _nivLabel(niv) {
    return (window.NV_LBL && window.NV_LBL[niv]) || niv || 'Non Évalué';
  }

  // ══════════════════════════════════════════════════════════════
  // DÉLÉGATION D'ÉVÉNEMENTS
  // ══════════════════════════════════════════════════════════════

  var _delegInstalled = false;

  function _installDelegation() {
    if (_delegInstalled) return;
    _delegInstalled = true;

    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-et]');
      if (!btn) return;
      var action = btn.dataset.et;

      // Sélection niveau compétence
      if (action === 'setNiv') {
        _handleSetNiv(btn);
        return;
      }

      // Étoiles critères globaux
      if (action === 'setStar') {
        _handleSetStar(btn);
        return;
      }

      // Valider
      if (action === 'valider') {
        _handleValider(btn);
        return;
      }

      // Intégrer dans la grille
      if (action === 'integrer') {
        var sc = btn.dataset.code;
        var pn = parseInt(btn.dataset.pfmp, 10);
        integrerDansGrille(sc, pn);
        return;
      }
    });
  }

  // ── Handlers délégués ──

  function _handleSetNiv(btn) {
    var comp = btn.dataset.comp;
    var niv = btn.dataset.niv;
    var row = btn.closest('.et-comp-row');
    if (!row) return;

    // Mise à jour visuelle
    var btns = row.querySelectorAll('[data-et="setNiv"]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.remove('sel');
      btns[i].style.background = '';
      btns[i].style.color = '';
    }
    btn.classList.add('sel');
    var col = NIV_COLORS[niv] || {};
    btn.style.background = col.bg || '#ccc';
    btn.style.color = col.txt || '#333';
  }

  function _handleSetStar(btn) {
    var critId = btn.dataset.crit;
    var val = parseInt(btn.dataset.val, 10);
    var container = btn.closest('.et-stars-row');
    if (!container) return;

    var stars = container.querySelectorAll('[data-et="setStar"]');
    for (var i = 0; i < stars.length; i++) {
      var sv = parseInt(stars[i].dataset.val, 10);
      stars[i].textContent = sv <= val ? '\u2605' : '\u2606';
      stars[i].style.color = sv <= val ? '#f0a500' : '#ccc';
    }
    container.dataset.value = val;
  }

  function _handleValider(btn) {
    var code = btn.dataset.code;
    var pfmpNum = parseInt(btn.dataset.pfmp, 10);
    save(code, pfmpNum);
  }

  // ══════════════════════════════════════════════════════════════
  // 1. renderForm — Formulaire d'évaluation tuteur
  // ══════════════════════════════════════════════════════════════

  function renderForm(studentCode, pfmpNum, container) {
    if (!container) return;
    _installDelegation();

    var s = _student(studentCode);
    var comps = _compsPfmp(pfmpNum);
    var existing = _getEval(studentCode, pfmpNum);
    var lieu = 'pfmp' + pfmpNum;
    var crits = window.CRIT2 || {};

    // ── En-tête ──
    var html = '';
    html += '<div class="et-header" style="background:linear-gradient(135deg,#2d5a8c,#1a3a5c);color:#fff;border-radius:12px;padding:16px;margin-bottom:16px">';
    html += '<div style="font-size:1.1rem;font-weight:900">' + (s.nom || '—') + ' ' + (s.prenom || '') + '</div>';
    html += '<div style="font-size:.8rem;opacity:.85;margin-top:4px">';
    html += 'Entreprise : ' + (s.entreprise_nom || '—');
    html += ' &middot; Tuteur : ' + (s.tuteur_nom || '—');
    html += '</div>';
    html += '<div style="font-size:.75rem;opacity:.7;margin-top:2px">PFMP ' + pfmpNum + ' &middot; EP2 — Réalisation et mise en œuvre</div>';
    html += '</div>';

    // ── Compétences ──
    html += '<div class="et-section-title" style="font-weight:800;font-size:.9rem;color:#2d5a8c;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #2d5a8c">';
    html += 'Compétences observées en entreprise</div>';

    if (!comps.length) {
      html += '<div style="color:#999;font-size:.85rem;padding:12px">Aucune compétence évaluable pour PFMP' + pfmpNum + '</div>';
    }

    comps.forEach(function (comp) {
      var cNiv = (existing && existing.competences && existing.competences[comp.code]) || '';
      var cObs = (existing && existing.observations && existing.observations[comp.code]) || '';

      html += '<div class="et-comp-row" data-comp="' + comp.code + '" style="background:#fff;border:1px solid #e0e0e0;border-radius:10px;padding:12px;margin-bottom:10px">';

      // Titre compétence
      html += '<div style="font-weight:700;font-size:.85rem;color:#333;margin-bottom:6px">';
      html += '<span style="color:#2d5a8c;font-weight:900">' + comp.code + '</span> ' + comp.full;
      html += '</div>';

      // Critères PFMP (informatif)
      var compCrits = (crits[comp.code] && crits[comp.code][lieu]) || [];
      if (compCrits.length) {
        html += '<div style="font-size:.75rem;color:#666;margin-bottom:8px;padding-left:8px;border-left:2px solid #e0e0e0">';
        compCrits.forEach(function (cr) {
          html += '<div style="margin-bottom:2px">&bull; ' + cr + '</div>';
        });
        html += '</div>';
      }

      // Boutons niveau
      html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">';
      NIVEAUX.forEach(function (niv) {
        var sel = cNiv === niv;
        var col = NIV_COLORS[niv] || {};
        var style = sel
          ? 'background:' + (col.bg || '#ccc') + ';color:' + (col.txt || '#333')
          : 'background:#f5f5f5;color:#666';
        html += '<button data-et="setNiv" data-comp="' + comp.code + '" data-niv="' + niv + '"';
        html += ' class="et-niv-btn' + (sel ? ' sel' : '') + '"';
        html += ' style="' + style + ';border:none;border-radius:6px;padding:6px 14px;font-size:.8rem;font-weight:700;cursor:pointer;min-width:44px;transition:all .15s"';
        html += ' title="' + _nivLabel(niv) + '">' + niv + '</button>';
      });
      html += '</div>';

      // Observation
      html += '<textarea class="et-obs" data-comp="' + comp.code + '"';
      html += ' placeholder="Observation sur ' + comp.code + '…"';
      html += ' style="width:100%;box-sizing:border-box;border:1px solid #ddd;border-radius:8px;padding:8px;font-size:.8rem;resize:vertical;min-height:36px;font-family:inherit">';
      html += _escHtml(cObs) + '</textarea>';

      html += '</div>';
    });

    // ── Critères globaux (étoiles) ──
    html += '<div class="et-section-title" style="font-weight:800;font-size:.9rem;color:#2d5a8c;margin:18px 0 10px;padding-bottom:6px;border-bottom:2px solid #2d5a8c">';
    html += 'Évaluation globale</div>';

    CRITERES_GLOBAUX.forEach(function (cg) {
      var val = (existing && existing.criteres && existing.criteres[cg.id]) || 0;
      html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0">';
      html += '<span style="font-size:.85rem;font-weight:600;color:#333">' + cg.label + '</span>';
      html += '<div class="et-stars-row" data-crit="' + cg.id + '" data-value="' + val + '" style="display:flex;gap:2px">';
      for (var i = 1; i <= 5; i++) {
        var filled = i <= val;
        html += '<span data-et="setStar" data-crit="' + cg.id + '" data-val="' + i + '"';
        html += ' style="font-size:1.4rem;cursor:pointer;color:' + (filled ? '#f0a500' : '#ccc') + ';user-select:none;padding:0 2px">';
        html += filled ? '\u2605' : '\u2606';
        html += '</span>';
      }
      html += '</div></div>';
    });

    // ── Appréciation générale ──
    html += '<div class="et-section-title" style="font-weight:800;font-size:.9rem;color:#2d5a8c;margin:18px 0 10px;padding-bottom:6px;border-bottom:2px solid #2d5a8c">';
    html += 'Appréciation générale</div>';

    html += '<textarea id="et-appreciation" placeholder="Appréciation globale du tuteur sur la période de stage…"';
    html += ' style="width:100%;box-sizing:border-box;border:1px solid #ddd;border-radius:8px;padding:10px;font-size:.85rem;resize:vertical;min-height:80px;font-family:inherit">';
    html += _escHtml((existing && existing.appreciation) || '') + '</textarea>';

    // ── Nom tuteur ──
    html += '<div style="margin-top:12px">';
    html += '<label style="font-size:.8rem;font-weight:600;color:#555">Nom du tuteur évaluateur</label>';
    html += '<input id="et-tuteur-nom" type="text" value="' + _escAttr((existing && existing.tuteurNom) || s.tuteur_nom || '') + '"';
    html += ' placeholder="Nom du tuteur" style="width:100%;box-sizing:border-box;border:1px solid #ddd;border-radius:8px;padding:8px;font-size:.85rem;margin-top:4px;font-family:inherit">';
    html += '</div>';

    // ── Bouton valider ──
    html += '<div style="margin-top:18px;text-align:center">';
    html += '<button data-et="valider" data-code="' + studentCode + '" data-pfmp="' + pfmpNum + '"';
    html += ' style="background:linear-gradient(135deg,#27ae60,#219a52);color:#fff;border:none;border-radius:10px;padding:14px 32px;font-size:1rem;font-weight:800;cursor:pointer;box-shadow:0 2px 8px rgba(39,174,96,.3);transition:transform .15s">';
    html += 'Valider l\'évaluation tuteur</button>';
    html += '</div>';

    container.innerHTML = html;
  }

  // ══════════════════════════════════════════════════════════════
  // 2. save — Sauvegarde dans pfmpData
  // ══════════════════════════════════════════════════════════════

  function save(studentCode, pfmpNum) {
    var container = document.querySelector('.et-comp-row') ? document.querySelector('.et-comp-row').parentElement : null;
    if (!container) {
      if (typeof toast === 'function') toast('Aucun formulaire tuteur trouvé', 'err');
      return;
    }

    var comps = _compsPfmp(pfmpNum);
    var competences = {};
    var observations = {};

    // Lire niveaux depuis les boutons sélectionnés
    comps.forEach(function (comp) {
      var row = container.querySelector('.et-comp-row[data-comp="' + comp.code + '"]');
      if (!row) return;

      var selBtn = row.querySelector('.et-niv-btn.sel');
      if (selBtn) {
        competences[comp.code] = selBtn.dataset.niv;
      }

      var obs = row.querySelector('.et-obs');
      if (obs && obs.value.trim()) {
        observations[comp.code] = obs.value.trim();
      }
    });

    // Lire critères globaux
    var criteres = {};
    CRITERES_GLOBAUX.forEach(function (cg) {
      var starsRow = container.querySelector('.et-stars-row[data-crit="' + cg.id + '"]');
      if (starsRow) {
        criteres[cg.id] = parseInt(starsRow.dataset.value, 10) || 0;
      }
    });

    // Lire appréciation
    var appEl = document.getElementById('et-appreciation');
    var appreciation = appEl ? appEl.value.trim() : '';

    // Lire nom tuteur
    var tutEl = document.getElementById('et-tuteur-nom');
    var tuteurNom = tutEl ? tutEl.value.trim() : '';

    // Vérification minimale
    var nbEvalues = Object.keys(competences).length;
    if (nbEvalues === 0) {
      if (typeof toast === 'function') toast('Aucune compétence évaluée', 'warn');
      return;
    }

    // Construction objet
    var evalObj = {
      competences: competences,
      observations: observations,
      appreciation: appreciation,
      criteres: criteres,
      date: _today(),
      tuteurNom: tuteurNom,
      validee: true
    };

    // Sauvegarde
    var et = _ensurePfmpData(studentCode);
    et['pfmp' + pfmpNum] = evalObj;

    if (typeof window.saveLocal === 'function') window.saveLocal();

    if (typeof toast === 'function') {
      toast('Évaluation tuteur PFMP' + pfmpNum + ' enregistrée (' + nbEvalues + ' comp.)', 'ok');
    }
  }

  // ══════════════════════════════════════════════════════════════
  // 3. renderBilan — Vue bilan pour le prof
  // ══════════════════════════════════════════════════════════════

  function renderBilan(studentCode, container) {
    if (!container) return;
    _installDelegation();

    var s = _student(studentCode);
    var html = '';

    html += '<div style="font-weight:900;font-size:1rem;color:#2d5a8c;margin-bottom:14px">';
    html += 'Bilan évaluations tuteur — ' + (s.nom || '—') + ' ' + (s.prenom || '') + '</div>';

    [1, 2].forEach(function (pn) {
      var ev = _getEval(studentCode, pn);
      html += '<div style="background:#fff;border:1px solid #e0e0e0;border-radius:10px;padding:14px;margin-bottom:14px">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">';
      html += '<div style="font-weight:800;font-size:.9rem;color:#2d5a8c">PFMP ' + pn + '</div>';

      if (ev && ev.validee) {
        html += '<span style="background:#d4edda;color:#155724;font-size:.7rem;font-weight:700;padding:3px 10px;border-radius:20px">Validée le ' + _dateFR(ev.date) + '</span>';
      } else {
        html += '<span style="background:#f8d7da;color:#721c24;font-size:.7rem;font-weight:700;padding:3px 10px;border-radius:20px">Non renseignée</span>';
      }
      html += '</div>';

      if (!ev || !ev.validee) {
        html += '<div style="color:#999;font-size:.8rem;padding:8px 0">Aucune évaluation tuteur pour cette période.</div>';
        html += '</div>';
        return;
      }

      // Tuteur
      if (ev.tuteurNom) {
        html += '<div style="font-size:.8rem;color:#555;margin-bottom:8px">Tuteur : <strong>' + _escHtml(ev.tuteurNom) + '</strong></div>';
      }

      // Compétences
      var comps = _compsPfmp(pn);
      html += '<div style="margin-bottom:10px">';
      comps.forEach(function (comp) {
        var niv = (ev.competences && ev.competences[comp.code]) || '—';
        var obs = (ev.observations && ev.observations[comp.code]) || '';
        var col = NIV_COLORS[niv] || { bg: '#f5f5f5', txt: '#999' };

        html += '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #f5f5f5">';
        html += '<span style="font-size:.8rem;font-weight:700;color:#2d5a8c;min-width:40px">' + comp.code + '</span>';
        html += '<span style="font-size:.75rem;flex:1;color:#555">' + comp.nom + '</span>';
        html += '<span style="background:' + col.bg + ';color:' + col.txt + ';font-size:.7rem;font-weight:700;padding:2px 8px;border-radius:4px;min-width:28px;text-align:center">' + niv + '</span>';
        html += '</div>';

        if (obs) {
          html += '<div style="font-size:.7rem;font-style:italic;color:#888;padding:2px 0 4px 48px">' + _escHtml(obs) + '</div>';
        }
      });
      html += '</div>';

      // Critères globaux
      html += '<div style="margin-bottom:10px">';
      CRITERES_GLOBAUX.forEach(function (cg) {
        var val = (ev.criteres && ev.criteres[cg.id]) || 0;
        html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:3px 0">';
        html += '<span style="font-size:.8rem;color:#555">' + cg.label + '</span>';
        html += '<span style="color:#f0a500;font-size:.9rem;letter-spacing:1px">';
        for (var i = 1; i <= 5; i++) {
          html += i <= val ? '\u2605' : '\u2606';
        }
        html += '</span></div>';
      });
      html += '</div>';

      // Appréciation
      if (ev.appreciation) {
        html += '<div style="background:#f8f9fa;border-radius:8px;padding:10px;font-size:.8rem;color:#444;font-style:italic;margin-bottom:10px">';
        html += _escHtml(ev.appreciation);
        html += '</div>';
      }

      // Bouton intégrer
      html += '<div style="text-align:right">';
      html += '<button data-et="integrer" data-code="' + studentCode + '" data-pfmp="' + pn + '"';
      html += ' style="background:#2d5a8c;color:#fff;border:none;border-radius:8px;padding:8px 18px;font-size:.8rem;font-weight:700;cursor:pointer">';
      html += 'Intégrer dans la grille</button>';
      html += '</div>';

      html += '</div>';
    });

    container.innerHTML = html;
  }

  // ══════════════════════════════════════════════════════════════
  // 4. integrerDansGrille — Pousse les niveaux via pushVal()
  // ══════════════════════════════════════════════════════════════

  function integrerDansGrille(studentCode, pfmpNum) {
    var ev = _getEval(studentCode, pfmpNum);
    if (!ev || !ev.validee) {
      if (typeof toast === 'function') toast('Aucune évaluation tuteur validée pour PFMP' + pfmpNum, 'warn');
      return;
    }

    if (typeof window.pushVal !== 'function') {
      if (typeof toast === 'function') toast('Fonction pushVal non disponible', 'err');
      return;
    }

    var lieu = 'pfmp' + pfmpNum;
    var comps = ev.competences || {};
    var obs = ev.observations || {};
    var count = 0;

    Object.keys(comps).forEach(function (compCode) {
      var niv = comps[compCode];
      if (!niv || niv === 'NE') return;

      // Pousser le niveau global de la compétence
      window.pushVal({
        epreuve: 'EP2',
        competence: compCode,
        critere: '',
        niveau: niv,
        contexte: lieu,
        source: 'tuteur',
        tuteurNom: ev.tuteurNom || ''
      });

      // Pousser l'observation si présente
      if (obs[compCode]) {
        window.pushVal({
          epreuve: 'EP2',
          competence: compCode,
          critere: '__obs__',
          niveau: obs[compCode],
          contexte: lieu,
          source: 'tuteur'
        });
      }

      count++;
    });

    if (typeof toast === 'function') {
      toast(count + ' compétence(s) tuteur intégrée(s) dans la grille EP2', 'ok');
    }
  }

  // ── Utilitaires d'échappement ──

  function _escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _escAttr(str) {
    return _escHtml(str).replace(/'/g, '&#39;');
  }

  // ══════════════════════════════════════════════════════════════
  // API publique
  // ══════════════════════════════════════════════════════════════

  window.evalTuteurModule = {
    renderForm: renderForm,
    save: save,
    renderBilan: renderBilan,
    integrerDansGrille: integrerDansGrille
  };

})();
