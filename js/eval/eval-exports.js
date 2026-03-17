/**
 * INERWEB — Module d'export d'évaluation v1.0
 * Points d'entrée pour l'export de notes, appréciations, bilans.
 *
 * Dépendances : eval-projections.js, levels-registry.js, student-registry.js
 */
(function(){
  'use strict';

  // ═══════════════════════════════════════════════════════════
  // UTILITAIRES
  // ═══════════════════════════════════════════════════════════

  function generateCSV(headers, rows){
    var lines = [headers.join(';')];
    rows.forEach(function(row){
      lines.push(row.map(function(cell){
        var s = String(cell === null || cell === undefined ? '' : cell);
        // Échapper les guillemets et points-virgules
        if(s.indexOf(';') !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1){
          s = '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      }).join(';'));
    });
    return '\uFEFF' + lines.join('\r\n'); // BOM UTF-8 pour Excel
  }

  function downloadFile(content, filename, type){
    type = type || 'text/csv;charset=utf-8';
    var blob = new Blob([content], { type: type });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  }

  function copyToClipboard(text){
    if(navigator.clipboard && navigator.clipboard.writeText){
      return navigator.clipboard.writeText(text);
    }
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return Promise.resolve();
  }

  function dateFR(d){
    if(!d) return '—';
    var p = d.substring(0, 10).split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  function today(){
    return new Date().toISOString().substring(0, 10);
  }

  // ═══════════════════════════════════════════════════════════
  // EXPORTS
  // ═══════════════════════════════════════════════════════════

  /**
   * Export CSV des notes par classe et épreuves.
   * @param {string} classe
   * @param {Array<string>} epreuves — ['EP2','EP3'] ou ['E31','E32','E33']
   * @param {Array<Object>} compsByEp — {EP2: [{code,nom}], ...}
   */
  function exportNotes(classe, epreuves, compsByEp){
    if(!window.iwStudents || !window.iwEvalProjections) return;

    var eleves = window.iwStudents.getByClasse(classe);
    var headers = ['Nom', 'Pr\u00e9nom', 'Code'];

    // Headers par épreuve
    epreuves.forEach(function(ep){
      headers.push(ep + ' Note/20');
      headers.push(ep + ' %');
    });

    var rows = [];
    eleves.forEach(function(e){
      var row = [e.nom, e.prenom, e.code];
      epreuves.forEach(function(ep){
        var comps = (compsByEp && compsByEp[ep]) || [];
        var compCodes = comps.map(function(c){ return c.code; });
        var prog = window.iwEvalProjections.getProgression(e.code, compCodes);
        var noteData = window.iwEvalProjections.getNote(e.code, ep);
        row.push(noteData ? noteData.note : '—');
        row.push(prog.pct);
      });
      rows.push(row);
    });

    var csv = generateCSV(headers, rows);
    downloadFile(csv, 'notes_' + classe.replace(/\s/g, '_') + '_' + today() + '.csv');
  }

  /**
   * Export texte des appréciations pour une classe.
   * @param {string} classe
   * @param {Array<Object>} competences — [{code, nom}]
   * @returns {string} Texte formaté
   */
  function exportAppreciations(classe, competences){
    if(!window.iwStudents || !window.iwEvalProjections || !window.iwLevels) return '';

    var eleves = window.iwStudents.getByClasse(classe);
    var compCodes = competences.map(function(c){ return c.code; });
    var lines = [];

    lines.push('=== Appr\u00e9ciations — ' + classe + ' (' + today() + ') ===\n');

    eleves.forEach(function(e){
      var prog = window.iwEvalProjections.getProgression(e.code, compCodes);
      var forts = [];
      var ameliorer = [];

      prog.details.forEach(function(d){
        var comp = competences.find(function(c){ return c.code === d.comp; });
        var nom = comp ? comp.nom : d.comp;
        if(d.niveau >= 5) forts.push(d.comp + ' ' + nom);
        else if(d.evaluated && d.niveau <= 4 && d.niveau >= 3) ameliorer.push(d.comp + ' ' + nom);
      });

      lines.push(e.nom + ' ' + e.prenom + ' (' + e.code + ')');
      lines.push('  Progression : ' + prog.pct + '% (' + prog.evaluated + '/' + prog.total + ')');
      if(forts.length) lines.push('  Points forts : ' + forts.join(', '));
      if(ameliorer.length) lines.push('  Points \u00e0 am\u00e9liorer : ' + ameliorer.join(', '));

      // Commentaires
      compCodes.forEach(function(cc){
        var comment = window.iwEvalProjections.getComment(e.code, cc);
        if(comment) lines.push('  [' + cc + '] ' + comment);
      });

      lines.push('');
    });

    var text = lines.join('\n');
    copyToClipboard(text);
    return text;
  }

  /**
   * Export texte formaté pour École Directe.
   * @param {string} eleveId
   * @param {Array<Object>} competences
   * @returns {string}
   */
  function exportEcoleDirecte(eleveId, competences){
    if(!window.iwEvalProjections || !window.iwLevels) return '';

    var lines = [];
    competences.forEach(function(c){
      var lv = window.iwEvalProjections.getLastLevel(eleveId, c.code);
      var label = window.iwLevels.display(lv, 'long');
      var comment = window.iwEvalProjections.getComment(eleveId, c.code);
      lines.push(c.code + ' ' + c.nom + ' : ' + label);
      if(comment) lines.push('  \u2192 ' + comment);
    });

    return lines.join('\n');
  }

  /**
   * Export CSV bilan PFMP pour une classe.
   * @param {string} classe
   * @param {Array<Object>} competences
   */
  function exportBilanPFMP(classe, competences){
    if(!window.iwStudents || !window.iwEvalProjections) return;

    var eleves = window.iwStudents.getByClasse(classe);
    var headers = ['Nom', 'Pr\u00e9nom', 'Entreprise', 'Tuteur'];
    competences.forEach(function(c){
      headers.push(c.code + ' PFMP');
    });

    var rows = [];
    eleves.forEach(function(e){
      var row = [e.nom, e.prenom, e.entrepriseNom || '', e.tuteurNom || ''];
      competences.forEach(function(c){
        // Chercher évaluation PFMP
        var history = window.iwEvalProjections.getHistory(e.code, c.code);
        var pfmpEntry = null;
        for(var i = history.length - 1; i >= 0; i--){
          if(history[i].phase === 'pfmp'){
            pfmpEntry = history[i];
            break;
          }
        }
        row.push(pfmpEntry ? window.iwLevels.display(pfmpEntry.niveau, 'short') : '—');
      });
      rows.push(row);
    });

    var csv = generateCSV(headers, rows);
    downloadFile(csv, 'bilan_pfmp_' + classe.replace(/\s/g, '_') + '_' + today() + '.csv');
  }

  /**
   * Génère une synthèse texte pour le conseil de classe.
   * @param {string} classe
   * @param {Array<Object>} competences
   * @returns {string}
   */
  function exportSyntheseClasse(classe, competences){
    if(!window.iwStudents || !window.iwEvalProjections || !window.iwLevels) return '';

    var eleves = window.iwStudents.getByClasse(classe);
    var compCodes = competences.map(function(c){ return c.code; });
    var classeData = window.iwEvalProjections.getClasseProgression(eleves, compCodes);

    var lines = [];
    lines.push('=== Synth\u00e8se Conseil de Classe ===');
    lines.push('Classe : ' + classe);
    lines.push('Date : ' + dateFR(today()));
    lines.push('Effectif : ' + eleves.length);
    lines.push('Progression moyenne : ' + classeData.moyenne + '%');
    lines.push('Min : ' + classeData.min + '% — Max : ' + classeData.max + '%');
    lines.push('');

    // Compétences les mieux maîtrisées
    var radarData = window.iwEvalProjections.getClasseRadarData(eleves, competences);
    radarData.sort(function(a, b){ return b.moyenne - a.moyenne; });

    lines.push('Comp\u00e9tences les mieux ma\u00eetris\u00e9es :');
    radarData.slice(0, 3).forEach(function(r){
      lines.push('  ' + r.code + ' ' + r.nom + ' (moy ' + r.moyenne.toFixed(1) + ')');
    });

    lines.push('');
    lines.push('Comp\u00e9tences en difficult\u00e9 :');
    radarData.slice(-3).reverse().forEach(function(r){
      lines.push('  ' + r.code + ' ' + r.nom + ' (moy ' + r.moyenne.toFixed(1) + ')');
    });

    lines.push('');
    lines.push('\u00c9l\u00e8ves en alerte (< 30%) :');
    eleves.forEach(function(e){
      var p = classeData.byEleve[e.code];
      if(p && p.pct < 30){
        lines.push('  ' + e.nom + ' ' + e.prenom + ' — ' + p.pct + '%');
      }
    });

    var text = lines.join('\n');
    copyToClipboard(text);
    return text;
  }

  // ═══════════════════════════════════════════════════════════
  // BILAN CCF
  // ═══════════════════════════════════════════════════════════

  /**
   * Convertit un niveau interne (0-7) en points /20.
   * NE/ABS/IMP = 0, NA = 5, EC = 10, M = 15, PM = 20
   */
  function niveauToPoints(niv){
    if(niv <= 2) return 0;  // NE, ABS, IMP
    if(niv === 3) return 5;  // NA
    if(niv === 4) return 10; // EC
    if(niv === 5) return 15; // M
    if(niv >= 6) return 20;  // PM, VAL
    return 0;
  }

  /**
   * Calcule la note /20 pour une épreuve à partir des niveaux évalués.
   * @param {Array<Object>} compResults — [{code, niveau, poids}]
   * @returns {number} Note sur 20 arrondie à 0.5
   */
  function calculateNote(compResults){
    var totalPoids = 0;
    var totalPoints = 0;
    compResults.forEach(function(c){
      if(c.niveau > 2){ // Seulement les compétences évaluées
        var pts = niveauToPoints(c.niveau);
        var poids = c.poids || 1;
        totalPoints += pts * poids;
        totalPoids += poids;
      }
    });
    if(totalPoids === 0) return 0;
    var note = totalPoints / totalPoids;
    return Math.round(note * 2) / 2; // Arrondi au 0.5
  }

  /**
   * Génère un bilan CCF complet pour un élève et une formation.
   * @param {string} eleveId
   * @param {string} formation — CAP_IFCA, BAC_MFER, TNE
   * @returns {Object|null}
   */
  function generateCcfBilan(eleveId, formation){
    if(!window.iwEvalProjections) return null;

    // Récupérer les données de l'élève
    var eleve = null;
    if(window.iwStudents && window.iwStudents.resolve){
      eleve = window.iwStudents.resolve(eleveId);
    }
    if(!eleve) eleve = {code: eleveId, nom: eleveId, prenom: '', classe: ''};

    // Récupérer les épreuves de la formation
    var formationData = _getFormationData(formation);
    if(!formationData) return null;

    var epreuves = [];
    var totalNote = 0;
    var totalCoef = 0;

    (formationData.epreuves || []).forEach(function(ep){
      var compResults = [];
      (ep.competences || []).forEach(function(c){
        var niv = window.iwEvalProjections.getLastLevel(eleveId, c.code);
        var nivLabel = window.iwLevels ? window.iwLevels.display(niv, 'short') : String(niv);
        var nivLong = window.iwLevels ? window.iwLevels.display(niv, 'long') : '';
        var color = window.iwLevels ? window.iwLevels.color(niv) : '#aaa';
        var valide = niv >= 5;

        compResults.push({
          code: c.code,
          libelle: c.full || c.nom || c.code,
          niveau: niv,
          niveauLabel: nivLabel,
          niveauLong: nivLong,
          color: color,
          valide: valide,
          poids: c.poids || 1
        });
      });

      var note = calculateNote(compResults);
      var coef = _getCoefEpreuve(ep.code, formation);
      var nbValides = compResults.filter(function(c){ return c.valide; }).length;

      epreuves.push({
        code: ep.code,
        libelle: ep.nom || ep.code,
        competences: compResults,
        note: note,
        coef: coef,
        valide: nbValides >= Math.ceil(compResults.length * 0.5),
        nbValides: nbValides,
        nbTotal: compResults.length
      });

      totalNote += note * coef;
      totalCoef += coef;
    });

    var noteGlobale = totalCoef > 0 ? Math.round(totalNote / totalCoef * 2) / 2 : 0;
    var avis = noteGlobale >= 10 ? 'FAVORABLE' : 'D\u00c9FAVORABLE';

    return {
      eleve: {
        code: eleve.code || eleveId,
        nom: eleve.nom || '',
        prenom: eleve.prenom || '',
        classe: eleve.classe || ''
      },
      formation: formation,
      formationNom: formationData.nom || formation,
      epreuves: epreuves,
      noteGlobale: noteGlobale,
      avis: avis,
      dateGeneration: today(),
      etablissement: 'Lyc\u00e9e Professionnel Priv\u00e9 Jacques Raynaud \u2014 Campus \u00c9QUATIO',
      anneeScolaire: _getAnneeScolaire()
    };
  }

  function _getFormationData(formation){
    if(window.CFG && window.CFG.formations){
      return window.CFG.formations.find(function(f){ return f.id === formation; }) || null;
    }
    // Fallback statique pour CAP IFCA
    var FALLBACK = {
      CAP_IFCA: {
        nom: 'CAP Installateur en Froid et Conditionnement d\'Air',
        epreuves: [
          {code:'EP2',nom:'R\u00e9alisation d\'une installation (CCF, coeff 4)',competences:[
            {code:'C1.2',nom:'Communiquer',full:'Communiquer avec les diff\u00e9rents acteurs',poids:1},
            {code:'C3.1',nom:'Organisation',full:'Organiser le poste de travail',poids:1.5},
            {code:'C3.2',nom:'Identifier',full:'Identifier les r\u00e9seaux',poids:1.5},
            {code:'C3.3',nom:'Implanter',full:'Implanter, fixer les supportages',poids:2},
            {code:'C3.4',nom:'Fa\u00e7onner',full:'Fa\u00e7onner, raccorder, assembler',poids:5},
            {code:'C3.5',nom:'Soudure/PER',full:'Soudage acier et raccorder le PER',poids:1.5},
            {code:'C3.6',nom:'C\u00e2bler',full:'C\u00e2bler, connecter les liaisons \u00e9lectriques',poids:3},
            {code:'C3.7',nom:'Contr\u00f4les',full:'Contr\u00f4ler la mise en \u0153uvre',poids:2},
            {code:'C3.8',nom:'D\u00e9chets',full:'Trier, valoriser les d\u00e9chets',poids:1},
            {code:'C3.9',nom:'\u00c9tanch\u00e9it\u00e9',full:'V\u00e9rifier l\'\u00e9tanch\u00e9it\u00e9',poids:2.5}
          ]},
          {code:'EP3',nom:'Mise en service et maintenance (CCF, coeff 4)',competences:[
            {code:'C4.1',nom:'Vide',full:'Tirer au vide le circuit frigorifique',poids:2.5},
            {code:'C4.2',nom:'Fluide',full:'Manipuler le fluide frigorigène',poids:2.5},
            {code:'C4.3',nom:'\u00c9tanch\u00e9it\u00e9',full:'Contr\u00f4ler l\'\u00e9tanch\u00e9it\u00e9',poids:2},
            {code:'C4.4',nom:'Panne',full:'Identifier la panne',poids:1},
            {code:'C4.5',nom:'Mesurer',full:'Mesurer et comparer des grandeurs',poids:2.5},
            {code:'C4.6',nom:'R\u00e9gler',full:'R\u00e9gler les organes de r\u00e9gulation',poids:2},
            {code:'C4.7',nom:'Raccorder',full:'Raccorder les \u00e9quipements',poids:2},
            {code:'C5.1',nom:'Remplacer',full:'Remplacer un composant',poids:2},
            {code:'C1.1',nom:'Docs',full:'Compl\u00e9ter et transmettre des documents',poids:1.5}
          ]}
        ]
      }
    };
    return FALLBACK[formation] || null;
  }

  function _getCoefEpreuve(code, formation){
    var COEFS = {
      CAP_IFCA: {EP2: 4, EP3: 4},
      BAC_MFER: {E31: 3, E32: 3, E33: 2},
      TNE: {CT: 1}
    };
    return (COEFS[formation] && COEFS[formation][code]) || 1;
  }

  function _getAnneeScolaire(){
    var now = new Date();
    var y = now.getFullYear();
    var m = now.getMonth();
    if(m < 8) return (y - 1) + '-' + y;
    return y + '-' + (y + 1);
  }

  // ═══════════════════════════════════════════════════════════
  // API PUBLIQUE
  // ═══════════════════════════════════════════════════════════

  window.iwEvalExports = {
    exportNotes: exportNotes,
    exportAppreciations: exportAppreciations,
    exportEcoleDirecte: exportEcoleDirecte,
    exportBilanPFMP: exportBilanPFMP,
    exportSyntheseClasse: exportSyntheseClasse,
    generateCcfBilan: generateCcfBilan,
    calculateNote: calculateNote,
    niveauToPoints: niveauToPoints,
    generateCSV: generateCSV,
    downloadFile: downloadFile,
    copyToClipboard: copyToClipboard
  };

  console.log('[eval-exports] Module d\'export d\'\u00e9valuation charg\u00e9');
})();
