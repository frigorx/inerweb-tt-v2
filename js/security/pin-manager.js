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
      throw new Error('Le PIN doit contenir au moins 6 chiffres');
    }
    if (!/^\d+$/.test(pin)) {
      throw new Error('Le PIN ne doit contenir que des chiffres');
    }

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

  function showLockScreen(message) {
    message = message || '';
    var existing = document.getElementById('iw-lock-screen');
    if (existing) existing.remove();

    var configured = isPinConfigured();

    var html = '<div id="iw-lock-screen" class="lock-screen"><div class="lock-content">'
      + '<div class="lock-logo"><span class="logo-icon">\u2744\uFE0F</span>'
      + '<span class="logo-text">inerWeb TT-IA</span></div>';

    if (message) {
      html += '<div class="lock-message">' + message + '</div>';
    }

    if (configured) {
      html += '<div class="lock-form">'
        + '<label>Entrez votre PIN :</label>'
        + '<input type="password" id="pin-input" inputmode="numeric" pattern="[0-9]*" maxlength="10" autofocus>'
        + '<button id="btn-unlock" class="lock-btn-primary">\uD83D\uDD13 Deverrouiller</button>'
        + '</div>';
    } else {
      html += '<div class="lock-form">'
        + '<label>Creez votre PIN (6 chiffres min.) :</label>'
        + '<input type="password" id="pin-new" inputmode="numeric" pattern="[0-9]*" maxlength="10" placeholder="Nouveau PIN">'
        + '<input type="password" id="pin-confirm" inputmode="numeric" pattern="[0-9]*" maxlength="10" placeholder="Confirmer">'
        + '<button id="btn-setup" class="lock-btn-primary">\uD83D\uDD10 Configurer</button>'
        + '</div>';
    }

    html += '<div id="lock-error" class="lock-error"></div>'
      + '</div></div>';

    document.body.insertAdjacentHTML('beforeend', html);

    if (configured) {
      document.getElementById('btn-unlock').onclick = async function() {
        var pin = document.getElementById('pin-input').value;
        try {
          await unlock(pin);
          document.getElementById('iw-lock-screen').remove();
        } catch (e) {
          document.getElementById('lock-error').textContent = e.message;
          document.getElementById('pin-input').value = '';
          document.getElementById('pin-input').focus();
        }
      };
      document.getElementById('pin-input').onkeypress = function(e) {
        if (e.key === 'Enter') document.getElementById('btn-unlock').click();
      };
    } else {
      document.getElementById('btn-setup').onclick = async function() {
        var pin1 = document.getElementById('pin-new').value;
        var pin2 = document.getElementById('pin-confirm').value;
        if (pin1 !== pin2) {
          document.getElementById('lock-error').textContent = 'Les PIN ne correspondent pas';
          return;
        }
        try {
          await setupPin(pin1);
          document.getElementById('iw-lock-screen').remove();
          document.dispatchEvent(new Event('iw:unlocked'));
        } catch (e) {
          document.getElementById('lock-error').textContent = e.message;
        }
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
