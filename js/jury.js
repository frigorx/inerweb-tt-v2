/**
 * juryModule — Gestion des jurys CCF pour inerWeb TT
 * Trois jurys : atelier, pfmp, retour
 * Stockage dans appCfg.jury
 */
;(function(){
  'use strict';

  /* --- Constantes --- */
  const STATUTS = ['Pro','Général','Tuteur','Externe'];
  const JURYS = {
    atelier: { titre:'Jury Atelier', defMembers:[{nom:'',qualite:'',statut:'Pro',entreprise:''}] },
    pfmp:    { titre:'Jury PFMP',    defMembers:[{nom:'',qualite:'',statut:'Tuteur',entreprise:''},{nom:'',qualite:'',statut:'Pro',entreprise:''}] },
    retour:  { titre:'Jury Retour',  defMembers:[{nom:'',qualite:'',statut:'Pro',entreprise:''},{nom:'',qualite:'',statut:'Général',entreprise:''}] }
  };

  /* --- Utilitaire : copie profonde simple --- */
  function clone(o){ return JSON.parse(JSON.stringify(o)); }

  /* --- Initialisation des données par défaut --- */
  function init(){
    if(!appCfg.jury) appCfg.jury = {};
    for(const [key,cfg] of Object.entries(JURYS)){
      if(!appCfg.jury[key]){
        appCfg.jury[key] = { date:'', members:clone(cfg.defMembers) };
      }
      /* pfmp possède un flag distance */
      if(key==='pfmp' && appCfg.jury[key].distance===undefined){
        appCfg.jury[key].distance = false;
      }
    }
  }

  /* --- Construction du select statut --- */
  function buildSelect(val){
    let h = '<select class="jury-statut">';
    STATUTS.forEach(s=>{
      h += `<option value="${s}"${s===val?' selected':''}>${s}</option>`;
    });
    return h+'</select>';
  }

  /* --- Rendu d'un membre (une ligne) --- */
  function renderMember(m, juryKey, idx){
    return `<div class="jury-member fr" data-jury="${juryKey}" data-idx="${idx}">
      <input class="jury-nom" type="text" placeholder="Nom" value="${m.nom}">
      <input class="jury-qualite" type="text" placeholder="Qualité" value="${m.qualite}">
      ${buildSelect(m.statut)}
      <input class="jury-entreprise" type="text" placeholder="Entreprise" value="${m.entreprise}">
      <button class="btn btn-sm btn-ghost jury-del" title="Supprimer">✕</button>
    </div>`;
  }

  /* --- Rendu d'un bloc jury --- */
  function renderJury(key){
    const data = appCfg.jury[key];
    const cfg  = JURYS[key];
    let html = `<div class="card jury-card" data-jury="${key}">
      <h3>${cfg.titre}</h3>
      <div class="fr" style="gap:.5rem;margin-bottom:.5rem;">
        <label class="lbl">Date</label>
        <input type="date" class="jury-date" value="${data.date||''}">`;
    /* Option distance pour pfmp */
    if(key==='pfmp'){
      html += `<label class="lbl" style="margin-left:.75rem;">
        <input type="checkbox" class="jury-distance"${data.distance?' checked':''}>
        À distance
      </label>`;
    }
    html += '</div><div class="jury-members">';
    data.members.forEach((m,i)=>{ html += renderMember(m, key, i); });
    html += `</div>
      <button class="btn btn-sm btn-primary jury-add" data-jury="${key}">＋ Ajouter un membre</button>
    </div>`;
    return html;
  }

  /* --- Rendu complet dans un conteneur DOM --- */
  function render(container){
    init();
    let html = '<div class="jury-section">';
    for(const key of Object.keys(JURYS)) html += renderJury(key);
    html += '</div>';
    container.innerHTML = html;
    bindEvents(container);
  }

  /* --- Attachement des événements --- */
  function bindEvents(root){
    /* Ajout de membre */
    root.querySelectorAll('.jury-add').forEach(btn=>{
      btn.addEventListener('click',function(){
        const key = this.dataset.jury;
        appCfg.jury[key].members.push({nom:'',qualite:'',statut:'Pro',entreprise:''});
        render(root);
        saveLocal();
      });
    });
    /* Suppression de membre */
    root.querySelectorAll('.jury-del').forEach(btn=>{
      btn.addEventListener('click',function(){
        const row = this.closest('.jury-member');
        const key = row.dataset.jury;
        const idx = +row.dataset.idx;
        appCfg.jury[key].members.splice(idx,1);
        render(root);
        saveLocal();
      });
    });
    /* Sauvegarde auto au changement */
    root.querySelectorAll('input,select').forEach(el=>{
      el.addEventListener('change',()=>{ save(root); saveLocal(); });
    });
  }

  /* --- Lecture DOM → appCfg.jury --- */
  function save(root){
    const container = root || document.querySelector('.jury-section');
    if(!container) return;
    for(const key of Object.keys(JURYS)){
      const card = container.querySelector(`.jury-card[data-jury="${key}"]`);
      if(!card) continue;
      const dateEl = card.querySelector('.jury-date');
      appCfg.jury[key].date = dateEl ? dateEl.value : '';
      /* Flag distance (pfmp) */
      if(key==='pfmp'){
        const cb = card.querySelector('.jury-distance');
        appCfg.jury[key].distance = cb ? cb.checked : false;
      }
      const rows = card.querySelectorAll('.jury-member');
      appCfg.jury[key].members = [];
      rows.forEach(r=>{
        appCfg.jury[key].members.push({
          nom:        r.querySelector('.jury-nom').value.trim(),
          qualite:    r.querySelector('.jury-qualite').value.trim(),
          statut:     r.querySelector('.jury-statut').value,
          entreprise: r.querySelector('.jury-entreprise').value.trim()
        });
      });
    }
  }

  /* --- Données formatées pour export PDF --- */
  function getForPDF(ctx){
    init();
    const key = ctx || 'atelier';
    const jury = appCfg.jury[key];
    if(!jury) return null;
    return {
      type:     JURYS[key].titre,
      date:     jury.date || '—',
      distance: key==='pfmp' ? jury.distance : undefined,
      membres:  jury.members.filter(m=>m.nom).map(m=>({
        nom:        m.nom,
        qualite:    m.qualite || '—',
        statut:     m.statut,
        entreprise: m.entreprise || '—'
      }))
    };
  }

  /* --- Lignes de signature HTML --- */
  function renderSignatureLines(ctx){
    init();
    const key = ctx || 'atelier';
    const jury = appCfg.jury[key];
    if(!jury) return '';
    const filled = jury.members.filter(m=>m.nom);
    if(!filled.length) return '<p style="color:var(--gris)">Aucun membre de jury renseigné.</p>';
    let html = '<div class="jury-signatures" style="display:flex;flex-wrap:wrap;gap:1.5rem;margin-top:1rem;">';
    filled.forEach(m=>{
      html += `<div style="min-width:200px;border-top:1px solid var(--gris3);padding-top:.4rem;">
        <strong>${m.nom}</strong><br>
        <span style="font-size:.8rem;color:var(--gris)">${m.qualite||m.statut}${m.entreprise?' — '+m.entreprise:''}</span>
        <div style="height:50px;"></div>
      </div>`;
    });
    html += '</div>';
    return html;
  }

  /* --- Exposition globale --- */
  window.juryModule = { init, render, save, getForPDF, renderSignatureLines };
})();
