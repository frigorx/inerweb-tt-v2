/**
 * INERWEB — Module IA Gemini v1.0
 * IA pour contenus pedagogiques UNIQUEMENT. JAMAIS de donnees eleves (RGPD).
 */
(function(){
  'use strict';

  // Patterns pour detecter donnees personnelles
  var PATTERNS_INTERDITS = [
    /\b[A-Z][a-z\u00e9\u00e8\u00ea\u00eb\u00e0\u00e2\u00e4\u00f9\u00fb\u00fc\u00f4\u00f6\u00ee\u00ef\u00e7]{2,}\s+[A-Z][A-Z\u00c9\u00c8\u00ca\u00cb\u00c0\u00c2\u00c4\u00d9\u00db\u00dc\u00d4\u00d6\u00ce\u00cf\u00c7a-z\u00e9\u00e8\u00ea\u00eb\u00e0\u00e2\u00e4\u00f9\u00fb\u00fc\u00f4\u00f6\u00ee\u00ef\u00e7]{2,}\b/,
    /\b[A-Z]{2,4}[-_]?\d{2,4}\b/,
    /\b\d{1,2}[,\.]\d{1,2}\s*\/\s*20\b/,
    /\bnote\s*[:=]\s*\d/i,
    /\b(\u00e9l\u00e8ve|etudiant|apprenant)\s+[A-Z]/i,
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
    /\b0[1-9][-.\s]?\d{2}[-.\s]?\d{2}[-.\s]?\d{2}[-.\s]?\d{2}\b/
  ];

  // ═══════════════════════════════════════════════════════════
  // SECURITE RGPD
  // ═══════════════════════════════════════════════════════════

  function verifierRGPD(texte){
    if(!texte || typeof texte !== 'string') return {safe: true, raison: null};
    for(var i = 0; i < PATTERNS_INTERDITS.length; i++){
      if(PATTERNS_INTERDITS[i].test(texte)){
        return {safe: false, raison: 'Donnees personnelles detectees'};
      }
    }
    return {safe: true, raison: null};
  }

  function nettoyerTexte(texte){
    if(!texte) return '';
    return texte
      .replace(/l'\u00e9l\u00e8ve/gi, "l'apprenant")
      .replace(/cet \u00e9l\u00e8ve/gi, 'cet apprenant')
      .replace(/un \u00e9l\u00e8ve/gi, 'un apprenant');
  }

  // ═══════════════════════════════════════════════════════════
  // GESTION QUOTA
  // ═══════════════════════════════════════════════════════════

  var QUOTA_KEY = 'iw_gemini_quota';

  function getQuotaAujourdhui(){
    var data = localStorage.getItem(QUOTA_KEY);
    if(!data) return {date: '', count: 0};
    try { return JSON.parse(data); } catch(e){ return {date: '', count: 0}; }
  }

  function incrementerQuota(){
    var aujourdhui = new Date().toISOString().split('T')[0];
    var quota = getQuotaAujourdhui();
    if(quota.date !== aujourdhui) quota = {date: aujourdhui, count: 0};
    quota.count++;
    localStorage.setItem(QUOTA_KEY, JSON.stringify(quota));
    return quota.count;
  }

  function verifierQuota(){
    var config = window.INERWEB_CONFIG || {};
    var limite = (config.GEMINI && config.GEMINI.quotaJournalier) || 100;
    var aujourdhui = new Date().toISOString().split('T')[0];
    var quota = getQuotaAujourdhui();
    if(quota.date !== aujourdhui) return {ok: true, restant: limite};
    return {ok: quota.count < limite, restant: Math.max(0, limite - quota.count), limite: limite};
  }

  // ═══════════════════════════════════════════════════════════
  // APPEL API
  // ═══════════════════════════════════════════════════════════

  function appelerGemini(usage, params){
    var config = window.INERWEB_CONFIG || {};
    if(!config.GEMINI || !config.GEMINI.enabled){
      return Promise.resolve({ok: false, error: 'IA non activee'});
    }

    var usagesOk = config.GEMINI.usages || [];
    if(usagesOk.indexOf(usage) === -1){
      return Promise.resolve({ok: false, error: 'Usage non autorise: ' + usage});
    }

    var quota = verifierQuota();
    if(!quota.ok){
      return Promise.resolve({ok: false, error: 'Quota IA journalier atteint. Reessayez demain.', quotaDepasse: true});
    }

    // Verifier RGPD
    var paramsStr = JSON.stringify(params);
    var checkRGPD = verifierRGPD(paramsStr);
    if(!checkRGPD.safe){
      console.error('[Gemini] RGPD bloque');
      return Promise.resolve({ok: false, error: 'Donnees personnelles detectees. Requete bloquee.', rgpdBloque: true});
    }

    var payload = {
      action: 'askGemini',
      usage: usage,
      params: params,
      contexte: config.GEMINI.contexteMetier || '',
      langue: config.GEMINI.langue || 'fr'
    };

    var apiUrl = window.iwConfig ? window.iwConfig.getApiUrl() : '';
    if(!apiUrl){
      return Promise.resolve({ok: false, error: 'API non configuree'});
    }

    return fetch(apiUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    })
    .then(function(r){ return r.json(); })
    .then(function(result){
      if(result.ok) incrementerQuota();
      return result;
    })
    .catch(function(err){
      console.error('[Gemini] Erreur:', err);
      return {ok: false, error: 'Erreur de connexion'};
    });
  }

  // ═══════════════════════════════════════════════════════════
  // USAGES SPECIFIQUES
  // ═══════════════════════════════════════════════════════════

  function enrichirTP(tp){
    return appelerGemini('enrichirTP', {
      titre: tp.titre || '',
      theme: tp.theme || '',
      competences: tp.competences || [],
      niveau: tp.niveau || 'CAP',
      duree: tp.duree || 120
    });
  }

  function genererObjectifs(code, libelle){
    return appelerGemini('genererObjectifs', {code: code, libelle: libelle || ''});
  }

  function reformulerTexte(texte, style){
    return appelerGemini('reformulerTexte', {texte: nettoyerTexte(texte), style: style || 'ecole_directe'});
  }

  function creerExercice(params){
    return appelerGemini('creerExercice', {
      theme: params.theme || '',
      niveau: params.niveau || 'CAP',
      type: params.type || 'application',
      competences: params.competences || []
    });
  }

  function suggererEvaluation(code, libelle){
    return appelerGemini('suggererEvaluation', {code: code, libelle: libelle || ''});
  }

  // ═══════════════════════════════════════════════════════════
  // UI HELPERS
  // ═══════════════════════════════════════════════════════════

  function creerBoutonIA(onClick){
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'iw-btn-ia';
    btn.innerHTML = '\u2728 IA';
    btn.title = 'Enrichir avec l\'IA';
    btn.onclick = function(e){
      e.preventDefault();
      var quota = verifierQuota();
      if(!quota.ok){
        if(window.toast) window.toast('Quota IA journalier atteint.', 'warn');
        else console.warn('Quota IA journalier atteint.');
        return;
      }
      btn.disabled = true;
      btn.innerHTML = '\u23f3';
      Promise.resolve(onClick()).then(function(){
        btn.disabled = false;
        btn.innerHTML = '\u2728 IA';
      }).catch(function(){
        btn.disabled = false;
        btn.innerHTML = '\u2728 IA';
      });
    };
    return btn;
  }

  function getQuotaDisplay(){
    var quota = verifierQuota();
    var config = window.INERWEB_CONFIG || {};
    var limite = (config.GEMINI && config.GEMINI.quotaJournalier) || 100;
    return (limite - quota.restant) + ' / ' + limite + ' requetes IA';
  }

  // ═══════════════════════════════════════════════════════════
  // API PUBLIQUE
  // ═══════════════════════════════════════════════════════════

  window.iwGemini = {
    enrichirTP: enrichirTP,
    genererObjectifs: genererObjectifs,
    reformulerTexte: reformulerTexte,
    creerExercice: creerExercice,
    suggererEvaluation: suggererEvaluation,
    appeler: appelerGemini,
    verifierRGPD: verifierRGPD,
    nettoyerTexte: nettoyerTexte,
    verifierQuota: verifierQuota,
    getQuotaDisplay: getQuotaDisplay,
    creerBoutonIA: creerBoutonIA,
    isEnabled: function(){
      var config = window.INERWEB_CONFIG || {};
      return config.GEMINI && config.GEMINI.enabled === true;
    }
  };

  var enabled = window.iwGemini.isEnabled();
  console.log('[Gemini] Module IA —', enabled ? 'Active' : 'Desactive');
})();
