/**
 * prog-model.js — Modele de donnees progression
 * Extrait de inerweb_prof.html [A] REFERENTIELS
 * Expose : window.progModel
 */
;(function(){
  'use strict';

  window.progModel = {

    /**
     * Detecte le referentiel d'un eleve a partir de sa classe ou son champ referentiel
     */
    getFiliere: function(student) {
      if (student.referentiel && FILIERES[student.referentiel]) return student.referentiel;
      var cl = (student.classe || '').toLowerCase();
      if (cl.includes('cap') || cl.includes('ifca')) return 'CAP_IFCA';
      if (cl.includes('mfer') || cl.includes('bac')) return 'BAC_MFER';
      if (cl.includes('tne') || cl.includes('2nde')) return 'TNE';
      return 'CAP_IFCA'; // fallback
    },

    /** Retourne les epreuves disponibles pour un eleve */
    getEpreuves: function(student) {
      return (FILIERES[this.getFiliere(student)] || {}).epreuves || [];
    },

    /** Retourne les competences d'une epreuve pour un eleve */
    getComps: function(student, epreuve) {
      var fil = FILIERES[this.getFiliere(student)] || {};
      return (fil.comps || {})[epreuve] || [];
    },

    /** Retourne les criteres d'une epreuve pour un eleve */
    getCrits: function(student, epreuve) {
      var fil = FILIERES[this.getFiliere(student)] || {};
      return (fil.crits || {})[epreuve] || {};
    },

    /** Retourne les situations d'une epreuve pour un eleve */
    getSits: function(student, epreuve) {
      var fil = FILIERES[this.getFiliere(student)] || {};
      return (fil.sits || {})[epreuve] || {};
    },

    /** Reference vers FILIERES */
    FILIERES: null  // sera lie a window.FILIERES dans le init
  };

  // Lier la reference FILIERES des que disponible
  if (window.FILIERES) {
    window.progModel.FILIERES = window.FILIERES;
  } else {
    // Observer pour quand FILIERES sera defini
    Object.defineProperty(window.progModel, 'FILIERES', {
      get: function() { return window.FILIERES; },
      configurable: true
    });
  }

  // Retro-compatibilite : exposer les fonctions standalone sur window
  // (elles restent aussi definies dans prof.html pour l'instant)
  if (!window.getFiliere) window.getFiliere = function(s) { return window.progModel.getFiliere(s); };
  if (!window.getEpreuves) window.getEpreuves = function(s) { return window.progModel.getEpreuves(s); };
  if (!window.getComps) window.getComps = function(s, ep) { return window.progModel.getComps(s, ep); };
  if (!window.getCrits) window.getCrits = function(s, ep) { return window.progModel.getCrits(s, ep); };
  if (!window.getSits) window.getSits = function(s, ep) { return window.progModel.getSits(s, ep); };

})();
