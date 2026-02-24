// ═══ ANALYSIS MODULE ═══
App.Analysis = (function(){
  const U = App.Utils;
  const S = App.Store;
  let cachedWarnings = null;

  function invalidateCache() { cachedWarnings = null; }

  function getWarnings() {
    if(cachedWarnings) return cachedWarnings;
    const P = S.get();
    const warns = [];
    const EPDUR = S.getEPDUR();

    // Overflow
    P.events.forEach(ev => {
      if(ev.s + ev.dur > EPDUR + 5) {
        const ep = P.episodes.find(e=>e.id===ev.episodeId);
        warns.push({ tp:'overflow', id:ev.id, t:'Süre Taşması', d:`"${ev.title}" (${U.epLbl(ep?.number||'?')}) bölüm süresini aşıyor.`,
          fix:()=>{ S.snapshot(); ev.dur = EPDUR - ev.s; S.emit('change',{type:'fix',targetId:ev.id,targetName:ev.title||''}); App.UI.toast('Düzeltildi'); } });
      }
    });

    // Dependency errors
    const epOrder = {};
    P.episodes.forEach((ep,i) => epOrder[ep.id] = i);
    P.connections.filter(c=>c.type==='neden').forEach(cn => {
      const fe = S.getEvent(cn.from), te = S.getEvent(cn.to);
      if(!fe || !te) return;
      const fAbs = (epOrder[fe.episodeId]||0) * EPDUR + fe.s + fe.dur;
      const tAbs = (epOrder[te.episodeId]||0) * EPDUR + te.s;
      if(fAbs > tAbs + 30)
        warns.push({ tp:'dep', id:cn.from, id2:cn.to, t:'Bağımlılık Hatası', d:`"${fe.title}" → "${te.title}": Neden, sonuçtan sonra!`,
          fix:()=>{ S.snapshot(); const newAbs=fAbs+60; const eps=P.episodes; const newEpIdx=Math.min(Math.floor(newAbs/EPDUR),eps.length-1); te.episodeId=eps[newEpIdx].id; te.s=Math.min(newAbs%EPDUR,EPDUR-te.dur); S.emit('change',{type:'fix',targetId:te.id,targetName:te.title||''}); App.UI.toast('Taşındı'); } });
    });

    // Overlaps
    P.episodes.forEach(ep => {
      const re = P.events.filter(e=>e.episodeId===ep.id).sort((a,b)=>a.s-b.s);
      for(let i=0;i<re.length;i++) for(let j=i+1;j<re.length;j++) {
        if(re[i]._lane===re[j]._lane && re[j].s < re[i].s+re[i].dur)
          warns.push({ tp:'overlap', id:re[i].id, id2:re[j].id, t:'Çakışma', d:`"${re[i].title}" ile "${re[j].title}" çakışıyor.`,
            fix:()=>{ S.snapshot(); re[j].s=re[i].s+re[i].dur; S.emit('change',{type:'fix',targetId:re[j].id,targetName:re[j].title||''}); App.UI.toast('Düzeltildi'); } });
      }
    });

    // Gaps
    P.episodes.forEach(ep => {
      if(ep.number==='fb') return;
      const re = P.events.filter(e=>e.episodeId===ep.id).sort((a,b)=>a.s-b.s);
      if(!re.length) return;
      let cur = 0;
      re.forEach(ev => {
        if(ev.s - cur > 600)
          warns.push({ tp:'gap', id:ev.id, t:'Boşluk', d:`${U.epLbl(ep.number)}: ${U.s2t(cur)}–${U.s2t(ev.s)} arası ${Math.round((ev.s-cur)/60)}dk boş.` });
        cur = Math.max(cur, ev.s + ev.dur);
      });
    });

    // Character conflict (same character in 2 places at same time, same episode)
    P.episodes.forEach(ep => {
      const evs = P.events.filter(e=>e.episodeId===ep.id);
      for(let i=0;i<evs.length;i++) for(let j=i+1;j<evs.length;j++) {
        if(evs[i].s < evs[j].s+evs[j].dur && evs[i].s+evs[i].dur > evs[j].s) {
          const shared = (evs[i].characters||[]).filter(c=>(evs[j].characters||[]).includes(c));
          shared.forEach(cid => {
            const ch = P.characters.find(c=>c.id===cid);
            warns.push({ tp:'charConflict', id:evs[i].id, id2:evs[j].id, t:'Karakter Çakışması', d:`${ch?ch.name:cid} aynı anda "${evs[i].title}" ve "${evs[j].title}" sahnelerinde.` });
          });
        }
      }
    });

    // Orphan events
    P.events.forEach(ev => {
      const cns = P.connections.filter(c=>c.from===ev.id||c.to===ev.id);
      if(cns.length===0 && P.events.length > 5)
        warns.push({ tp:'orphan', id:ev.id, t:'Yetim Olay', d:`"${ev.title}" hiçbir olaya bağlı değil.` });
    });

    // Cycle detection
    const cycles = detectCycles();
    cycles.forEach(cycle => {
      warns.push({ tp:'cycle', id:cycle[0], t:'Döngüsel Bağımlılık', d:`Döngü: ${cycle.map(id=>{const e=S.getEvent(id);return e?e.title:id;}).join(' → ')}` });
    });

    // Empty scenes
    P.scenes.forEach(sc => {
      if(!sc.content || sc.content.length === 0 || sc.content.every(b=>!b.text||!b.text.trim()))
        warns.push({ tp:'empty', id:null, t:'Boş Sahne', d:`"${sc.title}" sahnesinde içerik yok.` });
    });

    cachedWarnings = warns;
    return warns;
  }

  function detectCycles() {
    const P = S.get();
    const adj = {};
    P.connections.filter(c=>c.type==='neden').forEach(c => {
      if(!adj[c.from]) adj[c.from] = [];
      adj[c.from].push(c.to);
    });
    const visited = new Set(), stack = new Set(), cycles = [];
    function dfs(node, path) {
      if(stack.has(node)) { cycles.push([...path.slice(path.indexOf(node)), node]); return; }
      if(visited.has(node)) return;
      visited.add(node); stack.add(node); path.push(node);
      (adj[node]||[]).forEach(n => dfs(n, path));
      path.pop(); stack.delete(node);
    }
    Object.keys(adj).forEach(n => { if(!visited.has(n)) dfs(n, []); });
    return cycles;
  }

  // Critical path (longest chain via topo sort + DP)
  function getCriticalPath() {
    const P = S.get();
    const adj = {}, inDeg = {};
    P.events.forEach(e => { adj[e.id] = []; inDeg[e.id] = 0; });
    P.connections.filter(c=>c.type==='neden').forEach(c => {
      if(adj[c.from]) { adj[c.from].push(c.to); inDeg[c.to] = (inDeg[c.to]||0) + 1; }
    });
    // Topo sort (Kahn's)
    const q = Object.keys(inDeg).filter(k=>inDeg[k]===0);
    const order = [];
    while(q.length) {
      const n = q.shift(); order.push(n);
      (adj[n]||[]).forEach(m => { inDeg[m]--; if(inDeg[m]===0) q.push(m); });
    }
    // DP for longest path
    const dist = {}, prev = {};
    order.forEach(n => { dist[n] = 0; prev[n] = null; });
    order.forEach(n => {
      (adj[n]||[]).forEach(m => {
        const ev = S.getEvent(n);
        const w = ev ? ev.dur : 0;
        if(dist[n] + w > (dist[m]||0)) { dist[m] = dist[n] + w; prev[m] = n; }
      });
    });
    // Find end with max dist
    let maxNode = null, maxDist = 0;
    Object.entries(dist).forEach(([k,v]) => { if(v > maxDist) { maxDist = v; maxNode = k; } });
    // Trace back
    const path = [];
    let cur = maxNode;
    while(cur) { path.unshift(cur); cur = prev[cur]; }
    return { path, length: maxDist };
  }

  // BFS impact analysis
  function getImpact(evId) {
    const P = S.get();
    const adj = {};
    P.connections.filter(c=>c.type==='neden').forEach(c => {
      if(!adj[c.from]) adj[c.from] = [];
      adj[c.from].push(c.to);
    });
    const depths = {};
    const q = [evId];
    depths[evId] = 0;
    while(q.length) {
      const cur = q.shift();
      (adj[cur]||[]).forEach(n => {
        if(!(n in depths)) { depths[n] = depths[cur] + 1; q.push(n); }
      });
    }
    delete depths[evId];
    return depths; // id -> depth
  }

  // Character analysis
  function getCharacterData() {
    const P = S.get();
    const epOrder = {};
    P.episodes.forEach((ep,i) => epOrder[ep.id] = i);
    return P.characters.map(ch => {
      const evs = P.events.filter(e=>(e.characters||[]).includes(ch.id));
      const perEp = {};
      evs.forEach(e => { perEp[e.episodeId] = (perEp[e.episodeId]||0) + e.dur; });
      const totalDur = evs.reduce((s,e)=>s+e.dur,0);
      // Gap detection
      const epNums = [...new Set(evs.map(e=>epOrder[e.episodeId]))].sort((a,b)=>a-b);
      const gaps = [];
      for(let i=1;i<epNums.length;i++) {
        if(epNums[i]-epNums[i-1]>1) gaps.push({ from:epNums[i-1]+1, to:epNums[i]-1 });
      }
      return { char: ch, events: evs, perEp, totalDur, gaps };
    });
  }

  // Tempo analysis (events per minute per episode)
  function getTempoData() {
    const P = S.get();
    return P.episodes.map(ep => {
      const evs = P.events.filter(e=>e.episodeId===ep.id);
      const density = evs.length / (S.getEPDUR()/60);
      const totalDur = evs.reduce((s,e)=>s+e.dur,0);
      const coverage = totalDur / S.getEPDUR();
      return { ep, events: evs.length, density, coverage, totalDur };
    });
  }

  // Render functions for analysis tabs
  function renderConnections() {
    const cp = getCriticalPath();
    const P = S.get();
    if(!cp.path.length) return '<div class="nw">Bağlantı yok</div>';
    let h = '<div style="padding:14px;"><div style="font-size:12px;font-weight:600;margin-bottom:8px;">Kritik Yol (En Uzun Zincir)</div>';
    h += `<div style="font-size:11px;color:var(--tx3);margin-bottom:10px;">Toplam: ${U.s2t(cp.length)} · ${cp.path.length} olay</div>`;
    cp.path.forEach((id,i) => {
      const ev = S.getEvent(id);
      if(!ev) return;
      const cat = P.categories[ev.category]||{color:'#888'};
      h += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;cursor:pointer;" onclick="App.Timeline.scrollToEvent('${id}')">
        <div style="width:8px;height:8px;border-radius:50%;background:${U.sanitizeColor(cat.color)};flex-shrink:0;"></div>
        <span style="font-size:11px;">${U.escHtml(ev.title)}</span>
      </div>`;
      if(i < cp.path.length-1) h += '<div style="margin-left:3px;border-left:2px solid var(--brd);height:12px;"></div>';
    });
    h += '</div>';
    return h;
  }

  function renderTempo() {
    const data = getTempoData();
    if(!data.length) return '<div class="nw">Bölüm yok</div>';
    const maxDensity = Math.max(...data.map(d=>d.density), 0.1);
    let h = '<div style="padding:10px 0;">';
    data.forEach(d => {
      const pct = (d.density / maxDensity * 100).toFixed(0);
      const color = d.density > maxDensity*0.7 ? 'var(--red)' : d.density > maxDensity*0.4 ? 'var(--yellow)' : 'var(--green)';
      h += `<div class="tempo-row">
        <span style="min-width:36px;">${U.epLbl(d.ep.number)}</span>
        <div class="tempo-bar"><div class="tempo-fill" style="width:${pct}%;background:${color};"></div></div>
        <span style="min-width:50px;text-align:right;color:var(--tx3);">${d.events} olay</span>
      </div>`;
    });
    h += '</div>';
    return h;
  }

  function renderCharacters() {
    const data = getCharacterData();
    if(!data.length) return '<div class="nw">Karakter yok</div>';
    const maxDur = Math.max(...data.map(d=>d.totalDur), 1);
    let h = '';
    data.sort((a,b)=>b.totalDur-a.totalDur).forEach(d => {
      const pct = (d.totalDur / maxDur * 100).toFixed(0);
      h += `<div class="char-row">
        <div style="font-size:12px;font-weight:500;">${U.escHtml(d.char.name)}</div>
        <div style="font-size:10px;color:var(--tx3);">${d.events.length} sahne · ${U.s2t(d.totalDur)}</div>
        <div class="char-bar" style="width:${pct}%;background:var(--blue);"></div>
        ${d.gaps.length ? `<div style="font-size:10px;color:var(--orange);margin-top:2px;">⚠ ${d.gaps.map(g=>`B${g.from+1}-B${g.to+1}`).join(', ')} bölümlerinde yok</div>` : ''}
      </div>`;
    });
    return h;
  }

  function renderImpact() {
    const sel = App.Interaction.getSelection();
    if(!sel.length) return '<div class="nw" style="line-height:1.6;">Bir olay seçin ve etki analizini görün.<br><br>Timeline\'da bir olaya tıklayın.</div>';
    const evId = sel[0];
    const ev = S.getEvent(evId);
    if(!ev) return '<div class="nw">Olay bulunamadı</div>';
    const impact = getImpact(evId);
    const impactCount = Object.keys(impact).length;
    if(!impactCount) return `<div class="impact-info"><b>${U.escHtml(ev.title)}</b><br><br>Bu olayın başka olaylara etkisi yok (neden-sonuç bağlantısı bulunmuyor).</div>`;

    let h = `<div class="impact-info"><b>${U.escHtml(ev.title)}</b><br>Bu olay değişirse <b>${impactCount} olay</b> etkilenir.</div>`;
    // Group by depth
    const byDepth = {};
    Object.entries(impact).forEach(([id,depth]) => {
      if(!byDepth[depth]) byDepth[depth] = [];
      byDepth[depth].push(id);
    });
    const depthColors = ['var(--red)','var(--orange)','var(--yellow)','var(--tx3)'];
    Object.keys(byDepth).sort((a,b)=>a-b).forEach(depth => {
      const color = depthColors[Math.min(depth-1, depthColors.length-1)];
      h += `<div style="padding:4px 14px;font-size:10px;color:${color};font-weight:600;margin-top:8px;">${depth}. Derece Etki</div>`;
      byDepth[depth].forEach(id => {
        const e = S.getEvent(id);
        h += `<div style="padding:4px 14px;font-size:11px;cursor:pointer;color:var(--tx2);" onclick="App.Timeline.scrollToEvent('${id}')">${e?U.escHtml(e.title):id}</div>`;
      });
    });

    // Highlight on timeline
    setTimeout(() => {
      App.Timeline.clrHL();
      document.querySelectorAll('.evb').forEach(el => {
        const d = impact[el.dataset.id];
        if(el.dataset.id === evId) el.classList.add('selected');
        else if(d === 1) el.classList.add('impact-1');
        else if(d === 2) el.classList.add('impact-2');
        else if(d >= 3) el.classList.add('impact-3');
        else el.classList.add('dim');
      });
    }, 50);

    return h;
  }

  return { getWarnings, invalidateCache, getCriticalPath, getImpact, getCharacterData, getTempoData, renderConnections, renderTempo, renderCharacters, renderImpact, detectCycles };
})();