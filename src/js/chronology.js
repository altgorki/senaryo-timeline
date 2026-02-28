// ═══ CHRONOLOGY MODULE — Gantt Chart ═══
App.Chronology = (function(){
  const U = App.Utils;
  const S = App.Store;
  let _mounted = false;
  let _zoom = 'day'; // 'year' | 'month' | 'day'
  let _filterCharId = 'all';
  let _filterCatId = 'all';
  let _dragState = null;

  // ── PUBLIC API ──
  function isMounted() { return _mounted; }

  function unmount() {
    _mounted = false;
    _dragState = null;
    _filterCharId = 'all';
    _filterCatId = 'all';
  }

  function setZoom(z) {
    _zoom = z;
    if(_mounted) render();
  }

  function filterByCharacter(charId) {
    _filterCharId = charId || 'all';
    if(_mounted) render();
  }

  function filterByCategory(catId) {
    _filterCatId = catId || 'all';
    if(_mounted) render();
  }

  // ── DATE HELPERS ──
  function _parseD(s) {
    if(!s) return null;
    return new Date(s + 'T00:00:00');
  }

  function _daysBetween(a, b) {
    return Math.round((b - a) / 86400000);
  }

  function _addDays(d, n) {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  }

  function _fmtDate(d) {
    if(typeof d === 'string') d = _parseD(d);
    if(!d || isNaN(d)) return '';
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    return dd+'/'+mm+'/'+d.getFullYear();
  }

  function _toYMD(d) {
    if(typeof d === 'string') return d;
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return y+'-'+m+'-'+dd;
  }

  // ── GET EFFECTIVE DATE ──
  function _getEventDate(ev, P) {
    if(ev.storyDate) return ev.storyDate;
    const ep = P.episodes.find(e=>e.id===ev.episodeId);
    return ep ? ep.storyDate || null : null;
  }

  // ── BUILD GANTT DATA ──
  function _buildGanttData() {
    const P = S.get();
    const episodes = [...P.episodes].sort((a,b)=>a.order-b.order);

    // Collect all dated events grouped by episode
    const rows = [];
    const allDates = [];

    episodes.forEach(ep => {
      let epEvents = P.events.filter(e=>e.episodeId===ep.id);

      // Apply character filter
      if(_filterCharId !== 'all') {
        epEvents = epEvents.filter(e=>(e.characters||[]).includes(_filterCharId));
      }
      // Apply category filter
      if(_filterCatId !== 'all') {
        epEvents = epEvents.filter(e=>e.category===_filterCatId);
      }

      const datedEvents = [];
      epEvents.forEach(ev => {
        const dt = _getEventDate(ev, P);
        if(dt) {
          datedEvents.push({ ev, date: dt });
          allDates.push(dt);
        } else if(ep.storyDate) {
          datedEvents.push({ ev, date: ep.storyDate });
          allDates.push(ep.storyDate);
        }
      });

      if(datedEvents.length > 0) {
        rows.push({ episode: ep, events: datedEvents.sort((a,b)=>a.date.localeCompare(b.date)) });
      }
    });

    if(!allDates.length) return null;

    allDates.sort();
    const minDate = allDates[0];
    const maxDate = allDates[allDates.length - 1];

    const zoom = _zoom;

    // Build timeline grid — only for periods with events
    const grid = _buildGrid(allDates, zoom);

    // Get warnings
    const warnings = App.Analysis.getWarnings();
    const warnMap = {};
    warnings.forEach(w => { if(w.id) { if(!warnMap[w.id]) warnMap[w.id] = []; warnMap[w.id].push(w); } });

    return { rows, grid, zoom, minDate, maxDate, warnMap, warnings };
  }

  // ── BUILD GRID — only active periods ──
  function _buildGrid(allDates, zoom) {
    const grid = { headers: [], cells: [], totalWidth: 0, cellWidth: 0, dateToX: null };

    if(zoom === 'year') {
      // Collect unique years that have events
      const yearSet = new Set();
      allDates.forEach(d => yearSet.add(parseInt(d.split('-')[0])));
      const years = [...yearSet].sort((a,b) => a - b);
      const cellW = 100;
      grid.cellWidth = cellW;

      const yearIndex = {};
      years.forEach((y, i) => {
        yearIndex[y] = i;
        grid.cells.push({ date: y+'-01-01', x: i * cellW, w: cellW, label: String(y) });
      });
      grid.totalWidth = years.length * cellW;

      grid.dateToX = function(dateStr) {
        const yr = parseInt(dateStr.split('-')[0]);
        const idx = yearIndex[yr];
        if(idx === undefined) {
          // Find nearest year
          let best = 0;
          years.forEach((y,i) => { if(Math.abs(y-yr) < Math.abs(years[best]-yr)) best = i; });
          return best * cellW + cellW * 0.5;
        }
        // Position within the year column
        const d = _parseD(dateStr);
        const startOfYear = new Date(yr, 0, 1);
        const endOfYear = new Date(yr, 11, 31);
        const frac = _daysBetween(startOfYear, d) / Math.max(1, _daysBetween(startOfYear, endOfYear));
        return idx * cellW + frac * (cellW * 0.7) + cellW * 0.15;
      };

    } else if(zoom === 'month') {
      // Collect unique year-months that have events
      const monthSet = new Set();
      allDates.forEach(d => {
        const p = d.split('-');
        monthSet.add(p[0] + '-' + p[1]);
      });
      const monthKeys = [...monthSet].sort();
      const cellW = 80;
      grid.cellWidth = cellW;
      const monthNames = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];

      const monthIndex = {};
      let lastYear = '';
      let yearStart = 0, yearSpan = 0;

      monthKeys.forEach((mk, i) => {
        monthIndex[mk] = i;
        const [y, m] = mk.split('-');
        const mIdx = parseInt(m) - 1;

        if(y !== lastYear) {
          if(lastYear) grid.headers.push({ label: lastYear, span: yearSpan, x: yearStart * cellW });
          lastYear = y; yearStart = i; yearSpan = 0;
        }
        yearSpan++;
        grid.cells.push({ date: mk + '-01', x: i * cellW, w: cellW, label: monthNames[mIdx] + ' ' + y.slice(2) });
      });
      if(lastYear) grid.headers.push({ label: lastYear, span: yearSpan, x: yearStart * cellW });
      grid.totalWidth = monthKeys.length * cellW;

      grid.dateToX = function(dateStr) {
        const p = dateStr.split('-');
        const mk = p[0] + '-' + p[1];
        const idx = monthIndex[mk];
        if(idx === undefined) {
          const keys = Object.keys(monthIndex);
          let best = keys[0];
          keys.forEach(k => { if(Math.abs(k.localeCompare(mk)) < Math.abs(best.localeCompare(mk))) best = k; });
          return (monthIndex[best] || 0) * cellW + cellW * 0.5;
        }
        const day = parseInt(p[2] || '1');
        const daysInMonth = new Date(parseInt(p[0]), parseInt(p[1]), 0).getDate();
        const frac = (day - 1) / daysInMonth;
        return idx * cellW + frac * (cellW * 0.7) + cellW * 0.15;
      };

    } else { // day — only dates with events
      const daySet = new Set();
      allDates.forEach(d => daySet.add(d.substring(0, 10)));
      const days = [...daySet].sort();
      const cellW = 200;
      grid.cellWidth = cellW;
      const monthNames = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];

      const dayIndex = {};
      let lastLabel = '', hdrStart = 0, hdrSpan = 0;

      days.forEach((ds, i) => {
        dayIndex[ds] = i;
        const d = _parseD(ds);
        const groupLabel = monthNames[d.getMonth()] + ' ' + d.getFullYear();
        if(groupLabel !== lastLabel) {
          if(lastLabel) grid.headers.push({ label: lastLabel, span: hdrSpan, x: hdrStart * cellW });
          lastLabel = groupLabel; hdrStart = i; hdrSpan = 0;
        }
        hdrSpan++;
        grid.cells.push({ date: ds, x: i * cellW, w: cellW, label: d.getDate() + ' ' + monthNames[d.getMonth()] + ' ' + d.getFullYear() });
      });
      if(lastLabel) grid.headers.push({ label: lastLabel, span: hdrSpan, x: hdrStart * cellW });
      grid.totalWidth = days.length * cellW;

      grid.dateToX = function(dateStr) {
        const key = dateStr.substring(0, 10);
        const idx = dayIndex[key];
        if(idx !== undefined) return idx * cellW + 4;
        // Nearest day
        let best = 0;
        days.forEach((d, i) => { if(Math.abs(d.localeCompare(key)) < Math.abs(days[best].localeCompare(key))) best = i; });
        return best * cellW + 4;
      };
    }

    return grid;
  }

  // ── RENDER ──
  function render() {
    _mounted = true;
    const tlC = document.getElementById('tlC');
    if(!tlC) return;
    const P = S.get();
    const data = _buildGanttData();

    // Count warnings
    const allWarnings = App.Analysis.getWarnings();
    const warnCount = allWarnings.filter(w=>w.tp&&w.tp.startsWith('chrono')).length;

    let h = '';
    // ── Toolbar ──
    h += '<div class="gantt-toolbar">';
    h += '<div class="gantt-zoom-group">';
    h += '<span style="font-size:10px;color:var(--tx3);text-transform:uppercase;font-weight:500;">Zoom</span>';
    const effectiveZoom = data ? data.zoom : 'year';
    ['year','month','day'].forEach(z => {
      const labels = {year:'Yıl',month:'Ay',day:'Gün'};
      const isActive = (_zoom === z || (_zoom === 'auto' && effectiveZoom === z)) ? ' active' : '';
      h += '<button class="gantt-zoom-btn' + isActive + '" onclick="App.Chronology.setZoom(\'' + z + '\')">' + labels[z] + '</button>';
    });
    h += '</div>';
    // Filters
    h += '<div class="gantt-filter-group">';
    h += '<select class="gantt-filter-btn" onchange="App.Chronology.filterByCharacter(this.value)">';
    h += '<option value="all"' + (_filterCharId==='all'?' selected':'') + '>Tüm Karakterler</option>';
    P.characters.forEach(c => {
      h += '<option value="' + c.id + '"' + (_filterCharId===c.id?' selected':'') + '>' + U.escHtml(c.name) + '</option>';
    });
    h += '</select>';
    h += '<select class="gantt-filter-btn" onchange="App.Chronology.filterByCategory(this.value)">';
    h += '<option value="all"' + (_filterCatId==='all'?' selected':'') + '>Tüm Kategoriler</option>';
    Object.entries(P.categories).forEach(([k,v]) => {
      h += '<option value="' + k + '"' + (_filterCatId===k?' selected':'') + '>' + U.escHtml(v.label) + '</option>';
    });
    h += '</select>';
    h += '</div>';
    if(warnCount > 0) {
      h += '<span class="badge" style="margin-left:auto;">' + warnCount + ' uyarı</span>';
    }
    h += '</div>';

    // ── No data ──
    if(!data) {
      h += '<div class="gantt-no-data">Tarih bilgisi girilmemiş. Proje Ayarları\'ndan bölümlere hikaye tarihi ve karakterlere doğum/ölüm tarihi ekleyin.</div>';
      tlC.innerHTML = h;
      return;
    }

    const grid = data.grid;
    const LABEL_WIDTH = 200;
    const BAR_HEIGHT = 28;
    const BAR_GAP = 4;
    const CONTENT_WIDTH = LABEL_WIDTH + grid.totalWidth;

    // ── Gantt Container ──
    h += '<div class="gantt-container" id="ganttContainer">';
    h += '<div class="gantt-scroll-body" style="min-width:' + CONTENT_WIDTH + 'px;">';

    // ── Header (sticky top) ──
    h += '<div class="gantt-header">';
    h += '<div style="padding-left:' + LABEL_WIDTH + 'px;">';
    // Top header row (year groups in month mode, month groups in day mode)
    if(grid.headers.length && data.zoom !== 'year') {
      h += '<div class="gantt-header-top" style="width:' + grid.totalWidth + 'px;">';
      grid.headers.forEach(hdr => {
        h += '<div class="gantt-header-year" style="left:' + hdr.x + 'px;width:' + (hdr.span * grid.cellWidth) + 'px;">' + hdr.label + '</div>';
      });
      h += '</div>';
    }
    // Bottom header row (individual cells)
    h += '<div class="gantt-header-bottom" style="width:' + grid.totalWidth + 'px;">';
    grid.cells.forEach(cell => {
      h += '<div class="gantt-header-cell" style="left:' + cell.x + 'px;width:' + cell.w + 'px;">' + cell.label + '</div>';
    });
    h += '</div>';
    h += '</div>'; // /padding wrapper
    h += '</div>'; // /gantt-header

    // ── Rows ──
    h += '<div class="gantt-rows">';
    data.rows.forEach((row, rowIdx) => {
      const ep = row.episode;
      const evCount = row.events.length;
      // Calculate row height based on stacked bars
      const stackMap = {};
      row.events.forEach(item => {
        const key = _stackKey(item.date, data.zoom);
        if(!stackMap[key]) stackMap[key] = 0;
        stackMap[key]++;
      });
      const maxStack = Math.max(1, ...Object.values(stackMap));
      const rowH = Math.max(56, maxStack * (BAR_HEIGHT + BAR_GAP) + 16);

      h += '<div class="gantt-row" data-epid="' + ep.id + '" data-rowidx="' + rowIdx + '" style="min-height:' + rowH + 'px;">';

      // Row label (sticky left)
      h += '<div class="gantt-row-label" style="width:' + LABEL_WIDTH + 'px;min-width:' + LABEL_WIDTH + 'px;">';
      h += '<div class="gantt-row-title">B' + ep.number + ' — ' + U.escHtml(ep.title||'') + '</div>';
      if(ep.storyDate) h += '<div class="gantt-row-date">' + _fmtDate(ep.storyDate) + '</div>';
      h += '<div class="gantt-row-count">' + evCount + ' olay</div>';
      h += '</div>';

      // Row content area
      h += '<div class="gantt-row-content" style="width:' + grid.totalWidth + 'px;min-height:' + rowH + 'px;position:relative;">';

      // Vertical grid lines
      grid.cells.forEach(cell => {
        h += '<div class="gantt-grid-line" style="left:' + cell.x + 'px;"></div>';
      });

      // Bars
      const stackCounters = {};
      row.events.forEach(item => {
        const ev = item.ev;
        const dt = item.date;
        const x = grid.dateToX(dt);
        const cat = P.categories[ev.category];
        const catColor = cat ? U.sanitizeColor(cat.color) : '#888';
        const isFlashback = ev.category === 'flashback';
        const isFlashforward = ev.category === 'flashforward';

        // Stack position
        const sk = _stackKey(dt, data.zoom);
        if(!stackCounters[sk]) stackCounters[sk] = 0;
        const stackIdx = stackCounters[sk]++;
        const top = 8 + stackIdx * (BAR_HEIGHT + BAR_GAP);

        // Bar width — fill the cell
        const barW = grid.cellWidth - 12;

        // CSS classes
        let barCls = 'gantt-bar';
        if(isFlashback) barCls += ' flashback';
        if(isFlashforward) barCls += ' flashforward';

        const evWarns = data.warnMap[ev.id] || [];
        if(evWarns.length) barCls += ' has-warn';

        h += '<div class="' + barCls + '" data-evid="' + ev.id + '" data-epid="' + ep.id + '"';
        h += ' style="left:' + x + 'px;top:' + top + 'px;width:' + barW + 'px;height:' + BAR_HEIGHT + 'px;background:' + catColor + ';"';
        h += ' title="' + U.escHtml(ev.title) + '\n' + _fmtDate(dt) + '"';
        h += '>';
        if(evWarns.length) h += '<span class="warn-icon">⚠</span>';
        h += '<span class="gantt-bar-label">' + U.escHtml(ev.title) + '</span>';
        h += '</div>';
      });

      h += '</div>'; // /gantt-row-content
      h += '</div>'; // /gantt-row
    });
    h += '</div>'; // /gantt-rows
    h += '</div>'; // /gantt-scroll-body
    h += '</div>'; // /gantt-container

    tlC.innerHTML = h;
    _attachEventListeners();
  }

  function _stackKey(date, zoom) {
    if(zoom === 'year') return date.substring(0, 4);
    if(zoom === 'month') return date.substring(0, 7);
    return date.substring(0, 10);
  }

  // ── EVENT LISTENERS ──
  function _attachEventListeners() {
    const container = document.getElementById('ganttContainer');
    if(!container) return;

    // Click on bar → open edit panel
    container.addEventListener('click', function(e) {
      const bar = e.target.closest('.gantt-bar');
      if(bar && !_dragState) {
        const evId = bar.dataset.evid;
        if(evId) App.Panels.openEditEvent(evId);
      }
    });

    // Drag & Drop
    container.addEventListener('pointerdown', function(e) {
      const bar = e.target.closest('.gantt-bar');
      if(!bar) return;
      const evId = bar.dataset.evid;
      if(!evId) return;

      _dragState = {
        evId,
        epId: bar.dataset.epid,
        startX: e.clientX,
        startY: e.clientY,
        barLeft: bar.offsetLeft,
        barTop: bar.offsetTop,
        moved: false,
        bar
      };

      bar.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    container.addEventListener('pointermove', function(e) {
      if(!_dragState) return;
      const dx = e.clientX - _dragState.startX;
      const dy = e.clientY - _dragState.startY;

      if(!_dragState.moved && Math.abs(dx) + Math.abs(dy) < 5) return;
      _dragState.moved = true;

      _dragState.bar.classList.add('dragging');
      _dragState.bar.style.left = (_dragState.barLeft + dx) + 'px';
      _dragState.bar.style.top = (_dragState.barTop + dy) + 'px';

      const rows = container.querySelectorAll('.gantt-row');
      rows.forEach(row => row.classList.remove('drop-target'));
      const targetRow = _getRowAtY(container, e.clientY);
      if(targetRow) targetRow.classList.add('drop-target');
    });

    container.addEventListener('pointerup', function(e) {
      if(!_dragState) return;
      const ds = _dragState;
      _dragState = null;

      ds.bar.classList.remove('dragging');
      if(!ds.moved) return;

      const ev = S.getEvent(ds.evId);
      if(!ev) return;

      const data = _buildGanttData();
      if(!data) return;
      const grid = data.grid;

      // Calculate new date from pixel position
      const contentEl = ds.bar.closest('.gantt-row-content');
      if(!contentEl) return;
      const contentRect = contentEl.getBoundingClientRect();
      const newX = e.clientX - contentRect.left + contentEl.scrollLeft;
      const newDate = _xToDate(grid, newX);

      // Check if dropped on a different row
      const targetRow = _getRowAtY(document.getElementById('ganttContainer'), e.clientY);
      let newEpId = ev.episodeId;
      if(targetRow && targetRow.dataset.epid) {
        newEpId = targetRow.dataset.epid;
      }

      S.snapshot();
      if(newDate) ev.storyDate = newDate;
      if(newEpId !== ev.episodeId) {
        var oldEpId = ev.episodeId;
        ev.episodeId = newEpId;
        if(ev.sceneId) {
          var sc = S.getScene(ev.sceneId);
          if(sc) sc.episodeId = newEpId;
        }
        S.syncSceneOrderFromEvents(newEpId);
        S.syncSceneOrderFromEvents(oldEpId);
        S.markDirty(['events','scenes']);
      } else {
        S.markDirty('events');
      }
      S.emit('change', { type:'ganttDrag', targetId: ev.id, targetName: ev.title });

      document.querySelectorAll('.gantt-row.drop-target').forEach(r => r.classList.remove('drop-target'));
    });
  }

  function _getRowAtY(container, clientY) {
    const rows = container.querySelectorAll('.gantt-row');
    for(const row of rows) {
      const rect = row.getBoundingClientRect();
      if(clientY >= rect.top && clientY <= rect.bottom) return row;
    }
    return null;
  }

  function _xToDate(grid, x) {
    let closest = null;
    let minDist = Infinity;
    grid.cells.forEach(cell => {
      const mid = cell.x + cell.w / 2;
      const dist = Math.abs(x - mid);
      if(dist < minDist) { minDist = dist; closest = cell; }
    });
    return closest ? closest.date : null;
  }

  return { render, unmount, isMounted, setZoom, filterByCharacter, filterByCategory, _onCellClick: function(){}, _clearSelection: function(){} };
})();
