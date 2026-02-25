// ═══ CHRONOLOGY MODULE ═══
App.Chronology = (function(){
  const U = App.Utils;
  const S = App.Store;
  let _mounted = false;
  let _filterCharId = 'all';
  let _selectedCell = null; // {charId, year}

  function isMounted() { return _mounted; }

  function unmount() {
    _mounted = false;
    _selectedCell = null;
    _filterCharId = 'all';
  }

  function filterByCharacter(charId) {
    _filterCharId = charId || 'all';
    if(_mounted) render();
  }

  // ── DATA ──
  function _buildChronologyData() {
    const P = S.get();
    const getYear = App.Analysis.getEventYear;

    // Collect all unique years from episodes and events
    const yearSet = new Set();
    P.episodes.forEach(ep => { if(ep.storyYear) yearSet.add(ep.storyYear); });
    P.events.forEach(ev => {
      const yr = getYear(ev, P);
      if(yr) yearSet.add(yr);
    });
    const years = [...yearSet].sort((a,b) => a - b);
    if(!years.length) return { years:[], characters:[], cells:{}, warnings:[] };

    // Filter characters
    let chars = P.characters;
    if(_filterCharId !== 'all') chars = chars.filter(c => c.id === _filterCharId);

    // Build cells: charId -> year -> { age, events, warnings, isDeath }
    const cells = {};
    const warnings = App.Analysis.getWarnings();
    const chronoWarnings = warnings.filter(w => w.tp && w.tp.startsWith('chrono'));

    chars.forEach(ch => {
      cells[ch.id] = {};
      years.forEach(yr => {
        const age = ch.birthYear ? yr - ch.birthYear : null;
        const isDeath = ch.deathYear ? yr === ch.deathYear : false;
        const isAfterDeath = ch.deathYear ? yr > ch.deathYear : false;
        const isBeforeBirth = ch.birthYear ? yr < ch.birthYear : false;
        // Find events for this character in this year
        const evs = P.events.filter(ev => {
          if(!(ev.characters||[]).includes(ch.id)) return false;
          return getYear(ev, P) === yr;
        });
        // Find warnings for this character in this year's events
        const cellWarnings = chronoWarnings.filter(w => {
          if(!w.id) return false;
          const ev = S.getEvent(w.id);
          if(!ev) return false;
          if(!(ev.characters||[]).includes(ch.id)) return false;
          return getYear(ev, P) === yr;
        });
        if(evs.length || (age !== null && !isBeforeBirth)) {
          cells[ch.id][yr] = { age, events: evs, warnings: cellWarnings, isDeath, isAfterDeath, isBeforeBirth };
        }
      });
    });

    return { years, characters: chars, cells, warnings: chronoWarnings };
  }

  // ── RENDER ──
  function render() {
    _mounted = true;
    const tlC = document.getElementById('tlC');
    if(!tlC) return;
    const data = _buildChronologyData();
    const P = S.get();

    // Count total warnings
    const warnCount = data.warnings.length;

    let h = '';
    // Toolbar
    h += '<div class="kronoloji-toolbar">';
    h += '<label style="font-size:10px;color:var(--tx3);text-transform:uppercase;font-weight:500;">Karakter</label>';
    h += '<select id="kronoCharFilter" onchange="App.Chronology.filterByCharacter(this.value)">';
    h += '<option value="all"' + (_filterCharId==='all'?' selected':'') + '>Tümü (' + P.characters.length + ')</option>';
    P.characters.forEach(c => {
      h += '<option value="' + c.id + '"' + (_filterCharId===c.id?' selected':'') + '>' + U.escHtml(c.name) + '</option>';
    });
    h += '</select>';
    h += '<span style="font-size:11px;color:var(--tx3);">' + data.years.length + ' yıl</span>';
    if(warnCount > 0) {
      h += '<span class="badge" style="margin-left:8px;">' + warnCount + ' uyarı</span>';
    }
    h += '</div>';

    if(!data.years.length) {
      h += '<div style="padding:40px;text-align:center;color:var(--tx3);font-size:13px;">Kronoloji verisi yok. Proje Ayarları\'ndan bölümlere hikaye yılı ve karakterlere doğum/ölüm yılı ekleyin.</div>';
      tlC.innerHTML = h;
      return;
    }

    // Matrix table
    h += '<div class="kronoloji-table-wrap">';
    h += '<table class="kronoloji-table">';

    // Header row
    h += '<thead><tr><th class="kronoloji-char-cell kronoloji-corner">Karakter</th>';
    data.years.forEach(yr => {
      h += '<th class="kronoloji-year-hdr">' + yr + '</th>';
    });
    h += '</tr></thead>';

    // Body rows
    h += '<tbody>';
    data.characters.forEach(ch => {
      h += '<tr>';
      // Character cell (sticky first column)
      let charLabel = U.escHtml(ch.name);
      let charSub = '';
      if(ch.birthYear) {
        charSub = '(' + ch.birthYear;
        if(ch.deathYear) charSub += '–' + ch.deathYear;
        charSub += ')';
      }
      h += '<td class="kronoloji-char-cell">';
      h += '<div class="kronoloji-char-name">' + charLabel + '</div>';
      if(charSub) h += '<div class="kronoloji-char-years">' + charSub + '</div>';
      h += '</td>';

      // Year cells
      data.years.forEach(yr => {
        const cell = (data.cells[ch.id] || {})[yr];
        const isSelected = _selectedCell && _selectedCell.charId === ch.id && _selectedCell.year === yr;
        let cls = 'kronoloji-cell';
        if(isSelected) cls += ' active';
        if(cell) {
          if(cell.isAfterDeath) cls += ' death';
          if(cell.isBeforeBirth) cls += ' before-birth';
          if(cell.warnings.length) cls += ' warn';
          if(cell.isDeath) cls += ' death-year';
        }
        const hasEvents = cell && cell.events.length > 0;
        h += '<td class="' + cls + '"' + (hasEvents ? ' onclick="App.Chronology._onCellClick(\'' + ch.id + '\',' + yr + ')"' : '') + '>';
        if(cell) {
          // Age display
          if(cell.age !== null && !cell.isBeforeBirth) {
            h += '<div class="kronoloji-age">' + cell.age;
            if(cell.isDeath) h += '†';
            h += '</div>';
          }
          // Event dots (colored by category)
          if(cell.events.length > 0) {
            h += '<div class="kronoloji-dots">';
            cell.events.forEach(ev => {
              const cat = P.categories[ev.category];
              const color = cat ? U.sanitizeColor(cat.color) : 'var(--tx3)';
              h += '<span class="kronoloji-dot" style="background:' + color + ';" title="' + U.escHtml(ev.title) + '"></span>';
            });
            h += '</div>';
          }
          // Warning icon
          if(cell.warnings.length > 0) {
            h += '<div class="kronoloji-warn" title="' + cell.warnings.length + ' uyarı">⚠</div>';
          }
        }
        h += '</td>';
      });
      h += '</tr>';
    });
    h += '</tbody></table></div>';

    tlC.innerHTML = h;

    // If a cell is selected, show detail in right panel
    if(_selectedCell) _showCellDetail(_selectedCell.charId, _selectedCell.year);
  }

  function _onCellClick(charId, year) {
    if(_selectedCell && _selectedCell.charId === charId && _selectedCell.year === year) {
      _selectedCell = null;
      App.Panels.closeAll();
    } else {
      _selectedCell = { charId, year };
      _showCellDetail(charId, year);
    }
    render();
  }

  function _showCellDetail(charId, year) {
    const P = S.get();
    const ch = P.characters.find(c => c.id === charId);
    if(!ch) return;
    const getYear = App.Analysis.getEventYear;
    const evs = P.events.filter(ev => {
      if(!(ev.characters||[]).includes(charId)) return false;
      return getYear(ev, P) === year;
    });

    const rp = document.getElementById('rPanel');
    rp.classList.add('open');
    let h = '<div class="rpanel-hdr"><h3>' + U.escHtml(ch.name) + ' — ' + year + '</h3><button class="close-btn" onclick="App.Panels.closeAll();App.Chronology._clearSelection()">✕</button></div>';
    h += '<div class="rpanel-body" style="padding:14px;">';
    // Age info
    if(ch.birthYear) {
      const age = year - ch.birthYear;
      h += '<div style="font-size:12px;color:var(--tx2);margin-bottom:12px;">Yaş: <b>' + age + '</b>';
      if(ch.deathYear && year === ch.deathYear) h += ' <span style="color:var(--red);">(Ölüm yılı)</span>';
      if(ch.deathYear && year > ch.deathYear) h += ' <span style="color:var(--red);">⚠ Ölüm sonrası!</span>';
      h += '</div>';
    }
    // Events list
    if(!evs.length) {
      h += '<div style="color:var(--tx3);font-size:12px;">Bu yılda olay yok.</div>';
    } else {
      h += '<div style="font-size:10px;color:var(--tx3);text-transform:uppercase;font-weight:500;margin-bottom:8px;">' + evs.length + ' olay</div>';
      evs.forEach(ev => {
        const ep = P.episodes.find(e=>e.id===ev.episodeId);
        const cat = P.categories[ev.category];
        const catColor = cat ? U.sanitizeColor(cat.color) : 'var(--tx3)';
        h += '<div style="padding:8px 0;border-bottom:1px solid var(--brd);cursor:pointer;" onclick="App.Panels.openEditEvent(\'' + ev.id + '\')">';
        h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">';
        h += '<span style="width:8px;height:8px;border-radius:50%;background:' + catColor + ';flex-shrink:0;"></span>';
        h += '<span style="font-size:12px;font-weight:500;">' + U.escHtml(ev.title) + '</span>';
        h += '</div>';
        h += '<div style="font-size:11px;color:var(--tx3);">' + U.epLbl(ep?ep.number:'?');
        if(ev.storyDate) h += ' · Tarih: ' + U.escHtml(ev.storyDate);
        if(cat) h += ' · ' + U.escHtml(cat.label);
        h += '</div>';
        if(ev.description) h += '<div style="font-size:11px;color:var(--tx4);margin-top:4px;">' + U.escHtml(ev.description) + '</div>';
        h += '</div>';
      });
    }
    h += '</div>';
    rp.innerHTML = h;
    App.Panels.setCurrentPanel('corkboard'); // reuse a generic panel slot
  }

  function _clearSelection() {
    _selectedCell = null;
    if(_mounted) render();
  }

  return { render, filterByCharacter, unmount, isMounted, _onCellClick, _clearSelection };
})();
