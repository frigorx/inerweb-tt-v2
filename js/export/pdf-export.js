/**
 * INERWEB — Export PDF natif v1.0
 * Génération de PDF avec jsPDF
 *
 * Dépendances : jsPDF (CDN), eval-exports.js, levels-registry.js
 */
(function(){
  'use strict';

  // Constantes
  var COLORS = {
    bleu: [27, 58, 99],
    orange: [255, 107, 53],
    vert: [39, 174, 96],
    rouge: [231, 76, 60],
    jaune: [243, 156, 18],
    gris: [100, 100, 100],
    grisClair: [200, 200, 200],
    noir: [0, 0, 0],
    blanc: [255, 255, 255]
  };

  var PAGE = {
    width: 210,
    height: 297,
    marginLeft: 15,
    marginRight: 15,
    marginTop: 15,
    marginBottom: 15
  };

  // ═══════════════════════════════════════════════════════════
  // BILAN CCF
  // ═══════════════════════════════════════════════════════════

  function exportBilanCcf(eleveId, formation, options){
    options = options || {};

    if(!window.iwEvalExports || !window.iwEvalExports.generateCcfBilan){
      console.error('[pdf-export] iwEvalExports.generateCcfBilan non disponible');
      return;
    }

    var bilan = window.iwEvalExports.generateCcfBilan(eleveId, formation);
    if(!bilan){
      console.error('[pdf-export] Impossible de g\u00e9n\u00e9rer le bilan pour', eleveId);
      return;
    }

    var jsPDF = _getJsPDF();
    if(!jsPDF) return;

    var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    var y = PAGE.marginTop;
    var contentWidth = PAGE.width - PAGE.marginLeft - PAGE.marginRight;

    // En-t\u00eate
    doc.setFillColor.apply(doc, COLORS.bleu);
    doc.rect(0, 0, PAGE.width, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('BILAN CCF', PAGE.width / 2, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(bilan.etablissement || 'Lyc\u00e9e Professionnel Priv\u00e9 Jacques Raynaud', PAGE.width / 2, 23, { align: 'center' });

    doc.setFontSize(9);
    doc.text('Ann\u00e9e scolaire ' + (bilan.anneeScolaire || '2025-2026'), PAGE.width / 2, 30, { align: 'center' });

    y = 45;

    // Formation
    doc.setFillColor.apply(doc, COLORS.orange);
    doc.roundedRect(PAGE.marginLeft, y, contentWidth, 10, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(bilan.formationNom || formation, PAGE.width / 2, y + 7, { align: 'center' });

    y += 18;

    // \u00c9l\u00e8ve
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(PAGE.marginLeft, y, contentWidth, 18, 2, 2, 'F');

    doc.setTextColor.apply(doc, COLORS.noir);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('\u00c9l\u00e8ve :', PAGE.marginLeft + 5, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.text((bilan.eleve.nom || '') + ' ' + (bilan.eleve.prenom || ''), PAGE.marginLeft + 25, y + 7);

    doc.setFont('helvetica', 'bold');
    doc.text('Classe :', PAGE.marginLeft + 100, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(bilan.eleve.classe || '', PAGE.marginLeft + 120, y + 7);

    doc.setFont('helvetica', 'bold');
    doc.text('Code :', PAGE.marginLeft + 5, y + 14);
    doc.setFont('helvetica', 'normal');
    doc.text(bilan.eleveId || eleveId, PAGE.marginLeft + 25, y + 14);

    y += 25;

    // \u00c9preuves
    (bilan.epreuves || []).forEach(function(ep){
      var epHeight = 12 + (ep.competences.length * 6) + 8;
      if(y + epHeight > PAGE.height - PAGE.marginBottom - 30){
        doc.addPage();
        y = PAGE.marginTop;
      }

      // En-t\u00eate \u00e9preuve
      doc.setFillColor.apply(doc, COLORS.bleu);
      doc.rect(PAGE.marginLeft, y, contentWidth, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(ep.code + ' \u2014 ' + (ep.libelle || ep.nom || ''), PAGE.marginLeft + 5, y + 7);

      var noteText = 'Note : ' + ep.note.toFixed(1) + ' / 20';
      doc.text(noteText, PAGE.width - PAGE.marginRight - 5, y + 7, { align: 'right' });

      y += 12;

      // Tableau comp\u00e9tences
      doc.setFontSize(8);
      ep.competences.forEach(function(c, idx){
        if(idx % 2 === 0){
          doc.setFillColor(250, 250, 250);
          doc.rect(PAGE.marginLeft, y, contentWidth, 6, 'F');
        }

        doc.setTextColor.apply(doc, COLORS.noir);
        doc.setFont('helvetica', 'normal');
        doc.text(c.code, PAGE.marginLeft + 2, y + 4);
        doc.text(_truncate(c.libelle, 55), PAGE.marginLeft + 18, y + 4);

        var nivColor = _getNiveauColor(c.niveau);
        doc.setTextColor.apply(doc, nivColor);
        doc.setFont('helvetica', 'bold');
        doc.text(c.niveauLabel || c.nivLabel || '\u2014', PAGE.marginLeft + 130, y + 4);

        doc.setTextColor.apply(doc, COLORS.gris);
        doc.setFont('helvetica', 'normal');
        doc.text(String(c.points || 0) + ' pts', PAGE.marginLeft + 150, y + 4);

        if(c.valide){
          doc.setTextColor.apply(doc, COLORS.vert);
          doc.text('\u2713', PAGE.marginLeft + 170, y + 4);
        }

        y += 6;
      });

      y += 8;
    });

    // R\u00e9sultat global
    if(y + 35 > PAGE.height - PAGE.marginBottom){
      doc.addPage();
      y = PAGE.marginTop;
    }

    var avisColor = bilan.avis === 'FAVORABLE' ? COLORS.vert : COLORS.rouge;
    doc.setDrawColor.apply(doc, avisColor);
    doc.setLineWidth(1);
    doc.roundedRect(PAGE.marginLeft, y, contentWidth, 30, 3, 3, 'S');

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor.apply(doc, COLORS.noir);
    doc.text('Note globale :', PAGE.marginLeft + 10, y + 12);

    doc.setFontSize(20);
    doc.setTextColor.apply(doc, avisColor);
    doc.text(bilan.noteGlobale.toFixed(1) + ' / 20', PAGE.marginLeft + 55, y + 13);

    doc.setFontSize(12);
    doc.text('Avis : ' + bilan.avis, PAGE.marginLeft + 10, y + 24);

    y += 38;

    // Pied de page
    doc.setFontSize(8);
    doc.setTextColor.apply(doc, COLORS.gris);
    doc.text('Document g\u00e9n\u00e9r\u00e9 le ' + (bilan.dateGeneration || '') + ' \u2014 INERWEB CCF', PAGE.width / 2, PAGE.height - 10, { align: 'center' });

    var filename = 'Bilan_CCF_' + _sanitizeFilename(bilan.eleve.nom) + '_' + formation + '.pdf';
    doc.save(filename);
    _notify('PDF g\u00e9n\u00e9r\u00e9 : ' + filename);

    return doc;
  }

  // ═══════════════════════════════════════════════════════════
  // BILAN PFMP
  // ═══════════════════════════════════════════════════════════

  function exportBilanPfmp(eleveId, pfmpId, options){
    options = options || {};

    var jsPDF = _getJsPDF();
    if(!jsPDF) return;

    var pfmpData = null;
    if(window.iwEvalProjections && window.iwEvalProjections.getPfmpData){
      pfmpData = window.iwEvalProjections.getPfmpData(eleveId, pfmpId);
    }

    if(!pfmpData){
      pfmpData = {
        eleveId: eleveId,
        pfmpId: pfmpId || '',
        entreprise: options.entreprise || 'Entreprise',
        tuteur: options.tuteur || '',
        dateDebut: options.dateDebut || '',
        dateFin: options.dateFin || '',
        evaluations: []
      };
    }

    var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    var y = PAGE.marginTop;
    var contentWidth = PAGE.width - PAGE.marginLeft - PAGE.marginRight;

    // En-t\u00eate
    doc.setFillColor.apply(doc, COLORS.vert);
    doc.rect(0, 0, PAGE.width, 30, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('BILAN PFMP', PAGE.width / 2, 13, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('P\u00e9riode de Formation en Milieu Professionnel', PAGE.width / 2, 22, { align: 'center' });

    y = 40;

    // Infos PFMP
    doc.setFillColor(245, 250, 245);
    doc.roundedRect(PAGE.marginLeft, y, contentWidth, 25, 2, 2, 'F');

    doc.setTextColor.apply(doc, COLORS.noir);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Entreprise :', PAGE.marginLeft + 5, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.text(pfmpData.entreprise, PAGE.marginLeft + 35, y + 8);

    doc.setFont('helvetica', 'bold');
    doc.text('Tuteur :', PAGE.marginLeft + 5, y + 16);
    doc.setFont('helvetica', 'normal');
    doc.text(pfmpData.tuteur, PAGE.marginLeft + 25, y + 16);

    doc.setFont('helvetica', 'bold');
    doc.text('P\u00e9riode :', PAGE.marginLeft + 100, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.text((pfmpData.dateDebut || '') + ' \u2014 ' + (pfmpData.dateFin || ''), PAGE.marginLeft + 125, y + 8);

    y += 35;

    // \u00c9valuations
    if(pfmpData.evaluations && pfmpData.evaluations.length > 0){
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor.apply(doc, COLORS.vert);
      doc.text('\u00c9valuations', PAGE.marginLeft, y);
      y += 6;

      doc.setFontSize(8);
      pfmpData.evaluations.forEach(function(ev){
        doc.setTextColor.apply(doc, COLORS.noir);
        doc.setFont('helvetica', 'normal');
        doc.text((ev.competenceCode || '') + ' : ' + (ev.niveau || '\u2014'), PAGE.marginLeft + 3, y);
        y += 4;
      });
    } else {
      doc.setFontSize(10);
      doc.setTextColor.apply(doc, COLORS.gris);
      doc.text('\u00c9valuations PFMP \u00e0 compl\u00e9ter...', PAGE.marginLeft, y);
    }

    // Pied de page
    doc.setFontSize(7);
    doc.setTextColor.apply(doc, COLORS.gris);
    doc.text('INERWEB \u2014 Bilan PFMP', PAGE.width / 2, PAGE.height - 8, { align: 'center' });

    var filename = 'Bilan_PFMP_' + _sanitizeFilename(eleveId) + '_' + (pfmpId || 'pfmp') + '.pdf';
    doc.save(filename);
    _notify('PDF PFMP g\u00e9n\u00e9r\u00e9');

    return doc;
  }

  // ═══════════════════════════════════════════════════════════
  // GRILLE PROGRESSION
  // ═══════════════════════════════════════════════════════════

  function exportGrilleProgression(classeId, formation, options){
    options = options || {};

    var jsPDF = _getJsPDF();
    if(!jsPDF) return;

    var eleves = [];
    if(window.iwStudents && window.iwStudents.getByClasse){
      eleves = window.iwStudents.getByClasse(classeId);
    }

    var competences = [];
    if(window.CFG && window.CFG.formations){
      var f = window.CFG.formations.find(function(x){ return x.id === formation; });
      if(f && f.competences) competences = f.competences;
    }

    var doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    var pageWidth = 297;
    var y = 15;

    // En-t\u00eate
    doc.setFillColor.apply(doc, COLORS.bleu);
    doc.rect(0, 0, pageWidth, 20, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('GRILLE DE PROGRESSION \u2014 ' + (classeId || ''), pageWidth / 2, 13, { align: 'center' });

    y = 28;

    doc.setTextColor.apply(doc, COLORS.noir);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Formation : ' + (formation || '') + ' \u2014 Effectif : ' + eleves.length + ' \u00e9l\u00e8ves \u2014 ' + competences.length + ' comp\u00e9tences', 15, y);

    y += 10;

    if(eleves.length === 0 || competences.length === 0){
      doc.setFontSize(10);
      doc.setTextColor.apply(doc, COLORS.gris);
      doc.text('Donn\u00e9es insuffisantes pour g\u00e9n\u00e9rer la grille.', 15, y);
    } else {
      // En-t\u00eate tableau
      var colW = Math.min(18, (pageWidth - 60) / competences.length);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor.apply(doc, COLORS.bleu);
      doc.text('\u00c9l\u00e8ve', 15, y + 3);
      competences.forEach(function(c, i){
        doc.text(c.code || '', 50 + i * colW, y + 3);
      });
      doc.text('Prog.', 50 + competences.length * colW + 2, y + 3);

      y += 5;
      doc.setDrawColor.apply(doc, COLORS.grisClair);
      doc.line(15, y, pageWidth - 15, y);
      y += 2;

      // Lignes \u00e9l\u00e8ves
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      eleves.forEach(function(el){
        if(y > 195){
          doc.addPage();
          y = 15;
        }
        doc.setTextColor.apply(doc, COLORS.noir);
        doc.text(_truncate(el.code || el.id || '', 15), 15, y + 3);

        competences.forEach(function(c, i){
          var niv = 0;
          if(window.iwEvalProjections && window.iwEvalProjections.getLevel){
            niv = window.iwEvalProjections.getLevel(el.id || el.code, c.code);
          }
          var label = _nivLabel(niv);
          var color = _getNiveauColor(niv);
          doc.setTextColor.apply(doc, color);
          doc.text(label, 50 + i * colW, y + 3);
        });

        doc.setTextColor.apply(doc, COLORS.noir);
        y += 4;
      });
    }

    // Pied de page
    doc.setFontSize(7);
    doc.setTextColor.apply(doc, COLORS.gris);
    doc.text('INERWEB \u2014 Grille de progression', pageWidth / 2, 205, { align: 'center' });

    var filename = 'Grille_Progression_' + _sanitizeFilename(classeId) + '_' + _sanitizeFilename(formation) + '.pdf';
    doc.save(filename);
    _notify('PDF grille g\u00e9n\u00e9r\u00e9');

    return doc;
  }

  // ═══════════════════════════════════════════════════════════
  // FICHE TP
  // ═══════════════════════════════════════════════════════════

  function exportFicheTp(tp, options){
    options = options || {};

    var jsPDF = _getJsPDF();
    if(!jsPDF) return;

    var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    var y = PAGE.marginTop;
    var contentWidth = PAGE.width - PAGE.marginLeft - PAGE.marginRight;

    // En-t\u00eate
    doc.setFillColor.apply(doc, COLORS.orange);
    doc.rect(0, 0, PAGE.width, 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('FICHE TP', PAGE.marginLeft, 12);

    doc.setFontSize(10);
    doc.text(tp.id || 'TP-XXX', PAGE.width - PAGE.marginRight, 12, { align: 'right' });

    y = 35;

    // Titre
    doc.setTextColor.apply(doc, COLORS.bleu);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(tp.titre || 'Sans titre', PAGE.marginLeft, y);
    y += 6;

    if(tp.sousTitre){
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor.apply(doc, COLORS.gris);
      doc.text(tp.sousTitre, PAGE.marginLeft, y);
      y += 8;
    }

    y += 5;

    // Infos
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(PAGE.marginLeft, y, contentWidth, 15, 2, 2, 'F');

    doc.setTextColor.apply(doc, COLORS.noir);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Th\u00e8me : ' + (tp.theme || '\u2014'), PAGE.marginLeft + 5, y + 6);
    doc.text('Type : ' + (tp.type || '\u2014'), PAGE.marginLeft + 60, y + 6);
    doc.text('Dur\u00e9e : ' + (tp.duree || 0) + ' min', PAGE.marginLeft + 110, y + 6);
    doc.text('Difficult\u00e9 : ' + (tp.difficulte || 0) + '/5', PAGE.marginLeft + 155, y + 6);

    y += 22;

    // Description
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor.apply(doc, COLORS.bleu);
    doc.text('Description', PAGE.marginLeft, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor.apply(doc, COLORS.noir);
    doc.setFontSize(9);
    var descLines = doc.splitTextToSize(tp.description || '', contentWidth);
    doc.text(descLines, PAGE.marginLeft, y);
    y += descLines.length * 4 + 8;

    // Mat\u00e9riel
    if(tp.materiel && tp.materiel.length > 0){
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor.apply(doc, COLORS.bleu);
      doc.text('Mat\u00e9riel n\u00e9cessaire', PAGE.marginLeft, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor.apply(doc, COLORS.noir);
      doc.setFontSize(9);
      tp.materiel.forEach(function(m){
        doc.text('\u2022 ' + m, PAGE.marginLeft + 3, y);
        y += 4;
      });
      y += 5;
    }

    // Op\u00e9rations
    if(tp.operations && tp.operations.length > 0){
      if(y > PAGE.height - 60){
        doc.addPage();
        y = PAGE.marginTop;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor.apply(doc, COLORS.bleu);
      doc.text('Op\u00e9rations', PAGE.marginLeft, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor.apply(doc, COLORS.noir);
      doc.setFontSize(9);
      tp.operations.forEach(function(op, idx){
        doc.text((idx + 1) + '. ' + op, PAGE.marginLeft + 3, y);
        y += 4;
      });
      y += 5;
    }

    // Remarques p\u00e9dagogiques
    if(tp.remarquesPedago){
      if(y > PAGE.height - 40){
        doc.addPage();
        y = PAGE.marginTop;
      }

      var remarquesLines = doc.splitTextToSize(tp.remarquesPedago, contentWidth - 10);
      var remarquesHeight = remarquesLines.length * 4 + 10;
      doc.setFillColor(255, 250, 230);
      doc.roundedRect(PAGE.marginLeft, y, contentWidth, remarquesHeight, 2, 2, 'F');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor.apply(doc, COLORS.orange);
      doc.text('Remarques p\u00e9dagogiques', PAGE.marginLeft + 3, y + 5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor.apply(doc, COLORS.noir);
      doc.text(remarquesLines, PAGE.marginLeft + 3, y + 10);
    }

    // Pied de page
    doc.setFontSize(7);
    doc.setTextColor.apply(doc, COLORS.gris);
    doc.text('INERWEB \u2014 ' + (tp.auteur || 'Anonyme') + ' \u2014 v' + (tp.version || '1.0'), PAGE.width / 2, PAGE.height - 8, { align: 'center' });

    var filename = 'TP_' + _sanitizeFilename(tp.titre || tp.id) + '.pdf';
    doc.save(filename);
    _notify('PDF TP g\u00e9n\u00e9r\u00e9');

    return doc;
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════

  function _getJsPDF(){
    var ctor = window.jspdf ? window.jspdf.jsPDF : window.jsPDF;
    if(!ctor){
      console.error('[pdf-export] jsPDF non charg\u00e9');
      return null;
    }
    return ctor;
  }

  function _getNiveauColor(niveau){
    if(niveau <= 2) return COLORS.gris;
    if(niveau === 3) return COLORS.rouge;
    if(niveau === 4) return COLORS.jaune;
    if(niveau === 5) return COLORS.vert;
    if(niveau >= 6) return [33, 150, 243];
    return COLORS.gris;
  }

  function _nivLabel(niv){
    var labels = { 0: '\u2014', 1: 'ABS', 2: 'NE', 3: 'NA', 4: 'EC', 5: 'M', 6: 'PM', 7: 'EXP' };
    return labels[parseInt(niv)] || '\u2014';
  }

  function _truncate(str, maxLen){
    if(!str) return '';
    if(str.length <= maxLen) return str;
    return str.substring(0, maxLen - 3) + '...';
  }

  function _sanitizeFilename(str){
    if(!str) return 'document';
    return str
      .replace(/[\u00e0\u00e1\u00e2\u00e3\u00e4\u00e5]/g, 'a')
      .replace(/[\u00e8\u00e9\u00ea\u00eb]/g, 'e')
      .replace(/[\u00ec\u00ed\u00ee\u00ef]/g, 'i')
      .replace(/[\u00f2\u00f3\u00f4\u00f5\u00f6]/g, 'o')
      .replace(/[\u00f9\u00fa\u00fb\u00fc]/g, 'u')
      .replace(/[\u00e7]/g, 'c')
      .replace(/[^a-zA-Z0-9\-_]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 50);
  }

  function _notify(msg){
    if(window.iwNotify && window.iwNotify.show){
      window.iwNotify.show(msg, 'success');
    } else {
      console.log('[pdf-export]', msg);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // API PUBLIQUE
  // ═══════════════════════════════════════════════════════════

  window.iwPdfExport = {
    bilanCcf: exportBilanCcf,
    bilanPfmp: exportBilanPfmp,
    grilleProgression: exportGrilleProgression,
    ficheTp: exportFicheTp,
    isAvailable: function(){ return !!(window.jspdf || window.jsPDF); },
    getColors: function(){ return COLORS; }
  };

  console.log('[pdf-export] Module PDF charg\u00e9 \u2014 jsPDF ' + (window.jspdf ? 'disponible' : 'non charg\u00e9'));
})();
