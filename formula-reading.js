/* Read an optimization as data -> variables -> criterion -> solution.
   Standard algorithm background; the paper's equation numbers are unchanged. */
(() => {
  'use strict';
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const b=p=>`<span class="i18n-unit i18n-block" data-i18n-skip><span class="i18n-en" lang="en">${esc(p[1])}</span><span class="i18n-separator" aria-hidden="true"> / </span><span class="i18n-zh" lang="zh-Hant">${esc(p[0])}</span></span>`;
  const p=x=>`<p>${b(x)}</p>`;
  const math=(x,alt)=>`<div class="fr-math"><math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="${esc(alt)}"><mrow>${x}</mrow></math></div>`;
  const mi=x=>`<mi>${x}</mi>`,mn=x=>`<mn>${x}</mn>`,mo=x=>`<mo>${x}</mo>`,sub=(a,i)=>`<msub>${mi(a)}<mrow>${mi(i)}</mrow></msub>`,sq=x=>`<msup><mrow>${x}</mrow>${mn(2)}</msup>`,tr=x=>`<msup><mrow>${x}</mrow>${mi('T')}</msup>`;
  const norm=(x,k='2')=>`<mrow>${mo('‖')}${x}<msub>${mo('‖')}${mi(k)}</msub></mrow>`;
  const sum=(i,top)=>`<munderover>${mo('∑')}<mrow>${i}</mrow><mrow>${top}</mrow></munderover>`;
  const opt=(name,vars)=>`<munder><mo>${name}</mo><mrow>${vars}</mrow></munder>`;
  const D=sub('D','h'),w=sub('w','n'),AS=sub('A','S'),ws=sub('w','S'),cq=sub('c','q'),E=sub('E','j'),xj=sub('x','j');
  const sparse=`${norm(w,'0')}${mo('≤')}${mi('s')}`;
  const loss=sq(norm(`${mi('Y')}${mo('−')}${D}${mi('W')}`,'F'));
  const reconstructedEntry=`<msub><mrow>${mo('(')}${D}${mi('W')}${mo(')')}</mrow><mrow>${mi('j')}${mo(',')}${mi('n')}</mrow></msub>`;
  const roles=(rows)=>`<dl class="fr-roles">${rows.map(([label,value])=>`<div><dt>${b(label)}</dt><dd>${b(value)}</dd></div>`).join('')}</dl>`;
  const card=(id,title,formula,alt,rows,reading,extra='')=>`<article id="${id}" class="fr-card" data-i18n-skip><h4>${b(title)}</h4>${math(formula,alt)}${roles(rows)}${p(reading)}${extra}</article>`;
  const input=['已知／固定','Known / Fixed'],variable=['待求／可調整','Unknown / Adjustable'],criterion=['判斷標準','Criterion'],output=['求解後得到','Result'];
  const kCards=[
    ['fr-ksvd-loss',['1. 先定義要降低的訓練誤差','1. Define the Training Error to Reduce'],
      `${opt('min',`${D}${mo(',')}${mi('W')}`)}${loss}<mspace width="1em"/><mtext>s.t.</mtext><mspace width=".4em"/>${sparse}<mo>,</mo><mspace width=".4em"/>${norm(sub('d','i'))}${mo('=')}${mn(1)}`,
      'Minimize squared training reconstruction error over D h and W with at most s nonzeros per sample and unit atom norms',
      [[input,['Y：量到的訓練光譜；s：事先設定的原子使用上限。','Y: measured training spectra; s: a chosen atom budget per sample.']],[variable,['Dₕ：原子曲線；W：每筆訓練光譜的組合係數；Wᵢ,ₙ 是第 n 筆樣本使用原子 i 的倍率。','Dₕ: atom curves; W: training coefficients; Wᵢ,ₙ scales atom i in sample n.']],[criterion,['比較 Y 與 DₕW，把全部波段、全部樣本的差平方後加總。','Compare Y with DₕW and sum squared differences over all bands and samples.']],[output,['經過交替更新得到字典與訓練係數；不是直接得到新像素的光譜。','An iteratively learned dictionary and training codes, not a new pixel’s spectrum.']]],
      ['s.t. 表示必須符合後面的限制。min 表示讓誤差盡量小；下方 Dₕ,W 指出可以調整誰。‖wₙ‖₀ 是第 n 筆樣本的非零係數個數；原子長度設為 1，是固定尺度，並不要求係數和為 1。','s.t. means subject to the following constraints. min asks for a small error; Dₕ,W beneath it name the adjustable variables. ‖wₙ‖₀ counts nonzero coefficients for sample n. Unit atom norms fix scale; coefficients need not sum to one.'],
      `<details><summary>${b(['展開：誤差究竟加總了哪些數？','Expand: Which Numbers Are Summed in the Error?'])}</summary>${math(`${loss}${mo('=')}${sum(`${mi('n')}${mo('=')}${mn(1)}`,mi('N'))}${sum(`${mi('j')}${mo('=')}${mn(1)}`,mi('d'))}${sq(`${mo('(')}${sub('Y','j,n')}${mo('−')}${reconstructedEntry}${mo(')')}`)}`,'Sum squared differences across training samples n and bands j')}${p(['d 是每條光譜的波段數，N 是訓練樣本數。Yⱼ,ₙ 是第 n 筆光譜在第 j 波段的量測；(DₕW)ⱼ,ₙ 是同一位置的重建。下方算例把 4 筆、各 3 波段的 12 個平方差加起來。這是訓練誤差，不是測試準確率。','d is the band count and N the training sample count. Yⱼ,ₙ is a measured entry; (DₕW)ⱼ,ₙ is its reconstructed counterpart. The example below adds 12 squared differences from 4 samples with 3 bands each. This is training error, not test accuracy.'])}</details>`],
    ['fr-ksvd-isolate',['2. 更新一個原子前，分離它要負責的部分','2. Isolate One Atom’s Responsibility before Updating It'],
      `${E}${mo('=')}${mi('Y')}${mo('−')}<munder>${mo('∑')}<mrow>${mi('i')}${mo('≠')}${mi('j')}</mrow></munder>${sub('d','i')}${sub('x','i')}`,
      'E j equals fixed Y minus every other atom contribution d i x i',
      [[input,['Y、其他原子 dᵢ 與其係數列 xᵢ；xᵢ 是 W 的第 i 橫列。','Y, all other atoms dᵢ and their coefficient rows xᵢ; xᵢ is row i of W.']],[variable,['此式只是計算 Eⱼ，還沒有更新 dⱼ 或它的係數。','This expression computes Eⱼ; it does not update dⱼ or its coefficients yet.']],[output,['扣掉其他原子貢獻後的矩陣 Eⱼ，供下一步更新使用。','Residual matrix Eⱼ after removing other contributions, for the next update.']]],
      ['Eⱼ 不等於完整重建殘差 Y−DₕW：它保留原子 j 應負責的部分。樣本索引 n 與原子索引 j 也不同；一個原子可以被許多訓練樣本使用。','Eⱼ is not the full reconstruction residual Y−DₕW: it retains atom j’s responsibility. Sample index n differs from atom index j; many training samples can use one atom.']],
    ['fr-ksvd-update',['3. SVD 解的是哪個最小化問題？','3. Which Minimization Does the SVD Solve?'],
      `${opt('min',`${sub('d','j')}${mo(',')}${sub('x','j,Ω')}`)}${sq(norm(`${sub('E','j,Ω')}${mo('−')}${sub('d','j')}${sub('x','j,Ω')}`,'F'))}<mspace width="1em"/><mtext>s.t.</mtext><mspace width=".4em"/>${norm(sub('d','j'))}${mo('=')}${mn(1)}`,
      'Minimize the restricted residual rank one approximation error over one unit atom d j and its active coefficient row x j Omega',
      [[input,['Eⱼ,Ω：只取原本使用原子 j 的樣本欄。更新時不啟用名單外的樣本；名單內的係數也可能變成 0。','Eⱼ,Ω: columns for samples already using atom j. No outside sample is activated; coefficients within the support may also become zero.']],[variable,['一條 d×1 原子 dⱼ，以及 1×|Ω| 係數列 xⱼ,Ω；|Ω| 是活躍樣本數，兩者一起更新。','One shared d×1 atom dⱼ and a 1×|Ω| coefficient row xⱼ,Ω; both are updated.']],[criterion,['一個方向乘一列係數，近似受限殘差矩陣；總平方差越小越好。','Approximate the restricted residual by one direction times a coefficient row, minimizing squared error.']],[output,['u₁ 是新的單位方向；σ₁ 是最大奇異值，乘上 v₁ᵀ 得到各活躍樣本的係數列。其他樣本係數仍為 0。','u₁ is the new unit direction; leading singular value σ₁ times v₁ᵀ gives the active coefficient row. Other coefficients stay zero.']]],
      ['將 Eⱼ,Ω 分解後，取第一組奇異向量與奇異值，得到最佳秩一近似。「秩一」在這裡指共用一個方向，每筆樣本沿它使用不同倍率。這只解當前原子的受限子問題，不保證整個字典達到全域最佳。','After decomposing Eⱼ,Ω, take the leading singular vectors and singular value for its best rank-one approximation. Here rank one means one shared direction with a separate scale per sample. This solves the current restricted atom subproblem, not global dictionary optimization.'],
      math(`${sub('E','j,Ω')}${mo('=')}${mi('U')}${mi('Σ')}${tr(mi('V'))}<mo>;</mo><mspace width=".4em"/>${sub('d','j')}${mo('←')}${sub('u','1')}<mo>,</mo><mspace width=".4em"/>${sub('x','j,Ω')}${mo('←')}${sub('σ','1')}${tr(sub('v','1'))}`,'SVD yields d j equals u 1 and the active coefficient row equals sigma 1 v 1 transpose')]
  ];
  const oCards=[
    ['fr-omp-select',['1. arg max：選出分數最大的原子編號','1. arg max: Return the Index with the Largest Score'],
      `${mi('j')}${mo('=')}${opt('arg max',`${mi('i')}${mo('∉')}${mi('S')}`)}<mfrac><mrow>${mo('|')}${tr(sub('a','i'))}${mi('r')}${mo('|')}</mrow><mrow>${norm(sub('a','i'))}</mrow></mfrac>`,
      'Return the eligible atom index j maximizing absolute residual inner product normalized by atom norm',
      [[input,['固定 RGB 字典 A=D_RGB、目前殘差 r，以及已選編號集合 S；初始 r=c_q、S 為空。','Fixed RGB dictionary A=D_RGB, current residual r, and selected index set S; initially r=c_q and S is empty.']],[variable,['要加入的原子編號 j，不是此時求出它的權重。','The atom index j to add, not its coefficient at this substep.']],[criterion,['|aᵢᵀr|÷‖aᵢ‖₂ 衡量與殘差的相關程度；長度校正後取最大值。','|aᵢᵀr|÷‖aᵢ‖₂ scores residual alignment with length normalization; choose the largest score.']],[output,['一個編號 j，加入 S；這一步字典和輸入都不改。','An index j added to S; neither dictionary nor input changes.']]],
      ['max 回傳最大分數，arg max 回傳取得該分數的編號。T 表示轉置，aᵢᵀr 是對應分量相乘後加總；絕對值也允許反方向的相關性。零向量不能參選。這是逐步貪婪選擇，沒有比較所有原子小組。','max returns the largest score; arg max returns its index. T denotes transpose, so aᵢᵀr sums componentwise products; the absolute value includes opposite alignment. Zero atoms are ineligible. This greedy choice does not compare all subsets.']],
    ['fr-omp-fit',['2. arg min：求出誤差最小的整組權重','2. arg min: Return All Selected Weights Minimizing Error'],
      `${ws}${mo('=')}${opt('arg min',mi('z'))}${sq(norm(`${cq}${mo('−')}${AS}${mi('z')}`))}`,
      'Return all selected coefficients w S minimizing squared RGB error over candidate coefficients z',
      [[input,['已知 RGB c_q，以及固定已選原子形成的矩陣 A_S。','Known RGB c_q and fixed selected-column matrix A_S.']],[variable,['候選係數 z：舊原子與新原子的權重一起調整。','Candidate coefficients z: adjust weights for both old and new selected atoms.']],[criterion,['RGB 三個分量各自相減、平方，再相加。','Subtract corresponding RGB components, square, and sum all three differences.']],[output,['使這組已選原子的誤差最小的權重向量 w_S。','Coefficient vector w_S minimizing error within this selected subset.']]],
      ['min 回傳最小誤差，arg min 回傳達成該誤差的係數。這裡是求已選子集內的最小平方解，不保證選出的子集是全部可能組合中最好的一組。A 固定，不更新原子。','min returns the minimum error; arg min returns coefficients attaining it. This is least squares within the chosen subset, not a guarantee of the best subset among all combinations. A stays fixed; atoms are not updated.'],
      math(`${sq(norm(`${cq}${mo('−')}${AS}${mi('z')}`))}${mo('=')}${sq(`${mo('(')}${sub('c','R')}${mo('−')}${sub('ĉ','R')}${mo(')')}`)}${mo('+')}${sq(`${mo('(')}${sub('c','G')}${mo('−')}${sub('ĉ','G')}${mo(')')}`)}${mo('+')}${sq(`${mo('(')}${sub('c','B')}${mo('−')}${sub('ĉ','B')}${mo(')')}`)}`,'Squared RGB error is the sum of the three squared component differences, where c hat equals A S z')+p(['此展開中 ĉ=A_Sz；求解後以 z=w_S 計算目前重建。權重不要求非負，也不要求加總為 1。','Here ĉ=A_Sz; after fitting, use z=w_S for the current reconstruction. Weights are not constrained to be nonnegative or to sum to one.'])],
    ['fr-omp-residual',['3. 更新殘差，檢查是否繼續','3. Update the Residual and Check Whether to Continue'],
      `${mi('r')}${mo('=')}${cq}${mo('−')}${AS}${ws}<mo>;</mo><mspace width=".5em"/>${norm(mi('r'))}${mo('≤')}${mi('ε')}<mspace width=".4em"/><mtext>or</mtext><mspace width=".4em"/>${mo('|')}${mi('S')}${mo('|')}${mo('≥')}${mi('s')}`,
      'Residual is c q minus A S w S; stop if residual norm is at most epsilon or selected atom count reaches s',
      [[input,['固定輸入 c_q、已選原子 A_S，以及剛求出的 w_S。','Fixed c_q, selected atoms A_S, and the fitted w_S.']],[variable,['這一步只計算 r；不是再學一個未知光譜或更新字典。','This step computes r; it does not learn another spectrum or update the dictionary.']],[criterion,['殘差長度是否低於容許值 ε？已選數量是否達到預算 s？','Is the residual norm below tolerance ε, or has the selected count reached budget s?']],[output,['新的殘差供下一輪選擇使用，或停止並輸出稀疏 w。','A new residual for the next selection, or stop and output sparse w.']]],
      ['ε 與 s 是停止設定；也要在沒有有效新方向時停止。未選位置的係數填 0，才形成完整 w。RGB 擬合誤差小，不等於高光譜估計已經證實正確。','ε and s are stopping settings; also stop when no eligible new direction remains. Fill unselected positions with zero to form full w. A small RGB fit error does not prove spectral accuracy.']]
  ];
  function algorithmIntro(kind){
    const cards=kind==='ksvd'?kCards:oCards;
    return `<section class="fr-guide" id="paper-${kind}-formula-guide" data-i18n-skip><header><p class="eyebrow">${b(['演算法公式解讀','Reading the Algorithm Equations'])}</p><h3>${b(kind==='ksvd'?['K-SVD：已知資料、可調變數與誤差','K-SVD: Data, Adjustable Variables, and Error']:['OMP：選編號、求權重、更新差值','OMP: Select an Index, Fit Weights, Update the Residual'])}</h3>${p(['先讀每一步固定什麼、求什麼，再用下方算例對照數值。以下是標準演算法補充，不新增原論文公式編號；下方 K-SVD 算例以 D 簡寫 Dₕ，OMP 以 A 代表 D_RGB。','Identify what each step fixes and solves, then follow its numbers below. These standard algorithm explanations do not add paper equation numbers. The K-SVD example writes D for Dₕ; OMP uses A for D_RGB.'])}</header>${cards.map(args=>card(...args)).join('')}<p class="fr-source">${b(['公式依據','Equation Source'])}: <a href="${kind==='ksvd'?'https://freddy.cs.technion.ac.il/wp-content/uploads/2017/12/K-SVD-An-Algorithm-for-Designing-Overcomplete.pdf':'https://user.eng.umd.edu/~krishna/images/pati_reza_psk.pdf'}" target="_blank" rel="noreferrer">${kind==='ksvd'?'Aharon, Elad & Bruckstein (2006), §IV.B–C, Eqs. (19)–(23)':'Pati, Rezaiifar & Krishnaprasad (1993), §2'}</a></p></section>`;
  }
  const fmt=(v,n=6)=>(Math.abs(v)<.5*10**-n?0:v).toFixed(n),sse=v=>v.reduce((s,x)=>s+x*x,0);
  function lossBreakdown(Y,D,W){return Y.map((y,n)=>{const prediction=y.map((_,j)=>D.reduce((s,d,i)=>s+d[j]*W[n][i],0)),residual=y.map((v,j)=>v-prediction[j]);return {prediction,residual,squared:residual.map(x=>x*x),error:sse(residual)};});}
  function algorithmState(m){
    const af=window.ReportAlgorithmFocus;if(!af)return '';
    let text='',detail='';
    if(m.kind==='ksvd'){
      if(!m.state.step)return `<aside class="fr-live">${p(['對照公式 1：目前只有 Y 與起始 D，尚未求 W，因此暫不顯示重建誤差。下一步才計算係數與誤差。','Formula 1 check: only Y and the initial D are present; W has not been fitted, so no reconstruction error is reported yet. The next step computes both.'])}</aside>`;
      const trace=af.trainingTrace(),snap=m.state.step<=2?trace.first:m.state.step===3?trace.one:m.state.step===4?trace.two:trace.recoded,rows=lossBreakdown(af.Y,snap.D,snap.W),row=rows[m.state.sample];
      text=['對照公式 1：下列數字是固定 Y 與目前 D、W 的訓練總平方差。切換步驟可比較更新前後；切換樣本只改變展開的那一筆。','Formula 1 check: these values sum training errors for fixed Y and current D,W. Change the step to compare updates; selecting a sample changes only the expanded sample.'];
      detail=`<p class="fr-number">L = ${rows.map(r=>fmt(r.error)).join(' + ')} ≈ <strong>${fmt(rows.reduce((s,r)=>s+r.error,0))}</strong></p><p>${b([`樣本 y${m.state.sample+1} 的波段差值平方加總：`,`Squared band differences for sample y${m.state.sample+1}:`])}</p><p class="fr-number">${row.residual.map(v=>`(${fmt(v)})²`).join(' + ')} ≈ ${fmt(row.error)}</p>`;
      if(m.state.step===3||m.state.step===4){
        const j=m.state.step===3?0:1,old=j===0?trace.first:trace.one,updated=j===0?trace.one:trace.two;
        const local=(D,W)=>updated.active.reduce((s,n)=>s+sse(updated.E[n].map((v,k)=>v-D[j][k]*W[n][j])),0);
        detail+=`<p>${b([`對照公式 3：只看更新原子 ${j+1} 所使用的受限矩陣，更新前 → 更新後：`,`Formula 3 check: restricted error for updating atom ${j+1}, before → after:`])}</p><p class="fr-number">‖E${j+1},Ω − d${j+1}x${j+1},Ω‖²_F: ${fmt(local(old.D,old.W))} → ${fmt(local(updated.D,updated.W))}</p>`;
      }
    }else{
      const v=af.ompFrame(m.state.step),r=v.shown.residual;
      text=v.phase==='select'?['對照公式 1：先比較目前殘差與每個未選原子的分數。下表的最大分數決定新編號；此時還沒有重算權重。','Formula 1 check: compare each eligible atom’s score against the current residual. The largest score below determines the new index; weights have not yet been refitted.']:['對照公式 2、3：先看三個通道的平方差總和，再看殘差長度。兩個量有平方／開根號的關係，不能當成同一個數。','Formulas 2–3 check: compare the sum of squared channel errors with the residual norm. One is the square of the other; they are different reported quantities.'];
      if(v.phase==='select'){
        const a=af.A[v.pending],oldr=v.before.residual,inner=a.reduce((s,x,i)=>s+x*oldr[i],0),length=Math.sqrt(sse(a));
        detail=`<p class="fr-number">score${v.pending+1} = |${a.map((x,i)=>`(${fmt(x,4)} × ${fmt(oldr[i],4)})`).join(' + ')}| ÷ ${fmt(length,4)} ≈ ${fmt(Math.abs(inner)/length)}</p><p class="fr-number">j = ${v.pending+1}</p>`;
      }else detail=`<p class="fr-number">L_RGB = ${r.map(x=>`(${fmt(x)})²`).join(' + ')} ≈ <strong>${fmt(sse(r))}</strong></p><p class="fr-number">‖r‖₂ = √L_RGB ≈ ${fmt(Math.sqrt(sse(r)))}</p>`;
    }
    return `<aside class="fr-live" data-i18n-skip><h4>${b(['把上方公式代入目前數值','Substitute the Current Values into the Equations'])}</h4>${p(text)}${detail}<small>${b(['顯示數值經四捨五入；計算使用完整精度。合成教學算例，不是論文實測。','Displayed values are rounded; calculations use full precision. Synthetic teaching example, not measured paper results.'])}</small></aside>`;
  }
  const equationRoles={
    'paper-eq-1':[[input,['準備階段學好的完整光譜原子 h₁…hₙ。','Complete spectral atoms h₁…hₙ learned during preparation.']],[output,['組成字典 Dₕ；這是定義，不是在此式重新求解原子。','Dictionary Dₕ; this is a definition, not a new atom-learning optimization.']]],
    'paper-eq-2':[[input,['固定響應矩陣 R 與高光譜字典 Dₕ。','Fixed response matrix R and spectral dictionary Dₕ.']],[output,['直接乘出 D_RGB，保留每一欄的配對；此式沒有待最小化誤差。','Compute D_RGB while preserving column pairs; this expression has no error to minimize.']]],
    'paper-eq-3':[[input,['第 i 條完整光譜原子 hᵢ 與 R。','Spectral atom hᵢ and R.']],[output,['cᵢ：該原子的三通道投影，不是新查詢像素 c_q。','cᵢ: the atom’s three-channel projection, distinct from a new query c_q.']]],
    'paper-eq-4':[[input,['固定 D_RGB 與新像素的線性 RGB c_q。','Fixed D_RGB and the new pixel’s linear RGB c_q.']],[variable,['稀疏係數 w；不調整字典，不讀取未知的真實光譜。','Sparse coefficients w; neither dictionary adjustment nor access to unknown spectral truth.']],[criterion,['檢查 D_RGBw 與 c_q 的 RGB 差值；OMP 逐步選原子並共同最小平方擬合。','Compare D_RGBw with c_q; OMP selects greedily and jointly fits selected coefficients by least squares.']],[output,['一組稀疏 w；有雜訊或提前停止時，式 (4) 通常只是近似成立。','Sparse w; with noise or early stopping, Eq. (4) generally holds approximately.']]],
    'paper-eq-5':[[input,['固定 Dₕ，以及式 (4) 剛求出的同一組 w。','Fixed Dₕ and the exact same w fitted in Eq. (4).']],[output,['直接乘出估計光譜 h_q；不在這一步再找一組新權重。','Compute estimated spectrum h_q directly; do not fit new weights in this step.']]],
    'paper-eq-6':[[input,['估計光譜 h_q 與建立成對字典時的 R。','Estimated h_q and the R used to build the paired dictionary.']],[criterion,['回投影與輸入的差值，等於式 (4) 的 RGB 擬合差值。','The reprojection difference equals the RGB fit residual in Eq. (4).']],[output,['RGB 相容性檢查；光譜是否正確須另用保留真值評估。','An RGB consistency check; spectral accuracy requires separate held-out truth.']]],
    'paper-rmse':[[input,['相同尺度的估計光譜與保留真值，以及比較項目數 M。','Estimates and held-out references on the same scale, plus comparison count M.']],[criterion,['逐項相減 → 平方 → 加總 → 除以 M → 開根號。','Subtract entrywise → square → sum → divide by M → take the square root.']],[output,['一個評分數值；此處只評估結果，沒有更新字典或權重。','An evaluation score; no dictionary or coefficients are updated here.']]]
  };
  function initialize(){for(const [id,rows] of Object.entries(equationRoles)){const el=document.getElementById(id);if(!el)continue;const box=document.createElement('aside');box.className='fr-equation-roles';box.dataset.i18nSkip='';box.innerHTML=`<h4>${b(['輸入、求解與輸出','Input, Solution, and Output'])}</h4>${roles(rows)}`;el.querySelector('.paper-math').after(box);}}
  window.ReportFormulaReading={algorithmIntro,algorithmState,lossBreakdown,equationRoles,kCards,oCards,initialize};
  initialize();
})();
