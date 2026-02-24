// ═══ UI MODULE ═══
App.UI = (function(){
  // --- Accessibility: focus trap state ---
  var _previouslyFocusedEl = null;
  var _focusTrapHandler = null;

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'tst'; t.textContent = msg;
    t.setAttribute('role', 'alert');
    document.getElementById('tbox').appendChild(t);
    setTimeout(() => t.remove(), 2800);
  }

  function openModal(html) {
    // Store the element that had focus before the modal opened
    _previouslyFocusedEl = document.activeElement;

    document.getElementById('mdl').innerHTML = html;
    document.getElementById('mbg').classList.add('open');

    // Focus the first focusable element inside the modal
    var mdl = document.getElementById('mdl');
    var focusable = mdl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length) {
      focusable[0].focus();
    } else {
      mdl.setAttribute('tabindex', '-1');
      mdl.focus();
    }

    // Set up focus trap
    _focusTrapHandler = function(e) {
      if (e.key !== 'Tab') return;
      var modal = document.getElementById('mdl');
      var focusableEls = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusableEls.length) return;
      var firstEl = focusableEls[0];
      var lastEl = focusableEls[focusableEls.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener('keydown', _focusTrapHandler);
  }
  function closeModal() {
    document.getElementById('mbg').classList.remove('open');

    // Remove focus trap
    if (_focusTrapHandler) {
      document.removeEventListener('keydown', _focusTrapHandler);
      _focusTrapHandler = null;
    }

    // Restore focus to the element that opened the modal
    if (_previouslyFocusedEl && typeof _previouslyFocusedEl.focus === 'function') {
      _previouslyFocusedEl.focus();
      _previouslyFocusedEl = null;
    }
  }

  function showTooltip(html, anchorEl) {
    const tt = document.getElementById('ttp');
    tt.innerHTML = html;
    const r = anchorEl.getBoundingClientRect();
    tt.style.left = Math.min(r.right + 8, window.innerWidth - 310) + 'px';
    tt.style.top = Math.min(r.top, window.innerHeight - 200) + 'px';
    tt.classList.add('show');
  }
  function hideTooltip() { document.getElementById('ttp').classList.remove('show'); }

  function showContextMenu(x, y, items) {
    const cm = document.getElementById('ctxMenu');
    let h = '';
    items.forEach(item => {
      if(item === 'sep') { h += '<div class="ctx-sep"></div>'; return; }
      h += `<div class="ctx-item${item.danger?' danger':''}" data-act="${U.escHtml(item.id)}">${item.icon||''} ${U.escHtml(item.label)}</div>`;
    });
    cm.innerHTML = h;
    cm.style.left = Math.min(x, window.innerWidth - 200) + 'px';
    cm.style.top = Math.min(y, window.innerHeight - 300) + 'px';
    cm.classList.add('show');

    // Bind clicks
    cm.querySelectorAll('.ctx-item').forEach(el => {
      el.addEventListener('click', () => {
        const act = el.dataset.act;
        const item = items.find(i => i.id === act);
        if(item && item.action) item.action();
        hideContextMenu();
      });
    });

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', _ctxClose, {once:true});
      document.addEventListener('contextmenu', _ctxClose, {once:true});
    }, 10);
  }
  function _ctxClose() { hideContextMenu(); }
  function hideContextMenu() { document.getElementById('ctxMenu').classList.remove('show'); }

  function updateStatusBar() {
    const P = App.Store.get();
    document.getElementById('stProj').textContent = 'Proje: ' + P.meta.title;
    document.getElementById('stEps').textContent = P.episodes.length + ' bölüm';
    document.getElementById('stScenes').textContent = P.scenes.length + ' sahne';
    document.getElementById('stEvents').textContent = P.events.length + ' olay';
    const totalDur = P.events.reduce((s,e) => s + (e.dur||0), 0);
    document.getElementById('stDur').textContent = App.Utils.s2t(totalDur);
    const warns = App.Analysis ? App.Analysis.getWarnings().length : 0;
    const wEl = document.getElementById('stWarn');
    wEl.textContent = warns ? '⚠ ' + warns + ' uyarı' : '';
    const bdg = document.getElementById('wBdg');
    bdg.textContent = warns; bdg.style.display = warns ? '' : 'none';
    const sel = App.Interaction ? App.Interaction.getSelection() : [];
    document.getElementById('stSel').textContent = sel.length ? sel.length + ' seçili' : '';
  }

  return { toast, openModal, closeModal, showTooltip, hideTooltip, showContextMenu, hideContextMenu, updateStatusBar };
})();
