/**
 * INERWEB — Composants UI d'évaluation unifié v1.0
 * Widgets réutilisables : saisie rapide, grille, synthèse, historique.
 *
 * Dépendances : eval-engine.js, eval-projections.js, levels-registry.js
 */
(function(){
  'use strict';

  // ═══════════════════════════════════════════════════════════
  // A. SAISIE RAPIDE — widget "3 taps"
  // ═══════════════════════════════════════════════════════════

  /**
   * Génère le HTML pour les boutons de niveau (saisie rapide).
   * @param {Object} [opts] — mode ('edu'|'prog'), size ('sm'|'md'|'lg')
   * @returns {string} HTML
   */
  function renderLevelButtons(opts){
    opts = opts || {};
    var mode = opts.mode || 'edu';
    var size = opts.size || 'md';
    var levels = window.iwLevels.getEvaluable();
    var html = '<div class="iw-level-btns iw-level-' + size + '">';

    levels.forEach(function(lv){
      var label = mode === 'edu' ? (lv.edu || lv.short) : lv.short;
      html += '<button class="iw-level-btn ' + lv.cls + '" '
        + 'data-level="' + lv.internal + '" '
        + 'style="background:' + lv.bg + ';color:' + lv.color + ';border:2px solid ' + lv.color + '" '
        + 'title="' + lv.label + '">'
        + label
        + '</button>';
    });

    // Bouton NE
    html += '<button class="iw-level-btn lv-ne" data-level="0" '
      + 'style="background:#f0f0f0;color:#999;border:2px solid #ccc" '
      + 'title="Non \u00e9valu\u00e9">NE</button>';

    // Bouton ABS
    html += '<button class="iw-level-btn lv-abs" data-level="1" '
      + 'style="background:#fde8e6;color:#e74c3c;border:2px solid #e74c3c" '
      + 'title="Absent">ABS</button>';

    html += '</div>';
    return html;
  }

  /**
   * Génère un widget complet de saisie rapide.
   * @param {Object} opts — eleveId, compCode, seanceId, onEval(niveau)
   * @returns {string} HTML
   */
  function renderQuickEvalWidget(opts){
    opts = opts || {};
    var widgetId = 'qe-' + (opts.eleveId || '') + '-' + (opts.compCode || '');
    var currentLevel = 0;

    if(window.iwEvalProjections){
      currentLevel = window.iwEvalProjections.getLastLevel(opts.eleveId, opts.compCode);
    }

    var currentDisplay = window.iwLevels ? window.iwLevels.display(currentLevel, 'short') : '—';
    var currentColor = window.iwLevels ? window.iwLevels.color(currentLevel) : '#aaa';

    var html = '<div class="iw-quick-eval" id="' + widgetId + '">';
    html += '<div class="iw-qe-current" style="color:' + currentColor + '">'
      + '<span class="iw-qe-badge">' + currentDisplay + '</span>'
      + '</div>';
    html += renderLevelButtons({mode: opts.mode || 'edu', size: 'md'});
    html += '</div>';
    return html;
  }

  // ═══════════════════════════════════════════════════════════
  // B. GRILLE D'ÉVALUATION STRUCTURÉE
  // ═══════════════════════════════════════════════════════════

  /**
   * Génère une grille d'évaluation pour un élève et une épreuve.
   * @param {string} eleveId
   * @param {string} epreuve
   * @param {Array<Object>} competences — [{code, nom, obl, poids}]
   * @param {Object} [opts] — readOnly, showHistory
   * @returns {string} HTML
   */
  function renderEvalGrid(eleveId, epreuve, competences, opts){
    opts = opts || {};
    var html = '<table class="iw-eval-grid">';
    html += '<thead><tr>'
      + '<th>Comp\u00e9tence</th>'
      + '<th>Niveau</th>'
      + '<th>Commentaire</th>';
    if(!opts.readOnly) html += '<th>Action</th>';
    html += '</tr></thead><tbody>';

    competences.forEach(function(c){
      var lv = 0;
      var comment = '';
      if(window.iwEvalProjections){
        lv = window.iwEvalProjections.getLastLevel(eleveId, c.code, epreuve);
        comment = window.iwEvalProjections.getComment(eleveId, c.code);
      }

      var lvObj = window.iwLevels ? window.iwLevels.resolve(lv) : null;
      var bgColor = lvObj ? lvObj.bg : '#f0f0f0';
      var textColor = lvObj ? lvObj.color : '#999';
      var label = window.iwLevels ? window.iwLevels.display(lv, 'short') : '—';

      html += '<tr data-comp="' + c.code + '" style="background:' + bgColor + '">';
      html += '<td class="iw-grid-comp">';
      html += '<strong>' + (window.esc ? window.esc(c.code) : c.code) + '</strong> ';
      html += (window.esc ? window.esc(c.nom) : c.nom);
      if(c.obl) html += ' <span class="iw-obl">*</span>';
      html += '</td>';

      html += '<td class="iw-grid-level" style="color:' + textColor + '">';
      if(opts.readOnly){
        html += '<span class="iw-level-badge">' + label + '</span>';
      } else {
        html += renderLevelButtons({mode: 'prog', size: 'sm'});
      }
      html += '</td>';

      html += '<td class="iw-grid-comment">';
      if(opts.readOnly){
        html += '<span>' + (window.esc ? window.esc(comment) : comment) + '</span>';
      } else {
        html += '<input type="text" class="iw-comment-input" '
          + 'data-eleve="' + eleveId + '" data-comp="' + c.code + '" '
          + 'value="' + (comment || '').replace(/"/g, '&quot;') + '" '
          + 'placeholder="Observation...">';
      }
      html += '</td>';

      if(!opts.readOnly){
        html += '<td class="iw-grid-action">'
          + '<button class="iw-btn-sm iw-save-eval" '
          + 'data-eleve="' + eleveId + '" data-comp="' + c.code + '" '
          + 'data-epreuve="' + epreuve + '">'
          + '\u2714'
          + '</button></td>';
      }

      html += '</tr>';
    });

    html += '</tbody></table>';
    return html;
  }

  // ═══════════════════════════════════════════════════════════
  // C. SYNTHÈSE ÉLÈVE
  // ═══════════════════════════════════════════════════════════

  /**
   * Barre de progression d'un élève.
   * @param {string} eleveId
   * @param {Array<string>} competences — Codes compétences
   * @returns {string} HTML
   */
  function renderProgressBar(eleveId, competences){
    if(!window.iwEvalProjections) return '';
    var prog = window.iwEvalProjections.getProgression(eleveId, competences);
    var color = prog.pct >= 80 ? '#27ae60' : prog.pct >= 40 ? '#f39c12' : '#e74c3c';
    return '<div class="iw-progress">'
      + '<div class="iw-progress-bar" style="width:' + prog.pct + '%;background:' + color + '">'
      + prog.pct + '% (' + prog.evaluated + '/' + prog.total + ')'
      + '</div></div>';
  }

  /**
   * Tableau de synthèse des derniers niveaux.
   * @param {string} eleveId
   * @param {Array<Object>} competences — [{code, nom}]
   * @param {string} [epreuve]
   * @returns {string} HTML
   */
  function renderSummaryTable(eleveId, competences, epreuve){
    var html = '<table class="iw-summary-table"><thead><tr>'
      + '<th>Comp.</th><th>Niveau</th><th>Date</th><th>Source</th>'
      + '</tr></thead><tbody>';

    competences.forEach(function(c){
      var detail = window.iwEvalProjections ?
        window.iwEvalProjections.getLastLevelDetail(eleveId, c.code, epreuve) : null;
      var label = '—';
      var color = '#999';
      var date = '—';
      var source = '—';

      if(detail){
        label = window.iwLevels ? window.iwLevels.display(detail.niveau, 'short') : detail.niveau;
        color = window.iwLevels ? window.iwLevels.color(detail.niveau) : '#999';
        date = detail.timestamp ? detail.timestamp.substring(0, 10) : '—';
        source = detail.source || '—';
      }

      html += '<tr>';
      html += '<td><strong>' + c.code + '</strong> ' + c.nom + '</td>';
      html += '<td style="color:' + color + ';font-weight:bold">' + label + '</td>';
      html += '<td>' + date + '</td>';
      html += '<td>' + source + '</td>';
      html += '</tr>';
    });

    html += '</tbody></table>';
    return html;
  }

  // ═══════════════════════════════════════════════════════════
  // D. HISTORIQUE
  // ═══════════════════════════════════════════════════════════

  /**
   * Timeline d'historique pour une compétence.
   * @param {string} eleveId
   * @param {string} compCode
   * @returns {string} HTML
   */
  function renderHistoryTimeline(eleveId, compCode){
    if(!window.iwEvalProjections) return '<p>Projections non disponibles</p>';
    var history = window.iwEvalProjections.getHistory(eleveId, compCode);

    if(!history.length) return '<p class="iw-empty">Aucune \u00e9valuation enregistr\u00e9e</p>';

    var html = '<div class="iw-timeline">';
    history.forEach(function(entry){
      var label = window.iwLevels ? window.iwLevels.display(entry.niveau, 'long') : entry.niveau;
      var color = window.iwLevels ? window.iwLevels.color(entry.niveau) : '#999';
      var date = entry.timestamp ? entry.timestamp.substring(0, 16).replace('T', ' ') : '';

      html += '<div class="iw-timeline-entry">';
      html += '<div class="iw-tl-dot" style="background:' + color + '"></div>';
      html += '<div class="iw-tl-content">';
      html += '<div class="iw-tl-level" style="color:' + color + '">' + label + '</div>';
      html += '<div class="iw-tl-meta">' + date;
      if(entry.evaluateur) html += ' \u2014 ' + entry.evaluateur;
      if(entry.source) html += ' (' + entry.source + ')';
      html += '</div>';
      if(entry.commentaire) html += '<div class="iw-tl-comment">' + entry.commentaire + '</div>';
      html += '</div></div>';
    });
    html += '</div>';
    return html;
  }

  // ═══════════════════════════════════════════════════════════
  // E. STYLES CSS
  // ═══════════════════════════════════════════════════════════

  function injectStyles(){
    if(document.getElementById('iw-eval-styles')) return;
    var style = document.createElement('style');
    style.id = 'iw-eval-styles';
    style.textContent = [
      '.iw-level-btns{display:flex;gap:4px;flex-wrap:wrap}',
      '.iw-level-btn{border:none;border-radius:8px;cursor:pointer;font-weight:700;transition:transform .1s}',
      '.iw-level-btn:active{transform:scale(.92)}',
      '.iw-level-sm .iw-level-btn{padding:4px 8px;font-size:.75rem;min-width:32px}',
      '.iw-level-md .iw-level-btn{padding:8px 16px;font-size:.9rem;min-width:44px;min-height:44px}',
      '.iw-level-lg .iw-level-btn{padding:12px 24px;font-size:1.1rem;min-width:56px;min-height:56px}',
      '.iw-quick-eval{display:flex;align-items:center;gap:12px}',
      '.iw-qe-badge{font-size:1.2rem;font-weight:700;min-width:40px;text-align:center}',
      '.iw-eval-grid{width:100%;border-collapse:collapse;font-size:.85rem}',
      '.iw-eval-grid th{background:#1B3A63;color:#fff;padding:8px 12px;text-align:left}',
      '.iw-eval-grid td{padding:6px 10px;border-bottom:1px solid #e0e0e0}',
      '.iw-grid-comp{min-width:200px}',
      '.iw-obl{color:#e74c3c;font-weight:700}',
      '.iw-comment-input{width:100%;padding:4px 8px;border:1px solid #ddd;border-radius:4px;font-size:.8rem}',
      '.iw-btn-sm{padding:4px 8px;border:none;border-radius:4px;background:#27ae60;color:#fff;cursor:pointer}',
      '.iw-progress{background:#e0e0e0;border-radius:8px;overflow:hidden;height:24px}',
      '.iw-progress-bar{height:100%;color:#fff;font-size:.75rem;line-height:24px;text-align:center;font-weight:700;border-radius:8px;transition:width .3s}',
      '.iw-summary-table{width:100%;border-collapse:collapse;font-size:.85rem}',
      '.iw-summary-table th{background:#f8f9fa;padding:6px 10px;text-align:left;border-bottom:2px solid #ddd}',
      '.iw-summary-table td{padding:6px 10px;border-bottom:1px solid #eee}',
      '.iw-timeline{padding-left:20px;border-left:3px solid #e0e0e0}',
      '.iw-timeline-entry{position:relative;padding:8px 0 16px 20px}',
      '.iw-tl-dot{position:absolute;left:-11px;top:12px;width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 2px #e0e0e0}',
      '.iw-tl-level{font-weight:700;font-size:.95rem}',
      '.iw-tl-meta{font-size:.75rem;color:#888;margin-top:2px}',
      '.iw-tl-comment{font-size:.82rem;color:#555;margin-top:4px;font-style:italic}',
      '.iw-empty{color:#999;font-style:italic;padding:12px}',
      '.iw-level-badge{display:inline-block;padding:2px 8px;border-radius:4px;font-weight:700;font-size:.8rem}'
    ].join('\n');
    document.head.appendChild(style);
  }

  // Injection automatique des styles
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', injectStyles);
  } else {
    injectStyles();
  }

  // ═══════════════════════════════════════════════════════════
  // API PUBLIQUE
  // ═══════════════════════════════════════════════════════════

  window.iwEvalUI = {
    renderLevelButtons: renderLevelButtons,
    renderQuickEvalWidget: renderQuickEvalWidget,
    renderEvalGrid: renderEvalGrid,
    renderProgressBar: renderProgressBar,
    renderSummaryTable: renderSummaryTable,
    renderHistoryTimeline: renderHistoryTimeline,
    injectStyles: injectStyles
  };

  console.log('[eval-ui] Composants UI d\'\u00e9valuation charg\u00e9s');
})();
