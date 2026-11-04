/* Presenter-only assistance. All annotations stay in this browser session. */
(() => {
  'use strict';
  const P=window.ReportProjection;
  if(!P)return;
  const preview=P.isPreview,audience=P.isAudience;
  const hash=()=>location.hash||'#overview';
  const interactive='button,a,input,select,textarea,summary,[role="button"],label';
  const paragraph='h1,h2,h3,h4,p,li,dt,dd,figcaption,td,th,.cx-note,.fd-note,.lit-note,.equation';
  let state={focus:null,selection:null,view:null,innerScroll:{},clearEpoch:0};
  let dock=null,iframe=null,focusEnabled=true,applying=false,marked=null,selectionTimer=0,moveTimer=0,scrollTimer=0;
  let lastClear=0,lastPreviewPosition='',lastPreviewSelection='',previewPointer=null,sourceSelecting=false,previewLocation=null,previewSampleTime=0;
  const sampleTime=()=>performance.timeOrigin+performance.now();
  const fallback=[];
  let previewActual=null,lastViewportAnnouncement='';
  const knownInnerScroll=new WeakMap();
  function validHash(value){return value?.hash===hash();}
  function currentState(){
    for(const key of ['focus','selection','view'])if(state[key]&&!validHash(state[key]))state[key]=null;
    for(const [key,value] of Object.entries(state.innerScroll||{}))if(!validHash(value))delete state.innerScroll[key];
    return state;
  }
  function point(node,offset) {
    const parent=node.nodeType===Node.ELEMENT_NODE?node:node.parentElement;
    if(!parent?.closest('main')||parent.closest('.i18n-zh,.i18n-separator,svg,input,textarea'))return null;
    const root=parent.closest('.i18n-en')||parent.closest(paragraph)||parent;
    const prefix=document.createRange();prefix.selectNodeContents(root);
    try{prefix.setEnd(node,offset);}catch(_){return null;}
    return {path:P.path(root),offset:prefix.toString().length};
  }
  function describeSelection() {
    const selection=window.getSelection();
    if(!selection||selection.isCollapsed||!selection.rangeCount)return null;
    const range=selection.getRangeAt(0),start=point(range.startContainer,range.startOffset),end=point(range.endContainer,range.endOffset);
    if(!start||!end||range.toString().length>12000)return null;
    return {hash:hash(),start,end,quote:range.toString()};
  }
  function textPoint(description) {
    const root=P.locate(description?.path);
    if(!root||!root.closest('main')||!Number.isInteger(description.offset)||description.offset<0)return null;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node,remaining=description.offset;
    while((node=walker.nextNode())){if(remaining<=node.length)return [node,remaining];remaining-=node.length;}
    return null;
  }
  function selectionRange(description) {
    if(!validHash(description))return null;
    const start=textPoint(description.start),end=textPoint(description.end);
    if(!start||!end)return null;
    try{
      const range=document.createRange();range.setStart(...start);range.setEnd(...end);
      // Never highlight unrelated text after a model update or a different DOM layout.
      return range.toString()===description.quote?range:null;
    }catch(_){return null;}
  }
  function resizePreview(){
    if(!iframe)return;
    const host=document.getElementById('speakerPreviewHost');
    const fit=ReportPointerSync.previewFit(P.getViewport(),host.clientWidth);
    if(!fit)return;
    Object.assign(iframe.style,{width:`${fit.width}px`,height:`${fit.height}px`,transform:`scale(${fit.scale})`});
    const output=document.getElementById('speakerViewportStatus');
    const matched=previewActual?.width===fit.width&&previewActual?.height===fit.height;
    output.textContent=`${matched?'同版面已對齊 · Aligned':'正在對齊 · Aligning'} ${fit.width} × ${fit.height} · ${Math.round(fit.scale*100)}%`;
    output.dataset.aligned=String(matched);
  }
  function announceViewport(){
    if(!preview)return;
    const signature=`${hash()}|${innerWidth}|${innerHeight}`;
    if(signature===lastViewportAnnouncement)return;lastViewportAnnouncement=signature;
    P.sendSpeaker({kind:'viewport',hash:hash(),width:innerWidth,height:innerHeight});
  }
  function paint() {
    marked?.classList.remove('report-spotlight');marked=null;
    const focus=currentState().focus;
    if(validHash(focus)){
      const el=P.locate(focus.path);
      if(el?.closest('main')&&el.getBoundingClientRect().height){el.classList.add('report-spotlight');marked=el;}
    }
    fallback.splice(0).forEach(el=>el.remove());
    globalThis.CSS?.highlights?.delete('report-selection');
    if(preview){
      lastPreviewPosition=JSON.stringify(P.getScroll());
      document.querySelectorAll('main .fd-table-wrap,main .cx-table-scroll,main .table-scroll').forEach(el=>knownInnerScroll.set(el,`${el.scrollLeft}|${el.scrollTop}`));
      if(!window.getSelection()?.isCollapsed)return;
    }
    const range=selectionRange(state.selection);
    if(range){
      if(globalThis.CSS?.highlights&&globalThis.Highlight)CSS.highlights.set('report-selection',new Highlight(range));
      else for(const rect of range.getClientRects()){
        if(!rect.width||!rect.height||rect.bottom<0||rect.top>innerHeight)continue;
        const el=document.createElement('i');el.className='report-selection-rect';el.setAttribute('aria-hidden','true');
        Object.assign(el.style,{left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`});
        document.body.append(el);fallback.push(el);
      }
    }
  }
  function updateStatus() {
    const el=document.getElementById('speakerViewStatus');
    if(el)el.textContent=state.view?'預覽／標示正在指定投影位置 · Preview / spotlight controls the audience position':'跟隨主畫面；文字用段落提示，精準指字請開英文預覽 · Follow Presenter / exact cursor in English Preview';
    const back=document.getElementById('speakerFollow');if(back)back.disabled=!state.view;
    const selection=document.getElementById('speakerSelectionStatus');
    if(selection){selection.hidden=!state.selection;selection.textContent=state.selection?`已選英文 · Selected: ${state.selection.quote}`:'';}
  }
  function changed(){paint();updateStatus();P.notify();}
  function clearMarks({view=false}={}) {
    state.focus=null;state.selection=null;state.clearEpoch++;
    if(view){state.view=null;state.innerScroll={};}
    changed();
  }
  function focusParagraph(el) {
    if(!el?.closest('main'))return;
    const path=P.path(el);
    state.focus={hash:hash(),path};state.selection=null;state.clearEpoch++;
    state.view={hash:hash(),position:{path,fraction:0,ratio:0}};
    changed();
  }
  function receive(data) {
    if(audience||!iframe||!data||data.hash!==hash())return;
    if(data.kind==='viewport'){previewActual=ReportPointerSync.normalizeViewport(data);resizePreview();return;}
    if(data.kind==='innerScroll'){
      const el=P.locate(data.path);
      if(!el?.matches('main .fd-table-wrap,main .cx-table-scroll,main .table-scroll')||![data.left,data.top].every(v=>Number.isFinite(v)&&v>=0&&v<=1e6))return;
      state.innerScroll||={};state.innerScroll[data.path]={hash:hash(),path:data.path,left:data.left,top:data.top};
      if(data.pointer)P.pointerFromPreview(data.pointer,{action:'refresh',sampledAt:data.sampledAt,broadcast:false});
      P.snapshotNow();return;
    }
    if(data.kind==='pointer'){P.pointerFromPreview(data.pointer,{action:data.action,sampledAt:data.sampledAt});return;}
    if(data.kind==='scroll'){
      if(!data.position||typeof data.position!=='object')return;
      if(data.pointer)P.pointerFromPreview(data.pointer,{action:'refresh',sampledAt:data.sampledAt,broadcast:false});
      state.view={hash:hash(),position:data.position};changed();P.snapshotNow();
    }
    if(data.kind==='selection'){
      if(data.selection&&!validHash(data.selection))return;
      if(JSON.stringify(state.selection)===JSON.stringify(data.selection))return;
      state.selection=data.selection;
      if(data.selection){state.focus=null;state.view={hash:hash(),position:data.position};}
      changed();
    }
  }
  function restore(value) {
    if(!audience||!value)return;
    applying=true;state=value;
    if(preview&&state.clearEpoch!==lastClear){lastClear=state.clearEpoch;window.getSelection()?.removeAllRanges();lastPreviewSelection='null';}
    paint();applying=false;
    announceViewport();
  }
  window.ReportSpeaker={
    hasPreview:()=>!!iframe,
    previewWindow:()=>iframe?.contentWindow,
    getState:currentState,restore,receive,paint,setViewport:resizePreview
  };
  function syncSelection() {
    if(applying)return;
    const value=describeSelection();
    if(preview){
      const signature=JSON.stringify(value);if(signature===lastPreviewSelection)return;lastPreviewSelection=signature;
      P.sendSpeaker({kind:'selection',hash:hash(),selection:value,position:P.getScroll()});
    }else if(!audience&&dock&&!dock.hidden&&sourceSelecting){
      if(value){state.selection=value;state.focus=null;state.view={hash:hash(),position:{path:value.start.path,fraction:0,ratio:0}};changed();}
      else if(state.selection){state.selection=null;changed();}
    }
  }
  function togglePreview() {
    if(iframe){iframe.parentElement.remove();iframe=null;state.view=null;P.pointerFromPreview({visible:false},{action:'leave',sampledAt:sampleTime()});changed();}
    else{
      if(marked){const rect=marked.getBoundingClientRect();window.scrollBy({top:rect.top-(document.getElementById('top')?.getBoundingClientRect().height||0)-18,behavior:'instant'});}
      iframe=document.createElement('iframe');iframe.id='speakerPreview';iframe.title='English projection preview — select text to highlight it on the audience display';
      const clip=document.createElement('div');clip.id='speakerPreviewClip';clip.append(iframe);
      iframe.src=P.previewUrl();previewActual=null;document.getElementById('speakerPreviewHost').append(clip);resizePreview();
      P.snapshotNow();
    }
    const open=!!iframe;
    document.getElementById('speakerPreviewToggle').setAttribute('aria-expanded',String(open));
    document.getElementById('speakerPreviewHint').hidden=!open;document.getElementById('speakerViewportStatus').hidden=!open;
    document.getElementById('speakerPreviewToggle').textContent=open?'收起英文預覽 · Hide Preview':'英文預覽／精準選字 · English Preview';
    dock.classList.toggle('with-preview',open);
  }
  function setOpen(open) {
    dock.hidden=!open;document.body.classList.toggle('speaker-tools-open',open);
    document.getElementById('speakerToolsToggle').setAttribute('aria-expanded',String(open));
    if(!open){if(iframe)togglePreview();clearMarks({view:true});}
  }
  function initPresenter() {
    const button=document.createElement('button');button.id='speakerToolsToggle';button.type='button';button.className='menu-button';
    button.dataset.i18nSkip='';button.textContent='講者工具 · Speaker Tools';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','speakerDock');
    document.getElementById('menuButton').before(button);
    dock=document.createElement('aside');dock.id='speakerDock';dock.hidden=true;dock.dataset.i18nSkip='';dock.setAttribute('aria-label','講者工具 / Speaker Tools');
    dock.innerHTML='<div class="speaker-toolbar"><strong>講者工具 · Speaker Tools</strong><button id="speakerFocus" type="button" aria-pressed="true">點段落標亮 · Spotlight Paragraphs</button><button id="speakerPreviewToggle" type="button" aria-expanded="false" aria-controls="speakerPreviewHost">英文預覽／精準選字 · English Preview</button><button id="speakerClear" type="button">清除標示 · Clear Marks</button><button id="speakerClose" type="button">收起 · Hide</button></div><div class="speaker-position"><span id="speakerViewStatus" role="status"></span><button id="speakerFollow" type="button" disabled>返回主畫面位置 · Follow Presenter</button><details class="speaker-instructions"><summary>操作說明 · Help</summary><p>點選上方中文或英文段落，投影標亮對應英文。也可直接反白上方英文；中文選字不會逐字配對英文，請改用段落標亮。</p><p>預覽可指點、捲動及拖曳反白，但不操作模型。請使用主畫面控制項。工具列及預覽都不會投影給觀眾。</p></details></div><p id="speakerPreviewHint" hidden>英文預覽：拖曳選字會同步反白；捲動會改變投影位置。按「返回主畫面位置」可恢復跟隨。</p><div id="speakerPreviewHost"></div>';
    document.body.append(dock);
    document.querySelector('.speaker-instructions p').textContent='主畫面文字以段落提示對應英文；點一下可定位並標亮。主畫面的圖表與按鈕仍可指點。要精準指字或反白，請在下方同版面英文預覽操作。';
    document.getElementById('speakerPreviewHint').textContent='精準英文預覽：和投影採相同版面，僅縮小顯示。此處顯示投影上半部，可捲動或拖曳右下角加高；游標與反白直接對應。';
    const viewportStatus=document.createElement('output');viewportStatus.id='speakerViewportStatus';viewportStatus.hidden=true;document.getElementById('speakerPreviewHost').before(viewportStatus);
    const selectionStatus=document.createElement('output');selectionStatus.id='speakerSelectionStatus';selectionStatus.hidden=true;selectionStatus.setAttribute('aria-live','polite');
    document.getElementById('speakerPreviewHost').before(selectionStatus);
    button.addEventListener('click',()=>setOpen(dock.hidden));
    document.getElementById('speakerClose').addEventListener('click',()=>setOpen(false));
    document.getElementById('speakerFocus').addEventListener('click',event=>{
      focusEnabled=!focusEnabled;event.currentTarget.setAttribute('aria-pressed',String(focusEnabled));
      if(!focusEnabled){state.focus=null;changed();}
    });
    document.getElementById('speakerPreviewToggle').addEventListener('click',togglePreview);
    document.getElementById('speakerClear').addEventListener('click',()=>{window.getSelection()?.removeAllRanges();clearMarks();});
    document.getElementById('speakerFollow').addEventListener('click',()=>{state.view=null;state.innerScroll={};changed();});
    document.addEventListener('click',event=>{
      if(dock.hidden||!focusEnabled||event.target.closest(interactive)||!window.getSelection()?.isCollapsed)return;
      const el=event.target.closest(paragraph)||event.target.closest('.i18n-unit');
      if(el?.closest('main')&&!el.closest('svg'))focusParagraph(el);
    });
    document.addEventListener('pointerdown',event=>{
      sourceSelecting=!!event.target.closest('main');
      if(!event.target.closest('main'))return;
      state.view=null;state.innerScroll={};updateStatus();
      if(event.target.closest(interactive))clearMarks();
    },true);
    for(const type of ['input','change'])document.addEventListener(type,event=>{if(event.isTrusted&&event.target.closest('main'))clearMarks();},true);
    window.addEventListener('scroll',()=>{if(state.view){state.view=null;updateStatus();}paint();},{passive:true});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!dock.hidden)clearMarks();});
    window.addEventListener('hashchange',()=>clearMarks({view:true}));
    document.addEventListener('reportlanguagechange',()=>{paint();});
    if(window.ResizeObserver)new ResizeObserver(()=>{
      document.documentElement.style.setProperty('--speaker-dock-height',`${dock.hidden?0:Math.ceil(dock.getBoundingClientRect().height)}px`);
    }).observe(dock);
    if(window.ResizeObserver)new ResizeObserver(resizePreview).observe(document.getElementById('speakerPreviewHost'));
    window.addEventListener('resize',resizePreview);
    updateStatus();
  }
  function initPreview() {
    document.documentElement.classList.add('speaker-preview');
    announceViewport();window.addEventListener('resize',announceViewport);
    // This copy is a pointer/selection surface, not a second model controller.
    for(const type of ['click','pointerdown','keydown','input','change','submit'])document.addEventListener(type,event=>{
      if(!event.isTrusted||!event.target.closest(interactive))return;
      event.preventDefault();event.stopImmediatePropagation();
    },true);
    for(const type of ['pointermove','pointerdown','pointerup'])document.addEventListener(type,event=>{
      previewLocation=[event.clientX,event.clientY,event.buttons];previewSampleTime=sampleTime();
      const publish=()=>{moveTimer=0;if(!previewLocation)return;previewPointer=P.describePointer(...previewLocation);P.sendSpeaker({kind:'pointer',action:'motion',sampledAt:previewSampleTime,hash:hash(),pointer:previewPointer});};
      if(type!=='pointermove'){clearTimeout(moveTimer);publish();}else if(!moveTimer)moveTimer=setTimeout(publish,16);
    },{capture:true,passive:true});
    const leave=()=>{clearTimeout(moveTimer);moveTimer=0;previewLocation=null;P.sendSpeaker({kind:'pointer',action:'leave',sampledAt:sampleTime(),hash:hash(),pointer:{visible:false}});};
    document.documentElement.addEventListener('pointerleave',leave);window.addEventListener('blur',leave);
    document.addEventListener('scroll',event=>{
      const el=event.target;
      if(!(el instanceof Element)||!el.matches('main .fd-table-wrap,main .cx-table-scroll,main .table-scroll'))return;
      const signature=`${el.scrollLeft}|${el.scrollTop}`;
      if(signature===knownInnerScroll.get(el))return;knownInnerScroll.set(el,signature);
      P.sendSpeaker({kind:'innerScroll',hash:hash(),path:P.path(el),left:el.scrollLeft,top:el.scrollTop,pointer:previewLocation?P.describePointer(...previewLocation):null,sampledAt:previewSampleTime});
    },true);
    window.addEventListener('scroll',()=>{
      if(applying)return;
      clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>{
        const position=P.getScroll(),signature=JSON.stringify(position);
        if(signature===lastPreviewPosition)return;lastPreviewPosition=signature;
        P.sendSpeaker({kind:'scroll',hash:hash(),position,pointer:previewLocation?P.describePointer(...previewLocation):null,sampledAt:previewSampleTime});
      },40);
    },{passive:true});
  }
  function init() {
    if(preview)initPreview();else if(!audience)initPresenter();
    if(!audience||preview)document.addEventListener('selectionchange',()=>{clearTimeout(selectionTimer);selectionTimer=setTimeout(syncSelection,35);});
    if(audience&&!preview){window.addEventListener('scroll',paint,{passive:true});window.addEventListener('resize',paint);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
