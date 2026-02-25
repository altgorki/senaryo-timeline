// ═══ SCREENPLAY EDITOR MODULE (Professional Celtx/Final Draft style) ═══
App.ScreenplayEditor = (function(){
  const U = App.Utils;
  const S = App.Store;

  // ── State ──
  let _elements = [];       // [{id, type, text, sceneId, episodeId, divider?, dividerType?}]
  let _activeElId = null;
  let _focusMode = false;
  let _mounted = false;
  let _syncTimer = null;
  let _autocompleteEl = null;
  let _autocompleteItems = [];
  let _autocompleteIndex = 0;

  const ELEMENT_TYPES = ['action','character','parenthetical','dialogue','transition'];
  const TYPE_LABELS = {'action':'Aksiyon','character':'Karakter','parenthetical':'Parantez İçi','dialogue':'Diyalog','transition':'Geçiş'};
  const TYPE_PLACEHOLDERS = {'action':'Aksiyon açıklaması...','character':'KARAKTER ADI','parenthetical':'yönerge','dialogue':'Diyalog metni...','transition':'KESME:'};

  // Tab cycle: current type → next type on Tab
  const TAB_NEXT = {'action':'character','character':'dialogue','parenthetical':'dialogue','dialogue':'character','transition':'action'};
  const TAB_PREV = {'action':'transition','character':'action','dialogue':'character','transition':'dialogue','parenthetical':'character'};
  // Enter on empty line: what to become
  const ENTER_EMPTY = {'action':'character','character':'action','dialogue':'action','parenthetical':'dialogue','transition':'action'};
  // Enter on non-empty: what the NEW line should be
  const ENTER_NEXT = {'action':'action','character':'dialogue','parenthetical':'dialogue','dialogue':'dialogue','transition':'action'};

  function isActive() { return _mounted; }
  function getActiveElement() { return _activeElId; }

  // ── buildFromState: Convert project state → flat element list ──
  function buildFromState() {
    _elements = [];
    const P = S.get();
    const episodes = [...P.episodes].sort((a,b) => a.order - b.order);
    let globalSceneNum = 0;

    episodes.forEach((ep, epIdx) => {
      // Episode divider
      _elements.push({
        id: 'epd_' + ep.id, divider: true, dividerType: 'episode',
        episodeId: ep.id, text: 'BÖLÜM ' + ep.number + (ep.title ? ' — ' + ep.title : '')
      });

      const scenes = S.getScenes(ep.id);
      scenes.forEach((sc, scIdx) => {
        globalSceneNum++;

        // Scene header (metadata bar with dropdowns)
        _elements.push({
          id: 'shdr_' + sc.id, divider: true, dividerType: 'scene-header',
          sceneId: sc.id, episodeId: ep.id,
          sceneNum: globalSceneNum,
          location: sc.location || 'İÇ',
          timeOfDay: sc.timeOfDay || 'GÜN',
          category: sc.category || 'karakter',
          title: sc.title || ''
        });

        // Content blocks
        const content = sc.content || [];
        content.forEach((block, bi) => {
          if (block.type === 'action') {
            _elements.push({
              id: 'el_' + sc.id + '_' + bi, type: 'action', text: block.text || '',
              sceneId: sc.id, episodeId: ep.id
            });
          } else if (block.type === 'dialogue') {
            // Character line
            const ch = block.characterId ? P.characters.find(c => c.id === block.characterId) : null;
            const charName = ch ? ch.name.toUpperCase() : '';
            _elements.push({
              id: 'ch_' + sc.id + '_' + bi, type: 'character', text: charName,
              sceneId: sc.id, episodeId: ep.id, characterId: block.characterId
            });
            // Parenthetical (if exists)
            if (block.parenthetical) {
              _elements.push({
                id: 'pr_' + sc.id + '_' + bi, type: 'parenthetical', text: block.parenthetical,
                sceneId: sc.id, episodeId: ep.id
              });
            }
            // Dialogue text
            _elements.push({
              id: 'dl_' + sc.id + '_' + bi, type: 'dialogue', text: block.text || '',
              sceneId: sc.id, episodeId: ep.id
            });
          } else if (block.type === 'transition') {
            _elements.push({
              id: 'tr_' + sc.id + '_' + bi, type: 'transition', text: block.text || 'KESME',
              sceneId: sc.id, episodeId: ep.id
            });
          }
        });

        // If scene has no content, add empty action
        if (!content.length) {
          _elements.push({
            id: 'el_' + sc.id + '_0', type: 'action', text: '',
            sceneId: sc.id, episodeId: ep.id
          });
        }

        // Block action buttons (add action/dialogue/transition)
        _elements.push({
          id: 'ba_' + sc.id, divider: true, dividerType: 'block-actions',
          sceneId: sc.id, episodeId: ep.id
        });
      });
    });
  }

  // ── render: Build the editor DOM ──
  function render() {
    const tlC = U.$('tlC');
    if (!tlC) return;
    _mounted = true;

    // Build toolbar
    let html = '<div class="sp-editor-toolbar">';
    html += '<select id="spElTypeSelect" onchange="App.ScreenplayEditor.changeElementType(this.value)">';
    ELEMENT_TYPES.forEach(t => {
      html += '<option value="' + t + '">' + TYPE_LABELS[t] + '</option>';
    });
    html += '</select>';
    html += '<span class="sp-tb-sep"></span>';
    html += '<button onclick="App.ScreenplayEditor.addSceneInEditor()" title="Yeni sahne ekle">+ Sahne</button>';
    html += '<button onclick="App.ScreenplayEditor.addEpisodeInEditor()" title="Yeni bölüm ekle">+ Bölüm</button>';
    html += '<span style="flex:1"></span>';
    html += '<button id="spFocusBtn" onclick="App.ScreenplayEditor.toggleFocusMode()" title="Odak Modu">◉ Odak</button>';
    html += '</div>';

    // Paper wrap
    html += '<div class="sp-editor-wrap">';
    html += '<div class="sp-editor-page' + (_focusMode ? ' focus-mode' : '') + '" id="spEditorPage">';

    const P = S.get();
    const catEntries = Object.entries(P.categories);
    _elements.forEach((el, idx) => {
      if (el.divider) {
        if (el.dividerType === 'episode') {
          html += '<div class="sp-episode-divider" data-epid="' + el.episodeId + '">' + U.escHtml(el.text) + '</div>';
        } else if (el.dividerType === 'scene-header') {
          html += '<div class="sp-scene-header" data-scid="' + el.sceneId + '" data-epid="' + el.episodeId + '">';
          html += '<span class="sp-scene-num">SAHNE ' + el.sceneNum + '</span>';
          // Category dropdown
          html += '<select onchange="App.ScreenplayEditor.saveSceneMeta(\'' + el.sceneId + '\',\'category\',this.value)">';
          catEntries.forEach(([k,v]) => {
            html += '<option value="' + k + '"' + (k === el.category ? ' selected' : '') + '>' + U.escHtml(v.label) + '</option>';
          });
          html += '</select>';
          // Location dropdown (İÇ/DIŞ)
          html += '<select onchange="App.ScreenplayEditor.saveSceneMeta(\'' + el.sceneId + '\',\'location\',this.value)">';
          ['İÇ','DIŞ','İÇ/DIŞ'].forEach(loc => {
            html += '<option value="' + loc + '"' + (loc === el.location ? ' selected' : '') + '>' + loc + '</option>';
          });
          html += '</select>';
          // Title input (mekan)
          html += '<input placeholder="Mekan" value="' + U.escHtml(el.title) + '" onchange="App.ScreenplayEditor.saveSceneMeta(\'' + el.sceneId + '\',\'title\',this.value)" />';
          // Time of day dropdown
          html += '<select onchange="App.ScreenplayEditor.saveSceneMeta(\'' + el.sceneId + '\',\'timeOfDay\',this.value)">';
          ['GÜN','GECE','AKŞAM','ŞAFAK','SÜREKLI'].forEach(t => {
            html += '<option value="' + t + '"' + (t === el.timeOfDay ? ' selected' : '') + '>' + t + '</option>';
          });
          html += '</select>';
          // Add scene button
          html += '<button class="sp-add-scene-btn" onclick="App.ScreenplayEditor.addSceneInEditor(\'' + el.sceneId + '\',\'' + el.episodeId + '\')">+ Sahne</button>';
          html += '</div>';
        } else if (el.dividerType === 'block-actions') {
          html += '<div class="sp-block-actions" data-scid="' + el.sceneId + '">';
          html += '<button onclick="App.ScreenplayEditor.addBlock(\'' + el.sceneId + '\',\'action\')">+ Aksiyon</button>';
          html += '<button onclick="App.ScreenplayEditor.addBlock(\'' + el.sceneId + '\',\'dialogue\')">+ Diyalog</button>';
          html += '<button onclick="App.ScreenplayEditor.addBlock(\'' + el.sceneId + '\',\'transition\')">+ Geçiş</button>';
          html += '</div>';
        }
        return;
      }
      html += '<div class="sp-el sp-' + el.type + '" contenteditable="true" data-id="' + el.id + '" data-type="' + el.type + '" data-placeholder="' + (TYPE_PLACEHOLDERS[el.type] || '') + '" data-scid="' + (el.sceneId || '') + '" data-epidid="' + (el.episodeId || '') + '">';
      html += U.escHtml(String(el.text || ''));
      html += '</div>';
    });

    // If no elements, show placeholder
    if (!_elements.length) {
      html += '<div style="text-align:center;color:#999;padding:40px;font-family:Inter,sans-serif;font-size:14px;">Henüz içerik yok. Bölüm ve sahne ekleyin.</div>';
    }

    html += '</div></div>'; // close page + wrap

    // Autocomplete dropdown
    html += '<div class="sp-autocomplete" id="spAutocomplete"></div>';

    tlC.innerHTML = html;

    // Attach delegated event listeners
    const page = document.getElementById('spEditorPage');
    if (page) {
      page.addEventListener('keydown', onKeyDown);
      page.addEventListener('input', onInput);
      page.addEventListener('focusin', onFocus);
      page.addEventListener('focusout', onBlur);
    }

    // Recalc page breaks
    setTimeout(recalcPageBreaks, 50);
  }

  // ── Event: Focus ──
  function onFocus(e) {
    const el = e.target.closest('.sp-el');
    if (!el) return;
    _activeElId = el.dataset.id;

    // Update type dropdown
    const sel = document.getElementById('spElTypeSelect');
    if (sel) sel.value = el.dataset.type;

    // Show type badge OUTSIDE the contenteditable (as previous sibling)
    removeBadges();
    const badge = document.createElement('span');
    badge.className = 'sp-el-type-badge';
    badge.textContent = TYPE_LABELS[el.dataset.type] || el.dataset.type;
    el.parentNode.insertBefore(badge, el);

    // Highlight scene in left panel
    const scId = el.dataset.scid;
    if (scId) {
      document.querySelectorAll('.scene-card').forEach(c => c.classList.toggle('active', c.dataset.sid === scId));
    }
  }

  function onBlur() {
    removeBadges();
  }

  function removeBadges() {
    document.querySelectorAll('.sp-el-type-badge').forEach(b => b.remove());
  }

  // ── Event: KeyDown ──
  function onKeyDown(e) {
    const el = e.target.closest('.sp-el');
    if (!el) return;
    const elId = el.dataset.id;
    const elType = el.dataset.type;
    const idx = _elements.findIndex(x => x.id === elId);
    if (idx < 0) return;

    // Autocomplete navigation
    const acDrop = document.getElementById('spAutocomplete');
    if (acDrop && acDrop.classList.contains('open')) {
      if (e.key === 'ArrowDown') { e.preventDefault(); navigateAutocomplete(1); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); navigateAutocomplete(-1); return; }
      if (e.key === 'Enter') { e.preventDefault(); applyAutocomplete(); return; }
      if (e.key === 'Escape') { e.preventDefault(); hideAutocomplete(); return; }
    }

    // Tab → change element type
    if (e.key === 'Tab') {
      e.preventDefault();
      const next = e.shiftKey ? TAB_PREV[elType] : TAB_NEXT[elType];
      if (next) {
        changeElementTypeDom(el, idx, next);
      }
      return;
    }

    // Enter → new element
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = el.textContent.trim();

      // Empty line: transform current element
      if (!text && ENTER_EMPTY[elType]) {
        changeElementTypeDom(el, idx, ENTER_EMPTY[elType]);
        return;
      }

      // Non-empty: create new element after current
      const newType = ENTER_NEXT[elType] || 'action';
      const newEl = {
        id: 'el_' + U.genId('sp'), type: newType, text: '',
        sceneId: _elements[idx].sceneId, episodeId: _elements[idx].episodeId
      };
      _elements.splice(idx + 1, 0, newEl);

      // Insert DOM element
      const newDiv = document.createElement('div');
      newDiv.className = 'sp-el sp-' + newType;
      newDiv.contentEditable = 'true';
      newDiv.dataset.id = newEl.id;
      newDiv.dataset.type = newType;
      newDiv.dataset.placeholder = TYPE_PLACEHOLDERS[newType] || '';
      newDiv.dataset.scid = newEl.sceneId || '';
      newDiv.dataset.epidid = newEl.episodeId || '';
      el.after(newDiv);
      newDiv.focus();

      scheduleSyncToState();
      return;
    }

    // Review mode: intercept delete/backspace
    if ((e.key === 'Backspace' || e.key === 'Delete') && App.Review && App.Review.isReviewMode()) {
      if (App.Review.interceptDelete(e, el)) return;
    }

    // Backspace on empty → delete element, focus previous
    if (e.key === 'Backspace' && !el.textContent.trim()) {
      e.preventDefault();
      // Find previous editable element
      const prevEl = findPrevEditable(el);
      if (prevEl) {
        _elements.splice(idx, 1);
        el.remove();
        prevEl.focus();
        // Place cursor at end
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(prevEl);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        scheduleSyncToState();
      }
      return;
    }

    // Escape → close focus mode
    if (e.key === 'Escape') {
      if (_focusMode) toggleFocusMode();
      return;
    }
  }

  function findPrevEditable(el) {
    let prev = el.previousElementSibling;
    while (prev) {
      if (prev.classList.contains('sp-el') && prev.contentEditable === 'true') return prev;
      prev = prev.previousElementSibling;
    }
    return null;
  }

  // ── Event: Input ──
  function onInput(e) {
    const el = e.target.closest('.sp-el');
    if (!el) return;
    // Review mode interception
    if (App.Review && App.Review.isReviewMode()) {
      App.Review.interceptInput(e, el);
    }
    const elId = el.dataset.id;
    const idx = _elements.findIndex(x => x.id === elId);
    if (idx < 0) return;

    // Update element text
    _elements[idx].text = el.textContent;

    // Character autocomplete
    if (el.dataset.type === 'character') {
      showAutocomplete(el);
    } else {
      hideAutocomplete();
    }

    scheduleSyncToState();
  }

  // ── Debounced sync ──
  function scheduleSyncToState() {
    if (_syncTimer) clearTimeout(_syncTimer);
    _syncTimer = setTimeout(syncToState, 400);
  }

  // ── changeElementType (from toolbar) ──
  function changeElementType(newType) {
    const page = document.getElementById('spEditorPage');
    if (!page) return;
    const focused = page.querySelector('.sp-el:focus');
    if (!focused) return;
    const idx = _elements.findIndex(x => x.id === focused.dataset.id);
    if (idx < 0) return;
    changeElementTypeDom(focused, idx, newType);
  }

  function changeElementTypeDom(el, idx, newType) {
    const oldType = _elements[idx].type;
    _elements[idx].type = newType;
    el.className = 'sp-el sp-' + newType;
    el.dataset.type = newType;
    el.dataset.placeholder = TYPE_PLACEHOLDERS[newType] || '';

    // Update toolbar dropdown
    const sel = document.getElementById('spElTypeSelect');
    if (sel) sel.value = newType;

    // Update badge (outside the contenteditable)
    removeBadges();
    const badge = document.createElement('span');
    badge.className = 'sp-el-type-badge';
    badge.textContent = TYPE_LABELS[newType] || newType;
    el.parentNode.insertBefore(badge, el);

    scheduleSyncToState();
  }

  // ── Autocomplete (Character Names) ──
  function showAutocomplete(el) {
    const text = el.textContent.trim().toUpperCase();
    if (!text) { hideAutocomplete(); return; }

    const P = S.get();
    // Collect all character names from store + elements
    const storeChars = P.characters.map(c => c.name.toUpperCase());
    const elChars = _elements.filter(x => x.type === 'character' && x.text.trim())
      .map(x => x.text.trim().toUpperCase());
    const allChars = [...new Set([...storeChars, ...elChars])];
    const matches = allChars.filter(c => c.startsWith(text) && c !== text);

    if (!matches.length) { hideAutocomplete(); return; }

    _autocompleteItems = matches;
    _autocompleteIndex = 0;
    _autocompleteEl = el;

    const drop = document.getElementById('spAutocomplete');
    if (!drop) return;
    let h = '';
    matches.forEach((m, i) => {
      h += '<div class="sp-autocomplete-item' + (i === 0 ? ' active' : '') + '" data-idx="' + i + '" onmousedown="App.ScreenplayEditor._pickAutocomplete(' + i + ')">' + U.escHtml(m) + '</div>';
    });
    drop.innerHTML = h;

    // Position using fixed viewport coordinates
    const rect = el.getBoundingClientRect();
    drop.style.position = 'fixed';
    drop.style.left = rect.left + 'px';
    drop.style.top = (rect.bottom + 4) + 'px';
    drop.classList.add('open');
  }

  function hideAutocomplete() {
    const drop = document.getElementById('spAutocomplete');
    if (drop) { drop.classList.remove('open'); drop.innerHTML = ''; }
    _autocompleteItems = [];
    _autocompleteIndex = 0;
    _autocompleteEl = null;
  }

  function navigateAutocomplete(dir) {
    _autocompleteIndex = Math.max(0, Math.min(_autocompleteItems.length - 1, _autocompleteIndex + dir));
    const drop = document.getElementById('spAutocomplete');
    if (!drop) return;
    drop.querySelectorAll('.sp-autocomplete-item').forEach((item, i) => {
      item.classList.toggle('active', i === _autocompleteIndex);
    });
  }

  function applyAutocomplete() {
    if (!_autocompleteEl || !_autocompleteItems.length) return;
    const name = _autocompleteItems[_autocompleteIndex];
    _autocompleteEl.textContent = name;
    const idx = _elements.findIndex(x => x.id === _autocompleteEl.dataset.id);
    if (idx >= 0) _elements[idx].text = name;
    hideAutocomplete();

    // Move cursor to end
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(_autocompleteEl);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);

    scheduleSyncToState();
  }

  function _pickAutocomplete(idx) {
    _autocompleteIndex = idx;
    applyAutocomplete();
  }

  // ── syncToState: Push editor content back to project state ──
  function syncToState() {
    const P = S.get();
    S.snapshot();

    // Group elements by sceneId (skip dividers)
    const sceneMap = {};
    _elements.forEach(el => {
      if (el.divider) return;
      if (!el.sceneId) return;
      if (!sceneMap[el.sceneId]) sceneMap[el.sceneId] = [];
      sceneMap[el.sceneId].push(el);
    });

    // Update each scene's content blocks
    // Note: scene metadata (location, timeOfDay, title, category) is now
    // updated directly by saveSceneMeta() from header dropdowns/inputs
    Object.keys(sceneMap).forEach(scId => {
      const sc = S.getScene(scId);
      if (!sc) return;

      const els = sceneMap[scId];
      const newContent = [];

      let i = 0;
      while (i < els.length) {
        const el = els[i];
        if (el.type === 'action') {
          newContent.push({ type: 'action', text: el.text || '' });
          i++;
        } else if (el.type === 'character') {
          const charName = el.text.trim().toUpperCase();
          const charObj = P.characters.find(c => c.name.toUpperCase() === charName);
          const block = { type: 'dialogue', characterId: charObj ? charObj.id : '', text: '' };

          i++;
          if (i < els.length && els[i].type === 'parenthetical') {
            block.parenthetical = els[i].text;
            i++;
          }
          if (i < els.length && els[i].type === 'dialogue') {
            block.text = els[i].text;
            i++;
          }
          newContent.push(block);
        } else if (el.type === 'transition') {
          newContent.push({ type: 'transition', text: el.text || '' });
          i++;
        } else if (el.type === 'parenthetical' || el.type === 'dialogue') {
          newContent.push({ type: 'action', text: el.text || '' });
          i++;
        } else {
          i++;
        }
      }

      sc.content = newContent;
    });

    S.markDirty('scenes');
    S.emit('change', {type: 'screenplay-editor'});
  }

  // ── recalcPageBreaks ──
  function recalcPageBreaks() {
    const page = document.getElementById('spEditorPage');
    if (!page) return;

    // Remove existing page breaks
    page.querySelectorAll('.sp-page-break').forEach(pb => pb.remove());

    // Each "page" is ~55 lines or ~792px at 12pt
    const PAGE_HEIGHT = 792; // approx US Letter minus margins
    let accHeight = 0;
    let pageNum = 1;
    const children = Array.from(page.children);

    children.forEach((child, idx) => {
      accHeight += child.offsetHeight + 12; // margin estimate
      if (accHeight >= PAGE_HEIGHT) {
        // Don't break right after a scene header (widow protection)
        if (child.classList.contains('sp-scene-header') && idx > 0) {
          const pb = document.createElement('div');
          pb.className = 'sp-page-break';
          pb.dataset.page = 'Sayfa ' + (++pageNum);
          child.before(pb);
        } else {
          const pb = document.createElement('div');
          pb.className = 'sp-page-break';
          pb.dataset.page = 'Sayfa ' + (++pageNum);
          child.after(pb);
        }
        accHeight = 0;
      }
    });
  }

  // ── addSceneInEditor (positional insertion) ──
  function addSceneInEditor(afterSceneId, episodeId, _skipSnapshot) {
    const P = S.get();

    // Determine episode from afterScene if not provided
    if (!episodeId && afterSceneId) {
      const asc = S.getScene(afterSceneId);
      if (asc) episodeId = asc.episodeId;
    }
    if (!episodeId) {
      if (P.episodes.length) episodeId = P.episodes[0].id;
      else return;
    }

    if (!_skipSnapshot) S.snapshot();

    const existing = S.getScenes(episodeId);
    let newOrder;

    if (afterSceneId) {
      const afterSc = S.getScene(afterSceneId);
      if (afterSc) {
        // Shift subsequent scenes' order up by 1
        existing.filter(s => s.order > afterSc.order).forEach(s => { s.order += 1; });
        newOrder = afterSc.order + 1;
      } else {
        newOrder = existing.length ? Math.max(...existing.map(s => s.order)) + 1 : 1;
      }
    } else {
      newOrder = existing.length ? Math.max(...existing.map(s => s.order)) + 1 : 1;
    }

    const sc = {
      id: U.genId('sc'), episodeId: episodeId, order: newOrder,
      title: '', location: 'İÇ', timeOfDay: 'GÜN',
      category: 'karakter', characters: [],
      content: [{ type: 'action', text: '' }]
    };
    P.scenes.push(sc);

    // Auto-create timeline event
    const epEvs = P.events.filter(e => e.episodeId === sc.episodeId);
    const lastEnd = epEvs.reduce((m, e) => Math.max(m, e.s + e.dur), 0);
    P.events.push({
      id: U.genId('ev'), title: sc.title || 'Yeni Sahne', description: '', episodeId: sc.episodeId,
      sceneId: sc.id, category: sc.category, characters: [],
      s: Math.max(0, Math.min(lastEnd + 10, S.getEPDUR() - 60)), dur: 60
    });

    S.markDirty(['scenes','events']);
    S.emit('change', {type: 'screenplay-editor'});
    buildFromState();
    render();
    setTimeout(() => scrollToScene(sc.id), 100);
  }

  // ── addBlock: Add action/dialogue/transition to a scene ──
  function addBlock(sceneId, blockType) {
    const sc = S.getScene(sceneId);
    if (!sc) return;
    S.snapshot();

    if (!sc.content) sc.content = [];
    if (blockType === 'dialogue') {
      sc.content.push({ type: 'dialogue', characterId: '', text: '', parenthetical: '' });
    } else {
      sc.content.push({ type: blockType, text: '' });
    }

    S.emit('change', {type: 'screenplay-editor'});
    buildFromState();
    render();

    // Focus the new element — for dialogue, focus the character line (second-to-last)
    setTimeout(() => {
      const page = document.getElementById('spEditorPage');
      if (!page) return;
      const scEls = page.querySelectorAll('.sp-el[data-scid="' + sceneId + '"]');
      if (scEls.length) {
        if (blockType === 'dialogue' && scEls.length >= 2) {
          // Focus character line (before dialogue text)
          scEls[scEls.length - 2].focus();
        } else {
          scEls[scEls.length - 1].focus();
        }
      }
    }, 100);
  }

  // ── saveSceneMeta: Update scene metadata from header dropdowns ──
  function saveSceneMeta(sceneId, field, value) {
    const sc = S.getScene(sceneId);
    if (!sc) return;
    S.snapshot();
    sc[field] = value;

    // Sync category to corresponding timeline events
    if (field === 'category') {
      const P = S.get();
      P.events.filter(e => e.sceneId === sceneId).forEach(e => { e.category = value; });
      S.markDirty(['scenes','events']);
    } else {
      S.markDirty('scenes');
    }

    S.emit('change', {type: 'screenplay-editor'});
    // Don't do full rebuild — just update left panel. Header is already showing the new value.
  }

  // ── addEpisodeInEditor ──
  function addEpisodeInEditor() {
    const P = S.get();
    const maxNum = P.episodes.reduce((m, e) => typeof e.number === 'number' ? Math.max(m, e.number) : m, 0);
    const ep = { id: U.genId('ep'), number: maxNum + 1, title: '', duration: S.getEPDUR(), type: 'normal', order: maxNum + 1 };

    // Single snapshot for the whole operation (addSceneInEditor won't re-snapshot)
    S.snapshot();
    P.episodes.push(ep);
    P.episodes.sort((a, b) => a.order - b.order);

    // Don't emit yet — addSceneInEditor will emit and rebuild (skip snapshot — we already took one)
    S.markDirty('episodes');
    addSceneInEditor(null, ep.id, true);
  }

  // ── scrollToScene ──
  function scrollToScene(scId) {
    const page = document.getElementById('spEditorPage');
    if (!page) return;
    // Find scene heading or scene divider
    const target = page.querySelector('[data-scid="' + scId + '"]') || page.querySelector('[data-id="sh_' + scId + '"]');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Flash effect
      target.classList.add('sp-flash');
      setTimeout(() => target.classList.remove('sp-flash'), 700);
    }
  }

  // ── toggleFocusMode ──
  function toggleFocusMode() {
    _focusMode = !_focusMode;
    const page = document.getElementById('spEditorPage');
    if (page) page.classList.toggle('focus-mode', _focusMode);
    const btn = document.getElementById('spFocusBtn');
    if (btn) btn.classList.toggle('active', _focusMode);
  }

  // ── unmount: Clean up when leaving screenplay mode ──
  function unmount() {
    _mounted = false;
    _elements = [];
    _activeElId = null;
    hideAutocomplete();
    if (_syncTimer) { clearTimeout(_syncTimer); _syncTimer = null; }
    document.body.classList.remove('screenplay-editor-active');
    const tlC = U.$('tlC');
    if (tlC) tlC.innerHTML = '';
  }

  return {
    render, buildFromState, syncToState, scrollToScene,
    addSceneInEditor, addEpisodeInEditor, toggleFocusMode,
    getActiveElement, changeElementType, isActive, unmount,
    addBlock, saveSceneMeta,
    _pickAutocomplete // for inline onclick
  };
})();
