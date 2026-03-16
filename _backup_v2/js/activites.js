/**
 * activites.js — Module activités pédagogiques (séances d'évaluation)
 * Version Fusion — UX mobile-first + évaluation inline
 *
 * Utilise la DÉLÉGATION D'ÉVÉNEMENTS (pas de onclick inline)
 * pour compatibilité maximale mobile/tablette.
 *
 * Globales : appCfg, students, COMP_EP2, COMP_EP3, CRIT2, CRIT3,
 *            NV_LBL, validations, notes, compLocks, customCriteria,
 *            curPhase, cfg, saveLocal(), toast(), pushVal(),
 *            getVal(), getLv(), getObs(), showModal(), closeModal()
 */
;(function () {
  'use strict';

  var COULEURS = {
    'EP2':   {bg:'#2d5a8c', light:'#e8f0f8'},
    'EP3-A': {bg:'#9b59b6', light:'#f3e5f5'},
    'EP3-B': {bg:'#3498db', light:'#d1ecf1'},
    'EP3-C': {bg:'#1abc9c', light:'#d4f4e2'}
  };

  var EP_LABELS = {
    'EP2':   'EP2 — Réalisation',
    'EP3-A': 'EP3-A — Mise en service',
    'EP3-B': 'EP3-B — Maintenance',
    'EP3-C': 'EP3-C — Documents'
  };

  // État interne
  var _evalState = { actId: null, studentCode: null };

  /** Retourne la phase d'un élève dans une activité (par-élève ou fallback global) */
  function _phaseEleve(act, code) {
    if (act.phasesEleves && act.phasesEleves[code]) return act.phasesEleves[code];
    return act.phase || 'formatif';
  }

  // ── Helpers ──

  function _nextId() {
    var acts = window.appCfg.activites || [];
    var max = 0;
    acts.forEach(function (a) {
      var n = parseInt(a.id.replace('ACT-', ''), 10);
      if (n > max) max = n;
    });
    return 'ACT-' + String(max + 1).padStart(3, '0');
  }

  function _dateFR(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  function _today() {
    return new Date().toISOString().split('T')[0];
  }

  function _compsForEpreuve(epr) {
    if (epr === 'EP2') return window.COMP_EP2 || [];
    var sit = epr.replace('EP3-', '');
    return (window.COMP_EP3 || []).filter(function (c) {
      return c.sits && c.sits.indexOf(sit) !== -1;
    });
  }

  function _contextForEpreuve(epr) {
    if (epr === 'EP2') return 'atelier';
    return epr.replace('EP3-', '');
  }

  function _epForPush(epr) {
    return epr.startsWith('EP3') ? 'EP3' : 'EP2';
  }

  function _studentName(code) {
    var s = (window.students || []).find(function(e){ return e.code === code; });
    if (!s) return code;
    return (s.nom || '') + ' ' + (s.prenom ? s.prenom.charAt(0) + '.' : '');
  }

  // ══════════════════════════════════════════════════════════════
  // DÉLÉGATION D'ÉVÉNEMENTS GLOBALE
  // ══════════════════════════════════════════════════════════════

  /** Installé une seule fois au chargement du module */
  function _installDelegation() {
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var action = btn.dataset.act;

      // Création
      if (action === 'pickEp')          { _pickEp(btn.dataset.ep); return; }
      if (action === 'pickPhase')       { _pickPhase(btn.dataset.ph); return; }
      if (action === 'toggleComp')      { _toggleComp(btn); return; }
      if (action === 'toggleEleve')     { _toggleEleve(btn); return; }
      if (action === 'toggleAllComps')  { _toggleAllComps(); return; }
      if (action === 'toggleAllEleves') { _toggleAllEleves(); return; }
      if (action === 'setElevePhase')   { _setElevePhase(btn); return; }
      if (action === 'allElevesPhase')  { _allElevesPhase(btn.dataset.ph); return; }
      if (action === 'submitCreate')    { _submitCreate(); return; }
      if (action === 'switchStuPhase')  { _switchStuPhase(btn); return; }

      // Liste
      if (action === 'openCard')    { _openEval(btn.dataset.id); return; }
      if (action === 'showCreate')  { showCreateModal(); return; }
      if (action === 'deleteAct')   { del(btn.dataset.id); window.closeModal(); return; }

      // Évaluation
      if (action === 'switchStudent') { _switchStudent(btn.dataset.code); return; }
      if (action === 'toggleBlock')   { _toggleBlock(btn); return; }
      if (action === 'evalCrit')      { _evalCrit(btn.dataset.stu, btn.dataset.comp, btn.dataset.crit, btn.dataset.niv, btn.dataset.epr); return; }
      if (action === 'evalGlobal')    { _evalGlobal(btn.dataset.stu, btn.dataset.comp, btn.dataset.niv, btn.dataset.epr); return; }
      if (action === 'showDetail')    { _showDetail(btn.dataset.id); return; }
      if (action === 'openEvalFromDetail') { window.closeModal(); var id = btn.dataset.id; setTimeout(function(){ _openEval(id); }, 200); return; }
    });
  }

  // ══════════════════════════════════════════════════════════════
  // RENDU LISTE
  // ══════════════════════════════════════════════════════════════

  function renderList(container) {
    var el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;

    var acts = (window.appCfg.activites || []).slice();
    acts.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });

    if (acts.length === 0) {
      el.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--gris)">'
        + '<div style="font-size:2.5rem;margin-bottom:.5rem">📋</div>'
        + '<p style="font-weight:700;margin-bottom:.25rem">Aucune activité</p>'
        + '<p style="font-size:.78rem">Créez votre première séance d\'évaluation</p></div>';
      return;
    }

    el.innerHTML = acts.map(function (act) {
      var c = COULEURS[act.epreuve] || {bg:'#555',light:'#f5f5f5'};
      var nbEleves = (act.eleves || []).length;
      var nbComps = (act.competences || []).length;

      var noms = (act.eleves || []).slice(0, 3).map(function(code) {
        return _studentName(code);
      });
      var nomsStr = noms.join(', ') + (nbEleves > 3 ? ' +' + (nbEleves - 3) : '');

      return '<div data-act="openCard" data-id="' + act.id + '" style="background:' + c.light + ';border-left:4px solid ' + c.bg
        + ';border-radius:10px;padding:.75rem 1rem;margin-bottom:.5rem;'
        + 'box-shadow:0 1px 4px rgba(0,0,0,.06);cursor:pointer">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem">'
        + '<strong style="font-size:.88rem;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'
        + (act.titre || 'Sans titre') + '</strong>'
        + '<span style="background:' + c.bg + ';color:#fff;padding:.15rem .5rem;border-radius:8px;'
        + 'font-size:.7rem;font-weight:700;white-space:nowrap">' + act.epreuve + '</span>'
        + '</div>'
        + '<div style="display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;margin-top:.4rem;font-size:.75rem;color:var(--gris)">'
        + '<span>📅 ' + _dateFR(act.date) + '</span>'
        + (function() {
          var phases = {};
          (act.eleves || []).forEach(function(code) {
            var p = (act.phasesEleves && act.phasesEleves[code]) ? act.phasesEleves[code] : act.phase;
            phases[p] = true;
          });
          var hasF = phases['formatif'], hasC = phases['certificatif'];
          if (hasF && hasC) return '<span style="background:linear-gradient(135deg,var(--bleu2),var(--orange));color:#fff;padding:.1rem .4rem;border-radius:6px;font-size:.65rem;font-weight:700">📘📙 Mixte</span>';
          if (hasC) return '<span style="background:var(--orange);color:#fff;padding:.1rem .4rem;border-radius:6px;font-size:.65rem;font-weight:700">📙 Certif.</span>';
          return '<span style="background:var(--bleu2);color:#fff;padding:.1rem .4rem;border-radius:6px;font-size:.65rem;font-weight:700">📘 Format.</span>';
        })()
        + '<span>👥 ' + nbEleves + '</span>'
        + '<span>🎯 ' + nbComps + ' comp.</span>'
        + '</div>'
        + (nomsStr ? '<div style="margin-top:.3rem;font-size:.72rem;color:#666">' + nomsStr + '</div>' : '')
        + '</div>';
    }).join('');
  }

  // ══════════════════════════════════════════════════════════════
  // ÉVALUATION INLINE
  // ══════════════════════════════════════════════════════════════

  function _openEval(id) {
    var act = (window.appCfg.activites || []).find(function(a){ return a.id === id; });
    if (!act) return;
    if (!(act.eleves || []).length) { _showDetail(id); return; }

    _evalState.actId = id;
    _evalState.studentCode = act.eleves[0];

    var c = COULEURS[act.epreuve] || {bg:'#555',light:'#f5f5f5'};

    var body = '<div id="actEvalRoot" style="font-size:.85rem">';

    // En-tête
    body += '<div style="display:flex;gap:.3rem;flex-wrap:wrap;margin-bottom:.6rem">';
    body += '<span style="background:' + c.bg + ';color:#fff;padding:.15rem .5rem;border-radius:8px;font-weight:700;font-size:.72rem">'
      + act.epreuve + '</span>';
    body += '<span style="background:' + (act.phase === 'certificatif' ? 'var(--orange)' : 'var(--bleu2)')
      + ';color:#fff;padding:.15rem .5rem;border-radius:8px;font-weight:700;font-size:.72rem">'
      + (act.phase === 'certificatif' ? 'Certif.' : 'Format.') + '</span>';
    body += '<span style="background:var(--gris3);padding:.15rem .5rem;border-radius:8px;font-size:.72rem">'
      + _dateFR(act.date) + '</span>';
    body += '</div>';

    // Onglets élèves avec badge phase
    body += '<div id="actEvalTabs" style="display:flex;gap:.3rem;overflow-x:auto;padding-bottom:.4rem;margin-bottom:.6rem;'
      + '-webkit-overflow-scrolling:touch">';
    (act.eleves || []).forEach(function(code, i) {
      var isActive = (i === 0);
      var ePh = _phaseEleve(act, code);
      var phBadge = (ePh === 'certificatif') ? '📙' : '📘';
      body += '<button type="button" data-act="switchStudent" data-code="' + code + '" '
        + 'class="actStuTab" style="flex-shrink:0;padding:.4rem .7rem;border:2px solid ' + c.bg + ';'
        + 'background:' + (isActive ? c.bg : '#fff') + ';color:' + (isActive ? '#fff' : c.bg) + ';'
        + 'border-radius:8px;font-size:.78rem;font-weight:700;cursor:pointer;white-space:nowrap">'
        + phBadge + ' ' + _studentName(code) + '</button>';
    });
    body += '</div>';

    // Zone évaluation
    body += '<div id="actEvalZone"></div>';
    body += '</div>';

    var actions = '<div style="display:flex;gap:.4rem">'
      + '<button data-act="showDetail" data-id="' + act.id + '" type="button" style="flex:1;padding:.5rem;border:1px solid var(--gris3);'
      + 'background:#fff;border-radius:8px;font-size:.8rem;font-weight:600;cursor:pointer">ℹ️ Détails</button>'
      + '<button type="button" style="flex:1;padding:.5rem;border:none;background:var(--bleu2);color:#fff;'
      + 'border-radius:8px;font-size:.8rem;font-weight:700;cursor:pointer" onclick="closeModal()">✅ Terminé</button>'
      + '</div>';

    window.showModal('📋 ' + (act.titre || 'Activité'), body, actions);
    _renderEvalFor(act, act.eleves[0]);
  }

  function _switchStudent(code) {
    _evalState.studentCode = code;
    var act = (window.appCfg.activites || []).find(function(a){ return a.id === _evalState.actId; });
    if (!act) return;
    var c = COULEURS[act.epreuve] || {bg:'#555'};

    document.querySelectorAll('.actStuTab').forEach(function(btn) {
      var isActive = btn.dataset.code === code;
      btn.style.background = isActive ? c.bg : '#fff';
      btn.style.color = isActive ? '#fff' : c.bg;
    });

    _renderEvalFor(act, code);
  }

  function _renderEvalFor(act, studentCode) {
    var zone = document.getElementById('actEvalZone');
    if (!zone) return;

    var ep = _epForPush(act.epreuve);
    var ctx = _contextForEpreuve(act.epreuve);
    var c = COULEURS[act.epreuve] || {bg:'#555',light:'#f5f5f5'};
    var allComps = (ep === 'EP2') ? (window.COMP_EP2 || []) : (window.COMP_EP3 || []);
    var critsRef = (ep === 'EP2') ? window.CRIT2 : window.CRIT3;

    var ePh = _phaseEleve(act, studentCode);
    var isF = (ePh === 'formatif');

    // Barre phase pour cet élève
    var html = '<div style="display:flex;align-items:center;gap:.4rem;margin-bottom:.6rem;padding:.4rem .6rem;'
      + 'background:' + (isF ? '#e8f0f8' : '#fff3e0') + ';border-radius:8px;border:1px solid ' + (isF ? '#2196F366' : '#FF980066') + '">';
    html += '<span style="font-size:.75rem;font-weight:600;flex:1">' + _studentName(studentCode) + ' — '
      + (isF ? '📘 Formatif' : '📙 Certificatif') + '</span>';
    html += '<button type="button" data-act="switchStuPhase" data-code="' + studentCode + '" data-id="' + act.id + '" '
      + 'style="padding:.2rem .5rem;border:2px solid ' + (isF ? 'var(--orange)' : 'var(--bleu2)') + ';'
      + 'background:#fff;color:' + (isF ? 'var(--orange)' : 'var(--bleu2)') + ';border-radius:6px;'
      + 'font-size:.65rem;font-weight:700;cursor:pointer;-webkit-tap-highlight-color:rgba(0,0,0,.1)">'
      + (isF ? '→ Certif.' : '→ Format.') + '</button>';
    html += '</div>';

    (act.competences || []).forEach(function(compCode) {
      var comp = allComps.find(function(x){ return x.code === compCode; });
      if (!comp) return;

      var lv = window.getLv(studentCode, ep, compCode);
      var lvDisplay = lv || 'NE';
      var lvcls = 'lv-' + (lv ? lv.toLowerCase().replace('-', '-') : 'ne');

      var crits = (critsRef && critsRef[compCode]) ? (critsRef[compCode][ctx] || []) : [];
      var customCrits = (window.customCriteria && window.customCriteria[studentCode])
        ? ((window.customCriteria[studentCode][ep] || {})[compCode] || []) : [];
      var allCrits = crits.concat(customCrits);

      var startOpen = (act.competences || []).length <= 2;

      // Bloc compétence
      html += '<div style="margin-bottom:.5rem;border:1px solid ' + c.bg + '33;border-radius:10px;overflow:hidden">';

      // En-tête
      html += '<div data-act="toggleBlock" style="display:flex;align-items:center;gap:.4rem;padding:.5rem .7rem;'
        + 'background:' + c.light + ';cursor:pointer;-webkit-tap-highlight-color:rgba(0,0,0,.1)">';
      html += '<span style="font-weight:800;color:' + c.bg + ';font-size:.82rem">' + compCode + '</span>';
      html += '<span style="flex:1;font-size:.78rem;color:#333">' + comp.nom + '</span>';
      html += '<span class="badge ' + lvcls + '" style="font-size:.7rem;font-weight:700;padding:.15rem .4rem;border-radius:6px">' + lvDisplay + '</span>';
      html += '<span class="actArrow" style="font-size:.7rem">' + (startOpen ? '▲' : '▼') + '</span>';
      html += '</div>';

      // Corps
      html += '<div class="actEvalBody" style="padding:.5rem .7rem;display:' + (startOpen ? 'block' : 'none') + '">';
      html += '<div style="font-size:.72rem;color:var(--gris);margin-bottom:.4rem;font-style:italic">' + comp.full + '</div>';

      // Critères
      if (allCrits.length) {
        html += '<div style="margin-bottom:.5rem">';
        allCrits.forEach(function(cr) {
          var cv = window.getVal(studentCode, ep, compCode, cr);
          html += '<div style="display:flex;align-items:center;gap:.3rem;margin-bottom:.3rem;flex-wrap:wrap">';
          html += '<span style="flex:1;min-width:100px;font-size:.72rem;color:#444">' + cr + '</span>';
          html += '<div style="display:flex;gap:.15rem">';
          ['NE','NA','EC','M','PM'].forEach(function(n) {
            var sel = (cv === n);
            html += '<button type="button" data-act="evalCrit" '
              + 'data-stu="' + studentCode + '" data-comp="' + compCode + '" '
              + 'data-crit="' + encodeURIComponent(cr) + '" data-niv="' + n + '" '
              + 'data-epr="' + act.epreuve + '" '
              + 'style="padding:.2rem .35rem;border:1.5px solid;border-radius:5px;font-size:.65rem;font-weight:700;'
              + 'min-width:28px;cursor:pointer;-webkit-tap-highlight-color:rgba(0,0,0,.1);'
              + _btnStyle(n, sel) + '">'
              + n + '</button>';
          });
          html += '</div></div>';
        });
        html += '</div>';
      }

      // Niveau global
      html += '<div style="display:flex;align-items:center;gap:.3rem;flex-wrap:wrap;padding:.4rem 0;border-top:1px solid #eee">';
      html += '<span style="font-weight:700;font-size:.75rem;margin-right:.3rem">Niveau global :</span>';
      ['NE','NA','EC','M','PM'].forEach(function(n) {
        var sel = (lv === n);
        html += '<button type="button" data-act="evalGlobal" '
          + 'data-stu="' + studentCode + '" data-comp="' + compCode + '" '
          + 'data-niv="' + n + '" data-epr="' + act.epreuve + '" '
          + 'style="padding:.25rem .45rem;border:2px solid;border-radius:6px;font-size:.72rem;font-weight:800;'
          + 'min-width:32px;cursor:pointer;-webkit-tap-highlight-color:rgba(0,0,0,.1);'
          + _btnStyle(n, sel) + '">'
          + n + '</button>';
      });
      html += '</div>';

      // Observation
      var obs = window.getObs(studentCode, ep, compCode);
      html += '<textarea data-obsstu="' + studentCode + '" data-obscomp="' + compCode + '" data-obsepr="' + act.epreuve + '" '
        + 'placeholder="Observation ' + compCode + '..." rows="1" '
        + 'style="width:100%;margin-top:.3rem;padding:.3rem .5rem;border:1px solid #ddd;border-radius:6px;font-size:.72rem;'
        + 'resize:vertical;box-sizing:border-box">' + (obs || '') + '</textarea>';

      // Zone photos (chargée de manière asynchrone)
      html += '<div class="photoZone" data-pz-stu="' + studentCode + '" data-pz-act="' + act.id
        + '" data-pz-comp="' + compCode + '" data-pz-epr="' + act.epreuve + '">'
        + '<div style="font-size:.68rem;color:#aaa;padding:.2rem 0">📷 Chargement...</div></div>';

      html += '</div>'; // fin body
      html += '</div>'; // fin bloc
    });

    if (!html) {
      html = '<div style="text-align:center;padding:1rem;color:var(--gris)">Aucune compétence sélectionnée</div>';
    }

    zone.innerHTML = html;

    // Écouter les blur sur les textareas d'observation
    zone.querySelectorAll('textarea[data-obsstu]').forEach(function(ta) {
      ta.addEventListener('blur', function() {
        _saveObs(ta.dataset.obsstu, ta.dataset.obscomp, ta.dataset.obsepr, ta.value);
      });
    });

    // Charger les photos de manière asynchrone dans chaque zone
    _loadPhotosInZones(act, studentCode);
  }

  /** Charge les photos dans les zones .photoZone */
  function _loadPhotosInZones(act, studentCode) {
    if (!window.photosModule) return;
    var zones = document.querySelectorAll('.photoZone');
    zones.forEach(function(pz) {
      var stu = pz.dataset.pzStu;
      var actId = pz.dataset.pzAct;
      var comp = pz.dataset.pzComp;
      var epr = pz.dataset.pzEpr;
      if (stu !== studentCode) return;
      window.photosModule.getPhotos(stu, actId, comp).then(function(photos) {
        pz.innerHTML = window.photosModule.renderPhotoBlock(stu, actId, comp, epr, photos);
      });
    });

    // Callback pour rafraîchir après ajout/suppression de photo
    window._photoRefreshCallback = function() {
      _loadPhotosInZones(act, studentCode);
    };
  }

  function _btnStyle(niv, selected) {
    var colors = {
      'NE':  {bg:'#e0e0e0', fg:'#888', border:'#ccc'},
      'NA':  {bg:'#ffebee', fg:'#c62828', border:'#ef5350'},
      'EC':  {bg:'#fff3e0', fg:'#e65100', border:'#ff9800'},
      'M':   {bg:'#e8f5e9', fg:'#2e7d32', border:'#4caf50'},
      'PM':  {bg:'#e3f2fd', fg:'#1565c0', border:'#42a5f5'}
    };
    var c = colors[niv] || colors['NE'];
    if (selected) {
      return 'background:' + c.border + ';color:#fff;border-color:' + c.border + ';box-shadow:0 1px 4px rgba(0,0,0,.2);';
    }
    return 'background:' + c.bg + ';color:' + c.fg + ';border-color:' + c.border + '88;';
  }

  function _toggleBlock(hdr) {
    var body = hdr.nextElementSibling;
    if (!body) return;
    var arrow = hdr.querySelector('.actArrow');
    if (body.style.display === 'none') {
      body.style.display = 'block';
      if (arrow) arrow.textContent = '▲';
    } else {
      body.style.display = 'none';
      if (arrow) arrow.textContent = '▼';
    }
  }

  // ══════════════════════════════════════════════════════════════
  // ACTIONS D'ÉVALUATION
  // ══════════════════════════════════════════════════════════════

  /** Bascule la phase d'un élève dans une activité (depuis l'évaluation) */
  function _switchStuPhase(btn) {
    var code = btn.dataset.code;
    var id = btn.dataset.id;
    var act = (window.appCfg.activites || []).find(function(a){ return a.id === id; });
    if (!act) return;
    if (!act.phasesEleves) act.phasesEleves = {};
    var cur = _phaseEleve(act, code);
    act.phasesEleves[code] = (cur === 'formatif') ? 'certificatif' : 'formatif';
    if (typeof window.saveLocal === 'function') window.saveLocal();
    // Rafraîchir les onglets élèves
    var c = COULEURS[act.epreuve] || {bg:'#555'};
    document.querySelectorAll('.actStuTab').forEach(function(tab) {
      var tCode = tab.dataset.code;
      var tPh = _phaseEleve(act, tCode);
      var tBadge = (tPh === 'certificatif') ? '📙' : '📘';
      var isActive = (tCode === _evalState.studentCode);
      tab.innerHTML = tBadge + ' ' + _studentName(tCode);
      tab.style.background = isActive ? c.bg : '#fff';
      tab.style.color = isActive ? '#fff' : c.bg;
    });
    _renderEvalFor(act, code);
  }

  async function _evalCrit(studentCode, compCode, critEnc, niv, epreuve) {
    var ep = _epForPush(epreuve);
    var ctx = _contextForEpreuve(epreuve);
    var crit = decodeURIComponent(critEnc);

    var currentVal = window.getVal(studentCode, ep, compCode, crit);
    var newNiv = (currentVal === niv) ? 'NE' : niv;

    var savedCur = window.cur;
    var savedPhase = window.curPhase;
    var savedCtx = window.curCtx;
    var savedSit = window.curSit;

    window.cur = studentCode;
    var act = (window.appCfg.activites || []).find(function(a){ return a.id === _evalState.actId; });
    if (act) window.curPhase = _phaseEleve(act, studentCode);
    if (ep === 'EP2') window.curCtx = ctx; else window.curSit = ctx;

    await window.pushVal({
      epreuve: ep, competence: compCode, critere: crit, niveau: newNiv, contexte: ctx
    });

    window.cur = savedCur;
    window.curPhase = savedPhase;
    window.curCtx = savedCtx;
    window.curSit = savedSit;

    if (act) _renderEvalFor(act, studentCode);
  }

  async function _evalGlobal(studentCode, compCode, niv, epreuve) {
    var ep = _epForPush(epreuve);
    var ctx = _contextForEpreuve(epreuve);

    var currentLv = window.getLv(studentCode, ep, compCode);
    var newNiv = (currentLv === niv) ? 'NE' : niv;

    var savedCur = window.cur;
    var savedPhase = window.curPhase;
    var savedCtx = window.curCtx;
    var savedSit = window.curSit;

    window.cur = studentCode;
    var act = (window.appCfg.activites || []).find(function(a){ return a.id === _evalState.actId; });
    if (act) window.curPhase = _phaseEleve(act, studentCode);
    if (ep === 'EP2') window.curCtx = ctx; else window.curSit = ctx;

    await window.pushVal({
      epreuve: ep, competence: compCode, critere: '', niveau: newNiv, contexte: ctx
    });

    window.cur = savedCur;
    window.curPhase = savedPhase;
    window.curCtx = savedCtx;
    window.curSit = savedSit;

    if (act) _renderEvalFor(act, studentCode);
  }

  async function _saveObs(studentCode, compCode, epreuve, txt) {
    if (!txt || !txt.trim()) return;
    var ep = _epForPush(epreuve);
    var savedCur = window.cur;
    window.cur = studentCode;
    await window.pushVal({
      epreuve: ep, competence: compCode, critere: '__obs__', niveau: txt, contexte: ''
    });
    window.cur = savedCur;
  }

  // ══════════════════════════════════════════════════════════════
  // DÉTAIL (info seule)
  // ══════════════════════════════════════════════════════════════

  function _showDetail(id) {
    var act = (window.appCfg.activites || []).find(function(a){ return a.id === id; });
    if (!act) return;
    var c = COULEURS[act.epreuve] || {bg:'#555',light:'#f5f5f5'};

    var body = '<div style="font-size:.85rem">';
    body += '<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.75rem">';
    body += '<span style="background:' + c.bg + ';color:#fff;padding:.2rem .6rem;border-radius:8px;font-weight:700;font-size:.78rem">'
      + (EP_LABELS[act.epreuve] || act.epreuve) + '</span>';
    body += '<span style="background:' + (act.phase === 'certificatif' ? 'var(--orange)' : 'var(--bleu2)')
      + ';color:#fff;padding:.2rem .6rem;border-radius:8px;font-weight:700;font-size:.78rem">'
      + (act.phase === 'certificatif' ? '📙 Certificatif' : '📘 Formatif') + '</span>';
    body += '<span style="background:var(--gris3);padding:.2rem .6rem;border-radius:8px;font-size:.78rem">📅 '
      + _dateFR(act.date) + '</span>';
    body += '</div>';

    body += '<div style="font-weight:700;margin-bottom:.3rem">🎯 Compétences ciblées</div>';
    body += '<div style="display:flex;flex-wrap:wrap;gap:.3rem;margin-bottom:.75rem">';
    (act.competences || []).forEach(function(code) {
      var comp = (window.COMP_EP2 || []).concat(window.COMP_EP3 || []).find(function(x){ return x.code === code; });
      body += '<span style="background:' + c.light + ';border:1px solid ' + c.bg + '44;color:' + c.bg
        + ';padding:.2rem .5rem;border-radius:8px;font-size:.75rem;font-weight:600">'
        + code + (comp ? ' ' + comp.nom : '') + '</span>';
    });
    body += '</div>';

    body += '<div style="font-weight:700;margin-bottom:.3rem">👥 Élèves (' + (act.eleves||[]).length + ')</div>';
    body += '<div style="display:flex;flex-wrap:wrap;gap:.3rem;margin-bottom:.75rem">';
    (act.eleves || []).forEach(function(code) {
      var s = (window.students || []).find(function(e){ return e.code === code; });
      var ePh = _phaseEleve(act, code);
      var phIcon = (ePh === 'certificatif') ? '📙' : '📘';
      var phBg = (ePh === 'certificatif') ? '#fff3e0' : '#e8f0f8';
      var phBorder = (ePh === 'certificatif') ? '#FF980066' : '#2196F366';
      body += '<span style="background:' + phBg + ';border:1px solid ' + phBorder + ';padding:.2rem .5rem;border-radius:8px;font-size:.75rem">'
        + phIcon + ' ' + (s ? s.nom + ' ' + (s.prenom || '') : code) + '</span>';
    });
    if (!(act.eleves||[]).length) body += '<span style="color:#888;font-size:.78rem">Aucun élève</span>';
    body += '</div>';

    if (act.evaluateur) {
      body += '<div style="font-size:.78rem;color:var(--gris)">✏️ Évaluateur : ' + act.evaluateur + '</div>';
    }
    body += '</div>';

    var actions = '<div style="display:flex;gap:.4rem">'
      + '<button data-act="deleteAct" data-id="' + act.id + '" type="button" '
      + 'style="flex:1;padding:.5rem;border:none;background:var(--rouge);color:#fff;border-radius:8px;'
      + 'font-size:.8rem;font-weight:700;cursor:pointer">🗑️ Supprimer</button>';
    if ((act.eleves||[]).length) {
      actions += '<button data-act="openEvalFromDetail" data-id="' + act.id + '" type="button" '
        + 'style="flex:1;padding:.5rem;border:none;background:var(--bleu2);color:#fff;border-radius:8px;'
        + 'font-size:.8rem;font-weight:700;cursor:pointer">📝 Évaluer</button>';
    }
    actions += '</div>';

    window.showModal('📋 ' + (act.titre || 'Activité'), body, actions);
  }

  // ══════════════════════════════════════════════════════════════
  // CRÉATION
  // ══════════════════════════════════════════════════════════════

  function showCreateModal() {
    var sts = window.students || [];

    var body = '<div style="font-size:.85rem">';

    // Épreuve
    body += '<div style="font-weight:700;margin-bottom:.4rem">Épreuve</div>';
    body += '<div id="actEprBtns" style="display:grid;grid-template-columns:1fr 1fr;gap:.4rem;margin-bottom:.75rem">';
    ['EP2','EP3-A','EP3-B','EP3-C'].forEach(function(ep) {
      var c = COULEURS[ep];
      body += '<button type="button" data-act="pickEp" data-ep="' + ep + '" '
        + 'style="padding:.6rem;border:2px solid ' + c.bg + ';background:' + c.light + ';color:' + c.bg
        + ';border-radius:10px;font-weight:700;font-size:.82rem;cursor:pointer;'
        + '-webkit-tap-highlight-color:rgba(0,0,0,.1)" class="actEprBtn">'
        + ep + '</button>';
    });
    body += '</div>';

    // Phase par défaut
    body += '<div style="font-weight:700;margin-bottom:.4rem">Phase par défaut</div>';
    body += '<div id="actPhaseBtns" style="display:grid;grid-template-columns:1fr 1fr;gap:.4rem;margin-bottom:.75rem">';
    body += '<button type="button" data-act="pickPhase" data-ph="formatif" class="actPhBtn" '
      + 'style="padding:.5rem;border:2px solid var(--bleu2);background:var(--bleu3);color:var(--bleu2);'
      + 'border-radius:10px;font-weight:700;font-size:.82rem;cursor:pointer;'
      + '-webkit-tap-highlight-color:rgba(0,0,0,.1)">'
      + '📘 Formatif</button>';
    body += '<button type="button" data-act="pickPhase" data-ph="certificatif" class="actPhBtn" '
      + 'style="padding:.5rem;border:2px solid var(--orange);background:var(--orange2);color:var(--orange);'
      + 'border-radius:10px;font-weight:700;font-size:.82rem;cursor:pointer;'
      + '-webkit-tap-highlight-color:rgba(0,0,0,.1)">'
      + '📙 Certificatif</button>';
    body += '</div>';

    // Titre
    body += '<div style="margin-bottom:.75rem">';
    body += '<div style="font-weight:700;margin-bottom:.3rem">Titre de la séance</div>';
    body += '<input id="actTitre" type="text" placeholder="Ex : Brasage atelier S12" '
      + 'style="width:100%;padding:.5rem .75rem;border:2px solid var(--gris3);border-radius:10px;font-size:.85rem;box-sizing:border-box">';
    body += '</div>';

    // Date
    body += '<div style="margin-bottom:.75rem">';
    body += '<div style="font-weight:700;margin-bottom:.3rem">Date</div>';
    body += '<input id="actDate" type="date" value="' + _today() + '" '
      + 'style="padding:.5rem .75rem;border:2px solid var(--gris3);border-radius:10px;font-size:.85rem">';
    body += '</div>';

    // Compétences
    body += '<div style="margin-bottom:.75rem">';
    body += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.3rem">'
      + '<span style="font-weight:700">🎯 Compétences</span>'
      + '<button type="button" data-act="toggleAllComps" '
      + 'style="background:none;border:1px solid var(--gris3);border-radius:6px;padding:.2rem .5rem;font-size:.7rem;cursor:pointer;'
      + '-webkit-tap-highlight-color:rgba(0,0,0,.1)">Tout cocher</button>'
      + '</div>';
    body += '<div id="actCompsZone" style="display:flex;flex-wrap:wrap;gap:.3rem"></div>';
    body += '</div>';

    // Élèves
    body += '<div style="margin-bottom:.5rem">';
    body += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.3rem">'
      + '<span style="font-weight:700">👥 Élèves <span id="actElvCount" style="font-weight:400;color:var(--gris);font-size:.78rem">(0/' + sts.length + ')</span></span>'
      + '<button type="button" data-act="toggleAllEleves" '
      + 'style="background:none;border:1px solid var(--gris3);border-radius:6px;padding:.2rem .5rem;font-size:.7rem;cursor:pointer;'
      + '-webkit-tap-highlight-color:rgba(0,0,0,.1)">Tout cocher</button>'
      + '</div>';
    body += '<div id="actElevesZone" style="display:flex;flex-wrap:wrap;gap:.3rem">';
    if (sts.length) {
      sts.forEach(function (s) {
        body += '<button type="button" data-act="toggleEleve" data-code="' + s.code + '" class="actElvBtn" '
          + 'style="padding:.35rem .6rem;border:2px solid var(--gris3);background:#fff;border-radius:8px;'
          + 'font-size:.78rem;cursor:pointer;font-weight:600;'
          + '-webkit-tap-highlight-color:rgba(0,0,0,.1)">'
          + (s.nom || '') + ' ' + (s.prenom ? s.prenom.charAt(0) + '.' : '') + '</button>';
      });
    } else {
      body += '<span style="color:var(--rouge);font-size:.78rem;font-weight:600">⚠️ Synchronisez d\'abord vos élèves (onglet Élèves)</span>';
    }
    body += '</div></div>';

    // Zone dispatch phases par élève (apparaît quand des élèves sont sélectionnés)
    body += '<div id="actDispatchZone" style="margin-bottom:.75rem;display:none">';
    body += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem;flex-wrap:wrap;gap:.3rem">'
      + '<span style="font-weight:700;font-size:.85rem">📋 Phase par élève</span>'
      + '<div style="display:flex;gap:.3rem">'
      + '<button type="button" data-act="allElevesPhase" data-ph="formatif" '
      + 'style="padding:.25rem .5rem;border:2px solid var(--bleu2);background:var(--bleu3);color:var(--bleu2);'
      + 'border-radius:6px;font-size:.68rem;font-weight:700;cursor:pointer;'
      + '-webkit-tap-highlight-color:rgba(0,0,0,.1)">📘 Tous formatif</button>'
      + '<button type="button" data-act="allElevesPhase" data-ph="certificatif" '
      + 'style="padding:.25rem .5rem;border:2px solid var(--orange);background:var(--orange2);color:var(--orange);'
      + 'border-radius:6px;font-size:.68rem;font-weight:700;cursor:pointer;'
      + '-webkit-tap-highlight-color:rgba(0,0,0,.1)">📙 Tous certif.</button>'
      + '</div></div>';
    body += '<div id="actDispatchList"></div>';
    body += '</div>';

    body += '</div>';

    var actions = '<button type="button" data-act="submitCreate" '
      + 'style="width:100%;padding:.7rem;border:none;background:var(--bleu2);color:#fff;border-radius:10px;'
      + 'font-size:.9rem;font-weight:700;cursor:pointer;-webkit-tap-highlight-color:rgba(0,0,0,.1)">✅ Créer l\'activité</button>';

    window.showModal('📋 Nouvelle activité', body, actions);

    window._actState = { ep: 'EP2', phase: window.curPhase || 'formatif', comps: [], eleves: [], phasesEleves: {} };
    _pickEp('EP2');
    _pickPhase(window._actState.phase);
  }

  // ── Interactions création ──

  function _pickEp(ep) {
    window._actState.ep = ep;
    window._actState.comps = [];
    document.querySelectorAll('.actEprBtn').forEach(function(btn) {
      var isActive = btn.dataset.ep === ep;
      var c = COULEURS[btn.dataset.ep];
      btn.style.background = isActive ? c.bg : c.light;
      btn.style.color = isActive ? '#fff' : c.bg;
    });
    var zone = document.getElementById('actCompsZone');
    if (!zone) return;
    var comps = _compsForEpreuve(ep);
    var c = COULEURS[ep];
    zone.innerHTML = comps.map(function(comp) {
      return '<button type="button" data-act="toggleComp" data-code="' + comp.code + '" class="actCompBtn" '
        + 'style="padding:.35rem .6rem;border:2px solid ' + c.bg + '44;background:#fff;border-radius:8px;'
        + 'font-size:.78rem;cursor:pointer;font-weight:600;color:' + c.bg + ';'
        + '-webkit-tap-highlight-color:rgba(0,0,0,.1)">'
        + comp.code + ' ' + comp.nom + '</button>';
    }).join('');
  }

  function _pickPhase(ph) {
    window._actState.phase = ph;
    document.querySelectorAll('.actPhBtn').forEach(function(btn) {
      var isActive = btn.dataset.ph === ph;
      if (btn.dataset.ph === 'formatif') {
        btn.style.background = isActive ? 'var(--bleu2)' : 'var(--bleu3)';
        btn.style.color = isActive ? '#fff' : 'var(--bleu2)';
      } else {
        btn.style.background = isActive ? 'var(--orange)' : 'var(--orange2)';
        btn.style.color = isActive ? '#fff' : 'var(--orange)';
      }
    });
    // Mettre à jour les élèves qui n'ont pas encore de phase individuelle
    if (window._actState.phasesEleves) {
      (window._actState.eleves || []).forEach(function(code) {
        window._actState.phasesEleves[code] = ph;
      });
      _renderDispatch();
    }
  }

  function _toggleComp(btn) {
    var code = btn.dataset.code;
    var c = COULEURS[window._actState.ep];
    var idx = window._actState.comps.indexOf(code);
    if (idx === -1) {
      window._actState.comps.push(code);
      btn.style.background = c.bg;
      btn.style.color = '#fff';
      btn.style.borderColor = c.bg;
    } else {
      window._actState.comps.splice(idx, 1);
      btn.style.background = '#fff';
      btn.style.color = c.bg;
      btn.style.borderColor = c.bg + '44';
    }
  }

  function _toggleEleve(btn) {
    var code = btn.dataset.code;
    var idx = window._actState.eleves.indexOf(code);
    if (idx === -1) {
      window._actState.eleves.push(code);
      // Phase par défaut pour cet élève
      if (!window._actState.phasesEleves) window._actState.phasesEleves = {};
      window._actState.phasesEleves[code] = window._actState.phase;
      btn.style.background = 'var(--bleu2)';
      btn.style.color = '#fff';
      btn.style.borderColor = 'var(--bleu2)';
    } else {
      window._actState.eleves.splice(idx, 1);
      if (window._actState.phasesEleves) delete window._actState.phasesEleves[code];
      btn.style.background = '#fff';
      btn.style.color = 'inherit';
      btn.style.borderColor = 'var(--gris3)';
    }
    var cnt = document.getElementById('actElvCount');
    if (cnt) cnt.textContent = '(' + window._actState.eleves.length + '/' + (window.students||[]).length + ')';
    _renderDispatch();
  }

  function _toggleAllComps() {
    var btns = document.querySelectorAll('.actCompBtn');
    var allSelected = window._actState.comps.length === btns.length;
    var c = COULEURS[window._actState.ep];
    if (allSelected) {
      window._actState.comps = [];
      btns.forEach(function(btn) {
        btn.style.background = '#fff';
        btn.style.color = c.bg;
        btn.style.borderColor = c.bg + '44';
      });
    } else {
      window._actState.comps = [];
      btns.forEach(function(btn) {
        window._actState.comps.push(btn.dataset.code);
        btn.style.background = c.bg;
        btn.style.color = '#fff';
        btn.style.borderColor = c.bg;
      });
    }
  }

  function _toggleAllEleves() {
    var btns = document.querySelectorAll('.actElvBtn');
    var allSelected = window._actState.eleves.length === btns.length;
    if (!window._actState.phasesEleves) window._actState.phasesEleves = {};
    if (allSelected) {
      window._actState.eleves = [];
      window._actState.phasesEleves = {};
      btns.forEach(function(btn) {
        btn.style.background = '#fff';
        btn.style.color = 'inherit';
        btn.style.borderColor = 'var(--gris3)';
      });
    } else {
      window._actState.eleves = [];
      btns.forEach(function(btn) {
        var code = btn.dataset.code;
        window._actState.eleves.push(code);
        window._actState.phasesEleves[code] = window._actState.phase;
        btn.style.background = 'var(--bleu2)';
        btn.style.color = '#fff';
        btn.style.borderColor = 'var(--bleu2)';
      });
    }
    var cnt = document.getElementById('actElvCount');
    if (cnt) cnt.textContent = '(' + window._actState.eleves.length + '/' + (window.students||[]).length + ')';
    _renderDispatch();
  }

  /** Affiche la zone de dispatch (phase par élève) */
  function _renderDispatch() {
    var zone = document.getElementById('actDispatchZone');
    var list = document.getElementById('actDispatchList');
    if (!zone || !list) return;

    var eleves = window._actState.eleves || [];
    if (!eleves.length) {
      zone.style.display = 'none';
      return;
    }
    zone.style.display = 'block';

    if (!window._actState.phasesEleves) window._actState.phasesEleves = {};

    var html = '';
    eleves.forEach(function(code) {
      var ph = window._actState.phasesEleves[code] || window._actState.phase;
      var isF = (ph === 'formatif');
      html += '<div style="display:flex;align-items:center;gap:.4rem;padding:.35rem .5rem;margin-bottom:.25rem;'
        + 'background:' + (isF ? '#e8f0f8' : '#fff3e0') + ';border-radius:8px;border:1px solid ' + (isF ? '#2196F388' : '#FF980088') + '">';
      html += '<span style="flex:1;font-size:.78rem;font-weight:600">' + _studentName(code) + '</span>';
      html += '<button type="button" data-act="setElevePhase" data-code="' + code + '" data-ph="formatif" '
        + 'style="padding:.2rem .45rem;border:2px solid var(--bleu2);border-radius:6px;font-size:.65rem;font-weight:700;cursor:pointer;'
        + 'background:' + (isF ? 'var(--bleu2)' : '#fff') + ';color:' + (isF ? '#fff' : 'var(--bleu2)') + ';'
        + '-webkit-tap-highlight-color:rgba(0,0,0,.1)">📘 F</button>';
      html += '<button type="button" data-act="setElevePhase" data-code="' + code + '" data-ph="certificatif" '
        + 'style="padding:.2rem .45rem;border:2px solid var(--orange);border-radius:6px;font-size:.65rem;font-weight:700;cursor:pointer;'
        + 'background:' + (isF ? '#fff' : 'var(--orange)') + ';color:' + (isF ? 'var(--orange)' : '#fff') + ';'
        + '-webkit-tap-highlight-color:rgba(0,0,0,.1)">📙 C</button>';
      html += '</div>';
    });
    list.innerHTML = html;
  }

  /** Change la phase d'un élève individuel */
  function _setElevePhase(btn) {
    var code = btn.dataset.code;
    var ph = btn.dataset.ph;
    if (!window._actState.phasesEleves) window._actState.phasesEleves = {};
    window._actState.phasesEleves[code] = ph;
    _renderDispatch();
  }

  /** Met tous les élèves sélectionnés sur la même phase */
  function _allElevesPhase(ph) {
    if (!window._actState.phasesEleves) window._actState.phasesEleves = {};
    (window._actState.eleves || []).forEach(function(code) {
      window._actState.phasesEleves[code] = ph;
    });
    _renderDispatch();
  }

  function _submitCreate() {
    var titre = (document.getElementById('actTitre').value || '').trim();
    var date = document.getElementById('actDate').value || _today();
    var st = window._actState;

    if (!titre) { window.toast('Saisissez un titre', 'err'); return; }
    if (!st.comps.length) { window.toast('Sélectionnez au moins une compétence', 'err'); return; }

    var act = create({
      titre: titre, date: date, epreuve: st.ep,
      competences: st.comps, evaluateur: (window.cfg && window.cfg.nomProf) || '',
      phase: st.phase, eleves: st.eleves,
      phasesEleves: st.phasesEleves || {},
      obs: ''
    });

    window.closeModal();
    var el = document.getElementById('activitesList');
    if (el) renderList(el);

    if (act && (st.eleves || []).length) {
      setTimeout(function() { _openEval(act.id); }, 300);
    }
  }

  // ── CRUD ──

  function init() {
    if (!window.appCfg) window.appCfg = {};
    if (!Array.isArray(window.appCfg.activites)) window.appCfg.activites = [];
  }

  function create(data) {
    init();
    var act = {
      id: _nextId(), titre: data.titre || '', date: data.date || _today(),
      epreuve: data.epreuve || 'EP2', contexte: data.contexte || '',
      competences: data.competences || [], evaluateur: data.evaluateur || '',
      phase: data.phase || 'formatif', eleves: data.eleves || [],
      phasesEleves: data.phasesEleves || {},
      obs: data.obs || ''
    };
    window.appCfg.activites.push(act);
    if (typeof window.saveLocal === 'function') window.saveLocal();
    window.toast('Activité « ' + act.titre + ' » créée', 'ok');
    return act;
  }

  function del(id) {
    window.appCfg.activites = (window.appCfg.activites || []).filter(function(a){ return a.id !== id; });
    if (typeof window.saveLocal === 'function') window.saveLocal();
    window.toast('Activité supprimée', 'inf');
    var el = document.getElementById('activitesList');
    if (el) renderList(el);
  }

  function getForStudent(code) {
    return (window.appCfg.activites || []).filter(function(a){
      return a.eleves && a.eleves.indexOf(code) !== -1;
    });
  }

  function getStats() {
    var acts = window.appCfg.activites || [];
    var s = { total: acts.length, byEpreuve: {'EP2':0,'EP3-A':0,'EP3-B':0,'EP3-C':0}, byPhase: {formatif:0,certificatif:0} };
    acts.forEach(function(a) {
      if (s.byEpreuve.hasOwnProperty(a.epreuve)) s.byEpreuve[a.epreuve]++;
      if (s.byPhase.hasOwnProperty(a.phase)) s.byPhase[a.phase]++;
    });
    return s;
  }

  // ── Initialisation + exposition ──

  _installDelegation();

  window.activModule = {
    init: init, renderList: renderList, showCreateModal: showCreateModal,
    create: create, 'delete': del, getForStudent: getForStudent, getStats: getStats
  };

})();
