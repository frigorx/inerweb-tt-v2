/**
 * impossibilites.js — Module de gestion des impossibilités PFMP pour le CCF
 *
 * Quand un élève ne peut pas être évalué en PFMP (tuteur absent, activités
 * non conformes, etc.), on documente les motifs ici. Cela détermine si un NE
 * est structurel (lié à la PFMP) ou pédagogique (manque de l'élève).
 *
 * Données stockées dans pfmpData[code].impossibilites
 */
window.imposModule = (function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /*  Constantes — 8 motifs prédéfinis                                  */
  /* ------------------------------------------------------------------ */
  var MOTIFS = [
    { id: 1, libelle: 'Tuteur indisponible / itinérant',          icone: '👤' },
    { id: 2, libelle: 'Tuteur refuse le rôle d\'évaluateur',      icone: '🚫' },
    { id: 3, libelle: 'Activités non conformes au référentiel',   icone: '📋' },
    { id: 4, libelle: 'Tâches périphériques uniquement',          icone: '🔧' },
    { id: 5, libelle: 'Manipulations interdites (F-GAZ/habilit.)',icone: '⚡' },
    { id: 6, libelle: 'Chantier mobile / accès impossible',       icone: '🏗️' },
    { id: 7, libelle: 'Document tuteur non retourné',             icone: '📄' },
    { id: 8, libelle: 'Stage non effectué / annulé',              icone: '❌' }
  ];

  /* ------------------------------------------------------------------ */
  /*  init — Initialise la structure impossibilités pour un élève       */
  /* ------------------------------------------------------------------ */
  function init(code) {
    if (!pfmpData[code]) return;
    if (pfmpData[code].impossibilites) return;
    pfmpData[code].impossibilites = {};
  }

  /* ------------------------------------------------------------------ */
  /*  _ensure — Garantit l'existence de l'entrée pour une PFMP donnée   */
  /* ------------------------------------------------------------------ */
  function _ensure(code, pfmpNum) {
    init(code);
    var key = 'pfmp' + pfmpNum;
    if (!pfmpData[code].impossibilites[key]) {
      pfmpData[code].impossibilites[key] = { motifs: [], commentaire: '' };
    }
    return pfmpData[code].impossibilites[key];
  }

  /* ------------------------------------------------------------------ */
  /*  _motifById — Retrouve un motif par son id                         */
  /* ------------------------------------------------------------------ */
  function _motifById(id) {
    for (var i = 0; i < MOTIFS.length; i++) {
      if (MOTIFS[i].id === id) return MOTIFS[i];
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /*  save — Enregistre les impossibilités pour une PFMP                */
  /* ------------------------------------------------------------------ */
  function save(code, pfmpNum, motifs, commentaire) {
    var data = _ensure(code, pfmpNum);
    data.motifs = motifs || [];
    data.commentaire = (commentaire || '').trim();
    saveLocal();
    toast('Impossibilités enregistrées');
  }

  /* ------------------------------------------------------------------ */
  /*  has — Retourne true si des impossibilités sont déclarées          */
  /* ------------------------------------------------------------------ */
  function has(code, pfmpNum) {
    init(code);
    var key = 'pfmp' + pfmpNum;
    var entry = pfmpData[code].impossibilites
              ? pfmpData[code].impossibilites[key]
              : null;
    return entry ? entry.motifs.length > 0 : false;
  }

  /* ------------------------------------------------------------------ */
  /*  renderChips — HTML des chips pour les motifs actifs                */
  /* ------------------------------------------------------------------ */
  function renderChips(code, pfmpNum) {
    init(code);
    var key = 'pfmp' + pfmpNum;
    var entry = pfmpData[code].impossibilites
              ? pfmpData[code].impossibilites[key]
              : null;
    if (!entry || entry.motifs.length === 0) return '';

    var html = '';
    for (var i = 0; i < entry.motifs.length; i++) {
      var m = _motifById(entry.motifs[i]);
      if (m) {
        html += '<span class="chip chip-warning" title="' + m.libelle + '">'
              + m.icone + ' ' + m.libelle + '</span> ';
      }
    }
    return html;
  }

  /* ------------------------------------------------------------------ */
  /*  isNEStructurel — Le NE de cette compétence est-il dû à une       */
  /*  impossibilité PFMP (structurel) plutôt qu'un manque pédagogique ? */
  /* ------------------------------------------------------------------ */
  function isNEStructurel(code, comp) {
    init(code);
    var impos = pfmpData[code].impossibilites;
    if (!impos) return false;

    // On parcourt toutes les PFMP déclarées pour cet élève
    var keys = Object.keys(impos);
    for (var i = 0; i < keys.length; i++) {
      var entry = impos[keys[i]];
      if (entry.motifs.length > 0) {
        // Si au moins une PFMP présente une impossibilité,
        // le NE de la compétence est considéré structurel
        return true;
      }
    }
    return false;
  }

  /* ------------------------------------------------------------------ */
  /*  showModal — Affiche la modale de saisie des impossibilités        */
  /* ------------------------------------------------------------------ */
  function showModalImpos(code, pfmpNum) {
    var data = _ensure(code, pfmpNum);

    // Construction du contenu de la modale
    var body = '<form id="form-impos">';
    body += '<p style="margin-bottom:12px"><strong>PFMP ' + pfmpNum + '</strong> — '
          + 'Cochez les motifs d\'impossibilité d\'évaluation :</p>';

    // Checkboxes pour chaque motif
    for (var i = 0; i < MOTIFS.length; i++) {
      var m = MOTIFS[i];
      var checked = data.motifs.indexOf(m.id) !== -1 ? ' checked' : '';
      body += '<label style="display:block;margin:6px 0;cursor:pointer">'
            + '<input type="checkbox" class="impos-cb" value="' + m.id + '"' + checked + '> '
            + m.icone + ' ' + m.libelle
            + '</label>';
    }

    // Zone commentaire libre
    body += '<label style="display:block;margin-top:14px"><strong>Commentaire :</strong></label>';
    body += '<textarea id="impos-comment" rows="3" '
          + 'style="width:100%;margin-top:4px;resize:vertical">'
          + (data.commentaire || '')
          + '</textarea>';

    // Bouton enregistrer
    body += '<div style="text-align:right;margin-top:14px">'
          + '<button type="button" id="btn-save-impos" class="btn btn-primary">'
          + 'Enregistrer</button></div>';
    body += '</form>';

    // Affichage via la modale globale
    showModal('Impossibilités PFMP', body);

    // Écoute du clic sur Enregistrer (délai pour laisser le DOM se rendre)
    setTimeout(function () {
      var btn = document.getElementById('btn-save-impos');
      if (!btn) return;
      btn.addEventListener('click', function () {
        var cbs = document.querySelectorAll('.impos-cb');
        var motifs = [];
        for (var j = 0; j < cbs.length; j++) {
          if (cbs[j].checked) motifs.push(parseInt(cbs[j].value, 10));
        }
        var commentaire = (document.getElementById('impos-comment') || {}).value || '';
        save(code, pfmpNum, motifs, commentaire);
        closeModal();
      });
    }, 50);
  }

  /* ------------------------------------------------------------------ */
  /*  API publique                                                      */
  /* ------------------------------------------------------------------ */
  return {
    MOTIFS:          MOTIFS,
    init:            init,
    showModal:       showModalImpos,
    save:            save,
    has:             has,
    renderChips:     renderChips,
    isNEStructurel:  isNEStructurel
  };

})();
