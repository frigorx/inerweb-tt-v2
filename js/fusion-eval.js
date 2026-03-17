/**
 * fusion-eval.js — Fusion non-destructive des évaluations entre collègues
 *
 * Principe STACK NEVER OVERWRITE :
 *   - Les observations s'empilent (concaténation)
 *   - Les niveaux de critères : la valeur la plus récente gagne
 *   - Les entrées de journal s'accumulent
 *   - Les nouvelles données complètent, jamais d'écrasement
 *
 * Globales attendues : students, validations, notes, saveLocal(), toast(), showModal(), closeModal()
 */
window.fusionModule = (function () {
  'use strict';

  // ── Utilitaires ──────────────────────────────────────────────

  /** Clé normalisée pour matcher un élève (nom+prénom, casse ignorée) */
  function cleEleve(e) {
    return ((e.nom || '') + '|' + (e.prenom || '')).toLowerCase().trim();
  }

  /** Vérifie qu'un objet ressemble à un backup valide */
  function estBackupValide(data) {
    return data && typeof data === 'object' && Array.isArray(data.students);
  }

  // ── Zone de dépôt ────────────────────────────────────────────

  /**
   * Affiche une zone de glisser-déposer dans le conteneur donné.
   * Accepte des fichiers JSON (backup d'un collègue).
   * @param {HTMLElement} container
   */
  function renderDropZone(container) {
    if (!container) return;

    var zone = document.createElement('div');
    zone.className = 'fusion-dropzone';
    zone.innerHTML =
      '<span class="fusion-dropzone-icon">🔀</span>' +
      '<span class="fusion-dropzone-text">Déposer le backup JSON d\'un collègue</span>';

    // Styles en ligne pour autonomie du module
    Object.assign(zone.style, {
      border: '2px dashed #999',
      borderRadius: '10px',
      padding: '32px 16px',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'border-color 0.2s, background 0.2s',
      margin: '12px 0',
      fontSize: '15px',
      color: '#555',
      background: '#fafafa'
    });

    // Feedback visuel au survol
    function survolOn(e) {
      e.preventDefault();
      e.stopPropagation();
      zone.style.borderColor = '#e67e22';
      zone.style.background = '#fff5eb';
    }
    function survolOff(e) {
      e.preventDefault();
      e.stopPropagation();
      zone.style.borderColor = '#999';
      zone.style.background = '#fafafa';
    }

    zone.addEventListener('dragenter', survolOn);
    zone.addEventListener('dragover', survolOn);
    zone.addEventListener('dragleave', survolOff);
    zone.addEventListener('drop', function (e) {
      survolOff(e);
      traiterFichier(e.dataTransfer.files);
    });

    // Clic pour ouvrir le sélecteur de fichier
    zone.addEventListener('click', function () {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.addEventListener('change', function () {
        traiterFichier(input.files);
      });
      input.click();
    });

    container.appendChild(zone);
  }

  /** Lit le fichier déposé et lance la fusion */
  function traiterFichier(fileList) {
    if (!fileList || !fileList.length) return;
    var fichier = fileList[0];

    if (!fichier.name.toLowerCase().endsWith('.json')) {
      toast && toast('Seuls les fichiers JSON sont acceptés.', 'error');
      return;
    }

    var lecteur = new FileReader();
    lecteur.onload = function (e) {
      try {
        var data = JSON.parse(e.target.result);
        if (!estBackupValide(data)) {
          toast && toast('Le fichier ne contient pas de backup valide.', 'error');
          return;
        }
        var rapport = merge(data);
        showReport(rapport);
      } catch (err) {
        console.error('[fusion-eval] Erreur de lecture JSON :', err);
        toast && toast('Impossible de lire le fichier JSON.', 'error');
      }
    };
    lecteur.readAsText(fichier);
  }

  // ── Fusion des données ───────────────────────────────────────

  /**
   * Fusionne les données importées avec les données locales.
   * @param {Object} importData — backup du collègue
   * @returns {{matchedCount, updatedCount, skippedCount, details: Array}}
   */
  function merge(importData) {
    var rapport = { matchedCount: 0, updatedCount: 0, skippedCount: 0, details: [] };

    // Index local par clé nom+prénom
    var indexLocal = {};
    (window.students || []).forEach(function (s, i) {
      indexLocal[cleEleve(s)] = i;
    });

    (importData.students || []).forEach(function (impEleve) {
      var cle = cleEleve(impEleve);
      var idxLocal = indexLocal[cle];

      if (idxLocal === undefined) {
        // Élève non trouvé localement → on ignore
        rapport.skippedCount++;
        rapport.details.push({ eleve: (impEleve.nom || '') + ' ' + (impEleve.prenom || ''), action: 'ignoré — introuvable localement' });
        console.warn('[fusion-eval] Élève ignoré (pas de correspondance) :', cle);
        return;
      }

      rapport.matchedCount++;
      var modifie = false;
      var local = window.students[idxLocal];
      var detailActions = [];

      // (a) Validations : même compétence+critère → garder le plus récent ; sinon ajouter
      if (Array.isArray(importData.validations)) {
        var valsImp = importData.validations.filter(function (v) { return cleEleve(v) === cle || v.eleveIndex === cle; });
        if (!window.validations) window.validations = [];

        valsImp.forEach(function (vi) {
          var existe = window.validations.find(function (vl) {
            return cleEleve(vl) === cle && vl.competence === vi.competence && vl.critere === vi.critere;
          });

          if (existe) {
            // Garder le timestamp le plus récent
            if (vi.timestamp && (!existe.timestamp || vi.timestamp > existe.timestamp)) {
              existe.niveau = vi.niveau;
              existe.timestamp = vi.timestamp;
              modifie = true;
              detailActions.push('validation mise à jour : ' + vi.competence + '/' + vi.critere);
            }
          } else {
            window.validations.push(vi);
            modifie = true;
            detailActions.push('validation ajoutée : ' + (vi.competence || '?') + '/' + (vi.critere || '?'));
          }
        });
      }

      // (b) Observations : empiler si différentes (séparateur " | [Collègue] ")
      if (impEleve.observations && impEleve.observations.trim()) {
        var obsLocale = (local.observations || '').trim();
        var obsImport = impEleve.observations.trim();

        if (!obsLocale) {
          local.observations = obsImport;
          modifie = true;
          detailActions.push('observations ajoutées');
        } else if (obsLocale.indexOf(obsImport) === -1) {
          local.observations = obsLocale + ' | [Collègue] ' + obsImport;
          modifie = true;
          detailActions.push('observations empilées');
        }
      }

      // (c) Notes : garder la plus récente
      if (importData.notes) {
        var noteImp = importData.notes[cle] || importData.notes[impEleve.id];
        if (noteImp) {
          if (!window.notes) window.notes = {};
          var noteLocale = window.notes[cle] || window.notes[local.id];
          var cleNote = cle;

          if (!noteLocale || (noteImp.timestamp && (!noteLocale.timestamp || noteImp.timestamp > noteLocale.timestamp))) {
            window.notes[cleNote] = noteImp;
            modifie = true;
            detailActions.push('note mise à jour');
          }
        }
      }

      // (d) Journal : ajouter les entrées manquantes (dédoublonner par timestamp+action)
      if (Array.isArray(impEleve.journal)) {
        if (!local.journal) local.journal = [];

        var clesExistantes = {};
        local.journal.forEach(function (j) {
          clesExistantes[(j.timestamp || '') + '|' + (j.action || '')] = true;
        });

        impEleve.journal.forEach(function (j) {
          var cleJ = (j.timestamp || '') + '|' + (j.action || '');
          if (!clesExistantes[cleJ]) {
            local.journal.push(j);
            modifie = true;
          }
        });

        if (modifie) detailActions.push('entrées de journal ajoutées');
      }

      if (modifie) {
        rapport.updatedCount++;
        rapport.details.push({ eleve: (local.nom || '') + ' ' + (local.prenom || ''), action: detailActions.join(' ; ') });
      }
    });

    // Sauvegarde locale après fusion
    if (rapport.updatedCount > 0 && typeof saveLocal === 'function') {
      saveLocal();
    }

    if (typeof toast === 'function') {
      toast('Fusion terminée : ' + rapport.updatedCount + ' élève(s) mis à jour.', 'success');
    }

    return rapport;
  }

  // ── Rapport de fusion ────────────────────────────────────────

  /**
   * Affiche une modale récapitulative après la fusion.
   * @param {{matchedCount, updatedCount, skippedCount, details}} rapport
   */
  function showReport(rapport) {
    var html = '<h3 style="margin-top:0">Résultat de la fusion</h3>';
    html += '<p><strong>' + rapport.updatedCount + '</strong> élève(s) mis à jour</p>';
    html += '<p><strong>' + rapport.skippedCount + '</strong> élève(s) ignoré(s) (introuvables)</p>';

    if (rapport.details.length) {
      html += '<table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:13px">';
      html += '<tr style="background:#f0f0f0"><th style="text-align:left;padding:4px 8px">Élève</th><th style="text-align:left;padding:4px 8px">Détails</th></tr>';
      rapport.details.forEach(function (d) {
        html += '<tr><td style="padding:4px 8px;border-top:1px solid #ddd">' + d.eleve + '</td>';
        html += '<td style="padding:4px 8px;border-top:1px solid #ddd">' + d.action + '</td></tr>';
      });
      html += '</table>';
    }

    html += '<div style="text-align:right;margin-top:12px">';
    html += '<button onclick="closeModal()" style="padding:6px 18px;cursor:pointer">Fermer</button>';
    html += '</div>';

    if (typeof showModal === 'function') {
      showModal(html);
    } else {
      /* rapport affiché dans la modale ou ignoré */
    }
  }

  // ── API publique ─────────────────────────────────────────────

  return {
    renderDropZone: renderDropZone,
    merge: merge,
    showReport: showReport
  };
})();
