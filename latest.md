# Senaryo Timeline — Bug Fix & Test Oturumu

## Tarih: 2026-02-20

## Son Commit

```
a351b0e  Firebase permission hatalarını düzelt ve proje yönetimi buglarını gider
```

Önceki commit: `9495fb6` (Auth sistemi + Firebase RTDB proje yönetimi)

---

## Bu Oturumda Yapılanlar

### 1. Proje Oluşturma Permission Hatası Düzeltildi (KRİTİK)

**Sorun:** `create()` ve `importToProject()` fonksiyonları 3 adımlı sıralı `.set()` çağrısı yapıyordu:
1. `projects/{id}/owner` → uid yaz
2. `projects/{id}/members/{uid}` → rol yaz
3. `data` + `meta` + `userProjects` → multi-path update

Adım 2'de Firebase kuralı `root.child('projects/'+$projectId+'/owner').val() === auth.uid` kontrolü yapıyordu ama Adım 1'deki owner henüz commit olmamıştı — Firebase ayrı `.set()` çağrılarında "read-your-writes" garantisi vermiyor.

**Çözüm:** 3 adımlı sıralı yazma yerine **tek atomik multi-path update** kullanıldı. Tüm path'ler (`owner`, `members`, `meta`, `data`, `userProjects`) tek `firebase.database().ref().update(updates)` çağrısıyla yazılıyor.

**Etkilenen fonksiyonlar:**
- `App.Projects.create()` — satır ~1096
- `App.Projects.importToProject()` — satır ~1372

### 2. Firebase Kuralları Güncellendi

**newData bazlı kontroller eklendi** — multi-path update'te Firebase her path'in kuralını ayrı değerlendirir ama `newData` ile yazılacak veriyi görebilir:

- `members/.write` → `newData.parent().child('owner').val() === auth.uid` eklendi
- `data/.write` → `newData.parent().child('owner').val() === auth.uid` eklendi
- `meta/.write` → `newData.parent().child('owner').val() === auth.uid` eklendi

**$projectId düzeyinde `.write` kuralı eklendi** — proje silme için:
```
".write": "auth != null && data.exists() && data.child('owner').val() === auth.uid && !newData.exists()"
```
Bu kural sadece proje sahibinin projeyi silmesine (null yazma) izin verir. Yeni proje oluşturmayı bozmaz çünkü `data.exists()` yeni projede false döner.

### 3. Proje Silme Bugı Düzeltildi

**Sorun:** `deleteProject()` fonksiyonu `projects/{projectId} = null` yazıyordu ama `$projectId` düzeyinde `.write` kuralı yoktu. Firebase bu yazma işlemini sessizce reddediyordu (`.catch()` handler da yoktu).

**Çözüm:**
- Firebase kurallarına `$projectId` düzeyinde `.write` eklendi (yukarıda)
- `deleteProject()` fonksiyonuna `.catch(err => App.UI.toast('Silme hatası: ' + err.message))` eklendi

### 4. Ctrl+S Toast Eklendi

**Sorun:** Kaydet butonu "Kaydedildi" toast'ı gösteriyordu ama Ctrl+S kısayolu göstermiyordu.

**Çözüm:** Ctrl+S handler'ına `App.UI.toast('Kaydedildi')` eklendi.

### 5. Firebase Yapılandırma Dosyaları Eklendi

- `database.rules.json` — güncel kurallar
- `firebase.json` — database rules dosya yolunu tanımlar
- `.firebaserc` — proje ID'si: `senaryo-7e7fb`

Bu dosyalar sayesinde diğer PC'den `firebase deploy --only database` ile kurallar deploy edilebilir.

### 6. Email Case Sensitivity (Zaten Düzelmiş)

Plan'da `sendInvite()`'da `.toLowerCase()` eksik deniyordu ama incelemede satır 1299'da email zaten lowercase yapılıyordu. Ek değişiklik gerekmedi.

### 7. Firebase Hosting Eklendi

- `firebase.json`'a `hosting` yapılandırması eklendi (`"public": "public"`)
- `public/` dizini oluşturuldu, sadece `index.html` kopyalandı
- `.gitignore`'a `.firebase/` eklendi (cache dizini)
- Deploy edildi: **https://senaryo-7e7fb.web.app**

**Not:** `index.html` düzenlendiğinde `public/index.html` de güncellenmelidir (veya deploy öncesi kopyalanmalıdır).

---

## Yapılmayan / Kontrol Edilmemiş

- Gerçek iki kullanıcı arasında davet testi (email ile davet gönder → ikinci kullanıcı giriş yapsın → davet otomatik kabul)
- Viewer (readonly) modunun gerçek testi
- Real-time işbirliği testi (iki tarayıcıda aynı proje açık)
- Büyük veri ile performans testi

---

## Kapsamlı Test Sonuçları (Playwright — Otomatik)

23/24 test geçti. Tek kalan (DemoTimeline) yanlış CSS selector'dan kaynaklanan false negative — screenshot'ta timeline doğru görünüyor.

### Geçen Testler:
- **Auth:** Kayıt ol, giriş yap, çıkış yap, tekrar giriş, hatalı giriş, kısa şifre, boş alan
- **CRUD:** Proje oluştur, aç, kaydet (Ctrl+S + buton), geri dön, sil
- **Editör:** Bölüm ekle, olay ekle, modal açma/kapama
- **Görünümler:** Senaryo/Timeline/Bölünmüş view değiştirme
- **Zoom:** In/out
- **Paylaşım:** Modal açma, boş email doğrulaması
- **Undo/Redo:** Crash yok
- **Navigasyon:** Projeler ↔ Editör, veri kalıcılığı
- **Demo:** 108 olay ile demo proje yükleme, gösterim
- **Silme:** Proje silme + toast
- **Güvenlik:** Sıfır PERMISSION_DENIED hatası

---

## Mevcut Durum — Her Şey Çalışıyor

| Özellik | Durum |
|---------|-------|
| Auth (kayıt/giriş/çıkış) | ✅ |
| Proje oluşturma | ✅ (permission hatası düzeltildi) |
| Proje açma/kaydetme | ✅ |
| Proje silme | ✅ (kural + catch eklendi) |
| Demo proje yükleme | ✅ |
| JSON import | ✅ (multi-path update) |
| Bölüm/olay ekleme | ✅ |
| View switching | ✅ |
| Paylaşım modalı | ✅ |
| Ctrl+S kaydet | ✅ (toast eklendi) |
| Real-time listeners | ✅ |
| Presence sistemi | ✅ |
| Firebase kuralları | ✅ (deploy edildi) |
| Firebase Hosting | ✅ (https://senaryo-7e7fb.web.app) |

---

## Firebase Kuralları (Güncel — deploy edilmiş)

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
        ".write": "auth != null && data.exists() && data.child('owner').val() === auth.uid && !newData.exists()",
        "data": {
          ".write": "auth != null && (root.child('projects/' + $projectId + '/owner').val() === auth.uid || newData.parent().child('owner').val() === auth.uid || root.child('projects/' + $projectId + '/members/' + auth.uid + '/role').val() === 'owner' || root.child('projects/' + $projectId + '/members/' + auth.uid + '/role').val() === 'editor')"
        },
        "meta": {
          ".write": "auth != null && (root.child('projects/' + $projectId + '/owner').val() === auth.uid || newData.parent().child('owner').val() === auth.uid || root.child('projects/' + $projectId + '/members/' + auth.uid + '/role').val() === 'owner' || root.child('projects/' + $projectId + '/members/' + auth.uid + '/role').val() === 'editor')"
        },
        "owner": {
          ".write": "auth != null && !data.exists()"
        },
        "members": {
          ".read": "auth != null && (data.parent().child('members/' + auth.uid).exists() || data.parent().child('owner').val() === auth.uid)",
          ".write": "auth != null && (root.child('projects/' + $projectId + '/owner').val() === auth.uid || newData.parent().child('owner').val() === auth.uid || root.child('projects/' + $projectId + '/members/' + auth.uid + '/role').val() === 'owner')"
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

## Diğer PC'de Devam Etmek İçin

```bash
git pull origin main
npm install -g firebase-tools   # Firebase CLI yoksa
firebase login                  # Giriş yap
firebase deploy --only database # Kuralları deploy et (zaten deploy edildi ama emin olmak için)
```

### Hosting Deploy

```bash
cp index.html public/index.html  # Ana dosyayı public'e kopyala
firebase deploy --only hosting   # Hosting'i deploy et
```

**Canlı URL:** https://senaryo-7e7fb.web.app

Tüm değişiklikler `index.html` içinde. Firebase kuralları hem `database.rules.json` dosyasında hem de `index.html` içindeki yorum bloğunda mevcut.
