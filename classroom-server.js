// ════════════════════════════════════════════════════════════
// INERWEB CLASSROOM v4.0 — Hub de partage de fichiers
// Serveur local simple — 100% hors ligne
// ════════════════════════════════════════════════════════════

var express = require('express');
var path = require('path');
var fs = require('fs');
var os = require('os');
var QRCode = require('qrcode');

var PORT = parseInt(process.env.PORT, 10) || 3000;
var ROOT = __dirname;
var PARTAGE_DIR = path.join(ROOT, 'partage');
var MAX_DEPTH = 5;

// Gestion erreurs globales
process.on('uncaughtException', function(err) {
  console.error('');
  console.error('  ERREUR FATALE : ' + err.message);
  console.error('');
  process.exit(1);
});

var app = express();

// ═══ MIDDLEWARES ═══

// Sécurité : seuls les fichiers autorisés sont servis
// Liste blanche des extensions côté client
var EXT_AUTORISEES = [
  '.html', '.htm', '.css', '.js',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico',
  '.woff', '.woff2', '.ttf', '.eot',
  '.json', '.webmanifest'
];

// Dossiers interdits
var DOSSIERS_INTERDITS = [
  'node_modules', '.git', 'backend', 'docs', 'tests'
];

// Fichiers interdits (exacts)
var FICHIERS_INTERDITS = [
  '/package.json', '/package-lock.json',
  '/classroom-server.js',
  '/lancer.bat',
  '/changelog.md', '/installation.md'
];

app.use(function(req, res, next) {
  // Les routes API passent toujours
  if (req.path.startsWith('/api/')) return next();
  // Les fichiers partagés passent toujours
  if (req.path.startsWith('/fichiers/')) return next();

  var p = req.path.toLowerCase();

  // Bloquer fichiers cachés (. en début de nom)
  if (/\/\./.test(p)) return res.status(403).send('Accès interdit');

  // Bloquer dossiers interdits
  for (var i = 0; i < DOSSIERS_INTERDITS.length; i++) {
    if (p.indexOf('/' + DOSSIERS_INTERDITS[i] + '/') !== -1 ||
        p === '/' + DOSSIERS_INTERDITS[i]) {
      return res.status(403).send('Accès interdit');
    }
  }

  // Bloquer fichiers interdits
  for (var j = 0; j < FICHIERS_INTERDITS.length; j++) {
    if (p === FICHIERS_INTERDITS[j]) return res.status(403).send('Accès interdit');
  }

  // Bloquer extensions dangereuses
  var ext = path.extname(p).toLowerCase();
  if (ext && ['.bat', '.cmd', '.sh', '.ps1', '.gs', '.env', '.md', '.jsonl', '.log'].indexOf(ext) !== -1) {
    return res.status(403).send('Accès interdit');
  }

  next();
});

// Headers de sécurité
app.use(function(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

// ═══ UTILITAIRES ═══

function getLocalIP() {
  var interfaces = os.networkInterfaces();
  for (var name in interfaces) {
    for (var i = 0; i < interfaces[name].length; i++) {
      var iface = interfaces[name][i];
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// Lister les fichiers du dossier partage (récursif, profondeur limitée)
function listerFichiers(dir, baseDir, depth) {
  if (!baseDir) baseDir = dir;
  if (depth === undefined) depth = 0;
  var fichiers = [];

  if (depth > MAX_DEPTH) return fichiers;

  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch(e) { /* ignore */ }
    return fichiers;
  }

  var items;
  try {
    items = fs.readdirSync(dir, { withFileTypes: true });
  } catch(e) {
    return fichiers;
  }

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    // Ignorer fichiers cachés, LISEZMOI, et liens symboliques
    if (item.name.startsWith('.') || item.name === 'LISEZMOI.txt') continue;
    if (item.isSymbolicLink && item.isSymbolicLink()) continue;

    var fullPath = path.join(dir, item.name);
    var relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    if (item.isDirectory()) {
      var contenu = listerFichiers(fullPath, baseDir, depth + 1);
      fichiers.push({
        nom: item.name,
        type: 'dossier',
        chemin: relativePath,
        contenu: contenu
      });
    } else {
      try {
        var stats = fs.statSync(fullPath);
        var ext = path.extname(item.name).toLowerCase().slice(1);
        fichiers.push({
          nom: item.name,
          type: getTypeFromExt(ext),
          extension: ext,
          chemin: relativePath,
          taille: stats.size,
          tailleHumaine: formatTaille(stats.size),
          dateModif: stats.mtime.toISOString()
        });
      } catch(e) {
        // Fichier verrouillé ou supprimé entre le readdir et le stat — on l'ignore
      }
    }
  }

  // Dossiers en premier, puis fichiers triés par nom
  return fichiers.sort(function(a, b) {
    if (a.type === 'dossier' && b.type !== 'dossier') return -1;
    if (a.type !== 'dossier' && b.type === 'dossier') return 1;
    return a.nom.localeCompare(b.nom, 'fr');
  });
}

function getTypeFromExt(ext) {
  var types = {
    pdf: 'pdf',
    doc: 'word', docx: 'word', odt: 'word',
    xls: 'excel', xlsx: 'excel', ods: 'excel', csv: 'excel',
    ppt: 'powerpoint', pptx: 'powerpoint', odp: 'powerpoint',
    jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', svg: 'image',
    mp4: 'video', webm: 'video', mov: 'video', avi: 'video',
    mp3: 'audio', wav: 'audio', ogg: 'audio',
    html: 'html', htm: 'html',
    zip: 'archive', rar: 'archive', '7z': 'archive',
    txt: 'texte', md: 'texte'
  };
  return types[ext] || 'autre';
}

function formatTaille(bytes) {
  if (bytes < 1024) return bytes + ' o';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' Mo';
  return (bytes / 1024 / 1024 / 1024).toFixed(1) + ' Go';
}

function compterFichiers(liste) {
  var count = 0;
  for (var i = 0; i < liste.length; i++) {
    if (liste[i].type === 'dossier') {
      count += compterFichiers(liste[i].contenu);
    } else {
      count++;
    }
  }
  return count;
}

// ═══ API REST ═══

// Info serveur (inclut le chemin du dossier partage)
app.get('/api/info', function(req, res) {
  var ip = getLocalIP();
  res.set('Cache-Control', 'no-store');
  res.json({
    nom: 'InerWeb Classroom',
    version: '4.0.0',
    ip: ip,
    port: PORT,
    urlEleves: 'http://' + ip + ':' + PORT + '/eleve.html',
    dossierPartage: PARTAGE_DIR
  });
});

// Liste des fichiers partagés
app.get('/api/fichiers', function(req, res) {
  var fichiers = listerFichiers(PARTAGE_DIR);
  res.set('Cache-Control', 'no-store');
  res.json({
    total: compterFichiers(fichiers),
    fichiers: fichiers
  });
});

// QR Code (PNG base64)
app.get('/api/qrcode', function(req, res) {
  var ip = getLocalIP();
  var url = 'http://' + ip + ':' + PORT + '/eleve.html';
  QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    color: { dark: '#1b3a63', light: '#ffffff' }
  }).then(function(qr) {
    res.json({ url: url, qrcode: qr });
  }).catch(function(e) {
    res.status(500).json({ error: e.message });
  });
});

// ═══ FICHIERS STATIQUES ═══

// Servir le dossier partage sous /fichiers/
app.use('/fichiers', express.static(PARTAGE_DIR));

// Servir le projet InerWeb (prof peut utiliser inerweb_prof.html)
app.use(express.static(ROOT));

// ═══ DÉMARRAGE ═══

var server = app.listen(PORT, '0.0.0.0', function() {
  var ip = getLocalIP();
  var fichiers = listerFichiers(PARTAGE_DIR);
  var total = compterFichiers(fichiers);

  console.log('');
  console.log('  ══════════════════════════════════════════════════════');
  console.log('  INERWEB CLASSROOM v4.0 — Hub de partage');
  console.log('  ══════════════════════════════════════════════════════');
  console.log('');
  console.log('  Fichiers partages : ' + total);
  console.log('  Dossier           : ' + PARTAGE_DIR);
  console.log('');
  console.log('  Prof   -> http://localhost:' + PORT + '/prof.html');
  console.log('  Eleves -> http://' + ip + ':' + PORT + '/eleve.html');
  console.log('');
  console.log('  Glissez vos fichiers dans le dossier "partage/"');
  console.log('  Les eleves scannent le QR code pour y acceder.');
  console.log('');
  console.log('  Ctrl+C pour arreter');
  console.log('');
});

server.on('error', function(err) {
  if (err.code === 'EADDRINUSE') {
    console.error('');
    console.error('  ERREUR : Le port ' + PORT + ' est deja utilise.');
    console.error('  Fermez l\'autre application ou changez le port :');
    console.error('    set PORT=3001 && node classroom-server.js');
    console.error('');
    process.exit(1);
  } else {
    console.error('  ERREUR SERVEUR : ' + err.message);
    process.exit(1);
  }
});
