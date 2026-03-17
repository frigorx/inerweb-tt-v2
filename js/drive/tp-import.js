/**
 * INERWEB — Module Import TP Drive v1.0
 * Importe des références de fichiers Drive dans le catalogue TP
 */
(function() {
  'use strict';

  // ═══════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════

  var DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

  // Extensions supportées
  var EXTENSIONS_TP = [
    'pdf', 'doc', 'docx', 'odt',
    'ppt', 'pptx', 'odp',
    'xls', 'xlsx', 'ods',
    'html', 'htm',
    'mp4', 'webm', 'mov',
    'png', 'jpg', 'jpeg', 'gif', 'svg'
  ];

  // Mapping formations depuis noms de dossiers
  var FOLDER_TO_FORMATION = {
    'cap': 'CAP_IFCA',
    'cap ifca': 'CAP_IFCA',
    'ifca': 'CAP_IFCA',
    'bac': 'BAC_MFER',
    'bac pro': 'BAC_MFER',
    'mfer': 'BAC_MFER',
    'tne': 'TNE',
    '2nde': 'TNE',
    'seconde': 'TNE',
    'commun': 'ALL',
    'transversal': 'ALL'
  };

  // ═══════════════════════════════════════════════════════════
  // ÉTAT
  // ═══════════════════════════════════════════════════════════

  var accessToken = null;
  var importedTPs = [];

  // ═══════════════════════════════════════════════════════════
  // AUTHENTIFICATION GOOGLE
  // ═══════════════════════════════════════════════════════════

  function isAuthenticated() {
    return !!accessToken;
  }

  async function authenticate() {
    var stored = localStorage.getItem('iw_google_token');
    if (stored) {
      try {
        var data = JSON.parse(stored);
        if (data.expiry > Date.now()) {
          accessToken = data.token;
          return true;
        }
      } catch (e) {}
    }
    throw new Error('Authentification Google requise. Configurez OAuth dans les paramètres.');
  }

  // ═══════════════════════════════════════════════════════════
  // SCAN DOSSIER DRIVE
  // ═══════════════════════════════════════════════════════════

  async function listDriveFolder(folderId) {
    if (!accessToken) throw new Error('Non authentifié');

    var query = "'" + folderId + "' in parents and trashed = false";
    var fields = 'files(id,name,mimeType,webViewLink,iconLink,modifiedTime,size)';

    var url = DRIVE_API_BASE + '/files?q=' + encodeURIComponent(query) + '&fields=' + fields;

    var res = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    });

    if (!res.ok) throw new Error('Erreur API Drive: ' + res.status);

    var data = await res.json();
    return data.files || [];
  }

  async function scanFolderRecursive(folderId, path) {
    path = path || '';
    var files = await listDriveFolder(folderId);
    var results = [];

    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      var isFolder = file.mimeType === 'application/vnd.google-apps.folder';
      var currentPath = path ? path + '/' + file.name : file.name;

      if (isFolder) {
        var subFiles = await scanFolderRecursive(file.id, currentPath);
        results = results.concat(subFiles);
      } else {
        var ext = file.name.split('.').pop().toLowerCase();
        if (EXTENSIONS_TP.indexOf(ext) >= 0) {
          results.push({
            driveId: file.id,
            nom: file.name,
            chemin: currentPath,
            lien: file.webViewLink,
            type: getTypeFromMime(file.mimeType, ext),
            taille: file.size,
            dateModif: file.modifiedTime,
            formation: detectFormationFromPath(currentPath)
          });
        }
      }
    }

    return results;
  }

  function detectFormationFromPath(path) {
    var lower = path.toLowerCase();
    var keys = Object.keys(FOLDER_TO_FORMATION);
    for (var i = 0; i < keys.length; i++) {
      if (lower.indexOf(keys[i]) >= 0) {
        return FOLDER_TO_FORMATION[keys[i]];
      }
    }
    return 'ALL';
  }

  function getTypeFromMime(mime, ext) {
    if (mime.indexOf('pdf') >= 0) return 'pdf';
    if (mime.indexOf('presentation') >= 0 || ['ppt','pptx','odp'].indexOf(ext) >= 0) return 'presentation';
    if (mime.indexOf('spreadsheet') >= 0 || ['xls','xlsx','ods'].indexOf(ext) >= 0) return 'tableur';
    if (mime.indexOf('document') >= 0 || ['doc','docx','odt'].indexOf(ext) >= 0) return 'document';
    if (mime.indexOf('video') >= 0) return 'video';
    if (mime.indexOf('image') >= 0) return 'image';
    if (mime.indexOf('html') >= 0 || ['html','htm'].indexOf(ext) >= 0) return 'html';
    return 'autre';
  }

  // ═══════════════════════════════════════════════════════════
  // IMPORT DANS LE CATALOGUE
  // ═══════════════════════════════════════════════════════════

  function importerDansCatalogue(fichiers) {
    var catalogue = JSON.parse(localStorage.getItem('iw_tp_catalogue') || '{"tps":[]}');
    var importes = 0;
    var doublons = 0;

    for (var i = 0; i < fichiers.length; i++) {
      var f = fichiers[i];
      var existe = catalogue.tps.find(function(tp) { return tp.driveId === f.driveId; });
      if (existe) {
        doublons++;
        continue;
      }

      catalogue.tps.push({
        id: 'drive_' + f.driveId,
        driveId: f.driveId,
        titre: f.nom.replace(/\.[^/.]+$/, ''),
        fichier: f.nom,
        lien: f.lien,
        type: f.type,
        formation: f.formation,
        competences: [],
        dateImport: new Date().toISOString(),
        source: 'drive'
      });
      importes++;
    }

    localStorage.setItem('iw_tp_catalogue', JSON.stringify(catalogue));
    importedTPs = catalogue.tps;

    return {
      total: fichiers.length,
      importes: importes,
      doublons: doublons,
      catalogue: catalogue.tps.length
    };
  }

  // ═══════════════════════════════════════════════════════════
  // UI D'IMPORT
  // ═══════════════════════════════════════════════════════════

  function getIconForType(type) {
    var icons = {
      pdf: '\uD83D\uDCC4', document: '\uD83D\uDCDD', presentation: '\uD83D\uDCFD\uFE0F',
      tableur: '\uD83D\uDCCA', video: '\uD83C\uDFAC', image: '\uD83D\uDDBC\uFE0F',
      html: '\uD83C\uDF10', autre: '\uD83D\uDCCE'
    };
    return icons[type] || '\uD83D\uDCCE';
  }

  function showImportModal() {
    var html = ''
      + '<div class="modal-overlay" id="modal-import-drive" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem">'
      + '<div style="background:#fff;border-radius:16px;max-width:600px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3)">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;padding:1.2rem 1.5rem;border-bottom:1px solid #dee2e6">'
      + '<h2 style="font-size:1.1rem;margin:0;color:#1b3a63">\uD83D\uDCE5 Importer des TP depuis Google Drive</h2>'
      + '<button onclick="iwDriveImport.closeModal()" style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:#6c757d">\u2715</button>'
      + '</div>'
      + '<div style="padding:1.5rem">'
      + '<div id="import-step-auth" class="import-step">'
      + '<p style="margin-bottom:1rem;font-size:.85rem;color:#6c757d">Connectez-vous à Google Drive pour accéder à vos fichiers.</p>'
      + '<button class="btn btn-primary" onclick="iwDriveImport.startAuth()">\uD83D\uDD10 Connexion Google</button>'
      + '</div>'
      + '<div id="import-step-folder" class="import-step" style="display:none">'
      + '<label style="font-size:.8rem;font-weight:700;color:#1b3a63;display:block;margin-bottom:.4rem">ID du dossier Drive contenant vos TP :</label>'
      + '<input type="text" id="import-folder-id" placeholder="Ex: 1ABC123def456..." style="width:100%;padding:.6rem .8rem;border:2px solid #dee2e6;border-radius:8px;font-size:.85rem;margin-bottom:.8rem">'
      + '<p style="font-size:.72rem;color:#6c757d;margin-bottom:1rem;background:#f0f2f5;padding:.6rem .8rem;border-radius:8px;border-left:3px solid #ff6b35">'
      + 'Trouvez l\'ID dans l\'URL du dossier Drive :<br>https://drive.google.com/drive/folders/<strong>[ID_ICI]</strong></p>'
      + '<button class="btn btn-primary" onclick="iwDriveImport.startScan()">\uD83D\uDD0D Scanner le dossier</button>'
      + '</div>'
      + '<div id="import-step-scan" class="import-step" style="display:none;text-align:center;padding:2rem">'
      + '<div class="spinner" style="margin:0 auto 1rem"></div>'
      + '<span style="color:#6c757d;font-size:.85rem">Scan en cours...</span>'
      + '</div>'
      + '<div id="import-step-preview" class="import-step" style="display:none">'
      + '<p style="margin-bottom:.8rem;font-size:.85rem"><strong id="import-count">0</strong> fichiers trouvés :</p>'
      + '<div id="import-preview-list" style="max-height:300px;overflow-y:auto;border:1px solid #dee2e6;border-radius:8px;margin-bottom:1rem"></div>'
      + '<button class="btn btn-vert" onclick="iwDriveImport.confirmImport()">\u2705 Importer dans le catalogue</button>'
      + '</div>'
      + '<div id="import-step-done" class="import-step" style="display:none;text-align:center;padding:2rem">'
      + '<div style="font-size:3rem;margin-bottom:.8rem">\u2705</div>'
      + '<p style="font-size:1rem;font-weight:700;color:#27ae60;margin-bottom:1rem"><strong id="import-result-count">0</strong> TP importés avec succès !</p>'
      + '<button class="btn btn-ghost" onclick="iwDriveImport.closeModal()">Fermer</button>'
      + '</div>'
      + '</div></div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
  }

  function closeModal() {
    var modal = document.getElementById('modal-import-drive');
    if (modal) modal.remove();
  }

  async function startAuth() {
    try {
      await authenticate();
      document.getElementById('import-step-auth').style.display = 'none';
      document.getElementById('import-step-folder').style.display = 'block';
    } catch (e) {
      alert('Erreur d\'authentification: ' + e.message);
    }
  }

  async function startScan() {
    var folderId = document.getElementById('import-folder-id').value.trim();
    if (!folderId) {
      alert('Veuillez entrer l\'ID du dossier Drive');
      return;
    }

    document.getElementById('import-step-folder').style.display = 'none';
    document.getElementById('import-step-scan').style.display = 'block';

    try {
      var fichiers = await scanFolderRecursive(folderId);

      document.getElementById('import-step-scan').style.display = 'none';
      document.getElementById('import-step-preview').style.display = 'block';
      document.getElementById('import-count').textContent = fichiers.length;

      var list = document.getElementById('import-preview-list');
      var items = fichiers.slice(0, 20);
      var html = '';
      for (var i = 0; i < items.length; i++) {
        var f = items[i];
        html += '<div style="display:flex;align-items:center;gap:.5rem;padding:.5rem .8rem;border-bottom:1px solid #f0f2f5;font-size:.8rem">'
          + '<span>' + getIconForType(f.type) + '</span>'
          + '<span style="flex:1;font-weight:600">' + f.nom + '</span>'
          + '<span style="font-size:.65rem;color:#6c757d;background:#f0f2f5;padding:.15rem .4rem;border-radius:4px">' + f.formation + '</span>'
          + '</div>';
      }
      if (fichiers.length > 20) {
        html += '<div style="text-align:center;padding:.5rem;font-size:.75rem;color:#6c757d">+ ' + (fichiers.length - 20) + ' autres fichiers...</div>';
      }
      list.innerHTML = html;

      window._pendingImport = fichiers;

    } catch (e) {
      alert('Erreur lors du scan: ' + e.message);
      document.getElementById('import-step-scan').style.display = 'none';
      document.getElementById('import-step-folder').style.display = 'block';
    }
  }

  function confirmImport() {
    var fichiers = window._pendingImport || [];
    var result = importerDansCatalogue(fichiers);

    document.getElementById('import-step-preview').style.display = 'none';
    document.getElementById('import-step-done').style.display = 'block';
    document.getElementById('import-result-count').textContent = result.importes;

    document.dispatchEvent(new CustomEvent('iw:tpCatalogueUpdated', { detail: result }));
  }

  // ═══════════════════════════════════════════════════════════
  // API PUBLIQUE
  // ═══════════════════════════════════════════════════════════

  window.iwDriveImport = {
    showModal: showImportModal,
    closeModal: closeModal,
    startAuth: startAuth,
    startScan: startScan,
    confirmImport: confirmImport,
    isAuthenticated: isAuthenticated,
    getCatalogue: function() { return importedTPs; }
  };

})();
