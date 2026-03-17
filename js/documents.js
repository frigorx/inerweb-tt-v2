/**
 * documents.js — Gestion des documents partagés (drive)
 * Extrait de inerweb_prof.html (Phase 1)
 */
;(function(){
  'use strict';

  var DOC_CAT_LABELS={convention:'📋 Convention','rapport-type':'📝 Rapport type',support:'📊 Support',guide:'📖 Guide',autre:'📎 Autre'};
  var DOC_VIS_LABELS={tous:'Élèves + Tuteurs',eleves:'Élèves',tuteurs:'Tuteurs',profs:'Profs'};
  var DOC_VIS_COLORS={tous:'var(--teal)',eleves:'var(--violet)',tuteurs:'var(--bleu2)',profs:'var(--orange)'};

  // Exposer les constantes pour d'éventuels usages externes
  window.DOC_CAT_LABELS=DOC_CAT_LABELS;
  window.DOC_VIS_LABELS=DOC_VIS_LABELS;
  window.DOC_VIS_COLORS=DOC_VIS_COLORS;

  function toggleDocEleve(){
    var vis=document.getElementById('docVisibilite').value;
    var wrap=document.getElementById('docEleveWrap');
    wrap.style.display=vis==='profs'?'':'none';
    if(vis==='profs'){
      var sel=document.getElementById('docEleveCode');
      var students=window.students||[];
      var esc=window.esc;
      sel.innerHTML='<option value="">— Aucun (document global) —</option>'+students.map(function(s){return '<option value="'+esc(s.code)+'">'+esc(s.nom)+' '+esc(s.prenom||'')+'</option>';}).join('');
    }
  }

  function docFileSelected(input){
    var info=document.getElementById('docFileInfo');
    if(input.files.length){
      var f=input.files[0];
      var sz=f.size<1024*1024?(Math.round(f.size/1024)+'Ko'):(Math.round(f.size/1024/1024*10)/10+'Mo');
      info.innerHTML='<strong>'+window.esc(f.name)+'</strong> — '+sz;
    }else{info.innerHTML='';}
  }

  function ajouterDocument(){
    var input=document.getElementById('docFichier');
    if(!input.files.length){window.toast('Sélectionnez un fichier','err');return;}
    var f=input.files[0];
    if(f.size>10*1024*1024){window.toast('Fichier trop volumineux (max 10 Mo)','err');return;}
    var cat=document.getElementById('docCategorie').value;
    var vis=document.getElementById('docVisibilite').value;
    var nom=document.getElementById('docNom').value.trim()||f.name;
    var eleveCode=(vis==='profs'?document.getElementById('docEleveCode')?.value:'')||'';
    var reader=new FileReader();
    reader.onload=function(e){
      var doc={
        id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),
        nom:nom,
        filename:f.name,
        categorie:cat,
        visibilite:vis,
        eleveCode:eleveCode,
        type:f.type,
        taille:f.size,
        dataUrl:e.target.result,
        date:new Date().toISOString(),
        auteur:(window.cfg&&window.cfg.nomProf)||'Prof'
      };
      window.sharedDocs.push(doc);
      window.saveLocal();
      renderSharedDocs();
      window.toast('Document ajouté au drive','ok');
      // Reset
      input.value='';
      document.getElementById('docNom').value='';
      document.getElementById('docFileInfo').innerHTML='';
    };
    reader.readAsDataURL(f);
  }

  function supprimerDoc(id){
    window.showModal('Confirmer la suppression','<p>Supprimer ce document du drive ?</p><p style="color:var(--rouge);font-size:.9em;">Cette action est irréversible.</p>','<button class="btn btn-rouge" onclick="window.sharedDocs=window.sharedDocs.filter(function(d){return d.id!==\''+id+'\';});window.saveLocal();window.renderSharedDocs();window.toast(\'Document supprimé\',\'warn\');closeModal();">Supprimer</button><button class="btn" onclick="closeModal()">Annuler</button>');
  }

  function telechargerDoc(id){
    var sharedDocs=window.sharedDocs||[];
    var doc=sharedDocs.find(function(d){return d.id===id;});
    if(!doc)return;
    var a=document.createElement('a');
    a.href=doc.dataUrl;
    a.download=doc.filename||doc.nom;
    document.body.appendChild(a);a.click();document.body.removeChild(a);
  }

  function renderSharedDocs(){
    var c=document.getElementById('sharedDocsList');
    if(!c)return;
    var sharedDocs=window.sharedDocs||[];
    var esc=window.esc;
    var students=window.students||[];
    if(!sharedDocs.length){
      c.innerHTML='<div class="empty"><div class="ei">📁</div><p>Aucun document partagé</p><p style="font-size:.75rem;color:var(--gris)">Ajoutez des conventions, rapports types, guides...</p></div>';
      return;
    }
    // Grouper par catégorie
    var byCat={};
    sharedDocs.forEach(function(d){if(!byCat[d.categorie])byCat[d.categorie]=[];byCat[d.categorie].push(d);});
    var extIcons={pdf:'📕',doc:'📘',docx:'📘',ppt:'📙',pptx:'📙',xls:'📗',xlsx:'📗',odt:'📘',odp:'📙',ods:'📗',jpg:'🖼️',jpeg:'🖼️',png:'🖼️',txt:'📄'};
    c.innerHTML=Object.keys(byCat).map(function(cat){
      var docs=byCat[cat];
      return '<div class="card" style="border-left:3px solid '+(DOC_VIS_COLORS[docs[0].visibilite]||'var(--gris)')+'">'
        +'<div class="card-title">'+(DOC_CAT_LABELS[cat]||cat)+' <span class="badge" style="background:var(--gris2);font-size:.65rem">'+docs.length+'</span></div>'
        +docs.map(function(d){
          var ext=(d.filename||d.nom).split('.').pop().toLowerCase();
          var ico=extIcons[ext]||'📄';
          var sz=d.taille<1024*1024?(Math.round(d.taille/1024)+'Ko'):(Math.round(d.taille/1024/1024*10)/10+'Mo');
          var dt=new Date(d.date).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'});
          var eleveInfo=d.eleveCode?(' · 👤 '+esc(((students.find(function(s){return s.code===d.eleveCode;})||{}).nom||d.eleveCode))):'';
          return '<div style="display:flex;align-items:center;gap:.6rem;padding:.5rem .6rem;background:var(--gris2);border-radius:var(--r2);margin-bottom:.35rem">'
            +'<span style="font-size:1.3rem">'+ico+'</span>'
            +'<div style="flex:1;min-width:0">'
            +'<div style="font-size:.82rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(d.nom)+'</div>'
            +'<div style="font-size:.68rem;color:var(--gris)">'+sz+' · '+dt+' · <span style="color:'+(DOC_VIS_COLORS[d.visibilite]||'var(--gris)')+';font-weight:700">'+(DOC_VIS_LABELS[d.visibilite]||esc(d.visibilite))+'</span>'+eleveInfo+'</div>'
            +'</div>'
            +'<button class="btn btn-ghost btn-xs" onclick="telechargerDoc(\''+d.id+'\')" title="Télécharger">⬇️</button>'
            +'<button class="btn btn-rouge btn-xs" onclick="supprimerDoc(\''+d.id+'\')" title="Supprimer">🗑️</button>'
            +'</div>';
        }).join('')
        +'</div>';
    }).join('');
  }

  // Exposition globale
  window.toggleDocEleve=toggleDocEleve;
  window.docFileSelected=docFileSelected;
  window.ajouterDocument=ajouterDocument;
  window.supprimerDoc=supprimerDoc;
  window.telechargerDoc=telechargerDoc;
  window.renderSharedDocs=renderSharedDocs;
})();
