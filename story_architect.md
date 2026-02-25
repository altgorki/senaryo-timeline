# Story Architect (STARC) v0.8.0 - Kapsamli Inceleme ve Ozellik Dokumani

## Genel Bilgiler

| Bilgi | Deger |
|-------|-------|
| **Uygulama Adi** | Story Architect (STARC) |
| **Versiyon** | 0.8.0 (9 Aralik 2025) |
| **Gelistirici** | Story Apps (KIT Scenarist yapimcilari) |
| **Lisans** | Open Core (acik kaynak cekirdek + ticari moduller) |
| **Kaynak Kod** | [github.com/story-apps/starc](https://github.com/story-apps/starc) |
| **Resmi Site** | [starc.app](https://starc.app/) |
| **Slogan** | "Reinventing the screenwriting software" |
| **Framework** | Qt 6 (C++) |
| **Dosya Formati** | `.starc` (SQLite veritabani tabanli) |
| **Veritabani** | SQLite 3 |
| **Mimari** | x64, moduler plugin sistemi (65+ eklenti) |

---

## Platform Destegi

| Platform | Dagitim Yontemi |
|----------|----------------|
| **Windows** | Installer, Microsoft Store |
| **macOS** | Disk image (.dmg) |
| **Linux** | AppImage, Flathub |
| **iOS / iPadOS** | Apple App Store |
| **Android** | Google Play Store |

**Minimum Windows Gereksinimi:** Windows 10 Build 19043 (21H2)

---

## Desteklenen 5 Hikaye Turu

Tek bir projede birden fazla tur bir arada kullanilabilir ve hepsi ortak karakter/mekan/dunya veritabanini paylasir.

| # | Tur | Aciklama |
|---|-----|----------|
| 1 | **Senaryo (Screenplay)** | Film/TV senaryosu, endustri standardi formatlama (sahne basliklari, aksiyon, karakter ipuclari, diyalog, parantez ici, gecisler, cift diyalog) |
| 2 | **Roman (Novel)** | Bolum/sahne hiyerarsili uzun duzyazi, odak modu destegi |
| 3 | **Sahne Oyunu (Stageplay)** | Tiyatro oyunu yazimi, perde/sahne yapisi |
| 4 | **Cizgi Roman (Comic Book)** | Panel bazli cizgi roman/grafik roman senaryosu |
| 5 | **Sesli Oyun (Audio Drama)** | Radyo oyunu, podcast produksiyonu, ses efekti ve muzik isaretleri |

Her tur icin proje sunlari icerebilir:
- Baslik sayfasi
- Sinopsis
- Tretman (outline)
- Ana metin
- Zihin haritalari
- Gorseller
- Metin belgeleri (notlar, arastirma)

---

## Sablon Sistemi (28 XML Sablon)

### Senaryo Sablonlari (8 adet)

| Sablon ID | Format | Aciklama |
|-----------|--------|----------|
| `us` | Letter | ABD standart (varsayilan) - Courier Prime, 1 sayfa ~ 1 dakika |
| `ar` | A4 | Arapca (RTL - Sagdan sola) |
| `he` | A4 | Ibranice (RTL) |
| `ru` | A4 | Rusca |
| `tamil` | A4 | Tamil |
| `telugu` | A4 | Telugu |
| `world_cn` | A4 | Cince (Modern) |
| `world_cp` | A4 | Cince Noktalama (Hongkong/Tayvan) |

**Senaryo Blok Tipleri (17 adet):**
- `scene_heading` - Sahne konumu (orn: "IC. KAHVE DUKKANI - SABAH")
- `action` - Sahne yonergesi/aciklama
- `character` - Karakter adi (diyalog oncesi)
- `dialogue` - Karakter konusmasi
- `parenthetical` - Diyalog icinde karakter eylemi (orn: "(duraksayarak)")
- `transition` - Sahne gecisi (orn: "KESME:", "KARARTMA")
- `shot` - Kamera yonergesi (orn: "YAKIN PLAN:", "GENIS ACI")
- `lyrics` - Sarki sozleri
- `beat_heading` - Beat isaretleyicileri
- `act_heading` - Perde ayiricilari
- `act_footer` - Perde bitis isaretleri
- `sequence_heading` - Sekans isaretleri
- `sequence_footer` - Sekans bitis isaretleri
- `scene_characters` - Karakter listesi
- `inline_note` - Yorumlar/aciklamalar
- `unformatted_text` - Duz metin
- `page_splitter` - Manuel sayfa sonu

### Roman Sablonlari (7 adet)

| Sablon ID | Format | Aciklama |
|-----------|--------|----------|
| `modern_a4` | A4 | Modern (varsayilan) - Arial |
| `modern_letter` | Letter | Modern - Arial |
| `manuscript_t_a4` | A4 | Geleneksel el yazmasi - Times New Roman, cift aralik |
| `manuscript_t_letter` | Letter | Geleneksel el yazmasi |
| `manuscript_cn_a4` | A4 | Cince |
| `manuscript_cp_a4` | A4 | Cince noktalama |
| `manuscript_cp_letter` | Letter | Cince noktalama |

**Roman Blok Tipleri (10 adet):**
- `text` - Govde paragraf
- `chapter_heading` - Bolum basligi
- `chapter_footer` - Bolum sonu isareti
- `part_heading` - Kitap bolum/kisim basligi
- `part_footer` - Kisim sonu isareti
- `scene_heading` - Sahne ayirici (* * *)
- `beat_heading` - Beat isareti
- `unformatted_text` - Duz metin
- `inline_note` - Yorumlar
- `page_splitter` - Manuel sayfa sonu

### Sahne Oyunu Sablonlari (2 adet)

| Sablon ID | Format | Aciklama |
|-----------|--------|----------|
| `us` | Letter | ABD standart - Courier Prime |
| `bbc` | A4 | BBC standart - Arial, diyalog tablosu formati |

### Sesli Oyun Sablonlari (2 adet)

| Sablon ID | Format | Aciklama |
|-----------|--------|----------|
| `us` | Letter | ABD standart - Courier Prime, 1.5 satir araligi |
| `bbc_scene` | A4 | BBC sahne bazli |

**Sesli Oyun Blok Tipleri (9 adet):**
- `scene_heading` - Sahne konumu/numarasi
- `character` - Karakter adi
- `dialogue` - Karakter konusmasi
- `sound` - Ses efekti (SOUND:)
- `music` - Muzik ipucu (MUSIC:)
- `cue` - Ses ipucu (CUE:)
- `unformatted_text` - Duz metin
- `inline_note` - Notlar
- `page_splitter` - Sayfa sonu

### Cizgi Roman Sablonlari (4 adet)

| Sablon ID | Format | Aciklama |
|-----------|--------|----------|
| `us` | Letter | ABD standart |
| `script_us` | Letter | Script format |
| `world` | A4 | Dunya standart |
| `script_world` | A4 | Script format |

**Cizgi Roman Blok Tipleri (7 adet):**
- `page_heading` - Sayfa numarasi/basligi
- `panel_heading` - Panel aciklamasi
- `description` - Panel gorsel aciklamasi
- `character` - Konusan karakter
- `dialogue` - Karakter konusmasi
- `unformatted_text` - Duz metin
- `inline_note` - Notlar

### Metin/Genel Belge Sablonlari (5 adet)

| Sablon ID | Format | Aciklama |
|-----------|--------|----------|
| `sans_a4` | A4 | Sans-serif - Arial |
| `sans_letter` | Letter | Sans-serif - Arial |
| `mono_cp_a4` | A4 | Monospace - Courier Prime |
| `mono_cp_letter` | Letter | Monospace - Courier Prime |
| `mono_cn_a4` | A4 | Monospace Cince |

### Sablon Yapilandirma Nitelikleri

Her sablon su XML niteliklerini icerir:

| Nitelik | Degerler | Aciklama |
|---------|----------|----------|
| `id` | String | Sablon tanimlayicisi |
| `default` | true/false | Varsayilan sablon mu |
| `page_format` | Letter, A4 | Kagit boyutu |
| `page_margins` | mm degerleri | Kenar bosluklari (ust, sag, alt, sol) |
| `page_numbers_alignment` | top/bottom + left/right/hcenter | Sayfa numarasi konumu |
| `is_first_page_number_visible` | true/false | Ilk sayfada numara gosterimi |
| `left_half_of_page_width` | 0-100 (%) | Cift sutun duzenleri icin |
| `place_dialogues_in_table` | true/false | Diyaloglari tablo yapisinda formatla |

Her blok tanimi su niteliklere sahiptir:

| Nitelik | Tip | Aciklama |
|---------|-----|----------|
| `active` | Boolean | Blok tipi kullanilir mi |
| `starts_from_new_page` | Boolean | Blok oncesi sayfa sonu |
| `font_family` | String | Yazi tipi adi |
| `font_size` | Integer | Punto boyutu |
| `bold`, `italic`, `underline`, `uppercase` | Boolean | Bicim ozellikleri |
| `alignment` | left/right/hcenter | Yatay hizalama |
| `line_spacing` | single/oneandhalf/double | Satir araligi |
| `lines_before` / `lines_after` | Integer | Onceki/sonraki bos satirlar |
| `margins` | 4'lu (mm) | Kenar bosluklari |
| `first_line_margin` | Float | Ilk satir girintisi (romanlar icin) |

Tum sablonlar tamamen ozellestirilebilir ve kullanicilar kendi sablonlarini olusturabilir.

---

## Ice Aktarma (Import)

| Kaynak | Formatlar |
|--------|-----------|
| **Uygulama formatlari** | KIT Scenarist (.kitsp), Final Draft (.fdx), Celtx, Trelby |
| **Dokuman formatlari** | .docx, .odt, .pdf, .txt |
| **Senaryo metin formati** | .fountain |
| **Yerli format** | .starc |

**Ice aktarma yontemi:** Yeni proje olusturup kaynak dosya yolunu belirtin veya "Menu > Import" ile mevcut projeye belge ekleyin.

---

## Disa Aktarma (Export)

### Senaryo, Cizgi Roman, Sesli Oyun, Sahne Oyunu

| Format | Kullanim |
|--------|----------|
| **PDF** | Paylasim, filigran destegi, baslik sayfasi dahil edilebilir |
| **DOCX** | Duzenleme ve inceleme, yorum birakma |
| **FDX** | Final Draft uyumlulugu |
| **Fountain** | Duz metin senaryo formati, herhangi bir metin duzenleyicide acilir |

### Roman

| Format | Kullanim |
|--------|----------|
| **PDF** | Son dagitim |
| **DOCX** | Duzenleme ve inceleme |
| *(Planli)* | EPUB ve Markdown |

### Senaryo Dokumu (Breakdown)

| Format | Kullanim |
|--------|----------|
| **XLSX (Excel)** | Tum doküm elementleri (aksesuar, kostum, arac vb.) |

### Istatistikler

| Format | Kullanim |
|--------|----------|
| **PDF** | Istatistik raporlari |
| **XLSX (Excel)** | Tum proje istatistikleri |

### Disa Aktarma Ozellestirme Secenekleri
- Baslik sayfasi, sinopsis, senaryo metni veya tretman dahil/haric secimi
- Ozel filigran - renk secimi ile (metnin altinda alt katmanda)
- Karakter profili disa aktarma (PDF veya DOCX)
- Karakter/mekan iliski haritasi gorselleri dekoratif cerceveli kaydedilebilir

---

## Yapay Zeka (AI) Ozellikleri

Kredi bazli sistem: 1 kredi = 1.000 kelime metin veya 10 AI gorseli

### Metin Isleme Araclari

| Arac | Islev |
|------|-------|
| **Baska kelimelerle yaz (Paraphrase)** | Secili metni yeniden yazar |
| **Genislet (Expand)** | Metni detaylandirir ve uzatir |
| **Kisalt (Shorten)** | Metni yogunlastirir |
| **Araya ekle (Insert)** | Iki paragraf arasina yeni metin uretir |
| **Ozetle (Summarize)** | Secili metnin ozetini cikarir |
| **Uret (Generate)** | Sifirdan metin olusturur |

### Belge Duzeyinde AI Islemleri

| Islem | Aciklama |
|-------|----------|
| **Tam belge cevirisi** | Formati koruyarak herhangi bir dile ceviri (senaryo, oyun, roman) |
| **Senaryo sinopsisi olustur** | Otomatik sinopsis uretimi |
| **Senaryodan roman olustur** | AI tum senaryoyu analiz edip roman formatina donusturur |
| **Romandan senaryo olustur** | Duz yaziyi senaryo formatina cevirir |

### Karakter Editorunde AI

| Arac | Islev |
|------|-------|
| **Karakter profili verisi uret** | Biyografi, kisilik ozellikleri, gecmis otomatik doldurma |
| **Karakter fotograflari uret** | AI ile portre gorseli olusturma |

### Zihin Haritasi Editorunde AI

| Arac | Islev |
|------|-------|
| **Zihin haritasi uret** | Sifirdan harita yapisi olusturma |
| **Dugum genislet** | Mevcut dugumlere dallanma fikirleri ekleme |

### AI Kredi Tahsisi

| Abonelik | Dahil Kredi |
|----------|-------------|
| PRO 1 aylik | 5 kredi |
| PRO yillik | 60 kredi |
| PRO omur boyu | 120 kredi |
| CLOUD 1 aylik | 10 kredi |
| CLOUD yillik | 120 kredi |

### Ek Kredi Satin Alma
- 50 kredi = $10
- 200 kredi = $30

### AI Kontrolu
v0.8.0'dan itibaren AI asistani baslangic ayarlarinda veya uygulama ayarlarinda **tamamen devre disi birakilabilir**.

---

## Isbirligi (Collaboration) Ozellikleri

### Gercek Zamanli Ortak Yazarlik (CLOUD / TEAM)
- Ayni proje uzerinde **es zamanli calisma**
- Degisiklikler cevrimici oldugunuzda **aninda senkronize** edilir
- **Cevrimdisi destek:** Internet geldiginde tum degisiklikler otomatik gonderilir
- **5 GB bulut depolama** hesap basina
- **Sinirsiz** bulut projesi
- **Sinirsiz** ortak yazar sayisi

### Erisim Kontrolu ve Izinler
- E-posta ile ortak yazar davet etme
- Yazar basina **rol ve izin** ayarlama
- **Tum projeye** veya **belirli belgelere/bolumlere** erisim paylasimi
- **Erisim seviyesi** yapilandirma (salt okunur, duzenleme vb.)
- Ortak yazarlar istenildiginde kaldirilabilir veya rolleri degistirilebilir
- Ucretsiz katman ortak yazarlari senaryo metni ve temel modullerle calisabilir; PRO modulleri goruntuleyebilir ancak duzenleyemez

### Inceleme Modu (Review Mode)
- Secili metni **renk kodlama** (harf simgesi)
- Secili bolumlerin **arka planini vurgulama** (dolgu simgesi)
- **Satir ici yorumlar** birakma (diyalog simgesi)

### Degisiklik Takibi (Track Changes)
- Tum **eklemeler** kullanici belirli renkte isaretlenir
- Tum **silmeler** **kirmizi** renkte isaretlenir
- Degisiklikler sag panelde tek tek **uygulanabilir veya geri alinabilir**

### Eklemeler Takip Modu
- Eklenen tum metin otomatik olarak belirtilen renkle vurgulanir
- Herhangi bir metin manuel olarak ekleme olarak isaretlenebilir

### Revizyonlar Modu
- Eklenen tum metin revizyon rengiyle isaretlenir
- Duzenlenen her satirin **kenarinda yildiz isaretleri** gosterilir
- Metin manuel olarak revizyon olarak isaretlenebilir

---

## Gorsellesirme ve Planlama Araclari

### 4 Senkronize Gorunum

Tum gorunumler birbirine bagli - birinde yapilan degisiklik digerlerinde aninda yansir:

1. **Metin Editoru** - Standart senaryo/duzyazi gorunumu
2. **Kartlar / Mantar Pano (Corkboard)** - Gorsel yapi gorunumu
3. **Zaman Cizelgesi (Timeline)** - Kronolojik hikaye gorunumu
4. **Senaryo Dokumu (Breakdown)** - Produksiyon elementleri gorunumu

### Kartlar / Mantar Pano (PRO+)
- Tum senaryonun **kus bakisi gorunumu**
- Sahneleri, sekanslari ve perdeleri **surukle-birak** ile yeniden duzenleme
- Kartlari **sira halinde veya sutunlarda** yerlestirme (her perde yeni bir sutun)
- Sag panelde sahne/sekans/perde parametreleri duzenleme (alternatif baslik, renk, etiketler, hikaye gunu)
- Kart gorunumunu ozellestirme: boyut, en-boy orani, aralik, satir basina sayi
- **Metin filtresi** - Tam metin, baslik veya etiketlere gore kart arama
- **Renk etiketleri** ile gorsel organizasyon
- Kartlara not ekleme
- Perdeye gore gruplama ve duzenleme

### Zaman Cizelgesi (Timeline) (PRO+)
- Anlatim yapisinin **gorsel zaman cizelgesi**
- Belge gorunum menusunden (metin, kartlar, doküm gorunumleri yaninda) erisilebilir
- Tum diger gorunumlerle senkronize

### Zihin Haritalari (Mind Maps) (PRO+)
- **Dusunce cikarma ve yapilandirma** icin ozel zihin haritasi modulu
- **Dugum, baglanti ve grup** ekleme
- Dugum parametreleri duzenleme
- **Geri al/yinele** destegi
- Icerik uretme ve genisletme icin **AI entegrasyonu**

### Beat Haritalama
- **Beat'ler** en kucuk yapisal birimdir: bir olay veya eylemin gerceklestigi an
- Her beat ozellestirilebilir: alternatif sahne basligi, renk, etiketler, hikaye gunu
- Hikaye yapisini gelistirmek ve rafine etmek icin beat'ler yeniden duzenlenebilir
- Senaryo/roman metin editorunde kullanilabilir

---

## Karakter, Mekan ve Dunya Insasi

### Karakter Yonetimi
- **Temel profiller** (UCRETSIZ): Isim ve temel bilgilerle karakter olusturma
- **Detayli profiller** (PRO+): Biyografi, kisilik, gecmis, motivasyonlar; gercek isim ve karakter adi
- **Karakter iliski haritasi** (PRO+): Karakterler arasi baglantilarin gorsel diyagrami; karakterler rollere gore boyutlandirilmis avatarlar olarak goruntulenir (birincil, ikincil, ucuncul); her karakterin bakis acisindan iliski aciklamalari; serbest konum duzenleme
- **AI karakter fotograflari** (PRO+): Karakter editorunde dogrudan portre gorseli olusturma
- **AI karakter profili verisi** (PRO+): Biyografik ve kisilik bilgileri otomatik doldurma
- **Karakter profili disa aktarma**: PDF veya DOCX olarak bireysel karakter profilleri

**Karakter Veri Yapisi:**
```
Karakter
  - Isim
  - Yas
  - Cinsiyet
  - Fiziksel aciklama
  - Rol (Ana/Destek/Figüran)
  - Biyografi
  - Hedefler/Motivasyonlar
  - Catismalar (ic/dis)
  - Iliskiler (diger karakterlerle)
  - Renk kodu (gorsel etiketleme)
  - Ozel meta veriler
```

### Mekan Yonetimi
- Sanal tuval uzerinde **mekan kartlari**
- **Mekan haritasi** (PRO+): Mekanlar arasi rota olusturma, gorsel gruplama
- **Detayli mekan profilleri** (PRO+): Aciklamalar ve nitelikler

**Mekan Veri Yapisi:**
```
Mekan
  - Isim
  - Tip (Ic mekan / Dis mekan / Karisik)
  - Fiziksel aciklama
  - Atmosfer (Ruh hali/hissi)
  - Harita (Mekansal duzen)
  - Iliskiler (bagli mekanlar)
  - Renk kodu
```

### Dunya Insasi
- **Dunyalar** (PRO+): Detayli yapiya sahip dunyalar olusturma ve tanimlama
- **Dunya haritasi** (PRO+): Hikayenizin dunyasinin gorsel haritasini cizme
- Ihtiyac kadar dunya olusturma
- Mekanlari dunyalara baglama

**Dunya Veri Yapisi:**
```
Dunya
  - Isim
  - Aciklama / Genel bakis
  - Zaman dilimi / Donem
  - Cografya
  - Kultur
  - Teknoloji seviyesi
  - Kurallar / Yasalar
  - Tarih
```

### Gorsel Galeri (PRO+)
- Referans gorselleri, konsept sanat ve gorsel materyalleri proje icinde saklama
- Gorseller disa aktarma icin dekoratif cerceveli kaydedilebilir

---

## Dizi / Episodik Proje Yonetimi (v0.8.0+)

**Showrunner Araclari:**
- Yeni senaryo belgesi olusturulurken **bolumlere ayir** secenegi ve bolum sayisi belirtme
- Program coklu bolum projesi icin **otomatik belge seti** olusturur
- Ozel panelde **dizinin temel parametreleri** ayarlama
- Tum bolumler **ozel bir klasorde** saklanir
- Secip surukleme ile senaryolari **sezona gore gruplama**
- Tum bolumler projenin karakter, mekan ve dunya bilgi bankasini paylasir

---

## Senaryo Dokumu (Script Breakdown) - TEAM Katmani

Doküm modulu klasik produksiyon araclari saglar:

| Element Kategorisi | Ornekler |
|-------------------|----------|
| **Aksesuarlar (Props)** | Sahnelerdeki nesneler |
| **Araclar (Vehicles)** | Otomobil, kamyon, ucak vb. |
| **Figuranlar (Extras)** | Kalabalik ve arka plan oyunculari |
| **Makyaj (Makeup)** | Makyaj ve protez gereksinimleri |
| **Kostum (Wardrobe)** | Giysi ve kostum parcalari |
| **Hayvanlar (Animals)** | Hayvan oyuncular |
| **Diger elementler** | Ek produksiyon elementleri |

- Doküm elementleriyle doldurulduktan sonra tum bilgiler **Excel (.xlsx)** olarak disa aktarilabilir
- Sahne tarih takibi: herhangi bir sahne icin sag kenar cubugunda "Etkinlik baslangic tarihi" alani
- Senaryo dokumu CLOUD aboneligine sahip ortak yazarlar icin kullanilabilir

---

## Istatistikler ve Raporlar

### Temel Istatistikler (UCRETSIZ)
- Yazma oturumu istatistikleri: oturum basina yazilan kelimeler, harcanan sure
- Tum cihazlarda verimlilik takibi (minimum, ortalama, maksimum)
- Toplam sayfa sayisi, kelime sayisi, karakter sayisi

### Genisletilmis Istatistikler (PRO+)

| Rapor | Detaylar |
|-------|----------|
| **Metin istatistikleri** | Aciklamalar, diyaloglar ve diger metin parcalarinin orani |
| **Sahne istatistikleri** | Ortam analizi (gunduz, gece, diger zaman dilimleri) |
| **Sahne raporu** | Sahne basina karakterler, toplam sure, ilk gorus isaretleri (mavi daire) |
| **Mekan istatistikleri** | Ic mekan / dis mekan sahne orani |
| **Karakter istatistikleri** | 10'dan fazla/az satiri olan karakterler; diyalog dagilimi |
| **Cinsiyet analizi** | Endustri standardi cinsiyet temsil raporu |
| **Sesli oyun istatistikleri** | Sesli produksiyon karakter, mekan ve sahne verileri icin ozel modul |

### Disa Aktarma
- Istatistik raporlari **PDF** veya **Excel (.xlsx)** olarak disa aktarilabilir

---

## Yazma Deneyimi ve Uretkenlik Araclari

| Ozellik | Aciklama |
|---------|----------|
| **Daktilo sesleri** | Yazarken otantik daktilo sesi efektleri |
| **Daktilo kaydirma** | Imlec calisma alaninin ortasinda sabit; sayfa altta kayar, baglam ust ve alt tarafta gorunur |
| **Tam ekran modu** | Herhangi bir editor icin dikkat dagitmayan mod (metin, senaryo, karakter iliskileri, zihin haritalari vb.) |
| **Odak modu** | Romanlar icin: yalnizca tek bir bolum/sahneye odaklanma |
| **Yazma sprinti zamanlayicisi** | Calisma alaninin ustunde ilerleme cubugu ile zamanli yazma oturumlari; sprint sonunda kelime sayisi goruntulenir |
| **Karanlik, Aydinlik ve Karma temalar** | Uc yerlesik GUI temasi + tamamen **ozel tema** olusturma olanagi |
| **Otomatik formatlama** | Tab ve Enter ile tum endustri standardi formatlama otomatik halledilir |
| **Yapi gezgini** | Belge yapisinin kolay gezinmesi ve yonetimi icin kenar cubugu |

---

## Fiyatlandirma Katmanlari

### UCRETSIZ (FREE)
- Kredi karti gerekmez
- **Sinirsiz** proje
- **Sinirsiz** proje basina belge
- Tum 5 hikaye turu icin cekirdek yazma editorleri
- Temel karakter ve mekan olusturma
- Tam ice/disa aktarma yetenekleri
- Disa aktarilan belgelerde **filigran yok**
- Inceleme modu ve yorumlar
- Yazma sprinti zamanlayicisi, daktilo sesleri/kaydirma, tam ekran modu
- Temel yazma istatistikleri

### PRO
UCRETSIZ'deki her sey, arti:
- Detayli aciklamali genisletilmis karakter profilleri
- Karakter iliski haritasi (gorsel diyagram)
- Mekan haritalari ve genisletilmis mekan profilleri
- Dunyalar ve dunya haritalari
- Gorsel galeri
- Kartlar / Mantar Pano gorunumu
- Zaman cizelgesi gorunumu
- Zihin haritalari modulu
- Genisletilmis istatistikler ve gorsel raporlar (cinsiyet analizi, sahne raporlari vb.)
- AI Asistan (dahil kredilerle: 5/ay, 60/yil, 120/omur boyu)
- Belge kutuphanesinde PDF sunumlari
- Beat haritalama araclari

**PRO Fiyatlandirma:**
- 1 aylik, 3 aylik, 6 aylik ve 1 yillik abonelik donemleri
- **$120 tek seferlik omur boyu lisans**

### CLOUD
PRO'daki her sey, arti:
- **5 GB bulut depolama**
- Tum cihazlarda proje senkronizasyonu
- Ortak yazarlarla **gercek zamanli isbirligi**
- Sinirsiz bulut projesi ve ortak yazar
- Daha yuksek AI kredi tahsisi (10 kredi/ay, 120/yil)
- Ortak yazarlar icin senaryo dokumu erisimi

**CLOUD Fiyatlandirma:**
- 1 aylik, 3 aylik, 6 aylik ve 1 yillik abonelik donemleri
- CLOUD icin omur boyu secenegi yok

### TEAM
CLOUD'daki her sey, arti:
- **Kendi barindirma (self-hosted)** bulut ornegi (veri egemeniligi icin kendi sunucunuz)
- Profesyonel produksiyon ekipleri icin tasarlanmis
- Omur boyu PRO sahipleri TEAM abonelik fiyatlandirmasinda **kalici %20 indirim** alir

### Indirimler
- **Ogrenci ve ogretim uyeleri** herhangi bir abonelik planinin taban fiyatindan **%50 indirim** hakkinadir

---

## Teknik Mimari

### Moduler Plugin Sistemi (65+ Eklenti)

```
Cekirdek Uygulama (starcapp.exe + corelib.dll)
    |
Plugin Yoneticisi
    |
Ozellik Eklentileri (65 DLL, hikaye turune gore organize)
    +-- Hikaye Turu Eklentileri (Senaryo, Roman vb.)
    +-- Ozellik Eklentileri (Karakter, Mekan, Dunya)
    +-- Yardimci Eklentileri (Disa Aktarma, Isbirligi vb.)
    |
Qt 6 Framework (GUI, Core, Network, SQL, Multimedia)
    |
Sistem Kutuphaneleri (OpenSSL, SQLite, FFmpeg)
    |
Windows OS (tam guven izinleriyle)
```

### Plugin Kategorileri ve Sayilari

| Kategori | Eklenti Sayisi | Aciklama |
|----------|---------------|----------|
| Senaryo | 14 | Metin, bilgi, parametreler, istatistikler, kartlar, timeline, tretman, doküm |
| Senaryo Dizisi | 6 | Dizi bilgisi, parametreler, istatistikler, planlama |
| Roman | 11 | Metin, bilgi, parametreler, istatistikler, anahat, kartlar, timeline |
| Sahne Oyunu | 5 | Metin, bilgi, parametreler, istatistikler, yapi |
| Cizgi Roman | 5 | Metin, bilgi, parametreler, istatistikler, yapi |
| Sesli Oyun | 6 | Metin, bilgi, parametreler, istatistikler, yapi |
| Karakter | 4 | Bilgi, diyaloglar, iliskiler, yapi |
| Mekan/Dunya | 7 | Mekan bilgisi, sahneler, harita, dunya bilgisi, dunya haritasi |
| Basit Metin | 2 | Genel metin duzenleme ve yapi |
| Cekirdek/Yardimci | 8 | Core, sunum, proje bilgisi, isbirligi, gorsel galeri, geri donusum, zihin haritasi, baslik sayfasi |

### Veri Depolama

- **Proje Dosya Formati:** SQLite 3 veritabani (`.starc` uzantili)
- **Oturum Veritabani:** `sessions.db` - Aktif oturumlar, belge degisiklikleri, sistem degiskenleri
- **Yapilandirma:** Windows Registry dosyalari (settings.dat) + Helium framework
- **Sablonlar:** XML dosyalari
- **Yedekler:** Otomatik zaman damgali `.starc` kopyalari

### Oturum Veritabani Semasi

```sql
-- Belgeler tablosu
CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE,           -- Benzersiz belge tanimlayicisi
  type INTEGER DEFAULT 0,     -- Belge turu kodu
  content BLOB,               -- Ikili serileştirilmis icerik
  synced_at TEXT              -- Son bulut senkronizasyonu zamani
);

-- Belge degisiklikleri tablosu
CREATE TABLE documents_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fk_document_uuid TEXT,      -- Belge UUID'sine referans
  uuid TEXT UNIQUE,           -- Degisiklik kaydi tanimlayicisi
  undo_patch BLOB,            -- Geri alma yamasi
  redo_patch BLOB,            -- Yeniden yapma yamasi
  date_time TEXT,             -- Degisiklik zamani
  user_name TEXT,             -- Degisikligi yapan kullanici
  user_email TEXT,            -- Kullanici e-postasi
  is_synced INTEGER DEFAULT 0 -- 0=yerel, 1=buluta senkronize
);

-- Sistem degiskenleri tablosu
CREATE TABLE system_variables (
  variable TEXT PRIMARY KEY,  -- Yapilandirma anahtari
  value TEXT                 -- Yapilandirma degeri
);
```

### Proje Dosya Yapisi (.starc)

```
Proje Koku (UUID)
+-- Proje Bilgisi Belgesi
|   +-- ad: "Proje Basligi"
|   +-- logline: "Tek cumleli aciklama"
|   +-- kapak: <gorsel referansi>
|
+-- Karakterler
|   +-- Karakter 1 (isim, aciklama, rol, meta veri)
|   +-- [Ek Karakterler]
|
+-- Mekanlar
|   +-- Mekan 1
|   +-- [Ek Mekanlar]
|
+-- Dunyalar
|   +-- Dunya 1
|   +-- [Ek Dunyalar]
|
+-- Senaryo
|   +-- Baslik Sayfasi
|   +-- Sinopsis
|   +-- Tretman
|   +-- Senaryo Metni
|   |   +-- Sahne 1
|   |   +-- Sahne 2
|   |   +-- [Ek Sahneler]
|   +-- Istatistikler
|
+-- Geri Donusum Kutusu
    +-- [Silinen ogeler]
```

### Belge MIME Tipleri

```
application/x-starc/document/project
application/x-starc/document/characters
application/x-starc/document/locations
application/x-starc/document/worlds
application/x-starc/document/screenplay
application/x-starc/document/screenplay/title-page
application/x-starc/document/screenplay/synopsis
application/x-starc/document/screenplay/treatment
application/x-starc/document/screenplay/text
application/x-starc/document/screenplay/statistics
application/x-starc/document/novel/title-page
application/x-starc/document/stageplay/title-page
application/x-starc/document/audioplay/title-page
application/x-starc/document/comicbook/title-page
application/x-starc/document/structure
application/x-starc/document/recycle-bin
```

### Temel Kutuphane Bagimliliklari

| Kutuphane | Boyut | Amac |
|-----------|-------|------|
| corelib.dll | 26.3 MB | Birincil uygulama mantigi |
| Qt6Core.dll | 6.2 MB | Cekirdek framework |
| Qt6Gui.dll | 9.3 MB | GUI olusturma |
| Qt6Widgets.dll | 6.5 MB | UI widget'lari |
| Qt6Network.dll | 1.8 MB | Ag islemleri |
| Qt6Multimedia.dll | 976 KB | Ses/video destegi |
| Qt6WebSockets.dll | 211 KB | Gercek zamanli iletisim |
| Qt6Sql.dll | 308 KB | Veritabani baglantisi |
| Qt6PrintSupport.dll | 404 KB | Yazici destegi |
| Qt6Svg.dll | 528 KB | SVG grafik destegi |
| libcrypto-3-x64.dll | 7.3 MB | OpenSSL sifreleme |
| libssl-3-x64.dll | 1.3 MB | SSL/TLS protokolu |
| opengl32sw.dll | 20.6 MB | Yazilim tabanli OpenGL |
| qsqlite.dll | 1.98 MB | SQLite veritabani surucusu |
| ffmpegmediaplugin.dll | 540 KB | Multimedya codec |

### Guvenlik ve TLS

| Bilesen | Aciklama |
|---------|----------|
| qopensslbackend.dll | OpenSSL TLS arka ucu |
| qcertonlybackend.dll | Yalnizca sertifika TLS arka ucu |
| qschannelbackend.dll | Windows SChannel TLS arka ucu |
| AppxSignature.p7x | Paket dijital imzasi |
| CodeIntegrity.cat | Kod butunlugu katalogu |

### Desteklenen Gorsel Formatlari

JPEG, TIFF, WebP, SVG, GIF, ICO, ICNS, TGA, WBMP

---

## Senkronizasyon ve Yedekleme

### Bulut Senkronizasyonu
- SQLite `documents_changes` tablosu tum degisiklikleri takip eder
- `is_synced` bayragi buluta senkronize degisiklikleri isaretler
- Zaman damgasi ve kullanici bilgisi catisma cozumu icin kullanilir
- Cift yonlu geri al/yeniden yap yamalari birlestirme kapasitesi saglar

### Yedekleme Sistemi
- **Konum:** `Belgeler/starc/backups/`
- **Adlandirma:** `ProjeAdi_YYYY_AA_GG_SS_DD_SN.starc`
- Kullanici kaydettiginde, periyodik otomatik kaydetmede, proje kapatildiginda ve uygulama cikarken tetiklenir
- Format: Tam `.starc` SQLite veritabani kopyasi

### Proje Kilitleme
- `.starc.lock` dosyasi ayni anda birden fazla duzenlemeyi onler
- Islem kimligini, bilgisayar adini ve oturum UUID'sini saklar

---

## Rakiplerden Ayiran Ozellikler

1. **Tek projede 5 farkli hikaye turu** - Ortak karakter/mekan veritabani ile paylasim
2. **AI ile format donusumu** - Senaryo -> Roman veya Roman -> Senaryo tek islemle
3. **Acik kaynak cekirdek** - Kod denetlenebilir, izleme yok, GitHub'da mevcut
4. **5 platformda yerli uygulama** - Windows, macOS, Linux, iOS, Android
5. **4 senkronize gorunum** - Metin, kartlar, timeline, doküm
6. **AI karakter fotograf uretimi** - Karakter editorunde dogrudan portre olusturma
7. **Tam belge AI cevirisi** - Formatlama korunarak herhangi bir dile ceviri
8. **Showrunner araclari** - Coklu bolum dizileri icin otomatik belge uretimi
9. **Ucretsiz katmanda filigran yok** - Bazi rakiplerin aksine
10. **Cevrimdisi oncelikli bulut senkronizasyonu** - Degisiklikler kuyruga alinir, baglanti geldiginde senkronize olur
11. **Ayrintili ortak yazar izinleri** - Proje icindeki belirli belgelere/bolumlere ozel erisim
12. **Kendi barindirma secenegi (TEAM)** - Veri egemeniligi icin kendi sunucunuz
13. **Dunya insasi araclari** - Gorsel haritalar, rota cizimleri, dunya yapi aciklamalari
14. **Senaryo dokumu Excel disa aktarma** - Aksesuar, kostum, arac, figuran vb. produksiyon elemanlari
15. **%50 ogrenci/ogretim uyesi indirimi** - Tum abonelik katmanlarinda gecerli

---

## UI Bilesenleri ve Ekranlar

| Ekran | Bilesenler |
|-------|-----------|
| **Ilk Kurulum (Onboarding)** | OnboardingToolBar, OnboardingNavigator, OnboardingView |
| **Projeler** | ProjectsToolBar, ProjectsNavigator, ProjectsView |
| **Proje Editoru** | ProjectToolBar, ProjectNavigator, Splitter (ana duzenleme alani) |

### Tasarim Sistemi Ayarlari
- Tema (Karanlik / Aydinlik / Karma + Ozel)
- Olcek faktoru (DPI olcekleme)
- Yogunluk (Kompakt / Normal / Genis)

---

## Kaynaklar

- [STARC Resmi Web Sitesi](https://starc.app/)
- [STARC Ozellikler Sayfasi](https://starc.app/features/)
- [STARC Fiyatlandirma](https://starc.app/pricing/)
- [STARC Yardim - Ilk Bakis](https://starc.app/help/first-glance)
- [STARC Yardim - AI Asistan](https://starc.app/help/ai-assistant)
- [STARC Yardim - Senaryo Ice Aktarma](https://starc.app/help/screenplay-importing)
- [STARC Yardim - Senaryo Disa Aktarma](https://starc.app/help/screenplay-exporting)
- [STARC Yardim - Roman Disa Aktarma](https://starc.app/help/novel-exporting)
- [STARC Yardim - Inceleme Modu](https://starc.app/help/review-mode)
- [STARC Yardim - Belge Sablonlari](https://starc.app/help/document-templates)
- [STARC Yardim - Karakter Iliskileri](https://starc.app/help/characters-relations)
- [STARC Ozellikler - Bulut Projeler](https://starc.app/features/cloud-projects)
- [STARC Ozellikler - Yazma Sprintleri](https://starc.app/features/writing-sprints)
- [STARC Ozellikler - Dizi Projesi Olusturma](https://starc.app/features/create-a-series-project)
- [STARC GitHub Deposu](https://github.com/story-apps/starc)
