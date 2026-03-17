/**
 * INERWEB — Interface d'exploration de la bibliothèque TP v1.0
 * Page ou composant pour lister, filtrer, consulter les TP.
 *
 * Dépendances : tp-library.js, levels-registry.js
 */
(function(){
  'use strict';

  var _container = null;
  var _filters = { theme: '', type: '', formation: '', dureeMax: 0, difficulte: 0, query: '' };

  // ═══════════════════════════════════════════════════════════
  // RENDU PRINCIPAL
  // ═══════════════════════════════════════════════════════════

  /**
   * Injecte l'explorateur TP dans un conteneur.
   * @param {string|HTMLElement} target — ID ou élément
   */
  function mount(target){
    _container = typeof target === 'string' ? document.getElementById(target) : target;
    if(!_container) return;

    _injectStyles();

    if(window.iwTpLibrary && window.iwTpLibrary.isReady()){
      _render();
    } else if(window.iwTpLibrary){
      window.iwTpLibrary.onReady(function(){ _render(); });
    } else {
      _container.innerHTML = '<p class="iw-tp-empty">Biblioth\u00e8que TP non charg\u00e9e.</p>';
    }
  }

  function _render(){
    var tps = window.iwTpLibrary.search(_filters);
    var themes = window.iwTpLibrary.getThemes();
    var types = window.iwTpLibrary.getTypes();

    var html = '<div class="iw-tp-explorer">';

    // Barre de filtres
    html += '<div class="iw-tp-filters">';
    html += '<input type="text" class="iw-tp-search" placeholder="Rechercher un TP..." '
      + 'value="' + (_filters.query || '') + '" data-tpact="search">';

    html += '<select data-tpact="filter-theme"><option value="">Tous les th\u00e8mes</option>';
    themes.forEach(function(t){
      html += '<option value="' + t + '"' + (_filters.theme === t ? ' selected' : '') + '>' + _themeLabel(t) + '</option>';
    });
    html += '</select>';

    html += '<select data-tpact="filter-type"><option value="">Tous les types</option>';
    types.forEach(function(t){
      html += '<option value="' + t + '"' + (_filters.type === t ? ' selected' : '') + '>' + _typeLabel(t) + '</option>';
    });
    html += '</select>';

    html += '<select data-tpact="filter-formation"><option value="">Toutes les formations</option>';
    ['CAP_IFCA', 'BAC_MFER', 'TNE'].forEach(function(f){
      html += '<option value="' + f + '"' + (_filters.formation === f ? ' selected' : '') + '>' + _formationLabel(f) + '</option>';
    });
    html += '</select>';

    html += '<select data-tpact="filter-duree"><option value="0">Toutes dur\u00e9es</option>';
    [60, 120, 180, 240].forEach(function(d){
      html += '<option value="' + d + '"' + (_filters.dureeMax === d ? ' selected' : '') + '>\u2264 ' + _formatDuree(d) + '</option>';
    });
    html += '</select>';

    html += '</div>';

    // Compteur
    html += '<div class="iw-tp-count">' + tps.length + ' TP trouv\u00e9' + (tps.length > 1 ? 's' : '') + '</div>';

    // Liste des TP
    html += '<div class="iw-tp-list">';
    if(!tps.length){
      html += '<p class="iw-tp-empty">Aucun TP ne correspond aux filtres.</p>';
    }
    tps.forEach(function(tp){
      var formations = window.iwTpLibrary.getFormationsForTp(tp.id);
      html += _renderCard(tp, formations);
    });
    html += '</div>';

    html += '</div>';
    _container.innerHTML = html;

    // Événements
    _bindEvents();
  }

  function _renderCard(tp, formations){
    var diffStars = '';
    for(var i = 0; i < 3; i++){
      diffStars += i < (tp.difficulte || 0) ? '\u2605' : '\u2606';
    }

    var formBadges = formations.map(function(f){
      return '<span class="iw-tp-badge iw-tp-badge-' + f.toLowerCase() + '">' + _formationShort(f) + '</span>';
    }).join('');

    var scopeIcon = tp.scope === 'common' ? '\ud83c\udf10' : '\ud83d\udd12';

    return '<div class="iw-tp-card" data-tpact="open" data-tpid="' + tp.id + '">'
      + '<div class="iw-tp-card-header">'
      + '<span class="iw-tp-id">' + tp.id + '</span>'
      + '<span class="iw-tp-scope" title="' + (tp.scope === 'common' ? 'Commun' : 'Priv\u00e9') + '">' + scopeIcon + '</span>'
      + '</div>'
      + '<h3 class="iw-tp-title">' + _esc(tp.titre) + '</h3>'
      + (tp.sousTitre ? '<p class="iw-tp-subtitle">' + _esc(tp.sousTitre) + '</p>' : '')
      + '<div class="iw-tp-meta">'
      + '<span class="iw-tp-duree">\u23f1 ' + _formatDuree(tp.duree) + '</span>'
      + '<span class="iw-tp-diff">' + diffStars + '</span>'
      + '<span class="iw-tp-type">' + _typeLabel(tp.type) + '</span>'
      + '</div>'
      + '<div class="iw-tp-formations">' + formBadges + '</div>'
      + '<div class="iw-tp-card-actions">'
      + '<button data-tpact="pdf-tp" data-tpid="' + tp.id + '" title="PDF">\ud83d\udcc4</button>'
      + '<button data-tpact="edit-tp" data-tpid="' + tp.id + '" title="Modifier">\u270f\ufe0f</button>'
      + '<button data-tpact="duplicate-tp" data-tpid="' + tp.id + '" title="Dupliquer">\ud83d\udccb</button>'
      + (tp.scope === 'private' ? '<button data-tpact="delete-tp" data-tpid="' + tp.id + '" title="Supprimer">\ud83d\uddd1\ufe0f</button>' : '')
      + '</div>'
      + '</div>';
  }

  // ═══════════════════════════════════════════════════════════
  // FICHE DÉTAILLÉE
  // ═══════════════════════════════════════════════════════════

  function _showDetail(tpId){
    var tp = window.iwTpLibrary.getById(tpId);
    if(!tp) return;
    var mappings = window.iwTpLibrary.getMappings(tpId);

    var html = '<div class="iw-tp-detail">';
    html += '<button class="iw-tp-back" data-tpact="back">\u2190 Retour</button>';

    html += '<div class="iw-tp-detail-header">';
    html += '<h2>' + _esc(tp.titre) + '</h2>';
    if(tp.sousTitre) html += '<p class="iw-tp-subtitle">' + _esc(tp.sousTitre) + '</p>';
    html += '<div class="iw-tp-meta">'
      + '<span>' + tp.id + '</span>'
      + '<span>\u23f1 ' + _formatDuree(tp.duree) + '</span>'
      + '<span>' + _typeLabel(tp.type) + '</span>'
      + '<span>v' + (tp.version || '1.0') + '</span>'
      + '<span>' + (tp.scope === 'common' ? '\ud83c\udf10 Commun' : '\ud83d\udd12 Priv\u00e9') + '</span>'
      + '</div>';
    html += '</div>';

    // Description
    html += '<div class="iw-tp-section"><h3>Description</h3><p>' + _esc(tp.description) + '</p></div>';

    // Opérations
    if(tp.operations && tp.operations.length){
      html += '<div class="iw-tp-section"><h3>Op\u00e9rations</h3><ol>';
      tp.operations.forEach(function(op){ html += '<li>' + _esc(op) + '</li>'; });
      html += '</ol></div>';
    }

    // Matériel
    if(tp.materiel && tp.materiel.length){
      html += '<div class="iw-tp-section"><h3>Mat\u00e9riel</h3><ul>';
      tp.materiel.forEach(function(m){ html += '<li>' + _esc(m) + '</li>'; });
      html += '</ul></div>';
    }

    // Variantes
    if(tp.variantes && tp.variantes.length){
      html += '<div class="iw-tp-section"><h3>Variantes</h3><ul>';
      tp.variantes.forEach(function(v){ html += '<li>' + _esc(v) + '</li>'; });
      html += '</ul></div>';
    }

    // Remarques pédagogiques
    if(tp.remarquesPedago){
      html += '<div class="iw-tp-section iw-tp-pedago"><h3>Remarques p\u00e9dagogiques</h3><p>' + _esc(tp.remarquesPedago) + '</p></div>';
    }

    // Correspondances référentielles
    html += '<div class="iw-tp-section"><h3>Correspondances r\u00e9f\u00e9rentielles</h3>';
    if(!mappings.length){
      html += '<p class="iw-tp-empty">Aucune correspondance d\u00e9finie.</p>';
    }
    mappings.forEach(function(m){
      html += '<div class="iw-tp-mapping">';
      html += '<h4>' + _formationLabel(m.formation) + (m.epreuve ? ' \u2014 ' + m.epreuve : '') + '</h4>';
      html += '<p>Dur\u00e9e adapt\u00e9e : ' + _formatDuree(m.dureeAdaptee || tp.duree) + '</p>';
      if(m.sequencesSuggerees && m.sequencesSuggerees.length){
        html += '<p>S\u00e9quences : ' + m.sequencesSuggerees.join(', ') + '</p>';
      }
      if(m.remarques) html += '<p class="iw-tp-remarque">' + _esc(m.remarques) + '</p>';

      // Compétences
      html += '<table class="iw-tp-comp-table"><thead><tr>'
        + '<th>Comp.</th><th>Niveau attendu</th><th>Contexte</th><th>Crit\u00e8res</th>'
        + '</tr></thead><tbody>';
      (m.competences || []).forEach(function(c){
        var lvLabel = window.iwLevels ? window.iwLevels.display(c.niveauAttendu, 'long') : c.niveauAttendu;
        var lvColor = window.iwLevels ? window.iwLevels.color(c.niveauAttendu) : '#999';
        html += '<tr>'
          + '<td><strong>' + c.code + '</strong></td>'
          + '<td style="color:' + lvColor + ';font-weight:700">' + lvLabel + '</td>'
          + '<td>' + (c.contexte || '\u2014') + '</td>'
          + '<td>' + (c.criteres || []).join(', ') + '</td>'
          + '</tr>';
      });
      html += '</tbody></table>';
      // Bouton Évaluer
      html += '<button class="iw-tp-btn-eval" data-tpact="eval" data-tpid="' + tpId + '" data-formation="' + m.formation + '">'
        + '\ud83d\udcdd \u00c9valuer (' + _formationShort(m.formation) + ')</button>';

      html += '</div>';
    });
    html += '</div>';

    // Tags
    if(tp.tags && tp.tags.length){
      html += '<div class="iw-tp-tags">';
      tp.tags.forEach(function(t){ html += '<span class="iw-tp-tag">' + _esc(t) + '</span>'; });
      html += '</div>';
    }

    html += '</div>';
    _container.innerHTML = html;
    _bindEvents();
  }

  // ═══════════════════════════════════════════════════════════
  // ÉVÉNEMENTS
  // ═══════════════════════════════════════════════════════════

  function _bindEvents(){
    if(!_container) return;

    _container.addEventListener('click', function(e){
      var el = e.target.closest('[data-tpact]');
      if(!el) return;
      var action = el.dataset.tpact;

      if(action === 'open'){
        _showDetail(el.dataset.tpid);
      } else if(action === 'back'){
        _render();
      } else if(action === 'eval'){
        if(window.iwTpEvalModal){
          window.iwTpEvalModal.open(el.dataset.tpid, el.dataset.formation);
        }
      } else if(action === 'pdf-tp'){
        var tpPdf = window.iwTpLibrary ? window.iwTpLibrary.getById(el.dataset.tpid) : null;
        if(tpPdf && window.iwPdfExport) window.iwPdfExport.ficheTp(tpPdf);
      } else if(action === 'edit-tp'){
        var tpEdit = window.iwTpLibrary ? window.iwTpLibrary.getById(el.dataset.tpid) : null;
        if(tpEdit && window.iwTpForm) window.iwTpForm.edit(tpEdit, { onSave: function(){ _render(); } });
      } else if(action === 'duplicate-tp'){
        var tpDup = window.iwTpLibrary ? window.iwTpLibrary.getById(el.dataset.tpid) : null;
        if(tpDup && window.iwTpForm) window.iwTpForm.duplicate(tpDup, { onSave: function(){ _render(); } });
      } else if(action === 'delete-tp'){
        if(confirm('Supprimer ce TP ?')){
          if(window.iwTpLibrary){
            window.iwTpLibrary.deleteTp(el.dataset.tpid);
            window.iwTpLibrary.saveLocal();
          }
          _render();
        }
      }
    });

    _container.addEventListener('input', function(e){
      var el = e.target;
      if(el.dataset.tpact === 'search'){
        _filters.query = el.value;
        _renderDebounced();
      }
    });

    _container.addEventListener('change', function(e){
      var el = e.target;
      if(el.dataset.tpact === 'filter-theme') _filters.theme = el.value;
      else if(el.dataset.tpact === 'filter-type') _filters.type = el.value;
      else if(el.dataset.tpact === 'filter-formation') _filters.formation = el.value;
      else if(el.dataset.tpact === 'filter-duree') _filters.dureeMax = parseInt(el.value) || 0;
      else return;
      _render();
    });
  }

  var _debounceTimer = null;
  function _renderDebounced(){
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(_render, 250);
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════

  function _esc(s){
    if(window.esc) return window.esc(s);
    var d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function _formatDuree(min){
    if(!min) return '\u2014';
    var h = Math.floor(min / 60);
    var m = min % 60;
    if(h && m) return h + 'h' + (m < 10 ? '0' : '') + m;
    if(h) return h + 'h';
    return m + ' min';
  }

  var _themeLabels = {
    'brasage': '\ud83d\udd25 Brasage', 'mise-en-service': '\u2699\ufe0f Mise en service',
    'electricite': '\u26a1 \u00c9lectricit\u00e9', 'controle': '\ud83d\udd0d Contr\u00f4le',
    'mesures': '\ud83d\udcca Mesures', 'diagnostic': '\ud83e\ude7a Diagnostic',
    'securite': '\ud83d\udee1\ufe0f S\u00e9curit\u00e9', 'technologie': '\ud83d\udcda Technologie',
    'maintenance': '\ud83d\udd27 Maintenance', 'autre': '\ud83d\udccc Autre'
  };

  function _themeLabel(t){ return _themeLabels[t] || t; }

  var _typeLabels = {
    'atelier': '\ud83d\udd27 Atelier', 'technologie': '\ud83d\udcda Technologie',
    'securite': '\ud83d\udee1\ufe0f S\u00e9curit\u00e9', 'mesures': '\ud83d\udcca Mesures',
    'remediation': '\ud83c\udfaf Rem\u00e9diation', 'pfmp': '\ud83c\udfed PFMP',
    'electro': '\u26a1 \u00c9lectro', 'autre': '\ud83d\udccc Autre'
  };

  function _typeLabel(t){ return _typeLabels[t] || t; }

  var _formationLabelsMap = {
    'CAP_IFCA': 'CAP IFCA', 'BAC_MFER': 'Bac Pro MFER', 'TNE': '2nde TNE',
    'CFA_ETAM': 'CFA \u00c9TAM', 'CFA_MPI': 'CFA MPI', 'TP_SUP_CVC': 'TP Sup CVC'
  };
  function _formationLabel(f){ return _formationLabelsMap[f] || f; }
  function _formationShort(f){
    return {CAP_IFCA:'CAP', BAC_MFER:'BAC', TNE:'TNE', CFA_ETAM:'CFA\u00c9', CFA_MPI:'MPI', TP_SUP_CVC:'TP'}[f] || f;
  }

  // ═══════════════════════════════════════════════════════════
  // STYLES
  // ═══════════════════════════════════════════════════════════

  function _injectStyles(){
    if(document.getElementById('iw-tp-styles')) return;
    var s = document.createElement('style');
    s.id = 'iw-tp-styles';
    s.textContent = [
      '.iw-tp-explorer{max-width:1100px;margin:0 auto;padding:1rem}',
      '.iw-tp-filters{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:1rem}',
      '.iw-tp-search{flex:1;min-width:200px;padding:8px 12px;border:2px solid #ddd;border-radius:8px;font-size:.9rem}',
      '.iw-tp-filters select{padding:8px;border:2px solid #ddd;border-radius:8px;font-size:.85rem;background:#fff}',
      '.iw-tp-count{font-size:.85rem;color:#666;margin-bottom:.5rem}',
      '.iw-tp-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}',
      '.iw-tp-card{background:#fff;border:2px solid #e0e0e0;border-radius:12px;padding:16px;cursor:pointer;transition:all .15s}',
      '.iw-tp-card:hover{border-color:#1B3A63;box-shadow:0 4px 12px rgba(27,58,99,.15)}',
      '.iw-tp-card-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}',
      '.iw-tp-id{font-size:.75rem;color:#999;font-weight:600}',
      '.iw-tp-scope{font-size:.9rem}',
      '.iw-tp-title{font-size:1rem;color:#1B3A63;margin:0 0 4px}',
      '.iw-tp-subtitle{font-size:.82rem;color:#666;margin:0 0 8px}',
      '.iw-tp-meta{display:flex;gap:12px;font-size:.78rem;color:#888;flex-wrap:wrap}',
      '.iw-tp-formations{margin-top:8px;display:flex;gap:4px;flex-wrap:wrap}',
      '.iw-tp-badge{padding:2px 8px;border-radius:10px;font-size:.7rem;font-weight:700;color:#fff}',
      '.iw-tp-badge-cap_ifca{background:#2d5a8c}',
      '.iw-tp-badge-bac_mfer{background:#8e44ad}',
      '.iw-tp-badge-tne{background:#e67e22}',
      '.iw-tp-badge-cfa_etam{background:#1abc9c}',
      '.iw-tp-badge-cfa_mpi{background:#3498db}',
      '.iw-tp-badge-tp_sup_cvc{background:#555}',
      '.iw-tp-detail{background:#fff;border-radius:12px;padding:24px}',
      '.iw-tp-back{background:none;border:none;color:#1B3A63;font-size:.9rem;cursor:pointer;padding:8px 0;font-weight:600}',
      '.iw-tp-detail-header{border-bottom:2px solid #1B3A63;padding-bottom:12px;margin-bottom:16px}',
      '.iw-tp-detail-header h2{color:#1B3A63;margin:0 0 4px}',
      '.iw-tp-section{margin-bottom:20px}',
      '.iw-tp-section h3{color:#1B3A63;font-size:.95rem;margin:0 0 8px;border-bottom:1px solid #eee;padding-bottom:4px}',
      '.iw-tp-section p{margin:4px 0;font-size:.88rem;line-height:1.5}',
      '.iw-tp-section ol,.iw-tp-section ul{margin:4px 0 4px 20px;font-size:.85rem}',
      '.iw-tp-section li{margin:3px 0}',
      '.iw-tp-pedago{background:#fff8e1;border-radius:8px;padding:12px}',
      '.iw-tp-mapping{background:#f8f9fa;border-radius:8px;padding:12px;margin:8px 0}',
      '.iw-tp-mapping h4{margin:0 0 6px;color:#1B3A63}',
      '.iw-tp-remarque{font-style:italic;color:#666}',
      '.iw-tp-comp-table{width:100%;border-collapse:collapse;font-size:.82rem;margin-top:8px}',
      '.iw-tp-comp-table th{background:#1B3A63;color:#fff;padding:6px 10px;text-align:left}',
      '.iw-tp-comp-table td{padding:6px 10px;border-bottom:1px solid #eee}',
      '.iw-tp-tags{display:flex;gap:4px;flex-wrap:wrap;margin-top:12px}',
      '.iw-tp-tag{background:#e8f0f8;color:#1B3A63;padding:3px 10px;border-radius:12px;font-size:.75rem}',
      '.iw-tp-btn-eval{display:inline-block;margin-top:10px;padding:8px 16px;background:#27ae60;color:#fff;border:none;border-radius:8px;font-size:.85rem;font-weight:700;cursor:pointer;transition:all .15s}',
      '.iw-tp-btn-eval:hover{background:#219a52;transform:translateY(-1px)}',
      '.iw-tp-card-actions{display:flex;gap:4px;margin-top:8px;justify-content:flex-end}',
      '.iw-tp-card-actions button{background:none;border:1px solid #ddd;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:.85rem;transition:all .15s}',
      '.iw-tp-card-actions button:hover{background:#f0f0f0;border-color:#999}',
      '.iw-tp-empty{color:#999;font-style:italic;text-align:center;padding:2rem}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ═══════════════════════════════════════════════════════════
  // API PUBLIQUE
  // ═══════════════════════════════════════════════════════════

  window.iwTpExplorer = {
    mount: mount,
    refresh: function(){ if(_container) _render(); },
    setFilters: function(f){ Object.assign(_filters, f); if(_container) _render(); },
    getFilters: function(){ return Object.assign({}, _filters); }
  };

  console.log('[tp-explorer-ui] Interface d\'exploration TP charg\u00e9e');
})();
