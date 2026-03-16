/**
 * historique.js — Module fil d'activité chronologique par élève
 * IIFE exposant window.historiqueModule
 *
 * Affiche toutes les évaluations d'un élève dans l'ordre chronologique
 * avec phase, épreuve, compétence, changement de niveau, évaluateur,
 * observation et indicateur photo.
 *
 * Utilise la DÉLÉGATION D'ÉVÉNEMENTS (document.addEventListener)
 *
 * Globales : validations, students, COMP_EP2, COMP_EP3, NV_LBL,
 *            window.photosModule
 */
;(function () {
  'use strict';

  // ── Couleurs épreuves (cohérent avec activites.js) ──

  var COULEURS = {
    'EP2':   { bg: '#2d5a8c', light: '#e8f0f8' },
    'EP3-A': { bg: '#9b59b6', light: '#f3e5f5' },
    'EP3-B': { bg: '#3498db', light: '#d1ecf1' },
    'EP3-C': { bg: '#1abc9c', light: '#d4f4e2' }
  };

  var NV_COULEURS = {
    'NE': '#999', 'NA': '#e74c3c', 'EC': '#f39c12',
    'M': '#27ae60', 'PM': '#2ecc71',
    'NE-ABS': '#aaa', 'NE-IMP': '#aaa', 'NE-NON': '#aaa', 'NE-REF': '#aaa'
  };

  // ── Helpers ──

  function _studentName(code) {
    var s = (window.students || []).find(function (e) { return e.code === code; });
    if (!s) return code;
    return (s.nom || '') + ' ' + (s.prenom ? s.prenom.charAt(0) + '.' : '');
  }

  function _compLabel(compCode) {
    var all = (window.COMP_EP2 || []).concat(window.COMP_EP3 || []);
    var c = all.find(function (x) { return x.code === compCode; });
    return c ? c.nom : compCode;
  }

  function _epLabel(epreuve, contexte) {
    if (epreuve === 'EP2') return 'EP2';
    if (contexte) return 'EP3-' + contexte.toUpperCase();
    return 'EP3';
  }

  function _epKey(epreuve, contexte) {
    if (epreuve === 'EP2') return 'EP2';
    if (contexte) return 'EP3-' + contexte.toUpperCase();
    return 'EP3-A';
  }

  function _dateFR(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    var dd = String(d.getDate()).padStart(2, '0');
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var yy = String(d.getFullYear());
    return dd + '/' + mm + '/' + yy;
  }

  function _heureFR(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return String(d.getHours()).padStart(2, '0') + 'h' + String(d.getMinutes()).padStart(2, '0');
  }

  function _phaseIcon(phase) {
    return phase === 'certificatif' ? '\u{1F4D9}' : '\u{1F4D8}';
  }

  function _phaseLabel(phase) {
    if (phase === 'certificatif') return 'Certificatif';
    if (phase === 'cloture') return 'Clôturé';
    return 'Formatif';
  }

  function _nvLabel(nv) {
    var lbl = window.NV_LBL || {};
    return lbl[nv] || nv || '?';
  }

  /** Injecte le style une seule fois */
  var _styleInjected = false;
  function _injectStyle() {
    if (_styleInjected) return;
    _styleInjected = true;
    var css = [
      '.hist-timeline { padding: 0; margin: 0; list-style: none; position: relative; }',
      '.hist-timeline::before { content:""; position:absolute; left:14px; top:0; bottom:0; width:2px; background:#ddd; }',
      '.hist-entry { position:relative; padding:6px 10px 8px 36px; margin-bottom:6px; border-radius:10px; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.08); font-size:.78rem; line-height:1.35; transition:background .15s; }',
      '.hist-entry:active { background:#f5f5f5; }',
      '.hist-dot { position:absolute; left:8px; top:12px; width:14px; height:14px; border-radius:50%; border:2px solid #fff; box-shadow:0 0 0 1px #ccc; z-index:1; }',
      '.hist-date { color:#888; font-size:.72rem; margin-bottom:2px; }',
      '.hist-phase { display:inline-block; font-size:.68rem; padding:1px 6px; border-radius:8px; margin-left:4px; color:#fff; vertical-align:middle; }',
      '.hist-ep { display:inline-block; font-size:.7rem; font-weight:600; padding:1px 6px; border-radius:6px; color:#fff; margin-right:4px; }',
      '.hist-comp { font-weight:600; color:#333; }',
      '.hist-nv-change { margin-top:2px; }',
      '.hist-nv { display:inline-block; padding:1px 6px; border-radius:6px; font-size:.72rem; font-weight:600; color:#fff; }',
      '.hist-arrow { margin:0 4px; color:#999; font-size:.8rem; }',
      '.hist-evaluateur { color:#888; font-size:.7rem; margin-top:2px; }',
      '.hist-obs { color:#555; font-size:.72rem; font-style:italic; margin-top:2px; padding:3px 6px; background:#fafafa; border-radius:6px; border-left:2px solid #ddd; }',
      '.hist-photo-badge { display:inline-block; font-size:.68rem; padding:1px 5px; border-radius:6px; background:#e8f5e9; color:#388e3c; margin-left:4px; }',
      '.hist-empty { text-align:center; padding:24px 12px; color:#999; font-size:.82rem; }',
      '.hist-compact-more { text-align:center; padding:8px; }',
      '.hist-compact-more button { background:none; border:1px solid #ccc; border-radius:8px; padding:5px 14px; font-size:.76rem; color:#555; cursor:pointer; }',
      '.hist-header { font-size:.82rem; font-weight:600; color:#444; margin-bottom:8px; padding-bottom:4px; border-bottom:1px solid #eee; }',
      '.hist-entry[data-hist-expand] { cursor:pointer; }',
      '.hist-obs-hidden { display:none; }',
      '.hist-entry.hist-expanded .hist-obs-hidden { display:block; }'
    ].join('\n');
    var tag = document.createElement('style');
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  // ── Données ──

  /** Récupère les entrées de validation triées par date décroissante */
  function _getEntries(studentCode) {
    var raw = (window.validations || {})[studentCode] || [];
    // Copie et tri décroissant
    var sorted = raw.slice().sort(function (a, b) {
      var ta = a.timestamp || '', tb = b.timestamp || '';
      return ta > tb ? -1 : ta < tb ? 1 : 0;
    });
    return sorted;
  }

  /** Trouve le niveau précédent pour une compétence donnée avant un timestamp */
  function _niveauPrecedent(entries, idx) {
    var e = entries[idx];
    // Les entrées sont en ordre décroissant, donc les "précédentes" sont après idx
    for (var i = idx + 1; i < entries.length; i++) {
      if (entries[i].competence === e.competence &&
          entries[i].epreuve === e.epreuve) {
        return entries[i].niveau || 'NE';
      }
    }
    return 'NE';
  }

  // ── Rendu HTML ──

  function _renderEntry(entry, prevNv, hasPhotos) {
    var epKey = _epKey(entry.epreuve, entry.contexte);
    var col = COULEURS[epKey] || COULEURS['EP2'];
    var phCol = entry.phase === 'certificatif' ? '#FF9800' : '#2196F3';
    var nvCur = entry.niveau || 'NE';
    var nvPrev = prevNv || 'NE';
    var changed = nvCur !== nvPrev;

    var html = '';
    html += '<li class="hist-entry" data-hist-expand="1">';
    html += '<span class="hist-dot" style="background:' + col.bg + '"></span>';

    // Ligne date + phase
    html += '<div class="hist-date">';
    html += _dateFR(entry.timestamp) + ' ' + _heureFR(entry.timestamp);
    html += ' <span class="hist-phase" style="background:' + phCol + '">';
    html += _phaseIcon(entry.phase) + ' ' + _phaseLabel(entry.phase);
    html += '</span>';
    if (hasPhotos) {
      html += ' <span class="hist-photo-badge">\u{1F4F7} photo</span>';
    }
    html += '</div>';

    // Épreuve + compétence
    html += '<div>';
    html += '<span class="hist-ep" style="background:' + col.bg + '">' + _epLabel(entry.epreuve, entry.contexte) + '</span>';
    html += '<span class="hist-comp">' + (entry.competence || '') + '</span>';
    html += ' <span style="color:#888;font-size:.7rem">' + _compLabel(entry.competence) + '</span>';
    html += '</div>';

    // Changement de niveau
    html += '<div class="hist-nv-change">';
    if (changed) {
      html += '<span class="hist-nv" style="background:' + (NV_COULEURS[nvPrev] || '#999') + '">' + nvPrev + '</span>';
      html += '<span class="hist-arrow">\u2192</span>';
    }
    html += '<span class="hist-nv" style="background:' + (NV_COULEURS[nvCur] || '#999') + '">' + nvCur + '</span>';
    if (changed) {
      html += ' <span style="font-size:.7rem;color:#888">(' + _nvLabel(nvPrev) + ' \u2192 ' + _nvLabel(nvCur) + ')</span>';
    } else {
      html += ' <span style="font-size:.7rem;color:#888">(maintenu)</span>';
    }
    html += '</div>';

    // Évaluateur
    if (entry.evaluateur) {
      html += '<div class="hist-evaluateur">\u{1F464} ' + entry.evaluateur + '</div>';
    }

    // Critère si présent
    if (entry.critere) {
      html += '<div class="hist-obs-hidden" style="font-size:.7rem;color:#666;margin-top:2px">';
      html += '\u{1F4CB} Critère : ' + decodeURIComponent(entry.critere);
      html += '</div>';
    }

    // Observation
    if (entry.observation) {
      html += '<div class="hist-obs hist-obs-hidden">\u{1F4AC} ' + entry.observation + '</div>';
    }

    html += '</li>';
    return html;
  }

  // ── Vérification photos (asynchrone) ──

  function _checkPhotos(studentCode, entries, callback) {
    if (!window.photosModule || !window.photosModule.getStudentPhotos) {
      callback({});
      return;
    }
    window.photosModule.getStudentPhotos(studentCode).then(function (photos) {
      var map = {};
      if (photos && photos.length) {
        photos.forEach(function (p) {
          var key = (p.compCode || '') + '|' + (p.epreuve || '');
          map[key] = true;
        });
      }
      callback(map);
    }).catch(function () {
      callback({});
    });
  }

  // ── API publique ──

  /**
   * renderTimeline — Affiche le fil chronologique complet
   * @param {string} studentCode
   * @param {HTMLElement} container
   */
  function renderTimeline(studentCode, container) {
    _injectStyle();
    var entries = _getEntries(studentCode);

    if (!entries.length) {
      container.innerHTML = '<div class="hist-empty">Aucune évaluation enregistrée pour ' + _studentName(studentCode) + '</div>';
      return;
    }

    container.innerHTML = '<div class="hist-header">\u{1F4C5} Historique de ' + _studentName(studentCode) + ' (' + entries.length + ' évaluation' + (entries.length > 1 ? 's' : '') + ')</div><ul class="hist-timeline" id="hist-tl-' + studentCode + '"></ul>';

    _checkPhotos(studentCode, entries, function (photoMap) {
      var ul = container.querySelector('#hist-tl-' + studentCode);
      if (!ul) return;
      var html = '';
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        var prev = _niveauPrecedent(entries, i);
        var pKey = (e.competence || '') + '|' + (e.epreuve || '');
        html += _renderEntry(e, prev, !!photoMap[pKey]);
      }
      ul.innerHTML = html;
    });
  }

  /**
   * renderCompact — Version résumée (5 dernières entrées)
   * @param {string} studentCode
   * @param {HTMLElement} container
   */
  function renderCompact(studentCode, container) {
    _injectStyle();
    var entries = _getEntries(studentCode);
    var MAX = 5;

    if (!entries.length) {
      container.innerHTML = '<div class="hist-empty">Aucune activité récente</div>';
      return;
    }

    var shown = entries.slice(0, MAX);
    var hasMore = entries.length > MAX;

    container.innerHTML = '<div class="hist-header">\u{1F552} Activité récente</div><ul class="hist-timeline" id="hist-compact-' + studentCode + '"></ul>' +
      (hasMore ? '<div class="hist-compact-more"><button data-hist-action="showAll" data-hist-student="' + studentCode + '">Voir tout (' + entries.length + ')</button></div>' : '');

    _checkPhotos(studentCode, shown, function (photoMap) {
      var ul = container.querySelector('#hist-compact-' + studentCode);
      if (!ul) return;
      var html = '';
      for (var i = 0; i < shown.length; i++) {
        var e = shown[i];
        var prev = _niveauPrecedent(entries, i);
        var pKey = (e.competence || '') + '|' + (e.epreuve || '');
        html += _renderEntry(e, prev, !!photoMap[pKey]);
      }
      ul.innerHTML = html;
    });
  }

  /**
   * getProgression — Retourne la progression formatif→certificatif
   * @param {string} studentCode
   * @param {string} ep — 'EP2' ou 'EP3'
   * @param {string} compCode — code de la compétence
   * @returns {{ avant: string, apres: string, dates: {formatif: string[], certificatif: string[]} }}
   */
  function getProgression(studentCode, ep, compCode) {
    var raw = (window.validations || {})[studentCode] || [];
    var formatifEntries = [];
    var certificatifEntries = [];

    raw.forEach(function (e) {
      if (e.competence !== compCode) return;
      if (e.epreuve !== ep && !(e.epreuve === 'EP3' && ep.startsWith('EP3'))) return;

      if (e.phase === 'formatif') {
        formatifEntries.push(e);
      } else if (e.phase === 'certificatif') {
        certificatifEntries.push(e);
      }
    });

    // Trier par date
    var sortFn = function (a, b) {
      return (a.timestamp || '') > (b.timestamp || '') ? 1 : -1;
    };
    formatifEntries.sort(sortFn);
    certificatifEntries.sort(sortFn);

    var avant = 'NE';
    var apres = 'NE';

    if (formatifEntries.length) {
      avant = formatifEntries[formatifEntries.length - 1].niveau || 'NE';
    }
    if (certificatifEntries.length) {
      apres = certificatifEntries[certificatifEntries.length - 1].niveau || 'NE';
    } else if (formatifEntries.length) {
      apres = avant;
    }

    return {
      avant: avant,
      apres: apres,
      dates: {
        formatif: formatifEntries.map(function (e) { return e.timestamp; }),
        certificatif: certificatifEntries.map(function (e) { return e.timestamp; })
      }
    };
  }

  // ── Délégation d'événements ──

  document.addEventListener('click', function (e) {
    // Expand/collapse observation dans une entrée
    var entry = e.target.closest('.hist-entry[data-hist-expand]');
    if (entry) {
      entry.classList.toggle('hist-expanded');
      return;
    }

    // Bouton "Voir tout"
    var btn = e.target.closest('[data-hist-action="showAll"]');
    if (btn) {
      var code = btn.dataset.histStudent;
      if (!code) return;
      var wrap = btn.closest('.hist-compact-more');
      var container = wrap ? wrap.parentElement : null;
      if (container) {
        renderTimeline(code, container);
      }
    }
  });

  // ── Exposition globale ──

  window.historiqueModule = {
    renderTimeline: renderTimeline,
    renderCompact: renderCompact,
    getProgression: getProgression
  };

})();
