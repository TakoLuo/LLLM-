/* Paper-aligned explainers, controllable animations, and contextual term links. */
(() => {
  'use strict';
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const b=p=>`<span class="i18n-unit i18n-block" data-i18n-skip><span class="i18n-en" lang="en">${esc(p[1])}</span><span class="i18n-separator" aria-hidden="true"> / </span><span class="i18n-zh" lang="zh-Hant">${esc(p[0])}</span></span>`;
  const text=p=>document.documentElement.dataset.language==='zh'?p[0]:p[1];
  const f=(v,n=3)=>Number(v).toFixed(n);
  const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
  const terms=[
    [1,['波長','波段','訊號值'],['wavelength','band signal']],
    [2,['反射率','照明'],['reflectance','illumination']],
    [3,['光譜差異','光譜特徵'],['spectral signatures','spectral signature','spectral differences']],
    [4,['高光譜影像'],['hyperspectral images','hyperspectral image']],
    [5,['資料立方體'],['data cube']],
    [6,['三種解析度','掃描代價','空間解析度'],['resolution and scanning trade-offs','spatial resolution']],
    [7,['響應矩陣','響應曲線','相機響應','感光曲線'],['response matrix','response curves','sensor responses','response model']],
    [8,['加權總和','加權貢獻'],['weighted sums','weighted contribution']],
    [9,['直欄向量','矩陣乘法','直欄'],['matrix product','columns','vector']],
    [10,['線性 RGB','RAW','JPEG'],['linear RGB','RAW','JPEG']],
    [11,['Gamma 編碼','Gamma'],['gamma encoding','gamma']],
    [12,['CIE 1964','標準觀察者'],['CIE 1964','standard observer']],
    [13,['正向問題','逆問題'],['forward problem','inverse problem']],
    [14,['欠定','秩為 3'],['underdetermination','underdetermined','rank 3']],
    [15,['同色異譜'],['metamerism','metameric']],
    [16,['零空間'],['null-space']],
    [17,['低維流形','低維性'],['low-dimensional manifold','low-dimensional structure']],
    [18,['主成分','解釋變異比例'],['PCA','explained variance','principal components']],
    [19,['兩項核心假設','兩項假設'],['two core assumptions','two assumptions']],
    [20,['先驗','未見材料'],['prior coverage','hyperspectral priors','hyperspectral prior','priors']],
    [21,['資料庫規模','自然場景資料庫','資料代表性'],['database size','natural-scene dataset']],
    [22,['波段合併','波段整理','519 波段'],['spectral binning','519 bands']],
    [23,['黑背景偏差','隨機抽樣'],['dark-background bias','random sampling']],
    [24,['稀疏表示','稀疏係數'],['sparse representation','sparse coefficients','sparse atom combinations']],
    [25,['過完備字典','光譜原子','完整光譜原子'],['overcomplete dictionary','spectral atoms','complete spectral atoms']],
    [26,['稀疏設定','三原子'],['sparsity setting','three-atom']],
    [27,['K-SVD','交替最佳化'],['K-SVD','alternating optimization']],
    [28,['殘差矩陣','扣掉其他貢獻'],['residual matrix','subtract other contributions']],
    [29,['SVD','秩一近似'],['SVD','rank-one approximation']],
    [30,['初始化','參數探索'],['initialization','parameter exploration']],
    [31,['離線準備','線上重建'],['offline preparation','online recovery']],
    [32,['成對字典','配對索引'],['paired dictionaries','pairing index']],
    [33,['OMP','目前殘差'],['OMP','current residual']],
    [34,['共同重算','重算權重'],['jointly refit','joint refitting','refitted together']],
    [35,['停止門檻','原子預算'],['stopping thresholds','atom budget']],
    [36,['回投影','RGB 相容'],['reprojection','projection consistency','RGB consistency']],
    [37,['真值','模擬 RGB'],['ground truth','reference value','simulated RGB']],
    [38,['留出完整影像','留出一張完整影像','資料洩漏'],['holds out a complete image','hold out a whole image','data leakage']],
    [39,['重複抽樣','隨機性'],['repeated sampling','stochastic sampling','randomness']],
    [40,['相對誤差','暗像素'],['relative errors','relative error','dark pixels']],
    [41,['誤差圖','失敗案例','波段誤差'],['error maps','failure case','bandwise errors']],
    [42,['跨領域','外部測試'],['cross-domain','external tests']],
    [43,['資訊成本','量測條件'],['information costs','information conditions']],
    [44,['同影像先驗','Yasuma'],['same-image prior','Yasuma']],
    [45,['逐像素獨立','平行化'],['pixel independence','parallelism']],
    [46,['執行時間','秒級'],['runtime','seconds-scale']],
    [47,['模型失配','相機校準'],['model mismatch','camera calibration']],
    [48,['局部稀疏','全域 PCA','基底選擇'],['local sparsity','global PCA','basis choice']]
  ];
  // Reported measurements, not synthetic predictions or live performance simulations.
  const results=[
    [['完整資料集','Complete Dataset'],.0756,2.633],
    [['公園','Park'],.0589,2.105],[['室內','Indoor'],.0507,1.417],
    [['城市','Urban'],.0617,2.260],[['鄉村','Rural'],.0354,1.582],
    [['植物','Plant Life'],.0469,1.816],
    [['鄉村先驗 → 公園','Rural Prior → Park'],.0801,2.693],
    [['公園先驗 → 鄉村','Park Prior → Rural'],.0592,3.121],
    [['外部資料：室外','External: Outdoor'],.1231,3.466],
    [['外部資料：室內','External: Indoor'],.5207,5.685]
  ];
  const pipeline=[
    [['量測訓練光譜 Y','Measure Training Spectra Y'],['用真正高光譜設備蒐集先驗；新場景的未知答案不能混進這輪訓練。','Acquire priors with an HSI system. Keep the new test scene’s unknown answers out of that training round.']],
    [['K-SVD 學 Dₕ','Learn Dₕ with K-SVD'],['原始量測 Y 固定，改良可組合的光譜原子及訓練係數。','Keep measured Y fixed; improve combinable spectral atoms and training coefficients.']],
    [['配對 D_RGB = RDₕ','Pair D_RGB = RDₕ'],['每個完整光譜原子投影成三通道原子，保留編號；離線準備完成。','Project each complete spectral atom into three channels and retain its index. Offline preparation is complete.']],
    [['取得新 RGB c','Acquire New RGB c'],['新場景只有 RGB，不再量它的高光譜；同一本固定字典可重複使用。','Acquire RGB, not new HSI, for the query scene. Reuse the fixed dictionary.']],
    [['OMP 求 w','Fit w with OMP'],['固定 RGB 字典，選少數原子並共同重算權重，使 RGB 殘差降低。','Keep the RGB dictionary fixed; select a few atoms and jointly refit weights to reduce RGB residual.']],
    [['估計 ĥ = Dₕw','Estimate ĥ = Dₕw'],['把相同係數搬回完整光譜原子。輸出是候選光譜，需用獨立真值驗證。','Transfer the same coefficients to complete spectral atoms. The output is a candidate requiring independent validation.']]
  ];
  function pipelineOverview(){
    const phases=[['事前準備：先建立可重複使用的字典','Offline Preparation: Build Reusable Dictionaries'],['新影像重建：只輸入新場景的 RGB','New-Scene Recovery: Input Only the New Scene’s RGB']];
    return `<header><p class="eyebrow">Method at a Glance</p><h3 id="paper-intro-process-title">${b(['方法全貌：從先驗到光譜估計','The Complete Path from Priors to Spectral Estimates'])}</h3><p>${b(['先用已知高光譜資料學會如何表示自然光譜，再用固定的成對字典處理新 RGB。以下六步同時呈現，依編號閱讀即可。','First learn to represent natural spectra from known hyperspectral data, then process new RGB with fixed paired dictionaries. Read the six steps below in numbered order.'])}</p></header>${phases.map((phase,index)=>`<div class="guide-static-phase"><h4>${b(phase)}</h4><ol start="${index*3+1}">${pipeline.slice(index*3,index*3+3).map((step,j)=>`<li><span class="guide-static-number" aria-hidden="true">${index*3+j+1}</span><div><h5>${b(step[0])}</h5><p>${b(step[1])}</p></div></li>`).join('')}</ol></div>`).join('')}<p class="guide-static-check">${b(['驗證不是新影像重建時的額外輸入：實驗另外保留高光譜真值，最後與估計比較。重新產生相同 RGB，只表示量測相容，不能證明光譜正確。','Validation is not an extra input during new-scene recovery: experiments retain hyperspectral truth separately for comparison afterward. Reproducing the same RGB establishes measurement consistency, not spectral accuracy.'])}</p><p class="guide-boundary">${b(['依原論文 Fig. 1、§4.1 與 §5 整理的流程說明；不是原圖，也不執行演算法。','Process summary based on paper Fig. 1, Section 4.1, and Section 5; not an original figure or an execution of the algorithms.'])}</p>`;
  }
  const residualSteps=[
    [['固定量測與其他原子','Fix Measurements and Other Atoms'],['以兩個波段的單樣本切片示範：y=(0.8,0.6)。更新 d₁ 時，其他原子的合計貢獻 b=(0.2,0.3) 暫時固定。真實更新同時處理多筆活躍樣本。','One two-band sample slice: y=(0.8,0.6). While updating d₁, hold the other atoms’ total b=(0.2,0.3) fixed. The real update handles multiple active samples together.']],
    [['先扣除其他貢獻','Subtract the Other Contributions'],['e₁=y−b=(0.6,0.3)。這是希望 d₁ 解釋的部分，不是更改或刪掉原始量測 y。','e₁=y−b=(0.6,0.3) is what d₁ must explain. The measurement y is neither changed nor deleted.']],
    [['只取原本使用 d₁ 的樣本','Restrict to Samples Already Using d₁'],['多樣本時，只保留原本係數非零的樣本欄，得到 E₁^Ω。未使用此原子的樣本不因更新而突然新增非零係數。','For multiple samples, retain columns whose coefficient was already nonzero, forming E₁^Ω. Previously unused samples do not gain new nonzero coefficients through this update.']],
    [['SVD 更新後加回其他貢獻','Update with SVD, Then Add Others Back'],['SVD 為受限殘差找共同方向及各樣本倍率；ŷ=b+d₁x₁。上方 Y 不動，只有估計往量測靠近。下方方向 playground 再示範多樣本共享方向。','SVD fits a shared direction and sample scales to the restricted residual; ŷ=b+d₁x₁. Y stays fixed while the estimate improves. The direction playground below illustrates a shared direction across samples.']]
  ];
  const weights=Array.from({length:3},(_,k)=>Array.from({length:31},(_,j)=>Math.exp(-.5*((400+10*j-[610,540,460][k])/[45,40,35][k])**2)));
  weights.forEach(row=>{let sum=row.reduce((s,x)=>s+x,0);row.forEach((x,i)=>row[i]=x/sum);});
  const atoms=Array.from({length:3},(_,i)=>Array.from({length:31},(_,j)=>.12+.65*Math.exp(-.5*((400+10*j-[450,550,640][i])/45)**2)));
  const project=h=>weights.map(row=>dot(row,h));
  function pairedModel(mix){const w=[(100-mix)/100,mix/100,0],h=atoms[0].map((_,j)=>dot(w,atoms.map(a=>a[j]))),rgb=project(h),partners=atoms.map(project),fromRgb=[0,1,2].map(k=>dot(w,partners.map(c=>c[k])));return {w,h,rgb,partners,fromRgb};}
  function rmseModel(error){const truth=[.2,.4,.6,.8],pattern=[1,-1,.5,-.5],estimate=truth.map((x,i)=>x+error*pattern[i]),squares=estimate.map((x,i)=>(x-truth[i])**2),mean=squares.reduce((a,x)=>a+x,0)/4;return {truth,estimate,squares,mean,rmse:Math.sqrt(mean)};}
  const spark=(values,color='#008896')=>`<svg viewBox="0 0 320 110" role="img" aria-label="${esc(text(['31 波段光譜曲線','31-band spectrum']))}"><path d="M20 8V90H312" fill="none" stroke="#829aa6"/><polyline points="${values.map((v,j)=>`${20+j*9.5},${90-v*90}`).join(' ')}" fill="none" stroke="${color}" stroke-width="3"/><text x="20" y="106">400 nm</text><text x="262" y="106">700 nm</text></svg>`;
  const instances=[];
  function insert({id,after,page,title,link,kind}){
    const shell=document.createElement('section');shell.id=id;shell.className='paper-playground paper-narrative-playground';shell.dataset.i18nSkip='';
    shell.innerHTML=`<header><p class="eyebrow">Playground</p><h3>${b(title)}</h3><p class="guide-alignment">${b(link)}</p></header><div class="concept-lab-mount guide-mount"></div>`;
    (after?document.getElementById(after):document.querySelector(`#${page} .paper-body`))[after?'after':'append'](shell);
    const root=shell.querySelector('.guide-mount'),state={step:0,mix:35,error:.1,result:0},model={id,kind,state,root,shell,timer:null};instances.push(model);
    root.addEventListener('click',event=>{const button=event.target.closest('[data-guide-action]');if(!button)return;
      const action=button.dataset.guideAction;
      if(action==='play'){if(model.timer)stop(model);else{if(state.step>=steps(model).length-1)state.step=0;model.timer=setInterval(()=>{if(shell.closest('.paper-page').hidden||document.hidden){stop(model);render(model);return;}state.step++;if(state.step>=steps(model).length-1)stop(model);render(model);window.ReportProjection?.notify();},1600);}}
      if(action==='next'){stop(model);state.step=Math.min(steps(model).length-1,state.step+1);}
      if(action==='previous'){stop(model);state.step=Math.max(0,state.step-1);}
      if(action==='reset'){stop(model);Object.assign(state,{step:0,mix:35,error:.1,result:0});}
      if(action==='step'){stop(model);state.step=+button.dataset.step;}
      render(model);window.ReportProjection?.notify();
    });
    root.addEventListener('input',event=>{const field=event.target.dataset.guideField;if(!field)return;state[field]=+event.target.value;render(model,event.target);window.ReportProjection?.notify();});
    root.addEventListener('change',event=>{if(event.target.dataset.guideField==='result'){state.result=+event.target.value;render(model);window.ReportProjection?.notify();}});
    window.ReportProjection?.register(`paper-narrative:${id}`,{get:()=>({...state}),set:value=>{stop(model);state.step=Math.max(0,Math.min(steps(model).length-1,Math.round(Number(value.step)||0)));state.mix=Math.max(0,Math.min(100,Number(value.mix)||0));state.error=Math.max(0,Math.min(.2,Number(value.error)||0));state.result=Math.max(0,Math.min(9,Math.round(Number(value.result)||0)));render(model);}});
    render(model);return shell;
  }
  const steps=m=>m.kind==='residual'?residualSteps:pipeline;
  function stop(m){clearInterval(m.timer);m.timer=null;}
  const button=(action,label,disabled=false)=>`<button type="button" data-guide-action="${action}" ${disabled?'disabled':''}>${b(label)}</button>`;
  const notice=()=>`<p class="guide-boundary">${b(['合成教學算例；不是論文量測結果，也不是作者程式重現。','Synthetic teaching example; not measured paper results or a reproduction of the authors’ code.'])}</p>`;
  function residualGraphic(step){
    const rows=[['y',[.8,.6],'#176b7a'],['b',[.2,.3],'#637482']];
    if(step>=1)rows.push(['e₁ = y − b',[.6,.3],'#c57929']);
    if(step>=3)rows.push(['ŷ = b + d₁x₁',[.8,.6],'#27836b']);
    return `<div class="guide-residual-graphic">${rows.map(([label,values,color])=>`<div class="guide-vector-display"><strong>${label}</strong>${values.map((value,i)=>`<div><span>${b([`波段 ${i+1}`,`Band ${i+1}`])}: ${value.toFixed(1)}</span><div class="guide-bar"><i style="width:${value*100}%;background:${color}"></i></div></div>`).join('')}</div>`).join('')}</div><p class="guide-boundary">${b(['所有長條使用共同的 0–1 圖尺。原始 y 始終不變；只逐步揭示扣除後的 e 與重建 ŷ。','All bars share a 0–1 scale. The measured y never changes; steps reveal the residual e and reconstruction ŷ.'])}</p>`;
  }
  function render(m,activeField=null){
    let html='';const s=m.state;
    if(m.kind==='pipeline'||m.kind==='residual'){
      const seq=steps(m);html=`<div class="guide-step-track">${seq.map((p,i)=>`<button type="button" data-guide-action="step" data-step="${i}" aria-pressed="${i===s.step}"><span>${i+1}</span>${b(p[0])}</button>`).join('')}</div><div class="guide-stage" role="status"><p>${s.step+1} / ${seq.length}</p><h4>${b(seq[s.step][0])}</h4><p>${b(seq[s.step][1])}</p>${m.kind==='residual'?`<div class="guide-fixed">y = (0.8, 0.6) &nbsp; | &nbsp; b = (0.2, 0.3)</div><div class="guide-vector-row"><span>y</span><span>− b</span><strong>e₁ = (0.6, 0.3)</strong></div>`:''}</div><div class="guide-actions">${button('previous',['上一步','Previous'],s.step===0)}${button('play',m.timer?['暫停','Pause']:['播放步驟','Play Steps'])}${button('next',['下一步','Next'],s.step===seq.length-1)}${button('reset',['重設','Reset'])}</div><p class="guide-boundary">${b(m.kind==='residual'?['兩波段切片只用來讀懂扣除步驟；多樣本的 SVD 方向更新另見下方算例。','The two-band slice explains subtraction only. See the shared-direction example below for the multi-sample SVD update.']:['依 Fig. 1 與 §4.1 重繪的流程；播放只切換說明，不代表實際完成字典訓練。','Process redrawn from Fig. 1 and §4.1. Playback advances explanations; it does not execute dictionary training.'])}</p>`;
    }else if(m.kind==='paired'){
      const v=pairedModel(s.mix);html=`<label for="${m.id}-mix">${b(['調整原子 2 的係數（原子 1 的係數 = 1 − 此值）','Atom 2 Coefficient (Atom 1 Coefficient = 1 − This Value)'])}<output>${f(s.mix/100,2)}</output><input id="${m.id}-mix" type="range" min="0" max="100" value="${s.mix}" data-guide-field="mix"></label><div class="guide-pair-grid">${atoms.map((a,i)=>`<article><h4>${b([`原子 ${i+1}：完整 31 波段`,`Atom ${i+1}: All 31 Bands`])}</h4>${spark(a,['#bf6922','#008896','#7652a8'][i])}<p>h${i+1} → c${i+1} = (${v.partners[i].map(x=>f(x)).join(', ')})</p><strong>w${i+1} = ${f(v.w[i],2)}</strong></article>`).join('')}</div><div class="guide-stage"><h4>${b(['把同一個 w 用在兩個空間','Use the Same w in Both Spaces'])}</h4><p>ĥ = ${f(v.w[0],2)}h₁ + ${f(v.w[1],2)}h₂ + 0h₃</p>${spark(v.h)}<p>D_RGBw = (${v.fromRgb.map(x=>f(x)).join(', ')})</p><p>Rĥ = (${v.rgb.map(x=>f(x)).join(', ')})</p><p>${b(['兩種路徑相同，是因為成對字典與線性運算。滑桿是在指定算例係數，不是在執行 OMP，也沒有證明估計是真實答案。','Both paths match because of paired dictionaries and linearity. The slider specifies illustrative coefficients; it does not run OMP or prove spectral truth.'])}</p></div>${notice()}`;
    }else if(m.kind==='rmse'){
      const v=rmseModel(s.error);html=`<label for="${m.id}-error">${b(['調整估計偏差大小','Adjust Estimate Deviation'])}<output>${f(s.error,2)}</output><input id="${m.id}-error" type="range" min="0" max=".2" step=".01" value="${s.error}" data-guide-field="error"></label><div class="paper-table-scroll"><table><thead><tr>${[['項目','Item'],['真值 h','Reference h'],['估計 ĥ','Estimate ĥ'],['差值','Difference'],['差值平方','Squared Difference']].map(x=>`<th>${b(x)}</th>`).join('')}</tr></thead><tbody>${v.truth.map((x,i)=>`<tr><th>${i+1}</th><td>${f(x,2)}</td><td>${f(v.estimate[i],2)}</td><td>${f(v.estimate[i]-x,3)}</td><td>${f(v.squares[i],5)}</td></tr>`).join('')}</tbody></table></div><div class="guide-stage"><p>${b(['1. 四項平方差加總','1. Sum Four Squared Differences'])}: ${f(v.mean*4,5)}</p><p>${b(['2. 除以 M = 4','2. Divide by M = 4'])}: ${f(v.mean,5)}</p><p>${b(['3. 開根號得到 RMSE','3. Take the Square Root for RMSE'])}: √${f(v.mean,5)} = <strong>${f(v.rmse,5)}</strong></p><p>${b(['真值固定，只有估計改變；越接近真值，RMSE 越低。此處四個數只是方便手算，不是論文的四個指定波段。','Reference values stay fixed while estimates change. Closer estimates produce lower RMSE. Four values enable hand calculation; they are not four designated paper bands.'])}</p></div>${notice()}`;
    }else if(m.kind==='results'){
      const row=results[s.result];html=`<label for="${m.id}-result">${b(['選擇 Table 1 的實驗條件','Choose a Table 1 Condition'])}<select id="${m.id}-result" data-guide-field="result">${results.map((r,i)=>`<option value="${i}" ${i===s.result?'selected':''}>${esc(text(r[0]))}</option>`).join('')}</select></label><div class="guide-result-grid"><article><h4>${b(['相對 RMSE（無量綱）','Relative RMSE (Dimensionless)'])}</h4><strong>${f(row[1],4)}</strong><div class="guide-bar"><i style="width:${row[1]/.6*100}%"></i></div><small>${b(['所有條件共用 0–0.6 的圖尺','Shared Visual Scale: 0–0.6'])}</small></article><article><h4>${b(['絕對 RMSE（0–255 尺度）','Absolute RMSE (0–255 Scale)'])}</h4><strong>${f(row[2],3)}</strong><div class="guide-bar"><i style="width:${row[2]/6*100}%"></i></div><small>${b(['所有條件共用 0–6 的圖尺','Shared Visual Scale: 0–6'])}</small></article></div><p role="status">${b(s.result>=8?['這是外部資料庫，不只是換一張相同來源的測試圖；光譜範圍、暗像素與運動可能共同影響結果。','This is an external dataset, not just another image from the same source. Spectral range, dark pixels, and motion can jointly affect results.']:s.result>=6?['這是跨領域先驗。它顯示匹配的重要性，但不是控制所有其他變因後的單一因果實驗。','This uses a cross-domain prior. It illustrates the importance of matching, not a single-factor causal experiment.']:['這是作者報告的資料集／子集結果。較低誤差不應直接改稱「1 − 誤差」的準確率。','This is a reported dataset/subset result. Lower error is not automatically an accuracy of one minus the error.'])}</p><p class="guide-boundary">${b(['資料來源：原論文 Table 1 全部 10 列。操作只切換已報告的數值，不會重新訓練模型或預測新準確率。','Source: all ten rows of paper Table 1. Controls switch reported values; they do not retrain models or predict new accuracy.'])}</p>`;
    }
    if(m.kind==='residual')html=html.replace(/<div class="guide-vector-row">.*?<\/div>/,residualGraphic(s.step));
    if(m.kind==='paired')html+=`<p class="guide-boundary">${b(['此算例的 R 使用人工平滑響應，並讓每個通道的權重加總為 1。這只是固定示例的尺度選擇，不宣稱是 CIE 或 Canon 的實測曲線。','This example uses synthetic smooth responses with each channel’s weights summing to one. This is a fixed illustrative scale choice, not measured CIE or Canon response curves.'])}</p>`;
    // Preserve an active native range node while dragging; replace only the explanation.
    if(activeField?.type==='range'){
      const oldLabel=activeField.closest('label'),holder=document.createElement('div');holder.innerHTML=html;
      const newLabel=holder.querySelector('label');oldLabel.querySelector('output').textContent=newLabel.querySelector('output').textContent;newLabel.remove();[...m.root.children].forEach(child=>{if(child!==oldLabel)child.remove();});m.root.append(...holder.childNodes);
    }else m.root.innerHTML=html;
  }
  function linkTerms(){
    const entries=window.ConceptData.entries;
    document.querySelectorAll('.paper-page .paper-body').forEach(body=>{
      let serial=0;
      body.querySelectorAll('.i18n-en,.i18n-zh').forEach(unit=>{
        if(unit.closest('.concept-lab-mount,a,math,summary,button,select'))return;
        const lang=unit.classList.contains('i18n-zh')?'zh':'en';
        const aliases=terms.flatMap(([n,zh,en])=>(lang==='zh'?zh:en).map(word=>({n,word}))).sort((a,b)=>b.word.length-a.word.length);
        const walker=document.createTreeWalker(unit,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())if(!walker.currentNode.parentElement.closest('a,math'))nodes.push(walker.currentNode);
        let linked=0;
        for(const node of nodes){
          const source=node.textContent;let cursor=0,fragment=document.createDocumentFragment();
          while(cursor<source.length&&linked<4){
            let match=null;
            for(const a of aliases){let at=source.toLowerCase().indexOf(a.word.toLowerCase(),cursor);while(at>=0&&lang==='en'&&(/[a-z0-9]/i.test(source[at-1]||'')||/[a-z0-9]/i.test(source[at+a.word.length]||'')))at=source.toLowerCase().indexOf(a.word.toLowerCase(),at+1);if(at>=0&&(!match||at<match.at))match={...a,at};}
            if(!match)break;
            fragment.append(document.createTextNode(source.slice(cursor,match.at)));
            const link=document.createElement('a'),entry=entries.find(e=>e.number===match.n),origin=unit.closest('.paper-equation-card')||unit.closest('p,li,h3,td,th')||unit;
            if(!origin.id)origin.id=`${body.closest('.paper-page').id}-term-${++serial}`;
            link.className='paper-term';link.href=`#${entry.id}`;link.textContent=source.slice(match.at,match.at+match.word.length);link.dataset.paperOrigin=`#${origin.id}`;link.dataset.concept=String(match.n);link.dataset.termLang=lang;link.setAttribute('aria-label',`${link.textContent} — ${entry.title[lang==='zh'?0:1]}`);fragment.append(link);linked++;cursor=match.at+match.word.length;
          }
          if(cursor){fragment.append(document.createTextNode(source.slice(cursor)));node.replaceWith(fragment);}
        }
      });
    });
    const tip=document.createElement('aside');tip.id='paper-term-tooltip';tip.setAttribute('role','tooltip');tip.hidden=true;document.body.append(tip);
    let target=null;
    const hide=()=>{target?.removeAttribute('aria-describedby');target=null;tip.hidden=true;};
    const show=link=>{target=link;const entry=entries.find(e=>e.number===+link.dataset.concept),idx=link.dataset.termLang==='zh'?0:1;tip.innerHTML=`<strong>${esc(entry.title[idx])}</strong><p>${esc(entry.idea[idx])}</p><small>${idx===0?'點擊進入詳細說明與互動；可返回原段落。':'Click for details and interaction; return to this paragraph afterward.'}</small>`;tip.hidden=false;link.setAttribute('aria-describedby',tip.id);const r=link.getBoundingClientRect(),width=tip.getBoundingClientRect().width,height=tip.getBoundingClientRect().height;tip.style.left=`${Math.max(8,Math.min(innerWidth-width-8,r.left))}px`;tip.style.top=`${Math.max(8,r.bottom+height+16<innerHeight?r.bottom+8:r.top-height-8)}px`;};
    document.addEventListener('pointerover',e=>{const link=e.target.closest('.paper-term');if(link&&link!==target)show(link);else if(!link)hide();});
    document.addEventListener('pointerout',e=>{const link=e.target.closest('.paper-term');if(link&&!link.contains(e.relatedTarget))hide();});
    document.addEventListener('focusin',e=>{const link=e.target.closest('.paper-term');if(link)show(link);else hide();});
    document.addEventListener('focusout',hide);document.addEventListener('click',hide);document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
    window.addEventListener('scroll',hide,{passive:true});window.addEventListener('hashchange',hide);
  }
  function initialize(){
    const introTable=document.querySelector('#paper-introduction .paper-table-scroll');introTable.id='paper-intro-inputs';
    const process=document.createElement('section');process.id='paper-intro-process';process.className='guide-static-process';process.dataset.i18nSkip='';process.setAttribute('aria-labelledby','paper-intro-process-title');process.innerHTML=pipelineOverview();introTable.after(process);
    insert({id:'paper-subtract-playground',after:'paper-ksvd-residual',kind:'residual',title:['先扣掉其他原子，再更新這一個','Subtract Other Atoms before Updating This One'],link:['逐步對照上方 Eⱼ = Y − Σᵢ≠ⱼ dᵢxᵢ。這個動畫只講扣除與限制樣本；下一張公式及 playground 才處理 SVD 方向。','Follow Eⱼ = Y − Σᵢ≠ⱼ dᵢxᵢ above. This animation explains subtraction and sample restriction; the next equation and playground handle the SVD direction.']});
    insert({id:'paper-rmse-playground',after:'paper-rmse',kind:'rmse',title:['照公式算一次 RMSE','Calculate RMSE from the Formula'],link:['對應上方 RMSE 公式：先算每一項差值、平方、平均，最後開根號。固定真值，只改估計的偏差大小。','Follow the RMSE equation above: differences, squares, mean, then square root. Hold the reference fixed and vary estimate deviation.']});
    const resultHeading=[...document.querySelectorAll('#paper-experiments h3')].find(h=>h.textContent.includes('Table 2'));resultHeading.id='paper-table-two-heading';
    const chart=insert({id:'paper-results-playground',page:'paper-experiments',kind:'results',title:['切換並閱讀 Table 1 的結果','Explore the Reported Table 1 Results'],link:['對應上方 Table 1：切換資料條件，分別讀相對與絕對 RMSE。兩個指標的圖尺不同，不可直接比較長條長度。','Read Table 1 above: switch conditions and inspect relative versus absolute RMSE. Their scales differ, so do not compare bar lengths across metrics.']});resultHeading.before(chart);
    const alignment={
      'paper-intro-playground':['對應上方輸出設定：一個位置有 31 個光譜值，一個波段則有整張影像。先點位置，再改波段，兩種切法不要混在一起。','Apply the output setting above: one position has 31 spectral values, while one band covers the entire image. Select a position, then a band, to distinguish the two slices.'],
      'paper-related-playground':['對應上方比較表的「新場景資訊」欄。這裡只檢查輸入是否齊全，不把方法名稱換成模擬準確率。','Apply the New-Scene Information column above. Check whether required inputs are available; switching methods does not simulate accuracy.'],
      'paper-prior-playground':['對應上方 (100 − 1) × 1,000。每次移動測試名單，都要分清這一輪哪些資料能學、哪些只能評分。','Apply (100 − 1) × 1,000 above. When the held-out image changes, distinguish data available for training from data reserved for scoring.'],
      'paper-ksvd-phases-playground':['對應上方最小化 ‖Y − DₕW‖²_F：Y 永遠固定。按不同階段，讀哪個 D 或 W 的部分正在變動。','Apply the objective ‖Y − DₕW‖²_F above: Y always stays fixed. Select a phase to inspect exactly which part of D or W changes.'],
      'paper-ksvd-svd-playground':['對應上方受限 SVD 更新：方向對應 dⱼ，各點沿方向的倍率對應活躍係數。觀察改方向時總平方差如何變化。','Apply the restricted SVD update above: the direction represents dⱼ and point-specific projection scales represent active coefficients. Observe total squared error as the direction changes.'],
      'paper-omp-playground':['對應上方三個 OMP 步驟：相關性分數選擇、共同擬合、更新殘差。每按一步，先讀選了誰，再看所有已選權重與殘差。','Apply the three OMP steps above: correlation scoring, joint fitting, and residual update. At each step read the selected index, all refitted weights, and the new residual.'],
      'paper-error-playground':['上方完整 RMSE 算例之後，這裡補看「同樣絕對差，為何暗值相對誤差更大」。本區不是另一種資料集 RMSE 的實作。','After the full RMSE calculation above, inspect why the same absolute difference yields a larger relative error for a dark reference. This is not another dataset-RMSE implementation.'],
      'paper-conclusion-playground':['對照本節結論：RGB 擬合成功之外，仍需要低維結構與有限同色異譜等條件。切換假設，讀取哪些結論仍有依據。','Apply this section’s conclusion: RGB fit alone is insufficient; structured spectra and limited metamerism still matter. Toggle assumptions and inspect which conclusions remain supported.']
    };
    Object.entries(alignment).forEach(([id,pair])=>{const p=document.createElement('p');p.className='guide-alignment';p.innerHTML=b(pair);document.querySelector(`#${id} > header`).append(p);});
    document.querySelectorAll('.paper-page').forEach(page=>{const first=page.querySelector('.paper-playground');if(first)page.querySelector('.paper-playground-jump').href=`#${first.id}`;});
    const prompt=document.createElement('p');prompt.className='paper-link-help';prompt.dataset.i18nSkip='';prompt.innerHTML=b(['有底線的詞語可移上滑鼠查看提示，點擊進入補充知識點；補充頁提供返回原段落。','Hover underlined terms for a short explanation. Click for a supporting topic, then return to the original paragraph.']);
    document.querySelectorAll('.paper-heading').forEach(h=>h.append(prompt.cloneNode(true)));
    linkTerms();
    document.addEventListener('reportlanguagechange',()=>{instances.forEach(m=>render(m));});
    window.addEventListener('hashchange',()=>{instances.forEach(m=>{if(m.timer){stop(m);render(m);}});});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)instances.forEach(m=>{if(m.timer){stop(m);render(m);}});});
  }
  window.ReportPaperGuide={terms,results,pipeline,pipelineOverview,residualSteps,pairedModel,rmseModel,initialize};
  initialize();
})();
