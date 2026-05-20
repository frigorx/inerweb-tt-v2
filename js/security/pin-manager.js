/**
 * INERWEB TT-IA — Gestionnaire PIN v1.0
 * Protection par code PIN + verrouillage automatique
 */
(function() {
  'use strict';

  var STORAGE_KEY_HASH = 'iw_pin_hash';
  var STORAGE_KEY_ATTEMPTS = 'iw_pin_attempts';
  var STORAGE_KEY_LOCKOUT = 'iw_pin_lockout';
  var MAX_ATTEMPTS = 5;
  var LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes
  var AUTO_LOCK_DELAY = 5 * 60 * 1000;  // 5 minutes inactivite

  var _isUnlocked = false;
  var _currentPin = null;
  var _autoLockTimer = null;

  function isPinConfigured() {
    return !!localStorage.getItem(STORAGE_KEY_HASH);
  }

  async function setupPin(pin) {
    if (!pin || pin.length < 6) {
      throw new Error('La phrase doit contenir au moins 6 caractères');
    }
    // v1.1 : alphanumérique accepté (lettres + chiffres) pour permettre des phrases
    // mnémotechniques type "2tne2526". Pas de contrainte de casse ni de caractères
    // spéciaux interdits — Web Crypto + PBKDF2 acceptent tout UTF-8.

    var hash = await window.iwCrypto.hashPin(pin);
    localStorage.setItem(STORAGE_KEY_HASH, hash);
    localStorage.removeItem(STORAGE_KEY_ATTEMPTS);
    localStorage.removeItem(STORAGE_KEY_LOCKOUT);

    _currentPin = pin;
    _isUnlocked = true;
    startAutoLockTimer();
    return true;
  }

  async function unlock(pin) {
    var lockoutUntil = parseInt(localStorage.getItem(STORAGE_KEY_LOCKOUT) || '0');
    if (lockoutUntil > Date.now()) {
      var remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      throw new Error('Trop de tentatives. Reessayez dans ' + remaining + ' secondes.');
    }

    var storedHash = localStorage.getItem(STORAGE_KEY_HASH);
    if (!storedHash) throw new Error('Aucun PIN configure');

    var isValid = await window.iwCrypto.verifyPin(pin, storedHash);

    if (isValid) {
      localStorage.removeItem(STORAGE_KEY_ATTEMPTS);
      localStorage.removeItem(STORAGE_KEY_LOCKOUT);
      _currentPin = pin;
      _isUnlocked = true;
      startAutoLockTimer();
      document.dispatchEvent(new Event('iw:unlocked'));
      return true;
    } else {
      var attempts = parseInt(localStorage.getItem(STORAGE_KEY_ATTEMPTS) || '0') + 1;
      localStorage.setItem(STORAGE_KEY_ATTEMPTS, attempts.toString());

      if (attempts >= MAX_ATTEMPTS) {
        localStorage.setItem(STORAGE_KEY_LOCKOUT, (Date.now() + LOCKOUT_DURATION).toString());
        localStorage.removeItem(STORAGE_KEY_ATTEMPTS);
        throw new Error('Trop de tentatives. Application bloquee pendant 5 minutes.');
      }

      throw new Error('PIN incorrect. ' + (MAX_ATTEMPTS - attempts) + ' tentative(s) restante(s).');
    }
  }

  function lock() {
    _isUnlocked = false;
    _currentPin = null;
    clearAutoLockTimer();
    document.dispatchEvent(new Event('iw:locked'));
  }

  function getPin() {
    if (!_isUnlocked || !_currentPin) throw new Error('Application verrouillee');
    return _currentPin;
  }

  function isAppUnlocked() {
    return _isUnlocked;
  }

  function startAutoLockTimer() {
    clearAutoLockTimer();
    _autoLockTimer = setTimeout(function() {
      lock();
      showLockScreen('Session expiree par inactivite');
    }, AUTO_LOCK_DELAY);
  }

  function clearAutoLockTimer() {
    if (_autoLockTimer) { clearTimeout(_autoLockTimer); _autoLockTimer = null; }
  }

  function resetAutoLock() {
    if (_isUnlocked) startAutoLockTimer();
  }

  async function changePin(oldPin, newPin) {
    var storedHash = localStorage.getItem(STORAGE_KEY_HASH);
    var isValid = await window.iwCrypto.verifyPin(oldPin, storedHash);
    if (!isValid) throw new Error('Ancien PIN incorrect');

    // Re-chiffrer les donnees avec le nouveau PIN
    var identityData = localStorage.getItem('iw_identity_encrypted');
    if (identityData) {
      var decrypted = await window.iwCrypto.decrypt(identityData, oldPin);
      var reEncrypted = await window.iwCrypto.encrypt(decrypted, newPin);
      localStorage.setItem('iw_identity_encrypted', reEncrypted);
    }

    await setupPin(newPin);
    return true;
  }

  function factoryReset() {
    var keysToRemove = [];
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.indexOf('iw_') === 0) keysToRemove.push(key);
    }
    keysToRemove.forEach(function(k) { localStorage.removeItem(k); });
    _isUnlocked = false;
    _currentPin = null;
    return true;
  }

  /**
   * v1.2 \u2014 styles inline robustes (ind\u00E9pendants de css/security.css) + bouton
   * \u00AB R\u00E9initialiser \u00BB toujours visible (issue de secours universelle) +
   * gestion explicite du lockout avec compteur.
   */
  function showLockScreen(message) {
    message = message || '';
    var existing = document.getElementById('iw-lock-screen');
    if (existing) existing.remove();

    var configured = isPinConfigured();
    var lockoutUntil = parseInt(localStorage.getItem(STORAGE_KEY_LOCKOUT) || '0');
    var isLocked = lockoutUntil > Date.now();
    var lockoutSec = isLocked ? Math.ceil((lockoutUntil - Date.now()) / 1000) : 0;

    // Styles inline \u2014 garantis m\u00EAme sans CSS externe
    var S = {
      overlay: 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:999999;background:linear-gradient(135deg,#1b3a63,#0d1f3c);display:flex;align-items:center;justify-content:center;padding:1rem;font-family:\'Calibri\',\'Segoe UI\',sans-serif;',
      box: 'background:#fff;border-radius:16px;padding:2rem;max-width:480px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.4);',
      logo: 'text-align:center;margin-bottom:1.5rem;',
      title: 'font-family:\'Trebuchet MS\',sans-serif;font-size:1.4rem;font-weight:900;color:#1b3a63;',
      sub: 'font-size:.85rem;color:#6c757d;margin-top:.3rem;',
      msg: 'background:#fff8e1;padding:.8rem 1rem;border-radius:8px;border-left:4px solid #f39c12;margin-bottom:1rem;font-size:.95rem;color:#1a2332;',
      label: 'display:block;font-weight:700;color:#1b3a63;margin-bottom:.5rem;font-size:1rem;margin-top:.8rem;',
      input: 'width:100%;padding:.9rem 1rem;font-size:1.1rem;border:2px solid #1b3a63;border-radius:8px;font-family:\'Consolas\',monospace;letter-spacing:.1rem;margin-bottom:.5rem;box-sizing:border-box;',
      btn: 'width:100%;padding:1rem;font-size:1.1rem;font-weight:800;border:none;border-radius:10px;cursor:pointer;margin-top:.8rem;font-family:\'Trebuchet MS\',sans-serif;',
      btnPrimary: 'background:#ff6b35;color:#fff;',
      btnSecondary: 'background:#fff;color:#c62828;border:2px solid #c62828;',
      err: 'background:#fde8e6;color:#b71c1c;padding:.7rem 1rem;border-radius:8px;margin-top:.8rem;font-size:.9rem;min-height:1.2rem;',
      lockBanner: 'background:#fde8e6;border:2px solid #c62828;color:#b71c1c;padding:1rem;border-radius:8px;text-align:center;font-weight:700;margin-bottom:1rem;',
      hint: 'font-size:.8rem;color:#6c757d;margin-top:1.2rem;line-height:1.5;text-align:center;'
    };

    var html = '<div id="iw-lock-screen" style="' + S.overlay + '"><div style="' + S.box + '">'
      + '<div style="' + S.logo + '">'
      + '<div style="font-size:2.5rem">\u2744\uFE0F</div>'
      + '<div style="' + S.title + '">inerWeb TT-IA</div>'
      + '<div style="' + S.sub + '">Suivi de stage \u2014 F. Henninot</div>'
      + '</div>';

    if (message) html += '<div style="' + S.msg + '">' + message + '</div>';

    if (isLocked) {
      // Lockout actif : interdire la saisie + proposer reset usine en issue de secours
      html += '<div style="' + S.lockBanner + '">'
        + '\u23F1 Trop de tentatives. Bloqu\u00E9 pendant <span id="lock-countdown">' + lockoutSec + '</span> secondes.'
        + '</div>'
        + '<div style="font-size:.95rem;color:#1a2332;margin-bottom:1rem">Tu peux soit attendre, soit cliquer ci-dessous pour <strong>tout r\u00E9initialiser</strong> et recr\u00E9er la phrase. Cela ne touche pas les donn\u00E9es c\u00F4t\u00E9 Sheet.</div>'
        + '<button id="btn-reset-lock" style="' + S.btn + S.btnSecondary + '">\uD83D\uDD04 R\u00E9initialiser maintenant (perte vault local)</button>';
    } else if (configured) {
      // Mode d\u00E9verrouillage
      html += '<label style="' + S.label + '">Phrase secr\u00E8te :</label>'
        + '<input type="password" id="pin-input" maxlength="64" autocomplete="current-password" autofocus style="' + S.input + '">'
        + '<button id="btn-unlock" style="' + S.btn + S.btnPrimary + '">\uD83D\uDD13 D\u00E9verrouiller</button>'
        + '<div id="lock-error" style="' + S.err + '"></div>'
        + '<button id="btn-reset" style="' + S.btn + S.btnSecondary + '">\uD83D\uDD04 J\'ai oubli\u00E9 \u2014 r\u00E9initialiser</button>';
    } else {
      // Mode cr\u00E9ation
      html += '<label style="' + S.label + '">Cr\u00E9ez votre phrase secr\u00E8te</label>'
        + '<div style="font-size:.85rem;color:#6c757d;margin-bottom:.5rem">6 caract\u00E8res minimum, \u00E0 partager oralement avec TM.</div>'
        + '<input type="password" id="pin-new" maxlength="64" autocomplete="new-password" placeholder="Phrase secr\u00E8te" style="' + S.input + '">'
        + '<input type="password" id="pin-confirm" maxlength="64" autocomplete="new-password" placeholder="Confirmer" style="' + S.input + '">'
        + '<button id="btn-setup" style="' + S.btn + S.btnPrimary + '">\uD83D\uDD10 Configurer</button>'
        + '<div id="lock-error" style="' + S.err + '"></div>';
    }

    html += '<div style="' + S.hint + '">Aucune donn\u00E9e n\'est envoy\u00E9e \u2014 la phrase reste sur cet appareil.</div>'
      + '</div></div>';

    document.body.insertAdjacentHTML('beforeend', html);

    // \u2500\u2500 Handlers \u2500\u2500
    function fullReset() {
      if (!confirm('Tout r\u00E9initialiser ? Le vault local sera vid\u00E9. Les donn\u00E9es restent dans la Sheet, tu pourras les r\u00E9-importer apr\u00E8s reset.')) return;
      factoryReset();
      var ls = document.getElementById('iw-lock-screen');
      if (ls) ls.remove();
      setTimeout(function() { showLockScreen('Reset effectu\u00E9 \u2014 cr\u00E9e maintenant ta phrase secr\u00E8te.'); }, 100);
    }

    if (isLocked) {
      document.getElementById('btn-reset-lock').onclick = fullReset;
      // Countdown auto
      var cdEl = document.getElementById('lock-countdown');
      var cdInt = setInterval(function() {
        var s = Math.ceil((lockoutUntil - Date.now()) / 1000);
        if (s <= 0) {
          clearInterval(cdInt);
          // Recharger l'\u00E9cran pour passer en mode normal
          var ls = document.getElementById('iw-lock-screen');
          if (ls) ls.remove();
          showLockScreen('Tu peux r\u00E9-essayer.');
          return;
        }
        if (cdEl) cdEl.textContent = s;
      }, 1000);
    } else if (configured) {
      var resetBtn = document.getElementById('btn-reset');
      if (resetBtn) resetBtn.onclick = fullReset;
      document.getElementById('btn-unlock').onclick = async function() {
        var pin = document.getElementById('pin-input').value;
        var errEl = document.getElementById('lock-error');
        if (!pin) { errEl.textContent = 'Phrase vide'; return; }
        try {
          await unlock(pin);
          document.getElementById('iw-lock-screen').remove();
        } catch (e) {
          errEl.textContent = e.message;
          document.getElementById('pin-input').value = '';
          document.getElementById('pin-input').focus();
          // Si lockout vient d'\u00EAtre d\u00E9clench\u00E9 \u2192 r\u00E9afficher l'\u00E9cran lockout
          var lo = parseInt(localStorage.getItem(STORAGE_KEY_LOCKOUT) || '0');
          if (lo > Date.now()) {
            document.getElementById('iw-lock-screen').remove();
            showLockScreen('');
          }
        }
      };
      document.getElementById('pin-input').onkeypress = function(e) {
        if (e.key === 'Enter') document.getElementById('btn-unlock').click();
      };
    } else {
      document.getElementById('btn-setup').onclick = async function() {
        var pin1 = document.getElementById('pin-new').value;
        var pin2 = document.getElementById('pin-confirm').value;
        var errEl = document.getElementById('lock-error');
        if (!pin1) { errEl.textContent = 'Phrase vide'; return; }
        if (pin1.length < 6) { errEl.textContent = 'Phrase trop courte (6 caract\u00E8res min.)'; return; }
        if (pin1 !== pin2) { errEl.textContent = 'Les deux phrases ne correspondent pas'; return; }
        try {
          await setupPin(pin1);
          document.getElementById('iw-lock-screen').remove();
          document.dispatchEvent(new Event('iw:unlocked'));
        } catch (e) {
          errEl.textContent = e.message;
        }
      };
      document.getElementById('pin-confirm').onkeypress = function(e) {
        if (e.key === 'Enter') document.getElementById('btn-setup').click();
      };
    }
  }

  // Reset timer a chaque activite utilisateur
  ['click', 'keypress', 'scroll', 'touchstart'].forEach(function(evt) {
    document.addEventListener(evt, resetAutoLock, { passive: true });
  });

  window.iwPin = {
    isPinConfigured: isPinConfigured,
    setupPin: setupPin,
    unlock: unlock,
    lock: lock,
    getPin: getPin,
    isUnlocked: isAppUnlocked,
    changePin: changePin,
    factoryReset: factoryReset,
    showLockScreen: showLockScreen
  };

})();
