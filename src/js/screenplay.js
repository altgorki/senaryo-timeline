// ═══ SCREENPLAY MODULE ═══
App.Screenplay = (function(){
  const U = App.Utils;
  const S = App.Store;
  let openEps = new Set();
  let activeSceneId = null;

  function render() {
    const P = S.get();
    const cont = U.$('spEpisodes');
    if(!P.episodes.length) {
      cont.innerHTML = '<div style="padding:20px;text-align:center;color:var(--tx4);font-size:12px;line-height:1.6;">Henüz bölüm yok.<br>Yukarıdan <b>+ Bölüm</b> ekleyin veya<br><b>Demo Proje</b> yükleyin.</div>';
      return;
    }
    let h = '';
    P.episodes.forEach(ep => {
      const scenes = S.getScenes(ep.id);
      const isOpen = openEps.has(ep.id);
      const sceneCount = scenes.length;
      const totalDur = P.events.filter(e=>e.episodeId===ep.id).reduce((s,e)=>s+e.dur,0);
      h += `<div class="ep-tree">
        <div class="ep-tree-hdr" onclick="App.Screenplay.toggleEp('${ep.id}')">
          <span class="arrow${isOpen?' open':''}">▶</span>
          <div class="ep-info">
            <span class="ep-num">Bölüm ${ep.number}</span>
            <span class="ep-title">${U.escHtml(ep.title||'')}</span>
          </div>
          <span class="ep-meta">${sceneCount} sahne · ${U.s2t(totalDur)}</span>
        </div>
        <div class="ep-tree-body${isOpen?' open':''}">`;
      scenes.forEach((sc, idx) => {
        const isActive = sc.id === activeSceneId;
        const catObj = P.categories[sc.category]||{color:'#888',label:'?'};
        const charNames = (sc.characters||[]).map(cid=>{const c=P.characters.find(x=>x.id===cid);return c?c.name[0]:'?';});
        h += `<div class="scene-card${isActive?' active expanded':''}" data-sid="${sc.id}">
          <div class="scene-card-hdr" onclick="App.Screenplay.selectScene('${sc.id}')">
            <span class="scene-card-title">${idx+1}. ${U.escHtml(sc.title||'Adsız Sahne')}</span>
            <div class="scene-card-badges">
              ${sc.location?'<span class="scene-card-badge">'+U.escHtml(sc.location)+'</span>':''}
              ${sc.timeOfDay?'<span class="scene-card-badge">'+U.escHtml(sc.timeOfDay)+'</span>':''}
              <span class="scene-card-badge" style="color:${U.sanitizeColor(catObj.color)}">${U.escHtml(catObj.label)}</span>
            </div>
          </div>
          <div class="scene-card-chars" onclick="App.Screenplay.selectScene('${sc.id}')">${charNames.map(n=>'<div class="scene-card-char">'+n+'</div>').join('')}</div>
          <div class="scene-card-body">
            ${renderSceneEditor(sc)}
          </div>
        </div>`;
      });
      h += `<button class="add-scene-btn" onclick="event.stopPropagation();App.Screenplay.addScene('${ep.id}')">+ Sahne Ekle</button>`;
      h += '</div></div>';
    });
    cont.innerHTML = h;
  }

  function renderSceneEditor(sc) {
    const P = S.get();
    const content = sc.content || [];
    let h = '<div class="scene-editor">';
    // Scene metadata fields
    const catOpts = Object.entries(P.categories).map(([k,v]) => `<option value="${k}"${k===sc.category?' selected':''}>${U.escHtml(v.label)}</option>`).join('');
    h += `<div class="scene-meta-row">
      <div class="scene-meta-field">
        <label>Başlık</label>
        <input type="text" value="${U.escHtml(sc.title||'')}" onchange="App.Screenplay.saveSceneMeta('${sc.id}','title',this.value)" onclick="event.stopPropagation()" />
      </div>
      <div class="scene-meta-field" style="flex:0 0 110px">
        <label>Kategori</label>
        <select onchange="App.Screenplay.saveSceneMeta('${sc.id}','category',this.value)" onclick="event.stopPropagation()">${catOpts}</select>
      </div>
    </div>
    <div class="scene-meta-row">
      <div class="scene-meta-field">
        <label>Mekan</label>
        <select onchange="App.Screenplay.saveSceneMeta('${sc.id}','location',this.value)" onclick="event.stopPropagation()">
          <option value=""${!sc.location?' selected':''}>—</option>
          <option value="İÇ"${'İÇ'===sc.location?' selected':''}>İÇ</option>
          <option value="DIŞ"${'DIŞ'===sc.location?' selected':''}>DIŞ</option>
          <option value="İÇ/DIŞ"${'İÇ/DIŞ'===sc.location?' selected':''}>İÇ/DIŞ</option>
        </select>
      </div>
      <div class="scene-meta-field">
        <label>Zaman</label>
        <select onchange="App.Screenplay.saveSceneMeta('${sc.id}','timeOfDay',this.value)" onclick="event.stopPropagation()">
          <option value=""${!sc.timeOfDay?' selected':''}>—</option>
          <option value="GÜN"${'GÜN'===sc.timeOfDay?' selected':''}>GÜN</option>
          <option value="GECE"${'GECE'===sc.timeOfDay?' selected':''}>GECE</option>
          <option value="AKŞAM"${'AKŞAM'===sc.timeOfDay?' selected':''}>AKŞAM</option>
          <option value="ŞAFAK"${'ŞAFAK'===sc.timeOfDay?' selected':''}>ŞAFAK</option>
        </select>
      </div>
    </div>`;
    // Character tags
    const scChars = (sc.characters||[]).map(cid => P.characters.find(c=>c.id===cid)).filter(Boolean);
    if(scChars.length) {
      h += '<div class="scene-chars-row">';
      scChars.forEach(c => {
        h += `<span class="scene-char-tag"><span class="mp-dot" style="background:${U.sanitizeColor(c.color)||'var(--tx3)'}"></span>${U.escHtml(c.name)}<span class="remove-char" onclick="event.stopPropagation();App.Screenplay.removeSceneChar('${sc.id}','${c.id}')">✕</span></span>`;
      });
      h += '</div>';
    }
    // Full screenplay text area with @ mention
    const scText = sc.screenplay || '';
    h += `<div class="scene-screenplay-wrap">
      <div class="scene-screenplay-label">Senaryo Metni <span style="color:var(--tx4);font-weight:400;text-transform:none">— karakter eklemek için <b style="color:var(--cyan)">@</b> yazın</span></div>
      <div class="scene-screenplay" contenteditable="true" data-sid="${sc.id}" data-placeholder="Sahne metnini buraya yazın... Karakter eklemek için @ kullanın.">${formatScreenplayHTML(sc.id, scText)}</div>
      <div class="mention-popup" id="mp_${sc.id}"></div>
    </div>`;
    content.forEach((block, bi) => {
      if(block.type === 'action') {
        h += `<div class="scene-block"><div class="scene-block-action" contenteditable="true" data-sid="${sc.id}" data-bi="${bi}" onblur="App.Screenplay.saveBlock('${sc.id}',${bi},this.textContent)">${U.escHtml(block.text||'')}</div></div>`;
      } else if(block.type === 'dialogue') {
        const charSel = P.characters.map(c=>`<option value="${c.id}"${c.id===block.characterId?' selected':''}>${U.escHtml(c.name)}</option>`).join('');
        h += `<div class="scene-block"><div class="scene-block-dialogue">
          <div class="char-line"><select onchange="App.Screenplay.saveBlockChar('${sc.id}',${bi},this.value)">${charSel}</select></div>
          ${block.parenthetical?'<div class="paren">('+U.escHtml(block.parenthetical)+')</div>':''}
          <div class="dial-text" contenteditable="true" data-sid="${sc.id}" data-bi="${bi}" onblur="App.Screenplay.saveBlock('${sc.id}',${bi},this.textContent)">${U.escHtml(block.text||'')}</div>
        </div></div>`;
      } else if(block.type === 'transition') {
        h += `<div class="scene-block"><div class="scene-block-transition" contenteditable="true" onblur="App.Screenplay.saveBlock('${sc.id}',${bi},this.textContent)">${U.escHtml(block.text||'KESME')}</div></div>`;
      }
    });
    h += `<div class="scene-block-acts">
      <button class="btn btn-s" onclick="event.stopPropagation();App.Screenplay.addBlock('${sc.id}','action')">+ Aksiyon</button>
      <button class="btn btn-s" onclick="event.stopPropagation();App.Screenplay.addBlock('${sc.id}','dialogue')">+ Diyalog</button>
      <button class="btn btn-s" onclick="event.stopPropagation();App.Screenplay.addBlock('${sc.id}','transition')">+ Geçiş</button>
      <div style="flex:1"></div>
      <button class="btn btn-s" style="color:var(--red)" onclick="event.stopPropagation();App.Screenplay.deleteScene('${sc.id}')">Sil</button>
    </div>`;
    h += `<div class="scene-block-acts" style="border-top:1px solid var(--brd);padding-top:6px;margin-top:4px;">
      <button class="btn btn-s" style="color:#a855f7" onclick="event.stopPropagation();App.Panels.togglePanel('ai');App.AI.setTab('write');App.AI.generateDialogue('${sc.id}')">✦ Diyalog</button>
      <button class="btn btn-s" style="color:#a855f7" onclick="event.stopPropagation();App.Panels.togglePanel('ai');App.AI.setTab('write');App.AI.writeSceneDescription('${sc.id}')">✦ Sahne</button>
      <button class="btn btn-s" style="color:#a855f7" onclick="event.stopPropagation();App.Panels.togglePanel('ai');App.AI.setTab('write');App.AI.continueScreenplay('${sc.id}')">✦ Devam</button>
    </div>`;
    h += '</div>';
    return h;
  }

  function toggleEp(epId) {
    if(openEps.has(epId)) openEps.delete(epId); else openEps.add(epId);
    render();
  }

  function selectScene(scId) {
    activeSceneId = activeSceneId === scId ? null : scId;
    render();
    // Sync: highlight in timeline or scroll in screenplay editor
    if(App.ScreenplayEditor && App.ScreenplayEditor.isActive()) {
      App.ScreenplayEditor.scrollToScene(scId);
    } else {
      const sc = S.getScene(scId);
      if(sc) {
        const ev = S.get().events.find(e => e.sceneId === scId);
        if(ev) App.Timeline.scrollToEvent(ev.id);
      }
    }
  }

  function addEpisode() {
    const P = S.get();
    const maxNum = P.episodes.reduce((m,e) => typeof e.number==='number'?Math.max(m,e.number):m, 0);
    const newNum = maxNum + 1;
    const ep = { id: U.genId('ep'), number: newNum, title: '', duration: S.getEPDUR(), type:'normal', order: newNum };
    // Set open BEFORE triggering render
    openEps.add(ep.id);
    S.addEpisode(ep);
  }

  function addScene(epId) {
    const P = S.get();
    const existing = S.getScenes(epId);
    const order = existing.length ? Math.max(...existing.map(s=>s.order)) + 1 : 1;
    const sc = {
      id: U.genId('sc'), episodeId: epId, order, title: 'Yeni Sahne', location: '',
      timeOfDay: '', category: 'karakter', characters: [], timelineStart: 0, timelineDuration: 180,
      content: [{ type: 'action', text: '' }]
    };
    // Set active BEFORE triggering renders
    openEps.add(epId);
    activeSceneId = sc.id;
    // Now add to store (triggers render with correct activeSceneId)
    S.snapshot();
    P.scenes.push(sc);
    // Auto-create timeline event without double-render
    const epEvs = P.events.filter(e => e.episodeId === sc.episodeId);
    const lastEnd = epEvs.reduce((m,e) => Math.max(m, e.s + e.dur), 0);
    const dur = calcSceneDuration(sc);
    const s = Math.min(lastEnd + 10, S.getEPDUR() - dur);
    P.events.push({
      id: U.genId('ev'), title: sc.title, description: '', episodeId: sc.episodeId,
      sceneId: sc.id, category: sc.category, characters: sc.characters||[],
      s: Math.max(0, s), dur: dur
    });
    S.markDirty(['scenes','events']);
    S.emit('change', {type:'addScene',targetId:sc.id,targetName:sc.title||''});
    // Focus the first editable block after render
    setTimeout(() => {
      const el = document.querySelector(`[data-sid="${sc.id}"][contenteditable]`);
      if(el) el.focus();
    }, 50);
  }

  function deleteScene(scId) {
    if(!confirm('Bu sahne silinsin mi?')) return;
    S.removeScene(scId);
    if(activeSceneId === scId) activeSceneId = null;
  }

  function addBlock(scId, type) {
    const sc = S.getScene(scId);
    if(!sc) return;
    const block = { type };
    if(type === 'action') block.text = '';
    else if(type === 'dialogue') { block.characterId = ''; block.text = ''; block.parenthetical = ''; }
    else if(type === 'transition') block.text = 'KESME';
    S.snapshot();
    sc.content = sc.content || [];
    sc.content.push(block);
    const bi = sc.content.length - 1;
    updateTimelineDuration(sc);
    S.markDirty('scenes');
    S.emit('change', {type:'updateScene',targetId:scId,targetName:sc.title||''});
    // Focus the new block after render
    setTimeout(() => {
      const blocks = document.querySelectorAll(`[data-sid="${scId}"][contenteditable]`);
      const lastBlock = blocks[blocks.length - 1];
      if(lastBlock) lastBlock.focus();
      // For dialogue, focus the text area not the select
      if(type === 'dialogue') {
        const dialTexts = document.querySelectorAll(`.scene-card.active .dial-text[contenteditable]`);
        const last = dialTexts[dialTexts.length - 1];
        if(last) last.focus();
      }
    }, 50);
  }

  function saveBlock(scId, bi, text) {
    const sc = S.getScene(scId);
    if(!sc || !sc.content[bi]) return;
    if(sc.content[bi].text === text) return;
    S.snapshot();
    sc.content[bi].text = text;
    // Update timeline duration silently (no full re-render to preserve editing)
    updateTimelineDuration(sc);
    // Only update timeline + status, NOT screenplay panel (to preserve focus)
    App.Analysis.invalidateCache();
    App.Timeline.render();
    App.UI.updateStatusBar();
    // Real-time sync handled by App.AutoSave
  }

  function saveSceneMeta(scId, field, value) {
    const sc = S.getScene(scId);
    if(!sc) return;
    if(field === 'title') value = U.validateText(value, 'title');
    if(sc[field] === value) return;
    S.snapshot();
    sc[field] = value;
    // Sync to linked timeline event
    const P = S.get();
    const ev = P.events.find(e => e.sceneId === scId);
    if(ev) {
      if(field === 'title') ev.title = value;
      if(field === 'category') ev.category = value;
    }
    // Re-render timeline + status but NOT screenplay (preserve editing)
    App.Analysis.invalidateCache();
    App.Timeline.render();
    App.UI.updateStatusBar();
    // Update scene card header badges without losing focus
    const card = document.querySelector(`.scene-card[data-sid="${scId}"]`);
    if(card) {
      const catObj = P.categories[sc.category]||{color:'#888',label:'?'};
      const badges = card.querySelector('.scene-card-badges');
      if(badges) {
        badges.innerHTML = `${sc.location?'<span class="scene-card-badge">'+U.escHtml(sc.location)+'</span>':''}${sc.timeOfDay?'<span class="scene-card-badge">'+U.escHtml(sc.timeOfDay)+'</span>':''}<span class="scene-card-badge" style="color:${U.sanitizeColor(catObj.color)}">${U.escHtml(catObj.label)}</span>`;
      }
      if(field === 'title') {
        const titleEl = card.querySelector('.scene-card-title');
        if(titleEl) {
          const idx = titleEl.textContent.match(/^(\d+)\./);
          titleEl.textContent = (idx?idx[0]+' ':'')+value;
        }
      }
    }
    // Real-time sync handled by App.AutoSave
  }

  // ── SCREENPLAY TEXT WITH @ MENTION ──
  let mentionState = null; // { scId, query, range, popupEl }

  function formatScreenplayHTML(scId, text) {
    if(!text) return '';
    const P = S.get();
    // Replace @CharName with mention spans
    return text.replace(/@\[([^\]]+)\]\(([^)]+)\)/g, (m, name, id) => {
      const c = P.characters.find(x => x.id === id);
      const color = c ? U.sanitizeColor(c.color) : 'var(--cyan)';
      return `<span class="mention" contenteditable="false" data-char-id="${id}" style="border-bottom:2px solid ${color}">@${U.escHtml(name)}</span>`;
    });
  }

  function getScreenplayText(el) {
    // Convert DOM back to plain text with mention markers
    let text = '';
    el.childNodes.forEach(node => {
      if(node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if(node.classList && node.classList.contains('mention')) {
        const cid = node.dataset.charId;
        const name = node.textContent.replace(/^@/, '');
        text += `@[${name}](${cid})`;
      } else if(node.tagName === 'BR') {
        text += '\n';
      } else if(node.tagName === 'DIV' || node.tagName === 'P') {
        if(text && !text.endsWith('\n')) text += '\n';
        text += node.textContent || '';
      } else {
        text += node.textContent || '';
      }
    });
    return text;
  }

  function saveScreenplay(scId, el) {
    const sc = S.getScene(scId);
    if(!sc) return;
    let newText = getScreenplayText(el);
    newText = U.validateText(newText, 'screenplay');
    if(sc.screenplay === newText) return;
    S.snapshot();
    sc.screenplay = newText;
    // Extract characters from mentions and sync
    const mentionIds = [];
    el.querySelectorAll('.mention[data-char-id]').forEach(m => {
      const cid = m.dataset.charId;
      if(cid && !mentionIds.includes(cid)) mentionIds.push(cid);
    });
    // Add any mentioned characters not already in scene
    let changed = false;
    sc.characters = sc.characters || [];
    mentionIds.forEach(cid => {
      if(!sc.characters.includes(cid)) { sc.characters.push(cid); changed = true; }
    });
    updateTimelineDuration(sc);
    App.Analysis.invalidateCache();
    App.Timeline.render();
    App.UI.updateStatusBar();
    if(changed) {
      // Update character tags without full re-render
      const P = S.get();
      const card = document.querySelector(`.scene-card[data-sid="${scId}"]`);
      if(card) {
        const charRow = card.querySelector('.scene-chars-row');
        const scChars = (sc.characters||[]).map(cid => P.characters.find(c=>c.id===cid)).filter(Boolean);
        const html = scChars.map(c => `<span class="scene-char-tag"><span class="mp-dot" style="background:${U.sanitizeColor(c.color)||'var(--tx3)'}"></span>${U.escHtml(c.name)}<span class="remove-char" onclick="event.stopPropagation();App.Screenplay.removeSceneChar('${scId}','${c.id}')">✕</span></span>`).join('');
        if(charRow) { charRow.innerHTML = html; }
        else {
          const editor = card.querySelector('.scene-editor');
          if(editor) {
            const row = document.createElement('div');
            row.className = 'scene-chars-row';
            row.innerHTML = html;
            editor.insertBefore(row, editor.querySelector('.scene-screenplay-wrap'));
          }
        }
      }
    }
    // Real-time sync handled by App.AutoSave
  }

  function removeSceneChar(scId, charId) {
    const sc = S.getScene(scId);
    if(!sc) return;
    S.snapshot();
    sc.characters = (sc.characters||[]).filter(c => c !== charId);
    // Also sync to timeline event
    const P = S.get();
    const ev = P.events.find(e => e.sceneId === scId);
    if(ev) ev.characters = sc.characters.slice();
    S.markDirty(['scenes','events']);
    S.emit('change', {type:'updateScene',targetId:scId,targetName:sc.title||''});
  }

  function handleMentionInput(e) {
    const el = e.target.closest('.scene-screenplay');
    if(!el) return;
    const scId = el.dataset.sid;
    const sel = window.getSelection();
    if(!sel.rangeCount) return;

    const range = sel.getRangeAt(0);
    // Get text before cursor in current text node
    if(range.startContainer.nodeType !== Node.TEXT_NODE) { closeMentionPopup(); return; }
    const textBefore = range.startContainer.textContent.substring(0, range.startOffset);
    const atIdx = textBefore.lastIndexOf('@');

    if(atIdx === -1) { closeMentionPopup(); return; }
    // Check no space between @ and cursor (allow Turkish characters)
    const query = textBefore.substring(atIdx + 1);
    if(query.includes(' ') && query.trim().includes(' ')) { closeMentionPopup(); return; }

    const P = S.get();
    const q = query.toLowerCase();
    const matches = P.characters.filter(c => c.name.toLowerCase().includes(q));

    const popup = document.getElementById('mp_' + scId);
    if(!popup) return;

    if(!matches.length) {
      popup.innerHTML = '<div class="mp-empty">Karakter bulunamadı</div>';
      popup.classList.add('open');
      mentionState = { scId, query, textNode: range.startContainer, atIdx, popupEl: popup, matches: [], activeIdx: 0 };
      positionPopup(popup, range);
      return;
    }

    let html = '';
    matches.forEach((c, i) => {
      html += `<div class="mp-item${i===0?' active':''}" data-cid="${c.id}" data-name="${U.escHtml(c.name)}" onmousedown="event.preventDefault();App.Screenplay.insertMention('${scId}','${c.id}')"><span class="mp-dot" style="background:${U.sanitizeColor(c.color)||'var(--tx3)'}"></span>${U.escHtml(c.name)}</div>`;
    });
    popup.innerHTML = html;
    popup.classList.add('open');
    mentionState = { scId, query, textNode: range.startContainer, atIdx, popupEl: popup, matches, activeIdx: 0 };
    positionPopup(popup, range);
  }

  function positionPopup(popup, range) {
    const rect = range.getBoundingClientRect();
    const wrapRect = popup.parentElement.getBoundingClientRect();
    popup.style.left = Math.max(0, rect.left - wrapRect.left) + 'px';
    popup.style.top = (rect.bottom - wrapRect.top + 4) + 'px';
  }

  function closeMentionPopup() {
    if(mentionState && mentionState.popupEl) {
      mentionState.popupEl.classList.remove('open');
    }
    mentionState = null;
  }

  function handleMentionKeydown(e) {
    if(!mentionState || !mentionState.matches.length) {
      if(mentionState && e.key === 'Escape') { closeMentionPopup(); e.preventDefault(); }
      return;
    }
    const items = mentionState.popupEl.querySelectorAll('.mp-item');
    if(e.key === 'ArrowDown') {
      e.preventDefault();
      mentionState.activeIdx = Math.min(mentionState.activeIdx + 1, items.length - 1);
      items.forEach((it, i) => it.classList.toggle('active', i === mentionState.activeIdx));
      items[mentionState.activeIdx].scrollIntoView({block:'nearest'});
    } else if(e.key === 'ArrowUp') {
      e.preventDefault();
      mentionState.activeIdx = Math.max(mentionState.activeIdx - 1, 0);
      items.forEach((it, i) => it.classList.toggle('active', i === mentionState.activeIdx));
      items[mentionState.activeIdx].scrollIntoView({block:'nearest'});
    } else if(e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const active = items[mentionState.activeIdx];
      if(active) insertMention(mentionState.scId, active.dataset.cid);
    } else if(e.key === 'Escape') {
      e.preventDefault();
      closeMentionPopup();
    }
  }

  function insertMention(scId, charId) {
    if(!mentionState) return;
    const P = S.get();
    const c = P.characters.find(x => x.id === charId);
    if(!c) return;
    const { textNode, atIdx } = mentionState;
    const beforeAt = textNode.textContent.substring(0, atIdx);
    const afterQuery = textNode.textContent.substring(atIdx + 1 + mentionState.query.length);

    // Create mention span
    const mention = document.createElement('span');
    mention.className = 'mention';
    mention.contentEditable = 'false';
    mention.dataset.charId = charId;
    mention.style.borderBottom = '2px solid ' + (U.sanitizeColor(c.color) || 'var(--cyan)');
    mention.textContent = '@' + c.name;

    // Split text node and insert mention
    const parent = textNode.parentNode;
    const beforeNode = document.createTextNode(beforeAt);
    const afterNode = document.createTextNode('\u00A0' + afterQuery); // nbsp after mention

    parent.insertBefore(beforeNode, textNode);
    parent.insertBefore(mention, textNode);
    parent.insertBefore(afterNode, textNode);
    parent.removeChild(textNode);

    // Place cursor after mention
    const sel = window.getSelection();
    const r = document.createRange();
    r.setStart(afterNode, 1);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);

    closeMentionPopup();

    // Auto-add character to scene
    const sc = S.getScene(scId);
    if(sc) {
      sc.characters = sc.characters || [];
      if(!sc.characters.includes(charId)) {
        S.snapshot();
        sc.characters.push(charId);
        const ev = P.events.find(e => e.sceneId === scId);
        if(ev) ev.characters = sc.characters.slice();
        // Update character tags
        const card = document.querySelector(`.scene-card[data-sid="${scId}"]`);
        if(card) {
          const scChars = sc.characters.map(cid => P.characters.find(cc=>cc.id===cid)).filter(Boolean);
          const html = scChars.map(cc => `<span class="scene-char-tag"><span class="mp-dot" style="background:${U.sanitizeColor(cc.color)||'var(--tx3)'}"></span>${U.escHtml(cc.name)}<span class="remove-char" onclick="event.stopPropagation();App.Screenplay.removeSceneChar('${scId}','${cc.id}')">✕</span></span>`).join('');
          let charRow = card.querySelector('.scene-chars-row');
          if(!charRow) {
            charRow = document.createElement('div');
            charRow.className = 'scene-chars-row';
            const editor = card.querySelector('.scene-editor');
            if(editor) editor.insertBefore(charRow, editor.querySelector('.scene-screenplay-wrap'));
          }
          charRow.innerHTML = html;
        }
        App.Analysis.invalidateCache();
        App.Timeline.render();
        App.UI.updateStatusBar();
      }
    }
  }

  // Event delegation for screenplay areas
  function initMentionListeners() {
    const sp = U.$('spEpisodes');
    sp.addEventListener('input', e => {
      if(e.target.closest('.scene-screenplay')) {
        // Review mode interception
        if(App.Review && App.Review.isReviewMode()) {
          App.Review.interceptInput(e, e.target.closest('.scene-screenplay'));
        }
        handleMentionInput(e);
      }
    });
    sp.addEventListener('keydown', e => {
      if(e.target.closest('.scene-screenplay')) {
        // Review mode: intercept delete/backspace
        if((e.key === 'Backspace' || e.key === 'Delete') && App.Review && App.Review.isReviewMode()) {
          if(App.Review.interceptDelete(e, e.target.closest('.scene-screenplay'))) return;
        }
        handleMentionKeydown(e);
      }
    });
    sp.addEventListener('blur', e => {
      const el = e.target.closest('.scene-screenplay');
      if(el) {
        setTimeout(() => closeMentionPopup(), 150);
        saveScreenplay(el.dataset.sid, el);
      }
    }, true);
    sp.addEventListener('click', e => {
      // Close popup on click outside
      if(!e.target.closest('.mention-popup')) closeMentionPopup();
    });
  }

  function saveBlockChar(scId, bi, charId) {
    const sc = S.getScene(scId);
    if(!sc || !sc.content[bi]) return;
    S.snapshot();
    sc.content[bi].characterId = charId;
    if(charId && !(sc.characters||[]).includes(charId)) {
      sc.characters = sc.characters || [];
      sc.characters.push(charId);
    }
    // Silent update — don't re-render screenplay to preserve editing context
    App.Analysis.invalidateCache();
    App.Timeline.render();
    App.UI.updateStatusBar();
  }

  function autoCreateTimelineEvent(sc) {
    const P = S.get();
    const epEvs = P.events.filter(e => e.episodeId === sc.episodeId);
    const lastEnd = epEvs.reduce((m,e) => Math.max(m, e.s + e.dur), 0);
    const dur = calcSceneDuration(sc);
    const s = Math.min(lastEnd + 10, S.getEPDUR() - dur);
    const ev = {
      id: U.genId('ev'), title: sc.title, description: '', episodeId: sc.episodeId,
      sceneId: sc.id, category: sc.category, characters: sc.characters||[],
      s: Math.max(0, s), dur: dur
    };
    S.addEvent(ev);
  }

  function calcSceneDuration(sc) {
    const content = sc.content || [];
    let dur = 0;
    content.forEach(b => {
      if(b.type === 'action') dur += Math.max(30, (b.text||'').split(/\s+/).length * 1.5);
      else if(b.type === 'dialogue') dur += Math.max(20, (b.text||'').split(/\s+/).length / 2.5);
      else if(b.type === 'transition') dur += 5;
    });
    return U.clamp(Math.round(dur), 60, 600);
  }

  function updateTimelineDuration(sc) {
    const P = S.get();
    const ev = P.events.find(e => e.sceneId === sc.id);
    if(!ev) return;
    const newDur = calcSceneDuration(sc);
    if(Math.abs(ev.dur - newDur) > 10) {
      ev.dur = newDur;
      ev.title = sc.title;
      ev.category = sc.category;
      ev.characters = sc.characters || [];
    }
  }

  // Called when timeline event is double-clicked — open scene in screenplay
  function openSceneFromTimeline(evId) {
    const P = S.get();
    const ev = P.events.find(e => e.id === evId);
    if(!ev || !ev.sceneId) return;
    const sc = S.getScene(ev.sceneId);
    if(!sc) return;
    openEps.add(sc.episodeId);
    activeSceneId = sc.id;
    App.setViewMode('split');
    render();
    setTimeout(() => {
      const el = document.querySelector(`[data-sid="${sc.id}"]`);
      if(el) el.scrollIntoView({behavior:'smooth', block:'center'});
    }, 100);
  }

  // Init mention listeners on DOM ready
  setTimeout(initMentionListeners, 100);

  function getActiveSceneId() { return activeSceneId; }

  return { render, toggleEp, selectScene, addEpisode, addScene, deleteScene, addBlock, saveBlock, saveBlockChar, saveSceneMeta, removeSceneChar, insertMention, openSceneFromTimeline, formatScreenplayHTML, getActiveSceneId };
})();
