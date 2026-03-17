/**
 * classes-registry.js — Registre centralisé des classes inerWeb
 * Module IIFE exposant window.iwClasses
 * Charge data/formations.json ou utilise le fallback FILIERES global
 */
(function () {
  'use strict';

  var _data = null;       // formations.json parsé
  var _aliases = {};      // clé = nom quelconque → valeur = nom canonique (PROG+)
  var _classesList = [];  // toutes les classes connues (noms canoniques)
  var _formationMap = {}; // clé = nom classe (canonique ou alias) → formation
  var _sequencesMap = {}; // clé = nom classe → séquences[]
  var _niveauxMapping = null;
  var _ready = false;
  var _readyCallbacks = [];

  // ── Utilitaires ──────────────────────────────────────────
  function norm(s) {
    return (s || '').trim();
  }

  // ── Construction des index ───────────────────────────────
  function buildIndex(data) {
    try {
      _data = data;
      _niveauxMapping = data.niveaux_mapping || null;
      var formations = data.formations || [];

      formations.forEach(function (f) {
        // Classes PROG+ (depuis FILIERES historique ou déduites)
        var classesFromSeq = f.sequences ? Object.keys(f.sequences) : [];
        var aliases = f.aliases_classes || {};

        // Enregistrer toutes les classes de cette formation
        classesFromSeq.forEach(function (cl) {
          if (_classesList.indexOf(cl) === -1) _classesList.push(cl);
          _formationMap[cl] = f;
          if (f.sequences && f.sequences[cl]) {
            _sequencesMap[cl] = f.sequences[cl];
          }
        });

        // Construire la table d'aliases bidirectionnelle
        Object.keys(aliases).forEach(function (from) {
          var to = aliases[from];
          _aliases[norm(from)] = norm(to);
        });
      });

      _ready = true;
      _readyCallbacks.forEach(function (cb) { try { cb(); } catch (e) { /* silencieux */ } });
      _readyCallbacks = [];
    } catch (err) {
      console.warn('[iwClasses] Erreur construction index :', err);
    }
  }

  // ── Fallback FILIERES (globale PROG+) ────────────────────
  function buildFromFilieres() {
    try {
      if (typeof FILIERES === 'undefined') return false;
      var data = { formations: [], niveaux_mapping: null };
      Object.keys(FILIERES).forEach(function (id) {
        var fil = FILIERES[id];
        var formation = {
          id: id,
          nom: fil.nom || id,
          aliases_classes: {},
          sequences: {}
        };
        (fil.classes || []).forEach(function (cl) {
          formation.sequences[cl] = [];
        });
        data.formations.push(formation);
      });
      buildIndex(data);
      return true;
    } catch (e) {
      console.warn('[iwClasses] Fallback FILIERES echoue :', e);
      return false;
    }
  }

  // ── Chargement formations.json ───────────────────────────
  function loadJSON() {
    // Determiner le chemin relatif vers data/formations.json
    var base = '';
    try {
      var scripts = document.querySelectorAll('script[src*="classes-registry"]');
      if (scripts.length) {
        var src = scripts[scripts.length - 1].src;
        // remonter depuis js/shared/ vers la racine
        base = src.replace(/js\/shared\/classes-registry\.js.*$/, '');
      }
    } catch (e) { /* ignore */ }

    // Si pas de base, tenter des chemins relatifs courants
    var paths = [
      base + 'data/formations.json',
      './data/formations.json',
      '../data/formations.json',
      '../../data/formations.json'
    ];

    // Dedupliquer
    var seen = {};
    paths = paths.filter(function (p) {
      if (seen[p]) return false;
      seen[p] = true;
      return true;
    });

    function tryFetch(idx) {
      if (idx >= paths.length) {
        // Aucun chemin n'a fonctionné → fallback
        if (!buildFromFilieres()) {
          console.warn('[iwClasses] Aucune source de donnees disponible');
          _ready = true;
          _readyCallbacks.forEach(function (cb) { try { cb(); } catch (e) { /* */ } });
          _readyCallbacks = [];
        }
        return;
      }
      fetch(paths[idx])
        .then(function (resp) {
          if (!resp.ok) throw new Error(resp.status);
          return resp.json();
        })
        .then(function (json) {
          buildIndex(json);
        })
        .catch(function () {
          tryFetch(idx + 1);
        });
    }

    tryFetch(0);
  }

  // ── API publique ─────────────────────────────────────────
  function resolve(classeName) {
    var n = norm(classeName);
    if (!n) return n;
    // Deja canonique ?
    if (_formationMap[n]) return n;
    // Alias ?
    var alias = _aliases[n];
    if (alias && _formationMap[alias]) return alias;
    // Chercher dans l'autre sens
    if (_formationMap[n]) return n;
    // Dernier recours : retourner tel quel
    return n;
  }

  function getAll() {
    return _classesList.slice();
  }

  function getFormation(classeName) {
    var canonical = resolve(classeName);
    return _formationMap[canonical] || null;
  }

  function getSequences(classeName) {
    var n = norm(classeName);
    // D'abord chercher avec le nom exact
    if (_sequencesMap[n]) return _sequencesMap[n];
    // Puis avec le nom canonique
    var canonical = resolve(n);
    return _sequencesMap[canonical] || [];
  }

  function mapLevel(niveau, from, to) {
    if (!_niveauxMapping) return niveau;
    var key = norm(from) + '_to_' + norm(to);
    var table = _niveauxMapping[key] || null;
    if (!table) return niveau;
    var mapped = table[String(niveau)];
    return mapped !== undefined ? mapped : niveau;
  }

  function onReady(cb) {
    if (_ready) {
      try { cb(); } catch (e) { /* */ }
    } else {
      _readyCallbacks.push(cb);
    }
  }

  // ── Exposition globale ───────────────────────────────────
  window.iwClasses = {
    getAll: getAll,
    resolve: resolve,
    getFormation: getFormation,
    getSequences: getSequences,
    mapLevel: mapLevel,
    onReady: onReady,
    get ready() { return _ready; },
    get data() { return _data; }
  };

  // ── Demarrage ────────────────────────────────────────────
  try {
    loadJSON();
  } catch (e) {
    console.warn('[iwClasses] Erreur au demarrage :', e);
    if (!buildFromFilieres()) {
      _ready = true;
    }
  }

})();
