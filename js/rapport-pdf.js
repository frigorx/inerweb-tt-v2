/**
 * rapport-pdf.js — Module de génération des rapports PDF pour inerWeb TT MFER
 *
 * Génère :
 *   - rapportModule.generate()              → rapport d'inspection synthétique (multi-pages)
 *   - rapportModule.generateStudentPDF(code) → fiche individuelle élève
 *
 * Globales attendues : students, validations, notes, appCfg, pfmpData,
 *   COMP_E31, COMP_E32, COMP_E33, COEF_OBL, calcNote
 * Optionnelles : window.juryModule, window.expoModule, window.imposModule,
 *                window.tacheModule, window.sigModule, window.getObs
 * Dépendance : jsPDF (window.jspdf.jsPDF)
 */
window.rapportModule = (function () {
  'use strict';

  /* ── Constantes de mise en page ───────────────────────────── */
  var MG = 15;          // marge gauche
  var MD = 15;          // marge droite
  var MH = 15;          // marge haute
  var MB = 22;          // marge basse (réservée au footer)
  var LH = 6;           // hauteur de ligne standard
  var FONT = 'helvetica'; // police explicite pour éviter undefined

  var VERT  = [46, 125, 50];
  var ROUGE = [198, 40, 40];
  var GRIS  = [100, 100, 100];
  var NOIR  = [0, 0, 0];
  var BLEU  = [33, 80, 150];
  var VIOLET = [108, 52, 131]; // couleur E33

  /* ── Définition centralisée des épreuves MFER ─────────────── */
  /* Évite la duplication et facilite l'ajout/modification       */
  var EPREUVES = [
    { key: 'E31', label: 'E31 — Réalisation & Mise en service',   coeff: 3, color: BLEU,   compsKey: 'COMP_E31' },
    { key: 'E32', label: 'E32 — Diagnostic & Maintenance',        coeff: 3, color: VIOLET, compsKey: 'COMP_E32' },
    { key: 'E33', label: 'E33 — Dossier professionnel & Communication', coeff: 2, color: VIOLET, compsKey: 'COMP_E33' }
  ];

  /** Retourne le tableau de compétences d'une épreuve, ou [] si absent */
  function getComps(ep) {
    return window[ep.compsKey] || [];
  }

  /* ── Utilitaires ──────────────────────────────────────────── */

  /** Date formatée JJ/MM/AAAA (date du jour) */
  function dateFR() {
    var d = new Date();
    return ('0' + d.getDate()).slice(-2) + '/' +
           ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear();
  }

  /** Largeur utile de la page */
  function pw(doc) { return doc.internal.pageSize.getWidth() - MG - MD; }

  /** Hauteur utile de la page (seuil avant footer) */
  function ph(doc) { return doc.internal.pageSize.getHeight() - MB; }

  /**
   * Vérifie qu'il reste de la place, sinon crée une nouvelle page.
   * Retourne un objet { y, isNew } pour que l'appelant sache s'il
   * faut re-dessiner des en-têtes.
   * FIX #11 : plus fiable que la comparaison y === MH.
   */
  function checkPage(doc, y, needed) {
    if (y + (needed || LH) > ph(doc)) {
      doc.addPage();
      return { y: MH, isNew: true };
    }
    return { y: y, isNew: false };
  }

  /** Tri alphabétique par nom puis prénom */
  function sortStudents(arr) {
    return arr.slice().sort(function (a, b) {
      var cmp = (a.nom || '').localeCompare(b.nom || '', 'fr');
      return cmp !== 0 ? cmp : (a.prenom || '').localeCompare(b.prenom || '', 'fr');
    });
  }

  /** Clamp un nombre entre min et max (protection étoiles tuteur) */
  function clamp(val, min, max) {
    var n = parseInt(val, 10);
    if (isNaN(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  /**
   * Accès sécurisé à pfmpData[code].
   * FIX #4 : évite le crash si pfmpData est undefined.
   */
  function getPfmp(code) {
    return (window.pfmpData || {})[code] || {};
  }

  /** Ajoute le footer sur chaque page du document */
  function addFooters(doc) {
    var total = doc.internal.getNumberOfPages();
    for (var i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor.apply(doc, GRIS);
      var fy = doc.internal.pageSize.getHeight() - 8;
      doc.text('inerWeb TT MFER \u2014 Rapport CCF', MG, fy);
      doc.text(dateFR(), doc.internal.pageSize.getWidth() / 2, fy, { align: 'center' });
      doc.text('Page ' + i + '/' + total,
        doc.internal.pageSize.getWidth() - MD, fy, { align: 'right' });
    }
  }

  /* ══════════════════════════════════════════════════════════════
     RAPPORT D'INSPECTION (generate)
     ══════════════════════════════════════════════════════════════ */

  /* ── Page 1 : Couverture ──────────────────────────────────── */

  function pageCouverture(doc) {
    var cfg = window.appCfg || {};
    var cx = doc.internal.pageSize.getWidth() / 2;
    var y = 60;

    doc.setFontSize(18);
    doc.setFont(FONT, 'bold');
    doc.setTextColor.apply(doc, BLEU);
    doc.text('RAPPORT D\u2019INSPECTION', cx, y, { align: 'center' });
    y += 9;
    doc.setFontSize(14);
    doc.text('Contr\u00f4le en Cours de Formation', cx, y, { align: 'center' });
    y += 16;

    doc.setFontSize(12);
    doc.setFont(FONT, 'normal');
    doc.setTextColor.apply(doc, NOIR);
    doc.text('Bac Pro M\u00e9tiers du Froid et des \u00c9nergies Renouvelables', cx, y, { align: 'center' });
    y += 20;

    doc.setFontSize(11);
    var infos = [
      ['\u00c9tablissement', cfg.etablissement || '\u2014'],
      ['Ville',              cfg.ville || '\u2014'],
      ['Acad\u00e9mie',     cfg.academie || '\u2014'],
      ['Session',            String(cfg.session || '\u2014')],
      ['Date de g\u00e9n\u00e9ration', dateFR()]
    ];
    for (var i = 0; i < infos.length; i++) {
      doc.setFont(FONT, 'bold');
      doc.text(infos[i][0] + ' :', cx - 30, y, { align: 'right' });
      doc.setFont(FONT, 'normal');
      doc.text(String(infos[i][1]), cx - 25, y);
      y += 8;
    }
  }

  /* ── Pages 2+ : Tableau synthèse des élèves ──────────────── */

  function pageTableau(doc) {
    doc.addPage();
    var y = MH;
    doc.setFontSize(13);
    doc.setFont(FONT, 'bold');
    doc.setTextColor.apply(doc, BLEU);
    doc.text('Synth\u00e8se des r\u00e9sultats', MG, y);
    y += 10;

    // FIX #1/#3 : colonnes adaptées E31/E32/E33
    var cols = ['N\u00b0', 'Nom', 'Pr\u00e9nom', 'Classe',
                'E31/20', 'E32/20', 'E33/20',
                '\u00c9lig.31', '\u00c9lig.32', '\u00c9lig.33'];
    // FIX #8 : largeurs proportionnelles pour remplir la page paysage
    var totalW = pw(doc);
    var cw = [
      Math.round(totalW * 0.04),  // N°
      Math.round(totalW * 0.17),  // Nom
      Math.round(totalW * 0.14),  // Prénom
      Math.round(totalW * 0.11),  // Classe
      Math.round(totalW * 0.09),  // E31
      Math.round(totalW * 0.09),  // E32
      Math.round(totalW * 0.09),  // E33
      Math.round(totalW * 0.09),  // Élig.31
      Math.round(totalW * 0.09),  // Élig.32
      Math.round(totalW * 0.09)   // Élig.33
    ];

    /** Dessine la rangée d'en-tête du tableau */
    function drawHeader(atY) {
      doc.setFontSize(8);
      doc.setFont(FONT, 'bold');
      doc.setTextColor(255, 255, 255);
      doc.setFillColor.apply(doc, BLEU);
      var hx = MG;
      for (var c = 0; c < cols.length; c++) {
        doc.rect(hx, atY - 4, cw[c], LH, 'F');
        doc.text(cols[c], hx + 1, atY);
        hx += cw[c];
      }
      return atY + LH;
    }

    y = drawHeader(y);

    // Lignes
    var sorted = sortStudents(window.students || []);
    doc.setFont(FONT, 'normal');

    for (var i = 0; i < sorted.length; i++) {
      var cp = checkPage(doc, y, LH + 2);
      y = cp.y;
      // FIX #11 : re-dessiner l'en-tête après saut de page
      if (cp.isNew) {
        y = drawHeader(y);
        doc.setFont(FONT, 'normal');
      }

      var s = sorted[i];
      // FIX #1 : épreuves MFER
      var e31 = calcNote(s.code, 'E31');
      var e32 = calcNote(s.code, 'E32');
      var e33 = calcNote(s.code, 'E33');

      // Alternance de fond
      if (i % 2 === 0) {
        doc.setFillColor(240, 240, 245);
        doc.rect(MG, y - 4, totalW, LH, 'F');
      }

      var x = MG;
      var vals = [
        String(i + 1), s.nom || '', s.prenom || '', s.classe || '',
        e31.note.toFixed(1), e32.note.toFixed(1), e33.note.toFixed(1),
        e31.elig ? 'Oui' : 'Non', e32.elig ? 'Oui' : 'Non', e33.elig ? 'Oui' : 'Non'
      ];
      // Index des colonnes de note et éligibilité pour coloration
      var noteResults = [
        { idx: 4, note: e31.note, elig: e31.elig },
        { idx: 5, note: e32.note, elig: e32.elig },
        { idx: 6, note: e33.note, elig: e33.elig }
      ];
      var eligResults = [
        { idx: 7, elig: e31.elig },
        { idx: 8, elig: e32.elig },
        { idx: 9, elig: e33.elig }
      ];

      doc.setFontSize(8);
      for (var c = 0; c < vals.length; c++) {
        // Couleur contextuelle
        var nr = noteResults.find(function (n) { return n.idx === c; });
        var er = eligResults.find(function (n) { return n.idx === c; });
        if (nr) {
          doc.setTextColor.apply(doc, nr.note >= 10 ? VERT : ROUGE);
        } else if (er) {
          doc.setTextColor.apply(doc, er.elig ? VERT : ROUGE);
        } else {
          doc.setTextColor.apply(doc, NOIR);
        }
        doc.text(String(vals[c]), x + 1, y);
        x += cw[c];
      }
      y += LH;
    }
    doc.setTextColor.apply(doc, NOIR);
  }

  /* ── Page Statistiques ────────────────────────────────────── */

  function pageStatistiques(doc) {
    doc.addPage();
    var y = MH;
    var sts = window.students || [];
    var total = sts.length;

    doc.setFontSize(13);
    doc.setFont(FONT, 'bold');
    doc.setTextColor.apply(doc, BLEU);
    doc.text('Statistiques g\u00e9n\u00e9rales', MG, y);
    y += 12;

    // FIX #1/#3 : calcul des agrégats pour E31/E32/E33
    var nbElig = { E31: 0, E32: 0, E33: 0 };
    var somme  = { E31: 0, E32: 0, E33: 0 };
    var distrib = { PM: 0, M: 0, EC: 0, NE: 0, NA: 0 };

    sts.forEach(function (s) {
      EPREUVES.forEach(function (ep) {
        var e = calcNote(s.code, ep.key);
        if (e.elig) nbElig[ep.key]++;
        somme[ep.key] += e.note;
        // Distribution des niveaux sur toutes les compétences
        if (e.det) {
          e.det.forEach(function (d) {
            if (d.lv && distrib.hasOwnProperty(d.lv)) distrib[d.lv]++;
          });
        }
      });
    });

    doc.setFontSize(10);
    doc.setFont(FONT, 'normal');
    doc.setTextColor.apply(doc, NOIR);

    var stats = [['Effectif total', total + ' \u00e9l\u00e8ves']];
    EPREUVES.forEach(function (ep) {
      stats.push([
        '\u00c9ligibles ' + ep.key,
        total ? Math.round(nbElig[ep.key] / total * 100) + ' %' : '\u2014'
      ]);
      stats.push([
        'Moyenne ' + ep.key,
        total ? (somme[ep.key] / total).toFixed(1) + ' / 20' : '\u2014'
      ]);
    });

    for (var i = 0; i < stats.length; i++) {
      doc.setFont(FONT, 'bold');
      doc.text(stats[i][0] + ' :', MG, y);
      doc.setFont(FONT, 'normal');
      doc.text(stats[i][1], MG + 55, y);
      y += 8;
    }

    // Distribution des niveaux
    y += 6;
    doc.setFontSize(11);
    doc.setFont(FONT, 'bold');
    doc.setTextColor.apply(doc, BLEU);
    doc.text('Distribution des niveaux (toutes comp\u00e9tences)', MG, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont(FONT, 'normal');
    doc.setTextColor.apply(doc, NOIR);
    var niveaux = [
      { key: 'PM', label: 'Pleinement Ma\u00eetris\u00e9 (PM)' },
      { key: 'M',  label: 'Ma\u00eetris\u00e9 (M)' },
      { key: 'EC', label: 'En Cours (EC)' },
      { key: 'NA', label: 'Non Acquis (NA)' },
      { key: 'NE', label: 'Non \u00c9valu\u00e9 (NE)' }
    ];
    for (var n = 0; n < niveaux.length; n++) {
      doc.text(niveaux[n].label + ' : ' + (distrib[niveaux[n].key] || 0), MG + 4, y);
      y += 7;
    }
  }

  /* ── Page NE Structurels ──────────────────────────────────── */

  function pageNEStructurels(doc) {
    if (!window.imposModule) return; // module non chargé → on saute
    doc.addPage();
    var y = MH;
    doc.setFontSize(13);
    doc.setFont(FONT, 'bold');
    doc.setTextColor.apply(doc, BLEU);
    doc.text('NE Structurels \u2014 Impossibilit\u00e9s PFMP', MG, y);
    y += 10;

    var found = false;
    var sorted = sortStudents(window.students || []);
    doc.setFontSize(9);

    sorted.forEach(function (s) {
      // FIX #2 : concaténer les compétences des 3 épreuves MFER
      var comps = [];
      EPREUVES.forEach(function (ep) { comps = comps.concat(getComps(ep)); });
      var neList = [];
      comps.forEach(function (c) {
        if (window.imposModule.isNEStructurel && window.imposModule.isNEStructurel(s.code, c.code)) {
          neList.push(c.code + ' \u2014 ' + (c.nom || c.full || ''));
        }
      });
      if (neList.length === 0) return;

      found = true;
      var cp = checkPage(doc, y, 12 + neList.length * 5);
      y = cp.y;
      doc.setTextColor.apply(doc, NOIR);
      doc.setFont(FONT, 'bold');
      doc.text(s.nom + ' ' + (s.prenom || '') + ' (' + (s.classe || '') + ')', MG, y);
      y += 6;
      doc.setFont(FONT, 'normal');
      doc.setTextColor.apply(doc, GRIS);
      for (var j = 0; j < neList.length; j++) {
        doc.text('\u2022 ' + neList[j], MG + 4, y);
        y += 5;
      }
      y += 3;
    });

    if (!found) {
      doc.setFontSize(10);
      doc.setTextColor.apply(doc, GRIS);
      doc.text('Aucun NE structurel recens\u00e9.', MG, y);
    }
  }

  /* ── generate() — Rapport d'inspection complet ────────────── */

  function generate() {
    var jsPDF = (window.jspdf || {}).jsPDF;
    if (!jsPDF) { if(typeof toast==='function')toast('jsPDF non disponible','err');return; }

    // FIX #7 : try/catch global pour éviter la perte totale en cas d'erreur
    try {
      var doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      pageCouverture(doc);
      pageTableau(doc);
      pageStatistiques(doc);
      pageNEStructurels(doc);
      addFooters(doc);

      var session = (window.appCfg || {}).session || 'CCF';
      doc.save('Rapport_Inspection_MFER_' + session + '.pdf');
    } catch (err) {
      console.error('[rapport-pdf] Erreur génération rapport :', err);
      if (typeof toast === 'function') {
        toast('Erreur lors de la génération du rapport PDF', 'err');
      } else {
        if(typeof toast==='function')toast('Erreur génération rapport PDF','err');
      }
    }
  }

  /* ══════════════════════════════════════════════════════════════
     FICHE INDIVIDUELLE ÉLÈVE (generateStudentPDF)
     ══════════════════════════════════════════════════════════════ */

  function generateStudentPDF(code) {
    var jsPDF = (window.jspdf || {}).jsPDF;
    if (!jsPDF) { if(typeof toast==='function')toast('jsPDF non disponible','err');return; }

    var s = (window.students || []).find(function (e) { return e.code === code; });
    if (!s) { if(typeof toast==='function')toast('Élève introuvable','err');return; }

    // FIX #7 : try/catch global
    try {
      var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      var cfg = window.appCfg || {};
      var y = MH;

      /* ── En-tête ──────────────────────────────────────────── */
      doc.setFontSize(10);
      doc.setFont(FONT, 'normal');
      doc.setTextColor.apply(doc, GRIS);
      doc.text('Acad\u00e9mie : ' + (cfg.academie || '\u2014'), MG, y);
      doc.text('Session : ' + String(cfg.session || '\u2014'),
        doc.internal.pageSize.getWidth() - MD, y, { align: 'right' });
      y += 6;
      doc.text('\u00c9tablissement : ' + (cfg.etablissement || '\u2014'), MG, y);
      y += 10;

      doc.setFontSize(14);
      doc.setFont(FONT, 'bold');
      doc.setTextColor.apply(doc, BLEU);
      doc.text('Fiche CCF \u2014 ' + (s.nom || '') + ' ' + (s.prenom || ''), MG, y);
      y += 6;
      doc.setFontSize(10);
      doc.setFont(FONT, 'normal');
      doc.setTextColor.apply(doc, NOIR);
      doc.text('Classe : ' + (s.classe || '\u2014') + '  \u2022  R\u00e9f\u00e9rentiel : Bac Pro MFER', MG, y);
      y += 10;

      /* ── Tableau d'une épreuve ─────────────────────────────── */
      function renderEpreuve(epKey, label, comps) {
        var cp = checkPage(doc, y, 20);
        y = cp.y;
        doc.setFontSize(12);
        doc.setFont(FONT, 'bold');
        doc.setTextColor.apply(doc, BLEU);
        doc.text(label, MG, y);
        y += 8;

        // En-têtes colonnes
        var hdr = ['Code', 'Comp\u00e9tence', 'Poids', 'Niveau', 'Valid\u00e9e', 'Points'];
        var tw = [16, 52, 14, 22, 18, 22];
        doc.setFontSize(8);
        doc.setFont(FONT, 'bold');
        doc.setTextColor(255, 255, 255);
        doc.setFillColor.apply(doc, BLEU);
        var x = MG;
        for (var h = 0; h < hdr.length; h++) {
          doc.rect(x, y - 4, tw[h], LH, 'F');
          doc.text(hdr[h], x + 1, y);
          x += tw[h];
        }
        y += LH;

        // Calcul des notes — FIX #1 : épreuves MFER
        var e = calcNote(code, epKey);
        var nData = ((window.notes || {})[code] || {})[epKey] || {};
        var validees = nData.validees || {};

        doc.setFont(FONT, 'normal');
        for (var i = 0; i < e.det.length; i++) {
          cp = checkPage(doc, y, LH + 2);
          y = cp.y;
          var d = e.det[i];
          var comp = comps.find(function (c) { return c.code === d.code; }) || {};

          // Fond alterné
          if (i % 2 === 0) {
            doc.setFillColor(245, 245, 250);
            doc.rect(MG, y - 4, pw(doc), LH, 'F');
          }

          doc.setTextColor.apply(doc, NOIR);
          x = MG;
          var isValidee = !!validees[d.code];
          var row = [
            d.code,
            (d.nom || comp.nom || comp.full || '').substring(0, 28),
            String(comp.poids != null ? comp.poids : '') + (comp.obl ? '*' : ''),
            d.lv || 'NE',
            isValidee ? '\u2713' : '\u2014',
            d.pts + ' / ' + d.max
          ];
          for (var r = 0; r < row.length; r++) {
            // Couleur du niveau
            if (r === 3) {
              var niv = row[r];
              if (niv === 'PM' || niv === 'M') doc.setTextColor.apply(doc, VERT);
              else if (niv === 'NE' || niv === 'NA') doc.setTextColor.apply(doc, ROUGE);
              else doc.setTextColor.apply(doc, NOIR);
            } else if (r === 4) {
              doc.setTextColor.apply(doc, isValidee ? VERT : GRIS);
            } else {
              doc.setTextColor.apply(doc, NOIR);
            }
            doc.text(String(row[r]), x + 1, y);
            x += tw[r];
          }
          y += LH;
        }

        // Total de l'épreuve
        y += 2;
        doc.setFont(FONT, 'bold');
        doc.setTextColor.apply(doc, NOIR);
        doc.text('Note propos\u00e9e : ' + e.note.toFixed(1) + ' / 20', MG, y);
        var nf = nData.note_finale;
        doc.text('Note valid\u00e9e : ' + (nf != null ? Number(nf).toFixed(1) : '\u2014') + ' / 20',
          MG + 70, y);
        y += 6;
        doc.setFont(FONT, 'normal');
        doc.setTextColor.apply(doc, e.elig ? VERT : ROUGE);
        doc.text(e.elig ? '\u00c9ligible' : 'Non \u00e9ligible', MG, y);
        doc.setTextColor.apply(doc, NOIR);
        y += 10;
      }

      // FIX #1/#3 : les 3 épreuves MFER
      EPREUVES.forEach(function (ep) {
        renderEpreuve(ep.key, ep.label + ' (coeff. ' + ep.coeff + ')', getComps(ep));
      });

      /* ── Bilan PFMP (impossibilités + rattrapage) ──────────── */
      if (window.imposModule || window.tacheModule) {
        cp = checkPage(doc, y, 30);
        y = cp.y;
        doc.setFontSize(11);
        doc.setFont(FONT, 'bold');
        doc.setTextColor.apply(doc, BLEU);
        doc.text('Bilan PFMP', MG, y);
        y += 8;
        doc.setFontSize(9);
        doc.setFont(FONT, 'normal');
        doc.setTextColor.apply(doc, NOIR);

        // Impossibilités
        if (window.imposModule) {
          ['pfmp1', 'pfmp2'].forEach(function (pn) {
            var num = pn.replace('pfmp', '');
            if (window.imposModule.has && window.imposModule.has(code, num)) {
              var cp2 = checkPage(doc, y, 12);
              y = cp2.y;
              doc.setFont(FONT, 'bold');
              doc.text('Impossibilit\u00e9s ' + pn.toUpperCase() + ' :', MG, y);
              y += 5;
              doc.setFont(FONT, 'normal');
              var pd = getPfmp(code).impossibilites || {};
              var imp = pd[pn] || {};
              if (imp.commentaire) {
                doc.text(String(imp.commentaire).substring(0, 90), MG + 4, y);
                y += 5;
              }
            }
          });
        }

        // Tâche complexe / oral rattrapage
        if (window.tacheModule && window.tacheModule.hasRattrapage && window.tacheModule.hasRattrapage(code)) {
          var cp3 = checkPage(doc, y, 14);
          y = cp3.y;
          doc.setFont(FONT, 'bold');
          doc.text('Oral de rattrapage (t\u00e2che complexe) :', MG, y);
          y += 5;
          doc.setFont(FONT, 'normal');
          var lvs = window.tacheModule.getLevels ? window.tacheModule.getLevels(code) : {};
          var lvArr = [];
          for (var lk in lvs) { if (lvs.hasOwnProperty(lk)) lvArr.push(lk + ' : ' + lvs[lk]); }
          if (lvArr.length) { doc.text(lvArr.join(', '), MG + 4, y); y += 5; }
        }
        y += 6;
      }

      /* ── Évaluation tuteur (si disponible) ───────────────── */
      var pfmp = getPfmp(code);
      if (pfmp.evalTuteur) {
        var et = pfmp.evalTuteur;
        ['pfmp1', 'pfmp2'].forEach(function (pn) {
          if (!et[pn] || !et[pn].validee) return;
          var cp4 = checkPage(doc, y, 35);
          y = cp4.y;
          doc.setFontSize(11);
          doc.setFont(FONT, 'bold');
          doc.setTextColor.apply(doc, BLEU);
          doc.text('\u00c9valuation tuteur \u2014 ' + pn.toUpperCase(), MG, y);
          y += 8;
          doc.setFontSize(9);
          doc.setFont(FONT, 'normal');
          doc.setTextColor.apply(doc, NOIR);

          // Critères globaux
          var crit = et[pn].criteres || {};
          var critLabels = {
            assiduite: 'Assiduit\u00e9',
            initiative: 'Initiative',
            qualite: 'Qualit\u00e9 du travail',
            comportement: 'Comportement'
          };
          for (var ck in critLabels) {
            if (critLabels.hasOwnProperty(ck) && crit[ck] != null) {
              // FIX #9 : clamp la valeur entre 0 et 5
              var stars = clamp(crit[ck], 0, 5);
              doc.text(
                critLabels[ck] + ' : ' + '\u2605'.repeat(stars) + '\u2606'.repeat(5 - stars),
                MG + 4, y
              );
              y += 5;
            }
          }

          // Compétences évaluées par le tuteur
          var tComps = et[pn].competences || {};
          var compArr = [];
          for (var cc in tComps) {
            if (tComps.hasOwnProperty(cc)) compArr.push(cc + ' : ' + tComps[cc]);
          }
          if (compArr.length) {
            doc.text('Comp\u00e9tences : ' + compArr.join(', ').substring(0, 120), MG + 4, y);
            y += 5;
          }

          // Appréciation
          if (et[pn].appreciation) {
            var cp5 = checkPage(doc, y, 10);
            y = cp5.y;
            doc.text('Appr\u00e9ciation : ' + String(et[pn].appreciation).substring(0, 100), MG + 4, y);
            y += 5;
          }

          // Tuteur
          if (et[pn].tuteurNom) {
            doc.text('Tuteur : ' + et[pn].tuteurNom, MG + 4, y);
            y += 5;
          }
          y += 4;
        });
      }

      /* ── Bloc jury (si disponible) ─────────────────────────── */
      if (window.juryModule) {
        var cp6 = checkPage(doc, y, 40);
        y = cp6.y;
        doc.setFontSize(11);
        doc.setFont(FONT, 'bold');
        doc.setTextColor.apply(doc, BLEU);
        doc.text('Jury', MG, y);
        y += 8;
        doc.setFontSize(9);
        doc.setFont(FONT, 'normal');
        doc.setTextColor.apply(doc, NOIR);

        var jurys = ['atelier', 'pfmp', 'retour'];
        for (var j = 0; j < jurys.length; j++) {
          var info = window.juryModule.getForPDF ? window.juryModule.getForPDF(jurys[j]) : null;
          if (!info || !info.membres || !info.membres.length) continue;
          var cp7 = checkPage(doc, y, 10 + info.membres.length * 10);
          y = cp7.y;
          doc.setFont(FONT, 'bold');
          doc.text((info.type || jurys[j]) + ' \u2014 ' + (info.date || '\u2014'), MG, y);
          y += 6;
          doc.setFont(FONT, 'normal');
          for (var m = 0; m < info.membres.length; m++) {
            var mb = info.membres[m];
            doc.text((mb.nom || '') + ' (' + (mb.qualite || '') + ', ' + (mb.statut || '') + ')', MG + 4, y);
            // Zone signature (cadre)
            doc.setDrawColor.apply(doc, GRIS);
            doc.rect(MG + 100, y - 4, 60, 8);
            doc.setFontSize(7);
            doc.setTextColor.apply(doc, GRIS);
            doc.text('Signature', MG + 102, y - 1);
            doc.setFontSize(9);
            doc.setTextColor.apply(doc, NOIR);

            // Si signature canvas disponible
            if (window.sigModule && window.sigModule.get) {
              var sigData = window.sigModule.get(code, jurys[j] + '_' + m);
              if (sigData) {
                try { doc.addImage(sigData, 'PNG', MG + 100, y - 4, 60, 8); } catch (e) {
                  console.warn('[rapport-pdf] Image signature invalide :', e.message);
                }
              }
            }
            y += 10;
          }
          y += 4;
        }
      }

      /* ── Observations (avec espace signature) ──────────────── */
      var cp8 = checkPage(doc, y, 50);
      y = cp8.y;
      doc.setFontSize(10);
      doc.setFont(FONT, 'bold');
      doc.setTextColor.apply(doc, BLEU);
      doc.text('Observations du jury', MG, y);
      y += 8;
      doc.setDrawColor.apply(doc, GRIS);
      doc.rect(MG, y - 4, pw(doc), 30);

      // FIX #2/#5 : observations basées sur les épreuves MFER avec guard sur getObs
      var allObs = [];
      if (typeof window.getObs === 'function') {
        EPREUVES.forEach(function (ep) {
          var comps = getComps(ep);
          comps.forEach(function (comp) {
            var o = window.getObs(code, ep.key, comp.code);
            if (o) allObs.push(comp.code + ' : ' + o);
          });
        });
      }
      if (allObs.length) {
        doc.setFontSize(7);
        doc.setFont(FONT, 'normal');
        doc.setTextColor.apply(doc, GRIS);
        var obsY = y;
        allObs.slice(0, 5).forEach(function (o) {
          doc.text(String(o).substring(0, 100), MG + 2, obsY);
          obsY += 4;
        });
      } else {
        doc.setFontSize(8);
        doc.setFont(FONT, 'normal');
        doc.setTextColor.apply(doc, GRIS);
        doc.text('(espace r\u00e9serv\u00e9 aux observations du jury)', MG + 2, y + 2);
      }
      y += 34;

      /* ── Signatures finales ──────────────────────────────────── */
      var cp9 = checkPage(doc, y, 30);
      y = cp9.y;
      doc.setFontSize(9);
      doc.setFont(FONT, 'normal');
      doc.setTextColor.apply(doc, NOIR);

      var sigX1 = MG, sigX2 = MG + pw(doc) / 2 + 5;
      doc.text('Le pr\u00e9sident du jury :', sigX1, y);
      doc.text('Date :', sigX2, y);
      y += 4;
      doc.setDrawColor.apply(doc, GRIS);
      doc.rect(sigX1, y, pw(doc) / 2 - 5, 18);
      doc.rect(sigX2, y, pw(doc) / 2 - 5, 18);
      y += 22;

      doc.text('Le candidat (signature) :', sigX1, y);
      doc.text('L\'\u00e9valuateur :', sigX2, y);
      y += 4;
      doc.rect(sigX1, y, pw(doc) / 2 - 5, 18);
      doc.rect(sigX2, y, pw(doc) / 2 - 5, 18);

      // Insérer signature candidat si disponible (FIX #4 : accès sécurisé)
      var sigs = getPfmp(code).signatures || {};
      if (sigs.candidat) {
        try { doc.addImage(sigs.candidat, 'PNG', sigX1 + 1, y + 1, pw(doc) / 2 - 7, 16); } catch (e) {
          console.warn('[rapport-pdf] Image signature candidat invalide :', e.message);
        }
      }

      /* ── Footers et sauvegarde ─────────────────────────────── */
      addFooters(doc);
      doc.save('CCF_MFER_' + (s.nom || 'Eleve') + '_' + (s.prenom || '') + '.pdf');

    } catch (err) {
      console.error('[rapport-pdf] Erreur génération fiche élève :', err);
      if (typeof toast === 'function') {
        toast('Erreur lors de la génération du PDF élève', 'err');
      } else {
        if(typeof toast==='function')toast('Erreur génération PDF élève','err');
      }
    }
  }

  /* ── API publique ─────────────────────────────────────────── */
  return {
    generate:           generate,
    generateStudentPDF: generateStudentPDF
  };

})();
