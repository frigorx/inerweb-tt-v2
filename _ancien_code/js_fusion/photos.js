/**
 * photos.js — Module capture et stockage de photos/PDF par compétence ou par TP
 * Stockage IndexedDB (store 'photos')
 *
 * Structure d'un enregistrement :
 * { id (auto), studentCode, actId, epreuve, compCode, phase, date, data (base64), thumb (base64 réduit), type ('image'|'pdf'), filename }
 *
 * Globales : db, saveIDB, loadIDB, getAllIDB, deleteIDB, showModal, closeModal, toast, students
 */
;(function () {
  'use strict';

  var STORE = 'photos';
  var MAX_PHOTOS = 10;
  var MAX_WIDTH = 1200;
  var THUMB_WIDTH = 160;
  var MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo

  // ── Helpers ──

  function _db() { return window.db; }

  function _hasStore() {
    var d = _db();
    return d && d.objectStoreNames.contains(STORE);
  }

  function _studentName(code) {
    var s = (window.students || []).find(function(e){ return e.code === code; });
    if (!s) return code;
    return (s.nom || '') + ' ' + (s.prenom ? s.prenom.charAt(0) + '.' : '');
  }

  function _dateFR(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  function _isPDF(file) {
    return file && (file.type === 'application/pdf' || (file.name && file.name.toLowerCase().endsWith('.pdf')));
  }

  // ── Redimensionnement image ──

  function _resizeImage(file, maxW, callback) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var w = img.width, h = img.height;
        if (w > maxW) {
          h = Math.round(h * maxW / w);
          w = maxW;
        }
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        callback(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function _makeThumb(base64, callback) {
    var img = new Image();
    img.onload = function() {
      var w = img.width, h = img.height;
      if (w > THUMB_WIDTH) {
        h = Math.round(h * THUMB_WIDTH / w);
        w = THUMB_WIDTH;
      }
      var canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.src = base64;
  }

  function _readFileAsDataURL(file, callback) {
    var reader = new FileReader();
    reader.onload = function(e) { callback(e.target.result); };
    reader.readAsDataURL(file);
  }

  // ── CRUD IndexedDB ──

  function _save(record) {
    return new Promise(function(resolve) {
      if (!_hasStore()) { resolve(null); return; }
      try {
        var tx = _db().transaction(STORE, 'readwrite');
        var store = tx.objectStore(STORE);
        var req = store.add(record);
        req.onsuccess = function() { record.id = req.result; resolve(record); };
        req.onerror = function() { resolve(null); };
      } catch(e) { resolve(null); }
    });
  }

  function _deleteById(id) {
    return new Promise(function(resolve) {
      if (!_hasStore()) { resolve(false); return; }
      try {
        var tx = _db().transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = function() { resolve(true); };
        tx.onerror = function() { resolve(false); };
      } catch(e) { resolve(false); }
    });
  }

  function _getByIndex(indexName, value) {
    return new Promise(function(resolve) {
      if (!_hasStore()) { resolve([]); return; }
      try {
        var tx = _db().transaction(STORE, 'readonly');
        var store = tx.objectStore(STORE);
        var idx = store.index(indexName);
        var req = idx.getAll(value);
        req.onsuccess = function() { resolve(req.result || []); };
        req.onerror = function() { resolve([]); };
      } catch(e) { resolve([]); }
    });
  }

  function _getById(id) {
    return new Promise(function(resolve) {
      if (!_hasStore()) { resolve(null); return; }
      try {
        var tx = _db().transaction(STORE, 'readonly');
        var req = tx.objectStore(STORE).get(id);
        req.onsuccess = function() { resolve(req.result || null); };
        req.onerror = function() { resolve(null); };
      } catch(e) { resolve(null); }
    });
  }

  // ── API publique ──

  /** Récupère les photos pour un élève + compétence dans une activité */
  function getPhotos(studentCode, actId, compCode) {
    var key = studentCode + '|' + actId + '|' + compCode;
    return _getByIndex('compKey', key);
  }

  /** Récupère toutes les photos d'un élève (pour l'historique) */
  function getStudentPhotos(studentCode) {
    return _getByIndex('studentCode', studentCode);
  }

  /** Récupère toutes les photos d'une activité */
  function getActivityPhotos(actId) {
    return _getByIndex('actId', actId);
  }

  /** Compte les photos par élève pour une activité donnée */
  function countByStudent(actId) {
    return getActivityPhotos(actId).then(function(photos) {
      var counts = {};
      photos.forEach(function(p) {
        counts[p.studentCode] = (counts[p.studentCode] || 0) + 1;
      });
      return counts;
    });
  }

  /** Ajoute une photo depuis un fichier (File object) */
  function addPhoto(file, meta) {
    return new Promise(function(resolve) {
      if (file.size > MAX_FILE_SIZE) {
        window.toast('Fichier trop volumineux (max 5 Mo)', 'err');
        resolve(null);
        return;
      }

      var isPdf = _isPDF(file);

      function _saveRecord(data, thumb) {
        var record = {
          studentCode: meta.studentCode,
          actId: meta.actId,
          epreuve: meta.epreuve,
          compCode: meta.compCode || '',
          phase: meta.phase || 'formatif',
          date: meta.date || new Date().toISOString().split('T')[0],
          compKey: meta.studentCode + '|' + meta.actId + '|' + (meta.compCode || ''),
          data: data,
          thumb: thumb,
          type: isPdf ? 'pdf' : 'image',
          filename: file.name || '',
          timestamp: Date.now()
        };
        _save(record).then(function(saved) {
          resolve(saved);
        });
      }

      if (isPdf) {
        // PDF : stocker le base64 tel quel, miniature = icône PDF
        _readFileAsDataURL(file, function(data) {
          _saveRecord(data, '');
        });
      } else {
        // Image : redimensionner et créer miniature
        _resizeImage(file, MAX_WIDTH, function(data) {
          _makeThumb(data, function(thumb) {
            _saveRecord(data, thumb);
          });
        });
      }
    });
  }

  /** Supprime une photo par son ID */
  function deletePhoto(id) {
    return _deleteById(id);
  }

  // ── UI : miniature PDF ──

  function _pdfThumb() {
    return '<div style="width:52px;height:52px;background:#e53935;color:#fff;border-radius:6px;'
      + 'display:flex;flex-direction:column;align-items:center;justify-content:center;'
      + 'font-size:.55rem;font-weight:800;line-height:1.2">'
      + '<span style="font-size:1.2rem">PDF</span></div>';
  }

  function _pdfThumbLarge() {
    return '<div style="width:60px;height:60px;background:#e53935;color:#fff;border-radius:6px;'
      + 'display:flex;flex-direction:column;align-items:center;justify-content:center;'
      + 'font-size:.6rem;font-weight:800;line-height:1.2">'
      + '<span style="font-size:1.4rem">PDF</span></div>';
  }

  // ── UI : bouton capture dans l'évaluation ──

  /**
   * Retourne le HTML d'un bloc photo pour une compétence dans l'évaluation.
   */
  function renderPhotoBlock(studentCode, actId, compCode, epreuve, existingPhotos) {
    var photos = existingPhotos || [];
    var canAdd = photos.length < MAX_PHOTOS;
    var inputId = 'photoInput_' + actId + '_' + compCode + '_' + studentCode;

    var html = '<div class="photoBlock" style="margin-top:.4rem;padding-top:.4rem;border-top:1px dashed #ddd">';

    // Miniatures existantes
    if (photos.length) {
      html += '<div style="display:flex;gap:.3rem;flex-wrap:wrap;margin-bottom:.3rem">';
      photos.forEach(function(p) {
        html += '<div style="position:relative;display:inline-block">';
        if (p.type === 'pdf') {
          html += '<div data-act="viewPhoto" data-photo-id="' + p.id + '" style="cursor:pointer">' + _pdfThumb() + '</div>';
        } else {
          html += '<img src="' + (p.thumb || p.data) + '" data-photo-id="' + p.id + '" '
            + 'style="width:52px;height:52px;object-fit:cover;border-radius:6px;border:1px solid #ccc;cursor:pointer" '
            + 'data-act="viewPhoto">';
        }
        html += '<span data-act="deletePhoto" data-photo-id="' + p.id + '" data-stu="' + studentCode + '" '
          + 'data-actid="' + actId + '" data-comp="' + compCode + '" data-epr="' + epreuve + '" '
          + 'style="position:absolute;top:-4px;right:-4px;background:#e53935;color:#fff;'
          + 'width:16px;height:16px;border-radius:50%;font-size:10px;line-height:16px;text-align:center;'
          + 'cursor:pointer;font-weight:700;box-shadow:0 1px 3px rgba(0,0,0,.3)">×</span>';
        html += '</div>';
      });
      html += '</div>';
    }

    // Bouton capture
    if (canAdd) {
      html += '<label for="' + inputId + '" style="display:inline-flex;align-items:center;gap:.3rem;'
        + 'padding:.3rem .6rem;background:#f5f5f5;border:1px dashed #aaa;border-radius:6px;'
        + 'font-size:.7rem;color:#555;cursor:pointer;-webkit-tap-highlight-color:rgba(0,0,0,.1)">'
        + '<span style="font-size:1rem">📷</span> Photo / PDF'
        + '<span style="color:#999;font-size:.62rem">(' + photos.length + '/' + MAX_PHOTOS + ')</span>'
        + '</label>';
      html += '<input type="file" id="' + inputId + '" accept="image/*,.pdf,application/pdf" capture="environment" multiple '
        + 'data-photo-stu="' + studentCode + '" data-photo-act="' + actId + '" '
        + 'data-photo-comp="' + compCode + '" data-photo-epr="' + epreuve + '" '
        + 'style="display:none" class="photoFileInput">';
    } else {
      html += '<span style="font-size:.68rem;color:#888">📷 Max ' + MAX_PHOTOS + ' photos/PDF atteint</span>';
    }

    html += '</div>';
    return html;
  }

  /**
   * Retourne le HTML d'une galerie globale (toutes photos d'un TP, groupées par élève)
   */
  function renderActivityGallery(actId, photos) {
    if (!photos || !photos.length) {
      return '<div style="text-align:center;padding:1rem;color:#888;font-size:.8rem">'
        + '📷 Aucune photo/PDF pour ce TP</div>';
    }

    // Grouper par élève
    var groups = {};
    photos.forEach(function(p) {
      var key = p.studentCode || 'inconnu';
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });

    var html = '';
    Object.keys(groups).sort().forEach(function(code) {
      var group = groups[code];
      html += '<div style="margin-bottom:.6rem;padding:.5rem;background:#f9f9f9;border-radius:8px;border:1px solid #eee">';
      html += '<div style="font-weight:700;font-size:.78rem;margin-bottom:.3rem">👤 ' + _studentName(code)
        + ' <span style="color:#888;font-weight:400">(' + group.length + ' fichier' + (group.length > 1 ? 's' : '') + ')</span></div>';
      html += '<div style="display:flex;gap:.3rem;flex-wrap:wrap">';
      group.forEach(function(p) {
        if (p.type === 'pdf') {
          html += '<div style="position:relative;cursor:pointer" data-act="viewPhoto" data-photo-id="' + p.id + '">';
          html += _pdfThumbLarge();
          html += '<div style="font-size:.55rem;text-align:center;color:#666;margin-top:.1rem;max-width:60px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'
            + (p.filename || 'PDF') + '</div>';
          html += '</div>';
        } else {
          html += '<div style="position:relative;cursor:pointer" data-act="viewPhoto" data-photo-id="' + p.id + '">';
          html += '<img src="' + (p.thumb || p.data) + '" style="width:60px;height:60px;object-fit:cover;border-radius:6px;border:1px solid #ddd">';
          html += '<div style="font-size:.58rem;text-align:center;color:#666;margin-top:.1rem">' + (p.compCode || '') + '</div>';
          html += '</div>';
        }
      });
      html += '</div></div>';
    });
    return html;
  }

  /** Affiche une photo en plein écran ou ouvre un PDF */
  function viewPhoto(photoId) {
    _getById(photoId).then(function(photo) {
      if (!photo) { window.toast('Photo introuvable', 'err'); return; }

      if (photo.type === 'pdf') {
        // Ouvrir le PDF dans un nouvel onglet
        var win = window.open('', '_blank');
        if (win) {
          win.document.write('<html><head><title>' + (photo.filename || 'Document PDF') + '</title></head>'
            + '<body style="margin:0"><embed src="' + photo.data + '" type="application/pdf" width="100%" height="100%" style="position:absolute;top:0;left:0;width:100%;height:100%"></body></html>');
          win.document.close();
        } else {
          // Fallback : lien de téléchargement
          var a = document.createElement('a');
          a.href = photo.data;
          a.download = photo.filename || 'document.pdf';
          a.click();
        }
        return;
      }

      var body = '<div style="text-align:center">';
      body += '<img src="' + photo.data + '" style="max-width:100%;max-height:70vh;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,.15)">';
      body += '<div style="margin-top:.5rem;font-size:.75rem;color:#666">';
      body += _dateFR(photo.date) + (photo.compCode ? ' — ' + photo.compCode : '');
      body += ' — ' + (photo.phase === 'certificatif' ? 'Certif.' : 'Format.');
      if (photo.filename) body += ' — ' + photo.filename;
      body += '</div></div>';
      var actions = '<button type="button" onclick="closeModal()" style="width:100%;padding:.5rem;border:none;'
        + 'background:var(--bleu2);color:#fff;border-radius:8px;font-weight:700;cursor:pointer">Fermer</button>';
      window.showModal('Photo', body, actions);
    });
  }

  // ── UI : historique photos d'un élève ──

  function renderStudentPhotos(studentCode, container) {
    var el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;

    getStudentPhotos(studentCode).then(function(photos) {
      if (!photos.length) {
        el.innerHTML = '<div style="text-align:center;padding:1rem;color:#888;font-size:.8rem">'
          + 'Aucune photo enregistrée</div>';
        return;
      }

      // Grouper par activité
      var groups = {};
      photos.forEach(function(p) {
        var key = p.actId || 'inconnu';
        if (!groups[key]) groups[key] = { actId: key, epreuve: p.epreuve, date: p.date, photos: [] };
        groups[key].photos.push(p);
      });

      var html = '<div style="font-size:.82rem">';
      Object.keys(groups).sort(function(a,b) {
        return (groups[b].date || '').localeCompare(groups[a].date || '');
      }).forEach(function(key) {
        var g = groups[key];
        var act = (window.appCfg && window.appCfg.activites || []).find(function(a){ return a.id === g.actId; });
        var titre = act ? act.titre : g.actId;

        html += '<div style="margin-bottom:.6rem;padding:.5rem;background:#f9f9f9;border-radius:8px;border:1px solid #eee">';
        html += '<div style="font-weight:700;font-size:.78rem;margin-bottom:.3rem">'
          + titre + ' <span style="color:#888;font-weight:400">(' + _dateFR(g.date) + ')</span></div>';
        html += '<div style="display:flex;gap:.3rem;flex-wrap:wrap">';
        g.photos.forEach(function(p) {
          if (p.type === 'pdf') {
            html += '<div style="position:relative;cursor:pointer" data-act="viewPhoto" data-photo-id="' + p.id + '">';
            html += _pdfThumbLarge();
            html += '<div style="font-size:.55rem;text-align:center;color:#666;margin-top:.1rem;max-width:60px;overflow:hidden;text-overflow:ellipsis">'
              + (p.filename || 'PDF') + '</div>';
            html += '</div>';
          } else {
            html += '<div style="position:relative;cursor:pointer" data-act="viewPhoto" data-photo-id="' + p.id + '">';
            html += '<img src="' + (p.thumb || p.data) + '" style="width:60px;height:60px;object-fit:cover;border-radius:6px;border:1px solid #ddd">';
            html += '<div style="font-size:.58rem;text-align:center;color:#666;margin-top:.1rem">' + (p.compCode || '') + '</div>';
            html += '</div>';
          }
        });
        html += '</div></div>';
      });
      html += '</div>';
      el.innerHTML = html;
    });
  }

  // ── Délégation événements ──

  document.addEventListener('click', function(e) {
    var btn;

    // Voir une photo
    btn = e.target.closest('[data-act="viewPhoto"]');
    if (btn) {
      var photoId = parseInt(btn.dataset.photoId || (btn.querySelector('img[data-photo-id]') ? btn.querySelector('img[data-photo-id]').dataset.photoId : ''), 10);
      if (photoId) viewPhoto(photoId);
      return;
    }

    // Supprimer une photo
    btn = e.target.closest('[data-act="deletePhoto"]');
    if (btn) {
      var id = parseInt(btn.dataset.photoId, 10);
      if (!id) return;
      deletePhoto(id).then(function() {
        window.toast('Photo supprimée', 'inf');
        if (window._photoRefreshCallback) window._photoRefreshCallback();
      });
      return;
    }
  });

  // Écouter les inputs file pour la capture
  document.addEventListener('change', function(e) {
    var input = e.target;
    if (!input.classList.contains('photoFileInput')) return;
    var files = input.files;
    if (!files || !files.length) return;

    var stu = input.dataset.photoStu;
    var actId = input.dataset.photoAct;
    var comp = input.dataset.photoComp;
    var epr = input.dataset.photoEpr;

    // Chercher la phase de l'élève dans l'activité
    var act = (window.appCfg && window.appCfg.activites || []).find(function(a){ return a.id === actId; });
    var phase = 'formatif';
    if (act) {
      phase = (act.phasesEleves && act.phasesEleves[stu]) ? act.phasesEleves[stu] : (act.phase || 'formatif');
    }

    // Compter les photos existantes pour cet élève dans ce TP (toutes compétences)
    getActivityPhotos(actId).then(function(allPhotos) {
      var studentPhotos = allPhotos.filter(function(p) { return p.studentCode === stu; });
      var remaining = MAX_PHOTOS - studentPhotos.length;
      var toProcess = Array.from(files).slice(0, remaining);
      if (!toProcess.length) {
        window.toast('Maximum ' + MAX_PHOTOS + ' fichiers par élève atteint', 'err');
        input.value = '';
        return;
      }

      var done = 0;
      toProcess.forEach(function(file) {
        addPhoto(file, {
          studentCode: stu, actId: actId, epreuve: epr,
          compCode: comp, phase: phase
        }).then(function() {
          done++;
          if (done === toProcess.length) {
            window.toast(done + ' fichier(s) ajouté(s)', 'ok');
            input.value = '';
            if (window._photoRefreshCallback) window._photoRefreshCallback();
          }
        });
      });
    });
  });

  // ── Exposition globale ──

  window.photosModule = {
    getPhotos: getPhotos,
    getStudentPhotos: getStudentPhotos,
    getActivityPhotos: getActivityPhotos,
    countByStudent: countByStudent,
    addPhoto: addPhoto,
    deletePhoto: deletePhoto,
    renderPhotoBlock: renderPhotoBlock,
    renderActivityGallery: renderActivityGallery,
    viewPhoto: viewPhoto,
    renderStudentPhotos: renderStudentPhotos,
    MAX_PHOTOS: MAX_PHOTOS
  };

})();
