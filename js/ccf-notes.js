/**
 * ccf-notes.js — Calcul des notes CCF (EP2/EP3 CAP IFCA, E31/E32/E33 BAC PRO MFER)
 *
 * Reprend la logique du CCF v11 : poids par compétence, coef coeur (x1.2),
 * conversion PM/M/EC/NE en pourcentage, note sur 20.
 *
 * Globales : FILIERES, getFiliere, validations, notes, students, COEF_OBL,
 *            COMP_EP2, COMP_EP3, COMP_E31, COMP_E32, COMP_E33
 */
;(function () {
  'use strict';

  // ── Configuration barème ──
  var BAREME = { PM: 1.0, M: 0.70, EC: 0.35, NE: 0 };

  // ── Helpers ──

  function getLastLevel(code, epreuve) {
    var vals = (window.validations || {})[code] || [];
    if (!Array.isArray(vals)) return null;
    var matching = vals.filter(function (v) {
      return v.epreuve === epreuve && v.competence !== '__obs__' && v.competence !== '__obs_tuteur__' && v.competence !== '__obs_prof_stage__';
    });
    if (!matching.length) return null;
    // Prendre le niveau le plus récent (dernier dans le tableau)
    var last = matching[matching.length - 1];
    return last.niveau || null;
  }

  function getCompLevel(studentCode, compCode, epreuve) {
    // D'abord chercher dans validations (format prof)
    var niv = getLastLevel(studentCode, epreuve);
    if (niv) return niv;
    // Chercher toutes les validations pour cette compétence spécifique
    var vals = (window.validations || {})[studentCode] || [];
    if (!Array.isArray(vals)) return null;
    var compVals = vals.filter(function (v) {
      return v.competence === compCode && v.epreuve === epreuve && v.niveau && v.niveau !== 'NE';
    });
    if (compVals.length) return compVals[compVals.length - 1].niveau;
    return null;
  }

  // ── Calcul note pour une épreuve ──

  function calcNoteEpreuve(studentCode, epreuve, competences) {
    var details = [];
    var alerts = [];
    var totalPts = 0;
    var totalPoids = 0;
    var evaluated = 0;

    competences.forEach(function (c) {
      var poids = c.poids || c.poidsDefaut || 1;
      var coef = (c.obl || c.obligatoire) ? (window.COEF_OBL || 1.2) : 1;
      var level = getCompLevel(studentCode, c.code, epreuve);

      var pct = BAREME[level] || 0;
      var pts = poids * coef * pct;
      totalPoids += poids * coef;

      if (level && level !== 'NE') {
        totalPts += pts;
        evaluated++;
      }

      details.push({
        code: c.code,
        nom: c.nom || c.full || '',
        obligatoire: !!(c.obl || c.obligatoire),
        coef: coef,
        poids: poids,
        level: level || 'NE',
        pts: pts.toFixed(1)
      });

      // Alertes
      if ((c.obl || c.obligatoire) && (!level || level === 'NE')) {
        alerts.push({ type: 'warning', text: c.code + ' — ' + (c.nom || '') + ' : Non Évalué' });
      } else if ((c.obl || c.obligatoire) && level === 'EC') {
        alerts.push({ type: 'danger', text: c.code + ' — ' + (c.nom || '') + ' : EC — Compétence obligatoire non maîtrisée' });
      }
    });

    var note = totalPoids > 0 ? (totalPts / totalPoids) * 20 : 0;
    note = Math.round(note * 2) / 2; // Arrondi au demi-point

    var eligible = competences.filter(function (c) { return c.obl || c.obligatoire; }).every(function (c) {
      var l = getCompLevel(studentCode, c.code, epreuve);
      return l && l !== 'NE';
    });

    return {
      note: note,
      details: details,
      alerts: alerts,
      evaluated: evaluated,
      total: competences.length,
      eligible: eligible,
      totalPts: Math.round(totalPts * 10) / 10,
      totalPoids: Math.round(totalPoids * 10) / 10
    };
  }

  // ── Calcul exposition ──

  function calcExposition(studentCode, competences, epreuve) {
    var opp = 0;
    var obs = 0;
    var parComp = {};

    competences.forEach(function (c) {
      var vals = (window.validations || {})[studentCode] || [];
      if (!Array.isArray(vals)) vals = [];
      var compVals = vals.filter(function (v) { return v.competence === c.code && v.epreuve === epreuve; });
      var offert = compVals.length > 0 ? 1 : 0;
      var fait = compVals.some(function (v) { return v.niveau && v.niveau !== 'NE'; }) ? 1 : 0;
      opp += Math.max(offert, fait);
      obs += fait;
      parComp[c.code] = { offert: Math.max(offert, fait), fait: fait };
    });

    return {
      opportunites: opp,
      observationsRealisees: obs,
      parCompetence: parComp,
      pourcentage: opp > 0 ? Math.round((obs / opp) * 100) : 0
    };
  }

  // ── API publique ──

  function calcNote(studentCode, epreuve) {
    var fil = window.getFiliere ? window.getFiliere({ code: studentCode }) : null;
    if (!fil) {
      // Chercher l'élève pour déterminer la filière
      var s = (window.students || []).find(function (x) { return x.code === studentCode; });
      if (s && window.getFiliere) fil = window.getFiliere(s);
    }
    var filiereObj = fil ? window.FILIERES[fil] : null;
    var comps = filiereObj && filiereObj.comps ? filiereObj.comps[epreuve] : null;
    if (!comps) return { note: 0, details: [], alerts: [], evaluated: 0, total: 0, eligible: false };
    return calcNoteEpreuve(studentCode, epreuve, comps);
  }

  function exposition(studentCode, epreuve) {
    var fil = window.getFiliere ? window.getFiliere((window.students || []).find(function (x) { return x.code === studentCode; }) || {}) : null;
    var filiereObj = fil ? window.FILIERES[fil] : null;
    var comps = filiereObj && filiereObj.comps ? filiereObj.comps[epreuve] : null;
    if (!comps) return { opportunites: 0, observationsRealisees: 0, parCompetence: {}, pourcentage: 0 };
    return calcExposition(studentCode, comps, epreuve);
  }

  // ── Exposer ──
  window.ccfNotes = {
    calcNote: calcNote,
    calcNoteEpreuve: calcNoteEpreuve,
    exposition: exposition,
    BAREME: BAREME
  };

})();
