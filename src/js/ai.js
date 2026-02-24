// ═══ AI ASSISTANT MODULE ═══
App.AI = (function(){
  const U = App.Utils;
  const S = App.Store;

  // ── Provider Configuration ──
  const PROVIDERS = {
    gemini: {
      name: 'Google Gemini (Ücretsiz)',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:streamGenerateContent?alt=sse',
      models: [
        {id:'gemini-2.5-flash',label:'Gemini 2.5 Flash'},
        {id:'gemini-2.5-pro',label:'Gemini 2.5 Pro'},
        {id:'gemini-3-flash-preview',label:'Gemini 3 Flash (Preview)'},
        {id:'gemini-3-pro-preview',label:'Gemini 3 Pro (Preview)'}
      ],
      defaultModel: 'gemini-2.5-flash',
      headers(key){return{'Content-Type':'application/json'};},
      buildBody(messages, model, maxOut){
        const sys = messages.find(m=>m.role==='system');
        const parts = messages.filter(m=>m.role!=='system').map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content}]}));
        const body = {contents:parts,generationConfig:{maxOutputTokens:maxOut||2048}};
        if(sys) body.systemInstruction = {parts:[{text:sys.content}]};
        return JSON.stringify(body);
      },
      parseStream: _parseGeminiStream
    },
    anthropic: {
      name: 'Anthropic (Claude)',
      endpoint: 'https://api.anthropic.com/v1/messages',
      models: [
        {id:'claude-sonnet-4-6',label:'Claude Sonnet 4.6'},
        {id:'claude-opus-4-6',label:'Claude Opus 4.6'},
        {id:'claude-sonnet-4-5-20250929',label:'Claude Sonnet 4.5'},
        {id:'claude-haiku-4-5-20251001',label:'Claude Haiku 4.5'}
      ],
      defaultModel: 'claude-sonnet-4-6',
      headers(key){return{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'};},
      buildBody(messages, model, maxOut){
        const sys = messages.find(m=>m.role==='system');
        const msgs = messages.filter(m=>m.role!=='system');
        return JSON.stringify({model,max_tokens:maxOut||2048,stream:true,system:sys?sys.content:'',messages:msgs});
      },
      parseStream: _parseAnthropicStream
    },
    openai: {
      name: 'OpenAI (GPT)',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      models: [
        {id:'gpt-5.2',label:'GPT-5.2'},
        {id:'gpt-4.1',label:'GPT-4.1'},
        {id:'gpt-4.1-mini',label:'GPT-4.1 Mini'},
        {id:'gpt-4.1-nano',label:'GPT-4.1 Nano'},
        {id:'o3',label:'o3 (Reasoning)'},
        {id:'o4-mini',label:'o4-mini (Reasoning)'}
      ],
      defaultModel: 'gpt-4.1',
      headers(key){return{'Content-Type':'application/json','Authorization':'Bearer '+key};},
      buildBody(messages, model, maxOut){
        return JSON.stringify({model,max_tokens:maxOut||2048,stream:true,messages});
      },
      parseStream: _parseOpenAIStream
    }
  };

  // ── State ──
  let _provider = localStorage.getItem('ai_provider') || 'gemini';
  if(!PROVIDERS[_provider]) { _provider = 'gemini'; localStorage.setItem('ai_provider', _provider); }
  let _model = localStorage.getItem('ai_model') || PROVIDERS[_provider].defaultModel;
  if(!PROVIDERS[_provider].models.find(m => m.id === _model)) { _model = PROVIDERS[_provider].defaultModel; localStorage.setItem('ai_model', _model); }
  let _activeRequest = null;
  let _aiTab = 'write';
  let _lastResponse = '';
  let _streaming = false;
  let _history = [];
  let _requestTimes = [];

  // ── API Key Management ──
  function getKey(prov) { return localStorage.getItem('ai_key_'+(prov||_provider)) || ''; }
  function setKey(prov, key) { localStorage.setItem('ai_key_'+(prov||_provider), key); }
  function getProvider() { return _provider; }
  function setProvider(p) { if(PROVIDERS[p]) { _provider = p; localStorage.setItem('ai_provider', p); if(!PROVIDERS[p].models.find(m=>m.id===_model)) { _model = PROVIDERS[p].defaultModel; localStorage.setItem('ai_model', _model); } } }
  function getModel() { return _model; }
  function setModel(m) { _model = m; localStorage.setItem('ai_model', m); }
  function isConfigured() { return !!getKey(); }

  // ── Stream Parsers ──
  async function _parseAnthropicStream(reader, onChunk) {
    const decoder = new TextDecoder();
    let buf = '';
    while(true) {
      const {done, value} = await reader.read();
      if(done) break;
      buf += decoder.decode(value, {stream:true});
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for(const line of lines) {
        if(!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if(data === '[DONE]') return;
        try {
          const j = JSON.parse(data);
          if(j.type === 'content_block_delta' && j.delta && j.delta.text) onChunk(j.delta.text);
        } catch(e){}
      }
    }
  }

  async function _parseOpenAIStream(reader, onChunk) {
    const decoder = new TextDecoder();
    let buf = '';
    while(true) {
      const {done, value} = await reader.read();
      if(done) break;
      buf += decoder.decode(value, {stream:true});
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for(const line of lines) {
        if(!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if(data === '[DONE]') return;
        try {
          const j = JSON.parse(data);
          if(j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content) onChunk(j.choices[0].delta.content);
        } catch(e){}
      }
    }
  }

  async function _parseGeminiStream(reader, onChunk) {
    const decoder = new TextDecoder();
    let buf = '';
    while(true) {
      const {done, value} = await reader.read();
      if(done) break;
      buf += decoder.decode(value, {stream:true});
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for(const line of lines) {
        if(!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if(!data) continue;
        try {
          const j = JSON.parse(data);
          if(j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) {
            j.candidates[0].content.parts.forEach(p => { if(p.text) onChunk(p.text); });
          }
        } catch(e){}
      }
    }
  }

  // ── Rate Limiting ──
  function _checkRateLimit() {
    const now = Date.now();
    _requestTimes = _requestTimes.filter(t => now - t < 60000);
    if(_requestTimes.length >= 10) return false;
    _requestTimes.push(now);
    return true;
  }

  // ── Core Request ──
  async function streamRequest(messages, onChunk, onDone, onError, maxOut) {
    if(!isConfigured()) { onError('API anahtarı yapılandırılmamış. Proje Ayarları\'ndan API anahtarınızı girin.'); return; }
    if(!_checkRateLimit()) { onError('Çok fazla istek gönderildi. Lütfen bir dakika bekleyin.'); return; }
    if(_streaming) { onError('Zaten bir istek devam ediyor.'); return; }

    const prov = PROVIDERS[_provider];
    const key = getKey();
    let endpoint = prov.endpoint;
    if(_provider === 'gemini') endpoint = endpoint.replace('{MODEL}', _model) + '&key=' + key;

    const headers = prov.headers(key);
    const body = prov.buildBody(messages, _model, maxOut);

    _activeRequest = new AbortController();
    _streaming = true;
    let fullText = '';

    try {
      const resp = await fetch(endpoint, { method:'POST', headers, body, signal:_activeRequest.signal });
      if(!resp.ok) {
        let detail = '';
        try { const errBody = await resp.json(); detail = errBody.error?.message || errBody.error?.type || JSON.stringify(errBody.error || errBody); } catch(e) { try { detail = await resp.text(); } catch(e2){} }
        const errMap = {400:'Geçersiz istek',401:'Geçersiz API anahtarı',403:'Erişim reddedildi',429:'İstek limiti aşıldı. Lütfen bekleyin',500:'Sunucu hatası'};
        const base = errMap[resp.status] || `HTTP ${resp.status}`;
        const msg = detail ? `${base}: ${detail}` : `${base}.`;
        _streaming = false;
        onError(msg);
        return;
      }
      const reader = resp.body.getReader();
      await prov.parseStream(reader, (chunk) => {
        fullText += chunk;
        onChunk(chunk, fullText);
      });
      _streaming = false;
      _lastResponse = fullText;
      onDone(fullText);
    } catch(e) {
      _streaming = false;
      if(e.name === 'AbortError') { onDone(fullText || '(İptal edildi)'); return; }
      onError('Bağlantı hatası: ' + e.message);
    }
  }

  function cancelRequest() {
    if(_activeRequest) { _activeRequest.abort(); _activeRequest = null; }
    _streaming = false;
  }

  // ── Context Building ──
  function buildProjectContext(opts) {
    const P = S.get();
    const o = opts || {};
    let ctx = `## Proje: ${P.meta.title}\nYazar: ${P.meta.author||'Belirtilmemiş'}\n`;

    if(P.characters && P.characters.length) {
      ctx += '\n### Karakterler:\n';
      P.characters.forEach(c => { ctx += `- ${c.name}${c.notes?' ('+c.notes+')':''}\n`; });
    }

    if(P.categories) {
      ctx += '\n### Kategoriler:\n';
      Object.values(P.categories).forEach(c => { ctx += `- ${c.label}\n`; });
    }

    if(P.episodes && P.episodes.length) {
      ctx += '\n### Bölümler:\n';
      P.episodes.forEach(ep => {
        ctx += `\n#### Bölüm ${ep.number}${ep.title?' - '+ep.title:''}\n`;
        const scenes = S.getScenes(ep.id);
        scenes.forEach(sc => {
          ctx += `- Sahne: ${sc.title||'İsimsiz'}`;
          if(sc.location) ctx += ` | Mekan: ${sc.location}`;
          if(sc.timeOfDay) ctx += ` | Zaman: ${sc.timeOfDay}`;
          if(sc.characters && sc.characters.length) {
            const charNames = sc.characters.map(cid => { const ch = P.characters.find(c=>c.id===cid); return ch?ch.name:cid; });
            ctx += ` | Karakterler: ${charNames.join(', ')}`;
          }
          if(!o.brief && sc.screenplay) ctx += `\n  Senaryo: ${sc.screenplay.substring(0, 200)}${sc.screenplay.length>200?'...':''}`;
          ctx += '\n';
        });
      });
    }

    if(!o.brief && P.connections && P.connections.length) {
      ctx += '\n### Bağlantılar:\n';
      P.connections.slice(0, 20).forEach(cn => {
        ctx += `- ${cn.type||'bağlantı'}: ${cn.label||''}\n`;
      });
    }

    // Budget: truncate if too long (~8000 chars max for context)
    if(ctx.length > 8000) ctx = ctx.substring(0, 8000) + '\n...(kısaltıldı)';
    return ctx;
  }

  function buildSceneContext(sceneId) {
    const P = S.get();
    const sc = S.getScene(sceneId);
    if(!sc) return '';
    let ctx = `## Sahne: ${sc.title||'İsimsiz'}\n`;
    if(sc.location) ctx += `Mekan: ${sc.location}\n`;
    if(sc.timeOfDay) ctx += `Zaman: ${sc.timeOfDay}\n`;
    if(sc.characters && sc.characters.length) {
      const charNames = sc.characters.map(cid => { const ch = P.characters.find(c=>c.id===cid); return ch?ch.name:cid; });
      ctx += `Karakterler: ${charNames.join(', ')}\n`;
    }
    if(sc.screenplay) ctx += `\n### Mevcut Senaryo Metni:\n${sc.screenplay}\n`;
    if(sc.content && sc.content.length) {
      ctx += '\n### İçerik Blokları:\n';
      sc.content.forEach(b => {
        if(b.type === 'dialogue') {
          const ch = P.characters.find(c=>c.id===b.character);
          ctx += `[DİYALOG] ${ch?ch.name:'?'}: ${b.text||''}\n`;
        } else if(b.type === 'action') {
          ctx += `[AKSİYON] ${b.text||''}\n`;
        } else if(b.type === 'transition') {
          ctx += `[GEÇİŞ] ${b.text||''}\n`;
        }
      });
    }
    return ctx;
  }

  function buildEpisodeContext(episodeId) {
    const P = S.get();
    const ep = P.episodes.find(e => e.id === episodeId);
    if(!ep) return '';
    let ctx = `## Bölüm ${ep.number}${ep.title?' - '+ep.title:''}\n`;
    const scenes = S.getScenes(episodeId);
    scenes.forEach(sc => {
      ctx += `\n### Sahne: ${sc.title||'İsimsiz'}`;
      if(sc.location) ctx += ` (${sc.location})`;
      ctx += '\n';
      if(sc.screenplay) ctx += sc.screenplay + '\n';
      if(sc.content && sc.content.length) {
        sc.content.forEach(b => {
          if(b.type === 'dialogue') {
            const ch = P.characters.find(c=>c.id===b.character);
            ctx += `${ch?ch.name:'?'}: ${b.text||''}\n`;
          } else if(b.type === 'action') {
            ctx += `(${b.text||''})\n`;
          }
        });
      }
    });
    if(ctx.length > 10000) ctx = ctx.substring(0, 10000) + '\n...(kısaltıldı)';
    return ctx;
  }

  // ── System Prompt ──
  const SYSTEM_PROMPT = `Sen deneyimli bir Türk TV dizisi senaryo yazarısın. Görevin, kullanıcının senaryo projesine yardımcı olmaktır.

Kurallar:
- Her zaman Türkçe yaz.
- Diyaloglarda doğal, konuşma diline yakın Türkçe kullan.
- Sahne açıklamalarını sinematik ve görsel olarak zengin yaz.
- Karakter tutarlılığına dikkat et.
- Senaryo formatına uy: büyük harfle karakter adları, parantez içinde yönerge, sahne başlıkları.
- Kısa ve etkili cümleler kur.
- Gereksiz tekrarlardan kaçın.`;

  // ── Feature Functions ──
  function generateDialogue(sceneId) {
    const scCtx = buildSceneContext(sceneId);
    const projCtx = buildProjectContext({brief:true});
    if(!scCtx) { App.UI.toast('Sahne bulunamadı','error'); return; }
    const messages = [
      {role:'system', content:SYSTEM_PROMPT},
      {role:'user', content:`${projCtx}\n\n${scCtx}\n\nBu sahne için karakterler arası doğal, dramatik ve hikayeyi ilerletecek diyaloglar yaz. Sahnedeki tüm karakterleri dahil et. Senaryo formatında yaz (KARAKTER ADI büyük harfle, altında diyalog).`}
    ];
    _runFeature(messages, sceneId);
  }

  function writeSceneDescription(sceneId) {
    const scCtx = buildSceneContext(sceneId);
    const projCtx = buildProjectContext({brief:true});
    if(!scCtx) { App.UI.toast('Sahne bulunamadı','error'); return; }
    const messages = [
      {role:'system', content:SYSTEM_PROMPT},
      {role:'user', content:`${projCtx}\n\n${scCtx}\n\nBu sahne için detaylı, sinematik bir sahne açıklaması yaz. Mekan tasvirini, atmosferi, ışığı, sesleri ve karakterlerin fiziksel konumlarını betimle. Yönetmene görsel rehber olacak şekilde yaz.`}
    ];
    _runFeature(messages, sceneId);
  }

  function continueScreenplay(sceneId) {
    const scCtx = buildSceneContext(sceneId);
    const projCtx = buildProjectContext({brief:true});
    if(!scCtx) { App.UI.toast('Sahne bulunamadı','error'); return; }
    const messages = [
      {role:'system', content:SYSTEM_PROMPT},
      {role:'user', content:`${projCtx}\n\n${scCtx}\n\nMevcut senaryo metninin devamını yaz. Hikayenin akışını ve karakterlerin durumunu dikkate alarak doğal bir şekilde devam ettir. Senaryo formatında yaz.`}
    ];
    _runFeature(messages, sceneId);
  }

  function analyzeConsistency() {
    const projCtx = buildProjectContext();
    const messages = [
      {role:'system', content:SYSTEM_PROMPT},
      {role:'user', content:`${projCtx}\n\nBu projenin tutarlılık analizini yap. Şu başlıklar altında incele:\n1. **Karakter Tutarlılığı**: Karakterlerin davranış ve konuşma tutarlılığı\n2. **Hikaye Tutarlılığı**: Olay örgüsünde çelişkiler\n3. **Kronoloji**: Zaman çizelgesinde hatalar\n4. **Açık Noktalar**: Çözülmemiş hikaye hatları\n\nHer sorun için somut öneriler sun.`}
    ];
    _runFeature(messages, null);
  }

  function suggestCharacterDevelopment(charId) {
    const P = S.get();
    const ch = P.characters.find(c => c.id === charId);
    if(!ch) { App.UI.toast('Karakter bulunamadı','error'); return; }
    const projCtx = buildProjectContext();
    const messages = [
      {role:'system', content:SYSTEM_PROMPT},
      {role:'user', content:`${projCtx}\n\nKarakter: ${ch.name}\n${ch.notes?'Notlar: '+ch.notes:''}\n\nBu karakter için gelişim önerileri sun:\n1. **Karakter Arkı**: Nereden nereye gidebilir?\n2. **İç Çatışma**: Hangi iç çatışmalar eklenebilir?\n3. **İlişkiler**: Diğer karakterlerle ilişkileri nasıl derinleştirilebilir?\n4. **Sahneler**: Bu karakterin gelişimi için hangi sahneler eklenebilir?`}
    ];
    _runFeature(messages, null);
  }

  function analyzeTempoSuggestions() {
    const projCtx = buildProjectContext();
    const messages = [
      {role:'system', content:SYSTEM_PROMPT},
      {role:'user', content:`${projCtx}\n\nBu projenin tempo ve ritim analizini yap:\n1. **Genel Tempo**: Hikaye hızı uygun mu?\n2. **Sahne Uzunlukları**: Dengeli mi?\n3. **Gerilim Eğrisi**: Yükseliş-düşüş dengeliyor mu?\n4. **Bölüm Sonu Kancaları**: Cliffhanger'lar etkili mi?\n5. **Öneriler**: Tempo iyileştirme önerileri`}
    ];
    _runFeature(messages, null);
  }

  function summarizeEpisode(episodeId) {
    const epCtx = buildEpisodeContext(episodeId);
    if(!epCtx) { App.UI.toast('Bölüm bulunamadı','error'); return; }
    const messages = [
      {role:'system', content:SYSTEM_PROMPT},
      {role:'user', content:`${epCtx}\n\nBu bölümün detaylı özetini yaz:\n1. **Genel Özet** (2-3 paragraf)\n2. **Ana Olaylar** (madde madde)\n3. **Karakter Gelişimleri** (bu bölümde neler değişti)\n4. **Sonraki Bölüm İçin İpuçları**`}
    ];
    _runFeature(messages, null);
  }

  function summarizeCharacterArc(charId) {
    const P = S.get();
    const ch = P.characters.find(c => c.id === charId);
    if(!ch) { App.UI.toast('Karakter bulunamadı','error'); return; }
    const projCtx = buildProjectContext();
    const messages = [
      {role:'system', content:SYSTEM_PROMPT},
      {role:'user', content:`${projCtx}\n\nKarakter: ${ch.name}\n\nBu karakterin tüm proje boyunca arkını özetle:\n1. **Başlangıç Noktası**: Karakter ilk nasıl tanıtılıyor?\n2. **Dönüm Noktaları**: Önemli değişim anları\n3. **İlişki Haritası**: Diğer karakterlerle etkileşimleri\n4. **Mevcut Durum**: Karakter şu an nerede?`}
    ];
    _runFeature(messages, null);
  }

  function generateProjectOverview() {
    const projCtx = buildProjectContext();
    const messages = [
      {role:'system', content:SYSTEM_PROMPT},
      {role:'user', content:`${projCtx}\n\nBu proje için profesyonel bir pitch document / genel bakış belgesi oluştur:\n1. **Logline** (tek cümle)\n2. **Özet** (1 paragraf)\n3. **Tema ve Ton**\n4. **Ana Karakterler** (kısa tanıtım)\n5. **Hikaye Yapısı**\n6. **Hedef Kitle**\n7. **Benzersiz Satış Noktası**`}
    ];
    _runFeature(messages, null);
  }

  // ── Internal: Run Feature ──
  function _runFeature(messages, targetSceneId) {
    showStreamingResponse();
    let full = '';
    streamRequest(messages,
      (chunk, fullText) => { full = fullText; updateStreamDisplay(chunk, fullText); },
      (finalText) => { showCompletedResponse(finalText, targetSceneId); },
      (err) => { _showError(err); }
    );
  }

  // ── Chat ──
  function sendChat(text) {
    if(!text || !text.trim()) return;
    _history.push({role:'user', content:text.trim()});
    const projCtx = buildProjectContext({brief:true});
    const messages = [
      {role:'system', content:SYSTEM_PROMPT + '\n\nProje bağlamı:\n' + projCtx},
      ..._history
    ];
    // Keep history manageable
    if(_history.length > 20) _history.splice(0, _history.length - 16);
    showStreamingResponse();
    let full = '';
    streamRequest(messages,
      (chunk, fullText) => { full = fullText; updateStreamDisplay(chunk, fullText); },
      (finalText) => { _history.push({role:'assistant', content:finalText}); showCompletedResponse(finalText, null); },
      (err) => { _showError(err); }
    );
  }

  // ── Streaming UI ──
  function showStreamingResponse() {
    const container = document.getElementById('aiResponseArea');
    if(!container) return;
    container.innerHTML = '<div class="ai-response-stream" id="aiStreamBox"><span class="ai-spinner"></span> Yanıt bekleniyor...</div>' +
      '<div style="margin-top:6px;text-align:right"><button class="btn btn-s" style="color:var(--red)" onclick="App.AI.cancelRequest();App.AI.renderPanel()">✕ İptal</button></div>';
  }

  function updateStreamDisplay(chunk, fullText) {
    const box = document.getElementById('aiStreamBox');
    if(!box) return;
    box.textContent = fullText;
    box.scrollTop = box.scrollHeight;
  }

  function showCompletedResponse(fullText, targetSceneId) {
    const container = document.getElementById('aiResponseArea');
    if(!container) return;
    let html = '<div class="ai-response-stream" id="aiStreamBox">' + U.escHtml(fullText) + '</div>';
    html += '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">';
    html += '<button class="btn btn-s" onclick="App.AI._copyToClipboard()">📋 Kopyala</button>';
    if(targetSceneId) {
      html += `<button class="btn btn-s" style="color:var(--green)" onclick="App.AI._applyToScene('${targetSceneId}')">+ Senaryoya Ekle</button>`;
      html += `<button class="btn btn-s" style="color:var(--orange)" onclick="App.AI._replaceScene('${targetSceneId}')">↻ Değiştir</button>`;
    }
    html += '</div>';
    container.innerHTML = html;
  }

  function _showError(msg) {
    const container = document.getElementById('aiResponseArea');
    if(!container) return;
    container.innerHTML = '<div style="padding:10px;color:var(--red);font-size:12px;">⚠ ' + U.escHtml(msg) + '</div>';
  }

  // ── Apply Results ──
  function _applyToScene(sceneId) {
    const sc = S.getScene(sceneId);
    if(!sc || !_lastResponse) return;
    S.snapshot();
    sc.screenplay = (sc.screenplay || '') + '\n\n' + _lastResponse;
    S.markDirty('scenes');
    S.emit('change', {type:'screenplay', sceneId});
    App.UI.toast('Senaryoya eklendi');
  }

  function _replaceScene(sceneId) {
    const sc = S.getScene(sceneId);
    if(!sc || !_lastResponse) return;
    if(!confirm('Mevcut senaryo metni AI yanıtıyla değiştirilecek. Emin misiniz?')) return;
    S.snapshot();
    sc.screenplay = _lastResponse;
    S.markDirty('scenes');
    S.emit('change', {type:'screenplay', sceneId});
    App.UI.toast('Senaryo metni değiştirildi');
  }

  function _copyToClipboard() {
    if(!_lastResponse) return;
    navigator.clipboard.writeText(_lastResponse).then(() => App.UI.toast('Panoya kopyalandı'));
  }

  // ── Key Validation ──
  async function validateKey(prov, key) {
    const p = PROVIDERS[prov || _provider];
    if(!p || !key) return {ok:false, msg:'Anahtar boş.'};
    try {
      let endpoint = p.endpoint;
      let headers = p.headers(key);
      let body;
      if(prov === 'gemini' || _provider === 'gemini') {
        endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
        const resp = await fetch(endpoint);
        if(resp.ok) return {ok:true, msg:'Anahtar geçerli!'};
        return {ok:false, msg:'Geçersiz anahtar.'};
      } else if(prov === 'openai' || _provider === 'openai') {
        const resp = await fetch('https://api.openai.com/v1/models', {headers});
        if(resp.ok) return {ok:true, msg:'Anahtar geçerli!'};
        return {ok:false, msg:'Geçersiz anahtar.'};
      } else {
        body = JSON.stringify({model:PROVIDERS.anthropic.defaultModel,max_tokens:1,messages:[{role:'user',content:'test'}]});
        const resp = await fetch(endpoint, {method:'POST', headers, body});
        if(resp.ok || resp.status === 200) return {ok:true, msg:'Anahtar geçerli!'};
        if(resp.status === 401) return {ok:false, msg:'Geçersiz anahtar.'};
        if(resp.status === 400) return {ok:false, msg:'Geçersiz istek. Anahtar formatını kontrol edin.'};
        if(resp.status === 403) return {ok:false, msg:'Erişim reddedildi.'};
        return {ok:true, msg:'Bağlantı kuruldu.'};
      }
    } catch(e) {
      return {ok:false, msg:'Bağlantı hatası: '+e.message};
    }
  }

  async function _testKey() {
    const inp = document.getElementById('sAIKey');
    const btn = document.getElementById('aiTestBtn');
    const res = document.getElementById('aiTestResult');
    if(!inp || !btn) return;
    let key = inp.value.trim();
    if(!key) { if(res) res.textContent = 'Anahtar girin.'; return; }
    if(key === '********') { key = getKey(); if(!key) { if(res) res.textContent = 'Önce yeni anahtar girin.'; return; } }
    btn.disabled = true;
    btn.textContent = 'Test ediliyor...';
    const result = await validateKey(_provider, key);
    btn.disabled = false;
    btn.textContent = 'Test';
    if(res) {
      res.textContent = result.msg;
      res.style.color = result.ok ? 'var(--green)' : 'var(--red)';
    }
  }

  // ── Panel Render ──
  function renderPanel() {
    const rp = U.$('rPanel');
    if(!rp) return;
    const P = S.get();

    let h = '<div style="padding:10px 14px;border-bottom:1px solid var(--brd);display:flex;justify-content:space-between;align-items:center;">';
    h += '<h3 style="font-size:13px;font-weight:600;">✦ AI Asistan</h3>';
    h += '<button class="close-btn" onclick="App.Panels.closeAll()">✕</button></div>';

    if(!isConfigured()) {
      h += '<div style="padding:14px;"><div style="padding:12px;background:var(--bg3);border:1px solid var(--brd);border-radius:var(--radius);font-size:12px;color:var(--tx2);">';
      h += '<p style="margin-bottom:8px;">AI özelliklerini kullanmak için Proje Ayarları\'ndan API anahtarınızı yapılandırın.</p>';
      h += '<button class="btn btn-s btn-p" onclick="App.Panels.openSettings()">⚙ Ayarları Aç</button>';
      h += '</div></div>';
      rp.innerHTML = h;
      return;
    }

    // Tab bar
    h += '<div style="padding:8px 14px 0;">';
    h += '<div class="ai-tab-bar">';
    ['write','analysis','summary','chat'].forEach(tab => {
      const labels = {write:'Yazım',analysis:'Analiz',summary:'Özet',chat:'Sohbet'};
      h += `<button class="ai-tab${_aiTab===tab?' active':''}" onclick="App.AI.setTab('${tab}')">${labels[tab]}</button>`;
    });
    h += '</div></div>';

    // Provider & Model selector
    h += '<div style="padding:4px 14px;display:flex;gap:6px;align-items:center;">';
    h += '<select style="flex:1;padding:3px 6px;border-radius:4px;border:1px solid var(--brd);background:var(--bg3);color:var(--tx2);font-size:11px;font-family:inherit;" onchange="App.AI.setProvider(this.value);App.AI.renderPanel();">';
    Object.entries(PROVIDERS).forEach(([k,v]) => {
      h += `<option value="${k}"${_provider===k?' selected':''}>${v.name}</option>`;
    });
    h += '</select>';
    h += '<select style="flex:1;padding:3px 6px;border-radius:4px;border:1px solid var(--brd);background:var(--bg3);color:var(--tx2);font-size:11px;font-family:inherit;" onchange="App.AI.setModel(this.value);">';
    PROVIDERS[_provider].models.forEach(m => {
      h += `<option value="${m.id}"${_model===m.id?' selected':''}>${m.label}</option>`;
    });
    h += '</select>';
    h += '</div>';

    h += '<div style="padding:8px 14px;overflow-y:auto;flex:1;">';

    if(_aiTab === 'write') {
      h += _renderWriteTab(P);
    } else if(_aiTab === 'analysis') {
      h += _renderAnalysisTab(P);
    } else if(_aiTab === 'summary') {
      h += _renderSummaryTab(P);
    } else if(_aiTab === 'chat') {
      h += _renderChatTab(P);
    }

    h += '<div id="aiResponseArea"></div>';
    h += '</div>';
    rp.innerHTML = h;
  }

  function _renderWriteTab(P) {
    let h = '';
    const activeId = App.Screenplay && App.Screenplay.getActiveSceneId ? App.Screenplay.getActiveSceneId() : null;
    if(activeId) {
      const sc = S.getScene(activeId);
      if(sc) {
        h += `<div style="font-size:11px;color:var(--tx3);margin-bottom:8px;">Aktif Sahne: <strong style="color:var(--tx)">${U.escHtml(sc.title||'İsimsiz')}</strong></div>`;
      }
      h += `<button class="ai-feature-btn" onclick="App.AI.generateDialogue('${activeId}')" ${_streaming?'disabled':''}><span style="color:var(--purple)">✦</span> Diyalog Oluştur</button>`;
      h += `<button class="ai-feature-btn" onclick="App.AI.writeSceneDescription('${activeId}')" ${_streaming?'disabled':''}><span style="color:var(--purple)">✦</span> Sahne Açıklaması Yaz</button>`;
      h += `<button class="ai-feature-btn" onclick="App.AI.continueScreenplay('${activeId}')" ${_streaming?'disabled':''}><span style="color:var(--purple)">✦</span> Devam Ettir</button>`;
    } else {
      h += '<div style="font-size:12px;color:var(--tx3);padding:20px 0;text-align:center;">Yazım özelliklerini kullanmak için sol panelden bir sahne seçin.</div>';
    }
    return h;
  }

  function _renderAnalysisTab(P) {
    let h = '';
    h += `<button class="ai-feature-btn" onclick="App.AI.analyzeConsistency()" ${_streaming?'disabled':''}><span style="color:var(--purple)">✦</span> Tutarlılık Analizi</button>`;
    h += `<button class="ai-feature-btn" onclick="App.AI.analyzeTempoSuggestions()" ${_streaming?'disabled':''}><span style="color:var(--purple)">✦</span> Tempo & Ritim Analizi</button>`;

    if(P.characters && P.characters.length) {
      h += '<div style="margin-top:10px;"><label style="font-size:11px;color:var(--tx3);display:block;margin-bottom:4px;">Karakter Gelişim Önerisi:</label>';
      h += '<div style="display:flex;gap:4px;flex-wrap:wrap;">';
      P.characters.forEach(ch => {
        h += `<button class="btn btn-s" onclick="App.AI.suggestCharacterDevelopment('${ch.id}')" ${_streaming?'disabled':''}>${U.escHtml(ch.name)}</button>`;
      });
      h += '</div></div>';
    }
    return h;
  }

  function _renderSummaryTab(P) {
    let h = '';
    if(P.episodes && P.episodes.length) {
      h += '<label style="font-size:11px;color:var(--tx3);display:block;margin-bottom:4px;">Bölüm Özeti:</label>';
      h += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px;">';
      P.episodes.forEach(ep => {
        h += `<button class="btn btn-s" onclick="App.AI.summarizeEpisode('${ep.id}')" ${_streaming?'disabled':''}>Bölüm ${ep.number}</button>`;
      });
      h += '</div>';
    }

    if(P.characters && P.characters.length) {
      h += '<label style="font-size:11px;color:var(--tx3);display:block;margin-bottom:4px;">Karakter Arkı Özeti:</label>';
      h += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px;">';
      P.characters.forEach(ch => {
        h += `<button class="btn btn-s" onclick="App.AI.summarizeCharacterArc('${ch.id}')" ${_streaming?'disabled':''}>${U.escHtml(ch.name)}</button>`;
      });
      h += '</div>';
    }

    h += `<button class="ai-feature-btn" onclick="App.AI.generateProjectOverview()" ${_streaming?'disabled':''}><span style="color:var(--purple)">✦</span> Proje Genel Bakış (Pitch)</button>`;
    return h;
  }

  function _renderChatTab(P) {
    let h = '';
    // Message history display
    if(_history.length) {
      h += '<div style="max-height:250px;overflow-y:auto;margin-bottom:8px;" id="aiChatHistory">';
      _history.forEach(msg => {
        h += `<div class="ai-msg ${msg.role}">`;
        if(msg.role === 'user') h += '<strong>Siz:</strong> ';
        h += U.escHtml(msg.content).substring(0, 500);
        if(msg.content.length > 500) h += '...';
        h += '</div>';
      });
      h += '</div>';
    }
    h += '<textarea id="aiChatInput" placeholder="Projeniz hakkında soru sorun..." style="width:100%;min-height:60px;padding:8px;border-radius:var(--radius);border:1px solid var(--brd);background:var(--bg);color:var(--tx);font-family:inherit;font-size:12px;resize:vertical;outline:none;"></textarea>';
    h += '<div style="display:flex;justify-content:space-between;margin-top:6px;">';
    h += '<button class="btn btn-s" onclick="App.AI.clearHistory();App.AI.renderPanel();" style="color:var(--tx3)">Temizle</button>';
    h += `<button class="btn btn-s btn-p" onclick="App.AI.sendChat(document.getElementById('aiChatInput').value);document.getElementById('aiChatInput').value='';" ${_streaming?'disabled':''}>Gönder</button>`;
    h += '</div>';
    return h;
  }

  function clearHistory() { _history.length = 0; }

  function setTab(tab) {
    _aiTab = tab;
    renderPanel();
  }

  function _onProviderChange(val) {
    setProvider(val);
    const modelSel = document.getElementById('sAIModel');
    if(modelSel) {
      modelSel.innerHTML = '';
      PROVIDERS[_provider].models.forEach(m => {
        modelSel.innerHTML += `<option value="${m.id}"${m.id===_model?' selected':''}>${m.label}</option>`;
      });
    }
    // Update key field
    const keyInp = document.getElementById('sAIKey');
    if(keyInp) {
      const k = getKey();
      keyInp.value = k ? '********' : '';
    }
    const res = document.getElementById('aiTestResult');
    if(res) res.textContent = '';
  }

  return {
    PROVIDERS, isConfigured, getProvider, setProvider, getModel, setModel,
    getKey, setKey, validateKey, renderPanel, setTab, cancelRequest,
    generateDialogue, writeSceneDescription, continueScreenplay,
    analyzeConsistency, suggestCharacterDevelopment, analyzeTempoSuggestions,
    summarizeEpisode, summarizeCharacterArc, generateProjectOverview,
    sendChat, clearHistory,
    _onProviderChange, _testKey, _applyToScene, _replaceScene, _copyToClipboard
  };
})();
