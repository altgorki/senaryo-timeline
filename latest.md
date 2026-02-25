# Senaryo Timeline — Flashback/Flashforward Yeniden Tasarım + Gantt Kronoloji

## Tarih: 2026-02-25

## Son Commitler

```
c8704ad  Gantt kronoloji: boş günleri kaldır, hücre ve barları büyüt
f72a5f3  Flashback/flashforward yeniden tasarım + Gantt kronoloji görünümü
```

Önceki commit: `9471d05` (Puppeteer test bağımlılığını kaldır)

---

## Bu Oturumda Yapılanlar

### 1. FB (Flashback) Bölümü Tamamen Kaldırıldı

Eski sistemde flashback olayları ayrı bir "FB" bölümünde yaşıyordu. Artık:
- FB bölümü yok — flashback olayları anlatıldıkları normal bölüme taşındı
- Flashback bir **kategori** olarak korunuyor (mor `#9c27b0`)
- Yeni **flashforward** kategorisi eklendi (cyan `#00bcd4`)

**Etkilenen dosyalar:** `store.js`, `projects.js`, `templates.js`, `app.js`

### 2. Veri Göçü — migrateV3

Eski projelerin otomatik dönüşümü için `io.js`'ye `_migrateV3()` fonksiyonu eklendi:
1. FB bölümünü bulup olaylarını ilk normal bölüme taşır
2. `birthYear` → `birthDate` (sayı → `"YYYY-01-01"` string)
3. `deathYear` → `deathDate` (aynı dönüşüm)
4. `storyYear` → `storyDate` (aynı dönüşüm)
5. Flashforward kategorisini ekler
6. `P.version = 3` set eder

Import/load sırasında versiyon kontrolü: `if(!P.version || P.version < 3) _migrateV3(P)`

### 3. Tarih Format Genişletme (Yıl → YYYY-MM-DD)

Tüm tarih alanları tam formata genişletildi:

| Alan | Eski | Yeni |
|------|------|------|
| `character.birthYear` | `1978` (number) | `character.birthDate` = `"1978-03-15"` (string) |
| `character.deathYear` | `2024` (number) | `character.deathDate` = `"2024-06-20"` (string) |
| `episode.storyYear` | `2024` (number) | `episode.storyDate` = `"2024-01-15"` (string) |
| `event.storyDate` | `"1974"` (yıl string) | `event.storyDate` = `"1974-06-15"` (tam tarih) |

**Proje Ayarları'nda** tüm inputlar `type="date"` olarak güncellendi (panels.js).

### 4. FB Referansları Temizlendi (~8 dosya)

`ep.number === 'fb'` special case'leri kaldırıldı:
- `timeline.js` — Episode header
- `screenplay.js` — Episode label
- `screenplay-editor.js` — Episode divider
- `export.js` — Options dropdown + block header (2 yer)
- `analysis.js` — Gaps check skip, chronology warnings
- `panels.js` — Settings modal inputları
- `utils.js` — `epLbl()` FB special case

### 5. Kronoloji Uyarıları Tarih Bazlı

`analysis.js`'deki tüm kronoloji uyarıları tarih karşılaştırmasına geçirildi:
- `_getEventYear()` → `_getEventDate()` — YYYY-MM-DD string döndürür
- `chronoAge`: karakter ölüm **tarihinden** sonra olay
- `chronoNegAge`: karakter doğum **tarihinden** önce olay
- `chronoOrder`: bölüm `storyDate` sırası vs `order` sırası
- `chronoFlashback`: olayın tarihi bölüm tarihinden küçükse ve **flashback/flashforward** değilse

### 6. Gantt Chart Kronoloji (chronology.js — Tam Yeniden Yazım)

Eski karakter×yıl matris tablosu yerine Gantt chart:

**Yapı:**
- Satırlar = bölümler (sol kenar sticky)
- Sütunlar = tarih ekseni (sadece olay olan tarihler gösteriliyor)
- Barlar = olaylar (kategori renginde)

**Özellikler:**
- **Zoom:** Yıl / Ay / Gün (varsayılan: Gün)
- **Filtreler:** Karakter dropdown + Kategori dropdown
- **Boş periyotlar atlanıyor** — sadece olay olan yıl/ay/gün gösteriliyor
- **Flashback barlar:** mor arka plan + kesikli kenarlık
- **Flashforward barlar:** cyan arka plan + kesikli kenarlık
- **Uyarı ikonu:** bar üzerinde ⚠ gösteriliyor
- **Bar tıklama:** sağ panelde olay düzenleme açılır
- **Hover tooltip:** olay adı + tarih

**Boyutlar (gün modu):**
- Hücre genişliği: 200px (tam tarih okunabilir)
- Bar yüksekliği: 28px, font: 12px
- Tam başlık gösteriliyor (truncation yok)
- Label genişliği: 200px

### 7. Gantt Drag & Drop

- **Yatay sürükleme:** olay tarihini değiştirir (`ev.storyDate` güncellenir)
- **Dikey sürükleme:** olayı başka bölüme taşır (`ev.episodeId` güncellenir)
- Drop hedef bölüm satırı highlight edilir
- `Store.snapshot()` + `markDirty()` + `emit('change')` ile tüm view'lar senkron

### 8. Cross-View Senkronizasyon

Mevcut `Store.on('change')` mekanizması Gantt değişikliklerini otomatik yayar:
- Gantt'ta drag → Timeline/Senaryo/Kartlar güncellenir
- Timeline'da değişiklik → Gantt güncellenir
- Panel'de olay düzenle → tüm view'lar güncellenir

### 9. CSS Stilleri

- `.kronoloji-*` stilleri → `.gantt-*` olarak yeniden yazıldı
- `.gantt-toolbar`, `.gantt-zoom-btn`, `.gantt-filter-btn`
- `.gantt-container`, `.gantt-header`, `.gantt-rows`, `.gantt-row`, `.gantt-bar`
- `.gantt-scroll-body` — scroll düzeltmesi (inline-block + min-width)
- Flashback/flashforward göstergeleri diğer view'lar için de eklendi

### 10. Demo Proje Güncellendi (app.js)

- FB bölümü kaldırıldı, 10 normal bölüm
- 6 FB olayı (e103-e108) normal bölümlere dağıtıldı (`category:'flashback'`)
- e1 ("Flashforward: İzbe Bina") → `category:'flashforward'`
- Tüm `storyYear` → `storyDate` (YYYY-MM-DD)
- Tüm `birthYear`/`deathYear` → `birthDate`/`deathDate` (YYYY-MM-DD)
- Kategorilere `flashforward` eklendi, `flashback` rengi güncellendi

### 11. Test Güncelleme

- `epLbl('fb')` testi güncellendi (artık `'Bfb'` döndürür, `'FB'` değil)
- 92/92 test geçiyor

---

## Dosya Değişiklik Özeti

| Dosya | Değişiklik |
|-------|-----------|
| `src/js/store.js` | flashforward kategori + flashback renk güncelleme |
| `src/js/projects.js` | Default kategorilere flashforward ekleme |
| `src/js/templates.js` | Tüm şablon kategorilerini güncelleme |
| `src/js/utils.js` | epLbl fb kaldırma + formatDate/parseDate/calcAge/yearFromDate |
| `src/js/io.js` | _migrateV3 + import/migration güncelleme |
| `src/js/app.js` | Demo veri: FB kaldırma, tarih dönüşüm, flashforward |
| `src/js/chronology.js` | Tam yeniden yazım: Gantt chart + drag & drop |
| `src/js/analysis.js` | Tarih bazlı uyarılar, _getEventDate |
| `src/js/panels.js` | Date inputlar, birthDate/deathDate/storyDate |
| `src/js/timeline.js` | FB special case kaldırma |
| `src/js/screenplay.js` | FB special case kaldırma |
| `src/js/screenplay-editor.js` | FB special case kaldırma |
| `src/js/export.js` | FB special case kaldırma (2 yer) |
| `src/css/styles.css` | Gantt stilleri, scroll fix, fb/ff göstergeleri |
| `tests/utils.test.js` | epLbl testi güncelleme |
| `public/index.html` | Build output |

---

## Mevcut Durum

| Özellik | Durum |
|---------|-------|
| FB bölümü kaldırıldı | ✅ |
| Flashforward kategorisi | ✅ |
| Tarih formatı YYYY-MM-DD | ✅ |
| migrateV3 (eski proje göçü) | ✅ |
| Gantt kronoloji (gün detayı) | ✅ |
| Gantt drag & drop | ✅ |
| Boş günler/aylar/yıllar atlanıyor | ✅ |
| Cross-view senkronizasyon | ✅ |
| Kronoloji uyarıları (tarih bazlı) | ✅ |
| Tüm testler (92/92) | ✅ |
| Build başarılı | ✅ |
| Firebase deploy | ✅ |

**Canlı URL:** https://senaryo-7e7fb.web.app

---

## Diğer PC'de Devam Etmek İçin

```bash
git pull origin main
npm install          # Bağımlılıklar (vitest vb.)
npm test             # 92 test geçmeli
node scripts/build.js  # public/index.html oluşturur
firebase deploy      # Deploy et
```
