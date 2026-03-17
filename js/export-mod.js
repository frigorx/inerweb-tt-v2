/**
 * export-mod.js — Fonctions d'export (Excel, Backup, Restore, Migration)
 * Extrait de inerweb_prof.html (Phase 1)
 */
;(function(){
  'use strict';

  function exportExcel(){
    var students=window.students||[];
    var notes=window.notes||{};
    var calcNote=window.calcNote;
    var appCfg=window.appCfg||{};
    var rows=[['Code','Nom','Prénom','Classe','Note E31 (validées)','Note E31 clôturée','Note E32 (validées)','Note E32 clôturée','Note E33 (validées)','Note E33 clôturée','E31 clôturé','E32 clôturé','E33 clôturé']];
    students.forEach(function(s){
      var e2=calcNote(s.code,'E31'),e3=calcNote(s.code,'E32'),e33=calcNote(s.code,'E33'),
          n2=notes[s.code]?.E31||{},n3=notes[s.code]?.E32||{},n33=notes[s.code]?.E33||{};
      rows.push([s.code,s.nom,s.prenom||'',s.classe||'',e2.note,n2.note_finale||'',e3.note,n3.note_finale||'',e33.note,n33.note_finale||'',n2.cloture?'Oui':'Non',n3.cloture?'Oui':'Non',n33.cloture?'Oui':'Non']);
    });
    var ws=XLSX.utils.aoa_to_sheet(rows),wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'CCF');XLSX.writeFile(wb,'CCF_Recap_'+(appCfg.session||2026)+'.xlsx');
    window.toast('Excel généré','ok');
  }

  function exportBackup(){
    var students=window.students||[];
    var validations=window.validations||{};
    var notes=window.notes||{};
    var pfmpData=window.pfmpData||{};
    var appCfg=window.appCfg||{};
    var sharedDocs=window.sharedDocs||[];
    var data={version:'TT-4.0',timestamp:new Date().toISOString(),cfg:appCfg,students:students,validations:validations,notes:notes,pfmpData:pfmpData,sharedDocs:sharedDocs};
    var a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    a.download='inerweb_backup_'+new Date().toISOString().slice(0,10)+'.json';a.click();
    window.toast('Backup JSON exporté','ok');
  }

  function handleRestore(file){
    if(!file)return;
    var r=new FileReader();
    r.onload=function(e){try{
      var d=JSON.parse(e.target.result);
      if(d.config&&!d.version){migrateV10(d);window.toast('Données v10 migrées','ok');return;}
      if(d.students)window.students=d.students;
      if(d.validations)window.validations=d.validations;
      if(d.notes)window.notes=d.notes;
      if(d.pfmpData)window.pfmpData=d.pfmpData;
      if(d.cfg)window.appCfg=d.cfg;
      if(d.sharedDocs)window.sharedDocs=d.sharedDocs;
      // Mettre à jour les variables locales du script inline
      try{students=window.students;validations=window.validations;notes=window.notes;pfmpData=window.pfmpData;appCfg=window.appCfg;sharedDocs=window.sharedDocs;}catch(ex){}
      window.saveLocal();window.updateAll();window.toast('Backup '+(d.version||'')+' restauré','ok');
    }catch(ex){window.toast('Fichier invalide','err');}};
    r.readAsText(file);
  }

  function migrateV10(d){
    var getFiliere=window.getFiliere;
    // Migration des élèves
    if(d.students)window.students=d.students.map(function(s){return {
      code:s.id||('ELV-'+Math.random().toString(36).substring(2,6).toUpperCase()),
      nom:s.nom||'',prenom:s.prenom||'',classe:s.classe||'CAP IFCA 1',
      statut:'actif',referentiel:getFiliere({classe:s.classe||'CAP IFCA 1'}),
      token_eleve:Math.random().toString(36).substring(2,10).toUpperCase(),
      token_tuteur:Math.random().toString(36).substring(2,10).toUpperCase()
    };});
    try{students=window.students;}catch(ex){}
    // Migration des validations v10
    if(d.evaluations||d.validations){
      var src=d.evaluations||d.validations;
      var validations=window.validations;
      Object.entries(src).forEach(function(entry){
        var code=entry[0],vals=entry[1];
        validations[code]=(Array.isArray(vals)?vals:[]).map(function(v){return {
          epreuve:   v.epreuve||'E31',
          competence:v.competence||v.comp||'',
          critere:   v.critere||'',
          niveau:    v.niveau||v.level||'NE',
          contexte:  v.contexte||v.ctx||'atelier',
          phase:     v.phase||'formatif',
          evaluateur:v.evaluateur||'Migration v10',
          timestamp: v.timestamp||new Date().toISOString()
        };});
      });
      window.validations=validations;
    }
    // Migration des notes v10
    if(d.notes){
      var notes=window.notes||{};
      Object.entries(d.notes).forEach(function(entry){
        var code=entry[0],n=entry[1];
        notes[code]={
          E31:{note_finale:n.E31?.note_finale??null,cloture:n.E31?.cloture??false},
          E32:{note_finale:n.E32?.note_finale??null,cloture:n.E32?.cloture??false}
        };
      });
      window.notes=notes;
    }
    try{students=window.students;validations=window.validations;notes=window.notes;}catch(ex){}
    window.saveLocal();window.updateAll();
    window.toast('Migration v10 : '+window.students.length+' élève(s), '+Object.keys(window.validations).length+' dossier(s)','ok');
  }

  // Exposition globale
  window.exportExcel=exportExcel;
  window.exportBackup=exportBackup;
  window.handleRestore=handleRestore;
  window.migrateV10=migrateV10;
})();
