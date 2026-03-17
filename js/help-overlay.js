/**
 * help-overlay.js — Système d'aide contextuelle pour inerWeb TT
 * IIFE autonome — injecte son propre CSS et bouton dans le header.
 *
 * Fonctionnement :
 *   - Ajoute un bouton "?" dans .hdr-right
 *   - Active un mode aide avec overlay semi-transparent
 *   - Les éléments [data-help] sont mis en surbrillance
 *   - Clic sur un élément => popover contextuel (titre, texte, astuce, lien)
 *   - Sortie : clic overlay / Escape / re-clic bouton
 *
 * Expose : window.iwHelpOverlay = { toggle, isActive }
 */
;(function () {
  'use strict';

  // ═══════════════════════════════════════════════
  // 1. DICTIONNAIRE D'AIDE (clés data-help → contenu)
  // ═══════════════════════════════════════════════

  var HELP_DATA = {
    'dashboard': {
      titre: 'Tableau de bord',
      texte: 'Vue d\'ensemble de toutes vos classes. Les indicateurs montrent le nombre d\'élèves, les évaluations en attente et les alertes.',
      astuce: 'Cliquez sur un indicateur pour accéder directement à la section concernée.',
      lien: 'aide.html#dashboard'
    },
    'sync': {
      titre: 'Synchronisation',
      texte: 'Le point vert indique que vos données sont synchronisées avec le serveur. Orange = synchronisation en cours. Rouge = hors ligne.',
      astuce: 'Cliquez pour forcer une synchronisation manuelle.',
      lien: 'aide.html#sync'
    },
    'filtres': {
      titre: 'Filtres classe et formation',
      texte: 'Sélectionnez une classe ou une formation pour filtrer les élèves affichés. Le filtre s\'applique à tous les onglets.',
      astuce: 'Utilisez "Toutes les classes" pour voir l\'ensemble.',
      lien: 'aide.html#filtres'
    },
    'fiches-eleves': {
      titre: 'Fiches élèves',
      texte: 'Chaque carte représente un élève. Vous y voyez son nom, sa classe, son entreprise de stage et l\'état de ses évaluations.',
      astuce: 'Cliquez sur une carte pour ouvrir le détail et évaluer.',
      lien: 'aide.html#eleves'
    },
    'eval-niveaux': {
      titre: 'Niveaux d\'évaluation',
      texte: 'Les 5 niveaux : NE (Non Évalué), NA (Non Acquis), EC (En Cours), M (Maîtrisé), PM (Plus que Maîtrisé). Cliquez un bouton pour valider le niveau.',
      astuce: 'Le niveau est enregistré automatiquement. Vous pouvez le modifier à tout moment.',
      lien: 'aide.html#evaluation'
    },
    'radar': {
      titre: 'Radar de compétences',
      texte: 'Le graphique radar montre visuellement la progression de l\'élève sur chaque compétence de l\'épreuve sélectionnée.',
      astuce: 'Passez la souris sur un axe pour voir le détail de la compétence.',
      lien: 'aide.html#radar'
    },
    'export-pdf': {
      titre: 'Export PDF',
      texte: 'Génère un document PDF du bilan affiché. Idéal pour imprimer ou archiver.',
      astuce: 'Le PDF inclut le radar, les compétences et l\'avis global.',
      lien: 'aide.html#export'
    },
    'config': {
      titre: 'Configuration',
      texte: 'Paramétrez votre connexion au serveur (URL API, clé API), votre nom d\'enseignant et les options de l\'application.',
      astuce: 'Ces paramètres sont sauvegardés localement dans votre navigateur.',
      lien: 'aide.html#config'
    },
    'phases': {
      titre: 'Phases d\'évaluation',
      texte: 'Basculez entre "Formatif" (entraînement) et "Certificatif" (examen). Les niveaux certificatifs sont verrouillés une fois validés.',
      astuce: 'Commencez toujours en formatif, puis passez en certificatif pour l\'examen.',
      lien: 'aide.html#phases'
    },
    'tp-library': {
      titre: 'Bibliothèque de TP',
      texte: 'Catalogue de travaux pratiques avec fiches détaillées, matériel nécessaire et correspondances avec les compétences du référentiel.',
      astuce: 'Utilisez le bouton IA pour enrichir automatiquement un TP.',
      lien: 'aide.html#tp'
    },
    'progression': {
      titre: 'Grille de progression',
      texte: 'Vue croisée élèves × compétences pour visualiser d\'un coup d\'œil la progression de toute la classe.',
      astuce: 'Exportez en PDF pour les réunions pédagogiques.',
      lien: 'aide.html#progression'
    },
    'stage': {
      titre: 'Suivi PFMP',
      texte: 'Gestion des périodes de formation en milieu professionnel : entreprises, tuteurs, journal de stage avec photos.',
      astuce: 'Les QR codes permettent aux tuteurs d\'accéder directement à leur interface d\'évaluation.',
      lien: 'aide.html#stage'
    }
  };

  // ═══════════════════════════════════════════════
  // 2. VÉRIFICATION DU CONTEXTE
  // ═══════════════════════════════════════════════

  /** Ne s'initialise que sur les pages avec header prof */
  var hdrRight = document.querySelector('.hdr-right');
  if (!hdrRight) return;

  // ═══════════════════════════════════════════════
  // 3. VARIABLES MODULE
  // ═══════════════════════════════════════════════

  var _active = false;       // mode aide actif ?
  var _overlay = null;       // élément overlay
  var _btn = null;           // bouton "?"
  var _popover = null;       // popover courant (ou null)

  // ═══════════════════════════════════════════════
  // 4. INJECTION CSS
  // ═══════════════════════════════════════════════

  function injectCSS() {
    var style = document.createElement('style');
    style.id = 'iw-help-css';
    style.textContent = [
      /* Bouton aide dans le header */
      '.iw-help-btn{width:32px;height:32px;border-radius:50%;border:2px solid rgba(255,255,255,.4);',
      'background:rgba(255,255,255,.1);color:#fff;font-size:.9rem;font-weight:900;',
      'cursor:pointer;display:flex;align-items:center;justify-content:center;',
      'transition:all .2s;font-family:"Nunito",sans-serif;}',
      '.iw-help-btn:hover{background:rgba(255,255,255,.25);border-color:#fff;}',
      '.iw-help-btn.active{background:var(--orange);border-color:var(--orange);}',

      /* Overlay semi-transparent */
      '.iw-help-overlay{position:fixed;top:0;left:0;right:0;bottom:0;',
      'background:rgba(0,0,0,.4);z-index:9000;opacity:0;transition:opacity .3s;pointer-events:none;}',
      '.iw-help-active .iw-help-overlay{opacity:1;pointer-events:auto;}',

      /* Éléments mis en surbrillance */
      '.iw-help-active [data-help]{position:relative;z-index:9001;cursor:help;',
      'outline:3px dashed var(--orange);outline-offset:4px;animation:iw-help-pulse 2s infinite;}',

      '@keyframes iw-help-pulse{',
      '0%,100%{outline-color:var(--orange);}',
      '50%{outline-color:var(--teal);}}',

      /* Popover contextuel */
      '.iw-help-popover{position:fixed;z-index:9010;background:#fff;border-radius:12px;',
      'padding:1.25rem;box-shadow:0 12px 40px rgba(0,0,0,.25);max-width:320px;width:90vw;',
      'animation:iw-pop-in .25s ease-out;font-family:"Nunito",sans-serif;}',
      '@keyframes iw-pop-in{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}',

      /* Flèche du popover */
      '.iw-help-popover::before{content:"";position:absolute;width:12px;height:12px;',
      'background:#fff;transform:rotate(45deg);box-shadow:-2px -2px 4px rgba(0,0,0,.06);}',
      '.iw-help-popover.arrow-top::before{top:-6px;left:24px;}',
      '.iw-help-popover.arrow-bottom::before{bottom:-6px;left:24px;box-shadow:2px 2px 4px rgba(0,0,0,.06);}',

      /* Bouton fermer */
      '.iw-help-close{position:absolute;top:8px;right:10px;background:none;border:none;',
      'font-size:1.1rem;cursor:pointer;color:#999;line-height:1;padding:4px;}',
      '.iw-help-close:hover{color:#333;}',

      /* Titre du popover */
      '.iw-help-titre{font-size:1rem;font-weight:800;color:var(--primary,#1a237e);margin:0 0 .5rem 0;}',

      /* Texte descriptif */
      '.iw-help-texte{font-size:.85rem;color:#444;line-height:1.5;margin:0 0 .6rem 0;}',

      /* Encadré astuce */
      '.iw-help-astuce{background:#fff8e1;border-left:3px solid var(--orange,#ff9800);',
      'padding:.45rem .65rem;border-radius:0 6px 6px 0;font-size:.8rem;color:#6d4c00;margin:0 0 .6rem 0;}',
      '.iw-help-astuce::before{content:"💡 ";font-size:.85rem;}',

      /* Lien vers aide complète */
      '.iw-help-lien{display:inline-block;font-size:.8rem;color:var(--teal,#009688);',
      'text-decoration:none;font-weight:700;}',
      '.iw-help-lien:hover{text-decoration:underline;}'
    ].join('\n');
    document.head.appendChild(style);
  }

  // ═══════════════════════════════════════════════
  // 5. INJECTION DU BOUTON "?"
  // ═══════════════════════════════════════════════

  function injectButton() {
    _btn = document.createElement('button');
    _btn.className = 'iw-help-btn';
    _btn.setAttribute('title', 'Aide contextuelle');
    _btn.setAttribute('aria-label', 'Aide contextuelle');
    _btn.textContent = '?';
    _btn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleHelpMode();
    });
    /* Insère en première position dans .hdr-right */
    hdrRight.insertBefore(_btn, hdrRight.firstChild);
  }

  // ═══════════════════════════════════════════════
  // 6. INJECTION DE L'OVERLAY
  // ═══════════════════════════════════════════════

  function injectOverlay() {
    _overlay = document.createElement('div');
    _overlay.className = 'iw-help-overlay';
    document.body.appendChild(_overlay);

    /* Clic sur l'overlay = fermer le mode aide */
    _overlay.addEventListener('click', function () {
      if (_active) toggleHelpMode();
    });
  }

  // ═══════════════════════════════════════════════
  // 7. BASCULE DU MODE AIDE
  // ═══════════════════════════════════════════════

  function toggleHelpMode() {
    _active = !_active;

    if (_active) {
      document.body.classList.add('iw-help-active');
      _btn.classList.add('active');
      /* Écoute les clics sur éléments data-help */
      document.addEventListener('click', onHelpClick, true);
    } else {
      document.body.classList.remove('iw-help-active');
      _btn.classList.remove('active');
      document.removeEventListener('click', onHelpClick, true);
      hidePopover();
    }
  }

  // ═══════════════════════════════════════════════
  // 8. GESTION DES CLICS EN MODE AIDE
  // ═══════════════════════════════════════════════

  /** Intercepte les clics sur [data-help] */
  function onHelpClick(e) {
    var target = e.target.closest('[data-help]');
    if (!target) return;

    e.preventDefault();
    e.stopPropagation();

    var key = target.getAttribute('data-help');
    if (HELP_DATA[key]) {
      showPopover(key, target);
    }
  }

  // ═══════════════════════════════════════════════
  // 9. AFFICHAGE DU POPOVER
  // ═══════════════════════════════════════════════

  function showPopover(key, targetEl) {
    /* Ferme le popover précédent s'il existe */
    hidePopover();

    var data = HELP_DATA[key];
    if (!data) return;

    /* Construction du DOM du popover */
    var pop = document.createElement('div');
    pop.className = 'iw-help-popover';

    /* Bouton fermer */
    var closeBtn = document.createElement('button');
    closeBtn.className = 'iw-help-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Fermer');
    closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      hidePopover();
    });
    pop.appendChild(closeBtn);

    /* Titre */
    var titre = document.createElement('h4');
    titre.className = 'iw-help-titre';
    titre.textContent = data.titre;
    pop.appendChild(titre);

    /* Texte descriptif */
    var texte = document.createElement('p');
    texte.className = 'iw-help-texte';
    texte.textContent = data.texte;
    pop.appendChild(texte);

    /* Encadré astuce */
    if (data.astuce) {
      var astuce = document.createElement('div');
      astuce.className = 'iw-help-astuce';
      astuce.textContent = data.astuce;
      pop.appendChild(astuce);
    }

    /* Lien vers aide complète */
    if (data.lien) {
      var lien = document.createElement('a');
      lien.className = 'iw-help-lien';
      lien.href = data.lien;
      lien.textContent = 'En savoir plus →';
      pop.appendChild(lien);
    }

    document.body.appendChild(pop);
    _popover = pop;

    /* Positionnement intelligent */
    positionPopover(pop, targetEl);
  }

  // ═══════════════════════════════════════════════
  // 10. FERMETURE DU POPOVER
  // ═══════════════════════════════════════════════

  function hidePopover() {
    if (_popover && _popover.parentNode) {
      _popover.parentNode.removeChild(_popover);
    }
    _popover = null;
  }

  // ═══════════════════════════════════════════════
  // 11. POSITIONNEMENT INTELLIGENT DU POPOVER
  // ═══════════════════════════════════════════════

  /**
   * Positionne le popover près de la cible.
   * Essaie : en dessous, puis au-dessus, puis à droite.
   */
  function positionPopover(popover, target) {
    var gap = 12;
    var rect = target.getBoundingClientRect();
    var popW = popover.offsetWidth;
    var popH = popover.offsetHeight;
    var winW = window.innerWidth;
    var winH = window.innerHeight;

    var left, top;

    /* Essai 1 : en dessous de la cible */
    top = rect.bottom + gap;
    left = rect.left + (rect.width / 2) - (popW / 2);

    if (top + popH <= winH - 10) {
      popover.classList.add('arrow-top');
    }
    /* Essai 2 : au-dessus */
    else if (rect.top - gap - popH >= 10) {
      top = rect.top - gap - popH;
      popover.classList.add('arrow-bottom');
    }
    /* Essai 3 : à droite */
    else {
      top = rect.top;
      left = rect.right + gap;
    }

    /* Contrainte horizontale : rester dans la fenêtre */
    if (left < 10) left = 10;
    if (left + popW > winW - 10) left = winW - popW - 10;

    /* Contrainte verticale */
    if (top < 10) top = 10;
    if (top + popH > winH - 10) top = winH - popH - 10;

    popover.style.left = left + 'px';
    popover.style.top = top + 'px';
  }

  // ═══════════════════════════════════════════════
  // 12. RACCOURCI CLAVIER
  // ═══════════════════════════════════════════════

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && _active) {
      toggleHelpMode();
    }
  });

  // ═══════════════════════════════════════════════
  // 13. INITIALISATION
  // ═══════════════════════════════════════════════

  injectCSS();
  injectOverlay();
  injectButton();

  // ═══════════════════════════════════════════════
  // 14. API PUBLIQUE
  // ═══════════════════════════════════════════════

  window.iwHelpOverlay = {
    toggle: toggleHelpMode,
    isActive: function () { return _active; },
    getHelpKeys: function () { return Object.keys(HELP_DATA); }
  };

})();
