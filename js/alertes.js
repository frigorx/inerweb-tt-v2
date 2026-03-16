/**
 * alertes.js — Module tableau de bord alertes et actions requises
 * Analyse l'état de chaque élève et remonte les problèmes
 *
 * Globales : students, validations, notes, pfmpData, partenaires,
 *   COMP_EP2, COMP_EP3, calcNote, getLv, appCfg, curPhase
 * Optionnels : expoModule, imposModule, sigModule, evalTuteurModule, photosModule
 */
;(function () {
  'use strict';

  var ICONS = {
    urgent:  { icon: '\u{1F534}', label: 'Urgent' },
    warning: { icon: '\u{1F7E0}', label: 'Attention' },
    info:    { icon: '\u{1F535}', label: 'Info' },
    ok:      { icon: '\u{1F7E2}', label: 'OK' }
  };

  // ── Analyse d'un élève ──

  function _analyzeStudent(code) {
    var alerts = [];
    var ep2 = window.COMP_EP2 || [];
    var ep3 = window.COMP_EP3 || [];

    // 1. Compétences non évaluées
    var neEP2 = [], neEP3 = [];
    ep2.forEach(function(c) {
      var lv = window.getLv(code, 'EP2', c.code);
      if (!lv || lv === 'NE') neEP2.push(c.code);
    });
    ep3.forEach(function(c) {
      var lv = window.getLv(code, 'EP3', c.code);
      if (!lv || lv === 'NE') neEP3.push(c.code);
    });

    if (neEP2.length > 0) {
      alerts.push({
        type: neEP2.length > ep2.length / 2 ? 'urgent' : 'warning',
        cat: 'eval',
        msg: neEP2.length + ' comp. EP2 non \u00e9valu\u00e9es (' + neEP2.join(', ') + ')'
      });
    }
    if (neEP3.length > 0) {
      alerts.push({
        type: neEP3.length > ep3.length / 2 ? 'urgent' : 'warning',
        cat: 'eval',
        msg: neEP3.length + ' comp. EP3 non \u00e9valu\u00e9es (' + neEP3.join(', ') + ')'
      });
    }

    // 2. Notes basses
    var n2 = window.calcNote(code, 'EP2');
    var n3 = window.calcNote(code, 'EP3');
    if (n2.note > 0 && n2.note < 10) {
      alerts.push({ type: 'warning', cat: 'note', msg: 'EP2 : ' + n2.note.toFixed(1) + '/20 (non \u00e9ligible)' });
    }
    if (n3.note > 0 && n3.note < 10) {
      alerts.push({ type: 'warning', cat: 'note', msg: 'EP3 : ' + n3.note.toFixed(1) + '/20 (non \u00e9ligible)' });
    }

    // 3. Exposition pédagogique faible
    if (window.expoModule) {
      var expo = window.expoModule.calc(code);
      if (expo && expo.pct < 50) {
        alerts.push({ type: 'warning', cat: 'expo', msg: 'Exposition p\u00e9dagogique : ' + expo.pct + '% (< 50%)' });
      }
    }

    // 4. Signatures manquantes
    var pd = window.pfmpData[code] || {};
    var sigs = pd.signatures || {};
    var sigManquantes = [];
    if (!sigs.tuteur_pfmp1) sigManquantes.push('Tuteur PFMP1');
    if (!sigs.tuteur_pfmp2) sigManquantes.push('Tuteur PFMP2');
    if (!sigs.candidat) sigManquantes.push('Candidat');
    if (sigManquantes.length) {
      alerts.push({ type: 'info', cat: 'sig', msg: 'Signatures manquantes : ' + sigManquantes.join(', ') });
    }

    // 5. Évaluation tuteur manquante
    var et = pd.evalTuteur || {};
    var etManquantes = [];
    if (!et.pfmp1 || !et.pfmp1.validee) etManquantes.push('PFMP1');
    if (!et.pfmp2 || !et.pfmp2.validee) etManquantes.push('PFMP2');
    if (etManquantes.length) {
      alerts.push({ type: 'warning', cat: 'tuteur', msg: '\u00c9val. tuteur manquante : ' + etManquantes.join(', ') });
    }

    // 6. Journal de stage inactif
    var journal = pd.journal || [];
    if (journal.length === 0) {
      alerts.push({ type: 'info', cat: 'stage', msg: 'Aucune entr\u00e9e dans le journal de stage' });
    } else {
      var lastEntry = journal[journal.length - 1];
      if (lastEntry.timestamp) {
        var daysSince = Math.floor((Date.now() - new Date(lastEntry.timestamp).getTime()) / 86400000);
        if (daysSince > 7) {
          alerts.push({ type: 'warning', cat: 'stage', msg: 'Journal inactif depuis ' + daysSince + ' jours' });
        }
      }
    }

    // 7. Impossibilités PFMP non traitées
    if (window.imposModule) {
      if (window.imposModule.has(code, '1') || window.imposModule.has(code, '2')) {
        var hasRattrapage = window.tacheModule && window.tacheModule.hasRattrapage(code);
        if (!hasRattrapage) {
          alerts.push({ type: 'urgent', cat: 'pfmp', msg: 'Impossibilit\u00e9 PFMP sans rattrapage oral pr\u00e9vu' });
        }
      }
    }

    return alerts;
  }

  // ── Analyse globale classe ──

  function analyzeAll() {
    var result = {
      students: {},
      summary: { urgent: 0, warning: 0, info: 0, ok: 0 },
      topAlerts: []
    };

    (window.students || []).forEach(function(s) {
      var alerts = _analyzeStudent(s.code);
      result.students[s.code] = alerts;

      var maxLevel = 'ok';
      alerts.forEach(function(a) {
        if (a.type === 'urgent') maxLevel = 'urgent';
        else if (a.type === 'warning' && maxLevel !== 'urgent') maxLevel = 'warning';
        else if (a.type === 'info' && maxLevel === 'ok') maxLevel = 'info';
      });
      result.summary[maxLevel]++;

      // Top alertes (urgentes d'abord)
      alerts.forEach(function(a) {
        if (a.type === 'urgent' || a.type === 'warning') {
          result.topAlerts.push({
            code: s.code,
            nom: (s.nom || '') + ' ' + (s.prenom ? s.prenom.charAt(0) + '.' : ''),
            alert: a
          });
        }
      });
    });

    // Trier : urgent d'abord
    result.topAlerts.sort(function(a, b) {
      var order = { urgent: 0, warning: 1 };
      return (order[a.alert.type] || 2) - (order[b.alert.type] || 2);
    });

    return result;
  }

  // ── Rendu HTML ──

  function renderDashboard(container) {
    var el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;

    var data = analyzeAll();
    var sum = data.summary;
    var total = (window.students || []).length;

    if (!total) {
      el.innerHTML = '<div style="text-align:center;padding:1rem;color:#888;font-size:.8rem">Aucun \u00e9l\u00e8ve charg\u00e9</div>';
      return;
    }

    var html = '';

    // Résumé en badges
    html += '<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.6rem">';
    if (sum.urgent) html += '<span style="background:#e53935;color:#fff;padding:.25rem .6rem;border-radius:8px;font-size:.75rem;font-weight:700">\u{1F534} ' + sum.urgent + ' urgent' + (sum.urgent > 1 ? 's' : '') + '</span>';
    if (sum.warning) html += '<span style="background:#FF9800;color:#fff;padding:.25rem .6rem;border-radius:8px;font-size:.75rem;font-weight:700">\u{1F7E0} ' + sum.warning + ' attention</span>';
    if (sum.ok) html += '<span style="background:#4CAF50;color:#fff;padding:.25rem .6rem;border-radius:8px;font-size:.75rem;font-weight:700">\u{1F7E2} ' + sum.ok + ' OK</span>';
    html += '</div>';

    // Top alertes
    if (data.topAlerts.length) {
      html += '<div style="font-weight:700;font-size:.82rem;margin-bottom:.3rem">\u{26A0}\uFE0F Actions requises</div>';
      var maxShow = Math.min(data.topAlerts.length, 15);
      for (var i = 0; i < maxShow; i++) {
        var ta = data.topAlerts[i];
        var ic = ICONS[ta.alert.type] || ICONS.info;
        var bgColor = ta.alert.type === 'urgent' ? '#ffebee' : '#fff3e0';
        var borderColor = ta.alert.type === 'urgent' ? '#ef535088' : '#FF980066';
        html += '<div style="display:flex;align-items:flex-start;gap:.4rem;padding:.35rem .5rem;margin-bottom:.25rem;'
          + 'background:' + bgColor + ';border-radius:8px;border:1px solid ' + borderColor + ';font-size:.75rem">';
        html += '<span>' + ic.icon + '</span>';
        html += '<div><strong>' + ta.nom + '</strong> — ' + ta.alert.msg + '</div>';
        html += '</div>';
      }
      if (data.topAlerts.length > maxShow) {
        html += '<div style="font-size:.7rem;color:#888;text-align:center;padding:.3rem">+ '
          + (data.topAlerts.length - maxShow) + ' autres alertes</div>';
      }
    } else {
      html += '<div style="text-align:center;padding:1rem;color:#4CAF50;font-size:.85rem;font-weight:600">'
        + '\u{1F7E2} Tous les \u00e9l\u00e8ves sont \u00e0 jour !</div>';
    }

    el.innerHTML = html;
  }

  /** Rendu compact pour un élève (dans sa fiche) */
  function renderStudentAlerts(code, container) {
    var el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;

    var alerts = _analyzeStudent(code);
    if (!alerts.length) {
      el.innerHTML = '<span style="color:#4CAF50;font-size:.75rem;font-weight:600">\u{1F7E2} RAS</span>';
      return;
    }

    var html = '<div style="display:flex;flex-direction:column;gap:.2rem">';
    alerts.forEach(function(a) {
      var ic = ICONS[a.type] || ICONS.info;
      html += '<div style="font-size:.72rem;display:flex;gap:.3rem;align-items:flex-start">'
        + '<span>' + ic.icon + '</span><span>' + a.msg + '</span></div>';
    });
    html += '</div>';
    el.innerHTML = html;
  }

  // ── Exposition globale ──

  window.alertesModule = {
    analyzeAll: analyzeAll,
    renderDashboard: renderDashboard,
    renderStudentAlerts: renderStudentAlerts
  };

})();
