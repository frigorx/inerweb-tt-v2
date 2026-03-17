/**
 * juryModule — Gestion des évaluateurs et commissions CCF
 * inerWeb TT — Multi-filière
 *
 * Fonctionnalités :
 *  1. Pool d'évaluateurs (config) — liste réutilisable
 *  2. Désignation par épreuve/élève — pioche dans le pool + ajout libre
 *  3. Commissions — groupes d'évaluateurs affectés à un lot d'élèves
 *
 * Stockage :
 *  - appCfg.evaluateurs[]     → pool global
 *  - appCfg.commissions[]     → commissions (groupe éval + élèves + épreuve)
 *  - notes[code][ep].evaluateurs[] → évaluateurs désignés pour un élève/épreuve
 */
;(function(){
  'use strict';

  const TYPES = ['Enseignant','Professionnel','Tuteur','Externe'];
  const TYPE_ICON = {Enseignant:'👨‍🏫',Professionnel:'🏢',Tuteur:'🤝',Externe:'👤'};
  const TYPE_CLR  = {Enseignant:'var(--bleu)',Professionnel:'var(--teal)',Tuteur:'var(--orange)',Externe:'var(--gris)'};

  /* ═══════════════════════════════════════
     POOL D'ÉVALUATEURS (config)
     ═══════════════════════════════════════ */
  function init(){
    if(!appCfg.evaluateurs) appCfg.evaluateurs = [];
    if(!appCfg.commissions) appCfg.commissions = [];
  }

  function getPool(){ init(); return appCfg.evaluateurs; }

  function addToPool(ev){
    init();
    if(!ev.nom) return null;
    // Éviter les doublons (même nom)
    const exist = appCfg.evaluateurs.find(e=>e.nom.toLowerCase()===ev.nom.toLowerCase());
    if(exist){ Object.assign(exist, ev); return exist; }
    const entry = {
      id: 'EV-'+Date.now().toString(36),
      nom: ev.nom.trim(),
      qualite: ev.qualite||'',
      type: ev.type||'Enseignant',
      etablissement: ev.etablissement||'',
      tel: ev.tel||'',
      actif: true
    };
    appCfg.evaluateurs.push(entry);
    saveLocal();
    return entry;
  }

  function removeFromPool(id){
    init();
    appCfg.evaluateurs = appCfg.evaluateurs.filter(e=>e.id!==id);
    saveLocal();
  }

  /* ═══════════════════════════════════════
     RENDU POOL (page config)
     ═══════════════════════════════════════ */
  function renderPool(container){
    init();
    const el = typeof container==='string'?document.querySelector(container):container;
    if(!el) return;
    const pool = appCfg.evaluateurs.filter(e=>e.actif!==false);
    let html = `<div style="margin-bottom:.75rem;display:flex;flex-wrap:wrap;gap:.4rem">`;
    pool.forEach(e=>{
      const ico = TYPE_ICON[e.type]||'👤';
      const clr = TYPE_CLR[e.type]||'var(--gris)';
      html += `<div style="display:inline-flex;align-items:center;gap:.3rem;padding:.3rem .6rem;background:${clr}10;border:1px solid ${clr}40;border-radius:20px;font-size:.78rem">
        <span>${ico}</span>
        <strong style="color:${clr}">${esc(e.nom)}</strong>
        ${e.qualite?`<span style="color:var(--gris);font-size:.68rem">${esc(e.qualite)}</span>`:''}
        <button class="jury-pool-del" data-id="${e.id}" style="background:none;border:none;cursor:pointer;color:var(--rouge);font-size:.8rem;padding:0 2px" title="Retirer">✕</button>
      </div>`;
    });
    if(!pool.length) html += '<span style="color:var(--gris);font-size:.78rem">Aucun évaluateur — ajoutez-en ci-dessous</span>';
    html += '</div>';

    // Formulaire ajout
    html += `<div style="display:flex;gap:.4rem;flex-wrap:wrap;align-items:flex-end">
      <div style="flex:2;min-width:140px"><label style="font-size:.68rem;font-weight:700;color:#555">Nom</label><input id="poolNom" style="width:100%;padding:.4rem .5rem;border:2px solid var(--gris3);border-radius:var(--r2);font-size:.82rem" placeholder="Nom Prénom"></div>
      <div style="flex:1;min-width:100px"><label style="font-size:.68rem;font-weight:700;color:#555">Qualité</label><input id="poolQualite" style="width:100%;padding:.4rem .5rem;border:2px solid var(--gris3);border-radius:var(--r2);font-size:.82rem" placeholder="Fonction"></div>
      <div style="flex:1;min-width:100px"><label style="font-size:.68rem;font-weight:700;color:#555">Type</label><select id="poolType" style="width:100%;padding:.4rem .5rem;border:2px solid var(--gris3);border-radius:var(--r2);font-size:.82rem">${TYPES.map(t=>`<option value="${t}">${TYPE_ICON[t]} ${t}</option>`).join('')}</select></div>
      <div style="flex:1;min-width:100px"><label style="font-size:.68rem;font-weight:700;color:#555">Établissement</label><input id="poolEtab" style="width:100%;padding:.4rem .5rem;border:2px solid var(--gris3);border-radius:var(--r2);font-size:.82rem" placeholder="Entreprise/Lycée"></div>
      <button class="btn btn-primary btn-sm" id="poolAddBtn" style="white-space:nowrap">➕ Ajouter</button>
    </div>`;

    el.innerHTML = html;

    // Événements
    el.querySelector('#poolAddBtn')?.addEventListener('click',function(){
      const nom = el.querySelector('#poolNom')?.value?.trim();
      if(!nom){toast('Saisissez un nom','err');return;}
      addToPool({
        nom,
        qualite: el.querySelector('#poolQualite')?.value?.trim()||'',
        type: el.querySelector('#poolType')?.value||'Enseignant',
        etablissement: el.querySelector('#poolEtab')?.value?.trim()||''
      });
      toast(`${nom} ajouté au pool`,'ok');
      renderPool(el);
    });

    el.querySelectorAll('.jury-pool-del').forEach(btn=>{
      btn.addEventListener('click',function(){
        removeFromPool(this.dataset.id);
        toast('Évaluateur retiré','ok');
        renderPool(el);
      });
    });
  }

  /* ═══════════════════════════════════════
     COMMISSIONS (groupes éval → élèves)
     ═══════════════════════════════════════ */
  function addCommission(data){
    init();
    const c = {
      id: 'COM-'+Date.now().toString(36),
      nom: data.nom||'Commission',
      epreuve: data.epreuve||'',
      evaluateurs: data.evaluateurs||[],
      eleves: data.eleves||[],
      date: data.date||new Date().toISOString().slice(0,10)
    };
    appCfg.commissions.push(c);
    // Appliquer : affecter les évaluateurs à chaque élève pour l'épreuve
    c.eleves.forEach(code=>{
      if(!notes[code]) notes[code]={};
      if(!notes[code][c.epreuve]) notes[code][c.epreuve]={};
      notes[code][c.epreuve].evaluateurs = [...new Set([...(notes[code][c.epreuve].evaluateurs||[]),...c.evaluateurs])];
    });
    saveLocal();
    return c;
  }

  function removeCommission(id){
    init();
    appCfg.commissions = appCfg.commissions.filter(c=>c.id!==id);
    saveLocal();
  }

  /* ═══════════════════════════════════════
     DÉSIGNATION PAR ÉPREUVE/ÉLÈVE
     ═══════════════════════════════════════ */
  function getEvaluateurs(code, ep){
    return notes[code]?.[ep]?.evaluateurs || [];
  }

  function setEvaluateurs(code, ep, noms){
    if(!notes[code]) notes[code]={};
    if(!notes[code][ep]) notes[code][ep]={};
    notes[code][ep].evaluateurs = noms;
    saveLocal();
  }

  function addEvaluateur(code, ep, nom){
    const current = getEvaluateurs(code, ep);
    if(!current.includes(nom)){
      current.push(nom);
      setEvaluateurs(code, ep, current);
    }
  }

  function removeEvaluateur(code, ep, nom){
    setEvaluateurs(code, ep, getEvaluateurs(code, ep).filter(n=>n!==nom));
  }

  /* ═══════════════════════════════════════
     PICKER : modale de sélection évaluateurs
     ═══════════════════════════════════════ */
  function showPicker(code, ep, onDone){
    init();
    const current = getEvaluateurs(code, ep);
    const pool = appCfg.evaluateurs.filter(e=>e.actif!==false);

    let body = '<div style="font-size:.82rem">';
    body += '<div style="font-weight:800;color:var(--bleu);margin-bottom:.5rem">📋 Pool d\'évaluateurs</div>';

    if(pool.length){
      body += '<div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.75rem">';
      pool.forEach(e=>{
        const sel = current.includes(e.nom);
        const ico = TYPE_ICON[e.type]||'👤';
        const clr = TYPE_CLR[e.type]||'var(--gris)';
        body += `<label style="display:inline-flex;align-items:center;gap:.3rem;padding:.35rem .6rem;background:${sel?clr+'18':'var(--gris2)'};border:2px solid ${sel?clr:'transparent'};border-radius:20px;cursor:pointer;transition:all .15s">
          <input type="checkbox" class="jury-pick-cb" value="${esc(e.nom)}" ${sel?'checked':''} style="accent-color:${clr}">
          <span>${ico}</span>
          <strong style="color:${clr};font-size:.78rem">${esc(e.nom)}</strong>
          ${e.qualite?`<span style="font-size:.65rem;color:var(--gris)">${esc(e.qualite)}</span>`:''}
        </label>`;
      });
      body += '</div>';
    } else {
      body += '<div style="color:var(--gris);margin-bottom:.75rem">Aucun évaluateur dans le pool. Ajoutez-en dans la configuration ou ci-dessous.</div>';
    }

    body += '<div style="border-top:1px solid var(--gris3);padding-top:.5rem;margin-top:.3rem">';
    body += '<div style="font-weight:700;color:var(--teal);margin-bottom:.3rem">➕ Ajouter un nouvel évaluateur</div>';
    body += '<div style="display:flex;gap:.3rem;flex-wrap:wrap;align-items:flex-end">';
    body += '<input id="juryPickNewNom" placeholder="Nom" style="flex:2;min-width:120px;padding:.4rem;border:2px solid var(--gris3);border-radius:var(--r2);font-size:.8rem">';
    body += '<input id="juryPickNewQual" placeholder="Qualité" style="flex:1;min-width:80px;padding:.4rem;border:2px solid var(--gris3);border-radius:var(--r2);font-size:.8rem">';
    body += `<select id="juryPickNewType" style="flex:1;min-width:80px;padding:.4rem;border:2px solid var(--gris3);border-radius:var(--r2);font-size:.8rem">${TYPES.map(t=>`<option value="${t}">${t}</option>`).join('')}</select>`;
    body += '<button class="btn btn-ghost btn-sm" id="juryPickAddBtn">➕</button>';
    body += '</div></div>';

    // Évaluateurs hors pool déjà assignés
    const horsPool = current.filter(n=>!pool.find(e=>e.nom===n));
    if(horsPool.length){
      body += '<div style="margin-top:.5rem;font-size:.72rem;color:var(--gris)">Déjà assignés (hors pool) : '+horsPool.map(n=>`<strong>${esc(n)}</strong>`).join(', ')+'</div>';
    }
    body += '</div>';

    const student = (students||[]).find(s=>s.code===code);
    const titre = `👥 Évaluateurs — ${ep} — ${student?student.nom+' '+student.prenom:code}`;

    const actions = `<button class="btn btn-primary" id="juryPickSave">✅ Valider</button>
      <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>`;

    showModal(titre, body, actions);

    // Événements dans la modale
    setTimeout(()=>{
      document.getElementById('juryPickAddBtn')?.addEventListener('click',()=>{
        const nom = document.getElementById('juryPickNewNom')?.value?.trim();
        if(!nom){toast('Saisissez un nom','err');return;}
        const qual = document.getElementById('juryPickNewQual')?.value?.trim()||'';
        const type = document.getElementById('juryPickNewType')?.value||'Enseignant';
        addToPool({nom, qualite:qual, type});
        // Rouvrir le picker avec ce nom coché
        const cur2 = [...getCheckboxValues(), nom];
        closeModal();
        setTimeout(()=>{
          setEvaluateurs(code, ep, [...new Set(cur2)]);
          showPicker(code, ep, onDone);
        },100);
      });

      document.getElementById('juryPickSave')?.addEventListener('click',()=>{
        const selected = getCheckboxValues();
        // Ajouter les hors-pool existants
        const final = [...new Set([...selected, ...horsPool])];
        setEvaluateurs(code, ep, final);
        closeModal();
        toast(`${final.length} évaluateur${final.length>1?'s':''} désigné${final.length>1?'s':''}`, 'ok');
        if(onDone) onDone(final);
      });
    },50);
  }

  function getCheckboxValues(){
    return [...document.querySelectorAll('.jury-pick-cb:checked')].map(cb=>cb.value);
  }

  /* ═══════════════════════════════════════
     MODALE COMMISSION (affectation groupée)
     ═══════════════════════════════════════ */
  function showCommissionPicker(opts){
    init();
    const pool = appCfg.evaluateurs.filter(e=>e.actif!==false);
    const filtreClasse = opts?.classe||'';
    const sts = (students||[]).filter(s=>{
      if(filtreClasse && s.classe!==filtreClasse) return false;
      const fk = getFiliere?.(s)||'';
      if(fk==='TNE') return false; // pas d'examen TNE
      return true;
    });

    // Déterminer les épreuves possibles
    const epSet = new Set();
    sts.forEach(s=>{
      (getEpreuves?.(s)||[]).forEach(ep=>epSet.add(ep));
    });
    const epreuves = [...epSet].sort();

    let body = '<div style="font-size:.82rem">';

    // Nom de la commission
    body += '<div class="fr" style="margin-bottom:.5rem"><label style="font-weight:700">Nom de la commission</label><input id="comNom" value="Commission CCF" style="padding:.4rem;border:2px solid var(--gris3);border-radius:var(--r2);width:100%"></div>';

    // Épreuve
    body += '<div class="fr" style="margin-bottom:.5rem"><label style="font-weight:700">Épreuve</label><select id="comEp" style="padding:.4rem;border:2px solid var(--gris3);border-radius:var(--r2);width:100%">';
    epreuves.forEach(ep=>{ body += `<option value="${ep}">${ep}</option>`; });
    body += '</select></div>';

    // Date
    body += `<div class="fr" style="margin-bottom:.5rem"><label style="font-weight:700">Date</label><input id="comDate" type="date" value="${new Date().toISOString().slice(0,10)}" style="padding:.4rem;border:2px solid var(--gris3);border-radius:var(--r2);width:100%"></div>`;

    // Évaluateurs (pool)
    body += '<div style="font-weight:700;margin:.5rem 0 .3rem">Évaluateurs</div>';
    if(pool.length){
      body += '<div style="display:flex;flex-wrap:wrap;gap:.3rem;margin-bottom:.5rem">';
      pool.forEach(e=>{
        const ico = TYPE_ICON[e.type]||'👤';
        body += `<label style="display:inline-flex;align-items:center;gap:.2rem;padding:.3rem .5rem;background:var(--gris2);border-radius:16px;cursor:pointer;font-size:.78rem">
          <input type="checkbox" class="com-eval-cb" value="${esc(e.nom)}">${ico} ${esc(e.nom)}</label>`;
      });
      body += '</div>';
    } else {
      body += '<div style="color:var(--gris);margin-bottom:.5rem">Ajoutez des évaluateurs dans la config d\'abord.</div>';
    }

    // Élèves
    body += '<div style="font-weight:700;margin:.5rem 0 .3rem">Élèves <button class="btn btn-ghost btn-xs" id="comSelAll">Tout cocher</button></div>';
    body += '<div style="max-height:200px;overflow-y:auto;border:1px solid var(--gris3);border-radius:var(--r2);padding:.3rem">';
    sts.forEach(s=>{
      body += `<label style="display:flex;align-items:center;gap:.3rem;padding:.2rem .3rem;font-size:.78rem;cursor:pointer">
        <input type="checkbox" class="com-elv-cb" value="${s.code}"> ${esc(s.nom)} ${esc(s.prenom)} <span style="color:var(--gris);font-size:.65rem">${s.classe||''}</span></label>`;
    });
    body += '</div>';
    body += '</div>';

    showModal('📋 Créer une commission', body,
      '<button class="btn btn-primary" id="comCreateBtn">✅ Créer</button><button class="btn btn-ghost" onclick="closeModal()">Annuler</button>');

    setTimeout(()=>{
      document.getElementById('comSelAll')?.addEventListener('click',()=>{
        document.querySelectorAll('.com-elv-cb').forEach(cb=>{cb.checked=true;});
      });
      document.getElementById('comCreateBtn')?.addEventListener('click',()=>{
        const evalNoms = [...document.querySelectorAll('.com-eval-cb:checked')].map(cb=>cb.value);
        const elvCodes = [...document.querySelectorAll('.com-elv-cb:checked')].map(cb=>cb.value);
        const ep = document.getElementById('comEp')?.value;
        const nom = document.getElementById('comNom')?.value?.trim()||'Commission';
        const date = document.getElementById('comDate')?.value||'';
        if(!evalNoms.length){toast('Sélectionnez au moins un évaluateur','err');return;}
        if(!elvCodes.length){toast('Sélectionnez au moins un élève','err');return;}
        if(!ep){toast('Choisissez une épreuve','err');return;}
        const com = addCommission({nom, epreuve:ep, evaluateurs:evalNoms, eleves:elvCodes, date});
        closeModal();
        toast(`Commission "${nom}" créée : ${evalNoms.length} éval. × ${elvCodes.length} élèves pour ${ep}`,'ok');
      });
    },50);
  }

  /* ═══════════════════════════════════════
     RENDU COMMISSIONS (page config)
     ═══════════════════════════════════════ */
  function renderCommissions(container){
    init();
    const el = typeof container==='string'?document.querySelector(container):container;
    if(!el) return;
    const coms = appCfg.commissions||[];

    if(!coms.length){
      el.innerHTML = '<div style="color:var(--gris);font-size:.78rem;text-align:center;padding:.5rem">Aucune commission créée</div>';
      return;
    }

    let html = '<div style="display:flex;flex-direction:column;gap:.4rem">';
    coms.forEach(c=>{
      html += `<div style="display:flex;align-items:center;gap:.5rem;padding:.4rem .6rem;background:var(--gris2);border-radius:var(--r2);font-size:.78rem">
        <strong style="color:var(--bleu)">${esc(c.nom)}</strong>
        <span class="badge b-bleu" style="font-size:.6rem">${c.epreuve}</span>
        <span style="color:var(--gris)">${c.date||'—'}</span>
        <span style="color:var(--teal)">${c.evaluateurs?.length||0} éval.</span>
        <span style="color:var(--orange)">${c.eleves?.length||0} élèves</span>
        <button class="btn btn-ghost btn-xs com-del" data-id="${c.id}" style="margin-left:auto;color:var(--rouge)">🗑️</button>
      </div>`;
    });
    html += '</div>';
    el.innerHTML = html;

    el.querySelectorAll('.com-del').forEach(btn=>{
      btn.addEventListener('click',function(){
        removeCommission(this.dataset.id);
        toast('Commission supprimée','ok');
        renderCommissions(el);
      });
    });
  }

  /* ═══════════════════════════════════════
     BADGES ÉVALUATEURS (inline dans les panneaux)
     ═══════════════════════════════════════ */
  function renderBadges(code, ep){
    const evals = getEvaluateurs(code, ep);
    if(!evals.length) return '<span style="font-size:.72rem;color:var(--gris)">Aucun évaluateur désigné</span>';
    return evals.map(nom=>{
      const poolEntry = (appCfg.evaluateurs||[]).find(e=>e.nom===nom);
      const ico = poolEntry?TYPE_ICON[poolEntry.type]||'👤':'👤';
      const clr = poolEntry?TYPE_CLR[poolEntry.type]||'var(--gris)':'var(--gris)';
      return `<span style="display:inline-flex;align-items:center;gap:.2rem;padding:.15rem .45rem;background:${clr}12;border:1px solid ${clr}30;border-radius:12px;font-size:.7rem;font-weight:700;color:${clr}">${ico} ${esc(nom)}</span>`;
    }).join(' ');
  }

  /* ═══════════════════════════════════════
     RENDU COMPLET CONFIG (pool + commissions)
     ═══════════════════════════════════════ */
  function render(container){
    init();
    const el = typeof container==='string'?document.querySelector(container):container;
    if(!el) return;
    el.innerHTML = `
      <div style="margin-bottom:1rem">
        <div style="font-weight:800;color:var(--bleu);margin-bottom:.5rem;font-size:.85rem">👥 Pool d'évaluateurs</div>
        <div id="juryPoolZone"></div>
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
          <span style="font-weight:800;color:var(--orange);font-size:.85rem">📋 Commissions CCF</span>
          <button class="btn btn-primary btn-sm" id="juryNewCom">➕ Nouvelle commission</button>
        </div>
        <div id="juryComZone"></div>
      </div>`;
    renderPool(el.querySelector('#juryPoolZone'));
    renderCommissions(el.querySelector('#juryComZone'));

    el.querySelector('#juryNewCom')?.addEventListener('click',()=>{
      const dClasse = document.getElementById('dashFiltreClasse')?.value||'';
      showCommissionPicker({classe:dClasse});
    });
  }

  /* ═══════════════════════════════════════
     COMPAT : export PDF
     ═══════════════════════════════════════ */
  function getForPDF(ctx){
    init();
    // Retro-compat avec l'ancien format
    if(appCfg.jury && appCfg.jury[ctx]){
      const jury = appCfg.jury[ctx];
      return {
        type: ctx,
        date: jury.date||'—',
        distance: jury.distance,
        membres: (jury.members||[]).filter(m=>m.nom).map(m=>({nom:m.nom,qualite:m.qualite||'—',statut:m.statut,entreprise:m.entreprise||'—'}))
      };
    }
    return null;
  }

  function renderSignatureLines(ctx){
    init();
    // Compat ancien format
    if(appCfg.jury && appCfg.jury[ctx]){
      const jury = appCfg.jury[ctx];
      const filled = (jury.members||[]).filter(m=>m.nom);
      if(!filled.length) return '';
      let html = '<div style="display:flex;flex-wrap:wrap;gap:1.5rem;margin-top:1rem;">';
      filled.forEach(m=>{
        html += `<div style="min-width:200px;border-top:1px solid var(--gris3);padding-top:.4rem;">
          <strong>${m.nom}</strong><br>
          <span style="font-size:.8rem;color:var(--gris)">${m.qualite||m.statut}${m.entreprise?' — '+m.entreprise:''}</span>
          <div style="height:50px;"></div></div>`;
      });
      return html+'</div>';
    }
    return '';
  }

  /* ═══════════════════════════════════════
     UTILITAIRE
     ═══════════════════════════════════════ */
  function esc(s){return s==null?'':String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

  /* ═══════════════════════════════════════
     API GLOBALE
     ═══════════════════════════════════════ */
  window.juryModule = {
    init,
    render,
    renderPool,
    renderCommissions,
    renderBadges,
    getPool,
    addToPool,
    removeFromPool,
    getEvaluateurs,
    setEvaluateurs,
    addEvaluateur,
    removeEvaluateur,
    showPicker,
    showCommissionPicker,
    addCommission,
    removeCommission,
    getForPDF,
    renderSignatureLines
  };
})();
