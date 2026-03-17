/**
 * INERWEB TTia — API Google Drive v1.0
 * Gestion des TP stockes sur Drive
 */
(function() {
  'use strict';

  var SCOPES = 'https://www.googleapis.com/auth/drive.readonly';
  var DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

  var tokenClient = null;
  var gapiInited = false;
  var gisInited = false;
  var accessToken = null;
  var CLIENT_ID = '';
  var API_KEY = '';

  /**
   * Initialise l'API Google (charge GAPI + GIS)
   */
  function init(clientId, apiKey) {
    CLIENT_ID = clientId || (window.INERWEB_CONFIG && INERWEB_CONFIG.GOOGLE_CLIENT_ID) || '';
    API_KEY = apiKey || (window.INERWEB_CONFIG && INERWEB_CONFIG.GOOGLE_API_KEY) || '';

    return new Promise(function(resolve, reject) {
      // Charger GAPI
      var script1 = document.createElement('script');
      script1.src = 'https://apis.google.com/js/api.js';
      script1.onload = function() {
        gapi.load('client', function() {
          gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: [DISCOVERY_DOC]
          }).then(function() {
            gapiInited = true;
            if (gapiInited && gisInited) resolve();
          });
        });
      };
      script1.onerror = function() { reject(new Error('Impossible de charger GAPI')); };
      document.head.appendChild(script1);

      // Charger GIS (Google Identity Services)
      var script2 = document.createElement('script');
      script2.src = 'https://accounts.google.com/gsi/client';
      script2.onload = function() {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: function(response) {
            if (response.access_token) accessToken = response.access_token;
          }
        });
        gisInited = true;
        if (gapiInited && gisInited) resolve();
      };
      script2.onerror = function() { reject(new Error('Impossible de charger GIS')); };
      document.head.appendChild(script2);
    });
  }

  /**
   * Demande l'autorisation a l'utilisateur
   */
  function authorize() {
    return new Promise(function(resolve, reject) {
      if (!tokenClient) {
        reject(new Error('Drive API non initialisee. Appelez iwDrive.init() d\'abord.'));
        return;
      }
      tokenClient.callback = function(response) {
        if (response.error) {
          reject(response);
        } else {
          accessToken = response.access_token;
          resolve(response);
        }
      };
      tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  }

  /**
   * Liste les fichiers d'un dossier
   */
  function listFolder(folderId) {
    if (!accessToken) return Promise.reject(new Error('Non autorise'));

    return gapi.client.drive.files.list({
      q: "'" + folderId + "' in parents and trashed = false",
      fields: 'files(id, name, mimeType, webViewLink, thumbnailLink, modifiedTime, size)',
      pageSize: 100
    }).then(function(response) {
      return response.result.files || [];
    });
  }

  /**
   * Scanne recursivement un dossier
   */
  function scanFolder(folderId, path, results) {
    path = path || '';
    results = results || [];

    return listFolder(folderId).then(function(files) {
      var chain = Promise.resolve();

      files.forEach(function(file) {
        var currentPath = path ? path + '/' + file.name : file.name;

        if (file.mimeType === 'application/vnd.google-apps.folder') {
          chain = chain.then(function() {
            return scanFolder(file.id, currentPath, results);
          });
        } else {
          results.push({
            id: file.id,
            nom: file.name,
            chemin: currentPath,
            lien: file.webViewLink,
            mimeType: file.mimeType,
            taille: file.size,
            dateModif: file.modifiedTime,
            formation: detectFormationFromPath(currentPath)
          });
        }
      });

      return chain.then(function() { return results; });
    });
  }

  /**
   * Detecte la formation depuis le chemin du fichier
   */
  function detectFormationFromPath(path) {
    var p = path.toLowerCase();
    if (p.indexOf('cap') >= 0 || p.indexOf('ifca') >= 0) return 'CAP_IFCA';
    if (p.indexOf('bac') >= 0 || p.indexOf('mfer') >= 0) return 'BAC_MFER';
    if (p.indexOf('tne') >= 0 || p.indexOf('2nde') >= 0) return 'TNE';
    return 'ALL';
  }

  function isConnected() {
    return !!accessToken;
  }

  function getToken() {
    return accessToken;
  }

  // API publique
  window.iwDrive = {
    init: init,
    authorize: authorize,
    isConnected: isConnected,
    getToken: getToken,
    listFolder: listFolder,
    scanFolder: scanFolder
  };

})();
