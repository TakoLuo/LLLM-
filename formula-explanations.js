/* Authored bilingual readings, grounded in the displayed models.
   No remote translation. A definition, forward calculation, fit and score have different roles. */
(() => {
  'use strict';
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const b=p=>`<span class="i18n-unit i18n-block" data-i18n-skip><span class="i18n-en" lang="en">${esc(p[1])}</span><span class="i18n-separator" aria-hidden="true"> / </span><span class="i18n-zh" lang="zh-Hant">${esc(p[0])}</span></span>`;
  const typeset=value=>esc(value).replace(/‖²_([F2])/g,'‖<sub>$1</sub><sup>2</sup>').replace(/_([A-Za-z0-9]+(?:,[A-Za-z0-9]+)?)/g,'<sub>$1</sub>').replace(/\^\(([^()<>]+)\)/g,'<sup>$1</sup>');
  const lessons={};
  const add=(id,title,purpose,symbols,steps,example,boundary)=>{lessons[id]={id,title,purpose,symbols,steps,example,boundary};};
  add('band',['波段位置與訊號讀值','Band Position and Signal Reading'],
    ['用中心與寬度標出波長區間，再讀曲線的高度。這是讀取與定義，沒有未知係數或誤差最小化。','Specify a wavelength interval from its center and width, then read the curve height. This is inspection and definition, with no coefficient fitting.'],
    [['λ₀、Δλ',['λ₀ 是中心波長；Δλ 是整個區間的寬度，單位都是 nm。Δ 表示差或變化，不是乘號。','λ₀ is the center wavelength and Δλ is the full interval width; both use nm. Δ denotes a difference or change, not multiplication.']],['h(λ₀)',['h 是光譜函數；括號表示在 λ₀ 讀值，不是 h 乘 λ₀。本示意用相對訊號尺度 a.u.。','h is a spectral function. Parentheses mean evaluate it at λ₀, not multiply h by λ₀. The illustration uses relative signal units, a.u.']]],
    ['寬度先除以 2；中心減去半寬得到左界，中心加上半寬得到右界。讀取點 h(λ₀) 的高度與這段區間的平均值不同。','Halve the width. Subtract it from the center for the lower bound and add it for the upper bound. The point value h(λ₀) differs from the interval average.'],
    ['中心 540 nm、寬度 50 nm：半寬 25 nm，所以區間是 515–565 nm。曲線高度要另外讀取。','For center 540 nm and width 50 nm, the half-width is 25 nm, giving 515–565 nm. Read the signal height separately.'],
    ['0.5 這類數字在本示意表示相對訊號，不自動等於 50% 反射率或某個物理光能。','A value such as 0.5 denotes relative signal here, not automatically 50% reflectance or a physical energy value.']);
  add('illumination',['照明、反射率與出射訊號','Illumination, Reflectance, and Outgoing Signal'],
    ['解釋相機收到的光如何同時取決於光源與材料；固定模型後逐波段正向計算。','Explain how incoming camera light depends on both source and material, using a bandwise forward calculation.'],
    [['E、ρ、S 或 h',['E 是入射照明，ρ 是反射比例，S 或 h 是朝相機傳去的光譜訊號。下標 j 是同一波段的編號。','E is incident illumination, ρ is the reflected fraction, and S or h is the outgoing spectral signal. Subscript j identifies the same band.']],['∝、=',['∝ 表示成正比，另有固定幾何等尺度因子。互動模型把該因子設成 1 才寫等號；不是一般情況下所有物理因素都消失。','∝ means proportional, with factors such as geometry held fixed. The illustrative model sets that factor to 1 to use equality.']]],
    ['在每個波段，把照明值乘以反射比例；同樣做完全部波段，再由相機響應加總為 RGB。','Multiply illumination by reflectance at each band. Repeat for all bands before applying the camera response to obtain RGB.'],
    ['某波段照明 0.8、反射比例 0.25，出射相對訊號就是 0.2。只把燈調為兩倍，該訊號也變兩倍。','With illumination 0.8 and reflectance 0.25, the relative outgoing signal is 0.2. Doubling only the lamp doubles this signal.'],
    ['這裡的乘積不是重建誤差；反射率有比例意義，照明與出射訊號則使用示意的相對尺度。','The product is not a reconstruction error. Reflectance is a fraction; illumination and outgoing signal use illustrative relative scales.']);
  add('camera',['相機的加權總和','The Camera’s Weighted Sum'],
    ['已知光譜與相機響應，算出 RGB；也可以把同一運算套在整本字典上。這一步沒有反推未知光譜。','Given a spectrum and response matrix, compute RGB; apply the same operation to a whole dictionary when needed. This step does not invert an unknown spectrum.'],
    [['h、R、c',['h 有 31 個波段值；R 是 3 × 31 的響應矩陣；c 是 3 × 1 的線性 RGB。R 這個矩陣不等於紅色通道本身。','h contains 31 band values; R is a 3 × 31 response matrix; c is 3 × 1 linear RGB. Matrix R is not the red channel alone.']],['j、k、i',['j 指波段，k 指 R/G/B 通道；若有 i，則指字典原子編號。cᵢ 是原子的 RGB，不是查詢像素 c_q。','j indexes bands, k indexes RGB channels, and i, when present, indexes dictionary atoms. cᵢ is an atom’s RGB partner, not query pixel c_q.']],['Σ、Rh、RDₕ',['Σ 表示把指定項相加。相鄰的矩陣表示矩陣乘法：同一列與同一欄逐項相乘再加總。D_RGB = RDₕ 逐欄處理所有原子。','Σ sums the specified terms. Adjacent matrices denote row-by-column multiplication and summation. D_RGB = RDₕ applies this to every atom column.']]],
    ['選一個通道；對 31 個波段各算「Rₖ,ⱼ × hⱼ」，再加起來。三個通道各做一次，得到三個輸出。','For one channel, calculate Rₖ,ⱼ × hⱼ at each of 31 bands and add the products. Repeat for all three channels.'],
    ['三波段算術例：訊號 (0.2, 0.5, 0.8)、通道權重 (0.1, 0.6, 0.3)，乘積為 0.02、0.30、0.24，總和 0.56。實際示意模型使用 31 項。','Three-band arithmetic example: signals (0.2, 0.5, 0.8) and weights (0.1, 0.6, 0.3) give products 0.02, 0.30, 0.24 and sum 0.56. The full illustrative model uses 31 terms.'],
    ['c 是線性量測，顯示用 Gamma 另算。波段乘積是通道貢獻；沒有真值比較時不能把它稱為 error。','c is a linear measurement; display gamma is separate. A band product is a channel contribution, not an error without a reference comparison.']);
  add('normalize',['相機權重的正規化','Normalizing Camera Weights'],
    ['把示意響應的總尺度固定，方便比較加權和；這是示意尺度選擇，不是由未知 RGB 自動校準相機。','Fix the scale of illustrative responses to compare weighted sums. This is a normalization convention used in this example, not camera calibration from unknown RGB.'],
    [['sₖ,ⱼ、R̃ₖ,ⱼ',['s 是未正規化響應；每項除以該通道全部波段響應的總和，得到 R̃。波浪符號提醒這是本例的正規化版本。','s is the unnormalized response. Dividing each entry by that channel’s total response gives R̃; the tilde identifies the normalized version used in this example.']],['Σⱼ、c̃ₖ',['Σⱼ 遍歷同一通道的全部波段。c̃ 是使用正規化權重的輸出，不能直接與另一種尺度的 c 混用。','Σⱼ runs over all bands in one channel. c̃ uses normalized weights and must not be mixed with c on another scale.']]],
    ['先加總 s；每項 s 除以總和，使整列權重加總為 1。用這些權重乘訊號再相加，等價於原始加權總和除以總響應。','Sum s, divide each entry by that total so the row sums to 1, then multiply by signals and sum. Equivalently divide the raw weighted sum by total response.'],
    ['響應 (1, 2, 1) 的總和是 4，正規化後為 (0.25, 0.50, 0.25)。若訊號為 (0.2, 0.6, 0.4)，輸出為 0.45。','Responses (1, 2, 1) sum to 4 and normalize to (0.25, 0.50, 0.25). Signals (0.2, 0.6, 0.4) then give 0.45.'],
    ['只有總響應不為零才能相除。選取部分波段時仍用原本的權重，不能重新正規化後假稱只是少加幾項。','Division requires nonzero total response. A partial band sum retains the original weights; renormalizing would change the calculation.']);
  add('partial',['完整和與部分和','Full Sums and Partial Sums'],
    ['拆開相機加總，查看哪些波段正在貢獻；勾選是在控制加總項，不是更換實體感測器。','Unpack camera summation to inspect included contributions. Checkboxes control terms in an illustrative sum, not the physical sensor.'],
    [['S、j ∈ S',['S 是已選波段的集合；j ∈ S 表示只加總集合內的項目。空集合沒有任何項，總和為 0。','S is the selected-band set; j ∈ S includes only its entries. An empty set has a sum of zero.']],['sₖ(S)、cₖ、R̃',['sₖ(S) 是通道 k 的部分和；cₖ 是全部波段的和。R̃ 是權重，與小寫部分和 s 不同。','sₖ(S) is channel k’s partial sum; cₖ includes every band. R̃ denotes weights and differs from lowercase partial sum s.']]],
    ['每個已勾波段先算權重乘訊號，再把乘積加起來。全部波段都加入時，部分和才等於完整輸出。','Multiply weight by signal at each checked band, then sum these products. The partial sum equals the full output only when every band is included.'],
    ['三項貢獻是 0.02、0.30、0.24；只選第 1 與第 3 項得到 0.26，全選則是 0.56。勾選順序不改答案。','With contributions 0.02, 0.30, 0.24, choosing terms 1 and 3 gives 0.26; all three give 0.56. Selection order does not matter.'],
    ['移動讀取線只查看一項，不會自動把它加入集合。部分和相等不能證明完整 RGB 相等。','Moving the reading line does not include a term. Matching partial sums do not establish matching full RGB.']);
  add('gamma',['線性訊號到顯示編碼','From Linear Signal to Display Encoding'],
    ['把本示意的線性通道值轉成 0–255 顯示整數；這不是論文的光譜反推或相機線性量測。','Convert an illustrative model’s linear channel value into a 0–255 display integer. This is display encoding, not spectral recovery or linear measurement.'],
    [['C_linear、C_display',['C_linear 是一個通道的線性輸入；C_display 是該通道的顯示整數。本顯示器先把輸入限制在 0–1。','C_linear is one linear channel input; C_display is its display integer. The preview first clips its input to 0–1.']],['1/2.2、255、round',['1/2.2 約 0.4545，是指次方，不是乘以 0.4545；255 是 8 位元顯示上限；round 是四捨五入。','1/2.2 is approximately 0.4545 and is an exponent, not a multiplier. 255 is the 8-bit display maximum; round rounds to the nearest integer.']]],
    ['先取 1/2.2 次方，再乘 255，最後四捨五入。直接乘 255 只做線性縮放，與先做次方不同。','Raise to the power 1/2.2, multiply by 255, and round. Multiplication by 255 alone is linear scaling and gives a different result.'],
    ['線性值 0.25：次方後約 0.5325，乘 255 約 135.79，最後為 136。若直接乘 255，則約為 64。','For linear value 0.25, the power gives about 0.5325; multiplying by 255 gives 135.79, rounded to 136. Direct scaling gives about 64.'],
    ['這是 Gamma 2.2 的近似示意；完整 sRGB 是分段函數。顯示整數不能直接代回線性式 c = Rh 當作同一種數值。','This approximates gamma 2.2; exact sRGB uses a piecewise function. Display integers cannot be substituted directly into linear c = Rh as equivalent values.']);
  add('cube',['資料立方體的索引與尺寸','Data-Cube Indexing and Shape'],
    ['說明一個數值存在哪個空間位置與波段；是資料的存取方式，沒有求解或誤差。','Locate a value by spatial position and band. This is data indexing, without optimization or error measurement.'],
    [['I(x,y,λⱼ)、h_p[j]',['I 是整個影像立方體；x、y 指畫面位置，λⱼ 指第 j 波段。p 標記一個像素，h_p[j] 是同一格的光譜讀值。','I is the image cube; x and y locate a pixel and λⱼ identifies band j. p labels a pixel; h_p[j] reads that same cube entry.']],['size(I)、H × W × B',['size 指尺寸；H、W 是空間高與寬，B 是波段數。此處 W 是寬度，與 K-SVD 的係數矩陣 W 不同。','size means shape: H and W are spatial height and width, B is band count. Here W is width, unlike the training coefficient matrix W.']]],
    ['固定位置，讀完所有波段，得到一條光譜；固定波段，讀完所有位置，得到一張單波段影像。','Fix a location and read all bands to get one spectrum. Fix a band and read all locations to get one band image.'],
    ['5 × 5 × 31 表示 25 個像素各有 31 個值，共存放 775 個訊號值；不是 775 個空間像素。','5 × 5 × 31 stores 31 values for each of 25 pixels: 775 signal entries, not 775 spatial pixels.'],
    ['切換切片只是讀同一份資料，不會新增量測或訓練模型。','Changing the slice reads existing data; it adds neither measurements nor model training.']);
  add('sampling',['波段合併與平均','Band Binning and Averaging'],
    ['用某段範圍內的多個取樣值形成代表值，觀察光譜解析度的取捨。','Form one representative value from samples in an interval to explore spectral-resolution trade-offs.'],
    [['bᵢ、h(λ)、mean',['bᵢ 是第 i 個合併波段的代表值；h(λ) 是原曲線讀值；mean 表示把區間內取樣值相加後除以取樣數。','bᵢ represents binned band i; h(λ) is a curve reading; mean adds the samples in the interval and divides by their count.']],['波段數、波段寬度',['取樣間隔、中心間距與量測寬度是不同量。只有等寬、無重疊且連續鋪滿範圍時，數量乘寬度才等於總涵蓋範圍。','Sampling interval, center spacing, and measurement width differ. Count times width gives total coverage only for equal, contiguous, nonoverlapping bands.']]],
    ['先決定區間，讀出其中的樣本，再相加除以樣本數。本頁的虛線由整理後節點插值，無法保證保留窄峰。','Choose the interval, collect its samples, then sum and divide by their count. The dashed curve interpolates the resulting nodes and may miss narrow peaks.'],
    ['區間內三個值為 0.2、0.5、0.8，總和 1.5，除以 3 得 0.5。平均值與輸入值使用同一尺度。','For samples 0.2, 0.5, 0.8, the sum is 1.5 and the average is 0.5, on the same scale as the input.'],
    ['這是離散平均範例，不是宣稱相機直接在每個波長均勻取樣；實體波段還有自己的響應形狀。','This is a discrete averaging example, not a claim of uniform sampling at every wavelength; physical bands have response profiles.']);
  add('scan',['掃描造成的時間位移','Temporal Displacement during Scanning'],
    ['把場景移動與掃描進度連起來，說明不同波段或位置可能在不同時間取得。','Relate scene motion to scan progress: bands or locations may be acquired at different times.'],
    [['Δx、v_rel、progress',['Δx 是畫面示意位移；v_rel 是滑桿指定的相對移動參數；progress 是累積的掃描進度。','Δx is schematic displacement, v_rel is a relative motion parameter, and progress is accumulated scan progress.']]],
    ['在固定移動參數下，每增加掃描進度就按比例增加位移。此處的進度與速度只形成示意，不是經校準的秒或公尺。','For fixed motion, increase displacement proportionally with progress. These controls are illustrative rather than calibrated seconds or meters.'],
    ['移動參數為 2，掃描進度由 1 到 3，示意位移由 2 變 6；因此同一物體可能在不同切片錯位。','With motion parameter 2, progress increasing from 1 to 3 changes displacement from 2 to 6, misaligning the object across slices.'],
    ['位移不是光譜重建誤差，也不能用這個示意推算論文相機的實際速度。','Displacement is not spectral reconstruction error and does not measure the paper camera’s acquisition speed.']);
  add('shift',['相機模型失配的差值','Difference Caused by Sensor-Model Mismatch'],
    ['固定同一光譜，比較兩組相機響應得到的 RGB；用來理解感測器模型為何重要。','Hold the spectrum fixed and compare RGB under two response models to understand sensor-model dependence.'],
    [['R_shift、R_ref、h',['R_shift 是偏移後的示意響應，R_ref 是參考響應，h 是同一條光譜。下標是模型標記，不是相乘。','R_shift is the shifted response, R_ref the reference response, and h the same spectrum. Subscripts label the models.']],['Δc、‖ · ‖₂',['Δc 是兩個三通道輸出的差向量；若顯示其長度，需將三項平方加總後開根號。','Δc is the difference of two RGB vectors. Its norm squares the three entries, adds them, and takes the square root.']]],
    ['分別算兩次矩陣乘法，將偏移輸出減去參考輸出；需要一個分數時，再計算差向量長度。','Compute both matrix products, subtract the reference output from the shifted output, and take the difference norm if a scalar score is needed.'],
    ['兩次 RGB 分別為 (0.4,0.5,0.2) 與 (0.3,0.5,0.2)，差為 (0.1,0,0)，長度為 0.1。','RGB outputs (0.4,0.5,0.2) and (0.3,0.5,0.2) differ by (0.1,0,0), with norm 0.1.'],
    ['比較的是相機輸出，不是估計光譜與真實光譜；此頁也沒有執行真實相機校準。','This compares camera outputs, not estimated versus true spectra, and does not calibrate a physical camera.']);
  add('rank',['量測數、秩與自由方向','Measurements, Rank, and Free Directions'],
    ['計算線性量測之後還有多少改變光譜而不改 RGB 的方向。這不是求某條最佳光譜。','Count directions that can change a spectrum without changing its linear measurements, rather than solve for a best spectrum.'],
    [['rank(R)',['R 的秩是獨立線性限制數。重複同一列不會增加獨立資訊；三列最多有秩 3。','rank(R) counts independent linear constraints. Duplicate rows add no independent information; three rows have rank at most 3.']],['ker R、dim、Δh',['ker R 是所有滿足 RΔh=0 的變化向量所成的零空間；dim 是它的維度。Δh 可以改變多個波段。','ker R is the null space of changes Δh satisfying RΔh=0; dim counts its dimensions. A change may involve many bands.']],['31 − rank(R)、≥',['31 是未知光譜座標數。減去秩得到零空間維度；≥ 表示大於或等於。','31 is the number of spectral coordinates. Subtracting rank gives null-space dimension; ≥ means greater than or equal to.']]],
    ['先數未知座標，再數獨立量測，兩者相減。若 R 是 3 × 31 且秩為 3，仍有 28 個線性自由方向。','Count unknown coordinates and independent measurements, then subtract. A rank-3, 3 × 31 matrix leaves 28 linear free directions.'],
    ['四個波段只有兩組平均時，可以讓第一個值加 0.1、第二個值減 0.1，原平均不變。另加一條重複平均仍無法看見這個改變。','With four bands and two pair averages, raising the first by 0.1 and lowering the second by 0.1 preserves the first average; repeating that average adds no clue.'],
    ['28 不是指定 28 個波段完全沒被量到。這是未加先驗與物理限制時的線性維度計算。','28 does not mean 28 particular bands are unmeasured. This counts linear dimensions before adding prior or physical restrictions.']);
  add('metamer',['同色異譜與零空間變化','Metamerism and Null-Space Changes'],
    ['建構不同光譜卻有相同線性 RGB 的例子，說明反推為何需要額外條件。','Construct different spectra with matching linear RGB to motivate additional recovery assumptions.'],
    [['h、q、α',['h 是基準光譜；q 是選好的變化方向；α 是變化幅度。此處 q 是方向向量，與 c_q 中標記查詢像素的下標 q 不同。','h is the baseline spectrum, q a chosen change direction, and α its amplitude. Here q is a vector, unlike query-pixel subscript q in c_q.']],['Rq=0、h_A、h_B',['Rq=0 表示相機對這種變化的三個加權和都是 0。h_A、h_B 標記兩條不同光譜，不是兩台相機。','Rq=0 means all three camera sums vanish for that change. h_A and h_B identify spectra, not cameras.']]],
    ['先算 R(h+αq)。利用線性拆成 Rh+αRq；因 Rq=0，第二項消失，所以輸出仍是 Rh。h−αq 同理。','Expand R(h+αq) as Rh+αRq by linearity. Since Rq=0, the change vanishes and the output remains Rh; the same holds for h−αq.'],
    ['兩波段平均權重 (0.5,0.5)，光譜 (0.3,0.7) 與 (0.4,0.6) 都得到 0.5。實際網頁另計算三個通道。','For average weights (0.5,0.5), spectra (0.3,0.7) and (0.4,0.6) both give 0.5. The full page separately computes three channels.'],
    ['必須挑到零空間方向，且變化後仍符合需要的訊號範圍。這不是任意兩條曲線都會同色。','The direction must lie in the null space and the changed spectra must remain in the required signal range. Arbitrary curves need not match.']);
  add('tolerance',['量測差距與容許門檻','Measurement Distance and Tolerance'],
    ['檢查兩條光譜在偏移的相機模型下是否仍難以區分；只改門檻不會重新訓練。','Check distinguishability under a shifted response model. Changing a threshold does not retrain anything.'],
    [['h_A−h_B、R_shift',['先求兩條光譜逐波段的差，再用偏移響應投影，得到三個 RGB 差值。','Subtract spectra band by band, then project through the shifted response to obtain three RGB differences.']],['‖ · ‖₂、ε、≤',['向量長度是平方和的平方根；ε 或 tolerance 是可接受差距；≤ 表示小於或等於。','The norm is the square root of summed squares; ε or tolerance is an acceptable distance; ≤ means at most.']]],
    ['依序相減、投影、算向量長度，再與門檻比較。門檻只改「是否可區分」的判斷，不改兩條光譜。','Subtract, project, take the norm, and compare with the threshold. The threshold changes the decision rather than the spectra.'],
    ['RGB 差向量為 (0.03,0.04,0)，長度是 0.05。若容許差 0.06，視為門檻內；改為 0.02，便超出。','RGB difference (0.03,0.04,0) has norm 0.05: within tolerance 0.06, but above tolerance 0.02.'],
    ['這是模型中的判別示意，不是已量測的人眼閾值，也不是高光譜重建 error。','This is a model threshold, not a measured human threshold or spectral reconstruction error.']);
  add('manifold',['用少數參數描述一條結構','Describing Structure with Few Parameters'],
    ['示範高維座標可能一起受少數參數控制，幫助理解自然光譜的低維先驗。','Show how many coordinates can depend on few parameters, motivating low-dimensional spectral priors.'],
    [['t、f(t)、h',['t 是位置參數；f 是把參數映到多個座標的函數；h 是產生的向量。括號表示函數求值。','t is a position parameter, f maps it to several coordinates, and h is the resulting vector. Parentheses denote function evaluation.']]],
    ['改一個 t，再依函數同時計算所有座標。曲線彎曲仍可只有一個內在參數；不要求它是直線。','Change t and recompute all coordinates together. A curved structure can have one intrinsic parameter without being a straight line.'],
    ['圓周用一個角度就能決定平面上的位置，但仍需要 x、y 兩個座標記錄。這是維度概念的類比。','One angle locates a point on a circle, even though its position has both x and y coordinates. This illustrates intrinsic dimension.'],
    ['一維結構不等於只有一個波段，也不代表已證明任何 RGB 都能唯一反推。','One intrinsic dimension is not one spectral band and does not prove unique inversion for every RGB.']);
  add('pca',['平均光譜加上少數方向','Mean Spectrum plus a Few Directions'],
    ['用固定平均與方向重建向量，理解線性降維與保留方向數的作用。','Reconstruct a vector from a fixed mean and directions to understand linear dimensionality reduction.'],
    [['μ、bᵢ、aᵢ',['μ 是平均光譜；bᵢ 是第 i 個方向；aᵢ 是該方向的係數。每個方向都有完整的波段數。','μ is the mean spectrum, bᵢ direction i, and aᵢ its coefficient. Every direction spans the full band count.']],['k、Σᵢ₌₁ᵏ、ĥ',['k 是保留方向數；Σ 把這 k 個加權方向相加；帽子表示估計向量。','k is the retained direction count; Σ adds the k weighted directions; the hat denotes an estimate.']]],
    ['先取平均向量，再把每個方向乘它的係數，最後逐座標加回平均。','Start with the mean, multiply each retained direction by its coefficient, and add the contributions coordinatewise.'],
    ['兩座標例：平均 (0.4,0.4)，方向 (1,−1)，係數 0.1，得到 (0.5,0.3)。完整光譜同樣逐波段相加。','Two-coordinate example: mean (0.4,0.4) plus coefficient 0.1 times direction (1,−1) gives (0.5,0.3). Spectra use the same bandwise addition.'],
    ['本頁方向與變異比例預先設定，不是即時 PCA 訓練；保留更多方向也不等於測得更多波段。','Directions and variances are predefined, not fitted by live PCA; retaining directions does not measure more bands.']);
  add('prior',['先驗與候選篩選','Priors and Candidate Selection'],
    ['先驗提供較合理的候選範圍。本頁最近範例計算只展示涵蓋範圍；論文使用的是字典與稀疏組合。','Priors restrict plausible candidates. Nearest-template calculations illustrate coverage; the paper instead uses learned dictionaries and sparse combinations.'],
    [['h ∈ prior、target',['∈ 表示屬於；h 是待比較的候選曲線，prior 是可用候選集合，target 是固定參考目標。','∈ means belongs to: h is a candidate curve, prior the available set, and target a fixed reference target.']],['arg min、RMSE、∩',['arg min 回傳誤差最小的候選，不是最小分數；RMSE 衡量曲線差距；∩ 表示同時符合多個集合條件。','arg min returns the minimizing candidate, not its score; RMSE measures curve differences; ∩ denotes satisfying several set conditions together.']]],
    ['先選候選集合，再用相同波段與尺度算每條曲線的 RMSE，選分數最低者。假設開關只改示意候選，不會自動學字典。','Choose the candidate set, score every curve using the same bands and scale, and select the lowest RMSE. Assumption switches do not learn a dictionary.'],
    ['兩個候選與目標的 RMSE 為 0.10、0.04，就選第二個。若目標材料不在先驗中，最低分仍可能很差。','For candidate RMSEs 0.10 and 0.04, choose the second. A missing target material can still make the best available candidate poor.'],
    ['候選點數不是求解器證明的答案數。低維與少見同色異譜是資料假設，並非對所有場景的保證。','Illustrative dot counts are not solver-certified solution counts. Low dimensionality and rare metamers are dataset assumptions, not universal guarantees.']);
  add('samplecount',['訓練影像、樣本與原子數','Training Images, Samples, and Atom Count'],
    ['計算訓練資料的筆數或抽樣組成；這不是字典原子數，也不是光譜誤差。','Count training samples or their composition, rather than dictionary atoms or reconstruction error.'],
    [['N_train、100−1、1,000',['主實驗一輪先從 100 張影像留出 1 張，再從其餘各抽 1,000 條像素光譜。N_train 是總抽樣數。','A main-experiment round holds out one of 100 images and samples 1,000 pixel spectra from each remaining image. N_train counts these samples.']],['N_object、N_background',['抽樣示意格子分為物體與背景；兩類數量相加是該次抽樣總數，不是兩類材料的光譜平均。','Illustrative samples are classified as object or background; their counts sum to the sample total, not a mean spectrum.']]],
    ['先確定哪些完整影像可訓練，再乘上每張抽樣數。隨機抽樣時，分別數物體與背景。','Determine eligible whole training images before multiplying by samples per image. Count object and background samples separately in the sampling demonstration.'],
    ['(100−1) × 1,000 = 99,000 條訓練光譜，每條有 31 個值；之後學的是 500 個原子的字典。','(100−1) × 1,000 gives 99,000 training spectra with 31 values each; these subsequently train a 500-atom dictionary.'],
    ['均勻抽像素不保證每種材料都有足夠樣本；大量背景會影響先驗的組成。','Uniform pixel sampling does not ensure enough samples of every material; large backgrounds affect prior composition.']);
  add('dictionary',['完整光譜原子與字典尺寸','Complete Spectral Atoms and Dictionary Shape'],
    ['定義可供線性組合的代表向量；字典大小、波段數與使用原子數是三件不同的事。','Define representative vectors for linear combinations, separating dictionary size, band count, and used-atom count.'],
    [['Dₕ=[h₁ … hₙ]、hᵢ',['方括號表示把原子排成欄；hᵢ 是第 i 條完整光譜原子。花括號版本表示收錄這些原子的集合。','Brackets arrange atoms as columns; hᵢ is complete spectral atom i. The brace notation denotes their collection.']],['n、d、ℝᵈ',['n 是原子總數，d 是每個原子的座標數。∈ 表示屬於，ℝᵈ 是由 d 個實數構成的向量集合；實驗用 d=31、n=500。','n counts atoms and d their coordinates. ∈ means belongs to; ℝᵈ is the set of d-real-number vectors. The experiments use d=31, n=500.']]],
    ['先讀一欄的全部波段，再選另一欄比較。31 × 500 表示 31 個波段列與 500 個原子欄。','Read all bands of one column before comparing another. Shape 31 × 500 means 31 band rows and 500 atom columns.'],
    ['從 500 個原子選 3 個，只代表這次有 3 個非零係數；三個原子各自仍有 31 個值，輸出也仍有 31 個值。','Choosing 3 of 500 atoms means 3 nonzero coefficients. All selected atoms, and their resulting sum, still have 31 values.'],
    ['原子是從訓練光譜學出的素材，不必恰好等於某個原始像素。數字 28 的原文設定另有措辭疑點，不能當成波段數或固定三原子的證明。','Atoms are learned from training spectra and need not equal original pixels. The paper’s wording around setting 28 is ambiguous; it is not band count or proof of a fixed three-atom rule.']);
  add('sparse',['稀疏加權組合','Sparse Weighted Combinations'],
    ['用少數完整原子的加權和表示一條光譜。先驗是「合理光譜能以少數原子近似」，不是把波段刪掉。','Represent a spectrum using a few complete weighted atoms. The prior concerns sparse representation, not deleting bands.'],
    [['Dₕ、dᵢ、wᵢ、ĥ',['Dₕ 是固定字典，dᵢ 是其中一欄；wᵢ 是該原子的倍率；ĥ 是所有貢獻相加後的估計。','Dₕ is the dictionary, dᵢ one column, wᵢ its scale, and ĥ the summed estimate.']],['‖w‖₀、s',['‖w‖₀ 是非零係數個數；下標 0 在這裡是計數記號。s 是允許使用的原子上限，與總原子數不同。','‖w‖₀ counts nonzero coefficients; subscript 0 is a counting convention. s is the usage limit, distinct from total dictionary size.']]],
    ['對每個波段，將各原子在該波段的值乘各自係數，再相加。係數為 0 的原子不貢獻；同一係數用於該原子的全部波段。','At every band, multiply each atom’s band value by its coefficient and sum. Zero coefficients omit atoms; each atom uses the same coefficient at all bands.'],
    ['某波段原子值是 0.4、0.3，係數是 0.5、0.2，兩項貢獻是 0.20、0.06，輸出 0.26。','Atom values 0.4 and 0.3 with coefficients 0.5 and 0.2 contribute 0.20 and 0.06, totaling 0.26.'],
    ['係數不一定非負或加總為 1，不能直接當作材料比例；手動調係數也不等於執行 OMP。','Coefficients need not be nonnegative or sum to 1 and are not material fractions. Manual coefficient changes are not OMP.']);
  add('ksvd',['K-SVD 的訓練目標','K-SVD Training Objective'],
    ['整體目標是用少數原子重建訓練光譜。若公式只寫 min_W，這一子步暫時固定 D；若列出 D、W，則描述整體要學的兩組量。Y 始終固定。','The overall aim is sparse reconstruction of training spectra. If only W appears under min, this substep holds D fixed; listing D and W describes both learned quantities overall. Y always stays fixed.'],
    [['Y、D 或 Dₕ、W、wₙ',['Y 的每欄是訓練光譜；D 的每欄是原子；W 的每欄 wₙ 是第 n 個樣本的係數。xᵢ 則是 W 的第 i 橫列。','Y stores sample columns, D atom columns, and W coefficient columns wₙ for samples n. xᵢ is instead coefficient row i across samples.']],['min、‖Y−DW‖²_F',['min 表示調整下標列出的變數，使分數盡量低；分數把全部波段與樣本的重建差平方後相加。F 是整個矩陣的 Frobenius 範數。','min adjusts the listed variables to lower the score: sum squared reconstruction differences over every band and sample. F denotes the matrix Frobenius norm.']],['s.t.、‖wₙ‖₀≤s、‖dᵢ‖₂=1',['s.t. 表示必須符合限制；每筆最多 s 個非零係數；原子長度固定為 1 以控制尺度，不是係數和為 1。','s.t. means subject to constraints: at most s nonzeros per sample and unit atom length to fix scale, not coefficients summing to 1.']]],
    ['固定 D 找稀疏 W；再逐個更新原子與使用它的係數。每次都比較同一份 Y 與目前 DW，不能改量測來讓 error 變小。','Fix D to fit sparse W, then update each atom with its active coefficients. Always compare the same Y against current DW; never edit measurements to reduce error.'],
    ['一個量測是 0.30、重建是 0.25，差 0.05，平方為 0.0025。總訓練誤差要再加上其他波段及其他樣本的平方差。','A measurement 0.30 and reconstruction 0.25 differ by 0.05 and contribute squared error 0.0025. Add all other bands and samples for total loss.'],
    ['訓練誤差下降只說明對這批訓練資料的擬合改善；不自動保證全域最佳或新影像的光譜準確。','Lower training loss improves fitting on these training data; it does not establish global optimality or new-image accuracy.']);
  add('isolate',['扣除其他原子的貢獻','Subtracting Other Atoms’ Contributions'],
    ['更新原子 j 前，先分離它需要解釋的資料；這一步只是相減，尚未降低完整重建誤差。','Before updating atom j, isolate its assigned data. This subtraction alone does not lower full reconstruction error.'],
    [['Eⱼ、Y、dᵢxᵢ',['Y 是固定訓練資料；dᵢxᵢ 是原子 i 對所有樣本的外積貢獻，與 Y 同尺寸；Eⱼ 是扣除其他貢獻後的矩陣。','Y is fixed training data. Outer product dᵢxᵢ contributes atom i across all samples and has Y’s shape. Eⱼ remains after subtracting other contributions.']],['Σᵢ≠ⱼ、Ω、Eⱼᴿ',['Σᵢ≠ⱼ 只加其他原子，刻意不扣 j。Ω 是原本使用 j 的樣本名單；上標 Ω 或本例的 R 標記取出那些欄，不是次方或相機 R。','Σᵢ≠ⱼ sums other atoms, excluding j. Ω lists samples already using j. Superscript Ω or superscript R used in this example selects those columns; it is not a power or camera matrix R.']]],
    ['保留 Y；固定其他原子與係數並算它們的合計；用 Y 減掉該合計。再取 Ω 的樣本欄，交給單一原子更新。','Keep Y, hold other atoms and coefficients fixed, subtract their combined contribution, then restrict to Ω columns for the atom update.'],
    ['某樣本 y=(0.8,0.6)，其他貢獻 b=(0.2,0.3)，剩下 e=(0.6,0.3)。原量測 y 完全不變。','For y=(0.8,0.6) and other contributions b=(0.2,0.3), the remaining e=(0.6,0.3). Measured y is unchanged.'],
    ['Eⱼ 不是完整殘差 Y−DW：它還包含原子 j 需要負責的部分。樣本編號 i 與波段編號 j 的用法依此處公式定義，不能跨式硬套。','Eⱼ differs from full residual Y−DW because it retains atom j’s contribution. Index roles depend on the local formula; do not transfer them blindly between conventions.']);
  add('svd',['單一原子的秩一更新','Rank-One Update of One Atom'],
    ['對固定的活躍殘差矩陣，尋找一個共同方向及各樣本的倍率，讓其平方差最小。','For a fixed active residual matrix, find one shared direction and sample scales minimizing squared error.'],
    [['E、d、x、Ω',['E 是扣除其他原子後的活躍樣本欄；d 是要改的共同原子，x 是這些樣本的係數橫列。Ω 是參與更新的樣本名單。','E contains active residual columns after other atoms are removed. d is the shared atom, x the sample-coefficient row, and Ω the active sample set.']],['UΣVᵀ、u₁、σ₁v₁ᵀ',['SVD 把矩陣分成方向、尺度與樣本組合。第一組 u₁ 是新單位方向，最大奇異值 σ₁ 乘 v₁ᵀ 給出各樣本的倍率；T 是轉置。','SVD factors the matrix into directions, scales, and sample combinations. Leading u₁ gives the unit direction; leading σ₁ times v₁ᵀ gives sample scales; T is transpose.']],['←、‖E−dx‖²_F、d(θ)',['← 表示用新值更新；分數比較殘差欄與 d 乘各自倍率。d(θ) 表示以角度 θ 指定候選方向，並重新計算投影係數。','← assigns an update. The loss compares residual columns with scaled copies of d. d(θ) specifies a candidate direction by angle and refits projection coefficients.']]],
    ['只取原本非零的樣本；對受限 E 做 SVD，保留第一組成分，同時更新 d 與 x。方向示意中，係數為 dᵀe，投影為 d(dᵀe)。','Restrict to already active samples, compute the SVD, and keep its leading component to update d and x together. In the direction example, the coefficient is dᵀe and projection is d(dᵀe).'],
    ['固定 e=(0.6,0.3)，候選 d=(1,0) 時係數 0.6，重建 (0.6,0)，平方差 0.09。若只有這筆樣本，改用沿 e 的單位方向就能精確表示它。多樣本需共同折衷。','For e=(0.6,0.3) and d=(1,0), coefficient 0.6 gives reconstruction (0.6,0) and squared error 0.09. A single sample can be fit exactly along its own unit direction; multiple samples require a shared compromise.'],
    ['最佳秩一近似只解當前受限子問題，不是整本字典的全域最佳。原子與係數同時翻轉正負號也不改乘積。','Best rank-one approximation solves only this restricted subproblem, not global dictionary training. Flipping atom and coefficient signs together preserves their product.']);
  add('ompselect',['OMP 如何選原子編號','How OMP Selects an Atom Index'],
    ['固定字典與目前殘差，選出最能沿殘差方向解釋資料的候選編號；此步還沒有求新權重。','Fix the dictionary and residual, then choose a candidate aligned with the residual. This step does not fit the new weight.'],
    [['aᵢ、r、S',['aᵢ 是候選原子向量；r 是輸入減去目前重建；S 是已選編號集合；i∉S 表示不得重選。','aᵢ is a candidate vector, r is input minus reconstruction, and S contains selected indices; i∉S excludes previously selected atoms.']],['aᵢᵀr、| · |、‖aᵢ‖₂',['T 把欄轉橫列，內積將對應項相乘相加；絕對值衡量正或反方向的相關；除以原子長度可避免尺度占優。','Transpose T enables an inner product: multiply matching entries and sum. Absolute value includes either sign; division by atom length removes scale advantage.']],['arg max、j、score',['score 是候選分數；max 是最大分數，arg max 回傳取得它的編號 j。原子已是單位長度時，分母為 1 可省略。','score is a candidate score; max is the largest score, whereas arg max returns its index j. Unit-length atoms have denominator 1, which can be omitted.']]],
    ['對每個未選的有效原子計算正規化絕對內積，選最高者，把編號加入 S；下一步才共同擬合權重。','Compute normalized absolute inner products for eligible atoms, add the highest-scoring index to S, then jointly fit weights in the next step.'],
    ['若 r=(0.6,0.8)，兩個單位候選是 (1,0)、(0,1)，分數為 0.6、0.8，所以選第 2 個編號。','For r=(0.6,0.8), unit candidates (1,0) and (0,1) score 0.6 and 0.8, so select index 2.'],
    ['零向量不能參選。這是貪婪選擇，不會枚舉所有原子組合；網站的 4→3→1 不是普遍固定順序。','Zero vectors are ineligible. This greedy step does not enumerate every subset; the site’s 4→3→1 order is not universal.']);
  add('ompfit',['OMP 共同擬合與殘差','OMP Joint Fitting and Residual'],
    ['固定輸入與已選字典，重新求出整組係數，使重建接近輸入。','Hold the input and selected dictionary fixed and refit all selected coefficients to approximate the input.'],
    [['A、A_S、z、w_S',['A 是固定字典；A_S 只取已選原子欄；z 是正在嘗試的整組係數；w_S 是最後選出的係數。新舊係數一起求。','A is the dictionary, A_S its selected columns, z a candidate coefficient vector, and w_S the fitted result. Old and new weights are solved together.']],['arg min、c 或 c_q、ĉ',['c 是已知 RGB，ĉ=A_Sz 是候選重建。min 回傳最小誤差；arg min 回傳產生該誤差的係數。','c or c_q is known RGB and ĉ=A_Sz a candidate reconstruction. min returns the smallest error; arg min returns the coefficients achieving it.']],['r、L_RGB、‖r‖₂²、‖r‖₂',['r=c−ĉ 是三個通道的差向量；L_RGB 是三項差平方的總和；殘差長度則是它的平方根，兩個數不相同。','r=c−ĉ is a three-channel residual. L_RGB sums its squared entries; residual norm is the square root of that sum, a different number.']]],
    ['對已選原子做最小平方擬合，計算重建，再用輸入減去重建。加入新原子後應重算全部已選係數。','Fit least squares on selected atoms, form the reconstruction, and subtract it from the input. Adding an atom requires refitting all selected coefficients.'],
    ['c=(0.62,0.46,0.28)，ĉ=(0.60,0.47,0.27)，r=(0.02,−0.01,0.01)，平方和 0.0006，長度約 0.024495。','For c=(0.62,0.46,0.28) and ĉ=(0.60,0.47,0.27), r=(0.02,−0.01,0.01), squared loss is 0.0006, and norm is about 0.024495.'],
    ['最佳只針對目前已選子集；小 RGB error 不等於小光譜 error。此原理在 K-SVD 內也可用來擬合訓練光譜，此時輸入空間不同。','Optimality is within the selected subset. Small RGB error does not establish small spectral error. Inside K-SVD the same fitting principle can instead use training spectra.']);
  add('ompstop',['停止條件與正交檢查','Stopping Rules and Orthogonality'],
    ['決定是否再選原子，或檢查已選子集的最小平方解；不會因停止就證明真實光譜。','Decide whether to select another atom or check the selected-subset fit. Stopping does not prove spectral truth.'],
    [['ε、s、|S|',['ε 是容許殘差長度，s 是原子使用上限；|S| 在集合上表示已選數量，與數值上的絕對值用途不同。','ε is the residual-norm tolerance, s the atom budget, and |S| the set’s size, unlike absolute value applied to a scalar.']],['‖r‖₂≤ε、|S|≥s、aᵀr≈0',['殘差夠小或達到預算就停止；有效方向用完也會停止。最小平方殘差與已選原子正交，所以內積約為 0。','Stop when the norm is small enough, the budget is reached, or useful directions are exhausted. A least-squares residual is orthogonal to selected atoms, giving near-zero inner products.']]],
    ['先算當前殘差長度，再比較 ε 與原子數限制。正交檢查則將選過的原子與殘差做內積。','Compute the residual norm and compare it with ε and the atom budget. For orthogonality, take inner products with selected atoms.'],
    ['殘差長度 0.03、ε=0.05 時已達門檻；若長度 0.08，但已選數量達上限 2，也可能帶著剩餘誤差停止。','Norm 0.03 meets ε=0.05. Norm 0.08 may still stop if the selected count has reached budget 2, leaving error.'],
    ['ε 的具體值須依實作設定，不能把範例門檻當成論文未報告的參數；正交也不代表已選子集全域最佳。','The tolerance is implementation-dependent, not an unreported paper parameter. Orthogonality does not establish globally optimal subset selection.']);
  add('transfer',['同權重轉移與回投影','Coefficient Transfer and Reprojection'],
    ['把 RGB 階段求得的同一組係數套回光譜字典，再驗算量測一致性。','Reuse RGB-fitted coefficients in the spectral dictionary and check measurement consistency.'],
    [['Dₕ、D_RGB、w、ĥ_q',['兩本字典逐欄配對，D_RGB=RDₕ；w 是上一步求得的同一組係數；ĥ_q 是估計光譜，帽子區分估計與真值。','The paired dictionaries satisfy D_RGB=RDₕ. w is the same fitted vector and ĥ_q the estimated spectrum; a hat distinguishes estimate from truth.']],['R(Dₕw)=(RDₕ)w、≈',['利用矩陣乘法結合律，先組合再投影與先投影再組合相同。若 RGB 擬合近似，與 c_q 的關係也只能近似。','Associativity makes combine-then-project equal project-then-combine. If RGB fitting is approximate, agreement with c_q is approximate too.']]],
    ['逐波段算 Dₕw；再用 R 投影輸出。分開看「與輸入 c_q 的差」及「兩條等價運算路徑的差」。','Compute Dₕw band by band, then apply R. Distinguish disagreement with input c_q from disagreement between algebraically equivalent paths.'],
    ['若兩個原子的權重是 0.5、0.2，就將同樣的 0.5、0.2 用於每個波段；不能在紅光波段另外換一組權重。','Weights 0.5 and 0.2 apply at every band; do not choose separate weights for the red-light bands.'],
    ['Rĥ≈c 只檢查 RGB 相容；Rĥ≈D_RGBw 主要檢查代數實作。兩者皆不能取代 ĥ 與獨立真值 h 的比較。','Rĥ≈c checks RGB fit; Rĥ≈D_RGBw checks algebraic implementation. Neither replaces comparing ĥ with independent spectral truth h.']);
  add('rmse',['光譜 RMSE 的計算與意義','Calculating and Interpreting Spectral RMSE'],
    ['比較估計與獨立光譜真值，得到評分。此處固定兩份資料，沒有更新字典或係數。','Score estimated spectra against independent truth. Both arrays stay fixed; this calculation does not update dictionaries or coefficients.'],
    [['ĥℓ、hℓ、M、ℓ',['ĥℓ 與 hℓ 是同一位置的估計值與真值；ℓ 遍歷比較項，M 是項目總數。評估範圍可以是一條光譜或多個像素，必須先說明。','ĥℓ and hℓ are matching estimate and reference entries; ℓ indexes comparisons and M counts them. Define whether the scope is one spectrum or many pixels.']],['Σ、1/M、√、( · )²',['差值平方後相加，除以 M 是平均，√ 是開平方根，讓結果回到訊號原本的單位或尺度。','Square the differences, sum, divide by M to average, and take the square root to return to the signal’s units or scale.']]],
    ['確認波段與尺度一致；相減 → 平方 → 加總 → 除以項目數 → 開根號。正負差不能在平方前互相抵銷。','Align bands and scale, then subtract → square → sum → divide by count → square-root. Signed errors must not cancel before squaring.'],
    ['四個差為 (0.1,−0.1,0,0)，平方總和 0.02；除以 4 得 0.005；開根號約 0.07071。','Differences (0.1,−0.1,0,0) have squared sum 0.02; dividing by 4 gives 0.005; the square root is about 0.07071.'],
    ['沒有真值就不能算這個光譜分數。不同資料縮放、平均方式與評估範圍的 RMSE 不應直接混比。','This spectral score requires truth. RMSEs with different scaling, aggregation, or evaluation scopes are not directly interchangeable.']);
  add('errors',['絕對、相對與平方誤差','Absolute, Relative, and Squared Error'],
    ['用不同方式描述同一個估計差距，理解暗值為何可能有較大的相對誤差。','Describe one estimation discrepancy in different ways and understand large relative errors for dark references.'],
    [['h、ĥ、δ',['h 是真值，ĥ 是估計；δ=ĥ−h 是帶正負號的差。本互動讓估計等於 h 加固定 δ。','h is truth, ĥ the estimate, and δ=ĥ−h the signed difference. This interaction sets the estimate to h plus fixed δ.']],['|δ|、|δ|/|h|、δ²',['絕對誤差去掉正負號；相對誤差再除以真值大小，乘 100% 才是百分比；平方誤差把差值乘自己。','Absolute error removes the sign. Relative error divides by reference magnitude; multiplying by 100% expresses it as a percentage. Squared error multiplies the difference by itself.']]],
    ['先相減，再依要回答的問題選擇絕對值、相對比例或平方。單一項平方差不是整個資料集的 RMSE。','Subtract first, then choose magnitude, relative ratio, or square according to the question. One squared error is not a dataset RMSE.'],
    ['h=0.2、ĥ=0.3：差 0.1、絕對誤差 0.1、相對誤差 0.5 即 50%、平方誤差 0.01。','For h=0.2 and ĥ=0.3: difference 0.1, absolute error 0.1, relative error 0.5 or 50%, and squared error 0.01.'],
    ['真值為 0 時上述相對比值沒有定義；真值很小時比值也會很敏感。','This relative ratio is undefined at zero reference and sensitive near zero.']);
  add('repeat',['多次結果的平均與標準差','Mean and Standard Deviation across Runs'],
    ['把多次結果的中心與波動分開描述；重新抽樣只更新合成示意，不重現作者實驗。','Separate the center of repeated results from their spread. Resampling updates synthetic examples, not the authors’ experiments.'],
    [['xᵢ、N、mean',['xᵢ 是第 i 次結果，N 是結果總數；mean 是加總後除以 N 的平均。此處 x 不是 K-SVD 的係數列。','xᵢ is outcome i and N the outcome count; mean is their sum divided by N. Here x differs from K-SVD coefficient rows.']],['SD、√、(xᵢ−mean)²',['每次結果減平均，平方後相加、除以 N，再開根號，得到本頁的母體形式標準差。樣本估計常用 N−1，定義不同。','Subtract the mean, square, sum, divide by N, then square-root for this page’s population-form SD. A sample estimator often uses N−1 instead.']]],
    ['先算平均，再算每次結果離平均的距離，最後平方、平均、開根號。不能先開根號再平均。','Compute the mean first, then deviations, followed by squaring, averaging, and square-rooting.'],
    ['兩次值 0.1、0.3：平均 0.2，兩個偏差為 −0.1、0.1，平均平方偏差 0.01，SD=0.1。','For outcomes 0.1 and 0.3, mean is 0.2; deviations −0.1 and 0.1 have mean square 0.01, giving SD 0.1.'],
    ['SD 表示跨次結果的波動，不等於某條光譜每個波段的重建誤差。','SD measures variation across outcomes, not bandwise reconstruction error within one spectrum.']);
  add('errormap',['誤差圖與平均值','Error Maps and Their Means'],
    ['區分某個像素的誤差位置與全圖平均，避免只看一個平均就認為所有位置都準確。','Distinguish spatial error locations from an image average; a single mean does not describe every pixel.'],
    [['error(p,j)、N_pixels',['error(p,j) 是像素 p 在波段 j 的誤差讀值；N_pixels 是納入平均的像素數。','error(p,j) is the error at pixel p and band j; N_pixels counts included pixels.']],['Σ_p / N_pixels',['固定波段 j，將每個像素的誤差值相加後除以像素數。這不等於對有正負號的原始光譜差先取平均。','At fixed band j, add the pixel error values and divide by the pixel count. This differs from first averaging signed raw spectral differences.']]],
    ['先固定波段，查看空間誤差分布，再讀平均；切換波段會換另一張誤差切片。','Fix a band, inspect spatial errors, and then read the mean. Changing the band selects another error slice.'],
    ['誤差 (0,0,0.3) 與 (0.1,0.1,0.1) 的平均都是 0.1，但前者集中在一個位置，後者分散。','Errors (0,0,0.3) and (0.1,0.1,0.1) both average 0.1, but have different spatial concentration.'],
    ['本頁是合成誤差圖，顏色不是原論文的實測誤差分布。','This is a synthetic error map, not the paper’s measured error distribution.']);
  add('holdout',['訓練、留出與同圖先驗','Training, Holdout, and Same-Image Priors'],
    ['定義每輪能使用哪些資料；這是實驗協定，並非誤差最佳化公式。','Specify which data each round may use. This is an experimental protocol, not an optimization equation.'],
    [['train、test、HSI',['train 是學字典用的影像；test 是整張留出的影像；HSI 是可用於訓練或最後評分的高光譜資料，角色必須分開。','train images learn the dictionary; test is a held-out whole image. HSI may train a model or score its output; distinguish those roles.']],['10,000、≈3.8%',['Yasuma 比較允許每張測試場景提供 10,000 筆高光譜先驗，約占該影像像素 3.8%；不是重建誤差百分比。','The Yasuma comparison permits 10,000 same-scene HSI samples, about 3.8% of image pixels; this is not an error percentage.']]],
    ['一輪先選測試圖，從其他圖學新字典，用測試 RGB 重建，最後才用保留的測試 HSI 評分。下一輪重新分配並獨立準備。','Choose a test image, learn a new dictionary from the others, reconstruct test RGB, and only then score using held-out HSI. Each round is prepared independently.'],
    ['三張圖 A/B/C：第一輪用 A/B 訓練、C 測試；第二輪可用 B/C 訓練、A 測試，但第二輪重新建字典，不沿用已看過 A 的模型。','With A/B/C, round one can train on A/B and test C; round two can train on B/C and test A, using a freshly trained dictionary.'],
    ['跨輪每張圖都可能參與訓練，不代表同輪洩漏；同圖 HSI 先驗則是另一種資訊條件，不能稱完全留出。','Training participation across rounds is not within-round leakage. Same-image HSI priors define a different information condition from full holdout.']);
  add('comparison',['比較比例與資訊條件','Ratios and Information Conditions'],
    ['先確認分母、輸入資料與實驗組別，再解讀顯示的比例或分數。固定文獻數字不是即時求解結果。','Check denominators, inputs, and conditions before interpreting ratios or scores. Fixed literature values are not live solver results.'],
    [['分子／分母、×100%',['分子是符合條件的個數；分母是本次比較的整體。除完再乘 100% 才是百分比，換分母就換了問題。','The numerator counts qualifying cases; the denominator defines the population. Multiplying the ratio by 100% expresses a percentage; changing the denominator changes the question.']],['score(condition)',['這是「某組條件的文獻分數」的文字縮寫，不是另提出的數學演算法。輸入是否額外含 HSI 會影響公平比較。','This labels a reported score under a condition, not a new algorithm. Additional HSI inputs matter when comparing methods.']]],
    ['先列出可用資訊，再比較同一定義與尺度的分數；比例示意則先選定分母後計算。','List available information before comparing scores with matching definitions and scales. For ratio examples, select the denominator first.'],
    ['假設 8 對符合條件：相對 10,000 對為 0.08%，相對其中 100 對為 8%。兩個比例回答不同問題。','Eight qualifying pairs are 0.08% of 10,000 pairs but 8% of a 100-pair subset. These answer different questions.'],
    ['這些比例例子是假設數字；不能拿來宣稱自然場景同色異譜的實測機率。','These hypothetical ratios are not measured frequencies of metamerism in natural scenes.']);
  add('parallel',['理想平行排程','Ideal Parallel Scheduling'],
    ['在等長任務、無額外成本的假設下，計算需要幾回合及理想加速比。','Count rounds and ideal speedup under equal-length tasks and zero overhead.'],
    [['N、P、ceil',['N 是任務數，P 是同時可做的工作數；ceil 表示向上取整，剩下一個任務也要另開一回合。','N counts tasks, P parallel workers, and ceil rounds up because a remaining task needs another round.']],['rounds、speedup',['rounds=ceil(N/P)；理想每回合同長，串行花 N 回合，所以加速比是 N 除以平行回合數。','rounds=ceil(N/P). Serial execution takes N equal rounds, so ideal speedup is N divided by parallel rounds.']]],
    ['任務數除以工作數並向上取整，再以串行回合數除以它。','Divide task count by worker count, round up, then divide serial rounds by parallel rounds.'],
    ['10 個任務、4 個工作者，需要 3 回合；理想加速比 10/3 約 3.33，不是整整 4 倍。','Ten tasks on four workers require three rounds, giving ideal speedup 10/3≈3.33 rather than fourfold.'],
    ['這不是實測速度；通訊、排程與不同像素的工作量可能降低加速。','This is not measured performance; communication, scheduling, and uneven work can reduce speedup.']);
  add('runtime',['準備成本、推論與幀率','Preparation Cost, Inference, and Frame Rate'],
    ['分開一次性準備與每幀處理，避免只看推論速度就忽略總成本。','Separate one-time preparation from per-frame inference to account for total cost.'],
    [['T_prepare、T_infer、N',['T_prepare 是一次性準備時間，T_infer 是每幀推論時間，N 是處理的幀數；此處 N 不是訓練光譜數。','T_prepare is one-time preparation, T_infer inference time per frame, and N processed frames, not training-spectrum count.']],['T_total、fps、ms',['總時間是準備加 N 次推論；fps 是每秒幀數。每幀時間以毫秒計時，用 1,000 除以它換成每秒幀數。','Total time adds preparation and N inferences. fps means frames per second; divide 1,000 by milliseconds per frame.']]],
    ['先乘幀數與每幀時間，再加準備。總時間除以幀數得到攤提每幀成本；純推論 fps 不含準備。','Multiply frames by per-frame time, add preparation, and divide by frames for amortized cost. Inference-only fps excludes preparation.'],
    ['準備 1,000 ms、每幀 20 ms、處理 100 幀：總時間 3,000 ms，攤提每幀 30 ms；純推論幀率 50 fps。','Preparation 1,000 ms plus 100 frames at 20 ms gives 3,000 ms total and 30 ms amortized per frame; inference alone is 50 fps.'],
    ['滑桿時間是假設值，不是本文實測。30 fps 對應每幀約 33.3 ms，仍須考慮完整系統的其他成本。','Slider times are hypothetical, not paper measurements. Thirty fps allows about 33.3 ms per frame before other system costs.']);

  add('pairaverage',['從兩個波段算一個平均量測','One Average Reading from Two Bands'],
    ['示範一個量測只限制兩個波段的合計，無法分別知道兩個未知值。','Show that one average constrains a pair’s sum without determining both unknown values.'],
    [['h₁、h₂、m',['h₁、h₂ 是兩個波段值；m 是已知平均。括號表示先把兩個值相加，÷2 表示把總和平均分成兩份。','h₁ and h₂ are two band values; m is the known average. Parentheses add the values first; division by 2 averages their sum.']],['0.5h₁+0.5h₂',['同樣的平均也可寫為兩個加權項，兩個權重各為 0.5。這是示意量測，不是真實相機完整的三通道響應。','The same average is a weighted sum with both weights 0.5. This is an illustrative measurement, not a physical camera’s complete response.']]],
    ['先相加再除以 2。若平均固定為 20，就只知道兩數總和是 40；一個增加多少，另一個減少多少，平均仍相同。','Add the values, then divide by 2. A fixed average of 20 fixes only their sum at 40; equal opposite changes preserve it.'],
    ['(30+10)÷2=20，(15+25)÷2 也等於 20；兩個不同配對都符合相同量測。','(30+10)/2=20, and (15+25)/2 also equals 20. Different pairs satisfy the same reading.'],
    ['這裡沒有在平均兩條光譜的重建 error；是在從未知波段正向計算一個量測值。','This averages band signals into a measurement, not reconstruction errors of two spectra.']);
  lessons.camera.symbols.push(['(3 × 31)(31 × 1) → (3 × 1)',['這裡的數字是矩陣尺寸，不是把六個整數相乘。中間的 31 對上，表示每次加總 31 對乘積；外側留下 3 列與 1 欄。','These numbers describe matrix shapes, not multiplication of six integers. Matching inner dimensions 31 count the product terms; outer dimensions give 3 rows and 1 column.']]);
  lessons.svd.symbols.push(['θ、cos θ、sin θ、(−d)(−x)',['θ 是方向角；cos 與 sin 分別給二維單位方向的兩個座標。0° 是 (1,0)，90° 是 (0,1)。原子與係數同時改正負號時，兩個負號相乘抵銷，貢獻仍是 dx。','θ is the direction angle; cosine and sine give its two unit-vector coordinates. At 0° the direction is (1,0), at 90° (0,1). Negating both atom and coefficients preserves dx because the signs cancel.']]);
  lessons.isolate.symbols.push(['y、b、ŷ、residual',['單樣本寫法中，y 是固定量測，b 是其他原子的合計貢獻，ŷ=b+dⱼxⱼ 是加回本原子後的重建；residual=y−ŷ 是最後尚未解釋的差。','In a single-sample slice, y is the measurement, b sums other atoms, and ŷ=b+dⱼxⱼ adds back this atom. residual=y−ŷ is the unexplained difference.']]);
  lessons.svd.symbols.push(['U、Σ、Vᵀ',['U 的欄是殘差空間的正交方向；Σ 是裝有奇異值的對角矩陣，這裡不是加總符號；Vᵀ 提供跨樣本的組合。下標 1 表示最大奇異值對應的第一組成分。','Columns of U are orthogonal residual-space directions. Here Σ is a diagonal singular-value matrix, not a summation sign. Vᵀ gives sample combinations. Subscript 1 selects the component with largest singular value.']]);
  lessons.transfer.symbols.push(['‖a−b‖₂、1e−16',['兩個向量相減後，各項平方、相加、開根號，得到差距長度。1e−16 是 1 × 10 的 −16 次方；很小的非零數可能是浮點計算捨入，不能直接當作精確的 0。','Subtract the vectors, square their entries, sum, and square-root for distance. 1e−16 means 1 × 10 to power −16. Tiny nonzero values may reflect floating-point rounding rather than exact zero.']]);
  lessons.transfer.symbols.push(['i、j',['i 遍歷使用的原子，j 是正在查看的輸出波段。對固定 j，將所有原子的 Dₕ[j,i]wᵢ 相加；換 j 只讀另一個輸出值，w 不變。','i indexes atoms and j the inspected output band. For fixed j, sum Dₕ[j,i]wᵢ over atoms; changing j reads another output while w stays fixed.']]);
  lessons.normalize.symbols.push(['G_raw、G_normalized',['G_raw 是未除以響應總和的綠通道加權和；G_normalized 再除以總響應。名稱 raw 在此只是未正規化示意，不代表完整相機 RAW 檔。','G_raw is the green weighted sum before division by total response; G_normalized divides by that total. Here raw labels an unnormalized example, not a complete camera RAW file.']]);
  lessons.ksvd.symbols.push(['L、yₙ、ŷₙ',['L 在本 K-SVD 算例指訓練平方差總和；yₙ 是 Y 的第 n 欄，ŷₙ 是該欄的重建。單樣本差平方加總後，還要再加其他樣本才是整體 L。','L in this K-SVD example is total training squared error. yₙ is column n of Y and ŷₙ its reconstruction. Sum band errors for each sample, then add all sample losses for total L.']]);
  lessons.rmse.symbols.push(['δℓ、qℓ、MSE',['動畫中 δℓ 是估計減真值，qℓ 是該差值的平方；MSE 是這些平方差的平均，RMSE 再將它開根號。此處 qℓ 不是零空間變化方向 q。','In the animation, δℓ is estimate minus truth and qℓ its square. MSE averages the squared errors; RMSE takes its square root. Here qℓ is not null-space direction q.']]);
  lessons.camera.symbols.push(['cₖ(m)',['累加動畫中，m 表示已加總的前 m 項，不是波長。cₖ(1)、cₖ(10) 等是部分和；cₖ(31) 才包含全部 31 項。','In the accumulation animation, m counts the first m terms, not wavelength. cₖ(1) and cₖ(10) are partial sums; cₖ(31) includes all 31 terms.']]);
  lessons.ompfit.symbols.push(['∅、r=c_q',['∅ 表示空集合。開始時尚未選任何原子，重建為零，因此初始殘差就是整個輸入 RGB。','∅ denotes the empty set. Initially no atoms are selected and reconstruction is zero, so the initial residual is the whole input RGB.']]);

  const topicFamilies=['band','illumination','metamer','sampling','cube','scan','normalize','partial','camera','gamma','gamma','shift','rank','rank','metamer','tolerance','manifold','pca','prior','prior','prior','sampling','samplecount','sparse','dictionary','dictionary','svd','isolate','svd','svd','offline','camera','ompselect','ompfit','ompstop','transfer','rmse','holdout','repeat','errors','errormap','comparison','comparison','holdout','parallel','runtime','shift','manifold'];
  const cards={
    'paper-training-count':'samplecount','paper-eq-1':'dictionary','paper-eq-2':'camera','paper-eq-3':'camera','paper-camera-sum':'camera','paper-eq-4':'ompfit','paper-eq-5':'sparse','paper-eq-6':'transfer','paper-rmse':'rmse',
    'paper-ksvd-objective':'ksvd','paper-ksvd-residual':'isolate','paper-ksvd-svd':'svd','paper-omp-select':'ompselect','paper-omp-fit':'ompfit','paper-omp-residual':'ompfit',
    'fr-ksvd-loss':'ksvd','fr-ksvd-isolate':'isolate','fr-ksvd-update':'svd','fr-omp-select':'ompselect','fr-omp-fit':'ompfit','fr-omp-residual':'ompstop'
  };
  const legacy={spectrum:'band','illumination-and-reflectance':'illumination','rgb-sensing':'camera','hyperspectral-imaging':'cube','inverse-metamerism':'metamer',assumptions:'prior','prior-icvl':'samplecount','sparse-dictionary':'sparse',ksvd:'ksvd','paired-dictionaries':'camera','omp-recovery':'ompfit',experiments:'rmse',conclusions:'transfer','real-camera':'shift'};
  const sourceNames={ksvd:['K-SVD 演算法背景 [39]','K-SVD Algorithm Background [39]'],isolate:['K-SVD 演算法背景 [39]','K-SVD Algorithm Background [39]'],svd:['K-SVD／SVD 演算法背景 [39]','K-SVD / SVD Algorithm Background [39]'],ompselect:['OMP 演算法背景 [40]','OMP Algorithm Background [40]'],ompfit:['OMP 演算法背景 [40]','OMP Algorithm Background [40]'],ompstop:['OMP 演算法背景 [40]','OMP Algorithm Background [40]'],gamma:['顯示編碼補充；非原論文編號公式','Display-Encoding Supplement; Not a Numbered Paper Equation']};
  function content(id,{compact=false}={}) {
    const x=lessons[id];if(!x)return '';
    const definitions=x.symbols.map(([symbol,pair])=>`<div><dt>${typeset(symbol)}</dt><dd>${b(pair)}</dd></div>`).join('');
    return `<div class="fx-reading" data-fx-family="${id}" data-i18n-skip>
      <div class="fx-symbols"><strong>${b(['符號定義','Symbol Definitions'])}</strong><dl>${definitions}</dl></div>
      <p class="fx-purpose">${b(x.purpose)}</p>
      <details class="fx-details"><summary>${b(['公式說明','Equation Details'])}</summary>
        <h5>${b(x.title)}</h5>
        <div class="fx-calculation"><strong>${b(['依序怎麼算？','How Is It Calculated?'])}</strong><p>${b(x.steps)}</p></div>
        <div class="fx-example"><strong>${b(['小型範例；非論文實測','Small Example; Not Paper Measurements'])}</strong><p>${b(x.example)}</p></div>
        <div class="fx-boundary"><strong>${b(['誤差與解讀界線','Error and Interpretation Limits'])}</strong><p>${b(x.boundary)}</p></div>
        <p class="fx-origin">${b(sourceNames[id]||['依本頁公式與模型展開的補充說明；保留原有來源標示。','Supplementary explanation of this page’s equation and model; the original source labels remain in place.'])}</p>
      </details>
    </div>`;
  }
  const playgroundFamilies={'paper-ksvd-walkthrough':'ksvd','paper-omp-walkthrough':'ompfit','paper-paired-playground':'camera','paper-fit-playground':'ompfit','paper-transfer-playground':'transfer','paper-intro-playground':'cube','paper-rationale-playground':'metamer','paper-prior-playground':'holdout','paper-comparison-playground':'holdout','paper-ksvd-phases-playground':'ksvd','paper-subtract-playground':'isolate','paper-ksvd-svd-playground':'svd','paper-omp-playground':'ompselect','paper-rmse-playground':'rmse','paper-error-playground':'errors','paper-results-playground':'comparison','paper-camera-playground':'shift','paper-conclusion-playground':'prior'};
  const selector='.paper-math,.fr-math,.fr-number,.cx-equation,.fd-formula,.fd-light-equation,.lit-formula,.mf-formula,.af-formula,.af-calculation p,.pa-formula,.eq-expression,.eq-film-numbers,.gamma-equation,.equation-main,.formula-pill,.formula-proof,.math-line,.band-math,.cube-dimension-equation,.atom-dimension-equation,.signal-equation,.worked-equation,.ksvd-formula-card>strong,.ksvd-detail-list code,.rgb-formula-grid code,.rank-pair-sums p,.guide-stage p,.guide-vector-row,.mf-transfer-columns section>p';
  function classify(el){
    const raw=el.matches('.eq-film-numbers')?el.closest('.eq-film')?.querySelector('.eq-expression')?.textContent:el.matches('.mf-formula')?el.querySelector('strong')?.textContent:el.textContent;
    const text=(raw||'').replace(/\s+/g,' ').trim();if(!text)return null;
    const plain=text.replace(/[_\s]/g,'').replace(/ₕ/g,'h').replace(/ĥ/g,'h');
    for(let p=el;p;p=p.parentElement)if(cards[p.id])return cards[p.id];
    const contract=el.closest('[data-eq-topic]');if(contract)return topicFamilies[Number(contract.dataset.eqTopic)-1];
    if(el.matches('.rank-pair-sums p'))return 'pairaverage';
    if(/^Dh=[{\[]/.test(plain))return 'dictionary';
    if(/^hq=Dh.*w/.test(plain))return 'sparse';
    if(/^Rhq=|^cq=Rhq/.test(plain))return 'transfer';
    const film=el.closest('.eq-film');
    if(film){
      if(film.id.includes('rmse'))return 'rmse';
      if(film.id.includes('rgb'))return 'camera';
      if(film.id.includes('ksvd'))return /min.*E|σ|UΣ|u₁/.test(text)?'svd':/E|other|b\b/.test(text)?'isolate':'ksvd';
      if(film.id.includes('omp'))return /arg\s*max/.test(text)?'ompselect':'ompfit';
    }
    if(/RMSE\(.*condition|Table \d entry/.test(text))return 'comparison';
    if(/RMSE|MSE/.test(text))return 'rmse';
    if(el.matches('.formula-pill')&&/Accuracy|準確|true/.test(text))return 'rmse';
    if(el.matches('.worked-equation')&&/normalized|正規化/.test(text))return 'normalize';
    if(/C[_ ]?(display|linear)|Cdisplay|round\(255|1\/2\.2/.test(text))return 'gamma';
    if(/arg\s*max|score[ᵢ_i]|argmax/.test(text))return 'ompselect';
    if(/arg\s*min/.test(text))return /prior|RMSE|near/.test(text)?'prior':'ompfit';
    if(/\brank\s*\(|\bker\b|free directions|dim\(/.test(text))return 'rank';
    if(/R.?q\s*=\s*0|Rq\s*=\s*0|RΔh\s*=\s*0|h.?A\s*≠\s*h.?B|Rh_A\s*=\s*Rh_B/.test(text))return 'metamer';
    if(/D_?RGB\s*w/.test(text)&&!/Rĥ|ĥ|h_q/.test(text))return 'ompfit';
    if(/candidate set|h ∈/.test(text))return 'prior';
    if(/[Σ∑].*R|c.*=.*Rh|D_?RGB\s*=\s*R/.test(text))return 'camera';
    if(/UΣV|u₁σ₁|σ₁v|u.?1.*sigma|E.*≈.*u/.test(text))return 'svd';
    if(/Ω.*\{|E.*=\s*Y\s*[−-]|e.*=\s*y.*[−-]/.test(text))return 'isolate';
    if(/^E.*=.*\[|columns of E|^[yŷ].*=.*\bb\b/.test(text))return 'isolate';
    if(/min.*Y|L_train|Ltrain/.test(text))return 'ksvd';
    if(/T_prepare|T_infer|fps/.test(text))return 'runtime';
    if(/∝|ρ|rho/.test(text))return 'illumination';
    if(/R_shift|R_ref/.test(text))return 'shift';
    if(/relative|δ|absolute/.test(text))return 'errors';
    if(/cos|sin|θ/.test(text))return 'svd';
    if(/μ|ĥ.*bᵢ/.test(text))return 'pca';
    if(el.matches('.cube-dimension-equation'))return 'cube';
    if(el.matches('.band-math'))return 'camera';
    if(el.closest('.rgb-formula-grid')&&/÷/.test(text))return 'normalize';
    const page=el.closest('.concept-page');if(page)return topicFamilies[Number(page.dataset.chapter)-1];
    const playground=el.closest('.paper-playground');if(playgroundFamilies[playground?.id])return playgroundFamilies[playground.id];
    if(el.closest('#paper-ksvd'))return /E|d.*x|d.*T.*e/.test(text)?'svd':'ksvd';
    if(el.closest('#paper-omp'))return /stop|ε|≤|≥/.test(text)?'ompstop':'ompfit';
    if(el.closest('#paper-method'))return /ĥ|h_q|hq|Rĥ/.test(text)?'transfer':/D_RGBw|w\s*=/.test(text)?'ompfit':'camera';
    if(el.closest('#paper-prior'))return /mean|bin/.test(text)?'sampling':'cube';
    if(el.closest('#paper-experiments,#paper-comparison'))return 'rmse';
    const chapter=el.closest('main>.chapter');return legacy[chapter?.id]||null;
  }
  const observed=new WeakMap(),seenByContext=new Map();let frame=0;
  function scan(){
    frame=0;let changed=false;document.querySelectorAll(selector).forEach(el=>{
      if(el.closest('.fx-reading,.offline-explanation'))return;
      if(el.matches('.af-calculation p,.guide-stage p,.mf-transfer-columns section>p')&&!/[=≈‖√]/.test(el.textContent))return;
      const key=classify(el);if(!key||!lessons[key])return;
      if(el.matches('.eq-contract .eq-expression,.cx-equation')&&!el.childElementCount){const original=el.textContent,html=typeset(original);if(html!==esc(original)){el.innerHTML=html;el.dataset.fxFormulaText=original;}}
      const keys=[key],text=el.textContent;
      if(key==='gamma'&&/[Σ∑]/.test(text))keys.push('camera');
      if(key==='metamer'&&/[Σ∑]/.test(text))keys.push('camera');
      if(key==='ompselect'&&/arg\s*min/.test(text))keys.push('ompfit');
      if(key==='isolate'&&/min|σ|UΣ/.test(text))keys.push('svd');
      if(key==='camera'&&/R̃|c̃/.test(text))keys.push('normalize');
      const signature=keys.join(',');const current=observed.get(el);if(current?.key===signature&&current.box.isConnected)return;
      current?.box.remove();
      const context=el.closest('.concept-page,.paper-page,main>.chapter')?.id||'main';
      const seen=seenByContext.get(context)||new Set();
      const box=document.createElement('div');box.className='fx-explanation';box.dataset.i18nSkip='';box.innerHTML=keys.map(k=>{const compact=seen.has(k)||!!el.closest('.fr-card,.paper-equation-card');seen.add(k);return content(k,{compact});}).join('');seenByContext.set(context,seen);
      // Keep block explanations outside inline links, spans, and paragraphs.
      let host=el;if(['SPAN','CODE','STRONG'].includes(el.tagName))host=el.closest('p,aside,li,article')||el;
      host.after(box);el.dataset.fxExplained=signature;observed.set(el,{key:signature,box});changed=true;
    });
    if(changed)window.ReportProjection?.notify();
  }
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(scan);};
  function audit(){return [...document.querySelectorAll(selector)].filter(el=>!el.closest('.fx-reading,.offline-explanation')).map(el=>({page:el.closest('main>.chapter')?.id||'main',text:el.textContent.trim().slice(0,100),family:classify(el),explained:!!observed.get(el)?.box.isConnected}));}
  function initialize(){scan();new MutationObserver(records=>{if(records.some(r=>!r.target.closest?.('.fx-explanation')&&(r.target.matches?.(selector)||[...r.addedNodes].some(n=>n.nodeType===1&&!n.matches?.('.fx-explanation')))))schedule();}).observe(document.querySelector('main'),{childList:true,subtree:true});window.addEventListener('hashchange',schedule);}
  window.ReportFormulaExplanations={lessons,topicFamilies,cards,content,classify,audit,scan,typeset,initialize};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize);else initialize();
})();
