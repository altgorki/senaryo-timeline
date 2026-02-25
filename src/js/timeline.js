// ═══ TIMELINE MODULE ═══
App.Timeline = (function(){
  const U = App.Utils;
  const S = App.Store;
  let zoomLvl = 1;
  let flt = { ep:'all', ch:'all', cats:new Set() };

  function initFilter() {
    const cats = S.getCategories();
    flt.cats = new Set(Object.keys(cats));
  }

  function buildToolbar() {
    const P = S.get();
    // Episodes
    const es = document.getElementById('fEp');
    es.innerHTML = '<option value="all">Tümü</option>';
    P.episodes.forEach(ep => {
      const o = document.createElement('option');
      o.value = ep.id; o.textContent = U.epLbl(ep.number);
      es.appendChild(o);
    });
    // Characters
    const cs = document.getElementById('fCh');
    cs.innerHTML = '<option value="all">Tümü</option>';
    P.characters.forEach(ch => {
      const o = document.createElement('option');
      o.value = ch.id; o.textContent = ch.name;
      cs.appendChild(o);
    });
    // Category pills
    const cp = document.getElementById('catP'); cp.innerHTML = '';
    Object.entries(P.categories).forEach(([k,v]) => {
      const p = document.createElement('div');
      p.className = 'pill' + (flt.cats.has(k)?'':' off');
      p.dataset.cat = k;
      p.style.borderColor = U.sanitizeColor(v.color); p.style.color = U.sanitizeColor(v.color);
      p.textContent = v.label;
      p.onclick = () => { p.classList.toggle('off'); if(flt.cats.has(k)) flt.cats.delete(k); else flt.cats.add(k); doFilter(); };
      cp.appendChild(p);
    });
  }

  function render() {
    const P = S.get();
    const cont = U.$('tlC');
    cont.innerHTML = '';
    const PPS = S.getPPS();
    const EPDUR = S.getEPDUR();
    const EPPX = S.getEPPX();
    const LW = 180, HDRH = 60, RW = 60;

    if(!P.episodes.length) {
      cont.innerHTML = '<div style="padding:40px;text-align:center;color:var(--tx3);">Timeline boş. Senaryo panelinden bölüm ekleyin veya Demo Proje yükleyin.</div>';
      applyZoom();
      return;
    }

    // Lane calc for each episode
    P.episodes.forEach(ep => {
      const rowEvs = P.events.filter(e => e.episodeId === ep.id).sort((a,b) => a.s - b.s);
      const lanes = [];
      rowEvs.forEach(ev => {
        let lane = 0;
        for(; lane < lanes.length; lane++) { if(ev.s >= lanes[lane]) break; }
        if(lane >= lanes.length) lanes.push(0);
        lanes[lane] = ev.s + ev.dur;
        ev._lane = lane;
      });
      rowEvs.forEach(ev => ev._laneCount = Math.max(lanes.length, 1));
    });

    // Ruler (vertical, left column)
    const maxMin = Math.ceil(EPDUR / 60);
    const ruler = document.createElement('div');
    ruler.className = 'ruler'; ruler.style.height = (EPPX + HDRH) + 'px';
    // Spacer to align with episode headers
    const spacer = document.createElement('div');
    spacer.style.height = HDRH + 'px'; spacer.style.flexShrink = '0';
    ruler.appendChild(spacer);
    for(let m = 0; m <= maxMin; m++) {
      const tk = document.createElement('div');
      tk.className = 'rtick' + (m%5===0?' major':' minor');
      tk.style.top = (HDRH + U.s2px(m*60, PPS)) + 'px';
      if(m%5===0) tk.innerHTML = `<span style="position:absolute;top:2px;right:4px">${m}dk</span>`;
      ruler.appendChild(tk);
    }
    // Snap guide
    const sg = document.createElement('div');
    sg.className = 'snap-guide'; sg.id = 'snapGuide';
    ruler.appendChild(sg);
    cont.appendChild(ruler);

    // Columns (episodes as vertical columns)
    let cumX = RW;
    P.episodes.forEach(ep => {
      const colEvs = P.events.filter(e => e.episodeId === ep.id);
      const laneCount = colEvs.length > 0 ? Math.max(...colEvs.map(e => (e._lane||0))) + 1 : 1;
      const colW = Math.max(laneCount * (LW + 6) + 16, LW + 16);

      const col = document.createElement('div');
      col.className = 'ep-row'; col.style.width = colW + 'px';

      const hdr = document.createElement('div');
      hdr.className = 'ep-hdr'; hdr.style.width = colW + 'px';
      const epDurTotal = colEvs.reduce((s,e) => Math.max(s, e.s+e.dur), 0);
      hdr.innerHTML = `<div class="num">${ep.number}</div><div class="sub">${U.escHtml(ep.title||'Bölüm')}</div><div class="dur">${U.s2t(EPDUR)}</div>`;
      col.appendChild(hdr);

      const body = document.createElement('div');
      body.className = 'ep-body'; body.dataset.ep = ep.id; body.style.width = colW + 'px'; body.style.height = EPPX + 'px';

      // Gridlines (horizontal)
      for(let m = 0; m <= maxMin; m++) {
        const gl = document.createElement('div');
        gl.className = 'gl' + (m%5===0?' ma':' mi');
        gl.style.top = U.s2px(m*60, PPS) + 'px';
        body.appendChild(gl);
      }

      // Event blocks
      colEvs.forEach(ev => {
        const cat = P.categories[ev.category] || {color:'#888'};
        const bl = document.createElement('div');
        bl.className = 'evb'; bl.dataset.id = ev.id; bl.dataset.c = ev.category;
        bl.style.top = U.s2px(ev.s, PPS) + 'px';
        bl.style.height = Math.max(U.s2px(ev.dur, PPS), 20) + 'px';
        bl.style.left = (8 + (ev._lane||0) * (LW + 6)) + 'px';
        bl.style.width = LW + 'px';
        // Dynamic category colors
        const c = cat.color;
        const sc_ = U.sanitizeColor(c);
        bl.style.background = sc_ + '1a'; bl.style.borderColor = sc_ + '4d'; bl.style.color = sc_;
        const hasScene = ev.sceneId ? '<span class="scene-link">📝</span>' : '';
        bl.innerHTML = `<div class="rh l"></div><span class="etxt">${U.escHtml(ev.title)}</span>${hasScene}<div class="rh r"></div>`;

        bl.addEventListener('mouseenter', () => {
          if(App.Interaction && App.Interaction.isDragging()) return;
          hlRel(ev.id);
          const chNames = (ev.characters||[]).map(cid => { const ch = P.characters.find(c=>c.id===cid); return ch?ch.name:cid; });
          App.UI.showTooltip(`<div class="tt">${U.escHtml(ev.title)}</div><div class="td">${U.escHtml(ev.description||'')}</div>
            <div class="tm">${U.epLbl(P.episodes.find(e=>e.id===ev.episodeId)?.number||'?')} | ${U.s2t(ev.s)}–${U.s2t(ev.s+ev.dur)} (${Math.round(ev.dur/60)}dk)</div>
            ${chNames.length?'<div class="tm">'+chNames.join(', ')+'</div>':''}`, bl);
        });
        bl.addEventListener('mouseleave', () => {
          if(App.Interaction && App.Interaction.isDragging()) return;
          clrHL(); App.UI.hideTooltip();
        });
        bl.addEventListener('contextmenu', (e) => { e.preventDefault(); App.Interaction.showEventContext(e, ev.id); });

        body.appendChild(bl);
      });

      col.appendChild(body);
      cont.appendChild(col);
      cumX += colW;
    });

    cont.style.width = cumX + 'px';
    cont.style.height = (HDRH + EPPX + 40) + 'px';
    applyZoom();
    doFilter();
  }

  function hlRel(id) {
    const cns = App.Store.get().connections;
    const rel = new Set([id]);
    cns.forEach(c => { if(c.from===id) rel.add(c.to); if(c.to===id) rel.add(c.from); });
    document.querySelectorAll('.evb').forEach(el => {
      if(rel.has(el.dataset.id)) el.classList.add('hl'); else el.classList.add('dim');
    });
  }
  function clrHL() {
    document.querySelectorAll('.evb').forEach(el => el.classList.remove('hl','dim','warn-hl','impact-1','impact-2','impact-3'));
  }

  function applyZoom() {
    const c = U.$('tlC');
    c.style.transform = `scale(${zoomLvl})`; c.style.transformOrigin = '0 0';
    document.getElementById('zLvl').textContent = Math.round(zoomLvl*100) + '%';
  }
  function zoomIn() { zoomLvl = Math.min(3, zoomLvl + 0.15); applyZoom(); }
  function zoomOut() { zoomLvl = Math.max(0.25, zoomLvl - 0.15); applyZoom(); }
  function zoomReset() { zoomLvl = 1; applyZoom(); }
  function getZoom() { return zoomLvl; }
  function setZoom(z) { zoomLvl = z; applyZoom(); }

  function doFilter() {
    flt.ep = document.getElementById('fEp').value;
    flt.ch = document.getElementById('fCh').value;
    const P = App.Store.get();
    document.querySelectorAll('.evb').forEach(el => {
      const ev = P.events.find(e => e.id === el.dataset.id);
      if(!ev) { el.style.display = 'none'; return; }
      let v = true;
      if(flt.ep !== 'all' && ev.episodeId !== flt.ep) v = false;
      if(flt.ch !== 'all' && !(ev.characters||[]).includes(flt.ch)) v = false;
      if(!flt.cats.has(ev.category)) v = false;
      el.style.display = v ? '' : 'none';
    });
    document.querySelectorAll('.ep-row').forEach(row => {
      if(flt.ep === 'all') { row.style.display = ''; return; }
      const body = row.querySelector('.ep-body');
      if(!body) return;
      row.style.display = body.dataset.ep === flt.ep ? '' : 'none';
    });
  }

  function scrollToEvent(id) {
    const el = document.querySelector(`[data-id="${id}"]`);
    if(el) el.scrollIntoView({behavior:'smooth', block:'center', inline:'center'});
  }

  return { render, buildToolbar, initFilter, applyZoom, zoomIn, zoomOut, zoomReset, getZoom, setZoom, doFilter, hlRel, clrHL, scrollToEvent };
})();
