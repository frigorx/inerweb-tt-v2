/**
 * INERWEB TTia — Evaluation Mobile v1.0
 * Dictee vocale + parsing + photo
 * Interface mobile-first pour evaluation en atelier (~10s par eleve)
 */
(function() {
  'use strict';

  // Mapping des termes vocaux vers niveaux
  var NIVEAUX_VOCAUX = {
    'parfaitement maitriser': 'PM', 'parfaitement maitrise': 'PM',
    'parfait': 'PM', 'tres bien': 'PM', 'excellent': 'PM',
    'maitrise': 'M', 'acquis': 'M', 'bien': 'M',
    'en cours': 'EC', 'en cours d\'acquisition': 'EC', 'moyen': 'EC',
    'non acquis': 'NA', 'insuffisant': 'NA',
    'non evalue': 'NE', 'pas evalue': 'NE', 'non note': 'NE'
  };

  // Mapping competences (raccourcis vocaux)
  var COMPETENCES_VOCALES = {
    'soudage': 'C3.4', 'brasage': 'C3.4',
    'centrage': 'C3.5', 'centrer': 'C3.5',
    'supportage': 'C3.3', 'support': 'C3.3',
    'mise en service': 'C4.1', 'diagnostic': 'C4.2',
    'securite': 'C1.1', 'organisation': 'C3.1',
    'reseaux': 'C3.2', 'raccordement': 'C3.2',
    'charge': 'C4.3', 'tirage au vide': 'C4.3',
    'mesure': 'C4.4', 'mesures': 'C4.4',
    'maintenance': 'C4.5', 'entretien': 'C4.5'
  };

  var _currentResult = null;
  var _recognition = null;

  /**
   * Parse le texte dicte pour extraire les evaluations
   * Format attendu : "Prenom competence niveau competence niveau..."
   */
  function parserDictee(texte) {
    if (!texte) return null;

    var result = {
      eleve: null,
      eleveCode: null,
      evaluations: [],
      raw: texte
    };

    // Normaliser (accents simplifies, minuscules)
    var t = texte.toLowerCase().trim()
      .replace(/[éèêë]/g, 'e').replace(/[àâä]/g, 'a')
      .replace(/[ùûü]/g, 'u').replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o');

    var mots = t.split(/\s+/);
    var premierMot = mots[0];

    // Chercher l'eleve dans le mapping local
    if (window.iwIdentity) {
      // Essayer avec le premier mot (prenom)
      var identity = window.iwIdentity.findByPrenom(premierMot);
      if (!identity && mots.length > 1) {
        // Essayer prenom compose (ex: "jean pierre")
        identity = window.iwIdentity.findByPrenom(premierMot + ' ' + mots[1]);
      }
      if (identity) {
        result.eleve = identity.prenom + ' ' + identity.nom;
        result.eleveCode = identity.code;
      } else {
        result.eleve = premierMot;
      }
    } else {
      result.eleve = premierMot;
    }

    // Trouver les competences et niveaux
    var keys = Object.keys(COMPETENCES_VOCALES);
    for (var i = 0; i < keys.length; i++) {
      var motCle = keys[i];
      var idx = t.indexOf(motCle);
      if (idx < 0) continue;

      var codeComp = COMPETENCES_VOCALES[motCle];
      // Chercher le niveau qui suit cette competence
      var suite = t.substring(idx + motCle.length);
      var niveau = null;

      var nivKeys = Object.keys(NIVEAUX_VOCAUX);
      for (var j = 0; j < nivKeys.length; j++) {
        if (suite.indexOf(nivKeys[j]) >= 0) {
          niveau = NIVEAUX_VOCAUX[nivKeys[j]];
          break;
        }
      }

      if (niveau) {
        // Eviter les doublons
        var dejaTrouve = result.evaluations.some(function(e) { return e.competence === codeComp; });
        if (!dejaTrouve) {
          result.evaluations.push({
            competence: codeComp,
            niveau: niveau,
            motCle: motCle
          });
        }
      }
    }

    _currentResult = result;
    return result;
  }

  /**
   * Demarre la reconnaissance vocale (Speech-to-Text natif)
   */
  function startDictee(callback) {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (callback) callback(null, new Error('Speech-to-Text non supporte par ce navigateur'));
      return;
    }

    _recognition = new SpeechRecognition();
    _recognition.lang = 'fr-FR';
    _recognition.continuous = false;
    _recognition.interimResults = true;

    _recognition.onresult = function(event) {
      var transcript = '';
      for (var i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (callback) callback(transcript, null);
    };

    _recognition.onerror = function(event) {
      if (callback) callback(null, new Error('Erreur dictee: ' + event.error));
    };

    _recognition.onend = function() {
      _recognition = null;
    };

    _recognition.start();
  }

  function stopDictee() {
    if (_recognition) {
      _recognition.stop();
      _recognition = null;
    }
  }

  /**
   * Affiche l'interface mobile d'evaluation
   */
  function showInterface(containerId, options) {
    options = options || {};
    var container = document.getElementById(containerId);
    if (!container) return;

    var tpTitre = (options.tp && options.tp.titre) || 'TP du jour';
    var tpClasse = (options.tp && options.tp.classe) || (window.iwState && window.iwState.classeSelectionnee) || '';

    container.innerHTML = ''
      + '<div class="eval-mobile">'
      + '<div class="eval-header">'
      + '<div class="tp-info"><span class="tp-titre">' + tpTitre + '</span>'
      + '<span class="tp-classe">' + tpClasse + '</span></div></div>'

      + '<div class="eval-input-zone">'
      + '<textarea id="eval-dictee" placeholder="Dictez ou tapez : Bachir soudage maitrise centrage parfait..." rows="3"></textarea>'
      + '<div style="display:flex;gap:.5rem;margin-top:.75rem">'
      + '<button id="btn-dictee" class="btn-dictee" style="flex:1;padding:12px;background:#e74c3c;color:#fff;border:none;border-radius:8px;font-size:1rem;font-weight:700;cursor:pointer">🎤 Dicter</button>'
      + '<button id="btn-parse" class="btn-parse" style="flex:1">🔍 Analyser</button>'
      + '</div></div>'

      + '<div id="eval-preview" class="eval-preview" style="display:none">'
      + '<div class="preview-eleve"><span class="label">Eleve :</span>'
      + '<span id="preview-eleve-nom" class="value">&mdash;</span></div>'
      + '<div id="preview-comps" class="preview-comps"></div></div>'

      + '<div class="eval-photo-zone">'
      + '<input type="file" id="eval-photo-input" accept="image/*" capture="environment" style="display:none">'
      + '<button id="btn-photo" class="btn-photo">📷 Photo du travail</button>'
      + '<div id="photo-preview" class="photo-preview"></div></div>'

      + '<div class="eval-actions">'
      + '<button id="btn-valider" class="btn-valider" disabled>✅ Valider</button>'
      + '<button id="btn-suivant" class="btn-suivant">→ Suivant</button>'
      + '</div></div>';

    // Evenements
    var isRecording = false;

    document.getElementById('btn-dictee').onclick = function() {
      var btn = this;
      if (!isRecording) {
        isRecording = true;
        btn.textContent = '🔴 Stop';
        btn.style.background = '#333';
        startDictee(function(transcript, err) {
          if (transcript) {
            document.getElementById('eval-dictee').value = transcript;
            var result = parserDictee(transcript);
            afficherPreview(result);
          }
          if (err) alert(err.message);
        });
      } else {
        isRecording = false;
        btn.textContent = '🎤 Dicter';
        btn.style.background = '#e74c3c';
        stopDictee();
      }
    };

    document.getElementById('btn-parse').onclick = function() {
      var texte = document.getElementById('eval-dictee').value;
      var result = parserDictee(texte);
      afficherPreview(result);
    };

    document.getElementById('btn-photo').onclick = function() {
      document.getElementById('eval-photo-input').click();
    };

    document.getElementById('eval-photo-input').onchange = function(e) {
      var file = e.target.files[0];
      if (file) {
        var reader = new FileReader();
        reader.onload = function(ev) {
          document.getElementById('photo-preview').innerHTML =
            '<img src="' + ev.target.result + '" style="max-width:100%;border-radius:8px;margin-top:.5rem">';
        };
        reader.readAsDataURL(file);
      }
    };

    document.getElementById('btn-valider').onclick = function() {
      validerEvaluation();
    };

    document.getElementById('btn-suivant').onclick = function() {
      reinitialiser();
    };

    // Auto-parse au fur et a mesure (debounce 600ms)
    var timer = null;
    document.getElementById('eval-dictee').oninput = function() {
      clearTimeout(timer);
      timer = setTimeout(function() {
        var texte = document.getElementById('eval-dictee').value;
        if (texte.length > 10) {
          var result = parserDictee(texte);
          afficherPreview(result);
        }
      }, 600);
    };
  }

  function afficherPreview(result) {
    if (!result) return;

    var preview = document.getElementById('eval-preview');
    if (!preview) return;
    preview.style.display = 'block';

    var nomEl = document.getElementById('preview-eleve-nom');
    if (nomEl) nomEl.textContent = result.eleve || '? Non reconnu';
    nomEl.style.color = result.eleveCode ? '#1b3a63' : '#e74c3c';

    var compsDiv = document.getElementById('preview-comps');
    if (!compsDiv) return;

    var html = '';
    for (var i = 0; i < result.evaluations.length; i++) {
      var e = result.evaluations[i];
      html += '<div class="comp-line">'
        + '<span class="comp-code">' + e.competence + '</span>'
        + '<span class="comp-label">' + e.motCle + '</span>'
        + '<div class="niveau-selector">';

      var nivs = ['NE', 'NA', 'EC', 'M', 'PM'];
      for (var j = 0; j < nivs.length; j++) {
        var n = nivs[j];
        html += '<button class="btn-niveau' + (n === e.niveau ? ' selected' : '') + '" '
          + 'data-comp="' + e.competence + '" data-niveau="' + n + '">' + n + '</button>';
      }
      html += '</div></div>';
    }

    if (result.evaluations.length === 0 && result.eleve) {
      html = '<div style="color:#999;font-size:.85rem;padding:.5rem">Aucune competence detectee. Ajoutez des mots-cles (soudage, brasage, centrage...).</div>';
    }

    compsDiv.innerHTML = html;

    // Clic sur boutons niveau pour modifier
    compsDiv.querySelectorAll('.btn-niveau').forEach(function(btn) {
      btn.onclick = function() {
        var comp = this.dataset.comp;
        var niv = this.dataset.niveau;
        // Deselectionner les freres
        this.parentNode.querySelectorAll('.btn-niveau').forEach(function(b) { b.classList.remove('selected'); });
        this.classList.add('selected');
        // Mettre a jour le resultat
        if (_currentResult) {
          for (var k = 0; k < _currentResult.evaluations.length; k++) {
            if (_currentResult.evaluations[k].competence === comp) {
              _currentResult.evaluations[k].niveau = niv;
            }
          }
        }
      };
    });

    // Activer le bouton valider si on a des donnees
    var btnVal = document.getElementById('btn-valider');
    if (btnVal) btnVal.disabled = !result.eleveCode || result.evaluations.length === 0;
  }

  function validerEvaluation() {
    if (!_currentResult || !_currentResult.eleveCode) {
      alert('Eleve non reconnu dans la base');
      return;
    }

    // Construire les donnees anonymisees (code, pas de nom)
    var dataToSend = {
      eleveCode: _currentResult.eleveCode,
      evaluations: _currentResult.evaluations,
      timestamp: new Date().toISOString(),
      photo: getPhotoBase64() ? true : false
    };

    // Sauvegarder en local d'abord
    var localKey = 'iw_eval_mobile_' + Date.now();
    localStorage.setItem(localKey, JSON.stringify(dataToSend));

    // Emettre un evenement pour les autres modules
    document.dispatchEvent(new CustomEvent('iw:evalMobileValidated', { detail: dataToSend }));

    showToast('Evaluation enregistree');
    reinitialiser();
  }

  function getPhotoBase64() {
    var img = document.querySelector('#photo-preview img');
    return img ? img.src : null;
  }

  function reinitialiser() {
    var ta = document.getElementById('eval-dictee');
    if (ta) ta.value = '';
    var prev = document.getElementById('eval-preview');
    if (prev) prev.style.display = 'none';
    var photo = document.getElementById('photo-preview');
    if (photo) photo.innerHTML = '';
    var btnVal = document.getElementById('btn-valider');
    if (btnVal) btnVal.disabled = true;
    _currentResult = null;
  }

  function showToast(msg) {
    var toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#27ae60;color:#fff;padding:12px 24px;border-radius:8px;z-index:9999;font-weight:700;font-size:.95rem;box-shadow:0 4px 16px rgba(0,0,0,.2);';
    document.body.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 2500);
  }

  // API publique
  window.iwEvalMobile = {
    show: showInterface,
    parse: parserDictee,
    startDictee: startDictee,
    stopDictee: stopDictee,
    NIVEAUX: NIVEAUX_VOCAUX,
    COMPETENCES: COMPETENCES_VOCALES
  };

})();
