// ═══ CHARACTERS VIEW MODULE ═══
App.Characters = (function(){
  const U = App.Utils;
  const S = App.Store;
  let _mounted = false;
  let _selectedCharId = null;
  let _filterRole = 'all';
  let _sortBy = 'name';
  let _searchQuery = '';

  // ── Data computation ──

  function _computeCharacterStats() {
    var P = S.get();
    var chars = P.characters || [];
    var events = P.events || [];
    var scenes = P.scenes || [];
    var episodes = P.episodes || [];
    var stats = [];

    chars.forEach(function(ch) {
      var sceneCount = 0;
      var totalDur = 0;
      var perEp = {};
      var dialogueWords = 0;

      // Count scenes and duration from events
      events.forEach(function(ev) {
        if (ev.characters && ev.characters.indexOf(ch.id) >= 0) {
          sceneCount++;
          totalDur += (ev.dur || 0);
          var epId = ev.episodeId || '_none';
          if (!perEp[epId]) perEp[epId] = { count: 0, dur: 0 };
          perEp[epId].count++;
          perEp[epId].dur += (ev.dur || 0);
        }
      });

      // Count dialogue words from scene content
      scenes.forEach(function(sc) {
        if (sc.characters && sc.characters.indexOf(ch.id) >= 0 && sc.content) {
          sc.content.forEach(function(block) {
            if (block.type === 'dialogue' && block.text) {
              dialogueWords += block.text.trim().split(/\s+/).filter(function(w) { return w.length > 0; }).length;
            }
          });
        }
      });

      stats.push({
        id: ch.id,
        name: ch.name || '',
        color: ch.color || '',
        role: ch.role || '',
        notes: ch.notes || '',
        birthDate: ch.birthDate || null,
        deathDate: ch.deathDate || null,
        sceneCount: sceneCount,
        totalDur: totalDur,
        perEp: perEp,
        dialogueWords: dialogueWords
      });
    });

    return stats;
  }

  function _computeCooccurrenceMatrix(stats) {
    var P = S.get();
    var events = P.events || [];
    var matrix = {};
    var maxCount = 0;

    events.forEach(function(ev) {
      var chs = ev.characters || [];
      for (var i = 0; i < chs.length; i++) {
        for (var j = i + 1; j < chs.length; j++) {
          var key = chs[i] < chs[j] ? chs[i] + '|' + chs[j] : chs[j] + '|' + chs[i];
          if (!matrix[key]) matrix[key] = 0;
          matrix[key]++;
          if (matrix[key] > maxCount) maxCount = matrix[key];
        }
      }
    });

    return { pairs: matrix, maxCount: maxCount };
  }

  // ── Filtering & sorting ──

  function _filterAndSort(stats) {
    var filtered = stats;

    if (_searchQuery) {
      var q = _searchQuery.toLowerCase();
      filtered = filtered.filter(function(s) {
        return s.name.toLowerCase().indexOf(q) >= 0;
      });
    }

    if (_filterRole !== 'all') {
      filtered = filtered.filter(function(s) {
        return s.role === _filterRole;
      });
    }

    filtered.sort(function(a, b) {
      if (_sortBy === 'name') return a.name.localeCompare(b.name, 'tr');
      if (_sortBy === 'scenes') return b.sceneCount - a.sceneCount;
      if (_sortBy === 'duration') return b.totalDur - a.totalDur;
      if (_sortBy === 'dialogue') return b.dialogueWords - a.dialogueWords;
      return 0;
    });

    return filtered;
  }

  // ── Render ──

  function render() {
    var container = document.getElementById('tlC');
    if (!container) return;
    _mounted = true;
    var allStats = _computeCharacterStats();
    var stats = _filterAndSort(allStats);
    var cooc = _computeCooccurrenceMatrix(allStats);

    var html = '';
    html += _buildToolbar(allStats);
    html += '<div style="padding:16px;overflow-y:auto;height:calc(100vh - 160px);">';
    html += '<h3 style="font-size:13px;color:var(--tx2);margin-bottom:12px;font-weight:600;">Karakter Kartları</h3>';
    html += _buildCharacterCards(stats);
    html += '<h3 style="font-size:13px;color:var(--tx2);margin:24px 0 12px;font-weight:600;">Ekran Süresi</h3>';
    html += _buildScreenTimeChart(stats);
    html += '<h3 style="font-size:13px;color:var(--tx2);margin:24px 0 12px;font-weight:600;">Diyalog İstatistikleri</h3>';
    html += _buildDialogueChart(stats);
    html += '<h3 style="font-size:13px;color:var(--tx2);margin:24px 0 12px;font-weight:600;">Ortak Sahne Matrisi</h3>';
    html += _buildCooccurrenceHeatmap(allStats, cooc);
    html += '</div>';

    container.innerHTML = html;
    _attachEvents();
  }

  function _buildToolbar(stats) {
    var html = '<div class="char-toolbar">';
    html += '<input type="text" class="char-search" placeholder="Karakter ara..." value="' + U.escHtml(_searchQuery) + '" oninput="App.Characters.search(this.value)" />';
    html += '<select class="char-filter-select" onchange="App.Characters.filterByRole(this.value)">';
    html += '<option value="all"' + (_filterRole === 'all' ? ' selected' : '') + '>Tüm Roller</option>';
    html += '<option value="Ana"' + (_filterRole === 'Ana' ? ' selected' : '') + '>Ana</option>';
    html += '<option value="Yan"' + (_filterRole === 'Yan' ? ' selected' : '') + '>Yan</option>';
    html += '<option value="Figüran"' + (_filterRole === 'Figüran' ? ' selected' : '') + '>Figüran</option>';
    html += '</select>';
    html += '<select class="char-filter-select" onchange="App.Characters.sortBy(this.value)">';
    html += '<option value="name"' + (_sortBy === 'name' ? ' selected' : '') + '>Ada Göre</option>';
    html += '<option value="scenes"' + (_sortBy === 'scenes' ? ' selected' : '') + '>Sahne Sayısı</option>';
    html += '<option value="duration"' + (_sortBy === 'duration' ? ' selected' : '') + '>Ekran Süresi</option>';
    html += '<option value="dialogue"' + (_sortBy === 'dialogue' ? ' selected' : '') + '>Diyalog</option>';
    html += '</select>';
    html += '<button class="btn btn-p btn-s" onclick="App.Characters.addCharacter()">+ Karakter</button>';
    html += '<div style="flex:1;"></div>';
    html += '<span style="font-size:11px;color:var(--tx3);">' + stats.length + ' karakter</span>';
    html += '</div>';
    return html;
  }

  function _buildCharacterCards(stats) {
    if (!stats.length) {
      return '<div class="nw" style="padding:24px;">Karakter bulunamadı.</div>';
    }

    var html = '<div class="char-cards-grid">';
    stats.forEach(function(ch) {
      var isSelected = _selectedCharId === ch.id;
      var initial = (ch.name || '?').charAt(0).toUpperCase();
      var bgColor = ch.color ? U.sanitizeColor(ch.color) : '#3b82f6';
      var durStr = _formatDuration(ch.totalDur);
      var roleLabel = ch.role ? U.escHtml(ch.role) : '';

      html += '<div class="char-card' + (isSelected ? ' selected' : '') + '" data-char-id="' + ch.id + '" onclick="App.Characters.selectCharacter(\'' + ch.id + '\')">';
      html += '<div class="char-card-avatar" style="background:' + bgColor + ';">' + U.escHtml(initial) + '</div>';
      html += '<div class="char-card-info">';
      html += '<div class="char-card-name">' + U.escHtml(ch.name || 'İsimsiz') + '</div>';
      if (roleLabel) html += '<div class="char-card-role">' + roleLabel + '</div>';
      html += '<div class="char-card-stats">';
      html += '<span>' + ch.sceneCount + ' sahne</span>';
      html += '<span>' + durStr + '</span>';
      html += '<span>' + ch.dialogueWords + ' kelime</span>';
      html += '</div>';
      html += '</div></div>';
    });
    html += '</div>';
    return html;
  }

  function _buildScreenTimeChart(stats) {
    var sorted = stats.slice().sort(function(a, b) { return b.totalDur - a.totalDur; });
    var maxDur = sorted.length ? sorted[0].totalDur : 1;
    if (maxDur === 0) maxDur = 1;

    var html = '<div class="char-chart">';
    sorted.forEach(function(ch) {
      var pct = Math.round((ch.totalDur / maxDur) * 100);
      var bgColor = ch.color ? U.sanitizeColor(ch.color) : '#3b82f6';
      html += '<div class="char-chart-row">';
      html += '<span class="char-chart-label">' + U.escHtml(ch.name || '?') + '</span>';
      html += '<div class="char-chart-bar-wrap">';
      html += '<div class="char-chart-bar" style="width:' + pct + '%;background:' + bgColor + ';" title="' + _formatDuration(ch.totalDur) + '"></div>';
      html += '</div>';
      html += '<span class="char-chart-value">' + _formatDuration(ch.totalDur) + '</span>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  function _buildDialogueChart(stats) {
    var sorted = stats.slice().sort(function(a, b) { return b.dialogueWords - a.dialogueWords; });
    var maxWords = sorted.length ? sorted[0].dialogueWords : 1;
    if (maxWords === 0) maxWords = 1;

    var html = '<div class="char-chart">';
    sorted.forEach(function(ch) {
      if (ch.dialogueWords === 0) return;
      var pct = Math.round((ch.dialogueWords / maxWords) * 100);
      var bgColor = ch.color ? U.sanitizeColor(ch.color) : '#3b82f6';
      html += '<div class="char-chart-row">';
      html += '<span class="char-chart-label">' + U.escHtml(ch.name || '?') + '</span>';
      html += '<div class="char-chart-bar-wrap">';
      html += '<div class="char-chart-bar" style="width:' + pct + '%;background:' + bgColor + ';" title="' + ch.dialogueWords + ' kelime"></div>';
      html += '</div>';
      html += '<span class="char-chart-value">' + ch.dialogueWords + '</span>';
      html += '</div>';
    });
    if (!sorted.some(function(s) { return s.dialogueWords > 0; })) {
      html += '<div class="nw" style="padding:12px;font-size:11px;">Diyalog verisi yok.</div>';
    }
    html += '</div>';
    return html;
  }

  function _buildCooccurrenceHeatmap(allStats, cooc) {
    if (allStats.length < 2 || allStats.length > 30) {
      if (allStats.length > 30) return '<div class="nw" style="padding:12px;font-size:11px;">Çok fazla karakter (>' + allStats.length + '). Heatmap 30 karaktere kadar desteklenir.</div>';
      return '<div class="nw" style="padding:12px;font-size:11px;">Yeterli karakter yok.</div>';
    }

    var chars = allStats.slice().sort(function(a, b) { return a.name.localeCompare(b.name, 'tr'); });
    var n = chars.length;
    var cellSize = 28;
    var labelWidth = 80;
    var svgW = labelWidth + n * cellSize + 10;
    var svgH = labelWidth + n * cellSize + 10;

    var html = '<div class="char-heatmap-container">';
    html += '<svg width="' + svgW + '" height="' + svgH + '" style="font-family:Inter,sans-serif;">';

    // Column labels (top)
    for (var c = 0; c < n; c++) {
      var x = labelWidth + c * cellSize + cellSize / 2;
      html += '<text x="' + x + '" y="' + (labelWidth - 6) + '" text-anchor="end" font-size="9" fill="var(--tx3)" transform="rotate(-45 ' + x + ' ' + (labelWidth - 6) + ')">' + U.escHtml(_truncName(chars[c].name, 10)) + '</text>';
    }

    // Rows
    for (var r = 0; r < n; r++) {
      var y = labelWidth + r * cellSize;
      // Row label
      html += '<text x="' + (labelWidth - 6) + '" y="' + (y + cellSize / 2 + 3) + '" text-anchor="end" font-size="9" fill="var(--tx3)">' + U.escHtml(_truncName(chars[r].name, 10)) + '</text>';

      for (var c2 = 0; c2 < n; c2++) {
        var cx = labelWidth + c2 * cellSize;
        if (r === c2) {
          // Diagonal
          html += '<rect x="' + cx + '" y="' + y + '" width="' + cellSize + '" height="' + cellSize + '" fill="var(--bg3)" stroke="var(--brd)" stroke-width="0.5"/>';
          html += '<text x="' + (cx + cellSize / 2) + '" y="' + (y + cellSize / 2 + 3) + '" text-anchor="middle" font-size="9" fill="var(--tx4)">—</text>';
        } else {
          var idA = chars[r].id;
          var idB = chars[c2].id;
          var key = idA < idB ? idA + '|' + idB : idB + '|' + idA;
          var count = cooc.pairs[key] || 0;
          var intensity = cooc.maxCount > 0 ? count / cooc.maxCount : 0;
          var alpha = count > 0 ? 0.15 + intensity * 0.85 : 0;
          var fillColor = count > 0 ? 'rgba(59,130,246,' + alpha.toFixed(2) + ')' : 'var(--bg2)';
          html += '<rect x="' + cx + '" y="' + y + '" width="' + cellSize + '" height="' + cellSize + '" fill="' + fillColor + '" stroke="var(--brd)" stroke-width="0.5">';
          html += '<title>' + U.escHtml(chars[r].name) + ' & ' + U.escHtml(chars[c2].name) + ': ' + count + ' ortak sahne</title>';
          html += '</rect>';
          if (count > 0) {
            html += '<text x="' + (cx + cellSize / 2) + '" y="' + (y + cellSize / 2 + 3) + '" text-anchor="middle" font-size="8" fill="#fff" pointer-events="none">' + count + '</text>';
          }
        }
      }
    }

    html += '</svg></div>';
    return html;
  }

  // ── Right panel: Character detail ──

  function _showCharacterDetail(charId) {
    var P = S.get();
    var ch = (P.characters || []).find(function(c) { return c.id === charId; });
    if (!ch) return;

    App.Panels.setCurrentPanel('charDetail');
    var rp = document.getElementById('rPanel');
    rp.classList.add('open');

    var stats = _computeCharacterStats();
    var cStat = stats.find(function(s) { return s.id === charId; });
    var events = P.events || [];
    var relationships = (P.characterRelationships || []).filter(function(r) { return r.from === charId || r.to === charId; });
    var chars = P.characters || [];

    var isFullscreen = rp.classList.contains('chardetail-fullscreen');
    var html = '<div class="chardetail-scroll">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">';
    html += '<h3 style="font-size:14px;font-weight:600;">Karakter Detayı</h3>';
    html += '<div style="display:flex;gap:4px;align-items:center;">';
    html += '<button class="close-btn" onclick="App.Characters.toggleCharDetailFullscreen()" title="' + (isFullscreen ? 'Küçült' : 'Tam Ekran') + '">' + (isFullscreen ? '⊖' : '⊕') + '</button>';
    html += '<button class="close-btn" onclick="App.Panels.closeAll();App.Characters.deselectCharacter();">✕</button>';
    html += '</div></div>';

    // Editable fields
    html += '<div class="fg"><label style="font-size:11px;color:var(--tx3);">İsim</label>';
    html += '<input type="text" id="charDetailName" value="' + U.escHtml(ch.name || '') + '" style="width:100%;padding:6px 8px;background:var(--bg2);border:1px solid var(--brd);border-radius:var(--radius);color:var(--tx);font-size:12px;" /></div>';

    html += '<div class="fg" style="margin-top:10px;"><label style="font-size:11px;color:var(--tx3);">Renk</label>';
    html += '<input type="color" id="charDetailColor" value="' + (ch.color || '#3b82f6') + '" style="width:40px;height:28px;border:1px solid var(--brd);border-radius:var(--radius);background:var(--bg2);cursor:pointer;" /></div>';

    html += '<div class="fg" style="margin-top:10px;"><label style="font-size:11px;color:var(--tx3);">Rol</label>';
    html += '<select id="charDetailRole" style="width:100%;padding:6px 8px;background:var(--bg2);border:1px solid var(--brd);border-radius:var(--radius);color:var(--tx);font-size:12px;">';
    html += '<option value=""' + (!ch.role ? ' selected' : '') + '>Belirtilmemiş</option>';
    html += '<option value="Ana"' + (ch.role === 'Ana' ? ' selected' : '') + '>Ana</option>';
    html += '<option value="Yan"' + (ch.role === 'Yan' ? ' selected' : '') + '>Yan</option>';
    html += '<option value="Figüran"' + (ch.role === 'Figüran' ? ' selected' : '') + '>Figüran</option>';
    html += '</select></div>';

    html += '<div class="fg" style="margin-top:10px;"><label style="font-size:11px;color:var(--tx3);">Doğum Tarihi</label>';
    html += '<input type="date" id="charDetailBirth" value="' + (ch.birthDate || '') + '" style="width:100%;padding:6px 8px;background:var(--bg2);border:1px solid var(--brd);border-radius:var(--radius);color:var(--tx);font-size:12px;" /></div>';

    html += '<div class="fg" style="margin-top:10px;"><label style="font-size:11px;color:var(--tx3);">Ölüm Tarihi</label>';
    html += '<input type="date" id="charDetailDeath" value="' + (ch.deathDate || '') + '" style="width:100%;padding:6px 8px;background:var(--bg2);border:1px solid var(--brd);border-radius:var(--radius);color:var(--tx);font-size:12px;" /></div>';

    html += '<div class="fg" style="margin-top:10px;"><label style="font-size:11px;color:var(--tx3);">Karakter Analizi</label>';
    html += '<textarea id="charDetailAnalysis" rows="3" placeholder="Karakterin motivasyonu, iç çatışması, dönüşüm yayı..." style="width:100%;padding:6px 8px;background:var(--bg2);border:1px solid var(--brd);border-radius:var(--radius);color:var(--tx);font-size:12px;resize:vertical;">' + U.escHtml(ch.analysis || '') + '</textarea></div>';

    html += '<div class="fg" style="margin-top:10px;"><label style="font-size:11px;color:var(--tx3);">Notlar</label>';
    html += '<textarea id="charDetailNotes" rows="3" style="width:100%;padding:6px 8px;background:var(--bg2);border:1px solid var(--brd);border-radius:var(--radius);color:var(--tx);font-size:12px;resize:vertical;">' + U.escHtml(ch.notes || '') + '</textarea></div>';

    // Action buttons
    html += '<div style="display:flex;gap:8px;margin-top:14px;">';
    html += '<button class="btn btn-p" onclick="App.Characters.saveCharacterDetail(\'' + charId + '\')">Kaydet</button>';
    html += '<button class="btn btn-d" onclick="App.Characters.deleteCharacter(\'' + charId + '\')">Sil</button>';
    html += '</div>';

    // Read-only stats
    if (cStat) {
      html += '<div style="margin-top:20px;border-top:1px solid var(--brd);padding-top:14px;">';
      html += '<h4 style="font-size:12px;color:var(--tx2);margin-bottom:8px;font-weight:600;">İstatistikler</h4>';
      html += '<div style="font-size:11px;color:var(--tx3);line-height:1.8;">';
      html += 'Sahne Sayısı: <span style="color:var(--tx);">' + cStat.sceneCount + '</span><br>';
      html += 'Toplam Süre: <span style="color:var(--tx);">' + _formatDuration(cStat.totalDur) + '</span><br>';
      html += 'Diyalog Kelime: <span style="color:var(--tx);">' + cStat.dialogueWords + '</span>';
      html += '</div></div>';
    }

    // Relationships
    if (relationships.length) {
      html += '<div style="margin-top:14px;border-top:1px solid var(--brd);padding-top:14px;">';
      html += '<h4 style="font-size:12px;color:var(--tx2);margin-bottom:8px;font-weight:600;">İlişkiler</h4>';
      relationships.forEach(function(rel) {
        var otherId = rel.from === charId ? rel.to : rel.from;
        var other = chars.find(function(c) { return c.id === otherId; });
        var otherName = other ? U.escHtml(other.name) : 'Bilinmiyor';
        html += '<div style="font-size:11px;color:var(--tx3);margin-bottom:4px;">' + otherName + ' — <span style="color:var(--tx2);">' + U.escHtml(rel.label || rel.type || '') + '</span></div>';
      });
      html += '</div>';
    }

    // Scene list
    var charEvents = events.filter(function(ev) { return ev.characters && ev.characters.indexOf(charId) >= 0; });
    if (charEvents.length) {
      html += '<div style="margin-top:14px;border-top:1px solid var(--brd);padding-top:14px;">';
      html += '<h4 style="font-size:12px;color:var(--tx2);margin-bottom:8px;font-weight:600;">Sahneler (' + charEvents.length + ')</h4>';
      html += '<div style="max-height:200px;overflow-y:auto;">';
      charEvents.forEach(function(ev) {
        var ep = (P.episodes || []).find(function(e) { return e.id === ev.episodeId; });
        var epLabel = ep ? 'B' + ep.number : '';
        html += '<div style="font-size:11px;color:var(--tx3);padding:3px 0;border-bottom:1px solid var(--bg3);cursor:pointer;" onclick="App.Panels.openEditEvent(\'' + ev.id + '\')" title="Düzenle">';
        html += '<span style="color:var(--tx4);min-width:30px;display:inline-block;">' + U.escHtml(epLabel) + '</span> ';
        html += '<span style="color:var(--tx2);">' + U.escHtml(ev.title || 'İsimsiz') + '</span>';
        html += '</div>';
      });
      html += '</div></div>';
    }

    html += '</div>';
    rp.innerHTML = html;
  }

  function saveCharacterDetail(charId) {
    var nameEl = document.getElementById('charDetailName');
    var colorEl = document.getElementById('charDetailColor');
    var roleEl = document.getElementById('charDetailRole');
    var birthEl = document.getElementById('charDetailBirth');
    var deathEl = document.getElementById('charDetailDeath');
    var analysisEl = document.getElementById('charDetailAnalysis');
    var notesEl = document.getElementById('charDetailNotes');
    if (!nameEl) return;

    var name = nameEl.value.trim();
    if (!name) { App.UI.toast('İsim boş olamaz', 'error'); return; }

    S.updateCharacter(charId, {
      name: name,
      color: U.sanitizeColor(colorEl.value),
      role: roleEl.value,
      birthDate: birthEl.value || null,
      deathDate: deathEl.value || null,
      analysis: analysisEl ? analysisEl.value : '',
      notes: notesEl.value
    });

    App.UI.toast('Karakter güncellendi');
    render();
    _showCharacterDetail(charId);
  }

  function deleteCharacter(charId) {
    var P = S.get();
    var ch = (P.characters || []).find(function(c) { return c.id === charId; });
    var name = ch ? ch.name : 'Karakter';
    if (!confirm('"' + name + '" silinsin mi? Bu işlem geri alınabilir (Ctrl+Z).')) return;

    S.removeCharacter(charId);
    _selectedCharId = null;
    App.Panels.closeAll();
    App.UI.toast('"' + name + '" silindi');
    render();
  }

  // ── Events ──

  function _attachEvents() {
    // Card click events are handled via inline onclick
  }

  // ── Add character ──

  var _colorPalette = ['#3b82f6','#ef4444','#10b981','#f59e0b','#a855f7','#f97316','#06b6d4','#ec4899','#8b5cf6','#14b8a6','#e11d48','#84cc16'];

  function _randomColor() {
    return _colorPalette[Math.floor(Math.random() * _colorPalette.length)];
  }

  function addCharacter() {
    var id = U.genId('ch');
    App.Panels.setCurrentPanel('charDetail');
    S.addCharacter({ id: id, name: 'Yeni Karakter', color: _randomColor(), role: '', notes: '', birthDate: null, deathDate: null });
    _selectedCharId = id;
    render();
    _showCharacterDetail(id);
  }

  // ── Helpers ──

  function _formatDuration(totalSec) {
    if (!totalSec) return '0:00';
    var m = Math.floor(totalSec / 60);
    var s = totalSec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function _truncName(name, max) {
    if (!name) return '?';
    return name.length > max ? name.substring(0, max - 1) + '…' : name;
  }

  // ── Public API ──

  function unmount() {
    _mounted = false;
  }

  function isMounted() {
    return _mounted;
  }

  function filterByRole(role) {
    _filterRole = role;
    render();
  }

  function sortBy(field) {
    _sortBy = field;
    render();
  }

  function search(query) {
    _searchQuery = query;
    render();
  }

  function selectCharacter(charId) {
    App.Panels.setCurrentPanel('charDetail');
    _selectedCharId = charId;
    render();
    _showCharacterDetail(charId);
  }

  function deselectCharacter() {
    _selectedCharId = null;
    var rp = document.getElementById('rPanel');
    if (rp) rp.classList.remove('chardetail-fullscreen');
    render();
  }

  function toggleCharDetailFullscreen() {
    var rp = document.getElementById('rPanel');
    if (!rp) return;
    rp.classList.toggle('chardetail-fullscreen');
    if (_selectedCharId) _showCharacterDetail(_selectedCharId);
  }

  return {
    render: render,
    unmount: unmount,
    isMounted: isMounted,
    filterByRole: filterByRole,
    sortBy: sortBy,
    search: search,
    selectCharacter: selectCharacter,
    saveCharacterDetail: saveCharacterDetail,
    deleteCharacter: deleteCharacter,
    addCharacter: addCharacter,
    deselectCharacter: deselectCharacter,
    toggleCharDetailFullscreen: toggleCharDetailFullscreen,
    getStats: _computeCharacterStats,
    _selectedCharId: _selectedCharId
  };
})();
