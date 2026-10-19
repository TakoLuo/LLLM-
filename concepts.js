(() => {
  'use strict';
  const { entries, groups } = window.ConceptData;
  const escape = (v) => String(v).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const b = (pair, block = true) => `<span class="i18n-unit ${block ? 'i18n-block' : 'i18n-inline'}" data-i18n-skip><span class="i18n-en" lang="en">${escape(pair[1])}</span><span class="i18n-separator" aria-hidden="true"> / </span><span class="i18n-zh" lang="zh-Hant">${escape(pair[0])}</span></span>`;
  const mode = () => document.documentElement.dataset.language || 'en';
  const t = pair => mode() === 'zh' ? pair[0] : pair[1];
  const dot = (a,c) => a.reduce((s,v,i) => s + v*c[i],0);
  const norm = a => Math.sqrt(dot(a,a));
  const add = (a,c,scale=1) => a.map((v,i)=>v+scale*c[i]);
  const scale = (a,s) => a.map(v=>v*s);
  const clamp = (v,lo=0,hi=1) => Math.min(hi,Math.max(lo,v));
  const gauss = (x,c,w) => Math.exp(-.5*((x-c)/w)**2);
  const waves = Array.from({length:31},(_,i)=>400+10*i);
  const signal = (kind,w) => kind === 'soil' ? .17+.0009*(w-400) : kind === 'laser' ? .06+.78*gauss(w,635,9) : kind === 'sky' ? .13+.65*gauss(w,445,62) : .09+.47*gauss(w,545,33)+.35/(1+Math.exp(-(w-687)/8));
  const spectrum = kind => waves.map(w=>signal(kind,w));
  const response = (shift=0) => [[610,54],[540,46],[455,39]].map(([c,w]) => {const row=waves.map(v=>gauss(v,c+shift,w));return scale(row,1/row.reduce((a,c)=>a+c,0));});
  const R = response();
  const rgb = (h,r=R) => r.map(row=>dot(row,h));
  function solve(matrix, rhs) {
    const a=matrix.map((row,i)=>[...row,rhs[i]]), n=a.length;
    for(let i=0;i<n;i++) {
      let pivot=i;for(let j=i+1;j<n;j++)if(Math.abs(a[j][i])>Math.abs(a[pivot][i]))pivot=j;
      if(Math.abs(a[pivot][i])<1e-10)return null;
      [a[i],a[pivot]]=[a[pivot],a[i]];const k=a[i][i];for(let j=i;j<=n;j++)a[i][j]/=k;
      for(let r=0;r<n;r++)if(r!==i){const f=a[r][i];for(let j=i;j<=n;j++)a[r][j]-=f*a[i][j];}
    }
    return a.map(row=>row[n]);
  }
  function fit(atoms,y) {
    if(!atoms.length)return {weights:[],estimate:y.map(()=>0),residual:[...y]};
    const weights=solve(atoms.map(a=>atoms.map(c=>dot(a,c))),atoms.map(a=>dot(a,y)));
    if(!weights)return null;
    const estimate=y.map((_,j)=>atoms.reduce((s,a,i)=>s+a[j]*weights[i],0));
    return {weights,estimate,residual:add(y,estimate,-1)};
  }
  const ompAtoms=[[.72,.35,.18],[.48,.55,.34],[.18,.42,.73],[.66,.51,.24]].map(a=>scale(a,1/norm(a)));
  const ompTarget=[.62,.46,.28];
  function omp(max=3) {
    const states=[{selected:[],...fit([],ompTarget),scores:ompAtoms.map(a=>Math.abs(dot(a,ompTarget)))}];
    while(states.length<=Math.min(3,max)) {
      const old=states.at(-1);if(norm(old.residual)<1e-9)break;
      const order=ompAtoms.map((a,i)=>({i,score:Math.abs(dot(a,old.residual))})).filter(x=>!old.selected.includes(x.i)).sort((a,c)=>c.score-a.score);
      let next=null;for(const item of order){const selected=[...old.selected,item.i],f=fit(selected.map(i=>ompAtoms[i]),ompTarget);if(f){next={selected,...f,scores:ompAtoms.map(a=>Math.abs(dot(a,f.residual)))};break;}}
      if(!next)break;states.push(next);
    }
    return states;
  }
  const gram=R.map(a=>R.map(c=>dot(a,c)));
  const seed=waves.map((w,i)=>Math.sin(i*.92)+.35*Math.cos(i*.31));
  const coeff=solve(gram,R.map(row=>dot(row,seed)));
  let q=seed.map((v,i)=>v-R.reduce((s,row,k)=>s+coeff[k]*row[i],0));q=scale(q,1/Math.max(...q.map(Math.abs)));
  function signaturePair() {
    const base=spectrum('leaf');
    const amplitude=Math.min(.15,...base.map((v,i)=>Math.abs(q[i])>1e-10?.78*v/Math.abs(q[i]):1));
    const a=base.map((v,i)=>v+amplitude*q[i]),c=base.map((v,i)=>v-amplitude*q[i]);
    const rgbA=rgb(a),rgbB=rgb(c);
    const displayA=rgbA.map(v=>Math.round(255*clamp(v)**(1/2.2))),displayB=rgbB.map(v=>Math.round(255*clamp(v)**(1/2.2)));
    const maxDifferenceIndex=q.reduce((best,v,i)=>Math.abs(v)>Math.abs(q[best])?i:best,0);
    return {a,b:c,rgbA,rgbB,displayA,displayB,maxDifferenceIndex};
  }
  const residuals=[[1,.6],[.7,.9],[1.2,1],[.9,.7]];
  const covariance = values => [[values.reduce((s,v)=>s+v[0]*v[0],0), values.reduce((s,v)=>s+v[0]*v[1],0)],[values.reduce((s,v)=>s+v[0]*v[1],0),values.reduce((s,v)=>s+v[1]*v[1],0)]];
  const principalAngle=values=>{const c=covariance(values);return .5*Math.atan2(2*c[0][1],c[0][0]-c[1][1]);};
  const directionError=(values,angle)=>{const d=[Math.cos(angle),Math.sin(angle)];return values.reduce((s,v)=>s+dot(v,v)-dot(v,d)**2,0);};
  const rng = seedValue => {let x=seedValue>>>0;return()=>{x=(1664525*x+1013904223)>>>0;return x/4294967296;};};
  const colors=['#008d9c','#d07826','#7459ac','#468a52','#2877b5'];
  const renderers = new Map();
  const svg = (body,label) => `<svg class="concept-chart" viewBox="0 0 680 300" role="img" aria-label="${escape(t(label))}" data-i18n-skip><title>${escape(t(label))}</title>${body}</svg>`;
  function plot(series,{min=0,max=1,wavelength=true,marker=null,bandWidth=null}={}) {
    const px=i=>52+i*602/30,py=v=>250-210*(v-min)/(max-min);
    let out='';for(let i=0;i<=4;i++){const v=min+(max-min)*i/4;out+=`<path d="M52 ${py(v)}H654" stroke="#cbd8df" stroke-dasharray="3 5"/><text x="42" y="${py(v)+4}" text-anchor="end">${v.toFixed(2)}</text>`;}
    out+=`<text x="15" y="145" transform="rotate(-90 15 145)" text-anchor="middle">${escape(t(['相對訊號','Relative Signal']))}</text>`;
    if(bandWidth!==null&&marker!==null){const left=px((Math.max(400,marker-bandWidth/2)-400)/10),right=px((Math.min(700,marker+bandWidth/2)-400)/10);out+=`<rect x="${left}" y="40" width="${right-left}" height="210" fill="#d07826" opacity=".14"/>`;}
    if(wavelength){for(let i=0;i<=30;i+=5)out+=`<text x="${px(i)}" y="274" text-anchor="middle">${400+i*10}</text>`;out+=`<text x="350" y="295" text-anchor="middle">${escape(t(['波長（nm）','Wavelength (nm)']))}</text>`;}
    series.forEach((s,i)=>{out+=`<polyline points="${s.values.map((v,j)=>`${52+j*602/(s.values.length-1)},${py(v)}`).join(' ')}" fill="none" stroke="${s.color||colors[i]}" stroke-width="3.5" ${s.dash?'stroke-dasharray="7 5"':''}/>`;});
    if(marker!==null)out+=`<path d="M${px((marker-400)/10)} 35V250" stroke="#d07826" stroke-width="2"/>`;
    return svg(out,['示意曲線，數值隨控制器更新','Illustrative curves updated by the controls']);
  }
  const metric=(label,value)=>`<div class="cx-metric"><span>${b(label)}</span><strong>${escape(value)}</strong></div>`;
  const legend=items=>`<div class="cx-legend">${items.map((p,i)=>`<span><i style="background:${colors[i]}"></i>${b(p,false)}</span>`).join('')}</div>`;
  const equation=text=>`<p class="cx-equation" data-i18n-skip>${escape(text)}</p>`;
  const note=pair=>`<p class="cx-result" role="status" aria-live="polite">${b(pair)}</p>`;
  const cellTable=(heads,rows)=>`<div class="cx-table-scroll" tabindex="0"><table class="cx-table"><thead><tr>${heads.map(p=>`<th>${b(p)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(v=>`<td>${Array.isArray(v)?b(v):escape(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const flow=(stages,active)=>`<ol class="cx-flow">${stages.map((p,i)=>`<li class="${i===active?'is-active':i<active?'is-done':''}"><span>${String(i+1).padStart(2,'0')}</span>${b(p)}</li>`).join('')}</ol>`;
  const referenceLabels={
    band:['移動中心波長，並改變所累積的波段寬度。','Move the band center and change the width being accumulated.'],
    cube:['先選波段，再點一個像素；兩張圖會連動。','Select a band, then click a pixel; both views update together.'],
    sampling:['改背景比例，再重新抽樣，比較真正物體樣本數。','Change background coverage and resample to compare object samples.'],
    signature:['依序觀察「相同顏色 → 不同曲線 → 同一波段的兩個數值」。A、B 的光譜固定，操作只改變你正在查看的資訊。','Follow “same color → different curves → two values at one band.” A and B stay fixed; the controls only change what you inspect.'],
    'omp-refit':['逐步加入原子，比較舊係數與重新擬合後的係數。','Add atoms step by step and compare old and refitted coefficients.']
  };
  function mountLab(entry,root) {
    if(window.ReportFoundations?.handles(entry.number)) {
      const refresh=window.ReportFoundations.mount(entry,root,{b,t,escape});
      renderers.set(entry.id,refresh);
      return;
    }
    const kind=entry.lab;
    const defaults={lambda:550,width:20,material:'leaf',warm:0,channel:1,shift:0,linear:255,bands:7,band:15,pixel:12,motion:30,scan:'band',step:0,amount:65,rank:2,noise:10,k:2,position:50,low:true,rare:true,prior:'natural',source:'ground',background:70,region:'all',seed:1,a:60,c:25,d:15,capacity:12,budget:3,angle:15,subset:0,truth:false,leak:false,brightness:50,error:10,mapBand:15,domain:'complete',workers:1,frames:30,train:2000,infer:20,global:false};
    if(kind==='nullnoise')defaults.amount=40;
    const state={...defaults};
    const body=document.createElement('div');body.className='cx-lab';body.dataset.i18nSkip='';
    body.innerHTML=`<header><p class="eyebrow">${b(['互動觀察','Interactive Observation'])}</p><h3>${b(entry.question)}</h3><p>${b(referenceLabels[kind]||['改變控制項，觀察圖形、數值與下方解釋如何一起改變。','Change a control and observe the linked graphic, values, and explanation.'])}</p></header><div class="cx-workbench"><div class="cx-controls"></div><div class="cx-output"></div></div><p class="cx-demo-label">${b(['以下為合成教學示意。論文數據會另標來源；這些互動不宣稱重現作者程式。','Synthetic teaching demonstration. Paper values are separately labeled; these interactions do not claim to reproduce the authors’ code.'])}</p>`;
    root.append(body);const controls=body.querySelector('.cx-controls'),out=body.querySelector('.cx-output');
    function range(key,label,min,max,step=1,suffix='') {
      const id=`${entry.id}-${key}`;
      controls.insertAdjacentHTML('beforeend',`<label class="cx-control" for="${id}">${b(label)}<output data-value="${key}"></output><input id="${id}" data-field="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${state[key]}" aria-label="${escape(t(label))}"><small data-i18n-skip>${min}–${max} ${escape(suffix)}</small></label>`);
    }
    function select(key,label,options) {
      const id=`${entry.id}-${key}`;
      controls.insertAdjacentHTML('beforeend',`<label class="cx-control" for="${id}">${b(label)}<select id="${id}" data-field="${key}" aria-label="${escape(t(label))}">${options.map(([value,pair])=>`<option value="${value}" ${state[key]===value?'selected':''}>${escape(t(pair))}</option>`).join('')}</select></label>`);
      const el=controls.querySelector(`#${id}`);el._options=options;
    }
    function toggle(key,label){controls.insertAdjacentHTML('beforeend',`<label class="cx-toggle"><input type="checkbox" data-field="${key}" ${state[key]?'checked':''}>${b(label)}</label>`);}
    function action(name,label){controls.insertAdjacentHTML('beforeend',`<button class="secondary-button" type="button" data-action="${name}">${b(label)}</button>`);}
    const materials=()=>select('material',['場景訊號','Scene Signal'],[['leaf',['葉子','Leaf']],['soil',['土壤','Soil']],['sky',['天空','Sky']],['laser',['窄頻訊號','Narrow-Band Signal']]]);
    const waveControls=()=>{materials();range('lambda',['中心波長','Center Wavelength'],400,700,10,'nm');};
    const spectralKinds=['band','illumination','sampling-spectrum','response','weighted','linear-display','gamma','sensor-model','binning','calibration'];
    if(kind==='signature') {
      body.classList.add('signature-lab');
      const steps=document.createElement('ol');steps.className='signature-steps';
      steps.innerHTML=[['先看顏色','Compare Colors'],['展開光譜','Reveal Spectra'],['讀取同一波段','Read the Same Band']].map((p,i)=>`<li><button type="button" data-signature-phase="${i}" aria-pressed="${i===0}"><strong>${i+1}</strong>${b(p)}</button></li>`).join('');
      controls.append(steps);
      range('lambda',['讀取哪個波段？','Which Band Should We Read?'],400,700,10,'nm');
      const presets=document.createElement('div');presets.className='signature-band-presets';
      presets.innerHTML=[450,550,650].map(w=>`<button type="button" data-signature-band="${w}">${w} nm</button>`).join('');controls.append(presets);
      action('signature-max',['移到差異最大的波段','Show the Largest Band Difference']);
      action('signature-next',['下一步：展開光譜 →','Next: Reveal the Spectra →']);
    } else if(spectralKinds.includes(kind)) {
      if(['gamma','linear-display'].includes(kind)){range('linear',['線性值 × 1000','Linear Value × 1000'],0,1000);}
      else {waveControls();if(['band','sampling-spectrum','binning'].includes(kind))range('width',['波段寬度','Band Width'],10,100,10,'nm');
        if(kind==='illumination')range('warm',['光源：偏冷 ← → 偏暖','Source: Cool ← → Warm'],-100,100);
        if(['response','weighted'].includes(kind))range('channel',['通道：0=R，1=G，2=B','Channel: 0=R, 1=G, 2=B'],0,2);
        if(['sampling-spectrum','binning'].includes(kind))range('bands',['取樣數','Sample Count'],3,31,2);
        if(['sensor-model','calibration'].includes(kind))range('shift',['感光曲線偏移','Response-Curve Shift'],-30,30,1,'nm');}
    } else if(kind==='cube'){range('band',['波段索引（0–30）','Band Index (0–30)'],0,30);}
    else if(kind==='scan'){select('scan',['掃描方式','Scan Mode'],[['point',['逐點','Point']],['line',['逐線','Line']],['band',['逐波段','Band']]]);range('motion',['場景移動速度','Scene Motion'],0,100);action('next',['掃描下一步','Next Scan Step']);}
    else if(['matrix','inverse','rank'].includes(kind)){range('amount',['改變兩個未知數但保留總和','Change Two Unknowns, Preserve Their Sum'],0,100);if(kind==='rank')range('rank',['獨立量測數','Independent Measurement Count'],1,3);}
    else if(['metamer','reprojection','nullnoise'].includes(kind)){range('amount',['光譜改變幅度','Spectral Change'],0,100);if(kind==='nullnoise'){range('shift',['感測器微小偏移','Small Sensor Shift'],0,5,1,'nm');range('noise',['容許量測差 × 1000','Measurement Tolerance × 1000'],0,30);}}
    else if(['manifold','local-global'].includes(kind)){range('position',['沿結構的位置','Position along Structure'],0,100);if(kind==='local-global')toggle('global',['用同一個全域方向近似','Approximate with One Global Direction']);}
    else if(kind==='pca'){range('k',['保留的主成分數','Retained Component Count'],1,5);action('sample',['更換樣本係數','Change Sample Coefficients']);}
    else if(kind==='candidates'){toggle('low',['低維條件成立','Low-Dimensional Condition Holds']);toggle('rare',['同色異譜相對少見','Metamers Are Relatively Rare']);}
    else if(['prior','coverage'].includes(kind)){materials();select('prior',['先驗範圍','Prior Coverage'],[['natural',['葉子與土壤','Leaf and Soil']],['lights',['窄頻光源','Narrow-Band Sources']],['all',['混合場景','Mixed Scenes']]]);}
    else if(kind==='sampling'){range('background',['暗背景比例','Dark-Background Coverage'],0,95,5,'%');select('region',['抽樣範圍','Sampling Region'],[['all',['整張影像','Whole Image']],['object',['物體區域','Object Region']]]);action('sample',['重新抽樣','Resample']);}
    else if(kind==='sparse'){range('a',['原子 1 權重 × 100','Atom 1 Weight × 100'],0,100,5);range('c',['原子 2 權重 × 100','Atom 2 Weight × 100'],0,100,5);range('d',['原子 3 權重 × 100','Atom 3 Weight × 100'],0,100,5);}
    else if(['dictionary','budget'].includes(kind)){range('capacity',['示意字典原子數','Teaching Dictionary Size'],4,60,4);range('budget',['非零係數預算','Nonzero-Coefficient Budget'],1,6);}
    else if(['ksvd-cycle','ksvd-residual','svd','initialization'].includes(kind)){range('angle',['候選原子角度','Candidate Atom Angle'],0,90,1,'°');if(kind==='ksvd-residual')range('subset',['觀察樣本（1–4）','Inspect Sample (1–4)'],0,3);action('next',['下一個更新階段','Next Update Stage']);action('optimal',['套用 SVD 最佳方向','Apply the Best SVD Direction']);}
    else if(['offline','pairing','truth','holdout','comparison','yasuma'].includes(kind)){action('next',['下一步','Next Step']);if(kind==='pairing')toggle('leak',['打亂高光譜配對','Scramble Hyperspectral Pairs']);if(kind==='truth')toggle('truth',['揭露真值','Reveal Ground Truth']);if(['holdout','yasuma'].includes(kind))toggle('leak',['允許同影像高光譜先驗','Allow Same-Image Hyperspectral Prior']);}
    else if(['omp-select','omp-refit','omp-stop'].includes(kind)){action('next',['執行下一步','Perform the Next Step']);if(kind==='omp-stop')range('budget',['允許最多幾個原子','Maximum Allowed Atoms'],1,6);}
    else if(kind==='repeat'){range('background',['抽樣波動幅度','Sampling Variability'],0,95,5);action('sample',['換一批隨機抽樣','Draw Another Batch']);}
    else if(kind==='errors'){range('brightness',['真值 × 1000','Reference × 1000'],1,1000);range('error',['固定加上誤差 × 1000','Added Error × 1000'],0,100);}
    else if(kind==='error-map'){range('mapBand',['波段索引（0–30）','Band Index (0–30)'],0,30);}
    else if(kind==='domain-results'){select('domain',['原文實驗組別','Reported Experimental Group'],[['complete',['完整資料集','Complete Dataset']],['park',['公園先驗 → 公園','Park Prior → Park']],['ruralpark',['鄉村先驗 → 公園','Rural Prior → Park']],['external',['外部室內資料','External Indoor Data']]]);}
    else if(kind==='parallel'){range('workers',['平行工作數','Parallel Workers'],1,8);range('frames',['像素任務數','Pixel Task Count'],8,64,8);}
    else if(kind==='runtime'){range('frames',['連續處理幀數','Frames Processed'],1,120);range('train',['一次性準備時間','One-Time Preparation'],0,5000,100,'ms');range('infer',['每幀推論時間','Inference per Frame'],5,100,5,'ms');}
    action('reset',['重設示意','Reset Demonstration']);

    function render() {
      controls.querySelectorAll('[data-value]').forEach(el=>{const k=el.dataset.value;el.textContent=state[k];});
      controls.querySelectorAll('select').forEach(el=>{el._options.forEach(([v,p],i)=>el.options[i].textContent=t(p));});
      const n=state.step;
      if(kind==='signature') {
        const phase=Math.min(2,n),pair=signaturePair(),idx=(state.lambda-400)/10,difference=pair.a[idx]-pair.b[idx],both=pair.displayA.join(', ');
        controls.querySelectorAll('[data-signature-phase]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.signaturePhase)===phase)));
        [controls.querySelector('label'),controls.querySelector('.signature-band-presets'),controls.querySelector('[data-action="signature-max"]')].forEach(el=>{el.hidden=phase!==2;});
        const next=controls.querySelector('[data-action="signature-next"]');next.disabled=phase===2;next.innerHTML=b(phase===0?['下一步：展開光譜 →','Next: Reveal the Spectra →']:phase===1?['下一步：選波段比較 →','Next: Compare One Band →']:['已完成三步觀察','All Three Views Revealed']);
        controls.querySelectorAll('[data-signature-band]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.signatureBand)===state.lambda)));
        const swatches=`<div class="signature-samples">${['A','B'].map((name,i)=>`<article><div class="signature-sample-name"><i class="signature-line-key ${i?'is-b':'is-a'}"></i><h4>${b([`樣本 ${name}`,`Sample ${name}`])}</h4></div><div class="signature-green" style="background:rgb(${both})" role="img" aria-label="${escape(t([`樣本 ${name} 的相機預覽，RGB ${both}`,`Camera preview for sample ${name}, RGB ${both}`]))}"></div><p>${b(['相機預覽 RGB','Camera Preview RGB'])}<strong>(${both})</strong></p></article>`).join('')}</div><p class="signature-same">${b(['A、B 的預覽顏色相同，RGB 數字也相同。','A and B have matching preview colors and matching RGB values.'])}</p>`;
        const stageTitle=b([['第 1 步：只看顏色，分不出 A、B','第 2 步：展開光譜，看到兩條不同的線','第 3 步：同一波段，讀到兩個不同的訊號'][phase],['Step 1: Color Alone Cannot Separate A and B','Step 2: Spectra Reveal Two Different Curves','Step 3: Read Two Signals at the Same Band'][phase]]);
        let detail='';
        if(phase===0)detail=`<div class="signature-hidden-spectrum"><span aria-hidden="true">?</span><p>${b(['相同的三個總和，沒有告訴我們每個波段各是多少。點「下一步」查看完整曲線。','Three matching totals do not reveal the value in every band. Select “Next” to inspect the complete curves.'])}</p></div>`;
        else {
          let chart=plot([{values:pair.a},{values:pair.b,dash:true}],{max:.7,marker:phase===2?state.lambda:null});
          if(phase===2){const x=52+idx*602/30;chart=chart.replace('</svg>',`<circle cx="${x}" cy="${250-pair.a[idx]*300}" r="7" fill="#008d9c" stroke="white" stroke-width="2"/><circle cx="${x}" cy="${250-pair.b[idx]*300}" r="7" fill="#d07826" stroke="white" stroke-width="2"/></svg>`);}
          detail=`<div class="signature-curve-panel"><h4>${b(['光譜圖：橫軸讀波長，縱軸讀訊號強度','Spectral Plot: Wavelength across, Signal Level Up'])}</h4>${legend([['A：青色實線','A: Teal Solid Line'],['B：橘色虛線','B: Orange Dashed Line']])}${chart}<p class="signature-graph-help">${b(['線越高，表示該樣本在那個波段的訊號越強。兩條線不重合，代表逐波段數值不同。','A higher curve means a stronger signal in that band. Curves that do not overlap have different bandwise values.'])}</p></div>`;
          if(phase===2)detail+=`<div class="signature-band-readout"><h4>${b([`目前只讀 ${state.lambda} nm 波段的兩個值`,`Reading Both Values at the ${state.lambda} nm Band`])}</h4><div class="signature-reading-row is-a"><strong>A</strong><div><i style="width:${pair.a[idx]*100}%"></i></div><output>${pair.a[idx].toFixed(3)}</output></div><div class="signature-reading-row is-b"><strong>B</strong><div><i style="width:${pair.b[idx]*100}%"></i></div><output>${pair.b[idx].toFixed(3)}</output></div><p>${b(Math.abs(difference)<.0005?['這個波段剛好很接近；換另一個波段，或點「差異最大的波段」。','This band happens to be very similar. Try another band or select the largest difference.']:[`在這個波段，${difference>0?'A':'B'} 的訊號較強，兩者相差 ${Math.abs(difference).toFixed(3)}。這裡的 0–1 是相對訊號，不是 RGB 的 0–255。`,`At this band, ${difference>0?'A':'B'} is stronger by ${Math.abs(difference).toFixed(3)}. These 0–1 values are relative signals, not 0–255 RGB values.`])}</p><p class="signature-inspection-note">${b(['滑桿只移動讀取位置，不改變 A、B 的曲線或上方綠色。','The slider only moves the reading position; it does not alter the curves or green previews.'])}</p></div>`;
        }
        const conclusions=[['先確認：相機輸出的三個 RGB 數字相同。接著才檢查，這三個數背後的完整光譜是否也相同。','First establish that the three RGB outputs match. Next inspect whether the complete spectra behind those values also match.'],['現在可看到：RGB 相同，兩條光譜卻不同。光譜特徵就是各波段訊號連成的完整形狀，不只是單一綠色。','The RGB outputs match, yet the spectra differ. A spectral signature is the full pattern across bands, not merely a single green color.'],['這一頁要理解的是：顏色相同，不代表每個波段都相同。相機把整條光譜加權成三個總和，不同波段的差異可能在總和中抵銷，所以只靠 RGB 不能保留所有光譜辨識線索。','The key observation: matching color does not imply matching bands. A camera combines the spectrum into three weighted totals, where bandwise differences may cancel. RGB therefore does not retain every spectral identification clue.']];
        out.innerHTML=`<h4 class="signature-stage-title">${stageTitle}</h4>${swatches}${detail}${note(conclusions[phase])}<details class="signature-numbers"><summary>${b(['查看相機的線性數值與計算界線','Inspect Linear Camera Values and Calculation Limits'])}</summary><p>${b(['A、B 分別經本頁同一組示意感光曲線加權，三個線性值如下。色塊再套用簡化 Gamma 顯示；這裡沒有量測真實材料。','A and B are separately weighted with the same illustrative responses. The linear values are shown below. Swatches use simplified gamma encoding; no physical material is measured here.'])}</p><p>A: (${pair.rgbA.map(v=>v.toFixed(6)).join(', ')})<br>B: (${pair.rgbB.map(v=>v.toFixed(6)).join(', ')})</p></details>`;
      } else if(spectralKinds.includes(kind)) {
        if(['gamma','linear-display'].includes(kind)) {
          const v=state.linear/1000,encoded=v**(1/2.2),display=Math.round(255*encoded);
          out.innerHTML=`${equation('C_display = round(255 × C_linear^(1/2.2))')}<div class="cx-metrics">${metric(['線性值','Linear Value'],v.toFixed(3))}${metric(['Gamma 後','After Gamma'],encoded.toFixed(3))}${metric(['8 位元值','8-Bit Value'],display)}</div><div class="cx-tone-comparison"><div style="background:rgb(${Math.round(v*255)} ${Math.round(v*255)} ${Math.round(v*255)})"><span>${b(['直接縮放','Direct Scaling'])}</span></div><div style="background:rgb(${display} ${display} ${display})"><span>${b(['簡化 Gamma 預覽','Simplified Gamma Preview'])}</span></div></div>${note(['相同線性輸入經不同顯示規則會得到不同整數；請把顯示數值與相機線性量測分開。','The same linear input yields different integers under different display rules. Keep display values separate from linear camera measurements.'])}`;
          return;
        }
        const base=spectrum(state.material),idx=(state.lambda-400)/10;
        let series=[{values:base}],extra='',labels=[['場景訊號','Scene Signal']];
        if(kind==='illumination') {
          const light=waves.map(w=>.65*(1+state.warm/150*(w-550)/150)),outgoing=base.map((v,i)=>v*light[i]);
          series=[{values:base},{values:light},{values:outgoing}];labels=[['反射率','Reflectance'],['照明','Illumination'],['出射訊號','Outgoing Signal']];
          extra=equation('S(λ) ∝ E(λ) × ρ(λ)')+metric(['目前波段乘積','Current Band Product'],`${base[idx].toFixed(3)} × ${light[idx].toFixed(3)} = ${outgoing[idx].toFixed(3)}`);
        } else if(['response','weighted'].includes(kind)) {
          const row=R[state.channel],raw=waves.map(w=>gauss(w,[610,540,455][state.channel],[54,46,39][state.channel]));
          series=[{values:base},{values:raw},{values:base.map((v,i)=>v*raw[i])}];labels=[['訊號','Signal'],['敏感度（未縮放）','Sensitivity (Unscaled)'],['逐波段乘積','Bandwise Product']];
          extra=equation('c̃_k = Σ_j h_j × R̃_k,j')+`<div class="cx-metrics">${metric(['選中通道','Selected Channel'],['R','G','B'][state.channel])}${metric(['正規化權重','Normalized Weight'],row[idx].toFixed(4))}${metric(['整段加權和 c̃ₖ','Full Weighted Sum c̃ₖ'],dot(base,row).toFixed(4))}</div>`;
        } else if(['sensor-model','calibration'].includes(kind)) {
          const r2=response(state.shift),a=rgb(base),c=rgb(base,r2);
          series=[{values:R[1].map(v=>v*10)},{values:r2[1].map(v=>v*10)}];labels=[['基準 G 曲線 ×10','Reference G Response ×10'],['偏移 G 曲線 ×10','Shifted G Response ×10']];
          extra=`<div class="cx-metrics">${metric(['基準三通道','Reference Channels'],a.map(v=>v.toFixed(3)).join(', '))}${metric(['偏移模型三通道','Shifted-Model Channels'],c.map(v=>v.toFixed(3)).join(', '))}${metric(['量測差距','Measurement Difference'],norm(add(a,c,-1)).toFixed(4))}</div>`;
        } else if(['sampling-spectrum','binning'].includes(kind)) {
          const samples=Array.from({length:state.bands},(_,i)=>{const center=400+i*300/(state.bands-1);const values=Array.from({length:101},(_,j)=>center-state.width/2+j*state.width/100).filter(w=>w>=400&&w<=700);return {center,value:values.reduce((s,w)=>s+signal(state.material,w),0)/values.length};});
          const approx=waves.map(w=>{let right=samples.findIndex(p=>p.center>=w);if(right<=0)return samples[Math.max(0,right)].value;const l=samples[right-1],r=samples[right];return l.value+(r.value-l.value)*(w-l.center)/(r.center-l.center);});
          series=[{values:base},{values:approx,dash:true}];labels=[['細取樣參考','Fine-Sampled Reference'],['分箱取樣近似','Binned Approximation']];extra=metric(['波段數 × 波段寬度','Band Count × Band Width'],`${state.bands} × ${state.width} nm`);
        } else {
          const values=Array.from({length:101},(_,i)=>state.lambda-state.width/2+i*state.width/100).filter(w=>w>=400&&w<=700);
          extra=`<div class="cx-metrics">${metric(['中心波長','Band Center'],`${state.lambda} nm`)}${metric(['寬度','Width'],`${state.width} nm`)}${metric(['此區間平均訊號','Mean Signal over Interval'],(values.reduce((s,w)=>s+signal(state.material,w),0)/values.length).toFixed(3))}</div>`;
        }
        out.innerHTML=legend(labels)+plot(series,{max:1.15,marker:state.lambda,bandWidth:['band','binning','sampling-spectrum'].includes(kind)?state.width:null})+extra+note(kind==='band'?['淡橘區是實際累積的波段範圍，直線是中心波長。加寬時讀到的是一段範圍的平均，未必等於中心單點的訊號。','The pale orange region is the accumulated band interval; the line marks its center. A wider interval gives an average that need not equal the center-point signal.']:['曲線與數值是同一次計算的不同讀法；先讀座標，再比較變化，最後回到本頁要回答的問題。','The graphic and values describe the same calculation. Read the axes, compare the changes, and connect the observation to this page’s question.']);
      } else if(kind==='cube') {
        const w=400+state.band*10,x=state.pixel%5,y=Math.floor(state.pixel/5),kindAt=(i)=>i<10?'sky':i%5<2?'leaf':'soil',h=spectrum(kindAt(state.pixel));
        const layer=state.band/6,origin=[160+layer*9,40+layer*22],voxel=[origin[0]+22+x*36,origin[1]+10+y*16];
        let stack='';for(let i=0;i<6;i++)stack+=`<rect x="${160+i*9}" y="${40+i*22}" width="185" height="85" rx="6" fill="#c9e3e5" fill-opacity=".28" stroke="#65939d"/>`;
        stack+=`<path d="M${182+x*36} ${50+y*16}l45 110" stroke="#7459ac" stroke-width="9" opacity=".7"/><rect x="${origin[0]}" y="${origin[1]}" width="185" height="85" rx="6" fill="#f1bf7a" fill-opacity=".35" stroke="#d07826" stroke-width="3"/><circle cx="${voxel[0]}" cy="${voxel[1]}" r="8" fill="#14213d" stroke="white" stroke-width="3"/><text x="405" y="95">${escape(t(['橘片：固定波段','Orange: fixed band']))}</text><text x="405" y="125">${escape(t(['紫柱：固定位置','Purple: fixed position']))}</text><text x="405" y="155">${escape(t(['交會：一個體素','Intersection: one voxel']))}</text><text x="170" y="265">${escape(t(['堆疊方向是波長；六層代表 31 個波段','Stack axis = wavelength; six sheets represent 31 bands']))}</text>`;
        out.innerHTML=svg(stack,['資料立方體的波段切片與像素直柱','Band Slice and Pixel Column in a Data Cube'])+`<div class="cx-cube-grid">${Array.from({length:25},(_,i)=>{const v=signal(kindAt(i),w),gray=Math.round(v*255);return `<button type="button" data-pixel="${i}" aria-label="${escape(t(['選取像素','Select Pixel']))} (${i%5}, ${Math.floor(i/5)})" aria-pressed="${state.pixel===i}" style="background:rgb(${gray} ${gray} ${gray})"><span>${i%5},${Math.floor(i/5)}</span></button>`;}).join('')}</div><div class="cx-metrics">${metric(['固定位置','Fixed Position'],`x=${x}, y=${y}`)}${metric(['波長切片','Wavelength Slice'],`${w} nm`)}${metric(['交會體素 I[x,y,b]','Intersecting Voxel I[x,y,b]'],h[state.band].toFixed(3))}</div>${plot([{values:h}],{marker:w})}${note(['點選格子只改變固定位置；拖曳波段則改變全圖亮暗。曲線上的標記值就是交會體素。','Clicking a cell changes the fixed position. Moving the band changes image brightness. The marked curve value is their intersecting voxel.'])}`;
      } else if(kind==='scan') {
        const total=state.scan==='point'?36:6,done=n% (total+1),time=done/total,shift=state.motion/100*time*80;
        let graphic='';for(let i=0;i<36;i++){const row=Math.floor(i/6),col=i%6,acquired=state.scan==='point'?i<done:state.scan==='line'?row<done:done>0;graphic+=`<rect x="${95+col*55}" y="${30+row*34}" width="50" height="29" rx="5" fill="${acquired?'#6bbac0':'#dce5eb'}"/>`;}
        graphic+=`<circle cx="${245+shift}" cy="120" r="26" fill="#d07826" opacity=".85"/><circle cx="245" cy="120" r="27" fill="none" stroke="#14213d" stroke-dasharray="5 5"/>`;
        out.innerHTML=svg(graphic,['掃描進度與移動物體','Scan Progress and a Moving Object'])+`<div class="cx-metrics">${metric(['完成步數','Completed Steps'],`${done} / ${total}`)}${metric(['相對位置改變','Relative Position Change'],shift.toFixed(1))}</div>${note(state.scan==='band'?['逐波段時每次取得整個畫面的一個波段；不同波段在不同時間量到，物體移動就會錯位。','Each band scan acquires a full frame at one band. Different bands are measured at different times, so motion causes misalignment.']:['著色格是已讀位置。虛線是起始輪廓，實心物體是目前位置；兩者差距隨掃描時間累積。','Colored cells mark acquired positions. The dashed outline is the starting position, while the solid object marks the current position. Their gap grows during scanning.'])}`;
      } else if(['matrix','inverse','rank'].includes(kind)) {
        const v=state.amount/100,h=[.2+.5*v,.8-.5*v,.4,.6],rows=[[.5,.5,0,0],[0,0,.5,.5],[.5,0,.5,0]],count=kind==='rank'?state.rank:2;
        const c=rows.slice(0,count).map(row=>dot(row,h));
        out.innerHTML=equation(`(${count}×4) × (4×1) = (${count}×1)`)+cellTable([['量測列','Measurement Row'],['h₁','h₁'],['h₂','h₂'],['h₃','h₃'],['h₄','h₄'],['輸出','Output']],rows.slice(0,count).map((row,i)=>[`R${i+1}`,...row.map(v=>v.toFixed(1)),c[i].toFixed(3)]))+`<div class="cx-metrics">${metric(['四個未知值 h','Four Unknown Values h'],h.map(v=>v.toFixed(2)).join(', '))}${metric(['獨立限制','Independent Constraints'],count)}${metric(['自由方向數','Free Directions'],4-count)}</div>${note(count<=2?['h₁ 增加多少，h₂ 就減少多少，因此前兩個量測維持 0.500。第三條獨立量測才有機會看見這個改變。','h₁ rises by the same amount h₂ falls, so the first two outputs stay at 0.500. A third independent measurement can reveal this particular change.']:['第三條量測會隨 h₁ 改變。但四個未知值仍只有三個獨立限制，另有一個自由方向。','The third measurement changes with h₁. Four unknowns still have only three independent constraints, leaving another free direction.'])}`;
      } else if(['metamer','reprojection','nullnoise'].includes(kind)) {
        const hA=q.map(v=>.5+state.amount/100*.35*v),hB=q.map(v=>.5-state.amount/100*.35*v),a=rgb(hA),c=rgb(hB),mismatch=norm(add(rgb(hA,response(state.shift)),rgb(hB,response(state.shift)),-1));
        out.innerHTML=legend([['光譜 A','Spectrum A'],['光譜 B','Spectrum B']])+plot([{values:hA},{values:hB,dash:true}])+`<div class="cx-metrics">${metric(['光譜距離','Spectral Distance'],norm(add(hA,hB,-1)).toFixed(3))}${metric(['基準感測器 RGB 差','Reference-Sensor RGB Difference'],norm(add(a,c,-1)).toExponential(2))}${metric(kind==='nullnoise'?['偏移感測器差距','Shifted-Sensor Difference']:['A、B 共同線性輸出','Shared Linear Output'],kind==='nullnoise'?mismatch.toFixed(5):a.map(v=>v.toFixed(3)).join(', '))}</div>${equation('R(h + αq) = Rh + αRq = Rh,  Rq = 0')}${note(kind==='nullnoise'?[`偏移模型的差距 ${mismatch.toFixed(5)} ${mismatch<=state.noise/1000?'小於或等於':'大於'}目前容許差 ${ (state.noise/1000).toFixed(3)}。這個門檻只示範辨識能力。`,`The shifted-model difference ${mismatch.toFixed(5)} is ${mismatch<=state.noise/1000?'within':'above'} the tolerance ${(state.noise/1000).toFixed(3)}. This threshold only illustrates distinguishability.`]:['兩條光譜逐漸不同，基準三通道卻保持相同。這是實際投影計算，不是把 RGB 文字固定不動。','The spectra separate while the three baseline channels remain equal. The displayed values are recomputed projections, not fixed text.'])}`;
      } else if(['manifold','local-global'].includes(kind)) {
        const points=Array.from({length:61},(_,i)=>{const a=(i/60-.5)*2.4;return [a,Math.sin(a*2)*.55,Math.cos(a*2)*.45];}),idx=Math.round(state.position*.6),project=v=>[340+v[0]*150+v[2]*55,150-v[1]*105+v[2]*30];
        let graphic='<path d="M100 245H590M340 270V25" stroke="#b5c5d2"/>';
        points.forEach((v,i)=>{const p=project(v);graphic+=`<circle cx="${p[0]}" cy="${p[1]}" r="${i===idx?8:3}" fill="${i===idx?'#d07826':'#008d9c'}"/>`;});
        if(state.global)graphic+='<path d="M150 150H530" stroke="#7459ac" stroke-width="4" stroke-dasharray="8 5"/>';
        const p=points[idx];out.innerHTML=svg(graphic,['三維空間中由一個參數控制的曲線','A Curve in 3D Controlled by One Parameter'])+`<div class="cx-metrics">${metric(['位置參數','Position Parameter'],(state.position/100).toFixed(2))}${metric(['三維座標','Three Coordinates'],p.map(v=>v.toFixed(2)).join(', '))}</div>${note(kind==='local-global'?['彎曲結構的不同區域需要不同局部方向；一條固定直線可能無法接近所有區域。此圖用 1D 局部結構類比論文的多原子小組。','Different parts of a curved structure need different local directions. One fixed line may not fit all regions. This 1D local analogy illustrates the paper’s varying atom subsets.']:['三個座標一起變化，但只有一個位置參數在控制。環境維度是 3，這條合成曲線的內在維度是 1。','Three coordinates vary together while only one position parameter controls them. The ambient dimension is 3; this synthetic curve has intrinsic dimension 1.'])}`;
      } else if(kind==='pca') {
        const basis=Array.from({length:5},(_,k)=>waves.map((_,j)=>Math.sqrt(2/31)*Math.cos(Math.PI*(j+.5)*(k+1)/31))),weights=[.70,.45,-.30,.22,-.16].map((v,i)=>v*Math.cos((state.seed-1)*.43+i*.1)),truth=waves.map((_,j)=>.5+basis.reduce((s,row,i)=>s+row[j]*weights[i],0)),approx=waves.map((_,j)=>.5+basis.slice(0,state.k).reduce((s,row,i)=>s+row[j]*weights[i],0)),ratio=[50,25,12,8,5].slice(0,state.k).reduce((a,c)=>a+c,0);
        out.innerHTML=legend([['完整合成樣本','Full Synthetic Sample'],['保留 k 個方向','Keep k Directions']])+plot([{values:truth},{values:approx,dash:true}])+equation('ĥ = μ + Σᵢ₌₁ᵏ aᵢ bᵢ')+`<div class="cx-metrics">${metric(['合成資料累積變異','Synthetic Cumulative Variance'],`${ratio}%`)}${metric(['此樣本 RMSE','This Sample’s RMSE'],(norm(add(truth,approx,-1))/Math.sqrt(31)).toFixed(4))}</div>${note(['合成模型設定五個正交方向的變異比例為 50%、25%、12%、8%、5%。比例屬於資料模型；個別樣本誤差會隨係數改變。','This synthetic model assigns variances of 50%, 25%, 12%, 8%, and 5% to five orthogonal directions. The ratios belong to the data model; an individual sample’s error changes with its coefficients.'])}`;
      } else if(kind==='candidates') {
        const counts=[48,state.low?14:48,state.low?(state.rare?3:9):(state.rare?12:24)];
        out.innerHTML=`<div class="cx-candidate-stages">${counts.map((count,i)=>`<section><h4>${b([['所有候選','自然先驗範圍','再符合 RGB'][i],['All Candidates','Natural Prior','Also Match RGB'][i]])}</h4><div class="cx-dots">${Array.from({length:count},()=>'<i></i>').join('')}</div></section>`).join('')}</div>${note(state.low&&state.rare?['兩個條件讓候選減少，仍保留多個可能。必須有額外證據才能判斷哪一條接近真值。','Both conditions narrow the candidates, while several possibilities remain. Additional evidence is needed to judge closeness to truth.']:['至少一項條件失效，候選集合較難縮小；不能只因演算法輸出一條曲線就宣稱它正確。','At least one condition fails, making the candidate set harder to narrow. A single algorithm output does not by itself establish correctness.'])}`;
      } else if(['prior','coverage'].includes(kind)) {
        const allowed=state.prior==='natural'?['leaf','soil']:state.prior==='lights'?['laser']:['leaf','soil','laser','sky'],target=spectrum(state.material),scored=allowed.map(k=>({k,h:spectrum(k)})).map(o=>({...o,error:norm(add(o.h,target,-1))/Math.sqrt(31)})).sort((a,c)=>a.error-c.error),best=scored[0];
        out.innerHTML=legend([['目標光譜','Target'],['最近先驗候選','Nearest Prior Candidate']])+plot([{values:target},{values:best.h,dash:true}])+`<div class="cx-metrics">${metric(['先驗候選數','Prior Candidate Count'],allowed.length)}${metric(['最近候選 RMSE','Nearest-Candidate RMSE'],best.error.toFixed(4))}</div>${note(['這裡用最近候選篩選把「涵蓋範圍」具體化；論文實際是學字典並求稀疏組合，不是直接挑一條資料曲線。','Nearest-candidate selection makes coverage visible. The paper learns a dictionary and sparse combinations rather than simply selecting one stored spectrum.'])}`;
      } else if(kind==='sampling') {
        const random=rng(state.seed),sample=Array.from({length:100},()=>state.region==='all'?random()>=state.background/100:true),objects=sample.filter(Boolean).length;
        out.innerHTML=`<div class="cx-sample-grid">${sample.map(v=>`<i class="${v?'is-object':'is-background'}"></i>`).join('')}</div>${legend([['物體樣本','Object Samples'],['暗背景樣本','Dark-Background Samples']])}<div class="cx-metrics">${metric(['抽到物體','Objects Sampled'],`${objects} / 100`)}${metric(['抽到背景','Background Sampled'],`${100-objects} / 100`)}</div>${note(state.region==='all'?['每個像素等機率被抽到，卻不代表每種材料都有足夠樣本。背景比例越高，物體光譜通常越少。','Equal sampling probability per pixel does not ensure enough samples of every material. More background usually means fewer object spectra.']:['物體區域抽樣避開暗背景，但可能漏掉區域外的重要材料；選區規則必須明示。','Object-region sampling avoids dark background but may omit important materials elsewhere; the selection rule must be disclosed.'])}`;
      } else if(kind==='sparse') {
        const atoms=[spectrum('leaf'),spectrum('soil'),spectrum('sky')],w=[state.a,state.c,state.d].map(v=>v/100),h=waves.map((_,j)=>atoms.reduce((s,a,i)=>s+w[i]*a[j],0));
        out.innerHTML=plot(atoms.map((a,i)=>({values:scale(a,w[i])})).concat([{values:h,color:'#14213d'}]),{max:Math.max(1,...h)})+equation(`ĥ = ${w.map((v,i)=>`${v.toFixed(2)} d${i+1}`).join(' + ')}`)+metric(['非零權重數','Nonzero Weight Count'],w.filter(v=>v!==0).length)+note(['曲線是三個加權貢獻相加。把某個權重調成零，就完全不使用那個原子；權重不需要加總為 1。','The curve adds three weighted contributions. Setting a weight to zero removes that atom; the weights need not sum to one.']);
      } else if(['dictionary','budget'].includes(kind)) {
        const atoms=Array.from({length:state.capacity},(_,i)=>[Math.cos(i*Math.PI/state.capacity),Math.sin(i*Math.PI/state.capacity)]),target=[Math.cos(.71),Math.sin(.71)],first=atoms.reduce((best,a,i)=>Math.abs(dot(a,target))>best.score?{i,score:Math.abs(dot(a,target))}:best,{i:0,score:-1}),one=fit([atoms[first.i]],target),two=fit([atoms[first.i],atoms[(first.i+Math.floor(state.capacity/3))%state.capacity]],target),used=state.budget===1?1:2,err=norm((used===1?one:two).residual);
        let graphic='<path d="M90 245H580M100 250V30" stroke="#bccbd6"/>';atoms.forEach((a,i)=>{graphic+=`<path d="M110 240L${110+a[0]*165} ${240-a[1]*165}" stroke="${i===first.i?'#d07826':'#9dc9cd'}" stroke-width="${i===first.i?4:1}"/>`;});graphic+='<path d="M110 240L'+(110+target[0]*195)+' '+(240-target[1]*195)+'" stroke="#14213d" stroke-width="4"/>';
        out.innerHTML=svg(graphic,['二維字典中的多個候選方向','Many Candidate Directions in a 2D Dictionary'])+`<div class="cx-metrics">${metric(['候選原子','Candidate Atoms'],state.capacity)}${metric(['允許最多','Allowed Budget'],state.budget)}${metric(['此二維示意實際使用','Used in This 2D Example'],used)}${metric(['重建殘差','Residual'],err.toFixed(5))}</div>${note(['這個二維模型用兩個獨立方向就能表示目標；提高上限不表示一定用滿。論文的 500、28 是不同規模的設定。','Two independent directions can represent this 2D target. Increasing a budget does not require using it fully. The paper’s 500 and 28 refer to its different-scale setting.'])}`;
      } else if(['ksvd-cycle','ksvd-residual','svd','initialization'].includes(kind)) {
        const angle=state.angle*Math.PI/180,best=principalAngle(residuals),d=[Math.cos(angle),Math.sin(angle)],chosen=residuals[state.subset],stages=[['固定字典求係數','Fix Dictionary, Fit Coefficients'],['扣除其他原子','Subtract Other Atoms'],['SVD 更新方向與係數','SVD Updates Direction and Coefficients']],active=n%3;
        const px=v=>[110+v[0]*300,250-v[1]*180];let graphic='<path d="M100 250H590M110 260V25" stroke="#b5c8d1"/>';
        residuals.forEach((v,i)=>{const p=px(v),projection=scale(d,dot(v,d)),p2=px(projection);graphic+=`<path d="M110 250L${p[0]} ${p[1]}" stroke="${colors[i]}" stroke-width="3"/><path d="M${p[0]} ${p[1]}L${p2[0]} ${p2[1]}" stroke="${colors[i]}" stroke-dasharray="4 4"/><circle cx="${p[0]}" cy="${p[1]}" r="${state.subset===i?7:4}" fill="${colors[i]}"/>`;});const end=px(scale(d,1.7));graphic+=`<path d="M110 250L${end[0]} ${end[1]}" stroke="#14213d" stroke-width="5"/>`;
        out.innerHTML=flow(stages,active)+svg(graphic,['殘差向量投影與候選原子方向','Residual Projections and Candidate Atom Direction'])+`<div class="cx-metrics">${metric(['目前總平方誤差','Current Squared Error'],directionError(residuals,angle).toFixed(4))}${metric(['最佳可達平方誤差','Best Squared Error'],directionError(residuals,best).toFixed(4))}${metric(['此樣本更新係數','Selected Sample Coefficient'],dot(chosen,d).toFixed(3))}</div>${kind==='ksvd-residual'?equation(`y${state.subset+1} = (${chosen[0].toFixed(2)}, ${(chosen[1]+.4).toFixed(2)}), other = (0, 0.40)\ne${state.subset+1} = y${state.subset+1} − other = (${chosen.map(v=>v.toFixed(2)).join(', ')})`):''}${note(kind==='ksvd-residual'?['圖中箭頭已是扣除其他原子後的殘差。選中的樣本投影係數，是更新時與原子同步調整的量。','The arrows already represent residuals after subtracting other atoms. The selected sample’s projection coefficient changes jointly with the atom.']:['旋轉黑色方向線，虛線表示投影後無法解釋的部分。按「套用 SVD 最佳方向」會把平方誤差降到此矩陣的最小值。','Rotate the dark direction line; dashed segments show unexplained projection errors. Apply the best SVD direction to minimize squared error for this matrix.'])}`;
      } else if(['offline','pairing','truth','holdout','comparison','yasuma'].includes(kind)) {
        if(kind==='pairing') {
          const hs=[spectrum('leaf'),spectrum('soil'),spectrum('sky')],idx=n%3,used=state.leak?(idx+1)%3:idx;
          out.innerHTML=flow([['高光譜原子','Hyperspectral Atom'],['投影成 RGB','Project to RGB'],['按編號對回光譜','Transfer by Index']],idx)+metric(['RGB 原子來源','RGB Atom Source'],`c${idx+1}`)+metric(['取回的高光譜原子','Retrieved Hyperspectral Atom'],`h${used+1}`)+plot([{values:hs[idx]},{values:hs[used],dash:true}])+note(state.leak?['配對被打亂：相同係數拿回另一條曲線，原本的代數一致性不再成立。','Pairing is scrambled: the same coefficient retrieves another curve, breaking the original algebraic consistency.']:['正反面編號一致，係數才可搬回正確的光譜原子。','Matching indices allow coefficients to return to the correct spectral atoms.']);
        } else if(['holdout','yasuma'].includes(kind)) {
          const test=n%6;
          out.innerHTML=`<div class="cx-image-split">${Array.from({length:6},(_,i)=>`<article class="${i===test?'cx-test':'cx-train'}"><strong>${i+1}</strong>${b(i===test?['測試影像','Test Image']:['訓練影像','Training Image'])}${i===test&&state.leak?b(['部分 HS 也提供先驗','Some HS Also Builds the Prior']):''}</article>`).join('')}</div>${equation(state.leak?'Yasuma: 10,000 HS samples / image ≈ 3.8%':'ICVL: test image held out; 1,000 pixels / other image')}${note(state.leak?['此設定允許取得待重建影像的部分高光譜。請把它解讀為特定資訊條件，與完全保留測試影像的主實驗分開。','This setting allows partial hyperspectral access to the image being reconstructed. Interpret it separately from the main held-out-image experiment.']:['測試圖的高光譜只用於最後評分，不用來建立該輪字典。切換下一步會換一張完整測試圖。','The test image’s spectra score the result but do not build that round’s dictionary. The next step holds out another whole image.'])}`;
        } else if(kind==='comparison') {
          const rows=[[['主 ICVL 實驗','Main ICVL Experiment'],'RGB',['其他影像 HS 先驗','HS Prior from Other Images']],[['Yasuma 比較設定','Yasuma Comparison Setting'],'RGB',['同圖 3.8% HS 先驗','3.8% Same-Image HS Prior']],[['Kawakami 比較法','Kawakami Comparator'],['RGB＋低解析 HS','RGB + Low-Resolution HS'],['測試場景額外量測','Extra Test-Scene Measurements']],[['可控照明方法','Controlled-Illumination Methods'],['多次特定照明拍攝','Multiple Controlled-Light Captures'],['特殊光源','Special Light Sources']]];
          out.innerHTML=cellTable([['方法／情境','Method / Setting'],['取得的輸入','Input'],['額外條件','Additional Conditions']],rows)+note(['先比較每個方法「知道多少」，再比較誤差與成本。按下一步依序突出不同資訊條件。','Compare what each method knows before comparing its error and cost. The next step highlights another information setting.'])+metric(['目前聚焦設定','Setting in Focus'],t(rows[n%4][0]));
        } else if(kind==='truth') {
          const truth=spectrum('leaf'),estimate=truth.map((v,i)=>v+.07*Math.sin(i*.65));out.innerHTML=flow([['保存 HS 真值','Retain HS Ground Truth'],['生成 RGB 輸入','Generate RGB Input'],['重建','Reconstruct'],['比較真值','Compare with Truth']],n%4)+plot([{values:estimate},...(state.truth?[{values:truth,dash:true}]:[])])+legend([['估計曲線','Estimate'],...(state.truth?[[ '保留真值','Retained Ground Truth']]:[])])+metric(['可直接評估光譜嗎？','Can Spectral Error Be Evaluated?'],t(state.truth?['可以比較此合成樣本','Yes, for This Synthetic Sample']:['尚未揭露參考','Reference Not Revealed']))+note(['實際評估必須保存完整高光譜量測。畫面上的重建曲線看起來平滑，不能取代與真值的比較。','Evaluation requires retaining measured spectra. A smooth-looking reconstruction cannot substitute for comparison with ground truth.']);
        } else {
          const stages=[['收集 HS 先驗','Collect HS Prior'],['K-SVD 學字典','Learn Dictionary'],['投影 RGB 字典','Project RGB Dictionary'],['新 RGB 求 w','Fit w for New RGB'],['同權重重建 HS','Recover HS with Same w']];
          out.innerHTML=flow(stages,n%5)+`<div class="cx-phase-pair"><article><h4>${b(['一次性準備','Reusable Preparation'])}</h4><p>${b(['前三步：需要高光譜先驗及相機模型。','First three steps: require hyperspectral priors and a camera model.'])}</p></article><article><h4>${b(['每張新圖','Each New Image'])}</h4><p>${b(['後兩步：對每個新 RGB 像素執行。','Last two steps: run for each new RGB pixel.'])}</p></article></div>${note(['同一套適用的字典可以重複使用；換設備或目標場景時，需要重新確認先驗與相機模型。','A suitable dictionary can be reused. Changes in equipment or target domain require checking both prior and camera model again.'])}`;
        }
      } else if(['omp-select','omp-refit','omp-stop'].includes(kind)) {
        const states=omp(kind==='omp-stop'?state.budget:3),s=states[Math.min(n,states.length-1)],prev=states[Math.max(0,Math.min(n,states.length-1)-1)],scores=ompAtoms.map((a,i)=>Math.abs(dot(a,prev.residual)));
        controls.querySelector('[data-action="next"]').disabled=n>=states.length-1;
        let graphic='<path d="M100 245H600M105 250V25" stroke="#b8c8d2"/>';const point=v=>[130+v[0]*420+v[2]*75,245-v[1]*280-v[2]*35];
        ompAtoms.forEach((a,i)=>{const p=point(scale(a,.75));graphic+=`<path d="M130 245L${p[0]} ${p[1]}" stroke="${s.selected.includes(i)?'#d07826':'#afc7d5'}" stroke-width="3"/><text x="${p[0]+6}" y="${p[1]}">${i+1}</text>`;});const target=point(ompTarget),estimate=point(s.estimate);graphic+=`<circle cx="${target[0]}" cy="${target[1]}" r="8" fill="#14213d"/><circle cx="${estimate[0]}" cy="${estimate[1]}" r="7" fill="#008d9c"/><path d="M${estimate[0]} ${estimate[1]}L${target[0]} ${target[1]}" stroke="#7459ac" stroke-width="4" stroke-dasharray="5 4"/>`;
        out.innerHTML=svg(graphic,['三維 RGB 向量的斜投影，包含目標、重建與殘差','Oblique View of 3D RGB Vectors: Target, Estimate, and Residual'])+cellTable([['原子','Atom'],['本次選擇前的相關分數','Correlation before This Selection'],['目前重算係數','Current Refitted Weight']],ompAtoms.map((a,i)=>{const j=s.selected.indexOf(i);return [String(i+1),scores[i].toFixed(4),j<0?'0':s.weights[j].toFixed(4)];}))+`<div class="cx-metrics">${metric(['選取順序','Selection Order'],s.selected.map(i=>i+1).join(' → ')||'—')}${metric(['殘差長度','Residual Norm'],norm(s.residual).toFixed(6))}${metric(['已選獨立方向','Selected Independent Directions'],s.selected.length)}</div>${kind==='omp-refit'&&s.selected.length>1?metric(['上一輪舊係數 → 此輪重算','Previous Weights → Refit'],`${prev.weights.map(v=>v.toFixed(3)).join(', ')} → ${s.weights.slice(0,-1).map(v=>v.toFixed(3)).join(', ')}`):''}${note(norm(s.residual)<1e-9?['已達近零殘差。RGB 擬合完成，仍需獨立高光譜真值才能評估光譜準確度。','The residual is near zero. RGB fitting is complete; spectral accuracy still requires independent hyperspectral ground truth.']:s.selected.length>=Math.min(3,state.budget)&&kind==='omp-stop'?['目前達到原子預算而停止，仍有殘差。提高預算才可再選方向。','The atom budget has been reached with a remaining residual. Increase it to allow another direction.']:['每一步先用目前殘差選原子，再對已選原子一起重算係數；圖中紫色虛線是剩餘差值。','Each step selects against the current residual, then refits all selected coefficients. The purple dashed segment marks the remaining difference.'])}`;
      } else if(kind==='repeat') {
        const random=rng(state.seed),data=Array.from({length:20},()=>.08+(random()-.5)*state.background/100*.09),mean=data.reduce((a,c)=>a+c,0)/data.length,sd=Math.sqrt(data.reduce((s,v)=>s+(v-mean)**2,0)/data.length);
        out.innerHTML=svg(data.map((v,i)=>`<rect x="${50+i*29}" y="${250-v*1400}" width="21" height="${v*1400}" rx="4" fill="#008d9c"/>`).join('')+`<path d="M45 ${250-mean*1400}H650" stroke="#d07826" stroke-width="3" stroke-dasharray="5 5"/>`,['20 次合成抽樣結果與平均','20 Synthetic Sampling Results and Their Mean'])+`<div class="cx-metrics">${metric(['合成平均','Synthetic Mean'],mean.toFixed(4))}${metric(['合成標準差','Synthetic Standard Deviation'],sd.toFixed(4))}${metric(['隨機種子','Random Seed'],state.seed)}</div>${note(['重新抽樣會改變個別結果。平均描述中心，標準差描述波動，兩者提供不同訊息；這不是作者原始重複實驗數字。','Resampling changes individual results. The mean describes the center and standard deviation the spread. These are not the authors’ original repeat-run values.'])}`;
      } else if(kind==='errors') {
        const truth=state.brightness/1000,error=state.error/1000;out.innerHTML=equation(`h = ${truth.toFixed(3)}, ĥ = ${(truth+error).toFixed(3)}`)+`<div class="cx-metrics">${metric(['絕對誤差','Absolute Error'],error.toFixed(3))}${metric(['相對誤差','Relative Error'],`${(100*error/truth).toFixed(1)}%`)}${metric(['單值平方誤差','Single Squared Error'],(error**2).toFixed(6))}</div><div class="cx-error-scale"><i style="width:${Math.min(100,error/truth*100)}%"></i></div>${note(['往暗處降低真值，絕對差距維持不變，相對比例卻升高。真值為零時，這個比值沒有定義，所以滑桿最低是 0.001。','As the reference darkens, the absolute difference stays fixed while its relative size increases. The ratio is undefined at zero, so the slider stops at 0.001.'])}`;
      } else if(kind==='error-map') {
        const errors=Array.from({length:36},(_,i)=>.01+.12*gauss(state.mapBand,Math.floor(i/6)*6,4)*(i%6+1)/6),mean=errors.reduce((a,c)=>a+c,0)/36,p=state.pixel%36;
        out.innerHTML=`<div class="cx-error-map">${errors.map((v,i)=>`<button type="button" data-pixel="${i}" aria-label="${escape(t(['選取誤差格','Select Error Cell']))} ${i+1}" aria-pressed="${p===i}" style="background:rgba(208,120,38,${.1+v*6})">${v.toFixed(3)}</button>`).join('')}</div><div class="cx-metrics">${metric(['目前波段','Current Band'],`${400+state.mapBand*10} nm`)}${metric(['空間平均誤差','Spatial Mean Error'],mean.toFixed(4))}${metric(['選中格誤差','Selected Cell Error'],errors[p].toFixed(4))}</div>${note(['切換波段會把錯誤集中到不同位置；平均相近時，錯誤分布仍可能不同。格子數值是合成絕對誤差。','Changing bands moves concentrated errors to different locations. Similar averages can hide different spatial patterns. Cells show synthetic absolute errors.'])}`;
      } else if(kind==='domain-results') {
        const data={complete:[.0756,2.633],park:[.0589,2.105],ruralpark:[.0801,2.693],external:[.5207,5.685]},v=data[state.domain];out.innerHTML=`<p class="cx-paper-data">${b(['原文 Table 1 數據','Values from Paper Table 1'])}</p><div class="cx-metrics">${metric(['作者報告相對誤差','Authors’ Relative Error'],v[0].toFixed(4))}${metric(['絕對 RMSE，0–255 尺度','Absolute RMSE, 0–255 Scale'],v[1].toFixed(3))}</div>${cellTable([['公園測試的先驗','Prior for Park Test'],['相對誤差','Relative Error']],[[['公園','Park'],'0.0589'],[['鄉村','Rural'],'0.0801']])}${note(state.domain==='external'?['外部室內資料的暗像素、420–720 nm 範圍、模糊與移動等差異需一起考慮。不能只從這個數字判斷單一原因。','External indoor data differ in dark pixels, 420–720 nm coverage, blur, and motion. The score alone does not isolate one cause.']:['切換條件是在閱讀不同原文實驗組，並非控制其他條件不變後的即時重建。','Switching reads different reported experimental groups; it is not a live reconstruction with all other conditions controlled.'])}`;
      } else if(kind==='parallel') {
        const tasks=state.frames,rounds=Math.ceil(tasks/state.workers);out.innerHTML=`<div class="cx-worker-grid">${Array.from({length:state.workers},(_,i)=>`<article><strong>${i+1}</strong><div>${Array.from({length:Math.floor(tasks/state.workers)+(i<tasks%state.workers?1:0)},()=>'<i></i>').join('')}</div></article>`).join('')}</div><div class="cx-metrics">${metric(['序列處理回合','Serial Rounds'],tasks)}${metric(['理想平行回合','Ideal Parallel Rounds'],rounds)}${metric(['理想加速比','Ideal Speedup'],`${(tasks/rounds).toFixed(2)}×`)}</div>${note(['每格是相同成本的獨立任務。真實情況還有記憶體、傳輸、排程與工作量不均，實際加速通常較低。','Each cell is an equal-cost independent task. Memory, transfer, scheduling, and unequal workloads generally reduce real speedup.'])}`;
      } else if(kind==='runtime') {
        const total=state.train+state.frames*state.infer,avg=total/state.frames;out.innerHTML=equation('Total = T_prepare + N × T_infer')+`<div class="cx-metrics">${metric(['假設總時間','Hypothetical Total Time'],`${total} ms`)}${metric(['分攤後每幀','Amortized Time per Frame'],`${avg.toFixed(1)} ms`)}${metric(['只看推論的幀率','Inference-Only Frame Rate'],`${(1000/state.infer).toFixed(1)} fps`)}</div>${note([`30 fps 的每幀預算約 33.3 ms。目前假設每幀推論 ${state.infer} ms，${state.infer<=33.333?'符合':'超過'}該預算；一次性準備另計。`,`A 30 fps budget is about 33.3 ms per frame. The hypothetical ${state.infer} ms inference ${state.infer<=33.333?'fits':'exceeds'} that budget; preparation is separate.`])}`;
      }
    }
    controls.addEventListener('input',event=>{const el=event.target,key=el.dataset.field;if(!key)return;state[key]=el.type==='checkbox'?el.checked:el.tagName==='SELECT'?el.value:Number(el.value);if(key==='budget')state.step=0;render();});
    controls.addEventListener('change',event=>{if(event.target.tagName==='SELECT'){state[event.target.dataset.field]=event.target.value;render();}});
    body.addEventListener('click',event=>{
      if(kind==='signature') {
        const phaseButton=event.target.closest('[data-signature-phase]'),bandButton=event.target.closest('[data-signature-band]');
        if(phaseButton){state.step=Number(phaseButton.dataset.signaturePhase);render();return;}
        if(bandButton){state.lambda=Number(bandButton.dataset.signatureBand);controls.querySelector('[data-field="lambda"]').value=state.lambda;render();return;}
      }
      const pixel=event.target.closest('[data-pixel]');if(pixel){state.pixel=Number(pixel.dataset.pixel);render();return;}
      const button=event.target.closest('[data-action]');if(!button)return;
      if(button.dataset.action==='reset'){Object.assign(state,defaults);controls.querySelectorAll('[data-field]').forEach(el=>{if(el.type==='checkbox')el.checked=state[el.dataset.field];else el.value=state[el.dataset.field];});}
      if(button.dataset.action==='next'){
        state.step++;
        if(['ksvd-cycle','ksvd-residual'].includes(kind)&&state.step%3===2){state.angle=principalAngle(residuals)*180/Math.PI;controls.querySelector('[data-field="angle"]').value=state.angle;}
      }
      if(button.dataset.action==='sample')state.seed++;
      if(button.dataset.action==='signature-next')state.step=Math.min(2,state.step+1);
      if(button.dataset.action==='signature-max'){state.lambda=400+signaturePair().maxDifferenceIndex*10;controls.querySelector('[data-field="lambda"]').value=state.lambda;}
      if(button.dataset.action==='optimal'){state.angle=principalAngle(residuals)*180/Math.PI;controls.querySelector('[data-field="angle"]').value=state.angle;}
      render();
    });
    const refresh=()=>{if(!root.closest('[hidden]'))render();};document.addEventListener('reportlanguagechange',refresh);
    renderers.set(entry.id, render);
    render();
  }

  const mounted=new Set();
  function mountVisible() {
    const token=location.hash.slice(1),entry=entries.find(p=>p.id===token)||entries.find(p=>document.getElementById(token)?.closest(`#${p.id}`));
    if(entry&&!mounted.has(entry.id)){mountLab(entry,document.querySelector(`#${entry.id} .concept-lab-mount`));mounted.add(entry.id);}
    else if(entry)renderers.get(entry.id)?.();
  }
  function initializeDirectory() {
    const cards=[...document.querySelectorAll('#topicGrid .topic-card')],filters=[...document.querySelectorAll('[data-topic-filter]')],search=document.getElementById('conceptSearch');let group='all';
    const apply=()=>{const query=search.value.trim().toLowerCase(),word=/^[a-z][a-z0-9-]*$/i.test(query)?new RegExp(`\\b${query}\\b`,'i'):null;let count=0;cards.forEach((card,i)=>{const entry=entries[i],text=[...entry.title,...entry.question,...entry.idea,...entry.terms.flat(),entry.number].join(' ').toLowerCase(),match=(group==='all'||String(entry.group)===group)&&(word?word.test(text):text.includes(query));card.hidden=!match;if(match)count++;});document.getElementById('conceptMatchCount').innerHTML=b([`${count}／48 個知識點`,`${count} of 48 Topics`]);document.getElementById('conceptNoMatches').hidden=count!==0;};
    filters.forEach(button=>button.addEventListener('click',()=>{group=button.dataset.topicFilter;filters.forEach(btn=>btn.setAttribute('aria-pressed',String(btn===button)));apply();}));search.addEventListener('input',apply);document.addEventListener('reportlanguagechange',apply);apply();
  }
  function createPages() {
    const main=document.getElementById('main-content');
    [...main.children].filter(page=>page.matches('.chapter:not(#opening)')).forEach(page=>{const link=document.createElement('a');link.href='#knowledge-directory';link.className='legacy-concept-return';link.innerHTML=b(['← 返回 48 個知識點目錄','← Return to the 48-Topic Directory']);page.prepend(link);});
    entries.forEach(entry=>{
      const page=document.createElement('section');page.id=entry.id;page.className='chapter concept-page';page.hidden=true;page.dataset.chapter=String(entry.number).padStart(2,'0');
      const references = entry.source.match(/§[\d.]+(?:–\d+)?|\(\d\)(?:–\(\d\))?|6b|4–6|29–30/g) || [];
      const source=`${entry.source.includes('本文')?'Paper':entry.source.includes('背景')?'Background':'Derivation'}${references.length?' · '+references.join(', '):' · Explanation of a cited method'}`;
      page.innerHTML=`<div class="chapter-heading"><p class="chapter-number">${String(entry.number).padStart(2,'0')} · ${b(groups[entry.group],false)}</p><h2>${b(entry.title)}</h2><p class="concept-question">${b(entry.question)}</p></div><div class="concept-reading-path">${b(['先理解概念 → 看算例 → 操作變因 → 對照論文','Understand → Inspect an Example → Change a Variable → Connect to the Paper'])}</div><section class="concept-core"><h3>${b(['核心概念','The Core Idea'])}</h3><p>${b(entry.idea)}</p></section><section class="concept-explanation-grid"><article><h3>${b(['逐步拆解','Step by Step'])}</h3><ol>${entry.steps.map(p=>`<li>${b(p)}</li>`).join('')}</ol></article><article class="concept-example"><p class="eyebrow">${b(['具體例子','A Concrete Example'])}</p><p>${b(entry.example)}</p></article></section><section class="concept-terms"><h3>${b(['先把名詞說清楚','Terms to Know'])}</h3><div>${entry.terms.map(term=>`<details><summary>${b(term.slice(0,2))}</summary><p>${b(term.slice(2,4))}</p></details>`).join('')}</div></section><div class="concept-lab-mount"></div><aside class="concept-boundary"><h3>${b(['解讀界線','How to Interpret It'])}</h3><p>${b(entry.boundary)}</p></aside><section class="concept-paper-connection"><div><h3>${b(['回到論文','Connection to the Paper'])}</h3><p>${b([entry.source,source])}</p><p>${b(['依據本文公式、敘述或所引用演算法整理；教學圖與原始實驗結果有明確區分。','Based on the paper’s equations, discussion, or cited algorithms. Teaching graphics are distinguished from original experimental evidence.'])}</p></div><a href="#${entry.legacy}" class="secondary-button">${b(['延伸詳解與原有互動 →','Further Explanation and Extended Interaction →'])}</a><a href="#sources">${b(['論文與公開資源','Paper and Public Resources'])}</a></section>`;
      main.insertBefore(page,document.getElementById('sources'));
      const mount = page.querySelector('.concept-lab-mount');mount.id=`${entry.id}-lab`;
      const jump=document.createElement('a');jump.href=`#${entry.id}-lab`;jump.className='concept-jump';jump.innerHTML=b(['前往本頁互動 ↓','Go to This Page’s Interaction ↓']);page.querySelector('.concept-reading-path').after(jump);
      window.ReportLiterature?.attach(entry,page,{b,t,escape});
    });
    window.ReportLiterature?.review(document.getElementById('sources'),{b,escape});
    document.getElementById('topicDirectoryTitle').innerHTML=b(['48 個知識點，循序理解整篇論文','48 Topics for Understanding the Paper']);
    document.querySelector('.knowledge-count strong').textContent='48';
    document.querySelector('.overview-heading > p:last-child').innerHTML=b(['從光的基礎、相機量測、逆問題與字典方法，一路走到實驗與研究判讀。每張卡片有獨立講解與互動；總覽保留在上方。','Move from light and sensing through inverse problems and dictionaries to experiments and research interpretation. Every card opens a distinct explanation and interaction; the overview stays above.']);
    document.querySelector('.knowledge-filters').innerHTML=`<button type="button" data-topic-filter="all" aria-pressed="true">${b(['全部','All'])}</button>`+groups.map((p,i)=>`<button type="button" data-topic-filter="${i}" aria-pressed="false">${b(p)}</button>`).join('');
    const toolbar=document.querySelector('.knowledge-map-toolbar');
    const search=document.createElement('div');search.className='concept-search';search.dataset.i18nSkip='';search.innerHTML=`<label for="conceptSearch">${b(['搜尋知識點、名詞或問題','Search Topics, Terms, or Questions'])}</label><input id="conceptSearch" type="search" autocomplete="off" placeholder="RGB, OMP, PCA…"><p id="conceptMatchCount" aria-live="polite"></p>`;toolbar.after(search);
    document.getElementById('topicGrid').innerHTML=entries.map(entry=>`<a class="topic-card" data-topic-group="${entry.group}" href="#${entry.id}" data-i18n-skip><span class="topic-card-number">${String(entry.number).padStart(2,'0')}</span><span class="topic-card-tag">${b(groups[entry.group])}</span><h3>${b(entry.title)}</h3><p class="topic-card-summary">${b(entry.question)}</p><span class="topic-card-action">${b(['講解與互動 →','Explore the Explanation →'])}</span></a>`).join('');
    const empty=document.createElement('p');empty.id='conceptNoMatches';empty.hidden=true;empty.innerHTML=b(['沒有符合的知識點，請換個關鍵字或切回全部。','No topics match. Try another keyword or select All.']);document.getElementById('topicGrid').after(empty);
    document.getElementById('chapterNav').innerHTML=`<a href="#overview">${b(['首頁','Home'])}</a>`+groups.map((pair,i)=>`<a href="#concept-${String(i*6+1).padStart(2,'0')}">${b(pair)}</a>`).join('')+`<a href="#sources">${b(['參考資料','References'])}</a>`;
    window.ReportI18n?.addTranslations(entries.map(e=>e.title));
  }
  window.ReportConcepts={pages:entries.map(e=>({id:e.id,title:e.title[0]})),initializeDirectory,mountVisible,math:{solve,fit,omp,nullDirection:q,response:R,principalAngle,directionError,signaturePair},data:entries};
  createPages();
  window.addEventListener('hashchange',mountVisible);
  document.addEventListener('DOMContentLoaded',mountVisible);
})();
