// ═══ AUTH MODULE ═══
App.Auth = (function(){
  function switchTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.getElementById('authLoginForm').style.display = tab === 'login' ? '' : 'none';
    document.getElementById('authRegisterForm').style.display = tab === 'register' ? '' : 'none';
  }

  function showLoginScreen() {
    document.getElementById('authScreen').style.display = 'block';
    document.getElementById('projectsScreen').style.display = 'none';
    document.getElementById('appRoot').style.display = 'none';
    document.getElementById('loadMsg').style.display = 'none';
    // Her zaman login sekmesine sıfırla
    switchTab('login');
    document.getElementById('loginError').style.display = 'none';
    document.getElementById('registerError').style.display = 'none';
  }

  function doRegister() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPass').value;
    const errEl = document.getElementById('registerError');
    errEl.style.display = 'none';
    if(!name) { errEl.textContent = 'Ad gerekli'; errEl.style.display = 'block'; return; }
    if(!email) { errEl.textContent = 'E-posta gerekli'; errEl.style.display = 'block'; return; }
    if(pass.length < 6) { errEl.textContent = 'Parola en az 6 karakter olmalı'; errEl.style.display = 'block'; return; }

    firebase.auth().createUserWithEmailAndPassword(email, pass)
      .then(cred => {
        return cred.user.updateProfile({ displayName: name }).then(() => {
          firebase.database().ref('users/' + cred.user.uid + '/profile').set({
            displayName: name, email: email, createdAt: firebase.database.ServerValue.TIMESTAMP
          });
        });
      })
      .catch(err => {
        errEl.textContent = _translateError(err.code);
        errEl.style.display = 'block';
      });
  }

  function doLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPass').value;
    const errEl = document.getElementById('loginError');
    errEl.style.display = 'none';
    if(!email || !pass) { errEl.textContent = 'E-posta ve parola gerekli'; errEl.style.display = 'block'; return; }

    firebase.auth().signInWithEmailAndPassword(email, pass)
      .catch(err => {
        errEl.textContent = _translateError(err.code);
        errEl.style.display = 'block';
      });
  }

  function logout() {
    if(App.Sync && App.Sync.isInRoom()) App.Sync.leaveRoom();
    firebase.auth().signOut();
  }

  function getCurrentUser() { return firebase.auth().currentUser; }

  function openProfileModal() {
    const user = firebase.auth().currentUser;
    if(!user) return;
    const name = user.displayName || '';
    const email = user.email || '';
    const created = user.metadata && user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('tr-TR', {day:'numeric',month:'long',year:'numeric'}) : '-';
    const avatar = (name || email || '?').charAt(0).toUpperCase();

    App.UI.openModal(`<div class="mh"><span>Profil Düzenle</span><button class="close-btn" onclick="App.UI.closeModal()">✕</button></div>
      <div class="mb" style="padding:20px;">
        <div style="text-align:center;margin-bottom:20px;">
          <div style="width:56px;height:56px;border-radius:50%;background:var(--blue);color:#fff;font-size:22px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;">${avatar}</div>
        </div>
        <div class="fg" style="margin-bottom:12px;">
          <label style="font-size:11px;color:var(--tx3);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px;">Ad</label>
          <input type="text" id="profileName" value="${App.Utils.escHtml(name)}" placeholder="Adınız" style="width:100%;padding:8px 10px;border-radius:var(--radius);border:1px solid var(--brd);background:var(--bg3);color:var(--tx);font-family:inherit;font-size:13px;outline:none;" />
        </div>
        <div class="fg" style="margin-bottom:12px;">
          <label style="font-size:11px;color:var(--tx3);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px;">E-posta</label>
          <div style="padding:8px 10px;border-radius:var(--radius);border:1px solid var(--brd);background:var(--bg);color:var(--tx3);font-size:13px;">${App.Utils.escHtml(email)}</div>
        </div>
        <div class="fg" style="margin-bottom:16px;">
          <label style="font-size:11px;color:var(--tx3);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px;">Kayıt Tarihi</label>
          <div style="padding:8px 10px;border-radius:var(--radius);border:1px solid var(--brd);background:var(--bg);color:var(--tx3);font-size:13px;">${created}</div>
        </div>
        <div style="border-top:1px solid var(--brd);padding-top:14px;margin-top:4px;">
          <label style="font-size:11px;color:var(--tx3);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:8px;">Şifre Değiştir</label>
          <div class="fg" style="margin-bottom:8px;">
            <input type="password" id="profileCurrentPass" placeholder="Mevcut şifre" style="width:100%;padding:8px 10px;border-radius:var(--radius);border:1px solid var(--brd);background:var(--bg3);color:var(--tx);font-family:inherit;font-size:13px;outline:none;" />
          </div>
          <div class="fg" style="margin-bottom:8px;">
            <input type="password" id="profileNewPass" placeholder="Yeni şifre (min 6 karakter)" style="width:100%;padding:8px 10px;border-radius:var(--radius);border:1px solid var(--brd);background:var(--bg3);color:var(--tx);font-family:inherit;font-size:13px;outline:none;" />
          </div>
          <div class="fg" style="margin-bottom:4px;">
            <input type="password" id="profileNewPass2" placeholder="Yeni şifre (tekrar)" style="width:100%;padding:8px 10px;border-radius:var(--radius);border:1px solid var(--brd);background:var(--bg3);color:var(--tx);font-family:inherit;font-size:13px;outline:none;" />
          </div>
          <div id="profilePassError" style="color:var(--red);font-size:11px;min-height:16px;margin-top:4px;"></div>
          <button class="btn btn-s" onclick="App.Auth.changePassword()" style="margin-top:4px;">Şifreyi Güncelle</button>
        </div>
      </div>
      <div class="mf"><button class="btn" onclick="App.UI.closeModal()">İptal</button><button class="btn btn-p" onclick="App.Auth.saveProfile(document.getElementById('profileName').value)">Kaydet</button></div>`);
  }

  function saveProfile(newName) {
    newName = (newName || '').trim();
    if(!newName) { App.UI.toast('Ad boş olamaz'); return; }
    const user = firebase.auth().currentUser;
    if(!user) return;
    const oldName = user.displayName || '';
    if(newName === oldName) { App.UI.closeModal(); return; }

    // 1. Firebase Auth profilini güncelle
    user.updateProfile({ displayName: newName }).then(() => {
      // 2. users/$uid/profile güncelle
      firebase.database().ref('users/' + user.uid + '/profile/displayName').set(newName);

      // 3. Açık projedeki members kaydını güncelle
      if(App.Projects && App.Projects.getCurrentId) {
        const pid = App.Projects.getCurrentId();
        if(pid) {
          firebase.database().ref('projects/' + pid + '/members/' + user.uid + '/displayName').set(newName);
        }
      }

      // 4. Topbar'ı güncelle
      var avatarEl = document.getElementById('userAvatar');
      var nameEl = document.getElementById('userDisplayName');
      if(avatarEl) avatarEl.textContent = newName.charAt(0).toUpperCase();
      if(nameEl) nameEl.textContent = newName;

      // 5. Günlüğe kaydet
      if(App.Changelog) App.Changelog.addEntry({type:'updateProfile', targetName: newName});

      App.UI.closeModal();
      App.UI.toast('Profil güncellendi');
    }).catch(err => {
      App.UI.toast('Hata: ' + err.message);
    });
  }

  function changePassword() {
    const user = firebase.auth().currentUser;
    if(!user) return;
    const errEl = document.getElementById('profilePassError');
    const current = (document.getElementById('profileCurrentPass').value || '').trim();
    const newPass = (document.getElementById('profileNewPass').value || '').trim();
    const newPass2 = (document.getElementById('profileNewPass2').value || '').trim();

    errEl.textContent = '';
    if(!current) { errEl.textContent = 'Mevcut şifreyi girin'; return; }
    if(!newPass) { errEl.textContent = 'Yeni şifreyi girin'; return; }
    if(newPass.length < 6) { errEl.textContent = 'Yeni şifre en az 6 karakter olmalı'; return; }
    if(newPass !== newPass2) { errEl.textContent = 'Yeni şifreler eşleşmiyor'; return; }
    if(current === newPass) { errEl.textContent = 'Yeni şifre eskisiyle aynı olamaz'; return; }

    const credential = firebase.auth.EmailAuthProvider.credential(user.email, current);
    user.reauthenticateWithCredential(credential).then(() => {
      return user.updatePassword(newPass);
    }).then(() => {
      document.getElementById('profileCurrentPass').value = '';
      document.getElementById('profileNewPass').value = '';
      document.getElementById('profileNewPass2').value = '';
      errEl.style.color = 'var(--green)';
      errEl.textContent = 'Şifre başarıyla değiştirildi!';
      App.UI.toast('Şifre güncellendi');
    }).catch(err => {
      errEl.style.color = 'var(--red)';
      errEl.textContent = _translateError(err.code);
    });
  }

  function _translateError(code) {
    const map = {
      'auth/email-already-in-use': 'Bu e-posta zaten kayıtlı',
      'auth/invalid-email': 'Geçersiz e-posta adresi',
      'auth/weak-password': 'Parola çok zayıf (min 6 karakter)',
      'auth/user-not-found': 'Kullanıcı bulunamadı',
      'auth/wrong-password': 'Yanlış parola',
      'auth/too-many-requests': 'Çok fazla deneme, lütfen bekleyin',
      'auth/invalid-credential': 'Geçersiz kimlik bilgileri',
      'auth/wrong-password': 'Mevcut şifre yanlış',
      'auth/requires-recent-login': 'Lütfen çıkış yapıp tekrar giriş yapın'
    };
    return map[code] || ('Hata: ' + code);
  }

  return { switchTab, showLoginScreen, doRegister, doLogin, logout, getCurrentUser, openProfileModal, saveProfile, changePassword };
})();
