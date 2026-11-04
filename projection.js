/* Same-browser, one-way presentation sync. No content is uploaded to a server. */
(() => {
  'use strict';
  const query=new URLSearchParams(location.search);
  const audience=query.has('projector');
  const preview=audience&&query.get('preview')==='1';
  const session=audience?query.get('projector'):(globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const registry=new Map(),pending=new Map(),applied=new Map();
  const clone=value=>JSON.parse(JSON.stringify(value));
  let channel=null,peer=null,enabled=false,connected=false,booted=false,lastSeen=0,frame=0,sequence=0,lastSequence=0,restoring=false;
  let latest=null,latestScroll=null,scrollFrame=0,ended=false;
  let pointer=null,pointerTimer=0,pointerLocation=null,cursor=null,pointerSampleTime=0,pointerPending=false,paintFrame=0,pressedElement=null,layoutPending=false;
  let viewport={width:1280,height:800,fullscreen:false},pointerFocus=null,viewportTimer=0;
  const pointerFlow=ReportPointerSync.createFlow(),pointerInbox=ReportPointerSync.createInbox();
  const sampleTime=()=>performance.timeOrigin+performance.now();
  const hovered=new Set();
  const journal=[];
  if(audience){document.documentElement.classList.add('projector-view','projector-awaiting');document.documentElement.dataset.language='en';}
  try {channel=new BroadcastChannel(`hyperspectral-projection-${session}`);} catch (_) { /* postMessage fallback */ }

  function selector(el) {
    if(!(el instanceof Element))return null;
    const parts=[];
    while(el&&el!==document.documentElement){
      if(el.id){parts.unshift(`#${CSS.escape(el.id)}`);return parts.join(' > ');}
      const tag=el.localName,siblings=el.parentElement?[...el.parentElement.children].filter(child=>child.localName===tag):[];
      parts.unshift(`${tag}:nth-of-type(${siblings.indexOf(el)+1})`);el=el.parentElement;
    }
    return parts.length?parts.join(' > '):null;
  }
  function find(path){try{return typeof path==='string'?document.querySelector(path):null;}catch(_){return null;}}
  function route(hash) {
    if(typeof hash!=='string'||!hash.startsWith('#')||hash.length>300)return;
    if(location.hash!==hash){history.replaceState(null,'',hash);window.dispatchEvent(new Event('hashchange'));}
  }
  function send(data) {
    const message={...data,role:preview?'preview':audience?'audience':'presenter',session,protocol:'hyperspectral-projector-v1'};
    channel?.postMessage(message);
    // BroadcastChannel survives opener isolation. postMessage is used only when it is unavailable.
    if(!channel){try{
      if(audience)(preview?window.parent:window.opener)?.postMessage(message,location.origin);
      else {peer?.postMessage(message,location.origin);window.ReportSpeaker?.previewWindow()?.postMessage(message,location.origin);}
    }catch(_){}}
  }
  function syncRegistry(key) {
    if(!pending.has(key)||!registry.has(key))return;
    const value=pending.get(key),signature=JSON.stringify(value);
    if(applied.get(key)===signature&&key!=='shell:menu')return;
    registry.get(key).set(clone(value));applied.set(key,signature);
  }
  window.ReportProjection={
    isAudience:audience,isPreview:preview,
    register(key,adapter){registry.set(key,adapter);if(audience)syncRegistry(key);},
    notify(){schedule();},
    path:selector,locate:find,describePointer:pointerAt,getScroll:scrollPosition,getViewport:()=>viewport,
    sendSpeaker(data){send({type:'speaker',data});},
    snapshotNow(){publish();},
    previewUrl(){const url=projectionUrl();url.searchParams.set('preview','1');return url.href;},
    pointerFromPreview(value,{action='motion',sampledAt=0,broadcast=true}={}){
      const packet=action==='leave'?pointerFlow.leave('preview',sampledAt):action==='refresh'?pointerFlow.refresh('preview',value,sampledAt):pointerFlow.motion('preview',value,sampledAt);
      if(packet){pointer=packet;if(broadcast)send({type:'pointer',data:packet});}
    }
  };

  // Preview and audience use identical viewport geometry. Never infer cursor
  // positions from characters, word wrapping, or individual text-node bounds.
  function pointerAt(x,y,buttons=0) {
    let el=document.elementFromPoint(x,y);
    if(!el||el.closest('#projectionPanel,#presentMode,.language-control,#projectorBar,#speakerDock,#speakerToolsToggle'))return {visible:false};
    const ancestors=[];
    for(let parent=el;parent&&parent!==document.body;parent=parent.parentElement)ancestors.push(selector(parent));
    const shared={hash:location.hash||'#overview',ancestors,pressed:!!(buttons&1),kind:el.closest('button,a,summary,[role="button"]')?'hand':'arrow'};
    if(preview)return {...shared,visible:true,mapping:'viewport',x,y,width:innerWidth,height:innerHeight};
    const control=el.closest('button,a,input,select,textarea,summary,[role="button"],label');
    const svg=el.closest('svg');
    if(svg&&(!control||svg.contains(control)||control===svg)){
      const matrix=svg.getScreenCTM();
      if(!matrix)return {visible:false};
      const point=new DOMPoint(x,y).matrixTransform(matrix.inverse());
      return {...shared,visible:true,mapping:'svg',path:selector(svg),x:point.x,y:point.y};
    }
    const target=control||el.closest('canvas,.cube-model,.cube-visual,.band-scene');
    if(target){const rect=target.getBoundingClientRect();if(rect.width&&rect.height)return {...shared,visible:true,mapping:'element',path:selector(target),u:(x-rect.left)/rect.width,v:(y-rect.top)/rect.height};}
    const paragraph=el.closest('h1,h2,h3,h4,p,li,dt,dd,figcaption,td,th')||el.closest('.i18n-unit');
    return {visible:false,hash:shared.hash,focusPath:paragraph?.closest('main')?selector(paragraph):null};
  }
  function updatePointerFocus(path){
    const next=path?find(path):null;
    if(next===pointerFocus)return;
    pointerFocus?.classList.remove('report-pointer-focus');
    if(next?.closest('main')){next.classList.add('report-pointer-focus');pointerFocus=next;}else pointerFocus=null;
  }
  function updateHover(next,pressed=null){
    for(const el of hovered)if(!next.has(el))el.classList.remove('projection-hover');
    for(const el of next)if(!hovered.has(el))el.classList.add('projection-hover');
    hovered.clear();for(const el of next)hovered.add(el);
    if(pressedElement!==pressed){pressedElement?.classList.remove('projection-pressed');pressed?.classList.add('projection-pressed');pressedElement=pressed;}
  }
  function paintPointerNow() {
    if(!audience||preview||!cursor)return;
    const hide=()=>{cursor.hidden=true;updateHover(new Set());};
    if(pointer?.hash!==(location.hash||'#overview')||ended){updatePointerFocus(null);hide();return;}
    updatePointerFocus(pointer.focusPath);
    if(!pointer.visible){hide();return;}
    const next=new Set((pointer.ancestors||[]).map(find).filter(Boolean));
    const el=pointer.path?find(pointer.path):null;
    updateHover(next,pointer.pressed?el:null);
    let position=null;
    if(pointer.mapping==='viewport')position=ReportPointerSync.viewportPoint(pointer,innerWidth,innerHeight);
    else if(pointer.mapping==='svg'&&el?.getScreenCTM){const matrix=el.getScreenCTM();if(matrix)position=new DOMPoint(pointer.x,pointer.y).matrixTransform(matrix);}
    else if(pointer.mapping==='element'&&el){const rect=el.getBoundingClientRect();if(rect.width&&rect.height)position={x:rect.left+pointer.u*rect.width,y:rect.top+pointer.v*rect.height};}
    if(!position){hide();return;}
    const {x,y}=position;
    if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>innerWidth||y<0||y>innerHeight){hide();return;}
    cursor.dataset.kind=pointer.kind;cursor.classList.toggle('is-pressed',pointer.pressed);
    cursor.dataset.source=pointer.source;cursor.dataset.revision=String(pointer.revision);cursor.dataset.mapping=pointer.mapping;
    cursor.style.transform=`translate3d(${x}px,${y}px,0)`;cursor.hidden=false;
  }
  function paintPointer(){
    if(!audience||preview||paintFrame||scrollFrame)return;
    // One paint after the associated scroll/layout has committed, not once per packet.
    paintFrame=setTimeout(()=>{paintFrame=0;if(!scrollFrame)paintPointerNow();},16);
  }
  function acceptPointer(value){if(pointerInbox.accept(value)){pointer=pointerInbox.current;paintPointer();}}
  function sendPointer(immediate=false) {
    if(audience||!active())return;
    const publishPointer=()=>{
      pointerTimer=0;if(!pointerPending||!pointerLocation)return;pointerPending=false;
      const packet=pointerFlow.motion('main',pointerAt(...pointerLocation),pointerSampleTime);
      if(!packet)return;pointer=packet;
      if(layoutPending){clearTimeout(scrollFrame);scrollFrame=0;publish();}
      else send({type:'pointer',data:packet});
    };
    if(immediate){clearTimeout(pointerTimer);publishPointer();}
    else if(!pointerTimer)pointerTimer=setTimeout(publishPointer,16);
  }
  function hidePointer(){
    clearTimeout(pointerTimer);pointerTimer=0;pointerPending=false;pointerLocation=null;
    const packet=pointerFlow.leave('main',sampleTime());
    if(packet){pointer=packet;if(enabled)send({type:'pointer',data:packet});}
  }
  function currentPointer(){
    if(pointerPending&&pointerLocation){
      clearTimeout(pointerTimer);pointerTimer=0;pointerPending=false;
      const packet=pointerFlow.motion('main',pointerAt(...pointerLocation),pointerSampleTime);if(packet)pointer=packet;
    }else if(pointerFlow.owner==='main'&&pointerLocation){
      const packet=pointerFlow.refresh('main',pointerAt(...pointerLocation),pointerSampleTime);if(packet)pointer=packet;
    }
    return pointerFlow.current;
  }

  function scrollPosition() {
    if(preview)return {viewport:true,x:scrollX,y:scrollY};
    if(scrollY<8)return {top:true};
    const line=(document.getElementById('top')?.getBoundingClientRect().height||0)+18;
    const page=document.querySelector('main > .chapter:not([hidden]),main > .sources-section:not([hidden])');
    let anchor=null,best=-Infinity;
    page?.querySelectorAll('h1,h2,h3,h4,p,article,details,.cx-controls,.fd-controls,.lit-controls,svg').forEach(el=>{
      const rect=el.getBoundingClientRect();
      if(rect.width&&rect.height>0&&rect.top<=line+3&&rect.bottom>line&&rect.top>best){best=rect.top;anchor=el;}
    });
    if(!anchor)anchor=page;
    const rect=anchor?.getBoundingClientRect();
    return {path:selector(anchor),fraction:rect?.height?Math.max(0,Math.min(1,(line-rect.top)/rect.height)):0,ratio:scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight)};
  }
  function applyScroll(position) {
    if(!position)return;
    if(position.viewport){window.scrollTo({left:position.x||0,top:position.y||0,behavior:'instant'});return;}
    let y=0;
    if(!position.top){
      const el=find(position.path),rect=el?.getBoundingClientRect();
      y=rect?.height?scrollY+rect.top+position.fraction*rect.height-(document.getElementById('top')?.getBoundingClientRect().height||0)-18:position.ratio*(document.documentElement.scrollHeight-innerHeight);
    }
    window.scrollTo({top:Math.max(0,y),behavior:'instant'});
  }
  function snapshot() {
    return {hash:location.hash||'#overview',viewport,states:Object.fromEntries([...registry].map(([key,adapter])=>[key,clone(adapter.get())])),
      actions:journal,details:[...document.querySelectorAll('main details')].map(el=>({path:selector(el),open:el.open})),
      innerScroll:[...document.querySelectorAll('main .fd-table-wrap,main .cx-table-scroll,main .table-scroll')].filter(el=>el.clientWidth>0).map(el=>({path:selector(el),x:el.scrollLeft/Math.max(1,el.scrollWidth-el.clientWidth),y:el.scrollTop/Math.max(1,el.scrollHeight-el.clientHeight)})),scroll:scrollPosition(),pointer:currentPointer(),assist:window.ReportSpeaker?.getState()||null};
  }
  const active=()=>enabled||window.ReportSpeaker?.hasPreview();
  function publish(){frame=0;if(active()&&!audience){layoutPending=false;send({type:'snapshot',data:snapshot()});}}
  function schedule(){if(!audience&&active()&&!frame)frame=setTimeout(publish,25);}
  function record(action) {
    action.sequence=++sequence;
    const previous=journal.at(-1);
    if(action.kind==='field'&&previous?.kind==='field'&&previous.path===action.path&&previous.event===action.event&&previous.hash===action.hash)journal[journal.length-1]=action;
    else journal.push(action);
    schedule();
  }
  function replay(action) {
    route(action.hash);
    const el=find(action.path);
    if(!el)throw new Error('A presentation control could not be restored.');
    if(action.kind==='click')el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
    if(action.kind==='field'){
      if(el.type==='checkbox'||el.type==='radio')el.checked=action.checked;
      else el.value=action.value;
      el.dispatchEvent(new Event(action.event,{bubbles:true}));
    }
    if(action.kind==='key')el.dispatchEvent(new KeyboardEvent('keydown',{key:action.key,bubbles:true,cancelable:true}));
  }
  function restore(data) {
    if(!data||!Array.isArray(data.actions)||!data.states||restoring)return;
    restoring=true;
    try {
      if(preview){const next=ReportPointerSync.normalizeViewport(data.viewport);if(next){viewport=next;document.getElementById('projectorFullscreen').textContent=next.fullscreen?'Exit Full Screen':'Full Screen';}}
      Object.entries(data.states).forEach(([key,value])=>pending.set(key,value));
      for(const action of data.actions)if(action.sequence>lastSequence){replay(action);lastSequence=action.sequence;}
      route(data.hash);
      for(const key of registry.keys())syncRegistry(key);
      if(window.ReportI18n?.getMode()!=='en')window.ReportI18n?.applyMode('en',{persist:false});
      (data.details||[]).forEach(item=>{const el=find(item.path);if(el?.tagName==='DETAILS'&&el.open!==item.open)el.open=item.open;});
      (data.innerScroll||[]).forEach(item=>{const el=find(item.path);if(el){el.scrollLeft=item.x*Math.max(0,el.scrollWidth-el.clientWidth);el.scrollTop=item.y*Math.max(0,el.scrollHeight-el.clientHeight);}});
      Object.values(data.assist?.innerScroll||{}).forEach(item=>{const el=item.hash===data.hash&&find(item.path);if(el?.matches('main .fd-table-wrap,main .cx-table-scroll,main .table-scroll')){el.scrollLeft=item.left;el.scrollTop=item.top;}});
      document.documentElement.classList.remove('projector-awaiting');
      latestScroll=data.assist?.view?.hash===data.hash?data.assist.view.position:data.scroll;
      window.ReportSpeaker?.restore(data.assist);
      acceptPointer(data.pointer);
      if(!scrollFrame)scrollFrame=setTimeout(()=>{scrollFrame=0;applyScroll(latestScroll);paintPointer();window.ReportSpeaker?.paint();},0);
      setStatus('connected');
    } catch (_) {setStatus('error');}
    finally {restoring=false;}
  }
  function receive(message) {
    if(!message||message.protocol!=='hyperspectral-projector-v1'||message.session!==session)return;
    if(!audience&&enabled&&message.role==='audience'&&message.type==='viewport'){
      const next=ReportPointerSync.normalizeViewport(message.data);
      if(next){viewport=next;window.ReportSpeaker?.setViewport(next);publish();}return;
    }
    if(!audience&&message.role==='preview'){
      if(message.type==='speaker')window.ReportSpeaker?.receive(message.data);
      if(message.type==='ready')publish();
      return;
    }
    if(audience){
      if(message.role!=='presenter')return;
      if(ended)return;
      if(message.type==='snapshot'){lastSeen=Date.now();latest=message.data;if(booted)restore(latest);}
      if(message.type==='pointer')acceptPointer(message.data);
      if(message.type==='ping'){lastSeen=Date.now();send({type:'alive'});}
      if(message.type==='stop'&&!preview){ended=true;paintPointer();setStatus('stopped');document.documentElement.classList.add('projector-stopped');try{window.close();}catch(_){}}
    }else if(enabled&&(message.type==='ready'||message.type==='alive')){
      if(message.error){connected=false;setStatus('error');return;}
      const resumed=!connected;
      lastSeen=Date.now();connected=true;setStatus('connected');if(message.type==='ready'||resumed)publish();
    }
  }
  if(channel)channel.onmessage=event=>receive(event.data);
  else window.addEventListener('message',event=>{if(event.origin===location.origin&&(audience?event.source===(preview?window.parent:window.opener):event.source===peer||event.source===window.ReportSpeaker?.previewWindow()))receive(event.data);});

  // The main concept labs export state; older supplemental chapters replay only their UI actions.
  const managed=el=>el.closest('.concept-lab-mount,.lit-lab');
  const excluded=el=>el.closest('#projectionPanel,#projectorBar,#presentMode,#languageSelect,#menuButton,#chapterNav,.language-control,#speakerDock,#speakerToolsToggle');
  if(!audience){
    for(const type of ['pointermove','pointerdown','pointerup'])document.addEventListener(type,event=>{
      pointerLocation=[event.clientX,event.clientY,event.buttons];pointerSampleTime=sampleTime();pointerPending=true;sendPointer(type!=='pointermove');
    },{passive:true,capture:true});
    document.documentElement.addEventListener('pointerleave',hidePointer);
    window.addEventListener('blur',hidePointer);
    window.addEventListener('pointercancel',hidePointer);
    document.addEventListener('click',event=>{
      const el=event.target.closest('button,[role="button"]');
      if(el&&!excluded(el)&&!managed(el))record({kind:'click',hash:location.hash,path:selector(el)});
      // Routing uses pushState, not only hashchange. Wait until the router has handled the link.
      if(!excluded(event.target))schedule();
    },true);
    for(const type of ['input','change'])document.addEventListener(type,event=>{
      const el=event.target;if(!el.matches('input,select,textarea')||excluded(el))return;
      if(!managed(el))record({kind:'field',hash:location.hash,path:selector(el),event:type,value:el.value,checked:el.checked});
      schedule();
    },true);
    document.addEventListener('keydown',event=>{
      const el=event.target;
      if(el.matches('svg,[data-cube-material]')&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' '].includes(event.key))record({kind:'key',hash:location.hash,path:selector(el),key:event.key});
    },true);
    document.addEventListener('toggle',event=>{if(event.target.closest('main'))schedule();},true);
    document.addEventListener('scroll',event=>{if(event.target instanceof Element&&event.target.closest('main,#chapterNav')){layoutPending=true;schedule();}},true);
    document.addEventListener('reportlanguagechange',()=>{updateLabels();schedule();});
    window.addEventListener('hashchange',schedule);
    window.addEventListener('scroll',()=>{
      layoutPending=true;
      if(active()&&!scrollFrame)scrollFrame=setTimeout(()=>{scrollFrame=0;publish();},40);
    },{passive:true});
  }

  let statusKey='closed';
  const words={
    closed:['尚未開啟投影','Projection is closed'],opening:['等待投影視窗連線…','Waiting for the projection window…'],
    connected:['投影已同步','Projection is synchronized'],disconnected:['投影視窗已中斷；可重新開啟','Projection disconnected; reopen the window'],
    blocked:['若視窗未開啟，請允許彈出式視窗，或點下方連結。','If no window opened, allow pop-ups or use the link below.'],
    error:['同步失敗，請關閉後重新開啟投影','Synchronization failed. Close and reopen the projection.'],
    stopped:['投影已結束','Projection ended']
  };
  function lines(el,pair) {
    if(!el)return;
    const mode=audience?'en':window.ReportI18n?.getMode()||'en';
    el.replaceChildren();
    for(const text of mode==='bilingual'?[pair[1],pair[0]]:[pair[mode==='zh'?0:1]]){const span=document.createElement('span');span.textContent=text;el.append(span);}
  }
  function setStatus(key){statusKey=key;updateLabels();}
  function updateLabels() {
    lines(document.querySelector('#presentMode .mode-label'),['投影','Projection']);
    const button=document.getElementById('presentMode');if(button){button.setAttribute('aria-pressed',String(enabled&&connected));button.setAttribute('aria-label',(window.ReportI18n?.getMode()==='zh'?'開啟同步投影':'Open synchronized projection'));}
    lines(document.getElementById('projectionStatus'),words[statusKey]||words.closed);
    lines(document.getElementById('projectionOpen'),['開啟／顯示投影視窗','Open / Show Projection Window']);
    lines(document.getElementById('projectionStop'),['結束投影','End Projection']);
    lines(document.getElementById('projectionHide'),['收起提示','Hide Instructions']);
    lines(document.getElementById('projectionHelp'),['把投影頁拖出成獨立視窗，再移到延伸螢幕；全螢幕請在投影視窗操作。主畫面換頁、控制項與捲動會單向同步，投影端固定英文。兩邊需使用同一瀏覽器。若內建瀏覽器無法開啟新視窗，請在 Chrome 或 Edge 開啟本報告後再操作。','Move the projection page into a separate window on your extended display. Enter full screen in that window. Pages, controls, and scrolling follow this presenter window; the audience view stays English. Use the same browser for both. If an embedded browser cannot open a window, open this report in Chrome or Edge first.']);
    if(audience){const status=document.getElementById('projectorStatus');status.textContent=statusKey==='connected'?'Projection · Live':statusKey==='stopped'?'Projection ended':statusKey==='error'?'Sync failed — reopen from presenter':Date.now()-lastSeen>7000?'Presenter disconnected — last view retained':'Waiting for presenter…';}
  }
  function projectionUrl(){const url=new URL(location.href);url.searchParams.set('projector',session);return url;}
  function reportViewport(){if(audience&&!preview)send({type:'viewport',data:{width:innerWidth,height:innerHeight,fullscreen:!!document.fullscreenElement}});}
  function start() {
    enabled=true;document.getElementById('projectionPanel').hidden=false;setStatus('opening');
    const url=projectionUrl();document.getElementById('projectionOpen').href=url.href;
    if(peer&&!peer.closed){try{peer.focus();}catch(_){}publish();return;}
    peer=window.open(url.href,`hyperspectral-projector-${session}`,'popup=yes,width=1280,height=800');
    setTimeout(()=>{if(enabled&&!connected)setStatus('blocked');},2500);
  }
  function stop(){send({type:'stop'});try{if(peer&&!peer.closed)peer.close();}catch(_){}peer=null;enabled=false;connected=false;setStatus('closed');}
  function init() {
    booted=true;document.body.classList.remove('presentation-mode');
    if(!audience){
      const panel=document.createElement('aside');panel.id='projectionPanel';panel.className='projection-panel';panel.hidden=true;panel.dataset.i18nSkip='';
      panel.innerHTML='<div><strong id="projectionStatus" role="status" aria-live="polite"></strong><p id="projectionHelp"></p></div><div class="projection-actions"><a id="projectionOpen" target="hyperspectral-projector-'+session+'"></a><button id="projectionStop" type="button"></button><button id="projectionHide" type="button"></button></div>';
      document.getElementById('top').after(panel);
      document.getElementById('presentMode').addEventListener('click',start);
      document.getElementById('projectionStop').addEventListener('click',stop);
      document.getElementById('projectionHide').addEventListener('click',()=>panel.hidden=true);
      document.getElementById('projectionOpen').addEventListener('click',()=>{enabled=true;setStatus('opening');});
      updateLabels();
    }else{
      document.body.setAttribute('data-projection','audience');
      const bar=document.createElement('div');bar.id='projectorBar';bar.dataset.i18nSkip='';
      bar.innerHTML='<span id="projectorStatus" role="status">Waiting for presenter…</span><button type="button" id="projectorFullscreen">Full Screen</button>';
      document.querySelector('#top .header-actions').append(bar);
      document.getElementById('projectorFullscreen').addEventListener('click',async()=>{
        try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
        catch(_){document.getElementById('projectorStatus').textContent='Use your browser’s full-screen command (often F11).';}
      });
      document.addEventListener('fullscreenchange',()=>{document.getElementById('projectorFullscreen').textContent=document.fullscreenElement?'Exit Full Screen':'Full Screen';if(latestScroll)applyScroll(latestScroll);reportViewport();});
      document.querySelector('main').inert=!preview;
      document.getElementById('chapterNav').inert=true;
      document.getElementById('menuButton').inert=true;
      cursor=document.createElement('div');cursor.id='projectionCursor';cursor.hidden=true;cursor.setAttribute('aria-hidden','true');
      cursor.innerHTML='<svg viewBox="0 0 32 40" width="28" height="35"><path class="cursor-arrow" d="M3 2L3 29L10 23L16 36L22 33L16 21L27 21Z"/><path class="cursor-hand" d="M10 20V5C10 1 16 1 16 5V17V12C16 8 22 8 22 12V18V15C22 11 28 12 28 16V27C28 33 23 37 17 37H14C10 37 8 33 6 30L2 24C0 20 4 17 7 20L10 23Z"/></svg><span></span>';
      document.body.append(cursor);
      window.ReportI18n?.applyMode('en',{persist:false});
      if(latest)restore(latest);
      reportViewport();
      send({type:'ready'});
      window.addEventListener('resize',()=>{if(latestScroll)applyScroll(latestScroll);paintPointer();clearTimeout(viewportTimer);viewportTimer=setTimeout(reportViewport,40);});
      window.addEventListener('scroll',paintPointer,{passive:true});
      // The audience stays native; the presenter preview adopts this viewport exactly.
    }
    setInterval(()=>{
      if(ended)return;
      if(audience){send({type:'alive',error:statusKey==='error'});if(!latest)send({type:'ready'});if(lastSeen&&Date.now()-lastSeen>7000){statusKey='disconnected';updateLabels();}}
      else if(enabled){send({type:'ping'});if(connected&&Date.now()-lastSeen>7000){connected=false;setStatus('disconnected');}}
    },1500);
  }
  window.addEventListener('pagehide',()=>{if(!audience&&enabled)send({type:'stop'});});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
