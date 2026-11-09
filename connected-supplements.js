/* Concrete spectral examples for the previously abstract supporting topics. */
(() => {
  'use strict';
  const M=window.ReportConnectedRecovery,controllers=new Map();
  const e=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const b=a=>`<span class="i18n-unit i18n-block" data-i18n-skip><span class="i18n-en" lang="en">${e(a[1])}</span><span class="i18n-separator" aria-hidden="true"> / </span><span class="i18n-zh" lang="zh-Hant">${e(a[0])}</span></span>`;
  const p=a=>`<p>${b(a)}</p>`,f=(x,n=6)=>(Math.abs(x)<.5*10**-n?0:x).toFixed(n);
  const table=(heads,rows)=>`<div class="cr-table"><table><thead><tr>${heads.map(a=>`<th>${Array.isArray(a)?b(a):a}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(v=>`<td>${Array.isArray(v)?b(v):v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const equationSymbols = {
    mixture: [
      ['h(t)','比例為 t 時算出的完整 31 波段光譜。','The complete 31-band spectrum produced at mixture setting t.'],
      ['t、1−t','t 是原子 d₂ 的倍率，1−t 是原子 d₁ 的倍率。t 介於 0 和 1 之間。','t weights atom d₂, while 1−t weights atom d₁. t ranges from zero to one.'],
      ['d₁、d₂','兩條固定的 31 波段光譜原子。','Two fixed spectral atoms with 31 bands each.'],
      ['+','將兩條乘過倍率的曲線逐波段相加。','Add the two scaled curves band by band.']
    ],
    mixtureBand: [
      ['h_j、j','組合光譜在波段 j 的值。j 是目前讀取的位置。','The mixture value at band j, the currently inspected band.'],
      ['t、1−t','兩個乘積分別用 1−t 與 t 乘上各原子在這一波段的值。','The products scale the two atom values at this band by 1−t and t, respectively.']
    ],
    pca: [
      ['ĥ、^','目前光譜的 31 波段近似值。帽號表示近似值。','The 31-band approximation of the current spectrum. The hat marks an approximation.'],
      ['μ','24 條訓練光譜逐波段取平均得到的曲線。','The curve obtained by averaging the 24 training spectra band by band.'],
      ['i、k','i 是方向的編號。k 是要保留的方向數。','i indexes directions. k is the number of directions retained.'],
      ['bᵢ','所有樣本共用的第 i 個主成分方向，也是一條有 31 個值的曲線。','Shared principal direction i, represented by a curve with 31 values.'],
      ['aᵢ','目前光譜在方向 bᵢ 上的倍率。','The current spectrum’s weight along direction bᵢ.'],
      ['Σ_{i=1…k}','把保留的各個方向乘自己的倍率後相加，再加回平均曲線。','Sum the retained directions weighted by their coefficients, then add the mean curve.']
    ],
    pcaBand: [
      ['ĥ_j、j','PCA 近似光譜在波段 j 的值。j 對應所選波長。','The PCA approximation at band j, which corresponds to the selected wavelength.'],
      ['+、×、≈','第一項是平均曲線在該波段的值。每個乘積是倍率乘方向在該波段的值。各項加總後，畫面以四捨五入的數值表示。','Start with the mean at this band. Each product multiplies a weight by a direction’s value at this band. The displayed sum is rounded.']
    ],
    local: [
      ['n、h_n','n 是像素編號。hₙ 是第 n 個像素的完整光譜。','n indexes pixels. hₙ is the complete spectrum of pixel n.'],
      ['i(n)、j(n)','像素 n 用到的兩個原子編號。換像素時，這兩個編號也可以換。','The two atom indices for pixel n. They can change when the pixel changes.'],
      ['d_{i(n)}、d_{j(n)}','由這兩個編號選出的完整 31 波段原子。','The complete 31-band atoms identified by those two indices.'],
      ['αₙ、βₙ','像素 n 給兩個原子的倍率。','The weights of the two atoms for pixel n.'],
      ['+','把乘完倍率的兩條曲線逐波段相加。','Add the two weighted curves band by band.']
    ],
    initialization: [
      ['D⁽⁰⁾','還沒有更新時的起始字典。','The initial dictionary before any updates.'],
      ['t、D⁽ᵗ⁾','t 是完成的迭代輪數。D⁽ᵗ⁾ 是第 t 輪完成後的字典。','t counts completed iterations. D⁽ᵗ⁾ is the dictionary after iteration t.'],
      ['→ K-SVD →','使用同一批訓練光譜，透過 K-SVD 從起點逐輪更新字典。','Update the starting dictionary with K-SVD over successive iterations using the same training spectra.']
    ]
  };
  const eq=(key,formula,meaning)=>M.equation(formula,meaning,equationSymbols[key]);
  const metric=(name,value)=>`<div class="cr-metric">${b(name)}<strong>${value}</strong></div>`;
  function plot(series){const all=series.flatMap(s=>s.v),lo=Math.min(0,...all),hi=Math.max(.35,...all),x=j=>42+j*650/30,y=v=>170-140*(v-lo)/(hi-lo);return `<figure class="cr-plot"><p class="cr-axis">${b(['相對光譜值（任意單位）；橫軸：波長 nm','Relative Spectral Values (Arbitrary Units); Horizontal Axis: Wavelength in nm'])}</p><svg viewBox="0 0 730 210" role="img" aria-label="Complete 31-band spectra; wavelength in nm versus relative signal"><path d="M42 25V170H692" fill="none" stroke="#859ea8"/>${series.map((s,i)=>`<polyline points="${s.v.map((v,j)=>`${x(j)},${y(v)}`).join(' ')}" stroke="${['#087f8c','#bf7a29','#7551a2'][i]}" fill="none" stroke-width="3" ${i?'stroke-dasharray="6 4"':''}/>`).join('')}<text x="42" y="200">400 nm</text><text x="635" y="200">700 nm</text><text x="3" y="30">${f(hi,2)}</text><text x="3" y="173">${f(lo,2)}</text></svg><figcaption>${series.map((s,i)=>`<span style="--curve:${['#087f8c','#bf7a29','#7551a2'][i]}">${b(s.name)}</span>`).join('')}</figcaption></figure>`;}
  const selector=(key,name,options,value)=>`<label>${b(name)}<select data-cs-key="${key}">${options.map((a,i)=>`<option value="${i}" ${i===value?'selected':''}>${document.documentElement.dataset.language==='zh'?a[0]:a[1]}</option>`).join('')}</select></label>`;
  const spectrumOptions = M.training.map((_, i) => [`光譜 ${i+1}`, `Spectrum ${i+1}`]);
  const bandOptions = M.waves.map(w => [`${w} nm`, `${w} nm`]);

  function pcaLesson({sample, k, band}) {
    const h = M.training[sample], pc = M.pcaBasis(), fit = M.pcaFit(h, k);
    const retained = pc.values.slice(0,k).reduce((total, value) => total + value, 0);
    const percent = f(Math.min(1,fit.ratio)*100,2);
    const terms = fit.coefficients.map((a,i) => `(${f(a,5)} × ${f(pc.basis[i][band],5)})`);
    const bandSum = [f(pc.mean[band],5), ...terms].join(' + ');
    return `<h3>${b(['PCA 保留整批資料的哪些變化？','What Variation Does PCA Retain?'])}</h3>
      ${eq('pca','ĥ = μ + Σ<sub>i=1…k</sub> aᵢbᵢ', [
        'μ 是 24 筆光譜的平均曲線。bᵢ 是所有樣本共用的變化方向，每個方向也有 31 個值。aᵢ 是這一筆光譜在該方向的倍率，k 是保留的方向數。',
        'μ is the mean curve of 24 spectra. Each shared direction bᵢ has 31 values. aᵢ is this sample’s multiplier along that direction, and k is the number of retained directions.'
      ])}
      <div class="cr-fields">
        <label>${b(['保留主成分數 k','Retained Components k'])}<input type="range" min="1" max="4" value="${k}" data-cs-key="k"><output>${k}</output></label>
        ${selector('sample',['查看訓練光譜','Inspect Training Spectrum'],spectrumOptions,sample)}
        ${selector('band',['查看代入哪一個波段','Inspect a Band in the Equation'],bandOptions,band)}
      </div>
      ${eq('pcaBand',`ĥ<sub>${band+1}</sub> = ${bandSum} ≈ ${f(fit.estimate[band],6)}`, [
        `${M.waves[band]} nm 的原值是 ${f(h[band],6)}。從平均的這一格開始，再加上各方向在這一格的值乘各自倍率。換波段時，這筆的倍率沿用。`,
        `The original value at ${M.waves[band]} nm is ${f(h[band],6)}. Start with the mean at this band and add each direction’s value times its multiplier. Moving to another band reuses the same multipliers.`
      ])}
      <div class="cr-metrics">
        ${metric(['看整批：累積變異比例','All 24 Spectra: Cumulative Variance'],`100 × ${f(retained,6)} ÷ ${f(pc.total,6)} ≈ ${percent}%`)}
        ${metric(['看這一筆：31 波段重建 RMSE','This Spectrum: 31-Band Reconstruction RMSE'],f(fit.error,7))}
      </div>
      ${p(['固定 k，再換光譜。左邊分子是前 k 個方向的變異量加總，分母是整批資料的總變異量，因此比例維持不變。右邊只比較目前這筆的原光譜與近似值，逐波段的差先平方、取平均，再開根號。',
        'Keep k fixed and switch spectra. On the left, divide the variance captured by the first k directions by the total variance of all 24 spectra, so the percentage stays the same. On the right, square the 31 differences for the selected spectrum, take their mean, and then its square root.'])}
      ${plot([{v:h,name:['原完整光譜','Original Complete Spectrum']},{v:fit.estimate,name:['平均＋k 個方向的近似','Mean + k Directions']}])}
      ${table([['方向','Direction'],['整批資料的方向變異量','Variance along This Direction'],['此筆係數','This Sample’s Code']],pc.values.map((value,i)=>[`b${i+1}`,f(value,7),i<k?f(fit.coefficients[i],6):'—']))}
      ${p(['計算倍率時，先用已知的完整光譜減掉 μ，再投影到各方向。這裡用同一批 24 條合成訓練光譜說明 PCA 表示。','To find the multipliers, subtract μ from the known full spectrum and project onto each direction. This representation example uses the same 24 synthetic training spectra.'])}`;
  }

  function localLesson(sample) {
    const v = M.localGroups(sample);
    const subset = v.group.map(i => `d${i+1}`).join(', ');
    const localFormula = v.group.map((atom,i) => `(${f(v.weights[i],4)})d${atom+1}`).join(' + ');
    const globalFormula = `μ + (${f(v.globalCodes[0],4)})b₁ + (${f(v.globalCodes[1],4)})b₂`;
    return `<h3>${b(['每筆各挑兩個原子，與每筆共用同兩個方向','Two Atoms Chosen per Pixel vs. Two Shared Directions'])}</h3>
      ${eq('local','hₙ = d<sub>i(n)</sub>αₙ + d<sub>j(n)</sub>βₙ', [
        'n 是像素編號，i(n)、j(n) 是這筆使用的兩個原子編號。αₙ、βₙ 是各自的倍率。原子和 PCA 方向都是 31 個值的曲線。',
        'n indexes the pixel. i(n) and j(n) select its two atoms. αₙ and βₙ scale them. Atoms and PCA directions each have 31 entries.'
      ])}
      ${selector('sample',['切換像素與原子小組','Switch Pixel and Atom Subset'],[['像素 1：d₁、d₂','Pixel 1: d₁, d₂'],['像素 2：d₁、d₂','Pixel 2: d₁, d₂'],['像素 3：d₃、d₄','Pixel 3: d₃, d₄'],['像素 4：d₃、d₄','Pixel 4: d₃, d₄']],sample)}
      ${table([['表示方式','Representation'],['目前用到的曲線','Curves Used Here'],['代入本筆倍率','Substitute This Pixel’s Codes'],['光譜 RMSE','Spectral RMSE']],[
        [['局部兩原子','Local Two Atoms'],subset,localFormula,f(v.localError,7)],
        [['全域 PCA','Global PCA'],'μ, b₁, b₂',globalFormula,f(v.globalError,7)]
      ])}
      ${p(['先從像素 1 換到 2，兩種方法都只換倍率。再換到像素 3，局部原子從 d₁、d₂ 換成 d₃、d₄，PCA 仍沿用同一個平均 μ 和方向 b₁、b₂。四筆合計使用四個局部原子，每筆各用兩個。',
        'Switch from pixel 1 to 2 and both methods change only their multipliers. At pixel 3, the local subset switches from d₁ and d₂ to d₃ and d₄. PCA still uses the same mean μ and directions b₁ and b₂. All four pixels together use four local atoms, two per pixel.'])}
      ${plot([{v:v.truth,name:['目標光譜','Target Spectrum']},{v:v.global,name:['固定兩個 PCA 方向＋平均','Two Fixed PCA Directions + Mean']},{v:v.local,name:['局部兩原子（與目標重合）','Local Pair (Overlaps Target)']}])}
      ${p(['這四條目標光譜由指定的原子小組合成，所以該組原子可精確表示。PCA 的方向則從同一批 24 條訓練光譜學得。比較的是這四條完整光譜在兩種表示下的誤差。',
        'The four targets are built from the indicated atom subsets, so each subset can represent its targets exactly. The PCA directions are learned from the same 24 training spectra. The comparison measures representation error on these four complete spectra.'])}`;
  }

  function initializationLesson({round, init}) {
    const names = [['RGB 分散起點','RGB-Spread Start'],['固定隨機起點 B','Seeded Start B'],['固定隨機起點 C','Seeded Start C']];
    const query = M.queries[0];
    const runs = names.map((name,i) => {
      const run = M.train(i);
      const frame = run[round];
      const estimate = M.recover(frame.D,query.c,3).h;
      return {name,initial:run[0],frame,train:f(frame.loss,7),test:f(M.rmse(estimate,query.truth),7)};
    });
    const bestTrain = Math.min(...runs.map(run => Number(run.train)));
    const bestTest = Math.min(...runs.map(run => Number(run.test)));
    const markLowest = (value, best) => Number(value) === best
      ? `<strong class="cr-lowest">${value} · ${b(['本欄最低','Column Minimum'])}</strong>`
      : value;
    const exampleB = runs[1], exampleC = runs[2];
    const reading = round === 3 ? [
      `讀第 3 輪的 B、C：C 的訓練平方差 ${exampleC.train} 小於 B 的 ${exampleB.train}，但在保留像素 A 上，C 的光譜 RMSE ${exampleC.test} 大於 B 的 ${exampleB.test}。同一輪下，兩欄可能選出不同字典。`,
      `At iteration 3, C’s training squared error of ${exampleC.train} is below B’s ${exampleB.train}, while C’s spectral RMSE of ${exampleC.test} on held-out pixel A is above B’s ${exampleB.test}. The columns can favor different dictionaries at the same iteration.`
    ] : [
      '每欄只在該欄內比較三個起點。把輪次設為 3，可以看到訓練誤差最低和保留 A 誤差最低分別落在不同起點。',
      'Compare the starts within each column. Set the iteration to 3 to see different starts minimize training error and held-out A error.'
    ];
    return `<h3>${b(['同一批資料，三種字典起點','Three Dictionary Starts on the Same Data'])}</h3>
      ${eq('initialization','D⁽⁰⁾ → K-SVD → D⁽ᵗ⁾', [
        'D⁽⁰⁾ 是起始字典，D⁽ᵗ⁾ 是做完 t 輪後的字典。三個起點使用同樣的 24 條光譜、4 個原子、訓練上限 2 和 RGB 模型 R。',
        'D⁽⁰⁾ is the initial dictionary. D⁽ᵗ⁾ is the dictionary after t iterations. All starts use the same 24 spectra, four atoms, training cap of two, and RGB model R.'
      ])}
      <div class="cr-fields">
        <label>${b(['三個起點一律跑 t 輪','Run t Iterations for Each Start'])}<input type="range" min="0" max="6" value="${round}" data-cs-key="round"><output>${round}</output></label>
        ${selector('init',['查看哪個起點的原子 1？','Inspect Atom 1 from Which Start?'],names,init)}
      </div>
      ${table([['起點','Start'],['訓練：24 條的平方差總和','Training: Squared Error across 24 Spectra'],['測試示例：保留 A 的 31 波段 RMSE','Test Example: 31-Band RMSE on Held-Out A']],runs.map(run=>[
        run.name,markLowest(run.train,bestTrain),markLowest(run.test,bestTest)
      ]))}
      <div class="cr-insight">${p(reading)}
      ${p(['左欄把訓練資料和它們的字典重建相比。右欄只把 A 的 RGB 交給 OMP（最多 3 原子），得到估計之後，才用 A 的完整真值計分。兩欄的樣本和誤差公式不同，應各自在欄內比較。',
        'Training compares known spectra with their dictionary reconstructions. For the test example, OMP sees only A’s RGB (up to three atoms). A’s full spectrum is used to score the estimate afterward. The columns use different data and error formulas, so compare results within a column.'])}</div>
      <h4>${b(['正式實驗如何把資料分開？','How Should a Formal Experiment Split the Data?'])}</h4>
      <ol class="cr-steps">
        <li>${b(['訓練集：用完整光譜學字典。','Training set: learn the dictionary from complete spectra.'])}</li>
        <li>${b(['驗證集：用另外的樣本選起點、迭代輪數等設定。','Validation set: use separate samples to choose settings such as initialization and iteration count.'])}</li>
        <li>${b(['測試集：鎖定設定後才用新樣本估計並評分。如果用測試答案反覆選設定，這些樣本就變成了驗證資料。','Test set: lock the settings, then estimate and score on new samples. If test answers are used repeatedly to choose settings, those samples become validation data.'])}</li>
      </ol>
      ${p(['本例用單一保留像素 A 展示兩種誤差的差別。正式比較還要用分開的驗證集和更完整的測試集。','This example uses one held-out pixel to illustrate the difference between the two errors. A formal comparison needs a separate validation set and a fuller test set.'])}
      ${plot([{v:runs[init].initial.D[0],name:['該起點的原子 1','Atom 1 at Initialization']},{v:runs[init].frame.D[0],name:['t 輪後的原子 1','Atom 1 after t Iterations']}])}
      <button type="button" data-cs-apply>${b(['套用這個起點與輪數到主線 →','Use This Start and Iteration in the Core →'])}</button>
      ${p(['起點 B 的第 3 輪訓練誤差高於第 2 輪。整輪包含近似的貪婪 OMP 編碼；SVD 的最小化只涵蓋一次更新中的固定樣本名單。','Start B’s training error is higher at iteration 3 than at iteration 2. A full iteration includes greedy approximate OMP coding. Each SVD minimization applies only to one update with a fixed sample list.'])}`;
  }
  function render(n,s){
    const D=M.train(0)[3].D;
    if(n===17){const t=s.amount/100,h=M.combine(D.slice(0,2),[1-t,t]),j=s.band;return `<h3>${b(['31 個值，可以由同一個參數一起決定','31 Values Can Change with One Shared Parameter'])}</h3>`+eq('mixture','h(t) = (1−t)d₁ + td₂',['本頁只容許兩條固定完整光譜之間的組合。t 決定比例，31 個波段仍全部存在；這個小範圍只需要一個自由參數，不代表所有自然光譜都是一維。','This example allows only combinations between two fixed complete spectra. t controls their mixture while all 31 entries remain. One parameter describes this restricted family, not all natural spectra.'])+`<div class="cr-fields"><label>${b(['同一個參數 t','Shared Parameter t'])}<input type="range" min="0" max="100" value="${s.amount}" data-cs-key="amount"><output>t = ${f(t,2)}</output></label>${selector('band',['查看波段','Inspect Band'],M.waves.map(w=>[`${w} nm`,`${w} nm`]),s.band)}</div>`+plot([{v:h,name:['目前完整光譜 h(t)','Current Complete Spectrum h(t)']},{v:D[0],name:['固定 d₁','Fixed d₁']},{v:D[1],name:['固定 d₂','Fixed d₂']}])+eq('mixtureBand',`h<sub>${j+1}</sub> = (1−${f(t,2)})×${f(D[0][j],5)} + ${f(t,2)}×${f(D[1][j],5)} = ${f(h[j],5)}`,[`同一個 t 也控制其他 30 個波段；${M.waves[j]} nm 只是現在查看的位置。`,`The same t controls the other 30 bands; ${M.waves[j]} nm is only the inspected position.`])+`<div class="cr-metrics">${metric(['保留數值數','Stored Values'],'31')}${metric(['此受限組合的自由參數','Free Parameters in This Restricted Family'],'1')}</div>`+p(['這兩條曲線取自主線起點 1、第 3 輪字典快照。這裡不再畫抽象三維道路，也不會修改字典。','These curves are a snapshot of core start 1, iteration 3. No abstract spatial road is used, and the dictionary is not changed.']);}
    if(n===18)return pcaLesson(s);
    if(n===48)return localLesson(s.sample);
    if(n===30)return initializationLesson(s);
  }
  const conditions=()=>`<h3>${b(['先驗與 RGB 各自排除什麼？','What Do the Prior and RGB Each Rule Out?'])}</h3>`+table([['條件','Condition'],['用途','Role'],['仍未證明','Not Established']],[[b(['已有自然光譜先驗','A Natural-Spectral Prior']),b(['限制常見光譜形狀','Constrain plausible spectral shapes']),b(['新物體一定在先驗範圍內','That every new object is covered'])],[b(['用少數原子表示','Use Few Atoms']),b(['限制非零係數數量','Constrain nonzero code count']),b(['所有稀疏組合都唯一','That every sparse representation is unique'])],[b(['符合 RGB：Rĥ≈c','Match RGB: Rĥ≈c']),b(['排除量測不相容組合','Reject measurement-inconsistent combinations']),b(['估計等於真實光譜','That estimate equals spectral truth'])]])+p(['此處用條件表整理推論，不再用沒有資料依據的候選點數。主線像素 A 與 C 提供一個實際計算的反例：RGB 相同，真值仍不同。','This table organizes the reasoning without unsupported candidate counts. Core queries A and C give a computed counterexample: equal RGB with different true spectra.'])+`<a href="#connected-stage-5">${b(['用同一 RGB 的兩條真值比較 →','Compare Two Truths with the Same RGB →'])}</a>`;
  const comparisons=()=>`<h3>${b(['先看方法實際取得哪些資料','Compare the Information Available to Each Method'])}</h3>`+table([['方法／條件','Method / Setting'],['新場景輸入','Input for the New Scene'],['高光譜資訊來源','Source of Spectral Information']],[[b(['主要 ICVL 保留影像實驗','Main Held-Out ICVL Experiment']),'RGB',b(['其他影像的高光譜訓練先驗','Training HS from other images'])],[b(['Yasuma 比較設定','Yasuma Comparison Setting']),'RGB',b(['同影像部分高光譜：10,000 像素，約 3.8%','Partial HS from the same image: 10,000 pixels, about 3.8%'])],[b(['Kawakami 比較法','Kawakami Comparator']),b(['RGB＋低解析高光譜','RGB + low-resolution HS']),b(['新場景另有高光譜量測','Additional HS measurements of the new scene'])],[b(['可控照明類方法','Controlled-Illumination Methods']),b(['特定光源下多次拍攝','Multiple controlled-light captures']),b(['額外光源與拍攝條件','Additional lighting and acquisition conditions'])]])+p(['來源仍依原文 §5.2 與對應參考文獻；論文結果表沒有改寫。這張靜態表比較資訊條件，不用按鈕假裝重新訓練或產生新準確率。','Source: paper §5.2 and its cited comparisons; reported result tables are unchanged. This static table compares information conditions without implying retraining or new accuracy measurements.']);
  function staticHost(id,body){const host=document.getElementById(id);if(!host||host.dataset.csStatic)return;host.dataset.csStatic='';host.dataset.i18nSkip='';host.innerHTML=`<div class="cr-supplement">${body()}</div>`;}
  function mount(n){const id=`concept-${String(n).padStart(2,'0')}`,page=document.getElementById(id);if(!page||controllers.has(n))return;const host=page.querySelector('.concept-lab-mount');if(!host)return;
    const state={amount:40,band:15,k:1,sample:n===48?2:0,round:3,init:0},root=document.createElement('div');root.className='cr-supplement';root.dataset.i18nSkip='';root.id=id+'-spectral-play';host.replaceChildren(root);
    const draw=()=>{root.innerHTML=render(n,state);};controllers.set(n,{state,draw});
    root.addEventListener('change', event => {
      const key = event.target.dataset.csKey;
      if (!key) return;
      const restoreFocus = document.activeElement === event.target;
      state[key] = Math.max(0,Number(event.target.value)||0);
      draw();
      if (restoreFocus) root.querySelector(`[data-cs-key="${key}"]`)?.focus({preventScroll:true});
      window.ReportProjection?.notify();
    });
    root.addEventListener('click',event=>{if(event.target.closest('[data-cs-apply]')){M.configure({init:state.init,round:state.round,stage:1});location.hash='connected-stage-1';}});
    const contract=page.querySelector('.eq-contract');if(contract){contract.innerHTML=`<summary>${b(['本頁公式與目的','Equation and Purpose'])}</summary>${p(n===17?['用同一個 t 代入 31 個波段的線性組合，分清「數值數量」與「自由參數數量」。','Substitute one t into all 31 bands; distinguish value count from free-parameter count.']:n===18?['用平均加 PCA 方向近似完整光譜；變異比例與重建 error 都由此頁同一份資料計算。','Approximate a complete spectrum using mean plus PCA directions; variance and reconstruction error use the same dataset.']:n===30?['相同 Y 與限制，換起始 D，再比較訓練與保留誤差。','Keep Y and constraints fixed, change initial D, and compare training and held-out errors.']:['每筆可換原子小組；對照所有資料共用的兩個 PCA 方向。','Change atom subsets by sample; compare with two PCA directions shared across samples.'])}`;}
    window.ReportProjection?.register('spectral-support:'+n,{get:()=>({...state}),set:value=>{for(const k of Object.keys(state))if(Number.isFinite(Number(value[k])))state[k]=Number(value[k]);state.amount=Math.min(100,Math.max(0,state.amount));state.band=Math.min(30,Math.max(0,Math.round(state.band)));state.k=Math.min(4,Math.max(1,Math.round(state.k)));state.sample=Math.min(n===48?3:23,Math.max(0,Math.round(state.sample)));state.round=Math.min(6,Math.max(0,Math.round(state.round)));state.init=Math.min(2,Math.max(0,Math.round(state.init)));draw();}});draw();
  }
  const shared=[['concept-09-lab','concept-08-lab-workspace',['尺寸講解留在這頁；逐項相乘加總共用第 08 點，避免再放一份相同計算。','Keep the dimension walkthrough here; use Topic 08 for the shared multiply-and-sum calculation.']],['concept-36-lab','concept-24-lab-workspace',['重投影檢查留在這頁；手改同一 w 的線性組合共用第 24 點。','Keep the reprojection check here; edit shared linear-combination codes in Topic 24.']],['paper-ksvd-walkthrough','concept-29-lab-workspace',['下方保留逐步迭代；要手動改 SVD 參數，連到同一個第 29 點算例。','Keep the iteration walkthrough below; use the single Topic 29 workspace to edit SVD parameters.']],['paper-omp-walkthrough','concept-34-lab-workspace',['下方保留 OMP 每輪步驟；要試倍率與最小平方解，連到同一個第 34 點算例。','Keep the round walkthrough below; use the single Topic 34 workspace to try multipliers and least-squares fitting.']]];
  function initialize(){
    for(const [id,target,label] of shared){const host=document.getElementById(id);if(!host)continue;const note=document.createElement('aside');note.className='cr-canonical';note.dataset.i18nSkip='';note.innerHTML=p(label)+`<a href="#${target}">${b(['前往共用公式操作 →','Open the Shared Equation Workspace →'])}</a>`;host.before(note);for(const old of [id+'-workspace',id+'-formula'])if(!document.getElementById(old)){const alias=document.createElement('span');alias.id=old;host.before(alias);}}
    staticHost('paper-conclusion-playground',conditions);staticHost('paper-comparison-playground',comparisons);
    const refresh=()=>{let token;try{token=decodeURIComponent(location.hash.slice(1));}catch(_){return;}const page=document.getElementById(token)?.closest('.concept-page'),id=page?.id||token;const n=Number(id.replace('concept-',''));if([17,18,30,48].includes(n))mount(n);if([19,43].includes(n)){const h=document.querySelector(`#concept-${n} .concept-lab-mount`);if(h){h.dataset.i18nSkip='';h.innerHTML=`<div class="cr-supplement">${n===19?conditions():comparisons()}</div>`;}const contract=document.querySelector(`#concept-${n} .eq-contract`);if(contract)contract.hidden=true;}};
    window.addEventListener('hashchange',refresh);document.addEventListener('DOMContentLoaded',refresh);refresh();
    document.addEventListener('reportlanguagechange',()=>{controllers.forEach(c=>c.draw());for(const id of ['paper-conclusion-playground','paper-comparison-playground']){const h=document.getElementById(id);h.dataset.csStatic='';h.innerHTML=`<div class="cr-supplement">${id.includes('conclusion')?conditions():comparisons()}</div>`;}refresh();});
  }
  window.ReportConnectedSupplements={shared,initialize};initialize();
})();
