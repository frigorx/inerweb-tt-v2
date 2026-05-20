/**
 * INERWEB TT-IA — PIN élève 6 chiffres v1.0
 *
 * Génération + hash du PIN élève (6 chiffres). Le PIN clair vit dans le
 * vault chiffré local (côté prof, sous iwIdentity.pin_eleve). Le HASH
 * PBKDF2(pin, salt=token_eleve, 50000 iter, SHA-256) est stocké côté Sheet
 * dans la table ElevePinHash, jamais le PIN clair.
 *
 * L'élève saisit son PIN dans eleve.html, le client calcule le hash et
 * l'envoie au serveur pour vérification. Le serveur ne voit jamais le PIN.
 */
(function(global){
  'use strict';

  const PBKDF2_ITER = 50000;
  const PIN_LENGTH = 6;

  function genererPin() {
    // 6 chiffres, sans 0 ni 1 en première position pour éviter ambigüité visuelle
    var chars = '23456789';
    var pin = chars.charAt(Math.floor(Math.random() * chars.length));
    for (var i = 1; i < PIN_LENGTH; i++) {
      pin += String.fromCharCode(48 + Math.floor(Math.random() * 10));
    }
    return pin;
  }

  async function hashPin(pin, salt) {
    if (!pin || !salt) throw new Error('pin et salt requis');
    var enc = new TextEncoder();
    var baseKey = await crypto.subtle.importKey(
      'raw', enc.encode(String(pin)),
      'PBKDF2', false, ['deriveBits']
    );
    var bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: enc.encode(String(salt)),
        iterations: PBKDF2_ITER,
        hash: 'SHA-256'
      },
      baseKey,
      256
    );
    // base64
    var bytes = new Uint8Array(bits);
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }

  global.iwPinEleve = {
    genererPin: genererPin,
    hashPin: hashPin,
    PIN_LENGTH: PIN_LENGTH
  };
})(window);
