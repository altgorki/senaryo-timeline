// ═══ SYNC MODULE (Minimal — real-time sync is now in App.Projects) ═══
App.Sync = (function(){
  function init() {}
  function handleStoreChange(data) {
    if(data && data.type && data.type.startsWith('remote')) return;
  }
  function isInRoom() { return !!App.Projects.getCurrentId(); }
  function leaveRoom() { App.Projects.goBack(); }
  return { init, handleStoreChange, isInRoom, leaveRoom };
})();
