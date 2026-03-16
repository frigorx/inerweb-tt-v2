/**
 * export-excel.js — Export Excel complet (synthèse classe + fiches détaillées)
 * Dépendance : SheetJS (window.XLSX)
 *
 * Globales : students, validations, notes, pfmpData,
 *   COMP_EP2, COMP_EP3, calcNote, getLv, getObs, NV_LBL, appCfg
 * Optionnels : expoModule, imposModule, evalTuteurModule
 */
;(function () {
  'use strict';

  function _dateFR() {
    var d = new Date();
    return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear();
  }

  function _sortStudents(arr) {
    return arr.slice().sort(function (a, b) {
      return (a.nom || '').localeCompare(b.nom || '', 'fr') || (a.prenom || '').localeCompare(b.prenom || '', 'fr');
    });
  }

  // ── Feuille 1 : Synthèse classe ──

  function _sheetSynthese() {
    var sts = _sortStudents(window.students || []);
    var rows = [];

    // En-tête
    var header = ['N\u00b0', 'Nom', 'Pr\u00e9nom', 'Classe', 'EP2/20', 'EP3/20',
      '\u00c9lig.EP2', '\u00c9lig.EP3', 'Expo %', 'Phase'];
    rows.push(header);

    sts.forEach(function(s, i) {
      var e2 = window.calcNote(s.code, 'EP2');
      var e3 = window.calcNote(s.code, 'EP3');
      var expo = window.expoModule ? window.expoModule.calc(s.code) : null;
      var phase = s.phase || window.curPhase || 'formatif';

      rows.push([
        i + 1,
        s.nom || '',
        s.prenom || '',
        s.classe || '',
        Math.round(e2.note * 10) / 10,
        Math.round(e3.note * 10) / 10,
        e2.elig ? 'Oui' : 'Non',
        e3.elig ? 'Oui' : 'Non',
        expo ? expo.pct : '',
        phase
      ]);
    });

    // Ligne moyennes
    if (sts.length) {
      var moyEP2 = 0, moyEP3 = 0;
      sts.forEach(function(s) {
        moyEP2 += window.calcNote(s.code, 'EP2').note;
        moyEP3 += window.calcNote(s.code, 'EP3').note;
      });
      rows.push([]);
      rows.push(['', 'MOYENNE', '', '',
        Math.round(moyEP2 / sts.length * 10) / 10,
        Math.round(moyEP3 / sts.length * 10) / 10
      ]);
    }

    return window.XLSX.utils.aoa_to_sheet(rows);
  }

  // ── Feuille 2 : Grille EP2 détaillée ──

  function _sheetGrille(ep, comps) {
    var sts = _sortStudents(window.students || []);
    var rows = [];

    // En-tête
    var header = ['Nom', 'Pr\u00e9nom'];
    comps.forEach(function(c) {
      header.push(c.code + ' ' + c.nom);
    });
    header.push('Note/' + '20');
    rows.push(header);

    sts.forEach(function(s) {
      var row = [s.nom || '', s.prenom || ''];
      comps.forEach(function(c) {
        var lv = window.getLv(s.code, ep, c.code) || 'NE';
        row.push(lv);
      });
      var n = window.calcNote(s.code, ep);
      row.push(Math.round(n.note * 10) / 10);
      rows.push(row);
    });

    return window.XLSX.utils.aoa_to_sheet(rows);
  }

  // ── Feuille 3 : Observations ──

  function _sheetObservations() {
    var sts = _sortStudents(window.students || []);
    var allComps = (window.COMP_EP2 || []).concat(window.COMP_EP3 || []);
    var rows = [];

    rows.push(['Nom', 'Pr\u00e9nom', 'Comp\u00e9tence', '\u00c9preuve', 'Niveau', 'Observation']);

    sts.forEach(function(s) {
      allComps.forEach(function(c) {
        var ep = (window.COMP_EP2 || []).indexOf(c) !== -1 ? 'EP2' : 'EP3';
        var obs = window.getObs(s.code, ep, c.code);
        if (!obs) return;
        var lv = window.getLv(s.code, ep, c.code) || 'NE';
        rows.push([s.nom || '', s.prenom || '', c.code + ' ' + c.nom, ep, lv, obs]);
      });
    });

    return window.XLSX.utils.aoa_to_sheet(rows);
  }

  // ── Feuille 4 : Suivi PFMP ──

  function _sheetPFMP() {
    var sts = _sortStudents(window.students || []);
    var rows = [];

    rows.push(['Nom', 'Pr\u00e9nom', 'Sig. Tuteur PFMP1', 'Sig. Tuteur PFMP2', 'Sig. Candidat',
      'Eval Tuteur PFMP1', 'Eval Tuteur PFMP2', 'Impossibilit\u00e9s', 'Oral rattrapage', 'Journal (entr\u00e9es)']);

    sts.forEach(function(s) {
      var pd = window.pfmpData[s.code] || {};
      var sigs = pd.signatures || {};
      var et = pd.evalTuteur || {};
      var journal = pd.journal || [];

      var impStr = '';
      if (window.imposModule) {
        if (window.imposModule.has(s.code, '1')) impStr += 'PFMP1 ';
        if (window.imposModule.has(s.code, '2')) impStr += 'PFMP2';
      }

      var rattrapage = '';
      if (window.tacheModule && window.tacheModule.hasRattrapage(s.code)) {
        var lvs = window.tacheModule.getLevels(s.code);
        var arr = [];
        for (var k in lvs) { if (lvs.hasOwnProperty(k)) arr.push(k + ':' + lvs[k]); }
        rattrapage = arr.join(', ');
      }

      rows.push([
        s.nom || '', s.prenom || '',
        sigs.tuteur_pfmp1 ? 'Oui' : 'Non',
        sigs.tuteur_pfmp2 ? 'Oui' : 'Non',
        sigs.candidat ? 'Oui' : 'Non',
        (et.pfmp1 && et.pfmp1.validee) ? 'Valid\u00e9e' : 'Manquante',
        (et.pfmp2 && et.pfmp2.validee) ? 'Valid\u00e9e' : 'Manquante',
        impStr || 'Aucune',
        rattrapage || 'Non',
        journal.length
      ]);
    });

    return window.XLSX.utils.aoa_to_sheet(rows);
  }

  // ── Export principal ──

  function exportAll() {
    if (!window.XLSX) {
      window.toast('SheetJS (XLSX) non disponible', 'err');
      return;
    }

    var wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, _sheetSynthese(), 'Synth\u00e8se');
    window.XLSX.utils.book_append_sheet(wb, _sheetGrille('EP2', window.COMP_EP2 || []), 'Grille EP2');
    window.XLSX.utils.book_append_sheet(wb, _sheetGrille('EP3', window.COMP_EP3 || []), 'Grille EP3');
    window.XLSX.utils.book_append_sheet(wb, _sheetObservations(), 'Observations');
    window.XLSX.utils.book_append_sheet(wb, _sheetPFMP(), 'Suivi PFMP');

    var session = (window.appCfg || {}).session || 'CCF';
    var fileName = 'Export_CCF_' + session + '_' + _dateFR().replace(/\//g, '-') + '.xlsx';
    window.XLSX.writeFile(wb, fileName);
    window.toast('Export Excel g\u00e9n\u00e9r\u00e9 : ' + fileName, 'ok');
  }

  /** Export fiche individuelle d'un élève */
  function exportStudent(code) {
    if (!window.XLSX) {
      window.toast('SheetJS (XLSX) non disponible', 'err');
      return;
    }

    var s = (window.students || []).find(function(e){ return e.code === code; });
    if (!s) return;

    var wb = window.XLSX.utils.book_new();
    var rows = [];

    // Infos élève
    rows.push(['Fiche CCF - ' + s.nom + ' ' + (s.prenom || '')]);
    rows.push(['Classe', s.classe || '']);
    rows.push(['\u00c9tablissement', (window.appCfg || {}).etablissement || '']);
    rows.push(['Date', _dateFR()]);
    rows.push([]);

    // EP2
    rows.push(['EP2 - R\u00e9alisation']);
    rows.push(['Code', 'Comp\u00e9tence', 'Poids', 'Obligatoire', 'Niveau', 'Points']);
    var e2 = window.calcNote(code, 'EP2');
    e2.det.forEach(function(d) {
      rows.push([d.code, d.nom, d.max, d.obl ? 'Oui' : 'Non', d.lv, d.pts]);
    });
    rows.push(['', '', '', '', 'NOTE', e2.note.toFixed(1) + '/20']);
    rows.push([]);

    // EP3
    rows.push(['EP3 - Mise en service']);
    rows.push(['Code', 'Comp\u00e9tence', 'Poids', 'Obligatoire', 'Niveau', 'Points']);
    var e3 = window.calcNote(code, 'EP3');
    e3.det.forEach(function(d) {
      rows.push([d.code, d.nom, d.max, d.obl ? 'Oui' : 'Non', d.lv, d.pts]);
    });
    rows.push(['', '', '', '', 'NOTE', e3.note.toFixed(1) + '/20']);
    rows.push([]);

    // Observations
    rows.push(['Observations']);
    (window.COMP_EP2 || []).concat(window.COMP_EP3 || []).forEach(function(c) {
      var ep = (window.COMP_EP2 || []).indexOf(c) !== -1 ? 'EP2' : 'EP3';
      var obs = window.getObs(code, ep, c.code);
      if (obs) rows.push([c.code, obs]);
    });

    window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet(rows), 'Fiche');
    window.XLSX.writeFile(wb, 'CCF_' + (s.nom || 'Eleve') + '_' + (s.prenom || '') + '.xlsx');
    window.toast('Fiche Excel export\u00e9e', 'ok');
  }

  // ── Exposition globale ──

  window.exportModule = {
    exportAll: exportAll,
    exportStudent: exportStudent
  };

})();
