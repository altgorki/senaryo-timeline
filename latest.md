# Senaryo Timeline — Gerçek Proje Yönetimi Sistemi (Devam Notu)

## Tarih: 2026-02-19

## Yapılan Değişiklikler (index.html)

### 1. CSS Stilleri (eklendi)
- Auth ekranı (`.auth-tabs`, `.auth-form`, `.auth-error`)
- Kullanıcı bilgisi (`.user-info`, `.user-avatar`)
- Readonly mode (`.readonly-mode` — viewer kullanıcılar için düzenleme gizleme)
- Rol badge (`.ps-card-role.owner/editor/viewer`)
- Üye listesi (`.member-row` — paylaş modal)

### 2. Auth Ekranı HTML (eklendi)
- `#authScreen` div — login/register tabbed form
- `#projectsScreen`'den önce yerleştirildi

### 3. Topbar Güncellemeleri
- "İşbirliği" butonu kaldırıldı (`#syncBtn`)
- Eklendi: readonly badge, user info, "Paylaş" butonu, "Çıkış" butonu
- Sync bar sadeleştirildi (room code ve leave button kaldırıldı)

### 4. App.Auth Modülü (YENİ — App.UI'dan sonra)
- `switchTab()`, `showLoginScreen()`, `doRegister()`, `doLogin()`, `logout()`, `getCurrentUser()`
- Firebase Email/Password auth
- Türkçe hata çevirileri
- `showLoginScreen()` her zaman login sekmesine sıfırlar

### 5. App.AutoSave Modülü (YENİDEN YAZILDI)
- localStorage kaldırıldı
- `App.Projects.save()` üzerinden Firebase'e yazıyor

### 6. App.Projects Modülü (YENİDEN YAZILDI — Firebase RTDB)
- `loadFromFirebase()` — `userProjects/{uid}` real-time listener
- `create()` — **sıralı yazma**: önce owner, sonra members, sonra data/meta/userProjects
- `open()` — Firebase'den proje verisi okuma + real-time listeners
- `save()` — Firebase RTDB'ye yazma (AutoSave üzerinden debounced)
- `_setupProjectListeners()` — tüm koleksiyonlar için real-time dinleme
- `_setupPresence()` — presence sistemi + heartbeat
- `canEdit()`, `canManage()`, `_applyPermissions()` — yetki kontrolü
- `openShareModal()`, `sendInvite()`, `removeMember()` — davet sistemi
- `checkPendingInvitations()` — giriş yapınca otomatik davet kabul
- `importToProject()` — **sıralı yazma** (create ile aynı pattern)
- `_keyedToArray()` — spread operator ile kopyalama (mutasyon düzeltildi)
- Null check'ler: `goBack()`, `loadFromFirebase()`, `_renderPresenceBar()`

### 7. App.Sync Modülü (SADELEŞTIRILDI)
- 850+ satırlık oda sistemi kaldırıldı
- 6 satırlık minimal shim: `init()`, `handleStoreChange()`, `isInRoom()`, `leaveRoom()`
- `firebaseConfig` top-level scope'a taşındı

### 8. Init Flow (YENİDEN YAZILDI)
- `firebase.initializeApp(firebaseConfig)` başlangıçta
- `firebase.auth().onAuthStateChanged()` tüm routing'i kontrol eder
- Anonim oturum kontrolü (`user.isAnonymous` → signOut)
- `checkPendingInvitations` hatası yakalama (`.catch()`)
- V1 migration ve room hash kontrolleri kaldırıldı

### 9. Diğer Düzeltmeler
- Changelog/Notes: `App.Auth.getCurrentUser()` kullanıyor (localStorage yerine)
- `App.Sync.pushChange()` referansları temizlendi
- Manuel kaydet butonu toast gösteriyor

---

## Mevcut Durum

### Çalışan
- Auth ekranı görünüyor (login/register tabs)
- Kayıt olma çalışıyor (Firebase Email/Password)
- Giriş yapma çalışıyor
- Proje listesi ekranı Firebase'den yükleniyor
- Çıkış yapma çalışıyor
- Firebase kuralları deploy edildi

### ÇALIŞMAYAN — Düzeltilmesi Gereken
- **Proje oluşturma başarısız** — Firebase permission hatası
  - `create()` sıralı yazma yapıyor (owner → members → data)
  - Kural güncellendi ama hâlâ çalışmıyor
  - **Olası sorun**: Adım 2'de (members yazma) kural `root.child('.../owner').val() === auth.uid` kontrolü yapıyor ama Adım 1'deki `owner` yazma henüz commit olmamış olabilir veya kurallar hâlâ eski
  - **Debug önerisi**: F12 Console'da tam hata mesajına bak — hangi path'te permission denied oluyor
  - **Alternatif çözüm**: Kuralları geçici olarak test moduna al (`".read": true, ".write": true`) → proje oluştur → sonra kuralları geri koy

### Firebase Console Gereksinimleri
- [x] Email/Password authentication etkinleştirildi
- [x] Realtime Database kuralları deploy edildi
- [ ] Kurallar hâlâ sorunlu olabilir — test modunda denenmeli

---

## Firebase Kuralları (Güncel — index.html'deki yorum bloğunda da var)

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "projects": {
      "$projectId": {
        ".read": "auth != null && (data.child('members/' + auth.uid).exists() || data.child('owner').val() === auth.uid)",
        "data": {
          ".write": "auth != null && (root.child('projects/' + $projectId + '/owner').val() === auth.uid || root.child('projects/' + $projectId + '/members/' + auth.uid + '/role').val() === 'owner' || root.child('projects/' + $projectId + '/members/' + auth.uid + '/role').val() === 'editor')"
        },
        "meta": {
          ".write": "auth != null && (root.child('projects/' + $projectId + '/owner').val() === auth.uid || root.child('projects/' + $projectId + '/members/' + auth.uid + '/role').val() === 'owner' || root.child('projects/' + $projectId + '/members/' + auth.uid + '/role').val() === 'editor')"
        },
        "owner": {
          ".write": "auth != null && !data.exists()"
        },
        "members": {
          ".read": "auth != null && (data.parent().child('members/' + auth.uid).exists() || data.parent().child('owner').val() === auth.uid)",
          ".write": "auth != null && (root.child('projects/' + $projectId + '/owner').val() === auth.uid || root.child('projects/' + $projectId + '/members/' + auth.uid + '/role').val() === 'owner')"
        },
        "presence": {
          "$uid": {
            ".write": "auth != null && $uid === auth.uid && (root.child('projects/' + $projectId + '/members/' + auth.uid).exists() || root.child('projects/' + $projectId + '/owner').val() === auth.uid)"
          }
        }
      }
    },
    "userProjects": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        "$projectId": {
          ".write": "auth != null"
        }
      }
    },
    "invitations": {
      "$invId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "emailIndex": {
      "$email": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

---

## Veritabanı Yapısı

```
/users/{uid}/profile: { displayName, email, createdAt }
/userProjects/{uid}/{projectId}: { role, title, updatedAt }
/projects/{projectId}/
    meta: { title, author, settings, createdAt, updatedAt }
    owner: "uid"
    members/{uid}: { role, email, displayName, addedAt }
    data/
      categories: { ... }
      characters: { key: {...}, ... }
      episodes: { key: {...}, ... }
      scenes: { key: {...}, ... }
      events: { key: {...}, ... }
      connections: { key: {...}, ... }
    presence/{uid}: { name, color, lastSeen }
/invitations/{invId}: { projectId, projectTitle, invitedEmail, invitedBy, invitedByName, role, status, createdAt }
/emailIndex/{sanitizedEmail}/{invId}: true
```

---

## Devam Planı (Öncelik Sırasıyla)

1. **Proje oluşturma hatası düzelt** — Console'dan tam hata mesajını al, hangi path'te takılıyor belirle
2. **Test modu ile doğrula** — Kuralları geçici olarak `true` yapıp tüm flow'u test et
3. **Kuralları ince ayarla** — Çalışan flow'a göre kuralları sıkılaştır
4. **Tam test senaryoları**:
   - Kayıt ol → giriş yap → proje oluştur → düzenle → kaydet
   - Çıkış → tekrar giriş → proje listesinde görünsün
   - Paylaş modal → email ile davet gönder
   - İkinci kullanıcı giriş yapınca davet otomatik kabul
   - Viewer readonly mode testi
   - Demo proje yükleme
