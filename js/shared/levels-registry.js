/**
 * INERWEB — Registre de niveaux unifié v1.0
 * Table de correspondance centralisée pour tous les systèmes de niveaux.
 * Conversion interne standardisée, affichage adapté selon contexte.
 *
 * Niveaux internes : 0-7 (entier)
 * 0=NE, 1=ABS, 2=IMP, 3=NA, 4=EC, 5=M, 6=PM, 7=VAL
 */
(function(){
  'use strict';

  // ═══════════════════════════════════════════════════════════
  // TABLE MAÎTRE — source unique de vérité
  // ═══════════════════════════════════════════════════════════

  var LEVELS = [
    { internal: 0, edu: 'NE',  prog: 'NE',     label: 'Non \u00e9valu\u00e9',              short: 'NE',  pct: 0,   color: '#aaaaaa', bg: '#f0f0f0', cls: 'lv-ne',     evaluable: false },
    { internal: 1, edu: 'ABS', prog: 'NE-ABS',  label: 'Absent',                           short: 'ABS', pct: 0,   color: '#e74c3c', bg: '#fde8e6', cls: 'lv-abs',    evaluable: false },
    { internal: 2, edu: null,  prog: 'NE-IMP',  label: 'Impossible',                       short: 'IMP', pct: 0,   color: '#8e44ad', bg: '#f3e8ff', cls: 'lv-imp',    evaluable: false },
    { internal: 3, edu: '1',   prog: 'NA',      label: 'Non acquis',                       short: 'NA',  pct: 0,   color: '#e74c3c', bg: '#fde8e6', cls: 'lv-na',     evaluable: true  },
    { internal: 4, edu: '2',   prog: 'EC',      label: 'En cours d\'acquisition',          short: 'EC',  pct: 35,  color: '#f39c12', bg: '#fff8e1', cls: 'lv-ec',     evaluable: true  },
    { internal: 5, edu: '3',   prog: 'M',       label: 'Ma\u00eetris\u00e9',               short: 'M',   pct: 70,  color: '#27ae60', bg: '#d4f4e2', cls: 'lv-m',      evaluable: true  },
    { internal: 6, edu: '4',   prog: 'PM',      label: 'Parfaitement ma\u00eetris\u00e9',  short: 'PM',  pct: 100, color: '#2196F3', bg: '#e3f2fd', cls: 'lv-pm',     evaluable: true  },
    { internal: 7, edu: null,  prog: null,       label: 'Valid\u00e9 (certification)',       short: 'VAL', pct: 100, color: '#1a7d3e', bg: '#c8f7d5', cls: 'lv-val',    evaluable: false }
  ];

  // Index rapides
  var byInternal = {};
  var byEdu = {};
  var byProg = {};
  var byShort = {};

  LEVELS.forEach(function(lv){
    byInternal[lv.internal] = lv;
    if(lv.edu !== null) byEdu[lv.edu] = lv;
    if(lv.prog !== null) byProg[lv.prog] = lv;
    byShort[lv.short] = lv;
  });

  // Alias supplémentaires PROG+
  byProg['NE-NON'] = LEVELS[0]; // Non présenté → NE
  byProg['NE-REF'] = LEVELS[0]; // Refus → NE

  // ═══════════════════════════════════════════════════════════
  // VARIANTES D'AFFICHAGE PAR CONTEXTE
  // ═══════════════════════════════════════════════════════════

  var DISPLAY_MODES = {
    // Édu v4 — boutons 1/2/3/4
    edu: function(lv){ return lv.edu || lv.short; },

    // PROG+ — lettres NE/NA/EC/M/PM
    prog: function(lv){ return lv.prog || lv.short; },

    // Libellé court
    short: function(lv){ return lv.short; },

    // Libellé long
    long: function(lv){ return lv.label; },

    // Initiation / Consolidation / Maîtrise style
    pedago: function(lv){
      var map = {0:'—', 1:'—', 2:'—', 3:'Initiation', 4:'Consolidation', 5:'Ma\u00eetrise', 6:'Valid\u00e9', 7:'Valid\u00e9'};
      return map[lv.internal] || '—';
    },

    // Note chiffrée /20
    note20: function(lv){ return (lv.pct / 5).toFixed(0); },

    // Pourcentage
    pct: function(lv){ return lv.pct + '%'; }
  };

  // ═══════════════════════════════════════════════════════════
  // API PUBLIQUE
  // ═══════════════════════════════════════════════════════════

  window.iwLevels = {

    /** Toute la table */
    getAll: function(){ return LEVELS.slice(); },

    /** Seulement les niveaux évaluables (NA, EC, M, PM) */
    getEvaluable: function(){
      return LEVELS.filter(function(lv){ return lv.evaluable; });
    },

    /**
     * Résoudre n'importe quel format vers le niveau interne.
     * Accepte : nombre interne (0-7), string Édu ('1'-'4','NE','ABS'),
     *           string PROG+ ('NE','NA','EC','M','PM','NE-ABS',...),
     *           string short ('NA','EC','M','PM','VAL','IMP').
     * @param {number|string} input
     * @returns {Object|null} Objet niveau complet ou null
     */
    resolve: function(input){
      if(input === null || input === undefined || input === '') return byInternal[0];

      // Nombre interne direct
      if(typeof input === 'number') return byInternal[input] || null;

      var s = String(input).trim().toUpperCase();

      // Nombre en string
      var n = parseInt(s, 10);
      if(!isNaN(n) && n >= 0 && n <= 7) return byInternal[n] || null;

      // Lookup par prog (prioritaire car plus spécifique)
      if(byProg[s]) return byProg[s];

      // Lookup par edu
      if(byEdu[s]) return byEdu[s];

      // Lookup par short
      if(byShort[s]) return byShort[s];

      return null;
    },

    /**
     * Convertir depuis n'importe quel format vers le niveau interne (entier).
     * @param {number|string} input
     * @returns {number} Niveau interne 0-7 (0 si inconnu)
     */
    toInternal: function(input){
      var lv = this.resolve(input);
      return lv ? lv.internal : 0;
    },

    /**
     * Convertir vers un format d'affichage.
     * @param {number|string} input — Niveau (n'importe quel format)
     * @param {string} mode — Mode d'affichage : 'edu','prog','short','long','pedago','note20','pct'
     * @returns {string}
     */
    display: function(input, mode){
      var lv = this.resolve(input);
      if(!lv) return '—';
      var fn = DISPLAY_MODES[mode || 'short'];
      return fn ? fn(lv) : lv.short;
    },

    /**
     * Obtenir la couleur du niveau.
     * @param {number|string} input
     * @returns {string} Code couleur hex
     */
    color: function(input){
      var lv = this.resolve(input);
      return lv ? lv.color : '#aaa';
    },

    /**
     * Obtenir la couleur de fond du niveau.
     * @param {number|string} input
     * @returns {string} Code couleur hex
     */
    bgColor: function(input){
      var lv = this.resolve(input);
      return lv ? lv.bg : '#f0f0f0';
    },

    /**
     * Obtenir la classe CSS du niveau.
     * @param {number|string} input
     * @returns {string} Classe CSS
     */
    cssClass: function(input){
      var lv = this.resolve(input);
      return lv ? lv.cls : 'lv-ne';
    },

    /**
     * Obtenir le pourcentage du niveau.
     * @param {number|string} input
     * @returns {number} 0-100
     */
    pct: function(input){
      var lv = this.resolve(input);
      return lv ? lv.pct : 0;
    },

    /**
     * Convertir Édu → PROG+ (pour sync).
     * @param {string} eduLevel — '1','2','3','4','NE','ABS'
     * @returns {string} Code PROG+ ('NA','EC','M','PM','NE','NE-ABS')
     */
    eduToProg: function(eduLevel){
      var lv = byEdu[String(eduLevel).toUpperCase()];
      return lv ? (lv.prog || 'NE') : 'NE';
    },

    /**
     * Convertir PROG+ → Édu (pour sync).
     * @param {string} progLevel — 'NE','NA','EC','M','PM','NE-ABS',...
     * @returns {string} Code Édu ('NE','1','2','3','4','ABS') ou 'NE'
     */
    progToEdu: function(progLevel){
      var lv = byProg[String(progLevel).toUpperCase()];
      return lv ? (lv.edu || 'NE') : 'NE';
    },

    /**
     * Comparer deux niveaux (pour tri, progression).
     * @returns {number} Négatif si a < b, positif si a > b, 0 si égaux
     */
    compare: function(a, b){
      return this.toInternal(a) - this.toInternal(b);
    },

    /**
     * Le niveau est-il considéré comme "acquis" (≥ Maîtrisé) ?
     * @param {number|string} input
     * @returns {boolean}
     */
    isAcquis: function(input){
      return this.toInternal(input) >= 5;
    },

    /**
     * Le niveau est-il évaluable (pas NE, ABS, IMP, VAL) ?
     * @param {number|string} input
     * @returns {boolean}
     */
    isEvaluable: function(input){
      var lv = this.resolve(input);
      return lv ? lv.evaluable : false;
    }
  };

  console.log('[levels-registry] Registre de niveaux charg\u00e9 — ' + LEVELS.length + ' niveaux');
})();
