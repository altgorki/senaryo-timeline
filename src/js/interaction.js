// ═══ INTERACTION MODULE ═══
App.Interaction = (function(){
  const U = App.Utils;
  const S = App.Store;
  let drag = null;
  let pan = null;
  let selection = new Set();
  let snapGrid = 10;

  function getSelection() { return [...selection]; }
  function isDragging() { return !!drag; }
  function setSnap(v) { snapGrid = v; S.setSnap(v); }

  function setup() {
    const area = document.getElementById('tlA');

    // Wheel zoom
    area.addEventListener('wheel', e => {
      if(App.ScreenplayEditor && App.ScreenplayEditor.isActive()) return;
      if(App._viewMode === 'kartlar') return;
      if(e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const d = e.deltaY > 0 ? -0.1 : 0.1;
        App.Timeline.setZoom(U.clamp(App.Timeline.getZoom() + d, 0.25, 3));
      }
    }, {passive:false});

    // Unified pointer handler (mouse + touch)
    function onPointerDown(clientX, clientY, target, isTouch) {
      const bl = target.closest('.evb');
      if(bl) {
        const ev = S.getEvent(bl.dataset.id);
        if(!ev) return;
        if(!selection.has(ev.id)) { selection.clear(); selection.add(ev.id); updateSelectionVisual(); }

        let mode = 'move';
        if(target.classList.contains('rh')) mode = target.classList.contains('l') ? 'rl' : 'rr';

        if(mode === 'move' && !isTouch) {
          const ghost = bl.cloneNode(true);
          ghost.classList.add('ghost');
          ghost.style.pointerEvents = 'none';
          bl.parentNode.appendChild(ghost);
          bl.classList.add('drag');
        }

        S.snapshot();
        const origLeft = parseInt(bl.style.left) || 0;
        const parentBody = bl.closest('.ep-body');
        const parentRect = parentBody ? parentBody.getBoundingClientRect() : null;
        drag = { id:ev.id, mode, sx:clientX, sy:clientY, os:ev.s, od:ev.dur, el:bl, origEp:ev.episodeId, origLeft, parentBody, parentRect, isTouch };
        App.UI.hideTooltip();
        return true;
      }
      return false;
    }

    // Mouse down
    area.addEventListener('mousedown', e => {
      if(App.ScreenplayEditor && App.ScreenplayEditor.isActive()) return;
      if(App._viewMode === 'kartlar') return;
      if(e.button !== 0) return;
      if(e.target.closest('.evb')) {
        e.preventDefault();
        // Multi-selection
        if(e.ctrlKey || e.metaKey) {
          const bl = e.target.closest('.evb');
          const evId = bl?.dataset.id;
          if(evId) { if(selection.has(evId)) selection.delete(evId); else selection.add(evId); updateSelectionVisual(); }
          return;
        }
        onPointerDown(e.clientX, e.clientY, e.target, false);
      } else {
        // Pan
        if(!e.target.closest('.ep-hdr')) {
          e.preventDefault();
          pan = { sx:e.clientX, sy:e.clientY, scrollX:area.scrollLeft, scrollY:area.scrollTop };
          area.classList.add('panning');
        }
      }
    });

    // Touch start
    let touchTimer = null;
    let touchStarted = false;
    area.addEventListener('touchstart', e => {
      if(App.ScreenplayEditor && App.ScreenplayEditor.isActive()) return;
      const t = e.touches[0];
      const bl = e.target.closest('.evb');
      if(bl) {
        // Long press for drag (short tap = select)
        touchStarted = false;
        touchTimer = setTimeout(() => {
          touchStarted = true;
          if(onPointerDown(t.clientX, t.clientY, e.target, true)) {
            bl.classList.add('drag');
          }
        }, 300);
        // Immediately select on tap
        const ev = S.getEvent(bl.dataset.id);
        if(ev) { selection.clear(); selection.add(ev.id); updateSelectionVisual(); }
      }
    }, {passive:true});

    // Touch move
    area.addEventListener('touchmove', e => {
      if(!touchStarted) { clearTimeout(touchTimer); return; }
      if(drag) {
        e.preventDefault();
        const t = e.touches[0];
        handlePointerMove(t.clientX, t.clientY, false);
      }
    }, {passive:false});

    // Touch end
    area.addEventListener('touchend', e => {
      clearTimeout(touchTimer);
      if(drag && touchStarted) {
        const t = e.changedTouches[0];
        handlePointerUp(t.clientX, t.clientY, false);
      } else if(!touchStarted && selection.size === 1) {
        // Short tap — open edit panel
        const selId = [...selection][0];
        if(selId) App.Panels.openEditEvent(selId);
      }
      touchStarted = false;
    }, {passive:true});

    // Mouse move
    function handlePointerMove(clientX, clientY, shiftKey) {
      if(!drag) return;
      const zoom = App.Timeline.getZoom();
      const ev = S.getEvent(drag.id);
      if(!ev) return;
      const dpx = (clientY - drag.sy) / zoom;
      const ds = U.px2s(dpx, S.getPPS());
      const EPDUR = S.getEPDUR();

      if(drag.mode === 'move') {
        let newS = drag.os + ds;
        newS = U.snap(newS, snapGrid);
        newS = U.clamp(newS, 0, EPDUR - ev.dur);
        ev.s = newS;

        const sg = document.getElementById('snapGuide');
        if(sg && snapGrid > 0) {
          sg.style.top = U.s2px(newS, S.getPPS()) + 'px';
          sg.classList.add('show');
        }

        if(!drag.isTouch) {
          const dropBody = findDropEp(clientX);
          document.querySelectorAll('.ep-body').forEach(b => b.classList.remove('drop-target'));
          if(dropBody && dropBody.dataset.ep !== drag.origEp) {
            dropBody.classList.add('drop-target');
            if(drag.el.parentNode !== dropBody) { dropBody.appendChild(drag.el); drag.el.style.left = '8px'; }
          } else if(dropBody && dropBody.dataset.ep === drag.origEp && drag.parentBody) {
            if(drag.el.parentNode !== drag.parentBody) { drag.parentBody.appendChild(drag.el); drag.el.style.left = drag.origLeft + 'px'; }
          }
        }

        drag.el.classList.remove('collision');
        const checkEpId = ev.episodeId;
        const others = S.getEvents(checkEpId).filter(o => o.id !== ev.id);
        const hasCollision = others.some(o => ev.s < o.s + o.dur && ev.s + ev.dur > o.s);
        if(hasCollision && !shiftKey) drag.el.classList.add('collision');

      } else if(drag.mode === 'rr') {
        let newDur = drag.od + ds;
        newDur = U.snap(newDur, snapGrid);
        ev.dur = U.clamp(newDur, 60, EPDUR - ev.s);
      } else if(drag.mode === 'rl') {
        let newS = U.snap(drag.os + ds, snapGrid);
        const diff = newS - drag.os;
        const newDur = drag.od - diff;
        if(newDur >= 60 && newS >= 0) { ev.s = newS; ev.dur = newDur; }
      }
      drag.el.style.top = U.s2px(ev.s, S.getPPS()) + 'px';
      drag.el.style.height = Math.max(U.s2px(ev.dur, S.getPPS()), 20) + 'px';
    }

    function handlePointerUp(clientX, clientY, shiftKey) {
      if(!drag) return;
      const ev = S.getEvent(drag.id);
      const didMove = Math.abs(clientX - drag.sx) > 3 || Math.abs(clientY - drag.sy) > 3;
      if(ev && drag.mode === 'move' && !drag.isTouch) {
        const dropBody = findDropEp(clientX);
        if(dropBody && dropBody.dataset.ep !== drag.origEp) {
          ev.episodeId = dropBody.dataset.ep;
          const sc = ev.sceneId ? S.getScene(ev.sceneId) : null;
          if(sc) sc.episodeId = ev.episodeId;
          resolveCollisions(ev.episodeId, ev.id);
          App.UI.toast('"' + ev.title + '" → ' + (App.Utils.epLbl(S.get().episodes.find(ep=>ep.id===ev.episodeId)?.number||'?')));
        }
        if(!shiftKey) resolveCollisions(ev.episodeId, ev.id);
      }
      const ghosts = document.querySelectorAll('.evb.ghost');
      ghosts.forEach(g => g.remove());
      drag.el.classList.remove('drag','collision');
      document.querySelectorAll('.ep-body').forEach(b => b.classList.remove('drop-target'));
      const sg = document.getElementById('snapGuide');
      if(sg) sg.classList.remove('show');
      drag = null;
      if(didMove) {
        App.refresh();
      } else {
        setTimeout(() => App.refresh(), 300);
      }
    }

    window.addEventListener('mousemove', e => {
      if(drag) handlePointerMove(e.clientX, e.clientY, e.shiftKey);
      if(pan) {
        area.scrollLeft = pan.scrollX - (e.clientX - pan.sx);
        area.scrollTop = pan.scrollY - (e.clientY - pan.sy);
      }
    });

    window.addEventListener('mouseup', e => {
      if(drag) handlePointerUp(e.clientX, e.clientY, e.shiftKey);
      if(pan) { pan = null; area.classList.remove('panning'); }
    });

    // Double-click via event delegation (survives DOM re-renders)
    area.addEventListener('dblclick', e => {
      const bl = e.target.closest('.evb');
      if(bl && bl.dataset.id) {
        e.stopPropagation();
        App.Panels.openEditEvent(bl.dataset.id);
      }
    });

    // Right-click on empty space
    area.addEventListener('contextmenu', e => {
      if(!e.target.closest('.evb') && e.target.closest('.ep-body')) {
        e.preventDefault();
        const body = e.target.closest('.ep-body');
        const epId = body.dataset.ep;
        App.UI.showContextMenu(e.clientX, e.clientY, [
          { id:'add', icon:'+', label:'Buraya Olay Ekle', action:() => App.Panels.openAddEvent(epId) },
          { id:'paste', icon:'📋', label:'Yapıştır', action:() => App.UI.toast('Panoya olay yok') }
        ]);
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
      if(e.key === 'Escape') { App.Panels.closeAll(); selection.clear(); updateSelectionVisual(); }
      if(e.key === 'Delete' || e.key === 'Backspace') {
        if(selection.size) {
          if(confirm(selection.size + ' olay silinsin mi?')) {
            S.batch(() => { selection.forEach(id => { S.get().events = S.get().events.filter(e=>e.id!==id); S.get().connections = S.get().connections.filter(c=>c.from!==id&&c.to!==id); }); });
            selection.clear();
            App.refresh();
            App.UI.toast('Silindi');
          }
        }
      }
      if((e.ctrlKey||e.metaKey) && e.key === 'z') { e.preventDefault(); S.undo(); }
      if((e.ctrlKey||e.metaKey) && e.key === 'y') { e.preventDefault(); S.redo(); }
      if((e.ctrlKey||e.metaKey) && e.key === 's') { e.preventDefault(); App.Projects.save(); App.UI.toast('Kaydedildi'); }
      if((e.ctrlKey||e.metaKey) && e.key === 'n') { e.preventDefault(); App.Panels.openAddEvent(); }
    });

    // SP resize handle
    const spResize = document.getElementById('spResize');
    let spDrag = null;
    spResize.addEventListener('mousedown', e => {
      e.preventDefault();
      spDrag = { sx: e.clientX, sw: U.$('spPanel').offsetWidth };
      spResize.classList.add('active');
    });
    window.addEventListener('mousemove', e => {
      if(spDrag) {
        const newW = U.clamp(spDrag.sw + (e.clientX - spDrag.sx), 250, 600);
        U.$('spPanel').style.width = newW + 'px';
      }
    });
    window.addEventListener('mouseup', () => {
      if(spDrag) { spDrag = null; spResize.classList.remove('active'); }
    });
  }

  function findDropEp(clientX) {
    let best = null, bestDist = 999999;
    document.querySelectorAll('.ep-body').forEach(b => {
      const r = b.getBoundingClientRect();
      if(clientX >= r.left && clientX <= r.right) { best = b; bestDist = 0; }
      else { const d = Math.abs(clientX - (r.left+r.width/2)); if(d < bestDist) { bestDist = d; best = b; } }
    });
    return best;
  }

  function resolveCollisions(epId, myId) {
    const me = S.getEvent(myId);
    if(!me) return;
    const others = S.getEvents(epId).filter(e => e.id !== myId).sort((a,b) => a.s - b.s);
    others.forEach(o => {
      if(me.s < o.s + o.dur && me.s + me.dur > o.s) {
        o.s = me.s + me.dur + 10;
        if(o.s + o.dur > S.getEPDUR()) o.s = S.getEPDUR() - o.dur;
      }
    });
  }

  function updateSelectionVisual() {
    document.querySelectorAll('.evb').forEach(el => {
      el.classList.toggle('selected', selection.has(el.dataset.id));
    });
    App.UI.updateStatusBar();
    // If analysis panel is open with impact tab, refresh it
    if(App.Panels && App.Panels.isImpactActive()) {
      App.Panels.renderPanel();
    }
  }

  function showEventContext(e, evId) {
    const P = S.get();
    const ev = S.getEvent(evId);
    if(!ev) return;
    const items = [
      { id:'edit', icon:'✏️', label:'Düzenle', action:() => App.Panels.openEditEvent(evId) },
      { id:'scene', icon:'📝', label:'Senaryoda Gör', action:() => App.Screenplay.openSceneFromTimeline(evId) },
      'sep',
      { id:'copy', icon:'📋', label:'Kopyala', action:() => { copyEvent(evId); App.UI.toast('Kopyalandı'); } },
      { id:'link', icon:'🔗', label:'Bağlantı Ekle', action:() => App.Panels.openAddConnection(evId) },
      'sep',
      { id:'del', icon:'🗑', label:'Sil', danger:true, action:() => { if(confirm('"'+ev.title+'" silinsin mi?')){ S.removeEvent(evId); App.refresh(); App.UI.toast('Silindi'); } } }
    ];
    App.UI.showContextMenu(e.clientX, e.clientY, items);
  }

  let clipboard = null;
  function copyEvent(id) {
    const ev = S.getEvent(id);
    if(ev) clipboard = U.deepClone(ev);
  }

  return { setup, getSelection, isDragging, setSnap, showEventContext, updateSelectionVisual };
})();