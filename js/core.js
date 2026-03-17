/**
 * core.js — Noyau utilitaire commun inerWeb TT
 * Regroupe les fonctions partagées entre toutes les pages.
 * Doit être chargé AVANT les autres modules.
 */
;(function(){
  'use strict';

  /* ═══════════════════════════════════════
     ÉCHAPPEMENT HTML (anti-XSS)
     ═══════════════════════════════════════ */
  function esc(s){
    if(s==null)return'';
    return String(s)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  /* ═══════════════════════════════════════
     TOAST (notifications)
     ═══════════════════════════════════════ */
  function toast(msg,type){
    type=type||'inf';
    var c=document.getElementById('toastC');
    if(!c){
      c=document.createElement('div');
      c.id='toastC';
      c.style.cssText='position:fixed;top:1rem;right:1rem;z-index:99999;display:flex;flex-direction:column;gap:.3rem;pointer-events:none';
      document.body.appendChild(c);
    }
    var t=document.createElement('div');
    t.className='toast '+type;
    t.style.cssText='padding:.5rem .8rem;border-radius:8px;font-size:.8rem;font-family:Nunito,sans-serif;pointer-events:auto;box-shadow:0 2px 12px rgba(0,0,0,.15);max-width:320px;word-break:break-word;'
      +(type==='err'?'background:#fde8e8;color:#c0392b;border-left:3px solid #e74c3c;'
       :type==='ok'?'background:#e8f8e8;color:#1a7d3e;border-left:3px solid #27ae60;'
       :type==='warn'?'background:#fff8e0;color:#8b6d00;border-left:3px solid #f39c12;'
       :'background:#e8f0ff;color:#1b3a63;border-left:3px solid #2196F3;');
    t.textContent=msg;
    c.appendChild(t);
    setTimeout(function(){t.style.cssText+='opacity:0;transition:opacity .3s';setTimeout(function(){t.remove();},300);},3500);
  }

  /* ═══════════════════════════════════════
     DATES
     ═══════════════════════════════════════ */
  function dateFR(iso){
    if(!iso)return'—';
    try{return new Date(iso).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'});}
    catch(e){return String(iso).slice(0,10);}
  }

  function dateISO(){
    return new Date().toISOString();
  }

  /* ═══════════════════════════════════════
     PARSE SÉCURISÉ
     ═══════════════════════════════════════ */
  function safeParse(str,fallback){
    try{return JSON.parse(str);}
    catch(e){return fallback!==undefined?fallback:null;}
  }

  /* ═══════════════════════════════════════
     FORMATAGE WHATSAPP
     ═══════════════════════════════════════ */
  function formatWA(tel){
    if(!tel)return'';
    var n=tel.replace(/[\s.\-()]/g,'');
    if(n.charAt(0)==='0')n='33'+n.slice(1);
    if(n.charAt(0)!=='+'&&n.slice(0,2)!=='33')n='33'+n;
    return n.replace('+','');
  }

  /* ═══════════════════════════════════════
     LOCALSTORAGE SAFE
     ═══════════════════════════════════════ */
  function lsGet(key,fallback){
    try{var v=localStorage.getItem(key);return v?JSON.parse(v):(fallback!==undefined?fallback:null);}
    catch(e){return fallback!==undefined?fallback:null;}
  }

  function lsSet(key,val){
    try{localStorage.setItem(key,JSON.stringify(val));return true;}
    catch(e){return false;}
  }

  /* ═══════════════════════════════════════
     MODAL GÉNÉRIQUE
     ═══════════════════════════════════════ */
  function showModal(title,body,actions){
    var ov=document.getElementById('modalOv');
    if(!ov)return;
    var t=document.getElementById('modalTitle');
    var b=document.getElementById('modalBody');
    var a=document.getElementById('modalAct');
    if(t)t.textContent=title;
    if(b)b.innerHTML=body;
    if(a)a.innerHTML=actions||'';
    ov.classList.add('open');
  }

  function closeModal(){
    var ov=document.getElementById('modalOv');
    if(ov)ov.classList.remove('open');
  }

  /* ═══════════════════════════════════════
     API GLOBALE
     ═══════════════════════════════════════ */
  window.iwCore={
    esc:esc,
    toast:toast,
    dateFR:dateFR,
    dateISO:dateISO,
    safeParse:safeParse,
    formatWA:formatWA,
    lsGet:lsGet,
    lsSet:lsSet,
    showModal:showModal,
    closeModal:closeModal
  };

  // Rétro-compatibilité : exposer les fonctions communes si pas déjà définies
  if(!window.esc)window.esc=esc;
  if(!window.toast)window.toast=toast;
  if(!window.dateFR)window.dateFR=dateFR;
  if(!window.safeParse)window.safeParse=safeParse;
  if(!window.formatWA)window.formatWA=formatWA;
  if(!window.showModal)window.showModal=showModal;
  if(!window.closeModal)window.closeModal=closeModal;

})();
