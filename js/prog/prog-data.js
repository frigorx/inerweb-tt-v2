/**
 * prog-data.js — Acces aux donnees de progression
 * Extrait de inerweb_prof.html [G] EVALUATION + [H] BILAN
 * Expose : window.progData
 */
;(function(){
  'use strict';

  window.progData = {

    /**
     * Calcule la note pour un eleve sur une epreuve
     * @param {string} code - Code eleve
     * @param {string} ep - Code epreuve (E31, E32, E33, EP2, EP3)
     * @returns {Object} {note, elig, det, tot, max}
     */
    calcNote: function(code, ep) {
      var COEF_OBL = window.COEF_OBL || 1.2;
      var comps = ep === 'E31' ? COMP_E31 : ep === 'E33' ? COMP_E33 : COMP_E32;
      var validees = (notes[code] && notes[code][ep] && notes[code][ep].validees) || {};
      var tot = 0, max = 0;
      var det = comps.map(function(c) {
        var coef = c.obl ? COEF_OBL : 1;
        var mx = c.poids * coef;
        var isVal = !!validees[c.code];
        var val = isVal ? mx : 0;
        tot += val; max += mx;
        var lv = window.progData.getLv(code, ep, c.code) || 'NE';
        return { code: c.code, nom: c.nom, obl: c.obl, lv: lv, validee: isVal, pts: val.toFixed(1), max: mx.toFixed(1) };
      });
      var note = max ? Math.round(tot / max * 20 * 10) / 10 : 0;
      return { note: note, elig: note >= 10, det: det, tot: tot.toFixed(1), max: max.toFixed(1) };
    },

    /**
     * Recupere le niveau global d'une competence pour un eleve
     * @param {string} code - Code eleve
     * @param {string} ep - Code epreuve
     * @param {string} comp - Code competence
     * @returns {string|null} Niveau (NE, NA, EC, M, PM) ou null
     */
    getLv: function(code, ep, comp) {
      var v = (validations[code] || []).filter(function(x) {
        return x.epreuve === ep && x.competence === comp && (!x.critere || x.critere === '');
      });
      if (!v.length) return null;
      return v.sort(function(a, b) {
        return String(b.timestamp || '').localeCompare(String(a.timestamp || ''));
      })[0].niveau;
    },

    /**
     * Recupere l'observation d'une competence
     * @param {string} code - Code eleve
     * @param {string} ep - Code epreuve
     * @param {string} comp - Code competence
     * @returns {string} Texte observation
     */
    getObs: function(code, ep, comp) {
      var v = (validations[code] || []).filter(function(x) {
        return x.epreuve === ep && x.competence === comp && x.critere === '__obs__';
      });
      if (!v.length) return '';
      return v.sort(function(a, b) {
        return String(b.timestamp || '').localeCompare(String(a.timestamp || ''));
      })[0].niveau || '';
    },

    /**
     * Calcule le pourcentage de progression global d'un eleve
     * @param {string} code - Code eleve
     * @returns {number} Pourcentage 0-100
     */
    getProgress: function(code) {
      var s = students.find(function(x) { return x.code === code; });
      if (!s) return 0;
      var filKey = getFiliere(s);
      var fil = FILIERES[filKey];
      if (!fil) return 0;
      var epreuves = fil.epreuves || [];
      var v = validations[code] || [];
      var totalComps = 0, doneComps = 0;

      if (epreuves.length) {
        epreuves.forEach(function(ep) {
          var comps = (fil.comps || {})[ep] || [];
          totalComps += comps.length;
          doneComps += new Set(v.filter(function(x) { return x.epreuve === ep; }).map(function(x) { return x.competence; })).size;
        });
      } else {
        // TNE: modules CT
        var comps = (fil.comps || {}).modules || [];
        totalComps = comps.length;
        doneComps = new Set(v.filter(function(x) { return x.epreuve === 'modules'; }).map(function(x) { return x.competence; })).size;
      }

      return totalComps ? Math.round(doneComps / totalComps * 100) : 0;
    }
  };

  // Retro-compatibilite : exposer les fonctions standalone sur window
  if (!window.calcNote) window.calcNote = function(code, ep) { return window.progData.calcNote(code, ep); };
  if (!window.getLv) window.getLv = function(code, ep, comp) { return window.progData.getLv(code, ep, comp); };
  if (!window.getObs) window.getObs = function(code, ep, comp) { return window.progData.getObs(code, ep, comp); };
  if (!window.getProgress) window.getProgress = function(code) { return window.progData.getProgress(code); };

})();
