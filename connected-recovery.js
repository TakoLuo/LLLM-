/* One data lineage: training-only K-SVD -> paired RGB dictionary -> OMP -> held-out spectrum.
   Synthetic report example, not the authors' 500-atom experiment. */
(() => {
  'use strict';
  const clone=x=>JSON.parse(JSON.stringify(x));
  const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),norm=a=>Math.sqrt(dot(a,a));
  const scale=(a,s)=>a.map(x=>x*s),minus=(a,b)=>a.map((x,i)=>x-b[i]);
  const unit=a=>scale(a,1/Math.max(1e-15,norm(a)));
  const waves=Array.from({length:31},(_,i)=>400+10*i);
  const gaussian=(x,c,w)=>Math.exp(-.5*((x-c)/w)**2);
  const R=[[610,45],[540,40],[460,35]].map(([c,w])=>{const a=waves.map(x=>gaussian(x,c,w));return scale(a,1/a.reduce((s,x)=>s+x,0));});
  const project=h=>R.map(a=>dot(a,h));
  const combine=(D,w)=>D[0].map((_,k)=>D.reduce((s,d,j)=>s+d[k]*w[j],0));
  function solve(A,b){
    const m=A.map((r,i)=>[...r,b[i]]),n=b.length;
    for(let j=0;j<n;j++){
      let pivot=j;for(let i=j+1;i<n;i++)if(Math.abs(m[i][j])>Math.abs(m[pivot][j]))pivot=i;
      if(Math.abs(m[pivot][j])<1e-12)return null;
      [m[j],m[pivot]]=[m[pivot],m[j]];const v=m[j][j];for(let k=j;k<=n;k++)m[j][k]/=v;
      for(let i=0;i<n;i++)if(i!==j){const q=m[i][j];for(let k=j;k<=n;k++)m[i][k]-=q*m[j][k];}
    }return m.map(r=>r[n]);
  }
  function fit(D,y){
    if(!D.length)return{weights:[],estimate:y.map(()=>0),residual:[...y]};
    const weights=solve(D.map(a=>D.map(b=>dot(a,b))),D.map(a=>dot(a,y)));
    if(!weights)return null;const estimate=combine(D,weights);return{weights,estimate,residual:minus(y,estimate)};
  }
  function omp(D,y,budget=2){
    if(!D.length||!D.every(d=>d.length===y.length&&d.every(Number.isFinite))||!y.every(Number.isFinite))throw new RangeError('Finite paired dimensions required');
    const cap=Math.min(Math.max(0,Math.floor(budget)),D.length,y.length),frames=[];
    let selected=[],w=D.map(()=>0),r=[...y];
    const frame=(phase,extra={})=>({phase,selected:[...selected],w:[...w],r:[...r],loss:dot(r,r),...extra});
    frames.push(frame('initial'));
    for(let round=1;round<=cap&&norm(r)>1e-10;round++){
      const scores=D.map((d,i)=>selected.includes(i)||norm(d)<1e-12?null:Math.abs(dot(d,r))/norm(d));
      const order=scores.map((score,i)=>({score,i})).filter(x=>x.score!==null).sort((a,b)=>b.score-a.score||a.i-b.i);
      let choice=null;
      for(const candidate of order){const S=[...selected,candidate.i],f=fit(S.map(j=>D[j]),y);if(f){choice={i:candidate.i,S,f};break;}}
      if(!choice)break;const beforeW=[...w],selectionResidual=[...r];selected=choice.S;
      frames.push(frame('select',{round,pending:choice.i,scores,selectionResidual}));
      w=D.map(()=>0);selected.forEach((j,i)=>w[j]=choice.f.weights[i]);r=[...choice.f.residual];
      frames.push(frame('fit',{round,pending:choice.i,scores,beforeW,selectionResidual}));
      frames.push(frame('residual',{round,pending:choice.i,scores,beforeW,selectionResidual}));
    }
    return{w,selected,residual:r,error:norm(r),frames};
  }
  const random=seed=>()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const prototype=[
    waves.map(x=>.06+.8*gaussian(x,455,31)),waves.map(x=>.08+.7*gaussian(x,540,36)),
    waves.map(x=>.05+.8*gaussian(x,645,34)),waves.map(x=>.18+.18*gaussian(x,590,90)+.12*gaussian(x,505,15))
  ].map(unit);
  const rng=random(8201),training=Array.from({length:24},(_,n)=>{
    const a=n%4,b=(a+1+Math.floor(n/4)%3)%4,w=[0,0,0,0];w[a]=.45+.55*rng();w[b]=.15+.35*rng();return combine(prototype,w);
  });
  const truthA=combine(prototype,[.71,0,.37,0]),truthB=combine(prototype,[0,.67,0,.43]);
  // A nonnegative, different held-out spectrum in the nullspace of this R.
  const peak=waves.map(x=>gaussian(x,575,8)),gram=R.map(a=>R.map(b=>dot(a,b))),z=solve(gram,project(peak));
  const q=peak.map((x,j)=>x-R.reduce((s,row,k)=>s+row[j]*z[k],0));
  const safe=.75*Math.min(...q.map((x,j)=>x< -1e-12?truthA[j]/-x:Infinity));
  const queries=[truthA,truthB,truthA.map((x,j)=>x+safe*q[j])].map((truth,i)=>({id:['A','B','C'][i],truth,c:project(truth)}));
  const loss=(D,W,Y=training)=>Y.reduce((s,y,n)=>s+dot(minus(y,combine(D,W[n])),minus(y,combine(D,W[n]))),0);
  const rmse=(a,b)=>norm(minus(a,b))/Math.sqrt(a.length);
  function initialDictionary(mode=0){
    if(mode===0){const points=training.map(project),chosen=[0];while(chosen.length<4){let best=-1,distance=-1;points.forEach((c,i)=>{if(chosen.includes(i))return;const d=Math.min(...chosen.map(j=>dot(minus(c,points[j]),minus(c,points[j]))));if(d>distance){distance=d;best=i;}});chosen.push(best);}return chosen.map(i=>unit(training[i]));}
    const r=random(mode===1?19:73),ids=[];while(ids.length<4){const i=Math.floor(r()*training.length);if(!ids.includes(i))ids.push(i);}return ids.map(i=>unit(training[i]));
  }
  function updateAtom(D,W,j,Y=training){
    const E=Y.map((y,n)=>y.map((v,k)=>v-D.reduce((s,d,i)=>i===j?s:s+d[k]*W[n][i],0)));
    const active=W.map((w,n)=>Math.abs(w[j])>1e-10?n:-1).filter(n=>n>=0);
    if(!active.length)return{D:clone(D),W:clone(W),E,active,changed:false,previousCodes:W.map(w=>w[j]),before:loss(D,W,Y),after:loss(D,W,Y)};
    let d=unit(E[active.reduce((best,n)=>norm(E[n])>norm(E[best])?n:best,active[0])]);
    for(let t=0;t<160;t++){
      const next=d.map((_,k)=>active.reduce((s,n)=>s+E[n][k]*dot(E[n],d),0));if(norm(next)<1e-14)break;
      const v=unit(next),delta=Math.min(norm(minus(v,d)),norm(v.map((x,i)=>x+d[i])));d=v;if(delta<1e-12)break;
    }
    if(dot(d,D[j])<0)d=scale(d,-1);
    const nextD=clone(D),nextW=clone(W);nextD[j]=d;active.forEach(n=>nextW[n][j]=dot(d,E[n]));
    return{D:nextD,W:nextW,E,active,changed:true,previousCodes:W.map(w=>w[j]),before:loss(D,W,Y),after:loss(nextD,nextW,Y)};
  }
  const runs=new Map();
  function train(mode=0,rounds=6){
    const key=`${mode}:${rounds}`;if(runs.has(key))return runs.get(key);
    let D=initialDictionary(mode),W=training.map(y=>omp(D,y,2).w);const frames=[{D:clone(D),W:clone(W),loss:loss(D,W),updates:[]}];
    for(let round=1;round<=rounds;round++){
      W=training.map(y=>omp(D,y,2).w);const codingLoss=loss(D,W),updates=[];
      for(let j=0;j<D.length;j++){const u=updateAtom(D,W,j);updates.push({...u,old:[...D[j]]});D=u.D;W=u.W;}
      frames.push({D:clone(D),W:clone(W),loss:loss(D,W),codingLoss,updates});
    }
    runs.set(key,frames);return frames;
  }
  // This function has no access to a query's ground truth or generating coefficients.
  function recover(D,c,budget){const A=D.map(project),fit=omp(A,c,budget),h=combine(D,fit.w);return{...fit,A,h,back:project(h),paired:combine(A,fit.w)};}
  let pcaCache;
  function pcaBasis(){
    if(pcaCache)return pcaCache;
    const mean=waves.map((_,j)=>training.reduce((s,h)=>s+h[j],0)/training.length),centered=training.map(h=>minus(h,mean)),basis=[],values=[];
    const remove=v=>basis.reduce((r,d)=>minus(r,scale(d,dot(r,d))),v);
    for(let i=0;i<4;i++){
      const residuals=centered.map(h=>remove([...h]));let d=unit(residuals.reduce((a,b)=>norm(a)>norm(b)?a:b));
      for(let t=0;t<300;t++){const v=remove(waves.map((_,j)=>centered.reduce((s,h)=>s+h[j]*dot(h,d),0)));if(norm(v)<1e-14)break;const next=unit(v),delta=Math.min(norm(minus(next,d)),norm(next.map((x,k)=>x+d[k])));d=next;if(delta<1e-12)break;}
      basis.push(d);values.push(centered.reduce((s,h)=>s+dot(h,d)**2,0)/training.length);
    }
    const total=centered.reduce((s,h)=>s+dot(h,h),0)/training.length;
    return pcaCache={mean,basis,values,total};
  }
  function pcaFit(h,k){const p=pcaBasis(),center=minus(h,p.mean),coefficients=p.basis.slice(0,k).map(d=>dot(d,center)),estimate=p.mean.map((x,j)=>x+p.basis.slice(0,k).reduce((s,d,i)=>s+d[j]*coefficients[i],0));return{estimate,coefficients,error:rmse(h,estimate),ratio:p.values.slice(0,k).reduce((s,x)=>s+x,0)/p.total};}
  function localGroups(sample){
    const group=sample<2?[0,1]:[2,3],weights=sample%2===0?[.8,.2]:[.25,.75],D=group.map(i=>train(0)[3].D[i]),truth=combine(D,weights);
    const global=pcaFit(truth,2),local=fit(D,truth);
    return {group,weights:local.weights,truth,global:global.estimate,globalCodes:global.coefficients,
      local:local.estimate,globalError:global.error,localError:rmse(truth,local.estimate)};
  }

  const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const b=p=>`<span class="i18n-unit i18n-block" data-i18n-skip><span class="i18n-en" lang="en">${esc(p[1])}</span><span class="i18n-separator" aria-hidden="true"> / </span><span class="i18n-zh" lang="zh-Hant">${esc(p[0])}</span></span>`;
  const p=a=>`<p>${b(a)}</p>`,f=(v,n=5)=>(Math.abs(v)<.5*10**-n?0:v).toFixed(n),vec=a=>'('+a.map(v=>f(v,4)).join(', ')+')';
  const math=s=>s.replace(/_\{([^}]+)\}/g,'<sub>$1</sub>').replace(/\^\{([^}]+)\}/g,'<sup>$1</sup>').replace(/_(train|RGB|q|n|i|k|j|F|S|R|G|B)(,[a-z0-9Ω]+)?(?=[^a-z]|$)/g,(_,a,c)=>'<sub>'+a+(c||'')+'</sub>');
  const pixel = ['q','目前要估計的像素編號。','Index of the pixel to recover.'];
  const inputRGB = ['c_q','像素 q 已知的線性紅、綠、藍三個數值。','The three known linear red, green, and blue values of pixel q.'];
  const camera = ['R','3 × 31 的相機響應矩陣，每一列把 31 個波段加權成一個 RGB 通道。','The 3 × 31 camera response matrix. Each row weights 31 bands to produce one RGB channel.'];
  const truth = ['h_q','像素 q 的真實 31 波段光譜，重建時未知。','The true 31-band spectrum of pixel q, unknown during recovery.'];
  const estimate = ['ĥ_q、^','像素 q 的 31 波段估計光譜。帽號表示這是由模型算出的估計。','The 31-band estimate of pixel q. The hat marks an estimate computed by the model.'];
  const trainingData = ['Y','固定的訓練光譜矩陣，24 欄各是一條 31 波段光譜。','The fixed training matrix with 24 columns, each a 31-band spectrum.'];
  const dictionary = ['Dₕ','高光譜字典。本例的四欄各存一條完整的 31 波段原子。','The hyperspectral dictionary. Each of its four columns here holds one complete 31-band atom.'];
  const rgbDictionary = ['D_RGB','RGB 字典，每欄是對應光譜原子投影得到的三個通道值。','The RGB dictionary. Each column holds the three projected channel values of the matching spectral atom.'];
  const atom = ['d_i、i','dᵢ 是字典的第 i 欄，也就是原子 i 的整條光譜。','dᵢ is dictionary column i, the complete spectrum of atom i.'];
  const band = ['j','波段編號，從 1 到 31。','Band index from 1 through 31.'];
  const queryWeights = ['w_q','OMP 在 RGB 端為像素 q 求出的係數向量。每個原子對應一個倍率。','The vector of weights OMP fits for pixel q in RGB space, with one entry per atom.'];
  const selected = ['S','目前已選的原子編號集合。','The set of atom indices selected so far.'];
  const selectedColumns = ['A_S','從 RGB 字典取出 S 裡的欄所組成的矩陣。','The matrix of RGB dictionary columns indexed by S.'];
  const selectedWeights = ['w_S','目前已選原子的最佳擬合倍率。','The jointly fitted weights of the selected atoms.'];
  const residual = ['r','殘差，即輸入 RGB 減去目前重建的 RGB。','The residual, obtained by subtracting the current reconstructed RGB from the input RGB.'];
  const approximately = ['≈','約等於，兩側允許有差距。','Approximately equal. The two sides may differ.'];
  // Tile order follows the CAVE sample: four bands, three RGB channels, then the composite.
  const photoLayer = (tile, depth, label, pixelLabel = '') => `
    <div class="cr-photo-layer" style="--tile:${tile};--depth:${depth}">
      ${label ? `<span class="cr-photo-layer-tag">${label}</span>` : ''}
      ${pixelLabel ? `<span class="cr-photo-pixel"><span>${pixelLabel}</span></span>` : ''}
    </div>`;
  const photoMeasurementFigure = `<figure class="cr-photo-cubes">
    <h4>${b(['照片對照：同一像素從 31 波段到 RGB','Photo Diagram: One Pixel from 31 Bands to RGB'])}</h4>
    ${p(['跟著黃色圓點看同一個像素 q。左邊沿波段方向讀出光譜，右邊在同一位置讀出三個通道值。','Follow the yellow marker for pixel q. Read along the spectral bands on the left and across three RGB channels at the same position on the right.'])}
    <div class="cr-photo-flow">
      <section class="cr-photo-panel">
        <h5>${b(['高光譜影像','Hyperspectral Image'])} <var>h</var></h5>
        <span class="cr-photo-dimension">512 × 512 × 31</span>
        <div class="cr-photo-stack" aria-hidden="true">
          ${photoLayer(3,3,'700 nm')}${photoLayer(1,2,'460 nm')}${photoLayer(0,1,'400 nm')}${photoLayer(2,0,'550 nm','h<sub>q,16</sub>')}
        </div>
        ${p(['抽出 550 nm 那一層，黃點就是第 16 波段的值。沿同一位置讀完 31 層，得到像素 q 的完整光譜。','The 550 nm slice is pulled to the front. Its yellow marker is the band-16 value. Reading all 31 slices at that position gives the spectrum of pixel q.'])}
      </section>
      <section class="cr-photo-panel cr-photo-camera">
        <h5>${b(['相機響應','Camera Response'])} <var>R</var></h5>
        <span class="cr-photo-dimension">3 × 31</span>
        <ul class="cr-photo-response" aria-hidden="true">
          <li><b>R</b> <span>● ● ● ··· ●</span></li>
          <li><b>G</b> <span>● ● ● ··· ●</span></li>
          <li><b>B</b> <span>● ● ● ··· ●</span></li>
        </ul>
        ${p(['一列對應一個 RGB 通道，逐波段乘上權重再加總。','One row per RGB channel. Multiply by the weights band by band, then sum.'])}
      </section>
      <section class="cr-photo-panel">
        <h5>${b(['RGB 影像','RGB Image'])} <var>c</var></h5>
        <span class="cr-photo-dimension">512 × 512 × 3</span>
        <div class="cr-photo-rgb">
          <div>
            <div class="cr-photo-stack cr-photo-channels" aria-hidden="true">
              ${photoLayer(6,2,'B')}${photoLayer(5,1,'G')}${photoLayer(4,0,'R','c<sub>q,R</sub>')}
            </div>
            ${p(['R、G、B 各是一張通道影像。紅色層的黃點是 c 的紅色通道值。','Each of R, G, and B is a channel image. The yellow marker on the red layer shows its red channel value.'])}
          </div>
          <div>
            <div class="cr-photo-stack cr-photo-composite" aria-hidden="true">${photoLayer(7,0,'','q')}</div>
            ${p(['三層合成彩色相片。黃點的三個讀值組成 c_q。','Combine the three layers to display the color photograph. The three readings at the marker form c_q.'])}
          </div>
        </div>
      </section>
    </div>
    <div class="cr-photo-equation">
      <math display="block">
        <msub><mi>c</mi><mrow><mi>q</mi><mo>,</mo><mi>k</mi></mrow></msub><mo>=</mo>
        <munderover><mo>∑</mo><mrow><mi>j</mi><mo>=</mo><mn>1</mn></mrow><mn>31</mn></munderover>
        <msub><mi>R</mi><mrow><mi>k</mi><mo>,</mo><mi>j</mi></mrow></msub><mo>×</mo>
        <msub><mi>h</mi><mrow><mi>q</mi><mo>,</mo><mi>j</mi></mrow></msub>
      </math>
      <dl>
        <div><dt>c<sub>q,k</sub></dt><dd>${b(['右側像素 q 的通道 k 讀值','Reading at pixel q in channel k on the right'])}</dd></div>
        <div><dt>∑</dt><dd>${b(['把波段 1 到 31 的乘積加總','Sum the products over bands 1 through 31'])}</dd></div>
        <div><dt>R<sub>k,j</sub></dt><dd>${b(['中間相機對波段 j 的通道 k 權重','Camera weight for channel k at band j'])}</dd></div>
        <div><dt>h<sub>q,j</sub></dt><dd>${b(['左側像素 q 在第 j 層的光譜值','Spectral value at pixel q in layer j on the left'])}</dd></div>
      </dl>
    </div>
    <figcaption>
      ${b(['512 × 512 是這張氣球影像的寬和高。每個像素由 31 個波段轉成 3 個 RGB 通道，寬和高維持 512 × 512。灰階波段來自 CAVE 實測資料，RGB 以示意相機響應算出。','The balloon scene is 512 pixels wide and 512 pixels high. Each pixel goes from 31 spectral bands to 3 RGB channels on the same spatial grid. The grayscale slices come from measured CAVE data. RGB uses an illustrative camera response.'])}
      <a href="https://cave.cs.columbia.edu/repository/Multispectral/Stuff" target="_blank" rel="noopener">${b(['CAVE 氣球資料來源','CAVE Balloons Data Source'])}</a>
    </figcaption>
  </figure>`;
  const queryMeasurement = `c_q = R h_q → ĥ_q<br>
    <math display="block">
      <msub><mi>c</mi><mrow><mi>q</mi><mo>,</mo><mi>k</mi></mrow></msub><mo>=</mo>
      <munderover><mo>∑</mo><mrow><mi>j</mi><mo>=</mo><mn>1</mn></mrow><mn>31</mn></munderover>
      <msub><mi>R</mi><mrow><mi>k</mi><mo>,</mo><mi>j</mi></mrow></msub>
      <msub><mi>h</mi><mrow><mi>q</mi><mo>,</mo><mi>j</mi></mrow></msub>
    </math>`;
  const equationSymbols = {
    input: [pixel, inputRGB, camera, truth, estimate,
      ['Rh_q','用相機響應把真實光譜加權成三個量測值。','Apply the camera response to the true spectrum to obtain the three measurements.'],
      ['→','指出接下來的任務。利用學到的光譜規律來估計 ĥ_q。','Points to the next task: estimate the spectrum using the learned spectral prior.'],
      ['k','通道編號，依序對應紅、綠、藍。','Channel index in red, green, blue order.'], band,
      ['c_{q,k}','像素 q 在通道 k 的線性 RGB 量測值。','The linear RGB measurement of pixel q in channel k.'],
      ['R_{k,j}','通道 k 對第 j 個波段的感光權重。','The response weight of channel k at band j.'],
      ['h_{q,j}','像素 q 的真實光譜在第 j 個波段的值。','The true spectral value of pixel q at band j.'],
      ['Σ_{j=1}^{31}','固定一個通道，把第 1 到第 31 波段的「感光權重 × 光譜值」加總。','For one channel, add response weight × spectral value across bands 1 through 31.']],
    training: [trainingData, dictionary,
      ['W、w_n、n','W 收錄每筆訓練資料的倍率。wₙ 是第 n 筆的係數向量。','W stores the training weights. wₙ is the weight vector for training sample n.'],
      ['DₕW','用字典和每筆的倍率重建所有訓練光譜。','Reconstructs the training spectra using the dictionary and their weights.'],
      ['L_train','全部訓練樣本和波段的重建平方差總和。','Total squared reconstruction error over all training samples and bands.'],
      ['min_{Dₕ, W}','調整字典 Dₕ 和訓練係數 W，使訓練誤差最小。','Adjust Dₕ and W to minimize training error under the constraints.'],
      ['‖·‖_F²','把矩陣每一格的差平方後加總。F 代表矩陣的 Frobenius 範數。','Square every entry of the difference matrix and add the results. F denotes the Frobenius norm.'],
      ['‖w_n‖₀ ≤ 2','下標 0 表示數非零係數。≤ 2 表示每筆最多用兩個原子。','Subscript 0 counts nonzero weights. ≤ 2 allows up to two atoms per training sample.'],
      atom, ['‖d_i‖₂ = 1','把原子各波段值的平方加總後開根號，結果設為 1。','The square root of the sum of the atom’s squared band values is set to one.']],
    atomUpdate: [trainingData, atom,
      ['k、d_k、x_k','k 是原子編號。dₖ 是原子 k，xₖ 是它在所有訓練樣本中的係數列。','k indexes atoms. dₖ is atom k, and xₖ is its row of weights across training samples.'],
      ['Σ_{k≠i} d_k x_k','把除了原子 i 之外的貢獻加起來。≠ 表示排除 i。','Add the contributions of all atoms except atom i. ≠ excludes i.'],
      ['E_i','從 Y 扣掉其他原子的貢獻後，留給原子 i 解釋的剩餘光譜。','The spectra left for atom i after subtracting all other atom contributions from Y.'],
      ['Ωᵢ、E_{i,Ωᵢ}','Ωᵢ 是更新前就用到原子 i 的固定樣本名單。E_{i,Ωᵢ} 只保留名單內的剩餘光譜。','Ωᵢ is the fixed list of samples already using atom i. E restricted to Ωᵢ keeps the leftover spectra for that list.'],
      ['vᵢ、d_i vᵢ','vᵢ 是名單內樣本的新倍率列。乘上 dᵢ 就得到這個原子對每筆的貢獻。','vᵢ holds the new weights for listed samples. Multiplying by dᵢ gives this atom’s contribution to each of them.'],
      ['min_{dᵢ,vᵢ}、‖·‖_F²','選新的曲線和倍率，讓名單內各樣本、各波段的平方差總和最小。','Choose the curve and weights to minimize the sum of squared differences over the listed samples and bands.'],
      ['‖d_i‖₂ = 1','新曲線的向量長度固定為 1。','The new atom curve is constrained to unit vector length.']],
    projection: [dictionary, rgbDictionary, camera, atom, band,
      ['k、c_{i,k}','k 是 R、G、B 通道之一。c_{i,k} 是原子 i 投影後在通道 k 的值。','k selects the R, G, or B channel. c at i,k is atom i’s projected value in channel k.'],
      ['R_{k,j}、d_{i,j}','前者是通道 k 對波段 j 的感光權重，後者是原子 i 在波段 j 的光譜值。','The first is channel k’s response weight at band j. The second is atom i’s spectral value at band j.'],
      ['Σ_{j=1}^{31}','從第 1 到第 31 波段，把每個光譜值乘上對應權重再加總。','Sum the 31 products of each spectral value and its matching response weight.']],
    omp: [['i、a_i、i*','i 是候選原子編號。aᵢ 是它的 RGB 欄，i* 是這一輪選到的編號。','i indexes a candidate atom. aᵢ is its RGB column, and i* is the atom index chosen this round.'],
      selected, ['i∉S','只考慮還沒被選入 S 的原子。','Consider only atoms not yet in S.'], residual,
      ['ᵀ、a_iᵀr','ᵀ 表示轉置。內積 aᵢᵀr 是三個對應通道相乘再相加。','ᵀ denotes transpose. The dot product aᵢᵀr multiplies and sums the three matching channel pairs.'],
      ['|·|、‖a_i‖₂','|·| 取絕對值。分母是 RGB 原子的向量長度，用來校正分數。','|·| takes the absolute value. The denominator is the RGB atom’s vector length, used to normalize its score.'],
      ['arg max','回傳分數最高的候選原子編號。','Returns the index of the highest-scoring candidate.'],
      pixel, inputRGB, selectedColumns,
      ['z、A_S z','z 是一組待嘗試的倍率。A_S z 是用它拼出的 RGB。','z is a candidate set of weights. A_S z is the RGB reconstructed using those weights.'],
      ['‖c_q − A_S z‖₂²','將三個通道的重建差各自平方再相加。','Sum the squared reconstruction differences across the three channels.'],
      ['arg min_z','回傳讓上述平方差最小的那組倍率。','Returns the candidate weights that minimize the squared error.'], selectedWeights],
    rgbError: [pixel, inputRGB, selected, selectedColumns, selectedWeights, residual,
      ['r_R、r_G、r_B','紅、綠、藍三個通道各自的殘差。','The residual components for the red, green, and blue channels.'],
      ['L_RGB、²','RGB 平方差總和。每個殘差先平方，再將三項相加。','RGB squared error. Square each residual component, then add the three results.']],
    output: [pixel, estimate, dictionary, queryWeights, atom, band,
      ['ĥ_{q,j}、d_{i,j}、w_{q,i}','依序是估計光譜第 j 個值、原子 i 在波段 j 的值、原子 i 對像素 q 的倍率。','The estimated value at band j, atom i’s value at that band, and atom i’s weight for pixel q, respectively.'],
      ['Σ_i','將各原子的該波段值乘倍率後，把所有原子的貢獻加起來。','Multiply each atom’s band value by its weight, then sum the contributions across atoms.']],
    substitution: [pixel, band,
      ['ĥ_{q,j}','像素 q 在所選波段 j 的估計值。','The estimated value of pixel q at the selected band j.'],
      ['×、+、≈','每項先乘「原子在這個波段的值 × 該原子的倍率」，再相加。畫面數字經四捨五入。','Multiply each atom’s band value by its fitted weight and add the products. The displayed numbers are rounded.']],
    check: [pixel, inputRGB, estimate, camera, dictionary, rgbDictionary, queryWeights,
      ['Rĥ_q、D_RGB w_q','前者把估計光譜投回 RGB，後者直接用 RGB 字典重建。兩條路徑給出相同的 RGB。','The first projects the estimated spectrum into RGB. The second reconstructs RGB directly from the RGB dictionary. Both give the same RGB.'], approximately],
    spectralError: [pixel, band,
      ['ĥ_{q,j}、h_{q,j}','像素 q 在波段 j 的估計值和保留的真實值。','The estimated and held-out true values at band j for pixel q.'],
      ['(ĥ_{q,j} − h_{q,j})²','該波段估計值減真實值，再把差平方。','The squared difference between the estimate and truth at that band.'],
      ['Σ_{j=1}^{31}、1/31','將 31 個波段的平方差加總，再除以 31 取平均。','Sum the squared differences across all 31 bands, then divide by 31.'],
      ['√、RMSE','√ 表示開根號。RMSE 是平方差平均後開根號得到的光譜誤差。','√ denotes a square root. RMSE is the square root of the mean squared spectral error.']]
  };
  function equation(formula, meaning, definitions) {
    const list = definitions.map(([symbol,zh,en]) =>
      `<div><dt>${math(esc(symbol.replaceAll('、',' / ')))}</dt><dd>${b([zh,en])}</dd></div>`).join('');
    return `<div class="cr-equation"><strong>${math(formula)}</strong><div class="cr-symbols">
      <b>${b(['符號定義','Symbol Definitions'])}</b><dl>${list}</dl></div>${p(meaning)}</div>`;
  }
  const eq=(key,formula,meaning)=>equation(formula,meaning,equationSymbols[key]);
  const metric=(name,value)=>`<div class="cr-metric">${b(name)}<strong>${value}</strong></div>`;
  const table=(heads,rows)=>`<div class="cr-table"><table><thead><tr>${heads.map(h=>`<th>${Array.isArray(h)?b(h):h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(v=>`<td>${Array.isArray(v)?b(v):v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  function plot(series,band=null){
    const lo=Math.min(0,...series.flatMap(s=>s.v)),hi=Math.max(.35,...series.flatMap(s=>s.v)),x=j=>45+j*650/30,y=v=>175-(v-lo)/(hi-lo)*145;
    return `<figure class="cr-plot"><p class="cr-axis">${b(['相對光譜值（任意單位）；橫軸：波長 nm','Relative Spectral Values (Arbitrary Units); Horizontal Axis: Wavelength in nm'])}</p><svg viewBox="0 0 730 215" role="img" aria-label="31 band spectral curves; wavelength in nm and relative signal"><path d="M45 25V175H695" stroke="#819ca8" fill="none"/>${Number.isInteger(band)?`<path d="M${x(band)} 25V175" stroke="#bf7c29" stroke-dasharray="4 4"/>`:''}${series.map((s,i)=>`<polyline points="${s.v.map((v,j)=>`${x(j)},${y(v)}`).join(' ')}" stroke="${s.color||['#087f8c','#c27c2b','#7150a5'][i]}" stroke-width="3" fill="none" ${i?'stroke-dasharray="6 4"':''}/>`).join('')}<text x="4" y="33">${f(hi,2)}</text><text x="4" y="177">${f(lo,2)}</text><text x="45" y="203">400 nm</text><text x="635" y="203">700 nm</text></svg><figcaption>${series.map((s,i)=>`<span style="--curve:${s.color||['#087f8c','#c27c2b','#7150a5'][i]}">${b(s.name)}</span>`).join('')}</figcaption></figure>`;
  }
  const titles=[['已知什麼、估計什麼','Known Input and Unknown Output'],['K-SVD 學這本字典','K-SVD Learns This Dictionary'],['同一本字典投影成 RGB','Project This Dictionary to RGB'],['OMP 求這個像素的係數','OMP Fits This Pixel’s Codes'],['相同係數產生 31 波段','The Same Codes Produce 31 Bands'],['用保留真值檢查估計','Check against Held-Out Truth']];
  const stageFromHash=hash=>{const match=/^#connected-stage-([0-5])$/.exec(String(hash));return match?Number(match[1]):null;};
  const initialState=hash=>({stage:stageFromHash(hash)??0,round:3,init:0,query:0,budget:2,atom:0,band:15,sample:0,tick:0,reveal:false,settingsOpen:false});
  const state=initialState(typeof location==='undefined'?'':location.hash);let root,timer=null;
  const integer=(x,min,max)=>Math.max(min,Math.min(max,Math.round(Number(x)||0)));
  function snapshot(){const trainingRun=train(state.init),trained=trainingRun[state.round],query=queries[state.query],reconstruction=recover(trained.D,query.c,state.budget),tick=Math.min(state.tick,reconstruction.frames.length-1);return{trainingRun,trained,query,reconstruction,tick,frame:reconstruction.frames[tick],complete:tick===reconstruction.frames.length-1};}
  const button=(action,label,disabled=false)=>`<button type="button" data-cr-action="${action}" ${disabled?'disabled':''}>${b(label)}</button>`;
  function bandControl(){return `<label>${b(['讀取波段 j（只查看位置）','Inspect Band j (Read Only)'])}<select data-cr-key="band">${waves.map((w,j)=>`<option value="${j}" ${j===state.band?'selected':''}>${w} nm · j=${j+1}</option>`).join('')}</select></label>`;}
  function atomControl(){return `<label>${b(['原子 i（整條 31 波段）','Atom i (All 31 Bands)'])}<select data-cr-key="atom">${[0,1,2,3].map(i=>`<option value="${i}" ${i===state.atom?'selected':''}>d${i+1}</option>`).join('')}</select></label>`;}
  const initialChoices = [
    {value:0, label:['RGB 分散','Spread in RGB'], help:[
      '挑出 RGB 顏色較分散的 4 條訓練光譜，當作 K-SVD 的起始曲線。',
      'Start K-SVD with four training spectra selected to have well-separated RGB values.'
    ]},
    {value:1, label:['固定隨機起點 B','Seeded Start B'], help:[
      '以固定的抽選規則挑出 B 組的 4 條起始曲線。每次選 B 都從同一組曲線開始。',
      'Use a fixed random draw to choose the four starting curves in group B. Selecting B always starts from the same four.'
    ]},
    {value:2, label:['固定隨機起點 C','Seeded Start C'], help:[
      '改用另一個固定的抽選規則挑出 C 組起始曲線。可以在第 2 步與 B 組學出的曲線比較。',
      'Use a different fixed random draw for the starting curves in group C. Compare the learned curves with group B in step 2.'
    ]}
  ];
  const queryChoices = [
    {value:0, label:['A：新光譜','A: New Spectrum'], help:[
      '把像素 A 的 RGB 交給 OMP。A 的完整光譜留到第 6 步用來評估。',
      'Give OMP the RGB values of pixel A. Its complete spectrum is held back for evaluation in step 6.'
    ]},
    {value:1, label:['B：另一個 RGB','B: Another RGB'], help:[
      '把輸入換成像素 B 的 RGB。它和 A 的 RGB 不同，求出的原子與倍率也可能改變。',
      'Switch to pixel B, whose RGB differs from A. The chosen atoms and their weights can change.'
    ]},
    {value:2, label:['C：與 A 同 RGB 的不同光譜','C: Different Spectrum, Same RGB as A'], help:[
      'C 和 A 的 RGB 相同，真實光譜卻不同。用同一本字典與同一上限，兩者會得到同一個估計。',
      'C and A have the same RGB but different true spectra. With the same dictionary and atom cap, both get the same estimate.'
    ]}
  ];
  const budgetChoices = [
    {value:1, label:['1','1'], help:[
      'OMP 最多用 1 條原子曲線，只需要決定這條曲線的倍率。',
      'OMP can use at most one atom curve and fit its weight.'
    ]},
    {value:2, label:['2','2'], help:[
      'OMP 最多用 2 條原子曲線。用到兩條時，就各乘一個倍率再相加。',
      'OMP can use up to two atom curves. If it uses both, it scales each curve by its own weight and adds them.'
    ]},
    {value:3, label:['3','3'], help:[
      'OMP 最多用 3 條原子曲線。若前面幾條已讓 RGB 誤差夠小，可以提早停止。',
      'OMP can use up to three atom curves. It can stop early if fewer curves make the RGB error small enough.'
    ]}
  ];
  function settingSelect(key, label, choices) {
    const id = `cr-setting-${key}`;
    const selected = choices.find(choice => choice.value === state[key]);
    const languageIndex = document.documentElement.dataset.language === 'zh' ? 0 : 1;
    const options = choices.map(choice => `<option value="${choice.value}" ${choice === selected ? 'selected' : ''}>${esc(choice.label[languageIndex])}</option>`).join('');
    return `<div class="cr-setting-field">
      <label for="${id}">${b(label)}</label>
      <select id="${id}" data-cr-key="${key}" aria-describedby="${id}-help">${options}</select>
      <p class="cr-setting-help" id="${id}-help">${b(selected.help)}</p>
    </div>`;
  }
  function settings() {
    return `<details class="cr-settings" ${state.settingsOpen ? 'open' : ''}>
      <summary>${b(['固定條件與可改參數','Fixed Conditions and Editable Parameters'])}</summary>
      <div class="cr-fields">
        ${settingSelect('init',['起始字典','Initial Dictionary'],initialChoices)}
        ${settingSelect('query',['新像素（不在訓練集合內）','Held-Out Query Pixel'],queryChoices)}
        ${settingSelect('budget',['RGB 最多使用原子數 s','RGB Atom Cap s'],budgetChoices)}
      </div>
      ${p([
        '訓練固定使用 24 條合成光譜，學出 4 個各有 31 波段、長度為 1 的原子。每條訓練光譜最多用 2 個原子。修改選項後，到第 4 步按「直接求完這個 RGB」，即可查看新的係數。',
        'Training uses 24 synthetic spectra to learn four unit-length atoms with 31 bands each. Each training spectrum uses at most two atoms. After changing an option, click “Finish This RGB Fit” in step 4 to see the new weights.'
      ])}
    </details>`;
  }
  function metamerComparison(D,budget){
    const pair=[queries[0],queries[2]],results=pair.map(q=>recover(D,q.c,budget));
    return `<h4>${b(['A／C 放在同一張表比較','Compare A and C Side by Side'])}</h4>${table([['像素','Pixel'],['輸入 RGB','Input RGB'],['光譜 RMSE','Spectral RMSE']],pair.map((q,i)=>[q.id,vec(q.c),f(rmse(results[i].h,q.truth),7)]))}${p(['相機、學成字典與 RGB 上限相同；A/C 的 RGB 相同，所以估計相同，但兩條獨立真值不同，光譜誤差也不同。','Camera, learned dictionary, and RGB cap are fixed. Equal A/C RGB gives equal estimates, while different independent truths give different spectral errors.'])}`;
  }
  function atomUpdateLesson(update, i, n) {
    const title = b(['SVD 如何決定新的原子形狀？', 'How Does SVD Choose the New Atom Shape?']);
    const objective = eq('atomUpdate','E_i = Y − Σ_{k≠i} d_k x_k; min_{dᵢ,vᵢ} ‖E_{i,Ωᵢ} − d_i v_i‖²_F, ‖d_i‖₂ = 1', [
      'dₖ 是第 k 個原子，xₖ 是它在所有訓練樣本中的係數列。Ωᵢ 是更新前就用到 dᵢ 的樣本名單，在這次更新中固定。Eᵢ,Ωᵢ 只取名單內的剩餘光譜；vᵢ 是這些樣本的新係數列。',
      'dₖ is atom k and xₖ is its row of training coefficients. Ωᵢ is the fixed list of samples already using dᵢ. Eᵢ,Ωᵢ keeps only the leftover spectra on that list; vᵢ is their row of new coefficients.'
    ]);
    if (!update) {
      return `<section class="cr-insight"><h4>${title}</h4>${objective}${p([
        '第 0 輪只有起始字典與初次編碼。到第 1 輪就能檢查實際的 SVD 更新。',
        'Iteration 0 has the initial dictionary and first coding pass. Go to iteration 1 to inspect a computed SVD update.'
      ])}</section>`;
    }

    const active = update.active.includes(n);
    const oldCode = update.previousCodes[n], newCode = update.W[n][i];
    const leftover = update.E[n], oldAtom = update.old, newAtom = update.D[i];
    const oldError = minus(leftover, scale(oldAtom, oldCode));
    const newError = minus(leftover, scale(newAtom, newCode));
    const oldSse = dot(oldError, oldError), newSse = dot(newError, newError);
    const zh = document.documentElement.dataset.language === 'zh';
    const support = update.active.map(index => 'y' + (index + 1)).join(', ');
    const sampleSelector = `<label>${b(['查看哪筆訓練光譜？', 'Inspect a Training Spectrum'])}<select data-cr-key="sample">${training.map((_, index) => {
      const used = update.active.includes(index);
      const label = zh ? (used ? '列入更新' : '係數保持 0') : (used ? 'included' : 'code stays 0');
      return `<option value="${index}" ${index === n ? 'selected' : ''}>y${index + 1} · ${label}</option>`;
    }).join('')}</select></label>`;
    const rows = [5, 15, 25].map(j => [
      `${waves[j]} nm`, f(training[n][j], 5), f(training[n][j] - leftover[j], 5),
      f(leftover[j], 5), f(oldAtom[j] * oldCode, 5), f(newAtom[j] * newCode, 5)
    ]);

    return `<section class="cr-insight"><h4>${title}</h4>${objective}
      <ol class="cr-steps">
        <li>${b(['先扣掉其他原子的貢獻。每筆留下的 31 個數，是這個原子要負責的剩餘光譜。','Subtract the other atoms. The 31 remaining values in each sample are the part this atom must explain.'])}</li>
        <li>${b(['鎖定原本用到這個原子的樣本。每筆可以有不同倍率，但都必須共用一條 31 波段曲線。','Keep the list of samples that already use this atom. Each sample can have its own multiplier, but they share one 31-band curve.'])}</li>
        <li>${b(['SVD 找一條長度為 1 的共用曲線，並替名單內每筆重算倍率，讓「剩餘光譜 − 新曲線×新倍率」的平方差總和最小。','SVD finds one unit-length curve and refits the listed samples’ multipliers to minimize the sum of squared differences between their leftover spectra and the scaled new curve.'])}</li>
      </ol>
      ${p([`固定名單 Ωᵢ（${update.active.length} 筆）：${support || '空名單，略過更新'}。`, `Fixed list Ωᵢ (${update.active.length}): ${support || 'empty; the update is skipped'}.`])}
      <div class="cr-fields">${sampleSelector}</div>
      ${p(active
        ? [`y${n+1} 列入本次更新，倍率 ${f(oldCode,5)} → ${f(newCode,5)}。`, `y${n+1} participates. Its multiplier changes from ${f(oldCode,5)} to ${f(newCode,5)}.`]
        : [`y${n+1} 不在名單內。這個原子對它的倍率保持 0，貢獻也保持 0。`, `y${n+1} is outside the list. Its multiplier and contribution from this atom stay at zero.`])}
      ${table([['波長','Wavelength'],['固定量測 y','Fixed Measurement y'],['其他原子合計','Other Atoms'],['剩餘 e = y − 其他','Leftover e = y − Others'],['舊曲線×舊倍率','Old Curve × Old Code'],['新曲線×新倍率','New Curve × New Code']],rows)}
      <div class="cr-metrics">
        ${metric(['這一筆的 31 波段平方差','This Sample’s 31-Band Squared Error'], `${f(oldSse,7)} → ${f(newSse,7)}`)}
        ${metric(['此原子更新前後的整批平方差','Total Squared Error across This Atom Update'], `${f(update.before,7)} → ${f(update.after,7)}`)}
      </div>
      ${p(['表格抽出三個波段供對照，兩個誤差都用完整 31 波段計算。SVD 最小化的是名單內合計的平方差，個別樣本的誤差仍可能上升。名單外的貢獻固定，所以整批的誤差減少量等於名單內的減少量。','The table shows three bands. Both errors use all 31 bands. SVD minimizes the total squared error over the fixed list, so an individual sample can still get worse. Contributions outside the list are unchanged, so the reduction in the full batch equals the reduction on the list.'])}
    </section>`;
  }
  const stageLessons = [
    {
      terms: [
        [['光譜','Spectrum'],['同一像素在各波段的訊號，本例有 31 個值。','The signal at one pixel across the 31 bands in this example.']],
        [['RGB 量測','RGB measurement'],['相機做三次加權加總，得到紅、綠、藍三個數。','The camera takes three weighted sums to obtain red, green, and blue values.']],
        [['先驗','Prior'],['用先前量過的光譜學到常見曲線，縮小可能答案。','Learn common shapes from previous spectra to narrow down possible answers.']]
      ],
      example: ['假設一個通道只取兩個波段的平均。0.3 和 0.7 的平均是 0.5，0.4 和 0.6 的平均也是 0.5。只知道結果 0.5，就無法分辨原本是哪一組。','Suppose a channel averages two bands. Both (0.3, 0.7) and (0.4, 0.6) give 0.5. Knowing the average alone leaves both pairs possible.'],
      watch: ['先讀表中的三個 RGB 數值，想像要用它們估計 31 個值。接著切到第 2 步，看先前的光譜如何變成可用來重建的曲線。','Read the three RGB values in the table and note that the goal is to estimate 31 values. Then open step 2 to see how earlier spectra become curves for reconstruction.']
    },
    {
      terms: [
        [['原子與字典','Atom and dictionary'],['一個原子是一條完整光譜曲線。字典收集這些可用來拼光譜的曲線。','An atom is a complete spectral curve. The dictionary collects the curves used to build spectra.']],
        [['倍率','Weight'],['每條曲線先乘自己的倍率，再與其他曲線相加。倍率為 0 時，這條曲線沒有貢獻。','Scale each curve by its weight before adding it to the others. A zero weight gives no contribution.']],
        [['min','min'],['調整曲線和倍率，讓拼出的光譜盡量接近固定的訓練光譜。','Adjust the curves and their weights to reduce the difference from the fixed training spectra.']]
      ],
      example: ['同一筆兩波段光譜是 (2, 4)。拼成 (1, 5) 的平方差是 2，拼成 (2, 3) 的平方差是 1。只要都符合原子上限，誤差較小的第二種更符合 min 的目標。','Take a two-band target (2, 4). A reconstruction of (1, 5) has squared error 2, and (2, 3) has squared error 1. If both respect the atom cap, the second is closer to the minimization goal.'],
      watch: ['先把迭代設成 0，再按「做下一次迭代」。一輪先替每筆光譜求倍率，再逐一更新原子。比對同一原子的更新前後曲線，再看整輪訓練平方差。','Set iterations to 0 and click “Run the Next Iteration.” A round first fits weights for each spectrum, then updates the atoms one at a time. Compare the two curves for the same atom and check the training squared error for the round.']
    },
    {
      terms: [
        [['光譜原子','Spectral atom'],['字典中的一條 31 波段曲線。','One 31-band curve in the dictionary.']],
        [['相機感度','Camera response'],['每個通道對各波段的權重。訊號乘權重，就是該波段的貢獻。','The weight each channel gives each band. Signal times weight gives that band’s contribution.']],
        [['RGB 配對','RGB partner'],['把同一原子轉成三個 RGB 值，並保留原子的編號。','Convert the same atom into three RGB values and keep its atom index.']]
      ],
      example: ['只看兩個波段的簡例。如果訊號是 0.4 和 0.8，權重是 0.25 和 0.75，這個通道的輸出是 0.4 × 0.25 + 0.8 × 0.75 = 0.70。','In a two-band example, signals of 0.4 and 0.8 with weights of 0.25 and 0.75 produce a channel value of 0.4 × 0.25 + 0.8 × 0.75 = 0.70.'],
      watch: ['選一個原子，再切換波段。看表中的「本項貢獻」如何改變，並對照最後一欄的「完整 31 項和」。','Select an atom, then change the inspected band. Compare the changing contribution in “This Term” with the “Full 31-Term Sum” in the last column.']
    },
    {
      terms: [
        [['殘差','Residual'],['輸入 RGB 減去目前拼出的 RGB，表示還有多少需要解釋。','The input RGB minus the RGB built so far, showing what remains to be explained.']],
        [['選原子','Select an atom'],['用殘差替候選曲線評分，選出一個編號。','Score candidate curves against the residual and select an atom index.']],
        [['共同求倍率','Fit the weights together'],['讓已選的曲線一起配合輸入 RGB，重新計算各自要乘多少。','Refit all selected curves together to match the input RGB as closely as possible.']]
      ],
      example: ['輸入是 (0.6, 0.4, 0.2)，目前拼出 (0.5, 0.3, 0.2)，殘差就是 (0.1, 0.1, 0)。下一次選原子時，演算法就看這三個剩餘差值。','If the input is (0.6, 0.4, 0.2) and the current fit is (0.5, 0.3, 0.2), the residual is (0.1, 0.1, 0). OMP uses that leftover difference to choose the next atom.'],
      watch: ['從起始畫面按兩次「下一個子步驟」。第一次看哪列出現星號，第二次看倍率和 RGB 平方差。如果已經求完，可以按「重播這個 RGB」。','From the start, press “Next Substep” twice. First watch which row gets the star. Then watch the weights and RGB squared error. If you already finished, choose “Replay This RGB.”']
    },
    {
      terms: [
        [['同一組倍率','Same fitted weights'],['沿用 OMP 在 RGB 端找到的原子編號與倍率。','Reuse the atom indices and weights OMP found in RGB space.']],
        [['光譜重建','Spectral reconstruction'],['回到同編號的完整光譜曲線，逐波段將乘積加總。','Return to the matching spectral curves and add their weighted values band by band.']]
      ],
      example: ['假設兩條曲線的倍率是 0.5 和 0.25，在某個波段的值是 0.2 和 0.6，該波段估計為 0.5 × 0.2 + 0.25 × 0.6 = 0.25。','Suppose two curves have weights 0.5 and 0.25, and their values at one band are 0.2 and 0.6. The band estimate is 0.5 × 0.2 + 0.25 × 0.6 = 0.25.'],
      watch: ['換一個波段，比較「此波段的原子值」和「同一係數」。曲線上的讀值會換位置，倍率會沿用。','Inspect a different band and compare “Atom Value” with “Same Code.” You read a new place on each curve and keep the same fitted weights.']
    },
    {
      terms: [
        [['回投影','RGB reprojection'],['把估計的光譜送回同一個相機模型，確認能否拼出接近輸入的 RGB。','Run the estimated spectrum through the same camera model and compare the resulting RGB with the input.']],
        [['真值與 RMSE','Ground truth and RMSE'],['真值是留待評分的完整光譜。RMSE 把每個波段的估計差平方、平均再開根號。','Ground truth is the held-out complete spectrum. RMSE squares the bandwise differences, averages them, and takes the square root.']]
      ],
      example: ['本例的 A、C 有相同 RGB 和相同估計，卻有不同真值。即使兩個 RGB 擬合一樣好，和真值相比的光譜誤差仍可能不同。','A and C in this example have identical RGB and estimates, yet their true spectra differ. The same RGB fit can therefore yield different spectral errors.'],
      watch: ['先看輸入與回投影的三個數，再勾「揭露保留真值與 A/C 比較」。比對兩筆的 RGB 和光譜 RMSE。','First compare the input and reprojected RGB values. Then reveal the held-out truth and compare the RGB and spectral RMSE for A and C.']
    }
  ];
  function stageIntroduction(stage) {
    const lesson = stageLessons[stage];
    return `<div class="cr-stage-intro">
      <h4>${b(['先定義這一步會用到的概念','Key Terms Before You Start'])}</h4>
      <dl>${lesson.terms.map(([name,meaning])=>`<div><dt>${b(name)}</dt><dd>${b(meaning)}</dd></div>`).join('')}</dl>
      <div class="cr-stage-example"><strong>${b(['先看小例','Start with an Example'])}</strong>${p(lesson.example)}</div>
    </div>`;
  }
  function operationHint(meaning = stageLessons[state.stage].watch) {
    return `<aside class="cr-operation-hint"><strong>${b(['操作時看這裡','What to Watch'])}</strong>${p(meaning)}</aside>`;
  }
  function trainingScene(trained, trainingRun, i) {
    const update = trained.updates[i];
    return eq('training','min_{Dₕ,W} L_train = ‖Y − DₕW‖²_F; ‖w_n‖₀ ≤ 2; ‖d_i‖₂ = 1', [
      'Y 固定；Dₕ 是四條待學原子；W 收錄 24 筆訓練係數。wₙ 是第 n 筆的係數向量，下標 0 數其中非零的係數。error 是把每筆、每個波段的重建差平方後加總，F 表示計入矩陣的每一格。‖dᵢ‖₂ = 1 是指原子的 31 個值平方加總後，開根號得 1。',
      'Y is fixed. Dₕ holds four learned atoms and W stores the codes for 24 training samples. wₙ contains sample n’s codes, and subscript 0 counts its nonzero entries. The error squares and sums each sample’s difference at every band, so F includes every matrix entry. ‖dᵢ‖₂ = 1 means the square root of the sum of the atom’s 31 squared values is one.'
    ]) + settings() + operationHint() + `<div class="cr-fields"><label>${b(['完成幾次迭代？','Completed Iterations'])}<input type="range" min="0" max="6" step="1" value="${state.round}" data-cr-key="round"><output>${state.round}</output></label>${atomControl()}</div>
      <div class="cr-actions">${button('train-next',['做下一次迭代','Run the Next Iteration'],state.round===6)}${button('train-play',timer?['暫停','Pause']:['逐輪播放','Play the Iterations'])}<output class="cr-live-error">L<sub>train</sub> = ${f(trained.loss,7)}</output></div>
      ${plot(update ? [{v:update.old,name:['本輪更新前原子','Atom before This Update']},{v:trained.D[i],name:['更新後、將交給 OMP 的原子','Updated Atom Passed to OMP']}] : [{v:trained.D[i],name:['初始原子','Initial Atom']}])}
      ${atomUpdateLesson(update, i, state.sample)}
      <details><summary>${b(['各輪訓練誤差','Training Errors by Iteration'])}</summary>${table([['輪次','Iteration'],['總訓練平方差','Training Squared Error']],trainingRun.map((s,j)=>[j,f(s.loss,7)]))}
      ${p(['每次 SVD 更新只解一個原子的子問題；整輪還包含貪婪的 OMP 編碼，且新資料的光譜誤差要另外評估。','Each SVD update solves one atom’s subproblem. A full iteration also includes greedy OMP coding, and spectral error on new data must be evaluated separately.'])}
      <a href="#concept-30">${b(['對照訓練誤差與保留測試誤差 →','Compare Training and Held-Out Test Error →'])}</a></details>`;
  }
  function scene(v){const {trained,query,reconstruction,frame,complete}=v,j=state.band,a=state.atom;
    if(state.stage===0)return eq('input',queryMeasurement,['c_q：已知三個線性 RGB；R：固定 3×31 權重表；h_q：未知 31 波段；帽子表示估計，不是已量到的答案。','c_q: three known linear RGB values; R: fixed 3×31 response; h_q: unknown 31-band spectrum. A hat marks an estimate.'])+photoMeasurementFigure+settings()+operationHint()+table([['輸入','Input'],['已知數值','Known Values']],[['c_q',vec(query.c)],['R','3 × 31'],['Y (training)','31 × 24']])+p(['每個 RGB 通道是跨波段的一次加權總和，不是某個單一波長的讀值。任務不是讓三個通道變成 31 次獨立量測，而是用訓練資料學到的光譜形狀縮小可能答案。下一步使用的字典，真的會接到後面的 OMP。','Each RGB channel is a weighted sum across bands, not a reading at one wavelength. Three channels do not become 31 independent measurements. Learned spectral shapes constrain the possible answer. The dictionary learned next is actually passed to OMP.'])+p(['先驗是重建前已有的資料規律。論文使用既有高光譜資料；本頁用 24 條合成光譜學 4 條代表曲線，稱為原子，每條都有完整 31 個值。稀疏指只用少數原子、其他係數為 0，不是只保留幾個波段。','A prior is information available before recovery. The paper uses existing hyperspectral data; this page learns four representative curves, called atoms, from 24 synthetic spectra. Every atom has all 31 values. Sparsity means using few atoms with other codes zero, not retaining only a few bands.'])+p(['A、B、C 的真值不參與學字典，也不交給 RGB 求解器；最後才可揭露評分。訊號是本合成範例的相對值，不是材料百分比或 0–255 顯示碼。','A, B, and C do not train the dictionary, and their spectra are not passed to the RGB solver. Reveal them only for evaluation. Signals are relative example values, not material percentages or 0–255 display codes.']);
    if(state.stage===1)return trainingScene(trained, v.trainingRun, a);
    if(state.stage===2){const d=trained.D[a],rgb=reconstruction.A[a];return eq('projection','D_RGB = R Dₕ; c_i,k = Σ_{j=1}^{31} R_k,j d_i,j',['同一個原子 i 保留同一編號。j 是波段，k 是通道；每個通道把 31 項「訊號×權重」加總。此處沒有反推未知光譜。','Keep the same atom index i. j indexes bands and k channels. Each channel sums 31 signal × response products. This is forward projection.'])+settings()+operationHint()+`<div class="cr-fields">${atomControl()}${bandControl()}</div>`+plot([{v:d,name:['剛學到的完整原子','The Learned Complete Atom']}],j)+table([['通道 k','Channel k'],['此波段原子值','Atom Value at This Band'],['此波段權重','Band Response'],['本項貢獻','This Term'],['完整 31 項和','Full 31-Term Sum']],R.map((row,k)=>[['R','G','B'][k],f(d[j]),f(row[j]),f(d[j]*row[j],7),f(rgb[k],7)]))+p([`目前使用第 ${state.round} 輪字典，d${a+1} 有 31 個數；它的 RGB 配對是 ${vec(rgb)}。移動讀取線只換查看哪一項，完整 RGB 不變。`,`Using iteration ${state.round}, d${a+1} has 31 entries; its RGB partner is ${vec(rgb)}. Moving the reading line inspects one term without changing the full RGB.`]);}
    if(state.stage===3){const phase={initial:['初始：重建為零，殘差是輸入 RGB','Initial: Zero Reconstruction, Residual Equals RGB'],select:['選原子編號：此步還不改倍率','Select an Index: Multipliers Have Not Changed'],fit:['一起重算已選倍率：降低 RGB 平方差','Jointly Refit Selected Multipliers: Reduce RGB Error'],residual:['把新的差值用作下一輪殘差','Use the New Difference for the Next Selection']}[frame.phase];
      const scores=frame.scores||reconstruction.A.map(d=>Math.abs(dot(d,query.c))/norm(d));
      return eq('omp','i* = arg max_{i∉S} |a_iᵀr| / ‖a_i‖₂; w_S = arg min_{z} ‖c_q − A_S z‖₂²',['a_i 是這本學成字典投影後的 RGB 欄；r 是目前殘差；S 是已選編號；T 是轉置／內積。arg max 選編號；arg min 求所有已選倍率。c_q 與 A 固定，只有集合與係數改變。','a_i is a projected column of this learned dictionary; r is the current residual; S contains selected indices; T forms an inner product. arg max selects an index; arg min jointly fits selected multipliers. c_q and A stay fixed.'])+settings()+operationHint()+`<h4>${b(phase)}</h4><div class="cr-actions">${button('omp-next',['下一個子步驟','Next Substep'],complete)}${button('omp-solve',['直接求完這個 RGB','Finish This RGB Fit'],complete)}${button('omp-reset',['重播這個 RGB','Replay This RGB'])}<output>${v.tick+1} / ${reconstruction.frames.length}</output><output class="cr-live-error">L_RGB = ${f(frame.loss,9)}</output></div>`+table([['原子','Atom'],['與選擇前殘差的分數','Score against Selection Residual'],['本步係數 w_i','Code at This Step']],trained.D.map((_,i)=>[`d${i+1}${frame.pending===i?' ★':''}`,scores[i]===null?'—':f(scores[i],6),f(frame.w[i],6)]))+`<div class="cr-metrics">${metric(['固定輸入 RGB','Fixed Input RGB'],vec(query.c))}${metric(['目前 RGB 平方差 L_RGB','Current RGB Squared Error L_RGB'],f(frame.loss,9))}${metric(['目前重建 RGB','Current Reconstructed RGB'],vec(combine(reconstruction.A,frame.w)))}</div>`+eq('rgbError','r = c_q − A_S w_S; L_RGB = r_R² + r_G² + r_B²',[`r = ${vec(frame.r)}。這個 error 比較三個 RGB，不比較未知光譜。選編號本身不降低 error，擬合倍率才會；顯示新殘差不再額外降低一次。`,`r = ${vec(frame.r)}. This error compares three RGB values, not unknown spectra. Selecting an index alone does not lower error; fitting does. Displaying the residual does not lower it a second time.`])+p(frame.beforeW?[`本輪前係數 ${vec(frame.beforeW)} → 本輪 ${vec(frame.w)}。舊原子的倍率也一起重算，不是只新增一個倍率。`,`Previous codes ${vec(frame.beforeW)} → current ${vec(frame.w)}. Old multipliers are refitted too, not merely one new multiplier appended.`]:['每次都使用當前殘差選原子，選到後用原本固定輸入共同擬合。原子不會因這個新像素被修改。','Select against the current residual, then jointly fit against the original fixed input. This new pixel does not change the atoms.'])+`<details><summary>${b(['代入這輪的三個通道方程','Substitute This Round’s Three Channel Equations'])}</summary>${table([['通道','Channel'],['要用同一組係數滿足的近似條件','Conditions for the Same Coefficients']],['R','G','B'].map((k,n)=>[k,frame.selected.map(i=>`${f(reconstruction.A[i][n],6)}w${i+1}`).join(' + ')+` ≈ ${f(query.c[n],6)}`]))}${p(['S 固定後，將三個差的平方總和最小化，全部係數一起求解；解不被限制為百分比或和為 1。','Once S is fixed, minimize the sum of three squared differences and solve all its codes together. Codes are not percentages and need not sum to one.'])}</details>`+p(complete?['已停止：達到原子上限、殘差足夠小或沒有有效新方向。換參數會清除這份解。','Stopped: atom cap, small residual, or no eligible independent direction. Parameter edits invalidate this fit.']:['此刻尚未走完；要先求出係數，下一頁才會使用這份解。','The run is incomplete; fit the codes before transferring them on the next page.']);}
    const setup = (state.stage === 4
      ? eq('output','ĥ_q = Dₕ w_q; ĥ_q,j = Σ_i d_i,j w_q,i',['每個波段 j 都使用剛才同一組 w_q。d_i,j 是原子 i 的第 j 個值；帽子是估計，j 不是原子編號。','Every band j uses the exact same fitted w_q. d_i,j is entry j of atom i. The hat marks an estimate; j is not an atom index.'])
      : eq('check','Rĥ_q = R(Dₕ w_q) = D_RGBw_q ≈ c_q',['兩條路徑相等來自同一 R、同一字典配對、同一 w。接近輸入只證明 RGB 相容，不能證明光譜真實。','Both paths use the same R, paired dictionary, and w. Agreement with input establishes RGB consistency, not spectral truth.'])) + settings();
    if(!complete)return setup+operationHint(['先按下求解，取得本次 RGB 的倍率，再用上方公式查看結果。','Fit the multipliers for this RGB first. Then use the equation above to inspect the result.'])+`<div class="cr-await">${p(['尚未完成這個 RGB 的 OMP，不能先填一份預設 w 當答案。','OMP has not finished for this RGB; do not fill in preset answer codes.'])}${button('omp-solve',['先求完係數，再查看結果','Fit Codes before Showing the Result'])}</div>`;
    if(state.stage===4)return setup+operationHint()+`<div class="cr-fields">${bandControl()}<output class="cr-live-error">ĥ${j+1} = ${f(reconstruction.h[j],7)}</output></div>`+plot([{v:reconstruction.h,name:['由 RGB 估計的完整 31 波段','Complete 31-Band Estimate from RGB']}],j)+table([['原子 i','Atom i'],['此波段 d_i,j','d_i,j at This Band'],['同一係數 w_q,i','Same Code w_q,i'],['貢獻','Contribution']],trained.D.map((d,i)=>[i+1,f(d[j],6),f(reconstruction.w[i],6),f(d[j]*reconstruction.w[i],7)]))+eq('substitution',`ĥ_q,${j+1} = ${trained.D.map((d,i)=>`${f(d[j],5)} × ${f(reconstruction.w[i],5)}`).join(' + ')} ≈ ${f(reconstruction.h[j],7)}`,['把這一欄貢獻相加，得到這個波段；切另一波段，係數不變，原子對應值才換。31 個輸出不是 31 次獨立猜倍率。','Sum this column for the band. Inspecting another band changes atom entries but not the codes. The 31 outputs do not use 31 independently guessed code vectors.']);
    return setup+table([['比較對象','Comparison'],['三通道','RGB']],[['c_q',vec(query.c)],['D_RGBw_q',vec(reconstruction.paired)],['Rĥ_q',vec(reconstruction.back)]])+`<div class="cr-metrics">${metric(['RGB 殘差長度','RGB Residual Norm'],'≈ '+f(reconstruction.error,9))}${metric(['有獨立真值才能算的光譜 RMSE','Spectral RMSE Requires Independent Truth'],state.reveal?f(rmse(reconstruction.h,query.truth),7):b(['尚未揭露真值','Truth Not Revealed']))}</div>${operationHint()}<label class="cr-reveal"><input type="checkbox" data-cr-key="reveal" ${state.reveal?'checked':''}>${b(['揭露保留真值與 A/C 比較，只用於評分','Reveal Held-Out Truth and A/C Comparison for Evaluation Only'])}</label>`+(state.reveal?plot([{v:reconstruction.h,name:['估計光譜','Estimated Spectrum']},{v:query.truth,name:['目前保留真值（未參與訓練）','Current Held-Out Truth (Not Used for Training)']}])+eq('spectralError','RMSE = √[(1/31) Σ_{j=1}^{31} (ĥ_q,j − h_q,j)²]',['先把每個波段的「估計−真值」平方，相加後除以 31，再開根號。這個 error 用於評分，不會回頭改字典或係數。','Square estimate-minus-truth for each band, sum, divide by 31, then take the root. This error evaluates the result without updating the dictionary or codes.']):p(['一般未知照片沒有這份高光譜答案，不能宣稱已算出其真實光譜誤差。本例保留答案，才可以在重建後評分。','An arbitrary unknown photo has no spectral answer available, so its true spectral error cannot be claimed. This example retains truth for evaluation after recovery.']))+(state.reveal?metamerComparison(trained.D,state.budget):'')+p(['試比較 A 與 C：輸入 RGB 相同，因此固定字典下 OMP 的估計相同；揭露的真值卻不同。這正是先驗選擇有條件估計，而非唯一還原的界線。','Compare A and C: equal RGB gives the same OMP estimate with a fixed dictionary, while held-out truth differs. This exposes the boundary between prior-based estimation and unique recovery.']);
  }
  function stop(){if(timer)clearInterval(timer);timer=null;}
  function render(){if(!root)return;const v=snapshot();root.innerHTML=`<header><p class="cr-source">${b(['小型合成範例；非論文實測','Small Synthetic Example; Not Paper Measurements'])}</p><p class="eyebrow">RGB → Learned Dictionary → Sparse Codes → Spectrum</p><h3>${b(['同一份資料走完：從學字典到重建光譜','One Data Lineage: Learn, Project, Fit, and Recover'])}</h3>${p(['這六步共用同一本學成字典。改訓練輪數，後面的 RGB 原子、OMP 係數與估計光譜會真的一起改變。','All six steps share the learned dictionary. Editing training iterations actually changes the projected RGB atoms, fitted codes, and estimated spectrum.'])}</header><nav class="cr-stage-tabs" aria-label="Connected recovery stages">${titles.map((name,i)=>`<button type="button" data-cr-stage="${i}" aria-pressed="${i===state.stage}"><small>${i+1}</small>${b(name)}</button>`).join('')}</nav><div class="cr-current">${b([`目前：起點 ${state.init+1}／迭代 ${state.round}／像素 ${queries[state.query].id}／上限 ${state.budget}；訓練資料 Y 固定。`,`Current: start ${state.init+1} / iteration ${state.round} / query ${queries[state.query].id} / cap ${state.budget}; training Y stays fixed.`])}</div><article class="cr-scene" aria-live="polite"><h3>${state.stage+1}. ${b(titles[state.stage])}</h3>${stageIntroduction(state.stage)}${scene(v)}</article><div class="cr-actions cr-pagination">${button('prev',['← 上一步','← Previous'],state.stage===0)}${button('next',['下一步 →','Next →'],state.stage===5)}${button('reset',['重設完整流程','Reset the Pipeline'])}</div><details class="cr-provenance"><summary>${b(['算例設定、符號與來源','Example Setup, Symbols, and Sources'])}</summary>${p(['合成範例；非論文實測、非作者程式完整重現。24 條訓練光譜與三筆保留查詢分開；4 個原子各有 31 值，本例不是 31 維過完備字典。論文使用 500 原子。R 為人工平滑曲線，每列和為 1。顯示數值有四捨五入；運算保留完整精度。','Synthetic example; not measured paper results or a full reproduction of author code. 24 training spectra are separate from three held-out queries. Four 31-entry atoms are not an overcomplete dictionary in 31 dimensions; the paper uses 500. R is synthetic with rows summing to one. Display values are rounded; computation retains full precision.'])}${p(['K-SVD 使用 OMP 稀疏編碼及逐原子的受限秩一更新；主奇異方向以冪迭代計算。RGB OMP 用原子長度校正選擇分數，但最小平方擬合使用原始 RGB 欄，因此係數可直接搬回對應的光譜原子。權重可為負，也不必和為 1；負光譜可能違反物理限制。','K-SVD uses OMP coding and restricted rank-one atom updates; power iteration finds the leading singular direction. RGB OMP normalizes selection scores, then fits original RGB columns, so its codes transfer directly to paired spectral atoms. Codes may be signed and need not sum to one; negative spectra may violate physical limits.'])}${p(['Y：訓練矩陣；Dₕ：光譜字典；D_RGB 或 A：投影字典；W：整批訓練係數；w_q：單筆 RGB 係數；q：像素索引；i：原子索引；j：波段索引；s：原子使用上限；∑：逐項相加；min：讓 error 小；arg min：回傳最佳係數；arg max：回傳最高分編號。','Y: training matrix; Dₕ: spectral dictionary; D_RGB or A: projected dictionary; W: training codes; w_q: query codes; q: pixel; i: atom; j: band; s: atom cap; ∑: sum; min: reduce error; arg min: return minimizing codes; arg max: return the highest-scoring index.'])}<a href="#paper-method">${b(['對照原文 §4.1 式 (1)–(6)','Compare Paper §4.1 Eqs. (1)–(6)'])}</a></details>`;window.ReportRecoveryFocus?.annotateTerms(root,'.cr-scene p .i18n-en,.cr-scene p .i18n-zh','#paper-connected-recovery');window.ReportProjection?.notify();}
  function invalidate(){state.tick=0;state.reveal=false;}
  function initialize(){
    const page=document.querySelector('#paper-recovery .paper-body');if(!page)return;
    const old=page.querySelector('.rf-flow'),archive=document.createElement('details');archive.className='cr-previous';archive.innerHTML=`<summary>${b(['較早的固定字典算例（獨立補充）','Earlier Fixed-Dictionary Example (Separate Reference)'])}</summary>`;old.before(archive);archive.append(old);
    root=document.createElement('section');root.id='paper-connected-recovery';root.className='cr-pipeline';root.dataset.i18nSkip='';archive.before(root);
    root.addEventListener('click',event=>{const stage=event.target.closest('[data-cr-stage]');if(stage){stop();state.stage=Number(stage.dataset.crStage);render();return;}const action=event.target.closest('[data-cr-action]')?.dataset.crAction;if(!action)return;
      if(action!=='train-play')stop();if(action==='next')state.stage=Math.min(5,state.stage+1);if(action==='prev')state.stage=Math.max(0,state.stage-1);
      if(action==='train-next'){state.round=Math.min(6,state.round+1);invalidate();}
      if(action==='train-play'){if(timer)stop();else{state.round=0;invalidate();timer=setInterval(()=>{if(root.closest('.chapter')?.hidden||document.hidden){stop();render();return;}state.round=Math.min(6,state.round+1);invalidate();if(state.round===6)stop();render();},900);}}
      if(action==='omp-next')state.tick=Math.min(snapshot().reconstruction.frames.length-1,state.tick+1);
      if(action==='omp-solve')state.tick=snapshot().reconstruction.frames.length-1;
      if(action==='omp-reset')invalidate();if(action==='reset')Object.assign(state,{stage:0,round:3,init:0,query:0,budget:2,atom:0,band:15,sample:0,tick:0,reveal:false});render();
    });
    root.addEventListener('toggle',event=>{if(event.target===root.querySelector('.cr-settings')){state.settingsOpen=event.target.open;window.ReportProjection?.notify();}},true);
    root.addEventListener('change', event => {
      const key = event.target.dataset.crKey;
      if (!key) return;
      const restoreFocus = document.activeElement === event.target;
      state[key] = key === 'reveal' ? event.target.checked : Number(event.target.value);
      if (['round','init','query','budget'].includes(key)) {
        stop();
        invalidate();
      }
      render();
      if (restoreFocus) root.querySelector(`[data-cr-key="${key}"]`)?.focus({preventScroll:true});
    });
    window.addEventListener('hashchange',()=>{stop();const linkedStage=stageFromHash(location.hash);if(linkedStage!==null){state.stage=linkedStage;}render(); });
    document.addEventListener('reportlanguagechange',render);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
    window.ReportProjection?.register('connected-recovery',{get:()=>clone(state),set:value=>{stop();for(const [k,hi] of [['stage',5],['round',6],['init',2],['query',2],['atom',3],['band',30],['sample',23],['tick',20]])state[k]=integer(value[k],0,hi);state.budget=integer(value.budget,1,3);state.reveal=!!value.reveal;state.settingsOpen=!!value.settingsOpen;render();}});
    for(let i=0;i<6;i++){const anchor=document.createElement('span');anchor.id=`connected-stage-${i}`;anchor.className='cr-route-anchor';root.before(anchor);}
    for(const kind of ['ksvd','omp']){const banner=document.createElement('aside');banner.className='cr-crosslink';banner.dataset.i18nSkip='';banner.innerHTML=`${p(kind==='ksvd'?['主線現在會真正訓練並沿用同一本 31 波段字典；下方小型三維算例是進一步拆解，不會替換主線資料。','The core now trains and reuses one 31-band dictionary. The small 3D example below is a separate mathematical breakdown.']:['主線 OMP 使用目前學成的字典與查詢；下方 4→3→1 只屬於這裡另一個固定三維算例。','Core OMP uses the current learned dictionary and query. The 4→3→1 order below belongs to this separate fixed 3D example.'])}<a href="#connected-stage-${kind==='ksvd'?1:3}">${b(['操作主線的同一份資料 →','Operate the Same Core Data →'])}</a>`;document.querySelector(`#paper-${kind} .paper-heading`).after(banner);}
    render();
  }
  function configure(value){stop();for(const [k,hi] of [['stage',5],['round',6],['init',2],['query',2]])if(value[k]!==undefined)state[k]=integer(value[k],0,hi);invalidate();render();}
  window.ReportConnectedRecovery={waves,R,training,queries,prototype,solve,fit,omp,combine,project,loss,rmse,initialDictionary,updateAtom,train,recover,pcaBasis,pcaFit,localGroups,equation,stageFromHash,initialState,configure,initialize};
  initialize();
})();
