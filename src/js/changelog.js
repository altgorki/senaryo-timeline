// ═══ CHANGELOG MODULE ═══
App.Changelog = (function(){
  const U = App.Utils;
  const KEY = 'scenario_changelog';
  const MAX_LOCAL = 500;
  const MAX_REMOTE = 200;
  const SKIP = new Set(['undo','redo','set']);
  let _entries = [];
  let _remoteRef = null;
  let _remoteListener = null;

  const ACTION_LABELS = {
    addEvent:'Olay eklendi', updateEvent:'Olay güncellendi', removeEvent:'Olay silindi',
    addScene:'Sahne eklendi', updateScene:'Sahne güncellendi', removeScene:'Sahne silindi',
    addEp:'Bölüm eklendi', updateEp:'Bölüm güncellendi', removeEp:'Bölüm silindi',
    addCn:'Bağlantı eklendi', removeCn:'Bağlantı silindi',
    addChar:'Karakter eklendi', removeChar:'Karakter silindi',
    addCat:'Kategori eklendi', removeCat:'Kategori silindi',
    batch:'Toplu güncelleme', settings:'Ayarlar değiştirildi',
    docx:'DOCX dışa aktarıldı', fix:'Düzeltme uygulandı',
    addNote:'Not eklendi', updateNote:'Not düzenlendi', removeNote:'Not silindi',
    updateProfile:'Profil güncellendi'
  };

  function init() {
    if(!App.Sync || !App.Sync.isInRoom()) {
      try {
        const raw = localStorage.getItem(KEY);
        if(raw) _entries = JSON.parse(raw);
      } catch(e) { _entries = []; }
    }
  }

  function addEntry(data) {
    if(!data || !data.type) return;
    const actionType = data.type;
    if(SKIP.has(actionType) || actionType.startsWith('remote')) return;
    const userName = (App.Auth && App.Auth.getCurrentUser()) ? (App.Auth.getCurrentUser().displayName || App.Auth.getCurrentUser().email || 'Kullanıcı') : 'Kullanıcı';
    const label = ACTION_LABELS[actionType] || actionType;
    const targetName = data.targetName || '';
    const desc = targetName ? label + ': "' + targetName + '"' : label;
    const entry = {
      id: U.genId('cl'),
      ts: Date.now(),
      userName: userName,
      action: actionType,
      targetId: data.targetId || null,
      targetName: targetName,
      desc: desc
    };

    if(App.Sync && App.Sync.isInRoom() && _remoteRef) {
      _remoteRef.push(entry);
    } else {
      _entries.push(entry);
      if(_entries.length > MAX_LOCAL) _entries = _entries.slice(-MAX_LOCAL);
      try { localStorage.setItem(KEY, JSON.stringify(_entries)); } catch(e) {}
    }
  }

  function setupRemoteListener(roomRef) {
    _remoteRef = roomRef.child('changelog');
    _entries = [];
    _remoteListener = _remoteRef.limitToLast(MAX_REMOTE).on('value', snap => {
      _entries = [];
      snap.forEach(ch => { _entries.push(ch.val()); });
      // Re-render if panel is open
      if(U.$('rPanel').classList.contains('open')) {
        const hdr = U.$('rPanel').querySelector('.rpanel-hdr h3');
        if(hdr && hdr.textContent.includes('Günlük')) renderPanel();
      }
    });
  }

  function teardownRemoteListener() {
    if(_remoteRef && _remoteListener) {
      _remoteRef.off('value', _remoteListener);
    }
    _remoteRef = null;
    _remoteListener = null;
    // Load local entries
    init();
  }

  function _navigate(targetId) {
    if(!targetId) return;
    const ev = App.Store.getEvent(targetId);
    if(ev) {
      App.Timeline.scrollToEvent(targetId);
      App.Panels.openEditEvent(targetId);
      return;
    }
    const sc = App.Store.getScene(targetId);
    if(sc) {
      const linked = App.Store.get().events.find(e => e.sceneId === targetId);
      if(linked) { App.Timeline.scrollToEvent(linked.id); App.Panels.openEditEvent(linked.id); }
    }
  }

  function renderPanel() {
    const rp = U.$('rPanel');
    const sorted = _entries.slice().reverse();
    let h = '<div class="rpanel-hdr"><h3>📋 Değişiklik Günlüğü</h3><button class="close-btn" onclick="App.Panels.closeAll()">✕</button></div>';
    h += '<div class="rpanel-body" style="overflow-y:auto;flex:1;">';
    if(sorted.length === 0) {
      h += '<div style="padding:20px;text-align:center;color:var(--tx3);font-size:12px;">Henüz değişiklik yok</div>';
    } else {
      sorted.forEach(e => {
        const d = new Date(e.ts);
        const time = d.toLocaleTimeString('tr-TR', {hour:'2-digit',minute:'2-digit'});
        const date = d.toLocaleDateString('tr-TR', {day:'numeric',month:'short'});
        const clickable = e.targetId && !e.action.startsWith('remove');
        const cursor = clickable ? 'cursor:pointer;' : '';
        const onclick = clickable ? ' onclick="App.Changelog.navigate(\'' + e.targetId + '\')"' : '';
        h += '<div class="cl-entry" style="' + cursor + '"' + onclick + '>';
        h += '<div class="cl-hdr"><span class="cl-user">' + U.escHtml(e.userName) + '</span><span class="cl-time">' + date + ' ' + time + '</span></div>';
        h += '<div class="cl-desc">' + U.escHtml(e.desc) + '</div>';
        if(clickable) h += '<div style="font-size:10px;color:var(--blue);margin-top:2px;">Olaya git →</div>';
        h += '</div>';
      });
    }
    h += '</div>';
    rp.innerHTML = h;
  }

  return { init, addEntry, setupRemoteListener, teardownRemoteListener, renderPanel, navigate: _navigate };
})();