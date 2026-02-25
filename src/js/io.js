// ═══ IO MODULE ═══
App.IO = (function(){
  const U = App.Utils;
  const S = App.Store;

  function exportJSON() {
    const P = S.get();
    const data = { ...P, meta: { ...P.meta, exportVersion: '2.1', date: new Date().toISOString() } };
    const b = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = (P.meta.title||'proje').replace(/\s+/g,'_') + '_' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    App.UI.toast('JSON aktarıldı');
  }

  function importJSON(e) {
    const f = e.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = ev => {
      try {
        const d = JSON.parse(ev.target.result);
        if(d.events && d.events[0] && ('ep' in d.events[0]) && ('t' in d.events[0])) {
          migrateOldFormat(d);
          App.Projects.importToProject(S.get());
        } else if(d.meta && d.episodes) {
          if(!d.version || d.version < 3) _migrateV3(d);
          App.Projects.importToProject(d);
        } else {
          App.UI.toast('Tanınmayan dosya formatı');
          return;
        }
      } catch(err) { App.UI.toast('Geçersiz dosya: ' + err.message); }
    };
    r.readAsText(f);
    e.target.value = '';
  }

  // ── Unified import handler — routes by file extension ──
  function handleAnyImport(e) {
    var f = e.target.files[0];
    if (!f) return;
    var name = f.name.toLowerCase();
    var ext = name.substring(name.lastIndexOf('.'));

    if (ext === '.json') {
      importJSON(e);
    } else if (ext === '.fountain') {
      _readAsText(f, function(text) { _handleFountain(text); });
      e.target.value = '';
    } else if (ext === '.celtx') {
      _readAsArrayBuffer(f, function(buf) { _handleCeltx(buf); });
      e.target.value = '';
    } else if (ext === '.pdf') {
      _readAsArrayBuffer(f, function(buf) { _handlePDF(buf); });
      e.target.value = '';
    } else {
      App.UI.toast('Desteklenmeyen dosya formatı: ' + ext);
      e.target.value = '';
    }
  }

  function _readAsText(file, cb) {
    var r = new FileReader();
    r.onload = function(ev) { cb(ev.target.result); };
    r.onerror = function() { App.UI.toast('Dosya okunamadı'); };
    r.readAsText(file, 'utf-8');
  }

  function _readAsArrayBuffer(file, cb) {
    var r = new FileReader();
    r.onload = function(ev) { cb(ev.target.result); };
    r.onerror = function() { App.UI.toast('Dosya okunamadı'); };
    r.readAsArrayBuffer(file);
  }

  // ═══ FOUNTAIN PARSER ═══
  function _handleFountain(text) {
    App.UI.toast('Fountain ayrıştırılıyor...');
    try {
      var blocks = _parseFountainText(text);
      if (!blocks.length) { App.UI.toast('Fountain dosyasında içerik bulunamadı'); return; }
      var result = _convertToProject(blocks, 'Fountain İçe Aktarma');
      App.Projects.importToProject(result);
    } catch (err) {
      App.UI.toast('Fountain hatası: ' + err.message);
    }
  }

  function _parseFountainText(text) {
    var lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    var blocks = [];
    var i = 0;

    // Scene heading patterns (including Turkish)
    var sceneHeadingRe = /^(INT\.|EXT\.|İÇ\.|DIŞ\.|INT\/EXT\.|İÇ\/DIŞ\.|I\/E\.)[\s.]/i;
    // Forced scene heading
    var forcedSceneRe = /^\./;
    // Transition patterns
    var transitionRe = /^(CUT TO:|FADE IN:|FADE OUT\.?|FADE TO:|DISSOLVE TO:|SMASH CUT TO:|WIPE TO:|IRIS IN:|IRIS OUT:|GEÇİŞ:|KARARMA:)/i;
    var forcedTransitionRe = /^>(?!.*<)/;

    while (i < lines.length) {
      var line = lines[i];
      var trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) { i++; continue; }

      // Skip notes [[...]] and boneyard /* ... */
      if (trimmed.startsWith('[[') || trimmed.startsWith('/*')) {
        while (i < lines.length && !lines[i].includes(']]') && !lines[i].includes('*/')) i++;
        i++;
        continue;
      }

      // Title page (key: value at start of document)
      if (blocks.length === 0 && /^(Title|Credit|Author|Source|Draft date|Contact|Copyright|Notes|Revision)\s*:/i.test(trimmed)) {
        i++;
        while (i < lines.length && lines[i].trim() && !/^\s*$/.test(lines[i])) i++;
        continue;
      }

      // Scene headings
      if (sceneHeadingRe.test(trimmed) || (forcedSceneRe.test(trimmed) && trimmed.length > 1)) {
        var heading = forcedSceneRe.test(trimmed) ? trimmed.substring(1).trim() : trimmed;
        blocks.push({ type: 'sceneHeading', text: heading });
        i++;
        continue;
      }

      // Transitions
      if (transitionRe.test(trimmed) || forcedTransitionRe.test(trimmed)) {
        var transText = forcedTransitionRe.test(trimmed) ? trimmed.substring(1).trim() : trimmed;
        blocks.push({ type: 'transition', text: transText });
        i++;
        continue;
      }

      // Character + Dialogue
      // Character: all uppercase line, possibly with (V.O.), (O.S.), (CONT'D)
      var prevLineEmpty = (i === 0) || !lines[i - 1].trim();
      var isAllCaps = trimmed === trimmed.toUpperCase() && /[A-ZÇĞİÖŞÜ]/.test(trimmed);
      var charExtRe = /\s*\((V\.O\.|O\.S\.|CONT'D|SES|DIŞ SES)\)\s*$/i;
      var isCharLine = prevLineEmpty && isAllCaps && trimmed.length > 0 && trimmed.length < 60 && !transitionRe.test(trimmed);
      // Also check forced character @
      if (trimmed.startsWith('@')) {
        isCharLine = true;
        trimmed = trimmed.substring(1).trim();
      }

      if (isCharLine) {
        var charName = trimmed.replace(charExtRe, '').trim();
        i++;
        // Collect parenthetical and dialogue
        var dialogue = '';
        var parenthetical = '';
        while (i < lines.length) {
          var dLine = lines[i].trim();
          if (!dLine) break; // empty line ends dialogue block
          if (dLine.startsWith('(') && dLine.endsWith(')')) {
            parenthetical = dLine.substring(1, dLine.length - 1);
          } else {
            if (dialogue) dialogue += '\n';
            dialogue += dLine;
          }
          i++;
        }
        if (charName) {
          blocks.push({ type: 'character', text: charName });
          if (parenthetical) blocks.push({ type: 'parenthetical', text: parenthetical });
          if (dialogue) blocks.push({ type: 'dialogue', text: dialogue, character: charName });
        }
        continue;
      }

      // Action (default)
      blocks.push({ type: 'action', text: trimmed });
      i++;
    }

    return blocks;
  }

  // ═══ CELTX PARSER ═══
  function _handleCeltx(arrayBuffer) {
    App.UI.toast('Celtx ayrıştırılıyor...');
    try {
      var data = new Uint8Array(arrayBuffer);
      // Reuse the ZIP parsing logic from DOCX parser
      var entries = _parseZipEntries(data);
      if (!entries) { App.UI.toast('Geçersiz Celtx dosyası'); return; }

      // Find script HTML file
      var scriptEntry = entries.find(function(e) {
        return /^script[\w-]*\.html$/i.test(e.name) || e.name === 'script.html';
      });
      if (!scriptEntry) {
        scriptEntry = entries.find(function(e) { return e.name.endsWith('.html'); });
      }
      if (!scriptEntry) { App.UI.toast('Celtx dosyasında script bulunamadı'); return; }

      _extractZipEntry(data, scriptEntry, function(entryData) {
        if (!entryData) { App.UI.toast('Celtx script okunamadı'); return; }
        var htmlStr = new TextDecoder('utf-8').decode(entryData);
        var blocks = _parseCeltxHtml(htmlStr);
        if (!blocks.length) { App.UI.toast('Celtx dosyasında içerik bulunamadı'); return; }
        var result = _convertToProject(blocks, 'Celtx İçe Aktarma');
        App.Projects.importToProject(result);
      });
    } catch (err) {
      App.UI.toast('Celtx hatası: ' + err.message);
    }
  }

  function _parseCeltxHtml(htmlStr) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(htmlStr, 'text/html');
    var paragraphs = doc.querySelectorAll('p');
    var blocks = [];

    paragraphs.forEach(function(p) {
      var cls = (p.className || '').toLowerCase();
      var text = (p.textContent || '').trim();
      if (!text) return;

      if (cls.indexOf('sceneheading') >= 0 || cls.indexOf('scene-heading') >= 0 || cls.indexOf('slugline') >= 0) {
        blocks.push({ type: 'sceneHeading', text: text });
      } else if (cls.indexOf('character') >= 0) {
        blocks.push({ type: 'character', text: text });
      } else if (cls.indexOf('dialog') >= 0 || cls.indexOf('dialogue') >= 0) {
        // Find preceding character
        var charName = '';
        for (var j = blocks.length - 1; j >= 0; j--) {
          if (blocks[j].type === 'character') { charName = blocks[j].text; break; }
          if (blocks[j].type === 'sceneHeading') break;
        }
        blocks.push({ type: 'dialogue', text: text, character: charName });
      } else if (cls.indexOf('parenthetical') >= 0) {
        blocks.push({ type: 'parenthetical', text: text });
      } else if (cls.indexOf('transition') >= 0) {
        blocks.push({ type: 'transition', text: text });
      } else {
        blocks.push({ type: 'action', text: text });
      }
    });

    return blocks;
  }

  // ═══ PDF PARSER ═══
  function _handlePDF(arrayBuffer) {
    App.UI.toast('PDF ayrıştırılıyor... (pdf.js yükleniyor)');

    _loadPdfJs(function(pdfjsLib) {
      if (!pdfjsLib) { App.UI.toast('pdf.js yüklenemedi'); return; }

      pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise.then(function(pdfDoc) {
        var numPages = pdfDoc.numPages;
        var textPromises = [];
        for (var i = 1; i <= numPages; i++) {
          textPromises.push(_extractPageText(pdfDoc, i));
        }
        return Promise.all(textPromises);
      }).then(function(pages) {
        var fullText = pages.join('\n');
        var blocks = _parsePdfText(fullText);
        if (!blocks.length) { App.UI.toast('PDF dosyasında senaryo içeriği bulunamadı'); return; }

        // Show warning about heuristic parsing
        App.UI.toast('⚠ PDF import heuristik tabanlıdır — sonuçları kontrol edin');
        var result = _convertToProject(blocks, 'PDF İçe Aktarma');
        App.Projects.importToProject(result);
      }).catch(function(err) {
        App.UI.toast('PDF hatası: ' + err.message);
      });
    });
  }

  function _loadPdfJs(cb) {
    if (typeof window.pdfjsLib !== 'undefined') { cb(window.pdfjsLib); return; }
    var script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
    script.type = 'module';
    // Fallback: use non-module version
    var scriptCompat = document.createElement('script');
    scriptCompat.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    scriptCompat.onload = function() {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        cb(window.pdfjsLib);
      } else {
        cb(null);
      }
    };
    scriptCompat.onerror = function() { cb(null); };
    document.head.appendChild(scriptCompat);
  }

  function _extractPageText(pdfDoc, pageNum) {
    return pdfDoc.getPage(pageNum).then(function(page) {
      return page.getTextContent();
    }).then(function(content) {
      var lines = [];
      var lastY = null;
      var currentLine = '';
      content.items.forEach(function(item) {
        var y = Math.round(item.transform[5]);
        if (lastY !== null && Math.abs(y - lastY) > 3) {
          if (currentLine.trim()) lines.push(currentLine.trim());
          currentLine = '';
        }
        currentLine += item.str;
        lastY = y;
      });
      if (currentLine.trim()) lines.push(currentLine.trim());
      return lines.join('\n');
    });
  }

  function _parsePdfText(text) {
    var lines = text.split('\n');
    var blocks = [];
    var sceneHeadingRe = /^(INT\.|EXT\.|İÇ\.|DIŞ\.|INT\/EXT\.|İÇ\/DIŞ\.)\s/i;
    var transitionRe = /^(CUT TO:|FADE IN:|FADE OUT\.?|FADE TO:|GEÇİŞ:|KARARMA:)/i;

    var i = 0;
    while (i < lines.length) {
      var line = lines[i].trim();
      if (!line) { i++; continue; }

      // Scene headings
      if (sceneHeadingRe.test(line)) {
        blocks.push({ type: 'sceneHeading', text: line });
        i++;
        continue;
      }

      // Transitions
      if (transitionRe.test(line)) {
        blocks.push({ type: 'transition', text: line });
        i++;
        continue;
      }

      // Character detection: all uppercase, short, followed by non-uppercase
      var isAllCaps = line === line.toUpperCase() && /[A-ZÇĞİÖŞÜ]/.test(line) && line.length < 50;
      var nextLine = (i + 1 < lines.length) ? lines[i + 1].trim() : '';
      var nextIsDialogue = nextLine && nextLine !== nextLine.toUpperCase();

      if (isAllCaps && nextIsDialogue && !transitionRe.test(line)) {
        var charName = line.replace(/\s*\(.*\)\s*$/, '').trim();
        blocks.push({ type: 'character', text: charName });
        i++;
        // Collect dialogue
        var dialogue = '';
        while (i < lines.length) {
          var dLine = lines[i].trim();
          if (!dLine) break;
          // Stop if next scene heading or another character
          if (sceneHeadingRe.test(dLine)) break;
          if (dLine === dLine.toUpperCase() && /[A-ZÇĞİÖŞÜ]/.test(dLine) && dLine.length < 50) break;
          if (dLine.startsWith('(') && dLine.endsWith(')')) {
            blocks.push({ type: 'parenthetical', text: dLine.slice(1, -1) });
          } else {
            if (dialogue) dialogue += '\n';
            dialogue += dLine;
          }
          i++;
        }
        if (dialogue) blocks.push({ type: 'dialogue', text: dialogue, character: charName });
        continue;
      }

      // Default: action
      blocks.push({ type: 'action', text: line });
      i++;
    }

    return blocks;
  }

  // ═══ SHARED: Convert parsed blocks to project format ═══
  function _convertToProject(blocks, title) {
    var CATS = {
      operasyon: { label: 'Operasyon', color: '#ef4444' },
      karakter: { label: 'Karakter', color: '#3b82f6' },
      organizasyon: { label: 'Organizasyon', color: '#10b981' },
      sistem: { label: 'Sistem', color: '#f59e0b' },
      flashback: { label: 'Flashback', color: '#9c27b0' },
      flashforward: { label: 'Flashforward', color: '#00bcd4' },
      ihanet: { label: 'İhanet', color: '#f97316' }
    };

    // Extract unique characters
    var charSet = {};
    blocks.forEach(function(b) {
      if (b.type === 'character' && b.text) {
        var name = b.text.trim();
        // Normalize: title case
        var normalized = name.charAt(0).toUpperCase() + name.substring(1).toLowerCase();
        if (!charSet[normalized]) charSet[normalized] = true;
      }
    });
    var characters = Object.keys(charSet).map(function(name) {
      return { id: U.genId('ch'), name: name, color: '', notes: '' };
    });
    var charIdMap = {};
    characters.forEach(function(c) { charIdMap[c.name.toUpperCase()] = c.id; });

    // Build scenes from scene headings
    var scenes = [];
    var events = [];
    var curSceneBlocks = [];
    var curHeading = null;

    function flushScene() {
      if (!curHeading && !curSceneBlocks.length) return;
      var headingText = curHeading || 'Sahne ' + (scenes.length + 1);
      var scId = U.genId('sc');
      var evId = U.genId('ev');

      // Parse location/timeOfDay from heading
      var location = '';
      var timeOfDay = '';
      var headingUpper = headingText.toUpperCase();
      if (headingUpper.indexOf('İÇ.') >= 0 || headingUpper.indexOf('INT.') >= 0) location = 'İç Mekan';
      if (headingUpper.indexOf('DIŞ.') >= 0 || headingUpper.indexOf('EXT.') >= 0) location = 'Dış Mekan';
      if (headingUpper.indexOf('GECE') >= 0 || headingUpper.indexOf('NIGHT') >= 0) timeOfDay = 'Gece';
      if (headingUpper.indexOf('GÜNDÜZ') >= 0 || headingUpper.indexOf('DAY') >= 0) timeOfDay = 'Gündüz';

      // Build content
      var content = [];
      var sceneChars = [];
      curSceneBlocks.forEach(function(b) {
        if (b.type === 'action') {
          content.push({ type: 'action', text: b.text });
        } else if (b.type === 'dialogue') {
          var cid = charIdMap[(b.character || '').toUpperCase()] || '';
          if (cid && sceneChars.indexOf(cid) < 0) sceneChars.push(cid);
          content.push({ type: 'dialogue', characterId: cid, text: b.text, parenthetical: '' });
        } else if (b.type === 'character') {
          var charCid = charIdMap[b.text.toUpperCase()] || '';
          if (charCid && sceneChars.indexOf(charCid) < 0) sceneChars.push(charCid);
        } else if (b.type === 'transition') {
          content.push({ type: 'transition', text: b.text });
        } else if (b.type === 'parenthetical') {
          // Attach to last dialogue if possible
          if (content.length && content[content.length - 1].type === 'dialogue') {
            content[content.length - 1].parenthetical = b.text;
          }
        }
      });

      if (!content.length) content.push({ type: 'action', text: '' });

      var titleText = headingText.substring(0, 60);

      scenes.push({
        id: scId,
        episodeId: 'ep_1',
        order: scenes.length + 1,
        title: titleText,
        location: location,
        timeOfDay: timeOfDay,
        category: 'karakter',
        characters: sceneChars,
        content: content
      });

      // Calculate duration based on content length
      var textLen = content.reduce(function(sum, b) { return sum + (b.text || '').length; }, 0);
      var dur = U.clamp(Math.round(textLen / 40) * 30, 120, 600);
      var startTime = events.length ? (events[events.length - 1].s + events[events.length - 1].dur + 10) : 0;

      events.push({
        id: evId,
        title: titleText,
        description: '',
        episodeId: 'ep_1',
        sceneId: scId,
        category: 'karakter',
        characters: sceneChars,
        s: startTime,
        dur: dur
      });
    }

    blocks.forEach(function(b) {
      if (b.type === 'sceneHeading') {
        flushScene();
        curHeading = b.text;
        curSceneBlocks = [];
      } else {
        curSceneBlocks.push(b);
      }
    });
    flushScene();

    // If no scene headings found, create a single scene from all blocks
    if (!scenes.length && blocks.length) {
      curHeading = 'İçe Aktarılan Sahne';
      curSceneBlocks = blocks;
      flushScene();
    }

    return {
      meta: { title: title || 'İçe Aktarılmış Proje', author: '', settings: { episodeDuration: 2700, pixelsPerSecond: 0.5, snapGrid: 10 } },
      categories: CATS,
      characters: characters,
      episodes: [{ id: 'ep_1', number: 1, title: '', duration: 2700, type: 'normal', order: 1 }],
      scenes: scenes,
      events: events,
      connections: [],
      characterRelationships: [],
      reviewComments: []
    };
  }

  // ═══ ZIP UTILITY (shared by DOCX and Celtx) ═══
  function _parseZipEntries(data) {
    try {
      var view = new DataView(data.buffer);
      var eocd = -1;
      for (var i = data.length - 22; i >= 0; i--) {
        if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
      }
      if (eocd < 0) return null;
      var cdOff = view.getUint32(eocd + 16, true);
      var cdCnt = view.getUint16(eocd + 10, true);
      var pos = cdOff;
      var entries = [];
      for (var f = 0; f < cdCnt; f++) {
        if (view.getUint32(pos, true) !== 0x02014b50) break;
        var method = view.getUint16(pos + 10, true);
        var cSize = view.getUint32(pos + 20, true);
        var uSize = view.getUint32(pos + 24, true);
        var nLen = view.getUint16(pos + 28, true);
        var eLen = view.getUint16(pos + 30, true);
        var cLen = view.getUint16(pos + 32, true);
        var lOff = view.getUint32(pos + 42, true);
        var name = new TextDecoder().decode(data.slice(pos + 46, pos + 46 + nLen));
        entries.push({ name: name, method: method, cSize: cSize, uSize: uSize, lOff: lOff });
        pos += 46 + nLen + eLen + cLen;
      }
      return entries;
    } catch (e) { return null; }
  }

  function _extractZipEntry(data, entry, cb) {
    var view = new DataView(data.buffer);
    var lhNLen = view.getUint16(entry.lOff + 26, true);
    var lhELen = view.getUint16(entry.lOff + 28, true);
    var dStart = entry.lOff + 30 + lhNLen + lhELen;

    if (entry.method === 0) {
      cb(data.slice(dStart, dStart + entry.uSize));
    } else if (entry.method === 8 && typeof DecompressionStream !== 'undefined') {
      var compressed = data.slice(dStart, dStart + entry.cSize);
      var ds = new DecompressionStream('deflate-raw');
      var writer = ds.writable.getWriter();
      var reader = ds.readable.getReader();
      writer.write(compressed);
      writer.close();
      var chunks = [];
      (function read() {
        reader.read().then(function(r) {
          if (r.value) chunks.push(r.value);
          if (r.done) {
            var t = 0;
            chunks.forEach(function(c) { t += c.length; });
            var out = new Uint8Array(t);
            var o = 0;
            chunks.forEach(function(c) { out.set(c, o); o += c.length; });
            cb(out);
          } else { read(); }
        });
      })();
    } else {
      cb(null);
    }
  }

  // ── V3 Migration: Remove FB episode, convert dates to YYYY-MM-DD, add flashforward category ──
  function _migrateV3(P) {
    // 1. Find FB episode and move its events to the first normal episode
    var fbEp = (P.episodes||[]).find(function(e){ return e.number === 'fb'; });
    if(fbEp) {
      var normalEps = P.episodes.filter(function(e){ return e.number !== 'fb'; });
      var targetEp = normalEps.length ? normalEps[0] : null;
      if(targetEp) {
        (P.events||[]).forEach(function(ev) {
          if(ev.episodeId === fbEp.id) {
            ev.episodeId = targetEp.id;
            if(!ev.category) ev.category = 'flashback';
          }
        });
        (P.scenes||[]).forEach(function(sc) {
          if(sc.episodeId === fbEp.id) sc.episodeId = targetEp.id;
        });
      }
      P.episodes = P.episodes.filter(function(e){ return e.number !== 'fb'; });
    }
    // 2. Add flashforward category if missing
    if(P.categories && !P.categories.flashforward) {
      P.categories.flashforward = {label:'Flashforward',color:'#00bcd4'};
    }
    // 3. Update flashback color
    if(P.categories && P.categories.flashback) {
      P.categories.flashback.color = '#9c27b0';
    }
    // 4. Convert birthYear → birthDate, deathYear → deathDate
    (P.characters||[]).forEach(function(ch) {
      if(ch.birthYear != null && ch.birthDate == null) {
        ch.birthDate = typeof ch.birthYear === 'number' ? ch.birthYear+'-01-01' : String(ch.birthYear);
        delete ch.birthYear;
      }
      if(ch.deathYear != null && ch.deathDate == null) {
        ch.deathDate = typeof ch.deathYear === 'number' ? ch.deathYear+'-01-01' : String(ch.deathYear);
        delete ch.deathYear;
      }
    });
    // 5. Convert episode storyYear → storyDate
    (P.episodes||[]).forEach(function(ep) {
      if(ep.storyYear != null && ep.storyDate == null) {
        ep.storyDate = typeof ep.storyYear === 'number' ? ep.storyYear+'-01-01' : String(ep.storyYear);
        delete ep.storyYear;
      }
    });
    // 6. Convert event storyDate that is just a year to YYYY-01-01
    (P.events||[]).forEach(function(ev) {
      if(ev.storyDate && /^\d{4}$/.test(String(ev.storyDate))) {
        ev.storyDate = ev.storyDate+'-01-01';
      }
    });
    P.version = 3;
  }

  function migrateOldFormat(d) {
    // Migrate from v7 flat format to new hierarchical format
    const oldEvs = d.events || [];
    const oldCns = d.connections || [];
    const CATS = {operasyon:{label:'Operasyon',color:'#ef4444'},karakter:{label:'Karakter',color:'#3b82f6'},organizasyon:{label:'Organizasyon',color:'#10b981'},sistem:{label:'Sistem',color:'#f59e0b'},flashback:{label:'Flashback',color:'#9c27b0'},flashforward:{label:'Flashforward',color:'#00bcd4'},ihanet:{label:'İhanet',color:'#f97316'}};
    // Collect unique episodes
    const epNums = [...new Set(oldEvs.map(e=>e.ep))].sort((a,b)=>{if(a==='fb')return 1;if(b==='fb')return -1;return a-b;});
    const episodes = epNums.map((n,i) => ({ id:'ep_'+n, number: n==='fb' ? i+1 : n, title:'', duration:2700, type:'normal', order:i }));
    const epIdMap = {}; epNums.forEach(n => epIdMap[n] = 'ep_'+n);
    // Collect characters
    const charSet = new Set();
    oldEvs.forEach(e => (e.ch||[]).forEach(c => charSet.add(c)));
    const characters = [...charSet].map(name => ({ id:'ch_'+name.replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ0-9]/g,'_'), name, color:'', notes:'' }));
    const charIdMap = {}; characters.forEach(c => charIdMap[c.name] = c.id);
    // Migrate events
    const events = oldEvs.map(e => ({
      id: e.id, title: e.t, description: e.d, episodeId: epIdMap[e.ep],
      sceneId: null, category: e.c, characters: (e.ch||[]).map(n=>charIdMap[n]||n),
      s: e.s, dur: e.dur
    }));
    // Migrate connections
    const connections = oldCns.map(c => ({
      id: U.genId('cn'), from: c.f, to: c.t, type: c.tp, description:'', strength:1
    }));
    const scenes = generateScenesFromEvents(events, episodes);
    var proj = {
      meta: { title: d.meta?.title || 'İçe Aktarılmış Proje', author:'', settings:{ episodeDuration:2700, pixelsPerSecond:0.5, snapGrid:10 } },
      categories: CATS, characters, episodes, scenes, events, connections
    };
    _migrateV3(proj);
    S.set(proj);
    // Set ID counter high enough
    U.setIdCounter(300);
  }

  function loadDemo() {
    App.Projects.loadDemoAsProject();
  }

  function handleDocx(e) {
    const f = e.target.files[0]; if(!f) return;
    App.UI.toast('DOCX ayrıştırılıyor...');
    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const data = new Uint8Array(evt.target.result);
        parseDocxSimple(data);
      } catch(err) { App.UI.toast('DOCX hatası: ' + err.message); }
    };
    reader.readAsArrayBuffer(f);
    e.target.value = '';
  }

  function parseDocxSimple(data) {
    // Minimal ZIP + XML parser for DOCX
    const view = new DataView(data.buffer);
    let eocd = -1;
    for(let i=data.length-22;i>=0;i--) { if(view.getUint32(i,true)===0x06054b50){eocd=i;break;} }
    if(eocd<0){App.UI.toast('Geçersiz DOCX');return;}
    const cdOff=view.getUint32(eocd+16,true), cdCnt=view.getUint16(eocd+10,true);
    let pos=cdOff;
    const entries=[];
    for(let f=0;f<cdCnt;f++){
      if(view.getUint32(pos,true)!==0x02014b50)break;
      const method=view.getUint16(pos+10,true),cSize=view.getUint32(pos+20,true),uSize=view.getUint32(pos+24,true);
      const nLen=view.getUint16(pos+28,true),eLen=view.getUint16(pos+30,true),cLen=view.getUint16(pos+32,true);
      const lOff=view.getUint32(pos+42,true);
      const name=new TextDecoder().decode(data.slice(pos+46,pos+46+nLen));
      entries.push({name,method,cSize,uSize,lOff});
      pos+=46+nLen+eLen+cLen;
    }
    // Find document.xml (stored, not compressed for simplicity)
    let docEntry = entries.find(e=>e.name.includes('word/document')&&e.name.includes('.xml'));
    if(!docEntry){App.UI.toast('document.xml bulunamadı');return;}
    const lhNLen=view.getUint16(docEntry.lOff+26,true), lhELen=view.getUint16(docEntry.lOff+28,true);
    const dStart=docEntry.lOff+30+lhNLen+lhELen;
    let xmlData;
    if(docEntry.method===0) xmlData=data.slice(dStart,dStart+docEntry.uSize);
    else if(docEntry.method===8 && typeof DecompressionStream!=='undefined') {
      // Async decompress
      const compressed=data.slice(dStart,dStart+docEntry.cSize);
      const ds=new DecompressionStream('deflate-raw');
      const writer=ds.writable.getWriter();
      const reader=ds.readable.getReader();
      writer.write(compressed);writer.close();
      const chunks=[];
      (function read(){reader.read().then(r=>{if(r.value)chunks.push(r.value);if(r.done){let t=0;chunks.forEach(c=>t+=c.length);const out=new Uint8Array(t);let o=0;chunks.forEach(c=>{out.set(c,o);o+=c.length;});processDocxXml(out);}else read();});})();
      return;
    } else { App.UI.toast('Sıkıştırma desteklenmiyor'); return; }
    processDocxXml(xmlData);
  }

  function processDocxXml(xmlData) {
    const P = S.get();
    const xmlStr = new TextDecoder('utf-8').decode(xmlData);
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlStr, 'application/xml');
    const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const paras = doc.getElementsByTagNameNS(ns,'p');
    const lines = [];
    for(let i=0;i<paras.length;i++){
      const texts=paras[i].getElementsByTagNameNS(ns,'t');
      let line='';for(let j=0;j<texts.length;j++)line+=texts[j].textContent;
      let isBold=paras[i].getElementsByTagNameNS(ns,'b').length>0;
      const runs=paras[i].getElementsByTagNameNS(ns,'r');
      for(let r=0;r<runs.length;r++){if(runs[r].getElementsByTagNameNS(ns,'rPr').length>0&&runs[r].querySelector('b'))isBold=true;}
      let pStyle='';const pPrs=paras[i].getElementsByTagNameNS(ns,'pStyle');
      if(pPrs.length>0)pStyle=pPrs[0].getAttribute('w:val')||'';
      if(line.trim())lines.push({text:line.trim(),bold:isBold,style:pStyle});
    }
    // Scene detection
    const scenes=[];let curScene=null;let curEp=P.episodes[0]?.id||null;
    const charNames=P.characters.map(c=>c.name.toLowerCase());
    lines.forEach(line=>{
      const t=line.text, upper=t.toUpperCase();
      const epMatch=t.match(/(?:BÖLÜM|Bölüm)\s*(\d+)/i);
      if(epMatch){const n=parseInt(epMatch[1]);const ep=P.episodes.find(e=>e.number===n);if(ep)curEp=ep.id;}
      let isScene=(upper.match(/^\[?\s*SAHNE\s*\d+/)||(line.bold&&t.length<100&&t.length>2)||line.style?.match(/heading/i));
      if(isScene){
        if(curScene&&curScene.content.length)scenes.push(curScene);
        curScene={id:U.genId('sc'),episodeId:curEp,order:scenes.length+1,title:t.replace(/[\[\]]/g,'').trim().substring(0,60)||'Sahne '+(scenes.length+1),
          location:'',timeOfDay:'',category:'karakter',characters:[],content:[]};
      } else if(curScene){
        const isChar=charNames.some((cn,idx)=>upper===P.characters[idx].name.toUpperCase());
        if(isChar) curScene.content.push({type:'dialogue',characterId:P.characters[charNames.findIndex(cn=>upper===P.characters[charNames.indexOf(cn)].name.toUpperCase())]?.id||'',text:'',parenthetical:''});
        else curScene.content.push({type:'action',text:t});
      }
    });
    if(curScene&&curScene.content.length)scenes.push(curScene);
    if(!scenes.length){App.UI.toast('Sahne bulunamadı');return;}
    // Add scenes and auto-create events
    S.snapshot();
    const perEpTime={};
    scenes.forEach(sc=>{
      P.scenes.push(sc);
      const ep=sc.episodeId;if(!perEpTime[ep])perEpTime[ep]=0;
      const textLen=sc.content.reduce((s,b)=>s+(b.text||'').length,0);
      const dur=U.clamp(Math.round(textLen/40)*30,120,600);
      const s=perEpTime[ep];
      if(s>=S.getEPDUR())return;
      const ev={id:U.genId('ev'),title:sc.title,description:'',episodeId:ep,sceneId:sc.id,category:sc.category,characters:sc.characters||[],s:s,dur:Math.min(dur,S.getEPDUR()-s)};
      P.events.push(ev);
      perEpTime[ep]=s+dur+10;
    });
    S.markAllDirty();
    S.emit('change',{type:'docx'});
    App.refresh();
    App.UI.toast(scenes.length+' sahne ayrıştırıldı');
  }

  return { exportJSON, importJSON, handleAnyImport, loadDemo, handleDocx, migrateOldFormat, migrateV3: _migrateV3 };
})();
