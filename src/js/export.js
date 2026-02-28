// ═══ EXPORT MODULE (PDF / FDX / Fountain) ═══
App.Export = (function(){
  const U = App.Utils;
  const S = App.Store;

  let _jsPDFLoaded = false;
  let _exportPrefs = null;

  function _loadPrefs() {
    if(_exportPrefs) return _exportPrefs;
    try { _exportPrefs = JSON.parse(localStorage.getItem('exportPrefs') || '{}'); } catch(e) { _exportPrefs = {}; }
    return _exportPrefs;
  }
  function _savePrefs(p) { _exportPrefs = p; try { localStorage.setItem('exportPrefs', JSON.stringify(p)); } catch(e) {} }

  // ── Modal ──
  function openExportModal() {
    const P = S.get();
    const prefs = _loadPrefs();
    const format = prefs.format || 'pdf';
    const scope = prefs.scope || 'full';
    const pageSize = prefs.pageSize || 'a4';

    let episodeOpts = '<option value="all">Tam Proje</option>';
    P.episodes.forEach(ep => {
      episodeOpts += '<option value="' + ep.id + '">' + U.escHtml('Bölüm ' + ep.number + (ep.title ? ' — ' + ep.title : '')) + '</option>';
    });

    App.UI.openModal(
      '<div class="mh"><span>Dışa Aktar</span><button class="close-btn" onclick="App.UI.closeModal()">✕</button></div>' +
      '<div class="mb">' +
      // Format tabs
      '<div class="export-tabs" style="display:flex;gap:2px;background:var(--bg);border-radius:var(--radius);padding:2px;border:1px solid var(--brd);margin-bottom:16px;">' +
      '<button class="export-tab' + (format === 'pdf' ? ' active' : '') + '" data-fmt="pdf" onclick="App.Export._setFormat(\'pdf\')">PDF</button>' +
      '<button class="export-tab' + (format === 'fdx' ? ' active' : '') + '" data-fmt="fdx" onclick="App.Export._setFormat(\'fdx\')">FDX (Final Draft)</button>' +
      '<button class="export-tab' + (format === 'fountain' ? ' active' : '') + '" data-fmt="fountain" onclick="App.Export._setFormat(\'fountain\')">Fountain</button>' +
      '</div>' +
      // Scope
      '<div class="fg"><label>Kapsam</label><select id="expScope">' + episodeOpts + '</select></div>' +
      // PDF options
      '<div id="expPDFOpts"' + (format !== 'pdf' ? ' style="display:none"' : '') + '>' +
      '<div class="fg"><label>Sayfa Boyutu</label><select id="expPageSize"><option value="a4"' + (pageSize === 'a4' ? ' selected' : '') + '>A4</option><option value="letter"' + (pageSize === 'letter' ? ' selected' : '') + '>US Letter</option></select></div>' +
      '<div class="fg"><label>Filigran (opsiyonel)</label><input id="expWatermark" placeholder="Filigran metni (örn. TASLAK)" value="' + U.escHtml(prefs.watermark || '') + '" /></div>' +
      '<div class="fg"><label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" id="expSceneNums" style="width:auto;"' + (prefs.sceneNums !== false ? ' checked' : '') + ' /> Sahne numaraları</label></div>' +
      '<div class="fg"><label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" id="expTitlePage" style="width:auto;"' + (prefs.titlePage !== false ? ' checked' : '') + ' /> Başlık sayfası</label></div>' +
      '</div>' +
      // Preview
      '<div id="expPreview" style="border:1px solid var(--brd);border-radius:var(--radius);padding:12px;max-height:200px;overflow-y:auto;font-family:\'Courier New\',monospace;font-size:10px;background:var(--bg);color:var(--tx2);margin-top:12px;"></div>' +
      '</div>' +
      '<div class="mf">' +
      '<button class="btn" onclick="App.UI.closeModal()">İptal</button>' +
      '<button class="btn" onclick="App.Export._preview()">Önizleme</button>' +
      '<button class="btn btn-p" onclick="App.Export.doExport()">Dışa Aktar</button>' +
      '</div>'
    );

    setTimeout(() => _preview(), 100);
  }

  function _setFormat(fmt) {
    document.querySelectorAll('.export-tab').forEach(t => t.classList.toggle('active', t.dataset.fmt === fmt));
    const pdfOpts = document.getElementById('expPDFOpts');
    if(pdfOpts) pdfOpts.style.display = fmt === 'pdf' ? '' : 'none';
    const prefs = _loadPrefs();
    prefs.format = fmt;
    _savePrefs(prefs);
    _preview();
  }

  function _getActiveFormat() {
    const active = document.querySelector('.export-tab.active');
    return active ? active.dataset.fmt : 'pdf';
  }

  function _preview() {
    const previewEl = document.getElementById('expPreview');
    if(!previewEl) return;
    const fmt = _getActiveFormat();
    const scope = (document.getElementById('expScope') || {}).value || 'all';
    const blocks = _buildScreenplayBlocks(scope);

    if(fmt === 'fountain') {
      previewEl.innerHTML = '<pre style="white-space:pre-wrap;margin:0;">' + U.escHtml(_generateFountain(blocks).substring(0, 2000)) + '...</pre>';
    } else if(fmt === 'fdx') {
      previewEl.innerHTML = '<pre style="white-space:pre-wrap;margin:0;">' + U.escHtml(_generateFDX(blocks).substring(0, 2000)) + '...</pre>';
    } else {
      // Simple text preview for PDF
      let text = '';
      blocks.forEach(b => {
        if(b.type === 'episode-header') text += '\n═══ ' + b.text + ' ═══\n\n';
        else if(b.type === 'scene-heading') text += b.text + '\n';
        else if(b.type === 'character') text += '        ' + b.text + '\n';
        else if(b.type === 'dialogue') text += '    ' + b.text + '\n';
        else if(b.type === 'parenthetical') text += '      ' + b.text + '\n';
        else if(b.type === 'transition') text += '                    ' + b.text + '\n';
        else text += b.text + '\n';
      });
      previewEl.innerHTML = '<pre style="white-space:pre-wrap;margin:0;">' + U.escHtml(text.substring(0, 2000)) + (text.length > 2000 ? '...' : '') + '</pre>';
    }
  }

  // ── Build screenplay blocks from project data ──
  function _buildScreenplayBlocks(scope) {
    const P = S.get();
    const blocks = [];
    const episodes = scope === 'all' ? [...P.episodes].sort((a,b) => a.order - b.order) : P.episodes.filter(e => e.id === scope);

    let globalSceneNum = 0;
    episodes.forEach(ep => {
      blocks.push({ type: 'episode-header', text: 'BÖLÜM ' + ep.number + (ep.title ? ' — ' + ep.title : '') });

      const scenes = S.getScenes(ep.id);
      scenes.forEach(sc => {
        globalSceneNum++;
        // Scene heading
        const loc = sc.location || 'İÇ';
        const tod = sc.timeOfDay || 'GÜN';
        const heading = loc + '. ' + (sc.title || 'SAHNE ' + globalSceneNum) + ' — ' + tod;
        blocks.push({ type: 'scene-heading', text: heading, sceneNum: globalSceneNum, sceneId: sc.id });

        const content = sc.content || [];
        content.forEach(block => {
          if(block.type === 'action') {
            blocks.push({ type: 'action', text: _stripMentions(block.text || '') });
          } else if(block.type === 'dialogue') {
            const ch = block.characterId ? P.characters.find(c => c.id === block.characterId) : null;
            blocks.push({ type: 'character', text: (ch ? ch.name : 'BİLİNMEYEN').toUpperCase() });
            if(block.parenthetical) blocks.push({ type: 'parenthetical', text: '(' + block.parenthetical + ')' });
            blocks.push({ type: 'dialogue', text: _stripMentions(block.text || '') });
          } else if(block.type === 'transition') {
            blocks.push({ type: 'transition', text: (block.text || 'KESME:').toUpperCase() });
          }
        });

        // If scene has screenplay text but no content blocks
        if(!content.length && sc.screenplay) {
          blocks.push({ type: 'action', text: _stripMentions(sc.screenplay) });
        }
      });
    });
    return blocks;
  }

  function _stripMentions(text) {
    return (text || '').replace(/@\[([^\]]+)\]\([^)]+\)/g, '$1');
  }

  // ── Export dispatch ──
  function doExport() {
    const fmt = _getActiveFormat();
    const scope = (document.getElementById('expScope') || {}).value || 'all';
    const prefs = _loadPrefs();
    prefs.format = fmt;
    prefs.scope = scope;
    if(fmt === 'pdf') {
      prefs.pageSize = (document.getElementById('expPageSize') || {}).value || 'a4';
      prefs.watermark = (document.getElementById('expWatermark') || {}).value || '';
      prefs.sceneNums = (document.getElementById('expSceneNums') || {}).checked !== false;
      prefs.titlePage = (document.getElementById('expTitlePage') || {}).checked !== false;
    }
    _savePrefs(prefs);

    if(fmt === 'pdf') exportPDF(prefs);
    else if(fmt === 'fdx') exportFDX(scope);
    else if(fmt === 'fountain') exportFountain(scope);
  }

  // ══════════════════════════════════════
  // PDF EXPORT (jsPDF)
  // ══════════════════════════════════════
  function exportPDF(opts) {
    _ensureJsPDF(function() {
      const blocks = _buildScreenplayBlocks(opts.scope || 'all');
      const P = S.get();
      const isLetter = opts.pageSize === 'letter';
      const pageW = isLetter ? 215.9 : 210;
      const pageH = isLetter ? 279.4 : 297;
      const marginLeft = 38; // 1.5 inch
      const marginRight = 25; // 1 inch
      const marginTop = 25;
      const marginBottom = 25;
      const usableW = pageW - marginLeft - marginRight;
      const lineH = 4.2; // ~12pt Courier

      var doc = new jspdf.jsPDF({ unit: 'mm', format: isLetter ? 'letter' : 'a4' });
      doc.setFont('courier', 'normal');
      var pageNum = 1;
      var y = marginTop;

      function newPage() {
        // Footer
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(String(pageNum), pageW - marginRight, pageH - 10, { align: 'right' });
        doc.addPage();
        pageNum++;
        y = marginTop;
        // Watermark
        if(opts.watermark) _addWatermark(doc, opts.watermark, pageW, pageH);
      }

      function checkPage(lines) {
        if(y + lines * lineH > pageH - marginBottom) newPage();
      }

      // Title page
      if(opts.titlePage) {
        var titleY = pageH * 0.35;
        doc.setFontSize(24);
        doc.setTextColor(0);
        doc.text(P.meta.title || 'Senaryo', pageW / 2, titleY, { align: 'center' });
        doc.setFontSize(14);
        doc.setTextColor(80);
        if(P.meta.author) doc.text('Yazan: ' + P.meta.author, pageW / 2, titleY + 14, { align: 'center' });
        doc.setFontSize(10);
        doc.text(new Date().toLocaleDateString('tr-TR'), pageW / 2, titleY + 28, { align: 'center' });
        if(opts.watermark) _addWatermark(doc, opts.watermark, pageW, pageH);
        newPage();
      }

      // Watermark on first content page
      if(opts.watermark) _addWatermark(doc, opts.watermark, pageW, pageH);

      blocks.forEach(function(block) {
        doc.setFont('courier', 'normal');
        doc.setTextColor(0);

        if(block.type === 'episode-header') {
          checkPage(3);
          y += lineH * 2;
          doc.setFontSize(14);
          doc.setFont('courier', 'bold');
          doc.text(block.text, marginLeft, y);
          y += lineH * 2;
          doc.setFontSize(12);
          return;
        }

        if(block.type === 'scene-heading') {
          checkPage(3);
          y += lineH;
          doc.setFontSize(12);
          doc.setFont('courier', 'bold');
          var headText = block.text;
          if(opts.sceneNums && block.sceneNum) {
            doc.setFont('courier', 'normal');
            doc.setTextColor(120);
            doc.text(String(block.sceneNum), marginLeft - 12, y);
            doc.setTextColor(0);
            doc.setFont('courier', 'bold');
            doc.text(String(block.sceneNum), pageW - marginRight + 4, y);
          }
          doc.setTextColor(0);
          var headLines = doc.splitTextToSize(headText, usableW);
          headLines.forEach(function(line) {
            checkPage(1);
            doc.text(line, marginLeft, y);
            y += lineH;
          });
          y += lineH * 0.5;
          return;
        }

        doc.setFontSize(12);
        doc.setFont('courier', 'normal');

        if(block.type === 'action') {
          var actionLines = doc.splitTextToSize(block.text, usableW);
          actionLines.forEach(function(line) {
            checkPage(1);
            doc.text(line, marginLeft, y);
            y += lineH;
          });
          y += lineH * 0.3;
          return;
        }

        if(block.type === 'character') {
          checkPage(2);
          y += lineH * 0.3;
          doc.text(block.text, marginLeft + usableW * 0.37, y);
          y += lineH;
          return;
        }

        if(block.type === 'parenthetical') {
          checkPage(1);
          var parenLines = doc.splitTextToSize(block.text, usableW * 0.38);
          parenLines.forEach(function(line) {
            checkPage(1);
            doc.text(line, marginLeft + usableW * 0.31, y);
            y += lineH;
          });
          return;
        }

        if(block.type === 'dialogue') {
          var dialLines = doc.splitTextToSize(block.text, usableW * 0.50);
          dialLines.forEach(function(line) {
            checkPage(1);
            doc.text(line, marginLeft + usableW * 0.25, y);
            y += lineH;
          });
          y += lineH * 0.3;
          return;
        }

        if(block.type === 'transition') {
          checkPage(2);
          y += lineH * 0.3;
          doc.text(block.text, pageW - marginRight, y, { align: 'right' });
          y += lineH * 1.3;
          return;
        }
      });

      // Last page footer
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text(String(pageNum), pageW - marginRight, pageH - 10, { align: 'right' });

      // Download
      var filename = (P.meta.title || 'senaryo').replace(/\s+/g, '_') + '.pdf';
      doc.save(filename);
      App.UI.closeModal();
      App.UI.toast('PDF indirildi');
    });
  }

  function _addWatermark(doc, text, pageW, pageH) {
    doc.saveGraphicsState();
    doc.setFontSize(50);
    doc.setTextColor(200, 200, 200);
    doc.setGState(new doc.GState({ opacity: 0.15 }));
    var cx = pageW / 2, cy = pageH / 2;
    // Diagonal watermark
    doc.text(text, cx, cy, { align: 'center', angle: 45 });
    doc.restoreGraphicsState();
  }

  function _ensureJsPDF(callback) {
    if(_jsPDFLoaded && typeof jspdf !== 'undefined') { callback(); return; }
    var urls = [
      'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
      'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
    ];
    var idx = 0;
    function tryLoad() {
      if(idx >= urls.length) { App.UI.toast('jsPDF yüklenemedi. İnternet bağlantınızı kontrol edin.'); return; }
      var script = document.createElement('script');
      script.src = urls[idx];
      script.crossOrigin = 'anonymous';
      script.onload = function() {
        if(typeof jspdf !== 'undefined') { _jsPDFLoaded = true; callback(); }
        else { idx++; tryLoad(); }
      };
      script.onerror = function() { idx++; tryLoad(); };
      document.head.appendChild(script);
    }
    tryLoad();
  }

  // ══════════════════════════════════════
  // FDX EXPORT (Final Draft XML)
  // ══════════════════════════════════════
  function exportFDX(scope) {
    const blocks = _buildScreenplayBlocks(scope || 'all');
    const xml = _generateFDX(blocks);
    const P = S.get();
    var blob = new Blob([xml], { type: 'application/xml' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (P.meta.title || 'senaryo').replace(/\s+/g, '_') + '.fdx';
    a.click();
    App.UI.closeModal();
    App.UI.toast('FDX indirildi');
  }

  function _generateFDX(blocks) {
    var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<FinalDraft DocumentType="Script" Template="No" Version="5">\n';
    xml += '  <Content>\n';

    blocks.forEach(function(block) {
      var fdxType = 'Action';
      if(block.type === 'scene-heading') fdxType = 'Scene Heading';
      else if(block.type === 'character') fdxType = 'Character';
      else if(block.type === 'dialogue') fdxType = 'Dialogue';
      else if(block.type === 'parenthetical') fdxType = 'Parenthetical';
      else if(block.type === 'transition') fdxType = 'Transition';
      else if(block.type === 'episode-header') fdxType = 'Action';
      else fdxType = 'Action';

      xml += '    <Paragraph Type="' + fdxType + '">\n';
      xml += '      <Text>' + _escapeXml(block.text || '') + '</Text>\n';
      xml += '    </Paragraph>\n';
    });

    xml += '  </Content>\n';
    xml += '</FinalDraft>\n';
    return xml;
  }

  function _escapeXml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  // ══════════════════════════════════════
  // FOUNTAIN EXPORT
  // ══════════════════════════════════════
  function exportFountain(scope) {
    const blocks = _buildScreenplayBlocks(scope || 'all');
    const text = _generateFountain(blocks);
    const P = S.get();
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (P.meta.title || 'senaryo').replace(/\s+/g, '_') + '.fountain';
    a.click();
    App.UI.closeModal();
    App.UI.toast('Fountain indirildi');
  }

  function _generateFountain(blocks) {
    const P = S.get();
    var text = '';

    // Title page metadata
    text += 'Title: ' + (P.meta.title || 'Senaryo') + '\n';
    if(P.meta.author) text += 'Credit: Yazan\nAuthor: ' + P.meta.author + '\n';
    text += 'Date: ' + new Date().toLocaleDateString('tr-TR') + '\n';
    text += '\n===\n\n';

    blocks.forEach(function(block) {
      if(block.type === 'episode-header') {
        text += '\n# ' + block.text + '\n\n';
      } else if(block.type === 'scene-heading') {
        // Fountain scene headings start with INT./EXT. or Turkish İÇ./DIŞ.
        var heading = block.text;
        if(!heading.match(/^(İÇ|DIŞ|INT|EXT)\./i)) {
          heading = 'İÇ. ' + heading;
        }
        text += '\n.' + heading + '\n\n';
      } else if(block.type === 'action') {
        text += block.text + '\n\n';
      } else if(block.type === 'character') {
        text += '@' + block.text + '\n';
      } else if(block.type === 'parenthetical') {
        text += block.text + '\n';
      } else if(block.type === 'dialogue') {
        text += block.text + '\n\n';
      } else if(block.type === 'transition') {
        text += '> ' + block.text + '\n\n';
      }
    });
    return text;
  }

  return {
    openExportModal, doExport,
    exportPDF, exportFDX, exportFountain,
    _setFormat, _preview
  };
})();
