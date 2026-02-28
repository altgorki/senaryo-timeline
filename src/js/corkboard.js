// ═══ CORKBOARD MODULE ═══
App.Corkboard = (function(){
  const U = App.Utils;
  const S = App.Store;
  let _selectedSceneId = null;
  let _filterEpId = 'all';
  let _draggedId = null;
  let _dragOverId = null;
  let _mounted = false;

  function render() {
    var container = document.getElementById('tlC');
    if (!container) return;
    _mounted = true;
    var P = S.get();
    var episodes = P.episodes || [];
    var scenes = P.scenes || [];

    // Build toolbar
    var html = '<div class="corkboard-toolbar">';
    html += '<label style="font-size:10px;color:var(--tx3);text-transform:uppercase;font-weight:500;">Bölüm</label>';
    html += '<select id="cbEpFilter" onchange="App.Corkboard.filterByEpisode(this.value)">';
    html += '<option value="all"' + (_filterEpId === 'all' ? ' selected' : '') + '>Tümü</option>';
    episodes.forEach(function(ep) {
      html += '<option value="' + ep.id + '"' + (_filterEpId === ep.id ? ' selected' : '') + '>' + U.epLbl(ep.number) + (ep.title ? ' — ' + U.escHtml(ep.title) : '') + '</option>';
    });
    html += '</select>';
    html += '<div style="flex:1;"></div>';
    html += '<span style="font-size:11px;color:var(--tx3);">' + scenes.length + ' sahne</span>';
    html += '</div>';

    // Build card sections
    html += '<div class="corkboard-container">';

    if (_filterEpId === 'all') {
      episodes.forEach(function(ep) {
        html += _buildEpisodeSection(ep, scenes, P);
      });
    } else {
      var ep = episodes.find(function(e) { return e.id === _filterEpId; });
      if (ep) {
        html += _buildEpisodeSection(ep, scenes, P);
      }
    }

    if (!scenes.length) {
      html += '<div class="nw" style="padding:40px;">Henüz sahne yok. Sahne ekleyerek başlayın.</div>';
    }

    html += '</div>';
    container.innerHTML = html;
    _attachDragDrop();
  }

  function _buildEpisodeSection(ep, allScenes, P) {
    var scenes = allScenes.filter(function(s) { return s.episodeId === ep.id; });
    scenes.sort(function(a, b) { return (a.order || 0) - (b.order || 0); });

    if (!scenes.length && _filterEpId === 'all') return '';

    var html = '<div class="corkboard-section" data-ep-id="' + ep.id + '">';
    html += '<div class="corkboard-section-title">';
    html += U.epLbl(ep.number);
    if (ep.title) html += ' — ' + U.escHtml(ep.title);
    html += '<span class="corkboard-section-count">' + scenes.length + ' sahne</span>';
    html += '</div>';
    html += '<div class="corkboard-grid">';

    scenes.forEach(function(sc) {
      html += _buildCard(sc, P);
    });

    if (!scenes.length) {
      html += '<div class="nw" style="padding:20px;grid-column:1/-1;">Bu bölümde sahne yok.</div>';
    }

    // + Sahne Ekle button
    html += '<div class="cork-add-scene-btn" data-ep-id="' + ep.id + '" onclick="App.Panels.openAddEvent(\'' + ep.id + '\')">+ Sahne Ekle</div>';

    html += '</div></div>';
    return html;
  }

  function _buildCard(scene, P) {
    var cats = P.categories || {};
    var catData = cats[scene.category];
    var catColor = catData ? U.sanitizeColor(catData.color) : 'var(--tx4)';

    // Get summary text
    var summary = '';
    if (scene.content && scene.content.length) {
      for (var i = 0; i < scene.content.length; i++) {
        if (scene.content[i].text) {
          summary = scene.content[i].text;
          break;
        }
      }
    }
    if (summary.length > 100) summary = summary.substring(0, 100) + '...';

    // Location type
    var locType = '';
    if (scene.location) {
      locType = scene.location.indexOf('İç') >= 0 || scene.location.indexOf('İç') >= 0 ? 'İÇ.' :
                scene.location.indexOf('Dış') >= 0 ? 'DIŞ.' : U.escHtml(scene.location).substring(0, 8);
    }

    // Character count
    var charCount = (scene.characters || []).length;

    // Duration from event
    var events = P.events || [];
    var ev = events.find(function(e) { return e.sceneId === scene.id; });
    var durStr = ev ? U.s2t(ev.dur) : '';

    var isSelected = _selectedSceneId === scene.id;

    var html = '<div class="cork-card' + (isSelected ? ' selected' : '') + '" draggable="true" ' +
      'data-scene-id="' + scene.id + '" data-ep-id="' + scene.episodeId + '" data-order="' + scene.order + '">';
    html += '<div class="cork-card-color-bar" style="background:' + catColor + ';"></div>';
    html += '<div class="cork-card-body">';
    html += '<div class="cork-card-title">' + U.escHtml(scene.title || 'İsimsiz Sahne') + '</div>';
    html += '<div class="cork-card-summary">' + U.escHtml(summary || 'Açıklama yok') + '</div>';
    html += '<div class="cork-card-meta">';
    if (locType) html += '<span>' + locType + '</span>';
    if (durStr) html += '<span>' + durStr + '</span>';
    html += '<span>\uD83D\uDC64' + charCount + '</span>';
    html += '</div>';
    html += '</div></div>';
    return html;
  }

  function _attachDragDrop() {
    var cards = document.querySelectorAll('.cork-card');
    cards.forEach(function(card) {
      card.addEventListener('dragstart', _onDragStart);
      card.addEventListener('dragend', _onDragEnd);
      card.addEventListener('dragover', _onDragOver);
      card.addEventListener('dragleave', _onDragLeave);
      card.addEventListener('drop', _onDrop);
      card.addEventListener('click', _onCardClick);
      card.addEventListener('dblclick', _onCardDblClick);
    });
    // Grid container drop support (for drops between cards or into empty areas)
    var grids = document.querySelectorAll('.corkboard-grid');
    grids.forEach(function(grid) {
      grid.addEventListener('dragover', function(e) {
        if (!_draggedId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        this.classList.add('drag-over');
      });
      grid.addEventListener('dragleave', function(e) {
        if (!e.relatedTarget || !this.contains(e.relatedTarget)) {
          this.classList.remove('drag-over');
        }
      });
      grid.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('drag-over');
        var sourceId = _draggedId;
        if (!sourceId) return;
        // If drop is on the grid itself (not on a card), append to end of this section
        var section = this.closest('.corkboard-section');
        if (!section) return;
        var targetEpId = section.dataset.epId;
        _moveSceneToEpisodeEnd(sourceId, targetEpId);
      });
    });
  }

  function _onDragStart(e) {
    _draggedId = this.dataset.sceneId;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', _draggedId);
  }

  function _onDragEnd() {
    this.classList.remove('dragging');
    _draggedId = null;
    _dragOverId = null;
    _clearPlaceholders();
  }

  function _clearPlaceholders() {
    document.querySelectorAll('.cork-card-placeholder').forEach(function(el) { el.remove(); });
    document.querySelectorAll('.cork-card.drag-over-before,.cork-card.drag-over-after').forEach(function(el) {
      el.classList.remove('drag-over-before', 'drag-over-after');
    });
    document.querySelectorAll('.corkboard-grid.drag-over').forEach(function(el) { el.classList.remove('drag-over'); });
  }

  function _onDragOver(e) {
    if (!_draggedId) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    var targetId = this.dataset.sceneId;
    if (targetId === _draggedId) return;

    // Visual feedback: show placeholder before or after based on mouse position
    _clearPlaceholders();
    var rect = this.getBoundingClientRect();
    var midY = rect.top + rect.height / 2;
    if (e.clientY < midY) {
      this.classList.add('drag-over-before');
    } else {
      this.classList.add('drag-over-after');
    }
    _dragOverId = targetId;
  }

  function _onDragLeave() {
    this.classList.remove('drag-over-before', 'drag-over-after');
  }

  function _onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    _clearPlaceholders();
    var targetId = this.dataset.sceneId;
    var sourceId = _draggedId;
    if (!sourceId || sourceId === targetId) return;

    var P = S.get();
    var srcScene = P.scenes.find(function(s) { return s.id === sourceId; });
    var tgtScene = P.scenes.find(function(s) { return s.id === targetId; });
    if (!srcScene || !tgtScene) return;

    // Determine insert position based on mouse Y
    var rect = this.getBoundingClientRect();
    var insertAfter = e.clientY >= rect.top + rect.height / 2;

    S.snapshot();

    // Cross-episode move: update episodeId
    var crossEpisode = srcScene.episodeId !== tgtScene.episodeId;
    if (crossEpisode) {
      var oldEpId = srcScene.episodeId;
      srcScene.episodeId = tgtScene.episodeId;
      // Also update linked event's episodeId
      var ev = (P.events || []).find(function(e) { return e.sceneId === srcScene.id; });
      if (ev) ev.episodeId = tgtScene.episodeId;
      // Re-order old episode scenes
      var oldEpScenes = P.scenes.filter(function(s) { return s.episodeId === oldEpId; });
      oldEpScenes.sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
      oldEpScenes.forEach(function(s, i) { s.order = i + 1; });
    }

    // Reorder scenes within target episode
    var epScenes = P.scenes.filter(function(s) { return s.episodeId === tgtScene.episodeId && s.id !== srcScene.id; });
    epScenes.sort(function(a, b) { return (a.order || 0) - (b.order || 0); });

    var tgtIdx = epScenes.indexOf(tgtScene);
    if (tgtIdx < 0) tgtIdx = epScenes.length - 1;
    var insertIdx = insertAfter ? tgtIdx + 1 : tgtIdx;
    epScenes.splice(insertIdx, 0, srcScene);

    // Update orders
    epScenes.forEach(function(s, i) { s.order = i + 1; });

    // Sync event start times from new scene order
    S.syncEventStartFromSceneOrder(tgtScene.episodeId);
    if (crossEpisode) S.syncEventStartFromSceneOrder(oldEpId);

    S.markDirty(['scenes', 'events']);
    S.emit('change', { type: 'reorderScenes' });

    if (crossEpisode) {
      var ep = (P.episodes || []).find(function(ep) { return ep.id === tgtScene.episodeId; });
      App.UI.toast('"' + (srcScene.title || 'Sahne') + '" → ' + App.Utils.epLbl(ep ? ep.number : '?'));
    }

    _draggedId = null;
    _dragOverId = null;
  }

  function _moveSceneToEpisodeEnd(sourceId, targetEpId) {
    var P = S.get();
    var srcScene = P.scenes.find(function(s) { return s.id === sourceId; });
    if (!srcScene) return;
    if (srcScene.episodeId === targetEpId) return; // Already in target, no-op for grid drop in same episode

    S.snapshot();

    var oldEpId = srcScene.episodeId;
    srcScene.episodeId = targetEpId;
    // Also update linked event
    var ev = (P.events || []).find(function(e) { return e.sceneId === srcScene.id; });
    if (ev) ev.episodeId = targetEpId;

    // Re-order old episode
    var oldEpScenes = P.scenes.filter(function(s) { return s.episodeId === oldEpId; });
    oldEpScenes.sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
    oldEpScenes.forEach(function(s, i) { s.order = i + 1; });

    // Add to end of target episode
    var newEpScenes = P.scenes.filter(function(s) { return s.episodeId === targetEpId; });
    newEpScenes.sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
    newEpScenes.forEach(function(s, i) { s.order = i + 1; });

    // Sync event start times from new scene order
    S.syncEventStartFromSceneOrder(targetEpId);
    S.syncEventStartFromSceneOrder(oldEpId);

    S.markDirty(['scenes', 'events']);
    S.emit('change', { type: 'reorderScenes' });

    var ep = (P.episodes || []).find(function(ep) { return ep.id === targetEpId; });
    App.UI.toast('"' + (srcScene.title || 'Sahne') + '" → ' + App.Utils.epLbl(ep ? ep.number : '?'));

    _draggedId = null;
    _dragOverId = null;
  }

  function _onCardClick(e) {
    var sceneId = this.dataset.sceneId;
    _selectedSceneId = sceneId;
    // Highlight selected card
    document.querySelectorAll('.cork-card').forEach(function(c) { c.classList.remove('selected'); });
    this.classList.add('selected');
    // Show scene details in right panel
    _showSceneDetails(sceneId);
  }

  function _onCardDblClick(e) {
    var sceneId = this.dataset.sceneId;
    var P = S.get();
    var scene = P.scenes.find(function(s) { return s.id === sceneId; });
    if (!scene) return;
    // Switch to screenplay view and scroll to scene
    App.setViewMode('screenplay');
  }

  function _showSceneDetails(sceneId) {
    var P = S.get();
    var scene = P.scenes.find(function(s) { return s.id === sceneId; });
    if (!scene) return;

    var rp = document.getElementById('rPanel');
    if (!rp) return;
    rp.classList.add('open');

    var cats = P.categories || {};
    var catData = cats[scene.category];
    var catLabel = catData ? U.escHtml(catData.label) : scene.category;
    var catColor = catData ? U.sanitizeColor(catData.color) : '#888';

    // Get characters
    var charNames = (scene.characters || []).map(function(cid) {
      var ch = P.characters.find(function(c) { return c.id === cid; });
      return ch ? U.escHtml(ch.name) : '';
    }).filter(Boolean);

    // Get content summary
    var contentText = '';
    if (scene.content) {
      scene.content.forEach(function(block) {
        if (block.text) contentText += block.text + '\n';
      });
    }

    var ev = (P.events || []).find(function(e) { return e.sceneId === sceneId; });

    var html = '<div class="rpanel-hdr"><h3>Sahne Detayı</h3><button class="close-btn" onclick="App.Panels.closeAll()">✕</button></div>';
    html += '<div class="rpanel-body" style="padding:14px;">';
    html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">';
    html += '<div style="width:12px;height:12px;border-radius:50%;background:' + catColor + ';flex-shrink:0;"></div>';
    html += '<span style="font-size:10px;color:var(--tx3);text-transform:uppercase;">' + catLabel + '</span>';
    html += '</div>';
    html += '<h3 style="font-size:15px;font-weight:600;margin-bottom:8px;">' + U.escHtml(scene.title || 'İsimsiz') + '</h3>';

    if (scene.location || scene.timeOfDay) {
      html += '<div style="font-size:11px;color:var(--tx3);margin-bottom:8px;">';
      if (scene.location) html += U.escHtml(scene.location);
      if (scene.location && scene.timeOfDay) html += ' — ';
      if (scene.timeOfDay) html += U.escHtml(scene.timeOfDay);
      html += '</div>';
    }

    if (ev) {
      html += '<div style="font-size:11px;color:var(--tx3);margin-bottom:12px;">Süre: ' + U.s2t(ev.dur) + ' | Başlangıç: ' + U.s2t(ev.s) + '</div>';
    }

    if (charNames.length) {
      html += '<div style="margin-bottom:12px;"><div style="font-size:10px;color:var(--tx3);text-transform:uppercase;font-weight:500;margin-bottom:6px;">Karakterler</div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:4px;">';
      charNames.forEach(function(name) {
        html += '<span style="font-size:11px;padding:2px 8px;border-radius:10px;background:var(--bg4);color:var(--tx2);border:1px solid var(--brd);">' + name + '</span>';
      });
      html += '</div></div>';
    }

    if (contentText.trim()) {
      html += '<div style="margin-bottom:12px;"><div style="font-size:10px;color:var(--tx3);text-transform:uppercase;font-weight:500;margin-bottom:6px;">İçerik</div>';
      html += '<div style="font-size:12px;color:var(--tx2);line-height:1.5;white-space:pre-wrap;">' + U.escHtml(contentText.trim()) + '</div>';
      html += '</div>';
    }

    if (ev) {
      html += '<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--brd);">';
      html += '<button class="btn btn-s" onclick="App.Panels.openEditEvent(\'' + ev.id + '\')">Düzenle</button> ';
      html += '<button class="btn btn-s" onclick="App.setViewMode(\'screenplay\')">Senaryoda Aç</button>';
      html += '</div>';
    }

    html += '</div>';
    rp.innerHTML = html;
    App.Panels.setCurrentPanel('corkboard');
  }

  function filterByEpisode(epId) {
    _filterEpId = epId;
    render();
  }

  function unmount() {
    _mounted = false;
    _selectedSceneId = null;
  }

  function isMounted() { return _mounted; }

  return {
    render: render,
    filterByEpisode: filterByEpisode,
    unmount: unmount,
    isMounted: isMounted
  };
})();
