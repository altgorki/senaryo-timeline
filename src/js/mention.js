// ═══ MENTION HELPER ═══
// Shared mention popup logic — eliminates duplication across Screenplay, Modal, and Edit Panel
App.Mention = (function(){
  const U = App.Utils;
  const S = App.Store;

  function createInstance(opts) {
    // opts: { getInputEl, getPopupEl, buildItemHtml, onInsert }
    let state = null;

    function handleInput() {
      const el = opts.getInputEl();
      if(!el) return;
      const sel = window.getSelection();
      if(!sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      if(range.startContainer.nodeType !== Node.TEXT_NODE) { close(); return; }
      const textBefore = range.startContainer.textContent.substring(0, range.startOffset);
      const atIdx = textBefore.lastIndexOf('@');
      if(atIdx === -1) { close(); return; }
      const query = textBefore.substring(atIdx + 1);
      if(query.includes(' ') && query.trim().includes(' ')) { close(); return; }

      const P = S.get();
      const q = query.toLowerCase();
      const matches = P.characters.filter(c => c.name.toLowerCase().includes(q));
      const popup = opts.getPopupEl();
      if(!popup) return;

      if(!matches.length) {
        popup.innerHTML = '<div class="mp-empty">Karakter bulunamadı</div>';
        popup.classList.add('open');
        state = { query, textNode: range.startContainer, atIdx, popupEl: popup, matches: [], activeIdx: 0 };
        _positionPopup(popup, range);
        return;
      }

      let html = '';
      matches.forEach((c, i) => {
        html += opts.buildItemHtml(c, i);
      });
      popup.innerHTML = html;
      popup.classList.add('open');
      state = { query, textNode: range.startContainer, atIdx, popupEl: popup, matches, activeIdx: 0 };
      _positionPopup(popup, range);
    }

    function _positionPopup(popup, range) {
      const rect = range.getBoundingClientRect();
      const wrapRect = popup.parentElement.getBoundingClientRect();
      popup.style.left = Math.max(0, rect.left - wrapRect.left) + 'px';
      popup.style.top = (rect.bottom - wrapRect.top + 4) + 'px';
    }

    function close() {
      if(state && state.popupEl) state.popupEl.classList.remove('open');
      state = null;
    }

    function handleKeydown(e) {
      if(!state || !state.matches.length) {
        if(state && e.key === 'Escape') { close(); e.preventDefault(); }
        return;
      }
      const items = state.popupEl.querySelectorAll('.mp-item');
      if(e.key === 'ArrowDown') {
        e.preventDefault();
        state.activeIdx = Math.min(state.activeIdx + 1, items.length - 1);
        items.forEach((it, i) => it.classList.toggle('active', i === state.activeIdx));
        items[state.activeIdx].scrollIntoView({block:'nearest'});
      } else if(e.key === 'ArrowUp') {
        e.preventDefault();
        state.activeIdx = Math.max(state.activeIdx - 1, 0);
        items.forEach((it, i) => it.classList.toggle('active', i === state.activeIdx));
        items[state.activeIdx].scrollIntoView({block:'nearest'});
      } else if(e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const active = items[state.activeIdx];
        if(active) insertMention(active.dataset.cid);
      } else if(e.key === 'Escape') {
        e.preventDefault(); close();
      }
    }

    function insertMention(charId) {
      if(!state) return;
      const P = S.get();
      const c = P.characters.find(x => x.id === charId);
      if(!c) return;
      const { textNode, atIdx } = state;
      const beforeAt = textNode.textContent.substring(0, atIdx);
      const afterQuery = textNode.textContent.substring(atIdx + 1 + state.query.length);

      const mention = document.createElement('span');
      mention.className = 'mention';
      mention.contentEditable = 'false';
      mention.dataset.charId = charId;
      mention.style.borderBottom = '2px solid ' + (U.sanitizeColor(c.color) || 'var(--cyan)');
      mention.textContent = '@' + c.name;

      const parent = textNode.parentNode;
      const beforeNode = document.createTextNode(beforeAt);
      const afterNode = document.createTextNode('\u00A0' + afterQuery);
      parent.insertBefore(beforeNode, textNode);
      parent.insertBefore(mention, textNode);
      parent.insertBefore(afterNode, textNode);
      parent.removeChild(textNode);

      const sel = window.getSelection();
      const r = document.createRange();
      r.setStart(afterNode, 1);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);

      close();
      if(opts.onInsert) opts.onInsert(charId, c);
    }

    return { handleInput, handleKeydown, insertMention, close, getState: () => state };
  }

  return { createInstance };
})();
