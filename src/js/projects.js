// ═══ PROJECTS MODULE (Firebase RTDB) ═══
App.Projects = (function(){
  const S = App.Store;
  const U = App.Utils;
  let _currentId = null;
  let _myRole = null;
  let _membersCache = {};
  let _userProjectsRef = null;
  let _projectDataListeners = [];
  let _remoteChangeInProgress = false;
  let _heartbeatInterval = null;

  // ── Firebase'den proje listesi yükle ──
  function loadFromFirebase() {
    const user = App.Auth.getCurrentUser();
    if(!user) return;
    const uid = user.uid;
    if(_userProjectsRef) _userProjectsRef.off();
    _userProjectsRef = firebase.database().ref('userProjects/' + uid);
    _userProjectsRef.on('value', snap => {
      renderList(snap.val() || {});
    });
    showProjectsScreen();
  }

  function getCurrentId() { return _currentId; }

  // ── Proje oluştur (tek atomik multi-path update) ──
  function create() {
    const user = App.Auth.getCurrentUser();
    const uid = user.uid;
    const projectId = 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
    const now = firebase.database.ServerValue.TIMESTAMP;
    const displayName = user.displayName || user.email.split('@')[0];

    const emptyData = {
      categories: { operasyon:{label:'Operasyon',color:'#ef4444'}, karakter:{label:'Karakter',color:'#3b82f6'}, organizasyon:{label:'Organizasyon',color:'#10b981'}, sistem:{label:'Sistem',color:'#f59e0b'}, flashback:{label:'Flashback',color:'#a855f7'}, ihanet:{label:'İhanet',color:'#f97316'} },
      characters: {}, episodes: {}, scenes: {}, events: {}, connections: {}
    };

    const updates = {};
    updates['projects/' + projectId + '/owner'] = uid;
    updates['projects/' + projectId + '/members/' + uid] = { role:'owner', email:user.email, displayName:displayName, addedAt:now };
    updates['projects/' + projectId + '/meta'] = { title:'Yeni Proje', author:displayName, settings:{ episodeDuration:2700, pixelsPerSecond:0.5, snapGrid:10 }, createdAt:now, updatedAt:now };
    updates['projects/' + projectId + '/data'] = emptyData;
    updates['userProjects/' + uid + '/' + projectId] = { role:'owner', title:'Yeni Proje', updatedAt:now };

    firebase.database().ref().update(updates)
      .then(() => open(projectId))
      .catch(err => App.UI.toast('Proje oluşturma hatası: ' + err.message));
  }

  // ── Proje aç ──
  function open(projectId) {
    _currentId = projectId;
    const ref = firebase.database().ref('projects/' + projectId);

    Promise.all([
      ref.child('meta').once('value'),
      ref.child('data').once('value'),
      ref.child('members').once('value')
    ]).then(([metaSnap, dataSnap, membersSnap]) => {
      const meta = metaSnap.val() || { title:'İsimsiz', author:'', settings:{ episodeDuration:2700, pixelsPerSecond:0.5, snapGrid:10 } };
      const data = dataSnap.val() || {};
      _membersCache = membersSnap.val() || {};

      const uid = App.Auth.getCurrentUser().uid;
      _myRole = _membersCache[uid] ? _membersCache[uid].role : null;

      const P = {
        meta: meta,
        categories: data.categories || {},
        characters: _keyedToArray(data.characters),
        episodes: _keyedToArray(data.episodes).sort((a,b) => a.order - b.order),
        scenes: _keyedToArray(data.scenes),
        events: _keyedToArray(data.events),
        connections: _keyedToArray(data.connections)
      };
      S.set(P);
      _syncIdCounter();
      _initEditor();
      showEditor();
      _applyPermissions();
      _setupProjectListeners(projectId);
      _setupPresence(projectId);
    }).catch(err => {
      App.UI.toast('Proje açılamadı: ' + err.message);
    });
  }

  // ── Proje kaydet (debounced, Store change'de çağrılır — sadece dirty koleksiyonları yazar) ──
  function save() {
    if(!_currentId || !canEdit()) return;
    const P = S.get();
    const dirty = S.getDirty();
    if(!dirty.size) return;
    S.clearDirty();
    const ref = firebase.database().ref('projects/' + _currentId);
    const dataUpdate = {};
    if(dirty.has('categories')) dataUpdate.categories = P.categories;
    if(dirty.has('characters')) dataUpdate.characters = _arrayToKeyed(P.characters);
    if(dirty.has('episodes')) dataUpdate.episodes = _arrayToKeyed(P.episodes);
    if(dirty.has('scenes')) dataUpdate.scenes = _arrayToKeyed(P.scenes);
    if(dirty.has('events')) dataUpdate.events = _arrayToKeyed(P.events);
    if(dirty.has('connections')) dataUpdate.connections = _arrayToKeyed(P.connections);
    if(Object.keys(dataUpdate).length) {
      ref.child('data').update(dataUpdate);
    }
    ref.child('meta').update({ title: P.meta.title, author: P.meta.author, settings: P.meta.settings, updatedAt: firebase.database.ServerValue.TIMESTAMP });
    const uid = App.Auth.getCurrentUser().uid;
    firebase.database().ref('userProjects/' + uid + '/' + _currentId).update({ title: P.meta.title, updatedAt: firebase.database.ServerValue.TIMESTAMP });
  }

  // ── Real-time listeners ──
  function _setupProjectListeners(projectId) {
    _teardownProjectListeners();
    const ref = firebase.database().ref('projects/' + projectId + '/data');
    ['categories','characters','episodes','scenes','events','connections'].forEach(col => {
      const colRef = ref.child(col);
      const fn = colRef.on('value', snap => {
        if(_remoteChangeInProgress) return;
        _remoteChangeInProgress = true;
        const P = S.get();
        if(col === 'categories') {
          P.categories = snap.val() || {};
        } else {
          P[col] = _keyedToArray(snap.val());
          if(col === 'episodes') P.episodes.sort((a,b) => a.order - b.order);
        }
        S.emit('change', {type:'remote_' + col});
        App.refresh();
        _remoteChangeInProgress = false;
      });
      _projectDataListeners.push({ ref: colRef, fn });
    });
    const metaRef = firebase.database().ref('projects/' + projectId + '/meta');
    const metaFn = metaRef.on('value', snap => {
      if(_remoteChangeInProgress) return;
      _remoteChangeInProgress = true;
      const P = S.get();
      P.meta = snap.val() || P.meta;
      S.emit('change', {type:'remoteMeta'});
      document.getElementById('projTitle').textContent = P.meta.title;
      _remoteChangeInProgress = false;
    });
    _projectDataListeners.push({ ref: metaRef, fn: metaFn });
    const membersRef = firebase.database().ref('projects/' + projectId + '/members');
    const membersFn = membersRef.on('value', snap => {
      _membersCache = snap.val() || {};
    });
    _projectDataListeners.push({ ref: membersRef, fn: membersFn });
    // Changelog & Notes remote listeners
    var dataRef = firebase.database().ref('projects/' + projectId + '/data');
    if(App.Changelog && App.Changelog.setupRemoteListener) App.Changelog.setupRemoteListener(dataRef);
    if(App.Notes && App.Notes.setupRemoteListener) App.Notes.setupRemoteListener(dataRef);
  }

  function _teardownProjectListeners() {
    if(App.Changelog && App.Changelog.teardownRemoteListener) App.Changelog.teardownRemoteListener();
    if(App.Notes && App.Notes.teardownRemoteListener) App.Notes.teardownRemoteListener();
    _projectDataListeners.forEach(l => { if(l.fn) l.ref.off('value', l.fn); else l.ref.off(); });
    _projectDataListeners = [];
  }

  // ── Presence ──
  function _setupPresence(projectId) {
    const user = App.Auth.getCurrentUser();
    const presRef = firebase.database().ref('projects/' + projectId + '/presence/' + user.uid);
    const colors = ['#3b82f6','#ef4444','#10b981','#f59e0b','#a855f7','#ec4899','#06b6d4','#f97316'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    presRef.set({ name: user.displayName || user.email.split('@')[0], color, lastSeen: firebase.database.ServerValue.TIMESTAMP });
    presRef.onDisconnect().remove();
    if(_heartbeatInterval) clearInterval(_heartbeatInterval);
    _heartbeatInterval = setInterval(() => {
      presRef.child('lastSeen').set(firebase.database.ServerValue.TIMESTAMP);
    }, 60000);
    const presenceRef = firebase.database().ref('projects/' + projectId + '/presence');
    const presFn = presenceRef.on('value', snap => {
      _renderPresenceBar(snap.val() || {});
    });
    _projectDataListeners.push({ ref: presenceRef, fn: presFn });
  }

  // ── Yetki kontrolleri ──
  function getMyRole() { return _myRole; }
  function canEdit() { return _myRole === 'owner' || _myRole === 'editor'; }
  function canManage() { return _myRole === 'owner'; }

  function _applyPermissions() {
    document.body.classList.toggle('readonly-mode', !canEdit());
    const shareBtn = document.getElementById('shareBtn');
    if(shareBtn) shareBtn.style.display = canManage() ? '' : 'none';
  }

  // ── Proje sil ──
  function deleteProject(projectId) {
    if(!confirm('Bu proje kalıcı olarak silinecek. Devam?')) return;
    firebase.database().ref('projects/' + projectId + '/members').once('value').then(snap => {
      const members = snap.val() || {};
      const updates = {};
      Object.keys(members).forEach(memberUid => {
        updates['userProjects/' + memberUid + '/' + projectId] = null;
      });
      updates['projects/' + projectId] = null;
      return firebase.database().ref().update(updates);
    }).then(() => {
      if(_currentId === projectId) { _currentId = null; _myRole = null; }
      App.UI.toast('Proje silindi');
    }).catch(err => App.UI.toast('Silme hatası: ' + err.message));
  }

  // ── Davet sistemi ──
  function openShareModal() {
    if(!_currentId || !canManage()) return;
    let membersHtml = '';
    Object.keys(_membersCache).forEach(uid => {
      const m = _membersCache[uid];
      const isMe = uid === App.Auth.getCurrentUser().uid;
      const roleLabel = { owner:'Sahip', editor:'Editör', viewer:'İzleyici' }[m.role] || m.role;
      const removeBtn = (!isMe && canManage()) ? '<button class="btn btn-s" style="color:var(--red);" onclick="App.Projects.removeMember(\'' + uid + '\')">Kaldır</button>' : '';
      membersHtml += '<div class="member-row"><span class="member-email">' + U.escHtml(m.email || m.displayName || 'Bilinmiyor') + (isMe ? ' (sen)' : '') + '</span><span class="member-role">' + roleLabel + '</span>' + removeBtn + '</div>';
    });

    App.UI.openModal(
      '<div style="padding:24px;max-width:480px;">' +
        '<h2 style="margin-bottom:16px;">Projeyi Paylaş</h2>' +
        '<div class="fg" style="margin-bottom:8px;"><label style="font-size:11px;color:var(--tx3);">E-posta adresi</label><input type="email" id="inviteEmail" placeholder="ornek@email.com" style="width:100%;padding:8px 12px;border:1px solid var(--brd);border-radius:var(--radius);background:var(--bg3);color:var(--tx);font-size:13px;" /></div>' +
        '<div class="fg" style="margin-bottom:12px;display:flex;gap:8px;"><select id="inviteRole" style="flex:1;padding:8px;border:1px solid var(--brd);border-radius:var(--radius);background:var(--bg3);color:var(--tx);font-size:12px;"><option value="editor">Editör</option><option value="viewer">İzleyici</option></select><button class="btn btn-p" onclick="App.Projects.sendInvite()">Davet Gönder</button></div>' +
        '<div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--brd);"><div style="font-size:12px;color:var(--tx2);margin-bottom:8px;">Üyeler</div>' + membersHtml + '</div>' +
        '<div style="margin-top:16px;"><button class="btn" onclick="App.UI.closeModal()" style="width:100%;">Kapat</button></div>' +
      '</div>'
    );
  }

  function sendInvite() {
    const email = (document.getElementById('inviteEmail').value || '').trim().toLowerCase();
    const role = document.getElementById('inviteRole').value;
    if(!email || !email.includes('@')) { App.UI.toast('Geçerli e-posta girin'); return; }

    const alreadyMember = Object.values(_membersCache).some(m => m.email === email);
    if(alreadyMember) { App.UI.toast('Bu kullanıcı zaten üye'); return; }

    const user = App.Auth.getCurrentUser();
    const invId = 'inv_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
    const sanitizedEmail = email.replace(/\./g, ',');

    const updates = {};
    updates['invitations/' + invId] = {
      projectId: _currentId,
      projectTitle: S.get().meta.title,
      invitedEmail: email,
      invitedBy: user.uid,
      invitedByName: user.displayName || user.email,
      role: role,
      status: 'pending',
      createdAt: firebase.database.ServerValue.TIMESTAMP
    };
    updates['emailIndex/' + sanitizedEmail + '/' + invId] = true;

    firebase.database().ref().update(updates).then(() => {
      App.UI.toast(email + ' adresine davet gönderildi');
      document.getElementById('inviteEmail').value = '';
    }).catch(err => App.UI.toast('Davet hatası: ' + err.message));
  }

  function removeMember(uid) {
    if(!_currentId || !canManage()) return;
    if(!confirm('Bu üyeyi projeden kaldırmak istediğinize emin misiniz?')) return;
    const updates = {};
    updates['projects/' + _currentId + '/members/' + uid] = null;
    updates['userProjects/' + uid + '/' + _currentId] = null;
    updates['projects/' + _currentId + '/presence/' + uid] = null;
    firebase.database().ref().update(updates).then(() => {
      App.UI.toast('Üye kaldırıldı');
      openShareModal();
    });
  }

  // ── Davet kontrolü (giriş yapınca çağrılır) ──
  function checkPendingInvitations() {
    const user = App.Auth.getCurrentUser();
    if(!user || !user.email) return Promise.resolve();
    const sanitizedEmail = user.email.toLowerCase().replace(/\./g, ',');
    const uid = user.uid;

    return firebase.database().ref('emailIndex/' + sanitizedEmail).once('value').then(snap => {
      const invIds = snap.val();
      if(!invIds) return;

      const promises = Object.keys(invIds).map(invId => {
        return firebase.database().ref('invitations/' + invId).once('value').then(invSnap => {
          const inv = invSnap.val();
          if(!inv || inv.status !== 'pending') return;
          const updates = {};
          updates['invitations/' + invId + '/status'] = 'accepted';
          updates['projects/' + inv.projectId + '/members/' + uid] = {
            role: inv.role, email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            addedAt: firebase.database.ServerValue.TIMESTAMP
          };
          updates['userProjects/' + uid + '/' + inv.projectId] = {
            role: inv.role, title: inv.projectTitle,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
          };
          updates['emailIndex/' + sanitizedEmail + '/' + invId] = null;
          return firebase.database().ref().update(updates).then(() => {
            App.UI.toast(inv.invitedByName + ' sizi "' + inv.projectTitle + '" projesine davet etti');
          });
        });
      });
      return Promise.all(promises);
    });
  }

  // ── Import (JSON dosyasından Firebase'e — tek atomik multi-path update) ──
  function importToProject(data) {
    const user = App.Auth.getCurrentUser();
    const uid = user.uid;
    const projectId = 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
    const now = firebase.database.ServerValue.TIMESTAMP;
    const displayName = user.displayName || user.email.split('@')[0];
    const title = (data.meta && data.meta.title) || 'İçe Aktarılmış Proje';

    const fbData = {
      categories: data.categories || {},
      characters: _arrayToKeyed(data.characters || []),
      episodes: _arrayToKeyed(data.episodes || []),
      scenes: _arrayToKeyed(data.scenes || []),
      events: _arrayToKeyed(data.events || []),
      connections: _arrayToKeyed(data.connections || [])
    };

    const updates = {};
    updates['projects/' + projectId + '/owner'] = uid;
    updates['projects/' + projectId + '/members/' + uid] = { role:'owner', email:user.email, displayName:displayName, addedAt:now };
    updates['projects/' + projectId + '/meta'] = { title: title, author: (data.meta && data.meta.author) || displayName, settings: (data.meta && data.meta.settings) || { episodeDuration:2700, pixelsPerSecond:0.5, snapGrid:10 }, createdAt:now, updatedAt:now };
    updates['projects/' + projectId + '/data'] = fbData;
    updates['userProjects/' + uid + '/' + projectId] = { role:'owner', title: title, updatedAt:now };

    firebase.database().ref().update(updates)
      .then(() => open(projectId))
      .catch(err => App.UI.toast('İçe aktarma hatası: ' + err.message));
  }

  function loadDemoAsProject() {
    const demo = getDemoProject();
    U.setIdCounter(300);
    importToProject(demo);
  }

  function handleImport(e) {
    const f = e.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = ev => {
      try {
        const d = JSON.parse(ev.target.result);
        if(d.meta && d.episodes) {
          importToProject(d);
        } else if(d.events && d.events[0] && ('ep' in d.events[0]) && ('t' in d.events[0])) {
          App.IO.migrateOldFormat(d);
          importToProject(S.get());
        } else {
          App.UI.toast('Tanınmayan dosya formatı');
        }
      } catch(err) { App.UI.toast('Geçersiz dosya: ' + err.message); }
    };
    r.readAsText(f);
    e.target.value = '';
  }

  // ── Yardımcı fonksiyonlar ──
  function _arrayToKeyed(arr) {
    const obj = {};
    if(!arr || !Array.isArray(arr)) return obj;
    arr.forEach(item => { if(item && item.id) obj[item.id] = U.deepClone(item); });
    return obj;
  }
  function _keyedToArray(obj) {
    if(!obj || typeof obj !== 'object') return [];
    return Object.keys(obj).map(key => { const item = obj[key]; if(item && typeof item === 'object') { return { ...item, id: key }; } return null; }).filter(Boolean);
  }
  function _syncIdCounter() {
    const P = S.get();
    let maxNum = 0;
    const extractNum = id => { const m = (id||'').match(/(\d+)$/); return m ? parseInt(m[1]) : 0; };
    P.events.forEach(e => { maxNum = Math.max(maxNum, extractNum(e.id)); });
    P.scenes.forEach(s => { maxNum = Math.max(maxNum, extractNum(s.id)); });
    P.episodes.forEach(e => { maxNum = Math.max(maxNum, extractNum(e.id)); });
    P.characters.forEach(c => { maxNum = Math.max(maxNum, extractNum(c.id)); });
    P.connections.forEach(c => { maxNum = Math.max(maxNum, extractNum(c.id)); });
    U.setIdCounter(maxNum + 1);
  }

  function _renderPresenceBar(presenceData) {
    const bar = document.getElementById('presenceBar');
    if(!bar) return;
    const user = App.Auth.getCurrentUser();
    if(!user) return;
    const uid = user.uid;
    let html = '';
    Object.keys(presenceData).forEach(pUid => {
      const u = presenceData[pUid];
      if(!u || !u.name) return;
      const initial = u.name.charAt(0).toUpperCase();
      const isMe = pUid === uid;
      html += '<div class="presence-avatar" style="background:' + U.sanitizeColor(u.color||'#666') + ';' + (isMe?'box-shadow:0 0 0 2px var(--cyan);':'') + '" title="' + U.escHtml(u.name) + (isMe?' (sen)':'') + '"><span>' + initial + '</span></div>';
    });
    bar.innerHTML = html;
    const stSync = document.getElementById('stSync');
    if(stSync) { stSync.textContent = Object.keys(presenceData).length + ' kullanıcı'; stSync.style.display = ''; }
  }

  // ── Ekranlar ──
  function _initEditor() {
    App.Timeline.initFilter();
    App.Timeline.buildToolbar();
    App.Timeline.render();
    App.Screenplay.render();
    App.UI.updateStatusBar();
    App.setViewMode('split');
    document.getElementById('projTitle').textContent = S.get().meta.title;
    const user = App.Auth.getCurrentUser();
    const userInfo = document.getElementById('userInfo');
    if(userInfo) {
      userInfo.style.display = 'flex';
      document.getElementById('userAvatar').textContent = (user.displayName || user.email || '?').charAt(0).toUpperCase();
      document.getElementById('userDisplayName').textContent = user.displayName || user.email.split('@')[0];
    }
    document.getElementById('logoutBtn').style.display = '';
    if(canManage()) document.getElementById('shareBtn').style.display = '';
  }

  function showProjectsScreen() {
    U.$('authScreen').style.display = 'none';
    U.$('appRoot').style.display = 'none';
    U.$('projectsScreen').style.display = 'block';
    document.getElementById('loadMsg').style.display = 'none';
    _showUserInfoOnProjectsScreen();
  }

  function _showUserInfoOnProjectsScreen() {
    const user = App.Auth.getCurrentUser();
    if(!user) return;
    const header = document.querySelector('#projectsScreen .ps-header');
    const existing = document.getElementById('psUserBar');
    if(existing) existing.remove();
    const bar = document.createElement('div');
    bar.id = 'psUserBar';
    bar.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:16px;padding:8px 12px;background:var(--bg3);border-radius:var(--radius);border:1px solid var(--brd);';
    bar.innerHTML = '<div class="user-avatar" style="cursor:pointer;" onclick="App.Auth.openProfileModal()" title="Profili düzenle">' + (user.displayName||user.email||'?').charAt(0).toUpperCase() + '</div><span style="flex:1;font-size:13px;color:var(--tx);cursor:pointer;" onclick="App.Auth.openProfileModal()" title="Profili düzenle">' + U.escHtml(user.displayName || user.email) + '</span><button class="btn btn-s" onclick="App.Auth.logout()">Çıkış</button>';
    header.after(bar);
  }

  function showEditor() {
    U.$('authScreen').style.display = 'none';
    U.$('projectsScreen').style.display = 'none';
    U.$('appRoot').style.display = 'flex';
  }

  function goBack() {
    _teardownProjectListeners();
    if(_heartbeatInterval) { clearInterval(_heartbeatInterval); _heartbeatInterval = null; }
    const user = App.Auth.getCurrentUser();
    if(_currentId && user) {
      firebase.database().ref('projects/' + _currentId + '/presence/' + user.uid).remove();
    }
    _currentId = null;
    _myRole = null;
    document.body.classList.remove('readonly-mode');
    if(user) loadFromFirebase();
  }

  function renderList(userProjects) {
    const el = document.getElementById('psList');
    const entries = Object.keys(userProjects).map(pid => ({ id: pid, ...userProjects[pid] }));
    if(!entries.length) {
      el.innerHTML = '<div class="ps-empty">Henüz proje yok. Yeni proje oluşturun.</div>';
      return;
    }
    entries.sort((a,b) => ((b.updatedAt||0) - (a.updatedAt||0)));
    el.innerHTML = entries.map(p => {
      const roleLabel = { owner:'Sahip', editor:'Editör', viewer:'İzleyici' }[p.role] || '';
      const roleClass = p.role || 'viewer';
      const deleteBtn = p.role === 'owner' ? '<button class="btn btn-s btn-d" onclick="event.stopPropagation();App.Projects.deleteProject(\'' + p.id + '\')">Sil</button>' : '';
      return '<div class="ps-card" ondblclick="App.Projects.open(\'' + p.id + '\')">' +
        '<div style="display:flex;align-items:center;gap:8px;"><div class="ps-card-title" style="flex:1;">' + U.escHtml(p.title || 'İsimsiz Proje') + '</div><span class="ps-card-role ' + roleClass + '">' + roleLabel + '</span></div>' +
        '<div class="ps-card-actions" style="margin-top:8px;">' +
          '<button class="btn btn-s btn-p" onclick="event.stopPropagation();App.Projects.open(\'' + p.id + '\')">Aç</button>' +
          deleteBtn +
        '</div>' +
      '</div>';
    }).join('');
  }

  return {
    loadFromFirebase, create, open, save, deleteProject,
    importToProject, loadDemoAsProject, handleImport,
    openShareModal, sendInvite, removeMember, checkPendingInvitations,
    showProjectsScreen, showEditor, goBack, getCurrentId, renderList,
    getMyRole, canEdit, canManage
  };
})();
