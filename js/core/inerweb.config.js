/**
 * INERWEB — Configuration centralisee v1.0
 *
 * CE FICHIER EST LE SEUL A MODIFIER POUR CONFIGURER UNE INSTANCE.
 *
 * Instructions :
 * 1. Copier ce fichier
 * 2. Modifier les valeurs selon votre etablissement
 * 3. Ne jamais committer vos cles API dans un depot public
 */
(function(){
  'use strict';

  // ═══════════════════════════════════════════════════════════
  // CONFIGURATION PRINCIPALE
  // ═══════════════════════════════════════════════════════════

  var CONFIG = {

    // ─── MODE ───
    // 'dev'  = logs verbeux, pas de cache, donnees de test
    // 'test' = logs normaux, donnees reelles mais instance de test
    // 'prod' = logs minimaux, cache active, donnees reelles
    MODE: 'prod',

    // ─── VERSIONS ───
    VERSION_FRONT: '7.6.3',
    VERSION_TTIA: '1.1.0',
    VERSION_BACKEND: '3.0.0',
    VERSION_CONFIG: '1.0.0',

    // ─── API BACKEND ───
    // URL de votre deploiement Google Apps Script
    // Format : https://script.google.com/macros/s/VOTRE_ID/exec
    API_URL: 'https://script.google.com/macros/s/AKfycbzVvXZRi4975OM4P8AJeoDWvnTbFSfTpVUDErzrNk2R2knfxBxCw-A-kLmKaNzmW35V1A/exec',

    // Cle API (doit correspondre a celle configuree dans le Apps Script)
    API_KEY: 'inerWeb2026fh',

    // ─── URLs DE BASE ───
    // URL ou sont heberges les fichiers HTML (pour les QR codes, liens eleves/tuteurs)
    // Exemples :
    //   - GitHub Pages : https://votre-compte.github.io/inerweb/
    //   - Serveur local : http://localhost:8080/
    //   - Serveur etablissement : https://intranet.lycee.fr/inerweb/
    BASE_URL: 'https://frigorx.github.io/tt-ia/',

    // ─── ETABLISSEMENT ───
    ETABLISSEMENT: {
      nom: 'Lycee Professionnel',
      ville: '',
      academie: ''
    },

    // ─── ENSEIGNANT PAR DEFAUT ───
    // Utilise si pas de configuration locale
    ENSEIGNANT_DEFAUT: 'Enseignant',

    // ─── FONCTIONNALITES ───
    FEATURES: {
      offline: true,           // Mode hors-ligne avec IndexedDB
      qrCodes: true,           // Generation de QR codes
      camera: true,            // Scan QR par camera
      iaGemini: false,         // Enrichissement IA (necessite cle Gemini cote backend)
      exportPdf: true,         // Export PDF avec jsPDF
      exportExcel: true        // Export Excel avec SheetJS
    },

    // ─── IA GEMINI ───
    GEMINI: {
      enabled: false,
      model: 'gemini-1.5-flash',
      quotaJournalier: 100,
      usages: ['enrichirTP', 'genererObjectifs', 'reformulerTexte', 'creerExercice', 'suggererEvaluation'],
      langue: 'fr',
      contexteMetier: 'Enseignement professionnel en froid et climatisation (CAP IFCA, Bac Pro MFER). Public : eleves de lycee professionnel. Langage clair et accessible.'
    },

    // ─── SECURITE ───
    SECURITY: {
      // Duree de session en minutes (0 = pas d'expiration)
      sessionTimeout: 480,  // 8 heures
      // Purger les donnees locales a la fermeture
      purgeOnClose: false,
      // Exiger HTTPS (bloque si HTTP sauf localhost)
      requireHttps: false
    },

    // ─── STOCKAGE LOCAL ───
    STORAGE: {
      // Prefixe pour les cles localStorage/IndexedDB
      prefix: 'iw_',
      // Duree de conservation des donnees locales en jours
      retentionDays: 30
    },

    // ─── DEBUG ───
    DEBUG: {
      // Activer les logs console detailles
      verbose: false,
      // Afficher les erreurs reseau
      showNetworkErrors: false,
      // Simuler le mode offline
      simulateOffline: false
    }
  };

  // ═══════════════════════════════════════════════════════════
  // VALIDATION DE LA CONFIGURATION
  // ═══════════════════════════════════════════════════════════

  function validateConfig(){
    var errors = [];
    var warnings = [];

    // Verifications critiques
    if(!CONFIG.API_URL){
      warnings.push('API_URL non configuree — mode demo uniquement');
    } else if(CONFIG.API_URL.indexOf('script.google.com') === -1){
      errors.push('API_URL invalide — doit etre une URL Google Apps Script');
    }

    if(!CONFIG.BASE_URL){
      warnings.push('BASE_URL non configuree — les liens/QR codes utiliseront des URLs relatives');
    }

    // Verification HTTPS en prod
    if(CONFIG.MODE === 'prod' && CONFIG.SECURITY.requireHttps){
      if(location.protocol !== 'https:' && location.hostname !== 'localhost'){
        errors.push('HTTPS requis en mode production');
      }
    }

    // Afficher les resultats
    if(errors.length > 0){
      console.error('[CONFIG] Erreurs de configuration :', errors);
      if(CONFIG.MODE === 'prod'){
        if(window.toast) window.toast('Erreur de configuration : ' + errors.join(' | '), 'error');
        else console.error('Erreur de configuration INERWEB :', errors);
      }
    }

    if(warnings.length > 0 && CONFIG.DEBUG.verbose){
      console.warn('[CONFIG] Avertissements :', warnings);
    }

    return errors.length === 0;
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════

  /**
   * Recupere une valeur de config avec fallback.
   */
  function get(path, defaultValue){
    var parts = path.split('.');
    var value = CONFIG;
    for(var i = 0; i < parts.length; i++){
      if(value === undefined || value === null) return defaultValue;
      value = value[parts[i]];
    }
    return value !== undefined ? value : defaultValue;
  }

  /**
   * Verifie si une fonctionnalite est activee.
   */
  function isEnabled(feature){
    return CONFIG.FEATURES[feature] === true;
  }

  /**
   * Retourne l'URL API complete.
   */
  function getApiUrl(){
    return CONFIG.API_URL || '';
  }

  /**
   * Retourne l'URL de base pour les liens.
   */
  function getBaseUrl(){
    if(CONFIG.BASE_URL) return CONFIG.BASE_URL;
    // Fallback : URL courante sans le fichier
    return location.href.replace(/\/[^\/]*$/, '/');
  }

  /**
   * Verifie si on est en mode dev.
   */
  function isDev(){
    return CONFIG.MODE === 'dev';
  }

  /**
   * Verifie si on est en mode prod.
   */
  function isProd(){
    return CONFIG.MODE === 'prod';
  }

  /**
   * Log conditionnel selon le mode.
   */
  function log(){
    if(CONFIG.DEBUG.verbose){
      console.log.apply(console, ['[INERWEB]'].concat(Array.prototype.slice.call(arguments)));
    }
  }

  // ═══════════════════════════════════════════════════════════
  // INITIALISATION
  // ═══════════════════════════════════════════════════════════

  // Valider au chargement
  var isValid = validateConfig();

  // Exposer globalement
  window.INERWEB_CONFIG = CONFIG;
  window.iwConfig = {
    // Config brute
    raw: CONFIG,

    // Getters
    get: get,
    getApiUrl: getApiUrl,
    getBaseUrl: getBaseUrl,

    // Checks
    isEnabled: isEnabled,
    isDev: isDev,
    isProd: isProd,
    isValid: function(){ return isValid; },

    // Utils
    log: log,
    validate: validateConfig
  };

  console.log('[CONFIG] INERWEB v' + CONFIG.VERSION_FRONT + ' — Mode ' + CONFIG.MODE + (isValid ? ' OK' : ' ERREUR'));

})();
