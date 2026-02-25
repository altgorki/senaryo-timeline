# Senaryo Timeline — Cross-View Sync + Persistence Fix

## Tarih: 2026-02-26

## Son Commitler

```
540b21b  interaction.js: drag sonrası markDirty + emit eksikliğini gider
dbc330c  screenplay.js: event sync + markDirty eksikliklerini gider
cca087f  latest.md güncelle: cross-view senkronizasyon oturumu özeti
e0300bc  CLAUDE.md genId format düzelt, playwright bağımlılığı ekle
7197240  Cross-view senkronizasyon: event↔scene alanlarını tam eşitle
```

Önceki commit: `f81488d` (latest.md güncelle: Gantt kronoloji oturumu özeti)

---

## Bu Oturumda Yapılanlar

### Problem 1: Cross-View Senkronizasyon Eksikliği

Event ve Scene arasında çift yönlü alan senkronizasyonu eksikti. Her view farklı veri kaynağından okuyordu:

| View | Veri Kaynağı |
|------|-------------|
| Timeline + Kronoloji | `event.category`, `event.title`, `event.episodeId` |
| Senaryo + Kartlar | `scene.category`, `scene.title`, `scene.episodeId` |

Değişiklik yapılan yerlerde bu iki alan her zaman senkronize edilmiyordu.

### Problem 2: Persistence (markDirty) Eksikliği

Bazı fonksiyonlarda `S.markDirty()` çağrılmıyordu. `S.snapshot()` sadece undo için çalışır, Firebase'e yazma `markDirty → emit('change') → AutoSave.save()` zinciriyle olur. `App.refresh()` ise sadece render yapar, AutoSave tetiklemez.

---

## Fix 1: panels.js — saveEvent() Event→Scene Tam Sync

**Dosya:** `src/js/panels.js` | **Commit:** `7197240`

Eskiden sadece `sc.screenplay` güncelleniyordu. Artık tüm ortak alanlar:

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

## Fix 2: screenplay-editor.js — saveSceneMeta() Title Sync

**Dosya:** `src/js/screenplay-editor.js` | **Commit:** `7197240`

Eskiden sadece `category` event'e senkronize ediliyordu. Artık `title` da:

```javascript
if (field === 'category' || field === 'title') {
  const P = S.get();
  P.events.filter(e => e.sceneId === sceneId).forEach(e => { e[field] = value; });
  S.markDirty(['scenes','events']);
}
```

## Fix 3: chronology.js — Gantt Drag Scene EpisodeId Sync

**Dosya:** `src/js/chronology.js` | **Commit:** `7197240`

Gantt'ta bölüm değişikliği artık bağlı sahneyi de güncelliyor:

```javascript
if(newEpId !== ev.episodeId) {
  ev.episodeId = newEpId;
  if(ev.sceneId) {
    var sc = S.getScene(ev.sceneId);
    if(sc) sc.episodeId = newEpId;
  }
  S.markDirty(['events','scenes']);
}
```

## Fix 4: screenplay.js — Event Sync + markDirty (5 fonksiyon)

**Dosya:** `src/js/screenplay.js` | **Commit:** `dbc330c`

| Fonksiyon | Düzeltme |
|-----------|----------|
| `saveBlockChar` | Event characters sync eklendi + `markDirty` |
| `saveSceneMeta` | `markDirty(['scenes','events'])` eklendi |
| `saveBlock` | `markDirty(['scenes','events'])` eklendi |
| `saveScreenplay` | `markDirty(['scenes','events'])` eklendi |
| `insertMention` | `markDirty(['scenes','events'])` eklendi |

## Fix 5: interaction.js — Drag Persistence

**Dosya:** `src/js/interaction.js` | **Commit:** `540b21b`

Drag sonrası `App.refresh()` sadece render yapıyordu, AutoSave tetiklenmiyordu:

```javascript
// Eski (persistence yok):
if(didMove) { App.refresh(); }

// Yeni (markDirty + emit → AutoSave tetiklenir):
if(didMove) {
  S.markDirty(['events','scenes']);
  S.emit('change', {type:'drag', targetId: ev.id, targetName: ev.title});
}
```

---

## Tüm Modüller Audit Sonucu

| Modül | Sync | markDirty | Durum |
|-------|:----:|:---------:|-------|
| `panels.js` | ✅ | ✅ | Düzeltildi (7197240) |
| `screenplay-editor.js` | ✅ | ✅ | Düzeltildi (7197240) |
| `chronology.js` | ✅ | ✅ | Düzeltildi (7197240) |
| `corkboard.js` | ✅ | ✅ | Temiz (zaten doğruydu) |
| `screenplay.js` | ✅ | ✅ | Düzeltildi (dbc330c) |
| `interaction.js` | ✅ | ✅ | Düzeltildi (540b21b) |
| `timeline.js` | — | — | Salt okunur |
| `ai.js` | — | ✅ | Temiz |
| `store.js` | — | ✅ | Düşük seviye helper'lar |

---

## Test Sonuçları

### Playwright 21/21 PASS (cross-view sync)

| Test | Senaryo | Assertions | Sonuç |
|------|---------|-----------|-------|
| Test 1 | Timeline'da kategori değiştir → Senaryo, Kartlar | 6 | PASS |
| Test 2 | Timeline'da başlık değiştir → Senaryo, Kartlar | 6 | PASS |
| Test 3 | Senaryo editöründe başlık değiştir → Timeline, Kartlar | 5 | PASS |
| Test 4 | Kronoloji'de sürükle (bölüm değiştir) → Kartlar, Senaryo | 4 | PASS |

### Unit testler: 92/92 PASS (vitest)

---

## Cross-View Sync Kuralı

Gelecekte yeni alan eklendiğinde bu kural uygulanmalı:

| Değişiklik Noktası | Dosya | Yön |
|---------------------|-------|-----|
| Timeline edit paneli | `panels.js` saveEvent() | Event → Scene |
| Senaryo editör header | `screenplay-editor.js` saveSceneMeta() | Scene → Event |
| Senaryo panel | `screenplay.js` saveSceneMeta() | Scene → Event |
| Gantt drag & drop | `chronology.js` | Event → Scene |
| Kartlar drag & drop | `corkboard.js` | Scene → Event |
| Timeline drag & drop | `interaction.js` | Event (+ Scene episodeId) |

**Ortak alanlar:** `title`, `category`, `episodeId`, `characters`

## Persistence Kuralı

Veri değiştiren HER fonksiyon mutlaka çağırmalı:
1. `S.snapshot()` — undo desteği
2. `S.markDirty([...])` — hangi koleksiyonlar değişti
3. `S.emit('change', {...})` — render + AutoSave tetikler

`App.refresh()` sadece render yapar, AutoSave tetiklemez!

---

## Mevcut Durum

| Özellik | Durum |
|---------|-------|
| Event→Scene sync (panels.js) | ✅ |
| Scene→Event sync (screenplay-editor.js) | ✅ |
| Scene→Event sync (screenplay.js) | ✅ |
| Gantt drag sync (chronology.js) | ✅ |
| Kartlar drag sync (corkboard.js) | ✅ |
| Timeline drag persistence (interaction.js) | ✅ |
| markDirty tüm modüllerde | ✅ |
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
