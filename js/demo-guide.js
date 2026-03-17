/**
 * demo-guide.js — Module de guide interactif pour inerWeb TT
 *
 * En mode démo (?demo=1) :
 *   - Panneau s'ouvre automatiquement avec un écran d'accueil
 *   - Propose de lancer la visite guidée immédiatement
 *   - Contenu contextuel qui change selon l'onglet actif
 *
 * En mode normal :
 *   - Bouton flottant discret, panneau fermé par défaut
 *   - L'admin peut configurer la visibilité
 *
 * Module autonome IIFE — injecte son propre CSS.
 */
(function () {
  'use strict';

  // ═══════════════════════════════════════════════
  // 1. CONFIG & PERMISSIONS
  // ═══════════════════════════════════════════════
  const GUIDE_KEY = 'inerweb-tt-fe-guide-cfg';
  const STATE_KEY = 'inerweb-tt-fe-guide-state';

  const DEFAULT_CONFIG = {
    enabled: true,
    forceDemo: false,
    roles: { prof: ['all'], tuteur: ['tuteur'], eleve: ['eleve'], admin: ['all'] }
  };

  function loadCfg() {
    try { const r = localStorage.getItem(GUIDE_KEY); if (r) return Object.assign({}, DEFAULT_CONFIG, JSON.parse(r)); } catch (e) {}
    return Object.assign({}, DEFAULT_CONFIG);
  }
  function saveCfg(c) { try { localStorage.setItem(GUIDE_KEY, JSON.stringify(c)); } catch (e) {} }
  function loadState() { try { return JSON.parse(localStorage.getItem(STATE_KEY) || '{}'); } catch (e) { return {}; } }
  function saveState(s) { try { localStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch (e) {} }

  window.getGuideConfig = loadCfg;
  window.setGuideConfig = function (c) { saveCfg(c); location.reload(); };

  function isDemo() { return new URLSearchParams(location.search).get('demo') === '1' || window.demoMode === true; }

  function getPage() {
    const p = location.pathname.toLowerCase();
    if (p.includes('inerweb_prof')) return 'prof';
    if (p.includes('inerweb_eleve')) return 'eleve';
    if (p.includes('inerweb_tuteur')) return 'tuteur';
    if (p.includes('inerweb_admin')) return 'admin';
    return 'unknown';
  }

  function shouldShow() {
    const cfg = loadCfg();
    if (!cfg.enabled) return false;
    if (cfg.forceDemo && !isDemo()) return false;
    const page = getPage();
    const role = page === 'unknown' ? 'prof' : page;
    const allowed = cfg.roles[role] || ['all'];
    return allowed.includes('all') || allowed.includes(page);
  }

  // ═══════════════════════════════════════════════
  // 2. CONTENU CONTEXTUEL
  // ═══════════════════════════════════════════════

  // Écran d'accueil pour le mode démo
  const WELCOME = {
    prof: {
      title: '👋 Bienvenue dans la démo Professeur !',
      body: 'Vous êtes connecté en tant que <strong>professeur</strong> avec des données fictives pré-chargées (6 élèves répartis sur 3 filières).\n\n' +
        'Ce guide va vous accompagner pour découvrir toutes les fonctionnalités.\n\n' +
        '<strong>Que pouvez-vous faire ici ?</strong>\n' +
        '• Voir le tableau de bord avec tous vos élèves\n' +
        '• Évaluer des compétences par épreuve\n' +
        '• Suivre les stages et les PFMP\n' +
        '• Générer des bilans et des exports PDF\n' +
        '• Visualiser les radars de progression'
    },
    eleve: {
      title: '👋 Bienvenue dans la démo Élève !',
      body: 'Vous êtes connecté en tant que <strong>Martin DUPONT</strong> (CAP IFCA 1).\n\n' +
        '<strong>Que pouvez-vous faire ici ?</strong>\n' +
        '• Consulter votre progression par compétence\n' +
        '• Voir vos évaluations et commentaires du prof\n' +
        '• Remplir votre journal de stage quotidien\n' +
        '• Consulter vos informations de PFMP'
    },
    tuteur: {
      title: '👋 Bienvenue dans la démo Tuteur !',
      body: 'Vous êtes connecté en tant que <strong>Jean Martin</strong>, tuteur chez Climafroid SARL.\n' +
        'Votre stagiaire est <strong>Martin DUPONT</strong> (CAP IFCA 1).\n\n' +
        '<strong>Que pouvez-vous faire ici ?</strong>\n' +
        '• Évaluer les compétences du stagiaire observées en entreprise\n' +
        '• Noter son comportement professionnel\n' +
        '• Ajouter des observations sur chaque compétence\n' +
        '• Verrouiller une évaluation quand elle est terminée'
    },
    admin: {
      title: '👋 Bienvenue dans la démo Admin !',
      body: 'Vous êtes connecté en tant qu\'<strong>administrateur</strong> avec des données fictives.\n\n' +
        '<strong>Que pouvez-vous faire ici ?</strong>\n' +
        '• Gérer les utilisateurs (enseignants, lecteurs)\n' +
        '• Attribuer des classes par filière\n' +
        '• Configurer les tokens d\'accès\n' +
        '• Consulter le journal d\'activité\n' +
        '• Gérer le guide interactif (permissions, visibilité)'
    }
  };

  // Contenu contextuel page Prof par onglet
  const PROF_TABS = {
    dashboard: {
      title: '🏠 Tableau de bord',
      body: '<strong>C\'est votre page d\'accueil.</strong> Vous voyez d\'un coup d\'œil :\n' +
        '• <strong>Nombre d\'élèves</strong> — total de votre classe\n' +
        '• <strong>Alertes</strong> — élèves sans évaluation récente\n' +
        '• <strong>Clôturés</strong> — épreuves terminées\n' +
        '• <strong>En stage</strong> — élèves actuellement en PFMP',
      actions: [
        { icon: '🔍', text: 'Utilisez les <strong>filtres</strong> (Classe, Année, Groupe) pour afficher un sous-ensemble d\'élèves' },
        { icon: '👆', text: '<strong>Cliquez sur une fiche élève</strong> pour accéder directement à ses évaluations' },
        { icon: '🕸️', text: 'Dépliez <strong>« Radar classe »</strong> en bas pour voir le graphique de progression de la classe' }
      ]
    },
    eleves: {
      title: '👥 Gestion des élèves',
      body: 'Gérez votre liste d\'élèves.',
      actions: [
        { icon: '➕', text: '<strong>Ajouter</strong> — Saisir un élève manuellement (nom, prénom, classe)' },
        { icon: '📥', text: '<strong>Import</strong> — Charger un fichier CSV ou Excel avec toute la classe' },
        { icon: '📱', text: '<strong>QR</strong> — Générer les QR codes d\'accès pour les élèves et tuteurs' },
        { icon: '📷', text: '<strong>Scan</strong> — Scanner un QR code avec la caméra' },
        { icon: '🔄', text: '<strong>Sync</strong> — Synchroniser les données avec le serveur' },
        { icon: '🎓', text: '<strong>Promotion</strong> — Passer les élèves en année supérieure' }
      ]
    },
    activites: {
      title: '📋 Activités pédagogiques',
      body: '<strong>C\'est ici que vous évaluez vos élèves.</strong>',
      actions: [
        { icon: '📝', text: 'Créez un <strong>TP ou une activité</strong> liée à des compétences' },
        { icon: '✅', text: 'Évaluez chaque élève sur les compétences pendant le TP' },
        { icon: '📊', text: 'Les évaluations alimentent automatiquement les bilans et les radars' }
      ]
    },
    e31: {
      title: '🔧 E31 — Réalisation & Mise en service',
      body: 'Épreuve de réalisation. Évaluez les compétences techniques :',
      actions: [
        { icon: '📍', text: 'Choisissez le <strong>contexte</strong> : Atelier, PFMP 1 ou PFMP 2' },
        { icon: '⭐', text: 'Évaluez chaque compétence : NE → NA → EC → M → PM' },
        { icon: '✅', text: 'Cochez les <strong>critères observés</strong> pour chaque compétence' }
      ]
    },
    e32: {
      title: '🔍 E32 — Diagnostic & Maintenance',
      body: 'Épreuve de diagnostic. Évaluez sur des situations professionnelles :',
      actions: [
        { icon: '🅰️', text: '<strong>Situation A</strong> — Maintenance préventive' },
        { icon: '🅱️', text: '<strong>Situation B</strong> — Diagnostic de panne' },
        { icon: '📋', text: 'Chaque situation a ses compétences spécifiques' }
      ]
    },
    e33: {
      title: '📄 E33 — Dossier & Communication',
      body: 'Épreuve de communication. L\'élève produit un dossier :',
      actions: [
        { icon: '📑', text: 'Évaluation du <strong>dossier technique</strong> produit par l\'élève' },
        { icon: '🗣️', text: 'Évaluation de la <strong>communication orale</strong>' },
        { icon: '📐', text: 'Situations D (rédaction) et E (présentation)' }
      ]
    },
    stage: {
      title: '🏢 Suivi de stage (PFMP)',
      body: 'Gérez les périodes de formation en milieu professionnel.',
      actions: [
        { icon: '📅', text: 'Définissez les <strong>dates</strong> de PFMP 1 et PFMP 2' },
        { icon: '🏭', text: 'Consultez les <strong>entreprises</strong> et tuteurs' },
        { icon: '📓', text: 'Suivez le <strong>journal de stage</strong> quotidien des élèves' },
        { icon: '📷', text: 'Consultez les <strong>photos</strong> envoyées par les élèves' }
      ]
    },
    bilan: {
      title: '🏆 Bilan & Notes',
      body: 'Consultez les résultats de chaque élève.',
      actions: [
        { icon: '📊', text: 'Vue d\'ensemble avec <strong>notes calculées automatiquement</strong> sur 20' },
        { icon: '🕸️', text: '<strong>Radar compétences</strong> — profil visuel de l\'élève' },
        { icon: '📈', text: '<strong>Élève vs Classe</strong> — comparaison avec la moyenne' },
        { icon: '🔒', text: '<strong>Clôturer</strong> une épreuve quand les évaluations sont terminées' },
        { icon: '📄', text: '<strong>Export PDF</strong> — fiche individuelle de l\'élève' }
      ]
    },
    rapport: {
      title: '📝 Rapport de stage',
      body: 'Consultez et validez les rapports de stage PFMP.',
      actions: [
        { icon: '📋', text: 'Journal quotidien de l\'élève' },
        { icon: '📸', text: 'Photos prises pendant le stage' },
        { icon: '💬', text: 'Commentaires du tuteur' }
      ]
    },
    export: {
      title: '📤 Exports',
      body: 'Exportez vos données sous différents formats.',
      actions: [
        { icon: '📄', text: '<strong>PDF</strong> — Fiches individuelles, grilles de compétences' },
        { icon: '📊', text: '<strong>Excel</strong> — Tableaux récapitulatifs de la classe' },
        { icon: '💾', text: '<strong>Sauvegarde</strong> — Export complet de toutes les données' }
      ]
    },
    config: {
      title: '⚙️ Configuration',
      body: 'Paramétrez votre installation.',
      actions: [
        { icon: '🔗', text: 'URL de l\'<strong>API</strong> Google Apps Script' },
        { icon: '🔑', text: '<strong>Clé</strong> d\'authentification' },
        { icon: '🏫', text: 'Gestion des <strong>classes</strong> et groupes' }
      ]
    }
  };

  // Contenu pour les autres pages
  const PAGE_CONTENT = {
    eleve: {
      title: '🎓 Espace Élève',
      body: 'Consultez votre progression et vos évaluations.',
      actions: [
        { icon: '📊', text: 'Votre <strong>progression</strong> par compétence avec barres colorées' },
        { icon: '📝', text: 'Vos <strong>évaluations</strong> détaillées avec commentaires du prof' },
        { icon: '📓', text: 'Votre <strong>journal de stage</strong> à remplir chaque jour en PFMP' },
        { icon: '🏢', text: 'Vos <strong>informations PFMP</strong> : entreprise, tuteur, dates' }
      ],
      tips: ['Les compétences en <strong style="color:#27ae60">vert</strong> sont acquises, en <strong style="color:#f39c12">jaune</strong> en cours, en <strong style="color:#e74c3c">rouge</strong> non acquises.']
    },
    tuteur: {
      title: '🏢 Espace Tuteur',
      body: 'Évaluez votre stagiaire sur les compétences professionnelles.',
      actions: [
        { icon: '⭐', text: 'Pour chaque compétence, choisissez un <strong>niveau</strong> :\n<strong>NE</strong> = Non Évalué · <strong>NA</strong> = Non Acquis · <strong>EC</strong> = En Cours · <strong>M</strong> = Maîtrisé · <strong>PM</strong> = Parfait' },
        { icon: '☑️', text: 'Cochez les <strong>tâches observées</strong> pour chaque compétence' },
        { icon: '💬', text: 'Ajoutez une <strong>observation</strong> si besoin' },
        { icon: '🔒', text: '<strong>Verrouillez</strong> une compétence quand vous êtes sûr de votre évaluation' },
        { icon: '😊', text: 'Évaluez le <strong>comportement</strong> : ponctualité, EPI, initiative, etc.' }
      ],
      tips: ['Évaluez ce que le stagiaire sait <strong>FAIRE</strong>, pas ce qu\'il sait dire.', 'Vous pouvez revenir et modifier une évaluation tant qu\'elle n\'est pas verrouillée.']
    },
    admin: {
      title: '🔐 Administration',
      body: 'Gérez les utilisateurs et la configuration.',
      actions: [
        { icon: '👤', text: '<strong>Utilisateurs</strong> — Créer/modifier des comptes enseignants' },
        { icon: '🏫', text: '<strong>Filières & Classes</strong> — Voir les classes par filière' },
        { icon: '📜', text: '<strong>Journal</strong> — Historique des actions' },
        { icon: '📖', text: '<strong>Guide</strong> — Configurer la visibilité du guide interactif' }
      ]
    }
  };

  // ═══════════════════════════════════════════════
  // 3. VISITE GUIDÉE (page Prof)
  // ═══════════════════════════════════════════════
  const TOUR_PROF = [
    { selector: '.app-header', text: '<strong>Barre d\'en-tête</strong> — Le point vert = vous êtes connecté au serveur. Cliquez sur « Sync » pour synchroniser.' },
    { selector: '#dashFiltreClasse, .filter-bar', text: '<strong>Filtres</strong> — Choisissez une classe (CAP IFCA, Bac Pro MFER, 2nde TNE), une année ou un groupe.' },
    { selector: '.sc, .student-grid', text: '<strong>Fiches élèves</strong> — Chaque carte montre la progression. Les barres colorées = pourcentage de compétences évaluées. <strong>Cliquez dessus</strong> pour évaluer.' },
    { selector: '[data-tab="eleves"]', text: '<strong>Onglet Élèves</strong> — Ajoutez des élèves, importez un fichier CSV/Excel, générez les QR codes.' },
    { selector: '[data-tab="activites"]', text: '<strong>Onglet Activités</strong> — Créez des TP et évaluez les compétences. C\'est le cœur du système.' },
    { selector: '[data-tab="stage"]', text: '<strong>Onglet Stage</strong> — Suivez les PFMP : dates, entreprises, journal quotidien, photos.' },
    { selector: '[data-tab="bilan"]', text: '<strong>Onglet Bilan</strong> — Notes calculées automatiquement, radars de compétences, clôture d\'épreuves, export PDF.' },
    { selector: '[data-tab="export"]', text: '<strong>Onglet Export</strong> — Téléchargez les données en PDF, Excel, ou faites une sauvegarde complète.' }
  ];
  const TOUR_TUTEUR = [
    { selector: '.app-header', text: '<strong>En-tête</strong> — Le badge indique la filière et l\'épreuve de votre stagiaire.' },
    { selector: '.steps, .step', text: '<strong>Étapes</strong> — Suivez la progression : Bienvenue → Entreprise → Tuteur → Évaluation → Comportement → Récap.' },
    { selector: '.comp-block, #evalContenu', text: '<strong>Évaluation</strong> — Chaque bloc = une compétence. Cliquez pour ouvrir, puis évaluez avec les boutons NE/NA/EC/M/PM.' },
    { selector: '.tache-item, .taches-titre', text: '<strong>Tâches</strong> — Cochez les tâches que vous avez observé le stagiaire réaliser. Cliquez pour alterner ✅/❌/⬜.' },
    { selector: '#page-behav, [onclick*="behav"]', text: '<strong>Comportement</strong> — Évaluez le savoir-être : ponctualité, EPI, initiative, communication.' }
  ];
  const TOUR_ELEVE = [
    { selector: '.app-header', text: '<strong>En-tête</strong> — Votre nom et votre classe. Le point vert = connecté.' },
    { selector: '.progression, .comp-card, [id*="progression"]', text: '<strong>Progression</strong> — Vos compétences avec leur niveau d\'acquisition. Vert = acquis, jaune = en cours.' },
    { selector: '.journal, [id*="journal"]', text: '<strong>Journal de stage</strong> — Décrivez chaque jour ce que vous avez fait en entreprise.' }
  ];

  function getTourSteps() {
    const p = getPage();
    if (p === 'prof') return TOUR_PROF;
    if (p === 'tuteur') return TOUR_TUTEUR;
    if (p === 'eleve') return TOUR_ELEVE;
    return [];
  }

  // ═══════════════════════════════════════════════
  // 4. CSS
  // ═══════════════════════════════════════════════
  function injectCSS() {
    if (document.getElementById('dg-css')) return;
    const s = document.createElement('style');
    s.id = 'dg-css';
    s.textContent = `
      #dg-panel{position:fixed;top:0;right:0;width:340px;height:100vh;background:#fff;box-shadow:-4px 0 30px rgba(0,0,0,.14);z-index:9000;display:flex;flex-direction:column;transform:translateX(100%);transition:transform .3s cubic-bezier(.4,0,.2,1);font-family:'Nunito',sans-serif}
      #dg-panel.open{transform:translateX(0)}
      #dg-hdr{display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,#1b3a63,#2d5a8c);color:#fff;padding:0 1rem;height:52px;min-height:52px}
      #dg-hdr h3{font-size:.92rem;font-weight:800;margin:0}
      #dg-hdr button{background:none;border:none;color:#fff;font-size:1.5rem;cursor:pointer;padding:0 4px;line-height:1;opacity:.8}
      #dg-hdr button:hover{opacity:1}
      #dg-body{flex:1;overflow-y:auto;padding:0}
      .dg-welcome{background:linear-gradient(135deg,#e8f0f8,#d0e4f7);padding:1.2rem;border-bottom:1px solid #c5d8ea}
      .dg-welcome h4{font-size:1rem;font-weight:800;color:#1b3a63;margin:0 0 .5rem}
      .dg-welcome p{font-size:.82rem;color:#333;line-height:1.6;margin:0}
      .dg-welcome p strong{color:#1b3a63}
      .dg-tour-cta{display:flex;gap:.5rem;padding:.75rem 1.2rem;background:#fff8f0;border-bottom:1px solid #ffe0c0}
      .dg-tour-cta button{flex:1;padding:.6rem;border:none;border-radius:8px;font-size:.82rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif;transition:all .2s}
      .dg-btn-tour{background:#ff6b35;color:#fff}.dg-btn-tour:hover{background:#e55a28}
      .dg-btn-skip{background:#eee;color:#666}.dg-btn-skip:hover{background:#ddd}
      .dg-section{padding:1rem 1.2rem;border-bottom:1px solid #f0f0f0}
      .dg-section-title{font-size:.88rem;font-weight:800;color:#1b3a63;margin:0 0 .6rem;display:flex;align-items:center;gap:.4rem}
      .dg-action{display:flex;align-items:flex-start;gap:.6rem;padding:.45rem 0;font-size:.8rem;line-height:1.5;color:#444}
      .dg-action-ico{font-size:1rem;flex-shrink:0;width:1.2rem;text-align:center}
      .dg-action-txt{flex:1}
      .dg-action-txt strong{color:#1b3a63}
      .dg-tip{background:#fef9e7;border-left:4px solid #f1c40f;padding:.5rem .75rem;margin:.4rem 0;border-radius:0 6px 6px 0;font-size:.78rem;line-height:1.5}
      .dg-demo-tag{display:inline-block;background:#ff6b35;color:#fff;font-size:.6rem;font-weight:800;padding:.12rem .45rem;border-radius:12px;vertical-align:middle;margin-left:.4rem}
      #dg-fab{position:fixed;bottom:5rem;right:1.5rem;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#1b3a63,#2d5a8c);color:#fff;border:none;box-shadow:0 4px 16px rgba(27,58,99,.35);font-size:1.4rem;cursor:pointer;z-index:9001;display:flex;align-items:center;justify-content:center;transition:transform .2s,box-shadow .2s;font-family:'Nunito',sans-serif}
      #dg-fab:hover{transform:scale(1.08);box-shadow:0 6px 24px rgba(27,58,99,.45)}
      #dg-fab .fab-dot{position:absolute;top:2px;right:2px;width:14px;height:14px;background:#ff6b35;border-radius:50%;border:2px solid #fff}
      @keyframes dg-pulse{0%{box-shadow:0 4px 16px rgba(27,58,99,.35)}50%{box-shadow:0 4px 16px rgba(27,58,99,.35),0 0 0 8px rgba(255,107,53,.25)}100%{box-shadow:0 4px 16px rgba(27,58,99,.35)}}
      #dg-fab.pulse{animation:dg-pulse 2s ease-in-out infinite}
      #dg-fab-tip{position:fixed;bottom:5.3rem;right:5rem;background:#1b3a63;color:#fff;font-size:.75rem;font-weight:700;padding:.35rem .7rem;border-radius:6px;z-index:9001;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .3s;font-family:'Nunito',sans-serif}
      #dg-fab-tip::after{content:'';position:absolute;right:-6px;top:50%;transform:translateY(-50%);border:6px solid transparent;border-left-color:#1b3a63}
      #dg-fab-tip.show{opacity:1}
      #dg-overlay{position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:10000;pointer-events:none;transition:opacity .3s}
      #dg-overlay.active{pointer-events:auto}
      #dg-hl{position:absolute;border:3px solid #ff6b35;border-radius:8px;box-shadow:0 0 0 9999px rgba(0,0,0,.55);z-index:10001;pointer-events:none;transition:all .35s cubic-bezier(.4,0,.2,1);display:none}
      #dg-tt{position:absolute;z-index:10002;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.22);padding:1rem 1.2rem;max-width:360px;font-family:'Nunito',sans-serif;font-size:.85rem;color:#333;line-height:1.55;display:none}
      .tt-step{font-size:.68rem;color:#999;margin-bottom:.3rem;font-weight:700}
      .tt-text{margin-bottom:.7rem}
      .tt-text strong{color:#1b3a63}
      .tt-nav{display:flex;gap:.4rem;justify-content:flex-end}
      .tt-nav button{padding:.35rem .75rem;border:none;border-radius:6px;font-size:.8rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif;transition:opacity .2s}
      .tt-prev{background:#eee;color:#555}.tt-next{background:#ff6b35;color:#fff}.tt-end{background:#27ae60;color:#fff}
      .tt-nav button:hover{opacity:.85}
      #dg-tt::before{content:'';position:absolute;width:12px;height:12px;background:#fff;transform:rotate(45deg)}
      #dg-tt.arrow-top::before{top:-6px;left:24px}
      #dg-tt.arrow-bottom::before{bottom:-6px;left:24px}
      @media(max-width:768px){#dg-panel{width:100%}#dg-fab{bottom:4.5rem;right:1rem;width:48px;height:48px;font-size:1.2rem}#dg-fab-tip{display:none}#dg-tt{max-width:calc(100vw - 2rem);left:1rem!important;right:1rem!important}}
    `;
    document.head.appendChild(s);
  }

  // ═══════════════════════════════════════════════
  // 5. DOM
  // ═══════════════════════════════════════════════
  let panel, fab, fabTip, overlay, tourStep = -1;

  function buildPanel() {
    const p = document.createElement('div');
    p.id = 'dg-panel';
    // Header
    const h = document.createElement('div');
    h.id = 'dg-hdr';
    h.innerHTML = '<h3>📖 Guide interactif</h3>';
    const cb = document.createElement('button');
    cb.innerHTML = '&times;';
    cb.title = 'Fermer';
    cb.onclick = togglePanel;
    h.appendChild(cb);
    p.appendChild(h);
    // Body
    const b = document.createElement('div');
    b.id = 'dg-body';
    p.appendChild(b);
    document.body.appendChild(p);
    return p;
  }

  function buildFAB() {
    const f = document.createElement('button');
    f.id = 'dg-fab';
    f.innerHTML = '📖';
    f.title = 'Ouvrir le guide';
    f.onclick = togglePanel;
    // Badge si visite jamais faite
    const st = loadState();
    if (!st.tourDone) {
      const d = document.createElement('span');
      d.className = 'fab-dot';
      f.appendChild(d);
    }
    document.body.appendChild(f);
    // Tooltip
    const tip = document.createElement('div');
    tip.id = 'dg-fab-tip';
    tip.textContent = 'Guide interactif — cliquez ici !';
    document.body.appendChild(tip);
    return f;
  }

  function buildOverlay() {
    const o = document.createElement('div');
    o.id = 'dg-overlay';
    o.innerHTML = '<div id="dg-hl"></div><div id="dg-tt"></div>';
    o.onclick = function(e) { if (e.target === o) endTour(); };
    document.body.appendChild(o);
    return o;
  }

  // ═══════════════════════════════════════════════
  // 6. PANNEAU
  // ═══════════════════════════════════════════════
  function togglePanel() {
    const open = panel.classList.toggle('open');
    const st = loadState();
    st.open = open;
    saveState(st);
    if (fabTip) fabTip.classList.remove('show');
    if (fab) fab.classList.remove('pulse');
  }
  function openPanel() {
    if (!panel.classList.contains('open')) {
      panel.classList.add('open');
      const st = loadState();
      st.open = true;
      saveState(st);
    }
    if (fabTip) fabTip.classList.remove('show');
    if (fab) fab.classList.remove('pulse');
  }

  // ═══════════════════════════════════════════════
  // 7. RENDU CONTENU
  // ═══════════════════════════════════════════════
  function renderActions(actions) {
    if (!actions || !actions.length) return '';
    return actions.map(function(a) {
      return '<div class="dg-action"><span class="dg-action-ico">' + a.icon + '</span><div class="dg-action-txt">' + a.text + '</div></div>';
    }).join('');
  }

  function renderTips(tips) {
    if (!tips || !tips.length) return '';
    return tips.map(function(t) { return '<div class="dg-tip">💡 ' + t + '</div>'; }).join('');
  }

  function updateBody(tabId) {
    const body = document.getElementById('dg-body');
    if (!body) return;
    const page = getPage();
    let html = '';

    // Écran d'accueil en mode démo
    if (isDemo()) {
      const w = WELCOME[page];
      if (w) {
        html += '<div class="dg-welcome"><h4>' + w.title + '</h4><p>' + w.body + '</p></div>';
      }
      // Boutons visite guidée
      const steps = getTourSteps();
      if (steps.length) {
        const st = loadState();
        html += '<div class="dg-tour-cta">';
        html += '<button class="dg-btn-tour" onclick="window._dgStartTour()">▶ ' + (st.tourDone ? 'Relancer la visite' : 'Visite guidée') + '</button>';
        if (!st.tourDone) html += '<button class="dg-btn-skip" onclick="window._dgSkipTour()">Plus tard</button>';
        html += '</div>';
      }
    }

    // Contenu contextuel
    let data = null;
    if (page === 'prof') {
      data = PROF_TABS[tabId] || PROF_TABS['dashboard'];
    } else {
      data = PAGE_CONTENT[page];
    }

    if (data) {
      html += '<div class="dg-section">';
      html += '<div class="dg-section-title">' + data.title;
      if (isDemo()) html += '<span class="dg-demo-tag">DÉMO</span>';
      html += '</div>';
      if (data.body) html += '<div style="font-size:.82rem;color:#555;line-height:1.6;margin-bottom:.5rem">' + data.body + '</div>';
      html += renderActions(data.actions);
      html += renderTips(data.tips);
      html += '</div>';
    }

    // Pas de contenu du tout
    if (!html) {
      html = '<div style="text-align:center;color:#999;padding:3rem 1rem;font-size:.85rem">Aucun guide disponible pour cette page.</div>';
    }

    body.innerHTML = html;
  }

  // ═══════════════════════════════════════════════
  // 8. VISITE GUIDÉE
  // ═══════════════════════════════════════════════
  window._dgStartTour = function() { startTour(); };
  window._dgSkipTour = function() {
    const st = loadState();
    st.tourSkipped = true;
    saveState(st);
  };

  function startTour() {
    tourStep = 0;
    overlay.classList.add('active');
    if (panel.classList.contains('open')) panel.classList.remove('open');
    showStep();
  }

  function endTour() {
    tourStep = -1;
    overlay.classList.remove('active');
    document.getElementById('dg-hl').style.display = 'none';
    document.getElementById('dg-tt').style.display = 'none';
    const st = loadState();
    st.tourDone = true;
    saveState(st);
    // Retirer le badge
    const dot = fab.querySelector('.fab-dot');
    if (dot) dot.remove();
    openPanel();
    updateBody(getActiveTab());
  }

  function showStep() {
    const steps = getTourSteps();
    if (tourStep < 0 || tourStep >= steps.length) { endTour(); return; }

    const step = steps[tourStep];
    const targets = step.selector.split(',').map(function(s) { return s.trim(); });
    let el = null;
    for (let i = 0; i < targets.length; i++) {
      el = document.querySelector(targets[i]);
      if (el) break;
    }

    if (!el) { tourStep++; if (tourStep >= steps.length) endTour(); else showStep(); return; }

    const hl = document.getElementById('dg-hl');
    const tt = document.getElementById('dg-tt');
    const rect = el.getBoundingClientRect();
    const pad = 6;

    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    setTimeout(function() {
      const rect2 = el.getBoundingClientRect();
      hl.style.display = 'block';
      hl.style.top = (rect2.top - pad) + 'px';
      hl.style.left = (rect2.left - pad) + 'px';
      hl.style.width = (rect2.width + pad * 2) + 'px';
      hl.style.height = (rect2.height + pad * 2) + 'px';

      const isLast = tourStep === steps.length - 1;
      const isFirst = tourStep === 0;

      let h = '<div class="tt-step">Étape ' + (tourStep + 1) + ' / ' + steps.length + '</div>';
      h += '<div class="tt-text">' + step.text + '</div>';
      h += '<div class="tt-nav">';
      if (!isFirst) h += '<button class="tt-prev" onclick="event.stopPropagation();window._dgPrev()">◀ Précédent</button>';
      if (isLast) h += '<button class="tt-end" onclick="event.stopPropagation();window._dgEnd()">✅ Terminer</button>';
      else h += '<button class="tt-next" onclick="event.stopPropagation();window._dgNext()">Suivant ▶</button>';
      h += '</div>';
      tt.innerHTML = h;
      tt.style.display = 'block';
      tt.className = '';

      let top = rect2.bottom + 14;
      let left = Math.max(8, rect2.left);
      if (top + 160 > window.innerHeight) { top = Math.max(8, rect2.top - 170); tt.classList.add('arrow-bottom'); }
      else tt.classList.add('arrow-top');
      if (left + 360 > window.innerWidth) left = Math.max(8, window.innerWidth - 370);
      tt.style.top = top + 'px';
      tt.style.left = left + 'px';
    }, 150);
  }

  window._dgPrev = function() { tourStep--; showStep(); };
  window._dgNext = function() { tourStep++; showStep(); };
  window._dgEnd = function() { endTour(); };

  function getActiveTab() {
    if (getPage() !== 'prof') return getPage();
    const btn = document.querySelector('.nav-btn.active');
    return btn ? (btn.dataset.tab || 'dashboard') : 'dashboard';
  }

  // ═══════════════════════════════════════════════
  // 9. INIT
  // ═══════════════════════════════════════════════
  function init() {
    if (!shouldShow()) return;

    injectCSS();
    panel = buildPanel();
    fab = buildFAB();
    fabTip = document.getElementById('dg-fab-tip');
    overlay = buildOverlay();

    // Contenu initial
    updateBody(getActiveTab());

    // Observer les changements d'onglet (page prof)
    if (getPage() === 'prof') {
      document.addEventListener('click', function(e) {
        const btn = e.target.closest('.nav-btn');
        if (btn && btn.dataset.tab) setTimeout(function() { updateBody(btn.dataset.tab); }, 80);
      });
    }

    // État du panneau
    const st = loadState();

    if (isDemo()) {
      // Mode démo : ouvrir automatiquement + pulse sur le FAB
      openPanel();
      fab.classList.add('pulse');
      // Afficher le tooltip du FAB après un petit délai
      setTimeout(function() {
        if (fabTip && !panel.classList.contains('open')) fabTip.classList.add('show');
        setTimeout(function() { if (fabTip) fabTip.classList.remove('show'); }, 5000);
      }, 2000);
    } else if (st.open) {
      panel.classList.add('open');
    }

    // Redimensionnement
    window.addEventListener('resize', function() { if (tourStep >= 0) showStep(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 300); });
  else setTimeout(init, 300);

})();
