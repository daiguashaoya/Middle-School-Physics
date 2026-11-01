/* 第3节：比较快慢、速度公式、单位换算、速度排行榜 */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;

  /* ================= 比较运动快慢：赛跑 ================= */
  PS.register('compare-race', function (el) {
    const RUN = [
      { name: '甲', v: 5, color: '#4c6ef5' },
      { name: '乙', v: 6.5, color: '#f08c00' },
      { name: '丙', v: 8, color: '#2b8a3e' },
    ];
    const st = { mode: 'time', t: 0, playing: false, done: false, finish: [null, null, null] };
    const TFIX = 10, LEN = 100, TSCALE = 2;
    const S = PS.stage(el, { ratio: '1000 / 380', draw: paint });
    const res = h('div', { class: 'readouts' });
    const desc = h('div', { class: 'tip small' });
    const tableBox = h('div');
    const loop = PS.loop((dt) => {
      st.t += dt * TSCALE;
      if (st.mode === 'time' && st.t >= TFIX) { st.t = TFIX; finish(); }
      if (st.mode === 'dist') {
        RUN.forEach((r, i) => { if (st.finish[i] == null && r.v * st.t >= LEN) { st.finish[i] = LEN / r.v; PS.sound.tick(); } });
        if (st.finish.every((f) => f != null)) finish();
      }
      S.render();
    }, S.stage);
    function finish() { loop.stop(); st.playing = false; st.done = true; showRes(); PS.sound.ping(); }

    function paint(ctx, w, hh) {
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, w, hh);
      const x0 = 70, x1 = w - 40;
      const mpp = (x1 - x0) / LEN;
      const laneH = (hh - 70) / 3;
      // 跑道
      for (let i = 0; i < 3; i++) {
        const y = 30 + i * laneH;
        ctx.fillStyle = i % 2 ? '#e8590c' : '#f76707';
        ctx.globalAlpha = 0.85;
        ctx.fillRect(x0 - 40, y, x1 - x0 + 60, laneH - 4);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x0 - 40, y + laneH - 4); ctx.lineTo(x1 + 20, y + laneH - 4); ctx.stroke();
      }
      // 距离刻度
      ctx.font = PS.font(11, 600); ctx.fillStyle = '#495057'; ctx.textAlign = 'center';
      for (let m = 0; m <= LEN; m += 10) {
        const x = x0 + m * mpp;
        ctx.fillText(m + ' m', x, hh - 22);
        ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, 30); ctx.lineTo(x, 30 + 3 * laneH - 4); ctx.stroke();
      }
      // 起点/终点
      ctx.fillStyle = '#fff'; ctx.fillRect(x0 - 2, 30, 4, 3 * laneH - 4);
      if (st.mode === 'dist') {
        for (let k = 0; k < 12; k++) {
          ctx.fillStyle = k % 2 ? '#fff' : '#212529';
          ctx.fillRect(x1 - 4, 30 + (k * (3 * laneH - 4)) / 12, 8, (3 * laneH - 4) / 12);
        }
      }
      // 运动员
      RUN.forEach((r, i) => {
        const tt = st.mode === 'dist' && st.finish[i] != null ? st.finish[i] : st.t;
        const s = Math.min(r.v * tt, st.mode === 'dist' ? LEN : 1e9);
        const x = x0 + s * mpp;
        const y = 30 + i * laneH + laneH / 2 - 2;
        // 轨迹
        ctx.strokeStyle = r.color; ctx.lineWidth = 3; ctx.globalAlpha = 0.35;
        ctx.beginPath(); ctx.moveTo(x0, y + laneH * 0.28); ctx.lineTo(x, y + laneH * 0.28); ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(-1, 1);
        const bob = st.playing ? Math.sin(st.t * 10 + i) * 2 : 0;
        ctx.font = Math.round(laneH * 0.62) + 'px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🏃', 0, bob);
        ctx.restore();
        ctx.fillStyle = r.color;
        ctx.beginPath(); ctx.arc(x0 - 22, y, 13, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = PS.font(14, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(r.name, x0 - 22, y + 1);
        if (st.done && st.mode === 'time') D.text(ctx, s.toFixed(0) + ' m', x + 26, y, { size: 14, weight: 800, color: '#fff', baseline: 'middle', bg: r.color });
        if (st.mode === 'dist' && st.finish[i] != null) D.text(ctx, st.finish[i].toFixed(1) + ' s', x1 - 40, y, { size: 14, weight: 800, color: '#fff', baseline: 'middle', align: 'right', bg: r.color });
      });
      D.text(ctx, '⏱ ' + st.t.toFixed(1) + ' s', w - 16, 20, { align: 'right', size: 15, weight: 800, color: '#1b2333', bg: 'rgba(255,255,255,.9)' });
    }
    function showRes() {
      res.innerHTML = '';
      if (st.mode === 'time') {
        RUN.forEach((r) => res.append(PS.ui.readout(r.name + ' 在 ' + TFIX + ' s 内跑了', (r.v * TFIX).toFixed(0) + ' m').el));
        res.append(PS.ui.readout('结论', '丙最快：相同时间，路程越长越快', 'green').el);
      } else {
        RUN.forEach((r, i) => res.append(PS.ui.readout(r.name + ' 跑完 100 m 用时', st.finish[i].toFixed(1) + ' s').el));
        res.append(PS.ui.readout('结论', '丙最快：相同路程，用时越短越快', 'green').el);
      }
    }
    const DESC = {
      time: '<b>观众的方法——相同时间比路程：</b>比赛进行到 10 s 时“定格”，看谁跑在最前面。<b>相同时间内，通过的路程越长，运动越快。</b>',
      dist: '<b>裁判的方法——相同路程比时间：</b>都跑完 100 m，看谁用的时间最短。<b>通过相同的路程，用时越短，运动越快。</b>',
      table: '<b>路程和时间都不同时怎么比？</b>算出每个物体<b>单位时间内通过的路程</b>（路程 ÷ 时间），这个值越大运动越快。这就是“速度”。',
    };
    function buildTable() {
      const data = [
        { n: 'A. 自行车', s0: 0, t: 20, s1: 100 },
        { n: 'B. 自行车', s0: 0, t: 10, s1: 100 },
        { n: 'C. 火车', s0: 500, t: 30, s1: 1250 },
        { n: 'D. 飞机', s0: 500, t: 10, s1: 2500 },
      ];
      const tbody = h('tbody');
      const bars = h('div', { class: 'cr-bars' });
      data.forEach((d) => {
        const v = (d.s1 - d.s0) / d.t;
        const cell = h('td', { class: 'cr-v' }, h('button', { type: 'button', class: 'btn btn-sm', onclick: (e) => { e.target.closest('td').innerHTML = '<b class="hl">' + (d.s1 - d.s0) + ' m ÷ ' + d.t + ' s = ' + v + ' m/s</b>'; } }, '算一算'));
        tbody.append(h('tr', null, h('td', { class: 'l' }, d.n), h('td', null, d.s0), h('td', null, d.t), h('td', null, d.s1), cell));
      });
      const showAll = PS.ui.button('全部算出并排序', () => {
        tbody.querySelectorAll('.cr-v').forEach((td, i) => { const d = data[i]; const v = (d.s1 - d.s0) / d.t; td.innerHTML = '<b class="hl">' + (d.s1 - d.s0) + ' m ÷ ' + d.t + ' s = ' + v + ' m/s</b>'; });
        bars.innerHTML = '';
        const max = 200;
        data.slice().sort((a, b) => (b.s1 - b.s0) / b.t - (a.s1 - a.s0) / a.t).forEach((d) => {
          const v = (d.s1 - d.s0) / d.t;
          bars.append(h('div', { class: 'cr-bar' }, h('span', null, d.n), h('i', { style: { width: Math.max(2, (v / max) * 100) + '%' } }), h('b', null, v + ' m/s')));
        });
      }, 'btn btn-primary btn-sm');
      tableBox.append(
        h('div', { class: 'table-wrap' }, h('table', { class: 't' },
          h('thead', null, h('tr', null, h('th', { class: 'l' }, '物体'), h('th', null, '初始位置/m'), h('th', null, '经过时间/s'), h('th', null, '末了位置/m'), h('th', null, '每秒通过的路程'))),
          tbody)),
        PS.ui.row(showAll), bars);
    }
    function setMode(m) {
      st.mode = m; st.t = 0; st.done = false; st.playing = false; st.finish = [null, null, null];
      loop.stop();
      desc.innerHTML = DESC[m];
      res.innerHTML = '';
      S.stage.style.display = m === 'table' ? 'none' : '';
      ctl.style.display = m === 'table' ? 'none' : '';
      tableBox.style.display = m === 'table' ? '' : 'none';
      S.render();
    }
    const modeSeg = PS.ui.seg([{ value: 'time', label: '相同时间比路程' }, { value: 'dist', label: '相同路程比时间' }, { value: 'table', label: '都不同怎么比？' }], 'time', setMode);
    const ctl = PS.ui.row(
      PS.ui.button('▶ 开始比赛', () => { setMode(st.mode); st.playing = true; loop.start(); PS.sound.beep(880, 0.15); }, 'btn btn-primary'),
      h('span', { class: 'kbd-hint' }, '甲、乙、丙三人的速度分别为 5 m/s、6.5 m/s、8 m/s（动画以 2 倍速播放）')
    );
    el.prepend(PS.ui.row(modeSeg.el));
    el.querySelector('.controls').classList.add('top');
    el.append(ctl, res, tableBox, desc);
    buildTable();
    setMode('time');
    document.head.append(h('style', null, `.cr-bars{margin-top:10px;display:flex;flex-direction:column;gap:6px}.cr-bar{display:grid;grid-template-columns:90px 1fr 80px;align-items:center;gap:8px;font-size:.9rem}.cr-bar i{display:block;height:16px;border-radius:8px;background:linear-gradient(90deg,#748ffc,#3b5bdb);animation:crgrow .6s}.cr-bar b{color:var(--primary)}@keyframes crgrow{from{width:0}}`));
  });

  /* ================= 速度公式三角形 + 计算器 ================= */
  const LEN_U = { m: 1, km: 1000 };
  const T_U = { s: 1, min: 60, h: 3600 };
  const V_U = { 'm/s': 1, 'km/h': 1 / 3.6 };
  PS.register('speed-calc', function (el) {
    let unknown = 'v';
    const tri = h('div', { class: 'sc-tri', html: `
      <svg viewBox="0 0 220 190" width="220" height="190">
        <path d="M110 8 L212 182 L8 182 Z" fill="#e8edff" stroke="#3b5bdb" stroke-width="3" stroke-linejoin="round"/>
        <line x1="52" y1="112" x2="168" y2="112" stroke="#3b5bdb" stroke-width="3"/>
        <line x1="110" y1="112" x2="110" y2="182" stroke="#3b5bdb" stroke-width="3"/>
        <g class="sc-k" data-k="s"><circle cx="110" cy="72" r="26" fill="transparent"/><text x="110" y="84" text-anchor="middle" font-size="36" font-style="italic" font-family="Times New Roman" font-weight="700">s</text></g>
        <g class="sc-k" data-k="v"><circle cx="66" cy="150" r="26" fill="transparent"/><text x="66" y="162" text-anchor="middle" font-size="36" font-style="italic" font-family="Times New Roman" font-weight="700">v</text></g>
        <g class="sc-k" data-k="t"><circle cx="154" cy="150" r="26" fill="transparent"/><text x="154" y="162" text-anchor="middle" font-size="36" font-style="italic" font-family="Times New Roman" font-weight="700">t</text></g>
        <text x="110" y="153" text-anchor="middle" font-size="22" fill="#3b5bdb">×</text>
      </svg>` });
    const formula = h('div', { class: 'sc-formula' });
    const F = {
      v: '<span class="var">v</span> = <span class="frac"><span class="var">s</span><span class="var">t</span></span>',
      s: '<span class="var">s</span> = <span class="var">v</span><span class="var">t</span>',
      t: '<span class="var">t</span> = <span class="frac"><span class="var">s</span><span class="var">v</span></span>',
    };
    const NAMES = { v: '速度', s: '路程', t: '时间' };
    const sel = (opts, def) => h('select', null, Object.keys(opts).map((k) => h('option', { value: k, selected: k === def ? true : null }, k)));
    const inS = h('input', { type: 'text', class: 'num', value: '1800', inputmode: 'decimal' });
    const uS = sel(LEN_U, 'm');
    const inT = h('input', { type: 'text', class: 'num', value: '10', inputmode: 'decimal' });
    const uT = sel(T_U, 'min');
    const inV = h('input', { type: 'text', class: 'num', value: '3', inputmode: 'decimal' });
    const uV = sel(V_U, 'm/s');
    const rows = {
      s: h('div', { class: 'sc-row' }, h('label', null, '路程 s ='), inS, uS),
      t: h('div', { class: 'sc-row' }, h('label', null, '时间 t ='), inT, uT),
      v: h('div', { class: 'sc-row' }, h('label', null, '速度 v ='), inV, uV),
    };
    const out = h('div', { class: 'sc-out' });
    function setUnknown(k) {
      unknown = k;
      tri.querySelectorAll('.sc-k').forEach((g) => g.classList.toggle('on', g.dataset.k === k));
      formula.innerHTML = '求' + NAMES[k] + '：' + F[k];
      Object.keys(rows).forEach((r) => { rows[r].classList.toggle('unknown', r === k); rows[r].querySelector('input').disabled = r === k; });
      calc();
    }
    function calc() {
      const s = parseFloat(inS.value) * LEN_U[uS.value];
      const t = parseFloat(inT.value) * T_U[uT.value];
      const v = parseFloat(inV.value) * V_U[uV.value];
      let html = '';
      const cs = uS.value !== 'm' ? inS.value + ' ' + uS.value + ' = ' + PS.pretty(s, 6) + ' m' : '';
      const ct = uT.value !== 's' ? inT.value + ' ' + uT.value + ' = ' + PS.pretty(t, 6) + ' s' : '';
      const cv = uV.value !== 'm/s' ? inV.value + ' km/h = ' + PS.pretty(v, 6) + ' m/s' : '';
      if (unknown === 'v') {
        if (!(s >= 0) || !(t > 0)) { out.innerHTML = '请输入有效的路程和时间'; return; }
        const r = s / t;
        html = (cs || ct ? '<div class="muted">统一单位：' + [cs, ct].filter(Boolean).join('，') + '</div>' : '') +
          '<span class="var">v</span> = <span class="frac"><span class="var">s</span><span class="var">t</span></span> = <span class="frac"><span>' + PS.pretty(s, 6) + ' m</span><span>' + PS.pretty(t, 6) + ' s</span></span> = <b>' + PS.pretty(r, 4) + ' m/s</b>' +
          ' <span class="muted">= ' + PS.pretty(r * 3.6, 4) + ' km/h</span>';
        inV.value = PS.round(uV.value === 'm/s' ? r : r * 3.6, 4);
      } else if (unknown === 's') {
        if (!(v >= 0) || !(t >= 0)) { out.innerHTML = '请输入有效的速度和时间'; return; }
        const r = v * t;
        html = (cv || ct ? '<div class="muted">统一单位：' + [cv, ct].filter(Boolean).join('，') + '</div>' : '') +
          '<span class="var">s</span> = <span class="var">v</span><span class="var">t</span> = ' + PS.pretty(v, 6) + ' m/s × ' + PS.pretty(t, 6) + ' s = <b>' + PS.pretty(r, 5) + ' m</b>' +
          (r >= 1000 ? ' <span class="muted">= ' + PS.pretty(r / 1000, 5) + ' km</span>' : '');
        inS.value = PS.round(r / LEN_U[uS.value], 4);
      } else {
        if (!(s >= 0) || !(v > 0)) { out.innerHTML = '请输入有效的路程和速度'; return; }
        const r = s / v;
        html = (cs || cv ? '<div class="muted">统一单位：' + [cs, cv].filter(Boolean).join('，') + '</div>' : '') +
          '<span class="var">t</span> = <span class="frac"><span class="var">s</span><span class="var">v</span></span> = <span class="frac"><span>' + PS.pretty(s, 6) + ' m</span><span>' + PS.pretty(v, 6) + ' m/s</span></span> = <b>' + PS.pretty(r, 5) + ' s</b>' +
          (r >= 60 ? ' <span class="muted">= ' + PS.pretty(r / 60, 4) + ' min</span>' : '');
        inT.value = PS.round(r / T_U[uT.value], 4);
      }
      out.innerHTML = html;
    }
    tri.addEventListener('click', (e) => { const g = e.target.closest('.sc-k'); if (g) setUnknown(g.dataset.k); });
    [inS, inT, inV, uS, uT, uV].forEach((x) => x.addEventListener('input', calc));
    el.append(h('div', { class: 'sc' },
      h('div', { class: 'sc-left' }, tri, h('div', { class: 'kbd-hint center' }, '点击三角形中的字母，<br>遮住谁就求谁')),
      h('div', { class: 'sc-right' }, formula, rows.s, rows.t, rows.v, out,
        h('div', { class: 'tip tip-warn small' }, '计算前要<b>统一单位</b>：路程用 m、时间用 s，速度就是 m/s；路程用 km、时间用 h，速度就是 km/h。'))));
    setUnknown('v');
    document.head.append(h('style', null, `
      .sc{display:grid;grid-template-columns:240px 1fr;gap:20px;align-items:start}
      .sc-tri svg{display:block;margin:0 auto}
      .sc-k{cursor:pointer}
      .sc-k text{fill:#1b2333;transition:fill .2s}
      .sc-k:hover text{fill:#3b5bdb}
      .sc-k.on circle{fill:#f08c00}
      .sc-k.on text{fill:#fff}
      .sc-formula{font-size:1.3rem;font-weight:700;margin-bottom:10px}
      .sc-row{display:flex;align-items:center;gap:8px;margin:6px 0}
      .sc-row label{width:76px;font-weight:600}
      .sc-row.unknown input{background:var(--accent-soft);border-color:var(--accent);font-weight:800;color:#a35a00}
      .sc-out{margin-top:10px;font-size:1.1rem;background:var(--surface-2);border:1px dashed var(--line-2);border-radius:10px;padding:10px 14px;min-height:54px}
      .sc-out b{color:var(--green)}
      @media (max-width:720px){.sc{grid-template-columns:1fr}}
    `));
  });

  /* ================= m/s 与 km/h 换算 ================= */
  PS.register('speed-convert', function (el) {
    const inp = h('input', { type: 'text', class: 'num', value: '20', inputmode: 'decimal' });
    const dir = PS.ui.seg([{ value: 'ms', label: 'm/s → km/h' }, { value: 'kmh', label: 'km/h → m/s' }], 'ms', upd);
    const out = h('div', { class: 'sc-out' });
    function upd() {
      const v = parseFloat(inp.value);
      if (isNaN(v)) { out.textContent = '请输入数值'; return; }
      out.innerHTML = dir.value === 'ms'
        ? v + ' m/s = ' + v + ' × 3.6 km/h = <b>' + PS.pretty(v * 3.6, 6) + ' km/h</b>'
        : v + ' km/h = ' + v + ' × <span class="frac"><span>1</span><span>3.6</span></span> m/s = <b>' + PS.pretty(v / 3.6, 4) + ' m/s</b>';
    }
    inp.addEventListener('input', upd);
    // 挑战
    const q = h('b', { class: 'ul-q' });
    const a = h('input', { type: 'text', class: 'num', inputmode: 'decimal', placeholder: '答案' });
    const fb = h('span', { class: 'q-fb' });
    let ans = 0, unit = '';
    function newQ() {
      if (Math.random() < 0.5) { const v = PS.pick([5, 10, 15, 20, 25, 30, 40]); ans = v * 3.6; unit = 'km/h'; q.innerHTML = v + ' m/s = ? km/h'; }
      else { const v = PS.pick([18, 36, 54, 72, 90, 108, 120, 360]); ans = v / 3.6; unit = 'm/s'; q.innerHTML = v + ' km/h = ? m/s'; }
      a.value = ''; a.className = 'num'; fb.textContent = '';
    }
    function check() {
      const v = parseFloat(a.value);
      const ok = !isNaN(v) && Math.abs(v - ans) < (Number.isInteger(PS.round(ans, 6)) ? 1e-6 : 0.051);
      a.className = 'num ' + (ok ? 'ok' : 'bad');
      fb.className = 'q-fb ' + (ok ? 'ok' : 'bad');
      fb.innerHTML = ok ? '✔ 正确' : '✘ 应为 ' + PS.pretty(ans, 4) + ' ' + unit;
      ok ? PS.sound.good() : PS.sound.bad();
    }
    a.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    el.append(PS.ui.row(inp, dir.el), out,
      h('div', { class: 'ul-challenge' }, h('b', null, '🎯 换算挑战：'), q, a, PS.ui.button('检查', check, 'btn btn-sm btn-primary'), PS.ui.button('换一题', newQ, 'btn btn-sm'), fb));
    upd(); newQ();
  });

  /* ================= 速度排行榜 ================= */
  PS.register('speed-ranking', function (el) {
    const DATA = [
      { n: '蜗牛爬行', i: '🐌', v: 0.0015 },
      { n: '人步行', i: '🚶', v: 1.1 },
      { n: '骑自行车', i: '🚲', v: 5 },
      { n: '百米赛跑运动员', i: '🏃', v: 10 },
      { n: '猎豹奔跑', i: '🐆', v: 30 },
      { n: '高速公路上的小汽车', i: '🚗', v: 33 },
      { n: '高铁列车（350 km/h）', i: '🚄', v: 350 / 3.6 },
      { n: '民航客机', i: '✈️', v: 250 },
      { n: '声音（15 ℃ 空气中）', i: '🔊', v: 340 },
      { n: '人造地球卫星', i: '🛰️', v: 7900 },
      { n: '光（真空中）', i: '💡', v: 3e8 },
    ];
    let unit = 'ms';
    const list = h('div', { class: 'sr-list' });
    function render() {
      list.innerHTML = '';
      const lo = Math.log10(0.001), hi = Math.log10(3e8);
      DATA.forEach((d, k) => {
        const p = ((Math.log10(d.v) - lo) / (hi - lo)) * 100;
        const val = unit === 'ms' ? PS.pretty(d.v, 3) + ' m/s' : PS.pretty(d.v * 3.6, 3) + ' km/h';
        list.append(h('div', { class: 'sr-row' },
          h('span', { class: 'sr-i' }, d.i), h('span', { class: 'sr-n' }, d.n),
          h('div', { class: 'sr-track' }, h('i', { style: { width: Math.max(1.5, p) + '%', animationDelay: k * 0.05 + 's' } })),
          h('b', { class: 'sr-v', html: '约 ' + val })));
      });
    }
    const seg = PS.ui.seg([{ value: 'ms', label: 'm/s' }, { value: 'kmh', label: 'km/h' }], 'ms', (v) => { unit = v; render(); });
    el.append(PS.ui.row(h('span', null, '单位：'), seg.el, h('span', { class: 'kbd-hint' }, '横条长度按“数量级”（对数刻度）画出，每多一格表示快很多倍。')), list);
    render();
    document.head.append(h('style', null, `
      .sr-list{display:flex;flex-direction:column;gap:6px;margin-top:12px}
      .sr-row{display:grid;grid-template-columns:30px 170px 1fr 150px;align-items:center;gap:10px;font-size:.93rem}
      .sr-i{font-size:1.3rem;text-align:center}
      .sr-track{height:14px;background:var(--surface-2);border-radius:7px;overflow:hidden;border:1px solid var(--line)}
      .sr-track i{display:block;height:100%;border-radius:7px;background:linear-gradient(90deg,#63e6be,#4dabf7,#7048e8);animation:crgrow .8s backwards}
      .sr-v{font-variant-numeric:tabular-nums;color:var(--ink-2)}
      @keyframes crgrow{from{width:0}}
      @media (max-width:720px){.sr-row{grid-template-columns:26px 1fr 110px}.sr-track{grid-column:1/-1;order:5}}
    `));
  });
})();
