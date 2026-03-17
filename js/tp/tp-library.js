/**
 * INERWEB — Bibliothèque TP universelle v1.0
 * Gestion du catalogue TP, mappings référentiels, génération de cartes d'évaluation.
 *
 * Dépendances : js/shared/levels-registry.js (optionnel), js/eval/eval-engine.js (optionnel)
 */
(function(){
  'use strict';

  var _catalogue = [];    // TP bruts
  var _mappings = [];     // Correspondances formation
  var _indexById = {};    // tpId → TP
  var _indexByTheme = {}; // theme → [TP]
  var _indexByTag = {};   // tag → [TP]
  var _ready = false;
  var _callbacks = [];

  // ═══════════════════════════════════════════════════════════
  // CHARGEMENT
  // ═══════════════════════════════════════════════════════════

  /**
   * Charge le catalogue et les mappings depuis les fichiers JSON.
   * Fallback : données inline si fetch échoue.
   */
  async function load(){
    try {
      var [catResp, mapResp] = await Promise.all([
        fetch('data/tp-library/catalogue.json'),
        fetch('data/tp-mappings/mappings.json')
      ]);
      if(catResp.ok){
        var catData = await catResp.json();
        _catalogue = catData.tps || [];
      }
      if(mapResp.ok){
        var mapData = await mapResp.json();
        _mappings = mapData.mappings || [];
      }
    } catch(e){
      console.warn('[tp-library] Chargement JSON \u00e9chou\u00e9, fallback vide:', e.message);
    }

    // Construire les index
    _buildIndexes();
    _ready = true;
    _callbacks.forEach(function(cb){ try{ cb(); }catch(e){} });
    _callbacks = [];
    console.log('[tp-library] Catalogue charg\u00e9 : ' + _catalogue.length + ' TP, ' + _mappings.length + ' mappings');
  }

  function _buildIndexes(){
    _indexById = {};
    _indexByTheme = {};
    _indexByTag = {};

    _catalogue.forEach(function(tp){
      _indexById[tp.id] = tp;

      // Index par thème
      var theme = tp.theme || 'autre';
      if(!_indexByTheme[theme]) _indexByTheme[theme] = [];
      _indexByTheme[theme].push(tp);

      // Index par tag
      (tp.tags || []).forEach(function(tag){
        var t = tag.toLowerCase();
        if(!_indexByTag[t]) _indexByTag[t] = [];
        _indexByTag[t].push(tp);
      });
    });
  }

  // ═══════════════════════════════════════════════════════════
  // REQUÊTES SUR LE CATALOGUE
  // ═══════════════════════════════════════════════════════════

  /** Tous les TP. */
  function getAll(){ return _catalogue.slice(); }

  /** TP par ID. */
  function getById(id){ return _indexById[id] || null; }

  /** TP par thème. */
  function getByTheme(theme){ return (_indexByTheme[theme] || []).slice(); }

  /** TP par tag. */
  function getByTag(tag){ return (_indexByTag[tag.toLowerCase()] || []).slice(); }

  /** Thèmes disponibles. */
  function getThemes(){ return Object.keys(_indexByTheme).sort(); }

  /** Types disponibles. */
  function getTypes(){
    var types = {};
    _catalogue.forEach(function(tp){ types[tp.type || 'autre'] = true; });
    return Object.keys(types).sort();
  }

  /**
   * Recherche multicritère.
   * @param {Object} filters — {theme, type, formation, dureeMax, difficulte, tag, query}
   * @returns {Array}
   */
  function search(filters){
    filters = filters || {};
    var results = _catalogue.slice();

    if(filters.theme){
      results = results.filter(function(tp){ return tp.theme === filters.theme; });
    }
    if(filters.type){
      results = results.filter(function(tp){ return tp.type === filters.type; });
    }
    if(filters.dureeMax){
      results = results.filter(function(tp){ return (tp.duree || 999) <= filters.dureeMax; });
    }
    if(filters.difficulte){
      results = results.filter(function(tp){ return tp.difficulte === filters.difficulte; });
    }
    if(filters.tag){
      var tag = filters.tag.toLowerCase();
      results = results.filter(function(tp){
        return (tp.tags || []).some(function(t){ return t.toLowerCase().indexOf(tag) !== -1; });
      });
    }
    if(filters.scope){
      results = results.filter(function(tp){ return tp.scope === filters.scope; });
    }
    if(filters.query){
      var q = filters.query.toLowerCase();
      results = results.filter(function(tp){
        return (tp.titre || '').toLowerCase().indexOf(q) !== -1 ||
               (tp.description || '').toLowerCase().indexOf(q) !== -1 ||
               (tp.sousTitre || '').toLowerCase().indexOf(q) !== -1;
      });
    }
    if(filters.formation){
      var tpIdsForFormation = {};
      _mappings.forEach(function(m){
        if(m.formation === filters.formation) tpIdsForFormation[m.tpId] = true;
      });
      results = results.filter(function(tp){ return tpIdsForFormation[tp.id]; });
    }
    if(filters.competence){
      var tpIdsForComp = {};
      _mappings.forEach(function(m){
        (m.competences || []).forEach(function(c){
          if(c.code === filters.competence) tpIdsForComp[m.tpId] = true;
        });
      });
      results = results.filter(function(tp){ return tpIdsForComp[tp.id]; });
    }

    return results;
  }

  // ═══════════════════════════════════════════════════════════
  // MAPPINGS RÉFÉRENTIELS
  // ═══════════════════════════════════════════════════════════

  /**
   * Obtenir tous les mappings d'un TP.
   * @param {string} tpId
   * @returns {Array} Mappings pour toutes les formations
   */
  function getMappings(tpId){
    return _mappings.filter(function(m){ return m.tpId === tpId; });
  }

  /**
   * Obtenir le mapping d'un TP pour une formation spécifique.
   * @param {string} tpId
   * @param {string} formation — CAP_IFCA, BAC_MFER, TNE
   * @returns {Object|null}
   */
  function getMapping(tpId, formation){
    return _mappings.find(function(m){
      return m.tpId === tpId && m.formation === formation;
    }) || null;
  }

  /**
   * Formations disponibles pour un TP.
   * @param {string} tpId
   * @returns {Array<string>}
   */
  function getFormationsForTp(tpId){
    var formations = {};
    _mappings.forEach(function(m){
      if(m.tpId === tpId) formations[m.formation] = true;
    });
    return Object.keys(formations);
  }

  /**
   * TP disponibles pour une compétence.
   * @param {string} compCode — Code compétence
   * @param {string} [formation] — Filtre formation
   * @returns {Array<Object>} [{tp, mapping}]
   */
  function getTpsForCompetence(compCode, formation){
    var results = [];
    _mappings.forEach(function(m){
      if(formation && m.formation !== formation) return;
      var hasComp = (m.competences || []).some(function(c){ return c.code === compCode; });
      if(hasComp){
        var tp = _indexById[m.tpId];
        if(tp) results.push({tp: tp, mapping: m});
      }
    });
    return results;
  }

  // ═══════════════════════════════════════════════════════════
  // GÉNÉRATION DE CARTE D'ÉVALUATION
  // ═══════════════════════════════════════════════════════════

  /**
   * Génère une carte d'évaluation adaptée à une formation.
   * @param {string} tpId
   * @param {string} formation
   * @returns {Object|null} Carte d'évaluation {tp, formation, competences, criteres, niveaux}
   */
  function generateEvalCard(tpId, formation){
    var tp = _indexById[tpId];
    var mapping = getMapping(tpId, formation);
    if(!tp || !mapping) return null;

    var card = {
      tpId: tp.id,
      tpTitre: tp.titre,
      tpSousTitre: tp.sousTitre || '',
      formation: mapping.formation,
      epreuve: mapping.epreuve,
      duree: mapping.dureeAdaptee || tp.duree,
      remarques: mapping.remarques || '',
      sequencesSuggerees: mapping.sequencesSuggerees || [],
      competences: []
    };

    (mapping.competences || []).forEach(function(compMapping){
      var compCard = {
        code: compMapping.code,
        niveauAttendu: compMapping.niveauAttendu,
        niveauAttenduLabel: '',
        contexte: compMapping.contexte || '',
        criteres: (compMapping.criteres || []).map(function(crit){
          return {
            libelle: crit,
            niveauObserve: 0 // À remplir par l'évaluateur
          };
        }),
        niveauObserve: 0,
        commentaire: ''
      };

      // Résoudre le label du niveau attendu
      if(window.iwLevels){
        compCard.niveauAttenduLabel = window.iwLevels.display(compMapping.niveauAttendu, 'long');
      }

      card.competences.push(compCard);
    });

    return card;
  }

  /**
   * Génère les cartes d'évaluation pour un TP dans toutes les formations.
   * @param {string} tpId
   * @returns {Array<Object>} Cartes par formation
   */
  function generateAllEvalCards(tpId){
    var formations = getFormationsForTp(tpId);
    return formations.map(function(f){ return generateEvalCard(tpId, f); })
      .filter(function(c){ return c !== null; });
  }

  // ═══════════════════════════════════════════════════════════
  // INTÉGRATION AVEC LE MOTEUR D'ÉVALUATION
  // ═══════════════════════════════════════════════════════════

  /**
   * Enregistre les évaluations d'une carte remplie dans l'event log.
   * @param {Object} card — Carte d'évaluation avec niveaux observés
   * @param {string} eleveId — Code élève
   * @param {Object} [opts] — seanceId, phase
   * @returns {Promise<Array>} Événements créés
   */
  async function submitEvalCard(card, eleveId, opts){
    if(!window.iwEval) return [];
    opts = opts || {};
    var events = [];

    for(var i = 0; i < card.competences.length; i++){
      var comp = card.competences[i];
      if(comp.niveauObserve > 0){
        var evt = await window.iwEval.grid(
          eleveId,
          card.epreuve || '',
          comp.code,
          comp.niveauObserve,
          {
            contexte: comp.contexte,
            phase: opts.phase || 'formatif',
            seanceId: opts.seanceId || null,
            commentaire: comp.commentaire || '',
            source: 'tp-library'
          }
        );
        events.push(evt);
      }
    }

    return events;
  }

  // ═══════════════════════════════════════════════════════════
  // GESTION (AJOUT / MODIFICATION)
  // ═══════════════════════════════════════════════════════════

  /**
   * Ajouter un TP au catalogue (en mémoire).
   * @param {Object} tp — Objet TP complet
   * @returns {Object} TP ajouté
   */
  function addTp(tp){
    if(!tp.id) tp.id = 'TP-' + String(_catalogue.length + 1).padStart(3, '0');
    if(!tp.version) tp.version = '1.0';
    if(!tp.statut) tp.statut = 'brouillon';
    if(!tp.scope) tp.scope = 'private';
    if(!tp.tags) tp.tags = [];
    _catalogue.push(tp);
    _buildIndexes();
    return tp;
  }

  /**
   * Met à jour un TP existant dans le catalogue.
   * @param {Object} tp — TP avec id existant
   * @returns {Object|null} TP mis à jour ou null si non trouvé
   */
  function updateTp(tp){
    if(!tp.id) return null;
    var idx = _catalogue.findIndex(function(t){ return t.id === tp.id; });
    if(idx === -1) return null;
    _catalogue[idx] = tp;
    _buildIndexes();
    return tp;
  }

  /**
   * Supprime un TP du catalogue (scope private uniquement).
   * @param {string} tpId
   * @returns {boolean}
   */
  function deleteTp(tpId){
    var idx = _catalogue.findIndex(function(t){ return t.id === tpId; });
    if(idx === -1) return false;
    if(_catalogue[idx].scope !== 'private') return false;
    _catalogue.splice(idx, 1);
    _buildIndexes();
    return true;
  }

  /**
   * Ajouter un mapping référentiel.
   * @param {Object} mapping
   */
  function addMapping(mapping){
    _mappings.push(mapping);
  }

  /**
   * Sauvegarder le catalogue et les mappings dans localStorage (fallback).
   */
  function saveLocal(){
    try {
      localStorage.setItem('iw-tp-catalogue', JSON.stringify(_catalogue));
      localStorage.setItem('iw-tp-mappings', JSON.stringify(_mappings));
    } catch(e){
      console.warn('[tp-library] Sauvegarde locale \u00e9chou\u00e9e:', e.message);
    }
  }

  /**
   * Charger les TP privés depuis localStorage.
   */
  function loadPrivate(){
    try {
      var cat = localStorage.getItem('iw-tp-catalogue');
      var map = localStorage.getItem('iw-tp-mappings');
      if(cat){
        var privateTps = JSON.parse(cat).filter(function(tp){ return tp.scope === 'private'; });
        privateTps.forEach(function(tp){
          if(!_indexById[tp.id]){
            _catalogue.push(tp);
          }
        });
      }
      if(map){
        var privateMaps = JSON.parse(map);
        privateMaps.forEach(function(m){
          var exists = _mappings.some(function(existing){
            return existing.tpId === m.tpId && existing.formation === m.formation;
          });
          if(!exists) _mappings.push(m);
        });
      }
      _buildIndexes();
    } catch(e){}
  }

  // ═══════════════════════════════════════════════════════════
  // POINTS D'ENTRÉE ASSISTANT IA
  // ═══════════════════════════════════════════════════════════

  /**
   * Contexte pour l'assistant : description complète d'un TP avec tous ses mappings.
   * @param {string} tpId
   * @returns {Object} Données structurées pour prompt IA
   */
  function getAIContext(tpId){
    var tp = _indexById[tpId];
    if(!tp) return null;
    return {
      tp: tp,
      mappings: getMappings(tpId),
      evalCards: generateAllEvalCards(tpId),
      formations: getFormationsForTp(tpId)
    };
  }

  /**
   * Recherche de TP pour l'assistant : par compétence, durée, thème.
   * @param {Object} criteria
   * @returns {Array<Object>} Résultats enrichis
   */
  function aiSearch(criteria){
    var results = search(criteria);
    return results.map(function(tp){
      return {
        tp: tp,
        mappings: getMappings(tp.id),
        formations: getFormationsForTp(tp.id)
      };
    });
  }

  /**
   * Suggestion de TP pour une compétence dans une formation.
   * @param {string} compCode
   * @param {string} formation
   * @param {Object} [constraints] — dureeMax, difficulte
   * @returns {Array<Object>}
   */
  function suggestForCompetence(compCode, formation, constraints){
    constraints = constraints || {};
    var tps = getTpsForCompetence(compCode, formation);

    if(constraints.dureeMax){
      tps = tps.filter(function(r){
        return (r.mapping.dureeAdaptee || r.tp.duree || 999) <= constraints.dureeMax;
      });
    }
    if(constraints.difficulte){
      tps = tps.filter(function(r){
        return r.tp.difficulte === constraints.difficulte;
      });
    }

    // Trier par pertinence (difficulté croissante)
    tps.sort(function(a, b){
      return (a.tp.difficulte || 0) - (b.tp.difficulte || 0);
    });

    return tps;
  }

  // ═══════════════════════════════════════════════════════════
  // INTÉGRATION PROGRESSION
  // ═══════════════════════════════════════════════════════════

  /**
   * TP rattachables à une séquence.
   * @param {string} sequenceId — Ex: 'S1'
   * @param {string} formation
   * @returns {Array<Object>}
   */
  function getTpsForSequence(sequenceId, formation){
    return _mappings
      .filter(function(m){
        return m.formation === formation &&
               (m.sequencesSuggerees || []).indexOf(sequenceId) !== -1;
      })
      .map(function(m){
        return { tp: _indexById[m.tpId], mapping: m };
      })
      .filter(function(r){ return r.tp; });
  }

  /**
   * Vérifie quels TP ont déjà été utilisés (via event log).
   * @param {string} formation
   * @returns {Promise<Object>} {tpId: {count, lastDate, eleves}}
   */
  async function getUsageHistory(formation){
    var usage = {};
    if(!window.iwEvents) return usage;

    var events = await window.iwEvents.getAllEvents();
    events.forEach(function(evt){
      if(evt.source === 'tp-library' && evt.donnees){
        var tpId = evt.donnees.tpId;
        if(tpId){
          if(!usage[tpId]) usage[tpId] = {count: 0, lastDate: '', eleves: {}};
          usage[tpId].count++;
          if(evt.timestamp > usage[tpId].lastDate) usage[tpId].lastDate = evt.timestamp;
          if(evt.cible) usage[tpId].eleves[evt.cible] = true;
        }
      }
    });

    return usage;
  }

  // ═══════════════════════════════════════════════════════════
  // API PUBLIQUE
  // ═══════════════════════════════════════════════════════════

  window.iwTpLibrary = {
    // Chargement
    load: load,
    loadPrivate: loadPrivate,
    isReady: function(){ return _ready; },
    onReady: function(cb){ if(_ready) cb(); else _callbacks.push(cb); },

    // Catalogue
    getAll: getAll,
    getById: getById,
    getByTheme: getByTheme,
    getByTag: getByTag,
    getThemes: getThemes,
    getTypes: getTypes,
    search: search,
    addTp: addTp,
    updateTp: updateTp,
    deleteTp: deleteTp,
    saveLocal: saveLocal,

    // Mappings
    getMappings: getMappings,
    getMapping: getMapping,
    getFormationsForTp: getFormationsForTp,
    getTpsForCompetence: getTpsForCompetence,
    getTpsForSequence: getTpsForSequence,
    addMapping: addMapping,

    // Cartes d'évaluation
    generateEvalCard: generateEvalCard,
    generateAllEvalCards: generateAllEvalCards,
    submitEvalCard: submitEvalCard,

    // Progression
    getUsageHistory: getUsageHistory,

    // Assistant IA
    getAIContext: getAIContext,
    aiSearch: aiSearch,
    suggestForCompetence: suggestForCompetence
  };

  // Auto-chargement
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ load(); });
  } else {
    setTimeout(load, 100);
  }

})();
