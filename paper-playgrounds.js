/* Inline instances of the tested supporting models. No iframes or copied algorithms. */
(() => {
  'use strict';
  const escape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const b=p=>`<span class="i18n-unit i18n-block" data-i18n-skip><span class="i18n-en" lang="en">${escape(p[1])}</span><span class="i18n-separator" aria-hidden="true"> / </span><span class="i18n-zh" lang="zh-Hant">${escape(p[0])}</span></span>`;
  const t=p=>document.documentElement.dataset.language==='zh'?p[0]:p[1];
  const configs=[
    {id:'paper-rationale-playground',page:'paper-rationale',type:'concept',number:15,title:['改變光譜，但保留相同 RGB','Change the Spectrum, Preserve RGB'],help:['對照上方的欠定與同色異譜：拖動差異，觀察兩條曲線不同而三個量測仍相同。這是簡化的線性量測算例，不是任意真實相機的實測結果。','Apply the underdetermination and metamerism argument above: vary the difference and observe distinct curves with the same three measurements. This is a simplified linear measurement example, not measured results from an arbitrary camera.']},
    {id:'paper-intro-playground',page:'paper-introduction',type:'concept',number:5,title:['親自查看像素、波段與光譜','Explore Pixels, Bands, and Spectra'],help:['選一個位置，再換波段；把「一個像素的完整光譜」與「一個波段的整張影像」對起來。這是合成立方體，不是論文拍攝的場景。','Choose a position, then a band. Connect one pixel’s full spectrum with a whole image at one band. This is a synthetic cube, not a scene measured in the paper.']},
    {id:'paper-related-playground',page:'paper-related',type:'literature',number:43,title:['比較每個方法拿到的資訊','Compare the Information Each Method Receives'],help:['切換方法，再切換是否提供同場景高光譜；觀察哪些方法仍有足夠的必要輸入。不在這裡模擬準確度排名。','Switch methods and same-scene HSI availability to inspect their required inputs. This does not simulate an accuracy ranking.']},
    {id:'paper-prior-playground',page:'paper-prior',after:'paper-training-count',type:'concept',number:38,title:['輪流留出測試影像','Rotate the Held-Out Test Image'],help:['按下一步換測試影像，再比較允許同影像先驗的情境。畫面用 6 張示意圖說明分配，不是把論文的 100 張改成 6 張。','Advance to rotate the test image, then compare the same-image-prior condition. Six schematic images explain the split; they do not replace the paper’s 100-image dataset.']},
    {id:'paper-ksvd-phases-playground',page:'paper-ksvd',after:'paper-ksvd-objective',type:'literature',number:27,title:['K-SVD：現在固定誰、更新誰？','K-SVD: What Is Fixed and What Changes?'],help:['切換稀疏編碼、更新 d₁、更新 d₂，觀察原子與相關係數的更新名單。這是演算法階段示意，不是重新取得量測。','Switch sparse coding, updating d₁, and updating d₂ to inspect which atoms and coefficients change. This illustrates algorithm phases, not new measurements.']},
    {id:'paper-ksvd-svd-playground',page:'paper-ksvd',after:'paper-ksvd-svd',type:'literature',number:29,title:['轉動原子方向，查看重建誤差','Rotate an Atom Direction and Inspect Error'],help:['先拖動共同方向，再套用最佳 SVD 方向；觀察投影、係數與總平方差一起變動。這是受限殘差的二維算例，不是論文完整字典訓練。','Rotate the shared direction, then apply the best SVD direction. Observe projections, coefficients, and squared error together. This is a 2D restricted-residual example, not full dictionary training from the paper.']},
    {id:'paper-omp-playground',page:'paper-omp',after:'paper-omp-residual',type:'concept',number:33,title:['OMP：逐步選擇並共同重算','OMP: Select Step by Step and Refit Together'],help:['每按一步，觀察所選原子、重算權重與剩餘 RGB 殘差。這裡只有 4 個合成候選，方便看清三維運算，不代表論文只有 4 個原子。','At each step inspect the chosen atom, refitted weights, and RGB residual. Four synthetic candidates make the 3D computation visible; the paper’s dictionary is not reduced to four atoms.']},
    {id:'paper-error-playground',page:'paper-experiments',after:'paper-rmse',type:'concept',number:40,title:['相同差距，為何相對誤差不同？','Why Can the Same Difference Have Different Relative Errors?'],help:['固定誤差再降低真值，觀察絕對差、相對比例與單值平方誤差。單一數值示例不是 Table 1 的資料集 RMSE 重算。','Keep the added error fixed and lower the reference. Inspect absolute difference, relative error, and single-value squared error. This is not a recalculation of Table 1 dataset RMSE.']},
    {id:'paper-conclusion-playground',page:'paper-conclusion',type:'concept',number:19,title:['檢查估計依賴的假設','Inspect the Assumptions behind Estimation'],help:['分開切換低維條件與同色異譜條件，觀察推論能說到哪裡。這是條件推理，不是理解測驗，也不會生成實測準確率。','Toggle low-dimensional structure and metamerism conditions independently to inspect what can be concluded. This is conditional reasoning, not a quiz or a measured accuracy predictor.']}
  ];
  const mounted=new Set();
  function mountVisible(){
    for(const cfg of configs){
      const shell=document.getElementById(cfg.id),page=shell?.closest('.paper-page')||document.getElementById(cfg.page);
      if(!shell||!page||page.hidden||mounted.has(cfg.id))continue;
      mounted.add(cfg.id);
      const root=shell.querySelector('.paper-playground-mount'),instanceId=`${cfg.id}-model`;
      if(cfg.type==='concept')window.ReportConcepts.mountEmbedded(cfg.number,root,instanceId,cfg.initialState||{});
      else window.ReportLiterature.mountEmbedded(cfg.number,root,instanceId,{b,t,escape});
      shell.dataset.mounted='true';shell.querySelector('.paper-playground-loading').remove();
    }
  }
  function initialize(){
    document.documentElement.classList.add('report-sidebar');
    for(const cfg of configs){
      const page=document.getElementById(cfg.page),shell=document.createElement('section');
      shell.id=cfg.id;shell.className='paper-playground';shell.dataset.i18nSkip='';shell.setAttribute('aria-labelledby',`${cfg.id}-title`);
      shell.innerHTML=`<header><p class="eyebrow">Playground</p><h3 id="${cfg.id}-title">${b(cfg.title)}</h3><p>${b(cfg.help)}</p></header><p class="paper-playground-loading">${b(['進入本節即可操作。','Controls load when this section opens.'])}</p><div class="concept-lab-mount paper-playground-mount"></div>`;
      if(cfg.after)document.getElementById(cfg.after).after(shell);else page.querySelector('.paper-body').append(shell);
    }
    for(const page of window.ReportPaper.pages){
      const first=configs.find(c=>c.page===page.id),jump=document.createElement('a');
      if(!first)continue;
      jump.className='paper-playground-jump';jump.href=`#${first.id}`;jump.dataset.i18nSkip='';jump.innerHTML=b(['前往本節 Playground ↓','Open This Section’s Playground ↓']);
      document.querySelector(`#${page.id} .paper-heading`).append(jump);
    }
    window.addEventListener('hashchange',mountVisible);
    document.addEventListener('DOMContentLoaded',mountVisible);
  }
  window.ReportPlaygrounds={configs,mountVisible,initialize};
  initialize();
})();
