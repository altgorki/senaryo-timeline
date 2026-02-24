// ── Global Error Handlers ──
window.onerror = function(msg, src, line, col, err) {
  console.error('[Global Error]', msg, 'at', src, line + ':' + col, err);
  if(window.App && App.UI && App.UI.toast) {
    App.UI.toast('Beklenmeyen hata: ' + (msg || 'Bilinmeyen hata').toString().substring(0, 100));
  }
  return false;
};
window.addEventListener('unhandledrejection', function(e) {
  console.error('[Unhandled Promise]', e.reason);
  if(window.App && App.UI && App.UI.toast) {
    var msg = (e.reason && e.reason.message) ? e.reason.message : String(e.reason);
    App.UI.toast('Async hata: ' + msg.substring(0, 100));
  }
});
// ── Network Connectivity Detection ──
(function(){
  var _wasOffline = false;
  window.addEventListener('offline', function() {
    _wasOffline = true;
    if(window.App && App.UI && App.UI.toast) App.UI.toast('İnternet bağlantısı kesildi! Değişiklikler kaydedilmeyecek.');
    var bar = document.getElementById('statusbar');
    if(bar) bar.style.borderTop = '2px solid var(--red)';
  });
  window.addEventListener('online', function() {
    if(_wasOffline) {
      _wasOffline = false;
      if(window.App && App.UI && App.UI.toast) App.UI.toast('İnternet bağlantısı yeniden kuruldu.');
      var bar = document.getElementById('statusbar');
      if(bar) bar.style.borderTop = '';
    }
  });
})();

// ── AI localStorage cleanup (one-time migration v2) ──
(function(){
  const migrated = localStorage.getItem('ai_migrated_v2');
  if(!migrated) {
    localStorage.removeItem('ai_provider');
    localStorage.removeItem('ai_model');
    localStorage.setItem('ai_migrated_v2', '1');
  }
  const m = localStorage.getItem('ai_model');
  if(m && (m.includes('claude-sonnet-4-2025') || m.includes('claude-haiku-4-2025') || m === 'gpt-4o' || m === 'gpt-4o-mini' || m.includes('gemini-2.0-flash-lite'))) localStorage.removeItem('ai_model');
})();

// ═══════════════════════════════════════
// SENARYO TIMELINE EDITÖRÜ — MODÜLER MİMARİ
// ═══════════════════════════════════════
const App = {};

// ═══ FIREBASE CONFIG ═══
const firebaseConfig = {
  apiKey: "AIzaSyDwrB0ghEJUZRI6p5AuCGwobdsof9nhESQ",
  authDomain: "senaryo-7e7fb.firebaseapp.com",
  databaseURL: "https://senaryo-7e7fb-default-rtdb.firebaseio.com",
  projectId: "senaryo-7e7fb",
  storageBucket: "senaryo-7e7fb.firebasestorage.app",
  messagingSenderId: "1092333524437",
  appId: "1:1092333524437:web:31cec6e577c127abc5d95c"
};

/*
 * ═══ FIREBASE SECURITY RULES ═══
 * Deploy these rules in Firebase Console → Realtime Database → Rules
 * NOT: Multi-path update için newData bazlı kontroller eklendi.
 * Firebase multi-path update atomiktir — tüm path'ler tek seferde yazılır.
 * newData.parent().child('owner') ile yazılacak owner değeri kontrol edilir.
 *
 * {
 *   "rules": {
 *     "users": {
 *       "$uid": {
 *         ".read": "auth != null && auth.uid === $uid",
 *         ".write": "auth != null && auth.uid === $uid"
 *       }
 *     },
 *     "projects": {
 *       "$projectId": {
 *         ".read": "auth != null && (data.child('members/' + auth.uid).exists() || data.child('owner').val() === auth.uid)",
 *         ".write": "auth != null && data.exists() && data.child('owner').val() === auth.uid && !newData.exists()",
 *         "data": {
 *           ".write": "auth != null && (root.child('projects/' + $projectId + '/owner').val() === auth.uid || newData.parent().child('owner').val() === auth.uid || root.child('projects/' + $projectId + '/members/' + auth.uid + '/role').val() === 'owner' || root.child('projects/' + $projectId + '/members/' + auth.uid + '/role').val() === 'editor')"
 *         },
 *         "meta": {
 *           ".write": "auth != null && (root.child('projects/' + $projectId + '/owner').val() === auth.uid || newData.parent().child('owner').val() === auth.uid || root.child('projects/' + $projectId + '/members/' + auth.uid + '/role').val() === 'owner' || root.child('projects/' + $projectId + '/members/' + auth.uid + '/role').val() === 'editor')"
 *         },
 *         "owner": {
 *           ".write": "auth != null && !data.exists()"
 *         },
 *         "members": {
 *           ".read": "auth != null && (data.parent().child('members/' + auth.uid).exists() || data.parent().child('owner').val() === auth.uid)",
 *           ".write": "auth != null && (root.child('projects/' + $projectId + '/owner').val() === auth.uid || newData.parent().child('owner').val() === auth.uid || root.child('projects/' + $projectId + '/members/' + auth.uid + '/role').val() === 'owner')"
 *         },
 *         "presence": {
 *           "$uid": {
 *             ".write": "auth != null && $uid === auth.uid && (root.child('projects/' + $projectId + '/members/' + auth.uid).exists() || root.child('projects/' + $projectId + '/owner').val() === auth.uid)"
 *           }
 *         }
 *       }
 *     },
 *     "userProjects": {
 *       "$uid": {
 *         ".read": "auth != null && auth.uid === $uid",
 *         "$projectId": {
 *           ".write": "auth != null"
 *         }
 *       }
 *     },
 *     "invitations": {
 *       "$invId": {
 *         ".read": "auth != null",
 *         ".write": "auth != null"
 *       }
 *     },
 *     "emailIndex": {
 *       "$email": {
 *         ".read": "auth != null",
 *         ".write": "auth != null"
 *       }
 *     }
 *   }
 * }
 */
