// ═══ AUTOSAVE MODULE ═══
App.AutoSave = (function(){
  let _timer = null;
  function save() {
    if(_timer) clearTimeout(_timer);
    _timer = setTimeout(_doSave, 2000);
  }
  function _doSave() {
    _timer = null;
    if(App.Projects && App.Projects.getCurrentId() && App.Projects.canEdit()) {
      App.Projects.save();
    }
  }
  function clear() {}
  return { save, clear };
})();
