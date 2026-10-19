/* Each entry is authored in English and Traditional Chinese; no machine translation at runtime. */
(() => {
  'use strict';
  const groups = [
    ['光與影像資料', 'Light and Image Data'], ['相機如何量測', 'How a Camera Measures'],
    ['反推的困難', 'Why Inversion Is Difficult'], ['先驗與訓練資料', 'Priors and Training Data'],
    ['字典如何學習', 'How Dictionaries Learn'], ['從 RGB 重建', 'Reconstruction from RGB'],
    ['實驗與誤差', 'Experiments and Error'], ['比較、部署與結論', 'Comparison, Deployment, and Conclusions']
  ];
  const entries = [];
  const add = (title, question, idea, steps, example, boundary, terms, lab, source, legacy) => {
    const number = entries.length + 1;
    entries.push({ number, id: `concept-${String(number).padStart(2, '0')}`, group: Math.floor((number - 1) / 6), title, question, idea, steps, example, boundary, terms, lab, source, legacy });
  };
  add(['波長、波段與訊號值','Wavelength, Band, and Signal'],
    ['550 nm 和 hⱼ 分別告訴我們什麼？','What Do 550 nm and hⱼ Tell Us?'],
    ['波長指出光譜上的位置；波段是一小段波長範圍；訊號值才描述這一段接收到多少光。把這三者分清，才能讀懂後面的曲線與公式。','Wavelength identifies a spectral position. A band covers a finite wavelength interval, while its signal value describes how much light is measured there. These are three different quantities.'],
    [['先看橫軸：400–700 nm 是本論文主要實驗的可見光範圍。','Read the horizontal axis: 400–700 nm is the visible range used in the main experiment.'],['再看縱軸：比較訊號時，物理量、單位與正規化規則必須相同。','Read the vertical axis: compare signals only under the same physical quantity, unit, and normalization.'],['最後看波段寬度：真實量測累積一段範圍，不是沒有寬度的單點。','Inspect the band width: a real measurement collects a finite interval, not a widthless point.']],
    ['像收音機的頻道位置與音量：選到哪個頻道，並沒有說它有多大聲。這只是區分位置與強度的類比。','A radio station and its volume illustrate the distinction: selecting a station does not specify how loud it is. This is an analogy for position versus strength.'],
    ['本頁相對強度是教學尺度；不是論文的實測光譜或材料百分比。','Relative signal here is a teaching scale, not measured paper data or a material percentage.'],
    [['奈米','Nanometer','1 nm 是十億分之一公尺，用來表示波長。','One nm is one billionth of a meter, a unit of wavelength.'],['取樣值','Sample Value','某個波段量測或整理後得到的一個數。','One value measured or aggregated for a spectral band.']], 'band', '背景／§1、§5', 'spectrum');
  add(['反射率、照明與場景光譜','Reflectance, Illumination, and Scene Signal'],
    ['同一片葉子換一盞燈，光譜為何變了？','Why Does the Same Leaf Have a Different Spectrum under Another Light?'],
    ['材料反射多少比例，與光源先提供多少能量，要一起考慮。理想漫反射示意中，場景訊號的形狀與照明、反射率的逐波長乘積有關。','Both the fraction reflected by the material and the energy supplied by the source matter. In an ideal diffuse-reflection illustration, the scene signal depends on their wavelength-by-wavelength product.'],
    [['固定同一材料，拖動光源冷暖比例，對照固定的中性光參考；觀察短波與長波如何改變。','Keep one material fixed and drag the lamp’s warm/cool balance. Compare short- and long-wavelength changes against the fixed neutral reference.'],['再只改亮度，看所有波段等比例縮放，以及相機 RGB 如何連動；材料反射率始終不變。','Then change only brightness: all bands scale together and camera RGB updates, while material reflectance stays unchanged.'],['自由選取 400–700 nm 的讀取位置，拆開「照明 × 反射率 = 出射訊號」。讀取線不會改變光源或樣本。','Choose any reading position from 400 to 700 nm and unpack illumination × reflectance = outgoing signal. The reading line does not change the lamp or sample.']],
    ['同一件衣服在白光與暖黃燈下看起來不同，因為光源提供的波長比例不同。','The same garment looks different in white and warm light because the illumination has a different spectral distribution.'],
    ['真實場景還有角度、陰影、鏡頭與曝光；不是只靠兩條曲線便能完整描述。','Real scenes also involve geometry, shadows, optics, and exposure; two curves are not a complete model.'],
    [['反射率','Reflectance','材料在各波長反射入射光的比例。','The fraction of incident light reflected at each wavelength.'],['場景訊號','Scene Signal','在特定照明與幾何下朝相機傳來的光。','Light traveling toward the camera under the actual illumination and geometry.']], 'illumination', '背景／§4', 'spectrum');
  add(['光譜特徵與辨識線索','Spectral Signatures and Identification'],
    ['同樣看起來綠色，為何光譜仍可能不同？','Why Can Two Green-Looking Objects Have Different Spectra?'],
    ['一個 RGB 顏色只保存三個加權結果；光譜則記錄各波段的訊號。兩個樣本即使被這台相機拍成相同綠色，逐波段的訊號仍可能不同。下方固定比較 A、B 兩個合成樣本，讓你直接看見這個差別。','An RGB color stores three weighted results, while a spectrum records the signal in each band. Two samples can produce the same green camera preview yet differ band by band. The interaction fixes two synthetic samples, A and B, so this difference can be observed directly.'],
    [['先看 A、B 的綠色色塊與 RGB 數字：相機的三通道輸出相同。','First compare the green swatches and RGB numbers: A and B have the same three-channel output.'],['展開光譜：青色實線是 A，橘色虛線是 B，兩條線並不重合。','Reveal the spectra: the teal solid curve is A and the orange dashed curve is B; they do not coincide.'],['選一個波段，同時讀出 A、B 的訊號。滑桿只移動讀取位置，不改變樣本本身。','Choose one band and read A and B together. The slider moves the reading position; it does not change the samples.']],
    ['綠葉與綠色塑膠可以有接近的顏色，卻有不同光譜。下方 A、B 只是用來理解這種可能性的合成樣本，沒有把它們當作真實綠葉或塑膠的量測。','A green leaf and green plastic can have similar colors but different spectra. A and B below are synthetic examples of this possibility, not measured leaf or plastic spectra.'],
    ['這個示範只證明「相同相機 RGB 可以對應不同光譜」，不能單靠曲線就判定材料名稱。真實光譜還受照明、角度與感測器影響。','The demonstration shows that matching camera RGB can correspond to different spectra. A curve alone does not establish a material identity; illumination, geometry, and sensor response also matter.'],
    [['特徵','Feature','用來比較資料的形狀、數值或模式。','A shape, value, or pattern used to compare observations.'],['真值','Ground Truth','用獨立量測取得、用來評估估計的參考資料。','An independently measured reference used to evaluate an estimate.']], 'signature', '本文／§1、§4', 'spectrum');
  add(['高光譜與多光譜','Hyperspectral and Multispectral Imaging'],
    ['很多通道就一定叫高光譜嗎？','Does Having Many Channels Automatically Mean Hyperspectral?'],
    ['高光譜通常以密集且相鄰的窄波段描述光譜；多光譜常使用較少、為任務挑選的波段。應同時看波段寬度、間隔與涵蓋範圍。','Hyperspectral imaging usually samples many neighboring narrow bands. Multispectral imaging often uses fewer task-selected bands. Band width, spacing, and coverage all matter.'],
    [['先顯示同一條連續示意曲線。','Begin with the same illustrative continuous curve.'],['增加取樣波段，觀察能看見的細節。','Increase sampled bands and inspect the visible detail.'],['再加寬波段，觀察窄特徵如何被平均。','Widen the bands and observe narrow features being averaged.']],
    ['農業設備可能只量幾個重要波段來判斷作物狀態，不一定需要整條精細曲線。','An agricultural device may measure a few important bands for crop assessment rather than a finely sampled full spectrum.'],
    ['沒有一個適用所有設備的固定通道數分界；波段數也不等於光譜解析度。','There is no universal channel-count boundary, and band count is not spectral resolution.'],
    [['波段寬度','Bandpass Width','每個通道實際接受的波長範圍。','The wavelength interval accepted by a channel.'],['取樣間隔','Sampling Interval','相鄰取樣中心之間的距離。','The distance between neighboring sampling centers.']], 'sampling-spectrum', '本文／§1–2', 'hyperspectral-imaging');
  add(['資料立方體、切片與體素','Data Cube, Slices, and Voxels'],
    ['第三個方向是波長，還是物體深度？','Is the Third Axis Wavelength or Object Depth?'],
    ['資料立方體是一個 H×W×B 的數字陣列：高度、寬度與波段數。固定波段得到整張影像；固定位置讀完所有波段得到一條像素光譜。','A data cube is an H×W×B numerical array: height, width, and band count. Fix a band for a full image; fix a position and read every band for one pixel spectrum.'],
    [['先用場景區域圖認出天空、葉子與土壤的位置；每個波段都對應同一張場景。','Locate sky, leaf, and soil in the scene key; every band refers to the same scene.'],['固定位置換波段，看灰階影像與曲線讀取點一起改變；再固定波段換位置。','Hold position and change band to update the grayscale image and curve marker; then hold band and change position.'],['兩個視圖的交會是同一數值；展開 31 個數即可讀出選中像素的光譜。','The two views meet at the same value; expand all 31 values to read the selected pixel spectrum.']],
    ['像同一班級的座位表，每張表記錄一種科目的分數；固定座位橫跨各表，可讀出同一個人的整組資料。','Imagine identical classroom seating charts, each recording one subject. Reading the same seat across charts retrieves the full record for one student.'],
    ['這裡的體素第三軸是光譜，與 CT 中的實體深度不同。','Here the voxel’s third axis is spectral, unlike physical depth in CT.'],
    [['體素','Voxel','某位置在某波段的一個訊號值。','One signal value at one position and one spectral band.'],['切片','Slice','固定一個索引後抽出的二維資料。','A two-dimensional section obtained by fixing one index.']], 'cube', '本文／§1', 'hyperspectral-imaging');
  add(['三種解析度與掃描代價','Resolution and Scanning Trade-offs'],
    ['為何高光譜拍攝可能怕物體移動？','Why Can Motion Disrupt Hyperspectral Acquisition?'],
    ['一般感測器是二維，高光譜資料多了波長軸。逐點、逐線或逐波段掃描花時間；場景改變時，不同時刻的資料可能對不齊。','A conventional sensor is two-dimensional, while hyperspectral data add wavelength. Point, line, or band scanning takes time, allowing motion to misalign measurements.'],
    [['選擇掃描方式，辨認每次取得哪一塊資料。','Select the scan mode and identify what is acquired each time.'],['增加物體速度，比較掃描開始與結束位置。','Increase object speed and compare positions at scan start and end.'],['區分空間細節、光譜分辨能力與完整資料更新速度。','Distinguish spatial detail, spectral discrimination, and full-cube update rate.']],
    ['拍全景照時有人走動可能被拉長；掃描式高光譜也可能混入不同時刻的場景。','A moving person can distort a panorama; a scanning hyperspectral system can likewise combine different moments.'],
    ['本互動以簡化時序說明錯位，並不模擬特定相機的真實掃描速度。','The simplified timing illustrates misalignment, not the measured speed of a particular camera.'],
    [['空間解析度','Spatial Resolution','能分辨多小的空間細節，受光學與取樣共同限制。','The smallest resolvable spatial detail, limited by optics and sampling.'],['時間解析度','Temporal Resolution','多快能再次取得完整且對齊的資料。','How often a complete, aligned measurement can be obtained.']], 'scan', '本文／§1–2', 'hyperspectral-imaging');

  add(['感光曲線與通道重疊','Sensor Responses and Overlap'], ['一個波段能同時影響紅色與綠色通道嗎？','Can One Band Affect Both Red and Green Channels?'],
    ['每個通道對整段波長都有一條敏感度曲線。曲線互相重疊，所以改變一個波段時，可能有多個通道一起改變。','Each channel has a sensitivity curve across wavelengths. The curves overlap, so changing one band may affect several channels.'],
    [['先認出同時顯示的 R、G、B 三條響應曲線，不把它們當成三條輸入光譜。','Identify the simultaneous R, G, and B response curves; they are not three input spectra.'],['移動同一條讀取線，同時比較三個通道在該波段的權重。','Move one reading line and compare all three channel weights at that band.'],['圖、圓點與數字用同一正規化尺度；接著才學如何將訊號乘權重並加總。','Curves, dots, and numbers share one normalization; next learn how signals are multiplied by weights and summed.']],
    ['像三個收音範圍重疊的麥克風，同一聲音可能同時被多個麥克風收到。','Like three microphones with overlapping pickup regions, one signal can reach several detectors.'],
    ['示意響應不是 Canon 40D 校準數據。每通道 31 權重總和為 1 是教學尺度，不是實體相機原始權重必須滿足的規則。','These are not calibrated Canon 40D responses. Unit row sums across 31 weights are a teaching convention, not a requirement on raw physical-camera responses.'],
    [['光譜響應','Spectral Response','不同波長對輸出影響的權重。','The wavelength-dependent weights contributing to an output.'],['重疊','Overlap','多個通道對同一波段都有反應。','Multiple channels respond to the same band.']], 'response', '本文／式 (2)–(3)', 'rgb-sensing');
  add(['加權總和與 c = Rh','Weighted Sums and c = Rh'], ['相機怎麼把 31 個數算成 3 個？','How Does a Camera Turn 31 Values into Three?'],
    ['每個通道把每個波段的訊號乘上自己的權重，再把全部乘積相加。R、G、B 各算一次，得到三個線性量測。','Each channel multiplies every band signal by its own weight and adds all products. Repeating this for R, G, and B yields three linear measurements.'],
    [['從三項算例開始，自行勾選任何波段，把該列訊號乘權重後加入部分和；取消勾選就移除。','Begin with three terms. Check any band to add its signal–weight product; uncheck it to remove the contribution.'],['切換 R、G、B，比較同一組已選波段的部分和；全部選取才是完整輸出。','Switch R, G, and B to compare partial sums for the same selected bands; select every band for full outputs.'],['再展開到 31 波段，可自由勾選不相鄰波段。滑桿只查看單項，不改勾選集合或權重。','Expand to 31 bands and freely choose nonadjacent bands. The slider only inspects a term; it does not alter the selected set or weights.']],
    ['總成績若是作業 20%、考試 80%，就是加權總和；相機則對不同波段使用權重。','A grade made from 20% homework and 80% exams is a weighted sum; a camera weights spectral bands instead.'],
    ['下方用每通道總權重為 1 的教學矩陣，輸出標為 c̃。論文 R 的尺度未必相同。','The teaching matrix below has row sums of one, so its output is labeled c̃. The paper’s R need not have this scale.'],
    [['加權','Weighting','不同輸入乘上不同的影響係數。','Multiplying inputs by their respective influence factors.'],['線性','Linear','符合相加與縮放規則。','Obeying addition and scaling.']], 'weighted', '本文／式 (2)–(3)', 'rgb-sensing');
  add(['向量、矩陣與尺寸','Vectors, Matrices, and Dimensions'], ['3×31 乘 31×1 為何得到 3×1？','Why Does 3×31 Times 31×1 Give 3×1?'],
    ['h 是直欄排列的 31 個訊號。R 的每一列是一個通道的 31 個權重，逐列與 h 相乘加總，就得到三個輸出。','h contains 31 signals in a column. Each row of R holds 31 weights for one channel; multiplying and summing that row with h yields one output.'],
    [['先確認中間尺寸 31 能配對。','Check that the inner dimensions, 31, match.'],['每一列只產生一個輸出。','Each row produces one output.'],['外側尺寸 3 與 1 決定結果形狀。','The outer dimensions, 3 and 1, give the output shape.']],
    ['一張三科評分規則表，對同一份作業資料分別打出三個分數。','Three grading rules can assign three scores to the same set of work.'],
    ['列、欄一旦交換，可能無法相乘；矩陣乘法通常不能任意交換順序。','Swapping rows and columns may make multiplication invalid; matrix multiplication generally does not commute.'],
    [['欄向量','Column Vector','把數值垂直排列成一欄。','Values arranged vertically in one column.'],['矩陣','Matrix','依列與欄排列的數字表格。','A numerical array organized into rows and columns.']], 'matrix', '拆解／式 (1)–(6)', 'rgb-sensing');
  add(['線性 RGB、RAW 與 JPEG','Linear RGB, RAW, and JPEG'], ['照片裡的 0–255 就是 c 嗎？','Are the 0–255 Values in a Photo the Model’s c?'],
    ['c = Rh 假設輸入與光訊號保持線性關係。相機的非線性編碼、色調處理與壓縮會改變數字，因此本文真機測試使用 RAW，而不是直接把 JPEG 像素當成原始量測。','c = Rh assumes a linear relationship to the optical signal. Nonlinear encoding, tone processing, and compression change values, so the real-camera experiment uses RAW rather than treating JPEG pixels as raw measurements.'],
    [['先看線性輸入，訊號加倍時理想輸出也加倍。','Inspect a linear input: doubling signal ideally doubles output.'],['套用非線性編碼，觀察比例改變。','Apply nonlinear encoding and observe the changed ratio.'],['回到論文，確認量測模型與資料處理是否匹配。','Check that the measurement model matches the data processing.']],
    ['把已加工的飲料濃度直接當原始果汁比例，可能把加工步驟的影響也算進去。','Treating a processed drink as raw juice can confuse processing effects with the original ingredients.'],
    ['RAW 也需要黑階、曝光與感測器等校準；RAW 不等於完全不必處理。','RAW still requires suitable black-level, exposure, and sensor calibration.'],
    [['RAW','RAW','保留較接近感測器量測的影像資料格式。','Image data retaining values closer to sensor measurements.'],['非線性','Nonlinearity','輸入加倍不再必然讓輸出加倍。','Doubling an input no longer necessarily doubles its output.']], 'linear-display', '本文 §5.3／背景', 'rgb-sensing');
  add(['正規化、Gamma 與顯示','Normalization, Gamma, and Display'], ['0.255 如何變成螢幕上的 137？','How Can 0.255 Become 137 on a Display?'],
    ['先把線性通道值放在 0–1，再用簡化 Gamma 公式 round(255×C_linear^(1/2.2)) 轉成 8 位元預覽。次方、乘 255 與四捨五入是不同步驟。','Starting from a linear channel value in 0–1, the simplified formula round(255×C_linear^(1/2.2)) produces an 8-bit preview. The power, scaling by 255, and rounding are separate operations.'],
    [['確認輸入 C_linear 的範圍。','Check the range of C_linear.'],['取 1/2.2 次方，觀察暗部數值提高。','Raise it to the power 1/2.2 and observe dark values increasing.'],['乘 255、四捨五入，得到整數。','Multiply by 255 and round to an integer.']],
    ['0.255 的簡化 Gamma 預覽約為 137；直接乘 255 約為 65，兩種算法不同。','For 0.255, the simplified gamma preview is about 137; direct scaling by 255 gives about 65.'],
    ['1/2.2 是本網頁的教學近似；正式 sRGB 使用分段轉換。這不是論文恢復光譜的公式。','1/2.2 is a teaching approximation; standard sRGB uses a piecewise transfer function. This is not a spectral-recovery equation from the paper.'],
    [['量化','Quantization','把連續數值轉成有限個等級。','Mapping continuous values to a finite set of levels.'],['Gamma 編碼','Gamma Encoding','對線性值施加用於儲存／顯示的非線性轉換。','A nonlinear conversion used for storage or display.']], 'gamma', '補充背景', 'rgb-sensing');
  add(['標準觀察者與實體相機','Standard Observer versus Physical Camera'], ['模擬 RGB 與真實相機量到的一樣嗎？','Are Simulated Measurements Identical to a Real Camera?'],
    ['主要實驗以 CIE 1964 配色函數將高光譜投影成三刺激值。真機實驗則使用 Canon 40D 的估計感光曲線；兩種投影模型必須分開。','The main experiment projects spectra using CIE 1964 color-matching functions. The real-camera experiment uses estimated Canon 40D responses; these are different projection models.'],
    [['固定同一條光譜。','Hold one spectrum fixed.'],['切換示意感測曲線，重新計算三個值。','Switch illustrative response curves and recompute three values.'],['檢查字典投影是否使用與輸入相同的模型。','Check that dictionary projection uses the same model as the input.']],
    ['不同手機拍同一物體，感光元件與處理流程不同，輸出數值未必一致。','Different phones can produce different values for the same object because their sensors and processing differ.'],
    ['互動僅用兩組合成曲線說明模型差異，不把它們標成真實 CIE 或 Canon 校準資料。','The interaction uses two synthetic models; neither is labeled as actual CIE or Canon calibration data.'],
    [['三刺激值','Tristimulus Values','描述配色反應的三個數值。','Three values describing a color-matching response.'],['校準','Calibration','量測並對齊模型與設備的對應關係。','Measuring and aligning the relationship between model and device.']], 'sensor-model', '本文／§5、§5.3', 'real-camera');

  add(['正向問題與逆問題','Forward and Inverse Problems'], ['知道總和，能找回每個加數嗎？','Can a Sum Reveal Every Term?'],
    ['已知 h 與 R，計算 c 是正向問題；只知道 c，反找 h 是逆問題。加權總和會把多種輸入壓成相同結果。','Computing c from known h and R is forward modeling. Inferring h from c is an inverse problem. Weighted sums can collapse many inputs to one output.'],
    [['先把四個教學波段加權成兩個量測。','Project four teaching bands into two measurements.'],['改變不同波段，尋找量測不變的候選。','Change bands and find candidates with unchanged measurements.'],['區分直接計算與需要額外條件的推估。','Distinguish direct calculation from inference requiring extra constraints.']],
    ['知道兩人總共 100 元，仍不知道各自有多少。','Knowing that two people have 100 in total does not reveal each person’s amount.'],
    ['小算例使用四個波段與兩個量測，方便看清結構；論文主要情境是 31→3。','The small example uses four bands and two measurements; the main paper setting is 31→3.'],
    [['正向','Forward','由原因與模型計算結果。','Compute an outcome from a cause and model.'],['逆向','Inverse','由結果推估可能原因。','Infer possible causes from an outcome.']], 'inverse', '本文／§4', 'inverse-metamerism');
  add(['欠定、秩與自由度','Underdetermination, Rank, and Freedom'], ['三個方程為何限制不了 31 個未知數？','Why Can Three Equations Not Determine 31 Unknowns?'],
    ['獨立限制的數量由矩陣的秩決定。R 若秩為 3，31 維線性解集合有 28 個自由方向；物理限制可以刪掉部分候選，但一般不保證唯一。','The matrix rank counts independent constraints. If R has rank 3, its 31-dimensional linear problem leaves 28 free directions. Physical constraints remove candidates without generally guaranteeing uniqueness.'],
    [['加入一條獨立量測，觀察自由方向減少。','Add an independent measurement and observe fewer free directions.'],['重複同一條量測，注意資訊量沒有增加。','Repeat an existing measurement and see that information does not increase.'],['把簡化模型推廣到 rank(R)≤3。','Extend the intuition to rank(R)≤3.']],
    ['同一句提示重複三次，不等於三個獨立線索。','Repeating the same clue three times does not create three independent clues.'],
    ['28 是自由方向，不是指定 28 個波段完全沒被相機看到。','28 counts free directions, not 28 particular bands that the camera entirely ignores.'],
    [['秩','Rank','線性上彼此獨立的限制數。','The number of linearly independent constraints.'],['自由度','Degrees of Freedom','施加限制後仍能獨立改變的方向數。','Independent directions still available after constraints are applied.']], 'rank', '背景／§4 的欠定模型', 'inverse-metamerism');
  add(['同色異譜','Sensor Metamerism'], ['兩條不同曲線為何能產生相同 RGB？','How Can Different Curves Produce the Same RGB?'],
    ['不同波段的改變可能在三次加權總和中互相抵銷。相機因此無法只靠 RGB 分辨這些光譜。','Changes across bands can cancel in all three weighted sums, leaving the camera unable to distinguish the spectra from RGB alone.'],
    [['從同一基準曲線開始。','Start from a shared baseline spectrum.'],['沿此示意感測器的零空間向兩邊移動。','Move in opposite directions along the illustrative sensor’s null space.'],['比較光譜距離與 RGB 殘差。','Compare spectral distance with the RGB residual.']],
    ['兩份不同配方可能調出相同可見顏色；顏色一致本身不足以證明配方一致。','Two different recipes can produce a matching visible color; matching color does not prove matching composition.'],
    ['同色必須指定感測器與容許誤差；更換感測器後，原本相同的輸出可能分開。','A match depends on the sensor and tolerance; another sensor may distinguish the same pair.'],
    [['同色異譜','Metamerism','光譜不同，但特定觀察系統的反應相同。','Different spectra producing matching responses in a specified observer.'],['殘差','Residual','模型輸出與輸入之間剩餘的差值。','The remaining difference between model output and input.']], 'metamer', '本文／§4', 'inverse-metamerism');
  add(['零空間與雜訊敏感方向','Null Space and Noise Sensitivity'], ['有些變化為何相機看不見？','Why Are Some Changes Invisible to the Camera?'],
    ['若 Rq=0，沿 q 改變光譜就不改變 RGB。若 Rq 只是很小，這種改變也可能被量測雜訊掩蓋。','If Rq=0, changing a spectrum along q leaves RGB unchanged. If Rq is merely small, noise may hide the change.'],
    [['先觀察完全抵銷的方向。','Observe a direction that cancels exactly.'],['改成弱敏感方向，計算很小的量測差。','Use a weakly sensed direction and calculate its small measurement change.'],['加上誤差尺度，判斷變化是否容易分辨。','Add a noise scale and inspect whether the change is distinguishable.']],
    ['若秤的最小刻度是 1 克，0.01 克的差異即使存在，也很難讀出。','A 0.01-gram difference is hard to read on a scale marked in whole grams.'],
    ['近零方向涉及穩定性；完全零方向涉及不唯一性，兩者需要區分。','Near-null directions concern stability, while exact null directions concern non-uniqueness.'],
    [['零空間','Null Space','所有被線性投影映成零的方向集合。','The set of directions mapped to zero by a linear projection.'],['病態性','Ill-posedness','問題可能不唯一或對輸入誤差敏感。','A problem may lack uniqueness or be sensitive to input errors.']], 'nullnoise', '背景／線性模型拆解', 'inverse-metamerism');
  add(['低維流形與有效維度','Low-Dimensional Manifolds'], ['31 個座標為何不一定需要 31 個自由參數？','Why Might 31 Coordinates Need Fewer Free Parameters?'],
    ['資料可以放在高維空間，卻只集中在一條曲線或狹窄區域附近。記錄仍用完整座標，描述常見變化則可能只需少數參數。','Data can live in a high-dimensional space while clustering near a curve or narrow region. Recording still uses all coordinates, but describing common variation may need fewer parameters.'],
    [['在三維空間畫一條彎曲道路。','Draw a curved road in three dimensions.'],['只改一個沿路位置參數，觀察三個座標一起改變。','Change one position parameter and watch all three coordinates change.'],['區分環境維度與資料的有效維度。','Distinguish ambient dimension from effective dimension.']],
    ['地圖用平面座標記錄火車位置，但固定路線上的位置可用沿線里程描述。','A train’s map position uses two coordinates, but its location on a fixed route can be described by distance along the route.'],
    ['自然光譜平滑是相關性的線索，不足以單獨證明低維；仍需資料分析。','Spectral smoothness suggests correlation but does not by itself prove low dimensionality.'],
    [['環境維度','Ambient Dimension','完整記錄資料所用的座標數。','The number of coordinates used to record data.'],['流形','Manifold','局部可由較少參數描述、可能彎曲的結構。','A possibly curved structure locally described by fewer parameters.']], 'manifold', '本文／§4', 'assumptions');
  add(['PCA 與解釋變異比例','PCA and Explained Variance'], ['99% 變異代表 99% 準確嗎？','Does 99% Variance Mean 99% Accuracy?'],
    ['PCA 先減去平均值，再找出資料變化最大的正交方向。累積變異比例說明整個資料集有多少起伏被這些方向涵蓋。','PCA centers the data and finds orthogonal directions of greatest variation. Cumulative explained variance measures how much dataset variation those directions capture.'],
    [['從一個平均光譜開始。','Start from a mean spectrum.'],['逐一加入變化方向，觀察近似曲線。','Add variation directions one by one and inspect the approximation.'],['把資料集變異比例與單一樣本誤差分開。','Separate dataset variance from one sample’s reconstruction error.']],
    ['幾個共同趨勢能描述全班大部分成績變化，不表示每位同學每科都估得一樣準。','A few shared trends may explain most class-wide grade variation without predicting every subject equally well for every student.'],
    ['原有五成分曲線示範使用合成資料；新增文獻讀表則使用Hardeberg表2的已發表數字。兩者是不同資料，不能把百分比混在一起。','The original five-component curve demo uses synthetic data; the added literature table uses published Hardeberg Table 2 counts. These are different datasets and their percentages must not be mixed.'],
    [['主成分','Principal Component','依可解釋變異排序的正交方向。','An orthogonal direction ordered by explained variation.'],['中心化','Centering','每筆資料先減去資料平均值。','Subtracting the dataset mean from each observation.']], 'pca', '本文引用研究／§4；運算背景', 'assumptions');

  add(['兩項核心假設','The Two Core Assumptions'], ['低維與少見同色異譜為何要一起成立？','Why Must Both Assumptions Work Together?'],
    ['低維先驗先縮小自然候選範圍；其中同色異譜相對少見，才讓 RGB 有機會區分候選。任何一項失效都可能讓估計不可靠。','A low-dimensional prior narrows natural candidates. Rare metamers within that region allow RGB to distinguish them. Failure of either condition can undermine recovery.'],
    [['先看所有數學上可能的光譜。','Begin with mathematically possible spectra.'],['只保留先驗容許的範圍。','Keep the region allowed by the prior.'],['再加入 RGB 限制，但保留不確定性。','Add RGB constraints while retaining uncertainty.']],
    ['先知道鑰匙屬於哪一小組，再用齒形排除；若那組內仍有多把完全相同的鑰匙，就不能唯一辨認。','Knowing a small key family narrows the search, but identical patterns within that family still prevent unique identification.'],
    ['候選圓點是概念示意，不是論文測得的機率或候選數。','Candidate dots are conceptual, not measured probabilities or candidate counts.'],
    [['先驗','Prior','看見新輸入前已掌握的資料規律。','Patterns known before seeing the new input.'],['經驗證據','Empirical Evidence','從資料與實驗得到的支持。','Support obtained from observations and experiments.']], 'candidates', '本文／§4', 'assumptions');
  add(['先驗範圍與領域匹配','Prior Coverage and Domain Match'], ['看過很多植物，就一定能估特殊燈光嗎？','Does Training on Plants Cover Unusual Light Sources?'],
    ['字典只能偏向它學過、能表示的形狀。資料越貼近測試領域，越可能涵蓋目標所需變化；範圍窄也可能漏掉新情況。','A dictionary favors shapes it has learned and can represent. A matched domain is more likely to cover the target variation, while a narrow prior can miss new situations.'],
    [['固定目標光譜。','Fix a target spectrum.'],['切換包含與不包含目標形狀的先驗。','Switch between priors with and without the target shape.'],['比較可達誤差，而不只比較資料量。','Compare attainable error, not just data quantity.']],
    ['只看過晴天照片的模型，遇到特殊 LED 照明可能缺少對應經驗。','A model trained on daylight may lack the experience needed for unusual LED illumination.'],
    ['領域相同通常有幫助，但不能直接保證所有新樣本都準確。','Domain matching usually helps but does not guarantee accuracy for every new sample.'],
    [['領域','Domain','具有相近場景、材料或量測條件的資料範圍。','A data setting with related scenes, materials, or acquisition conditions.'],['泛化','Generalization','在未見資料上仍有效的能力。','The ability to work on unseen data.']], 'prior', '本文／§3、§5.1', 'generalization');
  add(['ICVL 與資料代表性','ICVL and Data Representativeness'], ['為何作者需要建立新的自然場景資料庫？','Why Build a Natural-Scene Dataset?'],
    ['航拍地表、少量材料色票與地面自然照片的光譜分布不同。作者蒐集 100 張多類自然場景，讓先驗與評估更貼近目標。','Aerial scenes, small material collections, and ground-level photographs have different spectral distributions. The authors collected 100 varied natural scenes to support a more relevant prior and evaluation.'],
    [['辨認資料來源與使用情境。','Identify the data source and target setting.'],['查看材料、照明與場景是否有代表性。','Inspect material, lighting, and scene coverage.'],['區分樣本很多與樣本涵蓋全面。','Distinguish many samples from broad coverage.']],
    ['拍一棵樹一百萬個像素，不等於看過一百萬種不同場景。','A million pixels from one tree are not a million different scenes.'],
    ['100 張是本文發表時使用的資料規模，不作為資料庫今日規模的宣稱。','100 images is the size reported in the paper, not a claim about the dataset today.'],
    [['代表性','Representativeness','資料是否涵蓋目標問題的重要變化。','Whether data cover important variation in the target problem.'],['分布','Distribution','不同資料情況出現的範圍與頻率。','The range and frequency of different observations.']], 'coverage', '本文／§3', 'prior-icvl');
  add(['519 波段到 31 波段','From 519 Bands to 31'], ['31 是原始相機的極限嗎？','Is 31 the Original Camera’s Limit?'],
    ['原始影像有 519 個波段，範圍為 400–1000 nm。主要實驗取可見光並重新分箱到約 10 nm 間隔的 31 個值，以降低成本並對齊既有比較。','Original images have 519 bands spanning 400–1000 nm. The main experiment selects visible light and bins it to 31 values at roughly 10 nm intervals for cost and benchmark compatibility.'],
    [['先選取研究使用的波長範圍。','Select the experimental wavelength range.'],['把附近窄取樣合併成較寬的波段。','Combine nearby narrow samples into wider bins.'],['觀察資料量減少，也觀察細小特徵被平均。','Observe both lower data volume and averaged fine features.']],
    ['把每分鐘氣溫整理成每小時平均，可以看趨勢，但可能看不到短暫尖峰。','Hourly averages reveal temperature trends but can hide a brief spike visible in minute-by-minute readings.'],
    ['取樣間隔與儀器真正能分開的光譜細節不是同一件事。','Sampling interval and the instrument’s actual spectral resolving ability are different.'],
    [['分箱','Binning','把鄰近取樣彙整成較寬的一格。','Combining nearby samples into a wider bin.'],['近紅外','Near Infrared','位於可見紅光之外、原始資料有涵蓋的部分波段。','Wavelengths beyond visible red, partly covered by the original data.']], 'binning', '本文／§3、§5', 'prior-icvl');
  add(['訓練抽樣與黑背景偏差','Sampling and Dark-Background Bias'], ['抽很多像素，為何仍可能學偏？','Why Can Many Sampled Pixels Still Be Biased?'],
    ['如果影像大部分是暗背景，均勻隨機抽樣常抽到背景。可用數量很多，但真正物體的多樣光譜可能被低估。','When an image is mostly dark background, uniform random sampling mostly selects background. The sample count can be large while useful object spectra remain underrepresented.'],
    [['提高背景比例，觀察抽樣組成。','Increase the background fraction and inspect the sample.'],['改成物體區域抽樣，比較物體樣本數。','Sample an object region and compare useful samples.'],['說明選區也可能產生新的偏差，需要記錄規則。','Recognize that region selection can introduce other bias and must be documented.']],
    ['調查午餐喜好卻只問同一桌很多次，樣本數增加也沒有擴大代表性。','Asking the same table repeatedly increases response count without broadening representativeness.'],
    ['主要實驗每張其他影像取 1000 像素；中央選區策略屬 Yasuma 的另一組實驗。','The main protocol samples 1,000 pixels from each other image. Central-region sampling belongs to the separate Yasuma experiment.'],
    [['抽樣偏差','Sampling Bias','選到的資料比例無法適當代表目標。','The sample proportions do not suitably represent the target.'],['有效樣本','Informative Sample','對學習目標差異有幫助的資料。','Data informative about the variation of interest.']], 'sampling', '本文／§5、§5.2', 'evaluation-protocol');
  add(['稀疏表示與混合直覺','Sparsity and Mixture Intuition'], ['少數權重不為零代表什麼？','What Do a Few Nonzero Weights Mean?'],
    ['用很多候選原子中的少數幾個加權近似一條光譜，稱為稀疏表示。少數主要成分的物理直覺可以支持它，但學到的原子仍是數學工具。','A sparse representation approximates a spectrum using only a few of many candidate atoms. Physical intuition about a few dominant components motivates it, but learned atoms remain mathematical tools.'],
    [['先看八個候選原子與不變的黑色虛線目標；每個原子都是完整曲線。','Inspect eight candidate atoms and the fixed dashed target; each atom is a complete curve.'],['先只用一個原子，再加入第二個；0 係數代表不使用，非零才參與組合。','Use one atom, then add a second; zero coefficients mean unused, while nonzero ones contribute.'],['改係數並同時比較使用數與 RMSE：用得少不自動代表估得準。','Adjust coefficients and compare usage with RMSE; fewer atoms do not automatically mean greater accuracy.']],
    ['像用少數幾種顏料調色，但字典原子不一定對應可命名的顏料。','It resembles mixing a few paints, although a learned atom need not be a named paint.'],
    ['一般字典係數未必非負、和為 1，不能直接當材料百分比。','General dictionary coefficients need not be nonnegative or sum to one; they are not automatically material percentages.'],
    [['非零權重','Nonzero Weight','實際參與這次線性組合的係數。','A coefficient that participates in the current combination.'],['稀疏度','Sparsity Level','一個表示中使用的非零係數數量。','The number of nonzero coefficients in a representation.']], 'sparse', '本文／§4', 'sparse-dictionary');

  add(['原子、基底與過完備字典','Atoms, Bases, and Overcomplete Dictionaries'], ['31 維為何可以放 500 個原子？','Why Can a 31-Dimensional Dictionary Have 500 Atoms?'],
    ['座標維度限制獨立方向數，卻不限制候選工具數。過完備字典提供多個相近但不同的方向，讓不同樣本各選合適的小組。','Dimension limits independent directions, not candidate count. An overcomplete dictionary offers many related directions so different samples can select useful small subsets.'],
    [['先看少量固定基底。','Inspect a small fixed basis.'],['增加候選原子，觀察可選方向。','Add candidate atoms and inspect the available directions.'],['保持每次只選少數個，避免把容量與使用量混淆。','Keep each representation small and separate capacity from usage.']],
    ['工具箱可有 500 支工具，一次修理只用幾支。','A toolbox may hold 500 tools while one repair uses only a few.'],
    ['原子多於維度時一定存在線性依賴；更多原子不自動帶來唯一配方。','More atoms than dimensions imply linear dependence; extra atoms do not automatically yield a unique recipe.'],
    [['原子','Atom','字典中的一個代表向量。','One representative vector in a dictionary.'],['過完備','Overcomplete','候選原子數多於資料維度。','Having more candidate atoms than data dimensions.']], 'dictionary', '本文／§4–5', 'sparse-dictionary');
  add(['500、28 與約 3 個','500, 28, and About Three'], ['這三個數字各自限制哪件事？','What Does Each Number Describe?'],
    ['500 是字典候選數；28 是作者訓練時的稀疏設定；約 3 是結論中對表示所作的經驗觀察。字典容量、允許上限與實際使用量需要分開。','500 is the dictionary size, 28 is the training sparsity setting, and about three is an empirical observation in the conclusion. Capacity, allowed budget, and actual usage are separate.'],
    [['改字典容量，只改可選工具數。','Change capacity to alter available tools.'],['改稀疏預算，只改一次允許使用多少。','Change the sparsity budget to alter allowed usage.'],['看實際用量，可能在達到預算前就停止。','Inspect actual usage, which may stop before the budget is reached.']],
    ['圖書館有 500 本書，最多可借 28 本，不表示今天一定要借滿。','A library may hold 500 books and allow 28 loans without requiring that many today.'],
    ['原文「28 non-zero weights per atom」措辭有疑點，不能解讀成每個原子只有 28 個波段非零；需以實作確認。','The phrase “28 non-zero weights per atom” is ambiguous. It should not be read as 28 nonzero bands per atom; implementation details require verification.'],
    [['容量','Capacity','字典中全部可供選擇的原子數。','The total available atoms.'],['預算','Budget','一次表示允許的非零係數上限設定。','The allowed nonzero-coefficient limit for a representation.']], 'budget', '本文／§5、§6、圖 6b', 'sparse-dictionary');
  add(['K-SVD 的交替最佳化','K-SVD Alternating Optimization'], ['為何輪流固定字典與權重？','Why Alternate between Dictionary and Weights?'],
    ['字典與係數彼此影響。同時任意改兩者不容易判斷改進來源；K-SVD 交替做稀疏編碼與逐原子更新，逐步降低訓練重建誤差。','Dictionary and coefficients influence each other. K-SVD alternates sparse coding with atom updates to reduce training reconstruction error.'],
    [['固定字典，為訓練樣本找稀疏係數。','Hold the dictionary and estimate sparse coefficients.'],['逐一處理原子，只改與該原子相關的部分。','Update atoms individually, changing the relevant parts.'],['完成一輪再重複；迭代不是重新收集資料。','Repeat after a full cycle; iteration does not mean acquiring new data.']],
    ['先用現有工具完成工作，再檢查哪支工具最需要改良。','First work with the current tools, then improve the tool responsible for the remaining mismatch.'],
    ['本文使用既有 K-SVD 演算法；本頁是演算法背景解說。','The paper uses the existing K-SVD algorithm; this page explains that background.'],
    [['迭代','Iteration','一輪完整的重複更新步驟。','One complete cycle of repeated updates.'],['目標函數','Objective','用來衡量目前配方好壞的數量。','A quantity measuring the quality of the current fit.']], 'ksvd-cycle', '本文 §5／引用演算法背景', 'ksvd');
  add(['原子更新的殘差矩陣','Residual Matrix for an Atom Update'], ['更新 d₁ 時，為何先扣掉 d₂ 的貢獻？','Why Subtract d₂ before Updating d₁?'],
    ['要改良 d₁，就先固定其他原子及其貢獻，留下 d₁ 應負責的部分。只把目前確實使用 d₁ 的樣本放進更新矩陣。','To improve d₁, hold other atoms and their contributions fixed. The remainder is what d₁ must explain. Only samples currently using d₁ participate in its update.'],
    [['選擇目前使用 d₁ 的樣本。','Select samples currently using d₁.'],['扣除其他原子的加權貢獻。','Subtract contributions from the other atoms.'],['把剩餘向量並排成矩陣交給 SVD。','Place the remaining vectors in a matrix for SVD.']],
    ['分組報告中要改某一位的部分，先扣除其他人已完成的內容，才看得清他負責的缺口。','To revise one member’s contribution to a group report, set aside what others already provide and inspect the remaining gap.'],
    ['沒有使用 d₁ 的樣本不參與這次更新，這樣才能保留目前的稀疏結構。','Samples not using d₁ are excluded from this update to preserve the current sparse support.'],
    [['支持集合','Support Set','係數不為零、實際參與表示的位置。','Indices of nonzero coefficients participating in a representation.'],['殘差矩陣','Residual Matrix','把多個待解釋向量並排成的表格。','A matrix whose columns are vectors still to be explained.']], 'ksvd-residual', 'K-SVD 背景／本文 §5', 'ksvd');
  add(['SVD 方向與同步更新','SVD Direction and Joint Update'], ['新原子為何不在舊原子的位置？','Why Does the Updated Atom Point Elsewhere?'],
    ['SVD 對待解釋向量找最佳秩一近似：選共同方向並調整每個樣本在此方向的係數。新方向由目前殘差決定，不需要等於舊方向。','SVD finds a best rank-one approximation to the residual vectors: a common direction with a coefficient for each sample. The residuals determine the new direction, not the old atom.'],
    [['把殘差向量移到共同原點比較方向。','Compare residual vectors from a common origin.'],['旋轉候選原子，計算每條向量投影後的剩餘誤差。','Rotate a candidate atom and compute projection errors.'],['選總平方誤差最小的方向，同步更新係數。','Select the direction with minimum total squared error and update coefficients.']],
    ['找一條最能代表多支箭頭的方向線，而不是把箭頭終點取平均。','Find a line representing several arrows, rather than averaging their endpoints.'],
    ['本頁二維教學向量不是 31 波段原始資料；原子的符號也可能與係數一起翻轉而不改變乘積。','These 2D teaching vectors are not original 31-band data. Atom and coefficient signs can flip together without changing their product.'],
    [['秩一近似','Rank-One Approximation','用一個共同方向乘上一組係數近似矩陣。','Approximating a matrix by one direction times a set of coefficients.'],['正交誤差','Orthogonal Error','向量無法被候選方向投影解釋的部分。','The part a projection onto the candidate direction cannot explain.']], 'svd', 'K-SVD／SVD 背景', 'ksvd');
  add(['初始化與參數敏感度','Initialization and Parameter Sensitivity'], ['從哪裡開始學，會影響結果嗎？','Can the Starting Dictionary Affect the Result?'],
    ['K-SVD 從初始字典出發，交替改良不保證找到全域最佳。本文探索字典大小與稀疏目標，也在 Yasuma 實驗嘗試不同初始化。','K-SVD starts from an initial dictionary, and alternating improvement does not guarantee a global optimum. The paper explores size and sparsity and tries different initializations on Yasuma.'],
    [['改變原子的起始方向。','Change an atom’s initial direction.'],['比較更新前的誤差與更新後方向。','Compare initial error and the updated direction.'],['再閱讀圖 6b，辨認改善趨於穩定的區域。','Read Figure 6b to identify where parameter improvements stabilize.']],
    ['從不同登山口爬到附近高點，可能到不同山頭；這是局部最佳化的類比。','Different trailheads can lead to different nearby summits, an analogy for local optimization.'],
    ['本互動只展示單一原子更新；不能拿它的軌跡宣稱重現整個 K-SVD 訓練或圖 6b。','This interaction shows one atom update, not a reproduction of full K-SVD training or Figure 6b.'],
    [['初始化','Initialization','演算法更新前的起始值。','The starting values before optimization.'],['超參數','Hyperparameter','訓練前設定的容量、限制等控制量。','A setting such as capacity or a constraint chosen before training.']], 'initialization', '本文／§5、§5.2、圖 6b', 'ksvd');

  add(['離線準備與線上重建','Offline Preparation and Online Recovery'], ['為何昂貴的準備不必每張照片重做？','Why Can Preparation Be Reused?'],
    ['先收集先驗、學字典並投影，之後同一相機模型與適用領域的新 RGB 可以重用這些結果。線上階段主要為每個像素找係數與重建光譜。','Collect the prior, learn a dictionary, and project it once. New RGB images under the same model and suitable domain can reuse this preparation. Online work finds coefficients and reconstructs spectra.'],
    [['辨認準備階段需要的高光譜資料。','Identify the hyperspectral data needed in preparation.'],['用同一本字典處理多張新圖。','Process several new images with the same dictionary.'],['換相機或領域時，重新檢查是否仍適用。','Recheck applicability after a camera or domain change.']],
    ['先編好字典，讀新文章時查字；不用每讀一篇就從頭編字典。','Compile a dictionary first, then consult it for new texts instead of recompiling for each one.'],
    ['「只需 RGB」指適當先驗準備後的重建輸入，不表示從未使用過高光譜資料。','“RGB-only” describes reconstruction input after prior preparation, not a method that never uses hyperspectral data.'],
    [['離線','Offline','可在新輸入到來前完成的準備。','Preparation performed before a new input arrives.'],['推論','Inference','把已學模型用於新輸入。','Applying a learned model to a new input.']], 'offline', '本文／圖 1、§4.1', 'paired-dictionaries');
  add(['成對字典與原子編號','Paired Dictionaries and Atom Indices'], ['為何兩本字典的編號不能打亂？','Why Must Atom Indices Stay Paired?'],
    ['每個高光譜原子 hᵢ 經同一 R 得到 RGB 原子 cᵢ。係數的第 i 項對應同一對原子，編號錯置就失去回到光譜的依據。','Every hyperspectral atom hᵢ projects through the same R to RGB atom cᵢ. Coefficient i refers to that same pair; mismatching indices breaks the transfer.'],
    [['選擇一個高光譜原子並投影。','Project one hyperspectral atom.'],['保留它與 RGB 原子的共同編號。','Keep its index paired with the RGB atom.'],['切換正確與錯誤配對，觀察重建差異。','Compare correct and scrambled pairings.']],
    ['字典正面是英文、背面是中文；若卡片背面配錯，查到的答案就錯。','A vocabulary card needs its correct translation on the back; mismatched backs produce wrong meanings.'],
    ['配對正確保證代數關係，仍不保證新樣本一定在字典可表示範圍。','Correct pairing preserves algebraic relations but does not guarantee coverage of every new sample.'],
    [['投影','Projection','用量測矩陣把高維向量映成較少數值。','Mapping a high-dimensional vector to fewer measurements.'],['索引','Index','指出原子或係數所屬位置的編號。','The position identifying an atom or coefficient.']], 'pairing', '本文／式 (1)–(3)', 'paired-dictionaries');
  add(['OMP 的殘差與選原子','OMP Residuals and Atom Selection'], ['下一個原子是看哪個分數選出來？','Which Score Selects the Next Atom?'],
    ['OMP 用目前殘差與候選原子的相關性來選方向。應先處理原子尺度；不能只把目標 RGB 與原子做普通距離比較。','OMP selects directions using correlation with the current residual. Atom scales must be handled; ordinary distance from the target RGB is not the standard criterion.'],
    [['初始重建為零，所以殘差等於輸入。','Initially the estimate is zero, so the residual equals the input.'],['比較正規化原子與殘差的絕對內積。','Compare absolute inner products with normalized atoms.'],['加入最高分且有效的方向，再重算權重。','Add the highest-scoring useful direction and refit coefficients.']],
    ['先找最能解釋「目前還缺的部分」的工具，而非最像整個目標的工具。','Select the tool explaining what is still missing, rather than merely resembling the entire target.'],
    ['原子編號只代表本次示意字典；選取順序由數據與正規化決定，不是固定口訣。','Atom numbers belong to this teaching dictionary; order depends on data and normalization, not a fixed rule.'],
    [['內積','Inner Product','逐項相乘再相加，可衡量方向相關性。','A sum of componentwise products measuring directional correlation.'],['殘差','Residual','輸入向量減去目前重建向量。','The input minus the current reconstruction.']], 'omp-select', '本文使用 OMP／演算法背景', 'omp-recovery');
  add(['OMP 為何重算全部權重','Why OMP Refits All Selected Weights'], ['新原子加入，舊係數也要改嗎？','Should Old Coefficients Change When an Atom Is Added?'],
    ['新方向可能與舊方向重疊。OMP 對所有已選原子一起做最小平方擬合，分配它們的貢獻，才不會把同一部分重複計算。','A new direction may overlap earlier ones. OMP jointly fits all selected atoms by least squares so their contributions are reassigned instead of counted twice.'],
    [['先選一個原子並求最佳係數。','Fit a coefficient for the first atom.'],['加入第二個原子。','Add a second atom.'],['比較只加新貢獻與一起重算的結果。','Compare adding only the new contribution with jointly refitting.']],
    ['新增一位組員後，原有分工也可能要調整，而不是只把新工作疊上去。','Adding a team member can require redistributing existing work rather than just adding another contribution.'],
    ['理想最小平方下，殘差與已選空間正交；這是幾何性質，不代表物理光譜已正確。','In ideal least squares, the residual is orthogonal to the selected span. This geometric property does not prove spectral accuracy.'],
    [['最小平方','Least Squares','讓所有誤差分量的平方總和最小。','Minimizing the sum of squared residual components.'],['正交','Orthogonal','向量內積為零，幾何上互相垂直。','Having zero inner product, geometrically perpendicular.']], 'omp-refit', 'OMP 背景／式 (4)', 'omp-recovery');
  add(['OMP 停止與三維上限','OMP Stopping and the 3D Limit'], ['稀疏預算是 28，為何 RGB 端可能很快停止？','Why Can RGB Fitting Stop Well before a Budget of 28?'],
    ['RGB 只有三維。理想情況下最多三個獨立方向就能張成它；誤差已小或沒有新獨立方向時，再加原子沒有增加獨立量測資訊。','RGB is three-dimensional. At most three independent directions can span it in the ideal case. A small residual or lack of independent directions can stop selection before a larger budget.'],
    [['一步一步加入有效方向。','Add useful directions one step at a time.'],['同時看已選數、秩與殘差。','Track selected count, rank, and residual.'],['達到停止條件後，另用真值評估光譜。','After stopping, evaluate the spectrum separately against ground truth.']],
    ['已用三個獨立方向描述房間內的位移，更多重複方向不會增加空間維度。','Three independent directions describe a displacement in a room; extra repeated directions add no dimension.'],
    ['能精確擬合三個 RGB，不等於能唯一恢復 31 波段。','Fitting three RGB values exactly does not uniquely recover 31 spectral bands.'],
    [['張成','Span','一組向量所有線性組合能到達的範圍。','All vectors reachable by linear combinations of a set.'],['停止容許誤差','Stopping Tolerance','殘差小到可停止的設定門檻。','A chosen residual threshold for stopping.']], 'omp-stop', '本文／§5–6、腳註 1', 'omp-recovery');
  add(['權重轉移與回投影','Weight Transfer and Reprojection'], ['符合 RGB 為何仍可能不是正確光譜？','Why Is an RGB Match Not Proof of the Spectrum?'],
    ['先用 D_RGB 找 w，再算 ĥ=Dₕw。因 D_RGB=RDₕ，回投影可符合輸入；但不同光譜本來就可能產生相同 RGB。','Find w using D_RGB, then compute ĥ=Dₕw. Because D_RGB=RDₕ, reprojection can match the input, yet different spectra can already share RGB.'],
    [['在 RGB 端固定係數。','Fix coefficients on the RGB side.'],['同係數組合配對高光譜原子。','Combine paired hyperspectral atoms with those coefficients.'],['先檢查一致性，再檢查真值誤差。','Check consistency first, then ground-truth error.']],
    ['總帳對得上不代表每筆明細都正確，不同明細可能有同一總額。','A matching total does not prove every line item is correct; different details can have the same total.'],
    ['式 (6) 是模型內的一致性關係；模型失配與雜訊時通常只能近似。','Equation (6) expresses model consistency; mismatch and noise generally make it approximate.'],
    [['回投影','Reprojection','把估計光譜重新通過相機模型。','Passing an estimated spectrum through the camera model again.'],['相容性','Consistency','估計是否符合已知量測限制。','Whether an estimate agrees with known measurement constraints.']], 'reprojection', '本文／式 (4)–(6)', 'conclusions');

  add(['真值與模擬 RGB','Ground Truth and Simulated RGB'], ['研究者怎麼知道估計錯多少？','How Can Researchers Measure Reconstruction Error?'],
    ['先有高光譜量測作真值，再以已知 R 生成 RGB，只把 RGB 給重建演算法。最後把估計與保留的真值比較。','Begin with measured hyperspectral ground truth and generate RGB using known R. Give RGB to the recovery algorithm, then compare its estimate with the retained ground truth.'],
    [['保留完整高光譜答案。','Retain the measured full spectrum.'],['由答案生成三通道量測。','Generate three-channel measurements from it.'],['重建完成才揭露答案並算誤差。','Reveal the reference after recovery and compute error.']],
    ['像先保留完整原圖，再只提供縮小版讓方法估計，最後才能知道遺失細節是否估對。','Retaining an original before providing a reduced version allows missing-detail estimates to be evaluated later.'],
    ['模擬控制較清楚，但不能直接代表每台真實相機的結果。','Simulation offers control but does not directly establish results for every physical camera.'],
    [['真值','Ground Truth','獨立保存的量測參考。','An independently retained measured reference.'],['模擬量測','Simulated Measurement','把真值套入已知感測模型產生輸入。','Input generated by applying a known sensing model to ground truth.']], 'truth', '本文／§5', 'evaluation-protocol');
  add(['留一影像與資料洩漏','Leave-One-Image-Out and Leakage'], ['為何測試圖的相似像素不應混進主要訓練？','Why Keep the Test Image out of Main Training?'],
    ['主要實驗每次保留一整張影像測試，其餘影像建立字典。這比在同張圖內任意分像素，更能檢查對未見影像的表現。','The main experiment holds out one whole image while the others build the dictionary. This better tests unseen-image performance than mixing nearby pixels from the same image.'],
    [['選一張完整影像作測試。','Hold out one whole image.'],['其他影像供訓練抽樣。','Sample training data from other images.'],['換下一張測試，直到全部輪過。','Rotate the held-out image until all have been tested.']],
    ['把同一張考卷的答案先放進參考資料，無法公平測量是否能解新考卷。','Including answers from a test in reference material does not fairly assess performance on a new test.'],
    ['這是在解釋主要驗證規則；Yasuma 的同影像先驗是另一個明示的實驗情境。','This explains the main validation protocol; Yasuma’s same-image prior is a separate disclosed setting.'],
    [['資料洩漏','Data Leakage','評估時使用到本不應可見的測試資訊。','Using test information that should not be available in an evaluation.'],['留一驗證','Leave-One-Out','每輪保留一個單位作測試，其餘作訓練。','Holding out one unit for testing in each round.']], 'holdout', '本文／§5', 'evaluation-protocol');
  add(['重複抽樣與隨機性','Repeated Sampling and Randomness'], ['同一方法重跑，結果為何不同？','Why Can Repeated Runs Differ?'],
    ['訓練像素是隨機抽出的，字典也可能隨抽樣改變。作者讓每張測試影像重建數次，以降低只看某次隨機結果的影響。','Training pixels are randomly sampled, so learned dictionaries may vary. The authors reconstruct each test image several times to reduce dependence on one random outcome.'],
    [['觀察一批示意誤差。','Inspect one batch of illustrative errors.'],['更換抽樣種子，得到另一批結果。','Change the sampling seed to obtain another batch.'],['同時看平均與分散程度，不只挑最好一次。','Inspect both average and spread instead of selecting the best run.']],
    ['投籃一次進球不能說明穩定命中率，需要多次嘗試。','One made basket does not establish a stable shooting rate; repeated attempts matter.'],
    ['本頁分布為合成資料，沒有捏造作者未報告的標準差。','This distribution is synthetic; it does not invent an unreported standard deviation for the paper.'],
    [['隨機種子','Random Seed','讓同一組偽隨機抽樣可再現的起點。','A starting value that makes pseudorandom sampling reproducible.'],['變異','Variability','不同重複結果的分散程度。','The spread of results across repeated runs.']], 'repeat', '本文／§5', 'evaluation-protocol');
  add(['絕對、相對誤差與暗像素','Absolute Error, Relative Error, and Dark Pixels'], ['同樣差 0.01，為何暗像素看起來錯更大？','Why Is the Same 0.01 Error Larger for a Dark Pixel?'],
    ['絕對誤差看差了多少；相對誤差再除以真值大小。分母越小，相同差距的比例就越大，因此要搭配閱讀兩種指標。','Absolute error measures the difference; relative error divides by the reference magnitude. A smaller denominator makes the same difference proportionally larger.'],
    [['固定一個差值，改變真值亮度。','Fix a difference and vary reference brightness.'],['比較絕對誤差與相對誤差。','Compare absolute and relative error.'],['再看多波段的平方、平均與開根號。','Then inspect squaring, averaging, and rooting across bands.']],
    ['少 1 元對 100 元是 1%，對 2 元卻是 50%。','A shortage of 1 is 1% of 100 but 50% of 2.'],
    ['本頁先教單值相對誤差與標準 RMSE；不宣稱這就是作者公開程式的全部細節。','This teaches single-value relative error and standard RMSE, not every detail of the authors’ public implementation.'],
    [['RMSE','RMSE','誤差平方的平均再開根號。','The square root of the mean squared error.'],['分母效應','Denominator Effect','真值接近零時，相對誤差被放大。','Relative error amplification when the reference approaches zero.']], 'errors', '本文／§5.1、表 1', 'error-measures');
  add(['誤差圖、波段與失敗案例','Error Maps, Bands, and Failure Cases'], ['全圖平均很好，還能錯在哪裡？','What Can a Good Average Hide?'],
    ['平均值把位置與波段混在一起。誤差圖顯示哪裡錯，逐波段曲線顯示哪些波長難估，單像素曲線則保留局部細節。','An average pools locations and bands. Error maps show where mistakes occur, bandwise curves show difficult wavelengths, and pixel spectra retain local details.'],
    [['選擇一個像素讀真值與估計曲線。','Select a pixel to inspect reference and estimate.'],['切換波段，讀取對應誤差。','Switch bands and read the corresponding error.'],['對照全圖平均，找出被平均掩蓋的例外。','Compare with the global average to find hidden exceptions.']],
    ['全班平均 80 分，仍可能有人某科很弱；平均不是每個人的成績。','A class average of 80 can hide a student struggling in one subject.'],
    ['本頁小圖是合成誤差示範；論文的原始證據在圖 4–6。','The small map uses synthetic errors; the paper’s evidence is in Figures 4–6.'],
    [['誤差圖','Error Map','把各位置的差距畫回影像。','A spatial display of error at each location.'],['逐波段分析','Bandwise Analysis','分開檢查不同光譜通道的誤差。','Inspecting error separately for each spectral channel.']], 'error-map', '本文／圖 4–6', 'results');
  add(['領域內、跨領域與外部測試','In-Domain, Cross-Domain, and External Tests'], ['換場景與換資料庫有何不同？','How Does a New Scene Differ from a New Dataset?'],
    ['同領域測試檢查相近資料；跨領域更換先驗來源；外部資料還可能改變量測範圍、亮度、模糊與運動。不能把所有差距只歸因於一件事。','In-domain tests use related data. Cross-domain tests change the prior source. External data can also differ in spectral range, brightness, blur, and motion, so error changes have multiple possible causes.'],
    [['比較表 1 同領域子集。','Compare in-domain subsets in Table 1.'],['查看公園與鄉村互換先驗的結果。','Inspect park/rural prior transfers.'],['再讀 Chakrabarti 室內外結果及資料差異。','Read external indoor/outdoor results together with their acquisition differences.']],
    ['在同校換班測試，與到另一國家測試，改變的條件數不同。','Testing another class in one school differs from testing in another country, where more conditions change.'],
    ['表 1 的相對誤差是作者報告指標，不能換成分類準確率。','Table 1 reports the authors’ relative-error metric, not classification accuracy.'],
    [['域轉移','Domain Shift','訓練與測試資料的規律改變。','A change in data regularities between training and test.'],['外部驗證','External Validation','用不同來源資料檢查方法。','Evaluation on data from another source.']], 'domain-results', '本文／§5.1、表 1', 'generalization');

  add(['方法比較的資訊成本','Information Costs in Method Comparisons'], ['同樣報誤差，拿到的輸入也相同嗎？','Do Compared Methods Receive the Same Information?'],
    ['本文重建主要依靠 RGB 與已準備先驗；有些比較方法還需要該場景的低解析高光譜或可控光源。誤差相近時也要交代資訊與硬體成本。','The main method uses RGB and a prepared prior. Some comparisons also need low-resolution hyperspectral measurements of the scene or controlled illumination. Error must be read alongside information and hardware costs.'],
    [['列出每種方法實際取得的資訊。','List the information each method receives.'],['分開訓練先驗與測試場景的額外量測。','Separate training priors from extra measurements of the test scene.'],['比較誤差、硬體與速度，而不只排行。','Compare error, hardware, and speed instead of ranking one number.']],
    ['開書與閉書考試的分數，必須連同可用資料一起解讀。','Open-book and closed-book scores must be interpreted with their allowed information.'],
    ['輸入不同不表示完全不能比較，但不能說是完全相同條件的優勝。','Different inputs do not forbid comparison, but they prevent claiming identical test conditions.'],
    [['基準方法','Baseline','用來對照表現的已有方法。','An existing method used for comparison.'],['資訊條件','Information Conditions','演算法實際可以取得的資料。','The data an algorithm is actually allowed to access.']], 'comparison', '本文／§2、§5.2、表 2', 'results');
  add(['Yasuma 的同影像先驗','Yasuma Same-Image Prior'], ['這組比較與主要留一驗證有何不同？','How Does This Comparison Differ from the Main Protocol?'],
    ['Yasuma 實驗從每張待重建影像抽取 10,000 個高光譜像素（約 3.8%）建立字典，並嘗試中央選區與不同初始化。這是明示的特殊實驗條件。','For Yasuma, the authors sample 10,000 hyperspectral pixels, about 3.8%, from each image being reconstructed. They try central-region sampling and different initializations under this disclosed setting.'],
    [['先看主要協定：測試圖不供字典訓練。','Inspect the main protocol: the test image does not train the dictionary.'],['再看 Yasuma：部分同圖高光譜用於先驗。','Inspect Yasuma: some same-image hyperspectral data build the prior.'],['說明兩組結果各自支持的情境。','State the setting supported by each result.']],
    ['事先知道某家店的部分菜色，與從其他店學經驗再猜新店，是不同資訊條件。','Knowing some dishes from a particular restaurant differs from learning only from other restaurants.'],
    ['條件不同需要清楚揭露，不能只憑這點直接斷定結果無效。','The difference must be disclosed, but it alone does not invalidate the result.'],
    [['同影像先驗','Same-Image Prior','先驗包含待重建影像的部分光譜量測。','A prior containing some spectral measurements from the image being reconstructed.'],['協定','Protocol','資料如何分配、訓練與評估的規則。','Rules for data access, training, and evaluation.']], 'yasuma', '本文／§5.2，頁 29–30', 'evaluation-protocol');
  add(['逐像素獨立與平行化','Pixel Independence and Parallelism'], ['為何很多像素能同時計算？','Why Can Many Pixels Be Processed Simultaneously?'],
    ['固定字典後，本文核心重建對每個 RGB 像素分別求權重，不需要等待鄰居的答案。這方便分工，也表示此核心步驟沒有直接使用鄰域關係。','With a fixed dictionary, each pixel independently obtains coefficients without waiting for its neighbors. This supports parallelism but does not directly use neighborhood relations in the core step.'],
    [['把像素任務排成佇列。','Queue pixel tasks.'],['增加工作核心，同時處理多個任務。','Add workers to process tasks concurrently.'],['區分理想平行加速與真實傳輸、排程成本。','Separate ideal parallel speedup from real scheduling and transfer costs.']],
    ['每位同學各算一道互不相依的題目，可以分工；若下一題依賴上一題，就沒那麼自由。','Independent questions can be distributed among students; dependent steps are harder to parallelize.'],
    ['本頁時間是理想化示意，未測量 GPU 或真實 CPU 效能。','Timing is idealized and is not a CPU or GPU benchmark.'],
    [['平行化','Parallelism','讓互不相依的工作同時執行。','Running independent tasks at the same time.'],['空間脈絡','Spatial Context','鄰近像素間的位置與內容關係。','Relationships among neighboring image locations.']], 'parallel', '本文／§4.1、§5.2', 'omp-recovery');
  add(['執行時間與即時性','Runtime and Real-Time Claims'], ['秒級計算就代表任何影片都能即時嗎？','Does Seconds-Level Runtime Guarantee Real-Time Video?'],
    ['速度要連同影像尺寸、硬體、是否包含字典學習與每秒幀數解讀。作者報告秒級計算並討論平行化潛力，不等於已驗證所有影片情境。','Runtime depends on image size, hardware, whether dictionary learning is included, and frame rate. The paper reports seconds-level computation and discusses parallel potential, not every video setting.'],
    [['先分開一次性訓練與每幀推論。','Separate one-time training from per-frame inference.'],['計算總時間與平均每幀成本。','Compute total time and average frame cost.'],['對照目標幀率所允許的時間。','Compare with the frame-time budget.']],
    ['30 fps 每幀約只有 33.3 毫秒；一次性準備可以分攤，但每幀仍要趕得上。','At 30 fps, each frame has about 33.3 ms. Preparation can be amortized, but per-frame work must still fit the budget.'],
    ['互動的訓練與推論時間可調，全部是假設值，不是論文測速重現。','All adjustable training and inference times are hypothetical, not reproduced paper benchmarks.'],
    [['吞吐量','Throughput','單位時間完成的工作數。','Work completed per unit time.'],['分攤成本','Amortized Cost','把一次性支出分配到多次使用。','Spreading a one-time cost over repeated uses.']], 'runtime', '本文／§5.2', 'results');
  add(['相機校準與模型失配','Calibration and Model Mismatch'], ['R 估錯時，演算法算對仍會出錯嗎？','Can Correct Computation Fail with an Incorrect R?'],
    ['演算法依賴相機反應模型。本文真機輸出與模型預測本身已有相對誤差 0.0474，表示進入重建前就有模型落差。','Recovery relies on the camera-response model. The paper reports a 0.0474 relative discrepancy between real and predicted camera responses, showing mismatch before reconstruction.'],
    [['固定一條真實輸入的示意光譜。','Fix an illustrative input spectrum.'],['偏移感光曲線，產生錯誤模型的量測。','Shift response curves to simulate a mismatched model.'],['比較差距，理解為何需要校準。','Compare outputs to see why calibration matters.']],
    ['尺的刻度錯了，算術正確也會得到錯的長度。','With an incorrectly marked ruler, correct arithmetic can still give an incorrect length.'],
    ['本頁偏移是合成擾動；0.0474 是原文報告值，兩者不互相替代。','The shift is synthetic, while 0.0474 is the reported paper value; they are not interchangeable.'],
    [['模型失配','Model Mismatch','模型規則與真實量測過程不一致。','A mismatch between the assumed model and the actual acquisition process.'],['校準誤差','Calibration Error','設備反應估計與實際反應之間的差距。','The difference between estimated and actual device responses.']], 'calibration', '本文／§5.3', 'real-camera');
  add(['局部稀疏與全域 PCA','Local Sparsity and Global PCA'], ['約 3 個原子與很多主成分矛盾嗎？','Do About Three Atoms Contradict Many Principal Components?'],
    ['不同像素可使用不同的三原子小組。許多小組各張成局部空間，聯集可能很複雜；它不必等於整個資料都落在同一個三維線性子空間。','Different pixels can use different three-atom subsets. Their local spans can form a complex union rather than one shared three-dimensional linear subspace.'],
    [['固定一組方向，觀察全域表示。','Inspect a fixed set of global directions.'],['允許每筆資料選不同的小組。','Allow each observation to select a different subset.'],['比較局部使用量與描述整體資料所需方向。','Compare local atom usage with the directions needed for the whole dataset.']],
    ['每個人只走兩條路，不表示整座城市只有兩條路。','Each person may use only two roads even though the city contains many roads.'],
    ['作者約 3 原子的觀察是經驗結果；不是唯一恢復、所有場景或所有相機的保證。','The observation of about three atoms is empirical, not a uniqueness guarantee for all scenes or cameras.'],
    [['子空間聯集','Union of Subspaces','允許資料分別落在多個不同線性空間。','Allowing data to occupy several different linear subspaces.'],['基底選擇','Basis Selection','表示效率會隨所選方向改變。','Representation efficiency depends on the chosen directions.']], 'local-global', '本文／§6', 'conclusions');

  window.ConceptData = { groups, entries };
})();
