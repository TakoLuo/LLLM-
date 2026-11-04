/* Pure ordering rules shared by the UI and deterministic race-condition tests. */
((root,factory)=>{
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ReportPointerSync=api;
})(globalThis,()=>{
  'use strict';
  function createFlow(){
    let owner='main',ownerTime=-Infinity,revision=0,current=null;
    const lastMotion={main:-Infinity,preview:-Infinity};
    const known=source=>Object.hasOwn(lastMotion,source);
    const commit=(source,value)=>current={...value,source,revision:++revision};
    return {
      motion(source,value,at){
        if(!known(source)||!Number.isFinite(at)||at<lastMotion[source])return null;
        lastMotion[source]=at;
        if(at<ownerTime)return null;
        owner=source;ownerTime=at;return commit(source,value);
      },
      leave(source,at){
        if(!known(source)||!Number.isFinite(at)||at<lastMotion[source])return null;
        lastMotion[source]=at;
        // A late blur/leave from the other surface must not hide the active pointer.
        if(source!==owner||at<ownerTime)return null;
        ownerTime=at;return commit(source,{visible:false});
      },
      refresh(source,value,motionToken){
        // Scroll/layout updates cannot take ownership or revive a departed cursor.
        if(source!==owner||motionToken!==lastMotion[source])return null;
        return commit(source,value);
      },
      get owner(){return owner;},
      get current(){return current;}
    };
  }
  function createInbox(){
    let revision=0,current=null;
    return {
      accept(value){
        if(!Number.isSafeInteger(value?.revision)||value.revision<=revision)return false;
        revision=value.revision;current=value;return true;
      },
      get current(){return current;}
    };
  }
  function normalizeViewport(value){
    const width=Math.round(value?.width),height=Math.round(value?.height);
    return Number.isFinite(width)&&Number.isFinite(height)&&width>=280&&width<=16384&&height>=180&&height<=8640?{width,height,fullscreen:!!value.fullscreen}:null;
  }
  function viewportPoint(value,width,height){
    if(value?.mapping!=='viewport'||value.width!==width||value.height!==height)return null;
    return Number.isFinite(value.x)&&Number.isFinite(value.y)&&value.x>=0&&value.x<width&&value.y>=0&&value.y<height?{x:value.x,y:value.y}:null;
  }
  function previewFit(viewport,availableWidth){
    const normalized=normalizeViewport(viewport);
    return normalized?{...normalized,scale:Math.min(1,Math.max(1,availableWidth)/normalized.width)}:null;
  }
  return {createFlow,createInbox,normalizeViewport,viewportPoint,previewFit};
});
