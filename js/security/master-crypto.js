/**
 * INERWEB TT-IA — Crypto maître v2 (stateless, pas de vault local)
 *
 * Dérive AES-256-GCM depuis admin_key + sel fixe.
 * Pas de cache, pas de vault, pas de session : à chaque appel, on dérive.
 * Format des blobs : "iw2:<iv_b64>:<ct_b64>"
 *
 * Usage :
 *   await iwMasterCrypto.init('devSetup2026fh');  // 1 fois par session
 *   const blob = await iwMasterCrypto.chiffrer('ABDILLAHI');
 *   const clair = await iwMasterCrypto.dechiffrer(blob);
 *   const obj2 = await iwMasterCrypto.chiffrerChamps(obj, ['nom','prenom','tel_eleve']);
 */
(function(global){
  'use strict';

  const PREFIX = 'iw2:';
  const SEL = 'inerweb-tt-v2-master-2026';
  const ITER = 100000;

  let _key = null;

  async function init(adminKey) {
    if (_key) return _key;
    if (!adminKey || typeof adminKey !== 'string' || adminKey.length < 4) {
      throw new Error('admin_key requise');
    }
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
      'raw', enc.encode(adminKey),
      'PBKDF2', false, ['deriveKey']
    );
    _key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: enc.encode(SEL), iterations: ITER, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false, ['encrypt', 'decrypt']
    );
    return _key;
  }

  async function chiffrer(plain) {
    if (plain === null || plain === undefined || plain === '') return '';
    if (typeof plain !== 'string') plain = String(plain);
    if (plain.startsWith(PREFIX)) return plain;  // idempotent
    if (!_key) throw new Error('Crypto pas initialisée — appeler init(adminKey)');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, _key, new TextEncoder().encode(plain)
    );
    return PREFIX + b64enc(iv) + ':' + b64enc(new Uint8Array(ct));
  }

  async function dechiffrer(blob) {
    if (blob === null || blob === undefined || blob === '') return '';
    if (typeof blob !== 'string') return String(blob);
    if (!blob.startsWith(PREFIX)) return blob;  // pas chiffré, retour tel quel
    if (!_key) throw new Error('Crypto pas initialisée');
    const parts = blob.slice(PREFIX.length).split(':');
    if (parts.length !== 2) return blob;
    try {
      const iv = b64dec(parts[0]);
      const ct = b64dec(parts[1]);
      const plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv }, _key, ct
      );
      return new TextDecoder().decode(plain);
    } catch(e) {
      return '⛔ illisible';
    }
  }

  /** Chiffre seulement les champs nommés d'un objet, renvoie une copie. */
  async function chiffrerChamps(obj, champs) {
    if (!obj || typeof obj !== 'object') return obj;
    const out = Array.isArray(obj) ? [] : {};
    for (const k of Object.keys(obj)) {
      out[k] = obj[k];
    }
    for (const f of champs) {
      if (out[f] !== undefined && out[f] !== null && out[f] !== '') {
        out[f] = await chiffrer(String(out[f]));
      }
    }
    return out;
  }

  /** Déchiffre tous les blobs iw2: d'un objet (toute clé, peu importe). */
  async function dechiffrerObjet(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const out = Array.isArray(obj) ? [] : {};
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (typeof v === 'string' && v.startsWith(PREFIX)) {
        out[k] = await dechiffrer(v);
      } else if (Array.isArray(v)) {
        out[k] = await Promise.all(v.map(it => dechiffrerObjet(it)));
      } else if (v && typeof v === 'object') {
        out[k] = await dechiffrerObjet(v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  async function dechiffrerListe(list) {
    if (!Array.isArray(list)) return list;
    const res = [];
    for (const it of list) res.push(await dechiffrerObjet(it));
    return res;
  }

  function b64enc(bytes) {
    let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function b64dec(str) {
    const bin = atob(str);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function isReady() { return _key !== null; }
  function PREFIX_OUT() { return PREFIX; }

  global.iwMasterCrypto = {
    init, chiffrer, dechiffrer,
    chiffrerChamps, dechiffrerObjet, dechiffrerListe,
    isReady,
    PREFIX
  };
})(window);
