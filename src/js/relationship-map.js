// ═══ RELATIONSHIP MAP MODULE ═══
App.RelationshipMap = (function(){
  const U = App.Utils;
  const S = App.Store;

  let _svg = null;
  let _container = null;
  let _viewBox = { x: 0, y: 0, w: 1200, h: 800 };
  let _zoom = 1;
  let _isPanning = false;
  let _panStart = { x: 0, y: 0 };
  let _dragNode = null;
  let _dragOffset = { x: 0, y: 0 };
  let _selectedNode = null;
  let _selectedEdge = null;
  let _mouseDownPos = null;
  let _mouseDownNodeId = null;
  let _isDragging = false;
  const DRAG_THRESHOLD = 5;
  let _mounted = false;

  const ROLE_SIZES = { primary: 40, secondary: 30, tertiary: 22 };
  const ROLE_COLORS = { primary: 'var(--blue)', secondary: 'var(--green)', tertiary: 'var(--tx3)' };
  const REL_COLORS = {
    mentor: '#3b82f6', aile: '#10b981', dost: '#06b6d4', dusman: '#ef4444',
    sevgili: '#ec4899', rakip: '#f97316', is: '#f59e0b', gizli: '#a855f7'
  };
  const EDGE_CURVE = 0.06;

  function render() {
    _container = document.getElementById('tlC');
    if(!_container) return;
    _mounted = true;
    _container.style.overflow = 'hidden';
    _container.style.position = 'relative';
    _container.style.cursor = 'grab';

    const P = S.get();
    const chars = P.characters;
    const rels = P.characterRelationships || [];

    // Toolbar
    let html = '<div class="rm-toolbar">';
    html += '<button class="btn btn-s" onclick="App.RelationshipMap.openAddRelationship()">+ İlişki</button>';
    html += '<button class="btn btn-s" onclick="App.RelationshipMap.autoLayout()">Otomatik Yerleşim</button>';
    html += '<button class="btn btn-s" onclick="App.RelationshipMap.exportPNG()">PNG İndir</button>';
    html += '<button class="btn btn-s" onclick="App.RelationshipMap.zoomIn()">+</button>';
    html += '<button class="btn btn-s" onclick="App.RelationshipMap.zoomOut()">-</button>';
    html += '<button class="btn btn-s" onclick="App.RelationshipMap.zoomReset()">Sığdır</button>';
    html += '</div>';

    // SVG
    html += '<svg id="rmSvg" width="100%" height="100%" style="position:absolute;top:40px;left:0;right:0;bottom:0;">';
    html += '<defs>';
    // Node shadow filter
    html += '<filter id="nodeShadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.35)"/></filter>';
    // Node shine gradient (3D highlight)
    html += '<radialGradient id="nodeShine" cx="35%" cy="30%" r="65%"><stop offset="0%" stop-color="white" stop-opacity="0.22"/><stop offset="100%" stop-color="white" stop-opacity="0"/></radialGradient>';
    // Per-color arrow markers (small open chevron style)
    var _usedColors = {};
    rels.forEach(function(rel) { var c = REL_COLORS[rel.type] || '#888888'; _usedColors[c] = true; });
    Object.keys(_usedColors).forEach(function(color) {
      var cid = 'arr_' + color.replace(/[^a-zA-Z0-9]/g, '');
      html += '<marker id="' + cid + '" viewBox="0 0 10 8" refX="9" refY="4" markerWidth="4" markerHeight="4" orient="auto"><path d="M1.5,1 L8,4 L1.5,7" fill="none" stroke="' + U.sanitizeColor(color) + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/></marker>';
      html += '<marker id="' + cid + 'b" viewBox="0 0 10 8" refX="1" refY="4" markerWidth="4" markerHeight="4" orient="auto"><path d="M8.5,1 L2,4 L8.5,7" fill="none" stroke="' + U.sanitizeColor(color) + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/></marker>';
    });
    html += '</defs>';
    html += '<g id="rmRoot">';

    // Assign default positions if missing
    const cx = _viewBox.w / 2, cy = _viewBox.h / 2;
    chars.forEach((ch, i) => {
      if(ch.relMapX == null || ch.relMapY == null) {
        const angle = (2 * Math.PI * i) / Math.max(chars.length, 1);
        const radius = Math.min(cx, cy) * 0.6;
        ch.relMapX = cx + Math.cos(angle) * radius;
        ch.relMapY = cy + Math.sin(angle) * radius;
      }
    });

    // Edges (curved bezier paths)
    rels.forEach(rel => {
      const from = chars.find(c => c.id === rel.from);
      const to = chars.find(c => c.id === rel.to);
      if(!from || !to) return;
      const color = REL_COLORS[rel.type] || '#888888';
      const sw = Math.max(0.8, 0.5 + (rel.strength || 1) * 0.4);
      const x1 = from.relMapX, y1 = from.relMapY, x2 = to.relMapX, y2 = to.relMapY;

      // Shorten to node edge
      const dx = x2 - x1, dy = y2 - y1;
      const dist = Math.sqrt(dx*dx + dy*dy) || 1;
      const rFrom = ROLE_SIZES[from.role || 'secondary'] || 30;
      const rTo = ROLE_SIZES[to.role || 'secondary'] || 30;
      const nx1 = x1 + (dx/dist) * (rFrom + 6);
      const ny1 = y1 + (dy/dist) * (rFrom + 6);
      const nx2 = x2 - (dx/dist) * (rTo + 6);
      const ny2 = y2 - (dy/dist) * (rTo + 6);

      // Bezier control point (subtle curve)
      const mx = (nx1 + nx2) / 2, my = (ny1 + ny2) / 2;
      const perpX = -(ny2 - ny1) / dist, perpY = (nx2 - nx1) / dist;
      const cpx = mx + perpX * dist * EDGE_CURVE;
      const cpy = my + perpY * dist * EDGE_CURVE;
      const pathD = 'M' + nx1 + ',' + ny1 + ' Q' + cpx + ',' + cpy + ' ' + nx2 + ',' + ny2;
      // Label at bezier midpoint (t=0.5)
      const lx = 0.25*nx1 + 0.5*cpx + 0.25*nx2;
      const ly = 0.25*ny1 + 0.5*cpy + 0.25*ny2;

      const cid = 'arr_' + color.replace(/[^a-zA-Z0-9]/g, '');
      const selected = _selectedEdge === rel.id;
      html += '<g class="rm-edge' + (selected ? ' selected' : '') + '" data-relid="' + rel.id + '">';
      // Clickable invisible fat path
      html += '<path d="' + pathD + '" stroke="transparent" stroke-width="14" fill="none" style="cursor:pointer"/>';
      // Visible curved path
      html += '<path d="' + pathD + '" stroke="' + U.sanitizeColor(color) + '" stroke-width="' + sw + '" fill="none" stroke-linecap="round" marker-end="url(#' + cid + ')"';
      if(rel.bidirectional) html += ' marker-start="url(#' + cid + 'b)"';
      html += ' stroke-opacity="' + (selected ? '0.9' : '0.4') + '"/>';
      // Label
      const label = rel.type || '';
      if(label) {
        html += '<text x="' + lx + '" y="' + (ly - 3) + '" text-anchor="middle" fill="' + U.sanitizeColor(color) + '" font-size="9" font-weight="500" font-family="Inter,sans-serif" pointer-events="none" opacity="0.8">' + U.escHtml(label) + '</text>';
      }
      if(rel.description) {
        html += '<text x="' + lx + '" y="' + (ly + 9) + '" text-anchor="middle" fill="var(--tx3)" font-size="7.5" font-family="Inter,sans-serif" pointer-events="none" opacity="0.6">' + U.escHtml(rel.description.substring(0, 30)) + '</text>';
      }
      html += '</g>';
    });

    // Nodes
    chars.forEach(ch => {
      const r = ROLE_SIZES[ch.role || 'secondary'] || 30;
      const x = ch.relMapX, y = ch.relMapY;
      const selected = _selectedNode === ch.id;
      const color = U.sanitizeColor(ch.color) || '#3b82f6';
      const initials = getInitials(ch.name);

      html += '<g class="rm-node' + (selected ? ' selected' : '') + '" data-chid="' + ch.id + '" transform="translate(' + x + ',' + y + ')" style="cursor:grab">';
      // Selection glow (always present, toggled via _updateSelection)
      html += '<circle class="rm-glow" r="' + (r + 5) + '" fill="none" stroke="var(--cyan)" stroke-width="1.5" stroke-dasharray="4,3" style="opacity:' + (selected ? '1' : '0') + '"/>';
      // Main circle with drop shadow
      html += '<circle r="' + r + '" fill="' + color + '" filter="url(#nodeShadow)"/>';
      // Shine overlay (3D highlight)
      html += '<circle r="' + r + '" fill="url(#nodeShine)" pointer-events="none"/>';
      // Subtle border ring
      html += '<circle r="' + r + '" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.8"/>';
      // Initials
      html += '<text y="1" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="' + Math.max(10, r * 0.55) + '" font-weight="600" font-family="Inter,sans-serif" pointer-events="none">' + U.escHtml(initials) + '</text>';
      // Name label below
      html += '<text y="' + (r + 14) + '" text-anchor="middle" fill="var(--tx)" font-size="10.5" font-weight="500" font-family="Inter,sans-serif" pointer-events="none">' + U.escHtml(ch.name) + '</text>';
      // Role badge
      if(ch.role === 'primary') {
        html += '<text y="' + (r + 25) + '" text-anchor="middle" fill="var(--tx3)" font-size="7.5" font-family="Inter,sans-serif" pointer-events="none" opacity="0.7">Ana Karakter</text>';
      }
      html += '</g>';
    });

    html += '</g></svg>';
    _container.innerHTML = html;

    _svg = document.getElementById('rmSvg');
    if(_svg) {
      _svg.setAttribute('viewBox', _viewBox.x + ' ' + _viewBox.y + ' ' + (_viewBox.w / _zoom) + ' ' + (_viewBox.h / _zoom));
      _attachEvents();
    }
  }

  function getInitials(name) {
    if(!name) return '?';
    const parts = name.split(/\s+/);
    if(parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  function _attachEvents() {
    if(!_svg) return;

    _svg.addEventListener('mousedown', function(e) {
      const node = e.target.closest('.rm-node');
      const edge = e.target.closest('.rm-edge');

      if(node) {
        e.preventDefault();
        e.stopPropagation();
        const chId = node.dataset.chid;
        _mouseDownNodeId = chId;
        _mouseDownPos = { x: e.clientX, y: e.clientY };
        _isDragging = false;
        // Prepare drag offset but don't start drag yet
        const ch = S.getCharacters().find(c => c.id === chId);
        if(!ch) return;
        const pt = _svgPoint(e);
        _dragOffset.x = pt.x - ch.relMapX;
        _dragOffset.y = pt.y - ch.relMapY;
        _svg.style.cursor = 'grabbing';
        return;
      }

      if(edge) {
        e.preventDefault();
        e.stopPropagation();
        const relId = edge.dataset.relid;
        _selectedEdge = relId;
        _selectedNode = null;
        _mouseDownNodeId = null;
        _showEdgeDetails(relId);
        _updateSelection();
        return;
      }

      // Pan start (only on background)
      _isPanning = true;
      _panStart.x = e.clientX;
      _panStart.y = e.clientY;
      _svg.style.cursor = 'grabbing';
    });

    _svg.addEventListener('mousemove', function(e) {
      // Check drag threshold for node drag
      if(_mouseDownNodeId && !_isDragging && !_dragNode) {
        const dx = e.clientX - _mouseDownPos.x;
        const dy = e.clientY - _mouseDownPos.y;
        if(Math.sqrt(dx*dx + dy*dy) > DRAG_THRESHOLD) {
          _isDragging = true;
          _dragNode = _mouseDownNodeId;
          _selectedNode = _mouseDownNodeId;
          _selectedEdge = null;
          _updateSelection();
        }
        return;
      }

      if(_dragNode) {
        const ch = S.getCharacters().find(c => c.id === _dragNode);
        if(!ch) return;
        const pt = _svgPoint(e);
        ch.relMapX = pt.x - _dragOffset.x;
        ch.relMapY = pt.y - _dragOffset.y;
        _updateNodeDOM(ch);
        _updateEdgeDOM();
        return;
      }

      if(_isPanning) {
        const dx = (e.clientX - _panStart.x) / _zoom;
        const dy = (e.clientY - _panStart.y) / _zoom;
        _viewBox.x -= dx;
        _viewBox.y -= dy;
        _panStart.x = e.clientX;
        _panStart.y = e.clientY;
        if(_svg) _svg.setAttribute('viewBox', _viewBox.x + ' ' + _viewBox.y + ' ' + (_viewBox.w / _zoom) + ' ' + (_viewBox.h / _zoom));
      }
    });

    _svg.addEventListener('mouseup', function(e) {
      if(_mouseDownNodeId && !_isDragging) {
        // Click (not drag) — show details in panel
        const chId = _mouseDownNodeId;
        _selectedNode = chId;
        _selectedEdge = null;
        _showNodeDetails(chId);
        _updateSelection();
        _mouseDownNodeId = null;
        _mouseDownPos = null;
        _svg.style.cursor = 'grab';
        return;
      }

      if(_dragNode) {
        S.markDirty('characters');
        S.emit('change', { type: 'relMapDrag' });
        _dragNode = null;
        _isDragging = false;
        _mouseDownNodeId = null;
        _mouseDownPos = null;
      }
      _isPanning = false;
      _svg.style.cursor = 'grab';
    });

    _svg.addEventListener('mouseleave', function() {
      if(_dragNode) {
        S.markDirty('characters');
        S.emit('change', { type: 'relMapDrag' });
        _dragNode = null;
        _isDragging = false;
      }
      _mouseDownNodeId = null;
      _mouseDownPos = null;
      _isPanning = false;
    });

    // Zoom
    _svg.addEventListener('wheel', function(e) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      _zoom = Math.max(0.2, Math.min(5, _zoom * delta));
      _svg.setAttribute('viewBox', _viewBox.x + ' ' + _viewBox.y + ' ' + (_viewBox.w / _zoom) + ' ' + (_viewBox.h / _zoom));
    });
  }

  // Update selection visuals without full re-render
  function _updateSelection() {
    if(!_svg) return;
    _svg.querySelectorAll('.rm-node').forEach(function(n) {
      var isSel = n.dataset.chid === _selectedNode;
      n.classList.toggle('selected', isSel);
      var glow = n.querySelector('.rm-glow');
      if(glow) glow.style.opacity = isSel ? '1' : '0';
    });
    _svg.querySelectorAll('.rm-edge').forEach(function(el) {
      var isSel = el.dataset.relid === _selectedEdge;
      el.classList.toggle('selected', isSel);
      var paths = el.querySelectorAll('path');
      if(paths[1]) paths[1].setAttribute('stroke-opacity', isSel ? '0.9' : '0.4');
    });
  }

  // Update a single node's position in the DOM without full re-render
  function _updateNodeDOM(ch) {
    if(!_svg) return;
    var nodeEl = _svg.querySelector('.rm-node[data-chid="' + ch.id + '"]');
    if(nodeEl) nodeEl.setAttribute('transform', 'translate(' + ch.relMapX + ',' + ch.relMapY + ')');
  }

  // Update all edge positions in the DOM without full re-render
  function _updateEdgeDOM() {
    if(!_svg) return;
    var P = S.get();
    var chars = P.characters;
    var rels = P.characterRelationships || [];
    rels.forEach(function(rel) {
      var from = chars.find(function(c) { return c.id === rel.from; });
      var to = chars.find(function(c) { return c.id === rel.to; });
      if(!from || !to) return;
      var edgeEl = _svg.querySelector('.rm-edge[data-relid="' + rel.id + '"]');
      if(!edgeEl) return;
      var x1 = from.relMapX, y1 = from.relMapY, x2 = to.relMapX, y2 = to.relMapY;
      var dx = x2 - x1, dy = y2 - y1;
      var dist = Math.sqrt(dx*dx + dy*dy) || 1;
      var rFrom = ROLE_SIZES[from.role || 'secondary'] || 30;
      var rTo = ROLE_SIZES[to.role || 'secondary'] || 30;
      var nx1 = x1 + (dx/dist) * (rFrom + 6);
      var ny1 = y1 + (dy/dist) * (rFrom + 6);
      var nx2 = x2 - (dx/dist) * (rTo + 6);
      var ny2 = y2 - (dy/dist) * (rTo + 6);
      var mx = (nx1 + nx2) / 2, my = (ny1 + ny2) / 2;
      var perpX = -(ny2 - ny1) / dist, perpY = (nx2 - nx1) / dist;
      var cpx = mx + perpX * dist * EDGE_CURVE;
      var cpy = my + perpY * dist * EDGE_CURVE;
      var pathD = 'M' + nx1 + ',' + ny1 + ' Q' + cpx + ',' + cpy + ' ' + nx2 + ',' + ny2;
      var lx = 0.25*nx1 + 0.5*cpx + 0.25*nx2;
      var ly = 0.25*ny1 + 0.5*cpy + 0.25*ny2;
      var paths = edgeEl.querySelectorAll('path');
      paths.forEach(function(p) { p.setAttribute('d', pathD); });
      var texts = edgeEl.querySelectorAll('text');
      if(texts[0]) { texts[0].setAttribute('x', lx); texts[0].setAttribute('y', ly - 3); }
      if(texts[1]) { texts[1].setAttribute('x', lx); texts[1].setAttribute('y', ly + 9); }
    });
  }

  function _svgPoint(e) {
    if(!_svg) return { x: 0, y: 0 };
    const rect = _svg.getBoundingClientRect();
    const vbW = _viewBox.w / _zoom, vbH = _viewBox.h / _zoom;
    return {
      x: _viewBox.x + ((e.clientX - rect.left) / rect.width) * vbW,
      y: _viewBox.y + ((e.clientY - rect.top) / rect.height) * vbH
    };
  }

  function _showNodeDetails(chId) {
    const P = S.get();
    const ch = P.characters.find(c => c.id === chId);
    if(!ch) return;
    const rels = (P.characterRelationships || []).filter(r => r.from === chId || r.to === chId);
    const rp = document.getElementById('rPanel');
    if(!rp) return;

    let h = '<div class="rpanel-hdr"><h3>Karakter Detayı</h3><button class="close-btn" onclick="App.Panels.closeAll()">✕</button></div>';
    h += '<div class="rpanel-body" style="padding:14px;">';
    h += '<div style="text-align:center;margin-bottom:16px;">';
    h += '<div style="width:60px;height:60px;border-radius:50%;background:' + U.sanitizeColor(ch.color || '#3b82f6') + ';display:inline-flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#fff;">' + getInitials(ch.name) + '</div>';
    h += '<div style="font-size:15px;font-weight:600;margin-top:8px;">' + U.escHtml(ch.name) + '</div>';
    h += '<div style="font-size:11px;color:var(--tx3);">' + _roleLabelTr(ch.role || 'secondary') + '</div>';
    h += '</div>';

    // Role selector
    h += '<div class="fg"><label>Rol</label><select onchange="App.RelationshipMap.setCharRole(\'' + ch.id + '\',this.value)">';
    ['primary','secondary','tertiary'].forEach(r => {
      h += '<option value="' + r + '"' + (ch.role === r ? ' selected' : '') + '>' + _roleLabelTr(r) + '</option>';
    });
    h += '</select></div>';

    // Relations list
    h += '<div style="font-size:11px;color:var(--tx3);text-transform:uppercase;margin-bottom:6px;font-weight:500;">İlişkiler (' + rels.length + ')</div>';
    rels.forEach(r => {
      const other = r.from === chId ? P.characters.find(c => c.id === r.to) : P.characters.find(c => c.id === r.from);
      const direction = r.from === chId ? '→' : '←';
      const color = REL_COLORS[r.type] || 'var(--tx3)';
      h += '<div style="display:flex;align-items:center;gap:6px;padding:6px 0;border-bottom:1px solid var(--brd);font-size:12px;">';
      h += '<span style="color:' + U.sanitizeColor(color) + ';font-weight:600;">' + direction + '</span>';
      h += '<span style="flex:1;">' + U.escHtml(other ? other.name : '?') + '</span>';
      h += '<span style="font-size:10px;color:' + U.sanitizeColor(color) + ';background:rgba(255,255,255,.05);padding:2px 6px;border-radius:8px;">' + U.escHtml(r.type || '?') + '</span>';
      h += '<button class="btn btn-s" style="color:var(--red);padding:2px 6px;" onclick="App.RelationshipMap.removeRelationship(\'' + r.id + '\')">✕</button>';
      h += '</div>';
    });
    h += '<button class="btn btn-s" style="margin-top:8px;width:100%;" onclick="App.RelationshipMap.openAddRelationship(\'' + ch.id + '\')">+ İlişki Ekle</button>';
    h += '</div>';

    rp.innerHTML = h;
    rp.classList.add('open');
    if(App.Panels.setCurrentPanel) App.Panels.setCurrentPanel('relmap');
  }

  function _showEdgeDetails(relId) {
    const P = S.get();
    const rel = (P.characterRelationships || []).find(r => r.id === relId);
    if(!rel) return;
    const from = P.characters.find(c => c.id === rel.from);
    const to = P.characters.find(c => c.id === rel.to);
    const rp = document.getElementById('rPanel');
    if(!rp) return;

    let h = '<div class="rpanel-hdr"><h3>İlişki Detayı</h3><button class="close-btn" onclick="App.Panels.closeAll()">✕</button></div>';
    h += '<div class="rpanel-body" style="padding:14px;">';
    h += '<div style="text-align:center;margin-bottom:12px;">';
    h += '<span style="font-weight:600;">' + U.escHtml(from ? from.name : '?') + '</span>';
    h += ' <span style="color:var(--tx3);">' + (rel.bidirectional ? '⟷' : '→') + '</span> ';
    h += '<span style="font-weight:600;">' + U.escHtml(to ? to.name : '?') + '</span>';
    h += '</div>';
    h += '<div class="fg"><label>Tip</label><input id="rmRelType" value="' + U.escHtml(rel.type || '') + '" placeholder="mentor, dost, düşman..." /></div>';
    h += '<div class="fg"><label>Açıklama</label><textarea id="rmRelDesc" rows="2">' + U.escHtml(rel.description || '') + '</textarea></div>';
    h += '<div class="fg"><label>Güç (1-5)</label><input type="range" id="rmRelStr" min="1" max="5" value="' + (rel.strength || 3) + '" /></div>';
    h += '<div class="fg"><label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" id="rmRelBi"' + (rel.bidirectional ? ' checked' : '') + ' style="width:auto;" /> Çift yönlü</label></div>';
    h += '<div style="display:flex;gap:6px;margin-top:12px;">';
    h += '<button class="btn btn-d" onclick="App.RelationshipMap.removeRelationship(\'' + rel.id + '\')">Sil</button>';
    h += '<div style="flex:1"></div>';
    h += '<button class="btn btn-p" onclick="App.RelationshipMap.saveEdgeDetails(\'' + rel.id + '\')">Kaydet</button>';
    h += '</div></div>';

    rp.innerHTML = h;
    rp.classList.add('open');
    if(App.Panels.setCurrentPanel) App.Panels.setCurrentPanel('relmap');
  }

  function saveEdgeDetails(relId) {
    const type = (document.getElementById('rmRelType') || {}).value || '';
    const desc = (document.getElementById('rmRelDesc') || {}).value || '';
    const str = parseInt((document.getElementById('rmRelStr') || {}).value) || 3;
    const bi = (document.getElementById('rmRelBi') || {}).checked || false;
    S.updateCharacterRelationship(relId, { type, description: desc, strength: str, bidirectional: bi });
    render();
    App.UI.toast('İlişki güncellendi');
  }

  function setCharRole(chId, role) {
    S.updateCharacter(chId, { role });
    render();
    _showNodeDetails(chId);
  }

  function removeRelationship(relId) {
    S.removeCharacterRelationship(relId);
    _selectedEdge = null;
    _selectedNode = null;
    App.Panels.closeAll();
    render();
    App.UI.toast('İlişki silindi');
  }

  function openAddRelationship(fromCharId) {
    const P = S.get();
    const chars = P.characters;
    if(chars.length < 2) { App.UI.toast('En az 2 karakter gerekli'); return; }

    const fromOpts = chars.map(c => '<option value="' + c.id + '"' + (c.id === fromCharId ? ' selected' : '') + '>' + U.escHtml(c.name) + '</option>').join('');
    const toOpts = chars.map(c => '<option value="' + c.id + '">' + U.escHtml(c.name) + '</option>').join('');
    const typeOpts = ['mentor','aile','dost','dusman','sevgili','rakip','is','gizli'].map(t => '<option value="' + t + '">' + t + '</option>').join('');

    App.UI.openModal(
      '<div class="mh"><span>Yeni İlişki</span><button class="close-btn" onclick="App.UI.closeModal()">✕</button></div>' +
      '<div class="mb">' +
      '<div class="fg"><label>Kimden</label><select id="rmNewFrom">' + fromOpts + '</select></div>' +
      '<div class="fg"><label>Kime</label><select id="rmNewTo">' + toOpts + '</select></div>' +
      '<div class="fg"><label>Tip</label><select id="rmNewType">' + typeOpts + '<option value="">Diğer...</option></select></div>' +
      '<div class="fg"><label>Açıklama</label><textarea id="rmNewDesc" rows="2" placeholder="Kısa açıklama..."></textarea></div>' +
      '<div class="fg"><label>Güç (1-5)</label><input type="range" id="rmNewStr" min="1" max="5" value="3" /></div>' +
      '<div class="fg"><label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" id="rmNewBi" style="width:auto;" /> Çift yönlü</label></div>' +
      '</div>' +
      '<div class="mf"><button class="btn" onclick="App.UI.closeModal()">İptal</button><button class="btn btn-p" onclick="App.RelationshipMap.doAddRelationship()">Ekle</button></div>'
    );
  }

  function doAddRelationship() {
    const from = (document.getElementById('rmNewFrom') || {}).value;
    const to = (document.getElementById('rmNewTo') || {}).value;
    if(!from || !to || from === to) { App.UI.toast('Farklı iki karakter seçin'); return; }
    const type = (document.getElementById('rmNewType') || {}).value || 'dost';
    const desc = (document.getElementById('rmNewDesc') || {}).value || '';
    const str = parseInt((document.getElementById('rmNewStr') || {}).value) || 3;
    const bi = (document.getElementById('rmNewBi') || {}).checked || false;

    S.addCharacterRelationship({
      id: U.genId('cr'), from, to, type, description: desc, strength: str, bidirectional: bi
    });
    App.UI.closeModal();
    render();
    App.UI.toast('İlişki eklendi');
  }

  function openEditRelationship(relId) {
    _selectedEdge = relId;
    _selectedNode = null;
    _showEdgeDetails(relId);
    render();
  }

  // Force-directed auto layout
  function autoLayout() {
    const P = S.get();
    const chars = P.characters;
    const rels = P.characterRelationships || [];
    if(!chars.length) return;

    const W = _viewBox.w, H = _viewBox.h;
    const cx = W / 2, cy = H / 2;
    const k = Math.sqrt((W * H) / Math.max(chars.length, 1)) * 0.5;

    // Initialize positions in circle
    chars.forEach((ch, i) => {
      const angle = (2 * Math.PI * i) / chars.length;
      ch.relMapX = cx + Math.cos(angle) * k;
      ch.relMapY = cy + Math.sin(angle) * k;
    });

    // Iterate force simulation
    for(let iter = 0; iter < 100; iter++) {
      const forces = {};
      chars.forEach(ch => { forces[ch.id] = { fx: 0, fy: 0 }; });

      // Repulsive forces between all nodes
      for(let i = 0; i < chars.length; i++) {
        for(let j = i + 1; j < chars.length; j++) {
          const a = chars[i], b = chars[j];
          let dx = b.relMapX - a.relMapX;
          let dy = b.relMapY - a.relMapY;
          const dist = Math.sqrt(dx*dx + dy*dy) || 1;
          const force = (k * k) / dist;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          forces[a.id].fx -= fx;
          forces[a.id].fy -= fy;
          forces[b.id].fx += fx;
          forces[b.id].fy += fy;
        }
      }

      // Attractive forces along edges
      rels.forEach(rel => {
        const a = chars.find(c => c.id === rel.from);
        const b = chars.find(c => c.id === rel.to);
        if(!a || !b) return;
        let dx = b.relMapX - a.relMapX;
        let dy = b.relMapY - a.relMapY;
        const dist = Math.sqrt(dx*dx + dy*dy) || 1;
        const force = dist / k;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        forces[a.id].fx += fx;
        forces[a.id].fy += fy;
        forces[b.id].fx -= fx;
        forces[b.id].fy -= fy;
      });

      // Center gravity
      chars.forEach(ch => {
        const dx = cx - ch.relMapX;
        const dy = cy - ch.relMapY;
        forces[ch.id].fx += dx * 0.01;
        forces[ch.id].fy += dy * 0.01;
      });

      // Apply with cooling
      const temp = Math.max(1, 50 - iter * 0.5);
      chars.forEach(ch => {
        const f = forces[ch.id];
        const fLen = Math.sqrt(f.fx*f.fx + f.fy*f.fy) || 1;
        const move = Math.min(fLen, temp);
        ch.relMapX += (f.fx / fLen) * move;
        ch.relMapY += (f.fy / fLen) * move;
        // Keep in bounds
        ch.relMapX = Math.max(60, Math.min(W - 60, ch.relMapX));
        ch.relMapY = Math.max(60, Math.min(H - 60, ch.relMapY));
      });
    }

    S.markDirty('characters');
    S.emit('change', { type: 'relMapAutoLayout' });
    render();
    App.UI.toast('Otomatik yerleşim uygulandı');
  }

  // Pan & Zoom
  function zoomIn() { _zoom = Math.min(5, _zoom * 1.2); _updateViewBox(); }
  function zoomOut() { _zoom = Math.max(0.2, _zoom / 1.2); _updateViewBox(); }
  function zoomReset() { _zoom = 1; _viewBox.x = 0; _viewBox.y = 0; _updateViewBox(); }
  function _updateViewBox() {
    if(_svg) _svg.setAttribute('viewBox', _viewBox.x + ' ' + _viewBox.y + ' ' + (_viewBox.w / _zoom) + ' ' + (_viewBox.h / _zoom));
  }

  // Export PNG
  function exportPNG() {
    if(!_svg) { App.UI.toast('Harita yok'); return; }
    const svgData = new XMLSerializer().serializeToString(_svg);
    const canvas = document.createElement('canvas');
    canvas.width = 1920; canvas.height = 1080;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#08080c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = function() {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(function(blob) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'iliski-haritasi.png';
        a.click();
        App.UI.toast('PNG indirildi');
      });
    };
    img.onerror = function() {
      URL.revokeObjectURL(url);
      App.UI.toast('PNG oluşturulamadı');
    };
    img.src = url;
  }

  function _roleLabelTr(role) {
    return { primary: 'Ana Karakter', secondary: 'Yan Karakter', tertiary: 'Figüran' }[role] || 'Yan Karakter';
  }

  function unmount() {
    _mounted = false;
    _selectedNode = null;
    _selectedEdge = null;
    _dragNode = null;
    _isPanning = false;
  }

  return {
    render, unmount, autoLayout, exportPNG,
    openAddRelationship, doAddRelationship, openEditRelationship,
    saveEdgeDetails, setCharRole, removeRelationship,
    zoomIn, zoomOut, zoomReset
  };
})();
