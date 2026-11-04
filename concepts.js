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
  function bandReading(material,center,width) {
    if(!Number.isFinite(center)||!Number.isFinite(width)||width<=0)throw new RangeError('Use a finite band center and positive width');
    if(center<400||center>700)throw new RangeError('Choose a center in the displayed 400–700 nm range');
    const lower=center-width/2,upper=center+width/2;
    return {center,width,lower,upper,value:signal(material,center),clipped:lower<400||upper>700};
  }
  const spectrum = kind => waves.map(w=>signal(kind,w));
  const response = (shift=0) => [[610,54],[540,46],[455,39]].map(([c,w]) => {const row=waves.map(v=>gauss(v,c+shift,w));return scale(row,1/row.reduce((a,c)=>a+c,0));});
  const R = response();
  const rgb = (h,r=R) => r.map(row=>dot(row,h));
  function atomReading(atom=0,lambda=550){
    const atoms=window.ReportFoundations.math.atoms,index=waves.indexOf(lambda);
    if(!Number.isInteger(atom)||atom<0||atom>=atoms.length||index<0)throw new RangeError('Choose a displayed atom and sampled wavelength');
    return {atom,index,lambda,values:[...atoms[atom]],value:atoms[atom][index],bands:31,shown:atoms.length};
  }
  function numberRoles(variant=0){
    const recipes=[[3,141,409],[21,233,487],[88,276,451]],selected=[...recipes[((variant%recipes.length)+recipes.length)%recipes.length]],weights=Array(500).fill(0);
    selected.forEach((j,i)=>{weights[j]=[.8,-.25,.4][i];});
    return {capacity:500,bands:31,trainingSetting:28,observedAtoms:3,selected,weights,used:weights.filter(v=>v!==0).length};
  }
  function matrixReading(material='leaf',channel=0,lambda=550) {
    if(!Number.isInteger(channel)||channel<0||channel>2||!waves.includes(lambda))throw new RangeError('Choose one RGB channel and a sampled wavelength');
    const h=spectrum(material),products=R.map(row=>row.map((weight,j)=>weight*h[j]));
    return {h,weights:R,products,output:products.map(row=>row.reduce((s,v)=>s+v,0)),channel,index:waves.indexOf(lambda),lambda};
  }
  function rankLesson(stage=0,first=30,second=50){
    if(!Number.isInteger(stage)||stage<0||stage>3||!Number.isFinite(first)||!Number.isFinite(second))throw new RangeError('Choose a lesson stage and finite band values');
    const a=[10,30,20,40],x=stage>=2?10:Math.max(0,Math.min(40,first)),y=stage>=3?20:Math.max(0,Math.min(60,second)),h=[x,40-x,y,60-y];
    const rows=[[.5,.5,0,0],[0,0,.5,.5]];
    if(stage===1)rows.push([.5,.5,0,0]);
    if(stage>=2)rows.push([1,0,0,0]);
    if(stage>=3)rows.push([0,0,1,0]);
    const independent=stage<2?2:stage+1,measured=rows.map(row=>dot(row,a)),candidate=rows.map(row=>dot(row,h));
    return {a,h,rows,measured,candidate,readings:rows.length,independent,free:4-independent,firstLocked:stage>=2,secondLocked:stage>=3,different:h.some((v,i)=>Math.abs(v-a[i])>1e-9),maxMismatch:Math.max(...candidate.map((v,i)=>Math.abs(v-measured[i])))};
  }
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
  function signatureCamera(channel=1,lambda=550,selected=[15]) {
    if(!Number.isInteger(channel)||channel<0||channel>2||!waves.includes(lambda)||!Array.isArray(selected)||selected.some(j=>!Number.isInteger(j)||j<0||j>30))throw new RangeError('Choose a channel, sampled wavelength, and valid band indices');
    const pair=signaturePair(),indices=[...new Set(selected)].sort((a,b)=>a-b),productsA=R.map(row=>row.map((w,j)=>w*pair.a[j])),productsB=R.map(row=>row.map((w,j)=>w*pair.b[j]));
    const differences=productsA[channel].map((v,j)=>v-productsB[channel][j]);
    return {pair,channel,index:waves.indexOf(lambda),indices,weights:R,productsA,productsB,differences,
      partialA:productsA.map(row=>indices.reduce((s,j)=>s+row[j],0)),partialB:productsB.map(row=>indices.reduce((s,j)=>s+row[j],0)),
      positive:indices.reduce((s,j)=>s+Math.max(0,differences[j]),0),negative:indices.reduce((s,j)=>s+Math.min(0,differences[j]),0)};
  }
  function pairedRecovery(query=0,lambda=550){
    const math=window.ReportMethodFormulas.math,j=math.waves.indexOf(lambda);
    if(!Number.isInteger(query)||query<0||query>=math.queries.length||j<0)throw new RangeError('Choose a paired query and displayed wavelength');
    const c=math.queries[query],fit=math.fitRgb(c,3),result=math.transfer(fit.w);
    return {query,j,c,fit,result,rows:fit.w.map((w,i)=>({atom:i+1,weight:w,signal:math.atoms[i][j],contribution:w*math.atoms[i][j]}))};
  }
  const residuals=[[1,.6],[.7,.9],[1.2,1],[.9,.7]];
  const covariance = values => [[values.reduce((s,v)=>s+v[0]*v[0],0), values.reduce((s,v)=>s+v[0]*v[1],0)],[values.reduce((s,v)=>s+v[0]*v[1],0),values.reduce((s,v)=>s+v[1]*v[1],0)]];
  const principalAngle=values=>{const c=covariance(values);return .5*Math.atan2(2*c[0][1],c[0][0]-c[1][1]);};
  const directionError=(values,angle)=>{const d=[Math.cos(angle),Math.sin(angle)];return values.reduce((s,v)=>s+dot(v,v)-dot(v,d)**2,0);};
  const rng = seedValue => {let x=seedValue>>>0;return()=>{x=(1664525*x+1013904223)>>>0;return x/4294967296;};};
  const colors=['#008d9c','#d07826','#7459ac','#468a52','#2877b5'];
  const renderers = new Map();
  const svg = (body,label) => `<svg class="concept-chart" viewBox="0 0 680 300" role="img" aria-label="${escape(t(label))}" data-i18n-skip><title>${escape(t(label))}</title>${body}</svg>`;
  function plot(series,{min=0,max=1,wavelength=true,marker=null,bandWidth=null,pointAtMarker=false,ylabel=null}={}) {
    const px=i=>52+i*602/30,py=v=>250-210*(v-min)/(max-min);
    let out='';for(let i=0;i<=4;i++){const v=min+(max-min)*i/4;out+=`<path d="M52 ${py(v)}H654" stroke="#cbd8df" stroke-dasharray="3 5"/><text x="42" y="${py(v)+4}" text-anchor="end">${v.toFixed(2)}</text>`;}
    out+=`<text x="15" y="145" transform="rotate(-90 15 145)" text-anchor="middle">${escape(t(ylabel||(pointAtMarker?['相對訊號（a.u.）','Relative Signal (a.u.)']:['相對訊號','Relative Signal'])))}</text>`;
    if(bandWidth!==null&&marker!==null){const left=px((Math.max(400,marker-bandWidth/2)-400)/10),right=px((Math.min(700,marker+bandWidth/2)-400)/10);out+=`<rect x="${left}" y="40" width="${right-left}" height="210" fill="#d07826" opacity=".14"/>`;}
    if(wavelength){for(let i=0;i<=30;i+=5)out+=`<text x="${px(i)}" y="274" text-anchor="middle">${400+i*10}</text>`;out+=`<text x="350" y="295" text-anchor="middle">${escape(t(['波長（nm）','Wavelength (nm)']))}</text>`;}
    series.forEach((s,i)=>{out+=`<polyline points="${s.values.map((v,j)=>`${52+j*602/(s.values.length-1)},${py(v)}`).join(' ')}" fill="none" stroke="${s.color||colors[i]}" stroke-width="3.5" ${s.dash?'stroke-dasharray="7 5"':''}/>`;});
    if(marker!==null)out+=`<path d="M${px((marker-400)/10)} 35V250" stroke="#d07826" stroke-width="2"/>`;
    if(pointAtMarker&&marker!==null)series.forEach((s,i)=>{const value=s.values[(marker-400)/10];if(Number.isFinite(value))out+=`<circle data-band-point cx="${px((marker-400)/10)}" cy="${py(value)}" r="6" fill="${s.color||colors[i]}" stroke="white" stroke-width="2"/>`;});
    return svg(out,['示意曲線，數值隨控制器更新','Illustrative curves updated by the controls']);
  }
  const metric=(label,value)=>`<div class="cx-metric"><span>${b(label)}</span><strong>${escape(value)}</strong></div>`;
  const legend=items=>`<div class="cx-legend">${items.map((p,i)=>`<span><i style="background:${colors[i]}"></i>${b(p,false)}</span>`).join('')}</div>`;
  const equation=text=>`<p class="cx-equation" data-i18n-skip>${escape(text)}</p>`;
  const note=pair=>`<p class="cx-result" role="status" aria-live="polite">${b(pair)}</p>`;
  const cellTable=(heads,rows)=>`<div class="cx-table-scroll" tabindex="0"><table class="cx-table"><thead><tr>${heads.map(p=>`<th>${b(p)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(v=>`<td>${Array.isArray(v)?b(v):escape(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  function signatureCalculation(state) {
    const m=signatureCamera(Number(state.channel),state.lambda,state.signatureBands),k=m.channel,j=m.index,key=['R','G','B'][k],view=state.signatureView||0;
    const signed=v=>Math.abs(v)<.0000005?'0.000000':(v>=0?'+':'−')+Math.abs(v).toFixed(6);
    const factor=(value,label)=>`<span class="signature-factor"><strong>${value}</strong><small>${b(label)}</small></span>`;
    const products=['A','B'].map((sample,i)=>`<div class="signature-product ${i?'is-b':'is-a'}"><strong>${sample}</strong>${factor((i?m.pair.b:m.pair.a)[j].toFixed(4),['波段訊號','Band Signal'])}<span>×</span>${factor(m.weights[k][j].toFixed(4),[`${key} 權重`,`${key} Weight`])}<span>≈</span>${factor((i?m.productsB:m.productsA)[k][j].toFixed(6),[`${key} 通道貢獻`,`${key} Contribution`])}</div>`).join('');
    const max=Math.max(...m.productsA.flatMap((row,k)=>row.map((v,i)=>Math.abs(v-m.productsB[k][i]))),1e-6);
    const differenceChart=svg(`<path d="M52 140H654" stroke="#637b8d"/><text x="46" y="64" text-anchor="end">${max.toFixed(3)}</text><text x="46" y="145" text-anchor="end">0</text><text x="46" y="224" text-anchor="end">−${max.toFixed(3)}</text>${m.differences.map((d,i)=>{const height=Math.abs(d)/max*80,x=52+i*602/31;return `<rect x="${x}" y="${d>=0?140-height:140}" width="${602/31-4}" height="${Math.max(.7,height)}" fill="${d>=0?'#008d9c':'#d07826'}" opacity="${m.indices.includes(i)?1:.14}"/>`;}).join('')}${[0,5,10,15,20,25,30].map(i=>`<text x="${52+i*602/31}" y="250" text-anchor="middle">${waves[i]}</text>`).join('')}<text x="350" y="282" text-anchor="middle">${escape(t(['波長（nm）','Wavelength (nm)']))}</text><text x="54" y="31">${escape(t(['＋：A 貢獻較大','+: A Contributes More']))}</text><text x="54" y="232">${escape(t(['−：B 貢獻較大','−: B Contributes More']))}</text>`,['波段貢獻差 A 減 B，未加入的波段以淡色顯示','Band Contribution Differences A Minus B; Excluded Bands Are Faded']);
    const preview=`<p class="signature-preview-strip"><i style="background:rgb(${m.pair.displayA.join(',')})" aria-hidden="true"></i>${b(['完整 RGB：A = B','Full RGB: A = B'])}<strong>(${m.pair.displayA.join(', ')})</strong></p>`;
    if(view===0)return `<section class="signature-camera-panel signature-focus-panel"><h4>${b([`${key} 通道：哪些波段的影響比較大？`,`Channel ${key}: Which Bands Have More Influence?`])}</h4><p>${b(['移動讀取線，看下方權重；切換通道，看實線改變。RGB 接收重疊範圍的光，不是各取一個波長。','Move the reading line to inspect the weights; switch channels to change the solid curve. RGB channels cover overlapping ranges, rather than one wavelength each.'])}</p>${plot(m.weights.map((values,i)=>({values,color:['#bd4545','#3e8050','#3679bb'][i],dash:i!==k})),{max:.12,marker:state.lambda,pointAtMarker:true,ylabel:['通道權重','Channel Weight']})}<div class="signature-response-values">${m.weights.map((row,i)=>metric([`${['R','G','B'][i]} 權重`,`${['R','G','B'][i]} Weight`],row[j].toFixed(4))).join('')}</div>${preview}<details><summary>${b(['權重的來源與尺度','Weight Source and Scale'])}</summary><p>${b(['實線是目前通道，虛線是另外兩個通道。本頁為合成權重，各通道的 31 個權重加總為 1，方便比較；不是實測相機校準。曲線越高，這個波段對該通道的影響越大。','The solid curve is the selected channel; dashed curves are the others. These synthetic weights sum to 1 in each channel for comparison, and are not measured camera calibration. A higher curve means a greater influence on that channel.'])}</p></details></section>`;
    if(view===1)return `<section class="signature-camera-panel signature-focus-panel"><h4>${b([`${state.lambda} nm → ${key} 通道：乘法怎麼算？`,`${state.lambda} nm → Channel ${key}: How Is the Product Calculated?`])}</h4>${products}<p class="signature-inspection-note">${b(['兩個樣本用同一個相機權重；訊號不同，所以這一項貢獻可以不同。切換到「加總抵銷」，才會把各波段的貢獻加起來。','Both samples use the same camera weight. Different signals can give different contributions in this band. Switch to “Sum” to add the band contributions.'])}</p>${preview}<details><summary>${b(['數值代表什麼？','What Do These Numbers Mean?'])}</summary><p>${b(['訊號是合成光譜的相對強弱，不是材料含量百分比或 0–255 顯示值。乘法使用未取整數值，畫面只顯示近似值。讀取線只改查看位置，不修改兩條光譜。','Signals describe relative strength in synthetic spectra, not material percentages or 0–255 display values. Products use unrounded values; displayed numbers are approximate. The reading line changes only the inspected position, not either spectrum.'])}</p></details></section>`;
    return `<section class="signature-camera-panel signature-focus-panel signature-sum-panel"><h4>${b([`${key} 通道：已加 ${m.indices.length}／31 波段`,`Channel ${key}: ${m.indices.length} of 31 Bands Included`])}</h4><p>${b(['每根長條 = 這個波段 A 的貢獻 − B 的貢獻；未加入的項目淡化。改勾選，觀察正、負差異與最後差值。','Each bar is A’s contribution minus B’s contribution in one band. Excluded terms are faded. Change the checked bands and watch the positive, negative, and net differences.'])}</p>${differenceChart}<div class="signature-cancel-values">${metric(['正差異合計','Positive Total'],signed(m.positive))}${metric(['負差異合計','Negative Total'],signed(m.negative))}${metric(['兩者相加','Net Difference'],signed(m.positive+m.negative))}</div><p class="signature-same">${b(m.indices.length===31?['全部加入後，正負差異抵銷。換 R、G、B 都一樣，因此完整 RGB 相同。','All included: positive and negative differences cancel. This holds for R, G, and B, so full RGB matches.']:m.indices.length===0?['尚未加入任何項目。兩個部分和都是 0，不能據此判斷完整 RGB。','No terms included. Both partial sums are zero; this does not establish matching full RGB.']:['只加部分波段，總和可以不同。按「全部加入」，查看完整差異抵銷。','A subset can give different sums. Select “Include All” to observe cancellation of the complete difference.'])}</p>${preview}<details><summary>${b(['完整公式與三通道對照','Full Equation and All Three Channels'])}</summary>${equation('cₖ(A) = Σⱼ₌₁³¹ Rₖ,ⱼ hⱼ(A)     cₖ(B) = Σⱼ₌₁³¹ Rₖ,ⱼ hⱼ(B)')}<p>${b(['k 是通道、j 是波段；Σ 是把 31 個「訊號 × 權重」相加。勾選只拆解加總，不改變相機感光曲線。圖上是樣本差異，不是重建誤差。','k is the channel and j the band. Σ adds 31 signal–weight products. Checkboxes unpack the sum without changing the camera response. The plot shows sample differences, not reconstruction errors.'])}</p>${cellTable([['通道','Channel'],['A 部分和','A Partial'],['B 部分和','B Partial'],['A 完整值','A Full'],['B 完整值','B Full']],['R','G','B'].map((name,i)=>[name,m.partialA[i].toFixed(6),m.partialB[i].toFixed(6),m.pair.rgbA[i].toFixed(6),m.pair.rgbB[i].toFixed(6)]))}<p>${b(['這組 A、B 是建構的同色異譜示意，不是任意光譜都能抵銷。完整線性差值小於 10⁻¹²，在 Gamma 與取整之前就已相同。','A and B are a constructed metameric example; arbitrary spectra need not cancel. Full linear differences are below 10⁻¹², matching before gamma encoding or rounding.'])}</p></details><details><summary>${b(['全部 31 項計算','All 31 Products'])}</summary>${cellTable([['波長 nm','Wavelength nm'],['權重','Weight'],['A 訊號','A Signal'],['B 訊號','B Signal'],['A 貢獻','A Contribution'],['B 貢獻','B Contribution']],waves.map((w,i)=>[w,m.weights[k][i].toFixed(4),m.pair.a[i].toFixed(4),m.pair.b[i].toFixed(4),m.productsA[k][i].toFixed(6),m.productsB[k][i].toFixed(6)]))}</details></section>`;
  }
  const flow=(stages,active)=>`<ol class="cx-flow">${stages.map((p,i)=>`<li class="${i===active?'is-active':i<active?'is-done':''}"><span>${String(i+1).padStart(2,'0')}</span>${b(p)}</li>`).join('')}</ol>`;
  const referenceLabels={
    band:['移動讀取線，看橫軸的位置與縱軸的訊號；調整寬度只改橘色範圍，不改曲線。','Move the reading line to compare wavelength position with signal height. Changing width changes only the orange interval, not the curve.'],
    cube:['先選波段，再點一個像素；兩張圖會連動。','Select a band, then click a pixel; both views update together.'],
    sampling:['改背景比例，再重新抽樣，比較真正物體樣本數。','Change background coverage and resample to compare object samples.'],
    signature:['依序觀察「相同顏色 → 不同光譜 → 相機怎麼加總」。選通道、讀一項乘法，再自行加入波段，比較 A、B 的部分和與完整 RGB。','Follow “same color → different spectra → camera summation.” Select a channel, inspect one product, then include bands to compare partial sums and full RGB.'],
    matrix:['依序看表格大小、同一波段的相乘、31 項加總。全程使用 31 個波段與 R、G、B 三個通道；切換通道只換正在查看的橫列。','Inspect the table sizes, one band’s multiplication, then the sum of all 31 terms. All stages use 31 bands and three RGB channels. Switching channels changes only the row being inspected.'],
    rank:['先拖滑桿，看不同波段分配如何保持相同量測。再比較「重複量一次」與「單獨量一個波段」：哪一個真的減少可變的部分？這是操作觀察，不是測驗。','First drag the allocations and watch different band values preserve the measurements. Then compare a repeated reading with a separate band measurement and observe what becomes fixed. This is an exploration, not a quiz.'],
    dictionary:['點一個原子查看完整曲線，再移動讀取線看其中一個波段。可疊上原子 1 比較形狀；這一頁不選重建權重。','Select an atom to inspect its whole curve, then read one band. Overlay Atom 1 to compare shapes. This page does not fit reconstruction weights.'],
    budget:['點選三個數字，分開看字典規模、訓練設定、重建觀察。數字取自論文；格子與配方只是概念示意，不是作者的字典或實測係數。','Select a number to separate dictionary size, training setting, and reconstruction observation. Numbers come from the paper; grids and recipes illustrate concepts, not the authors’ dictionary or measured coefficients.'],
    'omp-refit':['逐步加入原子，比較舊係數與重新擬合後的係數。','Add atoms step by step and compare old and refitted coefficients.']
  };
  function mountLab(entry,root,initialState={}) {
    if(window.ReportFoundations?.handles(entry.number)) {
      const refresh=window.ReportFoundations.mount(entry,root,{b,t,escape,initialState});
      renderers.set(entry.id,refresh);
      return;
    }
    const kind=entry.lab;
    const defaults={lambda:550,width:20,material:'leaf',warm:0,channel:1,shift:0,linear:255,bands:7,band:15,pixel:12,motion:30,scan:'band',step:0,amount:65,rank:2,noise:10,k:2,position:50,low:true,rare:true,prior:'natural',source:'ground',background:70,region:'all',seed:1,a:60,c:25,d:15,capacity:12,budget:3,angle:15,subset:0,truth:false,leak:false,brightness:50,error:10,mapBand:15,domain:'complete',workers:1,frames:30,train:2000,infer:20,global:false,atom:0,compareAtoms:false};
    if(kind==='nullnoise')defaults.amount=40;
    if(kind==='matrix')defaults.channel=0;
    if(kind==='rank'){defaults.amount=30;defaults.rankSecond=50;}
    Object.assign(defaults,initialState);
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
      defaults.signatureBands=[15];defaults.signatureView=0;
      state.signatureBands=initialState.signatureBands||[15];state.signatureView=initialState.signatureView||0;
      body.classList.add('signature-lab');
      const stagebar=document.createElement('div');stagebar.className='signature-stagebar';
      stagebar.innerHTML=`<ol class="signature-steps">${[['先看顏色','Compare Colors'],['展開光譜','Reveal Spectra'],['跟著相機算 RGB','Calculate RGB']].map((p,i)=>`<li><button type="button" data-signature-phase="${i}" aria-pressed="${i===0}"><strong>${i+1}</strong>${b(p)}</button></li>`).join('')}</ol>`;
      body.insertBefore(stagebar,body.querySelector('.cx-workbench'));
      controls.insertAdjacentHTML('beforeend',`<div class="signature-subviews">${[['通道權重','Weights'],['波段乘法','Product'],['加總抵銷','Sum']].map((p,i)=>`<button type="button" data-signature-view="${i}" aria-pressed="${i===0}">${b(p)}</button>`).join('')}</div>`);
      const cameraControls=document.createElement('div');cameraControls.className='signature-camera-controls';controls.append(cameraControls);
      select('channel',['通道','Channel'],[['0',['R：紅色','R: Red']],['1',['G：綠色','G: Green']],['2',['B：藍色','B: Blue']]]);
      const channelControl=controls.lastElementChild;cameraControls.append(channelControl);channelControl.querySelector('select').value=String(state.channel);
      const waveControls=document.createElement('div');waveControls.className='signature-wave-controls';cameraControls.append(waveControls);
      range('lambda',['查看波長','Inspect Wavelength'],400,700,10,'nm');waveControls.append(controls.lastElementChild);
      waveControls.insertAdjacentHTML('beforeend',`<div class="signature-band-presets">${[450,550,650].map(w=>`<button type="button" data-signature-band="${w}">${w} nm</button>`).join('')}</div>`);
      action('signature-max',['找最大光譜差異','Find Largest Spectral Difference']);waveControls.append(controls.lastElementChild);
      const sumControls=document.createElement('div');sumControls.className='signature-sum-controls';cameraControls.append(sumControls);
      sumControls.innerHTML=`<p class="signature-selection-count"></p><div class="signature-inclusions">${waves.map((w,j)=>`<label><input type="checkbox" data-signature-include="${j}">${w}</label>`).join('')}</div><div class="signature-quick-actions"></div>`;
      for(const [name,label] of [['signature-current',['只加目前波段','Current Band Only']],['signature-all',['全部加入','Include All']],['signature-clear',['清空','Clear']]]){action(name,label);sumControls.querySelector('.signature-quick-actions').append(controls.lastElementChild);}
      const live=document.createElement('div');live.className='signature-live-summary';live.setAttribute('role','status');live.setAttribute('aria-live','polite');cameraControls.append(live);
      action('signature-next',['下一步：展開光譜 →','Next: Reveal Spectra →']);
    } else if(spectralKinds.includes(kind)) {
      if(['gamma','linear-display'].includes(kind)){range('linear',['線性值 × 1000','Linear Value × 1000'],0,1000);}
      else {waveControls();if(['band','sampling-spectrum','binning'].includes(kind))range('width',['波段寬度','Band Width'],10,100,10,'nm');
        if(kind==='illumination')range('warm',['光源：偏冷 ← → 偏暖','Source: Cool ← → Warm'],-100,100);
        if(['response','weighted'].includes(kind))range('channel',['通道：0=R，1=G，2=B','Channel: 0=R, 1=G, 2=B'],0,2);
        if(['sampling-spectrum','binning'].includes(kind))range('bands',['取樣數','Sample Count'],3,31,2);
        if(['sensor-model','calibration'].includes(kind))range('shift',['感光曲線偏移','Response-Curve Shift'],-30,30,1,'nm');}
    } else if(kind==='cube'){range('band',['波段索引（0–30）','Band Index (0–30)'],0,30);}
    else if(kind==='scan'){select('scan',['掃描方式','Scan Mode'],[['point',['逐點','Point']],['line',['逐線','Line']],['band',['逐波段','Band']]]);range('motion',['場景移動速度','Scene Motion'],0,100);action('next',['掃描下一步','Next Scan Step']);}
    else if(kind==='matrix'){
      body.classList.add('matrix-lab');
      controls.insertAdjacentHTML('beforeend',`<ol class="matrix-steps">${[['看表格大小','Read the Sizes'],['看一項乘法','Inspect One Product'],['加總成 RGB','Sum into RGB']].map((p,i)=>`<li><button type="button" data-matrix-phase="${i}" aria-pressed="${i===0}"><strong>${i+1}</strong>${b(p)}</button></li>`).join('')}</ol>`);
      materials();
      select('channel',['查看哪一個通道？','Which Channel Shall We Inspect?'],[['0',['R：紅色通道','R: Red Channel']],['1',['G：綠色通道','G: Green Channel']],['2',['B：藍色通道','B: Blue Channel']]]);
      range('lambda',['查看哪一個波段？（不改變訊號）','Inspect Which Band? (Does Not Change the Signal)'],400,700,10,'nm');
      action('matrix-next',['下一步 →','Next Step →']);
    }
    else if(kind==='inverse'){range('amount',['改變兩個未知數但保留總和','Change Two Unknowns, Preserve Their Sum'],0,100);}
    else if(kind==='rank'){
      body.classList.add('rank-lesson');
      controls.insertAdjacentHTML('beforeend',`<div class="rank-clue-choices"><p>${b(['先看原量測，再比較兩種不同的第三條量測','Start with Two Readings, Then Compare Two Possible Third Readings'])}</p>${[['起點：兩組平均','Start: Two Pair Averages'],['方案 A：重複第一組平均','Option A: Repeat the First Average'],['方案 B：單獨量波段 1','Option B: Measure Band 1 Separately'],['再單獨量波段 3','Then Measure Band 3 Separately']].map((p,i)=>`<button type="button" data-rank-stage="${i}" aria-pressed="${i===0}"><strong>${i+1}</strong>${b(p)}</button>`).join('')}</div>`);
      range('amount',['第一組：分配給波段 1 多少？（剩下給波段 2）','First Pair: How Much Goes to Band 1? (The Rest Goes to Band 2)'],0,40);
      range('rankSecond',['第二組：分配給波段 3 多少？（剩下給波段 4）','Second Pair: How Much Goes to Band 3? (The Rest Goes to Band 4)'],0,60);
      body.querySelector('header').after(controls.querySelector('.rank-clue-choices'));
    }
    else if(kind==='reprojection'){defaults.transferQuery=0;state.transferQuery=initialState.transferQuery||0;select('transferQuery',['RGB 算例（同式 4.1 的成對字典）','RGB Query (Same Paired Dictionary as Section 4.1)'],[['0',['算例 A','Example A']],['1',['算例 B','Example B']]]);range('lambda',['查看輸出波段','Inspect Output Band'],400,700,10,'nm');}
    else if(['metamer','nullnoise'].includes(kind)){range('amount',['光譜改變幅度','Spectral Change'],0,100);if(kind==='nullnoise'){range('shift',['感測器微小偏移','Small Sensor Shift'],0,5,1,'nm');range('noise',['容許量測差 × 1000','Measurement Tolerance × 1000'],0,30);}}
    else if(['manifold','local-global'].includes(kind)){range('position',['沿結構的位置','Position along Structure'],0,100);if(kind==='local-global')toggle('global',['用同一個全域方向近似','Approximate with One Global Direction']);}
    else if(kind==='pca'){range('k',['保留的主成分數','Retained Component Count'],1,5);action('sample',['更換樣本係數','Change Sample Coefficients']);}
    else if(kind==='candidates'){toggle('low',['低維條件成立','Low-Dimensional Condition Holds']);toggle('rare',['同色異譜相對少見','Metamers Are Relatively Rare']);}
    else if(['prior','coverage'].includes(kind)){materials();select('prior',['先驗範圍','Prior Coverage'],[['natural',['葉子與土壤','Leaf and Soil']],['lights',['窄頻光源','Narrow-Band Sources']],['all',['混合場景','Mixed Scenes']]]);}
    else if(kind==='sampling'){range('background',['暗背景比例','Dark-Background Coverage'],0,95,5,'%');select('region',['抽樣範圍','Sampling Region'],[['all',['整張影像','Whole Image']],['object',['物體區域','Object Region']]]);action('sample',['重新抽樣','Resample']);}
    else if(kind==='sparse'){range('a',['原子 1 權重 × 100','Atom 1 Weight × 100'],0,100,5);range('c',['原子 2 權重 × 100','Atom 2 Weight × 100'],0,100,5);range('d',['原子 3 權重 × 100','Atom 3 Weight × 100'],0,100,5);}
    else if(kind==='dictionary'){
      body.classList.add('atom-explorer');
      controls.insertAdjacentHTML('beforeend',`<div class="atom-gallery"><p>${b(['選一個完整原子（8 個合成示例，不是作者的 500 個原子）','Choose a Complete Atom (8 Synthetic Examples, Not the Authors’ 500 Atoms)'])}</p>${window.ReportFoundations.math.atoms.map((values,i)=>`<button type="button" data-atom-choice="${i}" aria-pressed="${i===0}"><strong>${b([`原子 ${i+1}`,`Atom ${i+1}`])}</strong><span class="atom-mini-bars" aria-hidden="true">${values.map(v=>`<i style="height:${v*100}%"></i>`).join('')}</span><small>${b(['31 個波段值','31 Band Values'])}</small></button>`).join('')}</div>`);
      range('lambda',['讀取哪個波段？（不裁切原子）','Read Which Band? (Does Not Crop the Atom)'],400,700,10,'nm');
      toggle('compareAtoms',['疊上原子 1 比較形狀','Overlay Atom 1 to Compare Shapes']);
    }
    else if(kind==='budget'){
      body.classList.add('number-roles');
      controls.insertAdjacentHTML('beforeend',`<div class="role-tabs">${[['500',['字典規模','Dictionary Size']],['28',['訓練設定','Training Setting']],['≈ 3',['重建觀察','Recovery Observation']]].map(([value,p],i)=>`<button type="button" data-role-choice="${i}" aria-pressed="${i===0}"><strong>${value}</strong>${b(p)}</button>`).join('')}</div>`);
      action('role-recipe',['換一組三原子示意','Show Another Three-Atom Example']);
    }
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
    if(kind==='signature'){
      const actions=document.createElement('div');actions.className='signature-stage-actions';
      actions.append(controls.querySelector('[data-action="signature-next"]'),controls.querySelector('[data-action="reset"]'));
      body.querySelector('.signature-stagebar').append(actions);
    }

    function alignSignatureWorkspace(){const workspace=body.querySelector('.cx-workbench'),top=workspace.getBoundingClientRect().top+parseFloat(getComputedStyle(workspace).paddingTop);if(top>32||top< -100)window.scrollBy({top:top-14,behavior:'instant'});}
    function render() {
      controls.querySelectorAll('[data-value]').forEach(el=>{const k=el.dataset.value;el.textContent=state[k];});
      controls.querySelectorAll('select').forEach(el=>{el._options.forEach(([v,p],i)=>el.options[i].textContent=t(p));});
      const n=state.step;
      if(kind==='signature') {
        const phase=Math.min(2,n),pair=signaturePair(),idx=(state.lambda-400)/10,difference=pair.a[idx]-pair.b[idx],both=pair.displayA.join(', ');
        body.querySelectorAll('[data-signature-phase]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.signaturePhase)===phase)));
        const view=Number(state.signatureView)||0,m=signatureCamera(Number(state.channel),state.lambda,state.signatureBands),key=['R','G','B'][m.channel];
        body.dataset.signatureStage=String(phase);body.dataset.signatureFocus=String(view);
        controls.hidden=phase!==2;
        controls.querySelector('.signature-subviews').hidden=phase!==2;
        controls.querySelectorAll('[data-signature-view]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.signatureView)===view)));
        controls.querySelector('.signature-wave-controls').hidden=view===2;
        controls.querySelector('.signature-sum-controls').hidden=view!==2;
        controls.querySelectorAll('[data-signature-include]').forEach(el=>el.checked=state.signatureBands.includes(Number(el.dataset.signatureInclude)));
        controls.querySelector('.signature-selection-count').innerHTML=b([`已加入 ${m.indices.length}／31 波段（nm）`,`${m.indices.length} of 31 Bands Included (nm)`]);
        controls.querySelector('[data-action="signature-current"]').innerHTML=b([`只加 ${state.lambda} nm`,`${state.lambda} nm Only`]);
        const delta=m.partialA[m.channel]-m.partialB[m.channel];
        controls.querySelector('.signature-live-summary').innerHTML=view===0?`<p>${b([`${state.lambda} nm → ${key} 通道權重`,`${state.lambda} nm → ${key} Weight`])}</p><strong>${m.weights[m.channel][m.index].toFixed(4)}</strong>`:view===1?`<p>${b([`${state.lambda} nm 對 ${key} 的貢獻`,`${state.lambda} nm Contribution to ${key}`])}</p><div><span>A <strong>${m.productsA[m.channel][m.index].toFixed(6)}</strong></span><span>B <strong>${m.productsB[m.channel][m.index].toFixed(6)}</strong></span></div>`:`<p>${b([`${key} 通道部分和`,`${key} Partial Sums`])}</p><div><span>A <strong>${m.partialA[m.channel].toFixed(6)}</strong></span><span>B <strong>${m.partialB[m.channel].toFixed(6)}</strong></span><span>A − B<strong>${Math.abs(delta)<.0000005?'0.000000':delta.toFixed(6)}</strong></span></div>`;
        const next=body.querySelector('[data-action="signature-next"]');next.hidden=phase===2;next.disabled=phase===2;next.innerHTML=b(phase===0?['下一步：展開光譜 →','Next: Reveal Spectra →']:['下一步：計算 RGB →','Next: Calculate RGB →']);
        controls.querySelectorAll('[data-signature-band]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.signatureBand)===state.lambda)));
        const swatches=`<div class="signature-samples">${['A','B'].map((name,i)=>`<article><div class="signature-sample-name"><i class="signature-line-key ${i?'is-b':'is-a'}"></i><h4>${b([`樣本 ${name}`,`Sample ${name}`])}</h4></div><div class="signature-green" style="background:rgb(${both})" role="img" aria-label="${escape(t([`樣本 ${name} 的相機預覽，RGB ${both}`,`Camera preview for sample ${name}, RGB ${both}`]))}"></div><p>${b(['完整 31 波段的預覽 RGB','Full 31-Band Preview RGB'])}<strong>(${both})</strong></p></article>`).join('')}</div><p class="signature-same">${b(['A、B 的預覽顏色相同，RGB 數字也相同。','A and B have matching preview colors and matching RGB values.'])}</p>`;
        const stageTitle=b([['第 1 步：只看顏色，分不出 A、B','第 2 步：展開光譜，看到兩條不同的線','第 3 步：波段訊號 × 權重，再加總成 RGB'][phase],['Step 1: Color Alone Cannot Separate A and B','Step 2: Spectra Reveal Two Different Curves','Step 3: Multiply Band Signals by Weights, Then Sum into RGB'][phase]]);
        let detail='';
        if(phase===0)detail=`<div class="signature-hidden-spectrum"><span aria-hidden="true">?</span><p>${b(['相同的三個總和，沒有告訴我們每個波段各是多少。點「下一步」查看完整曲線。','Three matching totals do not reveal the value in every band. Select “Next” to inspect the complete curves.'])}</p></div>`;
        else {
          let chart=plot([{values:pair.a},{values:pair.b,dash:true}],{max:.7,marker:phase===2?state.lambda:null});
          if(phase===2){const x=52+idx*602/30;chart=chart.replace('</svg>',`<circle cx="${x}" cy="${250-pair.a[idx]*300}" r="7" fill="#008d9c" stroke="white" stroke-width="2"/><circle cx="${x}" cy="${250-pair.b[idx]*300}" r="7" fill="#d07826" stroke="white" stroke-width="2"/></svg>`);}
          detail=`<div class="signature-curve-panel"><h4>${b(['光譜圖：橫軸讀波長，縱軸讀訊號強度','Spectral Plot: Wavelength across, Signal Level Up'])}</h4>${legend([['A：青色實線','A: Teal Solid Line'],['B：橘色虛線','B: Orange Dashed Line']])}${chart}<p class="signature-graph-help">${b(['線越高，表示該樣本在那個波段的訊號越強。兩條線不重合，代表逐波段數值不同。','A higher curve means a stronger signal in that band. Curves that do not overlap have different bandwise values.'])}</p></div>`;
          if(phase===2)detail=signatureCalculation(state)+`<details class="signature-original-context"><summary>${b(['對照原始光譜與完整預覽','Compare Original Spectra and Full Previews'])}</summary>${swatches}${detail}</details>`;
        }
        const conclusions=[['先確認：相機輸出的三個 RGB 數字相同。接著才檢查，這三個數背後的完整光譜是否也相同。','First establish that the three RGB outputs match. Next inspect whether the complete spectra behind those values also match.'],['現在可看到：RGB 相同，兩條光譜卻不同。光譜特徵就是各波段訊號連成的完整形狀，不只是單一綠色。','The RGB outputs match, yet the spectra differ. A spectral signature is the full pattern across bands, not merely a single green color.'],['這一頁要理解的是：顏色相同，不代表每個波段都相同。相機把整條光譜加權成三個總和，不同波段的差異可能在總和中抵銷，所以只靠 RGB 不能保留所有光譜辨識線索。','The key observation: matching color does not imply matching bands. A camera combines the spectrum into three weighted totals, where bandwise differences may cancel. RGB therefore does not retain every spectral identification clue.']];
        out.innerHTML=`${phase===2?'':`<h4 class="signature-stage-title">${stageTitle}</h4>${swatches}`}${detail}${phase===2?'':note(conclusions[phase])}<details class="signature-numbers"><summary>${b(['查看相機的線性數值與計算界線','Inspect Linear Camera Values and Calculation Limits'])}</summary><p>${b(['A、B 分別經本頁同一組示意感光曲線加權，三個線性值如下。色塊再套用簡化 Gamma 顯示；這裡沒有量測真實材料。','A and B are separately weighted with the same illustrative responses. The linear values are shown below. Swatches use simplified gamma encoding; no physical material is measured here.'])}</p><p>A: (${pair.rgbA.map(v=>v.toFixed(6)).join(', ')})<br>B: (${pair.rgbB.map(v=>v.toFixed(6)).join(', ')})</p>${equation('C_display = round(255 × C_linear^(1/2.2))')}<p>${b(['每個通道的完整線性值再套用上式，得到上方 0–255 的預覽數字。這是簡化 Gamma 示意，不是完整的相機影像處理流程。','Apply this formula to each complete linear channel value to obtain the 0–255 preview numbers above. This is simplified gamma encoding, not a complete camera image-processing pipeline.'])}</p></details>`;
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
          const m=bandReading(state.material,state.lambda,state.width);
          extra=`<div class="cx-metrics cx-band-reading-metrics">${metric(['中心波長','Band Center'],`${state.lambda} nm`)}${metric(['波段寬度','Band Width'],`${state.width} nm`)}${metric(['中心位置的相對訊號','Relative Signal at Center'],`${m.value.toFixed(3)} a.u.`)}</div><p class="cx-band-point-note">${b([`橘色範圍：${m.lower}–${m.upper} nm。圓點只讀取 ${m.center} nm 這個位置的曲線高度，不代表整段波段的量測結果。`,`Orange interval: ${m.lower}–${m.upper} nm. The dot reads the curve height only at ${m.center} nm; it is not a measurement of the whole band.`])}${m.clipped?` ${b(['超出 400–700 nm 的部分未畫出。','The portion outside 400–700 nm is not shown.'])}`:''}</p><p class="cx-band-scale-note">${b(['a.u. 表示任意相對單位：數字較大，代表此示意曲線的訊號較強。這不是實測光能或反射率百分比。','a.u. means arbitrary relative units: larger values mean a stronger signal on this teaching curve. These are not measured energy values or reflectance percentages.'])}</p>`;
        }
        out.innerHTML=legend(labels)+plot(series,{max:1.15,marker:state.lambda,bandWidth:['band','binning','sampling-spectrum'].includes(kind)?state.width:null,pointAtMarker:kind==='band'})+extra+note(kind==='band'?['讀取線＝看哪個波長；圓點高度＝這個位置的訊號；橘色寬度＝波段範圍。改中心會換讀取位置，改寬度只改範圍，曲線本身都不變。','Reading line = which wavelength; dot height = signal there; orange width = band interval. Moving the center changes the reading position; changing width changes only the interval. Neither changes the curve.']:['曲線與數值是同一次計算的不同讀法；先讀座標，再比較變化，最後回到本頁要回答的問題。','The graphic and values describe the same calculation. Read the axes, compare the changes, and connect the observation to this page’s question.']);
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
      } else if(kind==='matrix') {
        const phase=Math.min(2,n),m=matrixReading(state.material,Number(state.channel),state.lambda),k=m.channel,j=m.index,names=['R','G','B'];
        controls.querySelectorAll('[data-matrix-phase]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.matrixPhase)===phase)));
        controls.querySelector('[data-field="lambda"]').closest('label').hidden=phase!==1;
        controls.querySelector('[data-action="matrix-next"]').disabled=phase===2;
        const shape=(symbol,size,label,content)=>`<article class="matrix-shape"><h4>${symbol} <span>${size}</span></h4><p>${b(label)}</p>${content}</article>`;
        const shapes=`<div class="matrix-shapes">${shape('R','3 × 31',['相機權重表：3 個橫列、31 個直欄','Camera Weights: 3 Rows, 31 Columns'],`<div class="matrix-rows">${names.map((name,i)=>`<div class="${i===k?'is-selected':''}"><strong>${name}</strong>${b(['31 個波段權重','31 Band Weights'])}</div>`).join('')}</div>`)}<span class="matrix-operator">×</span>${shape('h','31 × 1',['一個像素的光譜：31 個數排成 1 欄','One Pixel’s Spectrum: 31 Values in 1 Column'],`<div class="matrix-column"><span>h₁ = ${m.h[0].toFixed(4)}</span><span>h₂ = ${m.h[1].toFixed(4)}</span><span>⋮</span><span>h₃₁ = ${m.h[30].toFixed(4)}</span></div>`)}<span class="matrix-operator">=</span>${shape('c','3 × 1',['量測結果：3 個通道值排成 1 欄','Measurement: 3 Channel Values in 1 Column'],`<div class="matrix-column">${names.map(name=>`<span>c<sub>${name}</sub></span>`).join('')}</div>`)}</div>`;
        const headings=[['1. 這些數字表示大小，不是普通乘法','1. These Numbers Describe Sizes, Not Ordinary Multiplication'],['2. 一個波段，配上一個對應權重','2. Pair One Band Value with Its Matching Weight'],['3. 每個橫列各加總 31 項，得到一個輸出','3. Sum 31 Terms per Row to Produce One Output']];
        let detail='';
        if(phase===0)detail=note(['3 × 31 表示「3 個橫列、31 個直欄」，不是先算成 93。每個橫列的 31 個權重，都配上同一條光譜的 31 個訊號。每列得到 1 個答案，3 列就得到 3 個答案。','3 × 31 means 3 rows and 31 columns; do not multiply it into 93. Each row’s 31 weights pairs with the same 31 spectral values. One answer per row gives three answers in total.']);
        if(phase===1){
          const operand=(value,label)=>`<div class="matrix-operand"><strong>${value}</strong>${b(label)}</div>`;
          detail=`<section class="matrix-calculation"><h4>${b([`正在看 ${state.lambda} nm → ${names[k]} 通道`,`Inspecting ${state.lambda} nm → ${names[k]} Channel`])}</h4><p>${b([`這是第 ${j+1} 個波段：h 的第 ${j+1} 個數，對上 R 的 ${names[k]} 橫列第 ${j+1} 個權重。`,`This is band ${j+1}: entry ${j+1} of h pairs with entry ${j+1} in the ${names[k]} row of R.`])}</p><div class="matrix-product">${operand(m.h[j].toFixed(4),['此波段的光譜訊號','Signal in This Band'])}<span>×</span>${operand(m.weights[k][j].toFixed(4),[`${names[k]} 通道對此波段的權重`,`${names[k]} Channel Weight for This Band`])}<span>≈</span>${operand(m.products[k][j].toFixed(6),[`此波段對 ${names[k]} 的貢獻`,`This Band’s Contribution to ${names[k]}`])}</div></section>${note(['這只是 31 項中的 1 項，還不是整個通道的輸出。移動滑桿只換查看的位置，沒有改光譜、權重或最後的 RGB。下一步才把全部 31 項加起來。','This is one of 31 terms, not the full channel output. Moving the slider only changes which position you inspect; the spectrum, weights, and final RGB stay unchanged. The next step sums all 31 terms.'])}`;
        }
        if(phase===2){
          detail=`<section class="matrix-calculation"><h4>${b([`${names[k]} 橫列：31 對數值相乘後全部相加`,`${names[k]} Row: Multiply All 31 Pairs and Add the Products`])}</h4>${equation(`c_${names[k]} = R_${names[k]},1 × h₁ + R_${names[k]},2 × h₂ + … + R_${names[k]},31 × h₃₁`)}<p class="matrix-sum">${m.products[k][0].toFixed(6)} + ${m.products[k][1].toFixed(6)} + … + ${m.products[k][30].toFixed(6)} ≈ <strong>${m.output[k].toFixed(6)}</strong></p><p>${b(['省略號代表中間 28 項；程式實際把全部 31 項都算進去。顯示值有四捨五入，計算使用未四捨五入的值。','The ellipsis stands for 28 middle terms. All 31 terms are included in the calculation, using unrounded values; displayed numbers are rounded.'])}</p></section><div class="matrix-results">${names.map((name,i)=>`<article class="${i===k?'is-selected':''}"><span>${name}</span><strong>${m.output[i].toFixed(6)}</strong>${b(['31 項的加總','Sum of 31 Terms'])}</article>`).join('')}</div>${note(['R、G、B 三個橫列各做一次相同運算，得到三個線性通道值。因此 (3 × 31) × (31 × 1) = (3 × 1)。這些仍是線性量測，不是 0–255 的顯示數字。','The R, G, and B rows each repeat the same operation to produce three linear channel values. Thus (3 × 31) × (31 × 1) = (3 × 1). These are still linear measurements, not 0–255 display codes.'])}<details class="matrix-details"><summary>${b([`展開 ${names[k]} 通道全部 31 項的計算`,`Expand All 31 Terms for the ${names[k]} Channel`])}</summary>${cellTable([['波段','Band'],['訊號 hⱼ','Signal hⱼ'],['相機權重','Camera Weight'],['相乘的貢獻','Product Contribution']],waves.map((w,i)=>[`${w} nm`,m.h[i].toFixed(4),m.weights[k][i].toFixed(4),m.products[k][i].toFixed(6)]))}</details>`;
        }
        out.innerHTML=`<h4 class="matrix-stage-title">${b(headings[phase])}</h4>${shapes}${detail}`;
      } else if(kind==='rank') {
        const stage=Math.min(3,Math.max(0,Math.round(state.step))),m=rankLesson(stage,state.amount,state.rankSecond);
        state.amount=m.h[0];state.rankSecond=m.h[2];
        for(const [key,locked] of [['amount',m.firstLocked],['rankSecond',m.secondLocked]]){const input=controls.querySelector(`[data-field="${key}"]`);input.value=state[key];input.disabled=locked;controls.querySelector(`[data-value="${key}"]`).textContent=state[key];}
        body.querySelectorAll('[data-rank-stage]').forEach(el=>el.setAttribute('aria-pressed',String(+el.dataset.rankStage===stage)));
        const observation=[
          ['四個值可以改變，兩個平均卻仍是 20、30。A 和 B 都符合，所以量測不足以選出唯一答案。','The four values can change while both averages remain 20 and 30. Both A and B fit, so these readings do not determine one unique answer.'],
          ['多記了一個數，但它只是第一組平均的副本。兩個滑桿仍可動，沒有排除任何原本符合的候選。','One more number is recorded, but it copies the first average. Both sliders remain free; no previously valid candidate is ruled out.'],
          ['新線索說波段 1 = 10；搭配第一組總和 40，可推出波段 2 = 30。第一組固定了，但第二組仍可改變，所以還不是唯一答案。','The new clue fixes band 1 at 10. With the first pair totaling 40, band 2 must be 30. The first pair is fixed, but the second still varies: the answer is not unique yet.'],
          ['再知道波段 3 = 20，便能推出波段 4 = 40。這個四波段示意有四條獨立限制，已沒有可調的方向。這不表示真實 RGB 也量到了四條線索。','Knowing band 3 is 20 fixes band 4 at 40. This four-band illustration now has four independent constraints and no adjustable direction. Real RGB does not acquire these four independent clues.']
        ];
        const rowName=i=>i===0?['量測 1：波段 1、2 的平均','Reading 1: Average of Bands 1 and 2']:i===1?['量測 2：波段 3、4 的平均','Reading 2: Average of Bands 3 and 4']:stage===1?['重複量測 1（沒有新線索）','Copy of Reading 1 (No New Clue)']:i===2?['新增：波段 1 的值','New: Band 1 Alone']:['新增：波段 3 的值','New: Band 3 Alone'];
        out.innerHTML=`<section class="rank-reading-panel"><h4>${b(['量測已知，尋找符合的波段分配','The Readings Are Known; Which Band Values Fit?'])}</h4><p>${b(['以下數值是相對訊號（a.u.），不是百分比。A 是固定比較候選，B 由你調整；沒有把 A 宣稱為真實答案。','Values are relative signal (a.u.), not percentages. A is a fixed comparison candidate; you adjust B. A is not declared to be the true answer.'])}</p><div class="rank-reading-grid">${m.rows.map((_,i)=>`<article class="${stage===1&&i===2?'is-duplicate':''}"><h5>${b(rowName(i))}</h5><strong>${m.measured[i]}</strong><small>${b(['B 重新算得','Recomputed from B'])}: ${m.candidate[i]}</small></article>`).join('')}</div></section><section class="rank-spectrum-panel"><h4>${b(['灰色 A 與橘色 B：逐波段比較','Gray A and Orange B: Compare Band by Band'])}</h4><p class="rank-match" role="status">${b(m.different?['光譜不同，但目前全部量測相同。','Different spectra; all current measurements match.']:['目前 B 與 A 相同。若滑桿仍可動，移動後檢查是否仍符合。','B currently equals A. If a slider remains enabled, move it and check whether the readings still match.'])}</p><div class="rank-spectrum-grid">${m.h.map((v,i)=>`<article><h5>${b([`波段 ${i+1}`,`Band ${i+1}`])}<small>${[450,500,600,650][i]} nm</small></h5><div class="rank-bar-pair" aria-hidden="true"><i style="height:${m.a[i]/60*100}%"></i><i style="height:${v/60*100}%"></i></div><p>A: ${m.a[i]}<br><strong>B: ${v}</strong></p></article>`).join('')}</div><p class="rank-axis-note">${b(['所有長條共用 0–60 圖尺；灰色與橘色分別表示 A、B，不代表光的顏色。','All bars share a 0–60 scale. Gray and orange identify A and B, not the color of light.'])}</p><div class="rank-pair-sums"><p>( ${m.h[0]} + ${m.h[1]} ) ÷ 2 = <strong>20</strong></p><p>( ${m.h[2]} + ${m.h[3]} ) ÷ 2 = <strong>30</strong></p></div></section><aside class="rank-observation" role="status">${b(observation[stage])}</aside><div class="rank-counts">${metric(['記錄的數值數','Recorded Values'],m.readings)}<span>≠</span>${metric(['獨立線索（秩）','Independent Clues (Rank)'],m.independent)}${metric(['仍可調的方向','Adjustable Directions'],m.free)}</div><p class="rank-count-note">${b([`四個未知值 − ${m.independent} 條獨立限制 = ${m.free} 個自由方向。這不是只有 ${m.free} 個答案；只要還能連續調整，就有很多候選。`,`Four unknown values − ${m.independent} independent constraints = ${m.free} free directions. This does not mean ${m.free} possible answers; continuous freedom allows many candidates.`])}</p><details class="rank-formal"><summary>${b(['連回論文：31 波段、RGB 與正式矩陣','Connect to the Paper: 31 Bands, RGB, and the Matrix'])}</summary><p>${b(['真實 RGB 的三個通道通常都混合許多波段，不是這裡的兩組平均。此示意只隔離「不同分配可給出相同量測」的線性原理。','Real RGB channels usually mix many bands, rather than using these two pair averages. This illustration isolates the linear principle that different allocations can produce matching readings.'])}</p>${equation('c = Rh;  dim(ker R) = 31 − rank(R) ≥ 28')}<p>${b(['R 有 3 個橫列，所以最多提供 3 條獨立線性限制。若秩為 3，仍有 28 個自由方向；不是指定 28 個波段沒被看見。自然光譜先驗與稀疏表示用來限制候選，但不會憑空新增量測，也不保證唯一真值。','R has three rows, giving at most three independent linear constraints. Rank 3 leaves 28 free directions, not 28 specific unseen bands. Natural-spectrum priors and sparsity restrict candidates; they do not create measurements or guarantee the unique truth.'])}</p>${cellTable([['示意量測','Illustrative Reading'],['h₁ 權重','h₁ Weight'],['h₂ 權重','h₂ Weight'],['h₃ 權重','h₃ Weight'],['h₄ 權重','h₄ Weight']],m.rows.map((row,i)=>[i+1,...row.map(v=>v.toFixed(1))]))}</details>`;
        // Equality of the two counts depends on the selected case, not on a fixed symbol.
        out.querySelector('.rank-counts > span').textContent=m.readings===m.independent?'=':'≠';
        if(m.free===0){
          out.querySelector('.rank-count-note').innerHTML=b(['四個未知值 − 四條獨立限制 = 0 個自由方向。沒有可調的方向，不是沒有答案；在這個示意中，只剩 (10, 30, 20, 40) 這一組符合。','Four unknowns − four independent constraints = zero free directions. There is no room to vary, not no answer. Only (10, 30, 20, 40) fits this illustration.']);
          out.querySelector('.rank-match').innerHTML=b(['四個值都已固定；在此示意中，B 只能與 A 相同。','All four values are fixed; B must now equal A in this illustration.']);
        }
        out.querySelector('.rank-formal > p').insertAdjacentHTML('beforeend',` ${b(['公式中的 ker R 是「不改變 RGB 的光譜變化」集合；dim 表示這個集合的自由方向數。這種未知值多於獨立限制的情況，稱為欠定。','In the formula, ker R is the set of spectral changes that leave RGB unchanged; dim counts its free directions. More unknowns than independent constraints is called underdetermination.'])}`);
      } else if(kind==='inverse') {
        const v=state.amount/100,h=[.2+.5*v,.8-.5*v,.4,.6],rows=[[.5,.5,0,0],[0,0,.5,.5],[.5,0,.5,0]],count=kind==='rank'?state.rank:2;
        const c=rows.slice(0,count).map(row=>dot(row,h));
        out.innerHTML=equation(`(${count}×4) × (4×1) = (${count}×1)`)+cellTable([['量測列','Measurement Row'],['h₁','h₁'],['h₂','h₂'],['h₃','h₃'],['h₄','h₄'],['輸出','Output']],rows.slice(0,count).map((row,i)=>[`R${i+1}`,...row.map(v=>v.toFixed(1)),c[i].toFixed(3)]))+`<div class="cx-metrics">${metric(['四個未知值 h','Four Unknown Values h'],h.map(v=>v.toFixed(2)).join(', '))}${metric(['獨立限制','Independent Constraints'],count)}${metric(['自由方向數','Free Directions'],4-count)}</div>${note(count<=2?['h₁ 增加多少，h₂ 就減少多少，因此前兩個量測維持 0.500。第三條獨立量測才有機會看見這個改變。','h₁ rises by the same amount h₂ falls, so the first two outputs stay at 0.500. A third independent measurement can reveal this particular change.']:['第三條量測會隨 h₁ 改變。但四個未知值仍只有三個獨立限制，另有一個自由方向。','The third measurement changes with h₁. Four unknowns still have only three independent constraints, leaving another free direction.'])}`;
      } else if(kind==='reprojection') {
        const m=pairedRecovery(Number(state.transferQuery),state.lambda),v=m.result,fmt=v=>Math.abs(v)<.0000005?'0.000000':v.toFixed(6),vector=a=>'('+a.map(fmt).join(', ')+')';
        out.innerHTML=`<h4>${b(['同一組 w：從 RGB 字典搬回光譜字典','The Same w: From the RGB Dictionary Back to Spectral Atoms'])}</h4><p>${b(['先用固定 RGB 及 D_RGB 執行 OMP 求 w；以下每個波段都沿用同一組係數，不再另外調一組權重。滑桿只改查看的波段。','OMP first fits w from fixed RGB and D_RGB. Every band below reuses those exact weights, without fitting separate spectral weights. The slider changes only the inspected band.'])}</p>${equation(`w = ${vector(m.fit.w)}`)}${cellTable([['原子','Atom'],['同一個權重 wᵢ','Same Weight wᵢ'],['此波段 Dₕ[j,i]','Band Value Dₕ[j,i]'],['貢獻','Contribution']],m.rows.map(r=>[r.atom,fmt(r.weight),fmt(r.signal),fmt(r.contribution)]))}${equation(`ĥ[${m.j+1}] = Σᵢ Dₕ[${m.j+1},i]wᵢ = ${fmt(v.h[m.j])}`)}${plot([{values:v.h}],{min:Math.min(0,...v.h),max:Math.max(1,...v.h),marker:state.lambda,pointAtMarker:true})}<h4>${b(['回投影：相同 w 是否給出一致 RGB？','Reprojection: Does the Same w Give Consistent RGB?'])}</h4>${equation('Rĥ = R(Dₕw) = (RDₕ)w = D_RGBw')}<div class="cx-metrics">${metric(['固定輸入 c','Fixed Input c'],vector(m.c))}${metric(['回投影 Rĥ','Reprojected Rĥ'],vector(v.back))}${metric(['同權重 D_RGBw','Same-Weight D_RGBw'],vector(v.fromRgb))}</div><p>‖c − Rĥ‖₂ = ${norm(add(m.c,v.back,-1)).toExponential(3)}<br>‖Rĥ − D_RGBw‖₂ = ${v.identityError.toExponential(3)}</p>${note(['第一個是 RGB 擬合殘差；第二個是成對字典的代數一致性。即使都很小，也不能證明光譜是真值。算例使用 31 波段、4 個合成原子；論文使用 500 個原子。','The first is RGB fit residual; the second is paired-dictionary algebraic consistency. Small values do not establish spectral truth. The example uses 31 bands and 4 synthetic atoms; the paper uses 500 atoms.'])}<a href="#paper-eq-5">${b(['回到式（5）與（6）','Return to Eqs. (5) and (6)'])}</a>`;
      } else if(['metamer','nullnoise'].includes(kind)) {
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
      } else if(kind==='dictionary') {
        const m=atomReading(state.atom,state.lambda),comparison=state.compareAtoms&&state.atom!==0;
        controls.querySelectorAll('[data-atom-choice]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.atomChoice)===state.atom)));
        const bandCells=waves.map((w,i)=>`<span class="${i===m.index?'is-reading':''}" title="${w} nm">${i+1}</span>`).join('');
        out.innerHTML=`<h4 class="atom-title">${b([`原子 ${m.atom+1}：一整條 31 波段的代表向量`,`Atom ${m.atom+1}: One Complete 31-Band Representative Vector`])}</h4>${legend([[`目前原子 ${m.atom+1}`,`Selected Atom ${m.atom+1}`],...(comparison?[[ '原子 1（比較）','Atom 1 (Comparison)']]:[])])}${plot([{values:m.values,color:colors[0]},...(comparison?[{values:atomReading(0,state.lambda).values,color:colors[1],dash:true}]:[])],{max:1,marker:state.lambda,pointAtMarker:true})}<div class="cx-metrics">${metric(['目前查看的原子','Selected Atom'],String(m.atom+1))}${metric(['這個原子的長度','Values in This Atom'],'31')}${metric([`${state.lambda} nm 的相對值`,`Relative Value at ${state.lambda} nm`],m.value.toFixed(4))}</div><div class="atom-vector"><p>${b(['同一個原子的 31 個位置；橘框只是目前讀取位置','31 Positions in the Same Atom; Orange Marks the Reading Position'])}</p><div class="atom-band-strip" aria-hidden="true">${bandCells}</div></div>${note(['換原子：整條代表曲線改變，但每個原子一直都有 31 個波段值。移動讀取線：只查看其中一個數，不會刪掉其他 30 個。這些示例未經 K-SVD 訓練，也不代表特定純材料。','Changing atoms changes the whole representative curve; every atom still has 31 band values. Moving the reading line inspects one value without deleting the other 30. These examples are not K-SVD-trained atoms or identified pure materials.'])}<details class="atom-details"><summary>${b(['展開這個原子的全部 31 個數','Expand All 31 Values of This Atom'])}</summary>${cellTable([['波段位置','Band Position'],['波長','Wavelength'],['原子數值','Atom Value']],waves.map((w,i)=>[String(i+1),`${w} nm`,m.values[i].toFixed(4)]))}</details><section class="atom-dictionary-shape"><h4>${b(['那為什麼 31 維可以放 500 個原子？','Why Can 31 Dimensions Hold 500 Atoms?'])}</h4><p>${b(['31 是每條向量的長度；500 是可選向量的數量。把 500 個原子各排成一個直欄，字典 Dₕ 的大小就是 31 × 500。像每個位置用三個座標記錄，仍然可以記錄五百個位置；座標數不限制能收錄幾個向量。','31 is the length of each vector; 500 is the number of candidate vectors. Put each atom in one column and Dₕ has size 31 × 500. Three coordinates can describe each of five hundred locations; coordinate count does not limit how many vectors can be stored.'])}</p><div class="atom-dimension-equation"><span>31</span> × <span>500</span><p>${b(['每個原子的波段值數 × 字典的候選原子數','Band Values per Atom × Candidate Atoms in the Dictionary'])}</p></div><details><summary>${b(['基底與過完備字典有什麼不同？','How Does a Basis Differ from an Overcomplete Dictionary?'])}</summary><p>${b(['31 維空間的一組完整基底有 31 個線性獨立向量。過完備字典可放更多候選，例如 500 個；它們不可能全部線性獨立，因此可能有不同組合表示相同向量。「更多候選」不等於「唯一答案」。上方僅展示 8 個合成例子；不把這 8 個本身稱為 31 維過完備字典。','A full basis of a 31-dimensional space contains 31 linearly independent vectors. An overcomplete dictionary can offer more candidates, such as 500; they cannot all be independent, so different combinations may represent the same vector. More choices do not imply a unique answer. The eight synthetic examples above are not themselves an overcomplete dictionary in 31 dimensions.'])}</p></details><a href="#concept-26">${b(['接著分辨 500、28 與約 3 的角色 →','Next: Separate the Roles of 500, 28, and About Three →'])}</a></section>`;
      } else if(kind==='budget') {
        const phase=Math.max(0,Math.min(2,n)),m=numberRoles(state.seed-1);
        controls.querySelectorAll('[data-role-choice]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.roleChoice)===phase)));
        controls.querySelector('[data-action="role-recipe"]').hidden=phase!==2;
        const stages=[['字典規模：保存多少候選？','Dictionary Size: How Many Candidates Are Stored?'],['訓練設定：學字典時的稀疏要求','Training Setting: Sparsity While Learning the Dictionary'],['重建觀察：單一表示通常用了多少？','Recovery Observation: How Many Atoms Describe One Signal?']];
        const pool=selected=>`<div class="role-pool" aria-hidden="true">${Array.from({length:500},(_,i)=>`<i class="${selected.includes(i)?'is-used':''}"></i>`).join('')}</div>`;
        let panel='';
        if(phase===0)panel=`<p>${b(['論文 §5 把學到的字典大小限制為 500 個原子。下方每格代表一個候選原子，不是一個像素，也不是一個波段。每個候選仍各有完整 31 個波段值。','In §5 the learned dictionary is limited to 500 atoms. Each block below stands for one candidate atom, not a pixel or band. Each candidate still contains all 31 band values.'])}</p>${pool([])}<div class="cx-metrics">${metric(['字典候選數','Dictionary Candidates'],'500')}${metric(['每個原子的波段值數','Band Values per Atom'],'31')}${metric(['本圖是否已選重建原子？','Has This Diagram Selected a Recipe?'],t(['尚未選取','Not Yet']))}</div>${note(['500 是整個工具箱的大小，不表示每個像素都使用 500 個原子。','500 is the size of the whole toolbox, not the number of atoms used for every pixel.'])}`;
        if(phase===1)panel=`<p>${b(['在 §5 建立字典的段落，作者報告稀疏設定為 28。它描述稀疏表示的設定，不是字典有 28 個原子、每個原子只剩 28 個波段，或 K-SVD 只迭代 28 次。','In the dictionary-construction paragraph of §5, the authors report a sparsity setting of 28. This concerns sparse representation, not a dictionary of 28 atoms, atoms shortened to 28 bands, or 28 K-SVD iterations.'])}</p><div class="role-distinction"><article><strong>28</strong>${b(['論文報告的稀疏設定','Reported Sparsity Setting'])}</article><article><strong>31</strong>${b(['每個原子保留的波段值數','Band Values Retained in Each Atom'])}<div class="role-full-atom" aria-hidden="true">${Array.from({length:31},()=>'<i></i>').join('')}</div></article></div>${note(['不要把「稀疏係數有多少個不是 0」，和「原子裡有多少個波段」混在一起。稀疏的是組合配方，不是把光譜裁成 28 段。','Do not confuse the count of nonzero coefficients with the number of bands inside an atom. Sparsity concerns the combination recipe, not cropping a spectrum to 28 bands.'])}<details class="role-source-note"><summary>${b(['原文措辭與解讀限制','Original Wording and Interpretation Limit'])}</summary><p>${b(['原文寫「28 non-zero weights per atom」，措辭有歧義。一般稀疏編碼用每筆樣本的係數非零數量描述稀疏度；作者程式未在此核驗，因此本頁不把「每個樣本恰好或最多 28 個」當成已確認的實作規則，也不模擬該訓練參數的效果。','The wording “28 non-zero weights per atom” is ambiguous. Standard sparse coding describes sparsity by nonzero coefficients per sample. The authors’ implementation is not verified here, so this page does not assert an exact per-sample rule or simulate the effect of that training parameter.'])}</p></details>`;
        if(phase===2)panel=`<p>${b(['論文 §6 指出，RGB 樣本與對應重建光譜幾乎總能用 3 個字典原子良好表示。這是作者在其方法與資料上的經驗觀察，不是所有光譜都能被 3 個原子準確還原的定理，也不是「28 變成 3」的計算。','Section 6 observes that RGB samples and their reconstructed spectra are almost always well represented by three dictionary atoms. This is an empirical finding for the authors’ method and data, not a theorem that three atoms accurately recover every spectrum or a calculation turning 28 into 3.'])}</p><p class="role-example-label">${b(['以下只示意一組三原子配方，不是執行 OMP 或作者實測結果','Below Is an Illustrative Three-Atom Recipe, Not an OMP Run or Measured Result'])}</p>${pool(m.selected)}<div class="role-recipe">${m.selected.map((j,i)=>`<article><strong>${b([`原子 ${j+1}`,`Atom ${j+1}`])}</strong><span>w = ${m.weights[j].toFixed(2)}</span></article>`).join('')}</div><div class="cx-metrics">${metric(['全部係數位置','All Coefficient Positions'],'500')}${metric(['本示例非零係數','Nonzero Coefficients in This Example'],String(m.used))}${metric(['組合後的光譜長度','Length of the Combined Spectrum'],'31')}</div>${note(['三個被選中的原子，各自都是 31 波段向量；逐波段乘權重相加後，輸出仍有 31 個數。換一組只改配方示意，不宣稱不同配方重建出同一光譜或同樣準確。','Each selected atom is a 31-band vector; weighting and summing them band by band still produces 31 values. Changing the example illustrates a different recipe, without claiming the same spectrum or accuracy.'])}`;
        out.innerHTML=`<p class="role-context">${b(['500 與 28 都出現在 §5 字典建立段落；約 3 來自 §6 結論觀察。它們不是三個依序縮減的數量。','500 and 28 both appear in §5 on dictionary construction; about three comes from the §6 conclusion. They are not three successive reductions.'])}</p><section class="role-panel"><h4>${b(stages[phase])}</h4>${panel}</section><p class="role-summary">${b(['記住：500 問「可選多少」；28 是「訓練設定」；約 3 是「表示的經驗觀察」。三者不是同一個數量。','Remember: 500 counts candidates; 28 is a training setting; about three is an observation about representation. They are not the same quantity.'])}</p>`;
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
    controls.addEventListener('change',event=>{if(event.target.matches('[data-signature-include]')){const j=Number(event.target.dataset.signatureInclude);state.signatureBands=event.target.checked?[...new Set([...state.signatureBands,j])]:state.signatureBands.filter(i=>i!==j);render();return;}if(event.target.tagName==='SELECT'){state[event.target.dataset.field]=event.target.value;render();}});
    body.addEventListener('click',event=>{
      if(kind==='dictionary'){
        const choice=event.target.closest('[data-atom-choice]');
        if(choice){state.atom=Number(choice.dataset.atomChoice);render();return;}
      }
      if(kind==='budget'){
        const choice=event.target.closest('[data-role-choice]');
        if(choice){state.step=Number(choice.dataset.roleChoice);render();return;}
      }
      if(kind==='matrix'){
        const phaseButton=event.target.closest('[data-matrix-phase]');
        if(phaseButton){state.step=Number(phaseButton.dataset.matrixPhase);render();return;}
      }
      if(kind==='rank'){
        const choice=event.target.closest('[data-rank-stage]');
        if(choice){state.step=Number(choice.dataset.rankStage);state.amount=state.step>=2?10:30;state.rankSecond=state.step>=3?20:50;render();return;}
      }
      if(kind==='signature') {
        const phaseButton=event.target.closest('[data-signature-phase]'),bandButton=event.target.closest('[data-signature-band]'),viewButton=event.target.closest('[data-signature-view]');
        if(viewButton){state.signatureView=Number(viewButton.dataset.signatureView);render();alignSignatureWorkspace();return;}
        if(phaseButton){state.step=Number(phaseButton.dataset.signaturePhase);render();if(state.step===2)alignSignatureWorkspace();return;}
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
      if(button.dataset.action==='signature-all')state.signatureBands=waves.map((_,j)=>j);
      if(button.dataset.action==='signature-clear')state.signatureBands=[];
      if(button.dataset.action==='signature-current')state.signatureBands=[waves.indexOf(state.lambda)];
      if(button.dataset.action==='signature-next')state.step=Math.min(2,state.step+1);
      if(button.dataset.action==='matrix-next')state.step=Math.min(2,state.step+1);
      if(button.dataset.action==='role-recipe')state.seed++;
      if(button.dataset.action==='signature-max'){state.lambda=400+signaturePair().maxDifferenceIndex*10;controls.querySelector('[data-field="lambda"]').value=state.lambda;}
      if(button.dataset.action==='optimal'){state.angle=principalAngle(residuals)*180/Math.PI;controls.querySelector('[data-field="angle"]').value=state.angle;}
      render();
      if(button.dataset.action==='signature-next'&&state.step===2)alignSignatureWorkspace();
    });
    const refresh=()=>{if(!root.closest('[hidden]'))render();};document.addEventListener('reportlanguagechange',refresh);
    window.ReportProjection?.register(`concept:${entry.id}`,{get:()=>state,set:value=>{Object.assign(state,defaults,value);controls.querySelectorAll('[data-field]').forEach(el=>{if(el.type==='checkbox')el.checked=state[el.dataset.field];else el.value=state[el.dataset.field];});render();}});
    renderers.set(entry.id, render);
    render();
  }

  const mounted=new Set();
  function mountEmbedded(number,root,instanceId,initialState={}){
    const entry=entries.find(e=>e.number===number);
    if(!entry||!/^paper-[\w-]+$/.test(instanceId))throw new Error('Invalid embedded concept instance');
    mountLab({...entry,id:instanceId},root,initialState);
  }
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
  window.ReportConcepts={pages:entries.map(e=>({id:e.id,title:e.title[0]})),initializeDirectory,mountVisible,mountEmbedded,math:{solve,fit,omp,nullDirection:q,response:R,principalAngle,directionError,signaturePair,signatureCamera,pairedRecovery,bandReading,matrixReading,rankLesson,atomReading,numberRoles},data:entries};
  createPages();
  window.addEventListener('hashchange',mountVisible);
  document.addEventListener('DOMContentLoaded',mountVisible);
})();
