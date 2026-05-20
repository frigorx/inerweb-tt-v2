/**
 * INERWEB TT-IA — Floutage des visages avant upload v1.0
 *
 * Conforme CLAUDE.md règle 4 (pipeline photo) : détection locale via
 * face-api.js (TensorFlow.js), aucune photo n'est envoyée à un service tiers
 * avant traitement.
 *
 * Usage :
 *   await iwFaceBlur.init();  // charge la lib + modèle (1ère fois ~1.5 Mo)
 *   const blob = await iwFaceBlur.processFile(file);  // floute, renvoie blob
 *   const dataUrl = await iwFaceBlur.processFileToDataUrl(file);
 *
 * Note : le floutage est appliqué avant tout encodage base64. La photo
 * originale n'est jamais conservée par le module.
 */
(function(global){
  'use strict';

  // CDN officiel vladmandic/face-api (fork moderne, maintenu)
  const LIB_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/dist/face-api.min.js';
  // Modèles depuis le CDN du repo officiel
  const MODELS_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model';

  let _loaded = false;
  let _loading = null;

  async function loadScript(url) {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src="' + url + '"]')) return resolve();
      const s = document.createElement('script');
      s.src = url; s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Échec chargement ' + url));
      document.head.appendChild(s);
    });
  }

  async function init() {
    if (_loaded) return true;
    if (_loading) return _loading;
    _loading = (async () => {
      await loadScript(LIB_URL);
      if (!global.faceapi) throw new Error('face-api non chargé');
      // tinyFaceDetector = petit (~190 Ko) + rapide + suffisant
      await global.faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL);
      _loaded = true;
      return true;
    })();
    return _loading;
  }

  function fileToImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Image illisible'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('Lecture fichier impossible'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Floute les visages d'une image. Renvoie un canvas prêt à exporter.
   * Options :
   *   maxWidth (default 1600) — redimensionnement pour limiter taille upload
   *   pad (default 0.15) — agrandissement du rectangle de flou (15% pour
   *     couvrir un peu plus que les pixels du visage strict)
   */
  async function blurFaces(img, opts) {
    opts = opts || {};
    await init();
    const maxWidth = opts.maxWidth || 1600;
    const pad = opts.pad != null ? opts.pad : 0.15;

    // Redimensionner si trop grand
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    if (w > maxWidth) {
      const ratio = maxWidth / w;
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);

    // Détection
    const detections = await global.faceapi.detectAllFaces(
      canvas,
      new global.faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 })
    );

    if (!detections.length) {
      // Aucun visage détecté → on retourne tel quel (juste redimensionné)
      return { canvas, faces: 0 };
    }

    // Pour chaque visage : extraire la zone, flouter, replacer
    for (const det of detections) {
      const box = det.box;
      const padX = box.width * pad;
      const padY = box.height * pad;
      const x = Math.max(0, Math.floor(box.x - padX));
      const y = Math.max(0, Math.floor(box.y - padY));
      const bw = Math.min(canvas.width - x, Math.floor(box.width + 2 * padX));
      const bh = Math.min(canvas.height - y, Math.floor(box.height + 2 * padY));

      // Méthode rapide : downscale + upscale = flou pixelisé (sans canvas filter blur)
      const tmp = document.createElement('canvas');
      const scale = 0.05; // 5% → très flou
      tmp.width = Math.max(1, Math.round(bw * scale));
      tmp.height = Math.max(1, Math.round(bh * scale));
      const tmpCtx = tmp.getContext('2d');
      tmpCtx.drawImage(canvas, x, y, bw, bh, 0, 0, tmp.width, tmp.height);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tmp, 0, 0, tmp.width, tmp.height, x, y, bw, bh);
      ctx.restore();
    }

    return { canvas, faces: detections.length };
  }

  async function processFile(file, opts) {
    const img = await fileToImage(file);
    const { canvas, faces } = await blurFaces(img, opts);
    return new Promise((resolve, reject) => {
      canvas.toBlob(b => b ? resolve({ blob: b, faces }) : reject(new Error('Blob KO')), 'image/jpeg', 0.85);
    });
  }

  async function processFileToDataUrl(file, opts) {
    const img = await fileToImage(file);
    const { canvas, faces } = await blurFaces(img, opts);
    return { dataUrl: canvas.toDataURL('image/jpeg', 0.85), faces };
  }

  global.iwFaceBlur = {
    init: init,
    processFile: processFile,
    processFileToDataUrl: processFileToDataUrl,
    isLoaded: function(){ return _loaded; }
  };
})(window);
