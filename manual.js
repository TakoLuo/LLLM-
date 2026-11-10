(() => {
  'use strict';
  const list = document.getElementById('topic-list');
  const count = document.getElementById('topic-count');
  const search = document.getElementById('topic-query');
  const data = window.ConceptData;
  if (!data) {
    count.textContent = '索引暫時無法載入。';
    const link = document.createElement('a');
    link.href = './index.html#knowledge-directory';
    link.textContent = '開啟報告的知識點目錄';
    list.append(link);
    return;
  }

  const readingTopics = new Set([19, 31, 43]);
  const formulaTopics = new Set([8, 11, 24, 28, 29, 33, 34, 35, 37]);
  const acronyms = new Set(['rgb', 'omp', 'pca', 'rmse', 'svd', 'hsi', 'icvl', 'raw', 'jpeg']);
  const extra = {
    3: '看完兩條光譜後，切換通道並勾選少數波段。最後全選，確認兩個樣本的完整 RGB 相同。',
    8: '先從三項示例練習，再展開 31 波段。觀察視窗上方的滑桿只移動讀取位置。',
    14: '先拖動兩組分配，再比對「重複相同量測」與「單獨量一個波段」的差異。',
    18: '固定主成分數 k，切換訓練光譜，比較整批變異比例與單筆 RMSE。換波段可讀單項代入式。',
    30: '把迭代輪數設成 3。訓練平方差和保留測試光譜 RMSE 可能各由不同起點拿到最低。',
    36: '若要手動改同一組倍率並比較兩條計算路徑，使用第 24 點的公式代入。',
    48: '依序切像素 1、2、3。先看倍率改變，再看局部原子組合換組，而全域 PCA 的方向與平均值沿用。'
  };
  function add(parent, tag, label, className) {
    const node = document.createElement(tag);
    if (label) node.textContent = label;
    if (className) node.className = className;
    parent.append(node);
    return node;
  }
  const groups = data.groups.map(([title], index) => {
    const block = add(list, 'details', '', 'topic-group');
    block.open = index === 0;
    add(block, 'summary', title);
    return {block, body:add(block, 'div', '', 'topic-items'), items:[]};
  });

  for (const entry of data.entries) {
    const group = groups[entry.group];
    const number = String(entry.number).padStart(2, '0');
    const row = add(group.body, 'details', '', 'topic-item');
    const label = add(row, 'summary', number + '　' + entry.title[0] + ' ');
    add(label, 'span', entry.title[1], 'topic-name').lang = 'en';
    const detail = add(row, 'div', '', 'topic-detail');
    const category = readingTopics.has(entry.number) ? '閱讀對照' : '互動示意';
    add(detail, 'span', category, 'tag');
    add(detail, 'p', entry.question[0]);
    const steps = add(detail, 'ol');
    for (const [step] of entry.steps) add(steps, 'li', step);
    if (extra[entry.number]) add(detail, 'p', extra[entry.number]);
    const links = add(detail, 'p');
    add(links, 'a', '開啟知識點 ' + number).href = './index.html#' + entry.id;
    if (formulaTopics.has(entry.number)) {
      links.append('　');
      add(links, 'a', '前往公式代入').href = './index.html#' + entry.id + '-lab-workspace';
    }
    const keywords = [entry.title,entry.question,entry.terms,entry.steps,entry.lab,extra[entry.number] || ''].flat(Infinity).join(' ').toLowerCase();
    group.items.push({row,number:entry.number,keywords});
  }
  const allCount = data.entries.length;
  function updateResults() {
    const query = search.value.normalize('NFKC').trim().toLowerCase();
    const exact = /^#?\d{1,2}$/.test(query) ? Number(query.replace('#', '')) : null;
    const words = query.split(/\s+/).map(word => acronyms.has(word)
      ? new RegExp(`(?:^|[^a-z0-9])${word}(?=[^a-z0-9]|$)`)
      : word);
    let total = 0;
    for (const group of groups) {
      let matches = 0;
      for (const item of group.items) {
        const show = exact === null
          ? words.every(word => typeof word === 'string' ? item.keywords.includes(word) : word.test(item.keywords))
          : item.number === exact;
        item.row.hidden = !show;
        if (show) matches++;
      }
      group.block.hidden = matches === 0;
      if (query && matches) group.block.open = true;
      total += matches;
    }
    count.textContent = total ? `顯示 ${total}／${allCount} 個知識點` : '找不到符合的知識點，請試試其他關鍵字。';
  }
  search.addEventListener('input', updateResults);
  document.getElementById('topic-search').addEventListener('submit', event => event.preventDefault());
  document.getElementById('clear-query').addEventListener('click', () => {
    search.value = '';
    updateResults();
    search.focus();
  });
  updateResults();
})();
