/**
 * INERWEB — Projections d'évaluation v1.0
 * Reconstruit l'état courant à partir de l'event log.
 * Fournit des vues matérialisées pour le dashboard, radar, alertes.
 *
 * Dépendances : js/core/events.js, js/shared/levels-registry.js
 */
(function(){
  'use strict';

  // Cache des projections (reconstruit à la demande)
  var _cache = {
    lastLevel: {},      // "eleveId|compCode" → {niveau, timestamp, source}
    lastLevelByEp: {},  // "eleveId|epreuve|compCode" → {niveau, timestamp}
    history: {},        // "eleveId|compCode" → [{niveau, timestamp, source, ...}]
    comments: {},       // "eleveId|compCode" → dernier commentaire
    classeProgress: {}, // "classe" → {eleveId: pct, ...}
    ccfCount: {},       // "eleveId|compCode" → nombre de fois niveau >= 5
    notes: {},          // "eleveId|epreuve" → {note, eligible, details}
    deletedIds: {},     // eventId → true (événements annulés)
    built: false
  };

  // Types d'événements d'évaluation
  var EVAL_TYPES = [
    'eval.created', 'eval.updated', 'eval.level_set',
    'eval.pfmp_recorded', 'eval.ccf_recorded',
    'eval.bulk_applied', 'eval.comment_added',
    'eval.note_generated', 'eval.deleted', 'eval.grid_completed',
    // Rétro-compatibilité
    'validation.enregistree', 'competence.evaluee'
  ];

  /**
   * Reconstruit toutes les projections depuis l'event log.
   * @returns {Promise<void>}
   */
  async function rebuild(){
    // Reset cache
    _cache.lastLevel = {};
    _cache.lastLevelByEp = {};
    _cache.history = {};
    _cache.comments = {};
    _cache.ccfCount = {};
    _cache.notes = {};
    _cache.deletedIds = {};

    if(!window.iwEvents){
      console.warn('[eval-projections] iwEvents non disponible');
      return;
    }

    var allEvents = await window.iwEvents.getAllEvents();
    if(!allEvents || !allEvents.length) {
      _cache.built = true;
      return;
    }

    // Trier par timestamp
    allEvents.sort(function(a, b){
      return (a.timestamp || '').localeCompare(b.timestamp || '');
    });

    // Premier pass : collecter les suppressions
    allEvents.forEach(function(evt){
      if(evt.type === 'eval.deleted' && evt.donnees && evt.donnees.eventIdOriginal){
        _cache.deletedIds[evt.donnees.eventIdOriginal] = true;
      }
    });

    // Deuxième pass : projeter
    allEvents.forEach(function(evt){
      // Ignorer les événements supprimés
      if(_cache.deletedIds[evt.eventId]) return;

      // Ignorer les types non-évaluation
      if(EVAL_TYPES.indexOf(evt.type) === -1) return;

      var d = evt.donnees || {};
      var eleveId = evt.cible || '';
      var comp = d.competence || d.competenceCode || '';
      var ep = d.epreuve || '';

      if(!eleveId || !comp) {
        // Événements spéciaux sans compétence
        if(evt.type === 'eval.note_generated' && eleveId && ep){
          _cache.notes[eleveId + '|' + ep] = {
            note: d.note,
            eligible: d.eligible,
            details: d.details || {},
            timestamp: evt.timestamp
          };
        }
        if(evt.type === 'eval.bulk_applied') return; // Synthèse, pas de projection individuelle
        if(evt.type === 'eval.grid_completed') return;
        if(!comp) return;
      }

      // Résoudre le niveau
      var niveauRaw = d.niveau;
      if(niveauRaw === undefined || niveauRaw === null) {
        // Événement commentaire seul
        if(evt.type === 'eval.comment_added'){
          _cache.comments[eleveId + '|' + comp] = d.commentaire || '';
          return;
        }
        return;
      }

      var niveauInternal = window.iwLevels ? window.iwLevels.toInternal(niveauRaw) : niveauRaw;

      var entry = {
        niveau: niveauInternal,
        timestamp: evt.timestamp,
        source: evt.source || 'prog',
        eventId: evt.eventId,
        evaluateur: d.evaluateur || evt.acteur || '',
        contexte: d.contexte || '',
        phase: d.phase || '',
        seanceId: d.seanceId || null,
        epreuve: ep,
        commentaire: d.commentaire || ''
      };

      // Projection : dernier niveau global
      var keyGlobal = eleveId + '|' + comp;
      _cache.lastLevel[keyGlobal] = entry;

      // Projection : dernier niveau par épreuve
      if(ep){
        var keyEp = eleveId + '|' + ep + '|' + comp;
        _cache.lastLevelByEp[keyEp] = entry;
      }

      // Projection : historique
      if(!_cache.history[keyGlobal]) _cache.history[keyGlobal] = [];
      _cache.history[keyGlobal].push(entry);

      // Projection : compteur CCF (niveaux >= 5 = Maîtrisé)
      if(niveauInternal >= 5){
        var keyCcf = eleveId + '|' + comp;
        _cache.ccfCount[keyCcf] = (_cache.ccfCount[keyCcf] || 0) + 1;
      }

      // Commentaire
      if(d.commentaire){
        _cache.comments[keyGlobal] = d.commentaire;
      }
    });

    _cache.built = true;
    console.log('[eval-projections] Projections reconstruites — ' +
      Object.keys(_cache.lastLevel).length + ' derniers niveaux, ' +
      Object.keys(_cache.history).length + ' historiques');
  }

  // ═══════════════════════════════════════════════════════════
  // REQUÊTES SUR LES PROJECTIONS
  // ═══════════════════════════════════════════════════════════

  /**
   * Dernier niveau connu d'une compétence pour un élève.
   * @param {string} eleveId
   * @param {string} compCode
   * @param {string} [epreuve] — Si spécifié, filtre par épreuve
   * @returns {number} Niveau interne (0-7), 0 si non évalué
   */
  function getLastLevel(eleveId, compCode, epreuve){
    if(epreuve){
      var e = _cache.lastLevelByEp[eleveId + '|' + epreuve + '|' + compCode];
      return e ? e.niveau : 0;
    }
    var g = _cache.lastLevel[eleveId + '|' + compCode];
    return g ? g.niveau : 0;
  }

  /**
   * Détail complet du dernier niveau.
   * @returns {Object|null}
   */
  function getLastLevelDetail(eleveId, compCode, epreuve){
    if(epreuve){
      return _cache.lastLevelByEp[eleveId + '|' + epreuve + '|' + compCode] || null;
    }
    return _cache.lastLevel[eleveId + '|' + compCode] || null;
  }

  /**
   * Historique complet d'une compétence pour un élève.
   * @returns {Array} Trié par timestamp croissant
   */
  function getHistory(eleveId, compCode){
    return (_cache.history[eleveId + '|' + compCode] || []).slice();
  }

  /**
   * Dernier commentaire d'une compétence.
   * @returns {string}
   */
  function getComment(eleveId, compCode){
    return _cache.comments[eleveId + '|' + compCode] || '';
  }

  /**
   * Nombre de fois où le niveau >= Maîtrisé pour une compétence (CCF).
   * @returns {number}
   */
  function getCcfCount(eleveId, compCode){
    return _cache.ccfCount[eleveId + '|' + compCode] || 0;
  }

  /**
   * Compétence CCF validée ? (niveau >= Maîtrisé atteint N fois)
   * @param {number} [threshold=3] — Nombre requis
   * @returns {boolean}
   */
  function isCcfValidated(eleveId, compCode, threshold){
    return getCcfCount(eleveId, compCode) >= (threshold || 3);
  }

  /**
   * Note calculée pour une épreuve.
   * @returns {Object|null} {note, eligible, details, timestamp}
   */
  function getNote(eleveId, epreuve){
    return _cache.notes[eleveId + '|' + epreuve] || null;
  }

  /**
   * Progression d'un élève : % compétences évaluées.
   * @param {string} eleveId
   * @param {Array<string>} competences — Liste des codes compétences attendues
   * @returns {Object} {evaluated, total, pct, details}
   */
  function getProgression(eleveId, competences){
    var evaluated = 0;
    var details = [];
    competences.forEach(function(comp){
      var lv = getLastLevel(eleveId, comp);
      var isEval = lv > 0 && lv !== 1 && lv !== 2; // Exclure ABS et IMP
      if(isEval) evaluated++;
      details.push({comp: comp, niveau: lv, evaluated: isEval});
    });
    return {
      evaluated: evaluated,
      total: competences.length,
      pct: competences.length ? Math.round(evaluated / competences.length * 100) : 0,
      details: details
    };
  }

  /**
   * Progression d'une classe.
   * @param {Array<Object>} eleves — [{code, ...}]
   * @param {Array<string>} competences
   * @returns {Object} {byEleve, moyenne, min, max}
   */
  function getClasseProgression(eleves, competences){
    var byEleve = {};
    var total = 0;
    eleves.forEach(function(e){
      var p = getProgression(e.code, competences);
      byEleve[e.code] = p;
      total += p.pct;
    });
    var n = eleves.length || 1;
    return {
      byEleve: byEleve,
      moyenne: Math.round(total / n),
      min: Math.min.apply(null, Object.values(byEleve).map(function(p){ return p.pct; })),
      max: Math.max.apply(null, Object.values(byEleve).map(function(p){ return p.pct; }))
    };
  }

  /**
   * Compétences non évaluées pour un élève.
   * @param {string} eleveId
   * @param {Array<string>} competences
   * @returns {Array<string>} Codes des compétences non évaluées
   */
  function getUnevaluated(eleveId, competences){
    return competences.filter(function(comp){
      var lv = getLastLevel(eleveId, comp);
      return lv === 0 || lv === 1 || lv === 2;
    });
  }

  /**
   * Données pour le radar de compétences d'un élève.
   * @param {string} eleveId
   * @param {Array<Object>} competences — [{code, nom}]
   * @param {string} [epreuve]
   * @returns {Array<Object>} [{code, nom, niveau, pct, color}]
   */
  function getRadarData(eleveId, competences, epreuve){
    return competences.map(function(c){
      var lv = getLastLevel(eleveId, c.code, epreuve);
      return {
        code: c.code,
        nom: c.nom,
        niveau: lv,
        pct: window.iwLevels ? window.iwLevels.pct(lv) : 0,
        color: window.iwLevels ? window.iwLevels.color(lv) : '#aaa',
        label: window.iwLevels ? window.iwLevels.display(lv, 'short') : '—'
      };
    });
  }

  /**
   * Données pour le radar classe (moyenne par compétence).
   * @param {Array<Object>} eleves
   * @param {Array<Object>} competences
   * @param {string} [epreuve]
   * @returns {Array<Object>} [{code, nom, moyenne, pct, count}]
   */
  function getClasseRadarData(eleves, competences, epreuve){
    return competences.map(function(c){
      var sum = 0, count = 0;
      eleves.forEach(function(e){
        var lv = getLastLevel(e.code, c.code, epreuve);
        if(lv > 2){ // Exclure NE, ABS, IMP
          sum += lv;
          count++;
        }
      });
      var avg = count ? Math.round(sum / count * 10) / 10 : 0;
      return {
        code: c.code,
        nom: c.nom,
        moyenne: avg,
        pct: window.iwLevels ? window.iwLevels.pct(Math.round(avg)) : 0,
        count: count
      };
    });
  }

  /**
   * Statistiques globales d'évaluation.
   * @returns {Object}
   */
  function getStats(){
    var totalEvals = 0;
    Object.keys(_cache.history).forEach(function(k){
      totalEvals += _cache.history[k].length;
    });
    return {
      totalEvals: totalEvals,
      uniqueCompetences: Object.keys(_cache.lastLevel).length,
      ccfValidated: Object.keys(_cache.ccfCount).filter(function(k){ return _cache.ccfCount[k] >= 3; }).length,
      notesGenerated: Object.keys(_cache.notes).length,
      built: _cache.built
    };
  }

  // ═══════════════════════════════════════════════════════════
  // MIGRATION — Importer les validations PROG+ existantes
  // ═══════════════════════════════════════════════════════════

  /**
   * Importe les validations existantes de PROG+ (window.validations)
   * dans l'event log pour unification.
   * ATTENTION : à n'exécuter qu'une seule fois (migration one-shot).
   * @returns {Promise<number>} Nombre d'événements créés
   */
  async function importProgValidations(){
    if(!window.validations || !window.iwEvents) return 0;
    var count = 0;
    var codes = Object.keys(window.validations);

    for(var i = 0; i < codes.length; i++){
      var code = codes[i];
      var vals = window.validations[code] || [];
      for(var j = 0; j < vals.length; j++){
        var v = vals[j];
        var niv = window.iwLevels ? window.iwLevels.toInternal(v.niveau) : 0;

        // Déterminer le type
        var type = 'eval.created';
        if(v.phase === 'pfmp') type = 'eval.pfmp_recorded';
        if(v.phase === 'certificatif') type = 'eval.ccf_recorded';

        await window.iwEvents.pushEvent(type, code, {
          competence: v.competence,
          niveau: niv,
          epreuve: v.epreuve || '',
          critere: v.critere || '',
          contexte: v.contexte || '',
          phase: v.phase || 'formatif',
          evaluateur: v.evaluateur || '',
          commentaire: ''
        }, 'prog-migration');

        count++;
      }
    }
    console.log('[eval-projections] Migration PROG+ : ' + count + ' validations import\u00e9es');
    return count;
  }

  // ═══════════════════════════════════════════════════════════
  // API PUBLIQUE
  // ═══════════════════════════════════════════════════════════

  window.iwEvalProjections = {
    rebuild: rebuild,
    isBuilt: function(){ return _cache.built; },

    // Requêtes unitaires
    getLastLevel: getLastLevel,
    getLastLevelDetail: getLastLevelDetail,
    getHistory: getHistory,
    getComment: getComment,

    // CCF
    getCcfCount: getCcfCount,
    isCcfValidated: isCcfValidated,

    // Notes
    getNote: getNote,

    // Progression
    getProgression: getProgression,
    getClasseProgression: getClasseProgression,
    getUnevaluated: getUnevaluated,

    // Radar
    getRadarData: getRadarData,
    getClasseRadarData: getClasseRadarData,

    // Stats
    getStats: getStats,

    // Migration
    importProgValidations: importProgValidations
  };

  console.log('[eval-projections] Module de projections charg\u00e9');
})();
