/* 机械停表组件 + 读数练习 + 估测 1 分钟 */
(function () {
  'use strict';
  const { h } = PS;
  const NS = 'http://www.w3.org/2000/svg';
  const CX = 160, CY = 215, R = 135;   // 大表盘
  const SX = 160, SY = 157, SR = 42;   // 小表盘

  function svg(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.append(e);
    return e;
  }

  /**
   * 机械停表：大表盘一圈 30 s，分度值 0.1 s；小表盘一圈 15 min，每分钟分两个半格。
   * opts: { interactive=true, size, onToggle(running), onReset() }
   */
  PS.Stopwatch = function (container, opts) {
    opts = opts || {};
    const root = svg('svg', { viewBox: '0 0 320 370', class: 'sw-svg', role: 'img', 'aria-label': '机械停表' });
    if (opts.size) root.style.maxWidth = opts.size + 'px';
    const defs = svg('defs', {}, root);
    const g1 = svg('linearGradient', { id: 'swCase', x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
    svg('stop', { offset: '0', 'stop-color': '#f1f3f5' }, g1);
    svg('stop', { offset: '.5', 'stop-color': '#adb5bd' }, g1);
    svg('stop', { offset: '1', 'stop-color': '#495057' }, g1);
    const g2 = svg('radialGradient', { id: 'swFace', cx: '.45', cy: '.4', r: '.7' }, defs);
    svg('stop', { offset: '0', 'stop-color': '#ffffff' }, g2);
    svg('stop', { offset: '1', 'stop-color': '#eef1f5' }, g2);

    // 按钮
    const crown = svg('g', { class: 'sw-btn', style: 'cursor:pointer' }, root);
    svg('rect', { x: 150, y: 50, width: 20, height: 34, rx: 3, fill: '#868e96' }, crown);
    const crownCap = svg('rect', { x: 140, y: 30, width: 40, height: 24, rx: 8, fill: '#495057' }, crown);
    svg('circle', { cx: 160, cy: 66, r: 9, fill: 'none', stroke: '#495057', 'stroke-width': 5 }, root);
    const reset = svg('g', { class: 'sw-btn', style: 'cursor:pointer', transform: 'rotate(40 ' + CX + ' ' + CY + ')' }, root);
    svg('rect', { x: 152, y: 58, width: 16, height: 26, rx: 3, fill: '#868e96' }, reset);
    svg('rect', { x: 147, y: 46, width: 26, height: 16, rx: 6, fill: '#e03131' }, reset);
    // 表壳与表盘
    svg('circle', { cx: CX, cy: CY, r: R + 14, fill: 'url(#swCase)' }, root);
    svg('circle', { cx: CX, cy: CY, r: R + 4, fill: '#343a40' }, root);
    svg('circle', { cx: CX, cy: CY, r: R, fill: 'url(#swFace)' }, root);
    // 大表盘刻度：300 格，每格 0.1 s
    let path = '', pathMid = '', pathBig = '';
    for (let i = 0; i < 300; i++) {
      const a = (i / 300) * Math.PI * 2;
      const s = Math.sin(a), c = -Math.cos(a);
      const len = i % 10 === 0 ? 13 : i % 5 === 0 ? 9 : 5;
      const seg = 'M' + (CX + s * R).toFixed(2) + ' ' + (CY + c * R).toFixed(2) + 'L' + (CX + s * (R - len)).toFixed(2) + ' ' + (CY + c * (R - len)).toFixed(2);
      if (i % 10 === 0) pathBig += seg; else if (i % 5 === 0) pathMid += seg; else path += seg;
    }
    svg('path', { d: path, stroke: '#495057', 'stroke-width': 0.7 }, root);
    svg('path', { d: pathMid, stroke: '#343a40', 'stroke-width': 1.1 }, root);
    svg('path', { d: pathBig, stroke: '#1b2333', 'stroke-width': 1.8 }, root);
    for (let k = 1; k <= 30; k++) {
      const a = (k / 30) * Math.PI * 2;
      const t = svg('text', { x: CX + Math.sin(a) * 110, y: CY - Math.cos(a) * 110, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': k % 5 === 0 ? 14 : 11.5, 'font-weight': k % 5 === 0 ? 800 : 600, fill: '#1b2333', 'font-family': 'Arial, sans-serif' }, root);
      t.textContent = k;
    }
    svg('text', { x: CX, y: CY + 62, 'text-anchor': 'middle', 'font-size': 11, fill: '#868e96', 'font-family': 'Arial' }, root).textContent = 's';
    // 小表盘
    svg('circle', { cx: SX, cy: SY, r: SR, fill: '#fff', stroke: '#adb5bd', 'stroke-width': 1.2 }, root);
    let sp = '', spBig = '';
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2;
      const s = Math.sin(a), c = -Math.cos(a);
      const len = i % 2 === 0 ? 6.5 : 3.5;
      const seg = 'M' + (SX + s * SR).toFixed(2) + ' ' + (SY + c * SR).toFixed(2) + 'L' + (SX + s * (SR - len)).toFixed(2) + ' ' + (SY + c * (SR - len)).toFixed(2);
      if (i % 2 === 0) spBig += seg; else sp += seg;
    }
    svg('path', { d: sp, stroke: '#e03131', 'stroke-width': 0.9 }, root);
    svg('path', { d: spBig, stroke: '#1b2333', 'stroke-width': 1.3 }, root);
    for (let k = 0; k < 15; k++) {
      const a = (k / 15) * Math.PI * 2;
      svg('text', { x: SX + Math.sin(a) * 29.5, y: SY - Math.cos(a) * 29.5, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 8.2, 'font-weight': 700, fill: '#1b2333', 'font-family': 'Arial' }, root).textContent = k;
    }
    // 指针
    const small = svg('g', {}, root);
    svg('path', { d: `M${SX - 2.2} ${SY + 7} L${SX} ${SY - 36} L${SX + 2.2} ${SY + 7} Z`, fill: '#1b2333' }, small);
    svg('circle', { cx: SX, cy: SY, r: 3.5, fill: '#1b2333' }, root);
    const big = svg('g', {}, root);
    svg('path', { d: `M${CX - 2.6} ${CY + 26} L${CX - 1} ${CY - 128} L${CX + 1} ${CY - 128} L${CX + 2.6} ${CY + 26} Z`, fill: '#c92a2a' }, big);
    svg('circle', { cx: CX, cy: CY + 22, r: 5, fill: '#c92a2a' }, big);
    svg('circle', { cx: CX, cy: CY, r: 7, fill: '#c92a2a' }, root);
    svg('circle', { cx: CX, cy: CY, r: 2.5, fill: '#fff' }, root);
    container.append(root);

    let acc = 0, t0 = 0, running = false, raf = 0, shown = 0;
    const api = {
      el: root,
      get running() { return running; },
      get time() { return running ? acc + (performance.now() - t0) / 1000 : acc; },
      start() { if (running) return; running = true; t0 = performance.now(); loop(); press(crownCap); if (opts.onToggle) opts.onToggle(true); },
      stop() { if (!running) return; acc += (performance.now() - t0) / 1000; running = false; cancelAnimationFrame(raf); render(acc); press(crownCap); if (opts.onToggle) opts.onToggle(false); },
      toggle() { running ? api.stop() : api.start(); },
      reset() { if (running) return; acc = 0; render(0); if (opts.onReset) opts.onReset(); },
      setTime(t) { running = false; cancelAnimationFrame(raf); acc = t; render(t); },
      /** 机械停表最小只能显示到 0.1 s */
      get reading() { return Math.floor(api.time * 10 + 1e-6) / 10; },
    };
    function press(el) {
      el.setAttribute('transform', 'translate(0 3)');
      setTimeout(() => el.removeAttribute('transform'), 120);
    }
    function render(t) {
      const q = Math.floor(t * 10 + 1e-6) / 10; // 0.1 s 跳针
      shown = q;
      big.setAttribute('transform', `rotate(${((q % 30) / 30) * 360} ${CX} ${CY})`);
      small.setAttribute('transform', `rotate(${(((q / 60) % 15) / 15) * 360} ${SX} ${SY})`);
      if (opts.onRender) opts.onRender(q);
    }
    function loop() {
      if (!running) return;
      render(api.time);
      raf = requestAnimationFrame(loop);
    }
    if (opts.interactive !== false) {
      crown.addEventListener('click', () => api.toggle());
      reset.addEventListener('click', () => { if (!running) { press(reset.lastChild); api.reset(); } });
    } else {
      crown.style.cursor = reset.style.cursor = 'default';
    }
    render(0);
    return api;
  };

  /** 读数的文字解释 */
  PS.stopwatchExplain = function (t) {
    const q = Math.round(t * 10) / 10;
    const m = Math.floor(q / 60 + 1e-9);
    const s = PS.round(q - m * 60, 1);
    const b = PS.round(s % 30, 1);
    const past = s >= 30;
    return '① 小表盘：指针在 <b>' + m + '</b> 与 <b>' + (m + 1) + '</b> 之间，' + (past ? '<b>已过</b>' : '<b>未过</b>') + '中间的半格线 → ' + m + ' min，秒数' + (past ? '在 30 s 以上' : '在 30 s 以内') + '。<br>' +
      '② 大表盘：指针指在 <b>' + PS.fmt(b, 1) + '</b> 处' + (past ? '，加上 30 s 得 <b>' + PS.fmt(s, 1) + ' s</b>' : '，即 <b>' + PS.fmt(s, 1) + ' s</b>') + '。<br>' +
      '③ 读数：<b>' + m + ' min ' + PS.fmt(s, 1) + ' s</b> = <b>' + PS.fmt(q, 1) + ' s</b>。（停表一般不估读）';
  };

  /* ================= 停表：动手计时 + 读数练习 ================= */
  PS.register('stopwatch-practice', function (el) {
    const wrap = h('div', { class: 'sw-wrap' });
    const left = h('div', { class: 'sw-left' });
    const right = h('div', { class: 'sw-right' });
    wrap.append(left, right);
    el.append(wrap);
    const digital = h('div', { class: 'sw-digital' }, '0.0 s');
    let showDigital = false;
    const sw = PS.Stopwatch(left, {
      onRender: (q) => {
        const m = Math.floor(q / 60);
        digital.textContent = showDigital ? (m ? m + ' min ' : '') + PS.fmt(q - m * 60, 1) + ' s' : '— 电子读数已隐藏 —';
      },
      onToggle: () => syncBtns(),
    });
    left.append(digital);
    const bStart = PS.ui.button('▶ 开始 / 停止', () => sw.toggle(), 'btn btn-primary');
    const bReset = PS.ui.button('↺ 复位', () => { sw.reset(); }, 'btn');
    const bFast = PS.ui.button('⏩ 拨到随机时间', () => { if (!sw.running) sw.setTime(PS.randInt(0, 899 * 10) / 10 + PS.randInt(0, 1) * 0); }, 'btn');
    function syncBtns() { bReset.disabled = sw.running; bFast.disabled = sw.running; }
    const dig = PS.ui.toggle('显示电子读数', false, (v) => { showDigital = v; sw.setTime(sw.time); });
    const mode = PS.ui.seg([{ value: 'use', label: '动手计时' }, { value: 'read', label: '读数练习' }], 'use', (v) => { panelUse.style.display = v === 'use' ? '' : 'none'; panelRead.style.display = v === 'read' ? '' : 'none'; if (v === 'read') newQ(); else { sw.reset(); } });

    const panelUse = h('div', null,
      h('ol', { class: 'step-list' },
        h('li', null, '“调”：按下复位按钮（红色），让指针归零。'),
        h('li', null, '“按”：按下顶部按钮，开始计时。'),
        h('li', null, '“停”：再按一次顶部按钮，停止计时。'),
        h('li', null, '“读”：先读小表盘（分），再读大表盘（秒），相加。')),
      PS.ui.row(bStart, bReset, bFast),
      PS.ui.row(dig.el),
      h('p', { class: 'kbd-hint', style: { marginTop: '8px' } }, '也可以直接点击停表上的按钮操作。'));

    const inM = h('input', { type: 'text', class: 'num', inputmode: 'numeric', placeholder: '分' });
    const inS = h('input', { type: 'text', class: 'num', inputmode: 'decimal', placeholder: '秒' });
    const fb = h('div', { class: 'feedback' });
    let ans = 0;
    function newQ() {
      // 让题目分布在“过半格”和“未过半格”两种情况
      const m = PS.randInt(0, 13);
      const s = PS.round(Math.random() < 0.5 ? PS.rand(0.5, 29.5) : PS.rand(30.5, 59.5), 1);
      ans = m * 60 + s;
      sw.setTime(ans);
      inM.value = ''; inS.value = ''; inM.className = inS.className = 'num';
      fb.className = 'feedback';
      showDigital = false; dig.set(false); sw.setTime(ans);
    }
    function check() {
      const m = parseInt(inM.value || '0', 10), s = parseFloat(inS.value);
      if (isNaN(s)) { inS.focus(); return; }
      const ok = Math.abs(m * 60 + s - ans) < 0.05 && s < 60;
      inM.className = inS.className = 'num ' + (ok ? 'ok' : 'bad');
      fb.className = 'feedback show ' + (ok ? 'ok' : 'bad');
      fb.innerHTML = (ok ? '✔ 读对了！<br>' : '✘ 再看看：<br>') + PS.stopwatchExplain(ans);
      ok ? PS.sound.good() : PS.sound.bad();
    }
    inS.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    const panelRead = h('div', { style: { display: 'none' } },
      h('p', { class: 'small' }, '读出左边停表显示的时间：'),
      h('div', { class: 'row', style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } }, inM, h('span', null, 'min'), inS, h('span', null, 's')),
      PS.ui.row(PS.ui.button('检查', check, 'btn btn-primary'), PS.ui.button('换一题', newQ, 'btn')),
      fb,
      h('div', { class: 'tip tip-exam small' }, '读数口诀：<b>先小后大</b>。小表盘指针若<b>超过</b>两个数字中间的半格线，大表盘按 30~60 s 读；若<b>没超过</b>，按 0~30 s 读。'));
    right.append(PS.ui.row(mode.el), panelUse, panelRead);
    syncBtns();
  });

  /* ================= 估测 1 分钟 ================= */
  PS.register('estimate-minute', function (el) {
    let t0 = 0, running = false;
    const best = [];
    const big = h('button', { type: 'button', class: 'em-btn' }, '开始');
    const info = h('div', { class: 'em-info' }, '按下“开始”后，在心里默数，觉得过了 1 分钟就再按一次。不要看钟哦！');
    const hist = h('div', { class: 'em-hist' });
    const swBox = h('div', { class: 'em-sw' });
    const sw = PS.Stopwatch(swBox, { interactive: false, size: 180 });
    big.addEventListener('click', () => {
      if (!running) {
        running = true; t0 = performance.now();
        big.textContent = '我觉得 1 分钟到了！';
        big.classList.add('on');
        info.textContent = '计时中……（屏幕上不显示时间）';
        sw.setTime(0);
        PS.sound.beep(660, 0.1);
      } else {
        running = false;
        const t = (performance.now() - t0) / 1000;
        sw.setTime(t);
        big.textContent = '再来一次';
        big.classList.remove('on');
        const err = t - 60;
        const grade = Math.abs(err) < 2 ? '🏆 神准！' : Math.abs(err) < 5 ? '👍 很不错' : Math.abs(err) < 10 ? '🙂 还可以' : '🤔 差得有点多';
        info.innerHTML = '你估计的 1 分钟实际是 <b class="big-num">' + t.toFixed(1) + ' s</b>，' +
          (err > 0 ? '多了 ' : '少了 ') + Math.abs(err).toFixed(1) + ' s。' + grade +
          '<br><span class="muted">凭感觉估测时间并不精确，需要准确计时就要用停表等工具。</span>';
        best.push(t);
        hist.innerHTML = '历次结果：' + best.map((x) => '<span class="chip">' + x.toFixed(1) + ' s</span>').join('');
        Math.abs(err) < 5 ? PS.sound.good() : PS.sound.ping();
      }
    });
    el.append(h('div', { class: 'em' }, h('div', { class: 'em-main' }, big, info, hist), swBox));
  });

  const css = `
  .sw-wrap{display:grid;grid-template-columns:minmax(220px,340px) 1fr;gap:22px;align-items:start}
  .sw-left{display:flex;flex-direction:column;align-items:center}
  .sw-svg{width:100%;max-width:340px;height:auto;display:block;user-select:none}
  .sw-btn:hover rect{filter:brightness(1.15)}
  .sw-digital{margin-top:6px;font-family:var(--mono);font-size:1.1rem;font-weight:700;color:var(--primary);background:var(--surface-2);border:1px solid var(--line);padding:4px 14px;border-radius:8px;min-width:180px;text-align:center}
  .em{display:grid;grid-template-columns:1fr 200px;gap:18px;align-items:center}
  .em-btn{font:inherit;font-size:1.15rem;font-weight:800;padding:16px 30px;border-radius:16px;border:0;background:var(--primary);color:#fff;cursor:pointer;box-shadow:0 6px 18px rgba(59,91,219,.35);transition:transform .1s}
  .em-btn:active{transform:scale(.97)}
  .em-btn.on{background:var(--accent);box-shadow:0 6px 18px rgba(240,140,0,.4);animation:empulse 1.6s infinite}
  @keyframes empulse{50%{box-shadow:0 6px 30px rgba(240,140,0,.7)}}
  .em-info{margin-top:12px;font-size:.98rem}
  .em-hist{margin-top:8px;font-size:.9rem}
  .em-sw{display:flex;justify-content:center}
  @media (max-width:720px){.sw-wrap,.em{grid-template-columns:1fr}}
  `;
  document.head.append(h('style', null, css));
})();
