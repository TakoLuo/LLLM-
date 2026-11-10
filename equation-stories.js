/* Short, deterministic equation walkthroughs evaluated by the existing numerical engines. */
(() => {
  'use strict';
  const e=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const b=p=>`<span class="i18n-unit i18n-block" data-i18n-skip><span class="i18n-en" lang="en">${e(p[1])}</span><span class="i18n-separator"> / </span><span class="i18n-zh" lang="zh-Hant">${e(p[0])}</span></span>`;
  const f=(v,n=6)=>(Math.abs(v)<.5*10**-n?0:v).toFixed(n),vec=v=>'('+v.map(x=>f(x,4)).join(', ')+')',sse=v=>v.reduce((s,x)=>s+x*x,0);
  const mark=s=>e(s).replace(/_\{([^{}]+)\}/g,'<sub><mark>$1</mark></sub>').replace(/_([A-Za-z]+)/g,'<sub>$1</sub>').replace(/\^(\d+)/g,'<sup>$1</sup>').replace(/\{([^{}]+)\}/g,'<mark>$1</mark>');
  const frame=(title,formula,numbers,meaning,loss=null)=>({title,formula,numbers,meaning,loss});
  function ksvd(){
    const af=window.ReportAlgorithmFocus,t=af.trainingTrace(),one=t.one,old=t.first,n=0;
    const local=(D,W)=>one.active.reduce((s,n)=>s+sse(one.E[n].map((v,k)=>v-D[0][k]*W[n][0])),0);
    return {fixed:['Y 始終固定；先求 W，更新 d₁ 時才固定 d₂ 及其係數。這不是完整一輪 K-SVD。','Y always stays fixed. First fit W; then hold d₂ and its codes fixed while updating d₁. This is not a full K-SVD iteration.'],frames:[
      frame(['固定 D，先算 W','Fix D, Then Fit W'],'min_{W} ‖Y − DW‖²_F',`y₁ = ${vec(af.Y[n])}\nŷ₁ = ${vec(af.Y[n].map((_,j)=>old.D.reduce((s,d,i)=>s+d[j]*old.W[n][i],0)))}\nL_train = ${f(old.error)}`,['原始量測不改；算例用 OMP 為每條光譜求係數。紫色差距是 Y 與 DW 的差。','Measured spectra stay unchanged. OMP fits codes for each spectrum; loss compares Y with DW.'],[old.error,old.error]),
      frame(['先扣除 d₂ 的貢獻','Subtract the Contribution of d₂'],'{E₁} = Y − d₂x₂',`e₁ = y₁ − d₂w₁,₂ = ${vec(one.E[n])}\nΩ₁ = {${one.active.map(i=>i+1).join(', ')}}\nL_train = ${f(old.error)}`,['只換成殘差問題，誤差還沒下降。這次只用原本使用 d₁ 的三筆樣本。','This rewrites the residual problem without reducing loss. Only the three samples already using d₁ enter this update.'],[old.error,old.error]),
      frame(['SVD 同時更新 d₁ 與活躍係數','SVD Updates d₁ and Its Active Codes'],'min_{d₁,x₁,Ω} ‖E₁,Ω − d₁x₁,Ω‖²_F',`d₁: ${vec(old.D[0])} → ${vec(one.D[0])}\nw₁,₁: ${f(old.W[n][0])} → ${f(one.W[n][0])}\nL_restricted: ${f(local(old.D,old.W))} → ${f(local(one.D,one.W))}`,['原子與相關係數一起改，固定的 Y 沒有被搬走。右邊誤差是同一批資料更新後的重建差。','Atom and active codes change together; Y does not move. The new error compares reconstruction against the same data.'],[old.error,one.error])
    ]};
  }
  function omp(){
    const af=window.ReportAlgorithmFocus,v=af.ompFrame(4),before=v.before,after=v.after,score=af.A.map((a,i)=>before.selected.includes(i)?null:Math.abs(a.reduce((s,x,j)=>s+x*before.residual[j],0)));
    return {fixed:['固定 RGB c、字典 A；示範第 2 輪，因為可直接看見舊權重也被重算。','RGB c and dictionary A stay fixed. Round 2 is shown so refitting an old weight is visible.'],frames:[
      frame(['用目前殘差選新原子','Select with the Current Residual'],'j = arg maxᵢ∉S |aᵢᵀ{r}|',`r_before = ${vec(before.residual)}\n${score.map((s,i)=>s===null?`a${i+1} ∈ S`:`score${i+1} = ${f(s)}`).join(' · ')}\nj = ${v.pending+1}`,['先挑分數最大的合格原子。這一步選編號，還沒求新係數，也不改字典。','Select the largest eligible score. This chooses an index without fitting new coefficients or changing A.'],[sse(before.residual),sse(before.residual)]),
      frame(['全部已選權重共同擬合','Jointly Refit All Selected Weights'],'w_S = arg min_{z} ‖c − A_Sz‖²₂',`${after.selected.map((id,i)=>`w${id+1}: ${f(before.selected.includes(id)?before.weights[before.selected.indexOf(id)]:0)} → ${f(after.weights[i])}`).join('\n')}\nL_RGB = ${f(sse(after.residual))}`,['新原子加入後，舊權重也重算。最小化的是三個 RGB 通道的平方差。','Adding the new atom refits old weights too. The minimized loss sums squared differences in the three RGB channels.'],[sse(before.residual),sse(after.residual)]),
      frame(['用新重建更新殘差','Update the Residual from the New Fit'],'{r_new} = c − A_Sw_S',`c = ${vec(af.target)}\nĉ = ${vec(after.estimate)}\nr_new = ${vec(after.residual)}\n‖r_new‖₂ = ${f(Math.sqrt(sse(after.residual)))}`,['下一輪用這個新殘差選擇。重新顯示殘差不會再降一次誤差，也不能證明真實光譜。','The next round uses this residual. Displaying it does not reduce loss again or establish spectral truth.'],[sse(before.residual),sse(after.residual)])
    ]};
  }
  function rgb(snapshot={atom:0,channel:0}){
    const math=window.ReportMethodFormulas.math,i=snapshot.atom,k=snapshot.channel,h=math.atoms[i],r=math.R[k],p=h.map((v,j)=>v*r[j]),channel=['R','G','B'][k];
    return {fixed:[`固定目前原子 ${i+1} 與 ${channel} 通道權重；播放時的選擇會保留為本段算例。`,`Atom ${i+1} and channel ${channel} weights are frozen from the controls when this clip starts.`],frames:[1,10,20,31].map((count,n)=>{
      const j=count-1,sum=p.slice(0,count).reduce((s,v)=>s+v,0);
      return frame([n===0?'先看一項相乘':count===31?'全部 31 項才是完整通道':'繼續加入波段貢獻',n===0?'Inspect One Product':count===31?'All 31 Terms Give the Full Channel':'Accumulate More Band Contributions'],`c_${channel}(${count}) = {Σⱼ₌₁^${count}} R_${channel},ⱼhᵢ,ⱼ`,`j = ${count} · ${math.waves[j]} nm\n${f(h[j])} × ${f(r[j])} = ${f(p[j])}\nΣⱼ₌₁…${count} R_${channel},ⱼhᵢ,ⱼ = ${f(sum)}`,count===31?['此時加完全部波段，得到一個線性通道值；不是 0–255 顯示值，也不是只取這個波長。','All bands now yield one linear channel value. This is neither a 0–255 display code nor a single-wavelength measurement.']:['每項先乘，再把已加入的項目相加。省略顯示的中間項仍全部計算，不只加畫面上的兩個數。','Multiply each pair before summing included terms. All intermediate terms are computed, including those not individually displayed.'],null);
    })};
  }
  function rmse(error=.1){
    const v=window.ReportPaperGuide.rmseModel(error),diff=v.estimate.map((x,i)=>x-v.truth[i]),total=v.squares.reduce((s,x)=>s+x,0);
    return {fixed:['固定四個合成參考值 h；使用目前滑桿的估計偏差。這是評分，不更新 D 或 w。','Four synthetic references h stay fixed; the current estimate-deviation slider is used. This scores outputs without updating D or w.'],frames:[
      frame(['逐項相減','Subtract Entrywise'],'δℓ = {ĥℓ − hℓ}',`δ = ${vec(diff)}`,['估計與真值必須在相同尺度上；這裡比較的是光譜值，不是 RGB。','Estimate and truth must share a scale. These are spectral values, not RGB.']),
      frame(['每個差值平方','Square Each Difference'],'qℓ = {δℓ²}',`q = (${v.squares.map(x=>f(x)).join(', ')})`,['正負差值平方後都非負，才不會在加總時互相抵銷。','Squaring makes both signs nonnegative, preventing cancellation in the sum.']),
      frame(['加總後除以四項','Sum and Divide by Four'],'MSE = {Σℓ qℓ / M}',`Σ qℓ = ${f(total)}\nM = 4\nMSE = ${f(v.mean)}`,['這裡才是平均平方差；不是先把差值平均再平方。','This is mean squared error, rather than the square of the mean difference.']),
      frame(['最後開根號','Take the Square Root'],'RMSE = {√MSE}',`RMSE = √${f(v.mean)} = ${f(v.rmse)}`,['開根號回到原數值尺度。這是四項範例，不是重新計算論文 Table 1。','The square root returns to the original scale. This four-entry example does not recompute paper Table 1.'])
    ]};
  }
  const atomMotionStart=3500,atomMotionEnd=7400;
  const configs=[
    {id:'ksvd',host:'paper-ksvd-walkthrough',duration:9000,cuts:[0,1600,atomMotionStart],steps:[1,2,3],title:['播放 K-SVD 動畫（9 秒）','Play K-SVD Animation (9 s)'],target:'#fr-ksvd-update',build:()=>ksvd()},
    {id:'omp',host:'paper-omp-walkthrough',duration:9000,steps:[4,5,6],title:['自動步驟：OMP 的一輪（9 秒）','Auto Advance: One OMP Round (9 s)'],target:'#fr-omp-fit',build:()=>omp()},
    {id:'rgb',host:'paper-paired-playground',duration:8000,title:['自動步驟：乘積如何加成一個通道（8 秒）','Auto Advance: Products Become One Channel (8 s)'],target:'#paper-camera-sum',build:()=>rgb(window.ReportMethodFormulas.snapshot())},
    {id:'rmse',host:'paper-rmse-playground',duration:8000,title:['自動步驟：誤差如何變成 RMSE（8 秒）','Auto Advance: Differences Become RMSE (8 s)'],target:'#paper-rmse',build:()=>rmse(Number(document.querySelector('#paper-rmse-playground [data-guide-field="error"]')?.value??.1))}
  ];
  const models=new Map();
  const chartX=x=>55+415*x,chartY=z=>216-415*z;
  function mountAtomMotion(model) {
    const {first,one}=window.ReportAlgorithmFocus.trainingTrace();
    const samples=one.active.map(n=>({n,residual:one.E[n]}));
    const angle=d=>Math.atan2(d[2],d[0]);
    const chart=document.createElement('figure');
    chart.className='eq-atom-motion';
    chart.innerHTML=`
      <div class="eq-motion-top">
        <p class="eq-motion-prompt">${b(['看青色原子 d₁ 轉向，紫線顯示各筆光譜還差多少。','Watch the teal atom d₁ rotate. Purple segments show the remaining gaps.'])}</p>
        <p class="eq-motion-error">${b(['三筆殘差的總平方差','Total squared error over three residuals'])} <strong data-motion-loss></strong></p>
      </div>
      <svg viewBox="0 0 540 253" role="img" aria-labelledby="ksvd-motion-caption">
        <defs><marker id="ksvd-motion-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path fill="#087f8c" d="M0 0L10 5L0 10z"/></marker></defs>
        <path class="eq-motion-axes" d="M55 40V216H492"/>
        <text x="56" y="28">Band 3</text><text x="481" y="241">Band 1</text>
        <line class="eq-motion-old" x1="55" y1="216" x2="${chartX(first.D[0][0])}" y2="${chartY(first.D[0][2])}"/>
        <path class="eq-motion-gap" data-motion-gaps=""/>
        <line class="eq-motion-atom" x1="55" y1="216" marker-end="url(#ksvd-motion-head)"/>
        <path class="eq-motion-fit" data-motion-fits=""/>
        ${samples.map(({n,residual})=>`<circle class="eq-motion-point" cx="${chartX(residual[0])}" cy="${chartY(residual[2])}" r="5"/><text x="${chartX(residual[0])+8}" y="${chartY(residual[2])-7}">e${n+1}</text>`).join('')}
      </svg>
      <div class="eq-motion-legend">
        <span class="eq-motion-key-old">${b(['原方向','Old direction'])}</span>
        <span class="eq-motion-key-atom">${b(['目前顯示的 d₁ 方向','Shown d₁ direction'])}</span>
        <span class="eq-motion-key-gap">${b(['重建差','Reconstruction gap'])}</span>
      </div>
      <figcaption id="ksvd-motion-caption">${b(['圖放大第 1、3 波段。深色點是扣除 d₂ 貢獻後留給 d₁ 的三筆固定資料。過場比較候選方向，SVD 一次求出最終方向。','The plot shows bands 1 and 3. The three dark points are fixed residuals after removing d₂. The motion compares directions. SVD solves for the final direction in one update.'])}</figcaption>
    `;
    model.root.querySelector('progress').after(chart);
    return {
      samples,
      before:angle(first.D[0]),
      after:angle(one.D[0]),
      atom:chart.querySelector('.eq-motion-atom'),
      gaps:chart.querySelector('[data-motion-gaps]'),
      fits:chart.querySelector('[data-motion-fits]'),
      loss:chart.querySelector('[data-motion-loss]')
    };
  }
  function drawAtomMotion(m) {
    const {samples,before,after,atom,gaps,fits,loss}=m.motion;
    const t=Math.max(0,Math.min(1,(m.elapsed-atomMotionStart)/(atomMotionEnd-atomMotionStart)));
    const theta=before+(after-before)*(t*t*(3-2*t));
    const x=Math.cos(theta),z=Math.sin(theta);
    atom.setAttribute('x2',chartX(x));
    atom.setAttribute('y2',chartY(z));
    let error=0;
    const segments=[],feet=[];
    for(const {residual:[band1,band2,band3]} of samples){
      const weight=band1*x+band3*z,fitX=weight*x,fitZ=weight*z;
      segments.push(`M${chartX(band1)} ${chartY(band3)}L${chartX(fitX)} ${chartY(fitZ)}`);
      feet.push(`M${chartX(fitX)} ${chartY(fitZ)}h0`);
      error+=(band1-fitX)**2+band2**2+(band3-fitZ)**2;
    }
    gaps.setAttribute('d',segments.join(' '));
    fits.setAttribute('d',feet.join(' '));
    loss.textContent=f(error);
  }
  const frameIndex=m=>m.cfg.cuts
    ? m.cfg.cuts.findLastIndex(cut=>m.elapsed>=cut)
    : Math.min(m.payload.frames.length-1,Math.floor(m.elapsed/(m.cfg.duration/m.payload.frames.length)));
  function stop(m){clearInterval(m.timer);m.timer=null;}
  function draw(m){
    const seq=m.payload.frames,index=frameIndex(m),v=seq[index];m.frame=index;
    if(m.root.open&&m.cfg.steps&&m.focus!==index){window.ReportAlgorithmFocus.showStep(m.cfg.id,m.cfg.steps[index]);m.focus=index;}
    m.scene.innerHTML=`<p class="eq-film-fixed">${b(m.payload.fixed)}</p><h4>${b(v.title)}</h4><div class="eq-expression">${mark(v.formula)}</div><pre class="eq-film-numbers">${e(v.numbers)}</pre>${v.loss?`<div class="eq-film-loss"><strong>${m.cfg.id==='ksvd'?'L_train':'L_RGB'}</strong><span>${b(['更新前平方差','Squared Error before Update'])}<strong>${f(v.loss[0])}</strong></span><span>${b(['此步平方差','Squared Error at This Step'])}<strong>${f(v.loss[1])}</strong></span><div class="eq-loss-track"><i style="width:${v.loss[0]>0?Math.max(0,Math.min(100,v.loss[1]/v.loss[0]*100)):0}%"></i></div></div>`:''}<p>${b(v.meaning)}</p>`;
    m.root.querySelectorAll('[data-eq-frame]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.eqFrame)===index)));
    m.root.querySelector('[data-eq-action="play"]').innerHTML=b(m.timer||m.remotePlaying?['暫停','Pause']:m.elapsed>=m.cfg.duration?['再播放','Play Again']:['播放','Play']);
    m.root.querySelector('[data-eq-action="prev"]').disabled=index===0;m.root.querySelector('[data-eq-action="next"]').disabled=index===seq.length-1;
    progress(m);
  }
  function progress(m){const p=m.root.querySelector('progress');p.value=m.elapsed/m.cfg.duration;m.root.querySelector('.eq-film-clock').textContent=`${(m.elapsed/1000).toFixed(1)} / ${m.cfg.duration/1000} s`;if(m.motion)drawAtomMotion(m);}
  function pause(m){if(m.timer)m.elapsed=Math.min(m.cfg.duration,m.elapsed+Math.max(0,performance.now()-m.tick));stop(m);draw(m);}
  function startClock(m,remote=false){m.tick=performance.now();m.timer=setInterval(()=>{
    if(document.hidden||m.root.closest('.chapter')?.hidden||!m.root.open){m.remotePlaying=false;pause(m);if(!remote)window.ReportProjection?.notify();return;}
    const now=performance.now();m.elapsed=Math.min(m.cfg.duration,m.elapsed+now-m.tick);m.tick=now;
    if(m.elapsed>=m.cfg.duration){m.remotePlaying=false;stop(m);}
    if(frameIndex(m)!==m.frame||!m.timer){draw(m);if(!remote)window.ReportProjection?.notify();}else progress(m);
  },m.motion?1000/30:80);}
  function play(m){if(m.elapsed>=m.cfg.duration){m.elapsed=0;m.payload=m.cfg.build();}startClock(m);draw(m);}
  function initialize(){
    for(const cfg of configs){const host=document.getElementById(cfg.host);if(!host)throw new Error('Missing animation host '+cfg.host);const root=document.createElement('details');root.className='eq-film';root.id=`equation-film-${cfg.id}`;root.dataset.i18nSkip='';root.innerHTML=`<summary>${b(cfg.title)}</summary><div class="eq-film-toolbar"><button type="button" data-eq-action="play"></button><button type="button" data-eq-action="prev">${b(['上一步','Previous'])}</button><button type="button" data-eq-action="next">${b(['下一步','Next'])}</button><button type="button" data-eq-action="replay">${b(['從頭重播','Replay from Start'])}</button><output class="eq-film-clock"></output></div><progress max="1" value="0" aria-label="Animation progress"></progress><div class="eq-film-steps"></div><div class="eq-film-scene" aria-live="polite"></div><a href="${cfg.target}">${b(['對照本段完整公式 ↑','Open the Full Equation ↑'])}</a><p class="eq-film-note">${b(['與本頁相同數值引擎的合成算例；黃色標示本步正在處理的公式項目。可暫停或逐步查看，播放不會改寫原始量測。','Synthetic example from the same numerical engines as this page. Yellow highlights the current equation term. Pause or step through it; playback does not modify measured data.'])}</p>`;
      if(cfg.steps)root.querySelector('.eq-film-note').insertAdjacentHTML('afterbegin',`<strong>${b(['收起播放器後可回到三維圖，手動逐步查看。','Collapse the player to return to the manual 3D walkthrough.'])}</strong><br>`);
      const anchor=host.querySelector(':scope > .pa-catalog')||host.querySelector(':scope > header');anchor.after(root);
      const m={cfg,root,scene:root.querySelector('.eq-film-scene'),elapsed:0,frame:0,payload:cfg.build(),timer:null,tick:0};models.set(cfg.id,m);
      if(cfg.id==='ksvd'){
        root.classList.add('eq-film-motion');
        const summary=root.querySelector('summary');
        summary.innerHTML=`<span class="eq-motion-open">${b(cfg.title)}</span><span class="eq-motion-close">${b(['收起動畫，回到三維圖','Close Animation and Return to the 3D Plot'])}</span>`;
        root.querySelector('.eq-film-clock').before(root.querySelector('.eq-film-steps'));
        m.motion=mountAtomMotion(m);
      }
      root.querySelector('.eq-film-steps').innerHTML=m.payload.frames.map((v,i)=>`<button type="button" data-eq-frame="${i}" aria-label="${e(v.title[1])}">${i+1}</button>`).join('');
      root.addEventListener('click',event=>{
        if(m.motion&&!root.open&&event.target.closest('summary')){
          event.preventDefault();
          root.open=true;
          m.elapsed=0;
          play(m);
          window.ReportProjection?.notify();
          return;
        }
        const el=event.target.closest('[data-eq-action],[data-eq-frame]');if(!el)return;
        m.remotePlaying=false;
        const action=el.dataset.eqAction;
        if(action==='play'){
          if(m.timer)pause(m);else play(m);
        }else{
          pause(m);
          if(action==='replay'){
            m.elapsed=0;
            m.payload=cfg.build();
            play(m);
          }else{
            const requested=el.dataset.eqFrame!==undefined?Number(el.dataset.eqFrame):m.frame+(action==='next'?1:-1);
            const index=Math.max(0,Math.min(m.payload.frames.length-1,requested));
            m.elapsed=m.motion&&index===2?atomMotionEnd:cfg.cuts?.[index]??index*cfg.duration/m.payload.frames.length;
            draw(m);
          }
        }
        window.ReportProjection?.notify();
      });
      root.addEventListener('toggle',()=>{if(!root.open)pause(m);else{m.focus=null;if(!m.timer&&m.elapsed===0)m.payload=cfg.build();draw(m);if(!window.ReportProjection?.isAudience){const top=root.getBoundingClientRect().top;if(top>32||top<0)window.scrollBy({top:top-14,behavior:'instant'});}}window.ReportProjection?.notify();});
      host.addEventListener('click',event=>{if(event.target.closest('.eq-film'))return;if(event.target.closest('[data-mf-atom],[data-mf-action]')){pause(m);m.elapsed=0;m.payload=cfg.build();draw(m);}});
      host.addEventListener('input',event=>{if(event.target.closest('.eq-film'))return;pause(m);m.elapsed=0;m.payload=cfg.build();draw(m);});
      window.ReportProjection?.register(`equation-film:${cfg.id}`,{
        get:()=>({elapsed:m.elapsed,open:root.open,payload:m.payload,playing:!!m.timer}),
        set:s=>{
          stop(m);
          m.remotePlaying=!!s.playing;
          m.elapsed=Math.max(0,Math.min(cfg.duration,Number(s.elapsed)||0));
          if(s.payload?.frames?.length===m.payload.frames.length)m.payload=s.payload;
          root.open=!!s.open;
          if(m.motion&&root.open&&m.remotePlaying&&m.elapsed<cfg.duration)startClock(m,true);
          draw(m);
        }
      });
      draw(m);
    }
    document.addEventListener('reportlanguagechange',()=>models.forEach(draw));
    window.addEventListener('hashchange',()=>models.forEach(pause));document.addEventListener('visibilitychange',()=>{if(document.hidden)models.forEach(pause);});
  }
  window.ReportEquationStories={configs,ksvd,omp,rgb,rmse,initialize};initialize();
})();
