/**
 * tp-manager.js — Création et bibliothèque de sessions (TP/TD/cours/interro/eval)
 * Mixage libre EP1 + EP2 + EP3
 * La phase (formatif/certificatif) se gère par élève par compétence dans l'évaluation
 * Expose : window.tpManager
 */
;(function () {
  'use strict';

  if (!window.appCfg) window.appCfg = {};
  if (!Array.isArray(window.appCfg.activites)) window.appCfg.activites = [];

  var COULEURS = {
    'EP1':   {bg:'#e67e22', light:'#fef5e7'},
    'EP2':   {bg:'#2d5a8c', light:'#e8f0f8'},
    'EP3-A': {bg:'#9b59b6', light:'#f3e5f5'},
    'EP3-B': {bg:'#3498db', light:'#d1ecf1'},
    'EP3-C': {bg:'#1abc9c', light:'#d4f4e2'}
  };

  var TYPE_LABELS = {
    'TP': '🔧 TP',
    'TD': '📝 TD',
    'cours': '📖 Cours',
    'interro': '📋 Interrogation',
    'eval': '📊 Évaluation',
    'autre': '📌 Autre'
  };

  // État de sélection
  var _sel = { comps: {}, eleves: [], epFilters: ['EP1','EP2','EP3'] };
  var _presetDate = null; // Date pré-remplie depuis le calendrier

  // ── Helpers ──

  function _allComps() {
    var ep1 = (window.COMP_EP1 || []).map(function(c) { return {code:c.code, nom:c.nom, full:c.full, obl:c.obl, ep:'EP1'}; });
    var ep2 = (window.COMP_EP2 || []).map(function(c) { return {code:c.code, nom:c.nom, full:c.full, obl:c.obl, ep:'EP2'}; });
    var ep3a = (window.COMP_EP3 || []).filter(function(c){ return c.sits && c.sits.indexOf('A')!==-1; })
      .map(function(c) { return {code:c.code, nom:c.nom, full:c.full, obl:c.obl, ep:'EP3-A'}; });
    var ep3b = (window.COMP_EP3 || []).filter(function(c){ return c.sits && c.sits.indexOf('B')!==-1; })
      .map(function(c) { return {code:c.code, nom:c.nom, full:c.full, obl:c.obl, ep:'EP3-B'}; });
    var ep3c = (window.COMP_EP3 || []).filter(function(c){ return c.sits && c.sits.indexOf('C')!==-1; })
      .map(function(c) { return {code:c.code, nom:c.nom, full:c.full, obl:c.obl, ep:'EP3-C'}; });
    return { 'EP1': ep1, 'EP2': ep2, 'EP3-A': ep3a, 'EP3-B': ep3b, 'EP3-C': ep3c };
  }

  function _today() { return new Date().toISOString().split('T')[0]; }

  function _nextId() {
    var max = 0;
    (window.appCfg.activites || []).forEach(function(a) {
      var n = parseInt(a.id.replace('ACT-',''), 10);
      if (n > max) max = n;
    });
    return 'ACT-' + String(max + 1).padStart(3, '0');
  }

  function _readFilesAsDataURL(input) {
    if (!input || !input.files || !input.files.length) return Promise.resolve([]);
    var promises = [];
    for (var i = 0; i < input.files.length; i++) {
      (function(file) {
        promises.push(new Promise(function(resolve) {
          var reader = new FileReader();
          reader.onload = function(e) {
            resolve({ name: file.name, type: file.type, size: file.size, data: e.target.result });
          };
          reader.onerror = function() { resolve(null); };
          reader.readAsDataURL(file);
        }));
      })(input.files[i]);
    }
    return Promise.all(promises).then(function(results) {
      return results.filter(function(r) { return r !== null; });
    });
  }

  // ══════════════════════════════════════════════════════════════
  // VUE LISTE / CRÉATION
  // ══════════════════════════════════════════════════════════════

  function showCreate(date) {
    _sel = { comps: {}, eleves: [], epFilters: ['EP1','EP2','EP3'] };
    _presetDate = date || null;
    document.getElementById('tpListView').style.display = 'none';
    document.getElementById('tpCreateView').style.display = 'block';

    var dateInput = document.getElementById('tpDate');
    if (dateInput) dateInput.value = _presetDate || _today();
    var titreInput = document.getElementById('tpTitre');
    if (titreInput) titreInput.value = '';
    var typeInput = document.getElementById('tpType');
    if (typeInput) typeInput.value = 'TP';

    // Peupler le select prof avec les évaluateurs configurés
    _renderProfSelect();
    _renderEprFilters();
    _renderEleves();
    _renderComps();
  }

  function _renderProfSelect() {
    var sel = document.getElementById('tpProf');
    if (!sel) return;
    var profName = (window.cfg && window.cfg.nomProf) || 'Moi';
    var html = '<option value="">' + profName + '</option>';
    // Ajouter les autres enseignants/évaluateurs (depuis admin)
    var allUsers = window.users || [];
    allUsers.forEach(function(ev) {
      if (ev.nom && ev.nom !== profName && ev.actif !== false) {
        var role = ev.role || 'les-deux';
        var tag = role === 'evaluateur' ? ' (éval.)' : role === 'enseignant' ? ' (ens.)' : '';
        html += '<option value="' + ev.nom + '">' + ev.nom + tag + '</option>';
      }
    });
    sel.innerHTML = html;
  }

  function backToList() {
    document.getElementById('tpCreateView').style.display = 'none';
    document.getElementById('tpListView').style.display = 'block';
    if (window.activModule) {
      activModule.renderList(document.getElementById('activitesList'));
    }
  }

  // ══════════════════════════════════════════════════════════════
  // FILTRES ÉPREUVE
  // ══════════════════════════════════════════════════════════════

  function _renderEprFilters() {
    var zone = document.getElementById('tpEprFilters');
    if (!zone) return;
    var groups = ['EP1','EP2','EP3'];
    zone.innerHTML = groups.map(function(g) {
      var active = _sel.epFilters.indexOf(g) !== -1;
      var color = g === 'EP1' ? '#e67e22' : g === 'EP2' ? '#2d5a8c' : '#9b59b6';
      return '<button type="button" onclick="tpManager.toggleEpFilter(\'' + g + '\')" '
        + 'class="btn ' + (active ? 'btn-primary' : 'btn-ghost') + ' btn-sm" '
        + 'style="' + (active ? 'background:' + color + ';border-color:' + color + ';color:#fff' : 'color:' + color + ';border-color:' + color) + '">'
        + g + '</button>';
    }).join('')
    + '<button type="button" onclick="tpManager.toggleAllComps()" class="btn btn-ghost btn-xs" '
    + 'style="margin-left:.5rem;font-size:.7rem">Tout cocher/décocher</button>';
  }

  function toggleEpFilter(g) {
    var idx = _sel.epFilters.indexOf(g);
    if (idx === -1) _sel.epFilters.push(g);
    else _sel.epFilters.splice(idx, 1);
    _renderEprFilters();
    _renderComps();
  }

  // ══════════════════════════════════════════════════════════════
  // ÉLÈVES — avec groupes
  // ══════════════════════════════════════════════════════════════

  function _renderEleves() {
    var zone = document.getElementById('tpElevesGrid');
    if (!zone) return;
    var sts = window.students || [];

    if (!sts.length) {
      zone.innerHTML = '<div class="alert al-warn" style="width:100%">Aucun élève chargé. Synchronisez ou activez le mode démo.</div>';
      _updateElvCount();
      return;
    }

    zone.innerHTML = sts.map(function(s) {
      var sel = _sel.eleves.indexOf(s.code) !== -1;
      var grpBadge = s.groupe ? ' <span style="font-size:.55rem;color:#888">' + s.groupe + '</span>' : '';
      return '<button type="button" onclick="tpManager.toggleEleve(\'' + s.code + '\')" '
        + 'class="btn ' + (sel ? 'btn-primary' : 'btn-ghost') + ' btn-sm" '
        + 'style="font-size:.78rem">'
        + (s.nom || '') + ' ' + (s.prenom ? s.prenom.charAt(0) + '.' : '')
        + grpBadge
        + '</button>';
    }).join('');
    _updateElvCount();
  }

  function toggleEleve(code) {
    var idx = _sel.eleves.indexOf(code);
    if (idx === -1) _sel.eleves.push(code);
    else _sel.eleves.splice(idx, 1);
    _renderEleves();
  }

  function toggleAllEleves() {
    var sts = window.students || [];
    if (_sel.eleves.length === sts.length) _sel.eleves = [];
    else _sel.eleves = sts.map(function(s) { return s.code; });
    _renderEleves();
  }

  function selectGroupe(grp) {
    var sts = window.students || [];
    if (grp === 'all') {
      _sel.eleves = sts.map(function(s) { return s.code; });
    } else {
      // Sélectionner uniquement le groupe
      _sel.eleves = sts.filter(function(s) { return s.groupe === grp; }).map(function(s) { return s.code; });
    }
    _renderEleves();
  }

  function _updateElvCount() {
    var cnt = document.getElementById('tpElvCount');
    if (cnt) cnt.textContent = '(' + _sel.eleves.length + '/' + (window.students || []).length + ')';
  }

  // ══════════════════════════════════════════════════════════════
  // COMPÉTENCES
  // ══════════════════════════════════════════════════════════════

  function _renderComps() {
    var zone = document.getElementById('tpCompsGrid');
    if (!zone) return;
    var allGroups = _allComps();
    var html = '';
    var total = 0;

    var sections = [
      {key:'EP1', label:'EP1 — Étude et préparation', show: _sel.epFilters.indexOf('EP1') !== -1},
      {key:'EP2', label:'EP2 — Réalisation', show: _sel.epFilters.indexOf('EP2') !== -1},
      {key:'EP3-A', label:'EP3-A — Mise en service', show: _sel.epFilters.indexOf('EP3') !== -1},
      {key:'EP3-B', label:'EP3-B — Maintenance', show: _sel.epFilters.indexOf('EP3') !== -1},
      {key:'EP3-C', label:'EP3-C — Communication', show: _sel.epFilters.indexOf('EP3') !== -1}
    ];

    sections.forEach(function(sec) {
      if (!sec.show) return;
      var comps = allGroups[sec.key] || [];
      if (!comps.length) return;
      var c = COULEURS[sec.key] || {bg:'#555',light:'#f5f5f5'};

      html += '<div style="margin-bottom:.6rem">';
      html += '<div style="font-weight:700;font-size:.78rem;color:' + c.bg + ';padding:.3rem .5rem;'
        + 'background:' + c.light + ';border-radius:6px;margin-bottom:.3rem;'
        + 'border-left:4px solid ' + c.bg + '">' + sec.label + '</div>';

      comps.forEach(function(comp) {
        var sel = !!_sel.comps[comp.code];
        if (sel) total++;

        html += '<div style="border-left:4px solid ' + (sel ? c.bg : '#ddd') + ';'
          + (sel ? 'background:' + c.light : '') + ';margin-bottom:.3rem;padding:.4rem .6rem;border-radius:0 8px 8px 0">';

        html += '<div style="display:flex;align-items:center;gap:.4rem;cursor:pointer" '
          + 'onclick="tpManager.toggleComp(\'' + comp.code + '\',\'' + sec.key + '\')">';
        html += '<input type="checkbox" ' + (sel ? 'checked' : '') + ' style="margin:0;pointer-events:none">';
        html += '<span style="font-weight:800;font-size:.8rem;color:' + (sel ? c.bg : '#888') + '">' + comp.code + '</span>';
        html += '<span style="flex:1;font-size:.76rem;color:#333">'
          + comp.nom + (comp.obl ? ' <span style="color:#e53935">✱</span>' : '') + '</span>';
        html += '</div>';

        html += '<div style="padding-left:1.4rem;font-size:.68rem;color:#666;margin-top:.15rem">' + comp.full + '</div>';
        html += '</div>';
      });

      html += '</div>';
    });

    if (!html) {
      html = '<div style="text-align:center;padding:1rem;color:#888;font-size:.82rem">Activez au moins un filtre EP1/EP2/EP3</div>';
    }

    zone.innerHTML = html;
    _updateCompCount(total);
  }

  function toggleComp(code, ep) {
    if (_sel.comps[code]) delete _sel.comps[code];
    else _sel.comps[code] = { ep: ep };
    _renderComps();
  }

  function toggleAllComps() {
    var allGroups = _allComps();
    var visibleCodes = [];
    var sections = [
      {key:'EP1', show: _sel.epFilters.indexOf('EP1') !== -1},
      {key:'EP2', show: _sel.epFilters.indexOf('EP2') !== -1},
      {key:'EP3-A', show: _sel.epFilters.indexOf('EP3') !== -1},
      {key:'EP3-B', show: _sel.epFilters.indexOf('EP3') !== -1},
      {key:'EP3-C', show: _sel.epFilters.indexOf('EP3') !== -1}
    ];
    sections.forEach(function(sec) {
      if (!sec.show) return;
      (allGroups[sec.key] || []).forEach(function(comp) {
        visibleCodes.push({code: comp.code, ep: sec.key});
      });
    });

    var allChecked = visibleCodes.every(function(v) { return !!_sel.comps[v.code]; });
    if (allChecked) {
      visibleCodes.forEach(function(v) { delete _sel.comps[v.code]; });
    } else {
      visibleCodes.forEach(function(v) {
        if (!_sel.comps[v.code]) _sel.comps[v.code] = { ep: v.ep };
      });
    }
    _renderComps();
  }

  function _updateCompCount(total) {
    var cnt = document.getElementById('tpCompCount');
    if (cnt) cnt.textContent = '(' + total + ' comp.)';
  }

  // ══════════════════════════════════════════════════════════════
  // SOUMISSION
  // ══════════════════════════════════════════════════════════════

  function submit() {
    var titre = (document.getElementById('tpTitre').value || '').trim();
    var date = document.getElementById('tpDate').value || _today();
    var typeSession = document.getElementById('tpType') ? document.getElementById('tpType').value : 'TP';
    var profSel = document.getElementById('tpProf') ? document.getElementById('tpProf').value : '';
    var compKeys = Object.keys(_sel.comps);

    if (!titre) { window.toast('Saisissez un nom de session', 'err'); return; }
    if (!compKeys.length) { window.toast('Cochez au moins une compétence', 'err'); return; }

    if (!window.appCfg) window.appCfg = {};
    if (!Array.isArray(window.appCfg.activites)) window.appCfg.activites = [];

    // Épreuves impliquées
    var epreuves = {};
    compKeys.forEach(function(k) { epreuves[_sel.comps[k].ep] = true; });
    var eprList = Object.keys(epreuves);
    var epreuve = eprList.length === 1 ? eprList[0] : 'MIXTE';

    // compsEpreuves : quelle EP pour chaque compétence
    var compsEpreuves = {};
    compKeys.forEach(function(k) { compsEpreuves[k] = _sel.comps[k].ep; });

    // phasesElevesComps
    var phasesElevesComps = {};
    _sel.eleves.forEach(function(code) {
      phasesElevesComps[code] = {};
      compKeys.forEach(function(k) { phasesElevesComps[code][k] = 'formatif'; });
    });

    var evaluateur = profSel || (window.cfg && window.cfg.nomProf) || '';

    var act = {
      id: _nextId(),
      titre: titre,
      date: date,
      type: typeSession,
      epreuve: epreuve,
      epreuves: eprList,
      competences: compKeys,
      compsEpreuves: compsEpreuves,
      phasesElevesComps: phasesElevesComps,
      evaluateur: evaluateur,
      phase: 'formatif',
      eleves: _sel.eleves.slice(),
      phasesEleves: {},
      photos: [],
      docsEleve: [],
      docsProf: [],
      avecCorrection: false,
      obs: ''
    };

    _sel.eleves.forEach(function(code) { act.phasesEleves[code] = 'formatif'; });

    // Lecture des documents (async)
    var docsEleveInput = document.getElementById('tpDocsEleve');
    var docsProfInput = document.getElementById('tpDocsProf');
    var avecCorr = document.getElementById('tpAvecCorrection');
    act.avecCorrection = avecCorr ? avecCorr.checked : false;

    Promise.all([
      _readFilesAsDataURL(docsEleveInput),
      _readFilesAsDataURL(docsProfInput)
    ]).then(function(results) {
      act.docsEleve = results[0];
      act.docsProf = results[1];

      window.appCfg.activites.push(act);
      if (typeof window.saveLocal === 'function') window.saveLocal();

      var typeLabel = TYPE_LABELS[typeSession] || typeSession;
      var summary = compKeys.length + ' comp. (' + eprList.join('+') + '), ' + _sel.eleves.length + ' élèves';
      window.toast(typeLabel + ' « ' + titre + ' » créé — ' + summary, 'ok');

      backToList();
    });
  }

  // ══════════════════════════════════════════════════════════════
  // EXPOSITION
  // ══════════════════════════════════════════════════════════════

  window.tpManager = {
    showCreate: showCreate,
    backToList: backToList,
    toggleEpFilter: toggleEpFilter,
    toggleComp: toggleComp,
    toggleAllComps: toggleAllComps,
    toggleEleve: toggleEleve,
    toggleAllEleves: toggleAllEleves,
    selectGroupe: selectGroupe,
    submit: submit,
    TYPE_LABELS: TYPE_LABELS
  };

})();
