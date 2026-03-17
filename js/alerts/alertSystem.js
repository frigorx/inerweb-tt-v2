/**
 * alertSystem.js — Systeme d'alertes avance
 * Wrapper autour de alertesModule (alertes.js) + detection automatique
 *
 * Fournit :
 *  - getAlerts(studentCode) : tableau d'alertes pour un eleve
 *  - getClasseAlerts(classeCode) : alertes agregees pour une classe
 *  - renderAlertsBadge(container) : badge compteur dans le dashboard
 *
 * Globales attendues : students, validations, FILIERES, getFiliere, getComps, getCrits, getLv
 * Optionnel : pfmpData, alertesModule
 */
;(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════
     CONSTANTES
     ══════════════════════════════════════════════════════ */
  var NV_VAL = { NE: 0, NA: 0, EC: 35, M: 70, PM: 100 };

  var SEVERITY_ORDER = { critical: 0, urgent: 1, warning: 2, info: 3 };
  var SEVERITY_COLORS = {
    critical: { bg: '#b71c1c', text: '#fff', badge: '#d32f2f' },
    urgent:   { bg: '#e53935', text: '#fff', badge: '#e53935' },
    warning:  { bg: '#FF9800', text: '#fff', badge: '#FF9800' },
    info:     { bg: '#2196F3', text: '#fff', badge: '#2196F3' }
  };
  var SEVERITY_ICONS = {
    critical: '\u{1F6A8}',
    urgent:   '\u{1F534}',
    warning:  '\u{1F7E0}',
    info:     '\u{1F535}'
  };

  var ALERT_TYPES = {
    ABSENT:                'absent',
    SANS_PROGRESSION:      'sans_progression',
    EN_DIFFICULTE:         'en_difficulte',
    PFMP_MANQUANTE:        'pfmp_manquante',
    EVAL_INCOMPLETE:       'eval_incomplete',
    COMP_NON_EVALUEE:      'comp_non_evaluee',
    NOTE_BASSE:            'note_basse',
    SIGNATURE_MANQUANTE:   'signature_manquante',
    JOURNAL_INACTIF:       'journal_inactif',
    IMPOSSIBILITE_PFMP:    'impossibilite_pfmp'
  };

  /* ══════════════════════════════════════════════════════
     HELPERS
     ══════════════════════════════════════════════════════ */

  function _now() { return Date.now(); }

  function _daysSince(ts) {
    if (!ts) return Infinity;
    return Math.floor((_now() - new Date(ts).getTime()) / 86400000);
  }

  function _filiere(student) {
    var fk = window.getFiliere ? window.getFiliere(student) : 'BAC_MFER';
    return { key: fk, fil: window.FILIERES ? window.FILIERES[fk] : null };
  }

  function _lv(code, ep, comp) {
    return (window.getLv ? window.getLv(code, ep, comp) : null) || 'NE';
  }

  function _val(niv) { return NV_VAL[niv] || 0; }

  /** Trouve la date de derniere validation pour un eleve */
  function _lastValidationDate(code) {
    var vals = window.validations || {};
    var last = null;
    // validations peut etre un objet {studentCode: {ep: {comp: {date, lv}}}}
    // ou un tableau — on gere les deux formats
    if (Array.isArray(vals)) {
      vals.forEach(function (v) {
        if (v.code === code && v.date) {
          var d = new Date(v.date).getTime();
          if (!last || d > last) last = d;
        }
      });
    } else if (vals[code]) {
      var sv = vals[code];
      Object.keys(sv).forEach(function (ep) {
        var epObj = sv[ep];
        if (!epObj) return;
        Object.keys(epObj).forEach(function (comp) {
          var entry = epObj[comp];
          if (entry && entry.date) {
            var d = new Date(entry.date).getTime();
            if (!last || d > last) last = d;
          }
        });
      });
    }
    return last;
  }

  /** Date d'entree estimee de l'eleve (champ dateEntree ou dateInscription ou fallback) */
  function _dateEntree(student) {
    var d = student.dateEntree || student.dateInscription || student.date_entree || null;
    return d ? new Date(d).getTime() : null;
  }

  /* ══════════════════════════════════════════════════════
     DETECTION DES ALERTES
     ══════════════════════════════════════════════════════ */

  function _detectAlerts(studentCode) {
    var alerts = [];
    var s = (window.students || []).find(function (x) { return x.code === studentCode; });
    if (!s) return alerts;

    var fInfo = _filiere(s);
    var fil = fInfo.fil;

    // ── 1. Eleve absent : pas de validation depuis > 30 jours ──
    var lastVal = _lastValidationDate(studentCode);
    if (lastVal) {
      var days = _daysSince(lastVal);
      if (days > 30) {
        alerts.push({
          type: ALERT_TYPES.ABSENT,
          severity: days > 60 ? 'urgent' : 'warning',
          message: 'Aucune validation depuis ' + days + ' jours',
          date: new Date().toISOString()
        });
      }
    }

    // ── 2. Eleve sans progression : 0% apres 2 mois ──
    var entree = _dateEntree(s);
    if (entree && _daysSince(entree) > 60 && fil && fil.comps) {
      var totalComps = 0;
      var validComps = 0;
      var epreuves = Object.keys(fil.comps);
      epreuves.forEach(function (ep) {
        (fil.comps[ep] || []).forEach(function (c) {
          totalComps++;
          var lv = _lv(studentCode, ep, c.code);
          if (lv !== 'NE') validComps++;
        });
      });
      if (totalComps > 0 && validComps === 0) {
        alerts.push({
          type: ALERT_TYPES.SANS_PROGRESSION,
          severity: 'urgent',
          message: '0% de crit\u00e8res \u00e9valu\u00e9s apr\u00e8s ' + Math.floor(_daysSince(entree)) + ' jours de formation',
          date: new Date().toISOString()
        });
      }
    }

    // ── 3. Eleve en difficulte : > 50% des criteres en NA ──
    if (fil && fil.comps) {
      var totalC = 0;
      var naC = 0;
      var evaluatedC = 0;
      Object.keys(fil.comps).forEach(function (ep) {
        (fil.comps[ep] || []).forEach(function (c) {
          totalC++;
          var lv = _lv(studentCode, ep, c.code);
          if (lv !== 'NE') evaluatedC++;
          if (lv === 'NA') naC++;
        });
      });
      // Seulement si au moins quelques competences evaluees
      if (evaluatedC >= 3 && naC > evaluatedC * 0.5) {
        alerts.push({
          type: ALERT_TYPES.EN_DIFFICULTE,
          severity: naC > evaluatedC * 0.75 ? 'urgent' : 'warning',
          message: naC + '/' + evaluatedC + ' crit\u00e8res \u00e9valu\u00e9s sont en Non Acquis (' + Math.round(naC / evaluatedC * 100) + '%)',
          date: new Date().toISOString()
        });
      }
    }

    // ── 4. PFMP manquante ──
    var pfmp = (window.pfmpData || {})[studentCode] || {};
    var pfmpPeriodes = pfmp.periodes || pfmp.pfmp || [];
    // Verifier si l'eleve est en 2e annee ou si une PFMP est attendue
    var annee = s.annee || 1;
    if (annee >= 1 && (!pfmpPeriodes.length || pfmpPeriodes.length === 0)) {
      // Verifier si la date de PFMP est passee via le calendrier de la filiere
      var pfmpAttendue = false;
      if (fil && fil.pfmpPeriodes) {
        fil.pfmpPeriodes.forEach(function (p) {
          if (p.fin && new Date(p.fin).getTime() < _now()) pfmpAttendue = true;
        });
      }
      // Heuristique : si apres 3 mois de formation, on s'attend a une PFMP
      if (pfmpAttendue || (entree && _daysSince(entree) > 90)) {
        var hasPfmpData = pfmpPeriodes.some(function (p) {
          return p.entreprise || p.tuteur || p.debut;
        });
        if (!hasPfmpData) {
          alerts.push({
            type: ALERT_TYPES.PFMP_MANQUANTE,
            severity: 'warning',
            message: 'Donn\u00e9es PFMP absentes alors qu\'une p\u00e9riode est attendue',
            date: new Date().toISOString()
          });
        }
      }
    }

    // ── 5. Evaluation incomplete en phase certificative ──
    var phase = window.curPhase || (window.appCfg ? window.appCfg.phase : null) || '';
    if (phase === 'certificative' || phase === 'cert' || phase === 'C') {
      if (fil && fil.comps) {
        Object.keys(fil.comps).forEach(function (ep) {
          var comps = fil.comps[ep] || [];
          var total = comps.length;
          var evaluated = 0;
          comps.forEach(function (c) {
            var lv = _lv(studentCode, ep, c.code);
            if (lv !== 'NE') evaluated++;
          });
          if (total > 0 && evaluated < total * 0.5) {
            alerts.push({
              type: ALERT_TYPES.EVAL_INCOMPLETE,
              severity: evaluated === 0 ? 'urgent' : 'warning',
              message: ep + ' : ' + evaluated + '/' + total + ' comp\u00e9tences \u00e9valu\u00e9es ('
                + Math.round(evaluated / total * 100) + '%) en phase certificative',
              date: new Date().toISOString()
            });
          }
        });
      }
    }

    // ── Reprendre les alertes de alertesModule si disponible ──
    if (window.alertesModule && window.alertesModule.analyzeAll) {
      // Pas de duplication : on ne reprend que les categories non couvertes ci-dessus
      // Les alertes existantes (signatures, tuteur, journal, etc.) sont deja traitees par alertes.js
    }

    return alerts;
  }

  /* ══════════════════════════════════════════════════════
     API PUBLIQUE
     ══════════════════════════════════════════════════════ */

  /**
   * Retourne les alertes pour un eleve
   * @param {string} studentCode
   * @returns {Array<{type, severity, message, date}>}
   */
  function getAlerts(studentCode) {
    var alerts = _detectAlerts(studentCode);

    // Fusionner avec alertesModule existant si dispo
    if (window.alertesModule) {
      try {
        var data = window.alertesModule.analyzeAll();
        var existing = data.students[studentCode] || [];
        existing.forEach(function (a) {
          // Mapper vers le format unifie
          alerts.push({
            type: a.cat || 'legacy',
            severity: a.type || 'info',  // alertes.js utilise 'type' pour la severite
            message: a.msg || '',
            date: new Date().toISOString()
          });
        });
      } catch (e) { /* alertesModule pas pret */ }
    }

    // Trier par severite
    alerts.sort(function (a, b) {
      return (SEVERITY_ORDER[a.severity] || 9) - (SEVERITY_ORDER[b.severity] || 9);
    });

    return alerts;
  }

  /**
   * Retourne les alertes agregees pour une classe
   * @param {string} classeCode
   * @returns {Object} { alerts: [], summary: {critical, urgent, warning, info}, byStudent: {} }
   */
  function getClasseAlerts(classeCode) {
    var result = {
      alerts: [],
      summary: { critical: 0, urgent: 0, warning: 0, info: 0 },
      byStudent: {}
    };

    var sts = (window.students || []).filter(function (s) {
      return s.classe === classeCode;
    });

    sts.forEach(function (s) {
      var alerts = getAlerts(s.code);
      result.byStudent[s.code] = alerts;

      alerts.forEach(function (a) {
        result.alerts.push({
          studentCode: s.code,
          studentNom: (s.nom || '') + ' ' + (s.prenom ? s.prenom.charAt(0) + '.' : ''),
          type: a.type,
          severity: a.severity,
          message: a.message,
          date: a.date
        });

        if (result.summary[a.severity] !== undefined) {
          result.summary[a.severity]++;
        }
      });
    });

    // Trier
    result.alerts.sort(function (a, b) {
      return (SEVERITY_ORDER[a.severity] || 9) - (SEVERITY_ORDER[b.severity] || 9);
    });

    return result;
  }

  /**
   * Affiche un badge avec le nombre d'alertes dans le dashboard
   * @param {string|HTMLElement} container
   */
  function renderAlertsBadge(container) {
    var el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;

    // Compter toutes les alertes
    var totalAlerts = 0;
    var urgentCount = 0;
    var warningCount = 0;

    (window.students || []).forEach(function (s) {
      var alerts = _detectAlerts(s.code);
      alerts.forEach(function (a) {
        totalAlerts++;
        if (a.severity === 'critical' || a.severity === 'urgent') urgentCount++;
        else if (a.severity === 'warning') warningCount++;
      });
    });

    if (totalAlerts === 0) {
      el.innerHTML = '<div style="display:inline-flex;align-items:center;gap:.3rem;'
        + 'background:#E8F5E9;color:#2E7D32;padding:.3rem .7rem;border-radius:12px;'
        + 'font-size:.78rem;font-weight:700;cursor:pointer" title="Aucune alerte">'
        + '\u{1F7E2} 0 alerte</div>';
      return;
    }

    // Badge principal
    var mainColor = urgentCount > 0 ? SEVERITY_COLORS.urgent : SEVERITY_COLORS.warning;
    var icon = urgentCount > 0 ? SEVERITY_ICONS.urgent : SEVERITY_ICONS.warning;

    var html = '<div style="display:inline-flex;align-items:center;gap:.4rem;cursor:pointer" '
      + 'id="alertBadgeBtn">';

    // Compteur principal
    html += '<div style="position:relative;display:inline-flex;align-items:center;gap:.25rem;'
      + 'background:' + mainColor.bg + ';color:' + mainColor.text + ';'
      + 'padding:.3rem .7rem;border-radius:12px;font-size:.78rem;font-weight:700;'
      + 'box-shadow:0 2px 8px ' + mainColor.bg + '44;transition:transform .15s">';
    html += icon + ' ' + totalAlerts + ' alerte' + (totalAlerts > 1 ? 's' : '');
    html += '</div>';

    // Detail inline
    if (urgentCount > 0) {
      html += '<span style="font-size:.68rem;color:#e53935;font-weight:600">'
        + urgentCount + ' urgente' + (urgentCount > 1 ? 's' : '') + '</span>';
    }
    if (warningCount > 0) {
      html += '<span style="font-size:.68rem;color:#FF9800;font-weight:600">'
        + warningCount + ' attention</span>';
    }

    html += '</div>';

    el.innerHTML = html;

    // Animation pulse si urgent
    if (urgentCount > 0) {
      var badge = el.querySelector('#alertBadgeBtn > div');
      if (badge) {
        badge.style.animation = 'alertPulse 2s infinite';
        // Injecter le keyframe si pas deja fait
        if (!document.getElementById('alertPulseStyle')) {
          var style = document.createElement('style');
          style.id = 'alertPulseStyle';
          style.textContent = '@keyframes alertPulse { '
            + '0%, 100% { transform: scale(1); } '
            + '50% { transform: scale(1.05); } }';
          document.head.appendChild(style);
        }
      }
    }
  }

  /**
   * Affiche un panneau complet d'alertes pour une classe
   * @param {string} classeCode
   * @param {string|HTMLElement} container
   */
  function renderClasseAlertsPanel(classeCode, container) {
    var el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;

    var data = getClasseAlerts(classeCode);
    var sum = data.summary;

    if (!data.alerts.length) {
      el.innerHTML = '<div style="text-align:center;padding:1rem;color:#4CAF50;'
        + 'font-size:.85rem;font-weight:600">'
        + '\u{1F7E2} Aucune alerte pour la classe ' + classeCode + '</div>';
      return;
    }

    var html = '';

    // Resume
    html += '<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.6rem">';
    if (sum.critical) html += '<span style="background:#b71c1c;color:#fff;padding:.25rem .6rem;'
      + 'border-radius:8px;font-size:.75rem;font-weight:700">' + SEVERITY_ICONS.critical
      + ' ' + sum.critical + ' critique' + (sum.critical > 1 ? 's' : '') + '</span>';
    if (sum.urgent) html += '<span style="background:#e53935;color:#fff;padding:.25rem .6rem;'
      + 'border-radius:8px;font-size:.75rem;font-weight:700">' + SEVERITY_ICONS.urgent
      + ' ' + sum.urgent + ' urgente' + (sum.urgent > 1 ? 's' : '') + '</span>';
    if (sum.warning) html += '<span style="background:#FF9800;color:#fff;padding:.25rem .6rem;'
      + 'border-radius:8px;font-size:.75rem;font-weight:700">' + SEVERITY_ICONS.warning
      + ' ' + sum.warning + ' attention</span>';
    if (sum.info) html += '<span style="background:#2196F3;color:#fff;padding:.25rem .6rem;'
      + 'border-radius:8px;font-size:.75rem;font-weight:700">' + SEVERITY_ICONS.info
      + ' ' + sum.info + ' info</span>';
    html += '</div>';

    // Liste des alertes
    var maxShow = Math.min(data.alerts.length, 25);
    for (var i = 0; i < maxShow; i++) {
      var a = data.alerts[i];
      var sc = SEVERITY_COLORS[a.severity] || SEVERITY_COLORS.info;
      var si = SEVERITY_ICONS[a.severity] || SEVERITY_ICONS.info;
      var bgColor = a.severity === 'critical' || a.severity === 'urgent' ? '#ffebee'
        : a.severity === 'warning' ? '#fff3e0' : '#e3f2fd';
      var borderColor = sc.badge + '44';

      html += '<div style="display:flex;align-items:flex-start;gap:.4rem;padding:.35rem .5rem;'
        + 'margin-bottom:.25rem;background:' + bgColor + ';border-radius:8px;'
        + 'border:1px solid ' + borderColor + ';font-size:.75rem">';
      html += '<span>' + si + '</span>';
      html += '<div><strong>' + (a.studentNom || '') + '</strong> \u2014 ' + a.message + '</div>';
      html += '</div>';
    }

    if (data.alerts.length > maxShow) {
      html += '<div style="font-size:.7rem;color:#888;text-align:center;padding:.3rem">'
        + '+ ' + (data.alerts.length - maxShow) + ' autres alertes</div>';
    }

    el.innerHTML = html;
  }

  /**
   * Affiche les alertes pour un eleve dans sa fiche
   * @param {string} studentCode
   * @param {string|HTMLElement} container
   */
  function renderStudentAlerts(studentCode, container) {
    var el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;

    var alerts = getAlerts(studentCode);
    if (!alerts.length) {
      el.innerHTML = '<span style="color:#4CAF50;font-size:.75rem;font-weight:600">'
        + '\u{1F7E2} RAS \u2014 Aucune alerte</span>';
      return;
    }

    var html = '<div style="display:flex;flex-direction:column;gap:.25rem">';
    alerts.forEach(function (a) {
      var si = SEVERITY_ICONS[a.severity] || SEVERITY_ICONS.info;
      var sc = SEVERITY_COLORS[a.severity] || SEVERITY_COLORS.info;
      html += '<div style="font-size:.72rem;display:flex;gap:.3rem;align-items:flex-start;'
        + 'padding:.2rem .4rem;background:' + sc.badge + '11;border-radius:6px">'
        + '<span>' + si + '</span><span>' + a.message + '</span></div>';
    });
    html += '</div>';
    el.innerHTML = html;
  }

  /* ══════════════════════════════════════════════════════
     EXPOSITION GLOBALE
     ══════════════════════════════════════════════════════ */
  window.alertSystem = {
    getAlerts: getAlerts,
    getClasseAlerts: getClasseAlerts,
    renderAlertsBadge: renderAlertsBadge,
    renderClasseAlertsPanel: renderClasseAlertsPanel,
    renderStudentAlerts: renderStudentAlerts,
    ALERT_TYPES: ALERT_TYPES
  };

})();
