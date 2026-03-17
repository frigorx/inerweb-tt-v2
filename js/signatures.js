/**
 * signatures.js — Module de signatures numériques canvas pour le CCF
 *
 * Permet au tuteur, au prof évaluateur et au candidat de signer
 * sur écran tactile ou souris. Les signatures sont stockées en
 * data:image/png dans pfmpData[code].signatures.
 *
 * Globales attendues : pfmpData, saveLocal()
 * Globale optionnelle : toast()
 * Expose : window.sigModule { init, render, save, clear, get, hasSignature }
 */
window.sigModule = (function () {
  'use strict';

  /* ── Types de signature autorisés ─────────────────────────── */
  /* FIX #8 : liste blanche pour éviter la pollution de l'objet  */
  var TYPES_VALIDES = [
    'tuteur_pfmp1',
    'tuteur_pfmp2',
    'prof_evaluateur',
    'candidat'
  ];

  /* Seuil de pixels non-blancs pour considérer qu'un trait a été dessiné.
   * Un canvas vierge (fond blanc) a 0 pixel non-blanc.
   * Un simple point ou trait court dépasse largement ce seuil.
   * FIX #6 : empêche la sauvegarde d'une signature vide. */
  var SEUIL_PIXELS_MIN = 50;

  /* ── Helpers défensifs ────────────────────────────────────── */

  /** Accès sécurisé à pfmpData (FIX #3) */
  function _pfmp() {
    return window.pfmpData || {};
  }

  /** Appel sécurisé à saveLocal (FIX #7) */
  function _saveLocal() {
    if (typeof saveLocal === 'function') saveLocal();
  }

  /** Appel sécurisé à toast (FIX #7) */
  function _toast(msg, type) {
    if (typeof toast === 'function') toast(msg, type);
  }

  /** Vérifie que le type est dans la liste blanche (FIX #8) */
  function _typeValide(type) {
    return TYPES_VALIDES.indexOf(type) !== -1;
  }

  /* ── Structure de données ─────────────────────────────────── */

  /**
   * Initialise la structure signatures pour un code donné.
   * Crée pfmpData[code] si absent, puis la sous-structure signatures.
   * FIX #1/#2/#3 : ne fait plus de return silencieux.
   * @param {string} code - Identifiant du candidat
   */
  function init(code) {
    var data = _pfmp();

    // Créer l'entrée élève si absente (évite le crash)
    if (!data[code]) {
      data[code] = {};
    }

    // Créer la sous-structure signatures si absente
    if (!data[code].signatures) {
      data[code].signatures = {
        tuteur_pfmp1: null,
        tuteur_pfmp2: null,
        prof_evaluateur: null,
        candidat: null
      };
    }

    // Migration : ajouter prof_evaluateur si manquant (ancien format)
    if (!data[code].signatures.hasOwnProperty('prof_evaluateur')) {
      data[code].signatures.prof_evaluateur = null;
    }
  }

  /**
   * Retourne le data:image/png ou null.
   * FIX #1 : ne crash plus si pfmpData[code] est absent.
   * @param {string} code
   * @param {string} type - 'tuteur_pfmp1', 'tuteur_pfmp2', 'prof_evaluateur' ou 'candidat'
   * @returns {string|null}
   */
  function get(code, type) {
    if (!_typeValide(type)) return null;
    init(code);
    return _pfmp()[code].signatures[type] || null;
  }

  /**
   * Vérifie si une signature existe (non nulle)
   * @param {string} code
   * @param {string} type
   * @returns {boolean}
   */
  function hasSignature(code, type) {
    return !!get(code, type);
  }

  /**
   * Convertit le canvas en data:image/png et stocke la signature.
   * FIX #5 : try/catch autour de toDataURL (SecurityError possible).
   * FIX #6 : détecte le canvas vierge et refuse l'enregistrement.
   * @param {string} code
   * @param {string} type
   * @param {HTMLCanvasElement} canvas
   * @returns {boolean} true si la signature a été enregistrée
   */
  function save(code, type, canvas) {
    if (!_typeValide(type)) {
      _toast('Type de signature non reconnu', 'err');
      return false;
    }

    // FIX #6 : vérifier que le canvas contient un vrai tracé
    if (!_aDessin(canvas)) {
      _toast('Veuillez signer avant de valider', 'warn');
      return false;
    }

    init(code);

    // FIX #5 : protection contre SecurityError (canvas tainted)
    var dataUrl;
    try {
      dataUrl = canvas.toDataURL('image/png');
    } catch (err) {
      console.error('[signatures] Erreur toDataURL :', err);
      _toast('Erreur lors de la capture de la signature', 'err');
      return false;
    }

    _pfmp()[code].signatures[type] = dataUrl;
    _saveLocal();
    _toast('Signature enregistrée');
    return true;
  }

  /**
   * Efface la signature stockée.
   * FIX #2 : ne crash plus si pfmpData[code] est absent.
   * @param {string} code
   * @param {string} type
   */
  function clear(code, type) {
    if (!_typeValide(type)) return;
    init(code);
    _pfmp()[code].signatures[type] = null;
    _saveLocal();
  }

  /* ── Détection de canvas vierge ──────────────────────────── */

  /**
   * Analyse les pixels du canvas pour détecter si un trait a été dessiné.
   * Compte les pixels qui ne sont pas blancs (255,255,255).
   * FIX #6 : empêche la sauvegarde d'un canvas vierge.
   * @param {HTMLCanvasElement} canvas
   * @returns {boolean}
   */
  function _aDessin(canvas) {
    try {
      var ctx = canvas.getContext('2d');
      var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      var pixels = imageData.data; // RGBA, 4 valeurs par pixel
      var nbNonBlancs = 0;

      // Échantillonnage : vérifier 1 pixel sur 4 pour la performance
      // (un canvas 600×150 = 90000 pixels → 22500 vérifications)
      for (var i = 0; i < pixels.length; i += 16) {
        var r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        if (r < 250 || g < 250 || b < 250) {
          nbNonBlancs++;
          if (nbNonBlancs >= SEUIL_PIXELS_MIN) return true; // court-circuit rapide
        }
      }
      return false;
    } catch (e) {
      // En cas d'erreur (canvas tainted, etc.), on autorise la sauvegarde
      // pour ne pas bloquer le workflow
      console.warn('[signatures] Impossible de vérifier le canvas :', e.message);
      return true;
    }
  }

  /* ── Dessin sur canvas ───────────────────────────────────── */

  /**
   * Attache les événements de dessin (souris + tactile) au canvas.
   * @param {HTMLCanvasElement} canvas
   * @param {CanvasRenderingContext2D} ctx
   */
  function attachDessin(canvas, ctx) {
    var enCours = false;

    /** Récupère les coordonnées relatives au canvas (souris ou tactile) */
    function coords(e) {
      var rect = canvas.getBoundingClientRect();
      var src = e.touches && e.touches.length > 0 ? e.touches[0] : e;
      return {
        x: (src.clientX - rect.left) * (canvas.width / rect.width),
        y: (src.clientY - rect.top) * (canvas.height / rect.height)
      };
    }

    function debut(e) {
      e.preventDefault();
      enCours = true;
      var p = coords(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    }

    function mouvement(e) {
      if (!enCours) return;
      e.preventDefault();
      var p = coords(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }

    function fin() {
      enCours = false;
    }

    // Événements souris
    canvas.addEventListener('mousedown', debut);
    canvas.addEventListener('mousemove', mouvement);
    canvas.addEventListener('mouseup', fin);
    canvas.addEventListener('mouseleave', fin);

    // Événements tactiles
    canvas.addEventListener('touchstart', debut, { passive: false });
    canvas.addEventListener('touchmove', mouvement, { passive: false });
    canvas.addEventListener('touchend', fin);
  }

  /**
   * Prépare le contexte du canvas (fond blanc, trait noir 2px).
   * @param {HTMLCanvasElement} canvas
   * @returns {CanvasRenderingContext2D}
   */
  function preparerCanvas(canvas) {
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    return ctx;
  }

  /* ── Rendu UI ────────────────────────────────────────────── */

  /**
   * Affiche le mode édition (canvas + boutons Effacer/Valider).
   * @param {string} code
   * @param {string} type
   * @param {HTMLElement} container
   */
  function afficherEditeur(code, type, container) {
    container.innerHTML = '';

    var canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 150;
    canvas.style.cssText = 'width:100%;height:150px;border:1px solid #ccc;' +
      'border-radius:4px;cursor:crosshair;touch-action:none;background:#fff;';

    container.appendChild(canvas);

    var ctx = preparerCanvas(canvas);
    attachDessin(canvas, ctx);

    // Barre de boutons
    var barre = document.createElement('div');
    barre.style.cssText = 'margin-top:8px;display:flex;gap:8px;';

    var btnEffacer = document.createElement('button');
    btnEffacer.type = 'button';
    btnEffacer.textContent = 'Effacer';
    btnEffacer.className = 'btn btn-sm btn-outline-secondary';
    btnEffacer.addEventListener('click', function () {
      preparerCanvas(canvas);
    });

    var btnValider = document.createElement('button');
    btnValider.type = 'button';
    btnValider.textContent = 'Valider';
    btnValider.className = 'btn btn-sm btn-primary';
    btnValider.addEventListener('click', function () {
      // FIX #6 : save() retourne false si le canvas est vierge
      var ok = save(code, type, canvas);
      if (ok) {
        render(code, type, container);
      }
    });

    barre.appendChild(btnEffacer);
    barre.appendChild(btnValider);
    container.appendChild(barre);
  }

  /**
   * Affiche le mode lecture (image + bouton Modifier).
   * @param {string} code
   * @param {string} type
   * @param {HTMLElement} container
   */
  function afficherApercu(code, type, container) {
    container.innerHTML = '';

    var sigData = get(code, type);
    if (!sigData) {
      // Donnée corrompue ou disparue → repasser en mode édition
      afficherEditeur(code, type, container);
      return;
    }

    var img = document.createElement('img');
    img.src = sigData;
    img.alt = 'Signature';
    img.style.cssText = 'width:100%;height:150px;border:1px solid #ccc;' +
      'border-radius:4px;object-fit:contain;background:#fff;';
    container.appendChild(img);

    var barre = document.createElement('div');
    barre.style.cssText = 'margin-top:8px;';

    var btnModifier = document.createElement('button');
    btnModifier.type = 'button';
    btnModifier.textContent = 'Modifier';
    btnModifier.className = 'btn btn-sm btn-outline-warning';
    btnModifier.addEventListener('click', function () {
      clear(code, type);
      afficherEditeur(code, type, container);
    });

    barre.appendChild(btnModifier);
    container.appendChild(barre);
  }

  /**
   * Point d'entrée du rendu : affiche l'éditeur ou l'aperçu.
   * @param {string} code
   * @param {string} type - 'tuteur_pfmp1', 'tuteur_pfmp2', 'prof_evaluateur' ou 'candidat'
   * @param {HTMLElement} container - Élément DOM conteneur
   */
  function render(code, type, container) {
    if (!container) {
      console.warn('[signatures] render() appelé sans conteneur DOM');
      return;
    }
    init(code);
    if (hasSignature(code, type)) {
      afficherApercu(code, type, container);
    } else {
      afficherEditeur(code, type, container);
    }
  }

  /* ── API publique ────────────────────────────────────────── */
  /* FIX #4 : le save public expose la vraie fonction interne   */
  return {
    init: init,
    render: render,
    save: save,
    clear: clear,
    get: get,
    hasSignature: hasSignature
  };
})();
