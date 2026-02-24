// ═══ DEMO PROJECT DATA (SAKAL) ═══
function getDemoProject() {
  const U = App.Utils;
  const CHARS = ['Sakal','Akın','Ayça','Hatice','Çağatay','Ayaz','Begüm','Mehmet','Aren','Tomris/Lakas','Asaf','Menderes','Doğan Albay','Tutak','Sangal','Tekin','Oktay Anar'];
  const characters = CHARS.map(name => ({id:'ch_'+name.replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ0-9]/g,'_'), name, color:'', notes:''}));
  const charId = name => 'ch_'+name.replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ0-9]/g,'_');
  const episodes = [
    {id:'ep1',number:1,title:'Uyanma',duration:2700,type:'normal',order:1},
    {id:'ep2',number:2,title:'Masal',duration:2700,type:'normal',order:2},
    {id:'ep3',number:3,title:'Sistemin Yüzü',duration:2700,type:'normal',order:3},
    {id:'ep4',number:4,title:'İlk Darbe',duration:2700,type:'normal',order:4},
    {id:'ep5',number:5,title:'Sangal Operasyonu',duration:2700,type:'normal',order:5},
    {id:'ep6',number:6,title:'Tekin Holding',duration:2700,type:'normal',order:6},
    {id:'ep7',number:7,title:'Sınav ve Çatlaklar',duration:2700,type:'normal',order:7},
    {id:'ep8',number:8,title:'Kayıp',duration:2700,type:'normal',order:8},
    {id:'ep9',number:9,title:'Yeniden Doğuş',duration:2700,type:'normal',order:9},
    {id:'ep10',number:10,title:'Lakas (Final)',duration:2700,type:'normal',order:10},
    {id:'epfb',number:'fb',title:'Flashback',duration:2700,type:'flashback',order:11}
  ];
  const epMap = {1:'ep1',2:'ep2',3:'ep3',4:'ep4',5:'ep5',6:'ep6',7:'ep7',8:'ep8',9:'ep9',10:'ep10','fb':'epfb'};
  const raw = [
    {id:'e1',t:'Flashforward: İzbe Bina',d:'Kaos, silah sesleri, patlama.',ep:1,c:'sistem',ch:[],s:0,dur:120},
    {id:'e2',t:'Akın: Sabah Rutini',d:'Alarm, tıraş, modern kölelik teması.',ep:1,c:'karakter',ch:['Akın'],s:120,dur:150},
    {id:'e3',t:'Akın: Trafik ve Plaza',d:'Trafikte sıkışma, plazaya giriş.',ep:1,c:'karakter',ch:['Akın'],s:270,dur:90},
    {id:'e4',t:'Kafede Begüm ile Tanışma',d:'Masada Demir Ökçe kitabı.',ep:1,c:'karakter',ch:['Akın','Begüm','Ayaz'],s:360,dur:120},
    {id:'e5',t:'Akın: Counter Strike → Müdür',d:'Ofiste oyun, müdürle gerilim.',ep:1,c:'karakter',ch:['Akın'],s:480,dur:120},
    {id:'e6',t:'Koridor Operasyonu',d:'Ayaz gece baskını, USB verileri.',ep:1,c:'operasyon',ch:['Ayaz','Sakal'],s:600,dur:180},
    {id:'e7',t:'Çağatay: GTA → Pizza',d:'GTA 5, Mehmet kurye gelir.',ep:1,c:'karakter',ch:['Çağatay','Mehmet'],s:780,dur:120},
    {id:'e8',t:'Ayça: Otel Sahnesi',d:'Barda Küçük Prens bırakma.',ep:1,c:'karakter',ch:['Ayça','Ayaz'],s:900,dur:150},
    {id:'e9',t:'Hatice: Acil Servis + Taciz',d:'Vardiya bitişi, Mehmet kurtarma.',ep:1,c:'karakter',ch:['Hatice','Mehmet'],s:1050,dur:120},
    {id:'e10',t:'Hatice: Gecekondu Evi',d:'Kitaplık, Meryem fotoğrafı.',ep:1,c:'karakter',ch:['Hatice'],s:1170,dur:60},
    {id:'e11',t:'Sahaf Tanıtımı + Zihgir',d:'FSM tablosu ve hikayesi.',ep:1,c:'organizasyon',ch:['Sakal','Mehmet','Ayaz'],s:1230,dur:120},
    {id:'e12',t:'Hatice–Ayça Hastane Süreci',d:'Bakım, anne boşluğu.',ep:1,c:'karakter',ch:['Hatice','Ayça','Sakal'],s:1350,dur:90},
    {id:'e13',t:'Sakal: Aren\'i TV\'den İzleme',d:'Randevu teyidi.',ep:1,c:'karakter',ch:['Sakal','Aren'],s:1440,dur:60},
    {id:'e14',t:'Sakal–Aren Terapi Seansı',d:'Kum saati hediyesi.',ep:1,c:'karakter',ch:['Sakal','Aren'],s:1500,dur:120},
    {id:'e15',t:'Parti: Odalar ve Yüzleşme',d:'Numaralı bileklikler.',ep:1,c:'organizasyon',ch:['Sakal','Akın','Ayça','Hatice','Çağatay','Begüm','Ayaz','Mehmet'],s:1620,dur:240},
    {id:'e16',t:'Parti: Sakal Tanışma + Damga',d:'Fotoğraf, damga.',ep:1,c:'organizasyon',ch:['Sakal','Akın','Ayça','Hatice','Çağatay'],s:1860,dur:120},
    {id:'e17',t:'Parti Sonrası: Gece Sahneleri',d:'Herkes kendi evinde.',ep:1,c:'karakter',ch:['Ayaz','Ayça','Çağatay','Akın','Hatice'],s:1980,dur:120},
    {id:'e18',t:'Hatice–Ayça: Damga Keşfi',d:'Sahaf adresini bulma.',ep:1,c:'organizasyon',ch:['Hatice','Ayça'],s:2100,dur:90},
    {id:'e19',t:'Masal: Masalcı Kız (Begüm)',d:'Begüm sesiyle masal başlar.',ep:2,c:'organizasyon',ch:['Begüm'],s:0,dur:120},
    {id:'e20',t:'Begüm Yolda + Metro',d:'Yılmaz Holding reklamları.',ep:2,c:'karakter',ch:['Begüm'],s:120,dur:90},
    {id:'e21',t:'Masal: Tüccar (Tutak)',d:'Masalda Tüccar.',ep:2,c:'organizasyon',ch:['Tutak'],s:210,dur:90},
    {id:'e22',t:'Tutak: Günlük Hayat',d:'Lüks malikane ama yalnız.',ep:2,c:'sistem',ch:['Tutak'],s:300,dur:180},
    {id:'e23',t:'Begüm–Akın Kafede',d:'Parti konuşması.',ep:2,c:'karakter',ch:['Begüm','Akın'],s:480,dur:150},
    {id:'e24',t:'Masal: Saat (Akın)',d:'Altın gövde, çelik mekanizma.',ep:2,c:'organizasyon',ch:['Akın'],s:630,dur:60},
    {id:'e25',t:'Akın Ofiste: Tekin Holding',d:'Kurumsal baskı.',ep:2,c:'karakter',ch:['Akın','Tekin'],s:690,dur:120},
    {id:'e26',t:'Masal: Örümcek (Çağatay)',d:'Karanlık köşede ağ.',ep:2,c:'organizasyon',ch:['Çağatay'],s:810,dur:60},
    {id:'e27',t:'Sakal Çağatay Evine Gelir',d:'Burada harcanıyorsun.',ep:2,c:'organizasyon',ch:['Sakal','Çağatay'],s:870,dur:150},
    {id:'e28',t:'Hatice: Meryem Fotoğrafı',d:'Derin sessizlik.',ep:2,c:'karakter',ch:['Hatice'],s:1020,dur:60},
    {id:'e29',t:'Masal: Ateş Kuşu (Ayça)',d:'Masalda Ayça.',ep:2,c:'organizasyon',ch:['Ayça'],s:1080,dur:60},
    {id:'e30',t:'Masal Finali: Kelebek Etkisi',d:'Kaos teorisi metaforu.',ep:2,c:'organizasyon',ch:['Begüm'],s:1140,dur:120},
    {id:'e31',t:'e-Demokrasi: Oylama',d:'Algı operasyonu.',ep:3,c:'sistem',ch:['Akın'],s:0,dur:180},
    {id:'e32',t:'Asaf: Hastane Açılışı',d:'Hayırsever imajı.',ep:3,c:'sistem',ch:['Asaf'],s:180,dur:180},
    {id:'e33',t:'Sakal–Tekin Holding Ziyareti',d:'Akın Sakal\'ı görür.',ep:3,c:'organizasyon',ch:['Sakal','Akın','Tekin'],s:360,dur:150},
    {id:'e34',t:'Begüm–Sakal–Akın: Starbucks',d:'Yılmaz\'ı mı öldüreceksin?',ep:3,c:'organizasyon',ch:['Sakal','Akın','Begüm'],s:510,dur:120},
    {id:'e35',t:'Sahafta İlk Toplantı',d:'Görev dağılımı.',ep:3,c:'organizasyon',ch:['Sakal','Akın','Ayça','Hatice','Ayaz','Begüm','Mehmet'],s:630,dur:240},
    {id:'e36',t:'Şirket Kurma Teklifi',d:'Platform geliştirme görevi.',ep:3,c:'organizasyon',ch:['Sakal','Çağatay'],s:870,dur:150},
    {id:'e37',t:'Menderes: Balistik Rapor',d:'Mermi kovanları.',ep:3,c:'sistem',ch:['Menderes'],s:1020,dur:120},
    {id:'e38',t:'Asaf: Sağlık Altyapısı',d:'Stratejik değer.',ep:3,c:'sistem',ch:['Asaf'],s:1140,dur:120},
    {id:'e39',t:'Tutak Baskını: Gece Op.',d:'Mermi kovanlarına isim yazma.',ep:4,c:'operasyon',ch:['Ayaz','Sakal','Tutak'],s:0,dur:240},
    {id:'e40',t:'Tutak\'ın Ölümü',d:'İlk oligark düşer.',ep:4,c:'operasyon',ch:['Ayaz','Tutak'],s:240,dur:90},
    {id:'e41',t:'Sangal: Medya İmparatorluğu',d:'Gazete patronu.',ep:4,c:'sistem',ch:['Sangal'],s:330,dur:180},
    {id:'e42',t:'Ayça–Hatice Dostluk',d:'Veranda sohbetleri.',ep:4,c:'karakter',ch:['Ayça','Hatice'],s:510,dur:120},
    {id:'e43',t:'Ayça: Annesiyle Telefon',d:'Soğuk cevaplar.',ep:4,c:'karakter',ch:['Ayça'],s:630,dur:90},
    {id:'e44',t:'Çağatay: Uygulama Beta',d:'Gizli işlev.',ep:4,c:'ihanet',ch:['Çağatay','Sakal'],s:720,dur:150},
    {id:'e45',t:'Hatice: İş Yerinde Aşağılanma',d:'Sessiz öfke.',ep:4,c:'karakter',ch:['Hatice'],s:870,dur:90},
    {id:'e46',t:'Asaf: İş Zirvesi',d:'İstikrar konuşması.',ep:4,c:'sistem',ch:['Asaf'],s:960,dur:120},
    {id:'e47',t:'e-Demokrasi: Algı Op.',d:'Sangal gazetesi yönlendirmesi.',ep:4,c:'sistem',ch:['Sangal'],s:1080,dur:120},
    {id:'e48',t:'Ayça: Sahte Kimlik',d:'Gazeteci Ayşe Duran.',ep:5,c:'operasyon',ch:['Ayça'],s:0,dur:120},
    {id:'e49',t:'Sangal Operasyonu: Otel',d:'Ustura, Sakal\'ın selamı.',ep:5,c:'operasyon',ch:['Ayça','Sangal'],s:120,dur:210},
    {id:'e50',t:'Hatice: Koridorda Bakışma',d:'Sessiz dayanışma.',ep:5,c:'operasyon',ch:['Hatice','Ayça'],s:330,dur:60},
    {id:'e51',t:'Sangal Ölümü: Kalp Krizi',d:'Doğal gösterilir.',ep:5,c:'operasyon',ch:['Hatice','Sangal'],s:390,dur:90},
    {id:'e52',t:'Akın–Begüm Pub\'da',d:'Haberlerde cinayetler.',ep:5,c:'karakter',ch:['Akın','Begüm'],s:480,dur:120},
    {id:'e53',t:'Uygulama Yayında',d:'Kullanıcı artışı.',ep:5,c:'ihanet',ch:['Çağatay'],s:600,dur:150},
    {id:'e54',t:'Halkta Kıpırtı',d:'Anonim paylaşımlar.',ep:5,c:'sistem',ch:[],s:750,dur:150},
    {id:'e55',t:'Akın: Turntable + Gözaltı',d:'Özel harekat baskını.',ep:5,c:'operasyon',ch:['Akın'],s:900,dur:180},
    {id:'e56',t:'Gece Sahneleri',d:'Herkes evde.',ep:5,c:'karakter',ch:['Hatice','Çağatay','Sakal'],s:1080,dur:120},
    {id:'e57',t:'Tekin Holding Hack: Plan',d:'Görev dağılımı.',ep:6,c:'operasyon',ch:['Sakal','Akın','Çağatay','Ayaz','Begüm','Mehmet'],s:0,dur:180},
    {id:'e58',t:'Tekin Holding Hack: İcra',d:'Hesaplar boşaltılır.',ep:6,c:'operasyon',ch:['Akın','Çağatay','Ayaz','Tekin'],s:180,dur:240},
    {id:'e59',t:'Asaf: Yardım Organizasyonu',d:'Sahada halkla iç içe.',ep:6,c:'sistem',ch:['Asaf'],s:420,dur:120},
    {id:'e60',t:'Organize Şube: Emniyet Müdürü',d:'Gazeteci nasıl öğrendi?',ep:6,c:'sistem',ch:['Menderes'],s:540,dur:150},
    {id:'e61',t:'Menderes: Araştırma',d:'İpuçları birleşiyor.',ep:6,c:'sistem',ch:['Menderes'],s:690,dur:120},
    {id:'e62',t:'Çağatay: Ego Kıpırtısı',d:'Teknik başarı, tatmin.',ep:6,c:'ihanet',ch:['Çağatay'],s:810,dur:120},
    {id:'e63',t:'Begüm: Tekin Bağlantısı',d:'Aile meselesi.',ep:6,c:'karakter',ch:['Begüm','Tekin'],s:930,dur:120},
    {id:'e64',t:'Akın Sınavı: Sahte Sorgu',d:'Maskeli adam — Ayaz.',ep:7,c:'karakter',ch:['Akın','Sakal','Ayaz','Begüm'],s:0,dur:210},
    {id:'e65',t:'Sakal–Akın: ADALET Vizyonu',d:'Gerçek plan.',ep:7,c:'organizasyon',ch:['Sakal','Akın'],s:210,dur:180},
    {id:'e66',t:'Aren vs Oktay: TV Tartışması',d:'Canlı yayın.',ep:7,c:'sistem',ch:['Aren','Oktay Anar'],s:390,dur:180},
    {id:'e67',t:'Asaf: Adalet+İstikrar',d:'Basın açıklaması.',ep:7,c:'sistem',ch:['Asaf'],s:570,dur:90},
    {id:'e68',t:'Çağatay: Medya İlgisi',d:'Ego şişiyor.',ep:7,c:'ihanet',ch:['Çağatay'],s:660,dur:150},
    {id:'e69',t:'12 İsim Serbest',d:'Halkta öfke.',ep:7,c:'sistem',ch:['Tekin','Asaf'],s:810,dur:150},
    {id:'e70',t:'Menderes: Kumanda Fırlatma',d:'Neleri örttüğümüzü bilsen.',ep:7,c:'karakter',ch:['Menderes'],s:960,dur:120},
    {id:'e71',t:'Sahaf Baskını: Hazırlık',d:'İmha saati 4dk.',ep:8,c:'operasyon',ch:['Ayaz','Sakal','Begüm','Hatice','Mehmet'],s:0,dur:180},
    {id:'e72',t:'Sahaf Baskını: Polis',d:'Mermiler kitapları deliyor.',ep:8,c:'operasyon',ch:['Ayaz','Menderes'],s:180,dur:180},
    {id:'e73',t:'Ayaz\'ın Son Savaşı',d:'Bıçakla son direniş.',ep:8,c:'operasyon',ch:['Ayaz'],s:360,dur:180},
    {id:'e74',t:'Ayaz\'ın Hayali: Oba',d:'Yemyeşil oba, aile.',ep:8,c:'karakter',ch:['Ayaz'],s:540,dur:120},
    {id:'e75',t:'Ayaz\'ın Ölümü + Patlama',d:'Sahaf yerle bir.',ep:8,c:'operasyon',ch:['Ayaz'],s:660,dur:120},
    {id:'e76',t:'Kaçış: Araba Sahnesi',d:'Zihgir savaş pozisyonu.',ep:8,c:'organizasyon',ch:['Sakal','Mehmet','Begüm','Hatice'],s:780,dur:120},
    {id:'e77',t:'Çağatay: Gizli İşlev Keşfi',d:'Öfke ve güvensizlik.',ep:8,c:'ihanet',ch:['Çağatay'],s:900,dur:120},
    {id:'e78',t:'Çağatay: İhanet Kararı',d:'Devletle temas kararı.',ep:8,c:'ihanet',ch:['Çağatay'],s:1020,dur:120},
    {id:'e79',t:'Emniyet Basın Açıklaması',d:'Örgüt lideri ölü.',ep:9,c:'sistem',ch:['Menderes'],s:0,dur:150},
    {id:'e80',t:'Sokakta Kaynayan Öfke',d:'Engeller, mırıldanmalar.',ep:9,c:'sistem',ch:[],s:150,dur:90},
    {id:'e81',t:'Ekip Dağılmış',d:'Patladık / Duramayız.',ep:9,c:'karakter',ch:['Akın','Ayça','Hatice','Begüm'],s:240,dur:150},
    {id:'e82',t:'Aren: Kulis + Kum Saati',d:'Sakal logosu.',ep:9,c:'karakter',ch:['Aren','Sakal'],s:390,dur:90},
    {id:'e83',t:'Aren: Canlı Yayın',d:'Devletin yanlışları.',ep:9,c:'karakter',ch:['Aren'],s:480,dur:150},
    {id:'e84',t:'Aren: Gözaltı',d:'Gökyüzüne bakış, gülümseme.',ep:9,c:'sistem',ch:['Aren'],s:630,dur:120},
    {id:'e85',t:'Asaf: Kriz Yönetimi',d:'Diyalog, bastırma değil.',ep:9,c:'sistem',ch:['Asaf'],s:750,dur:120},
    {id:'e86',t:'Hatice ve Meryem: Parkta',d:'Göz göze ama dokunmaz.',ep:9,c:'karakter',ch:['Hatice','Sakal','Ayça'],s:870,dur:180},
    {id:'e87',t:'Çağatay: TEDx Hazırlık',d:'Bu işin beyni benim.',ep:9,c:'ihanet',ch:['Çağatay'],s:1050,dur:120},
    {id:'e88',t:'Çağatay: Devletle Temas',d:'Dokunulmazlık talebi.',ep:9,c:'ihanet',ch:['Çağatay'],s:1170,dur:120},
    {id:'e89',t:'e-Demokrasi Kırılma',d:'Sonuçlar değişiyor.',ep:10,c:'sistem',ch:[],s:0,dur:120},
    {id:'e90',t:'Sakal: Pub\'da Kaybolma',d:'Chopper kulübü.',ep:10,c:'organizasyon',ch:['Sakal','Menderes'],s:120,dur:150},
    {id:'e91',t:'Sakal: Sahaf Enkazı',d:'Dorian Gray alır.',ep:10,c:'organizasyon',ch:['Sakal'],s:270,dur:90},
    {id:'e92',t:'Çağatay: TEDx Konuşması',d:'Ego zirvesi.',ep:10,c:'ihanet',ch:['Çağatay'],s:360,dur:180},
    {id:'e93',t:'Sakal–Akın Buluşması',d:'Teknokrasi vizyonu.',ep:10,c:'organizasyon',ch:['Sakal','Akın'],s:540,dur:120},
    {id:'e94',t:'Depoda Çatışma: Mehmet',d:'Mehmet vurulur.',ep:10,c:'operasyon',ch:['Sakal','Mehmet','Menderes'],s:660,dur:180},
    {id:'e95',t:'Aren: Randevu Teyidi',d:'Kum saatine bakış.',ep:10,c:'karakter',ch:['Aren'],s:840,dur:60},
    {id:'e96',t:'Asaf: İki Telefon',d:'Mutlak hesap.',ep:10,c:'sistem',ch:['Asaf'],s:900,dur:150},
    {id:'e97',t:'Lakas Kafesi: Çağatay–Tomris',d:'TOMA\'lar, Dorian Gray.',ep:10,c:'organizasyon',ch:['Çağatay','Tomris/Lakas'],s:1050,dur:150},
    {id:'e98',t:'Garson Sakal: Büyük İfşa',d:'Tıraş olmuş, önlüklü.',ep:10,c:'organizasyon',ch:['Sakal','Çağatay','Tomris/Lakas'],s:1200,dur:120},
    {id:'e99',t:'Çağatay\'ın Sonu: Zehirlenme',d:'Köpüklerle masaya yığılır.',ep:10,c:'ihanet',ch:['Çağatay','Sakal','Hatice','Begüm'],s:1320,dur:150},
    {id:'e100',t:'Sakal: Gizli Karargah',d:'Devasa kitaplık.',ep:10,c:'organizasyon',ch:['Sakal','Begüm'],s:1470,dur:120},
    {id:'e101',t:'Son Yazı: Lakas İfşası',d:'Tomris Hanım.',ep:10,c:'organizasyon',ch:['Sakal','Tomris/Lakas'],s:1590,dur:120},
    {id:'e102',t:'Jenerik Sonrası: Mektup',d:'Diğer bölgelerdeki olaylar.',ep:10,c:'organizasyon',ch:['Tomris/Lakas','Doğan Albay'],s:1710,dur:120},
    {id:'e103',t:'FB: 1974 Filipinler Kafesi',d:'Doğan ve Tomris tanışma.',ep:'fb',c:'flashback',ch:['Doğan Albay','Tomris/Lakas'],s:0,dur:180},
    {id:'e104',t:'FB: 2008 Ayaz — Patlama',d:'Patlamış araba.',ep:'fb',c:'flashback',ch:['Ayaz'],s:180,dur:180},
    {id:'e105',t:'FB: 2008 Ayaz — Valiye Saldırı',d:'Kafa atma.',ep:'fb',c:'flashback',ch:['Ayaz'],s:360,dur:150},
    {id:'e106',t:'FB: 2011 Doğan — Kozmik Oda',d:'Belgeler, tutuklanma.',ep:'fb',c:'flashback',ch:['Doğan Albay'],s:510,dur:180},
    {id:'e107',t:'FB: Hatice — Kocasını Öldürmesi',d:'Sessiz karar anı.',ep:'fb',c:'flashback',ch:['Hatice'],s:690,dur:180},
    {id:'e108',t:'FB: 2016 Doğan — Cezaevi',d:'Mektup, intihar.',ep:'fb',c:'flashback',ch:['Doğan Albay','Ayaz'],s:870,dur:210}
  ];
  const events = raw.map(r => ({
    id:r.id, title:r.t, description:r.d, episodeId:epMap[r.ep], sceneId:null,
    category:r.c, characters:r.ch.map(charId), s:r.s, dur:r.dur
  }));
  const rawCns = [
    {f:'e6',t:'e58',tp:'neden'},{f:'e36',t:'e44',tp:'neden'},{f:'e44',t:'e53',tp:'neden'},
    {f:'e53',t:'e62',tp:'neden'},{f:'e62',t:'e68',tp:'neden'},{f:'e68',t:'e77',tp:'neden'},
    {f:'e77',t:'e78',tp:'neden'},{f:'e78',t:'e88',tp:'neden'},{f:'e88',t:'e99',tp:'neden'},
    {f:'e39',t:'e60',tp:'neden'},{f:'e60',t:'e72',tp:'neden'},{f:'e75',t:'e79',tp:'neden'},
    {f:'e41',t:'e49',tp:'neden'},{f:'e69',t:'e54',tp:'neden'},{f:'e14',t:'e83',tp:'neden'},
    {f:'e72',t:'e73',tp:'neden'},{f:'e73',t:'e75',tp:'neden'},
    {f:'e97',t:'e99',tp:'neden'},{f:'e99',t:'e101',tp:'neden'},
    {f:'e103',t:'e101',tp:'neden'},{f:'e108',t:'e101',tp:'neden'},
    {f:'e42',t:'e36',tp:'karakter'},{f:'e105',t:'e73',tp:'karakter'},{f:'e107',t:'e86',tp:'karakter'},
    {f:'e32',t:'e96',tp:'karakter'},{f:'e108',t:'e73',tp:'karakter'},
    {f:'e15',t:'e35',tp:'kronoloji'},{f:'e35',t:'e39',tp:'kronoloji'},{f:'e39',t:'e48',tp:'kronoloji'},
    {f:'e48',t:'e57',tp:'kronoloji'},{f:'e57',t:'e71',tp:'kronoloji'},{f:'e71',t:'e94',tp:'kronoloji'},
    {f:'e94',t:'e97',tp:'kronoloji'}
  ];
  const connections = rawCns.map((c,i) => ({id:'cn'+i, from:c.f, to:c.t, type:c.tp, description:'', strength:1}));
  return {
    meta: { title:'SAKAL', author:'', settings:{ episodeDuration:2700, pixelsPerSecond:0.5, snapGrid:10 } },
    categories: {operasyon:{label:'Operasyon',color:'#ef4444'},karakter:{label:'Karakter',color:'#3b82f6'},organizasyon:{label:'Organizasyon',color:'#10b981'},sistem:{label:'Sistem',color:'#f59e0b'},flashback:{label:'Flashback',color:'#a855f7'},ihanet:{label:'İhanet',color:'#f97316'}},
    characters, episodes, scenes: generateScenesFromEvents(events, episodes), events, connections
  };
}

function generateScenesFromEvents(events, episodes) {
  const scenes = [];
  const epGroups = {};
  events.forEach(ev => {
    if(!epGroups[ev.episodeId]) epGroups[ev.episodeId] = [];
    epGroups[ev.episodeId].push(ev);
  });
  Object.keys(epGroups).forEach(epId => {
    const evs = epGroups[epId].sort((a,b) => a.s - b.s);
    evs.forEach((ev, idx) => {
      const sc = {
        id: 'sc_' + ev.id,
        episodeId: epId,
        order: idx + 1,
        title: ev.title,
        location: '',
        timeOfDay: '',
        category: ev.category || 'karakter',
        characters: ev.characters || [],
        content: [{ type: 'action', text: ev.description || '' }]
      };
      ev.sceneId = sc.id;
      scenes.push(sc);
    });
  });
  return scenes;
}

// ═══ VIEW MODE ═══
App.isMobile = function() { return window.innerWidth <= 768; };
App._viewMode = 'split';
App.setViewMode = function(mode) {
  App._viewMode = mode;
  const sp = document.getElementById('spPanel');
  const tl = document.getElementById('tlA');
  document.querySelectorAll('.view-mode').forEach(b => b.classList.toggle('active', b.dataset.vm === mode));
  if(mode === 'screenplay') {
    sp.classList.add('open'); sp.style.display = '';
    tl.style.display = ''; // Keep visible — used as editor canvas
    document.body.classList.add('screenplay-editor-active');
    App.ScreenplayEditor.buildFromState();
    App.ScreenplayEditor.render();
  } else if(mode === 'timeline') {
    sp.classList.remove('open'); sp.style.display = 'none'; tl.style.display = '';
    if(App.ScreenplayEditor.isActive()) App.ScreenplayEditor.unmount();
    App.Timeline.render();
  } else { // split
    sp.classList.add('open'); sp.style.display = ''; tl.style.display = '';
    if(App.ScreenplayEditor.isActive()) App.ScreenplayEditor.unmount();
    App.Timeline.render();
  }
  // On mobile, adjust sp-panel max-height for split
  if(App.isMobile() && mode === 'split') {
    sp.style.maxHeight = '50vh';
  } else {
    sp.style.maxHeight = '';
  }
};

// ═══ REFRESH ═══
App.refresh = function() {
  App.Analysis.invalidateCache();
  // Kullanıcı bir input/textarea/contenteditable alanında yazıyorsa ağır render'ları atla
  var _ae = document.activeElement;
  var _isEditing = _ae && (_ae.tagName === 'TEXTAREA' || _ae.tagName === 'INPUT' || _ae.isContentEditable);
  if(_isEditing) {
    App.UI.updateStatusBar();
    document.getElementById('projTitle').textContent = App.Store.get().meta.title;
    return;
  }
  App.Timeline.initFilter();
  App.Timeline.buildToolbar();
  if(App.ScreenplayEditor.isActive()) {
    App.ScreenplayEditor.buildFromState();
    App.ScreenplayEditor.render();
  } else {
    App.Timeline.render();
  }
  App.Screenplay.render();
  App.UI.updateStatusBar();
  document.getElementById('projTitle').textContent = App.Store.get().meta.title;
  if(App.Interaction.updateSelectionVisual) App.Interaction.updateSelectionVisual();
};

// ═══ INIT ═══
(function(){
  try {
    // Firebase init
    if(typeof firebase !== 'undefined') {
      if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    }

    // Store change listener
    App.Store.on('change', (data) => {
      App.Analysis.invalidateCache();
      const fromEditor = data && data.type === 'screenplay-editor';
      const isRemote = data && data.type && (data.type.startsWith('remote') || data.type === 'set');
      // Kullanıcı bir input/textarea/contenteditable alanında yazıyorsa render'ları atla
      var _ae = document.activeElement;
      var _isEditing = _ae && (_ae.tagName === 'TEXTAREA' || _ae.tagName === 'INPUT' || _ae.isContentEditable);
      // Remote değişikliklerde kullanıcı yazıyorsa tüm ağır render'ları atla
      if(isRemote && _isEditing) {
        App.UI.updateStatusBar();
        return;
      }
      if(App.ScreenplayEditor.isActive()) {
        App.Screenplay.render();
        if(!fromEditor) {
          App.ScreenplayEditor.buildFromState();
          App.ScreenplayEditor.render();
        }
      } else {
        App.Timeline.render();
        App.Screenplay.render();
      }
      App.UI.updateStatusBar();
      if(App.Interaction.updateSelectionVisual) App.Interaction.updateSelectionVisual();
      if(document.getElementById('rPanel').classList.contains('open')) {
        if(!_isEditing) {
          App.Panels.renderPanel();
        }
      }
      // AutoSave (Firebase'e yazma)
      if(App.AutoSave) App.AutoSave.save();
      if(App.Changelog) App.Changelog.addEntry(data);
    });

    App.Interaction.setup();
    if(App.Changelog) App.Changelog.init();
    if(App.Notes) App.Notes.init();

    // AUTH STATE OBSERVER — tüm akışı kontrol eder
    firebase.auth().onAuthStateChanged(user => {
      document.getElementById('loadMsg').style.display = 'none';
      if(user && user.isAnonymous) {
        // Eski anonim oturumu kapat, email/password auth'a geçiş
        firebase.auth().signOut();
        return;
      }
      if(user) {
        App.Projects.checkPendingInvitations()
          .catch(err => console.warn('[Auth] Davet kontrolü atlandı:', err.message))
          .then(() => {
            App.Projects.loadFromFirebase();
          });
      } else {
        App.Auth.showLoginScreen();
      }
    });
  } catch(e) {
    const d = document.createElement('div');
    d.style.cssText = 'color:#ef4444;background:#1a1a2e;padding:24px;margin:20px;border:2px solid #ef4444;border-radius:8px;font-size:14px;font-family:monospace;white-space:pre-wrap;z-index:99999;position:relative;';
    d.textContent = 'HATA: ' + e.message + '\nStack: ' + (e.stack||'yok');
    document.body.insertBefore(d, document.body.firstChild);
  }
})();
