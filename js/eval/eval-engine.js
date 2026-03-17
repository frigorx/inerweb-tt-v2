/**
 * INERWEB — Moteur d'évaluation unifié v1.0
 * Point d'entrée unique pour toute évaluation (rapide, grille, PFMP, CCF).
 * Repose sur iwEvents (event log) et iwLevels (registre niveaux).
 *
 * Dépendances : js/core/events.js, js/shared/levels-registry.js
 */
(function(){
  'use strict';

  // Attente des dépendances
  var ready = false;
  var readyCallbacks = [];

  function checkReady(){
    if(window.iwEvents && window.iwLevels){
      ready = true;
      readyCallbacks.forEach(function(cb){ try{ cb(); }catch(e){} });
      readyCallbacks = [];
      return true;
    }
    return false;
  }

  var checkTimer = setInterval(function(){
    if(checkReady()) clearInterval(checkTimer);
  }, 100);
  setTimeout(function(){ clearInterval(checkTimer); }, 15000);

  // ═══════════════════════════════════════════════════════════
  // FONCTIONS DE CRÉATION D'ÉVALUATION
  // ═══════════════════════════════════════════════════════════

  /**
   * Saisie rapide — 3 taps (compatible Édu)
   * @param {string} eleveId — Code élève
   * @param {string} compCode — Code compétence
   * @param {number|string} niveau — N'importe quel format de niveau
   * @param {Object} [opts] — Options : seanceId, commentaire, bulk
   * @returns {Promise<Object>} Événement créé
   */
  function quickEval(eleveId, compCode, niveau, opts){
    opts = opts || {};
    var lvInternal = window.iwLevels.toInternal(niveau);
    return window.iwEvents.pushEvent('eval.level_set', eleveId, {
      competence: compCode,
      niveau: lvInternal,
      seanceId: opts.seanceId || null,
      phase: opts.phase || 'formatif',
      commentaire: opts.commentaire || '',
      evaluateur: opts.evaluateur || _getEvaluateur(),
      bulk: !!opts.bulk
    }, opts.source || _detectSource());
  }

  /**
   * Évaluation structurée (grille PROG+)
   * @param {string} eleveId
   * @param {string} epreuve — EP2, EP3, E31, E32, E33...
   * @param {string} compCode
   * @param {number|string} niveau
   * @param {Object} [opts] — contexte, critere, phase, commentaire
   * @returns {Promise<Object>}
   */
  function gridEval(eleveId, epreuve, compCode, niveau, opts){
    opts = opts || {};
    var lvInternal = window.iwLevels.toInternal(niveau);
    return window.iwEvents.pushEvent('eval.created', eleveId, {
      competence: compCode,
      niveau: lvInternal,
      epreuve: epreuve,
      critere: opts.critere || '',
      contexte: opts.contexte || '',
      phase: opts.phase || 'formatif',
      commentaire: opts.commentaire || '',
      evaluateur: opts.evaluateur || _getEvaluateur(),
      seanceId: opts.seanceId || null
    }, opts.source || 'prog');
  }

  /**
   * Évaluation PFMP / tuteur
   * @param {string} eleveId
   * @param {string} compCode
   * @param {number|string} niveau
   * @param {Object} opts — pfmpNum (1 ou 2), tuteurNom, epreuve, commentaire
   * @returns {Promise<Object>}
   */
  function pfmpEval(eleveId, compCode, niveau, opts){
    opts = opts || {};
    var lvInternal = window.iwLevels.toInternal(niveau);
    var contexte = 'pfmp' + (opts.pfmpNum || 1);
    return window.iwEvents.pushEvent('eval.pfmp_recorded', eleveId, {
      competence: compCode,
      niveau: lvInternal,
      epreuve: opts.epreuve || '',
      contexte: contexte,
      phase: 'pfmp',
      tuteurNom: opts.tuteurNom || '',
      commentaire: opts.commentaire || '',
      evaluateur: opts.evaluateur || opts.tuteurNom || _getEvaluateur()
    }, opts.source || 'tuteur');
  }

  /**
   * Évaluation CCF (certificative)
   * @param {string} eleveId
   * @param {string} epreuve
   * @param {string} compCode
   * @param {number|string} niveau
   * @param {Object} [opts] — session, contexte, commentaire
   * @returns {Promise<Object>}
   */
  function ccfEval(eleveId, epreuve, compCode, niveau, opts){
    opts = opts || {};
    var lvInternal = window.iwLevels.toInternal(niveau);
    return window.iwEvents.pushEvent('eval.ccf_recorded', eleveId, {
      competence: compCode,
      niveau: lvInternal,
      epreuve: epreuve,
      contexte: opts.contexte || '',
      phase: 'certificatif',
      session: opts.session || _getCurrentSession(),
      commentaire: opts.commentaire || '',
      evaluateur: opts.evaluateur || _getEvaluateur()
    }, opts.source || 'prog');
  }

  /**
   * Évaluation par lot (multi-élèves, même compétence)
   * @param {Array<string>} eleveIds
   * @param {string} compCode
   * @param {number|string} niveau
   * @param {Object} [opts]
   * @returns {Promise<Array>}
   */
  function bulkEval(eleveIds, compCode, niveau, opts){
    opts = opts || {};
    opts.bulk = true;
    var promises = eleveIds.map(function(id){
      return quickEval(id, compCode, niveau, opts);
    });
    // Événement de synthèse
    window.iwEvents.pushEvent('eval.bulk_applied', 'bulk', {
      competence: compCode,
      niveau: window.iwLevels.toInternal(niveau),
      count: eleveIds.length,
      eleveIds: eleveIds
    }, opts.source || _detectSource());
    return Promise.all(promises);
  }

  /**
   * Ajouter un commentaire à une compétence
   * @param {string} eleveId
   * @param {string} compCode
   * @param {string} commentaire
   * @param {Object} [opts] — epreuve, seanceId
   * @returns {Promise<Object>}
   */
  function addComment(eleveId, compCode, commentaire, opts){
    opts = opts || {};
    return window.iwEvents.pushEvent('eval.comment_added', eleveId, {
      competence: compCode,
      commentaire: commentaire,
      epreuve: opts.epreuve || '',
      seanceId: opts.seanceId || null,
      evaluateur: opts.evaluateur || _getEvaluateur()
    }, opts.source || _detectSource());
  }

  /**
   * Marquer une grille comme complète
   * @param {string} eleveId
   * @param {string} epreuve
   * @returns {Promise<Object>}
   */
  function completeGrid(eleveId, epreuve){
    return window.iwEvents.pushEvent('eval.grid_completed', eleveId, {
      epreuve: epreuve,
      evaluateur: _getEvaluateur(),
      timestamp_completion: new Date().toISOString()
    }, 'prog');
  }

  /**
   * Enregistrer une note calculée
   * @param {string} eleveId
   * @param {string} epreuve
   * @param {number} note — Note /20
   * @param {Object} details — Détails du calcul
   * @returns {Promise<Object>}
   */
  function recordNote(eleveId, epreuve, note, details){
    return window.iwEvents.pushEvent('eval.note_generated', eleveId, {
      epreuve: epreuve,
      note: note,
      eligible: note >= 10,
      details: details || {},
      evaluateur: _getEvaluateur()
    }, 'prog');
  }

  /**
   * Suppression logique (annulation d'évaluation)
   * @param {string} eleveId
   * @param {string} eventIdOriginal — ID de l'événement à annuler
   * @param {string} motif
   * @returns {Promise<Object>}
   */
  function deleteEval(eleveId, eventIdOriginal, motif){
    return window.iwEvents.pushEvent('eval.deleted', eleveId, {
      eventIdOriginal: eventIdOriginal,
      motif: motif || '',
      evaluateur: _getEvaluateur()
    }, _detectSource());
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS INTERNES
  // ═══════════════════════════════════════════════════════════

  function _getEvaluateur(){
    // PROG+
    if(window.appState && window.appState.config && window.appState.config.nomProf)
      return window.appState.config.nomProf;
    // Édu
    if(window.CFG && window.CFG.enseignantNom)
      return window.CFG.enseignantNom;
    return 'Enseignant';
  }

  function _detectSource(){
    // Détecte si on est dans Édu ou PROG+
    if(window.CFG && window.CFG.enseignantId) return 'edu';
    if(window.appState) return 'prog';
    return 'prog';
  }

  function _getCurrentSession(){
    var now = new Date();
    var year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    return year + '-' + (year + 1);
  }

  // ═══════════════════════════════════════════════════════════
  // API PUBLIQUE
  // ═══════════════════════════════════════════════════════════

  window.iwEval = {
    // Création
    quick: quickEval,
    grid: gridEval,
    pfmp: pfmpEval,
    ccf: ccfEval,
    bulk: bulkEval,
    comment: addComment,
    completeGrid: completeGrid,
    recordNote: recordNote,
    deleteEval: deleteEval,

    // État
    isReady: function(){ return ready; },
    onReady: function(cb){
      if(ready) cb();
      else readyCallbacks.push(cb);
    }
  };

  console.log('[eval-engine] Moteur d\'\u00e9valuation unifi\u00e9 charg\u00e9');
})();
