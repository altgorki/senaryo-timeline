// ═══ TEMPLATES MODULE ═══
App.Templates = (function(){
  const U = App.Utils;
  const S = App.Store;

  const TEMPLATES = [
    {
      id: 'turk_dizi_45',
      name: 'Türk Dizi (45dk)',
      description: 'Standart 45 dakikalık Türk dizisi formatı. 8 sahne, 4 ana karakter.',
      icon: '📺',
      episodeDuration: 2700,
      episodes: [
        { number: 1, title: 'Pilot', type: 'normal' }
      ],
      scenes: [
        { title: 'Açılış Sahnesi', location: 'İç Mekan', timeOfDay: 'Gündüz', category: 'karakter', content: [{ type: 'action', text: 'Açılış sahnesi — ana karakterin günlük hayatı.' }] },
        { title: 'Tanışma / Olay Örgüsü', location: 'Dış Mekan', timeOfDay: 'Gündüz', category: 'karakter', content: [{ type: 'action', text: 'Ana olayın tetikleyicisi.' }] },
        { title: 'Gerilim Noktası', location: 'İç Mekan', timeOfDay: 'Gece', category: 'operasyon', content: [{ type: 'action', text: 'İlk gerilim anı.' }] },
        { title: 'Ara — Reklam Öncesi', location: '', timeOfDay: '', category: 'karakter', content: [{ type: 'action', text: 'Reklam arası öncesi cliffhanger.' }] },
        { title: 'Gelişme', location: 'Dış Mekan', timeOfDay: 'Gündüz', category: 'organizasyon', content: [{ type: 'action', text: 'Olay örgüsünün geliştiği sahne.' }] },
        { title: 'Duygusal Sahne', location: 'İç Mekan', timeOfDay: 'Gece', category: 'karakter', content: [{ type: 'action', text: 'Karakterler arası duygusal çatışma.' }] },
        { title: 'Doruk Noktası', location: 'Dış Mekan', timeOfDay: 'Gece', category: 'operasyon', content: [{ type: 'action', text: 'Bölümün doruk noktası.' }] },
        { title: 'Kapanış / Cliffhanger', location: 'İç Mekan', timeOfDay: 'Gece', category: 'karakter', content: [{ type: 'action', text: 'Sonraki bölüme bağlayan kapanış.' }] }
      ],
      characters: [
        { name: 'Ana Karakter', color: '#3b82f6' },
        { name: 'Sevgi İlgisi', color: '#ec4899' },
        { name: 'Antagonist', color: '#ef4444' },
        { name: 'Yardımcı Karakter', color: '#10b981' }
      ]
    },
    {
      id: 'turk_dizi_60',
      name: 'Türk Dizi (60dk)',
      description: 'Uzun format 60 dakikalık Türk dizisi. 12 sahne, 6 ana karakter.',
      icon: '🎬',
      episodeDuration: 3600,
      episodes: [
        { number: 1, title: 'Pilot', type: 'normal' }
      ],
      scenes: [
        { title: 'Teaser / Ön Gösterim', location: 'Dış Mekan', timeOfDay: 'Gece', category: 'operasyon', content: [{ type: 'action', text: 'Heyecan verici açılış teaser\'ı.' }] },
        { title: 'Jenerik Sonrası — Günlük Hayat', location: 'İç Mekan', timeOfDay: 'Gündüz', category: 'karakter', content: [{ type: 'action', text: 'Ana karakterlerin tanıtımı.' }] },
        { title: 'İlk Karşılaşma', location: 'Dış Mekan', timeOfDay: 'Gündüz', category: 'karakter', content: [{ type: 'action', text: 'Kilit karakterlerin karşılaşması.' }] },
        { title: 'Alt Olay Örgüsü A', location: 'İç Mekan', timeOfDay: 'Gündüz', category: 'organizasyon', content: [{ type: 'action', text: 'Birinci alt hikaye.' }] },
        { title: 'Çatışma Başlangıcı', location: 'Dış Mekan', timeOfDay: 'Gündüz', category: 'operasyon', content: [{ type: 'action', text: 'Ana çatışmanın başlangıcı.' }] },
        { title: 'Reklam Arası 1 — Gerilim', location: '', timeOfDay: '', category: 'karakter', content: [{ type: 'action', text: 'İlk reklam arası öncesi gerilim.' }] },
        { title: 'Alt Olay Örgüsü B', location: 'İç Mekan', timeOfDay: 'Gece', category: 'karakter', content: [{ type: 'action', text: 'İkinci alt hikaye.' }] },
        { title: 'Sürpriz Gelişme', location: 'Dış Mekan', timeOfDay: 'Gece', category: 'sistem', content: [{ type: 'action', text: 'Beklenmedik olay.' }] },
        { title: 'Duygusal Yüzleşme', location: 'İç Mekan', timeOfDay: 'Gece', category: 'karakter', content: [{ type: 'action', text: 'Karakterler arası yüzleşme.' }] },
        { title: 'Reklam Arası 2 — Şok', location: '', timeOfDay: '', category: 'operasyon', content: [{ type: 'action', text: 'İkinci reklam arası öncesi şok.' }] },
        { title: 'Doruk Noktası', location: 'Dış Mekan', timeOfDay: 'Gece', category: 'operasyon', content: [{ type: 'action', text: 'Bölümün en yoğun anı.' }] },
        { title: 'Kapanış — Cliffhanger', location: 'İç Mekan', timeOfDay: 'Gece', category: 'karakter', content: [{ type: 'action', text: 'Güçlü cliffhanger ile kapanış.' }] }
      ],
      characters: [
        { name: 'Ana Karakter', color: '#3b82f6' },
        { name: 'Sevgi İlgisi', color: '#ec4899' },
        { name: 'Antagonist', color: '#ef4444' },
        { name: 'Mentor', color: '#f59e0b' },
        { name: 'Sadık Dost', color: '#10b981' },
        { name: 'Gizemli Karakter', color: '#a855f7' }
      ]
    },
    {
      id: 'sinema_filmi',
      name: 'Sinema Filmi',
      description: 'Klasik üç perde yapısı. 15 sahne, 5 ana karakter.',
      icon: '🎥',
      episodeDuration: 7200,
      episodes: [
        { number: 1, title: '1. Perde — Giriş', type: 'normal' },
        { number: 2, title: '2. Perde — Gelişme', type: 'normal' },
        { number: 3, title: '3. Perde — Sonuç', type: 'normal' }
      ],
      scenes: [
        { ep: 1, title: 'Açılış İmajı', location: 'Dış Mekan', timeOfDay: 'Gündüz', category: 'karakter', content: [{ type: 'action', text: 'Filmin tonunu belirleyen açılış.' }] },
        { ep: 1, title: 'Tanıtım / Kurulum', location: 'İç Mekan', timeOfDay: 'Gündüz', category: 'karakter', content: [{ type: 'action', text: 'Ana karakterin dünyası.' }] },
        { ep: 1, title: 'Kışkırtıcı Olay', location: 'Dış Mekan', timeOfDay: 'Gündüz', category: 'operasyon', content: [{ type: 'action', text: 'Hikayeyi başlatan olay.' }] },
        { ep: 1, title: 'Tartışma / Tereddüt', location: 'İç Mekan', timeOfDay: 'Gece', category: 'karakter', content: [{ type: 'action', text: 'Karakter karar vermekte zorlanır.' }] },
        { ep: 1, title: '1. Perde Sonu — Dönüm Noktası', location: 'Dış Mekan', timeOfDay: 'Gece', category: 'operasyon', content: [{ type: 'action', text: 'İlk büyük dönüm noktası.' }] },
        { ep: 2, title: 'Yeni Dünya', location: 'Dış Mekan', timeOfDay: 'Gündüz', category: 'organizasyon', content: [{ type: 'action', text: 'Karakter yeni duruma adapte olur.' }] },
        { ep: 2, title: 'Eğlence ve Oyunlar', location: 'İç Mekan', timeOfDay: 'Gündüz', category: 'karakter', content: [{ type: 'action', text: 'Başarı ve eğlence dönemi.' }] },
        { ep: 2, title: 'Orta Nokta', location: 'Dış Mekan', timeOfDay: 'Gündüz', category: 'operasyon', content: [{ type: 'action', text: 'Filmin ortasındaki büyük olay.' }] },
        { ep: 2, title: 'Kötüler Yaklaşıyor', location: 'İç Mekan', timeOfDay: 'Gece', category: 'sistem', content: [{ type: 'action', text: 'Antagonist güçlenir.' }] },
        { ep: 2, title: 'Her Şey Kaybedildi', location: 'Dış Mekan', timeOfDay: 'Gece', category: 'karakter', content: [{ type: 'action', text: 'Karakterin en düşük noktası.' }] },
        { ep: 2, title: '2. Perde Sonu — Karanlık An', location: 'İç Mekan', timeOfDay: 'Gece', category: 'operasyon', content: [{ type: 'action', text: 'İkinci büyük dönüm noktası.' }] },
        { ep: 3, title: 'Toparlanma', location: 'İç Mekan', timeOfDay: 'Gündüz', category: 'karakter', content: [{ type: 'action', text: 'Karakter yeniden güç bulur.' }] },
        { ep: 3, title: 'Final Planı', location: 'Dış Mekan', timeOfDay: 'Gündüz', category: 'organizasyon', content: [{ type: 'action', text: 'Son savaş hazırlığı.' }] },
        { ep: 3, title: 'Doruk Noktası', location: 'Dış Mekan', timeOfDay: 'Gece', category: 'operasyon', content: [{ type: 'action', text: 'Filmin doruk çatışması.' }] },
        { ep: 3, title: 'Kapanış İmajı', location: 'İç Mekan', timeOfDay: 'Gece', category: 'karakter', content: [{ type: 'action', text: 'Açılış imajını yansıtan kapanış.' }] }
      ],
      characters: [
        { name: 'Kahraman', color: '#3b82f6' },
        { name: 'Sevgi İlgisi', color: '#ec4899' },
        { name: 'Kötü Adam', color: '#ef4444' },
        { name: 'Mentor', color: '#f59e0b' },
        { name: 'Sadık Yardımcı', color: '#10b981' }
      ]
    },
    {
      id: 'kisa_film',
      name: 'Kısa Film',
      description: 'Kompakt kısa film yapısı. 5 sahne, 3 karakter.',
      icon: '🎞️',
      episodeDuration: 1200,
      episodes: [
        { number: 1, title: 'Kısa Film', type: 'normal' }
      ],
      scenes: [
        { title: 'Açılış', location: 'Dış Mekan', timeOfDay: 'Gündüz', category: 'karakter', content: [{ type: 'action', text: 'Hızlı ve etkili açılış.' }] },
        { title: 'Sorun', location: 'İç Mekan', timeOfDay: 'Gündüz', category: 'operasyon', content: [{ type: 'action', text: 'Ana sorunun ortaya çıkışı.' }] },
        { title: 'Tırmanma', location: 'Dış Mekan', timeOfDay: 'Gece', category: 'karakter', content: [{ type: 'action', text: 'Gerilim tırmanır.' }] },
        { title: 'Doruk', location: 'İç Mekan', timeOfDay: 'Gece', category: 'operasyon', content: [{ type: 'action', text: 'Doruk anı.' }] },
        { title: 'Kapanış', location: 'Dış Mekan', timeOfDay: 'Gece', category: 'karakter', content: [{ type: 'action', text: 'Etkileyici kapanış.' }] }
      ],
      characters: [
        { name: 'Ana Karakter', color: '#3b82f6' },
        { name: 'Karşı Karakter', color: '#ef4444' },
        { name: 'Yardımcı', color: '#10b981' }
      ]
    },
    {
      id: 'belgesel',
      name: 'Belgesel',
      description: 'Belgesel film formatı. 6 sahne, 2 sunucu.',
      icon: '📹',
      episodeDuration: 3600,
      episodes: [
        { number: 1, title: 'Belgesel', type: 'normal' }
      ],
      scenes: [
        { title: 'Giriş / Teaser', location: 'Dış Mekan', timeOfDay: 'Gündüz', category: 'sistem', content: [{ type: 'action', text: 'Konunun tanıtımı ve dikkat çekici açılış.' }] },
        { title: 'Arka Plan', location: 'İç Mekan', timeOfDay: 'Gündüz', category: 'sistem', content: [{ type: 'action', text: 'Tarihi ve bağlamsal bilgi.' }] },
        { title: 'Röportaj / Tanık 1', location: 'İç Mekan', timeOfDay: 'Gündüz', category: 'karakter', content: [{ type: 'action', text: 'İlk tanık veya uzman röportajı.' }] },
        { title: 'Gelişme / Çatışma', location: 'Dış Mekan', timeOfDay: 'Gündüz', category: 'operasyon', content: [{ type: 'action', text: 'Konunun derinleştirilmesi.' }] },
        { title: 'Röportaj / Tanık 2', location: 'İç Mekan', timeOfDay: 'Gündüz', category: 'karakter', content: [{ type: 'action', text: 'İkinci tanık veya uzman röportajı.' }] },
        { title: 'Sonuç / Kapanış', location: 'Dış Mekan', timeOfDay: 'Gündüz', category: 'sistem', content: [{ type: 'action', text: 'Sonuçlar ve düşündürücü kapanış.' }] }
      ],
      characters: [
        { name: 'Sunucu / Anlatıcı', color: '#3b82f6' },
        { name: 'Sunucu 2 / Muhabir', color: '#10b981' }
      ]
    },
    {
      id: 'reklam',
      name: 'Reklam Filmi',
      description: 'Kısa reklam formatı. 3 sahne, 2 karakter.',
      icon: '📢',
      episodeDuration: 180,
      episodes: [
        { number: 1, title: 'Reklam', type: 'normal' }
      ],
      scenes: [
        { title: 'Dikkat Çekme', location: 'Dış Mekan', timeOfDay: 'Gündüz', category: 'karakter', content: [{ type: 'action', text: 'İzleyicinin dikkatini çek.' }] },
        { title: 'Ürün / Mesaj', location: 'İç Mekan', timeOfDay: 'Gündüz', category: 'organizasyon', content: [{ type: 'action', text: 'Ürün veya mesajın sunulması.' }] },
        { title: 'Kapanış / CTA', location: 'İç Mekan', timeOfDay: 'Gündüz', category: 'sistem', content: [{ type: 'action', text: 'Harekete geçirici kapanış.' }] }
      ],
      characters: [
        { name: 'Oyuncu 1', color: '#3b82f6' },
        { name: 'Oyuncu 2', color: '#ec4899' }
      ]
    },
    {
      id: 'bos_proje',
      name: 'Boş Proje',
      description: 'Sıfırdan başlayın. Boş bir proje ile kendi yapınızı oluşturun.',
      icon: '📄',
      episodeDuration: 2700,
      episodes: [
        { number: 1, title: '', type: 'normal' }
      ],
      scenes: [],
      characters: []
    }
  ];

  function openTemplateModal() {
    var html = '<div style="padding:24px;max-width:640px;">';
    html += '<h2 style="margin-bottom:6px;">Yeni Proje Oluştur</h2>';
    html += '<p style="font-size:12px;color:var(--tx3);margin-bottom:20px;">Bir şablon seçin veya boş proje ile başlayın.</p>';
    html += '<div class="template-grid">';
    TEMPLATES.forEach(function(tmpl) {
      html += _buildTemplateCard(tmpl);
    });
    html += '</div>';
    html += '<div style="margin-top:16px;"><button class="btn" onclick="App.UI.closeModal()" style="width:100%;">İptal</button></div>';
    html += '</div>';
    App.UI.openModal(html);
  }

  function _buildTemplateCard(tmpl) {
    var sceneCount = tmpl.scenes.length;
    var charCount = tmpl.characters.length;
    var epCount = tmpl.episodes.length;
    return '<div class="template-card" onclick="App.Templates.createFromTemplate(\'' + tmpl.id + '\')">' +
      '<div class="template-card-icon">' + tmpl.icon + '</div>' +
      '<div class="template-card-title">' + U.escHtml(tmpl.name) + '</div>' +
      '<div class="template-card-desc">' + U.escHtml(tmpl.description) + '</div>' +
      '<div class="template-card-meta">' +
        '<span>' + epCount + ' bölüm</span>' +
        '<span>' + sceneCount + ' sahne</span>' +
        '<span>' + charCount + ' karakter</span>' +
      '</div>' +
    '</div>';
  }

  function createFromTemplate(templateId) {
    var tmpl = TEMPLATES.find(function(t) { return t.id === templateId; });
    if (!tmpl) { App.UI.toast('Şablon bulunamadı'); return; }
    App.UI.closeModal();

    // For empty template, just create a standard project
    if (templateId === 'bos_proje') {
      App.Projects.create();
      return;
    }

    // Create project with template data
    var user = App.Auth.getCurrentUser();
    var uid = user.uid;
    var projectId = 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    var now = firebase.database.ServerValue.TIMESTAMP;
    var displayName = user.displayName || user.email.split('@')[0];

    var categories = {
      operasyon: { label: 'Operasyon', color: '#ef4444' },
      karakter: { label: 'Karakter', color: '#3b82f6' },
      organizasyon: { label: 'Organizasyon', color: '#10b981' },
      sistem: { label: 'Sistem', color: '#f59e0b' },
      flashback: { label: 'Flashback', color: '#a855f7' },
      ihanet: { label: 'İhanet', color: '#f97316' }
    };

    // Build characters
    var characters = {};
    var charIds = [];
    tmpl.characters.forEach(function(c) {
      var cid = U.genId('ch');
      charIds.push(cid);
      characters[cid] = { id: cid, name: c.name, color: c.color || '', notes: '' };
    });

    // Build episodes
    var episodes = {};
    var epIds = [];
    tmpl.episodes.forEach(function(ep, idx) {
      var eid = U.genId('ep');
      epIds.push(eid);
      episodes[eid] = { id: eid, number: ep.number, title: ep.title || '', duration: tmpl.episodeDuration, type: ep.type || 'normal', order: idx + 1 };
    });

    // Build scenes and events
    var scenes = {};
    var events = {};
    var perEpTime = {};
    var scenesByEp = {};

    tmpl.scenes.forEach(function(sc, idx) {
      var epIdx = (sc.ep ? sc.ep - 1 : 0);
      if (epIdx < 0 || epIdx >= epIds.length) epIdx = 0;
      var epId = epIds[epIdx];

      if (!scenesByEp[epId]) scenesByEp[epId] = 0;
      scenesByEp[epId]++;

      if (!perEpTime[epId]) perEpTime[epId] = 0;

      var scId = U.genId('sc');
      var evId = U.genId('ev');

      // Assign all characters to each scene for simplicity
      var sceneChars = charIds.slice();

      scenes[scId] = {
        id: scId,
        episodeId: epId,
        order: scenesByEp[epId],
        title: sc.title,
        location: sc.location || '',
        timeOfDay: sc.timeOfDay || '',
        category: sc.category || 'karakter',
        characters: sceneChars,
        content: sc.content || [{ type: 'action', text: '' }]
      };

      var dur = Math.round(tmpl.episodeDuration / Math.max(tmpl.scenes.filter(function(s) {
        var sEpIdx = s.ep ? s.ep - 1 : 0;
        return epIds[sEpIdx] === epId;
      }).length, 1));

      events[evId] = {
        id: evId,
        title: sc.title,
        description: (sc.content && sc.content[0]) ? sc.content[0].text : '',
        episodeId: epId,
        sceneId: scId,
        category: sc.category || 'karakter',
        characters: sceneChars,
        s: perEpTime[epId],
        dur: dur
      };

      perEpTime[epId] += dur;
    });

    var projectData = {
      categories: categories,
      characters: characters,
      episodes: episodes,
      scenes: scenes,
      events: events,
      connections: {},
      characterRelationships: {},
      reviewComments: {}
    };

    var updates = {};
    updates['projects/' + projectId + '/owner'] = uid;
    updates['projects/' + projectId + '/members/' + uid] = { role: 'owner', email: user.email, displayName: displayName, addedAt: now };
    updates['projects/' + projectId + '/meta'] = {
      title: tmpl.name,
      author: displayName,
      settings: { episodeDuration: tmpl.episodeDuration, pixelsPerSecond: 0.5, snapGrid: 10 },
      createdAt: now,
      updatedAt: now
    };
    updates['projects/' + projectId + '/data'] = projectData;
    updates['userProjects/' + uid + '/' + projectId] = { role: 'owner', title: tmpl.name, updatedAt: now };

    firebase.database().ref().update(updates)
      .then(function() { App.Projects.open(projectId); })
      .catch(function(err) { App.UI.toast('Proje oluşturma hatası: ' + err.message); });
  }

  return { openTemplateModal: openTemplateModal, createFromTemplate: createFromTemplate };
})();
