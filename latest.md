# Senaryo Timeline — Cross-View Tam Senkronizasyon

## Tarih: 2026-02-26

## Son Commitler

```
e0300bc  CLAUDE.md genId format düzelt, playwright bağımlılığı ekle
7197240  Cross-view senkronizasyon: event↔scene alanlarını tam eşitle
```

Önceki commit: `f81488d` (latest.md güncelle: Gantt kronoloji oturumu özeti)

---

## Bu Oturumda Yapılanlar

### Problem: Cross-View Senkronizasyon Eksikliği

Event ve Scene arasında çift yönlü alan senkronizasyonu eksikti. Her view farklı veri kaynağından okuyordu:

| View | Veri Kaynağı |
|------|-------------|
| Timeline + Kronoloji | `event.category`, `event.title`, `event.episodeId` |
| Senaryo + Kartlar | `scene.category`, `scene.title`, `scene.episodeId` |

Değişiklik yapılan yerlerde bu iki alan her zaman senkronize edilmiyordu. Örneğin Timeline'da kategori değiştirince Senaryo'da eski kategori görünüyordu.

### Fix 1: panels.js — saveEvent() Event→Scene Tam Senkronizasyon

**Dosya:** `src/js/panels.js`, satır 108-110

Eskiden sadece `sc.screenplay` güncelleniyordu. Artık tüm ortak alanlar senkronize:

```javascript
if(ev.sceneId) {
  const sc = S.getScene(ev.sceneId);
  if(sc) {
    sc.screenplay = screenplay;
    sc.title = ev.title;
    sc.category = ev.category;
    sc.episodeId = ev.episodeId;
    sc.characters = ev.characters.slice();
  }
}
```

### Fix 2: screenplay-editor.js — saveSceneMeta() Title Senkronizasyonu

**Dosya:** `src/js/screenplay-editor.js`, satır 677-684

Eskiden sadece `category` event'e senkronize ediliyordu. Artık `title` da:

```javascript
if (field === 'category' || field === 'title') {
  const P = S.get();
  P.events.filter(e => e.sceneId === sceneId).forEach(e => { e[field] = value; });
  S.markDirty(['scenes','events']);
} else {
  S.markDirty('scenes');
}
```

### Fix 3: chronology.js — Gantt Drag Scene EpisodeId Senkronizasyonu

**Dosya:** `src/js/chronology.js`, satır 504-507

Eskiden Gantt'ta bölüm değişikliği sadece event'e yazılıyordu. Artık bağlı sahne de güncellenir:

```javascript
if(newEpId !== ev.episodeId) {
  ev.episodeId = newEpId;
  if(ev.sceneId) {
    var sc = S.getScene(ev.sceneId);
    if(sc) sc.episodeId = newEpId;
  }
  S.markDirty(['events','scenes']);
} else {
  S.markDirty('events');
}
```

### Test Sonuçları — Playwright 21/21 PASS

Canlı sitede (https://senaryo-7e7fb.web.app) otomatik test:

| Test | Senaryo | Assertions | Sonuç |
|------|---------|-----------|-------|
| Test 1 | Timeline'da kategori değiştir → Senaryo, Kartlar kontrol | 6 | PASS |
| Test 2 | Timeline'da başlık değiştir → Senaryo, Kartlar kontrol | 6 | PASS |
| Test 3 | Senaryo editöründe başlık değiştir → Timeline, Kartlar kontrol | 5 | PASS |
| Test 4 | Kronoloji'de sürükle (bölüm değiştir) → Kartlar, Senaryo kontrol | 4 | PASS |
| **Toplam** | | **21** | **21/21 PASS** |

Unit testler: **92/92 PASS** (vitest)

---

## Dosya Değişiklik Özeti

| Dosya | Değişiklik |
|-------|-----------|
| `src/js/panels.js` | saveEvent: title, category, episodeId, characters → scene sync |
| `src/js/screenplay-editor.js` | saveSceneMeta: title değişikliği → event sync |
| `src/js/chronology.js` | Gantt drag: episodeId → bağlı scene sync |
| `CLAUDE.md` | genId format dokümantasyonu düzeltme |
| `package.json` | playwright bağımlılığı ekleme |
| `public/index.html` | Build output |

---

## Cross-View Sync Kuralı

Gelecekte yeni alan eklendiğinde bu kural uygulanmalı:

| Değişiklik Noktası | Dosya | Yön |
|---------------------|-------|-----|
| Timeline edit paneli | `panels.js` saveEvent() | Event → Scene |
| Senaryo editör header | `screenplay-editor.js` saveSceneMeta() | Scene → Event |
| Gantt drag & drop | `chronology.js` | Event → Scene |

**Ortak alanlar:** `title`, `category`, `episodeId`, `characters`

---

## Mevcut Durum

| Özellik | Durum |
|---------|-------|
| Event→Scene sync (panels.js) | ✅ |
| Scene→Event sync (screenplay-editor.js) | ✅ |
| Gantt drag sync (chronology.js) | ✅ |
| Playwright testler (21/21) | ✅ |
| Unit testler (92/92) | ✅ |
| Build başarılı | ✅ |
| Firebase deploy | ✅ |

**Canlı URL:** https://senaryo-7e7fb.web.app

---

## Diğer PC'de Devam Etmek İçin

```bash
git pull origin main
npm install          # Bağımlılıklar (vitest, playwright vb.)
npm test             # 92 test geçmeli
node scripts/build.js  # public/index.html oluşturur
firebase deploy      # Deploy et
```
