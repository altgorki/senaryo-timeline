// ═══ NOTES MODULE ═══
App.Notes = (function(){
  const U = App.Utils;
  const KEY = 'scenario_notes';
  const MAX_LOCAL = 100;
  let _notes = [];
  let _remoteRef = null;
  let _remoteListener = null;
  let _panelOpen = false;
  let _editingId = null;
  let _charAnalysisOpen = true;

  function init() {
    if(!_remoteRef) {
      try {
        const raw = localStorage.getItem(KEY);
        if(raw) _notes = JSON.parse(raw);
      } catch(e) { _notes = []; }
    }
  }

  function setPanelOpen(v) { _panelOpen = v; if(!v) _editingId = null; }

  function _getUserName() {
    return (App.Auth && App.Auth.getCurrentUser()) ? (App.Auth.getCurrentUser().displayName || App.Auth.getCurrentUser().email || 'Kullanıcı') : 'Kullanıcı';
  }
  function _getUserColor() {
    return '#3b82f6';
  }

  function addNote(text) {
    text = (text || '').trim();
    if(!text) return;
    const note = {
      id: U.genId('note'),
      author: _getUserName(),
      authorColor: _getUserColor(),
      text: text,
      ts: Date.now(),
      edited: false
    };
    if(_remoteRef) {
      _remoteRef.child(note.id).set(note);
    } else {
      _notes.push(note);
      if(_notes.length > MAX_LOCAL) _notes = _notes.slice(-MAX_LOCAL);
      _saveLocal();
    }
    if(App.Changelog) App.Changelog.addEntry({type:'addNote', targetName: text.substring(0, 40)});
    if(_panelOpen) renderPanel();
  }

  function updateNote(id, newText) {
    newText = (newText || '').trim();
    if(!newText) return;
    if(_remoteRef) {
      _remoteRef.child(id).update({ text: newText, edited: true });
    } else {
      const n = _notes.find(n => n.id === id);
      if(n) { n.text = newText; n.edited = true; _saveLocal(); }
    }
    if(App.Changelog) App.Changelog.addEntry({type:'updateNote', targetName: newText.substring(0, 40)});
    _editingId = null;
    if(_panelOpen) renderPanel();
  }

  function removeNote(id) {
    var _removedText = '';
    var _n = _notes.find(n => n.id === id);
    if(_n) _removedText = _n.text || '';
    if(_remoteRef) {
      _remoteRef.child(id).remove();
    } else {
      _notes = _notes.filter(n => n.id !== id);
      _saveLocal();
    }
    if(App.Changelog) App.Changelog.addEntry({type:'removeNote', targetName: _removedText.substring(0, 40)});
    if(_panelOpen) renderPanel();
  }

  function _saveLocal() {
    try { localStorage.setItem(KEY, JSON.stringify(_notes)); } catch(e) {}
  }

  function setupRemoteListener(roomRef) {
    _remoteRef = roomRef.child('notes');
    _notes = [];
    _remoteListener = _remoteRef.on('value', snap => {
      _notes = [];
      snap.forEach(ch => { _notes.push(ch.val()); });
      if(_panelOpen) renderPanel();
    });
  }

  function teardownRemoteListener() {
    if(_remoteRef && _remoteListener) {
      _remoteRef.off('value', _remoteListener);
    }
    _remoteRef = null;
    _remoteListener = null;
    init();
  }

  function _buildCharAnalysis() {
    if (!App.Characters || !App.Characters.getStats) return '';
    var stats = App.Characters.getStats();
    if (!stats.length) return '';

    var arrow = _charAnalysisOpen ? '▾' : '▸';
    var h = '<div class="notes-char-analysis">';
    h += '<div class="notes-char-analysis-title" onclick="App.Notes.toggleCharAnalysis()">';
    h += '<span>📊 Karakter Analizi</span><span style="font-size:10px;color:var(--tx4);">' + arrow + '</span></div>';

    if (_charAnalysisOpen) {
      h += '<div class="notes-char-analysis-body">';
      h += '<div style="margin-bottom:6px;color:var(--tx3);">Toplam: <span style="color:var(--tx);">' + stats.length + '</span> karakter</div>';

      // Top 3 by scene count
      var byScene = stats.slice().sort(function(a, b) { return b.sceneCount - a.sceneCount; });
      var top3Scene = byScene.slice(0, 3).filter(function(s) { return s.sceneCount > 0; });
      if (top3Scene.length) {
        var maxScene = top3Scene[0].sceneCount || 1;
        h += '<div style="margin-bottom:6px;"><span style="color:var(--tx2);font-weight:600;">En Çok Sahnede</span></div>';
        top3Scene.forEach(function(ch) {
          var pct = Math.round((ch.sceneCount / maxScene) * 100);
          var bgColor = ch.color ? U.sanitizeColor(ch.color) : '#3b82f6';
          h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">';
          h += '<span style="width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--tx2);">' + U.escHtml(ch.name) + '</span>';
          h += '<div class="notes-char-mini-bar"><div style="width:' + pct + '%;background:' + bgColor + ';"></div></div>';
          h += '<span style="color:var(--tx4);min-width:24px;text-align:right;">' + ch.sceneCount + '</span>';
          h += '</div>';
        });
      }

      // Top 3 by dialogue words
      var byDialogue = stats.slice().sort(function(a, b) { return b.dialogueWords - a.dialogueWords; });
      var top3Dial = byDialogue.slice(0, 3).filter(function(s) { return s.dialogueWords > 0; });
      if (top3Dial.length) {
        var maxWords = top3Dial[0].dialogueWords || 1;
        h += '<div style="margin:6px 0;"><span style="color:var(--tx2);font-weight:600;">En Çok Diyalog</span></div>';
        top3Dial.forEach(function(ch) {
          var pct = Math.round((ch.dialogueWords / maxWords) * 100);
          var bgColor = ch.color ? U.sanitizeColor(ch.color) : '#3b82f6';
          h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">';
          h += '<span style="width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--tx2);">' + U.escHtml(ch.name) + '</span>';
          h += '<div class="notes-char-mini-bar"><div style="width:' + pct + '%;background:' + bgColor + ';"></div></div>';
          h += '<span style="color:var(--tx4);min-width:24px;text-align:right;">' + ch.dialogueWords + '</span>';
          h += '</div>';
        });
      }

      h += '<div style="margin-top:8px;text-align:right;"><a href="#" style="color:var(--blue);font-size:10px;text-decoration:none;" onclick="event.preventDefault();App.setViewMode(\'karakterler\');">Tüm Karakterler →</a></div>';
      h += '</div>';
    }
    h += '</div>';
    return h;
  }

  function toggleCharAnalysis() {
    _charAnalysisOpen = !_charAnalysisOpen;
    if (_panelOpen) renderPanel();
  }

  function renderPanel() {
    const rp = U.$('rPanel');
    const myName = _getUserName();
    const sorted = _notes.slice().reverse();

    let h = '<div class="rpanel-hdr"><h3>📌 Notlar</h3><button class="close-btn" onclick="App.Panels.closeAll()">✕</button></div>';
    // Character analysis box
    h += _buildCharAnalysis();
    // Compose area
    h += '<div class="notes-compose">';
    h += '<textarea id="noteInput" placeholder="Not yaz..." onkeydown="if(event.ctrlKey&&event.key===\'Enter\'){App.Notes.addNote(this.value);this.value=\'\';event.preventDefault();}"></textarea>';
    h += '<div class="notes-compose-bar"><button class="btn btn-p btn-s" onclick="var ta=document.getElementById(\'noteInput\');App.Notes.addNote(ta.value);ta.value=\'\';">Ekle</button></div>';
    h += '</div>';
    // Notes list
    h += '<div class="rpanel-body" style="overflow-y:auto;flex:1;">';
    if(sorted.length === 0) {
      h += '<div style="padding:20px;text-align:center;color:var(--tx3);font-size:12px;">Henüz not yok</div>';
    } else {
      sorted.forEach(n => {
        const d = new Date(n.ts);
        const time = d.toLocaleTimeString('tr-TR', {hour:'2-digit',minute:'2-digit'});
        const date = d.toLocaleDateString('tr-TR', {day:'numeric',month:'short'});
        const isMine = n.author === myName;
        h += '<div class="note-item" data-note-id="' + n.id + '">';
        h += '<div class="note-hdr">';
        h += '<span class="note-author" style="color:' + U.sanitizeColor(n.authorColor || 'var(--tx)') + '">' + U.escHtml(n.author) + '</span>';
        h += '<span class="note-time">' + date + ' ' + time + (n.edited ? ' (düzenlendi)' : '') + '</span>';
        if(isMine) {
          h += '<div class="note-actions">';
          h += '<button class="btn btn-s" onclick="App.Notes.startEdit(\'' + n.id + '\')">✏</button>';
          h += '<button class="btn btn-s btn-d" onclick="App.Notes.removeNote(\'' + n.id + '\')">✕</button>';
          h += '</div>';
        }
        h += '</div>';
        if(_editingId === n.id) {
          h += '<textarea id="noteEdit_' + n.id + '" class="notes-compose" style="width:100%;min-height:50px;padding:6px;border-radius:var(--radius);border:1px solid var(--blue);background:var(--bg);color:var(--tx);font-family:inherit;font-size:12px;resize:vertical;outline:none;">' + U.escHtml(n.text) + '</textarea>';
          h += '<div style="display:flex;gap:4px;margin-top:4px;justify-content:flex-end;">';
          h += '<button class="btn btn-s" onclick="App.Notes._cancelEdit()">İptal</button>';
          h += '<button class="btn btn-s btn-p" onclick="App.Notes.updateNote(\'' + n.id + '\',document.getElementById(\'noteEdit_' + n.id + '\').value)">Kaydet</button>';
          h += '</div>';
        } else {
          h += '<div class="note-text">' + U.escHtml(n.text) + '</div>';
        }
        h += '</div>';
      });
    }
    h += '</div>';
    rp.innerHTML = h;
  }

  function startEdit(id) {
    _editingId = id;
    renderPanel();
  }

  function _cancelEdit() {
    _editingId = null;
    renderPanel();
  }

  return { init, setPanelOpen, addNote, updateNote, removeNote, setupRemoteListener, teardownRemoteListener, renderPanel, startEdit, _cancelEdit, toggleCharAnalysis };
})();