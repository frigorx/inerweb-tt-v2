/**
 * INERWEB TT-IA — Gestion Conservation Donnees v1.0
 * Durees legales et purge automatique
 */
(function() {
  'use strict';

  var RETENTION = {
    identities: 400,     // Fin annee + 1 mois (~13 mois)
    evaluations: 2190,   // 6 ans (duree legale CCF)
    accessLog: 365,      // 1 an
    photos: 365          // 1 an
  };

  var STORAGE_KEY_LAST_CHECK = 'iw_retention_last_check';

  function shouldRunCheck() {
    var lastCheck = localStorage.getItem(STORAGE_KEY_LAST_CHECK);
    if (!lastCheck) return true;
    var daysSince = (Date.now() - parseInt(lastCheck)) / (1000 * 60 * 60 * 24);
    return daysSince >= 30;
  }

  async function proposeRetentionCheck() {
    if (!shouldRunCheck()) return;
    var stats = await analyzeData();
    if (stats.toDelete.total === 0) {
      localStorage.setItem(STORAGE_KEY_LAST_CHECK, Date.now().toString());
      return;
    }
    showRetentionModal(stats);
  }

  async function analyzeData() {
    var now = Date.now();
    var stats = {
      identities: { total: 0, toDelete: 0 },
      accessLog: { total: 0, toDelete: 0 },
      toDelete: { total: 0 }
    };

    if (window.iwIdentity && typeof iwIdentity.getAll === 'function') {
      try {
        var all = await iwIdentity.getAll();
        var cutoff = now - (RETENTION.identities * 24 * 60 * 60 * 1000);
        for (var key in all) {
          stats.identities.total++;
          if (all[key].lastAccess) {
            var lastAccess = new Date(all[key].lastAccess).getTime();
            if (lastAccess < cutoff) stats.identities.toDelete++;
          }
        }
      } catch (e) { /* identites non chargees */ }
    }

    var log = JSON.parse(localStorage.getItem('iw_access_log') || '[]');
    var logCutoff = now - (RETENTION.accessLog * 24 * 60 * 60 * 1000);
    stats.accessLog.total = log.length;
    for (var i = 0; i < log.length; i++) {
      if (new Date(log[i].timestamp).getTime() < logCutoff) stats.accessLog.toDelete++;
    }

    stats.toDelete.total = stats.identities.toDelete + stats.accessLog.toDelete;
    return stats;
  }

  async function executePurge(options) {
    options = options || {};
    var results = { identities: 0, accessLog: 0 };

    if (options.identities !== false && window.iwIdentity && typeof iwIdentity.purgeOld === 'function') {
      results.identities = await iwIdentity.purgeOld(RETENTION.identities);
    }

    if (options.accessLog !== false) {
      var log = JSON.parse(localStorage.getItem('iw_access_log') || '[]');
      var cutoff = Date.now() - (RETENTION.accessLog * 24 * 60 * 60 * 1000);
      var filtered = log.filter(function(e) { return new Date(e.timestamp).getTime() >= cutoff; });
      localStorage.setItem('iw_access_log', JSON.stringify(filtered));
      results.accessLog = log.length - filtered.length;
    }

    localStorage.setItem(STORAGE_KEY_LAST_CHECK, Date.now().toString());
    return results;
  }

  async function exportAllBeforePurge() {
    var data = {
      exportDate: new Date().toISOString(),
      identities: (window.iwIdentity && typeof iwIdentity.getAll === 'function') ? await iwIdentity.getAll() : {},
      accessLog: JSON.parse(localStorage.getItem('iw_access_log') || '[]'),
      retentionPolicy: RETENTION
    };

    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'inerweb_backup_rgpd_' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(url);
    return true;
  }

  function showRetentionModal(stats) {
    var existing = document.getElementById('retention-modal');
    if (existing) existing.remove();

    var html = '<div id="retention-modal" style="position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:9999;padding:1rem">'
      + '<div style="background:#fff;border-radius:16px;max-width:500px;width:100%;padding:2rem;box-shadow:0 20px 60px rgba(0,0,0,.3)">'
      + '<h2 style="margin:0 0 1rem;color:#1b3a63;font-size:1.2rem">\uD83D\uDDC2\uFE0F Verification des donnees (RGPD)</h2>'
      + '<p style="font-size:.85rem;color:#333">Certaines donnees ont depasse leur duree de conservation :</p>'
      + '<ul style="font-size:.85rem;margin:1rem 0;padding-left:1.5rem">'
      + '<li><strong>' + stats.identities.toDelete + '</strong> eleve(s) non accede(s) depuis plus de ' + RETENTION.identities + ' jours</li>'
      + '<li><strong>' + stats.accessLog.toDelete + '</strong> entree(s) de journal de plus de ' + RETENTION.accessLog + ' jours</li>'
      + '</ul>'
      + '<div style="display:flex;flex-direction:column;gap:.75rem;margin-top:1.5rem">'
      + '<button id="btn-export-purge" style="padding:12px;background:#2d5a8c;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer">\uD83D\uDCE5 Exporter puis supprimer</button>'
      + '<button id="btn-purge-only" style="padding:12px;background:#ffc107;color:#212529;border:none;border-radius:8px;font-weight:700;cursor:pointer">\uD83D\uDDD1\uFE0F Supprimer sans export</button>'
      + '<button id="btn-retention-later" style="padding:12px;background:#f8f9fa;color:#333;border:1px solid #ddd;border-radius:8px;cursor:pointer">\u23F0 Me rappeler plus tard</button>'
      + '</div></div></div>';

    document.body.insertAdjacentHTML('beforeend', html);

    document.getElementById('btn-export-purge').onclick = async function() {
      await exportAllBeforePurge();
      var results = await executePurge();
      document.getElementById('retention-modal').remove();
    };

    document.getElementById('btn-purge-only').onclick = async function() {
      if (confirm('Les donnees seront definitivement supprimees.')) {
        await executePurge();
        document.getElementById('retention-modal').remove();
      }
    };

    document.getElementById('btn-retention-later').onclick = function() {
      document.getElementById('retention-modal').remove();
    };
  }

  window.iwRetention = {
    RETENTION: RETENTION,
    analyze: analyzeData,
    purge: executePurge,
    export: exportAllBeforePurge,
    check: proposeRetentionCheck
  };

})();
