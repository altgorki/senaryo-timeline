// ═══ CHRONOLOGY MODULE — Gantt Chart ═══
App.Chronology = (function(){
  const U = App.Utils;
  const S = App.Store;
  let _mounted = false;
  let _zoom = 'auto'; // 'year' | 'month' | 'day' | 'auto'
  let _filterCharId = 'all';
  let _filterCatId = 'all';
  let _dragState = null;
  let _hoveredBarId = null;

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
    const rows = []; // { episode, events:[ {ev, date} ] }
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
        } else {
          // Tarihsiz olaylar bölüm tarihiyle gösterilecek
          if(ep.storyDate) {
            datedEvents.push({ ev, date: ep.storyDate });
            allDates.push(ep.storyDate);
          }
        }
      });

      if(datedEvents.length > 0 || ep.storyDate) {
        rows.push({ episode: ep, events: datedEvents.sort((a,b)=>a.date.localeCompare(b.date)) });
      }
    });

    if(!allDates.length) return null;

    allDates.sort();
    const minDate = allDates[0];
    const maxDate = allDates[allDates.length - 1];

    // Auto-detect zoom
    let zoom = _zoom;
    if(zoom === 'auto') {
      const minD = _parseD(minDate), maxD = _parseD(maxDate);
      const span = _daysBetween(minD, maxD);
      if(span > 3650) zoom = 'year';
      else if(span > 365) zoom = 'month';
      else zoom = 'day';
    }

    // Build timeline grid
    const grid = _buildGrid(minDate, maxDate, zoom);

    // Get warnings
    const warnings = App.Analysis.getWarnings();
    const warnMap = {};
    warnings.forEach(w => { if(w.id) { if(!warnMap[w.id]) warnMap[w.id] = []; warnMap[w.id].push(w); } });

    return { rows, grid, zoom, minDate, maxDate, warnMap, warnings };
  }

  // ── BUILD GRID ──
  function _buildGrid(minDate, maxDate, zoom) {
    const minD = _parseD(minDate), maxD = _parseD(maxDate);
    const grid = { headers: [], cells: [], totalWidth: 0, cellWidth: 0, dateToX: {} };

    if(zoom === 'year') {
      const minY = minD.getFullYear(), maxY = maxD.getFullYear();
      const cellW = 80;
      grid.cellWidth = cellW;
      for(let y = minY; y <= maxY; y++) {
        grid.headers.push({ label: String(y), span: 1 });
        grid.cells.push({ date: y+'-01-01', x: (y-minY)*cellW, w: cellW, label: String(y) });
      }
      grid.totalWidth = (maxY - minY + 1) * cellW;
      // dateToX: maps YYYY-MM-DD → pixel x
      grid.dateToX = function(dateStr) {
        const yr = parseInt(dateStr.split('-')[0]);
        const d = _parseD(dateStr);
        const startOfYear = new Date(yr, 0, 1);
        const endOfYear = new Date(yr, 11, 31);
        const frac = _daysBetween(startOfYear, d) / Math.max(1, _daysBetween(startOfYear, endOfYear));
        return (yr - minY) * cellW + frac * cellW;
      };
    } else if(zoom === 'month') {
      const cellW = 60;
      grid.cellWidth = cellW;
      let x = 0;
      const startM = new Date(minD.getFullYear(), minD.getMonth(), 1);
      const endM = new Date(maxD.getFullYear(), maxD.getMonth(), 1);
      const months = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
      const yearHeaders = [];
      let cur = new Date(startM);
      let lastYearLabel = '';
      let yearStart = 0, yearSpan = 0;

      while(cur <= endM) {
        const yl = String(cur.getFullYear());
        if(yl !== lastYearLabel) {
          if(lastYearLabel) yearHeaders.push({ label: lastYearLabel, span: yearSpan, x: yearStart });
          lastYearLabel = yl; yearStart = x; yearSpan = 0;
        }
        yearSpan++;
        const ml = months[cur.getMonth()];
        grid.cells.push({ date: _toYMD(cur), x, w: cellW, label: ml });
        x += cellW;
        cur.setMonth(cur.getMonth() + 1);
      }
      if(lastYearLabel) yearHeaders.push({ label: lastYearLabel, span: yearSpan, x: yearStart });
      grid.headers = yearHeaders;
      grid.totalWidth = x;

      grid.dateToX = function(dateStr) {
        const d = _parseD(dateStr);
        const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const mEnd = new Date(d.getFullYear(), d.getMonth()+1, 0);
        const frac = (d.getDate()-1) / mEnd.getDate();
        // Find cell index for this month
        const mStr = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-01';
        const cell = grid.cells.find(c=>c.date===mStr);
        if(!cell) {
          // Before grid start
          const first = grid.cells[0];
          if(first) return first.x;
          return 0;
        }
        return cell.x + frac * cellW;
      };
    } else { // day
      const cellW = 28;
      grid.cellWidth = cellW;
      let x = 0;
      const totalDays = _daysBetween(minD, maxD) + 1;
      const monthHeaders = [];
      let lastLabel = '', hdrStart = 0, hdrSpan = 0;
      const months = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];

      for(let i = 0; i < totalDays; i++) {
        const d = _addDays(minD, i);
        const label = months[d.getMonth()] + ' ' + d.getFullYear();
        if(label !== lastLabel) {
          if(lastLabel) monthHeaders.push({ label: lastLabel, span: hdrSpan, x: hdrStart });
          lastLabel = label; hdrStart = x; hdrSpan = 0;
        }
        hdrSpan++;
        grid.cells.push({ date: _toYMD(d), x, w: cellW, label: String(d.getDate()) });
        x += cellW;
      }
      if(lastLabel) monthHeaders.push({ label: lastLabel, span: hdrSpan, x: hdrStart });
      grid.headers = monthHeaders;
      grid.totalWidth = x;

      grid.dateToX = function(dateStr) {
        const d = _parseD(dateStr);
        const idx = _daysBetween(minD, d);
        return Math.max(0, Math.min(idx * cellW, grid.totalWidth - cellW));
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
    // Zoom buttons
    h += '<div class="gantt-zoom-group">';
    h += '<span style="font-size:10px;color:var(--tx3);text-transform:uppercase;font-weight:500;">Zoom</span>';
    const effectiveZoom = data ? data.zoom : 'year';
    ['year','month','day'].forEach(z => {
      const labels = {year:'Yıl',month:'Ay',day:'Gün'};
      const isActive = effectiveZoom === z && _zoom !== 'auto' ? ' active' : (_zoom === 'auto' && effectiveZoom === z ? ' active' : '');
      h += '<button class="gantt-zoom-btn' + isActive + '" onclick="App.Chronology.setZoom(\'' + z + '\')">' + labels[z] + '</button>';
    });
    h += '</div>';
    // Character filter
    h += '<div class="gantt-filter-group">';
    h += '<select class="gantt-filter-btn" onchange="App.Chronology.filterByCharacter(this.value)">';
    h += '<option value="all"' + (_filterCharId==='all'?' selected':'') + '>Tüm Karakterler</option>';
    P.characters.forEach(c => {
      h += '<option value="' + c.id + '"' + (_filterCharId===c.id?' selected':'') + '>' + U.escHtml(c.name) + '</option>';
    });
    h += '</select>';
    // Category filter
    h += '<select class="gantt-filter-btn" onchange="App.Chronology.filterByCategory(this.value)">';
    h += '<option value="all"' + (_filterCatId==='all'?' selected':'') + '>Tüm Kategoriler</option>';
    Object.entries(P.categories).forEach(([k,v]) => {
      h += '<option value="' + k + '"' + (_filterCatId===k?' selected':'') + '>' + U.escHtml(v.label) + '</option>';
    });
    h += '</select>';
    h += '</div>';
    // Warning count
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
    const ROW_HEIGHT = 64;
    const LABEL_WIDTH = 180;
    const BAR_HEIGHT = 22;
    const BAR_GAP = 4;
    const BAR_MIN_WIDTH = 16;

    // ── Gantt Container ──
    h += '<div class="gantt-container" id="ganttContainer">';

    // ── Header (sticky top) ──
    h += '<div class="gantt-header" style="padding-left:' + LABEL_WIDTH + 'px;">';
    // Top header row (years in month mode, months in day mode)
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
    h += '</div>'; // /gantt-header

    // ── Rows ──
    h += '<div class="gantt-rows">';
    data.rows.forEach((row, rowIdx) => {
      const ep = row.episode;
      const evCount = row.events.length;
      // Calculate row height based on stacked bars
      const stackMap = {};
      row.events.forEach(item => {
        const key = item.date;
        if(!stackMap[key]) stackMap[key] = 0;
        stackMap[key]++;
      });
      const maxStack = Math.max(1, ...Object.values(stackMap));
      const rowH = Math.max(ROW_HEIGHT, maxStack * (BAR_HEIGHT + BAR_GAP) + 16);

      h += '<div class="gantt-row" data-epid="' + ep.id + '" data-rowidx="' + rowIdx + '" style="height:' + rowH + 'px;">';

      // Row label (sticky left)
      h += '<div class="gantt-row-label" style="width:' + LABEL_WIDTH + 'px;">';
      h += '<div class="gantt-row-title">B' + ep.number + ' — ' + U.escHtml(ep.title||'') + '</div>';
      if(ep.storyDate) h += '<div class="gantt-row-date">' + _fmtDate(ep.storyDate) + '</div>';
      h += '<div class="gantt-row-count">' + evCount + ' olay</div>';
      h += '</div>';

      // Row content area (bars)
      h += '<div class="gantt-row-content" style="width:' + grid.totalWidth + 'px;height:' + rowH + 'px;">';

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
        const stackKey = dt.substring(0, data.zoom === 'year' ? 4 : (data.zoom === 'month' ? 7 : 10));
        if(!stackCounters[stackKey]) stackCounters[stackKey] = 0;
        const stackIdx = stackCounters[stackKey]++;
        const top = 8 + stackIdx * (BAR_HEIGHT + BAR_GAP);

        // Bar width
        const barW = Math.max(BAR_MIN_WIDTH, grid.cellWidth - 4);

        // CSS classes
        let barCls = 'gantt-bar';
        if(isFlashback) barCls += ' flashback';
        if(isFlashforward) barCls += ' flashforward';

        // Warnings
        const evWarns = data.warnMap[ev.id] || [];
        const hasWarn = evWarns.length > 0;
        if(hasWarn) barCls += ' has-warn';

        // Truncate title for bar label
        const label = ev.title.length > 20 ? ev.title.substring(0,18) + '…' : ev.title;

        h += '<div class="' + barCls + '" data-evid="' + ev.id + '" data-epid="' + ep.id + '"';
        h += ' style="left:' + x + 'px;top:' + top + 'px;width:' + barW + 'px;height:' + BAR_HEIGHT + 'px;background:' + catColor + ';"';
        h += ' title="' + U.escHtml(ev.title) + ' (' + _fmtDate(dt) + ')"';
        h += '>';
        if(hasWarn) h += '<span class="warn-icon">⚠</span>';
        h += '<span class="gantt-bar-label">' + U.escHtml(label) + '</span>';
        h += '</div>';
      });

      h += '</div>'; // /gantt-row-content
      h += '</div>'; // /gantt-row
    });
    h += '</div>'; // /gantt-rows
    h += '</div>'; // /gantt-container

    tlC.innerHTML = h;

    // ── Event Listeners ──
    _attachEventListeners();
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

      const rect = bar.getBoundingClientRect();
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

      // Highlight target row
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

      if(!ds.moved) return; // was just a click

      const P = S.get();
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

      // Find nearest grid cell
      const newDate = _xToDate(grid, newX);

      // Check if dropped on a different row (episode change)
      const targetRow = _getRowAtY(document.getElementById('ganttContainer'), e.clientY);
      let newEpId = ev.episodeId;
      if(targetRow && targetRow.dataset.epid) {
        newEpId = targetRow.dataset.epid;
      }

      // Apply changes
      S.snapshot();
      if(newDate) ev.storyDate = newDate;
      if(newEpId !== ev.episodeId) ev.episodeId = newEpId;
      S.markDirty('events');
      S.emit('change', { type:'ganttDrag', targetId: ev.id, targetName: ev.title });

      // Clean up
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
    // Find the closest cell
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
