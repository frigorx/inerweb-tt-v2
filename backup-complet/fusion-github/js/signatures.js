/**
 * Module de signatures numériques canvas pour le CCF
 * Permet au tuteur et au candidat de signer sur écran tactile ou souris
 */
window.sigModule = (function () {
  'use strict';

  /**
   * Initialise la structure signatures pour un code donné
   * @param {string} code - Identifiant du candidat
   */
  function init(code) {
    if (!pfmpData[code]) return;
    if (!pfmpData[code].signatures) {
      pfmpData[code].signatures = {
        tuteur_pfmp1: null,
        tuteur_pfmp2: null,
        prof_evaluateur: null,
        candidat: null
      };
    }
    // Migration : ajouter prof_evaluateur si manquant
    if (!pfmpData[code].signatures.hasOwnProperty('prof_evaluateur')) {
      pfmpData[code].signatures.prof_evaluateur = null;
    }
  }

  /**
   * Retourne le data:image/png ou null
   * @param {string} code
   * @param {string} type - 'tuteur_pfmp1', 'tuteur_pfmp2' ou 'candidat'
   * @returns {string|null}
   */
  function get(code, type) {
    init(code);
    return pfmpData[code].signatures[type] || null;
  }

  /**
   * Vérifie si une signature existe
   * @param {string} code
   * @param {string} type
   * @returns {boolean}
   */
  function hasSignature(code, type) {
    return !!get(code, type);
  }

  /**
   * Convertit le canvas en data:image/png et stocke la signature
   * @param {string} code
   * @param {string} type
   * @param {HTMLCanvasElement} canvas
   */
  function save(code, type, canvas) {
    init(code);
    pfmpData[code].signatures[type] = canvas.toDataURL('image/png');
    saveLocal();
    toast('Signature enregistrée');
  }

  /**
   * Efface la signature stockée
   * @param {string} code
   * @param {string} type
   */
  function clear(code, type) {
    init(code);
    pfmpData[code].signatures[type] = null;
    saveLocal();
  }

  /**
   * Attache les événements de dessin (souris + tactile) au canvas
   * @param {HTMLCanvasElement} canvas
   * @param {CanvasRenderingContext2D} ctx
   */
  function attachDessin(canvas, ctx) {
    var enCours = false;

    /** Récupère les coordonnées relatives au canvas */
    function coords(e) {
      var rect = canvas.getBoundingClientRect();
      var src = e.touches ? e.touches[0] : e;
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
   * Prépare le contexte du canvas (fond blanc, trait noir 2px)
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

  /**
   * Affiche le mode édition (canvas + boutons Effacer/Valider)
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
      save(code, type, canvas);
      render(code, type, container);
    });

    barre.appendChild(btnEffacer);
    barre.appendChild(btnValider);
    container.appendChild(barre);
  }

  /**
   * Affiche le mode lecture (image + bouton Modifier)
   * @param {string} code
   * @param {string} type
   * @param {HTMLElement} container
   */
  function afficherApercu(code, type, container) {
    container.innerHTML = '';

    var img = document.createElement('img');
    img.src = get(code, type);
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
   * Affiche un canvas de signature ou l'aperçu dans le conteneur
   * @param {string} code
   * @param {string} type - 'tuteur_pfmp1', 'tuteur_pfmp2' ou 'candidat'
   * @param {HTMLElement} container - Élément DOM conteneur
   */
  function render(code, type, container) {
    init(code);
    if (hasSignature(code, type)) {
      afficherApercu(code, type, container);
    } else {
      afficherEditeur(code, type, container);
    }
  }

  // API publique
  return {
    init: init,
    render: render,
    save: function (code, type) {
      // Sauvegarde externe (le canvas doit être passé via render/valider)
      return get(code, type);
    },
    clear: clear,
    get: get,
    hasSignature: hasSignature
  };
})();
