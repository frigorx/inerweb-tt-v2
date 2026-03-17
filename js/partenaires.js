/**
 * partenaires.js — Gestion des partenaires / entreprises de stage
 * Extrait de inerweb_prof.html (Phase 1)
 */
;(function(){
  'use strict';

  function renderParts(){
    var c=document.getElementById('partList');
    var partenaires=window.partenaires||[];
    var esc=window.esc;
    if(!partenaires.length){c.innerHTML='<div class="empty"><div class="ei">🏢</div><p>Aucun partenaire</p></div>';return;}
    c.innerHTML=partenaires.map(function(p,i){
      return '<div class="part-card">'
        +'<div style="display:flex;justify-content:space-between;align-items:flex-start">'
        +'<div>'
        +'<div class="part-nom">'+esc(p.nom)+'</div>'
        +'<div class="part-sub">👤 '+esc(p.tuteur||'—')+' '+(p.fonction?'· '+esc(p.fonction):'')+'</div>'
        +(p.tel?'<div class="part-sub">📱 '+esc(p.tel)+'</div>':'')
        +(p.email?'<div class="part-sub">✉️ '+esc(p.email)+'</div>':'')
        +'<div class="stars">'+'★'.repeat(p.etoiles||0)+'☆'.repeat(5-(p.etoiles||0))+'</div>'
        +'</div>'
        +'<div style="display:flex;gap:.25rem">'
        +'<button class="btn btn-rouge btn-xs" onclick="delPart('+i+')">🗑️</button>'
        +'</div>'
        +'</div>'
        +(p.notes?'<div style="font-size:.72rem;color:var(--gris);margin-top:.4rem;font-style:italic">'+esc(p.notes)+'</div>':'')
        +'</div>';
    }).join('');
  }

  function showAddPart(){
    window.showModal('🏢 Nouveau partenaire',
      '<div class="fr"><label>Nom entreprise</label><input id="pNom" placeholder="Climafroid SARL"></div>'
      +'<div class="grid2" style="margin-top:.5rem"><div class="fr"><label>Tuteur</label><input id="pTut" placeholder="Jean Martin"></div><div class="fr"><label>Fonction</label><input id="pFonc" placeholder="Chef d\'atelier"></div></div>'
      +'<div class="grid2" style="margin-top:.5rem"><div class="fr"><label>Téléphone</label><input id="pTel" type="tel"></div><div class="fr"><label>Email</label><input id="pEmail" type="email"></div></div>'
      +'<div class="fr" style="margin-top:.5rem"><label>Qualité (étoiles 1-5)</label><input id="pEto" type="number" min="1" max="5" value="3"></div>'
      +'<div class="fr" style="margin-top:.5rem"><label>Notes internes</label><textarea id="pNotes" rows="2" style="width:100%;padding:.5rem;border:2px solid var(--gris3);border-radius:var(--r2);"></textarea></div>',
      '<button class="btn btn-teal" onclick="addPart()">➕ Ajouter</button><button class="btn btn-ghost" onclick="closeModal()">Annuler</button>');
  }

  function addPart(){
    var partenaires=window.partenaires;
    partenaires.push({nom:document.getElementById('pNom').value.trim(),tuteur:document.getElementById('pTut').value.trim(),fonction:document.getElementById('pFonc').value.trim(),tel:document.getElementById('pTel').value.trim(),email:document.getElementById('pEmail').value.trim(),etoiles:parseInt(document.getElementById('pEto').value)||3,notes:document.getElementById('pNotes').value.trim()});
    localStorage.setItem(window.SPART,JSON.stringify(partenaires));
    window.closeModal();renderParts();window.toast('Partenaire ajouté','ok');
  }

  function delPart(i){
    var partenaires=window.partenaires;
    partenaires.splice(i,1);
    localStorage.setItem(window.SPART,JSON.stringify(partenaires));
    renderParts();window.toast('Supprimé','inf');
  }

  // Exposition globale
  window.renderParts=renderParts;
  window.showAddPart=showAddPart;
  window.addPart=addPart;
  window.delPart=delPart;
})();
