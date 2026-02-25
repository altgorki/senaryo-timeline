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

  function migrateOldFormat(d) {
    // Migrate from v7 flat format to new hierarchical format
    const oldEvs = d.events || [];
    const oldCns = d.connections || [];
    const CATS = {operasyon:{label:'Operasyon',color:'#ef4444'},karakter:{label:'Karakter',color:'#3b82f6'},organizasyon:{label:'Organizasyon',color:'#10b981'},sistem:{label:'Sistem',color:'#f59e0b'},flashback:{label:'Flashback',color:'#a855f7'},ihanet:{label:'İhanet',color:'#f97316'}};
    // Collect unique episodes
    const epNums = [...new Set(oldEvs.map(e=>e.ep))].sort((a,b)=>{if(a==='fb')return 1;if(b==='fb')return -1;return a-b;});
    const episodes = epNums.map((n,i) => ({ id:'ep_'+n, number:n, title:n==='fb'?'Flashback':'', duration:2700, type:'normal', order:i }));
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
    S.set({
      meta: { title: d.meta?.title || 'İçe Aktarılmış Proje', author:'', settings:{ episodeDuration:2700, pixelsPerSecond:0.5, snapGrid:10 } },
      categories: CATS, characters, episodes, scenes, events, connections
    });
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

  return { exportJSON, importJSON, loadDemo, handleDocx, migrateOldFormat };
})();
