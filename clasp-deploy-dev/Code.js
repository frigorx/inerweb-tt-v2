/** Envoi email générique avec bouton */
function sendCustomEmail(body) {
  var to = body.to || '';
  var subject = body.subject || '';
  var text = body.body || '';
  var lien = body.lien || '';
  var boutonTexte = body.boutonTexte || 'Ouvrir le lien';
  var boutonColor = body.boutonColor || '#16a085';
  var expediteur = body.expediteur || '';
  if (!to || to.indexOf('@') === -1) return { ok: false, error: 'Email invalide' };
  try {
    var html = '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#333">'
      + '<p>' + text.replace(/\n/g, '<br>') + '</p>';
    if (lien) {
      html += '<p style="margin-top:20px;text-align:center"><a href="' + lien + '" style="display:inline-block;padding:14px 28px;background:' + boutonColor + ';color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px">' + boutonTexte + '</a></p>';
    }
    html += '<p style="margin-top:20px;font-size:12px;color:#999">— ' + expediteur + ' via inerWeb TT</p></div>';
    MailApp.sendEmail({ to: to, subject: subject, htmlBody: html });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/** Exécuter cette fonction UNE FOIS pour autoriser l'envoi de mails */
function autoriserMail() {
  var quota = MailApp.getRemainingDailyQuota();
  Logger.log('Quota email restant : ' + quota);
}

/**
 * ═══════════════════════════════════════════════════
 * inerWeb Édu — Google Apps Script Backend v3.0.0
 * Base v2.5.1 + Endpoints auth/users/tokens (Phase 10)
 * 40 types d'événements, projections unifiées, CCF, PFMP
 * ═══════════════════════════════════════════════════
 *
 * DÉPLOIEMENT :
 * 1. Créer un Google Sheet → copier son ID
 * 2. Ouvrir Extensions > Apps Script
 * 3. Coller CE FICHIER dans Code.gs
 * 4. Remplacer VOTRE_SPREADSHEET_ID_ICI par l'ID du Sheet
 * 5. Propriétés du script : ajouter API_KEY et GEMINI_API_KEY
 * 6. Exécuter setupSpreadsheet() puis populateDemoSeances()
 * 7. Déployer > Nouveau déploiement > Application Web
 */

// ── Configuration ── ENVIRONNEMENT DEV ─────────
const CONFIG = {
  SPREADSHEET_ID: '1WCMZ1oY5Nm882O4u5JnBNxD7Y01qx1iSl6NT6-gArHM', // SHEET DEV (copie de PROD)
  ADMIN_EMAIL: 'inerweb.fh@gmail.com',
  GEMINI_QUOTA_MENSUEL: 50,
  VERSION: '3.0.0-dev',
  MODE: 'dev', // signal pour le frontend
};

const TABS = {
  EVENT_LOG: 'EventLog',
  SEANCES: 'Séances',
  SEQUENCES: 'Séquences',
  ELEVES: 'Élèves',
  EVALUATIONS: 'Évaluations',
  EVALUATIONS_UNIFIEES: 'Évaluations_Unifiées',
  CCF_LOG: 'CCF_Log',
  PFMP_LOG: 'PFMP_Log',
  CALENDRIER_CFA: 'Calendrier CFA',
  ENSEIGNANTS: 'Enseignants',
  LOGS_IA: 'Logs IA',
  REFERENTIELS: 'Referentiels',
  CONFIG: 'Config',
  USERS: 'Users',
};

// Colonnes de l'onglet Séances
const SC = { ID:1, CLASSE:2, DATE:3, HORAIRE:4, TYPE:5, SEQ_ID:6, SEQ_NOM:7, CONTENU:8, COMPS:9, ENSEIGNANT:10, STATUT:11, DATE_VALID:12 };


// ══════════════════════════════════════════════════
// POINT D'ENTRÉE API — GET & POST
// ══════════════════════════════════════════════════

function doGet(e) {
  const action = e.parameter.action || '';
  // Les actions admin* ont leur propre auth (admin_key) — pas besoin d'API key
  if (!action.startsWith('admin') && !checkApiKey(e.parameter.key)) return jsonResp({ error: '⛔ Accès refusé : Clé API invalide' });


  const enseignant = e.parameter.enseignant || '';
  let result;

  try {
    switch (action) {
      case 'ping':
        result = { status: 'ok', version: CONFIG.VERSION, timestamp: isoParis_(new Date()) };
        break;
      case 'getSeances':
        result = getSeances(enseignant, e.parameter);
        break;
      case 'getSeancesSemaine':
        result = getSeancesSemaine(enseignant, e.parameter.weekStart);
        break;
      case 'getEvents':
        result = getEventsFromSheet(enseignant, parseInt(e.parameter.limit) || 50);
        break;
      case 'getEleves':
        result = getEleves(e.parameter.classe);
        break;
      case 'getReferentiel':
        result = getReferentiel(e.parameter.diplomeId);
        break;
      case 'getEvaluations':
        result = getEvaluations(e.parameter.eleveId, e.parameter.classe, e.parameter.formation);
        break;
      case 'getBilanCCF':
        result = getBilanCCF(e.parameter.eleveId, e.parameter.formation);
        break;
      case 'verifyEleveToken':
        result = verifyEleveToken(e.parameter.eleve, e.parameter.token, e.parameter.deviceId);
        break;
      case 'verifyTuteurToken':
        result = verifyTuteurToken(e.parameter.eleve, e.parameter.tuteur, e.parameter.deviceId);
        break;
      case 'verifyTuteurPhone':
        result = verifyTuteurPhone(e.parameter.eleve, e.parameter.tuteur, e.parameter.digits);
        break;
      case 'getDashboard':
        result = getDashboard();
        break;
      case 'getJournal':
        result = getJournal(e.parameter.eleve);
        break;
      case 'getValidations':
        result = getValidations(e.parameter.eleve);
        break;
      case 'getDocuments':
        result = getDocuments(e.parameter.eleve);
        break;
      case 'getNotes':
        result = getNotes(e.parameter.eleve);
        break;
      case 'getUsers':
        if(!checkAdminKey_(e.parameter.adminKey)) return jsonResp({error: 'Clé admin invalide'});
        result = getUsers();
        break;
      case 'getEvalTuteur':
        result = getEvalTuteurData(e.parameter.eleve);
        break;
      case 'getIdentityVault':
        result = getIdentityVault();
        break;
      case 'verifyElevePin':
        result = verifyElevePin(e.parameter.token, e.parameter.pin_hash);
        break;
      case 'adminPreviewNominative':
        if(!checkAdminKey_(e.parameter.adminKey)) return jsonResp({error: 'Clé admin invalide'});
        result = previewNominativeData();
        break;
      case 'adminGetElevePinClair':
        if(e.parameter.adminKey !== DEV_ADMIN_KEY) return jsonResp({error: 'Clé admin invalide'});
        result = getElevePinClair(e.parameter.classe);
        break;
      default:
        result = { error: 'Action inconnue: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
  }
  return jsonResp(result);
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResp({ error: 'JSON invalide' });
  }

  const key = body.apiKey || body.key || (e.parameter && e.parameter.key) || '';
  // v7.6.1 : accepter action depuis body OU URL (certains fronts envoient action dans l'URL)
  var action = body.action || (e.parameter && e.parameter.action) || '';
  // Les actions admin* ont leur propre auth (admin_key) — pas besoin d'API key
  if (!action.startsWith('admin') && !checkApiKey(key)) return jsonResp({ error: '⛔ Accès refusé : Clé API invalide' });
  let result;
  try {
    switch (action) {
      case 'pushEvents':
        result = pushEvents(body.events || []);
        break;
      case 'enrichirTexteED':
        result = enrichirTexteED(body.seanceId, body.enseignant);
        break;
      case 'askCopilot':
        result = askCopilot(body.texte, body.enseignant, body.style);
        break;
      case 'importEcoleDirecte':
        result = importEcoleDirecte(body.icalUrl, body.enseignant);
        break;
      case 'addUser':
        if(!checkAdminKey_(body.adminKey)) return jsonResp({error: 'Clé admin invalide'});
        result = addUser(body.user);
        break;
      case 'updateUser':
        if(!checkAdminKey_(body.adminKey)) return jsonResp({error: 'Clé admin invalide'});
        result = updateUser(body.user);
        break;
      case 'deleteUser':
        if(!checkAdminKey_(body.adminKey)) return jsonResp({error: 'Clé admin invalide'});
        result = deleteUser(body.userId);
        break;
      case 'saveValidation':
        result = saveValidation(body);
        break;
      case 'adminCloneSheet':
        result = adminCloneSheet(body);
        break;
      case 'adminBackupSheet':
        result = adminBackupSheet(body);
        break;
      case 'adminSyncProdToDev':
        result = adminSyncProdToDev(body);
        break;
      case 'adminInstallTriggers':
        result = adminInstallTriggers(body);
        break;
      case 'adminSetApiKey':
        result = adminSetApiKey(body);
        break;
      case 'adminListClasses':
        result = adminListClasses(body);
        break;
      case 'adminPurgeTNE':
        result = adminPurgeTNE(body);
        break;
      case 'adminListTabs':
        result = adminListTabs(body);
        break;
      case 'adminListBackups':
        result = adminListBackups(body);
        break;
      case 'adminRestoreFromBackup':
        result = adminRestoreFromBackup(body);
        break;
      case 'adminInspectBackupEleves':
        result = adminInspectBackupEleves(body);
        break;
      case 'adminClearDevSheetId':
        result = adminClearDevSheetId(body);
        break;
      case 'adminCreateTneSquelette':
        result = adminCreateTneSquelette(body);
        break;
      case 'addEleve':
        result = addEleveAction(body.data || body);
        break;
      case 'updateEleveProfil':
        result = updateEleveProfil(body);
        break;
      case 'deleteEleve':
        result = deleteEleveAction(body.eleve);
        break;
      case 'generateTokens':
        result = generateTokensForClasse(body.classe);
        break;
      case 'askGemini':
        result = handleGeminiRequest(body);
        break;
      case 'addJournalEntry':
        result = addJournalEntry(body);
        break;
      case 'saveEvalTuteur':
        result = saveEvalTuteur(body);
        break;
      case 'uploadDocument':
        result = uploadDocument(body);
        break;
      case 'sendAttestationEmails':
        result = sendAttestationEmails(body);
        break;
      case 'sendCustomEmail':
        result = sendCustomEmail(body);
        break;
      case 'saveIdentityVault':
        result = saveIdentityVault(body);
        break;
      case 'setElevePin':
        result = setElevePin(body);
        break;
      case 'adminClearNominative':
        result = clearNominativeColumns(body);
        break;
      case 'adminSetElevePinClair':
        if(body.adminKey !== DEV_ADMIN_KEY) return jsonResp({error: 'Clé admin invalide'});
        result = setElevePinClair(body);
        break;
      case 'adminCreerElevesTNE':
        if(body.adminKey !== DEV_ADMIN_KEY) return jsonResp({error: 'Clé admin invalide'});
        result = creerElevesTNE(body);
        break;
      case 'adminSetTelEleve':
        if(body.adminKey !== DEV_ADMIN_KEY) return jsonResp({error: 'Clé admin invalide'});
        result = setTelEleve(body);
        break;
      default:
        result = { error: 'Action POST inconnue: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
  }
  return jsonResp(result);
}

function jsonResp(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function checkApiKey(receivedKey) {
  const realKey = PropertiesService.getScriptProperties().getProperty('API_KEY');
  if (!realKey) {
    Logger.log('⛔ API_KEY non configurée dans les propriétés du script. Accès refusé.');
    return false;
  }
  return receivedKey === realKey;
}


// ══════════════════════════════════════════════════
// CORE : SYNC & EVENT LOG (Sécurisé)
// ══════════════════════════════════════════════════

function pushEvents(events) {
  if (!events || events.length === 0) return { received: 0, written: 0 };

  if (events.length > 50) {
    return { error: 'Maximum 50 événements par appel. Reçu : ' + events.length };
  }

  const TYPES_AUTORISES = [
    'seance.creee','seance.validee','seance.invalidee','seance.annulee','seance.modifiee','seance.supprimee',
    'competence.evaluee','eval.quick','eval.grid','eval.bulk','eval.deleted',
    'eval.pfmp','eval.pfmp.updated','eval.pfmp.deleted',
    'eval.ccf','eval.ccf.updated','eval.ccf.deleted',
    'eleve.created','eleve.updated','eleve.deleted','eleve.merged',
    'classe.created','classe.updated',
    'sync.started','sync.completed','sync.conflict',
    'bridge.edu_to_prog','bridge.prog_to_edu',
    'tp.evaluated','import.ecole_directe','ccf.bilan_generated',
    'eval.level_set','eval.created','eval.updated','eval.grid_completed','eval.bulk_applied',
    'eval.pfmp_recorded','eval.ccf_recorded','eval.comment_added','eval.note_generated',
  ];
  const eventsClean = events.filter(e => TYPES_AUTORISES.includes(e.type));
  const rejected = events.length - eventsClean.length;

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { error: '⚠️ Serveur occupé, réessayez dans quelques secondes.' };
  }

  try {
    const sheet = getOrCreateSheet(TABS.EVENT_LOG, ['eventId','timestamp','type','acteur','cible','donnees','source']);

    const existingIds = new Set();
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const idsData = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < idsData.length; i++) existingIds.add(idsData[i][0]);
    }

    const newRows = [];
    const projectionUpdates = [];
    let duplicates = 0;
    let rejectedMalformed = 0;

    for (const evt of eventsClean) {
      if (!evt || !evt.eventId || !String(evt.eventId).trim()) { rejectedMalformed++; continue; }
      if (existingIds.has(evt.eventId)) { duplicates++; continue; }
      if (!evt.timestamp) evt.timestamp = isoParis_(new Date());

      let jsonDonnees = '{}';
      if (typeof evt.donnees === 'string') {
        try { JSON.parse(evt.donnees); jsonDonnees = evt.donnees; }
        catch (e) { rejectedMalformed++; continue; }
      } else {
        jsonDonnees = JSON.stringify(evt.donnees || {});
      }

      newRows.push([evt.eventId, evt.timestamp, evt.type, evt.acteur, evt.cible, jsonDonnees, evt.source || 'pwa']);
      existingIds.add(evt.eventId);
      projectionUpdates.push(evt);
    }

    if (newRows.length > 0) {
      sheet.getRange(lastRow + 1, 1, newRows.length, 7).setValues(newRows);
    }

    if (projectionUpdates.length > 0) {
      updateProjections(projectionUpdates);
    }

    return { received: events.length, written: newRows.length, duplicates: duplicates, rejected: rejected, rejectedMalformed: rejectedMalformed };
  } catch (err) {
    Logger.log('Erreur pushEvents: ' + err.message);
    throw err;
  } finally {
    lock.releaseLock();
  }
}


// ══════════════════════════════════════════════════
// PROJECTIONS (Vues matérialisées)
// ══════════════════════════════════════════════════

function updateProjections(events) {
  for (const evt of events) {
    switch (evt.type) {
      case 'seance.validee': updateSeanceStatut(evt.cible, 'validee', evt.timestamp); break;
      case 'seance.invalidee': updateSeanceStatut(evt.cible, 'pending', ''); break;
      case 'seance.creee': createSeanceFromEvent(evt); break;
      case 'seance.annulee': updateSeanceStatut(evt.cible, 'annulee', evt.timestamp); break;
      case 'seance.modifiee': updateSeanceFromEvent(evt); break;
      case 'seance.supprimee': deleteSeanceFromEvent(evt); break;
      case 'competence.evaluee': updateEvaluation(evt); break;
      case 'eval.quick': case 'eval.grid': case 'eval.bulk': updateEvaluationUnifiee(evt); break;
      case 'eval.deleted': deleteEvaluationUnifiee(evt); break;
      case 'eval.pfmp': case 'eval.pfmp.updated': updateEvaluationPFMP(evt); break;
      case 'eval.pfmp.deleted': deleteEvaluationPFMP(evt); break;
      case 'eval.ccf': case 'eval.ccf.updated': updateEvaluationCCF(evt); break;
      case 'eval.ccf.deleted': deleteEvaluationCCF(evt); break;
      case 'eleve.created': case 'eleve.updated': updateEleve(evt); break;
      case 'eleve.deleted': deleteEleve(evt); break;
      case 'eleve.merged': mergeEleve(evt); break;
      case 'tp.evaluated': updateEvaluationUnifiee(evt); break;
      case 'eval.level_set': case 'eval.created': case 'eval.updated': updateEvaluationUnifiee(evt); break;
      case 'eval.grid_completed': updateEvaluationUnifiee(evt); break;
      case 'eval.bulk_applied': updateEvaluationUnifiee(evt); break;
      case 'eval.pfmp_recorded': updateEvaluationPFMP(evt); break;
      case 'eval.ccf_recorded': updateEvaluationCCF(evt); break;
    }
  }
}

function updateSeanceStatut(seanceId, statut, dateVal) {
  const sheet = getSheet(TABS.SEANCES);
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === seanceId) {
      sheet.getRange(i + 1, SC.STATUT).setValue(statut);
      sheet.getRange(i + 1, SC.DATE_VALID).setValue(dateVal);
      return;
    }
  }
}

function createSeanceFromEvent(evt) {
  const sheet = getOrCreateSheet(TABS.SEANCES);
  const d = evt.donnees || {};
  sheet.appendRow([evt.cible, d.classe || '', evt.timestamp.slice(0, 10), d.horaire || '', 'oneshot', d.sequenceId || 'OS', d.sequenceNom || 'Intervention ponctuelle', d.contenu || '', (d.competences || []).join(' ; '), evt.acteur, 'pending', '']);
}

function updateSeanceFromEvent(evt) {
  const sheet = getSheet(TABS.SEANCES);
  if (!sheet) return;
  const d = evt.donnees || {};
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === evt.cible) {
      if (d.contenu) sheet.getRange(i + 1, SC.CONTENU).setValue(d.contenu);
      if (d.horaire) sheet.getRange(i + 1, SC.HORAIRE).setValue(d.horaire);
      if (d.competences) sheet.getRange(i + 1, SC.COMPS).setValue((d.competences || []).join(' ; '));
      if (d.sequenceNom) sheet.getRange(i + 1, SC.SEQ_NOM).setValue(d.sequenceNom);
      if (d.sequenceId) sheet.getRange(i + 1, SC.SEQ_ID).setValue(d.sequenceId);
      return;
    }
  }
}

function deleteSeanceFromEvent(evt) {
  const sheet = getSheet(TABS.SEANCES);
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === evt.cible) { sheet.deleteRow(i + 1); return; }
  }
}

function updateEvaluation(evt) {
  const sheet = getOrCreateSheet(TABS.EVALUATIONS, ['eleveId','competenceCode','niveau','seanceId','enseignant','timestamp']);
  const d = evt.donnees || {};
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === evt.cible && data[i][1] === d.competenceCode && data[i][3] === d.seanceId) {
      const existingRaw = data[i][5];
      const existingMs = existingRaw instanceof Date ? existingRaw.getTime() : new Date(String(existingRaw || 0)).getTime();
      const incomingMs = new Date(String(evt.timestamp)).getTime();
      if (existingMs && incomingMs && incomingMs <= existingMs) return;
      sheet.getRange(i + 1, 3).setValue(d.niveau);
      sheet.getRange(i + 1, 6).setValue(evt.timestamp);
      return;
    }
  }
  sheet.appendRow([evt.cible, d.competenceCode, d.niveau, d.seanceId, evt.acteur, evt.timestamp]);
}

function updateEvaluationUnifiee(evt) {
  const headers = ['eleveId','competenceCode','niveau','phase','source','tpId','enseignant','timestamp'];
  const sheet = getOrCreateSheet(TABS.EVALUATIONS_UNIFIEES, headers);
  const d = evt.donnees || {};
  const eleveId = evt.cible || d.eleveId || '';
  const compCode = d.competenceCode || d.code || '';
  const niveau = d.niveau !== undefined ? d.niveau : '';
  const phase = d.phase || 'formatif';
  const source = evt.type || '';
  const tpId = d.tpId || '';
  if (!eleveId || !compCode) return;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === eleveId && data[i][1] === compCode && data[i][3] === phase) {
      const existingRaw = data[i][7];
      const existingMs = existingRaw instanceof Date ? existingRaw.getTime() : new Date(String(existingRaw || 0)).getTime();
      const incomingMs = new Date(String(evt.timestamp)).getTime();
      if (existingMs && incomingMs && incomingMs <= existingMs) return;
      sheet.getRange(i + 1, 3).setValue(niveau);
      sheet.getRange(i + 1, 5).setValue(source);
      sheet.getRange(i + 1, 6).setValue(tpId);
      sheet.getRange(i + 1, 8).setValue(evt.timestamp);
      return;
    }
  }
  sheet.appendRow([eleveId, compCode, niveau, phase, source, tpId, evt.acteur, evt.timestamp]);
}

function deleteEvaluationUnifiee(evt) {
  const sheet = getSheet(TABS.EVALUATIONS_UNIFIEES);
  if (!sheet) return;
  const d = evt.donnees || {};
  const eleveId = evt.cible || d.eleveId || '';
  const compCode = d.competenceCode || '';
  const phase = d.phase || 'formatif';
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === eleveId && data[i][1] === compCode && data[i][3] === phase) { sheet.deleteRow(i + 1); return; }
  }
}

function updateEvaluationPFMP(evt) {
  const headers = ['eleveId','competenceCode','niveau','pfmpId','tuteur','entreprise','enseignant','timestamp'];
  const sheet = getOrCreateSheet(TABS.PFMP_LOG, headers);
  const d = evt.donnees || {};
  const eleveId = evt.cible || d.eleveId || '';
  const compCode = d.competenceCode || '';
  const niveau = d.niveau !== undefined ? d.niveau : '';
  const pfmpId = d.pfmpId || '';
  if (!eleveId || !compCode) return;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === eleveId && data[i][1] === compCode && data[i][3] === pfmpId) {
      const existingRaw = data[i][7];
      const existingMs = existingRaw instanceof Date ? existingRaw.getTime() : new Date(String(existingRaw || 0)).getTime();
      const incomingMs = new Date(String(evt.timestamp)).getTime();
      if (existingMs && incomingMs && incomingMs <= existingMs) return;
      sheet.getRange(i + 1, 3).setValue(niveau);
      sheet.getRange(i + 1, 5).setValue(d.tuteur || '');
      sheet.getRange(i + 1, 6).setValue(d.entreprise || '');
      sheet.getRange(i + 1, 8).setValue(evt.timestamp);
      return;
    }
  }
  sheet.appendRow([eleveId, compCode, niveau, pfmpId, d.tuteur || '', d.entreprise || '', evt.acteur, evt.timestamp]);
}

function deleteEvaluationPFMP(evt) {
  const sheet = getSheet(TABS.PFMP_LOG);
  if (!sheet) return;
  const d = evt.donnees || {};
  const eleveId = evt.cible || d.eleveId || '';
  const compCode = d.competenceCode || '';
  const pfmpId = d.pfmpId || '';
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === eleveId && data[i][1] === compCode && data[i][3] === pfmpId) { sheet.deleteRow(i + 1); return; }
  }
}

function updateEvaluationCCF(evt) {
  const headers = ['eleveId','competenceCode','niveau','epreuveCode','sessionId','note','enseignant','timestamp'];
  const sheet = getOrCreateSheet(TABS.CCF_LOG, headers);
  const d = evt.donnees || {};
  const eleveId = evt.cible || d.eleveId || '';
  const compCode = d.competenceCode || '';
  const niveau = d.niveau !== undefined ? d.niveau : '';
  const epreuveCode = d.epreuveCode || '';
  const sessionId = d.sessionId || '';
  const note = d.note !== undefined ? d.note : '';
  if (!eleveId || !compCode) return;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === eleveId && data[i][1] === compCode && data[i][3] === epreuveCode) {
      const existingRaw = data[i][7];
      const existingMs = existingRaw instanceof Date ? existingRaw.getTime() : new Date(String(existingRaw || 0)).getTime();
      const incomingMs = new Date(String(evt.timestamp)).getTime();
      if (existingMs && incomingMs && incomingMs <= existingMs) return;
      sheet.getRange(i + 1, 3).setValue(niveau);
      sheet.getRange(i + 1, 5).setValue(sessionId);
      sheet.getRange(i + 1, 6).setValue(note);
      sheet.getRange(i + 1, 8).setValue(evt.timestamp);
      return;
    }
  }
  sheet.appendRow([eleveId, compCode, niveau, epreuveCode, sessionId, note, evt.acteur, evt.timestamp]);
}

function deleteEvaluationCCF(evt) {
  const sheet = getSheet(TABS.CCF_LOG);
  if (!sheet) return;
  const d = evt.donnees || {};
  const eleveId = evt.cible || d.eleveId || '';
  const compCode = d.competenceCode || '';
  const epreuveCode = d.epreuveCode || '';
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === eleveId && data[i][1] === compCode && data[i][3] === epreuveCode) { sheet.deleteRow(i + 1); return; }
  }
}

function updateEleve(evt) {
  const sheet = getOrCreateSheet(TABS.ELEVES, ['code','nom','prenom','classe','groupe','annee','statut','referentiel','token','token_tuteur','tel_eleve','tel_tuteur','email_eleve','tuteur_nom','tuteur_email','entreprise_nom','preference_contact_tuteur']);
  const d = evt.donnees || {};
  const eleveId = evt.cible || d.eleveId || '';
  if (!eleveId) return;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === eleveId) {
      if (d.classe) sheet.getRange(i + 1, 2).setValue(d.classe);
      if (d.codeRGPD) sheet.getRange(i + 1, 3).setValue(d.codeRGPD);
      if (d.groupe) sheet.getRange(i + 1, 4).setValue(d.groupe);
      return;
    }
  }
  sheet.appendRow([eleveId, d.classe || '', d.codeRGPD || '', d.groupe || '']);
}

function deleteEleve(evt) {
  const sheet = getSheet(TABS.ELEVES);
  if (!sheet) return;
  const eleveId = evt.cible || '';
  if (!eleveId) return;
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === eleveId) { sheet.deleteRow(i + 1); return; }
  }
}

function mergeEleve(evt) {
  const d = evt.donnees || {};
  const sourceId = d.sourceId || evt.cible || '';
  const targetId = d.targetId || '';
  if (!sourceId || !targetId) return;
  const evalSheet = getSheet(TABS.EVALUATIONS);
  if (evalSheet) { const data = evalSheet.getDataRange().getValues(); for (let i = 1; i < data.length; i++) { if (data[i][0] === sourceId) evalSheet.getRange(i + 1, 1).setValue(targetId); } }
  const unifiedSheet = getSheet(TABS.EVALUATIONS_UNIFIEES);
  if (unifiedSheet) { const data = unifiedSheet.getDataRange().getValues(); for (let i = 1; i < data.length; i++) { if (data[i][0] === sourceId) unifiedSheet.getRange(i + 1, 1).setValue(targetId); } }
  const elevSheet = getSheet(TABS.ELEVES);
  if (elevSheet) { const data = elevSheet.getDataRange().getValues(); for (let i = data.length - 1; i >= 1; i--) { if (data[i][0] === sourceId) { elevSheet.deleteRow(i + 1); break; } } }
}


// ══════════════════════════════════════════════════
// ENDPOINTS CONVERGENCE — getEvaluations & getBilanCCF
// ══════════════════════════════════════════════════

function getEvaluations(eleveId, classe, formation) {
  const result = { evaluations: [], source: 'unified' };
  const unifiedSheet = getSheet(TABS.EVALUATIONS_UNIFIEES);
  if (unifiedSheet && unifiedSheet.getLastRow() > 1) {
    const data = unifiedSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (eleveId && data[i][0] !== eleveId) continue;
      result.evaluations.push({ eleveId: data[i][0], competenceCode: data[i][1], niveau: data[i][2], phase: data[i][3], source: data[i][4], tpId: data[i][5], enseignant: data[i][6], timestamp: data[i][7] });
    }
  }
  if (result.evaluations.length === 0) {
    result.source = 'legacy';
    const legacySheet = getSheet(TABS.EVALUATIONS);
    if (legacySheet && legacySheet.getLastRow() > 1) {
      const data = legacySheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (eleveId && data[i][0] !== eleveId) continue;
        result.evaluations.push({ eleveId: data[i][0], competenceCode: data[i][1], niveau: data[i][2], phase: 'formatif', source: 'competence.evaluee', tpId: '', enseignant: data[i][4], timestamp: data[i][5] });
      }
    }
  }
  if (classe && !eleveId) {
    const eleves = getEleves(classe).eleves || [];
    const eleveIds = new Set(eleves.map(e => e.id));
    result.evaluations = result.evaluations.filter(e => eleveIds.has(e.eleveId));
  }
  const pfmpSheet = getSheet(TABS.PFMP_LOG);
  if (pfmpSheet && pfmpSheet.getLastRow() > 1) {
    const data = pfmpSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (eleveId && data[i][0] !== eleveId) continue;
      result.evaluations.push({ eleveId: data[i][0], competenceCode: data[i][1], niveau: data[i][2], phase: 'pfmp', source: 'eval.pfmp', tpId: '', pfmpId: data[i][3], tuteur: data[i][4], entreprise: data[i][5], enseignant: data[i][6], timestamp: data[i][7] });
    }
  }
  const ccfSheet = getSheet(TABS.CCF_LOG);
  if (ccfSheet && ccfSheet.getLastRow() > 1) {
    const data = ccfSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (eleveId && data[i][0] !== eleveId) continue;
      result.evaluations.push({ eleveId: data[i][0], competenceCode: data[i][1], niveau: data[i][2], phase: 'ccf', source: 'eval.ccf', tpId: '', epreuveCode: data[i][3], sessionId: data[i][4], note: data[i][5], enseignant: data[i][6], timestamp: data[i][7] });
    }
  }
  result.count = result.evaluations.length;
  return result;
}

function getBilanCCF(eleveId, formation) {
  if (!eleveId || !formation) return { error: 'eleveId et formation requis' };
  const diplomeId = formationToDiplomeId_(formation);
  const refResult = getReferentiel(diplomeId);
  const competences = refResult.competences || [];
  if (competences.length === 0) return { error: 'Référentiel non trouvé pour ' + formation };
  const evalResult = getEvaluations(eleveId);
  const evals = evalResult.evaluations || [];
  const niveauxMap = {};
  for (const ev of evals) { const code = ev.competenceCode; const niv = parseInt(ev.niveau) || 0; if (!niveauxMap[code] || niv > niveauxMap[code].niveau) niveauxMap[code] = { niveau: niv, phase: ev.phase, timestamp: ev.timestamp }; }
  const epreuvesMap = {};
  for (const comp of competences) { const ep = comp.epreuveCode || 'AUTRE'; if (!epreuvesMap[ep]) epreuvesMap[ep] = { code: ep, competences: [] }; const niv = niveauxMap[comp.competenceCode] ? niveauxMap[comp.competenceCode].niveau : 0; epreuvesMap[ep].competences.push({ code: comp.competenceCode, libelle: comp.competenceLibelle, capacite: comp.capaciteLibelle, niveau: niv, label: niveauToLabel_(niv), points: niveauToPoints_(niv) }); }
  const epreuves = [];
  for (const epCode of Object.keys(epreuvesMap).sort()) { const ep = epreuvesMap[epCode]; const note = calculateNote_(ep.competences.map(c => c.points)); const coef = getCoefEpreuve_(epCode, formation); epreuves.push({ code: ep.code, competences: ep.competences, note: note, noteArrondie: Math.round(note * 2) / 2, coef: coef, noteCoef: Math.round(note * coef * 2) / 2 }); }
  let totalPoints = 0, totalCoef = 0;
  for (const ep of epreuves) { totalPoints += ep.note * ep.coef; totalCoef += ep.coef; }
  const noteFinale = totalCoef > 0 ? Math.round((totalPoints / totalCoef) * 2) / 2 : 0;
  let avis = 'Non évalué';
  if (noteFinale >= 16) avis = 'Très favorable'; else if (noteFinale >= 12) avis = 'Favorable'; else if (noteFinale >= 8) avis = 'Doit consolider ses acquis'; else if (noteFinale > 0) avis = 'Insuffisant';
  const eleveInfo = getEleves().eleves.find(e => e.id === eleveId) || { id: eleveId, classe: '', code: '' };
  return { eleveId: eleveId, eleveCode: eleveInfo.code, classe: eleveInfo.classe, formation: formation, diplomeId: diplomeId, anneeScolaire: getAnneeScolaire_(), epreuves: epreuves, noteFinale: noteFinale, avis: avis, totalCompetences: competences.length, competencesEvaluees: Object.keys(niveauxMap).length, timestamp: isoParis_(new Date()) };
}

function niveauToLabel_(niv) { const labels = { 0: 'NE', 1: 'ABS', 2: 'NE', 3: 'NA', 4: 'EC', 5: 'M', 6: 'PM', 7: 'EXP' }; return labels[parseInt(niv)] || 'NE'; }
function niveauToPoints_(niv) { const points = { 0: 0, 1: 0, 2: 0, 3: 5, 4: 10, 5: 15, 6: 20, 7: 20 }; return points[parseInt(niv)] || 0; }
function calculateNote_(pointsArray) { if (!pointsArray || pointsArray.length === 0) return 0; const sum = pointsArray.reduce(function(a, b) { return a + b; }, 0); return Math.round((sum / pointsArray.length) * 100) / 100; }
function formationToDiplomeId_(formation) { const map = { 'CAP_IFCA': 'CAP-IFCA', 'BAC_MFER': 'BAC-MFER', 'TNE': 'TNE' }; return map[formation] || formation; }
function getCoefEpreuve_(epreuveCode, formation) { const coefs = { 'CAP_IFCA': { 'EP1': 4, 'EP2': 9, 'EP3': 4 }, 'BAC_MFER': { 'E2': 3, 'E31': 4, 'E32': 3, 'E33': 2 }, 'TNE': { '': 1 } }; const formCoefs = coefs[formation] || {}; return formCoefs[epreuveCode] || 1; }
function getAnneeScolaire_() { const now = new Date(); const y = now.getFullYear(); const m = now.getMonth(); if (m >= 8) return y + '-' + (y + 1); return (y - 1) + '-' + y; }


// ══════════════════════════════════════════════════
// LECTURE (GET)
// ══════════════════════════════════════════════════

function getSeances(enseignant, params) {
  const sheet = getSheet(TABS.SEANCES);
  if (!sheet) return { seances: [] };
  const data = sheet.getDataRange().getValues();
  const seances = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (enseignant && row[SC.ENSEIGNANT - 1] !== enseignant) continue;
    let dateStr = '';
    if (row[SC.DATE - 1] instanceof Date) { dateStr = Utilities.formatDate(row[SC.DATE - 1], 'Europe/Paris', 'yyyy-MM-dd'); } else { dateStr = String(row[SC.DATE - 1]).substring(0, 10); }
    if (params.dateDebut && dateStr < params.dateDebut) continue;
    if (params.dateFin && dateStr > params.dateFin) continue;
    seances.push({ id: row[SC.ID - 1], classe: row[SC.CLASSE - 1], date: dateStr, horaire: row[SC.HORAIRE - 1], type: row[SC.TYPE - 1], sequenceId: row[SC.SEQ_ID - 1], sequenceNom: row[SC.SEQ_NOM - 1], contenu: row[SC.CONTENU - 1], competences: (row[SC.COMPS - 1] || '').split(';').map(c => c.trim()).filter(Boolean), enseignant: row[SC.ENSEIGNANT - 1], statut: row[SC.STATUT - 1] || 'pending', dateValidation: row[SC.DATE_VALID - 1] });
  }
  return { seances };
}

function getSeancesSemaine(enseignant, weekStart) {
  if (!weekStart) weekStart = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd');
  const d = new Date(weekStart); d.setDate(d.getDate() + 6);
  const weekEnd = Utilities.formatDate(d, 'Europe/Paris', 'yyyy-MM-dd');
  return getSeances(enseignant, { dateDebut: weekStart, dateFin: weekEnd });
}

function getEventsFromSheet(enseignant, limit) {
  const sheet = getSheet(TABS.EVENT_LOG);
  if (!sheet) return { events: [] };
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { events: [] };
  const startRow = Math.max(2, lastRow - limit + 1);
  const data = sheet.getRange(startRow, 1, lastRow - startRow + 1, 7).getValues();
  const events = data.map(row => {
    let donnees = {};
    if (row[5]) { try { donnees = typeof row[5] === 'string' ? JSON.parse(row[5]) : row[5]; } catch (e) { donnees = {}; } }
    return { eventId: row[0], timestamp: row[1], type: row[2], acteur: row[3], cible: row[4], donnees: donnees, source: row[6], synced: true };
  });
  return { events: enseignant ? events.filter(e => e.acteur === enseignant) : events };
}

function getEleves(classe) {
  const sheet = getSheet(TABS.ELEVES);
  if (!sheet) return { eleves: [] };
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase().trim());
  const eleves = [];
  for (let i = 1; i < data.length; i++) {
    var row = {};
    headers.forEach(function(h, j) { row[h] = data[i][j] || ''; });
    if (classe && row.classe !== classe) continue;
    eleves.push(row);
  }
  return { eleves };
}

function getDashboard() {
  var sheet = getSheet(TABS.ELEVES);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0].map(function(h) { return String(h).toLowerCase().trim(); });

  // Charger les évals tuteur pour savoir qui a été évalué
  var evalTuteurCodes = {};
  try {
    var etSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName('EvalTuteur');
    if (etSheet) {
      var etData = etSheet.getDataRange().getValues();
      for (var ei = 1; ei < etData.length; ei++) {
        var ec = String(etData[ei][0] || '');
        if (ec) evalTuteurCodes[ec] = true;
      }
    }
  } catch(e) {}

  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = {};
    headers.forEach(function(h, j) { row[h] = data[i][j] !== undefined ? data[i][j] : ''; });
    var code = row.code || row.eleveid || row.codergpd || '';
    result.push({
      code: code,
      nom: row.nom || '',
      prenom: row.prenom || row['prénom'] || '',
      classe: row.classe || '',
      groupe: row.groupe || '',
      annee: row.annee || row['année'] || 1,
      statut: row.statut || 'actif',
      referentiel: row.referentiel || '',
      token_eleve: row.token_eleve || row.token || '',
      token_tuteur: row.token_tuteur || '',
      tel_eleve: row.tel_eleve || row.telephone || '',
      tel_tuteur: row.tel_tuteur || '',
      email_eleve: row.email_eleve || row.email || '',
      tuteur_nom: row.tuteur_nom || '',
      tuteur_email: row.tuteur_email || '',
      entreprise_nom: row.entreprise_nom || row.entreprise || '',
      preference_contact_tuteur: row.preference_contact_tuteur || '',
      hasEvalTuteur: !!evalTuteurCodes[code]
    });
  }
  return result;
}

function getValidations(eleveCode) {
  var sheet = getSheet(TABS.EVALUATIONS_UNIFIEES) || getSheet(TABS.EVALUATIONS);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).toLowerCase().trim(); });
  var result = [];
  var eleveIdx = headers.indexOf('eleveid');
  if (eleveIdx === -1) eleveIdx = headers.indexOf('eleve');
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][eleveIdx]) === eleveCode) {
      var row = {};
      headers.forEach(function(h, j) { row[h] = data[i][j] || ''; });
      result.push(row);
    }
  }
  return result;
}

function getNotes(eleveCode) {
  var sheet = getSheet(TABS.CCF_LOG);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).toLowerCase().trim(); });
  var result = [];
  var eleveIdx = headers.indexOf('eleveid');
  if (eleveIdx === -1) eleveIdx = headers.indexOf('eleve');
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][eleveIdx]) === eleveCode) {
      var row = {};
      headers.forEach(function(h, j) { row[h] = data[i][j] || ''; });
      result.push(row);
    }
  }
  return result;
}

function saveValidation(body) {
  var BASE_HEADERS = ['eleveId','competenceCode','niveau','phase','source','tpId','enseignant','timestamp'];
  var EXT_HEADERS  = ['niveau_qualitatif','date_jury','epreuve','critere','observation','jury_atelier','jury_francais','jury_3'];
  var sheet = getSheet(TABS.EVALUATIONS_UNIFIEES) || getOrCreateSheet(TABS.EVALUATIONS_UNIFIEES, BASE_HEADERS.concat(EXT_HEADERS));
  var entry = body.data || {};

  // Lire les headers actuels et ajouter les colonnes manquantes
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h){ return String(h||'').trim(); });
  var headerLower = headers.map(function(h){ return h.toLowerCase(); });
  var toAdd = [];
  EXT_HEADERS.forEach(function(h){
    if (headerLower.indexOf(h.toLowerCase()) === -1) toAdd.push(h);
  });
  if (toAdd.length) {
    sheet.getRange(1, lastCol + 1, 1, toAdd.length).setValues([toAdd]);
    headers = headers.concat(toAdd);
    headerLower = headers.map(function(h){ return h.toLowerCase(); });
  }

  // Mapper chaque champ vers son index colonne (insensible à la casse)
  function val(h) {
    h = String(h).toLowerCase();
    var i = headerLower.indexOf(h);
    return { idx: i };
  }
  function put(h, v) {
    var p = val(h);
    if (p.idx >= 0) row[p.idx] = v;
  }

  var row = new Array(headers.length).fill('');
  put('eleveId',          body.eleve || entry.eleve || '');
  put('competenceCode',   entry.competence || entry.comp || entry.competenceCode || '');
  put('niveau',           (entry.niveau !== undefined ? entry.niveau : (entry.val !== undefined ? entry.val : '')));
  put('phase',            entry.phase || 'formatif');
  put('source',           entry.source || 'prof');
  put('tpId',             entry.tpId || '');
  put('enseignant',       entry.evaluateur || entry.enseignant || '');
  put('timestamp',        entry.timestamp || new Date().toISOString());
  // Champs étendus (oral français, retour de stage, etc.)
  put('niveau_qualitatif',entry.niveau_qualitatif || '');
  put('date_jury',        entry.date_jury || '');
  put('epreuve',          entry.epreuve || '');
  put('critere',          entry.critere || '');
  put('observation',      entry.observation || '');
  put('jury_atelier',     entry.jury_atelier || '');
  put('jury_francais',    entry.jury_francais || '');
  put('jury_3',           entry.jury_3 || '');

  sheet.appendRow(row);
  return { ok: true, success: true };
}

function addEleveAction(data) {
  var sheet = getSheet(TABS.ELEVES);
  if (!sheet) return { error: 'Onglet Élèves non trouvé' };
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).toLowerCase().trim(); });
  var allData = sheet.getDataRange().getValues();
  var nomIdx = headers.indexOf('nom');
  var prenomIdx = headers.indexOf('prenom');
  var classeIdx = headers.indexOf('classe');
  for (var i = 1; i < allData.length; i++) {
    if (String(allData[i][nomIdx]).toUpperCase() === String(data.nom || '').toUpperCase() && String(allData[i][prenomIdx]).toUpperCase() === String(data.prenom || '').toUpperCase() && String(allData[i][classeIdx]) === String(data.classe || '')) {
      return { ok: true, code: allData[i][headers.indexOf('code')] || '', token_eleve: allData[i][headers.indexOf('token')] || '', token_tuteur: allData[i][headers.indexOf('token_tuteur')] || '', doublon: true };
    }
  }
  // v3.0.1-rgpd : utiliser le code fourni par le client si présent (iwIdentity)
  var code = data.code || ('ELV-' + String(sheet.getLastRow()).padStart(3, '0'));
  var tokenE = Math.random().toString(36).substring(2, 10).toUpperCase();
  var tokenT = Math.random().toString(36).substring(2, 10).toUpperCase();
  var row = headers.map(function(h) {
    if (h === 'code' || h === 'eleveid') return code;
    if (h === 'nom') return data.nom || '';
    if (h === 'prenom' || h === 'prénom') return data.prenom || '';
    if (h === 'classe') return data.classe || '';
    if (h === 'groupe') return data.groupe || '';
    if (h === 'annee' || h === 'année') return data.annee || 1;
    if (h === 'statut') return 'actif';
    if (h === 'referentiel') return data.referentiel || '';
    if (h === 'token' || h === 'token_eleve') return tokenE;
    if (h === 'token_tuteur') return tokenT;
    if (h === 'tel_eleve') return data.tel_eleve || '';
    if (h === 'tel_tuteur') return data.tel_tuteur || '';
    return '';
  });
  sheet.appendRow(row);
  return { ok: true, code: code, token_eleve: tokenE, token_tuteur: tokenT };
}

function updateEleveProfil(body) {
  var sheet = getSheet(TABS.ELEVES);
  if (!sheet) return { error: 'Onglet Élèves non trouvé' };
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).toLowerCase().trim(); });
  var codeIdx = headers.indexOf('code');
  if (codeIdx === -1) codeIdx = headers.indexOf('eleveid');
  var telIdx = headers.indexOf('tel_eleve');
  if (telIdx === -1) telIdx = headers.indexOf('telephone');
  var emailIdx = headers.indexOf('email_eleve');
  if (emailIdx === -1) emailIdx = headers.indexOf('email');
  var tuteurNomIdx = headers.indexOf('tuteur_nom');
  if (tuteurNomIdx === -1) tuteurNomIdx = headers.indexOf('tuteur');
  var telTuteurIdx = headers.indexOf('tel_tuteur');
  var entrepriseNomIdx = headers.indexOf('entreprise_nom');
  var tuteurEmailIdx = headers.indexOf('tuteur_email');
  var code = body.code || body.eleve || '';
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][codeIdx]) === code) {
      if (telIdx !== -1 && body.telephone) sheet.getRange(i + 1, telIdx + 1).setValue(body.telephone);
      if (emailIdx !== -1 && body.email) sheet.getRange(i + 1, emailIdx + 1).setValue(body.email);
      if (tuteurNomIdx !== -1 && body.tuteur_nom) sheet.getRange(i + 1, tuteurNomIdx + 1).setValue(body.tuteur_nom);
      if (telTuteurIdx !== -1 && body.tel_tuteur) sheet.getRange(i + 1, telTuteurIdx + 1).setValue(body.tel_tuteur);
      if (entrepriseNomIdx !== -1 && body.entreprise_nom) sheet.getRange(i + 1, entrepriseNomIdx + 1).setValue(body.entreprise_nom);
      if (tuteurEmailIdx !== -1 && body.tuteur_email) sheet.getRange(i + 1, tuteurEmailIdx + 1).setValue(body.tuteur_email);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Élève non trouvé' };
}

function getReferentiel(diplomeId) {
  const sheet = getSheet(TABS.REFERENTIELS);
  if (!sheet) return { competences: [], error: 'Onglet Referentiels absent. Exécuter setupSpreadsheet().' };
  const data = sheet.getDataRange().getValues();
  const competences = [];
  for (let i = 1; i < data.length; i++) {
    if (diplomeId && data[i][0] !== diplomeId) continue;
    if (String(data[i][6]) !== 'TRUE' && data[i][6] !== true) continue;
    competences.push({ diplomeId: data[i][0], capaciteCode: data[i][1], capaciteLibelle: data[i][2], competenceCode: data[i][3], competenceLibelle: data[i][4], epreuveCode: data[i][5], actif: true });
  }
  return { competences };
}


// ══════════════════════════════════════════════════
// IA — Gemini Flash (enrichissement texte ÉD)
// ══════════════════════════════════════════════════

function enrichirTexteED(seanceId, enseignant) {
  if (!checkGeminiQuota(enseignant)) return { error: 'Quota Gemini atteint' };
  const sheet = getSheet(TABS.SEANCES);
  const data = sheet.getDataRange().getValues();
  const row = data.find(r => r[0] === seanceId);
  if (!row) return { error: 'Séance introuvable' };
  const prompt = 'Contexte: Lycée pro Froid/Climatisation.\nTâche: Rédiger un texte de cahier de texte (3 lignes max) pro et précis.\nClasse: ' + row[1] + ' | Séquence: ' + row[6] + '\nContenu brut: ' + row[7] + '\nCompétences: ' + row[8] + '\nFormat: Brut, sans markdown.';
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!apiKey) throw new Error('Clé API Gemini manquante');
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;
    const resp = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }), muteHttpExceptions: true });
    const respData = JSON.parse(resp.getContentText());
    const text = respData && respData.candidates && respData.candidates[0] && respData.candidates[0].content && respData.candidates[0].content.parts && respData.candidates[0].content.parts[0] && respData.candidates[0].content.parts[0].text;
    if (!text) return { error: 'Réponse Gemini vide ou filtrée.' };
    logIACall(enseignant, 'gemini', 'enrichir_ed', prompt.length + text.length, hashString(prompt));
    return { success: true, texte: text };
  } catch (e) { return { error: 'Erreur IA: ' + e.message }; }
}

function checkGeminiQuota(enseignant) {
  const sheet = getSheet(TABS.LOGS_IA);
  if (!sheet) return true;
  const data = sheet.getDataRange().getValues();
  const moisCourant = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM');
  let count = 0;
  for (let i = 1; i < data.length; i++) { if (data[i][0] === enseignant && data[i][1] === 'gemini' && data[i][2]) { const mois = Utilities.formatDate(new Date(data[i][2]), 'Europe/Paris', 'yyyy-MM'); if (mois === moisCourant) count++; } }
  return count < CONFIG.GEMINI_QUOTA_MENSUEL;
}

function logIACall(user, service, type, tokens, hash) {
  const sheet = getOrCreateSheet(TABS.LOGS_IA, ['Enseignant','Service','Date','Type','Tokens','Coût','Hash']);
  sheet.appendRow([user, service, new Date(), type, tokens, 0, hash || '']);
}

function hashString(str) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str);
  return digest.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('').slice(0, 16);
}


// ══════════════════════════════════════════════════
// MODULE COPILOTE IA — V1.1
// ══════════════════════════════════════════════════

const COPILOT_ALLOWED_ACTIONS = ['seance.validee','seance.invalidee','seance.annulee','seance.creee','competence.evaluee'];
const COPILOT_FORCE_CONFIRM = ['seance.annulee','seance.creee'];

const SCHEMA_COPILOTE = {
  type: "OBJECT",
  properties: {
    message_vocal: { type: "STRING", description: "Réponse courte et directe à l'enseignant (1-2 phrases max)." },
    confirmation_requise: { type: "BOOLEAN", description: "true si ambigu, info manquante, ou enjeu CCF/annulation/création." },
    actions: { type: "ARRAY", items: { type: "OBJECT", properties: { type: { type: "STRING", enum: COPILOT_ALLOWED_ACTIONS }, cible: { type: "STRING", description: "ID stable (sea-... ou elv-...)" }, donnees: { type: "OBJECT", description: "Données selon le type" } }, required: ["type", "cible"] } }
  },
  required: ["message_vocal", "confirmation_requise", "actions"]
};

function parseHeureEnMinutes_(heure) { if (!heure) return 0; const parts = String(heure).match(/(\d{1,2}):(\d{2})/); if (!parts) return 0; return parseInt(parts[1]) * 60 + parseInt(parts[2]); }

function parseHoraireBornes_(horaire) { if (!horaire) return null; const parts = String(horaire).match(/(\d{1,2}:\d{2})\s*[–\-—]\s*(\d{1,2}:\d{2})/); if (!parts) return null; return { debut: parseHeureEnMinutes_(parts[1]), fin: parseHeureEnMinutes_(parts[2]) }; }

function resolveSeanceCible_(seancesDuJour, heureActuelle) {
  const pending = seancesDuJour.filter(s => s.statut !== 'validee' && s.statut !== 'done');
  if (pending.length === 0) return null;
  const nowMin = parseHeureEnMinutes_(heureActuelle);
  for (const s of pending) { const bornes = parseHoraireBornes_(s.horaire); if (bornes && nowMin >= bornes.debut && nowMin <= bornes.fin) return s; }
  let meilleure = null, meilleureEcart = Infinity;
  for (const s of pending) { const bornes = parseHoraireBornes_(s.horaire); if (bornes && nowMin > bornes.fin) { const ecart = nowMin - bornes.fin; if (ecart <= 30 && ecart < meilleureEcart) { meilleure = s; meilleureEcart = ecart; } } }
  if (meilleure) return meilleure;
  if (pending.length === 1) return pending[0];
  return null;
}

function genererTexteED_v2_(seance) {
  let texte = '';
  if (seance.sequenceNom) texte += '📚 ' + seance.sequenceNom + '\n\n';
  if (seance.contenu) texte += seance.contenu + '\n\n'; else texte += 'Séance réalisée conformément à la progression.\n\n';
  const comps = Array.isArray(seance.competences) ? seance.competences.join(' ; ') : (seance.competences || '');
  if (comps) texte += 'Compétences travaillées : ' + comps + '\n';
  return texte.trim();
}

function checkSeuilCCF_(eleveId, competenceCode) {
  const sheet = getSheet(TABS.EVENT_LOG);
  if (!sheet) return { count: 0, seuil: false, proche: false };
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { count: 0, seuil: false, proche: false };
  const data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  let count = 0;
  for (let i = 0; i < data.length; i++) { if (data[i][2] === 'competence.evaluee' && data[i][4] === eleveId) { try { const donnees = typeof data[i][5] === 'string' ? JSON.parse(data[i][5]) : data[i][5]; if (donnees && donnees.competenceCode === competenceCode && parseInt(donnees.niveau) >= 3) count++; } catch (e) {} } }
  return { count, seuil: count >= 3, proche: count === 2 };
}

const PROMPT_MASTER = "Tu es inerWeb, le copilote pédagogique d'un enseignant en froid & climatisation.\n\nSTYLE :\n- Respecte le style indiqué dans le contexte (tutoiement ou vouvoiement).\n- Réponse COURTE (1-2 phrases max). Jamais de blabla.\n\nRÔLE STRICT :\nTu traduis le langage naturel en intentions d'actions JSON.\nTu N'ES PAS la source de vérité. Le système l'est. Tu PROPOSES, tu ne DÉCIDES jamais.\nL'enseignant a PRÉ-ANONYMISÉ les prénoms en codes (elv-xxx) avant de t'envoyer sa demande.\n\nRÈGLES ABSOLUES :\n1. N'invente JAMAIS un ID. Utilise UNIQUEMENT ceux du CONTEXTE_JSON.\n2. Si ambigu ou info manquante → confirmation_requise: true, actions: [], et pose une question claire.\n3. Actions autorisées : seance.validee, seance.invalidee, seance.annulee, seance.creee, competence.evaluee.\n4. Pour seance.annulee et seance.creee → TOUJOURS confirmation_requise: true.\n5. Pour competence.evaluee → donnees DOIT contenir competenceCode, niveau (1-4, NE, ABS), et seanceId.\n6. Si seance_cible_probable existe, utilise-la pour \"C'est fait\" / \"Valide\".\n7. Fuseau horaire : Europe/Paris.\n\nVOCABULAIRE MÉTIER :\n- \"C'est fait\" / \"C'est bon\" / \"Validé\" / \"OK\" → seance.validee\n- \"Annule\" / \"Ils sont pas venus\" / \"Grève\" → seance.annulee (+ motif)\n- \"Mets un 3\" / \"Il a bien bossé\" → competence.evaluee\n- \"le froid\" / \"le brasage\" / \"la PAC\" / \"le vide\" → chercher dans les séquences du contexte";

function askCopilot(texteVocal, enseignantId, styleOverride) {
  if (!texteVocal || !enseignantId) return { message: 'Paramètres manquants.', confirmation_requise: true, actions_executees: 0 };
  if (!checkGeminiQuota(enseignantId)) return { message: 'Quota IA épuisé ce mois-ci.', confirmation_requise: true, actions_executees: 0 };
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) return { message: 'Clé GEMINI_API_KEY manquante.', confirmation_requise: true, actions_executees: 0 };
  const style = styleOverride || { pronom: 'tu', ton: 'direct' };
  const now = new Date();
  const dateStr = Utilities.formatDate(now, 'Europe/Paris', 'yyyy-MM-dd');
  const heureActuelle = Utilities.formatDate(now, 'Europe/Paris', 'HH:mm');
  const toutesSeances = getSeances(enseignantId, { dateDebut: dateStr, dateFin: dateStr }).seances || [];
  const classesDuJour = [...new Set(toutesSeances.map(s => s.classe))];
  let elevesFiltered = [];
  for (const cls of classesDuJour) { const res = getEleves(cls); if (res.eleves) elevesFiltered = elevesFiltered.concat(res.eleves); }
  const seanceIds = new Set(toutesSeances.map(s => s.id));
  const eleveIds = new Set(elevesFiltered.map(e => e.id));
  const seanceCible = resolveSeanceCible_(toutesSeances, heureActuelle);
  const contexteObj = { date: dateStr, heure: heureActuelle, timezone: 'Europe/Paris', style: style, seance_cible_probable: seanceCible ? { id: seanceCible.id, classe: seanceCible.classe, horaire: seanceCible.horaire, sequenceNom: seanceCible.sequenceNom, contenu: seanceCible.contenu, competences: seanceCible.competences } : null, seances_du_jour: toutesSeances.map(s => ({ id: s.id, classe: s.classe, horaire: s.horaire, type: s.type, sequenceNom: s.sequenceNom, contenu: s.contenu, competences: s.competences, statut: s.statut })), eleves: elevesFiltered.map(e => ({ id: e.id, classe: e.classe, groupe: e.groupe })) };
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;
  const payload = { systemInstruction: { parts: [{ text: PROMPT_MASTER }] }, contents: [{ parts: [{ text: 'CONTEXTE_JSON:\n' + JSON.stringify(contexteObj) + '\n\nDemande: "' + texteVocal + '"' }] }], generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA_COPILOTE, temperature: 0.1 } };
  let iaResult;
  try {
    const resp = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true });
    if (resp.getResponseCode() !== 200) { Logger.log('Erreur Gemini: ' + resp.getContentText()); return { message: 'Erreur IA. Réessaie.', confirmation_requise: true, actions_executees: 0 }; }
    const data = JSON.parse(resp.getContentText());
    const text = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
    if (!text) { Logger.log('Réponse Gemini vide: ' + resp.getContentText().substring(0, 500)); return { message: 'Réponse IA vide. Reformule.', confirmation_requise: true, actions_executees: 0 }; }
    iaResult = JSON.parse(text);
    if (typeof iaResult.confirmation_requise !== 'boolean' || !Array.isArray(iaResult.actions)) return { message: 'Réponse IA invalide. Reformule.', confirmation_requise: true, actions_executees: 0 };
  } catch (e) { Logger.log('Exception copilote: ' + e.message); return { message: 'Problème de connexion copilote.', confirmation_requise: true, actions_executees: 0 }; }
  if ((iaResult.actions || []).some(a => COPILOT_FORCE_CONFIRM.includes(a.type))) iaResult.confirmation_requise = true;
  if (iaResult.confirmation_requise) { logIACall(enseignantId, 'gemini', 'copilot_ask', texteVocal.length, hashString(texteVocal)); return { message: iaResult.message_vocal, confirmation_requise: true, actions_proposees: iaResult.actions || [], actions_executees: 0 }; }
  const cleanEvents = [];
  const resultats = [];
  for (const action of (iaResult.actions || [])) {
    if (!action || !COPILOT_ALLOWED_ACTIONS.includes(action.type)) continue;
    const cible = String(action.cible || '');
    if (action.type === 'seance.validee' || action.type === 'seance.invalidee') {
      if (!seanceIds.has(cible)) continue;
      cleanEvents.push({ eventId: 'evt-' + Utilities.getUuid().slice(0, 12), timestamp: isoParis_(new Date()), type: action.type, acteur: enseignantId, cible: cible, donnees: action.donnees || {}, source: 'ia_copilot' });
      if (action.type === 'seance.validee') { const seance = toutesSeances.find(s => s.id === cible); if (seance) resultats.push({ type: action.type, cible, success: true, texteED: genererTexteED_v2_(seance) }); } else { resultats.push({ type: action.type, cible, success: true }); }
    }
    if (action.type === 'competence.evaluee') {
      if (!eleveIds.has(cible)) continue;
      const d = action.donnees || {};
      if (!d.competenceCode || typeof d.niveau === 'undefined') continue;
      if (d.seanceId && !seanceIds.has(String(d.seanceId))) continue;
      cleanEvents.push({ eventId: 'evt-' + Utilities.getUuid().slice(0, 12), timestamp: isoParis_(new Date()), type: action.type, acteur: enseignantId, cible: cible, donnees: { competenceCode: String(d.competenceCode), niveau: d.niveau, seanceId: d.seanceId ? String(d.seanceId) : '' }, source: 'ia_copilot' });
      const ccf = checkSeuilCCF_(cible, String(d.competenceCode));
      resultats.push({ type: action.type, cible, success: true, ccf_count: ccf.count + 1, ccf_seuil: (ccf.count + 1) >= 3 });
    }
  }
  if (cleanEvents.length === 0) { logIACall(enseignantId, 'gemini', 'copilot_noop', texteVocal.length, hashString(texteVocal)); return { message: "Rien de fiable. Précise la séance ou l'élève.", confirmation_requise: true, actions_proposees: iaResult.actions || [], actions_executees: 0 }; }
  const writeResult = pushEvents(cleanEvents);
  logIACall(enseignantId, 'gemini', 'copilot_exec', texteVocal.length, hashString(texteVocal));
  let messageRetour = iaResult.message_vocal || 'Action effectuée.';
  const ccfAlerts = resultats.filter(r => r.ccf_seuil);
  if (ccfAlerts.length > 0) messageRetour += ' ⚠️ Seuil CCF atteint pour ' + ccfAlerts.map(a => a.cible).join(', ') + '.';
  return { message: messageRetour, confirmation_requise: false, actions_executees: writeResult.written || cleanEvents.length, resultats: resultats, texte_ed: resultats.find(r => r.texteED) ? resultats.find(r => r.texteED).texteED : null };
}


// ══════════════════════════════════════════════════
// SETUP & DONNÉES DÉMO
// ══════════════════════════════════════════════════

function setupSpreadsheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  getOrCreateSheet(TABS.EVENT_LOG, ['eventId','timestamp','type','acteur','cible','donnees','source']);
  getOrCreateSheet(TABS.SEANCES, ['seanceId','classe','date','horaire','type','séquenceId','séquenceNom','contenu','compétences','enseignant','statut','dateValidation']);
  getOrCreateSheet(TABS.ELEVES, ['code','nom','prenom','classe','groupe','annee','statut','referentiel','token','token_tuteur','tel_eleve','tel_tuteur','email_eleve','tuteur_nom','tuteur_email','entreprise_nom','preference_contact_tuteur']);
  getOrCreateSheet(TABS.EVALUATIONS, ['eleveId','competenceCode','niveau','seanceId','enseignant','timestamp']);
  getOrCreateSheet(TABS.EVALUATIONS_UNIFIEES, ['eleveId','competenceCode','niveau','phase','source','tpId','enseignant','timestamp']);
  getOrCreateSheet(TABS.CCF_LOG, ['eleveId','competenceCode','niveau','epreuveCode','sessionId','note','enseignant','timestamp']);
  getOrCreateSheet(TABS.PFMP_LOG, ['eleveId','competenceCode','niveau','pfmpId','tuteur','entreprise','enseignant','timestamp']);
  getOrCreateSheet(TABS.REFERENTIELS, ['diplomeId','capaciteCode','capaciteLibelle','competenceCode','competenceLibelle','epreuveCode','actif']);
  getOrCreateSheet(TABS.LOGS_IA, ['Enseignant','Service','Date','Type','Tokens','Coût','Hash']);
  getOrCreateSheet('Users', ['id', 'email', 'nom', 'role', 'dateCreation', 'actif']);
  const def = ss.getSheetByName('Feuille 1') || ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > 1) { try { ss.deleteSheet(def); } catch(e) {} }
  Logger.log('✅ Structure v2.5.1 créée avec succès (9 onglets)');
}

function populateDemoSeances() {
  const sheet = getSheet(TABS.SEANCES);
  if (sheet.getLastRow() > 1) { Logger.log('Séances déjà présentes, abandon.'); return; }
  const seances = [];
  const start = new Date(2026, 1, 2);
  for (let w = 0; w < 4; w++) {
    const monday = new Date(start); monday.setDate(monday.getDate() + (w * 7));
    const d = (dayOffset) => { const x = new Date(monday); x.setDate(x.getDate() + dayOffset); return Utilities.formatDate(x, 'Europe/Paris', 'yyyy-MM-dd'); };
    seances.push(['sea-' + d(0) + '-2tne-0800', '2TNE', d(0), '08:00 – 10:00', 'hebdo', 'S2', 'Fluides frigo', 'Propriétés des fluides', 'C2.1;C2.3', 'ens-fh', 'pending', '']);
    seances.push(['sea-' + d(1) + '-cap1ifca-0800', 'CAP1 IFCA', d(1), '08:00 – 10:00', 'hebdo', 'S2', 'Mise en service', 'Contrôle pressions', 'CC2.1;CC2.3', 'ens-fh', 'pending', '']);
    seances.push(['sea-' + d(1) + '-tmfer-1330', 'TMFER', d(1), '13:30 – 15:30', 'hebdo', 'S2', 'PAC air/eau', 'Principe PAC', 'C2.1;C2.2', 'ens-fh', 'pending', '']);
    if (w % 2 === 0) seances.push(['sea-' + d(2) + '-cfaetam1a-1000', 'CFA ÉTAM 1A', d(2), '10:00 – 12:00', 'rassemblement', 'S1', 'Étanchéité', 'Test porte soufflante', 'C1.1;C2.1', 'ens-fh', 'pending', '']);
    seances.push(['sea-' + d(2) + '-tpsupcvc-1400', 'TP Sup CVC', d(2), '14:00 – 16:00', 'complement', 'S1', 'Lecture plans', 'Symboles CVC', 'C1.2;C4.1', 'ens-fh', 'pending', '']);
    if (w % 2 !== 0) seances.push(['sea-' + d(4) + '-cfampi1a-0800', 'CFA MPI 1A', d(4), '08:00 – 10:00', 'rassemblement', 'S1', 'Réseaux', 'Brasure cuivre', 'C1.1;C1.2', 'ens-fh', 'pending', '']);
  }
  sheet.getRange(2, 1, seances.length, 12).setValues(seances);
  Logger.log('✅ ' + seances.length + ' séances démo créées');
  populateDemoEleves();
}

function populateDemoEleves() {
  const sheet = getSheet(TABS.ELEVES);
  if (sheet.getLastRow() > 1) return;
  const data = [];
  function add(cls, pfx, n) { for (var i = 1; i <= n; i++) data.push(['elv-' + pfx.toLowerCase() + '-' + i, cls, pfx + '-' + String(i).padStart(2, '0'), i <= n / 2 ? 'A' : 'B']); }
  add('2TNE', 'TNE', 25); add('CAP1 IFCA', 'CAP1', 20); add('TMFER', 'TMFER', 30); add('CFA ÉTAM 1A', 'ETAM1A', 12);
  sheet.getRange(2, 1, data.length, 4).setValues(data);
  Logger.log('✅ ' + data.length + ' élèves démo créés');
}

function populateReferentiels() {
  const sheet = getOrCreateSheet(TABS.REFERENTIELS, ['diplomeId','capaciteCode','capaciteLibelle','competenceCode','competenceLibelle','epreuveCode','actif']);
  if (sheet.getLastRow() > 1) { Logger.log('Referentiels déjà peuplés, abandon.'); return; }
  const rows = [
    ['TNE','CC1','Préparation','CC1','S\'informer sur l\'intervention ou sur la réalisation','',true],
    ['TNE','CC2','Préparation','CC2','Organiser la réalisation ou l\'intervention','',true],
    ['TNE','CC3','Préparation','CC3','Analyser et exploiter les données','',true],
    ['TNE','CC4','Réalisation et mise en service','CC4','Réaliser une installation ou une intervention','',true],
    ['TNE','CC5','Réalisation et mise en service','CC5','Effectuer les opérations préalables','',true],
    ['TNE','CC6','Réalisation et mise en service','CC6','Mettre en service','',true],
    ['TNE','CC7','Maintenance','CC7','Réaliser une opération de maintenance','',true],
    ['TNE','CC8','Communication','CC8','Renseigner les documents','',true],
    ['TNE','CC9','Communication','CC9','Communiquer avec le client et/ou l\'usager','',true],
    ['CAP-IFCA','C1','Communiquer','C1.1','Recueillir sur le site les informations nécessaires','EP1',true],
    ['CAP-IFCA','C1','Communiquer','C1.2','Transmettre les informations et rendre compte','EP1',true],
    ['CAP-IFCA','C1','Communiquer','C1.3','Compléter les documents liés à l\'intervention','EP1',true],
    ['CAP-IFCA','C2','Préparer, organiser','C2.1','Contrôler les éléments livrés et les conditions','EP1',true],
    ['CAP-IFCA','C2','Préparer, organiser','C2.2','Préparer les conditions de l\'intervention','EP1',true],
    ['CAP-IFCA','C2','Préparer, organiser','C2.3','Sécuriser l\'intervention','EP1',true],
    ['CAP-IFCA','C3','Réaliser une installation','C3.1','Implanter, fixer, poser les matériels et supports','EP2',true],
    ['CAP-IFCA','C3','Réaliser une installation','C3.2','Assembler les supports et chemins de câble','EP2',true],
    ['CAP-IFCA','C3','Réaliser une installation','C3.3','Poser les réseaux aérauliques et hydrauliques','EP2',true],
    ['CAP-IFCA','C3','Réaliser une installation','C3.4','Façonner, raccorder, assembler, isoler les circuits','EP2',true],
    ['CAP-IFCA','C3','Réaliser une installation','C3.5','Soudage acier et raccordement PER','EP2',true],
    ['CAP-IFCA','C3','Réaliser une installation','C3.6','Câbler, repérer, connecter liaisons électriques','EP2',true],
    ['CAP-IFCA','C3','Réaliser une installation','C3.7','Contrôler mise en œuvre équipements','EP2',true],
    ['CAP-IFCA','C3','Réaliser une installation','C3.8','Réaliser les opérations de finition','EP2',true],
    ['CAP-IFCA','C3','Réaliser une installation','C3.9','Assurer l\'étanchéité circuit avant mise en service','EP2',true],
    ['CAP-IFCA','C4','Mettre en service','C4.1','Vérifier la conformité d\'une installation','EP3',true],
    ['CAP-IFCA','C4','Mettre en service','C4.2','Tirer au vide un circuit frigorifique','EP3',true],
    ['CAP-IFCA','C4','Mettre en service','C4.3','Charger en fluide frigorigène','EP3',true],
    ['CAP-IFCA','C4','Mettre en service','C4.4','Mettre sous tension une installation','EP3',true],
    ['CAP-IFCA','C4','Mettre en service','C4.5','Contrôler le fonctionnement de l\'installation','EP3',true],
    ['CAP-IFCA','C4','Mettre en service','C4.6','Paramétrer/régler valeurs consigne régulation/sécurité','EP3',true],
    ['CAP-IFCA','C4','Mettre en service','C4.7','Raccorder équipements charge, mesure, contrôle','EP3',true],
    ['CAP-IFCA','C5','Maintenir','C5.1','Remplacer des composants de l\'installation','EP3',true],
    ['CAP-IFCA','C5','Maintenir','C5.2','Réaliser les opérations de maintenance préventive','EP3',true],
    ['CAP-IFCA','C5','Maintenir','C5.3','Participer au diagnostic','EP3',true],
    ['BAC-MFER','C1','Préparation','C1','Analyser les conditions de l\'opération et son contexte','E2',true],
    ['BAC-MFER','C2','Préparation','C2','Analyser et exploiter les données techniques','E2',true],
    ['BAC-MFER','C3','Préparation','C3','Choisir les matériels, équipements et outillage','E2',true],
    ['BAC-MFER','C4','Préparation','C4','Organiser et sécuriser son intervention','E2',true],
    ['BAC-MFER','C5','Réalisation','C5','Réaliser (réseaux fluidiques, câblage, implantation)','E31',true],
    ['BAC-MFER','C6','Mise en service','C6','Mettre en service l\'installation','E31',true],
    ['BAC-MFER','C7','Maintenance','C7','Maintenir (préventif + correctif)','E32',true],
    ['BAC-MFER','C8','Communication','C8','Communiquer (rendre compte, renseigner, conseiller)','E31',true],
    ['BAC-MFER','C9','Écoresponsabilité','C9','Agir de manière écoresponsable','E31',true],
  ];
  sheet.getRange(2, 1, rows.length, 7).setValues(rows);
  Logger.log('✅ ' + rows.length + ' compétences référentiels créées (TNE + CAP-IFCA + BAC-MFER)');
}


// ══════════════════════════════════════════════════
// UTILITAIRES
// ══════════════════════════════════════════════════

function isoParis_(d) { return Utilities.formatDate(d, 'Europe/Paris', "yyyy-MM-dd'T'HH:mm:ssXXX"); }
function getSheet(n) { return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(n); }
function getOrCreateSheet(n, h) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let s = ss.getSheetByName(n);
  if (!s) {
    s = ss.insertSheet(n);
    if (h) s.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold');
  } else if (h) {
    // Migration : ajouter les colonnes manquantes
    var existing = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0].map(function(v){ return String(v).trim(); });
    var added = false;
    h.forEach(function(col) {
      if (existing.indexOf(col) === -1) {
        var newCol = existing.length + 1;
        s.getRange(1, newCol).setValue(col).setFontWeight('bold');
        existing.push(col);
        added = true;
      }
    });
  }
  return s;
}


// ══════════════════════════════════════════════════
// MODULE IMPORT ÉCOLE DIRECTE (iCal)
// ══════════════════════════════════════════════════

function importEcoleDirecte(icalUrl, enseignantId) {
  if (!icalUrl || !enseignantId) return { error: 'URL iCal et enseignant requis' };
  if (!icalUrl.includes('ecoledirecte.com') || !icalUrl.endsWith('.ics')) return { error: 'URL invalide. Format attendu : https://api.ecoledirecte.com/v3/ical/P/.../xxx.ics' };
  let icalText;
  try { const resp = UrlFetchApp.fetch(icalUrl, { muteHttpExceptions: true }); if (resp.getResponseCode() !== 200) return { error: 'École Directe a répondu ' + resp.getResponseCode() }; icalText = resp.getContentText(); } catch (e) { return { error: 'Impossible de joindre École Directe : ' + e.message }; }
  if (!icalText.includes('BEGIN:VCALENDAR')) return { error: 'Le contenu récupéré n\'est pas un calendrier iCal valide.' };
  const events = parseIcalEvents_(icalText);
  if (events.length === 0) return { error: 'Aucun événement trouvé dans le calendrier.' };
  const seances = [];
  const sheet = getOrCreateSheet(TABS.SEANCES);
  const existingIds = new Set();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) existingIds.add(data[i][0]);
  for (const evt of events) {
    const seanceId = 'ed-' + evt.uid;
    if (existingIds.has(seanceId)) continue;
    const parsed = parseEDDescription_(evt.description);
    const horaire = formatHoraireParis_(evt.dtstart, evt.dtend);
    const dateParis = convertUTCtoParis_(evt.dtstart);
    const dateStr = Utilities.formatDate(dateParis, 'Europe/Paris', 'yyyy-MM-dd');
    seances.push([seanceId, parsed.classe, dateParis, horaire, detectType_(parsed.classe, evt.summary), '', evt.summary || parsed.classe, buildContenu_(evt.summary, parsed, evt.location), '', enseignantId, 'pending', '']);
    existingIds.add(seanceId);
  }
  if (seances.length === 0) return { success: true, imported: 0, message: 'Toutes les séances étaient déjà importées.' };
  const lock = LockService.getScriptLock();
  try { lock.waitLock(10000); const lastRow = sheet.getLastRow(); sheet.getRange(lastRow + 1, 1, seances.length, 12).setValues(seances); } finally { lock.releaseLock(); }
  const logSheet = getOrCreateSheet(TABS.EVENT_LOG, ['eventId','timestamp','type','acteur','cible','donnees','source']);
  logSheet.appendRow(['evt-import-' + Date.now(), isoParis_(new Date()), 'import.ecole_directe', enseignantId, icalUrl.substring(0, 60) + '...', JSON.stringify({ count: seances.length, classes: [...new Set(seances.map(s => s[1]))] }), 'api']);
  const classes = {};
  for (const s of seances) classes[s[1]] = (classes[s[1]] || 0) + 1;
  return { success: true, imported: seances.length, total_events: events.length, duplicates: events.length - seances.length, classes: classes, periode: { debut: seances.length ? Utilities.formatDate(seances[0][2], 'Europe/Paris', 'yyyy-MM-dd') : '', fin: seances.length ? Utilities.formatDate(seances[seances.length-1][2], 'Europe/Paris', 'yyyy-MM-dd') : '' } };
}

function parseIcalEvents_(text) {
  const events = [];
  const blocks = text.split('BEGIN:VEVENT');
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split('END:VEVENT')[0];
    const evt = {};
    const unfolded = block.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
    for (const line of unfolded.split(/\r?\n/)) {
      const idx = line.indexOf(':'); if (idx < 0) continue;
      const key = line.substring(0, idx).split(';')[0].trim();
      const val = line.substring(idx + 1).trim();
      switch (key) { case 'UID': evt.uid = val; break; case 'DTSTART': evt.dtstart = val; break; case 'DTEND': evt.dtend = val; break; case 'SUMMARY': evt.summary = val; break; case 'DESCRIPTION': evt.description = val; break; case 'LOCATION': evt.location = val; break; }
    }
    if (evt.uid && evt.dtstart) events.push(evt);
  }
  events.sort((a, b) => (a.dtstart || '').localeCompare(b.dtstart || ''));
  return events;
}

function parseEDDescription_(desc) { if (!desc) return { profs: [], classe: '?' }; const parts = desc.split(' - '); if (parts.length < 2) return { profs: [desc], classe: desc }; const profsRaw = parts[0]; const classe = parts.slice(1).join(' - ').trim(); const profs = profsRaw.split(',').map(p => p.trim()).filter(Boolean); return { profs, classe }; }
function detectType_(classe, summary) { const cl = (classe || '').toUpperCase(); const su = (summary || '').toUpperCase(); if (cl.includes('CFA') || cl.includes('ETAM') || cl.includes('MPI')) return 'rassemblement'; if (su.includes('CO-INTERVENTION')) return 'co-intervention'; if (cl.includes('TP CVC') || cl.includes('TP SUP')) return 'complement'; return 'hebdo'; }
function convertUTCtoParis_(dtstr) { if (!dtstr) return new Date(); const y = parseInt(dtstr.substr(0, 4)); const m = parseInt(dtstr.substr(4, 2)) - 1; const d = parseInt(dtstr.substr(6, 2)); const h = parseInt(dtstr.substr(9, 2)); const min = parseInt(dtstr.substr(11, 2)); return new Date(Date.UTC(y, m, d, h, min, 0)); }
function formatHoraireParis_(dtstart, dtend) { const start = convertUTCtoParis_(dtstart); const end = convertUTCtoParis_(dtend); const fmtH = (d) => Utilities.formatDate(d, 'Europe/Paris', 'HH:mm'); return fmtH(start) + ' – ' + fmtH(end); }
function buildContenu_(summary, parsed, location) { let parts = []; if (summary) parts.push(summary); if (parsed.profs && parsed.profs.length > 1) { const autres = parsed.profs.filter(p => !p.toUpperCase().includes('HENNINOT')); if (autres.length > 0) parts.push('Co-enseignement avec ' + autres.join(', ')); } if (location) parts.push('Salle ' + location); return parts.join(' — ') || parsed.classe; }


// ══════════════════════════════════════════════════
// JOURNAL ÉLÈVE (v7.8.3 — photos Drive + getJournal)
// ══════════════════════════════════════════════════

function savePhotoToDrive(code, base64Data, index) {
  try {
    var props = PropertiesService.getScriptProperties();
    var folderId = props.getProperty('DRIVE_FOLDER_ID');
    var root = folderId ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder();
    var sub = root.getFoldersByName('PFMP_Photos');
    var parentFolder = sub.hasNext() ? sub.next() : root.createFolder('PFMP_Photos');
    var sub2 = parentFolder.getFoldersByName(code);
    var folder = sub2.hasNext() ? sub2.next() : parentFolder.createFolder(code);
    var parts = base64Data.split(',');
    var mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/jpeg';
    var bytes = Utilities.base64Decode(parts[1] || parts[0]);
    var ext = mime === 'application/pdf' ? '.pdf' : mime.indexOf('png') !== -1 ? '.png' : '.jpg';
    var blob = Utilities.newBlob(bytes, mime, code + '_' + Date.now() + '_' + index + ext);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return 'https://lh3.googleusercontent.com/d/' + file.getId();
  } catch (e) { Logger.log('Erreur photo Drive: ' + e.message); return null; }
}

function getJournal(eleveCode) {
  if (!eleveCode) return [];
  var headers = ['eleveCode', 'token', 'entryId', 'date', 'type', 'text', 'photos', 'timestamp'];
  var sheet = getOrCreateSheet('Journal', headers);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (String(row[0]) !== String(eleveCode)) continue;
    var photos = [];
    try { photos = row[6] ? JSON.parse(row[6]) : []; } catch(e) { photos = []; }
    result.push({ id: row[2] || '', date: row[3] || '', type: row[4] || 'activite', text: row[5] || '', photos: photos, timestamp: row[7] || '' });
  }
  return result;
}

function addJournalEntry(body) {
  var token = body.token || '';
  var eleveCode = body.eleve || '';
  var entryStr = body.entry || '';
  if (!token && !eleveCode) return { ok: false, error: 'Paramètres manquants (token ou eleve requis)' };
  var entry;
  try { entry = typeof entryStr === 'string' ? JSON.parse(entryStr) : entryStr; } catch (err) { return { ok: false, error: 'Entrée journal invalide' }; }
  var photoUrls = [];
  if (entry.photos && Array.isArray(entry.photos)) {
    for (var pi = 0; pi < entry.photos.length; pi++) {
      var photo = entry.photos[pi];
      if (typeof photo === 'string' && photo.indexOf('data:') === 0) { var url = savePhotoToDrive(eleveCode, photo, pi); if (url) photoUrls.push(url); }
      else if (typeof photo === 'string' && photo.indexOf('http') === 0) { photoUrls.push(photo); }
    }
  }
  var headers = ['eleveCode', 'token', 'entryId', 'date', 'type', 'text', 'photos', 'timestamp'];
  var sheet = getOrCreateSheet('Journal', headers);
  var entryId = entry.id || '';
  var updated = false;
  if (entryId) {
    var allData = sheet.getDataRange().getValues();
    for (var ri = 1; ri < allData.length; ri++) {
      if (String(allData[ri][2]) === String(entryId)) {
        sheet.getRange(ri + 1, 5).setValue(entry.type || '');
        sheet.getRange(ri + 1, 6).setValue(entry.text || '');
        sheet.getRange(ri + 1, 7).setValue(photoUrls.length ? JSON.stringify(photoUrls) : '');
        sheet.getRange(ri + 1, 8).setValue(new Date().toISOString());
        updated = true; break;
      }
    }
  }
  if (!updated) {
    sheet.appendRow([eleveCode, token, entryId, entry.date || '', entry.type || '', entry.text || '', photoUrls.length ? JSON.stringify(photoUrls) : '', new Date().toISOString()]);
  }
  return { ok: true, success: true, photoUrls: photoUrls };
}


// ══════════════════════════════════════════════════
// ÉVALUATION TUTEUR (v7.6.1)
// ══════════════════════════════════════════════════

function saveEvalTuteur(body) {
  var eleveCode = body.eleve || '';
  var tuteurToken = body.tuteur || '';
  var dataStr = body.data || '';
  if (!eleveCode || !tuteurToken) return { ok: false, error: 'Paramètres manquants (eleve et tuteur requis)' };
  var verif = verifyTuteurToken(eleveCode, tuteurToken);
  if (!verif.ok) return { ok: false, error: 'Token tuteur invalide' };
  var payload;
  try { payload = typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr; } catch (err) { return { ok: false, error: 'Données évaluation invalides' }; }

  // Extraire les infos détaillées tuteur/entreprise
  var tuteurNom = payload.tuteur || '';
  var entrepriseNom = payload.entreprise || '';
  var tuteurEmail = '';
  var tuteurTel = '';
  var entrepriseAdresse = '';
  var entrepriseCP = '';
  var entrepriseVille = '';
  var entrepriseDirigeant = '';
  var tuteursJSON = '';

  // Infos tuteurs (tableau complet avec nom/tel/email)
  if (payload.tuteurs && payload.tuteurs.length) {
    tuteurNom = payload.tuteurs[0].nom || tuteurNom;
    tuteurTel = payload.tuteurs[0].tel || '';
    tuteurEmail = payload.tuteurs[0].email || '';
    tuteursJSON = JSON.stringify(payload.tuteurs);
  }
  // Infos entreprise détaillées
  if (payload.entrepriseData) {
    entrepriseNom = payload.entrepriseData.nom || entrepriseNom;
    entrepriseAdresse = payload.entrepriseData.adresse || '';
    entrepriseCP = payload.entrepriseData.cp || '';
    entrepriseVille = payload.entrepriseData.ville || '';
    entrepriseDirigeant = payload.entrepriseData.dirigeant || '';
  }

  // 1. Sauvegarder l'évaluation dans EvalTuteur (écriture par nom de colonne)
  var wantedHeaders = ['eleveCode', 'tuteur', 'tuteur_email', 'tuteur_tel', 'entreprise', 'entreprise_adresse', 'entreprise_cp', 'entreprise_ville', 'entreprise_dirigeant', 'tuteurs_json', 'periode', 'phase', 'competences', 'comportement', 'observation', 'statut', 'timestamp'];
  var sheet = getOrCreateSheet('EvalTuteur', wantedHeaders);
  var colValues = {
    'eleveCode': eleveCode, 'tuteur': tuteurNom, 'tuteur_email': tuteurEmail, 'tuteur_tel': tuteurTel,
    'entreprise': entrepriseNom, 'entreprise_adresse': entrepriseAdresse, 'entreprise_cp': entrepriseCP,
    'entreprise_ville': entrepriseVille, 'entreprise_dirigeant': entrepriseDirigeant, 'tuteurs_json': tuteursJSON,
    'periode': payload.periode || '', 'phase': payload.phase || '',
    'competences': payload.competences ? JSON.stringify(payload.competences) : '',
    'comportement': payload.comportement ? JSON.stringify(payload.comportement) : '',
    'observation': payload.observation || '', 'statut': payload.statut || 'proposé',
    'timestamp': payload.timestamp || new Date().toISOString()
  };
  // Lire les headers réels du sheet et écrire dans les bonnes colonnes
  var sheetHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(v){ return String(v).trim(); });
  var rowData = sheetHeaders.map(function(h){ return colValues[h] || ''; });
  sheet.appendRow(rowData);

  // 2. Mettre à jour la fiche élève (onglet Élèves) avec les infos tuteur/entreprise
  try {
    var elevesSheet = getSheet(TABS.ELEVES);
    if (elevesSheet) {
      var eData = elevesSheet.getDataRange().getValues();
      var eHeaders = eData[0].map(function(h) { return String(h).toLowerCase().trim(); });
      var eCodeIdx = eHeaders.indexOf('code');
      for (var ei = 1; ei < eData.length; ei++) {
        if (String(eData[ei][eCodeIdx]) === eleveCode) {
          var row = ei + 1;
          var tnIdx = eHeaders.indexOf('tuteur_nom');
          if (tnIdx !== -1 && tuteurNom) elevesSheet.getRange(row, tnIdx + 1).setValue(tuteurNom);
          var teIdx = eHeaders.indexOf('tuteur_email');
          if (teIdx !== -1 && tuteurEmail) elevesSheet.getRange(row, teIdx + 1).setValue(tuteurEmail);
          var ttIdx = eHeaders.indexOf('tel_tuteur');
          if (ttIdx !== -1 && tuteurTel) elevesSheet.getRange(row, ttIdx + 1).setValue(tuteurTel);
          var enIdx = eHeaders.indexOf('entreprise_nom');
          if (enIdx !== -1 && entrepriseNom) elevesSheet.getRange(row, enIdx + 1).setValue(entrepriseNom);
          break;
        }
      }
    }
  } catch(e) { /* mise à jour élève optionnelle */ }

  return { ok: true, success: true };
}

// Lecture des évaluations tuteur
function getEvalTuteurData(eleveFilter) {
  var sheet = getOrCreateSheet('EvalTuteur', ['eleveCode','tuteur','tuteur_email','tuteur_tel','entreprise','entreprise_adresse','entreprise_cp','entreprise_ville','entreprise_dirigeant','tuteurs_json','periode','phase','competences','comportement','observation','statut','timestamp']);
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).toLowerCase().trim(); });
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var row = {};
    headers.forEach(function(h, j) { row[h] = data[i][j] || ''; });
    if (!eleveFilter || row.elevecode === eleveFilter) rows.push(row);
  }
  return { evaluations: rows, count: rows.length };
}


// ══════════════════════════════════════════════════
// AUTH ÉLÈVE / TUTEUR (v3.0.0)
// ══════════════════════════════════════════════════

function verifyEleveToken(eleveCode, token, deviceId) {
  var searchToken = token || eleveCode;
  if (!searchToken) return { ok: false, error: 'Paramètres manquants' };
  var sheet = getSheet(TABS.ELEVES);
  if (!sheet) return { ok: false, error: 'Onglet Élèves non trouvé' };
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).toLowerCase().trim(); });
  var codeIdx = headers.indexOf('code');
  var tokenIdx = headers.indexOf('token');
  if (tokenIdx === -1) return { ok: false, error: 'Colonne token manquante' };

  // Chercher l'élève par token (et optionnellement par code)
  var foundRow = null;
  var foundRowIdx = -1;
  for (var i = 1; i < data.length; i++) {
    if (token && eleveCode) {
      if (codeIdx !== -1 && String(data[i][codeIdx]) === eleveCode && String(data[i][tokenIdx]) === token) { foundRow = data[i]; foundRowIdx = i; break; }
    } else {
      if (String(data[i][tokenIdx]) === searchToken) { foundRow = data[i]; foundRowIdx = i; break; }
    }
  }
  if (!foundRow) return { ok: false, error: 'Token invalide' };

  // Enregistrer le deviceId de l'appareil élève
  if (deviceId) {
    var deviceIdx = headers.indexOf('device_eleve');
    if (deviceIdx === -1) {
      // Créer la colonne si elle n'existe pas
      var lastCol = headers.length + 1;
      sheet.getRange(1, lastCol).setValue('device_eleve');
      sheet.getRange(foundRowIdx + 1, lastCol).setValue(deviceId);
    } else {
      sheet.getRange(foundRowIdx + 1, deviceIdx + 1).setValue(deviceId);
    }
  }

  // Construire l'objet élève avec toutes les colonnes disponibles
  var eleveObj = {};
  headers.forEach(function(h, j) { if (h && h !== 'token') eleveObj[h] = foundRow[j] || ''; });
  var eleveCode_ = eleveObj.code || '';

  // Récupérer le journal de l'élève
  var journalData = getJournal(eleveCode_);
  var journal = journalData.map(function(j) {
    return { id: j.id || '', date: j.date || j.timestamp || '', type: j.type || 'activite', text: j.text || '', photos: j.photos || [], synced: true };
  });

  // Récupérer les évaluations (validations par épreuve/compétence)
  var evals = {};
  try {
    var validSheet = getSheet(TABS.EVALUATIONS_UNIFIEES) || getSheet(TABS.EVALUATIONS);
    if (validSheet) {
      var vData = validSheet.getDataRange().getValues();
      var vHeaders = vData[0].map(function(h) { return String(h).toLowerCase().trim(); });
      var vEleveIdx = vHeaders.indexOf('eleveid') !== -1 ? vHeaders.indexOf('eleveid') : vHeaders.indexOf('eleve');
      var vEpreuveIdx = vHeaders.indexOf('epreuve');
      var vCompIdx = vHeaders.indexOf('competence');
      var vNiveauIdx = vHeaders.indexOf('niveau');
      var vValidIdx = vHeaders.indexOf('validees');
      if (vEleveIdx !== -1) {
        for (var vi = 1; vi < vData.length; vi++) {
          if (String(vData[vi][vEleveIdx]) !== eleveCode_) continue;
          var ep = vEpreuveIdx !== -1 ? String(vData[vi][vEpreuveIdx]) : '';
          var comp = vCompIdx !== -1 ? String(vData[vi][vCompIdx]) : '';
          var niv = vNiveauIdx !== -1 ? String(vData[vi][vNiveauIdx]) : '';
          if (ep && comp && niv) {
            if (!evals[ep]) evals[ep] = {};
            evals[ep][comp] = niv;
          }
          // Support format validees (JSON de compétences validées)
          if (vValidIdx !== -1 && vData[vi][vValidIdx]) {
            try {
              var validees = JSON.parse(vData[vi][vValidIdx]);
              if (ep && typeof validees === 'object') {
                if (!evals[ep]) evals[ep] = {};
                evals[ep].validees = validees;
              }
            } catch(e) {}
          }
        }
      }
    }
  } catch(e) { /* évaluations optionnelles */ }

  // Récupérer les évaluations tuteur
  var evalTuteur = [];
  try {
    var etSheet = getOrCreateSheet('EvalTuteur', ['eleveCode','tuteur','entreprise','periode','phase','competences','comportement','observation','statut','timestamp']);
    var etData = etSheet.getDataRange().getValues();
    for (var ei = 1; ei < etData.length; ei++) {
      if (String(etData[ei][0]) === eleveCode_) {
        var comps = {};
        try { comps = etData[ei][5] ? JSON.parse(etData[ei][5]) : {}; } catch(e) {}
        evalTuteur.push({ periode: etData[ei][3] || '', phase: etData[ei][4] || '', competences: comps, comportement: etData[ei][6] || '', observation: etData[ei][7] || '', statut: etData[ei][8] || '' });
      }
    }
  } catch(e) { /* éval tuteur optionnelle */ }

  return {
    ok: true,
    success: true,
    eleve: {
      code: eleveObj.code || '',
      nom: eleveObj.nom || '',
      prenom: eleveObj.prenom || eleveObj['prénom'] || '',
      classe: eleveObj.classe || '',
      entreprise_nom: eleveObj.entreprise_nom || eleveObj.pfmp1_entreprise || eleveObj.pfmp2_entreprise || '',
      tuteur_nom: eleveObj.tuteur_nom || eleveObj.pfmp1_tuteur_nom || eleveObj.pfmp2_tuteur_nom || '',
      tel_tuteur: eleveObj.tel_tuteur || '',
      tuteur_email: eleveObj.tuteur_email || '',
      token_tuteur: eleveObj.token_tuteur || '',
      pfmp_debut: eleveObj.pfmp_debut || eleveObj.pfmp1_date_debut || eleveObj.pfmp2_date_debut || '',
      pfmp_fin: eleveObj.pfmp_fin || eleveObj.pfmp1_date_fin || eleveObj.pfmp2_date_fin || '',
      telephone: eleveObj.telephone || '',
      email: eleveObj.email || ''
    },
    evals: evals,
    evalTuteur: evalTuteur,
    journal: journal
  };
}

function verifyTuteurToken(eleveCode, tuteurToken, deviceId) {
  if (!eleveCode || !tuteurToken) return { ok: false, error: 'Paramètres manquants' };
  var sheet = getSheet(TABS.ELEVES);
  if (!sheet) return { ok: false, error: 'Onglet Élèves non trouvé' };
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).toLowerCase().trim(); });
  var codeIdx = headers.indexOf('code');
  var tuteurTokenIdx = headers.indexOf('token_tuteur');
  var tuteurNomIdx = headers.indexOf('tuteur_nom');
  var entrepriseIdx = headers.indexOf('entreprise_nom');
  var deviceEleveIdx = headers.indexOf('device_eleve');
  var telTuteurIdx = headers.indexOf('tel_tuteur');
  var tuteurVerifIdx = headers.indexOf('tuteur_verifie');
  if (codeIdx === -1) return { ok: false, error: 'Colonne code manquante' };

  // Vérifier aussi que ce deviceId n'est pas enregistré pour UN AUTRE élève
  if (deviceId && deviceEleveIdx !== -1) {
    for (var d = 1; d < data.length; d++) {
      if (String(data[d][deviceEleveIdx]) === deviceId) {
        return { ok: false, error: 'Ce téléphone est déjà enregistré comme appareil élève (' + String(data[d][codeIdx]) + '). Un tuteur doit utiliser son propre téléphone.' };
      }
    }
  }

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][codeIdx]) === eleveCode) {
      var storedToken = tuteurTokenIdx !== -1 ? String(data[i][tuteurTokenIdx]) : '';
      if (storedToken === tuteurToken) {
        var telTuteur = telTuteurIdx !== -1 ? String(data[i][telTuteurIdx]) : '';
        var tuteurVerifie = tuteurVerifIdx !== -1 ? String(data[i][tuteurVerifIdx]) : '';
        // Construire l'objet élève pour le tuteur
        var eleveObj = {};
        headers.forEach(function(h, j) {
          if (h && h !== 'token' && h !== 'token_tuteur' && h !== 'device_eleve') eleveObj[h] = data[i][j] || '';
        });
        return {
          ok: true, success: true,
          eleve: eleveCode,
          tuteur: tuteurNomIdx !== -1 ? (data[i][tuteurNomIdx] || '') : '',
          entreprise: entrepriseIdx !== -1 ? (data[i][entrepriseIdx] || '') : '',
          tel_tuteur_last4: telTuteur ? telTuteur.replace(/[\s.\-+]/g, '').slice(-4) : '',
          tuteur_verifie: tuteurVerifie === 'true' || tuteurVerifie === true,
          eleveData: {
            code: eleveObj.code || '',
            nom: eleveObj.nom || '',
            prenom: eleveObj.prenom || '',
            classe: eleveObj.classe || '',
            entreprise_nom: eleveObj.entreprise_nom || '',
            tuteur_nom: eleveObj.tuteur_nom || '',
            tel_tuteur: telTuteur,
            tuteur_email: eleveObj.tuteur_email || ''
          }
        };
      }
    }
  }
  return { ok: false, error: 'Token tuteur invalide' };
}

function verifyTuteurPhone(eleveCode, tuteurToken, digits) {
  if (!eleveCode || !tuteurToken || !digits) return { ok: false, error: 'Paramètres manquants' };
  var sheet = getSheet(TABS.ELEVES);
  if (!sheet) return { ok: false, error: 'Onglet Élèves non trouvé' };
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).toLowerCase().trim(); });
  var codeIdx = headers.indexOf('code');
  var tuteurTokenIdx = headers.indexOf('token_tuteur');
  var telTuteurIdx = headers.indexOf('tel_tuteur');
  if (codeIdx === -1) return { ok: false, error: 'Colonne code manquante' };
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][codeIdx]) === eleveCode) {
      var storedToken = tuteurTokenIdx !== -1 ? String(data[i][tuteurTokenIdx]) : '';
      if (storedToken !== tuteurToken) return { ok: false, error: 'Token tuteur invalide' };
      var telTuteur = telTuteurIdx !== -1 ? String(data[i][telTuteurIdx]) : '';
      if (!telTuteur) return { ok: true, skipped: true };
      var clean = telTuteur.replace(/[\s.\-+]/g, '');
      var last4 = clean.slice(-4);
      if (digits === last4) {
        // Marquer le tuteur comme vérifié
        var verifIdx = headers.indexOf('tuteur_verifie');
        if (verifIdx === -1) {
          var lastCol = headers.length + 1;
          sheet.getRange(1, lastCol).setValue('tuteur_verifie');
          sheet.getRange(i + 1, lastCol).setValue('true');
        } else {
          sheet.getRange(i + 1, verifIdx + 1).setValue('true');
        }
        return { ok: true, verified: true };
      }
      return { ok: false, error: 'Code incorrect. Vérifiez les 4 derniers chiffres de votre numéro.' };
    }
  }
  return { ok: false, error: 'Élève non trouvé' };
}


// ══════════════════════════════════════════════════
// ADMIN — GESTION USERS (v3.0.0)
// ══════════════════════════════════════════════════

function checkAdminKey_(key) { var props = PropertiesService.getScriptProperties(); var adminKey = props.getProperty('ADMIN_KEY'); return adminKey && key === adminKey; }

function getUsers() {
  var sheet = getSheet(TABS.USERS);
  if (!sheet) return { users: [], error: 'Onglet Users non trouvé' };
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var users = [];
  for (var i = 1; i < data.length; i++) { var user = {}; for (var j = 0; j < headers.length; j++) user[headers[j]] = data[i][j]; delete user.token; delete user.apiKey; users.push(user); }
  return { ok: true, users: users };
}

function addUser(user) {
  if (!user || !user.email) return { ok: false, error: 'Email requis' };
  var sheet = getOrCreateSheet('Users', ['id', 'email', 'nom', 'role', 'dateCreation', 'actif']);
  var id = 'USR-' + Date.now();
  sheet.appendRow([id, user.email, user.nom || '', user.role || 'prof', new Date().toISOString(), true]);
  return { ok: true, id: id };
}

function updateUser(user) {
  if (!user || !user.id) return { ok: false, error: 'ID requis' };
  var sheet = getSheet(TABS.USERS);
  if (!sheet) return { ok: false, error: 'Onglet Users non trouvé' };
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idIdx = headers.indexOf('id');
  for (var i = 1; i < data.length; i++) {
    if (data[i][idIdx] === user.id) {
      var nomIdx = headers.indexOf('nom'); var roleIdx = headers.indexOf('role'); var actifIdx = headers.indexOf('actif');
      if (nomIdx !== -1 && user.nom !== undefined) sheet.getRange(i + 1, nomIdx + 1).setValue(user.nom);
      if (roleIdx !== -1 && user.role !== undefined) sheet.getRange(i + 1, roleIdx + 1).setValue(user.role);
      if (actifIdx !== -1 && user.actif !== undefined) sheet.getRange(i + 1, actifIdx + 1).setValue(user.actif);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Utilisateur non trouvé' };
}

function deleteUser(userId) { return updateUser({ id: userId, actif: false }); }


// ══════════════════════════════════════════════════
// GESTION ÉLÈVES — ACTION (v3.0.0)
// ══════════════════════════════════════════════════

function deleteEleveAction(eleveCode) {
  if (!eleveCode) return { ok: false, error: 'Code élève requis' };
  var evt = { eventId: 'del-' + Date.now(), timestamp: new Date().toISOString(), type: 'eleve.deleted', acteur: 'api', cible: eleveCode, donnees: {}, source: 'backend' };
  var result = pushEvents([evt]);
  return { ok: true, deleted: eleveCode };
}


// ══════════════════════════════════════════════════
// GÉNÉRATION TOKENS (v3.0.0)
// ══════════════════════════════════════════════════

function generateTokensForClasse(classe) {
  if (!classe) return { ok: false, error: 'Classe requise' };
  var sheet = getSheet(TABS.ELEVES);
  if (!sheet) return { ok: false, error: 'Onglet Élèves non trouvé' };
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var classeIdx = headers.indexOf('classe');
  var tokenIdx = headers.indexOf('token');
  var tuteurTokenIdx = headers.indexOf('token_tuteur');
  if (classeIdx === -1) return { ok: false, error: 'Colonne classe manquante' };
  if (tokenIdx === -1) { sheet.getRange(1, headers.length + 1).setValue('token'); tokenIdx = headers.length; headers.push('token'); }
  if (tuteurTokenIdx === -1) { sheet.getRange(1, headers.length + 1).setValue('token_tuteur'); tuteurTokenIdx = headers.length; headers.push('token_tuteur'); }
  var updated = 0;
  for (var i = 1; i < data.length; i++) {
    if (data[i][classeIdx] === classe) {
      var newToken = generateSecureToken_();
      var newTuteurToken = generateSecureToken_();
      sheet.getRange(i + 1, tokenIdx + 1).setValue(newToken);
      sheet.getRange(i + 1, tuteurTokenIdx + 1).setValue(newTuteurToken);
      updated++;
    }
  }
  return { ok: true, updated: updated, classe: classe };
}

function generateSecureToken_() { var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; var token = ''; for (var i = 0; i < 8; i++) token += chars.charAt(Math.floor(Math.random() * chars.length)); return token; }


// ══════════════════════════════════════════════════
// IA GEMINI — Proxy sécurisé
// ══════════════════════════════════════════════════

function handleGeminiRequest(body) {
  var usage = body.usage || '';
  var params = body.params || {};
  var contexte = body.contexte || '';
  var langue = body.langue || 'fr';
  var USAGES_OK = ['enrichirTP', 'genererObjectifs', 'reformulerTexte', 'creerExercice', 'suggererEvaluation'];
  if (USAGES_OK.indexOf(usage) === -1) return { ok: false, error: 'Usage IA non autorise: ' + usage };
  var prompt = construirePromptGemini(usage, params, contexte, langue);
  if (!prompt) return { ok: false, error: 'Impossible de construire le prompt pour: ' + usage };
  var resultat = appelGeminiAPI(prompt);
  if (!resultat.ok) return resultat;
  return { ok: true, usage: usage, data: resultat.data };
}

function construirePromptGemini(usage, params, contexte, langue) {
  var intro = 'Tu es un assistant pedagogique specialise en enseignement professionnel. ';
  if (contexte) intro += contexte + ' ';
  intro += 'Reponds en ' + (langue === 'fr' ? 'francais' : langue) + '. ';
  switch (usage) {
    case 'enrichirTP': return intro + 'Enrichis ce TP :\n- Titre : ' + (params.titre || 'Sans titre') + '\n- Theme : ' + (params.theme || 'Non precise') + '\n- Niveau : ' + (params.niveau || 'CAP') + '\n- Duree : ' + (params.duree || 120) + ' min\n- Competences : ' + (params.competences || []).join(', ') + '\n\nPropose une description detaillee (3-5 lignes), une liste de materiel (5-10 items), et une liste d\'operations/etapes (5-8 etapes). Reponds en JSON : {"description":"...","materiel":["..."],"operations":["..."]}';
    case 'genererObjectifs': return intro + 'Pour la competence "' + (params.code || '') + ' — ' + (params.libelle || '') + '", genere 3 a 5 objectifs pedagogiques operationnels (verbes d\'action, mesurables). Reponds en JSON : {"objectifs":["..."]}';
    case 'reformulerTexte': return intro + 'Reformule ce texte en style ' + (params.style || 'professionnel') + ' pour une communication Ecole Directe :\n\n' + (params.texte || '') + '\n\nReponds en JSON : {"texte":"..."}';
    case 'creerExercice': return intro + 'Cree un exercice de type "' + (params.type || 'application') + '" sur le theme "' + (params.theme || '') + '" pour le niveau ' + (params.niveau || 'CAP') + '. Competences visees : ' + (params.competences || []).join(', ') + '. Reponds en JSON : {"titre":"...","enonce":"...","questions":["..."],"reponses":["..."]}';
    case 'suggererEvaluation': return intro + 'Pour la competence "' + (params.code || '') + ' — ' + (params.libelle || '') + '", suggere 3 criteres d\'evaluation avec indicateurs de reussite. Reponds en JSON : {"criteres":[{"critere":"...","indicateurs":["..."]}]}';
    default: return null;
  }
}

function appelGeminiAPI(prompt) {
  var props = PropertiesService.getScriptProperties();
  var apiKey = props.getProperty('GEMINI_API_KEY');
  if (!apiKey) return { ok: false, error: 'Cle API Gemini non configuree dans les proprietes du script' };
  var model = props.getProperty('GEMINI_MODEL') || 'gemini-1.5-flash';
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey;
  var payload = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 2048, responseMimeType: 'application/json' } };
  try {
    var response = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true });
    var code = response.getResponseCode();
    if (code !== 200) { Logger.log('[Gemini] Erreur HTTP ' + code + ': ' + response.getContentText().substring(0, 200)); return { ok: false, error: 'Erreur API Gemini (HTTP ' + code + ')' }; }
    var json = JSON.parse(response.getContentText());
    var text = json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts && json.candidates[0].content.parts[0] && json.candidates[0].content.parts[0].text;
    if (!text) return { ok: false, error: 'Reponse Gemini vide' };
    try { var data = JSON.parse(text); return { ok: true, data: data }; } catch (e) { return { ok: true, data: { texte: text } }; }
  } catch (e) { Logger.log('[Gemini] Exception: ' + e.toString()); return { ok: false, error: 'Erreur de connexion a l\'API Gemini' }; }
}


// ══════════════════════════════════════════════════
// DOCUMENTS DRIVE (annexes, conventions, attestations)
// ══════════════════════════════════════════════════

/**
 * Upload un document (PDF, image) dans le dossier Drive de l'élève.
 * body: { key, eleve, fileName, base64, mime, docType }
 * docType: 'annexe3', 'attestation', 'convention', 'autre'
 */
/**
 * Envoie par email l'attestation de stage à chaque élève et/ou tuteur.
 * Pour chaque élève, cherche son attestation dans PFMP_Documents/{code}/
 * et envoie un mail personnalisé avec le lien Drive.
 */
function sendAttestationEmails(body) {
  var cibles = body.cibles || 'tous'; // 'eleves', 'tuteurs', 'tous'
  var msgEleve = body.msgEleve || '';
  var msgTuteur = body.msgTuteur || '';
  var sujetEleve = body.sujetEleve || 'Ton attestation de stage';
  var sujetTuteur = body.sujetTuteur || 'Attestation de stage';
  var expediteur = body.expediteur || 'M. Henninot';

  var sheet = getSheet(TABS.ELEVES);
  if (!sheet) return { ok: false, error: 'Onglet Élèves non trouvé' };
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).toLowerCase().trim(); });

  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty('DRIVE_FOLDER_ID');
  var root = folderId ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder();
  var docFolder = null;
  var sub = root.getFoldersByName('PFMP_Documents');
  if (sub.hasNext()) docFolder = sub.next();
  if (!docFolder) return { ok: false, error: 'Dossier PFMP_Documents non trouvé' };

  var resultats = { envoyesEleve: 0, envoyesTuteur: 0, erreurs: [], ignores: 0 };
  var quotaRestant = MailApp.getRemainingDailyQuota();
  if (quotaRestant < 5) return { ok: false, error: 'Quota email épuisé (' + quotaRestant + ' restants). Réessayer demain.' };

  for (var i = 1; i < data.length; i++) {
    var row = {};
    headers.forEach(function(h, j) { row[h] = data[i][j] !== undefined ? data[i][j] : ''; });
    var code = row.code || '';
    var nom = row.nom || '';
    var prenom = row.prenom || row['prénom'] || '';
    var emailEleve = row.email_eleve || row.email || '';
    var emailTuteur = row.tuteur_email || '';
    var tuteurNom = row.tuteur_nom || '';
    var statut = row.statut || 'actif';
    if (statut === 'inactif' || !code) continue;

    // Chercher l'attestation dans PFMP_Documents/{code}/
    var attestationUrl = null;
    var attestationFile = null;
    try {
      var sub2 = docFolder.getFoldersByName(code);
      if (sub2.hasNext()) {
        var eleveFolder = sub2.next();
        var files = eleveFolder.getFiles();
        while (files.hasNext()) {
          var f = files.next();
          if (/attestation/i.test(f.getName())) {
            attestationFile = f;
            var mime = f.getMimeType();
            attestationUrl = mime === 'application/pdf'
              ? 'https://drive.google.com/file/d/' + f.getId() + '/view'
              : 'https://lh3.googleusercontent.com/d/' + f.getId();
            break;
          }
        }
      }
    } catch (e) {}

    if (!attestationUrl) { resultats.ignores++; continue; }

    // Envoyer à l'élève
    if ((cibles === 'eleves' || cibles === 'tous') && emailEleve && emailEleve.indexOf('@') !== -1) {
      try {
        var corpsEleve = msgEleve
          .replace(/{prenom}/g, prenom)
          .replace(/{nom}/g, nom)
          .replace(/{lien}/g, attestationUrl)
          .replace(/{tuteur}/g, tuteurNom || 'ton tuteur');
        MailApp.sendEmail({
          to: emailEleve,
          subject: sujetEleve + ' — ' + prenom + ' ' + nom,
          htmlBody: '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#333">'
            + '<p>' + corpsEleve.replace(/\n/g, '<br>') + '</p>'
            + '<p style="margin-top:20px"><a href="' + attestationUrl + '" style="display:inline-block;padding:12px 24px;background:#8e44ad;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">📄 Ouvrir mon attestation</a></p>'
            + '<p style="margin-top:20px;font-size:12px;color:#999">— ' + expediteur + ' via inerWeb TT</p>'
            + '</div>'
        });
        resultats.envoyesEleve++;
      } catch (e) {
        resultats.erreurs.push(code + ' (élève): ' + e.message);
      }
    }

    // Envoyer au tuteur
    if ((cibles === 'tuteurs' || cibles === 'tous') && emailTuteur && emailTuteur.indexOf('@') !== -1) {
      try {
        var corpsTuteur = msgTuteur
          .replace(/{prenom}/g, prenom)
          .replace(/{nom}/g, nom)
          .replace(/{lien}/g, attestationUrl)
          .replace(/{tuteur}/g, tuteurNom || 'Madame, Monsieur');
        MailApp.sendEmail({
          to: emailTuteur,
          subject: sujetTuteur + ' — ' + prenom + ' ' + nom,
          htmlBody: '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#333">'
            + '<p>' + corpsTuteur.replace(/\n/g, '<br>') + '</p>'
            + '<p style="margin-top:20px"><a href="' + attestationUrl + '" style="display:inline-block;padding:12px 24px;background:#16a085;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">📄 Ouvrir l\'attestation</a></p>'
            + '<p style="margin-top:20px;font-size:12px;color:#999">— ' + expediteur + ' via inerWeb TT</p>'
            + '</div>'
        });
        resultats.envoyesTuteur++;
      } catch (e) {
        resultats.erreurs.push(code + ' (tuteur): ' + e.message);
      }
    }
  }

  return { ok: true, envoyesEleve: resultats.envoyesEleve, envoyesTuteur: resultats.envoyesTuteur, ignores: resultats.ignores, erreurs: resultats.erreurs, quotaRestant: MailApp.getRemainingDailyQuota() };
}

function uploadDocument(body) {
  var eleveCode = body.eleve || '';
  var fileName = body.fileName || '';
  var base64 = body.base64 || '';
  var mime = body.mime || 'application/pdf';
  var docType = body.docType || 'document';
  if (!eleveCode || !base64) return { ok: false, error: 'Paramètres manquants (eleve, base64)' };
  try {
    var props = PropertiesService.getScriptProperties();
    var folderId = props.getProperty('DRIVE_FOLDER_ID');
    var root = folderId ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder();
    // Dossier Documents (séparé de PFMP_Photos)
    var sub = root.getFoldersByName('PFMP_Documents');
    var parentFolder = sub.hasNext() ? sub.next() : root.createFolder('PFMP_Documents');
    var sub2 = parentFolder.getFoldersByName(eleveCode);
    var folder = sub2.hasNext() ? sub2.next() : parentFolder.createFolder(eleveCode);
    var ext = mime === 'application/pdf' ? '.pdf' : mime.indexOf('png') !== -1 ? '.png' : '.jpg';
    var name = fileName || (docType + '_' + eleveCode + '_' + Date.now() + ext);
    var bytes = Utilities.base64Decode(base64);
    var blob = Utilities.newBlob(bytes, mime, name);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var url = mime === 'application/pdf'
      ? 'https://drive.google.com/file/d/' + file.getId() + '/view'
      : 'https://lh3.googleusercontent.com/d/' + file.getId();
    return { ok: true, url: url, fileId: file.getId(), fileName: name };
  } catch (e) {
    Logger.log('[uploadDocument] Erreur: ' + e.message);
    return { ok: false, error: 'Erreur upload Drive: ' + e.message };
  }
}

/**
 * Liste les documents Drive d'un élève.
 * Retourne les fichiers dans PFMP_Documents/[code]/ et PFMP_Photos/[code]/
 */
function getDocuments(eleveCode) {
  if (!eleveCode) return { ok: false, error: 'Code élève manquant' };
  try {
    var props = PropertiesService.getScriptProperties();
    var folderId = props.getProperty('DRIVE_FOLDER_ID');
    var root = folderId ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder();
    var docs = [];
    // Chercher dans PFMP_Documents
    var sub = root.getFoldersByName('PFMP_Documents');
    if (sub.hasNext()) {
      var parent = sub.next();
      var sub2 = parent.getFoldersByName(eleveCode);
      if (sub2.hasNext()) {
        var folder = sub2.next();
        var files = folder.getFiles();
        while (files.hasNext()) {
          var f = files.next();
          var mime = f.getMimeType();
          var url = mime === 'application/pdf'
            ? 'https://drive.google.com/file/d/' + f.getId() + '/view'
            : 'https://lh3.googleusercontent.com/d/' + f.getId();
          docs.push({ id: f.getId(), name: f.getName(), mime: mime, url: url, date: f.getDateCreated().toISOString(), type: 'document' });
        }
      }
    }
    // Chercher dans PFMP_Photos
    var subP = root.getFoldersByName('PFMP_Photos');
    if (subP.hasNext()) {
      var parentP = subP.next();
      var sub2P = parentP.getFoldersByName(eleveCode);
      if (sub2P.hasNext()) {
        var folderP = sub2P.next();
        var filesP = folderP.getFiles();
        while (filesP.hasNext()) {
          var fp = filesP.next();
          docs.push({ id: fp.getId(), name: fp.getName(), mime: fp.getMimeType(), url: 'https://lh3.googleusercontent.com/d/' + fp.getId(), date: fp.getDateCreated().toISOString(), type: 'photo' });
        }
      }
    }
    docs.sort(function(a, b) { return b.date.localeCompare(a.date); });
    return { ok: true, documents: docs, count: docs.length };
  } catch (e) {
    Logger.log('[getDocuments] Erreur: ' + e.message);
    return { ok: false, error: 'Erreur lecture Drive: ' + e.message };
  }
}

// ══════════════════════════════════════════════════
// ADMIN — Setup environnement DEV + backups
// ══════════════════════════════════════════════════
var DEV_ADMIN_KEY = 'devSetup2026fh';

/** Crée une copie du Sheet PROD pour l'environnement DEV */
function adminCloneSheet(body) {
  if (!body || body.admin_key !== DEV_ADMIN_KEY) return { error: 'admin_key required' };
  var name = body.name || 'inerWeb TT-IA — DEV';
  try {
    var file = DriveApp.getFileById(CONFIG.SPREADSHEET_ID);
    var copy = file.makeCopy(name);
    return { ok: true, success: true, id: copy.getId(), name: name, url: copy.getUrl() };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/** Backup horodaté du Sheet courant dans un dossier dédié */
function adminBackupSheet(body) {
  if (body && body.admin_key && body.admin_key !== DEV_ADMIN_KEY) return { error: 'admin_key invalid' };
  try {
    var ts = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd_HH-mm');
    var name = 'inerWeb_backup_' + ts;
    var srcFile = DriveApp.getFileById(CONFIG.SPREADSHEET_ID);
    // Chercher (ou créer) le dossier Backups inerWeb à la racine
    var folders = DriveApp.getFoldersByName('Backups inerWeb');
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder('Backups inerWeb');
    var copy = srcFile.makeCopy(name, folder);
    // Rotation : ne garder que les 7 plus récents
    var kept = [];
    var iter = folder.getFiles();
    while (iter.hasNext()) {
      var f = iter.next();
      if (f.getName().indexOf('inerWeb_backup_') === 0) kept.push(f);
    }
    kept.sort(function (a, b) { return b.getDateCreated().getTime() - a.getDateCreated().getTime(); });
    for (var i = 7; i < kept.length; i++) { try { kept[i].setTrashed(true); } catch (e) {} }
    return { ok: true, success: true, id: copy.getId(), name: name, kept: Math.min(kept.length, 7) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/** Synchronise les évaluations PROD vers le Sheet DEV (oneway, écrase EVALUATIONS_UNIFIEES côté DEV) */
function adminSyncProdToDev(body) {
  if (!body || body.admin_key !== DEV_ADMIN_KEY) return { error: 'admin_key required' };
  if (!body.dev_sheet_id) return { error: 'dev_sheet_id required' };
  try {
    var srcSS = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var dstSS = SpreadsheetApp.openById(body.dev_sheet_id);
    var sheetsToSync = [TABS.EVALUATIONS_UNIFIEES, TABS.ELEVES, TABS.CONFIG];
    var counts = {};
    sheetsToSync.forEach(function (sheetName) {
      var src = srcSS.getSheetByName(sheetName);
      if (!src) return;
      var data = src.getDataRange().getValues();
      var dst = dstSS.getSheetByName(sheetName);
      if (!dst) dst = dstSS.insertSheet(sheetName);
      dst.clear();
      if (data.length) dst.getRange(1, 1, data.length, data[0].length).setValues(data);
      counts[sheetName] = data.length - 1; // sans le header
    });
    // Log d'audit côté DEV
    var auditSheet = dstSS.getSheetByName('_AUDIT_SYNC') || dstSS.insertSheet('_AUDIT_SYNC');
    if (auditSheet.getLastRow() === 0) auditSheet.appendRow(['timestamp', 'event', 'counts']);
    auditSheet.appendRow([new Date().toISOString(), 'sync_prod_to_dev', JSON.stringify(counts)]);
    return { ok: true, success: true, counts: counts };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/** Trigger quotidien à 23h : backup auto */
function triggerBackupQuotidien() {
  adminBackupSheet({ admin_key: DEV_ADMIN_KEY });
}

/** Trigger quotidien à 6h : sync PROD → DEV (lit le SHEET_DEV_ID depuis PropertiesService) */
function triggerSyncQuotidien() {
  var devId = PropertiesService.getScriptProperties().getProperty('SHEET_DEV_ID');
  if (!devId) { Logger.log('SHEET_DEV_ID non configuré'); return; }
  adminSyncProdToDev({ admin_key: DEV_ADMIN_KEY, dev_sheet_id: devId });
}

/** Installe les 2 triggers (à exécuter une seule fois manuellement) */
function adminInstallTriggers(body) {
  if (!body || body.admin_key !== DEV_ADMIN_KEY) return { error: 'admin_key required' };
  // Supprimer triggers existants pour éviter doublons
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var fn = t.getHandlerFunction();
    if (fn === 'triggerBackupQuotidien' || fn === 'triggerSyncQuotidien') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('triggerBackupQuotidien').timeBased().atHour(23).everyDays(1).create();
  ScriptApp.newTrigger('triggerSyncQuotidien').timeBased().atHour(6).everyDays(1).create();
  return { ok: true, success: true, installed: ['triggerBackupQuotidien@23h', 'triggerSyncQuotidien@6h'] };
}

/** Bootstrap : configure l'API_KEY du script (1ère config DEV) */
function adminSetApiKey(body) {
  if (!body || body.admin_key !== DEV_ADMIN_KEY) return { error: 'admin_key required' };
  if (!body.api_key) return { error: 'api_key required' };
  PropertiesService.getScriptProperties().setProperty('API_KEY', body.api_key);
  return { ok: true, success: true };
}

// ══════════════════════════════════════════════════
// IdentityVault — Sync FH↔TM des noms chiffrés AES-256
// Le serveur ne déchiffre jamais. Stockage opaque uniquement.
// 1 seule ligne par sheet, id = 'main'.
// Format colonnes : [id, blob, updatedAt, updatedBy, version]
// ══════════════════════════════════════════════════

function getIdentityVaultSheet_() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sh = ss.getSheetByName('IdentityVault');
  if (!sh) {
    sh = ss.insertSheet('IdentityVault');
    sh.appendRow(['id', 'blob', 'updatedAt', 'updatedBy', 'version']);
    sh.setFrozenRows(1);
    sh.protect().setDescription('Vault chiffré — ne pas modifier manuellement');
  }
  return sh;
}

function getIdentityVault() {
  var sh = getIdentityVaultSheet_();
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === 'main') {
      return {
        ok: true,
        blob: String(data[i][1] || ''),
        updatedAt: String(data[i][2] || ''),
        updatedBy: String(data[i][3] || ''),
        version: Number(data[i][4] || 0)
      };
    }
  }
  return { ok: true, blob: '', updatedAt: '', updatedBy: '', version: 0 };
}

// ══════════════════════════════════════════════════
// ElevePinHash — PIN 6 chiffres élève (hash PBKDF2, jamais en clair)
// Le PIN clair vit dans le vault prof. Ici on ne stocke que le hash.
// Colonnes : [code, token, pin_hash, set_at, attempts, lockout_until]
// ══════════════════════════════════════════════════

function getElevePinHashSheet_() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sh = ss.getSheetByName('ElevePinHash');
  if (!sh) {
    sh = ss.insertSheet('ElevePinHash');
    sh.appendRow(['code', 'token', 'pin_hash', 'set_at', 'attempts', 'lockout_until']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function setElevePin(body) {
  if (!body || !body.code || !body.pin_hash) return { error: 'code et pin_hash requis' };
  var sh = getElevePinHashSheet_();
  var data = sh.getDataRange().getValues();
  var now = isoParis_(new Date());
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === body.code) {
      // Update existant
      sh.getRange(i + 1, 2, 1, 5).setValues([[
        String(body.token || data[i][1] || ''),
        String(body.pin_hash),
        now,
        0,  // reset attempts
        ''  // reset lockout
      ]]);
      return { ok: true, action: 'updated', code: body.code };
    }
  }
  // Nouveau
  sh.appendRow([body.code, body.token || '', body.pin_hash, now, 0, '']);
  return { ok: true, action: 'created', code: body.code };
}

function verifyElevePin(token, pinHashCandidate) {
  if (!token) return { error: 'token requis' };
  var sh = getElevePinHashSheet_();
  var data = sh.getDataRange().getValues();
  var nowMs = Date.now();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(token)) {
      // PIN configuré pour ce token
      if (!pinHashCandidate) {
        // L'élève cherche juste à savoir si un PIN est requis
        return { ok: true, requiresPin: true };
      }
      // Lockout actif ?
      var lockoutStr = String(data[i][5] || '');
      if (lockoutStr) {
        var lockoutMs = new Date(lockoutStr).getTime();
        if (lockoutMs > nowMs) {
          var sec = Math.ceil((lockoutMs - nowMs) / 1000);
          return { error: 'Bloqué encore ' + sec + ' secondes', lockoutSec: sec };
        }
      }
      // Vérif hash
      if (String(data[i][2]) === String(pinHashCandidate)) {
        sh.getRange(i + 1, 5, 1, 2).setValues([[0, '']]);
        return { ok: true, code: String(data[i][0]), token: String(data[i][1]), pinVerified: true };
      } else {
        var attempts = Number(data[i][4] || 0) + 1;
        var update = { attempts: attempts, lockout: '' };
        if (attempts >= 5) {
          update.lockout = isoParis_(new Date(nowMs + 10 * 60 * 1000));
          update.attempts = 0;
        }
        sh.getRange(i + 1, 5, 1, 2).setValues([[update.attempts, update.lockout]]);
        if (update.lockout) {
          return { error: 'Trop de tentatives. Bloqué 10 minutes.', lockoutSec: 600 };
        }
        return { error: 'Code incorrect. ' + (5 - attempts) + ' essai(s) restant(s).', attemptsLeft: 5 - attempts };
      }
    }
  }
  // Token n'a pas de PIN configuré → accès direct (compat ascendante)
  return { ok: true, requiresPin: false };
}

// ══════════════════════════════════════════════════
// ElevePinClair — table interne admin-only avec les PIN en clair
// Accessible uniquement avec admin_key. Permet de récupérer les codes
// sans dépendre du vault local du navigateur. Le hash existe en parallèle
// dans ElevePinHash pour la vérif côté élève.
// Colonnes : [code, nom, prenom, classe, token, pin, set_at]
// ══════════════════════════════════════════════════

function getElevePinClairSheet_() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sh = ss.getSheetByName('ElevePinClair');
  if (!sh) {
    sh = ss.insertSheet('ElevePinClair');
    sh.appendRow(['code', 'nom', 'prenom', 'classe', 'token', 'pin', 'set_at']);
    sh.setFrozenRows(1);
    sh.protect().setDescription('PIN élèves en clair — admin only');
  }
  return sh;
}

function setElevePinClair(body) {
  if (!body || !body.code || !body.pin) return { error: 'code et pin requis' };
  var sh = getElevePinClairSheet_();
  var data = sh.getDataRange().getValues();
  var now = isoParis_(new Date());
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === body.code) {
      sh.getRange(i + 1, 2, 1, 6).setValues([[
        String(body.nom || data[i][1] || ''),
        String(body.prenom || data[i][2] || ''),
        String(body.classe || data[i][3] || ''),
        String(body.token || data[i][4] || ''),
        String(body.pin),
        now
      ]]);
      return { ok: true, action: 'updated' };
    }
  }
  sh.appendRow([body.code, body.nom || '', body.prenom || '', body.classe || '', body.token || '', body.pin, now]);
  return { ok: true, action: 'created' };
}

function getElevePinClair(classe) {
  // v2 : inclut le tel si la colonne existe
  return patchedGetElevePinClairWithTel_(classe);
}

/**
 * Crée d'un coup les élèves d'une classe avec leur PIN.
 * v2 — Utilise des codes TNE-NNN au lieu de ELV-NNN pour ne PAS collisionner
 *      avec les codes des anciens IFCA dans le vault prof.
 *      Si purgeFirst=true, supprime d'abord toutes les anciennes lignes de la classe.
 * body : { adminKey, classe, referentiel, eleves: [{nom, prenom, pin}], purgeFirst?, prefix? }
 */
function creerElevesTNE(body) {
  if (!body || !Array.isArray(body.eleves) || !body.classe) return { error: 'classe + eleves[] requis' };
  var sh = getSheet(TABS.ELEVES);
  if (!sh) return { error: 'Onglet Élèves manquant' };
  var classe = String(body.classe);
  var referentiel = String(body.referentiel || 'TNE');
  var prefix = String(body.prefix || 'TNE');  // ex: TNE-001, TNE-002...
  var purgeFirst = body.purgeFirst === true;
  var pinClairSh = getElevePinClairSheet_();
  var pinHashSh = getElevePinHashSheet_();
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function(h){ return String(h).toLowerCase().trim(); });
  var nomIdx = headers.indexOf('nom');
  var prenomIdx = headers.indexOf('prenom');
  var classeIdx = headers.indexOf('classe');
  var codeIdx = headers.indexOf('code');
  var tokenIdx = headers.indexOf('token');

  // Purge chirurgicale : UNIQUEMENT les lignes avec classe == body.classe
  // Les autres classes (CAP IFCA, MFER, etc.) ne sont JAMAIS touchées.
  var purged = 0;
  var codesPurges = [];
  if (purgeFirst) {
    var allData = sh.getDataRange().getValues();
    // Collecte des codes à purger pour pouvoir nettoyer ElevePinHash ensuite
    for (var rcoll = 1; rcoll < allData.length; rcoll++) {
      if (String(allData[rcoll][classeIdx]) === classe) {
        codesPurges.push(String(allData[rcoll][codeIdx]));
      }
    }
    // Suppression à l'envers pour ne pas décaler les indices
    for (var r = allData.length - 1; r >= 1; r--) {
      if (String(allData[r][classeIdx]) === classe) {
        sh.deleteRow(r + 1);
        purged++;
      }
    }
    // Purger ElevePinClair sur cette classe précise
    var pcData = pinClairSh.getDataRange().getValues();
    for (var p = pcData.length - 1; p >= 1; p--) {
      if (String(pcData[p][3]) === classe) pinClairSh.deleteRow(p + 1);
    }
    // Purger ElevePinHash sur les codes qu'on vient de supprimer
    if (codesPurges.length) {
      var phData = pinHashSh.getDataRange().getValues();
      for (var q = phData.length - 1; q >= 1; q--) {
        if (codesPurges.indexOf(String(phData[q][0] || '')) >= 0) pinHashSh.deleteRow(q + 1);
      }
    }
  }

  var resultats = [];
  var now = isoParis_(new Date());

  for (var i = 0; i < body.eleves.length; i++) {
    var ev = body.eleves[i];
    if (!ev.nom && !ev.prenom) continue;
    var nom = String(ev.nom || '');
    var prenom = String(ev.prenom || '');

    // Vérif doublon par nom + prenom + classe APRÈS purge
    var allData2 = sh.getDataRange().getValues();
    var existingRow = -1, existingCode = '', existingToken = '';
    for (var rr = 1; rr < allData2.length; rr++) {
      if (String(allData2[rr][nomIdx]).toUpperCase() === nom.toUpperCase() &&
          String(allData2[rr][prenomIdx]).toUpperCase() === prenom.toUpperCase() &&
          String(allData2[rr][classeIdx]) === classe) {
        existingRow = rr;
        existingCode = String(allData2[rr][codeIdx]);
        existingToken = String(allData2[rr][tokenIdx]);
        break;
      }
    }

    var code, token;
    if (existingRow >= 0) {
      code = existingCode;
      token = existingToken;
    } else {
      // Nouveau code avec préfixe dédié → pas de collision
      code = prefix + '-' + String(i + 1).padStart(3, '0');
      token = Math.random().toString(36).substring(2, 10).toUpperCase();
      var tokenT = Math.random().toString(36).substring(2, 10).toUpperCase();
      var row = headers.map(function(h) {
        if (h === 'code' || h === 'eleveid') return code;
        if (h === 'nom') return nom;
        if (h === 'prenom' || h === 'prénom') return prenom;
        if (h === 'classe') return classe;
        if (h === 'annee' || h === 'année') return 1;
        if (h === 'statut') return 'actif';
        if (h === 'referentiel') return referentiel;
        if (h === 'token' || h === 'token_eleve') return token;
        if (h === 'token_tuteur') return tokenT;
        return '';
      });
      sh.appendRow(row);
    }

    var pin = String(ev.pin || '');
    if (!pin) {
      pin = '';
      for (var k = 0; k < 6; k++) pin += Math.floor(Math.random() * 10);
    }

    // Stocker PIN clair (créé après purge donc pas de doublon)
    pinClairSh.appendRow([code, nom, prenom, classe, token, pin, now]);

    resultats.push({ nom: nom, prenom: prenom, code: code, token: token, pin: pin });
  }
  return { ok: true, count: resultats.length, purged: purged, eleves: resultats };
}

// Sauvegarde du numéro de téléphone d'un élève (table ELEVES + ElevePinClair).
// Utilisé par codes-tne.html quand le prof saisit le tel en classe.
function setTelEleve(body) {
  if (!body || !body.code || !body.tel) return { error: 'code et tel requis' };
  var tel = String(body.tel).replace(/\s+/g, '');
  // Maj ELEVES
  var sh = getSheet(TABS.ELEVES);
  if (sh) {
    var data = sh.getDataRange().getValues();
    var headers = data[0].map(function(h){ return String(h).toLowerCase().trim(); });
    var codeIdx = headers.indexOf('code');
    var telIdx = headers.indexOf('tel_eleve');
    if (telIdx === -1) telIdx = headers.indexOf('telephone');
    if (codeIdx !== -1 && telIdx !== -1) {
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][codeIdx]) === body.code) {
          sh.getRange(i + 1, telIdx + 1).setValue(tel);
          break;
        }
      }
    }
  }
  // Maj ElevePinClair (col tel ajoutée si besoin)
  var pcSh = getElevePinClairSheet_();
  var pcData = pcSh.getDataRange().getValues();
  var pcHeaders = pcData[0].map(function(h){ return String(h).toLowerCase().trim(); });
  var pcTelIdx = pcHeaders.indexOf('tel');
  if (pcTelIdx === -1) {
    pcSh.getRange(1, pcHeaders.length + 1).setValue('tel');
    pcTelIdx = pcHeaders.length;
  }
  for (var j = 1; j < pcData.length; j++) {
    if (String(pcData[j][0]) === body.code) {
      pcSh.getRange(j + 1, pcTelIdx + 1).setValue(tel);
      return { ok: true, code: body.code, tel: tel };
    }
  }
  return { ok: true, code: body.code, tel: tel, note: 'pas trouvé dans ElevePinClair' };
}

// Inclure tel dans le retour de getElevePinClair
function patchedGetElevePinClairWithTel_(classe) {
  var sh = getElevePinClairSheet_();
  var data = sh.getDataRange().getValues();
  var headers = data[0].map(function(h){ return String(h).toLowerCase().trim(); });
  var telIdx = headers.indexOf('tel');
  var list = [];
  for (var i = 1; i < data.length; i++) {
    if (classe && String(data[i][3]).toUpperCase().indexOf(String(classe).toUpperCase()) === -1) continue;
    list.push({
      code: String(data[i][0]),
      nom: String(data[i][1] || ''),
      prenom: String(data[i][2] || ''),
      classe: String(data[i][3] || ''),
      token: String(data[i][4] || ''),
      pin: String(data[i][5] || ''),
      set_at: String(data[i][6] || ''),
      tel: telIdx !== -1 ? String(data[i][telIdx] || '') : ''
    });
  }
  return { ok: true, list: list };
}

// ══════════════════════════════════════════════════
// Clear nominatif — efface les valeurs en clair des colonnes sensibles
// dans ELEVES après migration vault. Destructif → admin_key + confirm requis.
// Les évaluations restent intactes (indexées par code).
// ══════════════════════════════════════════════════

var NOMINATIVE_FIELDS = ['nom','prenom','prénom','tel_eleve','telephone','tel_tuteur',
  'email_eleve','email','tuteur_email','tuteur_nom','tuteur',
  'entreprise_nom','entreprise','preference_contact_tuteur'];

function previewNominativeData() {
  var sh = getSheet(TABS.ELEVES);
  if (!sh) return { error: 'Onglet Élèves non trouvé' };
  var data = sh.getDataRange().getValues();
  if (data.length <= 1) return { ok: true, rows: 0, cells_nominatives: 0, breakdown: {} };
  var headers = data[0].map(function(h){ return String(h).toLowerCase().trim(); });
  var count = 0;
  var breakdown = {};
  for (var j = 0; j < headers.length; j++) {
    if (NOMINATIVE_FIELDS.indexOf(headers[j]) !== -1) {
      var c = 0;
      for (var i = 1; i < data.length; i++) {
        if (data[i][j] !== '' && data[i][j] != null) c++;
      }
      if (c > 0) breakdown[headers[j]] = c;
      count += c;
    }
  }
  return { ok: true, rows: data.length - 1, cells_nominatives: count, breakdown: breakdown };
}

function clearNominativeColumns(body) {
  if (!body || body.admin_key !== DEV_ADMIN_KEY) return { error: 'admin_key required' };
  if (body.confirm !== 'OUI_EFFACER_NOMS_IRREVERSIBLE') {
    return { error: 'confirmation requise (confirm: OUI_EFFACER_NOMS_IRREVERSIBLE)' };
  }
  var sh = getSheet(TABS.ELEVES);
  if (!sh) return { error: 'Onglet Élèves non trouvé' };
  var data = sh.getDataRange().getValues();
  if (data.length <= 1) return { ok: true, cleared: 0, message: 'Aucune donnée' };
  var headers = data[0].map(function(h){ return String(h).toLowerCase().trim(); });
  var cleared = 0;
  for (var j = 0; j < headers.length; j++) {
    if (NOMINATIVE_FIELDS.indexOf(headers[j]) !== -1) {
      for (var i = 1; i < data.length; i++) {
        if (data[i][j] !== '' && data[i][j] != null) {
          sh.getRange(i + 1, j + 1).setValue('');
          cleared++;
        }
      }
    }
  }
  return { ok: true, cleared: cleared, message: cleared + ' cellules nominatives effacées' };
}

function saveIdentityVault(body) {
  if (!body || typeof body.blob !== 'string') return { error: 'blob requis' };
  if (body.blob.length > 2000000) return { error: 'blob trop volumineux (>2MB)' };
  var sh = getIdentityVaultSheet_();
  var data = sh.getDataRange().getValues();
  var now = isoParis_(new Date());
  var updatedBy = String(body.updatedBy || 'inconnu').substring(0, 64);
  var clientVersion = Number(body.expectedVersion || 0);
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === 'main') {
      var serverVersion = Number(data[i][4] || 0);
      if (clientVersion && clientVersion < serverVersion) {
        return {
          error: 'conflit_version',
          serverVersion: serverVersion,
          clientVersion: clientVersion,
          message: 'Le vault a été modifié par un autre prof. Recharger avant d\'écrire.'
        };
      }
      sh.getRange(i + 1, 2, 1, 4).setValues([[body.blob, now, updatedBy, serverVersion + 1]]);
      return { ok: true, updatedAt: now, version: serverVersion + 1 };
    }
  }
  sh.appendRow(['main', body.blob, now, updatedBy, 1]);
  return { ok: true, updatedAt: now, version: 1 };
}

// ══════════════════════════════════════════════════
// LISTE DES CLASSES — diagnostic (admin only)
// ══════════════════════════════════════════════════
/** Retourne classes uniques + comptage + préfixes codes. AUCUN nom n'est renvoyé. */
function adminListClasses(body) {
  if (!body || body.admin_key !== DEV_ADMIN_KEY) return { error: 'admin_key required' };
  var sheet = getSheet(TABS.ELEVES);
  if (!sheet) return { error: 'onglet Élèves introuvable' };
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return { ok: true, total: 0, classes: {}, prefixes: {} };
  var headers = data[0];
  var idxCode = headers.indexOf('code');
  var idxClasse = headers.indexOf('classe');
  if (idxCode === -1 || idxClasse === -1) return { error: 'colonnes manquantes' };
  var classes = {}, prefixes = {}, croisement = {};
  for (var i = 1; i < data.length; i++) {
    var c = String(data[i][idxClasse] || '').trim();
    var code = String(data[i][idxCode] || '').trim();
    classes[c] = (classes[c] || 0) + 1;
    var m = code.match(/^([A-Z]+)/);
    var pref = m ? m[1] : '?';
    prefixes[pref] = (prefixes[pref] || 0) + 1;
    var key = c + ' × ' + pref;
    croisement[key] = (croisement[key] || 0) + 1;
  }
  return { ok: true, total: data.length - 1, classes: classes, prefixes: prefixes, croisement: croisement };
}

// ══════════════════════════════════════════════════
// PURGE CIBLÉE PAR CLASSE — admin only, mode dry-run par défaut
// ══════════════════════════════════════════════════
/**
 * Supprime toutes les lignes appartenant à `body.classe` dans Élèves +
 * onglets liés. Toute classe non vide acceptée (DEV souple).
 *
 * body = { admin_key, classe, dry_run }
 */
function adminPurgeTNE(body) {
  if (!body || body.admin_key !== DEV_ADMIN_KEY) return { error: 'admin_key required' };
  var classeCible = String(body.classe || '').trim();
  if (!classeCible) return { error: 'classe requise' };
  var dryRun = body.dry_run !== false;

  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return { error: 'verrou occupé, réessayer' };

  try {
    var elevesSheet = ss.getSheetByName(TABS.ELEVES);
    if (!elevesSheet) return { error: 'onglet Élèves introuvable' };
    var data = elevesSheet.getDataRange().getValues();
    if (data.length < 2) return { ok: true, dry_run: dryRun, codes_supprimes: [], counts: { eleves: 0 } };
    var headers = data[0];
    var idxCode = headers.indexOf('code');
    var idxClasse = headers.indexOf('classe');
    if (idxCode === -1 || idxClasse === -1) return { error: 'colonnes code/classe introuvables' };

    var codesAffectes = [];
    var lignesAffectees = [];
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idxClasse]).trim() === classeCible) {
        codesAffectes.push(String(data[i][idxCode]));
        lignesAffectees.push(i + 1);
      }
    }

    var counts = { eleves: codesAffectes.length, evaluations_unifiees: 0, evaluations: 0, pfmp_log: 0, ccf_log: 0, eval_tuteur: 0, pin_hash: 0, pin_clair: 0 };

    if (codesAffectes.length === 0) {
      lock.releaseLock();
      return { ok: true, dry_run: dryRun, codes_supprimes: [], counts: counts, message: 'Aucun élève en classe "' + classeCible + '"' };
    }

    var codeSet = {};
    codesAffectes.forEach(function (c) { codeSet[c] = true; });

    function processTable(sheetName, headerCol) {
      var s = ss.getSheetByName(sheetName);
      if (!s || s.getLastRow() < 2) return 0;
      var d = s.getDataRange().getValues();
      var h = d[0];
      var col = (typeof headerCol === 'string') ? h.indexOf(headerCol) : headerCol;
      if (col === -1 || col == null) return 0;
      var count = 0;
      for (var k = d.length - 1; k >= 1; k--) {
        if (codeSet[String(d[k][col])]) {
          count++;
          if (!dryRun) s.deleteRow(k + 1);
        }
      }
      return count;
    }

    counts.evaluations_unifiees = processTable(TABS.EVALUATIONS_UNIFIEES, 0);
    counts.evaluations = processTable(TABS.EVALUATIONS, 0);
    counts.pfmp_log = processTable(TABS.PFMP_LOG, 'eleveCode');
    counts.ccf_log = processTable(TABS.CCF_LOG, 'eleveCode');
    counts.eval_tuteur = processTable('EvalTuteur', 'eleveCode');
    counts.pin_hash = processTable('ElevePinHash', 'code');
    counts.pin_clair = processTable('ElevePinClair', 'code');

    if (!dryRun) {
      lignesAffectees.sort(function (a, b) { return b - a; });
      lignesAffectees.forEach(function (rowNum) { elevesSheet.deleteRow(rowNum); });
    }

    lock.releaseLock();
    return {
      ok: true, dry_run: dryRun, classe: classeCible,
      codes_supprimes: codesAffectes, counts: counts,
      message: dryRun
        ? '🔍 DRY-RUN : ' + codesAffectes.length + ' élèves "' + classeCible + '" seraient supprimés.'
        : '✅ ' + codesAffectes.length + ' élèves "' + classeCible + '" supprimés.'
    };
  } catch (e) {
    try { lock.releaseLock(); } catch (_) {}
    return { error: 'exception : ' + e.message };
  }
}

// Liste tous les onglets de la Sheet + nb lignes (admin)
function adminListTabs(body) {
  if (!body || body.admin_key !== DEV_ADMIN_KEY) return { error: 'admin_key required' };
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var tabs = ss.getSheets().map(function (s) {
    return { name: s.getName(), rows: s.getLastRow(), cols: s.getLastColumn() };
  });
  return { ok: true, spreadsheet_id: CONFIG.SPREADSHEET_ID, spreadsheet_name: ss.getName(), tabs: tabs };
}

// Liste tous les backups Drive (admin)
function adminListBackups(body) {
  if (!body || body.admin_key !== DEV_ADMIN_KEY) return { error: 'admin_key required' };
  var iterator = DriveApp.getFoldersByName('Backups inerWeb');
  if (!iterator.hasNext()) return { ok: true, backups: [], message: 'Dossier Backups inerWeb introuvable' };
  var folder = iterator.next();
  var files = folder.getFiles();
  var list = [];
  while (files.hasNext()) {
    var f = files.next();
    list.push({ id: f.getId(), name: f.getName(), createdAt: f.getDateCreated().toISOString(), size: f.getSize() });
  }
  list.sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); });
  return { ok: true, count: list.length, backups: list };
}

// Restaure un backup spécifique en écrasant la Sheet courante (admin, dry_run dispo)
// body = { admin_key, backup_id, dry_run, tabs_to_restore: ['Élèves',...] }
function adminRestoreFromBackup(body) {
  if (!body || body.admin_key !== DEV_ADMIN_KEY) return { error: 'admin_key required' };
  if (!body.backup_id) return { error: 'backup_id required' };
  var dryRun = body.dry_run !== false;
  try {
    var backupFile = DriveApp.getFileById(body.backup_id);
    var backupSS = SpreadsheetApp.openById(body.backup_id);
    var backupTabs = backupSS.getSheets().map(function (s) {
      return { name: s.getName(), rows: s.getLastRow(), cols: s.getLastColumn() };
    });
    var tabsToRestore = body.tabs_to_restore || backupTabs.map(function (t) { return t.name; });
    if (dryRun) {
      return { ok: true, dry_run: true, backup_name: backupFile.getName(), tabs_available: backupTabs, tabs_would_restore: tabsToRestore, message: 'DRY-RUN — rien restauré' };
    }
    var targetSS = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var restored = [];
    tabsToRestore.forEach(function (tabName) {
      var src = backupSS.getSheetByName(tabName);
      if (!src) return;
      var data = src.getDataRange().getValues();
      var dst = targetSS.getSheetByName(tabName);
      if (!dst) dst = targetSS.insertSheet(tabName);
      dst.clear();
      if (data.length > 0 && data[0].length > 0) {
        dst.getRange(1, 1, data.length, data[0].length).setValues(data);
      }
      restored.push({ name: tabName, rows: data.length });
    });
    return { ok: true, dry_run: false, backup_name: backupFile.getName(), restored: restored };
  } catch (e) {
    return { error: 'exception : ' + e.message };
  }
}

// Inspecte un backup : retourne classes uniques + préfixes codes (sans afficher noms)
function adminInspectBackupEleves(body) {
  if (!body || body.admin_key !== DEV_ADMIN_KEY) return { error: 'admin_key required' };
  if (!body.backup_id) return { error: 'backup_id required' };
  try {
    var ss = SpreadsheetApp.openById(body.backup_id);
    var sheet = ss.getSheetByName('Élèves');
    if (!sheet) return { error: 'onglet Élèves absent du backup' };
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return { ok: true, total: 0, classes: {}, prefixes: {} };
    var headers = data[0];
    var idxCode = headers.indexOf('code');
    var idxClasse = headers.indexOf('classe');
    var classes = {}, prefixes = {};
    for (var i = 1; i < data.length; i++) {
      var c = String(data[i][idxClasse] || '').trim();
      var code = String(data[i][idxCode] || '').trim();
      classes[c] = (classes[c] || 0) + 1;
      var m = code.match(/^([A-Z]+)/);
      var pref = m ? m[1] : '?';
      prefixes[pref] = (prefixes[pref] || 0) + 1;
    }
    return { ok: true, backup_name: ss.getName(), total: data.length - 1, classes: classes, prefixes: prefixes };
  } catch (e) {
    return { error: 'exception : ' + e.message };
  }
}

// Casse la sync auto PROD→DEV (efface SHEET_DEV_ID côté PROD pour stopper l'écrasement)
function adminClearDevSheetId(body) {
  if (!body || body.admin_key !== DEV_ADMIN_KEY) return { error: 'admin_key required' };
  var props = PropertiesService.getScriptProperties();
  var was = props.getProperty('SHEET_DEV_ID');
  props.deleteProperty('SHEET_DEV_ID');
  props.deleteProperty('last_auto_sync_at');
  return { ok: true, previous_value: was, message: 'Sync auto PROD→DEV désactivée.' };
}

// Crée N élèves TNE pseudonymisés (codes TNE2526-001..N) en classe '2TNE'
// avec PIN clair 6 chiffres aléatoires + hash PBKDF2 minimal
// body = { admin_key, n: 20 }
function adminCreateTneSquelette(body) {
  if (!body || body.admin_key !== DEV_ADMIN_KEY) return { error: 'admin_key required' };
  var n = Math.max(1, Math.min(40, parseInt(body.n || 20, 10)));
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var elevesSheet = ss.getSheetByName(TABS.ELEVES);
  if (!elevesSheet) return { error: 'onglet Élèves introuvable' };
  var headers = elevesSheet.getRange(1, 1, 1, elevesSheet.getLastColumn()).getValues()[0];
  var idx = {};
  ['code','nom','prenom','classe','groupe','annee','statut','referentiel','token','token_tuteur','tel_eleve','tel_tuteur','email_eleve','tuteur_nom','tuteur_email','entreprise_nom','preference_contact_tuteur'].forEach(function (h) { idx[h] = headers.indexOf(h); });

  // Vérifier les codes déjà présents pour ne pas écraser
  var data = elevesSheet.getDataRange().getValues();
  var existing = {};
  for (var i = 1; i < data.length; i++) existing[String(data[i][idx.code])] = true;

  var pinClairSheet = ss.getSheetByName('ElevePinClair');
  if (!pinClairSheet) pinClairSheet = ss.insertSheet('ElevePinClair').appendRow(['code','pin','generated_at','generated_by','classe','phase','revoked_at']) && ss.getSheetByName('ElevePinClair');

  var created = [];
  var skipped = [];
  for (var k = 1; k <= n; k++) {
    var num = ('000' + k).slice(-3);
    var code = 'TNE2526-' + num;
    if (existing[code]) { skipped.push(code); continue; }
    var pseudo = 'TNE ' + num;
    var token = _randToken8(); var tokenT = _randToken8();
    var row = new Array(headers.length).fill('');
    row[idx.code] = code;
    row[idx.nom] = pseudo;
    row[idx.prenom] = '';
    row[idx.classe] = '2TNE';
    row[idx.annee] = '2025-2026';
    row[idx.statut] = 'actif';
    row[idx.referentiel] = '2nde TNE';
    if (idx.token !== -1) row[idx.token] = token;
    if (idx.token_tuteur !== -1) row[idx.token_tuteur] = tokenT;
    elevesSheet.appendRow(row);
    // PIN 6 chiffres aléatoires
    var pin = _randPin6();
    pinClairSheet.appendRow([code, pin, new Date().toISOString(), 'FH', '2TNE', 'creation', '']);
    created.push({ code: code, pin: pin, pseudo: pseudo });
  }
  return { ok: true, created: created, skipped: skipped, count_created: created.length };
}

function _randToken8() {
  var c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; var t = '';
  for (var i = 0; i < 8; i++) t += c.charAt(Math.floor(Math.random() * c.length));
  return t;
}
function _randPin6() {
  var s = ''; for (var i = 0; i < 6; i++) s += Math.floor(Math.random() * 10);
  return s;
}
