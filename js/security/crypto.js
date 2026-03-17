/**
 * INERWEB TT-IA — Module Cryptographie v1.0
 * Chiffrement AES-256-GCM pour donnees sensibles
 */
(function() {
  'use strict';

  var ALGO = 'AES-GCM';
  var KEY_LENGTH = 256;
  var IV_LENGTH = 12;
  var SALT_LENGTH = 16;
  var ITERATIONS = 100000;

  /**
   * Derive une cle AES depuis un PIN via PBKDF2
   */
  async function deriveKey(pin, salt) {
    var encoder = new TextEncoder();
    var pinBuffer = encoder.encode(pin);

    var keyMaterial = await crypto.subtle.importKey(
      'raw', pinBuffer, 'PBKDF2', false, ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: ITERATIONS, hash: 'SHA-256' },
      keyMaterial,
      { name: ALGO, length: KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Chiffre des donnees
   * @param {string} plaintext - Donnees en clair
   * @param {string} pin - PIN utilisateur
   * @returns {Promise<string>} Donnees chiffrees en base64
   */
  async function encrypt(plaintext, pin) {
    var encoder = new TextEncoder();
    var data = encoder.encode(plaintext);

    var salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    var iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    var key = await deriveKey(pin, salt);

    var ciphertext = await crypto.subtle.encrypt(
      { name: ALGO, iv: iv }, key, data
    );

    // Assembler : salt + iv + ciphertext
    var result = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(new Uint8Array(ciphertext), salt.length + iv.length);

    return btoa(String.fromCharCode.apply(null, result));
  }

  /**
   * Dechiffre des donnees
   * @param {string} encryptedBase64 - Donnees chiffrees en base64
   * @param {string} pin - PIN utilisateur
   * @returns {Promise<string>} Donnees en clair
   */
  async function decrypt(encryptedBase64, pin) {
    try {
      var raw = atob(encryptedBase64);
      var encrypted = new Uint8Array(raw.length);
      for (var i = 0; i < raw.length; i++) encrypted[i] = raw.charCodeAt(i);

      var salt = encrypted.slice(0, SALT_LENGTH);
      var iv = encrypted.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
      var ciphertext = encrypted.slice(SALT_LENGTH + IV_LENGTH);

      var key = await deriveKey(pin, salt);

      var decrypted = await crypto.subtle.decrypt(
        { name: ALGO, iv: iv }, key, ciphertext
      );

      return new TextDecoder().decode(decrypted);
    } catch (e) {
      throw new Error('PIN incorrect ou donnees corrompues');
    }
  }

  /**
   * Hash du PIN pour verification rapide (sans stocker le PIN)
   */
  async function hashPin(pin) {
    var encoder = new TextEncoder();
    var data = encoder.encode(pin + '_inerweb_salt_v1');
    var hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, new Uint8Array(hash)));
  }

  /**
   * Verifie si un PIN correspond au hash stocke
   */
  async function verifyPin(pin, storedHash) {
    var hash = await hashPin(pin);
    return hash === storedHash;
  }

  window.iwCrypto = {
    encrypt: encrypt,
    decrypt: decrypt,
    hashPin: hashPin,
    verifyPin: verifyPin
  };

})();
