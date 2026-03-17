/**
 * INERWEB — Carte de progression interactive v1.0
 * Grille élève × compétence avec évaluation rapide au clic.
 *
 * Dépendances : eval-projections.js, levels-registry.js, eval-engine.js
 */
(function(){
  'use strict';

  // État par conteneur
  var _states = {};

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  /**
   * Affiche la grille de progression dans le conteneur.
   * @param {string|HTMLElement} containerId
   * @param {string} classeId
   * @param {string} formation — CAP_IFCA, BAC_MFER, TNE
   * @param {Object} [options]
   */
  function render(containerId, classeId, formation, options){
    var container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if(!container) return;

    var cid = container.id || ('pg-' + Date.now());
    if(!container.id) container.id = cid;

    options = options || {};
    var state = {
      container: container,
      classeId: classeId,
      formation: formation,
      sortBy: options.sortBy || 'nom',
      sortOrder: options.sortOrder || 'asc',
      showEmpty: options.showEmpty !== false,
      clickToEval: options.clickToEval !== false,
      compactMode: options.compactMode || false
    };
    _states[cid] = state;

    _injectStyles();
    _renderGrid(state);
  }

  function _renderGrid(state){
    var container = state.container;
    var eleves = _getEleves(state.classeId);
    var comps = _getFormationCompetences(state.formation);

    if(!comps.length){
      container.innerHTML = '<p class="iw-pg-empty">Aucune comp\u00e9tence pour cette formation.</p>';
      return;
    }

    // Calculer les données
    var rows = [];
    eleves.forEach(function(el){
      var code = el.code || el.id || el.nom;
      var label = (el.nom || '') + ' ' + (el.prenom || el.initial || '');
      var niveaux = [];
      var totalEval = 0;
      var totalValid = 0;

      comps.forEach(function(c){
        var niv = 0;
        if(window.iwEvalProjections){
          niv = window.iwEvalProjections.getLastLevel(code, c.code);
        }
        niveaux.push(niv);
        if(niv >= 3) totalEval++;
        if(niv >= 5) totalValid++;
      });

      var pct = comps.length ? Math.round(totalValid / comps.length * 100) : 0;

      if(!state.showEmpty && totalEval === 0) return;

      rows.push({
        code: code,
        label: label.trim(),
        niveaux: niveaux,
        pct: pct,
        totalEval: totalEval,
        totalValid: totalValid
      });
    });

    // Tri
    _sortRows(rows, state.sortBy, state.sortOrder, comps);

    // HTML
    var html = '';

    // Légende
    html += '<div class="iw-pg-legend">';
    html += _legendBadge('#aaaaaa', 'NE');
    html += _legendBadge('#e74c3c', 'NA');
    html += _legendBadge('#f39c12', 'EC');
    html += _legendBadge('#27ae60', 'M');
    html += _legendBadge('#2196F3', 'PM');
    html += '<button class="iw-pg-btn-pdf" data-pgact="export-pdf" title="Exporter en PDF">\ud83d\udcc4 PDF</button>';
    html += '<span class="iw-pg-legend-hint">Cliquer sur une cellule pour \u00e9valuer</span>';
    html += '</div>';

    // Tableau
    html += '<div class="iw-pg-wrap"><table class="iw-pg-grid">';

    // En-tête
    html += '<thead><tr>';
    html += '<th class="iw-pg-th-eleve" data-pgact="sort" data-pgsort="nom">\u00c9l\u00e8ve' + _sortIcon(state, 'nom') + '</th>';
    comps.forEach(function(c){
      var title = c.nom || c.full || c.code;
      html += '<th class="iw-pg-th-comp" data-pgact="sort" data-pgsort="' + c.code + '" title="' + _esc(title) + '">' + c.code + _sortIcon(state, c.code) + '</th>';
    });
    html += '<th class="iw-pg-th-moy" data-pgact="sort" data-pgsort="moyenne">Prog.' + _sortIcon(state, 'moyenne') + '</th>';
    html += '</tr></thead>';

    // Corps
    html += '<tbody>';
    if(!rows.length){
      html += '<tr><td colspan="' + (comps.length + 2) + '" class="iw-pg-empty">Aucun \u00e9l\u00e8ve dans cette classe.</td></tr>';
    }
    rows.forEach(function(row){
      html += '<tr>';
      html += '<td class="iw-pg-eleve" title="' + _esc(row.code) + '">' + _esc(row.label) + '</td>';

      row.niveaux.forEach(function(niv, idx){
        var color = window.iwLevels ? window.iwLevels.color(niv) : '#aaa';
        var bg = window.iwLevels ? window.iwLevels.bgColor(niv) : '#f0f0f0';
        var label = window.iwLevels ? window.iwLevels.display(niv, 'short') : '\u2014';
        var textColor = _contrastText(color);

        if(niv === 0){
          // Non évalué — cellule cliquable vide
          html += '<td class="iw-pg-cell iw-pg-cell-empty" data-pgact="eval" data-pgeleve="' + _esc(row.code) + '" data-pgcomp="' + comps[idx].code + '" title="' + _esc(comps[idx].nom || comps[idx].code) + ' \u2014 Cliquer pour \u00e9valuer">\u2014</td>';
        } else {
          html += '<td class="iw-pg-cell" style="background:' + bg + ';color:' + color + '" data-pgact="eval" data-pgeleve="' + _esc(row.code) + '" data-pgcomp="' + comps[idx].code + '" title="' + _esc(comps[idx].nom || comps[idx].code) + ' \u2014 ' + label + '">' + label + '</td>';
        }
      });

      // Moyenne
      var pctBg = _pctColor(row.pct);
      html += '<td class="iw-pg-moyenne" style="background:' + pctBg + '">' + row.pct + '%</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    // Résumé
    if(rows.length){
      var avgPct = Math.round(rows.reduce(function(s, r){ return s + r.pct; }, 0) / rows.length);
      html += '<div class="iw-pg-summary">';
      html += '<span>' + rows.length + ' \u00e9l\u00e8ves</span>';
      html += '<span>Moyenne classe : <strong>' + avgPct + '%</strong></span>';
      html += '<span>' + comps.length + ' comp\u00e9tences</span>';
      html += '</div>';
    }

    container.innerHTML = html;
    _bindEvents(state);
  }

  // ═══════════════════════════════════════════════════════════
  // TRI
  // ═══════════════════════════════════════════════════════════

  function _sortRows(rows, sortBy, sortOrder, comps){
    var dir = sortOrder === 'desc' ? -1 : 1;

    rows.sort(function(a, b){
      if(sortBy === 'nom'){
        return dir * a.label.localeCompare(b.label);
      }
      if(sortBy === 'moyenne'){
        return dir * (a.pct - b.pct);
      }
      // Tri par compétence
      var idx = -1;
      for(var i = 0; i < comps.length; i++){
        if(comps[i].code === sortBy){ idx = i; break; }
      }
      if(idx >= 0){
        return dir * (a.niveaux[idx] - b.niveaux[idx]);
      }
      return 0;
    });
  }

  function _sortIcon(state, col){
    if(state.sortBy !== col) return '';
    return state.sortOrder === 'asc' ? ' \u25b2' : ' \u25bc';
  }

  // ═══════════════════════════════════════════════════════════
  // ÉVÉNEMENTS
  // ═══════════════════════════════════════════════════════════

  function _bindEvents(state){
    var container = state.container;

    container.addEventListener('click', function(e){
      var el = e.target.closest('[data-pgact]');
      if(!el) return;
      var action = el.dataset.pgact;

      if(action === 'sort'){
        var col = el.dataset.pgsort;
        if(state.sortBy === col){
          state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortBy = col;
          state.sortOrder = col === 'moyenne' ? 'desc' : 'asc';
        }
        _renderGrid(state);
      }

      if(action === 'export-pdf'){
        if(window.iwPdfExport){
          window.iwPdfExport.grilleProgression(state.classeId, state.formation);
        }
      }

      if(action === 'eval' && state.clickToEval){
        var eleveId = el.dataset.pgeleve;
        var compCode = el.dataset.pgcomp;
        if(eleveId && compCode){
          _showSelector(el, eleveId, compCode, state);
        }
      }

      if(action === 'level'){
        var lv = parseInt(el.dataset.pglevel);
        var eId = el.dataset.pgeleve;
        var cCode = el.dataset.pgcomp;
        _closeSelector();
        if(window.iwEval && window.iwEval.quick){
          window.iwEval.quick(eId, cCode, lv);
          // Rafraîchir la grille après un court délai
          setTimeout(function(){ _renderGrid(state); }, 100);
        }
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // SÉLECTEUR DE NIVEAU
  // ═══════════════════════════════════════════════════════════

  var _activeSelector = null;

  function _showSelector(cell, eleveId, compCode, state){
    _closeSelector();

    var sel = document.createElement('div');
    sel.className = 'iw-pg-selector';

    var levels = [
      {val: 3, label: 'NA', color: '#e74c3c'},
      {val: 4, label: 'EC', color: '#f39c12'},
      {val: 5, label: 'M',  color: '#27ae60'},
      {val: 6, label: 'PM', color: '#2196F3'}
    ];

    levels.forEach(function(lv){
      var btn = document.createElement('button');
      btn.className = 'iw-pg-sel-btn';
      btn.textContent = lv.label;
      btn.style.background = lv.color;
      btn.dataset.pgact = 'level';
      btn.dataset.pglevel = lv.val;
      btn.dataset.pgeleve = eleveId;
      btn.dataset.pgcomp = compCode;
      sel.appendChild(btn);
    });

    // Positionner
    var rect = cell.getBoundingClientRect();
    sel.style.position = 'fixed';
    sel.style.left = rect.left + 'px';
    sel.style.top = (rect.bottom + 4) + 'px';
    sel.style.zIndex = '10001';

    document.body.appendChild(sel);
    _activeSelector = sel;

    // Fermer au clic extérieur
    setTimeout(function(){
      document.addEventListener('click', _closeSelectorOutside, true);
    }, 50);
  }

  function _closeSelector(){
    if(_activeSelector && _activeSelector.parentNode){
      _activeSelector.parentNode.removeChild(_activeSelector);
    }
    _activeSelector = null;
    document.removeEventListener('click', _closeSelectorOutside, true);
  }

  function _closeSelectorOutside(e){
    if(_activeSelector && !_activeSelector.contains(e.target)){
      _closeSelector();
    }
  }

  // ═══════════════════════════════════════════════════════════
  // EXPORT CSV
  // ═══════════════════════════════════════════════════════════

  function exportCSV(classeId, formation){
    var eleves = _getEleves(classeId);
    var comps = _getFormationCompetences(formation);
    if(!comps.length) return;

    var headers = ['\u00c9l\u00e8ve'];
    comps.forEach(function(c){ headers.push(c.code); });
    headers.push('Progression');

    var rows = [];
    eleves.forEach(function(el){
      var code = el.code || el.id || el.nom;
      var label = (el.nom || '') + ' ' + (el.prenom || '');
      var row = [label.trim()];
      var totalValid = 0;

      comps.forEach(function(c){
        var niv = 0;
        if(window.iwEvalProjections){
          niv = window.iwEvalProjections.getLastLevel(code, c.code);
        }
        var lbl = window.iwLevels ? window.iwLevels.display(niv, 'short') : '\u2014';
        row.push(lbl);
        if(niv >= 5) totalValid++;
      });

      var pct = comps.length ? Math.round(totalValid / comps.length * 100) : 0;
      row.push(pct + '%');
      rows.push(row);
    });

    if(window.iwEvalExports && window.iwEvalExports.generateCSV){
      var csv = window.iwEvalExports.generateCSV(headers, rows);
      var filename = 'progression_' + (classeId || 'classe').replace(/\s/g, '_') + '_' + new Date().toISOString().substring(0, 10) + '.csv';
      window.iwEvalExports.downloadFile(csv, filename);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // REFRESH
  // ═══════════════════════════════════════════════════════════

  function refresh(containerId){
    var cid = typeof containerId === 'string' ? containerId : (containerId && containerId.id);
    var state = _states[cid];
    if(state) _renderGrid(state);
  }

  function setFilter(containerId, filter){
    var cid = typeof containerId === 'string' ? containerId : (containerId && containerId.id);
    var state = _states[cid];
    if(!state) return;
    if(filter.sortBy) state.sortBy = filter.sortBy;
    if(filter.sortOrder) state.sortOrder = filter.sortOrder;
    if(filter.classeId !== undefined) state.classeId = filter.classeId;
    if(filter.formation !== undefined) state.formation = filter.formation;
    _renderGrid(state);
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════

  function _getEleves(classeId){
    if(window.iwStudents && window.iwStudents.getByClasse && classeId){
      return window.iwStudents.getByClasse(classeId);
    }
    if(window.iwStudents && window.iwStudents.getAll){
      return window.iwStudents.getAll();
    }
    // Fallback sur appState
    if(window.appState && appState.eleves){
      return Object.keys(appState.eleves).map(function(k){
        var e = appState.eleves[k];
        return {code: k, nom: e.nom || k, prenom: e.prenom || ''};
      });
    }
    // Fallback sur students global
    if(window.students && Array.isArray(window.students)){
      return window.students;
    }
    return [];
  }

  function _getFormationCompetences(formation){
    // Depuis formations.json chargé
    if(window.CFG && window.CFG.formations){
      var f = window.CFG.formations.find(function(fm){ return fm.id === formation; });
      if(f && f.epreuves){
        var comps = [];
        var seen = {};
        f.epreuves.forEach(function(ep){
          (ep.competences || []).forEach(function(c){
            if(!seen[c.code]){
              seen[c.code] = true;
              comps.push({code: c.code, nom: c.nom || c.full || c.code});
            }
          });
        });
        return comps;
      }
    }

    // Fallback statique
    var FALLBACK = {
      CAP_IFCA: [
        {code:'C1.1',nom:'Docs'},{code:'C1.2',nom:'Communiquer'},
        {code:'C3.1',nom:'Organisation'},{code:'C3.2',nom:'R\u00e9seaux'},
        {code:'C3.3',nom:'Implanter'},{code:'C3.4',nom:'Fa\u00e7onner'},
        {code:'C3.5',nom:'Soudure'},{code:'C3.6',nom:'C\u00e2bler'},
        {code:'C3.7',nom:'Contr\u00f4les'},{code:'C3.8',nom:'D\u00e9chets'},
        {code:'C3.9',nom:'\u00c9tanch\u00e9it\u00e9'},
        {code:'C4.1',nom:'Vide'},{code:'C4.2',nom:'Fluide'},
        {code:'C4.3',nom:'\u00c9tanch.'},{code:'C4.4',nom:'Panne'},
        {code:'C4.5',nom:'Mesurer'},{code:'C4.6',nom:'R\u00e9gler'},
        {code:'C4.7',nom:'Raccorder'},{code:'C5.1',nom:'Remplacer'}
      ],
      BAC_MFER: [
        {code:'C3.1',nom:'Organiser'},{code:'C3.2',nom:'Implanter'},
        {code:'C3.3',nom:'Tubes'},{code:'C3.4',nom:'Fluides'},
        {code:'C3.5',nom:'\u00c9lec.'},{code:'C3.6',nom:'Isoler'},
        {code:'C3.8',nom:'D\u00e9chets'},
        {code:'C4.1',nom:'Vide'},{code:'C4.2',nom:'Charge'},
        {code:'C4.3',nom:'\u00c9tanch.'},{code:'C4.4',nom:'MES'},
        {code:'C4.5',nom:'Mesures'},
        {code:'C5.1',nom:'Diagnostic'},{code:'C5.2',nom:'Remplacer'},
        {code:'C5.3',nom:'Pr\u00e9ventif'},
        {code:'C6.1',nom:'\u00c9nergie'},{code:'C6.2',nom:'Am\u00e9liorer'},
        {code:'C6.3',nom:'Conseiller'},
        {code:'C1.1',nom:'Donn\u00e9es'},{code:'C1.2',nom:'Communiquer'},
        {code:'C1.3',nom:'Dossier'},{code:'C1.4',nom:'Oral'}
      ],
      TNE: [
        {code:'CT.1',nom:'M\u00e9tiers'},{code:'CT.2',nom:'S\u00e9curit\u00e9'},
        {code:'CT.3',nom:'Outillage'},{code:'CT.4',nom:'Mesures'},
        {code:'CT.5',nom:'Plans'},{code:'CT.6',nom:'\u00c9quipe'},
        {code:'CT.7',nom:'Gestes'},{code:'CT.8',nom:'Comportement'}
      ]
    };
    return FALLBACK[formation] || [];
  }

  function _esc(s){
    if(window.esc) return window.esc(s);
    var d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function _contrastText(hexColor){
    if(!hexColor || hexColor.length < 4) return '#333';
    var r, g, b;
    if(hexColor.length === 4){
      r = parseInt(hexColor[1]+hexColor[1], 16);
      g = parseInt(hexColor[2]+hexColor[2], 16);
      b = parseInt(hexColor[3]+hexColor[3], 16);
    } else {
      r = parseInt(hexColor.substr(1, 2), 16);
      g = parseInt(hexColor.substr(3, 2), 16);
      b = parseInt(hexColor.substr(5, 2), 16);
    }
    var luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#333' : '#fff';
  }

  function _pctColor(pct){
    if(pct >= 80) return '#d4f4e2';
    if(pct >= 50) return '#fff8e1';
    if(pct >= 20) return '#fde8e6';
    return '#f0f0f0';
  }

  function _legendBadge(color, label){
    return '<span class="iw-pg-legend-item"><span class="iw-pg-legend-dot" style="background:' + color + '"></span>' + label + '</span>';
  }

  // ═══════════════════════════════════════════════════════════
  // STYLES
  // ═══════════════════════════════════════════════════════════

  function _injectStyles(){
    if(document.getElementById('iw-pg-styles')) return;
    var s = document.createElement('style');
    s.id = 'iw-pg-styles';
    s.textContent = [
      '.iw-pg-wrap{overflow-x:auto;margin:8px 0}',
      '.iw-pg-grid{width:100%;border-collapse:collapse;font-size:.78rem;min-width:600px}',
      '.iw-pg-grid thead th{background:#1B3A63;color:#fff;padding:6px 4px;font-weight:700;font-size:.7rem;cursor:pointer;user-select:none;white-space:nowrap;position:sticky;top:0;z-index:2}',
      '.iw-pg-grid thead th:hover{background:#2d5a8c}',
      '.iw-pg-th-eleve{text-align:left;min-width:120px;position:sticky;left:0;z-index:3!important}',
      '.iw-pg-th-comp{text-align:center;min-width:44px}',
      '.iw-pg-th-moy{text-align:center;min-width:55px}',
      '.iw-pg-grid tbody td{border:1px solid #e8e8e8}',
      '.iw-pg-eleve{text-align:left!important;font-weight:600;background:#f8f9fa!important;padding:6px 8px!important;position:sticky;left:0;z-index:1;white-space:nowrap}',
      '.iw-pg-cell{text-align:center;padding:4px 2px;cursor:pointer;font-weight:700;font-size:.75rem;transition:all .1s;min-width:38px}',
      '.iw-pg-cell:hover{transform:scale(1.15);box-shadow:0 2px 8px rgba(0,0,0,.25);z-index:10;position:relative}',
      '.iw-pg-cell-empty{color:#ccc;cursor:pointer}',
      '.iw-pg-cell-empty:hover{background:#e8f0f8!important;color:#1B3A63}',
      '.iw-pg-moyenne{text-align:center;font-weight:700;font-size:.8rem;padding:4px 6px}',
      '.iw-pg-empty{color:#999;font-style:italic;text-align:center;padding:1.5rem}',
      '.iw-pg-legend{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:8px;font-size:.75rem}',
      '.iw-pg-legend-item{display:flex;align-items:center;gap:3px}',
      '.iw-pg-legend-dot{width:14px;height:14px;border-radius:4px;flex-shrink:0}',
      '.iw-pg-legend-hint{color:#999;font-style:italic;margin-left:auto}',
      '.iw-pg-summary{display:flex;gap:16px;justify-content:center;margin-top:8px;font-size:.78rem;color:#666}',
      '.iw-pg-selector{background:#fff;border:2px solid #1B3A63;border-radius:10px;padding:4px;display:flex;gap:3px;box-shadow:0 4px 16px rgba(0,0,0,.25)}',
      '.iw-pg-sel-btn{border:none;color:#fff;font-weight:800;font-size:.75rem;padding:6px 10px;border-radius:6px;cursor:pointer;min-width:36px;font-family:inherit;transition:transform .1s}',
      '.iw-pg-sel-btn:hover{transform:scale(1.1)}',
      '.iw-pg-btn-pdf{background:#e67e22;color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:.75rem;font-weight:700;cursor:pointer;margin-left:auto}',
      '.iw-pg-btn-pdf:hover{background:#d35400}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ═══════════════════════════════════════════════════════════
  // API PUBLIQUE
  // ═══════════════════════════════════════════════════════════

  window.iwProgressionGrid = {
    render: render,
    refresh: refresh,
    setFilter: setFilter,
    exportCSV: exportCSV
  };

  console.log('[progression-grid] Carte de progression interactive charg\u00e9e');
})();
