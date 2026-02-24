// ═══ UTILS MODULE ═══
App.Utils = (function(){
  let _nid = 1;
  const s2t = s => { const m=Math.floor(s/60); return m+':'+String(Math.floor(s%60)).padStart(2,'0'); };
  const s2px = (s,pps) => s * (pps||0.5);
  const px2s = (p,pps) => p / (pps||0.5);
  const genId = (prefix) => prefix + (_nid++);
  const setIdCounter = (n) => { _nid = n; };
  const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
  const escHtml = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const _safeColorNames = new Set(['red','blue','green','yellow','orange','purple','pink','cyan','white','black','gray','grey','brown','navy','teal','lime','aqua','maroon','olive','silver','fuchsia','transparent','inherit','currentColor']);
  const sanitizeColor = c => {
    if(!c || typeof c !== 'string') return '#888';
    c = c.trim();
    if(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(c)) return c;
    if(/^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/.test(c)) return c;
    if(/^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*[\d.]+\s*\)$/.test(c)) return c;
    if(/^hsl\(\s*\d{1,3}\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*\)$/.test(c)) return c;
    if(/^var\(--[a-zA-Z0-9_-]+\)$/.test(c)) return c;
    if(_safeColorNames.has(c.toLowerCase())) return c;
    return '#888';
  };
  const debounce = (fn,ms) => { let t; return (...a) => { clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; };
  const snap = (val, grid) => grid > 0 ? Math.round(val/grid)*grid : val;
  const epLbl = e => e==='fb'?'FB':'B'+e;
  const deepClone = o => JSON.parse(JSON.stringify(o));
  // ── Input Validation ──
  const LIMITS = { title:200, description:5000, screenplay:50000, characterName:50, color:20 };
  function validateText(str, field) {
    if(!str || typeof str !== 'string') return str;
    const max = LIMITS[field];
    if(!max) return str;
    if(str.length > max) {
      App.UI.toast(field + ' alanı ' + max + ' karakterle sınırlı — kırpıldı');
      return str.substring(0, max);
    }
    return str;
  }
  // ── Cached DOM Query ──
  const _domCache = {};
  function $(id) {
    let el = _domCache[id];
    if(el && el.isConnected) return el;
    el = document.getElementById(id);
    if(el) _domCache[id] = el;
    return el;
  }
  function clearDomCache() { for(const k in _domCache) delete _domCache[k]; }

  return { s2t, s2px, px2s, genId, setIdCounter, clamp, escHtml, sanitizeColor, debounce, snap, epLbl, deepClone, LIMITS, validateText, $, clearDomCache };
})();
