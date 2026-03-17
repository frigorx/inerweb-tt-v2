/**
 * journal-mod.js — Journal d'actions & liste de backups & purge
 * Extrait de inerweb_prof.html (Phase 1)
 */
;(function(){
  'use strict';

  function renderJournal(){
    var c=document.getElementById('journalGlobal');
    var validations=window.validations||{};
    var students=window.students||[];
    var dateFR=window.dateFR;
    var esc=window.esc;
    var all=[];
    Object.entries(validations).forEach(function(entry){
      var code=entry[0],vals=entry[1];
      var s=students.find(function(x){return x.code===code;});
      (Array.isArray(vals)?vals:[]).forEach(function(v){
        if(v.epreuve&&v.competence&&v.niveau&&v.timestamp)
          all.push(Object.assign({},v,{eNom:s?(s.nom+' '+(s.prenom||'')):code}));
      });
    });
    all.sort(function(a,b){return String(b.timestamp||'').localeCompare(String(a.timestamp||''));});
    c.innerHTML=all.slice(0,50).map(function(j){
      return '<div class="jentry '+esc(j.phase||'')+'"><span class="j-date">'+dateFR(j.timestamp)+'</span> · <strong style="color:var(--bleu2)">'+esc(j.eNom)+'</strong> · '+esc(j.epreuve)+' '+esc(j.competence)+' → <strong>'+esc(j.niveau)+'</strong></div>';
    }).join('')||'<div class="alert al-info">Aucune action</div>';
  }

  async function renderBackupList(){
    var c=document.getElementById('backupList');
    if(!c)return;
    var bks=await window.getBackups();
    if(!bks.length){c.innerHTML='<div class="alert al-info">Aucun backup disponible</div>';return;}
    c.innerHTML=bks.slice(0,20).map(function(b){
      var d=new Date(b.timestamp);
      var dateStr=d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'});
      var timeStr=d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
      var nbEleves=b.students?.length||0;
      var nbVals=Object.values(b.validations||{}).reduce(function(a,v){return a+(Array.isArray(v)?v.length:0);},0);
      return '<div style="display:flex;align-items:center;gap:.5rem;padding:.5rem;background:var(--gris2);border-radius:var(--r2);margin-bottom:.3rem;'+(b.auto?'':'border-left:3px solid var(--bleu)')+'">'
        +'<div style="flex:1">'
        +'<div style="font-size:.8rem;font-weight:700">'+dateStr+' à '+timeStr+' '+(b.auto?'<span style="font-size:.65rem;color:var(--gris)">(auto)</span>':'<span style="font-size:.65rem;color:var(--bleu)">(manuel)</span>')+'</div>'
        +'<div style="font-size:.7rem;color:var(--gris)">'+nbEleves+' élève(s) · '+nbVals+' éval(s)</div>'
        +'</div>'
        +'<button class="btn btn-vert btn-xs" onclick="restoreBackup('+b.id+')">♻️</button>'
        +'<button class="btn btn-rouge btn-xs" onclick="deleteBackup('+b.id+')">🗑️</button>'
        +'</div>';
    }).join('');
  }

  function confirmPurge(){
    var skKey=window.SK||'inerweb-tt-fe-v1';
    window.showModal('🗑️ Purger','<div class="alert al-danger">⚠️ Efface TOUTES les données locales. Le cloud n\'est pas affecté.</div>',
      '<button class="btn btn-rouge" onclick="localStorage.removeItem(\''+skKey+'\');closeModal();location.reload()">Oui, tout effacer</button><button class="btn btn-ghost" onclick="closeModal()">Annuler</button>');
  }

  // Exposition globale
  window.renderJournal=renderJournal;
  window.renderBackupList=renderBackupList;
  window.confirmPurge=confirmPurge;
})();
