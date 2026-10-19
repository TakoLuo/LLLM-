(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const gaussian = (x, center, width) => Math.exp(-0.5 * ((x - center) / width) ** 2);
  const dot = (left, right) => left.reduce((sum, value, index) => sum + value * right[index], 0);
  const wavelengths = Array.from({ length: 31 }, (_, index) => 400 + index * 10);
  const SVG_NS = "http://www.w3.org/2000/svg";
  const legacyTopicPages = [
    { id: 'spectrum', title: '光與光譜特徵' },
    { id: 'hyperspectral-imaging', title: '高光譜影像與量測代價' },
    { id: 'rgb-sensing', title: 'RGB 相機如何壓縮一條光譜' },
    { id: 'inverse-metamerism', title: '逆問題與同色異譜' },
    { id: 'assumptions', title: '估計成立的兩項假設' },
    { id: 'prior-icvl', title: '高光譜先驗與 ICVL 資料庫' },
    { id: 'sparse-dictionary', title: '稀疏表示、原子與過完備字典' },
    { id: 'ksvd', title: 'K-SVD 如何學會一本字典' },
    { id: 'paired-dictionaries', title: '建立成對字典：式（1）至（3）' },
    { id: 'omp-recovery', title: '用 OMP 重建光譜：式（4）至（6）' },
    { id: 'evaluation-protocol', title: '實驗如何避免偷看答案' },
    { id: 'error-measures', title: '如何閱讀 RMSE 與誤差位置' },
    { id: 'results', title: '實驗結果告訴我們什麼' },
    { id: 'generalization', title: '先驗範圍如何影響泛化' },
    { id: 'real-camera', title: '從模擬走向真實 Canon 40D' },
    { id: 'conclusions', title: '論文能證明什麼、不能證明什麼' }
  ];
  const topicPages = window.ReportConcepts?.pages || legacyTopicPages;
  const auxiliaryPages = [...(window.ReportConcepts ? legacyTopicPages : []), { id: 'sources', title: '論文與公開資源' }];
  let updateReadingProgress = () => {};

  const makeSvg = (tag, attrs = {}, text = "") => {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (text) node.textContent = text;
    return node;
  };

  const clearSvg = (svg) => {
    [...svg.children].forEach((child) => {
      if (!['title', 'desc'].includes(child.tagName.toLowerCase())) child.remove();
    });
  };

  const spectrumFunctions = {
    leaf: (w) => clamp(0.08 + 0.46 * gaussian(w, 545, 34) + 0.08 * gaussian(w, 445, 24) + 0.43 / (1 + Math.exp(-(w - 685) / 7))),
    soil: (w) => clamp(0.16 + 0.00095 * (w - 400) + 0.055 * gaussian(w, 620, 80)),
    sky: (w) => clamp(0.10 + 0.68 * gaussian(w, 445, 63) + 0.08 * gaussian(w, 560, 110)),
    wall: (w) => clamp(0.48 + 0.05 * Math.sin((w - 390) / 52)),
    neon: (w) => clamp(0.035 + 0.78 * gaussian(w, 438, 7) + 0.93 * gaussian(w, 546, 6) + 0.74 * gaussian(w, 611, 7)),
    laser: (w) => clamp(0.025 + 0.98 * gaussian(w, 635, 5))
  };

  const spectra = Object.fromEntries(
    Object.entries(spectrumFunctions).map(([key, fn]) => [key, wavelengths.map(fn)])
  );

  const materialNames = {
    leaf: "綠葉", soil: "土壤", sky: "天空", wall: "灰牆", neon: "特殊燈光", laser: "窄頻雷射"
  };

  const sensors = {
    r: wavelengths.map((w) => gaussian(w, 610, 54)),
    g: wavelengths.map((w) => gaussian(w, 540, 46)),
    b: wavelengths.map((w) => gaussian(w, 455, 39))
  };

  const sensorRgb = (spectrum) => ['r', 'g', 'b'].map((channel) => {
    const response = sensors[channel];
    const numerator = spectrum.reduce((sum, value, index) => sum + value * response[index], 0);
    const denominator = response.reduce((sum, value) => sum + value, 0);
    return clamp(numerator / denominator);
  });

  const wavelengthToRgb = (wavelength) => {
    let r = 0; let g = 0; let b = 0;
    if (wavelength < 440) { r = -(wavelength - 440) / 40; b = 1; }
    else if (wavelength < 490) { g = (wavelength - 440) / 50; b = 1; }
    else if (wavelength < 510) { g = 1; b = -(wavelength - 510) / 20; }
    else if (wavelength < 580) { r = (wavelength - 510) / 70; g = 1; }
    else if (wavelength < 645) { r = 1; g = -(wavelength - 645) / 65; }
    else { r = 1; }
    const edge = wavelength < 420 ? 0.55 + 0.45 * (wavelength - 400) / 20 : wavelength > 680 ? 0.55 + 0.45 * (700 - wavelength) / 20 : 1;
    return [r, g, b].map((value) => Math.round(255 * clamp(value * edge)));
  };

  function drawSpectrum(svg, series, options = {}) {
    clearSvg(svg);
    const width = options.width || 720;
    const height = options.height || 360;
    const multiRowLegend = series.length > 3;
    const margin = { left: 66, right: 22, top: multiRowLegend ? 62 : 30, bottom: 55 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const x = (w) => margin.left + ((w - 400) / 300) * innerWidth;
    const y = (value) => margin.top + (1 - clamp(value, 0, options.yMax || 1)) * innerHeight;
    const gridColor = options.dark ? '#66809e' : '#cbd5df';
    const textColor = options.dark ? '#edf3f9' : '#556176';

    if (Number.isFinite(options.bandCenter)) {
      const left = x(Math.max(400, options.bandCenter - 25));
      const right = x(Math.min(700, options.bandCenter + 25));
      svg.append(makeSvg('rect', { x: left, y: margin.top, width: right - left, height: innerHeight, fill: '#f0a51a', opacity: 0.14, rx: 4 }));
    }

    [0, 0.25, 0.5, 0.75, 1].forEach((tick) => {
      svg.append(makeSvg('line', { x1: margin.left, x2: width - margin.right, y1: y(tick), y2: y(tick), stroke: gridColor, 'stroke-width': 1, 'stroke-dasharray': tick === 0 ? '0' : '4 6' }));
      svg.append(makeSvg('text', { x: margin.left - 12, y: y(tick) + 5, 'text-anchor': 'end', fill: textColor }, tick.toFixed(tick === 0 || tick === 1 ? 0 : 2)));
    });
    [400, 450, 500, 550, 600, 650, 700].forEach((tick) => {
      svg.append(makeSvg('line', { x1: x(tick), x2: x(tick), y1: margin.top, y2: height - margin.bottom, stroke: gridColor, 'stroke-width': 1, opacity: 0.45 }));
      svg.append(makeSvg('text', { x: x(tick), y: height - 25, 'text-anchor': 'middle', fill: textColor }, String(tick)));
    });
    svg.append(makeSvg('line', { x1: margin.left, x2: margin.left, y1: margin.top, y2: height - margin.bottom, stroke: textColor, 'stroke-width': 2 }));
    svg.append(makeSvg('line', { x1: margin.left, x2: width - margin.right, y1: height - margin.bottom, y2: height - margin.bottom, stroke: textColor, 'stroke-width': 2 }));
    svg.append(makeSvg('text', { x: margin.left + innerWidth / 2, y: height - 3, 'text-anchor': 'middle', class: 'axis-title', fill: textColor }, '波長（nm）'));
    svg.append(makeSvg('text', { x: 18, y: margin.top + innerHeight / 2, 'text-anchor': 'middle', transform: `rotate(-90 18 ${margin.top + innerHeight / 2})`, class: 'axis-title', fill: textColor }, '相對強度'));

    series.forEach((item) => {
      const points = item.values.map((value, index) => `${x(wavelengths[index]).toFixed(1)},${y(value).toFixed(1)}`).join(' ');
      svg.append(makeSvg('polyline', {
        points,
        fill: 'none',
        stroke: item.color,
        'stroke-width': item.width || 4,
        'stroke-linejoin': 'round',
        'stroke-linecap': 'round',
        'stroke-dasharray': item.dash || ''
      }));
    });

    if (Number.isFinite(options.marker)) {
      svg.append(makeSvg('line', { x1: x(options.marker), x2: x(options.marker), y1: margin.top, y2: height - margin.bottom, stroke: options.markerColor || '#c45f17', 'stroke-width': 4 }));
      svg.append(makeSvg('circle', { cx: x(options.marker), cy: y(options.markerValue || 0), r: 7, fill: options.markerColor || '#c45f17', stroke: '#fff', 'stroke-width': 3 }));
    }

    let legendX = margin.left + 8;
    series.forEach((item, index) => {
      const legendY = multiRowLegend ? 14 + Math.floor(index / 3) * 25 : 15;
      if (multiRowLegend) legendX = margin.left + (index % 3) * (innerWidth / 3);
      svg.append(makeSvg('line', { x1: legendX, x2: legendX + 28, y1: legendY, y2: legendY, stroke: item.color, 'stroke-width': 4, 'stroke-dasharray': item.dash || '' }));
      svg.append(makeSvg('text', { x: legendX + 34, y: legendY + 5, fill: textColor }, item.label));
      if (!multiRowLegend) legendX += Math.max(112, item.label.length * 18 + 58);
    });
  }

  function drawMiniCurve(values, color = '#1769aa') {
    const svg = makeSvg('svg', { viewBox: '0 0 50 38', class: 'mini-curve', 'aria-hidden': 'true' });
    const points = values.map((value, index) => `${(index / (values.length - 1)) * 48 + 1},${36 - value * 32}`).join(' ');
    svg.append(makeSvg('polyline', { points, fill: 'none', stroke: color, 'stroke-width': 3 }));
    return svg;
  }

  function initializeGlobalNavigation() {
    const progress = $('#readingProgress');
    updateReadingProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = `${max > 0 ? clamp(window.scrollY / max) * 100 : 0}%`;
    };
    addEventListener('scroll', updateReadingProgress, { passive: true });
    addEventListener('resize', updateReadingProgress);
    updateReadingProgress();

    const presentButton = $('#presentMode');
    const presentLabel = $('.mode-label', presentButton);
    presentButton.addEventListener('click', () => {
      const active = document.body.classList.toggle('presentation-mode');
      presentButton.setAttribute('aria-pressed', String(active));
      presentLabel.textContent = active ? '一般模式' : '投影模式';
    });

    const menuButton = $('#menuButton');
    const nav = $('#chapterNav');
    const menuLabel = $('.menu-label', menuButton);
    const syncMenuLabel = () => {
      const open = menuButton.getAttribute('aria-expanded') === 'true';
      const mode = window.ReportI18n?.getMode?.() || 'en';
      const en = open ? 'Hide Topics' : 'Show Topics';
      const zh = open ? '收起導覽' : '展開導覽';
      menuLabel.replaceChildren();
      for (const text of mode === 'bilingual' ? [en, zh] : [mode === 'zh' ? zh : en]) {
        const line = document.createElement('span'); line.textContent = text; menuLabel.append(line);
      }
      menuButton.setAttribute('aria-label', mode === 'bilingual' ? `${en} / ${zh}` : mode === 'zh' ? zh : en);
      $('.menu-icon', menuButton).textContent = open ? '⌃' : '☰';
    };
    const setMenuOpen = (open) => {
      nav.hidden = !open;
      nav.classList.toggle('is-open', open);
      menuButton.setAttribute('aria-expanded', String(open));
      syncMenuLabel();
    };
    setMenuOpen(false);
    menuButton.addEventListener('click', () => setMenuOpen(nav.hidden));
    // Delegation also covers the directory links replaced during initialization.
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) setMenuOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !nav.hidden) {
        setMenuOpen(false); menuButton.focus();
      }
    });
    document.addEventListener('click', (event) => {
      const path = event.composedPath();
      if (!nav.hidden && !path.includes(nav) && !path.includes(menuButton)) setMenuOpen(false);
    });
    window.addEventListener('hashchange', () => setMenuOpen(false));
    document.addEventListener('reportlanguagechange', syncMenuLabel);
    const updateHeaderHeight = () => document.documentElement.style.setProperty('--site-header-height', `${Math.ceil($('#top').getBoundingClientRect().height)}px`);
    updateHeaderHeight();
    if (window.ResizeObserver) new ResizeObserver(updateHeaderHeight).observe($('#top'));
    else window.addEventListener('resize', updateHeaderHeight);

    const hero = $('#heroSpectrum');
    spectra.leaf.forEach((value, index) => {
      const bar = document.createElement('i');
      const [r, g, b] = wavelengthToRgb(wavelengths[index]);
      bar.style.height = `${16 + value * 88}px`;
      bar.style.background = `rgb(${r},${g},${b})`;
      hero.append(bar);
    });
  }

  function initializeKnowledgeMap() {
    if (window.ReportConcepts) { window.ReportConcepts.initializeDirectory(); return; }
    const buttons = $$('[data-topic-filter]');
    const cards = $$('#topicGrid .topic-card');
    if (!buttons.length || !cards.length) return;

    const applyFilter = (filter) => {
      buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.topicFilter === filter)));
      cards.forEach((card) => {
        card.hidden = filter !== 'all' && card.dataset.topicGroup !== filter;
      });
    };

    buttons.forEach((button) => button.addEventListener('click', () => applyFilter(button.dataset.topicFilter)));
    applyFilter('all');
  }

  function initializePageRouter() {
    const landingPage = $('#opening');
    const reportPages = topicPages;
    const allRoutedPages = [...reportPages, ...auxiliaryPages];
    const pages = [landingPage, ...allRoutedPages.map(({ id }) => document.getElementById(id))].filter(Boolean);
    const topicById = new Map(topicPages.map((topic, index) => [topic.id, { ...topic, index }]));
    const reportPageById = new Map(allRoutedPages.map((page, index) => [page.id, { ...page, index }]));
    const navLinks = $$('#chapterNav a');
    const skipLink = $('.skip-link');
    let activePage = landingPage;

    const makeRouteLink = (className, href, label, title) => {
      const link = document.createElement('a');
      link.className = className;
      link.href = href;
      const small = document.createElement('small');
      small.textContent = label;
      const strong = document.createElement('strong');
      strong.textContent = title;
      link.append(small, strong);
      return link;
    };

    reportPages.forEach((reportPage, index) => {
      const page = document.getElementById(reportPage.id);
      if (!page) return;
      page.classList.add('topic-page');

      const breadcrumb = document.createElement('nav');
      breadcrumb.className = 'topic-breadcrumb';
      breadcrumb.setAttribute('aria-label', '目前知識點位置');
      const home = document.createElement('a');
      home.href = '#overview';
      home.textContent = '首頁';
      const separator = document.createElement('span');
      separator.setAttribute('aria-hidden', 'true');
      separator.textContent = '›';
      const counter = document.createElement('span');
      counter.textContent = `知識點 ${topicById.get(reportPage.id).index + 1}／${topicPages.length}`;
      breadcrumb.append(home, separator, counter);
      page.prepend(breadcrumb);

      const pager = document.createElement('nav');
      pager.className = 'topic-pagination';
      pager.setAttribute('aria-label', '知識點前後頁導覽');
      if (index > 0) {
        const previous = reportPages[index - 1];
        pager.append(makeRouteLink('topic-page-link topic-page-previous', `#${previous.id}`, '← 上一個知識點', previous.title));
      } else {
        const spacer = document.createElement('span');
        spacer.className = 'topic-page-spacer';
        spacer.setAttribute('aria-hidden', 'true');
        pager.append(spacer);
      }
      const overview = document.createElement('a');
      overview.className = 'topic-page-home';
      overview.href = '#knowledge-directory';
      overview.textContent = '返回知識點目錄';
      pager.append(overview);
      if (index < reportPages.length - 1) {
        const next = reportPages[index + 1];
        pager.append(makeRouteLink('topic-page-link topic-page-next', `#${next.id}`, '下一個知識點 →', next.title));
      } else {
        const spacer = document.createElement('span');
        spacer.className = 'topic-page-spacer';
        spacer.setAttribute('aria-hidden', 'true');
        pager.append(spacer);
      }
      page.append(pager);
    });

    const decodeHashToken = (hash) => {
      try {
        return decodeURIComponent(String(hash || '').replace(/^#/, ''));
      } catch (_) {
        return null;
      }
    };

    const resolveHash = () => {
      const token = decodeHashToken(location.hash);
      if (token === null) {
        return { page: landingPage, route: 'overview', target: null, invalid: true };
      }
      if (!token || token === 'overview' || token === 'opening' || token === 'main-content' || token === 'top' || token === 'paper-overview' || token === 'knowledge-directory') {
        const target = token === 'paper-overview' || token === 'knowledge-directory' ? document.getElementById(token) : token === 'opening' ? landingPage : null;
        return { page: landingPage, route: 'overview', target };
      }
      const directPage = reportPageById.get(token);
      if (directPage) return { page: document.getElementById(token), route: token, target: null };
      const target = document.getElementById(token);
      const containingPage = target?.closest('main > .chapter, main > .sources-section');
      if (containingPage) {
        return { page: containingPage, route: containingPage.id === 'opening' ? 'overview' : containingPage.id, target };
      }
      return { page: landingPage, route: 'overview', target: null, invalid: true };
    };

    const updateDocumentTitle = (route) => {
      if (route === 'overview') {
        const mode = window.ReportI18n?.getMode?.() || 'en';
        document.title = mode === 'zh'
          ? 'Sparse Recovery of Hyperspectral Signal｜中英雙語論文導讀'
          : mode === 'bilingual'
            ? 'Sparse Recovery of Hyperspectral Signal | English + 中文 Guide'
            : 'Sparse Recovery of Hyperspectral Signal from Natural RGB Images';
        return;
      }
      const reportPage = reportPageById.get(route);
      if (!reportPage) return;
      const mode = window.ReportI18n?.getMode?.() || 'en';
      const translated = window.ReportI18n?.translate?.(reportPage.title) || reportPage.title;
      const pageTitle = mode === 'zh' ? reportPage.title : mode === 'bilingual' ? `${translated}｜${reportPage.title}` : translated;
      document.title = `${pageTitle} | Sparse Recovery of Hyperspectral Signal`;
    };

    const showRoute = ({ moveFocus = false } = {}) => {
      const resolved = resolveHash();
      if (resolved.invalid) history.replaceState(null, '', '#overview');
      pages.forEach((page) => { page.hidden = page !== resolved.page; });
      activePage = resolved.page;
      window.ReportConcepts?.mountVisible();
      document.documentElement.classList.add('is-paginated');

      if (resolved.target?.id) {
        document.dispatchEvent(new CustomEvent('reportdeepanchor', { detail: { id: resolved.target.id } }));
      }

      navLinks.forEach((link) => {
        const navRoute = link.hash.slice(1);
        if (navRoute === resolved.route) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });

      const root = document.documentElement;
      const previousScrollBehavior = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      if (resolved.target && resolved.target !== resolved.page) resolved.target.scrollIntoView({ block: 'start', behavior: 'auto' });
      else {
        root.scrollTop = 0;
        document.body.scrollTop = 0;
      }
      updateReadingProgress();
      requestAnimationFrame(() => {
        if (moveFocus) {
          const heading = resolved.page.querySelector('h1, h2');
          if (heading) {
            heading.setAttribute('tabindex', '-1');
            heading.focus({ preventScroll: true });
          }
        }
        root.style.scrollBehavior = previousScrollBehavior;
      });
      updateDocumentTitle(resolved.route);
    };

    skipLink.addEventListener('click', (event) => {
      event.preventDefault();
      const heading = activePage.querySelector('h1, h2');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus();
      }
    });

    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link || link === skipLink) return;
      const token = decodeHashToken(link.hash);
      if (token === null) return;
      const directRoute = token === 'overview' || token === 'opening' || token === 'paper-overview' || token === 'knowledge-directory' || reportPageById.has(token);
      const nestedTarget = document.getElementById(token)?.closest('main > .chapter, main > .sources-section');
      if (!directRoute && !nestedTarget) return;
      event.preventDefault();
      if (link.hash !== location.hash) history.pushState(null, '', link.hash);
      showRoute({ moveFocus: true });
    });
    addEventListener('hashchange', () => showRoute({ moveFocus: true }));
    document.addEventListener('reportlanguagechange', () => {
      const resolved = resolveHash();
      requestAnimationFrame(() => updateDocumentTitle(resolved.route));
    });

    if (!location.hash || !resolveHash().page || resolveHash().invalid) history.replaceState(null, '', '#overview');
    showRoute();
  }

  function initializeLightLab() {
    let material = 'leaf';
    const slider = $('#wavelengthSlider');
    const valueOutput = $('#wavelengthValue');
    const swatch = $('#wavelengthSwatch');
    const name = $('#wavelengthName');
    const summary = $('#wavelengthSummary');
    const descriptions = {
      leaf: '綠葉在綠光附近有一個反射高點；到接近 700 nm 時也會再次上升。',
      soil: '土壤的示意反射率隨波長緩慢上升，沒有只屬於單一顏色的尖峰。',
      sky: '天空在短波長的藍光區較強，因此相機常記錄到較大的藍色通道。'
    };
    const bandName = (w) => w < 450 ? '紫光附近' : w < 495 ? '藍光附近' : w < 570 ? '綠光附近' : w < 590 ? '黃光附近' : w < 620 ? '橙光附近' : '紅光附近';
    const update = () => {
      const w = Number(slider.value);
      const index = (w - 400) / 10;
      const intensity = spectra[material][index];
      const rgb = wavelengthToRgb(w);
      valueOutput.value = `${w} nm`;
      name.textContent = bandName(w);
      swatch.style.background = `rgb(${rgb.join(',')})`;
      swatch.style.color = (rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114) > 155 ? '#14213d' : '#fff';
      swatch.style.textShadow = swatch.style.color === 'rgb(20, 33, 61)' || swatch.style.color === '#14213d' ? 'none' : '0 1px 3px rgba(0,0,0,.55)';
      summary.textContent = `${materialNames[material]}在 ${w} nm 的示意相對強度為 ${intensity.toFixed(2)}。${descriptions[material]}`;
      drawSpectrum($('#spectrumChart'), [{ label: `${materialNames[material]}光譜`, values: spectra[material], color: '#1769aa' }], { marker: w, markerValue: intensity });
    };
    $$('[data-material]').forEach((button) => button.addEventListener('click', () => {
      material = button.dataset.material;
      $$('[data-material]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      update();
    }));
    slider.addEventListener('input', update);
    $('#resetWavelength').addEventListener('click', () => {
      material = 'leaf';
      slider.value = '550';
      $$('[data-material]').forEach((item) => item.setAttribute('aria-pressed', String(item.dataset.material === 'leaf')));
      update();
    });
    update();
  }

  function initializeIlluminationLab() {
    const chart = $('#illuminationChart');
    if (!chart) return;
    let selected = 'flat';
    const reflectance = spectra.leaf;
    const illuminants = {
      flat: wavelengths.map(() => 0.92),
      warm: wavelengths.map((wavelength) => 0.42 + 0.58 * ((wavelength - 400) / 300)),
      cool: wavelengths.map((wavelength) => 1 - 0.58 * ((wavelength - 400) / 300))
    };
    const summaries = {
      flat: '均勻白光在各波長提供接近相同的強度，因此場景訊號保留葉子反射率的主要形狀。',
      warm: '偏暖光源在長波端提供較多能量；即使材料不變，送往相機的紅光端訊號也會相對提高。',
      cool: '偏冷光源在短波端提供較多能量；同一片葉子的場景訊號因此更偏向藍綠波段。'
    };
    const update = () => {
      const illumination = illuminants[selected];
      const sceneSignal = reflectance.map((value, index) => value * illumination[index]);
      $$('[data-illumination]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.illumination === selected)));
      $('#illuminationSummary').textContent = summaries[selected];
      drawSpectrum(chart, [
        { label: '照明 E(λ)', values: illumination, color: '#c45f17', dash: '11 5', width: 3 },
        { label: '葉子反射率 ρ(λ)', values: reflectance, color: '#357a38', dash: '3 5', width: 3 },
        { label: '場景訊號 S(λ)', values: sceneSignal, color: '#14213d', width: 5 }
      ], { height: 380 });
    };
    $$('[data-illumination]').forEach((button) => button.addEventListener('click', () => {
      selected = button.dataset.illumination;
      update();
    }));
    update();
  }

  function initializeRgbLab() {
    const material = $('#rgbMaterial');
    const center = $('#bandCenter');
    const boost = $('#bandBoost');
    let inspectedChannel = 'g';
    const channelNames = ['紅色 R', '綠色 G', '藍色 B'];
    const channelLabels = { r: 'R 通道', g: 'G 通道', b: 'B 通道' };
    const channelColors = { r: '#b8393c', g: '#357a38', b: '#1769aa' };
    const bandName = (w) => w < 450 ? '紫光附近' : w < 495 ? '藍光附近' : w < 570 ? '綠光附近' : w < 590 ? '黃光附近' : w < 620 ? '橙光附近' : '紅光附近';

    const renderCalculation = (spectrum, rgb) => {
      const selectedWavelength = Number(center.value);
      const selectedIndex = Math.round((selectedWavelength - 400) / 10);
      const response = sensors[inspectedChannel];
      const contributions = spectrum.map((value, index) => value * response[index]);
      const weightedSum = contributions.reduce((sum, value) => sum + value, 0);
      const weightSum = response.reduce((sum, value) => sum + value, 0);
      const channelIndex = ['r', 'g', 'b'].indexOf(inspectedChannel);
      const linearValue = weightedSum / weightSum;
      const displayRgb = rgb.map((value) => Math.round(255 * Math.pow(value, 1 / 2.2)));
      const maxContribution = Math.max(...contributions, 0.001);
      const bars = $('#rgbContributionBars');

      $$('[data-rgb-calc-channel]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.rgbCalcChannel === inspectedChannel));
      });
      bars.dataset.channel = inspectedChannel;
      bars.replaceChildren();
      contributions.forEach((value, index) => {
        const wavelength = wavelengths[index];
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'contribution-bar';
        button.dataset.i18nSkip = '';
        button.classList.toggle('is-selected', index === selectedIndex);
        button.style.setProperty('--bar-height', `${Math.max(3, (value / maxContribution) * 100).toFixed(1)}%`);
        button.style.setProperty('--bar-color', channelColors[inspectedChannel]);
        button.setAttribute('aria-label', `${wavelength} nm · ${value.toFixed(4)}`);
        button.title = `${wavelength} nm · ${value.toFixed(4)}`;
        const bar = document.createElement('i');
        bar.setAttribute('aria-hidden', 'true');
        const tick = document.createElement('span');
        tick.textContent = index % 5 === 0 ? String(wavelength) : '';
        button.append(bar, tick);
        button.addEventListener('click', () => {
          center.value = String(wavelength);
          update();
        });
        bars.append(button);
      });

      $('#rgbCalcWavelength').textContent = `${selectedWavelength} nm`;
      $('#rgbCalcSpectrum').textContent = spectrum[selectedIndex].toFixed(3);
      $('#rgbCalcSensitivityLabel').textContent = `${inspectedChannel.toUpperCase()} 通道敏感度`;
      $('#rgbCalcSensitivity').textContent = response[selectedIndex].toFixed(3);
      $('#rgbCalcContribution').textContent = contributions[selectedIndex].toFixed(4);
      $('#rgbCalcChannelName').textContent = channelLabels[inspectedChannel];
      $('#rgbCalcWeightedSum').textContent = weightedSum.toFixed(3);
      $('#rgbCalcWeightSum').textContent = weightSum.toFixed(3);
      $('#rgbCalcLinearChannel').textContent = linearValue.toFixed(3);
      $('#rgbCalcLinearChannel').style.color = channelColors[inspectedChannel];
      $('#rgbCalcLinearRgb').textContent = `c̃ ≈ (${rgb.map((value) => value.toFixed(3)).join(', ')})`;
      $('#rgbCalcDisplayRgb').textContent = `(${displayRgb.join(', ')})`;
      $('#rgbCalcPreview').style.background = `rgb(${displayRgb.join(',')})`;
      $('#rgbCalcPreview').setAttribute('aria-label', `計算所得顏色：紅 ${displayRgb[0]}、綠 ${displayRgb[1]}、藍 ${displayRgb[2]}`);
      $('#rgbContributionBars').setAttribute('aria-label', `${channelLabels[inspectedChannel]}的三十一個逐波段貢獻`);
    };

    const update = () => {
      const selectedWavelength = Number(center.value);
      const factor = Number(boost.value) / 100;
      const originalSpectrum = spectra[material.value];
      let clipped = false;
      const spectrum = originalSpectrum.map((value, index) => {
        const adjusted = value * (1 + (factor - 1) * gaussian(wavelengths[index], selectedWavelength, 24));
        if (adjusted > 1) clipped = true;
        return clamp(adjusted);
      });
      const originalRgb = sensorRgb(originalSpectrum);
      const rgb = sensorRgb(spectrum);
      const deltas = rgb.map((value, index) => value - originalRgb[index]);
      const greatest = deltas.reduce((best, value, index) => Math.abs(value) > Math.abs(deltas[best]) ? index : best, 0);
      const selectedIndex = Math.round((selectedWavelength - 400) / 10);
      const wavelengthRgb = wavelengthToRgb(selectedWavelength);
      const direction = factor > 1 ? '變強' : factor < 1 ? '變弱' : '保持原樣';

      $('#bandCenterValue').value = `${selectedWavelength} nm · ${bandName(selectedWavelength)}`;
      $('#bandBoostValue').value = `${boost.value}%（${direction === '保持原樣' ? '不改變' : direction}）`;
      $('#bandFocusSwatch').style.background = `rgb(${wavelengthRgb.join(',')})`;
      $('#bandFocusHint').textContent = `目前選的是 ${selectedWavelength} nm（${bandName(selectedWavelength)}）；圖中的黃色區域是實際被漸進調整的範圍。`;
      $$('[data-band-preset]').forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.bandPreset) === selectedWavelength)));

      ['r', 'g', 'b'].forEach((channel, index) => {
        $(`#${channel}Meter`).value = rgb[index];
        $(`#${channel}Value`).value = rgb[index].toFixed(2);
        $(`#${channel}Delta`).textContent = Math.abs(deltas[index]) < 0.0005 ? '不變' : `Δ${deltas[index] >= 0 ? '+' : '−'}${Math.abs(deltas[index]).toFixed(3)}`;
        $(`.rgb-output [data-channel="${channel}"]`).classList.toggle('is-most-affected', factor !== 1 && Math.abs(deltas[greatest]) >= 0.0005 && index === greatest);
      });

      if (factor === 1) {
        $('#rgbImpactSummary').textContent = `目前是 100%，所以 ${selectedWavelength} nm 附近尚未改變，ΔR、ΔG、ΔB 都是 0。請把第三步的滑桿往左或往右移。`;
      } else if (Math.abs(deltas[greatest]) < 0.0005) {
        $('#rgbImpactSummary').textContent = `改變 ${selectedWavelength} nm 附近後，三個通道的變化都非常小，因為這個材料在此處的示意強度或相機敏感度很低。`;
      } else {
        const secondLargest = [...deltas].map(Math.abs).sort((a, b) => b - a)[1];
        const closePair = secondLargest >= Math.abs(deltas[greatest]) * 0.8;
        const overlapMessage = closePair
          ? '另有一個通道的變化也很接近，這正是感光範圍重疊的結果。'
          : '其他通道也可能有較小變化，因為感光範圍彼此重疊。';
        $('#rgbImpactSummary').textContent = `把 ${selectedWavelength} nm 附近調到 ${boost.value}% 後，${channelNames[greatest]} 通道變化最大（${deltas[greatest] >= 0 ? '增加' : '減少'} ${Math.abs(deltas[greatest]).toFixed(3)}）。${overlapMessage}${clipped ? ' 部分示意光譜已到達 1.00 上限。' : ''}`;
      }

      const srgb = rgb.map((value) => Math.round(255 * Math.pow(value, 1 / 2.2)));
      $('#cameraSwatch').style.background = `rgb(${srgb.join(',')})`;
      $('#cameraSwatch').setAttribute('aria-label', `計算所得顏色：紅 ${srgb[0]}、綠 ${srgb[1]}、藍 ${srgb[2]}`);
      drawSpectrum($('#rgbCompressionChart'), [
        { label: '原始光譜', values: originalSpectrum, color: '#7b8794', width: 3, dash: '8 6' },
        { label: '調整後', values: spectrum, color: '#14213d', width: 5 },
        { label: 'R 反應', values: sensors.r, color: '#b8393c', dash: '12 4' },
        { label: 'G 反應', values: sensors.g, color: '#357a38', dash: '4 4' },
        { label: 'B 反應', values: sensors.b, color: '#1769aa', dash: '2 5' }
      ], { height: 390, bandCenter: selectedWavelength, marker: selectedWavelength, markerValue: spectrum[selectedIndex], markerColor: '#c45f17' });
      renderCalculation(spectrum, rgb);
    };
    $$('[data-rgb-calc-channel]').forEach((button) => button.addEventListener('click', () => {
      inspectedChannel = button.dataset.rgbCalcChannel;
      update();
    }));
    material.addEventListener('change', update);
    center.addEventListener('input', update);
    boost.addEventListener('input', update);
    $$('[data-band-preset]').forEach((button) => button.addEventListener('click', () => { center.value = button.dataset.bandPreset; update(); }));
    $('#resetRgb').addEventListener('click', () => { material.value = 'leaf'; center.value = '550'; boost.value = '100'; update(); });
    update();
  }

  function initializeCube() {
    const slider = $('#cubeWavelength');
    const scene = $('#bandScene');
    const chart = $('#cubeSpectrumChart');
    const comparisonContainer = $('#cubeBandComparisons');
    const stackVisual = $('#cubeStackVisual');
    const cubeMaterialNames = { sky: '天空', leaf: '葉子', soil: '土壤', wall: '白色參考板' };
    const cubeSpectra = {
      sky: spectra.sky,
      leaf: spectra.leaf,
      soil: spectra.soil,
      wall: wavelengths.map((wavelength) => clamp(0.84 + 0.025 * Math.sin((wavelength - 400) / 58)))
    };
    const materialNotes = {
      sky: '天空的訊號在短波長區通常較強，所以偏藍波段的頁面會比較亮。這裡顯示的是天空送進相機的訊號，不只取決於反射。',
      leaf: '葉子在約 550 nm 的訊號較強、在部分紅光波段較弱，接近 700 nm 時又開始上升。這種隨波長改變的形狀可幫助辨認材料。',
      soil: '土壤的教學曲線變化較平緩，往長波長方向逐漸增加。不同含水量與成分會改變真實土壤曲線。',
      wall: '白色參考板是對照物：在這個教學模型中，各波長都維持較強而平坦的訊號，方便比較其他物體。'
    };
    let selectedMaterial = 'leaf';

    const intensityAt = (material, wavelength) => cubeSpectra[material][(wavelength - 400) / 10];
    const toneAt = (material, wavelength) => Math.round(255 * clamp(intensityAt(material, wavelength)));
    const applySceneTones = (svg, wavelength) => {
      Object.keys(cubeSpectra).forEach((material) => {
        const tone = toneAt(material, wavelength);
        $$(`[data-cube-material="${material}"]`, svg).forEach((object) => object.style.setProperty('--tone', tone));
      });
      const stem = $('.grayscale-stem', svg);
      if (stem) stem.style.setProperty('--leaf-tone', toneAt('leaf', wavelength));
    };

    [450, 550, 650].forEach((wavelength) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cube-preview-card';
      button.dataset.previewWavelength = String(wavelength);
      button.setAttribute('aria-label', `切換到 ${wavelength} 奈米波段`);
      const label = document.createElement('strong');
      label.textContent = `${wavelength} nm`;
      const preview = scene.cloneNode(true);
      preview.removeAttribute('id');
      preview.removeAttribute('aria-labelledby');
      preview.setAttribute('aria-hidden', 'true');
      preview.classList.add('mini-band-scene');
      $$('[id]', preview).forEach((node) => node.removeAttribute('id'));
      $$('[role], [tabindex], [aria-label], [aria-pressed]', preview).forEach((node) => {
        node.removeAttribute('role');
        node.removeAttribute('tabindex');
        node.removeAttribute('aria-label');
        node.removeAttribute('aria-pressed');
      });
      applySceneTones(preview, wavelength);
      button.append(label, preview);
      button.addEventListener('click', () => { slider.value = String(wavelength); update(); });
      comparisonContainer.append(button);
    });

    const selectMaterial = (material) => {
      selectedMaterial = material;
      update();
    };

    const update = () => {
      const wavelength = Number(slider.value);
      const index = (wavelength - 400) / 10;
      const intensity = intensityAt(selectedMaterial, wavelength);
      const percent = Math.round(intensity * 100);
      const brightnessWord = intensity < 0.28 ? '偏暗' : intensity < 0.58 ? '中等亮度' : '偏亮';
      const selectedName = cubeMaterialNames[selectedMaterial];

      $('#cubeWavelengthValue').value = `${wavelength} nm`;
      $('#cubeSceneWavelength').value = `${wavelength} nm`;
      $('#cubePageBadge').textContent = `第 ${index + 1}／31 張`;
      stackVisual.style.setProperty('--slice-position', `${8 + (index / 30) * 54}px`);
      stackVisual.dataset.material = selectedMaterial;
      $('#cubeStackBand').textContent = `第 ${index + 1}／31 個波段 · ${wavelength} nm`;
      $('#cubeStackPixel').textContent = `固定位置：${selectedName}代表像素`;
      $('#previousBand').disabled = wavelength === 400;
      $('#nextBand').disabled = wavelength === 700;

      applySceneTones(scene, wavelength);
      $('#bandSceneDesc').textContent = `同一場景的物體位置不變。現在是第 ${index + 1} 個波段，${wavelength} 奈米；目前選擇${selectedName}，相對訊號 ${percent}%。`;
      $$('.scene-object[role="button"]', scene).forEach((object) => {
        const selected = object.dataset.cubeMaterial === selectedMaterial;
        object.classList.toggle('is-selected', selected);
        object.setAttribute('aria-pressed', String(selected));
      });
      $$('[data-cube-target]').forEach((button) => {
        const selected = button.dataset.cubeTarget === selectedMaterial;
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
      $$('[data-cube-wavelength]').forEach((button) => {
        const selected = Number(button.dataset.cubeWavelength) === wavelength;
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
      $$('[data-preview-wavelength]', comparisonContainer).forEach((button) => {
        const selected = Number(button.dataset.previewWavelength) === wavelength;
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-pressed', String(selected));
      });

      $('#cubeTargetName').textContent = selectedName;
      $('#cubeSignalValue').textContent = `${percent}%`;
      $('#cubeSignalMeter').value = intensity;
      $('#cubeSignalMeter').textContent = `${percent}%`;
      $('#cubeSpectrumHeading').textContent = `${selectedName}的 31 個波長訊號`;
      $('#cubeSummary').textContent = `現在觀看 ${wavelength} nm。物體沒有移動；${selectedName}在此波長的相對訊號為 ${percent}%，所以在灰階圖中${brightnessWord}。`;
      $('#cubeTargetExplanation').textContent = `追蹤${selectedName}這個固定位置，可以取得 31 個數；依波長連起來就是它的光譜曲線。${materialNotes[selectedMaterial]}`;

      drawSpectrum(chart, [
        { label: selectedName, values: cubeSpectra[selectedMaterial], color: '#14213d', width: 5 }
      ], { height: 360, marker: wavelength, markerValue: intensity, markerColor: '#c45f17' });
    };

    $$('.scene-object[role="button"]', scene).forEach((object) => {
      object.addEventListener('click', () => selectMaterial(object.dataset.cubeMaterial));
      object.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectMaterial(object.dataset.cubeMaterial);
        }
      });
    });
    $$('[data-cube-target]').forEach((button) => button.addEventListener('click', () => selectMaterial(button.dataset.cubeTarget)));
    $$('[data-cube-wavelength]').forEach((button) => button.addEventListener('click', () => { slider.value = button.dataset.cubeWavelength; update(); }));
    slider.addEventListener('input', update);
    $('#previousBand').addEventListener('click', () => { slider.value = String(Math.max(400, Number(slider.value) - 10)); update(); });
    $('#nextBand').addEventListener('click', () => { slider.value = String(Math.min(700, Number(slider.value) + 10)); update(); });
    update();
  }

  function initializeMetamer() {
    const slider = $('#metamerDifference');
    if (!slider) return;
    const rows = [sensors.r, sensors.g, sensors.b].map((row) => {
      const sum = row.reduce((total, value) => total + value, 0);
      return row.map((value) => value / sum);
    });
    const solve = (matrix, vector) => {
      const augmented = matrix.map((row, index) => [...row, vector[index]]);
      for (let column = 0; column < augmented.length; column += 1) {
        let pivot = column;
        for (let row = column + 1; row < augmented.length; row += 1) {
          if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
        }
        [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
        const divisor = augmented[column][column];
        for (let item = column; item <= augmented.length; item += 1) augmented[column][item] /= divisor;
        for (let row = 0; row < augmented.length; row += 1) {
          if (row === column) continue;
          const factor = augmented[row][column];
          for (let item = column; item <= augmented.length; item += 1) augmented[row][item] -= factor * augmented[column][item];
        }
      }
      return augmented.map((row) => row[augmented.length]);
    };
    const seed = wavelengths.map((_, index) => Math.sin((index + 1) * 2.1) + 0.35 * Math.cos((index + 1) * 3.7));
    const gram = rows.map((left) => rows.map((right) => dot(left, right)));
    const projectionWeights = solve(gram, rows.map((row) => dot(row, seed)));
    const rawNullDirection = seed.map((value, index) => value - rows.reduce((sum, row, rowIndex) => sum + projectionWeights[rowIndex] * row[index], 0));
    const maxMagnitude = Math.max(...rawNullDirection.map(Math.abs));
    const nullDirection = rawNullDirection.map((value) => value / maxMagnitude);

    const update = () => {
      const amount = Number(slider.value) / 100;
      const amplitude = 0.38 * amount;
      const spectrumA = nullDirection.map((value) => 0.5 + amplitude * value);
      const spectrumB = nullDirection.map((value) => 0.5 - amplitude * value);
      const rgbA = sensorRgb(spectrumA);
      const rgbB = sensorRgb(spectrumB);
      const spectralDistance = Math.sqrt(spectrumA.reduce((sum, value, index) => sum + (value - spectrumB[index]) ** 2, 0));
      const rgbResidual = Math.sqrt(rgbA.reduce((sum, value, index) => sum + (value - rgbB[index]) ** 2, 0));
      const displayRgb = rgbA.map((value) => Math.round(255 * Math.pow(value, 1 / 2.2)));

      $('#metamerDifferenceValue').value = `${slider.value}%`;
      $('#metamerRgbA').textContent = `(${rgbA.map((value) => value.toFixed(3)).join(', ')})`;
      $('#metamerRgbB').textContent = `(${rgbB.map((value) => value.toFixed(3)).join(', ')})`;
      $('#metamerSpectrumDistance').textContent = spectralDistance.toFixed(3);
      $('#metamerRgbResidual').textContent = rgbResidual.toFixed(6);
      $('.metamer-swatch').style.background = `rgb(${displayRgb.join(',')})`;
      $('#metamerSummary').textContent = amount === 0
        ? '兩條光譜目前重合。向右移動後，它們會沿著此相機的零空間向相反方向分開。'
        : `光譜距離已增加到 ${spectralDistance.toFixed(3)}，但線性 RGB 殘差只有 ${rgbResidual.toExponential(2)}；這個方向的變化被三次加權總和抵銷。`;
      drawSpectrum($('#metamerChart'), [
        { label: '光譜 hA', values: spectrumA, color: '#f0a51a', width: 5 },
        { label: '光譜 hB', values: spectrumB, color: '#65d6d0', width: 5, dash: '10 7' }
      ], { dark: true });
    };
    slider.addEventListener('input', update);
    $('#resetMetamer').addEventListener('click', () => { slider.value = '65'; update(); });
    update();
  }

  function initializeAssumptionLab() {
    const lowDimension = $('#lowDimensionAssumption');
    const rareMetamers = $('#rareMetamerAssumption');
    if (!lowDimension || !rareMetamers) return;
    const renderDots = (container, count, emphasized = count) => {
      container.replaceChildren();
      for (let index = 0; index < count; index += 1) {
        const dotNode = document.createElement('i');
        if (index < emphasized) dotNode.className = 'is-candidate';
        container.append(dotNode);
      }
    };
    const update = () => {
      const low = lowDimension.checked;
      const rare = rareMetamers.checked;
      renderDots($('#allCandidateDots'), 30, 30);
      renderDots($('#naturalCandidateDots'), low ? 10 : 30, low ? 10 : 30);
      const finalCount = low ? (rare ? 3 : 6) : (rare ? 8 : 14);
      renderDots($('#rgbCandidateDots'), finalCount, finalCount);
      $('#naturalCandidateLabel').textContent = low
        ? '先驗排除大量不像訓練自然光譜的形狀'
        : '低維條件失效：先驗無法有效縮小未知範圍';
      $('#rgbCandidateLabel').textContent = rare
        ? '同 RGB 的合理碰撞較少，留下少數候選'
        : '同色異譜頻繁：同一 RGB 仍留下多條候選';
      if (low && rare) {
        $('#assumptionSummary').textContent = '兩項條件同時成立時，方法有機會從自然候選中找出接近真值的光譜；這仍是資料支持的估計，不是唯一性證明。';
      } else if (!low && !rare) {
        $('#assumptionSummary').textContent = '兩項條件都失效：候選既沒有被自然先驗縮小，同一 RGB 又頻繁碰撞；此時不應宣稱能可靠估計真實光譜。';
      } else if (!low) {
        $('#assumptionSummary').textContent = '即使同色異譜在某範圍內少見，測試光譜若不在學到的自然結構附近，字典仍可能找不到接近真值的候選。';
      } else {
        $('#assumptionSummary').textContent = '低維先驗雖已縮小範圍，但同一 RGB 若仍對應多條合理光譜，演算法就缺少足夠資訊判斷哪一條是真值。';
      }
    };
    lowDimension.addEventListener('change', update);
    rareMetamers.addEventListener('change', update);
    update();
  }

  function initializeSparseLab() {
    const select = $('#priorSelect');
    const slider = $('#sparsityLimit');
    const atomOrder = ['leaf', 'soil', 'wall', 'sky', 'neon', 'laser'];
    const priors = {
      none: atomOrder,
      natural: ['leaf', 'soil', 'wall', 'sky'],
      plant: ['leaf', 'soil']
    };
    const baseWeights = { leaf: 0.67, soil: 0.24, wall: 0.06, sky: 0.03, neon: 0.02, laser: 0.01 };
    const target = wavelengths.map((_, index) => 0.72 * spectra.leaf[index] + 0.28 * spectra.soil[index]);
    const update = () => {
      const allowed = priors[select.value];
      const requested = Number(slider.value);
      const chosen = allowed.slice(0, Math.min(requested, allowed.length));
      const normalization = chosen.reduce((sum, key) => sum + baseWeights[key], 0) || 1;
      const weights = Object.fromEntries(chosen.map((key) => [key, baseWeights[key] / normalization]));
      const estimate = wavelengths.map((_, index) => chosen.reduce((sum, key) => sum + spectra[key][index] * weights[key], 0));
      const error = Math.sqrt(estimate.reduce((sum, value, index) => sum + (value - target[index]) ** 2, 0) / estimate.length);
      $('#sparsityValue').value = slider.value;
      const grid = $('#atomGrid');
      grid.replaceChildren();
      atomOrder.forEach((key) => {
        const card = document.createElement('div');
        card.className = `atom-card${allowed.includes(key) ? '' : ' is-excluded'}${chosen.includes(key) ? ' is-selected' : ''}`;
        const label = document.createElement('span');
        label.textContent = materialNames[key];
        const output = document.createElement('output');
        output.textContent = !allowed.includes(key) ? '先驗排除' : chosen.includes(key) ? `w=${weights[key].toFixed(2)}` : 'w=0';
        card.append(label, output);
        grid.append(card);
      });
      drawSpectrum($('#sparseChart'), [
        { label: '教學目標', values: target, color: '#14213d', width: 5 },
        { label: '稀疏估計', values: estimate, color: '#c45f17', width: 4, dash: '10 6' }
      ], { height: 350 });
      const capped = requested > allowed.length ? `此先驗只有 ${allowed.length} 個候選可用，所以沒有硬湊到 ${requested} 個。` : '';
      $('#sparseSummary').textContent = `先驗保留 ${allowed.length} 個候選；目前實際使用 ${chosen.length} 個，示意曲線誤差為 ${error.toFixed(3)}。${capped}「最多」不是「一定要用滿」。`;
    };
    select.addEventListener('change', update);
    slider.addEventListener('input', update);
    $('#resetSparse').addEventListener('click', () => { select.value = 'natural'; slider.value = '2'; update(); });
    update();
  }

  function initializePairedDictionary() {
    const keys = ['leaf', 'soil', 'sky', 'wall'];
    let selected = 0;
    const rgbValues = Object.fromEntries(keys.map((key) => [key, sensorRgb(spectra[key])]));
    const render = () => {
      const hs = $('#hsDictionary');
      const rgb = $('#rgbDictionary');
      hs.replaceChildren(); rgb.replaceChildren();
      keys.forEach((key, index) => {
        const hsButton = document.createElement('button');
        hsButton.type = 'button'; hsButton.className = 'dictionary-card'; hsButton.dataset.index = index;
        hsButton.setAttribute('aria-pressed', String(index === selected));
        hsButton.append(drawMiniCurve(spectra[key]), Object.assign(document.createElement('span'), { textContent: `h${index + 1} · ${materialNames[key]}型原子` }));
        const rgbButton = document.createElement('button');
        rgbButton.type = 'button'; rgbButton.className = 'dictionary-card'; rgbButton.dataset.index = index;
        rgbButton.setAttribute('aria-pressed', String(index === selected));
        const chip = document.createElement('span'); chip.className = 'rgb-chip';
        chip.style.background = `rgb(${rgbValues[key].map((value) => Math.round(255 * Math.pow(value, 1 / 2.2))).join(',')})`;
        rgbButton.append(chip, Object.assign(document.createElement('span'), { textContent: `c${index + 1} · RGB 對應原子` }));
        [hsButton, rgbButton].forEach((button) => button.addEventListener('click', () => { selected = index; render(); }));
        hs.append(hsButton); rgb.append(rgbButton);
      });
      const key = keys[selected];
      const rgbText = rgbValues[key].map((value) => value.toFixed(2)).join(', ');
      $('#pairDetail').innerHTML = `<strong>目前選中第 ${selected + 1} 對：</strong>左側 31×1 的 h<sub>${selected + 1}</sub> 經過同一個 3×31 相機矩陣 R，得到右側 3×1 的 c<sub>${selected + 1}</sub> ≈ (${rgbText})。重建時必須沿用相同編號，不能把卡片配錯。`;
    };
    render();
  }

  function initializeEquations() {
    const steps = [
      {
        stage: '準備階段 · 式（1）', formula: 'D<sub>h</sub> = [ h<sub>1</sub>　h<sub>2</sub>　…　h<sub>n</sub> ]', title: '建立高光譜字典',
        explanation: '先從大量高光譜像素學出 n 個代表性「原子」，再把每個 31×1 欄向量並排成一本字典。原子是組合光譜的數學基礎，不一定是一種可命名的純材料。',
        dimensions: '主要實驗：Dₕ 是 31×500；每個 hᵢ 是 31×1；而且 500 > 31，所以字典是過完備的。',
        can: '把大量先驗濃縮成可重複使用的光譜基礎。', cannot: '保證每個原子都有單一材料意義，或已包含所有未來場景。'
      },
      {
        stage: '準備階段 · 式（2）', formula: 'D<sub>RGB</sub> = R D<sub>h</sub>', title: '把整本字典投影到 RGB 空間',
        explanation: 'R 描述相機如何把 31 個波段加權成紅、綠、藍。對整本高光譜字典使用同一個 R，就得到逐項配對的 RGB 字典。',
        dimensions: '(3×31)(31×500) = 3×500',
        can: '建立 RGB 原子與高光譜原子的固定對應。', cannot: '讓 RGB 保留所有 31 波段資訊；投影仍然會壓縮資訊。'
      },
      {
        stage: '準備階段 · 式（3）', formula: 'c<sub>i</sub> = R h<sub>i</sub>', title: '每張卡片前後一一對應',
        explanation: '第 i 個 RGB 原子 cᵢ 一定由第 i 個高光譜原子 hᵢ 產生。稍後才可以把在 RGB 端找到的組合法，搬回同編號的高光譜端。',
        dimensions: '(3×31)(31×1) = 3×1',
        can: '說明一對原子如何由同一個相機模型連接。', cannot: '保證不同高光譜原子一定得到不同 RGB；同色異譜仍可能發生。'
      },
      {
        stage: '查詢階段 · 式（4）', formula: 'D<sub>RGB</sub> w ≈ c<sub>q</sub>', title: '由新 RGB 像素尋找稀疏權重',
        explanation: '500 個原子只是候選工具箱，不是每個像素都要全部使用。OMP 從中選少數幾個，計算權重 w，使組合結果盡量接近輸入像素 c_q。若讓 500 個權重都自由變動，只有 3 個 RGB 數不足以唯一決定它們，會產生大量等價配方；稀疏限制因此用來縮小候選範圍。真實量測有雜訊，所以教學上使用約等號。',
        dimensions: '(3×500)(500×1) ≈ 3×1；w 只有少數位置非零。',
        can: '找到一個能解釋目前 RGB 的少量原子組合。', cannot: '保證這是全世界唯一、最稀疏或對應真實光譜的組合。'
      },
      {
        stage: '查詢階段 · 式（5）', formula: 'ĥ<sub>q</sub> = D<sub>h</sub> w', title: '把同一組權重搬回高光譜端',
        explanation: 'RGB 端用了哪些編號與權重，高光譜端就照樣組合。帽子符號 ĥ 表示這是估計值，不是已證明的真值。',
        dimensions: '(31×500)(500×1) = 31×1',
        can: '產生一條 31 波段的候選光譜。', cannot: '把權重直接解讀成材料百分比，或宣稱 ĥ_q 就是真實 h_q。'
      },
      {
        stage: '一致性檢查 · 式（6）', formula: 'Rĥ<sub>q</sub> = R(D<sub>h</sub>w) = (RD<sub>h</sub>)w = D<sub>RGB</sub>w ≈ c<sub>q</sub>', title: '估計光譜可以重新產生輸入 RGB',
        explanation: '把估計光譜再通過相機，會回到接近原輸入的 RGB。這是代數上的回投影一致性，也是必要檢查，但不是光譜真值證明。',
        dimensions: '(3×31)(31×1) = 3×1',
        can: '證明答案與輸入 RGB 及成對字典相容。', cannot: '證明 ĥ_q = h_true；不同光譜仍可能產生相同 RGB。'
      }
    ];
    $$('[data-equation-set]').forEach((root) => {
      const pageSteps = root.dataset.equationSet === 'training' ? steps.slice(0, 3) : steps.slice(3);
      const equationOffset = root.dataset.equationSet === 'training' ? 0 : 3;
      let index = 0;
      const dots = $('[data-equation-dots]', root);
      pageSteps.forEach((_, stepIndex) => {
        const item = document.createElement('li');
        const button = document.createElement('button');
        const equationNumber = equationOffset + stepIndex + 1;
        button.type = 'button';
        button.textContent = `式 ${equationNumber}`;
        button.setAttribute('aria-label', `顯示公式 ${equationNumber}`);
        button.addEventListener('click', () => { index = stepIndex; render(); });
        item.append(button);
        dots.append(item);
      });
      const render = () => {
        const step = pageSteps[index];
        $('[data-equation-stage]', root).textContent = step.stage;
        $('[data-equation-main]', root).innerHTML = step.formula;
        $('[data-equation-title]', root).textContent = step.title;
        $('[data-equation-explanation]', root).textContent = step.explanation;
        $('[data-equation-dimensions]', root).textContent = step.dimensions;
        $('[data-equation-can]', root).textContent = step.can;
        $('[data-equation-cannot]', root).textContent = step.cannot;
        $('[data-equation-counter]', root).textContent = `${index + 1} / ${pageSteps.length}`;
        $$('[data-equation-dots] button', root).forEach((button, buttonIndex) => buttonIndex === index ? button.setAttribute('aria-current', 'step') : button.removeAttribute('aria-current'));
        $('[data-equation-previous]', root).disabled = index === 0;
        $('[data-equation-next]', root).disabled = index === pageSteps.length - 1;
      };
      $('[data-equation-previous]', root).addEventListener('click', () => { if (index > 0) { index -= 1; render(); } });
      $('[data-equation-next]', root).addEventListener('click', () => { if (index < pageSteps.length - 1) { index += 1; render(); } });
      render();
    });
  }

  function initializeAlgorithms() {
    const ksvdStages = [
      {
        title: '先讓 OMP 用現有字典試配',
        summary: '先固定字典。OMP 為每條訓練光譜挑選少數原子與權重，看看目前能重建得多接近。這時原子本身不會改變。',
        speaker: 'OMP 先用少數原子試著配出每條訓練光譜。',
        fixed: '字典中的所有原子', changing: '每條光譜的稀疏權重',
        formula: 'yᵢ ≈ d₁x₁ᵢ + d₂x₂ᵢ + ···',
        note: '原子是從原點出發的方向，不是會移向資料群中心的點。'
      },
      {
        title: '只看還沒有被解釋的部分',
        summary: '現在只改良 d₁。先扣除其他原子已經解釋的部分，剩下的藍色箭頭，就是 d₁ 應該負責的部分。',
        speaker: '把其他原子已經解釋的部分扣掉，留下目前這個原子應負責的部分。',
        fixed: 'd₂ 到 d₅₀₀ 與其權重', changing: '計算留給 d₁ 的部分',
        formula: 'eᵢ⁽¹⁾ = yᵢ − Σⱼ≠₁ dⱼxⱼᵢ',
        note: '正式計算只保留目前確實使用 d₁ 的樣本；沒有使用 d₁ 的樣本不參與這次更新。'
      },
      {
        title: '讓 SVD 把原子轉到更合適的方向',
        summary: '把藍色箭頭放在同一起點比較。SVD 找出最能代表它們的共同方向，用這個方向取代舊 d₁，並同步更新相關權重。',
        speaker: 'SVD 找到最能貼近這些剩餘箭頭的方向，再用它取代舊原子。',
        fixed: '殘差矩陣 E₁ᴿ', changing: '候選方向與投影誤差',
        formula: 'E₁ᴿ ≈ u₁σ₁v₁ᵀ,   d₁ ← u₁',
        note: '新方向不是額外增加一個原子，而是取代舊 d₁；相關權重也會一起更新。'
      }
    ];
    const ksvdColors = { training: '#607f9d', fixed: '#7251a3', residual: '#1769aa', old: '#c45f17', next: '#008a9a', faded: '#a8b4bf' };
    const oldD1 = [1, 0, 0];
    const fixedD2 = [0, 1, 0];
    const intendedAngle = 37 * Math.PI / 180;
    const intendedDirection = [Math.cos(intendedAngle), 0, Math.sin(intendedAngle)];
    const perpendicular = [-Math.sin(intendedAngle), 0, Math.cos(intendedAngle)];
    const ksvdScales = [0.52, 0.72, 0.94, 0.63];
    const ksvdOtherWeights = [0.18, 0.32, 0.12, 0.25];
    const ksvdNoise = [0.020, -0.015, 0.010, -0.020];
    const add3 = (a, b) => a.map((value, index) => value + b[index]);
    const scale3 = (vector, scale) => vector.map((value) => value * scale);
    const trainingVectors = ksvdScales.map((scale, index) => add3(add3(scale3(intendedDirection, scale), scale3(fixedD2, ksvdOtherWeights[index])), scale3(perpendicular, ksvdNoise[index])));
    trainingVectors.push(scale3(fixedD2, 0.70));
    const residualVectors = trainingVectors.slice(0, 4).map((vector) => [vector[0], 0, vector[2]]);
    const covarianceXX = residualVectors.reduce((sum, vector) => sum + vector[0] * vector[0], 0);
    const covarianceZZ = residualVectors.reduce((sum, vector) => sum + vector[2] * vector[2], 0);
    const covarianceXZ = residualVectors.reduce((sum, vector) => sum + vector[0] * vector[2], 0);
    const bestAngleRadians = 0.5 * Math.atan2(2 * covarianceXZ, covarianceXX - covarianceZZ);
    const bestAngleDegrees = bestAngleRadians * 180 / Math.PI;
    const bestDirection = [Math.cos(bestAngleRadians), 0, Math.sin(bestAngleRadians)];
    const directionError = (angleDegrees) => {
      const radians = angleDegrees * Math.PI / 180;
      const direction = [Math.cos(radians), 0, Math.sin(radians)];
      return Math.sqrt(residualVectors.reduce((sum, vector) => {
        const coefficient = dot(vector, direction);
        const difference = vector.map((value, index) => value - coefficient * direction[index]);
        return sum + dot(difference, difference);
      }, 0));
    };
    const oldDirectionError = directionError(0);
    const bestDirectionError = directionError(bestAngleDegrees);

    let ksvdStep = 0;
    let ksvdSample = 0;
    let ksvdYaw = -0.58;
    let ksvdPitch = 0.30;
    let ksvdCandidateAngle = Number($('#ksvdAngle').value);
    let ksvdSolved = false;
    const ksvdOrigin = [326, 332];
    const ksvdScale = 238;

    const projectKsvd = (vector) => {
      const [x, y, z] = vector;
      const rotatedX = x * Math.cos(ksvdYaw) + z * Math.sin(ksvdYaw);
      const rotatedZ = -x * Math.sin(ksvdYaw) + z * Math.cos(ksvdYaw);
      const rotatedY = y * Math.cos(ksvdPitch) - rotatedZ * Math.sin(ksvdPitch);
      const depth = y * Math.sin(ksvdPitch) + rotatedZ * Math.cos(ksvdPitch);
      return [ksvdOrigin[0] + rotatedX * ksvdScale, ksvdOrigin[1] - rotatedY * ksvdScale, depth];
    };
    const drawKsvdLine = (svg, from, to, color, options = {}) => {
      const start = projectKsvd(from);
      const end = projectKsvd(to);
      svg.append(makeSvg('line', {
        x1: start[0], y1: start[1], x2: end[0], y2: end[1], stroke: color,
        'stroke-width': options.width || 2, 'stroke-dasharray': options.dash || '',
        opacity: options.opacity ?? 1, 'stroke-linecap': 'round'
      }));
      return { start, end };
    };
    const drawKsvdVector = (svg, vector, color, options = {}) => {
      const from = options.from || [0, 0, 0];
      const { start, end } = drawKsvdLine(svg, from, vector, color, options);
      const width = options.width || 3;
      const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
      const size = 6 + width * 1.15;
      const spread = Math.PI / 7;
      const left = [end[0] - size * Math.cos(angle - spread), end[1] - size * Math.sin(angle - spread)];
      const right = [end[0] - size * Math.cos(angle + spread), end[1] - size * Math.sin(angle + spread)];
      svg.append(makeSvg('polygon', { points: `${end[0]},${end[1]} ${left[0]},${left[1]} ${right[0]},${right[1]}`, fill: color, opacity: options.opacity ?? 1 }));
      if (options.label) svg.append(makeSvg('text', {
        x: end[0] + (options.labelDx ?? 8), y: end[1] + (options.labelDy ?? -8),
        fill: color, 'font-weight': 900, 'font-size': options.fontSize || 15,
        'paint-order': 'stroke', stroke: '#fff', 'stroke-width': 4, 'stroke-linejoin': 'round'
      }, options.label));
    };
    const drawKsvdAxes = (svg) => {
      const axes = [
        { vector: [1.13, 0, 0], label: 'F₁' },
        { vector: [0, 1.05, 0], label: 'F₂' },
        { vector: [0, 0, 1.08], label: 'F₃' }
      ];
      axes.forEach((axis) => {
        const { end } = drawKsvdLine(svg, [0, 0, 0], axis.vector, '#c1cbd4', { width: 1.5 });
        svg.append(makeSvg('text', { x: end[0] + 7, y: end[1] - 5, fill: '#647384', 'font-size': 13, 'font-weight': 800 }, axis.label));
      });
      svg.append(makeSvg('circle', { cx: ksvdOrigin[0], cy: ksvdOrigin[1], r: 5, fill: '#14213d' }));
      svg.append(makeSvg('text', { x: ksvdOrigin[0] - 20, y: ksvdOrigin[1] + 20, fill: '#647384', 'font-size': 13, 'font-weight': 800 }, 'O'));
    };
    const drawKsvd = () => {
      const visualStep = ksvdStep === 0 ? 0 : ksvdStep === 1 ? 2 : ksvdSolved ? 5 : 4;
      const svg = $('#ksvdChart');
      clearSvg(svg);
      const title = $('#ksvdVisualTitle', svg);
      const description = $('#ksvdVisualDesc', svg);
      if (title) title.textContent = 'K-SVD 改良一個字典原子的互動示意';
      if (description) description.textContent = '依序觀察 OMP 試配、尚未解釋的部分，以及 SVD 找到更合適方向的過程。';
      svg.append(makeSvg('rect', { x: 12, y: 12, width: 676, height: 406, rx: 22, fill: '#f4f7f9', stroke: '#d7e0e7' }));
      drawKsvdAxes(svg);

      if (visualStep === 0) {
        trainingVectors.forEach((vector, index) => drawKsvdVector(svg, vector, index === ksvdSample ? ksvdColors.residual : ksvdColors.training, {
          width: index === ksvdSample ? 5 : 2.5, opacity: index === ksvdSample ? 1 : 0.62, label: `y${index + 1}`
        }));
        drawKsvdVector(svg, oldD1, ksvdColors.old, { width: 5, label: 'd₁' });
        drawKsvdVector(svg, fixedD2, ksvdColors.fixed, { width: 5, label: 'd₂', labelDx: -28 });
      } else if (visualStep === 1) {
        trainingVectors.forEach((vector, index) => drawKsvdVector(svg, vector, index < 4 ? ksvdColors.residual : ksvdColors.faded, {
          width: index === ksvdSample ? 5 : 2.6, opacity: index < 4 ? (index === ksvdSample ? 1 : 0.70) : 0.45,
          dash: index < 4 ? '' : '7 6', label: `y${index + 1}`
        }));
        drawKsvdVector(svg, oldD1, ksvdColors.old, { width: 5, label: 'd₁' });
        drawKsvdVector(svg, fixedD2, ksvdColors.fixed, { width: 4, label: 'd₂', labelDx: -28 });
      } else if (visualStep === 2) {
        trainingVectors.forEach((vector, index) => drawKsvdVector(svg, vector, ksvdColors.faded, { width: 1.7, opacity: index === ksvdSample ? 0.75 : 0.20, label: index === ksvdSample ? `y${index + 1}` : '' }));
        drawKsvdVector(svg, fixedD2, ksvdColors.fixed, { width: 4, opacity: 0.55, label: 'd₂', labelDx: -28 });
        const selected = trainingVectors[ksvdSample];
        const otherContribution = [0, selected[1], 0];
        drawKsvdVector(svg, otherContribution, ksvdColors.fixed, { width: 6, label: '其他原子', labelDx: -34 });
        if (ksvdSample < 4) {
          drawKsvdVector(svg, selected, ksvdColors.residual, { from: otherContribution, width: 6, label: '剩餘部分' });
          drawKsvdVector(svg, residualVectors[ksvdSample], ksvdColors.residual, { width: 3, dash: '7 6', opacity: 0.55, label: '' });
        }
      } else if (visualStep === 3) {
        residualVectors.forEach((vector, index) => drawKsvdVector(svg, vector, ksvdColors.residual, { width: 3.5, opacity: 0.72, label: `e${index + 1}⁽¹⁾` }));
        drawKsvdVector(svg, oldD1, ksvdColors.old, { width: 4, dash: '8 6', opacity: 0.75, label: 'd₁' });
        drawKsvdVector(svg, fixedD2, ksvdColors.fixed, { width: 3, opacity: 0.34, label: 'd₂', labelDx: -28 });
      } else if (visualStep === 4) {
        residualVectors.forEach((vector, index) => drawKsvdVector(svg, vector, ksvdColors.residual, { width: 3, opacity: 0.67, label: `剩餘 ${index + 1}` }));
        drawKsvdVector(svg, oldD1, ksvdColors.old, { width: 3, dash: '8 6', opacity: 0.65, label: '舊 d₁' });
        const radians = ksvdCandidateAngle * Math.PI / 180;
        const candidate = [Math.cos(radians), 0, Math.sin(radians)];
        residualVectors.forEach((vector) => {
          const amount = dot(vector, candidate);
          drawKsvdLine(svg, vector, scale3(candidate, amount), ksvdColors.next, { width: 1.6, dash: '4 5', opacity: 0.75 });
        });
        drawKsvdVector(svg, candidate, ksvdColors.next, { width: 6, label: ksvdSolved ? '最佳方向' : '試選方向' });
      } else {
        residualVectors.forEach((vector) => {
          const amount = dot(vector, bestDirection);
          drawKsvdLine(svg, vector, scale3(bestDirection, amount), ksvdColors.next, { width: 1.4, dash: '4 5', opacity: 0.50 });
          drawKsvdVector(svg, vector, ksvdColors.residual, { width: 2, opacity: 0.30 });
        });
        drawKsvdVector(svg, oldD1, ksvdColors.old, { width: 3, dash: '8 6', opacity: 0.52, label: '舊 d₁' });
        drawKsvdVector(svg, bestDirection, ksvdColors.next, { width: 7, label: '新 d₁' });
        drawKsvdVector(svg, fixedD2, ksvdColors.fixed, { width: 4, opacity: 0.60, label: 'd₂', labelDx: -28 });
      }
    };

    const updateKsvdSampleReadout = () => {
      const name = `y${ksvdSample + 1}`;
      $('#ksvdSampleName').textContent = name.replace('y1', 'y₁').replace('y2', 'y₂').replace('y3', 'y₃').replace('y4', 'y₄').replace('y5', 'y₅');
      if (ksvdSample === 4) {
        $('#ksvdSampleEquation').textContent = 'y₅ = 0.70d₂,   x₁₅ = 0';
        $('#ksvdSampleMeaning').textContent = 'y₅ 沒有使用 d₁，所以不屬於 Ω₁，也不參與這次 d₁ 更新。';
      } else if (ksvdStep === 1) {
        const vector = residualVectors[ksvdSample];
        $('#ksvdSampleEquation').textContent = `e${ksvdSample + 1}⁽¹⁾ = y${ksvdSample + 1} − ${ksvdOtherWeights[ksvdSample].toFixed(2)}d₂ ≈ (${vector[0].toFixed(2)}, 0, ${vector[2].toFixed(2)})`;
        $('#ksvdSampleMeaning').textContent = '扣除固定原子的貢獻後，這條剩餘向量才交給 SVD 比較。';
      } else {
        const vector = trainingVectors[ksvdSample];
        $('#ksvdSampleEquation').textContent = `y${ksvdSample + 1} ≈ ${vector[0].toFixed(2)}d₁ + ${vector[1].toFixed(2)}d₂`;
        $('#ksvdSampleMeaning').textContent = '這些數字是簡化示範，用來顯示一條光譜如何由少數原子組合。';
      }
    };
    const renderKsvd = () => {
      const stage = ksvdStages[ksvdStep];
      $('#ksvdStepNumber').value = String(ksvdStep + 1);
      $('#ksvdStageTitle').textContent = stage.title;
      $('#ksvdSummary').textContent = stage.summary;
      $('#ksvdSpeakerLine').textContent = stage.speaker;
      $('#ksvdFixedState').textContent = stage.fixed;
      $('#ksvdChangingState').textContent = stage.changing;
      $('#ksvdFormula').textContent = stage.formula;
      $('#ksvdFormulaNote').textContent = stage.note;
      $('#ksvdCounter').textContent = `${ksvdStep + 1} / ${ksvdStages.length}`;
      $('#ksvdPrevious').disabled = ksvdStep === 0;
      $('#ksvdNext').disabled = ksvdStep === ksvdStages.length - 1;
      $('#ksvdSamplePicker').hidden = ksvdStep === 2;
      $('#ksvdSampleReadout').hidden = ksvdStep === 2;
      $('#ksvdAngleControl').hidden = ksvdStep !== 2;
      $('#ksvdResult').hidden = ksvdStep !== 2 || !ksvdSolved;
      $$('[data-ksvd-step]').forEach((button, index) => index === ksvdStep ? button.setAttribute('aria-current', 'step') : button.removeAttribute('aria-current'));
      $$('[data-ksvd-sample]').forEach((button, index) => {
        button.setAttribute('aria-pressed', String(index === ksvdSample));
        button.classList.toggle('is-excluded', ksvdStep > 0 && index === 4);
      });
      $('#ksvdAngle').value = String(ksvdCandidateAngle);
      $('#ksvdAngleValue').value = `${ksvdCandidateAngle.toFixed(1)}°`;
      $('#ksvdCandidateError').textContent = directionError(ksvdCandidateAngle).toFixed(3);
      $('#ksvdBeforeError').textContent = oldDirectionError.toFixed(3);
      $('#ksvdAfterError').textContent = bestDirectionError.toFixed(3);
      updateKsvdSampleReadout();
      drawKsvd();
    };
    const setKsvdStep = (nextStep) => {
      ksvdStep = Math.max(0, Math.min(ksvdStages.length - 1, nextStep));
      if (ksvdStep === 2 && !ksvdSolved) ksvdCandidateAngle = Number($('#ksvdAngle').value);
      renderKsvd();
    };
    $$('[data-ksvd-step]').forEach((button) => button.addEventListener('click', () => setKsvdStep(Number(button.dataset.ksvdStep))));
    $$('[data-ksvd-sample]').forEach((button) => button.addEventListener('click', () => { ksvdSample = Number(button.dataset.ksvdSample); renderKsvd(); }));
    $('#ksvdPrevious').addEventListener('click', () => setKsvdStep(ksvdStep - 1));
    $('#ksvdNext').addEventListener('click', () => setKsvdStep(ksvdStep + 1));
    $('#ksvdAngle').addEventListener('input', (event) => { ksvdCandidateAngle = Number(event.target.value); ksvdSolved = false; renderKsvd(); });
    $('#ksvdSolve').addEventListener('click', () => { ksvdCandidateAngle = bestAngleDegrees; ksvdSolved = true; renderKsvd(); });
    $('#ksvdResetView').addEventListener('click', () => { ksvdYaw = -0.58; ksvdPitch = 0.30; drawKsvd(); });

    const ksvdSvg = $('#ksvdChart');
    let ksvdDrag;
    ksvdSvg.addEventListener('pointerdown', (event) => {
      ksvdDrag = { x: event.clientX, y: event.clientY, yaw: ksvdYaw, pitch: ksvdPitch };
      ksvdSvg.setPointerCapture(event.pointerId);
      ksvdSvg.classList.add('is-dragging');
    });
    ksvdSvg.addEventListener('pointermove', (event) => {
      if (!ksvdDrag) return;
      ksvdYaw = ksvdDrag.yaw + (event.clientX - ksvdDrag.x) * 0.008;
      ksvdPitch = Math.max(-0.9, Math.min(0.9, ksvdDrag.pitch - (event.clientY - ksvdDrag.y) * 0.006));
      drawKsvd();
    });
    const endKsvdDrag = () => { ksvdDrag = null; ksvdSvg.classList.remove('is-dragging'); };
    ksvdSvg.addEventListener('pointerup', endKsvdDrag);
    ksvdSvg.addEventListener('pointercancel', endKsvdDrag);
    ksvdSvg.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'ArrowLeft') ksvdYaw -= 0.08;
      if (event.key === 'ArrowRight') ksvdYaw += 0.08;
      if (event.key === 'ArrowUp') ksvdPitch = Math.min(0.9, ksvdPitch + 0.06);
      if (event.key === 'ArrowDown') ksvdPitch = Math.max(-0.9, ksvdPitch - 0.06);
      drawKsvd();
    });
    renderKsvd();

    const ompData = [
      { name: '原子 1', values: [0.72, 0.35, 0.18] },
      { name: '原子 2', values: [0.48, 0.55, 0.34] },
      { name: '原子 3', values: [0.18, 0.42, 0.73] },
      { name: '原子 4', values: [0.66, 0.51, 0.24] }
    ];
    const ompTarget = [0.62, 0.46, 0.28];
    const magnitude = (vector) => Math.sqrt(dot(vector, vector));
    const normalizedAtoms = ompData.map((atom) => {
      const length = magnitude(atom.values);
      return atom.values.map((value) => value / length);
    });
    const solveLinearSystem = (matrix, vector) => {
      const augmented = matrix.map((row, index) => [...row, vector[index]]);
      for (let column = 0; column < augmented.length; column += 1) {
        let pivot = column;
        for (let row = column + 1; row < augmented.length; row += 1) {
          if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
        }
        [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
        const divisor = augmented[column][column];
        for (let item = column; item <= augmented.length; item += 1) augmented[column][item] /= divisor;
        for (let row = 0; row < augmented.length; row += 1) {
          if (row === column) continue;
          const factor = augmented[row][column];
          for (let item = column; item <= augmented.length; item += 1) augmented[row][item] -= factor * augmented[column][item];
        }
      }
      return augmented.map((row) => row[augmented.length]);
    };
    const buildOmpStates = () => {
      const selected = [];
      let residualVector = [...ompTarget];
      const initialMagnitude = magnitude(ompTarget);
      const generated = [{
        selected: [], residual: 1,
        text: '尚未選取原子，尚未解釋的 RGB 向量就是整個輸入，因此相對殘差為 1.000。'
      }];
      const stepText = [
        '第 1 步：先把每個原子正規化為相同長度。原子 4 與目前殘差方向最接近；重新計算權重後，相對殘差降至 0.070。',
        '第 2 步：原子 3 與新殘差方向最接近；加入後重新計算原子 4 與原子 3 的權重，相對殘差降至 0.041。',
        '第 3 步：原子 1 與新殘差方向最接近；加入後重新計算三個權重，相對殘差接近 0，因此停止。這個 RGB 擬合仍不能證明光譜答案唯一。'
      ];
      for (let step = 0; step < 3; step += 1) {
        let bestIndex = -1;
        let bestCorrelation = -Infinity;
        normalizedAtoms.forEach((atom, index) => {
          if (selected.includes(index)) return;
          const correlation = Math.abs(dot(atom, residualVector));
          if (correlation > bestCorrelation) { bestCorrelation = correlation; bestIndex = index; }
        });
        selected.push(bestIndex);
        const gram = selected.map((rowIndex) => selected.map((columnIndex) => dot(normalizedAtoms[rowIndex], normalizedAtoms[columnIndex])));
        const targetProjection = selected.map((index) => dot(normalizedAtoms[index], ompTarget));
        const weights = solveLinearSystem(gram, targetProjection);
        const fit = [0, 0, 0];
        selected.forEach((atomIndex, selectedIndex) => normalizedAtoms[atomIndex].forEach((value, channel) => { fit[channel] += value * weights[selectedIndex]; }));
        residualVector = ompTarget.map((value, channel) => value - fit[channel]);
        generated.push({ selected: [...selected], residual: magnitude(residualVector) / initialMagnitude, text: stepText[step] });
      }
      return generated;
    };
    const states = buildOmpStates();
    let ompStep = 0;
    const renderOmp = () => {
      const state = states[ompStep];
      const container = $('#ompAtoms'); container.replaceChildren();
      ompData.forEach((atom, index) => {
        const card = document.createElement('div');
        card.className = `omp-atom${state.selected.includes(index) ? ' is-selected' : ''}`;
        card.innerHTML = `<strong>${atom.name}</strong><small>(${atom.values.map((value) => value.toFixed(2)).join(', ')})</small>`;
        container.append(card);
      });
      $('#ompResidualBar').style.width = `${state.residual * 100}%`;
      $('#ompResidualValue').value = state.residual.toFixed(3);
      $('#ompSummary').textContent = state.text;
      $('#ompNext').disabled = ompStep === states.length - 1;
      $('#ompNext').textContent = ompStep === states.length - 1 ? '已達停止條件' : '執行下一步';
    };
    $('#ompNext').addEventListener('click', () => { if (ompStep < states.length - 1) { ompStep += 1; renderOmp(); } });
    $('#ompReset').addEventListener('click', () => { ompStep = 0; renderOmp(); });
    renderOmp();
  }

  function initializeExperiments() {
    const groups = {
      main: {
        rows: [['完整資料集', 0.0756], ['公園', 0.0589], ['室內', 0.0507], ['都市', 0.0617], ['鄉村', 0.0354], ['植物', 0.0469]],
        note: '同一領域內，不同場景的作者報告相對誤差並不相同；0.0756 是完整資料集彙整值。',
        caption: '主要自然場景結果。數值越低表示作者所用指標下的誤差較小，但不代表每個像素都具有相同誤差；橫軸依本組最大值自動縮放。'
      },
      cross: {
        rows: [['公園 ← 鄉村先驗', 0.0801], ['鄉村 ← 公園先驗', 0.0592]],
        note: '跨領域先驗仍能輸出結果，但通常比匹配先驗更差，顯示字典範圍很重要。',
        caption: '跨領域先驗結果。箭頭左側是測試場景，右側是建立字典的先驗來源；橫軸依本組最大值自動縮放。'
      },
      external: {
        rows: [['Chakrabarti 戶外', 0.1231], ['Chakrabarti 室內', 0.5207]],
        note: '外部資料尤其室內影像誤差明顯增加，作者提到暗像素、模糊與先驗不匹配等因素。',
        caption: '外部資料集結果說明：方法能否泛化，不能只看同一資料庫內的測試；橫軸依本組最大值自動縮放。'
      },
      camera: {
        rows: [['真實／一般先驗', 0.0757], ['真實／領域先驗', 0.557], ['模擬／一般先驗', 0.0596], ['模擬／領域先驗', 0.0149]],
        note: '真機展示只涉及一部 Canon 40D 與一張 ColorChecker；不能推廣成所有手機或相機均已驗證。',
        caption: 'Table 3 原數值。0.557 與正文敘述有張力，但沒有可靠勘誤，因此保留並明確標示疑點；橫軸依本組最大值自動縮放。'
      }
    };
    const select = $('#experimentGroup');
    const drawBars = (rows) => {
      const svg = $('#experimentChart'); clearSvg(svg);
      const width = 760; const height = 420; const left = 225; const right = 42; const top = 35; const bottom = 55;
      const innerWidth = width - left - right; const innerHeight = height - top - bottom;
      const maxValue = Math.max(0.1, Math.ceil(Math.max(...rows.map((row) => row[1])) * 10) / 10);
      const x = (value) => left + (value / maxValue) * innerWidth;
      [0, 0.25, 0.5, 0.75, 1].forEach((fraction) => {
        const value = maxValue * fraction;
        svg.append(makeSvg('line', { x1: x(value), x2: x(value), y1: top, y2: height - bottom, stroke: '#cbd5df', 'stroke-width': 1, 'stroke-dasharray': fraction ? '4 5' : '' }));
        svg.append(makeSvg('text', { x: x(value), y: height - 24, 'text-anchor': 'middle' }, value.toFixed(maxValue <= 0.1 ? 3 : 2)));
      });
      const slot = innerHeight / rows.length;
      rows.forEach(([label, value], index) => {
        const y = top + index * slot + slot * 0.17;
        const barHeight = slot * 0.58;
        svg.append(makeSvg('text', { x: left - 12, y: y + barHeight * 0.68, 'text-anchor': 'end' }, label));
        svg.append(makeSvg('rect', { x: left, y, width: Math.max(2, x(value) - left), height: barHeight, rx: 5, fill: index % 2 ? '#008a9a' : '#1769aa' }));
        const inside = x(value) > width - 120;
        svg.append(makeSvg('text', { x: inside ? x(value) - 8 : x(value) + 8, y: y + barHeight * 0.68, 'text-anchor': inside ? 'end' : 'start', fill: inside ? '#fff' : '#14213d', 'font-weight': 800 }, value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')));
      });
      svg.append(makeSvg('text', { x: left + innerWidth / 2, y: height - 2, 'text-anchor': 'middle', class: 'axis-title' }, '作者報告的相對誤差（越低越好）'));
    };
    const update = () => {
      const group = groups[select.value];
      drawBars(group.rows);
      $('#experimentNote').textContent = group.note;
      $('#experimentCaption').textContent = group.caption;
      $('#cameraWarning').hidden = select.value !== 'camera';
    };
    select.addEventListener('change', update); update();
  }

  function initializeEvidence() {
    const order = ['rgb', 'physical', 'prior', 'truth'];
    const claims = [
      '這條估計光譜可以重新產生接近輸入的 RGB；但尚不能證明它接近真實光譜。',
      '它同時符合 RGB 且沒有明顯違反基本物理條件；這仍只是較可信的候選，不是真值證明。',
      '它與 RGB、物理限制及相近領域的先驗都相容，因此可稱為有根據的估計；但仍未直接量到真值。',
      '有高光譜真值後，才可以直接計算 ĥ 與 h_true 的差距，量化這個測試案例的準確度；結論仍受測試資料與指標範圍限制。'
    ];
    let level = 0;
    const render = () => {
      $$('[data-evidence]').forEach((button) => button.setAttribute('aria-pressed', String(order.indexOf(button.dataset.evidence) <= level)));
      $('#trustClaim').textContent = claims[level];
    };
    $$('[data-evidence]').forEach((button) => button.addEventListener('click', () => { level = order.indexOf(button.dataset.evidence); render(); }));
    $('#resetEvidence').addEventListener('click', () => { level = 0; render(); });
    render();
  }

  function initializeConditions() {
    const riskText = {
      domain: '場景與字典不相近：模型可能只會拼出「像訓練資料」的曲線，而非新材料的真實光譜。',
      sensor: '相機反應 R 不準：高光譜與 RGB 字典的逐項配對會失真。',
      linear: '輸入不是近似線性 RAW：白平衡、色調映射或 JPEG 處理會破壞 c = Rh 的簡化模型。',
      metamer: '同色異譜常見：即使回投影 RGB 完全一致，也可能選到錯的光譜候選。'
    };
    const update = () => {
      const inputs = $$('[data-condition]');
      const missing = inputs.filter((input) => !input.checked).map((input) => input.dataset.condition);
      const list = $('#conditionRisks'); list.replaceChildren();
      if (missing.length === 0) {
        $('#conditionClaim').textContent = '在先驗、相機模型與輸入條件都匹配時，論文實驗支持本方法能從 RGB 估計出接近真值的高光譜候選；仍不能說答案唯一。';
        const item = document.createElement('li'); item.textContent = '目前未關閉任何主要條件，但仍需用真值評估誤差。'; list.append(item);
      } else {
        $('#conditionClaim').textContent = missing.length === 1
          ? '目前有一項重要假設不成立；輸出最多只能稱為與部分條件相容的候選，不能直接宣稱光譜準確。'
          : '多項核心假設不成立；此時不適合宣稱已從 RGB 得到可靠的高光譜估計。';
        missing.forEach((key) => { const item = document.createElement('li'); item.textContent = riskText[key]; list.append(item); });
      }
    };
    $$('[data-condition]').forEach((input) => input.addEventListener('change', update)); update();
  }

  function initialize() {
    initializeGlobalNavigation();
    initializeKnowledgeMap();
    initializeLightLab();
    initializeIlluminationLab();
    initializeRgbLab();
    initializeCube();
    initializeMetamer();
    initializeAssumptionLab();
    initializeSparseLab();
    initializePairedDictionary();
    initializeEquations();
    initializeAlgorithms();
    initializeExperiments();
    initializeEvidence();
    initializeConditions();
    initializePageRouter();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
  else initialize();
})();
