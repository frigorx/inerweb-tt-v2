/**
 * scanner.js — Scanner QR code (badge élève)
 * Extrait de inerweb_prof.html (Phase 1)
 */
;(function(){
  'use strict';

  var _scanStream=null,_scanTimer=null;

  function showScanner(){
    window.showModal('📷 Scanner un badge élève',
      '<div style="text-align:center;margin-bottom:.75rem">'
      +'<video id="scanVid" style="width:100%;max-width:320px;border-radius:var(--r);background:#000" autoplay playsinline></video>'
      +'<canvas id="scanCanvas" style="display:none"></canvas>'
      +'</div>'
      +'<div id="scanStatus" class="alert al-info" style="text-align:center;font-size:.8rem">Pointez la caméra vers le QR code</div>',
      '<button class="btn btn-ghost" onclick="stopScanner();closeModal()">✖ Fermer</button>'
    );
    startScanner();
  }

  async function startScanner(){
    try{
      _scanStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
      var vid=document.getElementById('scanVid');
      if(!vid){stopScanner();return;}
      vid.srcObject=_scanStream;
      await vid.play();
      _scanTimer=setInterval(function(){scanFrame();},300);
    }catch(e){
      var st=document.getElementById('scanStatus');
      if(st)st.innerHTML='<span style="color:var(--rouge)">⚠️ Caméra non disponible — '+window.esc(e.message)+'</span>';
    }
  }

  function scanFrame(){
    var vid=document.getElementById('scanVid');
    var cvs=document.getElementById('scanCanvas');
    if(!vid||!cvs||vid.readyState<2)return;
    cvs.width=vid.videoWidth;cvs.height=vid.videoHeight;
    var ctx=cvs.getContext('2d');
    ctx.drawImage(vid,0,0);
    try{
      var img=ctx.getImageData(0,0,cvs.width,cvs.height);
      // BarcodeDetector API (Chrome/Edge moderne)
      if('BarcodeDetector' in window){
        new BarcodeDetector({formats:['qr_code']}).detect(cvs).then(function(codes){
          if(codes.length>0)handleQRResult(codes[0].rawValue);
        }).catch(function(){});
      }
    }catch(e){}
  }

  function handleQRResult(url){
    stopScanner();window.closeModal();
    try{
      var u=new URL(url);
      var eleve=u.searchParams.get('eleve');
      var mode=u.searchParams.get('mode')||'e31';
      if(eleve){
        window.cur=eleve;
        var tab=mode==='e32'?'e32':mode==='bilan'?'bilan':'e31';
        window.switchTab(tab);
        var students=window.students||[];
        var s=students.find(function(x){return x.code===eleve;});
        window.toast('📱 '+(s?s.nom+' '+(s.prenom||''):eleve)+' chargé','ok');
      } else {
        window.toast('QR non reconnu','warn');
      }
    }catch(e){window.toast('QR invalide','err');}
  }

  function stopScanner(){
    if(_scanTimer){clearInterval(_scanTimer);_scanTimer=null;}
    if(_scanStream){_scanStream.getTracks().forEach(function(t){t.stop();});_scanStream=null;}
  }

  // Exposition globale
  window.showScanner=showScanner;
  window.startScanner=startScanner;
  window.scanFrame=scanFrame;
  window.handleQRResult=handleQRResult;
  window.stopScanner=stopScanner;
})();
