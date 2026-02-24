// ═══ AUTOSAVE MODULE ═══
App.AutoSave = (function(){
  let _timer = null;
  function save() {
    if(_timer) clearTimeout(_timer);
    _showSyncing();
    _timer = setTimeout(_doSave, 500);
  }
  function _doSave() {
    _timer = null;
    if(App.Projects && App.Projects.getCurrentId() && App.Projects.canEdit()) {
      App.Projects.save();
    }
    _showSynced();
  }
  function _showSyncing() {
    var el = document.getElementById('syncStatusText');
    if(el) el.textContent = 'Kaydediliyor...';
    var st = document.getElementById('stSyncStatus');
    if(st) { st.textContent = 'Kaydediliyor...'; st.style.color = 'var(--yellow)'; }
  }
  function _showSynced() {
    var el = document.getElementById('syncStatusText');
    if(el) el.textContent = 'Kaydedildi';
    var st = document.getElementById('stSyncStatus');
    if(st) { st.textContent = 'Kaydedildi'; st.style.color = 'var(--green)'; }
    // Clear "Kaydedildi" after 3 seconds
    setTimeout(function() {
      var el2 = document.getElementById('syncStatusText');
      if(el2 && el2.textContent === 'Kaydedildi') el2.textContent = '';
      var st2 = document.getElementById('stSyncStatus');
      if(st2 && st2.textContent === 'Kaydedildi') st2.textContent = '';
    }, 3000);
  }
  function clear() { if(_timer) clearTimeout(_timer); _timer = null; }
  return { save, clear };
})();
