/* Every mainline model control is mapped to a mathematical role.
   Inspection, protocol changes, optimization, and evidence reading stay distinct. */
(() => {
  'use strict';
  const e=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const b=p=>`<span class="i18n-unit i18n-block" data-i18n-skip><span class="i18n-en" lang="en">${e(p[1])}</span><span class="i18n-separator" aria-hidden="true"> / </span><span class="i18n-zh" lang="zh-Hant">${e(p[0])}</span></span>`;
  const a=(selector,label,formula,meaning,observe,target)=>({selector,label,formula,meaning,observe,target});
  const configs=[];
  const add=(id,target,formula,fixed,goal,actions,stages)=>configs.push({id,target,formula,fixed,goal,actions,stages});
  const train='L_train = ‖Y − DₕW‖²_F',rankone='Lⱼ = ‖Eⱼ,Ω − dⱼxⱼ,Ω‖²_F',fit='w_S = arg min_z ‖c_q − A_S z‖²₂';
  const stagesK=[
    a('', ['起點：讀取已知資料','Start: Inspect Known Data'],'Y, Dₕ → {W} unknown',['先認識固定訓練光譜與起始字典；尚未求係數。','Inspect fixed training spectra and the initial dictionary; no coefficients are fitted yet.'],['尚無 W，因此不把未計算的誤差當成 0。','Without W, an uncomputed error is not reported as zero.'],'#fr-ksvd-loss'),
    a('', ['固定字典，求稀疏係數','Fix the Dictionary, Fit Sparse Codes'],'min_{W} ‖Y − Dₕ{W}‖²_F; ‖wₙ‖₀ ≤ s',['Y、Dₕ 固定，用 OMP 找各樣本的少數原子與倍率。','Hold Y and Dₕ fixed; OMP finds a few atoms and scales for each sample.'],['看每筆重建與總訓練平方差；此處改的是 W。','Inspect sample reconstructions and total training error; W changes here.'],'#fr-ksvd-loss'),
    a('', ['扣除其他原子貢獻','Subtract Other Atom Contributions'],'{Eⱼ} = Y − Σᵢ≠ⱼ dᵢxᵢ',['只計算留給原子 j 解釋的部分，尚未改原子或係數。','Compute the part left for atom j; neither atoms nor coefficients change yet.'],['總訓練誤差此時不因「查看殘差」而下降。','Inspecting this residual does not itself reduce total training error.'],'#fr-ksvd-isolate'),
    a('', ['更新原子 1 與活躍係數','Update Atom 1 and Its Active Codes'],'min_{d₁,x₁,Ω} ‖E₁,Ω − {d₁x₁,Ω}‖²_F',['其他原子及係數固定，SVD 同時調整這個方向和相關倍率。','Keep other contributions fixed; SVD jointly updates this direction and its active scales.'],['比較受限平方差更新前後，並看總訓練誤差。','Compare restricted error before and after, and inspect total training error.'],'#fr-ksvd-update'),
    a('', ['接著更新原子 2','Then Update Atom 2'],'min_{d₂,x₂,Ω} ‖E₂,Ω − {d₂x₂,Ω}‖²_F',['固定剛改好的原子 1 及其係數，再更新原子 2。','Hold updated atom 1 and its coefficients fixed, then update atom 2.'],['逐原子完成一輪，不是同時任意移動所有原子。','Complete the atom sweep; do not move every atom arbitrarily at once.'],'#fr-ksvd-update'),
    a('', ['用新字典重新編碼','Recode with the Updated Dictionary'],'min_{W} ‖Y − Dₕ{W}‖²_F',['回到固定字典求係數階段，可重新選擇非零位置。','Return to coding with a fixed dictionary; supports may be selected anew.'],['誤差可能已接近穩定；不保證找到全域最佳。','The error may be nearly stable; global optimality is not guaranteed.'],'#fr-ksvd-loss')
  ];
  const ompSelect=a('', ['選擇原子編號','Select an Atom Index'],'j = arg maxᵢ∉S |aᵢᵀ{r}| / ‖aᵢ‖₂',['固定 A 與目前殘差 r，用相關分數選 j；這一步還沒求新權重。','Fix A and current residual r; select j by correlation score without yet fitting new weights.'],['最大分數是選擇準則，不是高光譜誤差。','The largest score is a selection criterion, not spectral error.'],'#fr-omp-select');
  const ompFit=a('', ['共同求解全部已選權重','Jointly Fit All Selected Weights'],'w_S = arg min_{z} ‖c_q − A_S {z}‖²₂',['c_q 與 A_S 固定，舊、新原子的權重一起重算。','Fix c_q and A_S; jointly refit weights of old and new selected atoms.'],['看 RGB 平方差 L_RGB；最佳化只在已選子集內。','Inspect squared RGB error L_RGB; optimality is within the selected subset.'],'#fr-omp-fit');
  const ompResidual=a('', ['更新殘差與檢查停止','Update the Residual and Check Stopping'],'{r} = c_q − A_Sw_S; ‖r‖₂ ≤ ε or |S| ≥ s',['用固定 RGB 減掉共同重建，決定是否繼續。','Subtract the joint reconstruction from fixed RGB to decide whether to continue.'],['殘差長度 = √L_RGB；仍需獨立光譜真值評估準確度。','Residual norm = √L_RGB; spectral accuracy still requires independent truth.'],'#fr-omp-residual');
  add('paper-ksvd-walkthrough','#fr-ksvd-loss',train,['固定的是原始量測 Y；每一步另指出 D 或 W 的哪些部分固定。','Measured Y stays fixed; each stage identifies the fixed parts of D and W.'],['走完一次交替最佳化，讀懂訓練誤差如何影響更新。','Follow alternating optimization and how training error guides updates.'],[
    a('[data-af-field="sample"]',['換一筆樣本查看','Inspect Another Sample'],'y_{n} ≈ Dₕw_{n}',['只改正在展開的樣本編號 n，不重新訓練。','Change the inspected sample index n without retraining.'],['單筆誤差明細改變；整批總誤差保持相同。','The inspected sample error changes; total training error stays the same.'])
  ],'ksvd');
  add('paper-omp-walkthrough','#fr-omp-select',fit,['固定 RGB c_q 與字典 A；選擇集合及係數逐步改變。','RGB c_q and dictionary A stay fixed; support and coefficients evolve.'],['把選原子、共同擬合、更新殘差三件事分開看。','Separate selection, joint fitting, and residual update.'],[], 'omp');
  add('paper-paired-playground','#paper-eq-3','cᵢ = Rhᵢ',['整本 Dₕ 與響應 R 固定。','The whole Dₕ and response matrix R stay fixed.'],['驗算字典的某一欄如何投影成 RGB。','Verify how one dictionary column projects into RGB.'],[
    a('[data-mf-atom]',['選擇原子 i','Choose Atom i'],'c_{i} = Rh_{i}',['只換正在查看的直欄 i，兩本字典的編號一起換。','Inspect another column i; both dictionaries retain the same index.'],['曲線與 RGB 配對一起切換，不是在學新字典。','The curve and RGB partner change together; no dictionary is learned.']),
    a('[data-mf-field="channel"]',['選擇通道 k','Choose Channel k'],'cᵢ,{k} = Σⱼ R_{k},ⱼ hᵢ,ⱼ',['選擇 R、G 或 B 對應的橫列。','Inspect the row for channel R, G, or B.'],['換的是正在計算的通道，不是只取一個波長。','This changes the inspected channel, not a single wavelength.'],'#paper-camera-sum'),
    a('[data-mf-field="band"]',['讀取波段 j','Inspect Band j'],'cᵢ,ₖ = Σ_{j} Rₖ,{j} hᵢ,{j}',['只移動讀取位置，查看一項乘法。','Move the reading position to inspect one product.'],['全部 31 項仍會加總；移動讀取點不改 RGB。','All 31 terms remain included; the reading position does not change RGB.'],'#paper-camera-sum')
  ]);
  add('paper-fit-playground','#paper-eq-4','D_RGB w ≈ c_q',['配對字典固定；新 RGB 與原子上限由你選。','The paired dictionary is fixed; choose a query RGB and atom budget.'],['根據已知 RGB 求稀疏係數，再比較重建 RGB。','Infer sparse weights from known RGB and compare the fitted RGB.'],[
    a('[data-mf-field="query"]',['更換輸入 RGB','Change the Input RGB'],'D_RGB w ≈ {c_q}',['換查詢像素的三個已知值，舊解隨即清除。','Change the three known query values and clear the old solution.'],['還沒重新求解前，不顯示舊 w 作為新答案。','Do not treat old w as a solution for the new input.']),
    a('[data-mf-field="budget"]',['設定最多使用幾個原子','Set the Atom Budget'],'min_w ‖c_q − D_RGBw‖²₂; ‖w‖₀ ≤ {s}',['改變稀疏預算 s，不是改光譜波段數。','Change sparsity budget s, not the spectral band count.'],['需重新求解；比較新預算下的 RGB 殘差。','Solve again and compare the RGB residual at this budget.']),
    a('[data-mf-action="solve"]',['求解 w','Solve for w'],'D_RGB {w} ≈ c_q',['真正執行 OMP 選原子及共同最小平方擬合。','Actually run OMP selection and joint least-squares fitting.'],['讀所選編號、w 與 RGB 殘差；低 RGB 誤差不證明光譜正確。','Read selected indices, w, and RGB residual; low RGB error does not prove spectral truth.'])
  ]);
  add('paper-transfer-playground','#paper-eq-5','ĥ_q = Dₕw; Rĥ_q = D_RGBw',['固定上一個求解器給出的同一組 w、Dₕ、R。','Fix the same fitted w, Dₕ, and R.'],['用同一組係數逐波段重建，再做回投影一致性檢查。','Reconstruct bands with the same weights, then check projection consistency.'],[
    a('[data-mf-field="outputBand"]',['讀取一個輸出波段','Inspect One Output Band'],'ĥ_q,{j} = Σᵢ Dₕ[{j},i]wᵢ',['只讀取第 j 個輸出值及其乘積，不重新找 w。','Inspect output entry j and its products without refitting w.'],['輸出仍有完整 31 個值；兩條 RGB 路徑應相容。','All 31 output values remain; the two RGB paths should agree.'])
  ]);
  add('paper-intro-playground','#concept-05','h_p[j] = I(x_p,y_p,λⱼ)',['整個合成立方體 I 固定。','The whole synthetic cube I is fixed.'],['分清一個像素的光譜與一個波段的整張影像。','Distinguish a pixel spectrum from a whole-image band slice.'],[
    a('[data-fd-field="lambda"]',['更換查看波段','Inspect Another Band'],'h_p[{j}] = I(x_p,y_p,λ_{j})',['固定位置 p，改讀取波段 j；沒有改寫原資料。','Hold position p and inspect band j without modifying the data.'],['整張切片及曲線讀取點改變，該位置的完整曲線不變。','The image slice and marker change; that pixel’s full curve stays unchanged.']),
    a('[data-fd-pixel]',['選擇像素位置','Choose a Pixel Position'],'h_{p}[j] = I(x_{p},y_{p},λⱼ)',['固定查看的波段，改位置 p。','Keep the viewed band fixed and choose position p.'],['改讀另一條完整光譜；灰階表示此波段訊號，不是 RGB 顏色。','Inspect another full spectrum; grayscale represents band signal, not RGB color.']),
    a('[data-fd-action="cubeMode"]',['切換兩種切片方式','Switch Slice Views'],'I(x,y,{λⱼ}) ↔ I({x_p,y_p},λ)',['選擇固定波長或固定位置的讀法。','Choose a fixed-wavelength or fixed-position view.'],['這是資料索引示意，沒有最佳化誤差。','This is data indexing, with no optimization error.'])
  ]);
  add('paper-rationale-playground','#paper-eq-6','h_A ≠ h_B, but Rh_A = Rh_B',['簡化響應 R 與共享的 RGB 固定。','The simplified R and common RGB stay fixed.'],['看見「RGB 相同」對光譜真實性的限制。','See the limit of matching RGB as evidence for spectral truth.'],[
    a('[data-field="amount"]',['改變光譜差異幅度','Change Spectral Difference'],'h_B = h_A + {Δh}; RΔh = 0',['沿不改變量測的方向調整兩條示意光譜的差異。','Adjust the illustrative spectral difference along a direction invisible to the measurements.'],['光譜可不同，但 RGB 差仍為 0；不是在證明其中一條是真值。','Spectra may differ while RGB error stays zero; neither curve is thereby proven true.'])
  ]);
  const splitActions=[
    a('[data-action="next"]',['查看下一張待評估影像','Inspect the Next Evaluation Image'],'Y⁽ᵗ⁾ = permitted training spectra for query image {t}',['更換影像編號 t。實際訓練集合須依所選條件決定；這個卡片示意不建立新字典。','Change image index t. Actual training data depend on the selected protocol; these schematic cards do not learn a dictionary.'],['完全留出時排除該圖光譜；同影像先驗條件則允許其中部分光譜。','Full holdout excludes its spectra; the same-image-prior condition permits some of them.']),
    a('[data-field="leak"]',['切換同影像先驗條件','Switch Same-Image Prior Availability'],'Y_train ← {allowed training spectra}',['改變可用的訓練集合，對比兩種不同實驗條件。','Change the available training collection to compare different experimental protocols.'],['開啟後是同影像先驗條件，不能再稱為完全留出；不模擬準確率。','With same-image priors, this is no longer full image holdout; no accuracy is simulated.'])
  ];
  add('paper-prior-playground','#paper-training-count','N_train = (100 − 1) × 1000',['每張抽樣數與此示意的六張卡片數固定。','The per-image sample count and six schematic cards stay fixed.'],['交代訓練誤差的資料 Y 從哪裡來。','Identify the data Y used by the training objective.'],splitActions);
  add('paper-comparison-playground','#concept-44','Y_train depends on the evaluation protocol',['原文 Table 2 的資訊條件及已報告結果固定。','The reported Table 2 conditions and results are fixed.'],['比較訓練集合的取得條件，不把它誤認為求 w 的公式。','Compare access to training data rather than mistake this for a w solver.'],splitActions);
  add('paper-ksvd-phases-playground','#fr-ksvd-loss',train,['Y 一直固定。','Y stays fixed.'],['對照目標式中哪些變數在這一階段更新。','Identify which variables of the objective change in each phase.'],[], 'alternating');
  add('paper-subtract-playground','#fr-ksvd-isolate','Eⱼ = Y − Σᵢ≠ⱼ dᵢxᵢ',['單樣本 y=(0.8,0.6)，其他貢獻 b=(0.2,0.3) 固定。','One sample y=(0.8,0.6) and other contribution b=(0.2,0.3) stay fixed.'],['逐步揭示扣除、限制樣本與加回貢獻。','Reveal subtraction, support restriction, and adding back other contributions.'],[], 'subtract');
  add('paper-ksvd-svd-playground','#fr-ksvd-update',rankone,['受限殘差向量 A、C 固定。','Restricted residual vectors A and C stay fixed.'],['讓共同原子方向與各樣本係數一起近似固定殘差。','Approximate fixed residuals with a shared direction and individual scales.'],[
    a('[data-lit-field="angle"]',['手動轉動共同方向','Rotate the Shared Direction'],'d(θ)=(cos {θ},sin {θ}); xₙ=d(θ)ᵀeₙ',['改原子方向 θ，程式同時重新算各筆投影係數。','Change atom direction θ while recomputing each projection coefficient.'],['看 Lⱼ 如何改變；手動旋轉不是執行完整 K-SVD 訓練。','Inspect Lⱼ; manual rotation does not execute full K-SVD training.']),
    a('[data-lit-key="best"]',['套用 SVD 最佳方向','Apply the Best SVD Direction'],'d = u₁; x = σ₁v₁ᵀ → min {Lⱼ}',['計算此固定矩陣的最佳秩一方向與係數。','Compute the best rank-one direction and coefficients for this fixed matrix.'],['目前平方差應接近最佳可達值，不代表整本字典全域最佳。','Current error should match the best attainable value, not global dictionary optimality.']),
    a('[data-lit-key="flip"]',['一起改變方向與係數的符號','Change Both Direction and Coefficient Signs'],'({−d})({−x}) = dx',['兩者一起反號，乘積不變。','Flip both signs while preserving their product.'],['重建與誤差應不變；原子正負號可有等價表示。','Reconstruction and error stay unchanged; signs can represent the same product.'])
  ]);
  add('paper-omp-playground','#fr-omp-select','select j → fit w_S → r = c_q − A_Sw_S',['c_q 與四個合成原子固定。','c_q and four synthetic atoms stay fixed.'],['一次按鈕完成一整輪 OMP，與上方逐子步驟算例不同。','One click completes a whole OMP round, unlike the substeps above.'],[
    a('[data-action="next"]',['完成下一輪 OMP','Complete the Next OMP Round'],'j = arg max |aᵢᵀr|; {w_S} = arg min_z ‖c_q−A_Sz‖²₂',['先選原子，再共同求權重，最後更新殘差。','Select an atom, jointly refit weights, and update the residual.'],['原子順序、所有已選權重與 RGB 殘差一起更新。','Selection order, all selected weights, and RGB residual update together.'])
  ]);
  add('paper-rmse-playground','#paper-rmse','RMSE = √[Σℓ(ĥℓ − hℓ)² / M]',['四個合成真值 h 及 M=4 固定。','Four synthetic references h and M=4 stay fixed.'],['逐項算出光譜評分，不在此訓練模型。','Calculate a spectral evaluation score without training a model.'],[
    a('[data-guide-field="error"]',['改變估計偏差','Change Estimate Deviation'],'RMSE = √[Σℓ({ĥℓ} − hℓ)² / 4]',['只改估計曲線的偏差大小；真值不動。','Change estimate deviation while holding truth fixed.'],['差值 → 平方 → 平均 → 開根號；這是光譜評分，不是 RGB 擬合誤差。','Difference → square → mean → square root: a spectral score, not RGB fit error.'])
  ]);
  add('paper-error-playground','#paper-rmse','absolute = |ĥ−h|; relative = |ĥ−h|/|h|',['比較規則固定；以下只看單一數值。','Comparison rules stay fixed; this is one value, not a dataset.'],['理解暗值為何可能有較大的相對誤差。','Understand why a dark reference can produce a larger relative error.'],[
    a('[data-field="brightness"]',['改變參考強度','Change Reference Intensity'],'relative = |δ| / |{h}|',['改 h，估計同時保持 ĥ=h+δ；可以固定 δ 比較。','Change h while keeping ĥ=h+δ; hold δ fixed for comparison.'],['相同絕對差下，h 越小相對比例越大。','At the same absolute difference, a smaller h gives a larger ratio.']),
    a('[data-field="error"]',['改變加入的差值','Change the Added Difference'],'ĥ = h + {δ}; relative = |δ|/|h|',['直接改人工差值 δ，不是在執行學習。','Change the synthetic difference δ rather than run learning.'],['同時看絕對差、相對比例與平方差；不是重算 Table 1。','Inspect absolute, relative, and squared error; Table 1 is not recalculated.'])
  ]);
  add('paper-results-playground','#paper-rmse','RMSE(condition) = reported Table 1 value',['作者已報告的十組結果固定。','All ten reported result rows stay fixed.'],['讀取不同實驗條件的結果與尺度。','Read results and scales for different experimental conditions.'],[
    a('[data-guide-field="result"]',['選擇實驗條件','Choose an Experimental Condition'],'RMSE({condition}) = Table 1 entry',['切換已報告的資料列，沒有重新學 D 或求 w。','Read another reported row without relearning D or fitting w.'],['比較相對與絕對 RMSE；兩者圖尺不同，不把 1−誤差叫準確率。','Compare relative and absolute RMSE on separate scales; 1−error is not an accuracy rate.'])
  ]);
  add('paper-camera-playground','#paper-eq-3','Δc = R_shift h − R_ref h',['調響應時 h 固定；改場景選項則另換 h。參考響應 R_ref 不動。','h stays fixed when shifting the response; choosing another scene changes h. R_ref stays fixed.'],['檢查響應模型失配為何使 RGB 預測改變。','Inspect how response-model mismatch changes predicted RGB.'],[
    a('[data-field="material"]',['更換合成場景光譜','Choose Another Synthetic Scene Spectrum'],'Δc = R_shift {h} − R_ref {h}',['替換被兩種響應模型共同量測的 h，不改響應偏移。','Replace h for both response models without changing the response shift.'],['比較同一條 h 在兩種模型下的 RGB 差；不是改材料標籤來預測準確率。','Compare both models on the same h; this does not predict accuracy from a material label.']),
    a('[data-field="shift"]',['移動響應模型','Shift the Response Model'],'Δc = {R_shift} h − R_ref h',['移動三個響應曲線的波長位置，不改 h。','Shift response curves in wavelength without changing h.'],['看 RGB 差值；此誤差是模型失配，不是已求得的光譜重建誤差。','Inspect RGB difference: model mismatch, not spectral reconstruction error.']),
    a('[data-field="lambda"]',['查看一個波長','Inspect One Wavelength'],'cₖ = Σⱼ Rₖ,{j} h_{j}',['只移動響應圖的讀取位置。','Move the response plot’s reading position only.'],['全部波段仍參與積分／加總，總 RGB 不因查看位置改變。','All bands remain included; inspected position does not change total RGB.'])
  ]);
  add('paper-conclusion-playground','#paper-eq-6','c = Rh; ĥ is selected using a prior',['RGB 的欠定關係固定。','The underdetermined RGB relation stays fixed.'],['檢查先驗假設能支持什麼結論。','Inspect which conclusions the prior assumptions support.'],[
    a('[data-field="low"]',['切換低維假設','Toggle Low-Dimensional Structure'],'h ∈ {structured candidate set}; c = Rh',['改變候選集合是否具有低維結構的假設。','Change the assumed structure of the candidate set.'],['這只更新推論說明，不計算資料集誤差或保證唯一性。','This changes the reasoning, not measured dataset error or a uniqueness guarantee.']),
    a('[data-field="rare"]',['切換少見同色異譜假設','Toggle Limited Metamerism'],'h_A ≠ h_B may still satisfy {Rh_A = Rh_B}',['改變先驗集合中量測碰撞是否常見的假設。','Change the assumption about collisions within the prior set.'],['量測相容與光譜真實仍需區分；開關不是新測量。','Measurement compatibility remains distinct from spectral truth; toggles are not measurements.'])
  ]);
  const subtractStages=[
    a('', ['先固定 y 與其他貢獻','Fix y and Other Contributions'],'{y} = b + d₁x₁ + residual',['辨認固定的量測與其他原子的貢獻。','Identify the fixed measurement and contributions from other atoms.'],['此時只揭示資料，尚未更新方向。','Only reveal the data; the direction has not been updated.']),
    a('', ['扣除其他貢獻','Subtract Other Contributions'],'{e₁} = y − b = (0.6,0.3)',['揭示兩個分量各自相減的結果。','Reveal the subtraction for both components.'],['量測 y 沒有被改寫。','Measured y is not rewritten.']),
    a('', ['限制到活躍樣本','Restrict to Active Samples'],'{E₁,Ω} = columns of E₁ with x₁,ₙ ≠ 0',['說明完整演算法只保留原本使用此原子的樣本欄。','Explain that the full algorithm retains columns already using this atom.'],['此單樣本切片不另執行完整多樣本 SVD。','This one-sample slice does not execute a full multi-sample SVD.']),
    a('', ['加回固定貢獻','Add Back Fixed Contributions'],'{ŷ} = b + d₁x₁',['展示更新後如何形成整筆重建。','Show how the updated contribution forms the full reconstruction.'],['下一個方向互動才操作多樣本的共同平方差。','Use the next direction model to inspect the shared multi-sample loss.'],'#fr-ksvd-update')
  ];
  const alternatingStages=[
    a('', ['查看稀疏編碼階段','Inspect the Sparse-Coding Phase'],'min_{W} ‖Y − Dₕ{W}‖²_F',['按鈕只高亮此階段應更新的 W，圖中 D 保持固定；不在此執行訓練。','The button highlights the W updated in this phase while D stays fixed; it does not train a model.'],['看更新／固定標籤，不把切換階段當作新的誤差結果。','Inspect updated/fixed labels; phase selection does not produce a new error result.'],'#fr-ksvd-loss'),
    a('', ['查看更新原子 1 的階段','Inspect the Atom-1 Update Phase'],'min_{d₁,x₁,Ω} ‖E₁,Ω − {d₁x₁,Ω}‖²_F',['高亮 d₁ 與它的活躍係數；其他貢獻固定。這是狀態示意。','Highlight d₁ and its active coefficients while other contributions stay fixed. This is a phase diagram.'],['此處沒有數值 SVD；下一個方向算例才計算平方差。','No numerical SVD is run here; the direction example below computes squared error.'],'#fr-ksvd-update'),
    a('', ['查看更新原子 2 的階段','Inspect the Atom-2 Update Phase'],'min_{d₂,x₂,Ω} ‖E₂,Ω − {d₂x₂,Ω}‖²_F',['高亮 d₂ 與它的活躍係數，說明逐原子更新的順序。','Highlight d₂ and its active coefficients to explain the atom-update sequence.'],['Y 從未改動；此階段圖不生成新的訓練結果。','Y never changes; this phase diagram does not generate a new training result.'],'#fr-ksvd-update')
  ];
  function stageRule(cfg,root){
    if(cfg.stages==='ksvd')return stagesK[Number(root.querySelector('.af-mount')?.dataset.afStep)||0];
    if(cfg.stages==='omp'){const s=Number(root.querySelector('.af-mount')?.dataset.afStep)||0;return s===0?a('', ['初始殘差','Initial Residual'],'{r} = c_q; S = ∅',['從零重建開始，因此殘差等於整個輸入。','Start with a zero reconstruction, so residual equals the input.'],['下一步才選原子，不能把起始誤差當成擬合結果。','Selection has not started; initial error is not a fitted result.'],'#fr-omp-residual'):[ompSelect,ompFit,ompResidual][(s-1)%3];}
    if(cfg.stages==='subtract')return subtractStages[Number(root.querySelector('.guide-step-track [aria-pressed="true"]')?.dataset.step)||0];
    if(cfg.stages==='alternating'){const phase=Number(root.querySelector('[data-lit-key="phase"][aria-pressed="true"]')?.dataset.litValue)||0;return alternatingStages[phase];}
    return cfg.actions[0];
  }
  const resetRule=cfg=>a('', ['重設此算例','Reset This Example'],cfg.formula,['恢復這個合成示意的初始設定；不代表論文重新訓練或得到新實驗結果。','Restore this synthetic demonstration’s initial settings; this is not new paper training or an experiment.'],['重新查看預設狀態的值，再開始比較。','Inspect the initial values again before comparing.']);
  const detailsRule=cfg=>a('', ['展開／收起計算明細','Expand / Collapse Calculation Details'],cfg.formula,['只改說明的可見性，不更動輸入、模型或係數。','Change explanation visibility without modifying inputs, model, or coefficients.'],['對照逐項計算；誤差不因展開表格而改變。','Inspect individual calculations; expanding a table does not change error.']);
  const isReset=el=>[el.dataset.afAction,el.dataset.guideAction,el.dataset.action,el.dataset.fdAction].includes('reset');
  function actionIndex(cfg,el){if(isReset(el))return -1;if(el.tagName==='SUMMARY')return -2;return cfg.actions.findIndex(r=>r.selector&&el.matches(r.selector));}
  function covered(cfg,el){
    if(isReset(el)||el.tagName==='SUMMARY'||cfg.actions.some(r=>r.selector&&el.matches(r.selector)))return true;
    if(['ksvd','omp'].includes(cfg.stages)){const action=el.dataset.afAction;if(['prev','next','play'].includes(action))return true;if(action==='stage'){const step=Number(el.dataset.afStep);return Number.isInteger(step)&&step>=0&&step<=(cfg.stages==='ksvd'?5:9);}}
    if(cfg.stages==='subtract'){const action=el.dataset.guideAction;if(['previous','next','play'].includes(action))return true;if(action==='step'){const step=Number(el.dataset.step);return Number.isInteger(step)&&step>=0&&step<=3;}}
    if(cfg.stages==='alternating'&&el.dataset.litKey==='phase')return ['0','1','2'].includes(el.dataset.litValue);
    return false;
  }
  const mark=s=>e(s).replace(/_\{([^{}]+)\}/g,'<sub><mark>$1</mark></sub>').replace(/_([A-Za-z]+)/g,'<sub>$1</sub>').replace(/\{([^{}]+)\}/g,'<mark>$1</mark>');
  const states=new Map();
  function paint(m){
    const rule=m.last===-1?resetRule(m.cfg):m.last===-2?detailsRule(m.cfg):Number.isInteger(m.last)&&m.last>=0?m.cfg.actions[m.last]:stageRule(m.cfg,m.root);if(!rule)return;
    const target=rule.target||m.cfg.target;
    m.panel.innerHTML=`<div class="pa-live" id="${m.cfg.id}-connection" data-i18n-skip><p class="eyebrow">${b(['操作 ↔ 公式','Action ↔ Equation'])}</p><h4>${b(rule.label)}</h4><div class="pa-formula">${mark(rule.formula)}</div><p class="pa-meaning" id="${m.cfg.id}-action-help">${b(rule.meaning)}</p><div class="pa-fixed"><strong>${b(['保持不變','Held Fixed'])}</strong>${b(m.cfg.fixed)}</div><div class="pa-watch"><strong>${b(['目的／要觀察的量','Purpose / What to Inspect'])}</strong>${b(rule.observe)}</div><a class="pa-equation-link" href="${target}">${b(['對照完整公式或定義 ↑','Open the Full Equation or Definition ↑'])}</a></div>`;
    decorate(m);
  }
  const controlSelector='button,input,select,summary';
  function decorate(m){m.root.querySelectorAll(controlSelector).forEach(el=>{
    if(el.closest('.pa-panel,.pa-catalog,.eq-film'))return;const has=covered(m.cfg,el);el.dataset.paCovered=String(has);if(!has)return;
    const idx=actionIndex(m.cfg,el);let r=idx===-1&&isReset(el)?resetRule(m.cfg):idx===-2?detailsRule(m.cfg):idx>=0?m.cfg.actions[idx]:stageRule(m.cfg,m.root);
    if(el.dataset.afStep!==undefined){const step=Number(el.dataset.afStep);r=m.cfg.stages==='ksvd'?stagesK[step]:step===0?stageRule(m.cfg,{querySelector:()=>({dataset:{afStep:'0'}})}):[ompSelect,ompFit,ompResidual][(step-1)%3];}
    if(m.cfg.stages==='subtract'&&el.dataset.guideAction==='step')r=subtractStages[Number(el.dataset.step)];
    if(m.cfg.stages==='alternating'&&el.dataset.litKey==='phase')r=alternatingStages[Number(el.dataset.litValue)];
    const move=el.dataset.afAction||el.dataset.guideAction;
    if(['prev','previous','next','play'].includes(move))r={formula:m.cfg.formula,label:move==='play'?['播放／暫停公式步驟','Play / Pause the Equation Steps']:move==='next'?['前往下一個公式步驟','Advance to the Next Equation Step']:['回看上一個公式步驟','Review the Previous Equation Step']};
    if(r){const lang=document.documentElement.dataset.language,label=lang==='zh'?r.label[0]:lang==='bilingual'?r.label[1]+' / '+r.label[0]:r.label[1];el.title=label+' — '+r.formula.replace(/[{}]/g,'');}
  });}
  function schedule(m){if(m.pending)return;m.pending=true;queueMicrotask(()=>{m.pending=false;paint(m);});}
  function initialize(){
    for(const cfg of configs){
      const root=document.getElementById(cfg.id);if(!root)throw new Error(`Missing mainline Playground: ${cfg.id}`);
      const panel=document.createElement('aside');panel.className='pa-panel';panel.dataset.i18nSkip='';root.querySelector(':scope > header').after(panel);
      const catalog=document.createElement('details');catalog.className='pa-catalog';catalog.dataset.i18nSkip='';catalog.innerHTML=`<summary>${b(['查看本 Playground 的全部操作對照','Inspect All Action–Equation Mappings'])}</summary><p>${b(cfg.goal)}</p>${[...(cfg.stages==='ksvd'?stagesK:cfg.stages==='omp'?[ompSelect,ompFit,ompResidual]:cfg.stages==='subtract'?subtractStages:cfg.stages==='alternating'?alternatingStages:[]),...cfg.actions].map(r=>`<article><strong>${b(r.label)}</strong><div class="pa-formula">${mark(r.formula)}</div><p>${b(r.meaning)}</p></article>`).join('')}<p>${b(['播放、上一步及下一步依目前階段揭示對應運算；重設恢復預設值。展開表格只改可見性。標示為資料讀取、假設或實驗條件的互動，不會被當作最佳化或新增的原文編號公式。','Playback, previous, and next reveal the equation for the current stage; reset restores defaults. Expanding a table changes visibility only. Data inspection, assumptions, and protocol controls are not presented as optimization or new numbered paper equations.'])}</p></details>`;panel.after(catalog);
      const m={cfg,root,panel,last:null,pending:false};states.set(cfg.id,m);paint(m);
      const observer=new MutationObserver(()=>schedule(m));root.querySelectorAll('.concept-lab-mount').forEach(mount=>observer.observe(mount,{childList:true,subtree:true,attributes:true,attributeFilter:['data-af-step','aria-pressed']}));
    }
    const handle=event=>{const el=event.target.closest(controlSelector),root=el?.closest('.paper-playground'),m=states.get(root?.id);if(!m||el.closest('.pa-panel,.pa-catalog,.eq-film')||el.disabled)return;const idx=actionIndex(m.cfg,el);m.last=idx>=0||idx===-1&&isReset(el)||idx===-2?idx:null;schedule(m);if(['input','change','click'].includes(event.type))queueMicrotask(()=>window.ReportProjection?.notify());};
    for(const name of ['input','change','click'])document.addEventListener(name,handle,true);
    document.addEventListener('reportlanguagechange',()=>states.forEach(schedule));
    document.addEventListener('reportdeepanchor',event=>{for(let el=document.getElementById(event.detail?.id);el;el=el.parentElement)if(el.tagName==='DETAILS')el.open=true;});
    window.ReportProjection?.register('playground-connections',{get:()=>Object.fromEntries([...states].map(([id,m])=>[id,m.last])),set:value=>{for(const [id,m] of states){const idx=value?.[id];m.last=Number.isInteger(idx)&&idx>=-2&&idx<m.cfg.actions.length?idx:null;paint(m);}}});
  }
  window.ReportPlayConnections={configs,stagesK,ompSelect,ompFit,ompResidual,subtractStages,alternatingStages,stageRule,covered,formatFormula:mark,initialize};initialize();
})();
