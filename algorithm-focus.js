/* Two independent, numerically evaluated lessons; the paper's full equations remain available. */
(() => {
  'use strict';
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const b=p=>`<span class="i18n-unit i18n-block" data-i18n-skip><span class="i18n-en" lang="en">${esc(p[1])}</span><span class="i18n-separator" aria-hidden="true"> / </span><span class="i18n-zh" lang="zh-Hant">${esc(p[0])}</span></span>`;
  const t=p=>document.documentElement.dataset.language==='zh'?p[0]:p[1];
  const fmt=(v,n=4)=>Math.abs(v)<.5*10**(-n)?(0).toFixed(n):v.toFixed(n);
  const vec=v=>`(${v.map(x=>fmt(x,3)).join(', ')})`;
  const dot=(a,c)=>a.reduce((s,x,i)=>s+x*c[i],0),norm=a=>Math.sqrt(dot(a,a)),scale=(a,s)=>a.map(x=>x*s),minus=(a,c)=>a.map((x,i)=>x-c[i]);
  const clone=x=>JSON.parse(JSON.stringify(x));
  const Y=[[.8,.4,.2],[.6,.3,.25],[.1,.7,.05],[0,.8,0]],D0=[[1,0,0],[0,1,0]];
  const estimate=(D,w)=>[0,1,2].map(k=>D.reduce((s,d,j)=>s+d[k]*w[j],0));
  function codes(D){
    return Y.map(y=>{
      let selected=[],residual=[...y],fit={weights:[],estimate:[0,0,0]};
      for(let step=0;step<2&&norm(residual)>1e-10;step++){
        const eligible=D.map((d,j)=>({j,score:Math.abs(dot(d,residual))/norm(d)})).filter(x=>!selected.includes(x.j)).sort((a,c)=>c.score-a.score);
        let chosen=null;for(const item of eligible){const candidate=[...selected,item.j],f=window.ReportConcepts.math.fit(candidate.map(j=>D[j]),y);if(f){chosen={candidate,f};break;}}
        if(!chosen)break;selected=chosen.candidate;fit=chosen.f;residual=fit.residual;
      }
      return D.map((_,j)=>{const k=selected.indexOf(j);return k<0?0:fit.weights[k];});
    });
  }
  const error=(D,W)=>Y.reduce((sum,y,i)=>{const r=minus(y,estimate(D,W[i]));return sum+dot(r,r);},0);
  function update(D,W,j){
    const E=Y.map((y,n)=>y.map((x,k)=>x-D.reduce((sum,d,i)=>i===j?sum:sum+d[k]*W[n][i],0)));
    const active=W.map((w,i)=>Math.abs(w[j])>1e-9?i:-1).filter(i=>i>=0);
    const C=[0,1,2].map(a=>[0,1,2].map(c=>active.reduce((sum,i)=>sum+E[i][a]*E[i][c],0)));
    let direction=[...D[j]];
    // Dominant left singular direction from E E^T; unique leading value in this fixed example.
    for(let n=0;n<120;n++){const next=C.map(row=>dot(row,direction)),length=norm(next);if(length<1e-14)break;direction=scale(next,1/length);}
    if(dot(direction,D[j])<0)direction=scale(direction,-1);
    const nextD=clone(D),nextW=clone(W);nextD[j]=direction;active.forEach(i=>{nextW[i][j]=dot(direction,E[i]);});
    return {D:nextD,W:nextW,E,active,error:error(nextD,nextW)};
  }
  function trainingTrace(){
    const D=clone(D0),W=codes(D),first={D,W,error:error(D,W)},one=update(D,W,0),two=update(one.D,one.W,1),recoded={D:clone(two.D),W:codes(two.D)};recoded.error=error(recoded.D,recoded.W);
    return {first,one,two,recoded};
  }
  const rawA=[[.72,.35,.18],[.48,.55,.34],[.18,.42,.73],[.66,.51,.24]],A=rawA.map(a=>scale(a,1/norm(a))),target=[.62,.46,.28];
  const kStages=[
    [['先認識固定資料與起始原子','Meet the Fixed Data and Initial Atoms'],['已知四條量測光譜 Y，每條先用三個波段表示。起始原子 d₁=(1,0,0)、d₂=(0,1,0) 都沒有第三波段，因此無法完整解釋前三條量測。這裡尚未找權重。','Four measured spectra Y each have three bands. Initial atoms d₁=(1,0,0) and d₂=(0,1,0) have no third-band component, so they cannot fully explain the first three samples. No weights have been fitted yet.']],
    [['1. 固定 D，用 OMP 找係數 W','1. Fix D and Find W with OMP'],['每筆光譜最多用兩個原子。本例 y₁≈0.8d₁+0.4d₂=(0.8,0.4,0)，與 y₁=(0.8,0.4,0.2) 還差第三波段 0.2。四筆資料的平方差加總為 0.105。原始 Y 沒有被改寫。','Each sample uses at most two atoms. Here y₁≈0.8d₁+0.4d₂=(0.8,0.4,0), still missing 0.2 in band 3. Squared errors over all four samples sum to 0.105. Measured Y has not changed.']],
    [['2. 更新 d₁ 前，先扣除 d₂','2. Subtract d₂ before Updating d₁'],['d₂ 與它的係數先固定。對 y₁ 扣掉 0.4d₂，留下 e₁=(0.8,0,0.2)。同樣處理其他樣本，但 SVD 只使用原本用到 d₁ 的樣本 1、2、3；樣本 4 不加入這次更新。','Hold d₂ and its coefficients fixed. Subtract 0.4d₂ from y₁ to leave e₁=(0.8,0,0.2). Do this for every sample, but use only samples 1, 2, and 3, which already use d₁, in the SVD update. Sample 4 is excluded.']],
    [['3. SVD 同時改 d₁ 與活躍係數','3. SVD Updates d₁ and Its Active Coefficients'],['三筆受限殘差不完全平行。SVD 找出一個共同單位方向，再給各筆不同倍率，讓這部分的總平方差最小。新 d₁ 因而有第三波段；它不是把量測點搬走，而是改變重建素材的方向。d₂ 及其係數仍不變。','The three restricted residuals are not exactly parallel. SVD finds a shared unit direction and sample-specific scales minimizing their squared error. The new d₁ has a third-band component. Measurements do not move; a reconstruction ingredient changes direction. d₂ and its coefficients remain unchanged.']],
    [['4. 再更新 d₂，完成一次迭代','4. Update d₂ to Complete One Iteration'],['現在固定剛更新的 d₁ 及其係數，扣掉它的貢獻，再更新 d₂ 及其活躍係數。稀疏編碼一次、逐原子更新一輪，才算這裡的一次 K-SVD 迭代，不是只轉動一個原子。','Now hold the updated d₁ and its coefficients fixed, subtract its contribution, and update d₂ with its active coefficients. One sparse-coding phase plus a sweep through all atoms forms one K-SVD iteration here—not one turn of a single atom.']],
    [['5. 下一次迭代重新找係數','5. Start the Next Iteration by Recoding'],['用改良後的固定字典，讓 OMP 再找一次各筆係數。這時允許重新選原子名單；SVD 更新時則只改既有活躍係數。Y 始終相同，原子與係數繼續輪流改良。這不保證找到所有可能字典中的全域最佳。','Use OMP to recode with the improved fixed dictionary. Sparse coding can choose new supports; SVD updates only existing active coefficients. Y remains the same while atoms and codes alternate. This does not guarantee a globally optimal dictionary.']]
  ];
  const instances=[];
  const pairTable=(headers,rows)=>`<div class="paper-table-scroll af-table"><table><thead><tr>${headers.map(x=>`<th scope="col">${b(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const chip=(label,kind='fixed')=>`<span class="af-chip af-${kind}">${b(label)}</span>`;
  function graph(D,reference,{rgb=false,current=null}={}){
    const origin=[54,260],p=v=>[54+170*v[0]+92*v[1],260-55*v[1]-175*v[2]],labels=[];
    const line=(v,color,dash='',label='')=>{const q=p(v);if(label)labels.push({point:q,label,color});return `<path d="M${origin.join(' ')} L${q.join(' ')}" fill="none" stroke="${color}" stroke-width="3" ${dash?'stroke-dasharray="5 5"':''}/><circle cx="${q[0]}" cy="${q[1]}" r="4" fill="${color}"/>`;};
    let svg=[0,1,2].map((_,i)=>{const axis=[0,0,0];axis[i]=1.12;return line(axis,'#a9b8c1','',rgb?['R','G','B'][i]:['Band 1','Band 2','Band 3'][i]);}).join('');
    if(rgb){D.forEach((d,i)=>{svg+=line(scale(d,.8),'#94aab5','',`a${i+1}`);});svg+=line(reference[0],'#c77725','', 'c');if(current){svg+=line(current,'#008896','','ĉ');const q=p(current),end=p(reference[0]);svg+=`<path d="M${q.join(' ')}L${end.join(' ')}" stroke="#7652a8" stroke-width="4" stroke-dasharray="5 4"/>`;}}
    else {svg+=line(D0[0],'#bac5cb','dash','old d₁');D.forEach((d,i)=>{svg+=line(d,['#008896','#a56521'][i],'',`d${i+1}`);});reference.forEach((v,i)=>{const q=p(v);svg+=`<circle cx="${q[0]}" cy="${q[1]}" r="5" fill="#233c59"/>`;labels.push({point:q,label:`y${i+1}`,color:'#233c59'});});}
    const occupied=[];
    for(const {point:[x,y],label,color} of labels){
      const width=label.length*7.5,height=15,offsets=[[8,-10],[8,22],[-width-8,-10],[-width-8,22],[8,-32],[8,44],[-width-8,-32]];
      const boxes=offsets.map(([dx,dy])=>({x:x+dx,y:y+dy-height,w:width,h:height}));
      const box=boxes.find(r=>r.x>=3&&r.x+r.w<=397&&r.y>=3&&r.y+r.h<=300&&!occupied.some(o=>r.x<o.x+o.w+4&&r.x+r.w+4>o.x&&r.y<o.y+o.h+4&&r.y+r.h+4>o.y))||boxes.at(-1);occupied.push(box);
      svg+=`<text x="${box.x}" y="${box.y+height}" fill="${color}">${label}</text>`;
    }
    return `<figure class="af-graph"><svg viewBox="0 0 400 305" role="img" aria-label="${esc(t(rgb?['RGB 三維向量斜投影','Oblique View of 3D RGB Vectors']:['三波段向量的三維斜投影；原子是從原點出發的方向','Oblique View of Three-Band Vectors; Atoms Are Directions from the Origin']))}">${svg}</svg><figcaption>${b(rgb?['橘色 c 固定；青色 ĉ 是重建，紫色虛線是殘差。灰色候選方向為了排版縮短，計算使用表列的單位向量。','Orange c stays fixed; teal ĉ is the fit, and the purple dashed line is the residual. Gray candidate arrows are shortened for display; computation uses the listed unit vectors.']:['深色點是固定的量測 y；實線 d 是從原點出發的原子向量，灰虛線為舊 d₁。斜投影不保留螢幕上的角度，精確數值以表格為準。','Dark dots are fixed measured y values. Solid d arrows are atom vectors from the origin; dashed gray is old d₁. Screen angles are distorted by the oblique view; tables give exact values.'])}</figcaption></figure>`;
  }
  const action=(key,label,disabled=false)=>`<button type="button" data-af-action="${key}" ${disabled?'disabled':''}>${b(label)}</button>`;
  const controls=m=>`<div class="af-controls">${action('prev',['上一步','Previous'],m.state.step===0)}${action('next',['下一步','Next'],m.state.step===m.max)}${action('play',m.timer?['暫停','Pause']:['播放步驟','Play Steps'])}${action('reset',['重設算例','Reset Example'])}<span>${m.state.step+1} / ${m.max+1}</span></div>`;
  function ksvdView(m){
    const step=m.state.step,trace=trainingTrace(),snap=step<=2?trace.first:step===3?trace.one:step===4?trace.two:trace.recoded;
    const n=m.state.sample,y=Y[n],w=snap.W[n],approx=estimate(snap.D,w),r=minus(y,approx),stage=kStages[step];
    const freeze=step===0?[chip(['固定量測 Y','Fixed Measurements Y'])]:step===1||step===5?[chip(['固定 Y 與 D','Y and D Fixed']),chip(['求 W','Fit W'],'changing')]:step===2?[chip(['固定 Y、d₂ 與其係數','Y, d₂, and Its Coefficients Fixed']),chip(['分離 E₁，尚未更新','Isolate E₁; No Update Yet'],'changing')]:step===3?[chip(['固定 Y、d₂ 與其係數','Y, d₂, and Its Coefficients Fixed']),chip(['更新 d₁ 與活躍係數','Update d₁ and Active Coefficients'],'changing')]:[chip(['固定 Y、d₁ 與其係數','Y, d₁, and Its Coefficients Fixed']),chip(['更新 d₂ 與活躍係數','Update d₂ and Active Coefficients'],'changing')];
    let detail='';
    if(step===0)detail=pairTable([['固定訓練樣本','Fixed Training Sample'],['三波段數值','Three-Band Values']],Y.map((v,i)=>[`y${i+1}`,vec(v)]));
    else if(step===2){const other=scale(trace.first.D[1],trace.first.W[n][1]);detail=`<div class="af-calculation"><p>e₁ = y − d₂x₂</p><p>${vec(y)} − ${vec(other)} = <strong>${vec(trace.one.E[n])}</strong></p><p>${b(n===3?['樣本 4 的 d₁ 係數原本為 0，因此此欄不放入 E₁^Ω 的 SVD。','Sample 4 originally has zero d₁ coefficient, so this column is excluded from the SVD of E₁^Ω.']:['這筆原本有用到 d₁，所以此欄納入 E₁^Ω 的 SVD。','This sample already uses d₁, so its column enters the SVD of E₁^Ω.'])}</p></div>`;}
    else detail=`<div class="af-calculation"><p>${b(['本筆重建：每個原子都乘自己的係數','Sample Reconstruction: Each Atom Has Its Own Coefficient'])}</p><p>ŷ${n+1} = ${fmt(w[0])}d₁ + ${fmt(w[1])}d₂ = ${vec(approx)}</p><p>y${n+1} − ŷ${n+1} = ${vec(r)}</p><p>${b(['本筆平方差','Sample Squared Error'])} = ${fmt(dot(r,r),6)}</p></div>`;
    if(step===3||step===4){
      const j=step===3?0:1,previous=step===3?trace.first:trace.one;
      detail=`<h4>${b(['這次更新，舊值與新值差在哪裡？','What Changed in This Atom Update?'])}</h4>`+pairTable([['項目','Item'],['更新前','Before'],['更新後','After']],[[`d${j+1}`,vec(previous.D[j]),vec(snap.D[j])],[`y${n+1}: w${j+1}`,fmt(previous.W[n][j]),fmt(snap.W[n][j])],[`d${2-j} ${b(['（固定）','(Fixed)'])}`,vec(previous.D[1-j]),vec(snap.D[1-j])]])+detail;
    }
    if(step===5)detail=`<p class="af-role">${b(['本例重新編碼後的總誤差幾乎相同，表示已接近穩定，不是按鈕失效。交替最佳化不保證每一步都嚴格下降；實際訓練還需要停止條件。','Recoding leaves almost the same total error in this example: it is nearly stable, not a broken control. Alternating optimization does not guarantee a strict decrease at every step; training also needs a stopping condition.'])}</p>`+detail;
    return `${controls(m)}<div class="af-steps">${kStages.map((s,i)=>`<button type="button" data-af-action="stage" data-af-step="${i}" aria-pressed="${i===step}">${b(s[0])}</button>`).join('')}</div><div class="af-locks">${freeze.join('')}</div><section class="af-explain" role="status"><h4>${b(stage[0])}</h4><p>${b(stage[1])}</p></section><div class="af-two-columns">${graph(step===0?D0:snap.D,Y)}<div><h4>${b(['現在的字典 D','Current Dictionary D'])}</h4>${pairTable([['原子','Atom'],['目前完整向量','Current Complete Vector']],[['d₁',vec(snap.D[0])],['d₂',vec(snap.D[1])]])}<div class="af-error"><span>${b(['四筆總平方差（不是 RMSE）','Total Squared Error over Four Samples (Not RMSE)'])}</span><strong>${step===0?b(['尚未編碼','Not Yet Coded']):fmt(snap.error,6)}</strong><small>${b(['初次編碼：0.105000；Y 全程不變。','After First Coding: 0.105000; Y Never Changes.'])}</small></div></div></div><label class="af-sample" for="${m.id}-sample">${b(['查看同一訓練集合中的哪筆樣本？','Which Sample from the Same Training Set?'])}<select id="${m.id}-sample" data-af-field="sample">${Y.map((y,i)=>`<option value="${i}" ${n===i?'selected':''}>y${i+1} = ${vec(y)}</option>`).join('')}</select></label>${detail}${step>=1?pairTable([['樣本','Sample'],['d₁ 係數','d₁ Coefficient'],['d₂ 係數','d₂ Coefficient']],snap.W.map((w,i)=>[`y${i+1}`,fmt(w[0]),fmt(w[1])])):''}<p class="af-boundary">${b(['本例：3 波段、2 原子、4 條合成光譜、最多 2 個非零係數。它不是過完備字典，也不是論文實測；只縮小數字來示範真正的稀疏編碼與秩一更新。論文用 31 波段、500 原子。','Example: 3 bands, 2 atoms, 4 synthetic spectra, at most 2 nonzero coefficients. It is not an overcomplete dictionary or measured paper data; it demonstrates actual sparse coding and rank-one updates at small scale. The paper uses 31 bands and 500 atoms.'])}</p>`;
  }
  function ompFrame(step){
    const trace=window.ReportConcepts.math.omp(3);
    if(step===0)return {round:0,phase:'initial',before:trace[0],shown:trace[0],pending:null,trace};
    const round=Math.ceil(step/3),phase=['select','fit','residual'][(step-1)%3],before=trace[round-1],after=trace[round];
    return {round,phase,before,shown:phase==='select'?before:after,pending:after.selected.at(-1),after,trace};
  }
  function ompView(m){
    const step=m.state.step,v=ompFrame(step),s=v.shown,old=v.before,score=A.map(a=>Math.abs(dot(a,old.residual))),fullWeights=state=>A.map((_,i)=>{const j=state.selected.indexOf(i);return j<0?0:state.weights[j];}),w=fullWeights(s),oldW=fullWeights(old);
    const title=v.phase==='initial'?['起點：字典與 RGB 已知，係數未知','Start: Dictionary and RGB Known, Coefficients Unknown']:v.phase==='select'?[`第 ${v.round} 輪：選原子 ${v.pending+1}`,`Round ${v.round}: Select Atom ${v.pending+1}`]:v.phase==='fit'?[`第 ${v.round} 輪：全部已選係數共同重算`,`Round ${v.round}: Refit All Selected Coefficients`]:step===9?['殘差近零：停止，但不等於光譜已證實','Residual Near Zero: Stop, but Spectral Truth Is Unproven']:[`第 ${v.round} 輪：更新殘差`,`Round ${v.round}: Update the Residual`];
    const explanation=v.phase==='initial'?['固定 A 與輸入 c=(0.620,0.460,0.280)。初始沒有選原子，重建 ĉ=(0,0,0)，因此殘差 r=c。下一步先看相關性，不是調整字典。','Fix A and input c=(0.620,0.460,0.280). No atoms are selected, ĉ=(0,0,0), and residual r=c. Next compare alignments; do not change the dictionary.']:v.phase==='select'?[`用目前殘差 r 與每個尚未選過的單位原子做內積，取絕對值。原子 ${v.pending+1} 的分數最大，加入候選集合；這一步先不改係數。不是每次都拿最初的 c 重新排名。`,`Take absolute inner products between the current residual r and eligible unit atoms. Atom ${v.pending+1} has the largest score and joins the selected set; coefficients are not changed in this selection substep. Later rounds do not rank against the original c.`]:v.phase==='fit'?['現在固定已選集合，最小化 RGB 平方差，重算這些原子的全部係數。加入新原子後，舊係數通常也要改；不能只加上一個倍率就結束。下表直接對照舊值與新值。','With the selected set fixed, minimize squared RGB error and refit every selected coefficient. Adding a new atom generally changes old coefficients too; do not merely append one scale. Compare old and new values below.']:step===9?['本算例以三個獨立方向得到近零 RGB 殘差。這只是這組字典與輸入的計算結果，不是所有 OMP 都固定三步，也不是高光譜準確度證明。真實應依誤差門檻、原子預算與有效方向停止。','This dictionary and input reach near-zero RGB residual using three independent directions. It is not a universal three-step OMP rule or proof of spectral accuracy. Stop according to error tolerance, atom budget, and eligible directions.']:['用固定的輸入 c 減掉現在的共同重建 ĉ，得到新的 r。下一輪會根據這個新 r 選原子；它不是另一個未知真實光譜。','Subtract the current joint fit ĉ from fixed c to obtain the new r. The next round selects against this r. The residual is not an unknown true spectrum.'];
    const selected=v.phase==='select'?[...s.selected,v.pending]:s.selected;
    return `${controls(m)}<div class="af-rounds">${[['初始','Initial'],['第 1 輪','Round 1'],['第 2 輪','Round 2'],['第 3 輪','Round 3']].map((p,i)=>`<button type="button" data-af-action="stage" data-af-step="${i===0?0:1+(i-1)*3}" aria-pressed="${v.round===i}">${b(p)}</button>`).join('')}</div><div class="af-locks">${chip(['固定字典 A','Dictionary A Fixed'])}${chip(['固定 RGB 輸入 c','Input RGB c Fixed'])}${chip(v.phase==='select'?['選原子編號','Select an Index']:v.phase==='fit'?['重算所有已選係數','Refit All Selected Weights']:['讀取殘差','Inspect Residual'],'changing')}</div><section class="af-explain" role="status"><h4>${b(title)}</h4><p>${b(explanation)}</p></section><div class="af-formula">${v.phase==='select'?'scoreᵢ = |aᵢᵀr|':v.phase==='fit'?'w_S = arg min_z ‖c − A_Sz‖₂²':'r = c − ĉ'}</div>${pairTable([['原子','Atom'],['本輪選擇前分數','Score before This Round’s Selection'],['上一輪係數','Previous-Round Weight'],['現在係數','Current Weight']],A.map((a,i)=>[`${i+1}${selected.includes(i)?' ✓':''}${v.phase==='select'&&i===v.pending?' ←':''}`,old.selected.includes(i)?b(['已選，不再參選','Selected; Ineligible']):fmt(score[i]),fmt(oldW[i]),fmt(w[i])]))}<div class="af-two-columns">${graph(A,[target],{rgb:true,current:s.estimate})}<div class="af-calculation"><p>${b(['固定輸入','Fixed Input'])}: c = ${vec(target)}</p><p>${b(['現在重建','Current Fit'])}: ĉ = ${vec(s.estimate)}</p><p>${b(['剩餘差值','Remaining Difference'])}: r = ${vec(s.residual)}</p><p>‖r‖₂ = <strong>${fmt(norm(s.residual),6)}</strong></p><p>${b(['已選順序','Selection Order'])}: ${selected.map(i=>i+1).join(' → ')||'—'}</p>${v.phase==='select'?`<p>${b(['新原子的係數要到下一步才計算，所以上表暫時仍為 0。','The new coefficient is fitted in the next substep, so its table value remains zero for now.'])}</p>`:''}</div></div><details class="af-data"><summary>${b(['展開固定 A 的四個單位向量與精確分數','Inspect the Four Fixed Unit Vectors and Score Definition'])}</summary>${pairTable([['原子','Atom'],['本例計算使用的向量','Vector Used in This Example']],A.map((a,i)=>[`a${i+1}`,vec(a)]))}<p>${b(['本例 A 直接定義成這四個單位向量，所以分數是 |aᵢᵀr|。若原子長度不同，選擇分數需除以原子長度；係數轉移也必須保留配對字典的尺度。權重不必加總為 1。','A is defined here as these four unit vectors, so scores are |aᵢᵀr|. Unequal-length atoms need score normalization; coefficient transfer must preserve paired-dictionary scaling. Weights need not sum to one.'])}</p></details><p class="af-boundary">${b(['此處實際計算 OMP 的小型三維例子；4 → 3 → 1 只屬於這組固定資料。不是作者 500 原子字典的實驗結果，且此處沒有使用未知高光譜真值。','An actually computed small 3D OMP example. The order 4 → 3 → 1 belongs to this fixed data only. It is not a result from the authors’ 500-atom dictionary, and no unknown spectral truth is used here.'])}</p>`;
  }
  function stop(m){clearInterval(m.timer);m.timer=null;}
  function render(m){m.root.dataset.afStep=String(m.state.step);m.root.innerHTML=m.kind==='ksvd'?ksvdView(m):ompView(m);m.root.querySelector('.af-explain').insertAdjacentHTML('afterend',window.ReportFormulaReading?.algorithmState(m)||'');}
  function mount(kind){
    const page=document.getElementById(`paper-${kind}`),body=page.querySelector('.paper-body'),details=document.createElement('details');details.className='af-reference';details.id=`paper-${kind}-reference`;details.dataset.i18nSkip='';
    details.innerHTML=`<summary>${b(['進階：完整公式、符號表與其他觀察','Advanced: Full Equations, Symbols, and Other Views'])}</summary><div class="af-reference-body"></div>`;details.lastElementChild.append(...body.childNodes);body.append(details);
    const section=document.createElement('section');section.id=`paper-${kind}-walkthrough`;section.className='paper-playground af-lesson';section.dataset.i18nSkip='';
    const intro=kind==='ksvd'?['K-SVD：從固定光譜學習字典','K-SVD: Learn a Dictionary from Fixed Spectra']:['OMP：在固定字典中估計稀疏係數','OMP: Estimate Sparse Coefficients in a Fixed Dictionary'];
    const mission=kind==='ksvd'?['已知訓練光譜 Y；要學字典 D 與訓練係數 W。本例用 3 波段、2 原子、4 條合成光譜走完一次迭代，不是論文 31 波段、500 原子的實測結果。','Given training spectra Y, learn dictionary D and training codes W. This synthetic example completes an iteration with 3 bands, 2 atoms, and 4 spectra; it is not a measured result from the paper’s 31-band, 500-atom setting.']:['已知字典 A 與新像素 RGB；只找係數，不改原子。這是 4 個合成候選的三維算例，不是論文的 500 原子實驗；每輪拆成三個可分開講解的步驟。','Given dictionary A and a new RGB pixel, fit coefficients without changing atoms. This 3D example has 4 synthetic candidates, not the paper’s 500-atom experiment. Each round has three explainable substeps.'];
    const role=kind==='ksvd'?['K-SVD 的稀疏編碼可以使用 OMP，本例也採用 OMP；後面的字典更新則不是 OMP。本文的 K-SVD 任務是在準備階段學習高光譜字典。','K-SVD can use OMP for sparse coding, as this example does; the subsequent dictionary update is not OMP. In the paper, K-SVD learns the spectral dictionary during preparation.']:['相同 OMP 原理也可在 K-SVD 裡處理訓練光譜；此頁則在 RGB 空間處理新像素。字典學習與新像素係數估計，不是同一個任務。','The same OMP principle can code training spectra inside K-SVD. This page instead fits a new pixel in RGB space. Dictionary learning and query-pixel coding are distinct tasks.'];
    const takeaway=kind==='ksvd'?['講解重點：量測 Y 一直不變；字典 D 與係數 W 輪流改良，讓少數原子的組合更接近訓練資料。','Presentation takeaway: measured Y never changes. D and W alternate improvements so combinations of few atoms better approximate the training data.']:['講解重點：固定字典，用現在的殘差選原子；加入後重算所有已選權重，再更新殘差。','Presentation takeaway: fix the dictionary, select against the current residual, refit all selected weights, then update the residual.'];
    const bridge=kind==='ksvd'?['本頁放大「學字典」這一步，改用 3 個波段讓每個數都看得見。這裡學到的 2 個原子不會替換核心流程的 4 個合成原子；回主線時繼續追蹤原來的 RGB。','This page enlarges dictionary learning using three bands so every entry is visible. Its two learned atoms do not replace the core pipeline’s four synthetic atoms. Return to the core to continue tracking the original RGB.']:['本頁以另一個固定 RGB 示範每一輪的計算，因此選擇順序 4 → 3 → 1 只屬於本例；核心流程的輸入與字典不同，順序及係數也會不同。','This page uses a separate fixed RGB to expose each calculation. Order 4 → 3 → 1 belongs to this example only; the core pipeline has different input and atoms, so its order and codes differ.'];
    section.innerHTML=`<header><p class="eyebrow">Core Method · Playground</p><h3>${b(intro)}</h3><p>${b(mission)}</p><p class="af-role">${b(role)}</p><p class="af-example-bridge">${b(bridge)}</p></header><div class="concept-lab-mount af-mount"></div><aside class="af-takeaway">${b(takeaway)}</aside>`;
    body.prepend(section);
    section.insertAdjacentHTML('beforebegin',window.ReportFormulaReading?.algorithmIntro(kind)||'');
    const m={id:section.id,kind,state:{step:0,sample:0},max:kind==='ksvd'?5:9,root:section.querySelector('.af-mount'),section,timer:null};instances.push(m);
    m.root.addEventListener('click',event=>{const button=event.target.closest('[data-af-action]');if(!button)return;const action=button.dataset.afAction;
      if(action==='play'){if(m.timer)stop(m);else{if(m.state.step===m.max)m.state.step=0;m.timer=setInterval(()=>{if(page.hidden||document.hidden){stop(m);render(m);return;}m.state.step++;if(m.state.step===m.max)stop(m);render(m);window.ReportProjection?.notify();},2400);}}
      else {stop(m);if(action==='next')m.state.step=Math.min(m.max,m.state.step+1);if(action==='prev')m.state.step=Math.max(0,m.state.step-1);if(action==='reset')m.state={step:0,sample:0};if(action==='stage')m.state.step=+button.dataset.afStep;}
      render(m);window.ReportProjection?.notify();
    });
    m.root.addEventListener('change',event=>{if(event.target.dataset.afField==='sample'){m.state.sample=+event.target.value;render(m);window.ReportProjection?.notify();}});
    window.ReportProjection?.register(`algorithm-focus:${kind}`,{get:()=>({...m.state}),set:value=>{stop(m);m.state.step=Math.max(0,Math.min(m.max,Math.round(Number(value.step)||0)));m.state.sample=Math.max(0,Math.min(3,Math.round(Number(value.sample)||0)));render(m);}});
    render(m);
  }
  function initialize(){
    mount('ksvd');mount('omp');
    const feature=document.createElement('section');feature.id='paper-core-methods';feature.className='af-home';feature.dataset.i18nSkip='';feature.innerHTML=`<p class="eyebrow">${b(['報告重點','Presentation Focus'])}</p><h3>${b(['兩個核心演算法，分開學清楚','Understand the Two Core Algorithms Separately'])}</h3><p>${b(['先理解 K-SVD 如何學字典，再理解 OMP 如何用固定字典找配方；背景與實驗章節保留，作為兩個演算法的前提與證據。','First learn how K-SVD builds the dictionary, then how OMP uses a fixed dictionary. Background and experiments remain as prerequisites and evidence.'])}</p><div><a href="#paper-ksvd-walkthrough">K-SVD ${b(['學原子與訓練係數 →','Learn Atoms and Training Codes →'])}</a><a href="#paper-omp-walkthrough">OMP ${b(['選原子與重算權重 →','Select Atoms and Refit Weights →'])}</a></div>`;
    document.querySelector('#paper-route .paper-outline-grid').before(feature);
    for(const kind of ['ksvd','omp'])document.querySelectorAll(`a[href="#paper-${kind}"]`).forEach(a=>a.classList.add('af-core-link'));
    const reveal=()=>{const target=document.getElementById(decodeURIComponent(location.hash.slice(1)));for(let el=target;el;el=el.parentElement)if(el.tagName==='DETAILS')el.open=true;};
    window.addEventListener('hashchange',()=>{reveal();instances.forEach(m=>{if(m.timer){stop(m);render(m);}});});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)instances.forEach(m=>{stop(m);render(m);});});
    document.addEventListener('reportlanguagechange',()=>instances.forEach(render));document.addEventListener('DOMContentLoaded',reveal);reveal();
  }
  function showStep(kind,step){const m=instances.find(x=>x.kind===kind);if(!m)return;stop(m);m.state.step=Math.max(0,Math.min(m.max,Math.round(step)));render(m);}
  window.ReportAlgorithmFocus={Y,D0,A,target,trainingTrace,ompFrame,update,error,showStep,initialize};
  initialize();
})();
