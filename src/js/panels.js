// ═══ PANELS MODULE ═══
App.Panels = (function(){
  const U = App.Utils;
  const S = App.Store;
  let currentPanel = null; // 'edit','warn','analysis'
  let editId = null;
  let analysisTab = 'warn';
  let activeWarnIdx = -1;

  function togglePanel(name) {
    if(currentPanel === name) { closeAll(); return; }
    currentPanel = name;
    renderPanel();
  }

  function closeAll() {
    currentPanel = null; editId = null; activeWarnIdx = -1;
    if(App.Notes) App.Notes.setPanelOpen(false);
    U.$('rPanel').classList.remove('open');
    App.Timeline.clrHL();
  }

  function renderPanel() {
    const rp = U.$('rPanel');
    rp.classList.add('open');
    if(currentPanel === 'edit') renderEditPanel();
    else if(currentPanel === 'warn') renderWarnPanel();
    else if(currentPanel === 'analysis') renderAnalysisPanel();
    else if(currentPanel === 'changelog') App.Changelog.renderPanel();
    else if(currentPanel === 'notes') { App.Notes.setPanelOpen(true); App.Notes.renderPanel(); }
    else if(currentPanel === 'ai') { if(App.AI) App.AI.renderPanel(); }
    else if(currentPanel === 'review') { if(App.Review) App.Review.renderReviewPanel(); }
    else if(currentPanel === 'corkboard') { /* keep existing corkboard panel content */ }
    else if(currentPanel === 'relmap') { /* keep existing relmap panel content */ }
    else { rp.classList.remove('open'); }
  }

  // ── EDIT PANEL ──
  function openEditEvent(id) {
    editId = id; currentPanel = 'edit';
    renderPanel();
  }

  function renderEditPanel() {
    const P = S.get();
    const ev = S.getEvent(editId);
    if(!ev) { closeAll(); return; }
    const rp = U.$('rPanel');
    const cns = S.getConnections(editId);
    const tl = { neden:'Neden-Sonuç', karakter:'Karakter', kronoloji:'Kronoloji' };
    rp.innerHTML = `<div class="rpanel-hdr"><h3>Olay Düzenle</h3><button class="close-btn" onclick="App.Panels.closeAll()">✕</button></div>
      <div class="rpanel-body" style="padding:14px;">
        <div class="fg"><label>Başlık</label><input id="dT" value="${U.escHtml(ev.title)}"></div>
        <div class="fg"><label>Özet</label><textarea id="dD">${U.escHtml(ev.description||'')}</textarea></div>
        <div class="fg"><label>Senaryo Metni <span style="color:var(--tx4);text-transform:none;font-weight:400">— karakter için <b style="color:var(--cyan)">@</b></span></label>
          <div class="scene-screenplay-wrap">
            <div class="scene-screenplay" id="dScreenplay" contenteditable="true" data-placeholder="Sahne metnini yazın..." style="min-height:120px;max-height:250px;"></div>
            <div class="mention-popup" id="dMentionPopup"></div>
          </div>
        </div>
        <div class="fg"><label>Bölüm</label><select id="dEp">${P.episodes.map(ep=>`<option value="${ep.id}"${ev.episodeId===ep.id?' selected':''}>${U.epLbl(ep.number)}</option>`).join('')}</select></div>
        <div class="fg"><label>Hikaye Tarihi</label><input type="date" id="dStoryDate" value="${U.escHtml(ev.storyDate||'')}"><div style="font-size:10px;color:var(--tx4);margin-top:2px;">(Boş bırakılırsa bölüm tarihi kullanılır)</div></div>
        <div class="fg"><label>Kategori</label><select id="dC">${Object.entries(P.categories).map(([k,v])=>`<option value="${k}"${ev.category===k?' selected':''}>${U.escHtml(v.label)}</option>`).join('')}</select></div>
        <div class="fg"><label>Başlangıç (sn)</label><input type="number" id="dS" value="${Math.round(ev.s)}" min="0" max="${S.getEPDUR()}"></div>
        <div class="fg"><label>Süre (sn)</label><input type="number" id="dDur" value="${Math.round(ev.dur)}" min="60"></div>
        <div class="fg"><label>Karakterler</label><div class="chw">${P.characters.map(c=>`<label class="chcb"><input type="checkbox" value="${c.id}"${(ev.characters||[]).includes(c.id)?' checked':''}>${U.escHtml(c.name)}</label>`).join('')}</div></div>
        <div class="epc"><label style="font-size:10px;color:var(--tx3);text-transform:uppercase;font-weight:500">Bağlantılar (${cns.length})</label>
          ${cns.map(c=>{const o=c.from===editId?S.getEvent(c.to):S.getEvent(c.from);return `<div class="eci"><span>${c.from===editId?'→':'←'} ${o?U.escHtml(o.title):'?'} (${tl[c.type]||c.type})</span><button class="btn btn-s" style="color:var(--red)" onclick="App.Panels.rmCn('${c.from}','${c.to}','${c.type}')">✕</button></div>`;}).join('')}
          <button class="btn btn-s" style="margin-top:6px" onclick="App.Panels.openAddConnection('${editId}')">+ Bağlantı</button>
        </div>
      </div>
      <div class="epf">
        <button class="btn" style="color:var(--red)" onclick="App.Panels.delEvent('${editId}')">Sil</button>
        <div style="flex:1"></div>
        <button class="btn" onclick="App.Panels.closeAll()">İptal</button>
        <button class="btn btn-p" onclick="App.Panels.saveEvent('${editId}')">Kaydet</button>
      </div>`;
    setTimeout(() => {
      const el = document.getElementById('dScreenplay');
      if(!el) return;
      // Load existing screenplay if event has a scene
      if(ev.sceneId) {
        const sc = S.getScene(ev.sceneId);
        if(sc && sc.screenplay) {
          el.innerHTML = App.Screenplay.formatScreenplayHTML(ev.sceneId, sc.screenplay);
        }
      }
      el.addEventListener('input', () => _editMention.handleInput());
      el.addEventListener('keydown', (e) => _editMention.handleKeydown(e));
    }, 50);
  }

  function saveEvent(id) {
    const ev = S.getEvent(id); if(!ev) return;
    S.snapshot();
    ev.title = U.validateText(document.getElementById('dT').value.trim(), 'title') || ev.title;
    ev.description = U.validateText(document.getElementById('dD').value.trim(), 'description');
    ev.episodeId = document.getElementById('dEp').value;
    ev.category = document.getElementById('dC').value;
    ev.storyDate = (document.getElementById('dStoryDate').value||'').trim() || null;
    ev.s = Math.max(0, parseInt(document.getElementById('dS').value) || 0);
    ev.dur = Math.max(60, parseInt(document.getElementById('dDur').value) || 120);
    ev.characters = [];
    document.querySelectorAll('#rPanel .chcb input:checked').forEach(cb => ev.characters.push(cb.value));
    // Save screenplay text
    const { text: screenplay, chars: mentionChars } = getEditScreenplayText();
    mentionChars.forEach(cid => { if(!ev.characters.includes(cid)) ev.characters.push(cid); });
    if(ev.sceneId) {
      const sc = S.getScene(ev.sceneId);
      if(sc) {
        sc.screenplay = screenplay;
        sc.title = ev.title;
        sc.category = ev.category;
        sc.episodeId = ev.episodeId;
        sc.characters = ev.characters.slice();
      }
    } else if(screenplay.trim()) {
      // Create new scene for this event
      const P = S.get();
      const existing = P.scenes.filter(s => s.episodeId === ev.episodeId);
      const order = existing.length ? Math.max(...existing.map(s=>s.order)) + 1 : 1;
      const scId = U.genId('sc');
      P.scenes.push({
        id: scId, episodeId: ev.episodeId, order, title: ev.title, location: '', timeOfDay: '',
        category: ev.category, characters: ev.characters,
        content: [{ type: 'action', text: screenplay.replace(/@\[[^\]]+\]\([^)]+\)/g, m => '@' + m.match(/@\[([^\]]+)\]/)[1]) }],
        screenplay: screenplay
      });
      ev.sceneId = scId;
    }
    S.markDirty(['events','scenes']);
    S.emit('change', {type:'updateEvent',targetId:ev.id,targetName:ev.title||''});
    closeAll();
    App.UI.toast('"' + ev.title + '" güncellendi');
  }

  function delEvent(id) {
    const ev = S.getEvent(id);
    if(!ev || !confirm('"' + ev.title + '" silinsin mi?')) return;
    S.removeEvent(id);
    closeAll();
    App.UI.toast('Silindi');
  }

  function rmCn(f,t,tp) { S.removeConnection(f,t,tp); if(editId) renderPanel(); App.UI.toast('Bağlantı kaldırıldı'); }

  function openAddConnection(fromId) {
    const P = S.get();
    const others = P.events.filter(e => e.id !== fromId);
    App.UI.openModal(`<div class="mh"><span>Bağlantı Ekle</span><button class="close-btn" onclick="App.UI.closeModal()">✕</button></div>
      <div class="mb">
        <div class="fg"><label>Hedef</label><select id="cTo">${others.map(e=>`<option value="${e.id}">${U.epLbl(P.episodes.find(ep=>ep.id===e.episodeId)?.number||'?')}: ${U.escHtml(e.title)}</option>`).join('')}</select></div>
        <div class="fg"><label>Tür</label><select id="cTp"><option value="neden">Neden-Sonuç</option><option value="karakter">Karakter</option><option value="kronoloji">Kronoloji</option></select></div>
      </div>
      <div class="mf"><button class="btn" onclick="App.UI.closeModal()">İptal</button><button class="btn btn-p" onclick="App.Panels.doAddConnection('${fromId}')">Ekle</button></div>`);
  }

  function doAddConnection(fromId) {
    const to = document.getElementById('cTo').value;
    const type = document.getElementById('cTp').value;
    S.addConnection({ id: U.genId('cn'), from: fromId, to, type, description:'', strength:1 });
    App.UI.closeModal();
    if(editId) renderPanel();
    App.UI.toast('Bağlantı eklendi');
  }

  // ── ADD EVENT ──
  // Use shared mention helper for modal and edit panel
  const _modalMention = App.Mention.createInstance({
    getInputEl: () => document.getElementById('nScreenplay'),
    getPopupEl: () => document.getElementById('nMentionPopup'),
    buildItemHtml: (c, i) => `<div class="mp-item${i===0?' active':''}" data-cid="${c.id}" data-name="${U.escHtml(c.name)}" onmousedown="event.preventDefault();App.Panels.insertModalMention('${c.id}')"><span class="mp-dot" style="background:${U.sanitizeColor(c.color)||'var(--tx3)'}"></span>${U.escHtml(c.name)}</div>`,
    onInsert: (charId) => { const cb = document.querySelector('#mbg .chcb input[value="' + charId + '"]'); if(cb) cb.checked = true; }
  });

  function openAddEvent(epId) {
    const P = S.get();
    if(!P.episodes.length) { App.UI.toast('Önce bir bölüm ekleyin'); return; }
    const defaultEp = epId || P.episodes[0].id;
    App.UI.openModal(`<div class="mh"><span>Yeni Olay</span><button class="close-btn" onclick="App.UI.closeModal()">✕</button></div>
      <div class="mb">
        <div class="fg"><label>Başlık</label><input id="nT" placeholder="Olay başlığı"></div>
        <div class="fg"><label>Bölüm</label><select id="nEp">${P.episodes.map(ep=>`<option value="${ep.id}"${ep.id===defaultEp?' selected':''}>${U.epLbl(ep.number)}</option>`).join('')}</select></div>
        <div class="fg"><label>Hikaye Tarihi</label><input type="date" id="nStoryDate"><div style="font-size:10px;color:var(--tx4);margin-top:2px;">(Boş bırakılırsa bölüm tarihi kullanılır)</div></div>
        <div class="fg"><label>Kategori</label><select id="nC">${Object.entries(P.categories).map(([k,v])=>`<option value="${k}">${U.escHtml(v.label)}</option>`).join('')}</select></div>
        <div style="display:flex;gap:8px"><div class="fg" style="flex:1"><label>Başlangıç (dk)</label><input type="number" id="nS" value="0" min="0" max="${Math.floor(S.getEPDUR()/60)}"></div>
        <div class="fg" style="flex:1"><label>Süre (dk)</label><input type="number" id="nDur" value="3" min="1" max="${Math.floor(S.getEPDUR()/60)}"></div></div>
        <div class="fg"><label>Özet</label><textarea id="nDesc" placeholder="Kısa açıklama..." rows="2" style="resize:vertical"></textarea></div>
        <div class="fg"><label>Senaryo Metni <span style="color:var(--tx4);text-transform:none;font-weight:400">— karakter eklemek için <b style="color:var(--cyan)">@</b> yazın</span></label>
          <div class="scene-screenplay-wrap">
            <div class="scene-screenplay" id="nScreenplay" contenteditable="true" data-placeholder="Sahne metnini yazın... Karakter için @ kullanın." style="min-height:150px;max-height:300px;"></div>
            <div class="mention-popup" id="nMentionPopup"></div>
          </div>
        </div>
      </div>
      <div class="mf"><button class="btn" onclick="App.UI.closeModal()">İptal</button><button class="btn btn-p" onclick="App.Panels.doAddEvent()">Ekle</button></div>`);
    // Setup mention listeners for modal (uses shared App.Mention)
    setTimeout(() => {
      const el = document.getElementById('nScreenplay');
      if(!el) return;
      el.addEventListener('input', () => _modalMention.handleInput());
      el.addEventListener('keydown', (e) => _modalMention.handleKeydown(e));
    }, 50);
  }

  function insertModalMention(charId) { _modalMention.insertMention(charId); }

  function getModalScreenplayText() {
    const el = document.getElementById('nScreenplay');
    if(!el) return { text: '', chars: [] };
    let text = '';
    const chars = [];
    el.childNodes.forEach(node => {
      if(node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if(node.classList && node.classList.contains('mention')) {
        const cid = node.dataset.charId;
        const name = node.textContent.replace(/^@/, '');
        text += `@[${name}](${cid})`;
        if(cid && !chars.includes(cid)) chars.push(cid);
      } else if(node.tagName === 'BR') {
        text += '\n';
      } else if(node.tagName === 'DIV' || node.tagName === 'P') {
        if(text && !text.endsWith('\n')) text += '\n';
        text += node.textContent || '';
      } else {
        text += node.textContent || '';
      }
    });
    return { text, chars };
  }

  // ── EDIT PANEL MENTION SUPPORT (uses shared App.Mention) ──
  const _editMention = App.Mention.createInstance({
    getInputEl: () => document.getElementById('dScreenplay'),
    getPopupEl: () => document.getElementById('dMentionPopup'),
    buildItemHtml: (c, i) => `<div class="mp-item${i===0?' active':''}" data-cid="${c.id}" data-name="${U.escHtml(c.name)}" onmousedown="event.preventDefault();App.Panels.insertEditMention('${c.id}')"><span class="mp-dot" style="background:${U.sanitizeColor(c.color)||'var(--tx3)'}"></span>${U.escHtml(c.name)}</div>`,
    onInsert: (charId) => { const cb = document.querySelector('#rPanel .chcb input[value="' + charId + '"]'); if(cb) cb.checked = true; }
  });

  function insertEditMention(charId) { _editMention.insertMention(charId); }

  function getEditScreenplayText() {
    const el = document.getElementById('dScreenplay');
    if(!el) return { text: '', chars: [] };
    let text = '';
    const chars = [];
    el.childNodes.forEach(node => {
      if(node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if(node.classList && node.classList.contains('mention')) {
        const cid = node.dataset.charId;
        const name = node.textContent.replace(/^@/, '');
        text += `@[${name}](${cid})`;
        if(cid && !chars.includes(cid)) chars.push(cid);
      } else if(node.tagName === 'BR') {
        text += '\n';
      } else if(node.tagName === 'DIV' || node.tagName === 'P') {
        if(text && !text.endsWith('\n')) text += '\n';
        text += node.textContent || '';
      } else {
        text += node.textContent || '';
      }
    });
    return { text, chars };
  }

  function doAddEvent() {
    let t = document.getElementById('nT').value.trim();
    if(!t) { App.UI.toast('Başlık gerekli!'); return; }
    t = U.validateText(t, 'title');
    const { text: screenplay, chars: mentionChars } = getModalScreenplayText();
    const ch = [];
    document.querySelectorAll('#mbg .chcb input:checked').forEach(cb => ch.push(cb.value));
    // Merge mention chars
    mentionChars.forEach(cid => { if(!ch.includes(cid)) ch.push(cid); });
    const ozet = U.validateText((document.getElementById('nDesc').value || '').trim(), 'description');
    const epId = document.getElementById('nEp').value;
    const cat = document.getElementById('nC').value;
    const sVal = (parseInt(document.getElementById('nS').value) || 0) * 60;
    const durVal = (parseInt(document.getElementById('nDur').value) || 3) * 60;
    // Plain text for description (strip mention markers)
    const desc = screenplay.replace(/@\[[^\]]+\]\([^)]+\)/g, m => '@' + m.match(/@\[([^\]]+)\]/)[1]);
    // Create scene + event
    const P = S.get();
    const existing = P.scenes.filter(s => s.episodeId === epId);
    const order = existing.length ? Math.max(...existing.map(s=>s.order)) + 1 : 1;
    const scId = U.genId('sc');
    const evId = U.genId('ev');
    S.snapshot();
    P.scenes.push({
      id: scId, episodeId: epId, order, title: t, location: '', timeOfDay: '',
      category: cat, characters: ch,
      content: [{ type: 'action', text: desc }],
      screenplay: screenplay
    });
    const storyDate = (document.getElementById('nStoryDate').value||'').trim() || null;
    P.events.push({
      id: evId, title: t, description: ozet, episodeId: epId, category: cat,
      characters: ch, sceneId: scId, s: sVal, dur: durVal, storyDate: storyDate
    });
    S.markDirty(['events','scenes']);
    S.emit('change', {type:'addEvent',targetId:evId,targetName:t});
    App.UI.closeModal();
    App.UI.toast('"' + t + '" eklendi');
  }

  // ── WARN PANEL ──
  function renderWarnPanel() {
    const warns = App.Analysis.getWarnings();
    const rp = U.$('rPanel');
    const icons = { overflow:'⏱', dep:'⛓', overlap:'⊘', gap:'◌', charConflict:'👤', orphan:'🔗', cycle:'🔄', empty:'📝', duration:'⏱', chronoAge:'💀', chronoNegAge:'👶', chronoOrder:'📅', chronoFlashback:'⏪' };
    let h = `<div class="rpanel-hdr"><h3>⚠ Uyarılar <span class="badge">${warns.length}</span></h3><button class="close-btn" onclick="App.Panels.closeAll()">✕</button></div><div class="rpanel-body">`;
    if(!warns.length) h += '<div class="nw">✓ Sorun yok</div>';
    else warns.forEach((w,i) => {
      h += `<div class="wi${activeWarnIdx===i?' active':''}" data-widx="${i}" onclick="App.Panels.toggleWarnHL(${i})">
        <div class="wt">${icons[w.tp]||'⚠'} ${U.escHtml(w.t)}</div><div class="wd">${U.escHtml(w.d)}</div>
        ${w.fix?`<div class="wf"><button class="btn btn-s" onclick="event.stopPropagation();App.Analysis.getWarnings()[${i}].fix()">Otomatik Düzelt</button></div>`:''}</div>`;
    });
    h += '</div>';
    rp.innerHTML = h;
  }

  function toggleWarnHL(idx) {
    if(activeWarnIdx === idx) { activeWarnIdx = -1; App.Timeline.clrHL(); renderPanel(); return; }
    activeWarnIdx = idx;
    App.Timeline.clrHL();
    const w = App.Analysis.getWarnings()[idx];
    if(!w) return;
    const ids = []; if(w.id) ids.push(w.id); if(w.id2) ids.push(w.id2);
    document.querySelectorAll('.evb').forEach(el => {
      if(ids.includes(el.dataset.id)) el.classList.add('warn-hl'); else el.classList.add('dim');
    });
    if(ids.length) App.Timeline.scrollToEvent(ids[0]);
    renderPanel();
  }

  // ── ANALYSIS PANEL ──
  function renderAnalysisPanel() {
    const rp = U.$('rPanel');
    let h = `<div class="rpanel-hdr"><h3>◎ Analiz</h3><button class="close-btn" onclick="App.Panels.closeAll()">✕</button></div>`;
    h += `<div class="rtabs">
      <button class="rtab${analysisTab==='warn'?' active':''}" onclick="App.Panels.setAnalysisTab('warn')">Uyarılar</button>
      <button class="rtab${analysisTab==='connections'?' active':''}" onclick="App.Panels.setAnalysisTab('connections')">Bağlantılar</button>
      <button class="rtab${analysisTab==='tempo'?' active':''}" onclick="App.Panels.setAnalysisTab('tempo')">Tempo</button>
      <button class="rtab${analysisTab==='chars'?' active':''}" onclick="App.Panels.setAnalysisTab('chars')">Karakterler</button>
      <button class="rtab${analysisTab==='impact'?' active':''}" onclick="App.Panels.setAnalysisTab('impact')">Etki</button>
      <button class="rtab${analysisTab==='relations'?' active':''}" onclick="App.Panels.setAnalysisTab('relations')">İlişkiler</button>
    </div>`;
    h += '<div class="rpanel-body">';
    if(analysisTab === 'warn') h += renderWarnContent();
    else if(analysisTab === 'connections') h += App.Analysis.renderConnections();
    else if(analysisTab === 'tempo') h += App.Analysis.renderTempo();
    else if(analysisTab === 'chars') h += App.Analysis.renderCharacters();
    else if(analysisTab === 'impact') h += App.Analysis.renderImpact();
    else if(analysisTab === 'relations') h += _renderRelationsAnalysis();
    h += '</div>';
    rp.innerHTML = h;
  }

  function renderWarnContent() {
    const warns = App.Analysis.getWarnings();
    const icons = { overflow:'⏱', dep:'⛓', overlap:'⊘', gap:'◌', charConflict:'👤', orphan:'🔗', cycle:'🔄', empty:'📝', duration:'⏱', chronoAge:'💀', chronoNegAge:'👶', chronoOrder:'📅', chronoFlashback:'⏪' };
    if(!warns.length) return '<div class="nw">✓ Sorun yok</div>';
    return warns.map((w,i) => `<div class="wi" onclick="App.Panels.toggleWarnHL(${i})">
      <div class="wt">${icons[w.tp]||'⚠'} ${U.escHtml(w.t)}</div><div class="wd">${U.escHtml(w.d)}</div>
      ${w.fix?`<div class="wf"><button class="btn btn-s" onclick="event.stopPropagation();App.Analysis.getWarnings()[${i}].fix()">Düzelt</button></div>`:''}</div>`).join('');
  }

  function setAnalysisTab(tab) { analysisTab = tab; renderPanel(); }
  function isImpactActive() { return currentPanel === 'analysis' && analysisTab === 'impact'; }

  function _renderRelationsAnalysis() {
    const P = S.get();
    const chars = P.characters;
    const rels = P.characterRelationships || [];
    if(!rels.length) return '<div class="nw">Henüz karakter ilişkisi yok.<br>İlişkiler görünümünden ekleyin.</div>';
    let h = '<div style="padding:14px;">';
    // Summary
    h += '<div style="font-size:12px;color:var(--tx2);margin-bottom:12px;">' + rels.length + ' ilişki, ' + chars.length + ' karakter</div>';
    // Type distribution
    const types = {};
    rels.forEach(r => { types[r.type || 'diğer'] = (types[r.type || 'diğer'] || 0) + 1; });
    h += '<div style="margin-bottom:12px;">';
    Object.entries(types).forEach(([t, c]) => {
      h += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:11px;">';
      h += '<span style="flex:1;color:var(--tx);">' + U.escHtml(t) + '</span>';
      h += '<span style="color:var(--tx3);">' + c + '</span>';
      h += '</div>';
    });
    h += '</div>';
    // Most connected characters
    const charCounts = {};
    rels.forEach(r => { charCounts[r.from] = (charCounts[r.from] || 0) + 1; charCounts[r.to] = (charCounts[r.to] || 0) + 1; });
    const sorted = Object.entries(charCounts).sort((a,b) => b[1] - a[1]);
    h += '<div style="font-size:10px;color:var(--tx3);text-transform:uppercase;font-weight:500;margin-bottom:6px;">En bağlantılı karakterler</div>';
    sorted.slice(0, 10).forEach(([cid, count]) => {
      const ch = chars.find(c => c.id === cid);
      h += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:11px;">';
      h += '<span style="flex:1;color:var(--tx);">' + U.escHtml(ch ? ch.name : cid) + '</span>';
      h += '<span style="color:var(--tx3);">' + count + ' ilişki</span>';
      h += '</div>';
    });
    h += '</div>';
    return h;
  }

  // ── SETTINGS ──
  function openSettings() {
    const P = S.get();
    let catsHtml = Object.entries(P.categories).map(([k,v]) =>
      `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
        <input type="color" value="${v.color}" style="width:28px;height:24px;border:none;background:none;cursor:pointer;" data-catk="${k}" class="cat-color-in">
        <input value="${U.escHtml(v.label)}" style="flex:1;padding:4px 6px;border:1px solid var(--brd);background:var(--bg3);color:var(--tx);border-radius:4px;font-size:12px;font-family:inherit;" data-catk="${k}" class="cat-label-in">
        <button class="btn btn-s" style="color:var(--red)" onclick="this.parentNode.remove()">✕</button>
      </div>`).join('');
    let charsHtml = P.characters.map(c =>
      `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;" data-chid="${c.id}">
        <input value="${U.escHtml(c.name)}" style="flex:1;padding:4px 6px;border:1px solid var(--brd);background:var(--bg3);color:var(--tx);border-radius:4px;font-size:12px;font-family:inherit;" class="char-name-in">
        <input type="date" value="${c.birthDate||''}" placeholder="Doğum" title="Doğum Tarihi" style="width:120px;padding:4px 6px;border:1px solid var(--brd);background:var(--bg3);color:var(--tx);border-radius:4px;font-size:11px;font-family:inherit;" class="char-birth-in">
        <input type="date" value="${c.deathDate||''}" placeholder="Ölüm" title="Ölüm Tarihi" style="width:120px;padding:4px 6px;border:1px solid var(--brd);background:var(--bg3);color:var(--tx);border-radius:4px;font-size:11px;font-family:inherit;" class="char-death-in">
        <button class="btn btn-s" style="color:var(--red)" onclick="this.parentNode.remove()">✕</button>
      </div>`).join('');

    App.UI.openModal(`<div class="mh"><span>Proje Ayarları</span><button class="close-btn" onclick="App.UI.closeModal()">✕</button></div>
      <div class="mb">
        <div class="fg"><label>Proje Adı</label><input id="sTitle" value="${U.escHtml(P.meta.title)}"></div>
        <div class="fg"><label>Yazar</label><input id="sAuthor" value="${U.escHtml(P.meta.author||'')}"></div>
        <div class="fg"><label>Bölüm Süresi (saniye)</label><input type="number" id="sEpDur" value="${P.meta.settings.episodeDuration}" min="300" max="7200"></div>
        <div class="fg"><label>Kategoriler</label>
          <div id="sCats">${catsHtml}</div>
          <button class="btn btn-s" style="margin-top:4px" onclick="document.getElementById('sCats').insertAdjacentHTML('beforeend','<div style=\\'display:flex;align-items:center;gap:6px;margin-bottom:4px;\\'><input type=\\'color\\' value=\\'#888888\\' style=\\'width:28px;height:24px;border:none;background:none;cursor:pointer;\\' class=\\'cat-color-in\\' data-catk=\\'new_'+Date.now()+'\\'><input placeholder=\\'Yeni Kategori\\' style=\\'flex:1;padding:4px 6px;border:1px solid var(--brd);background:var(--bg3);color:var(--tx);border-radius:4px;font-size:12px;font-family:inherit;\\' class=\\'cat-label-in\\' data-catk=\\'new_'+Date.now()+'\\'><button class=\\'btn btn-s\\' style=\\'color:var(--red)\\' onclick=\\'this.parentNode.remove()\\'>✕</button></div>')">+ Kategori</button>
        </div>
        <div class="fg"><label>Karakterler</label>
          <div id="sChars">${charsHtml}</div>
          <button class="btn btn-s" style="margin-top:4px" onclick="document.getElementById('sChars').insertAdjacentHTML('beforeend','<div style=\\'display:flex;align-items:center;gap:6px;margin-bottom:4px;\\' data-chid=\\'new_'+Date.now()+'\\'><input placeholder=\\'Yeni Karakter\\' style=\\'flex:1;padding:4px 6px;border:1px solid var(--brd);background:var(--bg3);color:var(--tx);border-radius:4px;font-size:12px;font-family:inherit;\\' class=\\'char-name-in\\'><input type=\\'date\\' title=\\'Doğum Tarihi\\' style=\\'width:120px;padding:4px 6px;border:1px solid var(--brd);background:var(--bg3);color:var(--tx);border-radius:4px;font-size:11px;font-family:inherit;\\' class=\\'char-birth-in\\'><input type=\\'date\\' title=\\'Ölüm Tarihi\\' style=\\'width:120px;padding:4px 6px;border:1px solid var(--brd);background:var(--bg3);color:var(--tx);border-radius:4px;font-size:11px;font-family:inherit;\\' class=\\'char-death-in\\'><button class=\\'btn btn-s\\' style=\\'color:var(--red)\\' onclick=\\'this.parentNode.remove()\\'>✕</button></div>')">+ Karakter</button>
        </div>
        <div class="fg"><label>Bölüm Hikaye Tarihleri</label>
          <div id="sEpYears">${P.episodes.map(ep=>`<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;" data-epid="${ep.id}"><span style="min-width:48px;font-size:11px;color:var(--tx2);font-weight:500;">${U.epLbl(ep.number)}</span><input type="date" value="${ep.storyDate||''}" style="flex:1;padding:4px 6px;border:1px solid var(--brd);background:var(--bg3);color:var(--tx);border-radius:4px;font-size:12px;font-family:inherit;" class="ep-year-in"></div>`).join('')}</div>
        </div>
        <div class="ai-config-section">
          <h4 style="font-size:12px;font-weight:600;margin-bottom:8px;color:var(--purple);">✦ AI Yapılandırması</h4>
          <div class="fg"><label>AI Sağlayıcı</label>
            <select id="sAIProvider" onchange="App.AI._onProviderChange(this.value)" style="padding:4px 8px;border-radius:4px;border:1px solid var(--brd);background:var(--bg3);color:var(--tx2);font-size:12px;font-family:inherit;width:100%;">
              ${Object.entries(App.AI.PROVIDERS).map(([k,v])=>'<option value="'+k+'"'+(App.AI.getProvider()===k?' selected':'')+'>'+v.name+'</option>').join('')}
            </select>
          </div>
          <div class="fg"><label>Model</label>
            <select id="sAIModel" onchange="App.AI.setModel(this.value)" style="padding:4px 8px;border-radius:4px;border:1px solid var(--brd);background:var(--bg3);color:var(--tx2);font-size:12px;font-family:inherit;width:100%;">
              ${App.AI.PROVIDERS[App.AI.getProvider()].models.map(m=>'<option value="'+m.id+'"'+(App.AI.getModel()===m.id?' selected':'')+'>'+m.label+'</option>').join('')}
            </select>
          </div>
          <div class="fg"><label>API Anahtarı</label>
            <div style="display:flex;gap:4px;">
              <input type="password" id="sAIKey" placeholder="API anahtarınızı girin" value="${App.AI.getKey()?'********':''}" style="flex:1;padding:4px 8px;border-radius:4px;border:1px solid var(--brd);background:var(--bg3);color:var(--tx);font-size:12px;font-family:inherit;">
              <button class="btn btn-s" id="aiTestBtn" onclick="App.AI._testKey()">Test</button>
            </div>
            <div id="aiTestResult" style="font-size:11px;margin-top:4px;min-height:14px;"></div>
          </div>
          <div style="font-size:10px;color:var(--tx3);margin-top:4px;">🔒 Anahtarınız yalnızca tarayıcınızda (localStorage) saklanır, hiçbir sunucuya gönderilmez.</div>
        </div>
      </div>
      <div class="mf"><button class="btn" onclick="App.UI.closeModal()">İptal</button><button class="btn btn-p" onclick="App.Panels.saveSettings()">Kaydet</button></div>`);
  }

  function saveSettings() {
    const P = S.get();
    S.snapshot();
    P.meta.title = document.getElementById('sTitle').value.trim() || 'Yeni Proje';
    P.meta.author = document.getElementById('sAuthor').value.trim();
    P.meta.settings.episodeDuration = Math.max(300, parseInt(document.getElementById('sEpDur').value) || 2700);
    // Categories
    const newCats = {};
    document.querySelectorAll('#sCats > div').forEach(row => {
      const colorIn = row.querySelector('.cat-color-in');
      const labelIn = row.querySelector('.cat-label-in');
      if(colorIn && labelIn && labelIn.value.trim()) {
        const key = labelIn.value.trim().toLowerCase().replace(/[^a-zçğıöşü0-9]/gi,'_');
        newCats[key] = { label: labelIn.value.trim(), color: colorIn.value };
      }
    });
    P.categories = newCats;
    // Characters
    const newChars = [];
    document.querySelectorAll('#sChars > div').forEach(row => {
      const nameIn = row.querySelector('.char-name-in');
      const birthIn = row.querySelector('.char-birth-in');
      const deathIn = row.querySelector('.char-death-in');
      const existingId = row.dataset.chid;
      if(nameIn && nameIn.value.trim()) {
        const id = (existingId && !existingId.startsWith('new_')) ? existingId : U.genId('ch');
        const existing = P.characters.find(c=>c.id===id);
        const birthDate = birthIn && birthIn.value ? birthIn.value : null;
        const deathDate = deathIn && deathIn.value ? deathIn.value : null;
        newChars.push({ id, name: nameIn.value.trim(), color: existing?.color||'', notes: existing?.notes||'', birthDate, deathDate });
      }
    });
    P.characters = newChars;
    // Episode story years
    document.querySelectorAll('#sEpYears > div').forEach(row => {
      const epId = row.dataset.epid;
      const yearIn = row.querySelector('.ep-year-in');
      const ep = P.episodes.find(e=>e.id===epId);
      if(ep && yearIn) ep.storyDate = yearIn.value || null;
    });
    // AI Settings
    if(App.AI) {
      const provVal = document.getElementById('sAIProvider')?.value;
      const modelVal = document.getElementById('sAIModel')?.value;
      if(provVal) App.AI.setProvider(provVal);
      if(modelVal) App.AI.setModel(modelVal);
      const keyInp = document.getElementById('sAIKey');
      if(keyInp && keyInp.value && keyInp.value !== '********') App.AI.setKey(App.AI.getProvider(), keyInp.value.trim());
    }
    S.markDirty(['categories','characters']);
    S.emit('change', {type:'settings'});
    App.UI.closeModal();
    document.getElementById('projTitle').textContent = P.meta.title;
    App.UI.toast('Ayarlar kaydedildi');
  }

  function getCurrentPanel() { return currentPanel; }
  function setCurrentPanel(name) { currentPanel = name; }

  return { togglePanel, closeAll, openEditEvent, saveEvent, delEvent, rmCn, openAddConnection, doAddConnection, openAddEvent, doAddEvent, insertModalMention, insertEditMention, toggleWarnHL, setAnalysisTab, renderPanel, openSettings, saveSettings, renderWarnPanel, renderAnalysisPanel, isImpactActive, getCurrentPanel, setCurrentPanel };
})();