// ═══ REVIEW + TRACK CHANGES MODULE ═══
App.Review = (function(){
  const U = App.Utils;
  const S = App.Store;

  let _reviewMode = false;
  let _userId = null;
  let _userName = '';
  let _userColor = '#3b82f6';
  const USER_COLORS = ['#3b82f6','#ef4444','#10b981','#f59e0b','#a855f7','#ec4899','#06b6d4','#f97316'];

  function _initUser() {
    if(_userId) return;
    var user = App.Auth ? App.Auth.getCurrentUser() : null;
    if(user) {
      _userId = user.uid;
      _userName = user.displayName || user.email.split('@')[0];
      var hash = 0;
      for(var i = 0; i < _userId.length; i++) hash = ((hash << 5) - hash) + _userId.charCodeAt(i);
      _userColor = USER_COLORS[Math.abs(hash) % USER_COLORS.length];
    } else {
      _userId = 'local_' + Date.now();
      _userName = 'Kullanıcı';
      _userColor = '#3b82f6';
    }
  }

  // ── Toggle review mode ──
  function toggleReviewMode() {
    _initUser();
    _reviewMode = !_reviewMode;
    var btn = document.getElementById('reviewToggleBtn');
    if(btn) {
      btn.classList.toggle('btn-p', _reviewMode);
      btn.textContent = _reviewMode ? 'İnceleme ✓' : 'İnceleme';
    }
    document.body.classList.toggle('review-mode-active', _reviewMode);
    if(_reviewMode) {
      App.UI.toast('İnceleme modu açıldı');
    } else {
      App.UI.toast('İnceleme modu kapatıldı');
    }
  }

  function isReviewMode() { return _reviewMode; }
  function getUserColor() { _initUser(); return _userColor; }
  function getUserId() { _initUser(); return _userId; }
  function getUserName() { _initUser(); return _userName; }

  // ── Track Changes: Intercept input in contenteditable ──
  function interceptInput(event, editableEl) {
    if(!_reviewMode || !editableEl) return false;
    _initUser();

    // Get the current scene id
    var scId = editableEl.dataset.sid || editableEl.dataset.scid;
    if(!scId) return false;

    // Get insertion data
    var data = event.data || '';
    if(!data && event.inputType !== 'insertParagraph') return false;

    // Wrap inserted text in track-add span
    var sel = window.getSelection();
    if(!sel.rangeCount) return false;

    var range = sel.getRangeAt(0);
    range.deleteContents();

    var span = document.createElement('span');
    span.className = 'track-add';
    span.dataset.user = _userId;
    span.dataset.userName = _userName;
    span.dataset.ts = String(Date.now());
    span.style.borderBottom = '2px solid ' + U.sanitizeColor(_userColor);
    span.style.backgroundColor = 'rgba(' + _hexToRgb(_userColor) + ',0.1)';
    span.textContent = data || '\n';
    span.contentEditable = 'true';

    range.insertNode(span);

    // Move cursor after span
    var newRange = document.createRange();
    newRange.setStartAfter(span);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    // Record track change
    _addTrackChange(scId, 'add', data, span);

    event.preventDefault();
    return true;
  }

  function interceptDelete(event, editableEl) {
    if(!_reviewMode || !editableEl) return false;
    _initUser();

    var scId = editableEl.dataset.sid || editableEl.dataset.scid;
    if(!scId) return false;

    var sel = window.getSelection();
    if(!sel.rangeCount) return false;
    var range = sel.getRangeAt(0);

    // If there's a selection, wrap it in track-del
    if(!range.collapsed) {
      var fragment = range.extractContents();
      var span = document.createElement('span');
      span.className = 'track-del';
      span.dataset.user = _userId;
      span.dataset.userName = _userName;
      span.dataset.ts = String(Date.now());
      span.style.textDecoration = 'line-through';
      span.style.color = 'var(--red)';
      span.style.opacity = '0.7';
      span.contentEditable = 'false';
      span.appendChild(fragment);
      range.insertNode(span);

      _addTrackChange(scId, 'delete', span.textContent, span);
      event.preventDefault();
      return true;
    }

    // Single char delete (backspace/delete)
    var isBackspace = event.key === 'Backspace';
    var node = range.startContainer;
    var offset = range.startOffset;

    if(node.nodeType === Node.TEXT_NODE && node.textContent.length > 0) {
      var charIdx = isBackspace ? offset - 1 : offset;
      if(charIdx < 0 || charIdx >= node.textContent.length) return false;

      var deletedChar = node.textContent[charIdx];

      // Already in a track-del span? Skip
      if(node.parentElement && node.parentElement.classList.contains('track-del')) return false;

      // Already in a track-add span? Actually delete it
      if(node.parentElement && node.parentElement.classList.contains('track-add')) return false;

      // Create strikethrough span
      var before = node.textContent.substring(0, charIdx);
      var after = node.textContent.substring(charIdx + 1);

      var delSpan = document.createElement('span');
      delSpan.className = 'track-del';
      delSpan.dataset.user = _userId;
      delSpan.dataset.userName = _userName;
      delSpan.dataset.ts = String(Date.now());
      delSpan.style.textDecoration = 'line-through';
      delSpan.style.color = 'var(--red)';
      delSpan.style.opacity = '0.7';
      delSpan.contentEditable = 'false';
      delSpan.textContent = deletedChar;

      var parent = node.parentNode;
      var beforeNode = document.createTextNode(before);
      var afterNode = document.createTextNode(after);

      parent.insertBefore(beforeNode, node);
      parent.insertBefore(delSpan, node);
      parent.insertBefore(afterNode, node);
      parent.removeChild(node);

      // Place cursor after del span (at start of afterNode)
      var newRange = document.createRange();
      newRange.setStart(afterNode, 0);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);

      _addTrackChange(scId, 'delete', deletedChar, delSpan);
      event.preventDefault();
      return true;
    }

    return false;
  }

  function _addTrackChange(scId, type, text, spanEl) {
    var sc = S.getScene(scId);
    if(!sc) return;
    if(!sc.trackChanges) sc.trackChanges = [];
    sc.trackChanges.push({
      id: U.genId('tc'),
      type: type,
      userId: _userId,
      userName: _userName,
      userColor: _userColor,
      offset: 0, // simplified
      length: text.length,
      text: text,
      timestamp: Date.now(),
      accepted: null
    });
    S.markDirty('scenes');
  }

  // ── Accept / Reject changes ──
  function acceptChange(changeId, sceneId) {
    var sc = S.getScene(sceneId);
    if(!sc || !sc.trackChanges) return;
    var tc = sc.trackChanges.find(function(c) { return c.id === changeId; });
    if(!tc) return;
    tc.accepted = true;

    // In DOM: if add, make permanent (remove span wrapper); if delete, remove the span entirely
    _applyDomChange(changeId, 'accept');
    S.markDirty('scenes');
    S.emit('change', { type: 'reviewAccept' });
    App.UI.toast('Değişiklik kabul edildi');
  }

  function rejectChange(changeId, sceneId) {
    var sc = S.getScene(sceneId);
    if(!sc || !sc.trackChanges) return;
    var tc = sc.trackChanges.find(function(c) { return c.id === changeId; });
    if(!tc) return;
    tc.accepted = false;

    // In DOM: if add, remove the text; if delete, restore the text
    _applyDomChange(changeId, 'reject');
    S.markDirty('scenes');
    S.emit('change', { type: 'reviewReject' });
    App.UI.toast('Değişiklik reddedildi');
  }

  function acceptAll(sceneId) {
    var sc = S.getScene(sceneId);
    if(!sc || !sc.trackChanges) return;
    sc.trackChanges.forEach(function(tc) {
      if(tc.accepted === null) {
        tc.accepted = true;
        _applyDomChange(tc.id, 'accept');
      }
    });
    S.markDirty('scenes');
    S.emit('change', { type: 'reviewAcceptAll' });
    App.UI.toast('Tüm değişiklikler kabul edildi');
  }

  function rejectAll(sceneId) {
    var sc = S.getScene(sceneId);
    if(!sc || !sc.trackChanges) return;
    sc.trackChanges.forEach(function(tc) {
      if(tc.accepted === null) {
        tc.accepted = false;
        _applyDomChange(tc.id, 'reject');
      }
    });
    S.markDirty('scenes');
    S.emit('change', { type: 'reviewRejectAll' });
    App.UI.toast('Tüm değişiklikler reddedildi');
  }

  function _applyDomChange(changeId, action) {
    // Find spans with this change id and apply
    document.querySelectorAll('[data-tc-id="' + changeId + '"]').forEach(function(span) {
      if(action === 'accept') {
        if(span.classList.contains('track-add')) {
          // Keep text, unwrap span
          var text = document.createTextNode(span.textContent);
          span.parentNode.replaceChild(text, span);
        } else if(span.classList.contains('track-del')) {
          // Remove the deleted text
          span.parentNode.removeChild(span);
        }
      } else { // reject
        if(span.classList.contains('track-add')) {
          // Remove the added text
          span.parentNode.removeChild(span);
        } else if(span.classList.contains('track-del')) {
          // Restore: unwrap the strikethrough
          var text = document.createTextNode(span.textContent);
          span.parentNode.replaceChild(text, span);
        }
      }
    });
  }

  // ── Render track markers in screenplay text ──
  function renderTrackMarkers(sceneId, htmlText) {
    if(!htmlText) return htmlText;
    // Parse marker syntax: {+uid:ts|text+} and {-uid:ts|text-}
    htmlText = htmlText.replace(/\{\+([^:]+):(\d+)\|([^+]*)\+\}/g, function(m, uid, ts, text) {
      var color = _getColorForUser(uid);
      return '<span class="track-add" data-user="' + U.escHtml(uid) + '" data-ts="' + ts + '" style="border-bottom:2px solid ' + U.sanitizeColor(color) + ';background:rgba(' + _hexToRgb(color) + ',0.1)">' + U.escHtml(text) + '</span>';
    });
    htmlText = htmlText.replace(/\{-([^:]+):(\d+)\|([^-]*)-\}/g, function(m, uid, ts, text) {
      return '<span class="track-del" data-user="' + U.escHtml(uid) + '" data-ts="' + ts + '" style="text-decoration:line-through;color:var(--red);opacity:.7">' + U.escHtml(text) + '</span>';
    });
    return htmlText;
  }

  function stripMarkers(text) {
    if(!text) return text;
    // Remove add markers, keep text
    text = text.replace(/\{\+[^:]+:\d+\|([^+]*)\+\}/g, '$1');
    // Remove delete markers entirely (text was deleted)
    text = text.replace(/\{-[^:]+:\d+\|[^-]*-\}/g, '');
    return text;
  }

  // ── Comments ──
  function addComment(sceneId, start, end, text) {
    _initUser();
    S.addReviewComment({
      id: U.genId('rc'),
      sceneId: sceneId,
      userId: _userId,
      userName: _userName,
      userColor: _userColor,
      text: text,
      markerStart: start || 0,
      markerEnd: end || 0,
      createdAt: Date.now(),
      resolved: false,
      replies: []
    });
    App.UI.toast('Yorum eklendi');
  }

  function openAddCommentModal(sceneId) {
    _initUser();
    App.UI.openModal(
      '<div class="mh"><span>Yorum Ekle</span><button class="close-btn" onclick="App.UI.closeModal()">✕</button></div>' +
      '<div class="mb">' +
      '<div class="fg"><label>Yorum</label><textarea id="rcText" rows="3" placeholder="Yorumunuzu yazın..."></textarea></div>' +
      '</div>' +
      '<div class="mf">' +
      '<button class="btn" onclick="App.UI.closeModal()">İptal</button>' +
      '<button class="btn btn-p" onclick="App.Review.doAddComment(\'' + sceneId + '\')">Ekle</button>' +
      '</div>'
    );
  }

  function doAddComment(sceneId) {
    var text = (document.getElementById('rcText') || {}).value || '';
    if(!text.trim()) { App.UI.toast('Yorum metni gerekli'); return; }
    addComment(sceneId, 0, 0, text.trim());
    App.UI.closeModal();
  }

  function resolveComment(commentId) {
    S.updateReviewComment(commentId, { resolved: true });
    App.UI.toast('Yorum çözüldü');
    if(document.getElementById('rPanel').classList.contains('open')) renderReviewPanel();
  }

  function unresolveComment(commentId) {
    S.updateReviewComment(commentId, { resolved: false });
    if(document.getElementById('rPanel').classList.contains('open')) renderReviewPanel();
  }

  function deleteComment(commentId) {
    S.removeReviewComment(commentId);
    App.UI.toast('Yorum silindi');
    if(document.getElementById('rPanel').classList.contains('open')) renderReviewPanel();
  }

  function addReply(commentId, text) {
    _initUser();
    var comment = (S.get().reviewComments || []).find(function(c) { return c.id === commentId; });
    if(!comment) return;
    if(!comment.replies) comment.replies = [];
    comment.replies.push({
      userId: _userId,
      userName: _userName,
      userColor: _userColor,
      text: text,
      createdAt: Date.now()
    });
    S.markDirty('reviewComments');
    S.emit('change', { type: 'reviewReply' });
    App.UI.toast('Yanıt eklendi');
  }

  function openReplyModal(commentId) {
    App.UI.openModal(
      '<div class="mh"><span>Yanıtla</span><button class="close-btn" onclick="App.UI.closeModal()">✕</button></div>' +
      '<div class="mb">' +
      '<div class="fg"><label>Yanıt</label><textarea id="rcReplyText" rows="2" placeholder="Yanıtınız..."></textarea></div>' +
      '</div>' +
      '<div class="mf">' +
      '<button class="btn" onclick="App.UI.closeModal()">İptal</button>' +
      '<button class="btn btn-p" onclick="App.Review.doReply(\'' + commentId + '\')">Gönder</button>' +
      '</div>'
    );
  }

  function doReply(commentId) {
    var text = (document.getElementById('rcReplyText') || {}).value || '';
    if(!text.trim()) { App.UI.toast('Yanıt gerekli'); return; }
    addReply(commentId, text.trim());
    App.UI.closeModal();
    renderReviewPanel();
  }

  // ── Review Panel ──
  function renderReviewPanel() {
    var rp = document.getElementById('rPanel');
    if(!rp) return;
    rp.classList.add('open');

    var P = S.get();
    var comments = P.reviewComments || [];
    var scenes = P.scenes || [];

    // Collect track changes from all scenes
    var allChanges = [];
    scenes.forEach(function(sc) {
      (sc.trackChanges || []).forEach(function(tc) {
        if(tc.accepted === null) allChanges.push({ change: tc, sceneId: sc.id, sceneName: sc.title || 'Adsız' });
      });
    });

    var unresolvedComments = comments.filter(function(c) { return !c.resolved; });
    var resolvedComments = comments.filter(function(c) { return c.resolved; });

    var h = '<div class="rpanel-hdr"><h3>İnceleme</h3><button class="close-btn" onclick="App.Panels.closeAll()">✕</button></div>';
    h += '<div class="rtabs">';
    h += '<button class="rtab active" onclick="App.Review._setTab(\'changes\',this)">Değişiklikler (' + allChanges.length + ')</button>';
    h += '<button class="rtab" onclick="App.Review._setTab(\'comments\',this)">Yorumlar (' + unresolvedComments.length + ')</button>';
    h += '<button class="rtab" onclick="App.Review._setTab(\'resolved\',this)">Çözülmüş (' + resolvedComments.length + ')</button>';
    h += '</div>';

    h += '<div class="rpanel-body">';

    // Changes tab (default)
    h += '<div id="rvTabChanges">';
    if(!allChanges.length) {
      h += '<div class="nw">Bekleyen değişiklik yok</div>';
    } else {
      // Stats
      var adds = allChanges.filter(function(c) { return c.change.type === 'add'; }).length;
      var dels = allChanges.filter(function(c) { return c.change.type === 'delete'; }).length;
      h += '<div style="padding:10px 14px;font-size:11px;color:var(--tx3);border-bottom:1px solid var(--brd);">';
      h += '<span style="color:var(--green);">+' + adds + ' ekleme</span> · <span style="color:var(--red);">-' + dels + ' silme</span>';
      h += '</div>';

      allChanges.forEach(function(item) {
        var tc = item.change;
        var color = U.sanitizeColor(tc.userColor || '#666');
        var icon = tc.type === 'add' ? '+' : '-';
        var iconColor = tc.type === 'add' ? 'var(--green)' : 'var(--red)';
        h += '<div class="review-panel-entry" style="padding:8px 14px;border-bottom:1px solid var(--brd);">';
        h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">';
        h += '<span style="font-weight:700;color:' + iconColor + ';font-size:14px;">' + icon + '</span>';
        h += '<span style="font-size:11px;font-weight:600;color:' + color + ';">' + U.escHtml(tc.userName || '?') + '</span>';
        h += '<span style="font-size:10px;color:var(--tx3);flex:1;">' + U.escHtml(item.sceneName) + '</span>';
        h += '<span style="font-size:9px;color:var(--tx4);">' + _timeAgo(tc.timestamp) + '</span>';
        h += '</div>';
        h += '<div style="font-size:12px;color:var(--tx2);padding:4px 8px;background:var(--bg);border-radius:4px;margin-bottom:6px;' + (tc.type === 'delete' ? 'text-decoration:line-through;color:var(--red);' : '') + '">';
        h += U.escHtml((tc.text || '').substring(0, 100));
        h += '</div>';
        h += '<div style="display:flex;gap:4px;">';
        h += '<button class="btn btn-s" style="color:var(--green);" onclick="App.Review.acceptChange(\'' + tc.id + '\',\'' + item.sceneId + '\')">Kabul</button>';
        h += '<button class="btn btn-s" style="color:var(--red);" onclick="App.Review.rejectChange(\'' + tc.id + '\',\'' + item.sceneId + '\')">Reddet</button>';
        h += '</div></div>';
      });

      // Bulk actions
      h += '<div style="padding:10px 14px;display:flex;gap:6px;">';
      h += '<button class="btn btn-s" style="color:var(--green);" onclick="App.Review._acceptAllScenes()">Tümünü Kabul</button>';
      h += '<button class="btn btn-s" style="color:var(--red);" onclick="App.Review._rejectAllScenes()">Tümünü Reddet</button>';
      h += '</div>';
    }
    h += '</div>';

    // Comments tab (hidden by default)
    h += '<div id="rvTabComments" style="display:none;">';
    if(!unresolvedComments.length) {
      h += '<div class="nw">Açık yorum yok</div>';
    } else {
      unresolvedComments.forEach(function(c) {
        h += _renderComment(c, false);
      });
    }
    h += '</div>';

    // Resolved tab (hidden by default)
    h += '<div id="rvTabResolved" style="display:none;">';
    if(!resolvedComments.length) {
      h += '<div class="nw">Çözülmüş yorum yok</div>';
    } else {
      resolvedComments.forEach(function(c) {
        h += _renderComment(c, true);
      });
    }
    h += '</div>';

    h += '</div>';
    rp.innerHTML = h;
  }

  function _renderComment(c, isResolved) {
    var color = U.sanitizeColor(c.userColor || '#666');
    var h = '<div class="review-panel-entry" style="padding:10px 14px;border-bottom:1px solid var(--brd);' + (isResolved ? 'opacity:.6;' : '') + '">';
    h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">';
    h += '<div style="width:22px;height:22px;border-radius:50%;background:' + color + ';display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;">' + (c.userName || '?').charAt(0).toUpperCase() + '</div>';
    h += '<span style="font-size:11px;font-weight:600;">' + U.escHtml(c.userName || '?') + '</span>';
    h += '<span style="font-size:9px;color:var(--tx4);flex:1;">' + _timeAgo(c.createdAt) + '</span>';
    if(isResolved) {
      h += '<button class="btn btn-s" onclick="App.Review.unresolveComment(\'' + c.id + '\')">Yeniden Aç</button>';
    }
    h += '</div>';
    h += '<div style="font-size:12px;color:var(--tx);padding:6px 0;line-height:1.5;">' + U.escHtml(c.text) + '</div>';

    // Replies
    if(c.replies && c.replies.length) {
      c.replies.forEach(function(r) {
        h += '<div style="margin-left:16px;padding:6px 0;border-top:1px solid var(--brd);">';
        h += '<div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;">';
        h += '<span style="font-size:10px;font-weight:600;color:' + U.sanitizeColor(r.userColor || '#666') + ';">' + U.escHtml(r.userName || '?') + '</span>';
        h += '<span style="font-size:9px;color:var(--tx4);">' + _timeAgo(r.createdAt) + '</span>';
        h += '</div>';
        h += '<div style="font-size:11px;color:var(--tx2);">' + U.escHtml(r.text) + '</div>';
        h += '</div>';
      });
    }

    if(!isResolved) {
      h += '<div style="display:flex;gap:4px;margin-top:6px;">';
      h += '<button class="btn btn-s" onclick="App.Review.openReplyModal(\'' + c.id + '\')">Yanıtla</button>';
      h += '<button class="btn btn-s" style="color:var(--green);" onclick="App.Review.resolveComment(\'' + c.id + '\')">Çözüldü</button>';
      h += '<button class="btn btn-s" style="color:var(--red);" onclick="App.Review.deleteComment(\'' + c.id + '\')">Sil</button>';
      h += '</div>';
    }
    h += '</div>';
    return h;
  }

  function _setTab(tab, btn) {
    // Toggle tab content
    var tabs = ['changes','comments','resolved'];
    tabs.forEach(function(t) {
      var el = document.getElementById('rvTab' + t.charAt(0).toUpperCase() + t.slice(1));
      if(el) el.style.display = t === tab ? '' : 'none';
    });
    // Toggle active class
    var tabBar = btn ? btn.parentElement : null;
    if(tabBar) {
      tabBar.querySelectorAll('.rtab').forEach(function(t) { t.classList.remove('active'); });
      if(btn) btn.classList.add('active');
    }
  }

  function _acceptAllScenes() {
    var P = S.get();
    P.scenes.forEach(function(sc) {
      if(sc.trackChanges && sc.trackChanges.length) {
        sc.trackChanges.forEach(function(tc) {
          if(tc.accepted === null) tc.accepted = true;
        });
      }
    });
    S.markDirty('scenes');
    S.emit('change', { type: 'reviewAcceptAll' });
    renderReviewPanel();
    App.UI.toast('Tüm değişiklikler kabul edildi');
  }

  function _rejectAllScenes() {
    var P = S.get();
    P.scenes.forEach(function(sc) {
      if(sc.trackChanges && sc.trackChanges.length) {
        sc.trackChanges.forEach(function(tc) {
          if(tc.accepted === null) tc.accepted = false;
        });
      }
    });
    S.markDirty('scenes');
    S.emit('change', { type: 'reviewRejectAll' });
    renderReviewPanel();
    App.UI.toast('Tüm değişiklikler reddedildi');
  }

  // ── User color assignment modal ──
  function openUserColorModal() {
    _initUser();
    var colorsHtml = USER_COLORS.map(function(c) {
      var selected = c === _userColor;
      return '<div style="width:32px;height:32px;border-radius:50%;background:' + c + ';cursor:pointer;border:3px solid ' + (selected ? 'var(--tx)' : 'transparent') + ';" onclick="App.Review._setUserColor(\'' + c + '\')"></div>';
    }).join('');

    App.UI.openModal(
      '<div class="mh"><span>İnceleme Rengi</span><button class="close-btn" onclick="App.UI.closeModal()">✕</button></div>' +
      '<div class="mb">' +
      '<div class="fg"><label>Kullanıcı: ' + U.escHtml(_userName) + '</label></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;padding:8px 0;">' + colorsHtml + '</div>' +
      '</div>' +
      '<div class="mf"><button class="btn btn-p" onclick="App.UI.closeModal()">Tamam</button></div>'
    );
  }

  function _setUserColor(color) {
    _userColor = color;
    App.UI.closeModal();
    App.UI.toast('İnceleme rengi güncellendi');
  }

  // ── Change statistics ──
  function getChangeStats() {
    var P = S.get();
    var stats = { total: 0, adds: 0, deletes: 0, pending: 0, accepted: 0, rejected: 0 };
    (P.scenes || []).forEach(function(sc) {
      (sc.trackChanges || []).forEach(function(tc) {
        stats.total++;
        if(tc.type === 'add') stats.adds++;
        else stats.deletes++;
        if(tc.accepted === null) stats.pending++;
        else if(tc.accepted) stats.accepted++;
        else stats.rejected++;
      });
    });
    return stats;
  }

  // ── Helpers ──
  function _hexToRgb(hex) {
    if(!hex || hex.charAt(0) !== '#') return '59,130,246';
    var r = parseInt(hex.slice(1,3), 16) || 0;
    var g = parseInt(hex.slice(3,5), 16) || 0;
    var b = parseInt(hex.slice(5,7), 16) || 0;
    return r + ',' + g + ',' + b;
  }

  function _getColorForUser(uid) {
    var P = S.get();
    var meta = P.meta || {};
    if(meta.reviewUsers && meta.reviewUsers[uid]) return meta.reviewUsers[uid].color;
    if(uid === _userId) return _userColor;
    var hash = 0;
    for(var i = 0; i < uid.length; i++) hash = ((hash << 5) - hash) + uid.charCodeAt(i);
    return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
  }

  function _timeAgo(ts) {
    if(!ts) return '';
    var diff = Date.now() - ts;
    var mins = Math.floor(diff / 60000);
    if(mins < 1) return 'şimdi';
    if(mins < 60) return mins + ' dk önce';
    var hours = Math.floor(mins / 60);
    if(hours < 24) return hours + ' sa önce';
    var days = Math.floor(hours / 24);
    return days + ' gün önce';
  }

  return {
    toggleReviewMode, isReviewMode,
    getUserColor, getUserId, getUserName,
    interceptInput, interceptDelete,
    renderTrackMarkers, stripMarkers,
    acceptChange, rejectChange, acceptAll, rejectAll,
    addComment, openAddCommentModal, doAddComment,
    resolveComment, unresolveComment, deleteComment,
    addReply, openReplyModal, doReply,
    renderReviewPanel, openUserColorModal,
    getChangeStats,
    _setTab, _setUserColor, _acceptAllScenes, _rejectAllScenes
  };
})();
