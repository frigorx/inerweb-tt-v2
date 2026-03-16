/**
 * tache-complexe.js — Tâche complexe (oral de rattrapage) pour le CCF
 * Quand des compétences obligatoires EP2 restent NE ou EC après les PFMP,
 * l'élève peut les rattraper via un oral. Données dans pfmpData[code].tacheComplexe
 * Globales : pfmpData, COMP_EP2, validations, saveLocal(), toast()
 */
window.tacheModule = (function () {
  'use strict';

  var NIVEAUX = ['EC', 'M', 'PM'];
  var NIV_LBL = { EC: 'En Cours', M: 'Maîtrisé', PM: 'Parfaitement Maîtrisé' };
  var ACCEPT = '.ppt,.pptx,.pdf,.doc,.docx';

  /* init — Crée la structure si absente */
  function init(code) {
    if (!pfmpData[code] || pfmpData[code].tacheComplexe) return;
    pfmpData[code].tacheComplexe = { competences: [], levels: {}, supportRef: null, obs: '' };
  }

  /* Compétences EP2 dont le niveau actuel est NE ou EC (candidates au rattrapage) */
  function _getCompNE(code) {
    var result = [], comps = window.COMP_EP2 || [], vals = validations[code] || [];
    for (var i = 0; i < comps.length; i++) {
      var c = comps[i], filtered = [];
      for (var j = 0; j < vals.length; j++) {
        var v = vals[j];
        if (v.epreuve === 'EP2' && v.competence === c.code && (!v.critere || v.critere === ''))
          filtered.push(v);
      }
      var niv = 'NE';
      if (filtered.length > 0) {
        filtered.sort(function (a, b) { return String(b.timestamp || '').localeCompare(String(a.timestamp || '')); });
        niv = filtered[0].niveau || 'NE';
      }
      if (niv === 'NE' || niv === 'EC') result.push({ code: c.code, nom: c.nom, niv: niv });
    }
    return result;
  }

  /* render — Affiche l'interface dans le conteneur fourni */
  function render(code, container) {
    init(code);
    var tc = pfmpData[code].tacheComplexe, candidates = _getCompNE(code);

    if (candidates.length === 0) {
      container.innerHTML = '<p style="color:var(--gris);font-style:italic">Aucune compétence EP2 en NE ou EC — pas de rattrapage nécessaire.</p>';
      return;
    }

    var h = '<div class="tc-wrapper"><p style="margin-bottom:10px"><strong>Compétences rattrapables à l\'oral :</strong></p>';
    for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i], chk = tc.competences.indexOf(c.code) !== -1 ? ' checked' : '', sl = tc.levels[c.code] || '';
      h += '<div class="tc-comp" style="margin:8px 0;padding:6px;border:1px solid #ddd;border-radius:6px">';
      h += '<label style="cursor:pointer;font-weight:600"><input type="checkbox" class="tc-cb" data-comp="' + c.code + '"' + chk + '> ';
      h += c.code + ' — ' + c.nom + ' <span style="color:var(--gris);font-size:.8em">(' + c.niv + ')</span></label>';
      /* Dropdown niveau (masqué si non coché) */
      h += '<div class="tc-level-wrap" data-comp="' + c.code + '"' + (chk ? '' : ' style="display:none"') + '>';
      h += ' <label style="margin-left:24px;font-size:.85em">Niveau oral : <select class="tc-sel" data-comp="' + c.code + '"><option value="">—</option>';
      for (var n = 0; n < NIVEAUX.length; n++) {
        h += '<option value="' + NIVEAUX[n] + '"' + (sl === NIVEAUX[n] ? ' selected' : '') + '>' + NIVEAUX[n] + ' — ' + NIV_LBL[NIVEAUX[n]] + '</option>';
      }
      h += '</select></label></div></div>';
    }

    /* Référence fichier support */
    h += '<div style="margin-top:14px"><label><strong>Support de l\'oral :</strong></label><br>';
    h += '<input type="file" id="tc-file" accept="' + ACCEPT + '" style="margin-top:4px">';
    h += '<div id="tc-file-info" style="margin-top:4px;font-size:.85em;color:var(--bleu2)">';
    h += tc.supportRef ? tc.supportRef.name + ' (' + tc.supportRef.date + ')' : '';
    h += '</div></div>';

    /* Observations + bouton */
    h += '<div style="margin-top:12px"><label><strong>Observations :</strong></label>';
    h += '<textarea id="tc-obs" rows="3" style="width:100%;margin-top:4px;resize:vertical">' + (tc.obs || '') + '</textarea></div>';
    h += '<div style="text-align:right;margin-top:14px"><button type="button" id="btn-save-tc" class="btn btn-primary">Enregistrer</button></div></div>';

    container.innerHTML = h;

    /* Écouteurs checkbox — afficher/masquer le dropdown */
    var cbs = container.querySelectorAll('.tc-cb');
    for (var k = 0; k < cbs.length; k++) {
      cbs[k].addEventListener('change', (function (cb) {
        return function () {
          var w = container.querySelector('.tc-level-wrap[data-comp="' + cb.dataset.comp + '"]');
          if (w) w.style.display = cb.checked ? '' : 'none';
        };
      })(cbs[k]));
    }

    /* Écouteur fichier — stocke nom/type/date (pas le contenu) */
    var fi = container.querySelector('#tc-file');
    if (fi) fi.addEventListener('change', function () {
      var f = fi.files[0], info = container.querySelector('#tc-file-info');
      if (!f) return;
      var d = new Date(), ds = ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear();
      tc.supportRef = { name: f.name, type: f.type, date: ds };
      if (info) info.textContent = f.name + ' (' + ds + ')';
    });

    /* Bouton enregistrer */
    var btn = container.querySelector('#btn-save-tc');
    if (btn) btn.addEventListener('click', function () { save(code); });
  }

  /* save — Lit le DOM et persiste dans pfmpData */
  function save(code) {
    init(code);
    var tc = pfmpData[code].tacheComplexe, comps = [], levels = {};
    var cbs = document.querySelectorAll('.tc-cb');
    for (var i = 0; i < cbs.length; i++) {
      if (cbs[i].checked) {
        var comp = cbs[i].dataset.comp;
        comps.push(comp);
        var sel = document.querySelector('.tc-sel[data-comp="' + comp + '"]');
        if (sel && sel.value) levels[comp] = sel.value;
      }
    }
    tc.competences = comps;
    tc.levels = levels;
    var obsEl = document.getElementById('tc-obs');
    tc.obs = obsEl ? obsEl.value.trim() : '';
    /* supportRef déjà mis à jour par l'écouteur fichier */
    saveLocal();
    toast('Tâche complexe enregistrée');
  }

  /* hasRattrapage — true si au moins une compétence est cochée */
  function hasRattrapage(code) {
    init(code);
    return pfmpData[code].tacheComplexe.competences.length > 0;
  }

  /* getLevels — Retourne { 'C3.4': 'M', 'C3.6': 'PM' } pour le calcul de notes */
  function getLevels(code) {
    init(code);
    var tc = pfmpData[code].tacheComplexe, result = {};
    for (var i = 0; i < tc.competences.length; i++) {
      var c = tc.competences[i];
      if (tc.levels[c]) result[c] = tc.levels[c];
    }
    return result;
  }

  return { init: init, render: render, save: save, hasRattrapage: hasRattrapage, getLevels: getLevels };
})();
