// ═══ STORE MODULE ═══
App.Store = (function(){
  const U = App.Utils;
  const MAX_UNDO = 50;
  let undoStack = [];
  let redoStack = [];
  let listeners = {};

  // Default empty project
  let project = {
    meta: { title: 'Yeni Proje', author: '', settings: { episodeDuration: 2700, pixelsPerSecond: 0.5, snapGrid: 10 } },
    categories: {
      operasyon:{label:'Operasyon',color:'#ef4444'},
      karakter:{label:'Karakter',color:'#3b82f6'},
      organizasyon:{label:'Organizasyon',color:'#10b981'},
      sistem:{label:'Sistem',color:'#f59e0b'},
      flashback:{label:'Flashback',color:'#a855f7'},
      ihanet:{label:'İhanet',color:'#f97316'}
    },
    characters: [],
    episodes: [],
    scenes: [],
    events: [],
    connections: [],
    characterRelationships: [],
    reviewComments: []
  };

  // Event bus
  function on(evt, fn) { if(!listeners[evt]) listeners[evt]=[]; listeners[evt].push(fn); }
  function emit(evt, data) { (listeners[evt]||[]).forEach(fn => fn(data)); }

  // Dirty collection tracking for per-collection saves
  let _dirty = new Set();
  function markDirty(col) { if(Array.isArray(col)) col.forEach(function(c){ _dirty.add(c); }); else _dirty.add(col); }
  function getDirty() { return new Set(_dirty); }
  function clearDirty() { _dirty.clear(); }
  function markAllDirty() { ['events','scenes','episodes','connections','characters','categories','characterRelationships','reviewComments'].forEach(function(c){ _dirty.add(c); }); }

  // Snapshot for undo
  function snapshot() {
    undoStack.push(U.deepClone(project));
    if(undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack = [];
  }
  function undo() {
    if(!undoStack.length) return;
    redoStack.push(U.deepClone(project));
    project = undoStack.pop();
    markAllDirty();
    emit('change', {type:'undo'});
  }
  function redo() {
    if(!redoStack.length) return;
    undoStack.push(U.deepClone(project));
    project = redoStack.pop();
    markAllDirty();
    emit('change', {type:'redo'});
  }

  function get() { return project; }
  function set(p) { project = p; emit('change', {type:'set'}); }
  function getPPS() { return project.meta.settings.pixelsPerSecond; }
  function getEPDUR() { return project.meta.settings.episodeDuration; }
  function getEPPX() { return getEPDUR() * getPPS(); }
  function getSnap() { return project.meta.settings.snapGrid; }
  function setSnap(v) { project.meta.settings.snapGrid = v; }

  // Episode helpers
  function getEpisodeIds() { return project.episodes.map(e=>e.id); }
  function getEpisode(id) { return project.episodes.find(e=>e.id===id); }
  function addEpisode(ep) { snapshot(); project.episodes.push(ep); project.episodes.sort((a,b)=>a.order-b.order); markDirty('episodes'); emit('change',{type:'addEp',targetId:ep.id,targetName:ep.title||''}); }
  function updateEpisode(id, data) { snapshot(); const ep=getEpisode(id); if(ep) Object.assign(ep,data); markDirty('episodes'); emit('change',{type:'updateEp',targetId:id,targetName:(ep&&ep.title)||''}); }
  function removeEpisode(id) { snapshot(); const _n=(getEpisode(id)||{}).title||''; project.episodes=project.episodes.filter(e=>e.id!==id); project.scenes=project.scenes.filter(s=>s.episodeId!==id); project.events=project.events.filter(e=>e.episodeId!==id); markDirty(['episodes','scenes','events']); emit('change',{type:'removeEp',targetId:id,targetName:_n}); }

  // Scene helpers
  function getScenes(epId) { return project.scenes.filter(s=>s.episodeId===epId).sort((a,b)=>a.order-b.order); }
  function getScene(id) { return project.scenes.find(s=>s.id===id); }
  function addScene(sc) { snapshot(); project.scenes.push(sc); markDirty('scenes'); emit('change',{type:'addScene',targetId:sc.id,targetName:sc.title||''}); }
  function updateScene(id, data) { snapshot(); const sc=getScene(id); if(sc) Object.assign(sc,data); markDirty('scenes'); emit('change',{type:'updateScene',targetId:id,targetName:(sc&&sc.title)||''}); }
  function removeScene(id) { snapshot(); const _n=(getScene(id)||{}).title||''; project.scenes=project.scenes.filter(s=>s.id!==id); project.events=project.events.filter(e=>e.sceneId!==id); markDirty(['scenes','events']); emit('change',{type:'removeScene',targetId:id,targetName:_n}); }

  // Event helpers
  function getEvents(epId) { return epId ? project.events.filter(e=>e.episodeId===epId) : project.events; }
  function getEvent(id) { return project.events.find(e=>e.id===id); }
  function addEvent(ev) { snapshot(); project.events.push(ev); markDirty('events'); emit('change',{type:'addEvent',targetId:ev.id,targetName:ev.title||''}); }
  function updateEvent(id, data) { snapshot(); const ev=getEvent(id); if(ev) Object.assign(ev,data); markDirty('events'); emit('change',{type:'updateEvent',targetId:id,targetName:(ev&&ev.title)||''}); }
  function removeEvent(id) { snapshot(); const _n=(getEvent(id)||{}).title||''; project.events=project.events.filter(e=>e.id!==id); project.connections=project.connections.filter(c=>c.from!==id&&c.to!==id); markDirty(['events','connections']); emit('change',{type:'removeEvent',targetId:id,targetName:_n}); }

  // Connection helpers
  function getConnections(evId) { return evId ? project.connections.filter(c=>c.from===evId||c.to===evId) : project.connections; }
  function addConnection(cn) { snapshot(); if(!project.connections.some(c=>c.from===cn.from&&c.to===cn.to&&c.type===cn.type)){project.connections.push(cn);} markDirty('connections'); emit('change',{type:'addCn'}); }
  function removeConnection(from,to,type) { snapshot(); project.connections=project.connections.filter(c=>!(c.from===from&&c.to===to&&c.type===type)); markDirty('connections'); emit('change',{type:'removeCn'}); }

  // Character helpers
  function getCharacters() { return project.characters; }
  function addCharacter(ch) { snapshot(); project.characters.push(ch); markDirty('characters'); emit('change',{type:'addChar',targetName:ch.name||''}); }
  function removeCharacter(id) { snapshot(); const _n=(project.characters.find(c=>c.id===id)||{}).name||''; project.characters=project.characters.filter(c=>c.id!==id); project.characterRelationships=project.characterRelationships.filter(r=>r.from!==id&&r.to!==id); markDirty(['characters','characterRelationships']); emit('change',{type:'removeChar',targetName:_n}); }
  function updateCharacter(id, data) { snapshot(); const ch=project.characters.find(c=>c.id===id); if(ch) Object.assign(ch,data); markDirty('characters'); emit('change',{type:'updateChar',targetId:id,targetName:(ch&&ch.name)||''}); }

  // Character Relationship helpers
  function getCharacterRelationships(charId) { return charId ? project.characterRelationships.filter(r=>r.from===charId||r.to===charId) : project.characterRelationships; }
  function addCharacterRelationship(rel) { snapshot(); project.characterRelationships.push(rel); markDirty('characterRelationships'); emit('change',{type:'addCharRel'}); }
  function updateCharacterRelationship(id, data) { snapshot(); const r=project.characterRelationships.find(x=>x.id===id); if(r) Object.assign(r,data); markDirty('characterRelationships'); emit('change',{type:'updateCharRel',targetId:id}); }
  function removeCharacterRelationship(id) { snapshot(); project.characterRelationships=project.characterRelationships.filter(r=>r.id!==id); markDirty('characterRelationships'); emit('change',{type:'removeCharRel',targetId:id}); }

  // Review Comment helpers
  function getReviewComments(sceneId) { return sceneId ? project.reviewComments.filter(r=>r.sceneId===sceneId) : project.reviewComments; }
  function addReviewComment(rc) { snapshot(); project.reviewComments.push(rc); markDirty('reviewComments'); emit('change',{type:'addReviewComment'}); }
  function updateReviewComment(id, data) { snapshot(); const r=project.reviewComments.find(x=>x.id===id); if(r) Object.assign(r,data); markDirty('reviewComments'); emit('change',{type:'updateReviewComment',targetId:id}); }
  function removeReviewComment(id) { snapshot(); project.reviewComments=project.reviewComments.filter(r=>r.id!==id); markDirty('reviewComments'); emit('change',{type:'removeReviewComment',targetId:id}); }

  // Category helpers
  function getCategories() { return project.categories; }
  function addCategory(key, data) { snapshot(); project.categories[key]=data; markDirty('categories'); emit('change',{type:'addCat',targetName:key}); }
  function removeCategory(key) { snapshot(); delete project.categories[key]; markDirty('categories'); emit('change',{type:'removeCat',targetName:key}); }

  // Batch update without multiple snapshots
  function batch(fn) { snapshot(); fn(); markAllDirty(); emit('change',{type:'batch'}); }

  return {
    on, emit, snapshot, undo, redo, get, set, getPPS, getEPDUR, getEPPX, getSnap, setSnap,
    markDirty, getDirty, clearDirty, markAllDirty,
    getEpisodeIds, getEpisode, addEpisode, updateEpisode, removeEpisode,
    getScenes, getScene, addScene, updateScene, removeScene,
    getEvents, getEvent, addEvent, updateEvent, removeEvent,
    getConnections, addConnection, removeConnection,
    getCharacters, addCharacter, removeCharacter, updateCharacter,
    getCharacterRelationships, addCharacterRelationship, updateCharacterRelationship, removeCharacterRelationship,
    getReviewComments, addReviewComment, updateReviewComment, removeReviewComment,
    getCategories, addCategory, removeCategory, batch
  };
})();
