/**
 * INERWEB — Modale d'évaluation TP v1.0
 * Permet d'évaluer un élève sur un TP pour une formation donnée.
 *
 * Dépendances : tp-library.js, levels-registry.js, eval-engine.js
 */
(function(){
  'use strict';

  var _overlay = null;
  var _currentCard = null;
  var _currentEleveId = null;

  // ═══════════════════════════════════════════════════════════
  // OUVERTURE
  // ═══════════════════════════════════════════════════════════

  /**
   * Ouvre la modale d'évaluation pour un TP + formation.
   * @param {string} tpId
   * @param {string} formation
   * @param {string} [eleveId] — si omis, affiche un sélecteur
   */
  function open(tpId, formation, eleveId){
    if(!window.iwTpLibrary) return;

    var carte = window.iwTpLibrary.generateEvalCard(tpId, formation);
    if(!carte || !carte.competences || !carte.competences.length) return;

    _currentCard = carte;
    _currentEleveId = eleveId || null;

    _injectStyles();
    _renderOverlay(carte);
  }

  function _renderOverlay(carte){
    // Supprimer une éventuelle modale existante
    close();

    _overlay = document.createElement('div');
    _overlay.className = 'iw-tpeval-overlay';
    _overlay.addEventListener('click', function(e){
      if(e.target === _overlay) close();
    });

    var tp = window.iwTpLibrary.getById(carte.tpId);
    var tpTitle = tp ? tp.titre : carte.tpId;

    var formLabels = {
      CAP_IFCA: 'CAP IFCA', BAC_MFER: 'Bac Pro MFER', TNE: '2nde TNE'
    };
    var formLabel = formLabels[carte.formation] || carte.formation;

    var html = '<div class="iw-tpeval-modal">';
    html += '<div class="iw-tpeval-header">';
    html += '<h2>\ud83d\udcdd \u00c9valuation TP</h2>';
    html += '<button class="iw-tpeval-close" data-tpeval="close">\u2715</button>';
    html += '</div>';

    html += '<div class="iw-tpeval-info">';
    html += '<div class="iw-tpeval-tp-title">' + _esc(tpTitle) + '</div>';
    html += '<div class="iw-tpeval-formation">' + formLabel;
    if(carte.epreuve) html += ' \u2014 ' + carte.epreuve;
    html += '</div>';
    html += '</div>';

    // Sélecteur d'élève si pas pré-rempli
    if(!_currentEleveId){
      html += '<div class="iw-tpeval-eleve-row">';
      html += '<label>\u00c9l\u00e8ve :</label>';
      html += '<select id="iw-tpeval-eleve" class="iw-tpeval-select">';
      html += '<option value="">-- Choisir un \u00e9l\u00e8ve --</option>';
      var eleves = _getEleves();
      eleves.forEach(function(el){
        html += '<option value="' + _esc(el.code || el.id || el.nom) + '">' + _esc(el.nom || el.code) + '</option>';
      });
      html += '</select>';
      html += '</div>';
    } else {
      html += '<div class="iw-tpeval-eleve-row">';
      html += '<label>\u00c9l\u00e8ve : <strong>' + _esc(_currentEleveId) + '</strong></label>';
      html += '</div>';
    }

    // Grille de compétences
    html += '<div class="iw-tpeval-grid">';
    html += '<table class="iw-tpeval-table"><thead><tr>';
    html += '<th>Comp\u00e9tence</th><th>Niveau attendu</th><th>Niveau observ\u00e9</th>';
    html += '</tr></thead><tbody>';

    var scale = _getScale();

    carte.competences.forEach(function(c, idx){
      var attenduLabel = window.iwLevels ? window.iwLevels.display(c.niveauAttendu, 'long') : c.niveauAttendu;
      var attenduColor = window.iwLevels ? window.iwLevels.color(c.niveauAttendu) : '#999';

      html += '<tr>';
      html += '<td><strong>' + _esc(c.code) + '</strong>';
      if(c.libelle) html += '<br><span class="iw-tpeval-libelle">' + _esc(c.libelle) + '</span>';
      html += '</td>';
      html += '<td style="color:' + attenduColor + ';font-weight:700">' + attenduLabel + '</td>';
      html += '<td>';
      html += '<select class="iw-tpeval-level-select" data-idx="' + idx + '">';
      html += '<option value="">--</option>';
      scale.forEach(function(lv){
        html += '<option value="' + lv.value + '">' + lv.label + '</option>';
      });
      html += '</select>';
      html += '</td>';
      html += '</tr>';
    });

    html += '</tbody></table>';
    html += '</div>';

    // Commentaire
    html += '<div class="iw-tpeval-comment-row">';
    html += '<label>Commentaire (optionnel) :</label>';
    html += '<textarea id="iw-tpeval-comment" class="iw-tpeval-textarea" rows="2" placeholder="Observations..."></textarea>';
    html += '</div>';

    // Actions
    html += '<div class="iw-tpeval-actions">';
    html += '<button class="iw-tpeval-btn-cancel" data-tpeval="close">Annuler</button>';
    html += '<button class="iw-tpeval-btn-submit" data-tpeval="submit">\u2705 Enregistrer</button>';
    html += '</div>';

    html += '</div>';
    _overlay.innerHTML = html;
    document.body.appendChild(_overlay);

    // Bind
    _overlay.addEventListener('click', function(e){
      var el = e.target.closest('[data-tpeval]');
      if(!el) return;
      if(el.dataset.tpeval === 'close') close();
      else if(el.dataset.tpeval === 'submit') submit();
    });
  }

  // ═══════════════════════════════════════════════════════════
  // SOUMISSION
  // ═══════════════════════════════════════════════════════════

  function submit(){
    if(!_currentCard || !_overlay) return;

    // Récupérer l'élève
    var eleveId = _currentEleveId;
    if(!eleveId){
      var sel = document.getElementById('iw-tpeval-eleve');
      if(sel) eleveId = sel.value;
    }
    if(!eleveId){
      _showToast('Veuillez s\u00e9lectionner un \u00e9l\u00e8ve', 'err');
      return;
    }

    // Récupérer les niveaux
    var selects = _overlay.querySelectorAll('.iw-tpeval-level-select');
    var hasAtLeastOne = false;
    var niveaux = {};

    selects.forEach(function(s){
      var idx = parseInt(s.dataset.idx);
      var val = s.value;
      if(val !== ''){
        hasAtLeastOne = true;
        var comp = _currentCard.competences[idx];
        if(comp) niveaux[comp.code] = parseInt(val);
      }
    });

    if(!hasAtLeastOne){
      _showToast('Veuillez \u00e9valuer au moins une comp\u00e9tence', 'err');
      return;
    }

    var comment = '';
    var commentEl = document.getElementById('iw-tpeval-comment');
    if(commentEl) comment = commentEl.value.trim();

    // Construire la carte complétée
    var carteComplete = JSON.parse(JSON.stringify(_currentCard));
    carteComplete.competences.forEach(function(c){
      if(niveaux[c.code] !== undefined) c.niveau = niveaux[c.code];
    });

    // Soumettre via iwTpLibrary.submitEvalCard ou iwEval.grid
    if(window.iwTpLibrary && window.iwTpLibrary.submitEvalCard){
      window.iwTpLibrary.submitEvalCard(carteComplete, eleveId, {commentaire: comment});
      _showToast('\u2705 \u00c9valuation enregistr\u00e9e', 'ok');
    } else if(window.iwEval && window.iwEval.grid){
      window.iwEval.grid(eleveId, carteComplete.formation, carteComplete.epreuve, niveaux, {source: 'tp-eval', tpId: carteComplete.tpId, commentaire: comment});
      _showToast('\u2705 \u00c9valuation enregistr\u00e9e', 'ok');
    } else {
      _showToast('Moteur d\u2019\u00e9valuation non disponible', 'err');
      return;
    }

    close();
  }

  // ═══════════════════════════════════════════════════════════
  // FERMETURE
  // ═══════════════════════════════════════════════════════════

  function close(){
    if(_overlay && _overlay.parentNode){
      _overlay.parentNode.removeChild(_overlay);
    }
    _overlay = null;
    _currentCard = null;
    _currentEleveId = null;
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════

  function _getEleves(){
    // Utiliser iwStudents si disponible
    if(window.iwStudents && window.iwStudents.getAll){
      return window.iwStudents.getAll();
    }
    // Fallback sur appState
    if(window.appState && appState.eleves){
      return Object.keys(appState.eleves).map(function(k){
        return {code: k, nom: k};
      });
    }
    return [];
  }

  function _getScale(){
    if(window.iwLevels && window.iwLevels.getScale){
      return window.iwLevels.getScale();
    }
    // Fallback
    return [
      {value: 0, label: 'NE — Non \u00e9valu\u00e9'},
      {value: 3, label: 'NA — Non acquis'},
      {value: 4, label: 'EC — En cours'},
      {value: 5, label: 'M — Ma\u00eetris\u00e9'},
      {value: 6, label: 'PM — Parfaitement ma\u00eetris\u00e9'}
    ];
  }

  function _esc(s){
    if(window.esc) return window.esc(s);
    var d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function _showToast(msg, type){
    if(window.toast) return window.toast(msg, type);
    console.log('[tp-eval-modal] ' + msg);
  }

  // ═══════════════════════════════════════════════════════════
  // STYLES
  // ═══════════════════════════════════════════════════════════

  function _injectStyles(){
    if(document.getElementById('iw-tpeval-styles')) return;
    var s = document.createElement('style');
    s.id = 'iw-tpeval-styles';
    s.textContent = [
      '.iw-tpeval-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.55);z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem}',
      '.iw-tpeval-modal{background:#fff;border-radius:16px;max-width:620px;width:100%;max-height:90vh;overflow-y:auto;padding:24px;box-shadow:0 24px 60px rgba(0,0,0,.3)}',
      '.iw-tpeval-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}',
      '.iw-tpeval-header h2{margin:0;color:#1B3A63;font-size:1.2rem}',
      '.iw-tpeval-close{background:none;border:none;font-size:1.4rem;cursor:pointer;color:#999;padding:4px 8px}',
      '.iw-tpeval-close:hover{color:#333}',
      '.iw-tpeval-info{background:#f0f4f8;border-radius:10px;padding:12px;margin-bottom:16px}',
      '.iw-tpeval-tp-title{font-weight:800;color:#1B3A63;font-size:1rem}',
      '.iw-tpeval-formation{font-size:.85rem;color:#666;margin-top:2px}',
      '.iw-tpeval-eleve-row{margin-bottom:12px}',
      '.iw-tpeval-eleve-row label{font-size:.85rem;font-weight:700;color:#333}',
      '.iw-tpeval-select{width:100%;padding:8px;border:2px solid #ddd;border-radius:8px;font-size:.85rem;margin-top:4px}',
      '.iw-tpeval-grid{margin-bottom:12px}',
      '.iw-tpeval-table{width:100%;border-collapse:collapse;font-size:.82rem}',
      '.iw-tpeval-table th{background:#1B3A63;color:#fff;padding:8px 10px;text-align:left}',
      '.iw-tpeval-table td{padding:8px 10px;border-bottom:1px solid #eee;vertical-align:top}',
      '.iw-tpeval-libelle{font-size:.75rem;color:#888}',
      '.iw-tpeval-level-select{width:100%;padding:6px;border:2px solid #ddd;border-radius:6px;font-size:.82rem}',
      '.iw-tpeval-comment-row{margin-bottom:16px}',
      '.iw-tpeval-comment-row label{font-size:.85rem;font-weight:700;color:#333;display:block;margin-bottom:4px}',
      '.iw-tpeval-textarea{width:100%;padding:8px;border:2px solid #ddd;border-radius:8px;font-size:.85rem;resize:vertical;font-family:inherit}',
      '.iw-tpeval-actions{display:flex;justify-content:flex-end;gap:8px}',
      '.iw-tpeval-btn-cancel{padding:10px 20px;background:#f0f0f0;color:#666;border:none;border-radius:8px;font-size:.85rem;font-weight:700;cursor:pointer}',
      '.iw-tpeval-btn-cancel:hover{background:#e0e0e0}',
      '.iw-tpeval-btn-submit{padding:10px 24px;background:#27ae60;color:#fff;border:none;border-radius:8px;font-size:.85rem;font-weight:700;cursor:pointer}',
      '.iw-tpeval-btn-submit:hover{background:#219a52}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ═══════════════════════════════════════════════════════════
  // API PUBLIQUE
  // ═══════════════════════════════════════════════════════════

  window.iwTpEvalModal = {
    open: open,
    close: close,
    submit: submit
  };

  console.log('[tp-eval-modal] Modale d\u2019\u00e9valuation TP charg\u00e9e');
})();
