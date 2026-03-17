/**
 * INERWEB — Registre élèves unifié v1.0
 * Source de vérité unique pour les identités élèves.
 * Résolution d'alias entre Édu et PROG+, dédoublonnage.
 *
 * Dépendances : js/core/events.js (optionnel)
 */
(function(){
  'use strict';

  // Store interne
  var _students = [];   // Liste canonique
  var _index = {};       // code → student
  var _aliasMap = {};    // alias → code canonique
  var _ready = false;
  var _callbacks = [];

  // ═══════════════════════════════════════════════════════════
  // NORMALISATION
  // ═══════════════════════════════════════════════════════════

  /**
   * Normalise un nom de classe pour comparaison.
   * "CAP IFCA 1" → "cap ifca 1"
   * "CAP1 IFCA" → "cap1 ifca"
   * "2nde TNE" → "2nde tne"
   */
  function normalizeClasse(c){
    return (c || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * Normalise un nom pour matching.
   * Supprime accents, met en majuscules, trim.
   */
  function normalizeName(n){
    return (n || '').trim().toUpperCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Génère une clé de dédoublonnage.
   * Basée sur nom + prénom + classe normalisée.
   */
  function dedupeKey(nom, prenom, classe){
    return normalizeName(nom) + '|' + normalizeName(prenom) + '|' + normalizeClasse(classe);
  }

  /**
   * Normalise un groupe (A/B ou G1/G2 → format unifié).
   */
  function normalizeGroupe(g){
    var s = (g || '').trim().toUpperCase();
    if(s === 'A' || s === 'G1' || s === 'GROUPE A' || s === 'GROUPE 1') return 'A';
    if(s === 'B' || s === 'G2' || s === 'GROUPE B' || s === 'GROUPE 2') return 'B';
    return s || '';
  }

  // ═══════════════════════════════════════════════════════════
  // CHARGEMENT & FUSION
  // ═══════════════════════════════════════════════════════════

  /**
   * Charge les élèves depuis les deux sources et fusionne.
   * PROG+ = source principale (codes ELV-xxx).
   * Édu = source secondaire (codes PREFIX-nn), mappée sur PROG+.
   */
  function loadAndMerge(){
    var dedupeIndex = {};

    // 1. Charger depuis PROG+ (source principale)
    var progStudents = [];
    if(window.appState && window.appState.data && Array.isArray(window.appState.data.students)){
      progStudents = window.appState.data.students;
    } else if(Array.isArray(window.students)){
      progStudents = window.students;
    }

    progStudents.forEach(function(s){
      var student = {
        code: s.code,
        nom: s.nom || '',
        prenom: s.prenom || '',
        classe: s.classe || '',
        groupe: normalizeGroupe(s.groupe),
        annee: s.annee || 1,
        statut: s.statut || 'actif',
        referentiel: s.referentiel || '',
        tokenEleve: s.token_eleve || '',
        tokenTuteur: s.token_tuteur || '',
        telEleve: s.tel_eleve || '',
        telTuteur: s.tel_tuteur || '',
        pfmp1Sem: s.pfmp1_sem || 0,
        pfmp2Sem: s.pfmp2_sem || 0,
        entrepriseNom: s.entreprise_nom || '',
        tuteurNom: s.tuteur_nom || '',
        photo: s.photo || '',
        source: 'prog',
        aliases: []
      };

      var dk = dedupeKey(student.nom, student.prenom, student.classe);
      dedupeIndex[dk] = student;
      _students.push(student);
      _index[student.code] = student;
    });

    // 2. Charger depuis Édu (IndexedDB) — via cache mémoire si disponible
    // Note : l'import Édu est asynchrone si IndexedDB est requis
    // On vérifie d'abord le cache mémoire
    if(window._eduElevesCache && Array.isArray(window._eduElevesCache)){
      _mergeEdu(window._eduElevesCache, dedupeIndex);
    }

    _ready = true;
    _callbacks.forEach(function(cb){ try{ cb(); }catch(e){} });
    _callbacks = [];
  }

  /**
   * Fusionne les élèves Édu dans le registre.
   */
  function _mergeEdu(eduEleves, dedupeIndex){
    eduEleves.forEach(function(e){
      var dk = dedupeKey(e.nom, e.prenom, e.classe);

      if(dedupeIndex[dk]){
        // Match trouvé — ajouter alias
        var existing = dedupeIndex[dk];
        var eduCode = e.code || e.id || '';
        if(eduCode && existing.aliases.indexOf(eduCode) === -1){
          existing.aliases.push(eduCode);
          _aliasMap[eduCode] = existing.code;
        }
        // Enrichir photo si manquante
        if(!existing.photo && e.photo) existing.photo = e.photo;
      } else {
        // Pas de match — créer entrée (élève Édu sans équivalent PROG+)
        var student = {
          code: e.code || e.id || 'EDU-' + _students.length,
          nom: e.nom || '',
          prenom: e.prenom || '',
          classe: e.classe || '',
          groupe: normalizeGroupe(e.groupe),
          annee: 1,
          statut: 'actif',
          referentiel: '',
          tokenEleve: '',
          tokenTuteur: '',
          telEleve: '',
          telTuteur: '',
          pfmp1Sem: 0,
          pfmp2Sem: 0,
          entrepriseNom: '',
          tuteurNom: '',
          photo: e.photo || '',
          source: 'edu',
          aliases: []
        };
        dedupeIndex[dk] = student;
        _students.push(student);
        _index[student.code] = student;
      }
    });
  }

  /**
   * Charge les élèves Édu depuis IndexedDB (asynchrone).
   * @returns {Promise<void>}
   */
  async function loadEduFromIDB(){
    if(!window.iwEvents) return;
    try {
      var eduEleves = await window.iwEvents.dbGetAll('eleves');
      if(eduEleves && eduEleves.length){
        window._eduElevesCache = eduEleves;
        var dedupeIndex = {};
        _students.forEach(function(s){
          dedupeIndex[dedupeKey(s.nom, s.prenom, s.classe)] = s;
        });
        _mergeEdu(eduEleves, dedupeIndex);
      }
    } catch(e){
      console.warn('[student-registry] Erreur chargement Édu IDB:', e.message);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // API PUBLIQUE
  // ═══════════════════════════════════════════════════════════

  window.iwStudents = {

    /**
     * Initialiser le registre (appeler au démarrage).
     * @returns {Promise<void>}
     */
    init: async function(){
      loadAndMerge();
      await loadEduFromIDB();
    },

    /** Tous les élèves. */
    getAll: function(){ return _students.slice(); },

    /** Élèves d'une classe. */
    getByClasse: function(classe){
      var norm = normalizeClasse(classe);
      return _students.filter(function(s){
        return normalizeClasse(s.classe) === norm;
      });
    },

    /**
     * Résoudre un code (accepte code PROG+, code Édu, alias).
     * @param {string} code
     * @returns {Object|null} Élève complet
     */
    resolve: function(code){
      if(!code) return null;
      // Lookup direct
      if(_index[code]) return _index[code];
      // Lookup alias
      var canonical = _aliasMap[code];
      if(canonical && _index[canonical]) return _index[canonical];
      // Recherche insensible à la casse
      var upper = code.toUpperCase();
      for(var k in _index){
        if(k.toUpperCase() === upper) return _index[k];
      }
      return null;
    },

    /**
     * Rechercher un élève par nom/prénom.
     * @param {string} query
     * @returns {Array}
     */
    search: function(query){
      var q = normalizeName(query);
      return _students.filter(function(s){
        return normalizeName(s.nom).indexOf(q) !== -1 ||
               normalizeName(s.prenom).indexOf(q) !== -1 ||
               s.code.toUpperCase().indexOf(q) !== -1;
      });
    },

    /**
     * Obtenir le code canonique d'un alias.
     * @param {string} alias
     * @returns {string} Code canonique ou l'alias lui-même
     */
    getCanonical: function(alias){
      return _aliasMap[alias] || alias;
    },

    /**
     * Vérifier si un élève existe déjà (anti-doublon).
     * @param {string} nom
     * @param {string} prenom
     * @param {string} classe
     * @returns {Object|null} Élève existant ou null
     */
    checkDuplicate: function(nom, prenom, classe){
      var dk = dedupeKey(nom, prenom, classe);
      for(var i = 0; i < _students.length; i++){
        if(dedupeKey(_students[i].nom, _students[i].prenom, _students[i].classe) === dk){
          return _students[i];
        }
      }
      return null;
    },

    /**
     * Ajouter un élève au registre (sans persister — juste mémoire).
     * @param {Object} student
     * @returns {Object} Élève ajouté (avec normalisation)
     */
    add: function(student){
      student.groupe = normalizeGroupe(student.groupe);
      student.source = student.source || 'prog';
      student.aliases = student.aliases || [];
      _students.push(student);
      _index[student.code] = student;
      return student;
    },

    /**
     * Supprimer un élève du registre.
     * @param {string} code
     */
    remove: function(code){
      _students = _students.filter(function(s){ return s.code !== code; });
      delete _index[code];
      // Nettoyer alias
      Object.keys(_aliasMap).forEach(function(a){
        if(_aliasMap[a] === code) delete _aliasMap[a];
      });
    },

    /**
     * Compter les élèves.
     * @param {string} [classe] — Filtrer par classe
     * @returns {number}
     */
    count: function(classe){
      if(!classe) return _students.length;
      return this.getByClasse(classe).length;
    },

    /**
     * Classes distinctes.
     * @returns {Array<string>}
     */
    getClasses: function(){
      var seen = {};
      return _students.map(function(s){ return s.classe; })
        .filter(function(c){ return c && !seen[c] && (seen[c] = true); });
    },

    /** Est-ce que le registre est chargé ? */
    isReady: function(){ return _ready; },

    /** Callback quand prêt. */
    onReady: function(cb){
      if(_ready) cb();
      else _callbacks.push(cb);
    },

    // Utilitaires exposés
    normalizeClasse: normalizeClasse,
    normalizeName: normalizeName,
    normalizeGroupe: normalizeGroupe,
    dedupeKey: dedupeKey
  };

  // Auto-init au chargement
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ loadAndMerge(); });
  } else {
    setTimeout(loadAndMerge, 50);
  }

  console.log('[student-registry] Registre \u00e9l\u00e8ves unifi\u00e9 charg\u00e9');
})();
