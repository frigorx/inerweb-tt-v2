/**
 * INERWEB — Formulaire création/édition TP v1.0
 *
 * Dépendances : tp-library.js
 */
(function(){
  'use strict';

  var _modal = null;
  var _mode = 'create'; // 'create' | 'edit' | 'duplicate'
  var _currentTp = null;
  var _onSave = null;

  // ═══════════════════════════════════════════════════════════
  // OPEN / CLOSE
  // ═══════════════════════════════════════════════════════════

  /**
   * Ouvrir le formulaire.
   * @param {Object} [options]
   * @param {string} [options.mode] — 'create', 'edit', 'duplicate'
   * @param {Object} [options.tp] — TP à éditer ou dupliquer
   * @param {Function} [options.onSave] — Callback après sauvegarde
   */
  function open(options){
    options = options || {};
    _mode = options.mode || 'create';
    _currentTp = options.tp || null;
    _onSave = options.onSave || null;

    _createModal();
    _populateForm();
    _modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Bouton IA si disponible
    _injectIAButton();

    // Focus premier champ
    setTimeout(function(){
      var first = _modal.querySelector('#iw-tp-titre');
      if(first) first.focus();
    }, 100);
  }

  function close(){
    if(_modal){
      _modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  // ═══════════════════════════════════════════════════════════
  // CREATE MODAL
  // ═══════════════════════════════════════════════════════════

  function _createModal(){
    if(_modal) return;

    _modal = document.createElement('div');
    _modal.id = 'iw-tp-form-modal';
    _modal.className = 'iw-tp-form-overlay';
    _modal.innerHTML = _getFormHtml();
    document.body.appendChild(_modal);

    _injectStyles();
    _bindEvents();
  }

  function _getFormHtml(){
    var themes = ['brasage', 'mise-en-service', 'depannage', 'mesures', 'reglage', 'maintenance', 'securite', 'autre'];
    var types = ['atelier', 'chantier', 'simulation', 'td'];

    var html = '<div class="iw-tp-form-container">';
    html += '<div class="iw-tp-form-header">';
    html += '<h2 id="iw-tp-form-title">Nouveau TP</h2>';
    html += '<button type="button" class="iw-tp-form-close" data-action="close" aria-label="Fermer">\u2715</button>';
    html += '</div>';

    html += '<form id="iw-tp-form" class="iw-tp-form-body">';

    // Section 1 : Informations principales (toujours visible)
    html += '<fieldset class="iw-tp-fieldset iw-tp-fieldset-open">';
    html += '<legend data-toggle="fieldset">Informations principales</legend>';
    html += '<div class="iw-tp-fieldset-content">';

    html += '<div class="iw-tp-field">';
    html += '<label for="iw-tp-titre">Titre *</label>';
    html += '<div style="display:flex;gap:8px;align-items:flex-start">';
    html += '<input type="text" id="iw-tp-titre" name="titre" maxlength="100" required placeholder="Ex: Brasage fort sur circuit cuivre" style="flex:1">';
    html += '<span id="iw-tp-ia-btn-slot"></span>';
    html += '</div>';
    html += '</div>';

    html += '<div class="iw-tp-field">';
    html += '<label for="iw-tp-soustitre">Sous-titre</label>';
    html += '<input type="text" id="iw-tp-soustitre" name="sousTitre" maxlength="150" placeholder="Pr\u00e9cision ou variante">';
    html += '</div>';

    html += '<div class="iw-tp-field">';
    html += '<label for="iw-tp-description">Description *</label>';
    html += '<textarea id="iw-tp-description" name="description" rows="3" required placeholder="D\u00e9crivez les objectifs et le d\u00e9roulement g\u00e9n\u00e9ral..."></textarea>';
    html += '</div>';

    html += '<div class="iw-tp-row">';
    html += '<div class="iw-tp-field iw-tp-field-half">';
    html += '<label for="iw-tp-theme">Th\u00e8me *</label>';
    html += '<select id="iw-tp-theme" name="theme" required>';
    html += '<option value="">-- Choisir --</option>';
    themes.forEach(function(t){ html += '<option value="' + t + '">' + _capitalize(t) + '</option>'; });
    html += '</select>';
    html += '</div>';

    html += '<div class="iw-tp-field iw-tp-field-half">';
    html += '<label for="iw-tp-type">Type *</label>';
    html += '<select id="iw-tp-type" name="type" required>';
    types.forEach(function(t){ html += '<option value="' + t + '">' + _capitalize(t) + '</option>'; });
    html += '</select>';
    html += '</div>';
    html += '</div>';

    html += '<div class="iw-tp-row">';
    html += '<div class="iw-tp-field iw-tp-field-half">';
    html += '<label for="iw-tp-duree">Dur\u00e9e (min) *</label>';
    html += '<input type="number" id="iw-tp-duree" name="duree" min="15" max="480" step="15" required value="120">';
    html += '</div>';

    html += '<div class="iw-tp-field iw-tp-field-half">';
    html += '<label for="iw-tp-difficulte">Difficult\u00e9 *</label>';
    html += '<select id="iw-tp-difficulte" name="difficulte" required>';
    html += '<option value="1">1 \u2014 Initiation</option>';
    html += '<option value="2" selected>2 \u2014 Base</option>';
    html += '<option value="3">3 \u2014 Interm\u00e9diaire</option>';
    html += '<option value="4">4 \u2014 Avanc\u00e9</option>';
    html += '<option value="5">5 \u2014 Expert</option>';
    html += '</select>';
    html += '</div>';
    html += '</div>';

    html += '</div></fieldset>';

    // Section 2 : Matériel
    html += '<fieldset class="iw-tp-fieldset">';
    html += '<legend data-toggle="fieldset">Mat\u00e9riel</legend>';
    html += '<div class="iw-tp-fieldset-content">';

    html += '<div class="iw-tp-field">';
    html += '<label>Mat\u00e9riel n\u00e9cessaire</label>';
    html += '<div id="iw-tp-materiel-list" class="iw-tp-list-editable"></div>';
    html += '<div class="iw-tp-list-add">';
    html += '<input type="text" id="iw-tp-materiel-input" placeholder="Ajouter un \u00e9quipement...">';
    html += '<button type="button" data-action="add-materiel">+</button>';
    html += '</div>';
    html += '</div>';

    html += '<div class="iw-tp-field">';
    html += '<label>Pr\u00e9requis mat\u00e9riels</label>';
    html += '<div id="iw-tp-prerequis-list" class="iw-tp-list-editable"></div>';
    html += '<div class="iw-tp-list-add">';
    html += '<input type="text" id="iw-tp-prerequis-input" placeholder="Ajouter un pr\u00e9requis...">';
    html += '<button type="button" data-action="add-prerequis">+</button>';
    html += '</div>';
    html += '</div>';

    html += '</div></fieldset>';

    // Section 3 : Opérations
    html += '<fieldset class="iw-tp-fieldset">';
    html += '<legend data-toggle="fieldset">Op\u00e9rations</legend>';
    html += '<div class="iw-tp-fieldset-content">';

    html += '<div class="iw-tp-field">';
    html += '<label>\u00c9tapes / Op\u00e9rations (dans l\'ordre)</label>';
    html += '<div id="iw-tp-operations-list" class="iw-tp-list-editable iw-tp-list-sortable"></div>';
    html += '<div class="iw-tp-list-add">';
    html += '<input type="text" id="iw-tp-operations-input" placeholder="Ajouter une \u00e9tape...">';
    html += '<button type="button" data-action="add-operation">+</button>';
    html += '</div>';
    html += '</div>';

    html += '</div></fieldset>';

    // Section 4 : Tags & Variantes
    html += '<fieldset class="iw-tp-fieldset">';
    html += '<legend data-toggle="fieldset">Tags & Variantes</legend>';
    html += '<div class="iw-tp-fieldset-content">';

    html += '<div class="iw-tp-field">';
    html += '<label>Tags (mots-cl\u00e9s)</label>';
    html += '<div id="iw-tp-tags-chips" class="iw-tp-chips"></div>';
    html += '<input type="text" id="iw-tp-tags-input" placeholder="Ajouter un tag (Entr\u00e9e pour valider)">';
    html += '</div>';

    html += '<div class="iw-tp-field">';
    html += '<label>Variantes possibles</label>';
    html += '<div id="iw-tp-variantes-list" class="iw-tp-list-editable"></div>';
    html += '<div class="iw-tp-list-add">';
    html += '<input type="text" id="iw-tp-variantes-input" placeholder="Ajouter une variante...">';
    html += '<button type="button" data-action="add-variante">+</button>';
    html += '</div>';
    html += '</div>';

    html += '</div></fieldset>';

    // Section 5 : Notes pédagogiques
    html += '<fieldset class="iw-tp-fieldset">';
    html += '<legend data-toggle="fieldset">Notes p\u00e9dagogiques</legend>';
    html += '<div class="iw-tp-fieldset-content">';

    html += '<div class="iw-tp-field">';
    html += '<label for="iw-tp-remarques">Remarques p\u00e9dagogiques</label>';
    html += '<textarea id="iw-tp-remarques" name="remarquesPedago" rows="2" placeholder="Points de vigilance, conseils pour l\'enseignant..."></textarea>';
    html += '</div>';

    html += '<div class="iw-tp-field">';
    html += '<label for="iw-tp-observations">Observations d\'usage</label>';
    html += '<textarea id="iw-tp-observations" name="observationsUsage" rows="2" placeholder="Retours d\'exp\u00e9rience, ajustements constat\u00e9s..."></textarea>';
    html += '</div>';

    html += '</div></fieldset>';

    html += '</form>';

    // Footer avec boutons
    html += '<div class="iw-tp-form-footer">';
    html += '<button type="button" class="iw-tp-btn iw-tp-btn-secondary" data-action="close">Annuler</button>';
    html += '<button type="button" class="iw-tp-btn iw-tp-btn-primary" data-action="save">Enregistrer</button>';
    html += '</div>';

    html += '</div>';
    return html;
  }

  // ═══════════════════════════════════════════════════════════
  // POPULATE FORM
  // ═══════════════════════════════════════════════════════════

  function _populateForm(){
    var form = _modal.querySelector('#iw-tp-form');
    var title = _modal.querySelector('#iw-tp-form-title');

    // Reset
    form.reset();
    _clearLists();

    if(_mode === 'create'){
      title.textContent = 'Nouveau TP';
    }
    else if(_mode === 'edit'){
      title.textContent = 'Modifier le TP';
      if(_currentTp) _fillForm(_currentTp);
    }
    else if(_mode === 'duplicate'){
      title.textContent = 'Dupliquer le TP';
      if(_currentTp){
        var copy = JSON.parse(JSON.stringify(_currentTp));
        copy.id = null;
        copy.titre = copy.titre + ' (copie)';
        copy.statut = 'brouillon';
        _fillForm(copy);
      }
    }
  }

  function _fillForm(tp){
    _setVal('iw-tp-titre', tp.titre);
    _setVal('iw-tp-soustitre', tp.sousTitre);
    _setVal('iw-tp-description', tp.description);
    _setVal('iw-tp-theme', tp.theme);
    _setVal('iw-tp-type', tp.type);
    _setVal('iw-tp-duree', tp.duree);
    _setVal('iw-tp-difficulte', tp.difficulte);
    _setVal('iw-tp-remarques', tp.remarquesPedago);
    _setVal('iw-tp-observations', tp.observationsUsage);

    // Listes
    _fillList('iw-tp-materiel-list', tp.materiel || []);
    _fillList('iw-tp-prerequis-list', tp.prerequisMateriels || []);
    _fillList('iw-tp-operations-list', tp.operations || []);
    _fillList('iw-tp-variantes-list', tp.variantes || []);
    _fillChips('iw-tp-tags-chips', tp.tags || []);
  }

  function _setVal(id, val){
    var el = document.getElementById(id);
    if(el) el.value = val || '';
  }

  function _clearLists(){
    ['iw-tp-materiel-list', 'iw-tp-prerequis-list', 'iw-tp-operations-list', 'iw-tp-variantes-list'].forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.innerHTML = '';
    });
    var chips = document.getElementById('iw-tp-tags-chips');
    if(chips) chips.innerHTML = '';
  }

  function _fillList(containerId, items){
    var container = document.getElementById(containerId);
    if(!container) return;
    container.innerHTML = '';
    items.forEach(function(item){
      _addListItem(container, item);
    });
  }

  function _fillChips(containerId, tags){
    var container = document.getElementById(containerId);
    if(!container) return;
    container.innerHTML = '';
    tags.forEach(function(tag){
      _addChip(container, tag);
    });
  }

  // ═══════════════════════════════════════════════════════════
  // LIST MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  function _addListItem(container, text){
    var div = document.createElement('div');
    div.className = 'iw-tp-list-item';
    div.innerHTML = '<span class="iw-tp-list-text">' + _escapeHtml(text) + '</span>' +
                    '<button type="button" class="iw-tp-list-remove" data-action="remove-item">\u2715</button>';
    container.appendChild(div);
  }

  function _addChip(container, tag){
    var span = document.createElement('span');
    span.className = 'iw-tp-chip';
    span.innerHTML = _escapeHtml(tag) + '<button type="button" data-action="remove-chip">\u2715</button>';
    container.appendChild(span);
  }

  function _getListItems(containerId){
    var container = document.getElementById(containerId);
    if(!container) return [];
    var items = [];
    container.querySelectorAll('.iw-tp-list-text').forEach(function(el){
      items.push(el.textContent);
    });
    return items;
  }

  function _getChips(containerId){
    var container = document.getElementById(containerId);
    if(!container) return [];
    var tags = [];
    container.querySelectorAll('.iw-tp-chip').forEach(function(el){
      var text = el.textContent.replace('\u2715', '').trim();
      if(text) tags.push(text);
    });
    return tags;
  }

  // ═══════════════════════════════════════════════════════════
  // EVENTS
  // ═══════════════════════════════════════════════════════════

  function _bindEvents(){
    _modal.addEventListener('click', function(e){
      var action = e.target.dataset.action;

      if(action === 'close' || e.target === _modal){
        close();
      }
      else if(action === 'save'){
        _handleSave();
      }
      else if(action === 'add-materiel'){
        _handleAddToList('iw-tp-materiel-input', 'iw-tp-materiel-list');
      }
      else if(action === 'add-prerequis'){
        _handleAddToList('iw-tp-prerequis-input', 'iw-tp-prerequis-list');
      }
      else if(action === 'add-operation'){
        _handleAddToList('iw-tp-operations-input', 'iw-tp-operations-list');
      }
      else if(action === 'add-variante'){
        _handleAddToList('iw-tp-variantes-input', 'iw-tp-variantes-list');
      }
      else if(action === 'remove-item'){
        var item = e.target.closest('.iw-tp-list-item');
        if(item) item.remove();
      }
      else if(action === 'remove-chip'){
        var chip = e.target.closest('.iw-tp-chip');
        if(chip) chip.remove();
      }

      // Toggle fieldset
      var legend = e.target.closest('[data-toggle="fieldset"]');
      if(legend){
        var fieldset = legend.closest('.iw-tp-fieldset');
        if(fieldset) fieldset.classList.toggle('iw-tp-fieldset-open');
      }
    });

    // Enter sur input tags
    _modal.addEventListener('keydown', function(e){
      if(e.target.id === 'iw-tp-tags-input' && e.key === 'Enter'){
        e.preventDefault();
        var input = e.target;
        var tag = input.value.trim().toLowerCase();
        if(tag){
          var container = document.getElementById('iw-tp-tags-chips');
          _addChip(container, tag);
          input.value = '';
        }
      }

      // Enter sur les autres inputs de liste
      if(e.key === 'Enter' && e.target.matches('.iw-tp-list-add input')){
        e.preventDefault();
        var btn = e.target.nextElementSibling;
        if(btn) btn.click();
      }
    });
  }

  function _handleAddToList(inputId, listId){
    var input = document.getElementById(inputId);
    var list = document.getElementById(listId);
    var val = input.value.trim();
    if(val){
      _addListItem(list, val);
      input.value = '';
      input.focus();
    }
  }

  function _handleSave(){
    var form = _modal.querySelector('#iw-tp-form');

    // Validation HTML5
    if(!form.checkValidity()){
      form.reportValidity();
      return;
    }

    // Construire l'objet TP
    var tp = {
      id: (_mode === 'edit' && _currentTp) ? _currentTp.id : null,
      titre: document.getElementById('iw-tp-titre').value.trim(),
      sousTitre: document.getElementById('iw-tp-soustitre').value.trim(),
      description: document.getElementById('iw-tp-description').value.trim(),
      theme: document.getElementById('iw-tp-theme').value,
      type: document.getElementById('iw-tp-type').value,
      duree: parseInt(document.getElementById('iw-tp-duree').value) || 120,
      difficulte: parseInt(document.getElementById('iw-tp-difficulte').value) || 2,
      materiel: _getListItems('iw-tp-materiel-list'),
      prerequisMateriels: _getListItems('iw-tp-prerequis-list'),
      operations: _getListItems('iw-tp-operations-list'),
      variantes: _getListItems('iw-tp-variantes-list'),
      tags: _getChips('iw-tp-tags-chips'),
      remarquesPedago: document.getElementById('iw-tp-remarques').value.trim(),
      observationsUsage: document.getElementById('iw-tp-observations').value.trim(),
      auteur: _getAuteur(),
      version: (_mode === 'edit' && _currentTp) ? _incrementVersion(_currentTp.version) : '1.0',
      statut: 'brouillon',
      scope: 'private'
    };

    // Sauvegarder via iwTpLibrary
    if(window.iwTpLibrary){
      if(_mode === 'edit' && _currentTp){
        window.iwTpLibrary.updateTp(tp);
      } else {
        window.iwTpLibrary.addTp(tp);
      }
      window.iwTpLibrary.saveLocal();
    }

    // Callback
    if(_onSave) _onSave(tp);

    // Notification
    _showNotification('TP enregistr\u00e9 : ' + tp.titre);

    close();
  }

  // ═══════════════════════════════════════════════════════════
  // IA GEMINI
  // ═══════════════════════════════════════════════════════════

  function _injectIAButton(){
    var slot = document.getElementById('iw-tp-ia-btn-slot');
    if(!slot) return;
    slot.innerHTML = '';
    if(!window.iwGemini || !window.iwGemini.isEnabled()) return;

    var btn = window.iwGemini.creerBoutonIA(function(){
      var titre = document.getElementById('iw-tp-titre').value;
      if(!titre){ if(window.toast) window.toast('Entrez d\'abord un titre','warn'); return Promise.resolve(); }

      return window.iwGemini.enrichirTP({
        titre: titre,
        theme: document.getElementById('iw-tp-theme').value,
        niveau: 'CAP',
        duree: parseInt(document.getElementById('iw-tp-duree').value) || 120
      }).then(function(r){
        if(r.ok && r.resultat){
          if(r.resultat.description){
            document.getElementById('iw-tp-description').value = r.resultat.description;
          }
          if(r.resultat.materiel && r.resultat.materiel.length){
            var list = document.getElementById('iw-tp-materiel-list');
            if(list){
              list.innerHTML = '';
              r.resultat.materiel.forEach(function(m){ _addListItem(list, m); });
            }
          }
          if(r.resultat.operations && r.resultat.operations.length){
            var ops = document.getElementById('iw-tp-operations-list');
            if(ops){
              ops.innerHTML = '';
              r.resultat.operations.forEach(function(o){ _addListItem(ops, o); });
            }
          }
          _showNotification('TP enrichi par l\'IA');
        } else {
          if(window.toast) window.toast(r.error || 'Erreur IA', 'error');
        }
      });
    });
    slot.appendChild(btn);
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════

  function _capitalize(str){
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
  }

  function _escapeHtml(str){
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function _getAuteur(){
    if(window.CONFIG && window.CONFIG.ENSEIGNANT) return window.CONFIG.ENSEIGNANT;
    return localStorage.getItem('iw_enseignant') || 'Anonyme';
  }

  function _incrementVersion(v){
    if(!v) return '1.0';
    var parts = v.split('.');
    var minor = parseInt(parts[1] || 0) + 1;
    return parts[0] + '.' + minor;
  }

  function _showNotification(msg){
    var notif = document.createElement('div');
    notif.className = 'iw-tp-notif';
    notif.textContent = msg;
    document.body.appendChild(notif);
    setTimeout(function(){ notif.classList.add('iw-tp-notif-show'); }, 10);
    setTimeout(function(){
      notif.classList.remove('iw-tp-notif-show');
      setTimeout(function(){ notif.remove(); }, 300);
    }, 3000);
  }

  // ═══════════════════════════════════════════════════════════
  // STYLES
  // ═══════════════════════════════════════════════════════════

  function _injectStyles(){
    if(document.getElementById('iw-tp-form-styles')) return;

    var css = document.createElement('style');
    css.id = 'iw-tp-form-styles';
    css.textContent = '\n' +
      '.iw-tp-form-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.5); display:none; align-items:center; justify-content:center; z-index:10000; padding:1rem; }\n' +
      '.iw-tp-form-container { background:#fff; border-radius:12px; max-width:700px; width:100%; max-height:90vh; display:flex; flex-direction:column; box-shadow:0 10px 40px rgba(0,0,0,0.3); }\n' +
      '.iw-tp-form-header { display:flex; justify-content:space-between; align-items:center; padding:1rem 1.5rem; border-bottom:1px solid #eee; }\n' +
      '.iw-tp-form-header h2 { margin:0; font-size:1.3rem; color:#1b3a63; }\n' +
      '.iw-tp-form-close { background:none; border:none; font-size:1.5rem; cursor:pointer; color:#666; }\n' +
      '.iw-tp-form-close:hover { color:#e74c3c; }\n' +
      '.iw-tp-form-body { flex:1; overflow-y:auto; padding:1rem 1.5rem; }\n' +
      '.iw-tp-fieldset { border:1px solid #ddd; border-radius:8px; margin-bottom:1rem; }\n' +
      '.iw-tp-fieldset legend { cursor:pointer; padding:0.5rem 1rem; font-weight:600; color:#1b3a63; user-select:none; }\n' +
      '.iw-tp-fieldset legend::after { content:" \\25BC"; font-size:0.7rem; opacity:0.5; }\n' +
      '.iw-tp-fieldset-open legend::after { content:" \\25B2"; }\n' +
      '.iw-tp-fieldset-content { display:none; padding:1rem; }\n' +
      '.iw-tp-fieldset-open .iw-tp-fieldset-content { display:block; }\n' +
      '.iw-tp-field { margin-bottom:1rem; }\n' +
      '.iw-tp-field label { display:block; margin-bottom:0.3rem; font-weight:500; color:#333; font-size:0.9rem; }\n' +
      '.iw-tp-field input, .iw-tp-field select, .iw-tp-field textarea { width:100%; padding:0.6rem; border:2px solid #ddd; border-radius:6px; font-size:1rem; font-family:inherit; box-sizing:border-box; }\n' +
      '.iw-tp-field input:focus, .iw-tp-field select:focus, .iw-tp-field textarea:focus { border-color:#1b3a63; outline:none; }\n' +
      '.iw-tp-row { display:flex; gap:1rem; }\n' +
      '.iw-tp-field-half { flex:1; }\n' +
      '.iw-tp-list-editable { min-height:40px; border:1px dashed #ccc; border-radius:6px; padding:0.5rem; margin-bottom:0.5rem; }\n' +
      '.iw-tp-list-item { display:flex; align-items:center; justify-content:space-between; background:#f5f5f5; padding:0.4rem 0.6rem; border-radius:4px; margin-bottom:0.3rem; }\n' +
      '.iw-tp-list-text { flex:1; }\n' +
      '.iw-tp-list-remove { background:none; border:none; color:#e74c3c; cursor:pointer; font-size:1rem; padding:0 0.3rem; }\n' +
      '.iw-tp-list-add { display:flex; gap:0.5rem; }\n' +
      '.iw-tp-list-add input { flex:1; padding:0.5rem; border:1px solid #ddd; border-radius:4px; }\n' +
      '.iw-tp-list-add button { background:#1b3a63; color:#fff; border:none; border-radius:4px; padding:0.5rem 1rem; cursor:pointer; font-size:1.2rem; }\n' +
      '.iw-tp-list-add button:hover { background:#2c5282; }\n' +
      '.iw-tp-chips { display:flex; flex-wrap:wrap; gap:0.4rem; margin-bottom:0.5rem; }\n' +
      '.iw-tp-chip { background:#e3f2fd; color:#1b3a63; padding:0.3rem 0.6rem; border-radius:20px; font-size:0.85rem; display:flex; align-items:center; gap:0.3rem; }\n' +
      '.iw-tp-chip button { background:none; border:none; cursor:pointer; color:#1b3a63; font-size:0.9rem; padding:0; }\n' +
      '.iw-tp-form-footer { display:flex; justify-content:flex-end; gap:1rem; padding:1rem 1.5rem; border-top:1px solid #eee; }\n' +
      '.iw-tp-btn { padding:0.7rem 1.5rem; border-radius:6px; font-size:1rem; cursor:pointer; border:none; }\n' +
      '.iw-tp-btn-secondary { background:#f0f0f0; color:#333; }\n' +
      '.iw-tp-btn-secondary:hover { background:#e0e0e0; }\n' +
      '.iw-tp-btn-primary { background:#ff6b35; color:#fff; font-weight:600; }\n' +
      '.iw-tp-btn-primary:hover { background:#e55a2b; }\n' +
      '.iw-tp-notif { position:fixed; bottom:2rem; left:50%; transform:translateX(-50%) translateY(100px); background:#333; color:#fff; padding:1rem 2rem; border-radius:8px; opacity:0; transition:all 0.3s ease; z-index:10001; }\n' +
      '.iw-tp-notif-show { transform:translateX(-50%) translateY(0); opacity:1; }\n' +
      '.iw-btn-ia { background:linear-gradient(135deg,#667eea,#764ba2); color:#fff; border:none; border-radius:6px; padding:6px 12px; font-size:13px; cursor:pointer; white-space:nowrap; }\n' +
      '.iw-btn-ia:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(102,126,234,0.4); }\n' +
      '.iw-btn-ia:disabled { opacity:0.6; cursor:wait; transform:none; }\n' +
      '@media (max-width:600px) { .iw-tp-row { flex-direction:column; } .iw-tp-form-container { max-height:95vh; } }\n';

    document.head.appendChild(css);
  }

  // ═══════════════════════════════════════════════════════════
  // API PUBLIQUE
  // ═══════════════════════════════════════════════════════════

  window.iwTpForm = {
    open: open,
    close: close,
    create: function(opts){ open(Object.assign({ mode:'create' }, opts || {})); },
    edit: function(tp, opts){ open(Object.assign({ mode:'edit', tp:tp }, opts || {})); },
    duplicate: function(tp, opts){ open(Object.assign({ mode:'duplicate', tp:tp }, opts || {})); }
  };

  console.log('[tp-form] Formulaire TP charg\u00e9');
})();
