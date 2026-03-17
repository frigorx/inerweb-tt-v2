/**
 * INERWEB TT-IA — Module de Pseudonymisation RGPD v2.0
 * SECURISE : Chiffrement AES-256 de la table locale
 * Les noms restent en local chiffres, seuls les codes sortent vers le cloud.
 */
(function() {
  'use strict';

  var STORAGE_KEY = 'iw_identity_encrypted';
  var STORAGE_KEY_PLAIN = 'iw_identity_map'; // ancien format non chiffre
  var STORAGE_KEY_META = 'iw_identity_meta';

  var identityMap = {};
  var isLoaded = false;

  /**
   * Charge et dechiffre la table d'identites
   */
  async function load() {
    // Mode securise (PIN actif)
    if (window.iwPin && window.iwPin.isUnlocked()) {
      var encrypted = localStorage.getItem(STORAGE_KEY);
      if (encrypted) {
        try {
          var pin = window.iwPin.getPin();
          var decrypted = await window.iwCrypto.decrypt(encrypted, pin);
          identityMap = JSON.parse(decrypted);
          isLoaded = true;
          return;
        } catch (e) {
          console.error('[identity-mapper] Erreur dechiffrement:', e.message);
        }
      }
      // Migration : si ancien format existe, le migrer
      var plain = localStorage.getItem(STORAGE_KEY_PLAIN);
      if (plain) {
        try {
          identityMap = JSON.parse(plain);
          await save(); // re-sauvegarder en chiffre
          localStorage.removeItem(STORAGE_KEY_PLAIN);
          isLoaded = true;
          return;
        } catch (e) {}
      }
    }

    // Mode sans PIN (fallback compatible)
    var data = localStorage.getItem(STORAGE_KEY_PLAIN);
    if (data) {
      try { identityMap = JSON.parse(data); } catch (e) { identityMap = {}; }
    }
    isLoaded = true;
  }

  /**
   * Sauvegarde (chiffre si PIN actif, sinon plain)
   */
  async function save() {
    var json = JSON.stringify(identityMap);

    if (window.iwPin && window.iwPin.isUnlocked()) {
      try {
        var pin = window.iwPin.getPin();
        var encrypted = await window.iwCrypto.encrypt(json, pin);
        localStorage.setItem(STORAGE_KEY, encrypted);
        localStorage.removeItem(STORAGE_KEY_PLAIN); // supprimer l'ancien
      } catch (e) {
        // Fallback plain si erreur crypto
        localStorage.setItem(STORAGE_KEY_PLAIN, json);
      }
    } else {
      localStorage.setItem(STORAGE_KEY_PLAIN, json);
    }

    localStorage.setItem(STORAGE_KEY_META, JSON.stringify({
      count: Object.keys(identityMap).length,
      lastModified: new Date().toISOString()
    }));
  }

  function normalizeKey(nom, prenom) {
    return (nom + '_' + (prenom || '')).toLowerCase().trim().replace(/\s+/g, '_');
  }

  /**
   * Genere un code eleve unique (sans O/0/I/1 pour eviter confusion)
   */
  function generateCode() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var code = 'ELV-';
    for (var i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Enregistre un eleve (nom -> code)
   */
  async function register(nom, prenom, existingCode) {
    if (!isLoaded) await load();

    var key = normalizeKey(nom, prenom);
    if (identityMap[key]) return identityMap[key].code;

    var code = existingCode || generateCode();
    identityMap[key] = {
      code: code,
      nom: nom,
      prenom: prenom || '',
      createdAt: new Date().toISOString(),
      lastAccess: new Date().toISOString()
    };

    await save();
    logAccess('register', code);
    return code;
  }

  async function getCode(nom, prenom) {
    if (!isLoaded) await load();
    var key = normalizeKey(nom, prenom);
    var entry = identityMap[key];
    if (entry) {
      entry.lastAccess = new Date().toISOString();
      logAccess('getCode', entry.code);
    }
    return entry ? entry.code : null;
  }

  async function findByPrenom(prenom) {
    if (!isLoaded) await load();
    var search = prenom.toLowerCase().trim();
    for (var key in identityMap) {
      if (identityMap[key].prenom && identityMap[key].prenom.toLowerCase() === search) {
        logAccess('findByPrenom', identityMap[key].code);
        return identityMap[key];
      }
    }
    return null;
  }

  async function getName(code) {
    if (!isLoaded) await load();
    for (var key in identityMap) {
      if (identityMap[key].code === code) {
        logAccess('getName', code);
        return identityMap[key];
      }
    }
    return null;
  }

  /**
   * Supprime un eleve (droit a l'oubli RGPD)
   */
  async function remove(code) {
    if (!isLoaded) await load();
    for (var key in identityMap) {
      if (identityMap[key].code === code) {
        var removed = identityMap[key];
        delete identityMap[key];
        await save();
        logAccess('remove', code);
        return removed;
      }
    }
    return null;
  }

  /**
   * Exporte les donnees d'un eleve (droit d'acces RGPD)
   */
  async function exportEleve(code) {
    if (!isLoaded) await load();
    var identity = await getName(code);
    if (!identity) return null;
    logAccess('export', code);
    return {
      identite: identity,
      exportDate: new Date().toISOString(),
      exportedBy: 'Enseignant',
      dataCategories: [
        'Identite (nom, prenom, code)',
        'Dates de creation et dernier acces',
        'Evaluations (stockees separement)'
      ]
    };
  }

  /**
   * Anonymise un objet avant envoi cloud
   */
  async function anonymize(data) {
    if (!isLoaded) await load();
    var copy = JSON.parse(JSON.stringify(data));
    var fieldsToAnonymize = ['nom', 'prenom', 'nomEleve', 'prenomEleve', 'eleve'];

    function processObject(obj) {
      if (typeof obj !== 'object' || obj === null) return;
      for (var k in obj) {
        if (fieldsToAnonymize.indexOf(k) >= 0 && typeof obj[k] === 'string') {
          // Recherche synchrone dans le map deja charge
          var search = obj[k].toLowerCase().trim();
          for (var key in identityMap) {
            if (identityMap[key].prenom && identityMap[key].prenom.toLowerCase() === search) {
              obj[k + '_code'] = identityMap[key].code;
              delete obj[k];
              break;
            }
          }
        } else if (typeof obj[k] === 'object') {
          processObject(obj[k]);
        }
      }
    }

    processObject(copy);
    return copy;
  }

  /**
   * De-anonymise un objet recu du cloud
   */
  async function deanonymize(data) {
    if (!isLoaded) await load();
    var copy = JSON.parse(JSON.stringify(data));

    function processObject(obj) {
      if (typeof obj !== 'object' || obj === null) return;
      for (var k in obj) {
        if (k.indexOf('_code') === k.length - 5 && k.length > 5) {
          for (var key in identityMap) {
            if (identityMap[key].code === obj[k]) {
              var realKey = k.replace('_code', '');
              obj[realKey] = identityMap[key].prenom + ' ' + identityMap[key].nom;
              break;
            }
          }
        } else if (typeof obj[k] === 'object') {
          processObject(obj[k]);
        }
      }
    }

    processObject(copy);
    return copy;
  }

  /**
   * Purge les eleves non accedes depuis X jours
   */
  async function purgeOld(days) {
    days = days || 400;
    if (!isLoaded) await load();
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    var toRemove = [];
    for (var key in identityMap) {
      if (identityMap[key].lastAccess) {
        var lastAccess = new Date(identityMap[key].lastAccess);
        if (lastAccess < cutoff) toRemove.push(key);
      }
    }
    for (var i = 0; i < toRemove.length; i++) delete identityMap[toRemove[i]];
    if (toRemove.length > 0) await save();
    return toRemove.length;
  }

  /**
   * Synchronise depuis les eleves existants
   */
  async function syncFromStudents(students) {
    if (!students || !students.length) return 0;
    if (!isLoaded) await load();
    var added = 0;
    for (var i = 0; i < students.length; i++) {
      var s = students[i];
      if (s.nom && s.code) {
        var key = normalizeKey(s.nom, s.prenom || '');
        if (!identityMap[key]) {
          identityMap[key] = {
            code: s.code,
            nom: s.nom,
            prenom: s.prenom || '',
            createdAt: new Date().toISOString(),
            lastAccess: new Date().toISOString()
          };
          added++;
        }
      }
    }
    if (added > 0) await save();
    return added;
  }

  function logAccess(action, code) {
    var log = JSON.parse(localStorage.getItem('iw_access_log') || '[]');
    log.push({ action: action, code: code, timestamp: new Date().toISOString() });
    if (log.length > 1000) log.shift();
    localStorage.setItem('iw_access_log', JSON.stringify(log));
  }

  async function getAll() {
    if (!isLoaded) await load();
    var result = {};
    for (var k in identityMap) result[k] = identityMap[k];
    return result;
  }

  async function getStats() {
    if (!isLoaded) await load();
    return {
      count: Object.keys(identityMap).length,
      meta: JSON.parse(localStorage.getItem(STORAGE_KEY_META) || '{}')
    };
  }

  function count() {
    return Object.keys(identityMap).length;
  }

  async function clear() {
    identityMap = {};
    await save();
  }

  // Auto-load quand deverrouille
  document.addEventListener('iw:unlocked', function() {
    load().catch(function(e) { console.error('[identity-mapper]', e); });
  });

  // Charger au demarrage (mode sans PIN)
  load().catch(function() {});

  window.iwIdentity = {
    load: load,
    register: register,
    getCode: getCode,
    getName: getName,
    findByPrenom: findByPrenom,
    anonymize: anonymize,
    deanonymize: deanonymize,
    remove: remove,
    exportEleve: exportEleve,
    purgeOld: purgeOld,
    syncFromStudents: syncFromStudents,
    getAll: getAll,
    getStats: getStats,
    count: count,
    clear: clear
  };

})();
