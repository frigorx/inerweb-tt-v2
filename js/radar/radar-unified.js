/**
 * INERWEB — Radar unifié de compétences v1.0
 * Visualisation SVG avec 3 couches : formatif, PFMP, CCF.
 *
 * Dépendances : eval-projections.js, levels-registry.js
 */
(function(){
  'use strict';

  var COL_FORMATIF = '#3498db';
  var COL_PFMP     = '#27ae60';
  var COL_CCF      = '#e67e22';
  var MAX_LEVEL    = 6; // PM = niveau max affiché

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  /**
   * Affiche un radar SVG 3 couches dans le conteneur.
   * @param {string|HTMLElement} containerId
   * @param {string} eleveId
   * @param {string} formation — CAP_IFCA, BAC_MFER, TNE
   * @param {Object} [options]
   */
  function render(containerId, eleveId, formation, options){
    var container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if(!container) return;

    options = options || {};
    var size = options.size || 400;
    var showLegend = options.showLegend !== false;
    var showLabels = options.showLabels !== false;

    // Récupérer les compétences de la formation
    var comps = _getFormationCompetences(formation);
    if(!comps || !comps.length){
      container.innerHTML = '<p style="color:#999;text-align:center;padding:1rem">Aucune comp\u00e9tence pour cette formation.</p>';
      return;
    }

    // Récupérer les données 3 couches
    var data = _getTripleLayerData(eleveId, comps);

    // Générer le SVG
    var svgWidth = size;
    var svgHeight = size + (showLegend ? 60 : 0);
    var cx = size / 2;
    var cy = size / 2;
    var radius = size / 2 - 60;

    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + svgWidth + '" height="' + svgHeight + '" viewBox="0 0 ' + svgWidth + ' ' + svgHeight + '" style="font-family:Nunito,sans-serif">';

    // Fond
    svg += '<rect width="' + svgWidth + '" height="' + svgHeight + '" fill="#fff" rx="12"/>';

    var n = comps.length;
    var angleStep = (2 * Math.PI) / n;

    // Grille concentrique (niveaux 2, 4, 6)
    [2, 4, 6].forEach(function(lv){
      var r = (lv / MAX_LEVEL) * radius;
      svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#e0e0e0" stroke-width="1" stroke-dasharray="4,4"/>';
      // Label niveau
      svg += '<text x="' + (cx + 4) + '" y="' + (cy - r + 12) + '" font-size="9" fill="#bbb">' + lv + '</text>';
    });

    // Axes
    for(var i = 0; i < n; i++){
      var angle = -Math.PI / 2 + i * angleStep;
      var x2 = cx + radius * Math.cos(angle);
      var y2 = cy + radius * Math.sin(angle);
      svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#e0e0e0" stroke-width="1"/>';
    }

    // 3 polygones
    svg += _renderPolygon(data.formatif, n, cx, cy, radius, angleStep, COL_FORMATIF, 0.3);
    svg += _renderPolygon(data.pfmp, n, cx, cy, radius, angleStep, COL_PFMP, 0.35);
    svg += _renderPolygon(data.ccf, n, cx, cy, radius, angleStep, COL_CCF, 0.4);

    // Points et labels des compétences
    for(var j = 0; j < n; j++){
      var a = -Math.PI / 2 + j * angleStep;
      var lx = cx + (radius + 30) * Math.cos(a);
      var ly = cy + (radius + 30) * Math.sin(a);

      // Ajuster l'alignement du texte
      var anchor = 'middle';
      if(Math.cos(a) < -0.1) anchor = 'end';
      else if(Math.cos(a) > 0.1) anchor = 'start';

      if(showLabels){
        svg += '<text x="' + lx + '" y="' + ly + '" font-size="10" fill="#333" font-weight="700" text-anchor="' + anchor + '" dominant-baseline="central">' + comps[j].code + '</text>';
      }

      // Points sur les polygones
      svg += _renderDot(data.formatif[j], j, cx, cy, radius, angleStep, COL_FORMATIF);
      svg += _renderDot(data.pfmp[j], j, cx, cy, radius, angleStep, COL_PFMP);
      svg += _renderDot(data.ccf[j], j, cx, cy, radius, angleStep, COL_CCF);
    }

    // Légende
    if(showLegend){
      var ly2 = size + 15;
      svg += _legendItem(cx - 140, ly2, COL_FORMATIF, 'Formatif');
      svg += _legendItem(cx - 30, ly2, COL_PFMP, 'PFMP');
      svg += _legendItem(cx + 80, ly2, COL_CCF, 'CCF');
    }

    svg += '</svg>';
    container.innerHTML = svg;
  }

  function _renderPolygon(values, n, cx, cy, radius, angleStep, color, opacity){
    var points = [];
    for(var i = 0; i < n; i++){
      var a = -Math.PI / 2 + i * angleStep;
      var r = (values[i] / MAX_LEVEL) * radius;
      points.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1));
    }
    return '<polygon points="' + points.join(' ') + '" fill="' + color + '" fill-opacity="' + opacity + '" stroke="' + color + '" stroke-width="2" stroke-opacity="0.8"/>';
  }

  function _renderDot(value, idx, cx, cy, radius, angleStep, color){
    if(!value) return '';
    var a = -Math.PI / 2 + idx * angleStep;
    var r = (value / MAX_LEVEL) * radius;
    var x = cx + r * Math.cos(a);
    var y = cy + r * Math.sin(a);
    return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="4" fill="' + color + '" stroke="#fff" stroke-width="1.5"/>';
  }

  function _legendItem(x, y, color, label){
    return '<rect x="' + x + '" y="' + (y - 5) + '" width="12" height="12" rx="3" fill="' + color + '"/>'
      + '<text x="' + (x + 16) + '" y="' + (y + 5) + '" font-size="11" fill="#555" font-weight="600">' + label + '</text>';
  }

  // ═══════════════════════════════════════════════════════════
  // DONNÉES 3 COUCHES
  // ═══════════════════════════════════════════════════════════

  /**
   * Construit les 3 tableaux de niveaux (formatif, pfmp, ccf)
   * à partir de l'historique des évaluations.
   */
  function _getTripleLayerData(eleveId, comps){
    var formatif = [];
    var pfmp = [];
    var ccf = [];

    comps.forEach(function(c){
      var fLv = 0, pLv = 0, cLv = 0;

      if(window.iwEvalProjections){
        var history = window.iwEvalProjections.getHistory(eleveId, c.code);
        history.forEach(function(entry){
          var phase = (entry.phase || '').toLowerCase();
          var src = (entry.source || '').toLowerCase();
          if(phase === 'pfmp' || src === 'pfmp' || src === 'tuteur'){
            if(entry.niveau > pLv) pLv = entry.niveau;
          } else if(phase === 'certificatif' || phase === 'ccf' || src === 'ccf'){
            if(entry.niveau > cLv) cLv = entry.niveau;
          } else {
            if(entry.niveau > fLv) fLv = entry.niveau;
          }
        });

        // Fallback : si pas d'historique, utiliser le dernier niveau global
        if(!history.length){
          var last = window.iwEvalProjections.getLastLevel(eleveId, c.code);
          if(last > 0) fLv = last;
        }
      }

      formatif.push(Math.min(fLv, MAX_LEVEL));
      pfmp.push(Math.min(pLv, MAX_LEVEL));
      ccf.push(Math.min(cLv, MAX_LEVEL));
    });

    return { formatif: formatif, pfmp: pfmp, ccf: ccf, competences: comps };
  }

  // ═══════════════════════════════════════════════════════════
  // COMPÉTENCES PAR FORMATION
  // ═══════════════════════════════════════════════════════════

  function _getFormationCompetences(formation){
    // Essayer depuis formations.json chargé
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

    // Fallback : listes statiques
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

  // ═══════════════════════════════════════════════════════════
  // UPDATE & EXPORT
  // ═══════════════════════════════════════════════════════════

  function update(containerId, eleveId, formation, options){
    render(containerId, eleveId, formation, options);
  }

  function exportPNG(containerId){
    var container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if(!container) return;
    var svg = container.querySelector('svg');
    if(!svg) return;

    var svgData = new XMLSerializer().serializeToString(svg);
    var canvas = document.createElement('canvas');
    var w = parseInt(svg.getAttribute('width')) || 400;
    var h = parseInt(svg.getAttribute('height')) || 460;
    canvas.width = w * 2;
    canvas.height = h * 2;
    var ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    var img = new Image();
    img.onload = function(){
      ctx.drawImage(img, 0, 0);
      var link = document.createElement('a');
      link.download = 'radar-competences.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }

  // ═══════════════════════════════════════════════════════════
  // API PUBLIQUE
  // ═══════════════════════════════════════════════════════════

  window.iwRadarUnified = {
    render: render,
    update: update,
    exportPNG: exportPNG
  };

  console.log('[radar-unified] Radar unifi\u00e9 de comp\u00e9tences charg\u00e9');
})();
