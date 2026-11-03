/* 第13章第3节：比热容——用煤气灶烧水、比热容表、沿海与内陆的气温、与水的比热容有关吗、热量计算器、热平衡与测量金属的比热容。依赖 heat.js、energy.js、thermal.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, TH = PS.th, TC = PS.TC, EN = PS.en, CAP = PS.CAP;
  const TAU = Math.PI * 2;

  /** 煤气灶的火焰（侧视）：中心 x，炉面 y，宽 w */
  function stove(ctx, x, y, w, on, t) {
    ctx.save();
    ctx.fillStyle = '#343a40'; D.roundRect(ctx, x - w / 2 - 30, y, w + 60, 46, 8); ctx.fill();
    ctx.fillStyle = '#495057'; ctx.fillRect(x - w / 2 - 10, y - 8, w + 20, 8);
    ctx.fillStyle = '#868e96'; [-1, 1].forEach((k) => ctx.fillRect(x + k * (w / 2 + 2) - 4, y - 34, 8, 30));
    if (on) for (let i = 0; i < 9; i++) {
      const fx = x - w * 0.4 + (i * w * 0.8) / 8, fh = 22 + 6 * Math.sin(t * 15 + i * 2);
      ctx.fillStyle = 'rgba(77,121,255,.75)'; ctx.beginPath(); ctx.moveTo(fx - 6, y - 8); ctx.quadraticCurveTo(fx, y - 8 - fh * 1.3, fx + 6, y - 8); ctx.fill();
      ctx.fillStyle = 'rgba(160,200,255,.9)'; ctx.beginPath(); ctx.moveTo(fx - 3, y - 8); ctx.quadraticCurveTo(fx, y - 8 - fh * 0.6, fx + 3, y - 8); ctx.fill();
    }
    ctx.restore();
  }

  /* ================= 用煤气灶烧水 ================= */
  PS.register('kettle', function (el) {
    const VW = 1000, P = 1500, SPEED = 40, T0 = 20; // 有效加热功率 1.5 kW，时间加快 40 倍
    const st = { m: 2, target: 100, T: T0, t: 0, on: false, rows: [] };
    const mSeg = PS.ui.seg([{ value: 2, label: '一壶水（2 kg）' }, { value: 1, label: '半壶水（1 kg）' }], st.m, (v) => { st.m = v; reset(); });
    const tSeg = PS.ui.seg([{ value: 40, label: '烧温（到 40 ℃）' }, { value: 100, label: '烧开（到 100 ℃）' }], st.target, (v) => { st.target = v; reset(); });
    el.append(PS.ui.row(mSeg.el, tSeg.el));
    const S = EN.stage(el, { VW, vh: (w) => (EN.narrow(w) ? 640 : 420), draw });
    const goB = PS.ui.button('🔥 点火加热', () => { if (st.T >= st.target - 1e-6) reset(); st.on = true; tell(); }, 'btn btn-primary btn-sm');
    const tbody = h('tbody'), msg = h('div', { class: 'th-msg info' });
    el.append(PS.ui.row(goB, PS.ui.button('换一壶冷水', reset, 'btn btn-ghost btn-sm'), PS.ui.button('清空记录', () => { st.rows = []; table(); }, 'btn btn-ghost btn-sm')), msg,
      h('div', { class: 'table-wrap', style: { marginTop: '8px' } }, h('table', { class: 't' }, h('thead', null, h('tr', null, ['水的质量', '初温', '末温', '升高的温度', '加热时间'].map((t) => h('th', null, t)))), tbody)));
    function reset() { st.T = T0; st.t = 0; st.on = false; tell(); }
    const fmtTime = (s) => Math.floor(s / 60) + ' min ' + String(Math.round(s % 60)).padStart(2, '0') + ' s';
    function table() {
      tbody.innerHTML = '';
      st.rows.forEach((r) => tbody.append(h('tr', null, h('td', null, r.m + ' kg'), h('td', null, T0 + ' ℃'), h('td', null, r.T + ' ℃'), h('td', null, (r.T - T0) + ' ℃'), h('td', null, h('b', null, fmtTime(r.t))))));
      if (!st.rows.length) tbody.append(h('tr', null, h('td', { colspan: 5, class: 'muted' }, '烧好一壶水后自动记录')));
      tell();
    }
    function tell() {
      const R = st.rows, has = (m, T) => R.some((r) => r.m === m && r.T === T);
      let s;
      if (st.on) s = '加热中……同一个煤气灶，火力不变，<b>加热的时间越长，水吸收的热量越多</b>。';
      else if (st.T >= st.target - 1e-6) s = (st.m === 2 ? '一壶' : '半壶') + '水从 20 ℃ ' + (st.target === 100 ? '烧开' : '烧到 40 ℃') + '，用了 ' + fmtTime(st.t) + '。换一种水量或目标温度再试试。';
      else s = '选择水量和要烧到的温度，点“点火加热”。';
      const a = has(2, 40) && has(2, 100), b = has(2, 100) && has(1, 100) || has(2, 40) && has(1, 40);
      if (a) s += '<br>✔ 同样一壶水，<b>烧开比烧温用的时间长</b>：质量相同时，<b>升高的温度越多，吸收的热量越多</b>。';
      if (b) s += '<br>✔ 升高相同的温度，<b>一壶水比半壶水用的时间长</b>：升高的温度相同时，<b>质量越大，吸收的热量越多</b>。';
      if (a && b) s += '<br><b>同种物质吸收热量的多少，跟它的质量和升高的温度有关。</b>那么不同的物质呢？';
      msg.className = 'th-msg ' + (a || b ? 'ok' : 'info'); msg.innerHTML = s;
    }
    PS.loop((dt) => {
      if (st.on) {
        st.t += dt * SPEED;
        st.T += (P * dt * SPEED) / (4200 * st.m);
        if (st.T >= st.target) {
          st.T = st.target; st.on = false; PS.sound.ping();
          st.rows = st.rows.filter((r) => !(r.m === st.m && r.T === st.target));
          st.rows.push({ m: st.m, T: st.target, t: st.t }); table();
        }
        if (Math.floor(st.t / 10) !== st.k) { st.k = Math.floor(st.t / 10); if (st.on) tell(); }
      }
      S.render();
    }, el).start();
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, VW, VH), nar = EN.narrow(w), t = performance.now() / 1000;
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const cx = nar ? 330 : 300, sy = VH - 70;
      stove(ctx, cx, sy, 200, st.on, t);
      // 水壶（剖面）
      const kw = 280, kh = 190, ky = sy - 36, l = cx - kw / 2;
      ctx.save();
      ctx.beginPath(); ctx.moveTo(l, ky); ctx.lineTo(l + 20, ky - kh); ctx.lineTo(l + kw - 20, ky - kh); ctx.lineTo(l + kw, ky); ctx.closePath();
      ctx.fillStyle = '#e9ecef'; ctx.fill(); ctx.save(); ctx.clip();
      const lv = st.m === 2 ? 0.78 : 0.42, wy = ky - kh * lv;
      ctx.fillStyle = PS.mixColor('#a5d8ff', '#ffc9b9', (st.T - 20) / 80 * 0.8); ctx.fillRect(l, wy, kw, ky - wy);
      if (st.T > 85) for (let i = 0; i < 14; i++) { const p = (t * 0.8 + i / 14) % 1; ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(l + 30 + ((i * 53) % (kw - 60)), ky - p * (ky - wy), 4 + p * 4, 0, TAU); ctx.fill(); }
      ctx.restore();
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 5; ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 10; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(l + kw - 14, ky - kh * 0.55); ctx.lineTo(l + kw + 70, ky - kh - 20); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, ky - kh - 10, 70, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      if (st.T >= 99.9) for (let i = 0; i < 5; i++) { const p = (t * 0.5 + i / 5) % 1; ctx.fillStyle = 'rgba(206,212,218,' + (0.6 * (1 - p)) + ')'; ctx.beginPath(); ctx.arc(l + kw + 74 + p * 40, ky - kh - 30 - p * 90, 10 + p * 20, 0, TAU); ctx.fill(); }
      D.text(ctx, st.m === 2 ? '一壶水 2 kg' : '半壶水 1 kg', cx, ky - kh - 90, { size: F(15), weight: 800, align: 'center', color: '#1c7ed6' });
      // 读数
      const rx = nar ? 800 : 720;
      TH.dthermo(ctx, rx, 110, st.T, { F, fs: 20, label: '水温', d: 0 });
      EN.stopwatch(ctx, rx, nar ? 330 : 270, st.t, { F, r: nar ? 80 : 64, fs: 16, label: '加热时间' });
    }
    table();
  });

  /* ================= 比热容表 ================= */
  PS.register('c-table', function (el) {
    const VW = 1000, K = PS.CAP_ORDER;
    const st = { mode: 'c', on: 'water', hl: null };
    const seg = PS.ui.seg([{ value: 'c', label: '比热容 c' }, { value: 'dt', label: '1 kg 吸收 4.2×10³ J 后升高的温度' }], st.mode, (v) => { st.mode = v; tell(); });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el));
    const S = EN.stage(el, { VW, vh: (w) => (EN.narrow(w) ? 1080 : 560), draw });
    const msg = h('div', { class: 'th-msg info' });
    const FIND = [
      ['水的比热容最大', ['water'], '在常见的物质中，<b>水的比热容最大</b>：质量相同时，水吸收（或放出）同样多的热量，温度变化最小。'],
      ['冰和水不同', ['water', 'ice'], '水和冰是同种物质，状态不同，比热容不同：<b>比热容与物质的状态有关</b>。'],
      ['冰和煤油相同', ['ice', 'kerosene'], '冰和煤油是不同的物质，比热容却相同：<b>个别不同物质的比热容相同</b>，不能仅凭比热容鉴别物质。'],
      ['液体一般比固体大', ['water', 'alcohol', 'kerosene', 'oil', 'castor', 'hg'], '一般情况下，<b>液体的比热容比固体大</b>，但水银是例外（比热容很小）。'],
    ];
    const chips = h('div', { class: 'th-chips' }, h('span', { class: 'small muted' }, '从表中你能发现：'), FIND.map((f, i) => PS.ui.button(f[0], () => { st.hl = i; st.on = null; chips.querySelectorAll('.btn').forEach((b, j) => b.classList.toggle('on', j === i)); tell(); }, 'btn btn-sm')));
    el.append(chips, msg);
    const rowH = (w) => (EN.narrow(w) ? 82 : 40);
    const top = (w) => EN.fs(w, 14) * 1.6 + 18;
    PS.drag(S, { VW, get VH() { return S.VH; }, hit: (p) => { const w = S.w || 1000, i = Math.floor((p.y - top(w)) / rowH(w)); return i >= 0 && i < K.length ? i : null; }, start: (i) => { st.on = K[i]; st.hl = null; chips.querySelectorAll('.btn').forEach((b) => b.classList.remove('on')); PS.sound.tick(); tell(); }, move() {} });
    function tell() {
      if (st.hl != null) msg.innerHTML = FIND[st.hl][2];
      else {
        const k = st.on, q = CAP[k], c = q.c, n = q.n.replace('、钢', '');
        msg.innerHTML = '<b>' + q.n + '</b>：c = ' + (q.approx ? '约 ' : '') + TH.c3(c) + ' J/(kg·℃)，表示 <b>1 kg 的' + n + '温度升高（或降低）1 ℃ 时吸收（或放出）的热量是 ' + TH.c3(c) + ' J</b>。<br>1 kg 的' + n + '吸收 4.2×10³ J 的热量，温度升高 ' + PS.fmt(4200 / c, 2).replace(/\.?0+$/, '') + ' ℃' + (k === 'water' ? '——水的温度最难改变。' : '。');
      }
      msg.className = 'th-msg ' + (st.hl != null ? 'ok' : 'info');
      S.render();
    }
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, VW, VH), nar = EN.narrow(w), rh = rowH(w), y0 = top(w);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const nx = nar ? 250 : 150, x0 = nar ? 260 : 160, x1 = nar ? 760 : 820;
      const val = (k) => (st.mode === 'c' ? CAP[k].c : 4200 / CAP[k].c), max = st.mode === 'c' ? 4400 : 31;
      D.text(ctx, st.mode === 'c' ? '比热容 c / [J/(kg·℃)]' : '1 kg 的物质吸收 4.2×10³ J 的热量后升高的温度 / ℃', 20, F(14) + 6, { size: F(14), weight: 800, color: '#343a40' });
      const hl = st.hl != null ? FIND[st.hl][1] : null;
      K.forEach((k, i) => {
        const q = CAP[k], y = y0 + i * rh, bh = rh * 0.62, v = val(k), on = hl ? hl.includes(k) : k === st.on;
        if (on) { ctx.fillStyle = '#fff3df'; ctx.fillRect(0, y, VW, rh); }
        D.text(ctx, q.n + (q.s === '液' ? '' : ''), nx, y + rh / 2 + F(14) * 0.35, { size: F(14), weight: on ? 800 : 600, align: 'right', color: '#343a40' });
        const bw = (v / max) * (x1 - x0);
        ctx.fillStyle = q.col; ctx.strokeStyle = on ? '#e8590c' : 'rgba(0,0,0,.15)'; ctx.lineWidth = on ? 3 : 1;
        D.roundRect(ctx, x0, y + (rh - bh) / 2, Math.max(4, bw), bh, 5); ctx.fill(); ctx.stroke();
        const txt = st.mode === 'c' ? (q.approx ? '约 ' : '') + TH.c3(q.c) : PS.fmt(v, 2).replace(/\.?0+$/, '') + ' ℃';
        D.text(ctx, txt, x0 + bw + 10, y + rh / 2 + F(13) * 0.35, { size: F(13), weight: 700, color: on ? '#e8590c' : '#495057' });
        D.text(ctx, q.s === '液' ? '液' : '固', 30, y + rh / 2 + F(12) * 0.35, { size: F(12), weight: 700, color: q.s === '液' ? '#1c7ed6' : '#868e96' });
      });
      D.text(ctx, '点击某一行查看它的意义', VW - 20, VH - 12, { size: F(12), color: '#868e96', align: 'right' });
    }
    tell();
  });

  /* ================= 沿海与内陆的气温 ================= */
  PS.register('sea-land', function (el) {
    const VW = 1000;
    // 地表温度：dT/dt = (日照 − (T − 18)) / C（C：热容的示意值，单位 h），连续计算几天取最后一天
    function day(C) {
      let T = 25; const out = [];
      for (let d = 0; d < 6; d++) for (let k = 0; k < 2400; k++) {
        const t = k / 100, S = t > 6 && t < 18 ? 20 * Math.sin((Math.PI * (t - 6)) / 12) : 0;
        T += ((S - (T - 18)) / C) * 0.01;
        if (d === 5 && k % 25 === 0) out.push(T);
      }
      return out; // 每 0.25 h 一个点
    }
    const SEA = day(30), LAND = day(3);
    const at = (arr, t) => { const x = (t % 24) * 4, i = Math.floor(x), f = x - i; return arr[i % 96] * (1 - f) + arr[(i + 1) % 96] * f; };
    const st = { t: 8, play: true };
    const S = EN.stage(el, { VW, vh: (w) => (EN.narrow(w) ? 900 : 560), draw });
    const sl = PS.ui.slider({ label: '时刻', min: 0, max: 24, step: 0.25, value: st.t, fmt: (v) => Math.floor(v) + ':' + String(Math.round((v % 1) * 60)).padStart(2, '0'), onInput: (v) => { st.t = v; st.play = false; playB.innerHTML = '▶ 播放'; tell(); } });
    sl.el.classList.add('wide');
    const playB = PS.ui.button('⏸ 暂停', () => { st.play = !st.play; playB.innerHTML = st.play ? '⏸ 暂停' : '▶ 播放'; }, 'btn btn-sm');
    const msg = h('div', { class: 'th-msg info' });
    el.append(PS.ui.row(sl.el, playB), msg);
    const mm = (a) => [Math.min(...a), Math.max(...a)];
    const [s0, s1] = mm(SEA), [l0, l1] = mm(LAND);
    function tell() {
      sl.set(st.t, true);
      const ts = at(SEA, st.t), tl = at(LAND, st.t), dayT = st.t > 6 && st.t < 18;
      let s = (dayT ? '白天，太阳照射，' : '夜晚，没有阳光，') + '海水和砂石' + (dayT ? '吸收' : '放出') + '热量。海水的比热容大，' + (dayT ? '吸热后温度升高得少' : '放热后温度降低得少') + '；砂石的比热容小，' + (dayT ? '温度升高得多' : '温度降低得多') + '。';
      s += tl > ts ? '现在陆地比海面热，陆地上的热空气上升，海面上的冷空气流过来——吹<b>海风</b>。' : '现在海面比陆地热，风从陆地吹向海面——吹<b>陆风</b>。';
      s += '<br>一天中，海边的气温变化约 ' + PS.fmt(s1 - s0, 0) + ' ℃，内陆（砂石）的气温变化约 ' + PS.fmt(l1 - l0, 0) + ' ℃：<b>沿海地区昼夜温差小，内陆（沙漠）地区昼夜温差大</b>。';
      msg.innerHTML = s;
    }
    let acc = 0;
    PS.loop((dt) => {
      if (st.play) { st.t = (st.t + dt * 1.2) % 24; acc += dt; if (acc > 0.3) { acc = 0; tell(); } }
      S.render();
    }, el).start();
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, VW, VH), nar = EN.narrow(w), tm = performance.now() / 1000;
      const dayT = st.t > 6 && st.t < 18, sh = nar ? 420 : 280, gy = sh * 0.72;
      const sun = PS.clamp(Math.sin((Math.PI * (st.t - 6)) / 12), -1, 1);
      // 天空
      const g = ctx.createLinearGradient(0, 0, 0, gy);
      g.addColorStop(0, PS.mixColor('#1b2a4e', '#74c0fc', PS.clamp(sun + 0.3, 0, 1))); g.addColorStop(1, PS.mixColor('#364fc7', '#d0ebff', PS.clamp(sun + 0.3, 0, 1)));
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, gy);
      // 太阳 / 月亮
      const a = ((st.t - 6) / 12) * Math.PI, ax = 500 - Math.cos(a) * 420, ay = gy - Math.sin(a) * (gy - 50);
      if (dayT) { ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(ax, ay, 30, 0, TAU); ctx.fill(); }
      else { const b = ((st.t + 6) % 24 / 12) * Math.PI; const mx = 500 - Math.cos(b) * 420, my = gy - Math.sin(b) * (gy - 50); if (my < gy) { ctx.fillStyle = '#f1f3f5'; ctx.beginPath(); ctx.arc(mx, my, 22, 0, TAU); ctx.fill(); ctx.fillStyle = PS.mixColor('#1b2a4e', '#364fc7', 0.4); ctx.beginPath(); ctx.arc(mx + 9, my - 6, 19, 0, TAU); ctx.fill(); } }
      // 海与陆
      const ts = at(SEA, st.t), tl = at(LAND, st.t);
      ctx.fillStyle = PS.mixColor('#1971c2', '#4dabf7', 0.5); ctx.fillRect(0, gy, 480, sh - gy);
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.beginPath(); for (let x = 0; x <= 480; x += 10) { const y = gy + 12 + i * 18 + Math.sin(x * 0.05 + tm * 2 + i) * 3; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
      ctx.fillStyle = '#e9c46a'; ctx.beginPath(); ctx.moveTo(480, sh); ctx.lineTo(480, gy); ctx.quadraticCurveTo(700, gy - 30, VW, gy - 10); ctx.lineTo(VW, sh); ctx.fill();
      D.text(ctx, '海面 ' + PS.fmtT(ts, 1), 240, sh - 16, { size: F(16), weight: 800, align: 'center', color: '#fff' });
      D.text(ctx, '砂石 ' + PS.fmtT(tl, 1), 760, sh - 16, { size: F(16), weight: 800, align: 'center', color: '#5c3d0e' });
      // 风
      const toLand = tl > ts, k = PS.clamp(Math.abs(tl - ts) / 6, 0.2, 1);
      ctx.save(); ctx.globalAlpha = 0.85;
      for (let i = 0; i < 3; i++) {
        const p = (tm * 0.4 * k + i / 3) % 1, x = toLand ? 300 + p * 400 : 700 - p * 400, y = gy - 40 - (i % 2) * 22;
        D.arrow(ctx, x - (toLand ? 50 : -50), y, x + (toLand ? 50 : -50), y, { color: '#fff', width: 4, head: 12 });
      }
      ctx.restore();
      D.text(ctx, toLand ? '海风（从海面吹向陆地）' : '陆风（从陆地吹向海面）', 500, gy - 90, { size: F(15), weight: 800, align: 'center', color: '#fff', bg: 'rgba(0,0,0,.25)' });
      D.text(ctx, Math.floor(st.t) + ':' + String(Math.round((st.t % 1) * 60)).padStart(2, '0'), 20, F(18) + 8, { size: F(18), weight: 800, color: '#fff' });
      // 图像
      const box = { x: 90, y: sh + F(14) * 1.6 + 24, w: 820, h: VH - sh - F(14) * 1.6 - 24 - F(12) * 2.8 - 14 };
      const ch = PS.tchart(ctx, box, { t0: 0, t1: 24, T0: 15, T1: 40, tStep: 2, TStep: 5, F, xl: '时刻/h', bg: '#fff', tLabelEvery: nar ? 3 : 1 });
      ch.line(SEA.map((v, i) => [i / 4, v]), '#1c7ed6', 3);
      ch.line(LAND.map((v, i) => [i / 4, v]), '#c98d3e', 3);
      ctx.strokeStyle = '#e8590c'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ch.X(st.t), box.y); ctx.lineTo(ch.X(st.t), box.y + box.h); ctx.stroke(); ctx.setLineDash([]);
      ch.dots([[st.t, ts]], '#1c7ed6', 6); ch.dots([[st.t, tl]], '#c98d3e', 6);
      D.text(ctx, '— 海面', box.x + box.w - 10, box.y + F(13) + 6, { size: F(13), weight: 800, color: '#1c7ed6', align: 'right' });
      D.text(ctx, '— 砂石（内陆）', box.x + box.w - 10, box.y + F(13) * 2.3 + 8, { size: F(13), weight: 800, color: '#c98d3e', align: 'right' });
    }
    tell();
  });

  /* ================= 与水的比热容大有关吗 ================= */
  PS.register('c-sort', function (el) {
    PS.sortCards(el, [
      ['汽车发动机用循环流动的水来冷却', 0, '水的比热容大，升高相同的温度能吸收更多的热量（作散热剂）。'],
      ['北方楼房的暖气用水做介质', 0, '水的比热容大，降低相同的温度能放出更多的热量。'],
      ['冬天用热水袋取暖', 0, '水的比热容大，放出热量时温度降低得慢，暖得久。'],
      ['傍晚向秧田里灌水，防止秧苗冻坏', 0, '夜间水放出热量，温度降低得少。'],
      ['沿海地区昼夜温差比内陆小', 0, '海水的比热容大，温度变化小。'],
      ['修建人工湖调节周围的气温', 0, '水的比热容大，能调节温度。'],
      ['夏天在地上洒水来降温', 1, '利用水蒸发吸热，与比热容无关。'],
      ['冬天在菜窖里放几桶水，防止菜冻坏', 1, '利用水凝固时放热。'],
      ['用冰块冷藏食物', 1, '利用冰熔化时吸热。'],
      ['冬天在汽车水箱里加防冻液', 1, '降低水的凝固点，防止结冰。'],
      ['发高烧时在额头上擦酒精降温', 1, '利用酒精蒸发吸热。'],
      ['生物体内水的比例很高，有助于调节自身的温度', 0, '水的比热容大，体温不易剧烈变化。'],
    ], ['与水的比热容大有关', '无关']);
  });

  /* ================= 热量计算器 Q = cmΔt ================= */
  PS.register('q-calc', function (el) {
    const st = { mode: 'Q', heat: 1 };
    const inp = (v, wd) => h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', autocomplete: 'off', value: v, style: { width: (wd || 90) + 'px' } });
    const sel = (opts, v) => { const s = h('select', { style: { padding: '3px 4px', borderRadius: '6px', border: '1px solid var(--line-2)' } }); opts.forEach(([k, t]) => s.append(h('option', { value: k, selected: k === v ? true : null }, t))); return s; };
    const sub = sel(PS.CAP_ORDER.map((k) => [k, CAP[k].n]).concat([['x', '其他']]), 'water');
    const I = { c: inp('4.2×10^3', 110), m: inp('2'), t0: inp('20', 70), t: inp('100', 70), Q: inp('6.72×10^5', 120) };
    const U = { m: sel([['kg', 'kg'], ['g', 'g']], 'kg'), Q: sel([['J', 'J'], ['kJ', 'kJ']], 'J') };
    sub.addEventListener('change', () => { if (sub.value !== 'x') I.c.value = TH.c3(CAP[sub.value].c).replace('×10³', '×10^3'); });
    I.c.addEventListener('input', () => { sub.value = 'x'; });
    const hSeg = PS.ui.seg([{ value: 1, label: '吸热（温度升高）' }, { value: -1, label: '放热（温度降低）' }], st.heat, (v) => { st.heat = v; });
    const row = (k, lab, ...kids) => h('div', { class: 'row', 'data-k': k }, h('b', { html: lab }), ...kids);
    const R = {
      c: row('c', '比热容 c =', sub, I.c, h('span', null, 'J/(kg·℃)')),
      m: row('m', '质量 m =', I.m, U.m),
      t0: row('t0', '初温 t₀ =', I.t0, h('span', null, '℃')),
      t: row('t', '末温 t =', I.t, h('span', null, '℃')),
      Q: row('Q', '热量 Q =', I.Q, U.Q),
      h: row('h', '', hSeg.el),
    };
    const out = h('div', { class: 'th-msg info' });
    const seg = PS.ui.seg([{ value: 'Q', label: '求热量 Q' }, { value: 'c', label: '求比热容 c' }, { value: 'm', label: '求质量 m' }, { value: 't', label: '求末温 t' }], st.mode, (v) => { st.mode = v; show(); });
    seg.el.style.flexWrap = 'wrap';
    const form = h('div', { class: 'en-calc' }, R.c, R.m, R.t0, R.t, R.Q, R.h, PS.ui.row(PS.ui.button('计算', calc, 'btn btn-primary btn-sm')));
    el.append(PS.ui.row(seg.el), h('div', { class: 'th-pair', style: { marginTop: '8px' } }, form, h('div', null, h('div', { class: 'formula', style: { margin: 0 } }, h('span', { class: 'big', html: 'Q = cmΔt' }), h('div', { class: 'small', html: '吸热：Q吸 = cm(t − t₀)<br>放热：Q放 = cm(t₀ − t)<br>c 的单位 J/(kg·℃)，m 的单位 kg' })))), out);
    const PRE = [
      { t: '烧开一壶水', mode: 'Q', sub: 'water', m: '2', mu: 'kg', t0: '20', tt: '100', note: '在 1 个标准大气压下把 2 kg、20 ℃ 的水烧开。' },
      { t: '金属小球放热', mode: 'c', sub: 'x', m: '100', mu: 'g', t0: '74', tt: '24', Q: '2.3×10^3', note: '教案跟进训练：100 g、74 ℃ 的金属球放出 2.3×10³ J 热量后降到 24 ℃。' },
      { t: '晒热的砂石', mode: 'Q', sub: 'sand', m: '50', mu: 'kg', t0: '20', tt: '45' },
      { t: '求水的质量', mode: 'm', sub: 'water', t0: '15', tt: '65', Q: '4.2×10^5' },
      { t: '求末温', mode: 't', sub: 'water', m: '5', mu: 'kg', t0: '20', Q: '8.4×10^5', heat: 1 },
    ];
    el.append(h('div', { class: 'small muted', style: { marginTop: '8px' } }, '例子：'), h('div', { class: 'th-chips' }, PRE.map((p) => PS.ui.button(p.t, () => {
      seg.set(p.mode, true); st.mode = p.mode; sub.value = p.sub;
      if (p.sub !== 'x') sub.dispatchEvent(new Event('change')); else I.c.value = '';
      if (p.m) { I.m.value = p.m; U.m.value = p.mu; }
      I.t0.value = p.t0; if (p.tt) I.t.value = p.tt; if (p.Q) { I.Q.value = p.Q; U.Q.value = 'J'; }
      if (p.heat) hSeg.set(p.heat);
      show(); calc(); if (p.note) out.innerHTML = '<span class="small muted">' + p.note + '</span><br>' + out.innerHTML;
    }, 'btn btn-sm'))));
    function show() {
      const hide = { Q: ['Q', 'h'], c: ['c', 'h'], m: ['m', 'h'], t: ['t'] }[st.mode];
      Object.keys(R).forEach((k) => (R[k].style.display = hide.includes(k) ? 'none' : ''));
      out.className = 'th-msg info'; out.innerHTML = '填好已知量，点“计算”。可以写成 4.2×10^3 这样的形式。';
    }
    const v = (k) => TH.parse(I[k].value);
    const P = (x) => (Math.abs(x) >= 1e4 ? PS.sci(x, 4) : PS.pretty(PS.round(x, 8), 4));
    function calc() {
      const c = v('c'), m0 = v('m'), m = U.m.value === 'g' ? m0 / 1000 : m0, t0 = v('t0'), t = v('t'), Q0 = v('Q'), Q = U.Q.value === 'kJ' ? Q0 * 1000 : Q0;
      const mStr = U.m.value === 'g' ? 'm = ' + m0 + ' g = ' + m + ' kg；' : '';
      const QStr = U.Q.value === 'kJ' ? 'Q = ' + Q0 + ' kJ = ' + P(Q) + ' J；' : '';
      const bad = (s) => { out.className = 'th-msg bad'; out.innerHTML = s; PS.sound.bad(); };
      const ck = (...xs) => xs.every((x) => isFinite(x));
      let s;
      if (st.mode === 'Q') {
        if (!ck(c, m, t0, t) || c <= 0 || m <= 0) return bad('请填写比热容、质量、初温和末温。');
        if (t === t0) return bad('初温和末温相同，没有吸热也没有放热。');
        const up = t > t0, q = c * m * Math.abs(t - t0);
        s = '解：' + mStr + (up ? 'Q吸 = cm(t − t₀)' : 'Q放 = cm(t₀ − t)') + ' = ' + P(c) + ' J/(kg·℃) × ' + P(m) + ' kg × ' + (up ? '(' + t + ' ℃ − ' + t0 + ' ℃)' : '(' + t0 + ' ℃ − ' + t + ' ℃)') + ' = <b>' + P(q) + ' J</b>（' + (up ? '吸收' : '放出') + '热量）';
      } else if (st.mode === 'c') {
        if (!ck(Q, m, t0, t) || Q <= 0 || m <= 0 || t === t0) return bad('请填写热量、质量、初温和末温（初温和末温不能相同）。');
        const cc = Q / (m * Math.abs(t - t0));
        const near = PS.CAP_ORDER.filter((k) => Math.abs(CAP[k].c - cc) / CAP[k].c < 0.03).map((k) => CAP[k].n);
        s = '解：' + mStr + QStr + 'c = <span class="frac"><span>Q</span><span>mΔt</span></span> = <span class="frac"><span>' + P(Q) + ' J</span><span>' + P(m) + ' kg × ' + Math.abs(t - t0) + ' ℃</span></span> = <b>' + P(cc) + ' J/(kg·℃)</b>' + (near.length ? '<br>查比热容表，这种物质可能是<b>' + near.join('或') + '</b>。' : '');
      } else if (st.mode === 'm') {
        if (!ck(Q, c, t0, t) || Q <= 0 || c <= 0 || t === t0) return bad('请填写热量、比热容、初温和末温（初温和末温不能相同）。');
        const mm = Q / (c * Math.abs(t - t0));
        s = '解：' + QStr + 'm = <span class="frac"><span>Q</span><span>cΔt</span></span> = <span class="frac"><span>' + P(Q) + ' J</span><span>' + P(c) + ' J/(kg·℃) × ' + Math.abs(t - t0) + ' ℃</span></span> = <b>' + P(mm) + ' kg</b>';
      } else {
        if (!ck(Q, c, m, t0) || Q <= 0 || c <= 0 || m <= 0) return bad('请填写热量、比热容、质量和初温。');
        const dt = Q / (c * m), tt = t0 + st.heat * dt;
        s = '解：' + mStr + QStr + 'Δt = <span class="frac"><span>Q</span><span>cm</span></span> = <span class="frac"><span>' + P(Q) + ' J</span><span>' + P(c) + ' J/(kg·℃) × ' + P(m) + ' kg</span></span> = ' + P(dt) + ' ℃，' + (st.heat > 0 ? '末温 t = t₀ + Δt = ' : '末温 t = t₀ − Δt = ') + t0 + ' ℃ ' + (st.heat > 0 ? '+' : '−') + ' ' + P(dt) + ' ℃ = <b>' + P(tt) + ' ℃</b>';
        if (sub.value === 'water' && st.heat > 0 && tt > 100) s += '<br>⚠ 在 1 个标准大气压下，水的沸点是 100 ℃，沸腾时温度不再升高，所以水温最多升高到 <b>100 ℃</b>。';
        if (st.heat > 0) s += '<br><span class="small muted">注意“升高了”（Δt）和“升高到”（末温 t）的区别。</span>';
      }
      out.className = 'th-msg ok'; out.innerHTML = s;
    }
    show();
  });

  /* ================= 热平衡；测量金属的比热容 ================= */
  PS.register('heat-mix', function (el, opts) {
    const VW = 1000;
    const st = { mode: opts.lab ? 'metal' : 'mix', m1: 200, t1: 80, m2: 300, t2: 20, p: 0, run: false, loss: false, metal: 'al', phase: 0, T: 20, Tm: 100 };
    const seg = PS.ui.seg([{ value: 'mix', label: '冷水和热水混合' }, { value: 'metal', label: '测量金属块的比热容' }], st.mode, (v) => { st.mode = v; build(); });
    el.append(PS.ui.row(seg.el));
    const S = EN.stage(el, { VW, vh: (w) => (EN.narrow(w) ? 700 : 430), draw });
    const ctl = h('div'), msg = h('div', { class: 'th-msg info' });
    el.append(ctl, msg);
    const MET = ['al', 'iron', 'cu'];
    const tMix = () => { const a = 4200 * st.m1 / 1000, b = 4200 * st.m2 / 1000; return (a * st.t1 + b * st.t2) / (a + b); };
    const tMet = () => { const a = CAP[st.metal].c * 0.2, b = 4200 * 0.2; return (a * 100 + b * 20) / (a + b); };
    let ansIn;
    function build() {
      ctl.innerHTML = ''; st.p = 0; st.run = false; st.phase = 0;
      if (st.mode === 'mix') {
        const sl = (lab, k, a, b, s, u) => { const x = PS.ui.slider({ label: lab, min: a, max: b, step: s, value: st[k], unit: u, onInput: (v) => { st[k] = v; st.p = 0; st.run = false; tell(); } }); return x.el; };
        ctl.append(PS.ui.row(sl('热水的质量', 'm1', 100, 500, 50, 'g'), sl('热水的温度', 't1', 50, 90, 5, '℃')), PS.ui.row(sl('冷水的质量', 'm2', 100, 500, 50, 'g'), sl('冷水的温度', 't2', 5, 30, 5, '℃')),
          PS.ui.row(PS.ui.button('把热水倒入冷水中', () => { st.p = 0; st.run = true; tell(); }, 'btn btn-primary btn-sm'), PS.ui.toggle('考虑热量损失（实际情况）', st.loss, (v) => { st.loss = v; tell(); }).el));
      } else {
        st.metal = PS.pick(MET); st.T = 20;
        ansIn = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', autocomplete: 'off', placeholder: '例如 0.5×10^3', style: { width: '140px' } });
        ctl.append(PS.ui.row(PS.ui.button('把金属块迅速放入量热器中', () => { if (!st.phase) { st.phase = 1; st.p = 0; st.run = true; tell(); } }, 'btn btn-primary btn-sm'), PS.ui.button('换一块金属', build, 'btn btn-ghost btn-sm')),
          h('div', { class: 'th-ans' }, h('span', null, '算出金属的比热容 c金 ='), ansIn, h('span', null, 'J/(kg·℃)'), PS.ui.button('检查', check, 'btn btn-green btn-sm')));
        ansIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
      }
      tell();
    }
    function check() {
      if (st.phase < 3) { msg.className = 'th-msg bad'; msg.innerHTML = '先把金属块放入量热器，等温度稳定后读出末温。'; return; }
      const v = TH.parse(ansIn.value), t = PS.round(tMet(), 1), c = (4200 * 0.2 * (t - 20)) / (0.2 * (100 - t));
      if (!isFinite(v)) { ansIn.focus(); return; }
      const ok = Math.abs(v - c) / c < 0.04;
      msg.className = 'th-msg ' + (ok ? 'ok' : 'bad');
      msg.innerHTML = (ok ? '✔ 正确！' : '✘ 再算一算。') + '<br>不计热量损失，Q吸 = Q放：c水m水(t − t水) = c金m金(t金 − t)<br>c金 = <span class="frac"><span>c水m水(t − t水)</span><span>m金(t金 − t)</span></span> = <span class="frac"><span>4.2×10³ J/(kg·℃) × 0.2 kg × (' + t + ' ℃ − 20 ℃)</span><span>0.2 kg × (100 ℃ − ' + t + ' ℃)</span></span> ≈ <b>' + PS.round(c, -1) + ' J/(kg·℃)</b>' + (ok ? '<br>查比热容表，这块金属是<b>' + CAP[st.metal].n.replace('、钢', '') + '</b>（c = ' + TH.c3(CAP[st.metal].c) + ' J/(kg·℃)）。实际测量时有热量损失，测得的比热容会偏小。' : '');
      ok ? PS.sound.good() : PS.sound.bad();
    }
    function tell() {
      let s, cls = 'info';
      if (st.mode === 'mix') {
        const t = tMix(), tl = st.t2 + (t - st.t2) * 0.93;
        if (st.p < 1) s = '把 ' + st.m1 + ' g、' + st.t1 + ' ℃ 的热水倒入 ' + st.m2 + ' g、' + st.t2 + ' ℃ 的冷水中，混合后的温度是多少？先估一估，再倒。';
        else {
          s = '混合后的温度为 <b>' + PS.fmtT(st.loss ? tl : t, 1) + '</b>。<br>热水放热、冷水吸热，直到温度相同（<b>热平衡</b>）。不计热量损失时 <b>Q吸 = Q放</b>：<br>c水m冷(t − ' + st.t2 + ' ℃) = c水m热(' + st.t1 + ' ℃ − t)，' + st.m2 / 1000 + ' kg × (t − ' + st.t2 + ' ℃) = ' + st.m1 / 1000 + ' kg × (' + st.t1 + ' ℃ − t)，t = ' + PS.fmt(t, 1) + ' ℃。';
          if (st.loss) s += '<br>实际上热水在倒的过程中和容器、空气也会交换热量，<b>Q吸 &lt; Q放</b>，测得的温度比计算值低一些。';
          cls = 'ok';
        }
      } else {
        if (!st.phase) s = '一块质量为 200 g 的金属块（不知道是什么金属）在沸水中加热了足够长的时间，温度为 100 ℃。量热器中装有 200 g、20 ℃ 的水。';
        else if (st.phase < 3) s = '金属块放入水中，搅拌……金属块放热，水吸热，温度计的示数在上升。';
        else { s = '温度稳定在 <b>' + PS.fmt(tMet(), 1) + ' ℃</b>（这就是末温 t）。根据 Q吸 = Q放 算出金属的比热容，再查比热容表判断是哪种金属。'; cls = 'ok'; }
      }
      msg.className = 'th-msg ' + cls; msg.innerHTML = s; S.render();
    }
    PS.loop((dt) => {
      if (st.run) {
        if (st.mode === 'mix') { st.p = Math.min(1, st.p + dt / 2.2); if (st.p >= 1) { st.run = false; PS.sound.ping(); tell(); } }
        else {
          if (st.phase === 1) { st.p = Math.min(1, st.p + dt / 1.5); if (st.p >= 1) { st.phase = 2; PS.sound.clack(); tell(); } }
          else if (st.phase === 2) {
            const tf = tMet(), a = CAP[st.metal].c * 0.2, b = 840;
            st.T += (tf - st.T) * dt * 0.7;
            st.Tm = 100 - (st.T - 20) * (b / a);
            if (Math.abs(tf - st.T) < 0.05) { st.T = tf; st.Tm = tf; st.phase = 3; st.run = false; PS.sound.ping(); tell(); }
          }
        }
      }
      S.render();
    }, el).start();
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, VW, VH), nar = EN.narrow(w), t = performance.now() / 1000;
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const GY = VH - 30, k = nar ? 1.5 : 1, Fd = (q) => F(q) / k, TY = nar ? GY - (GY - 50) / k : 40;
      ctx.save(); if (nar) { ctx.translate(500, GY); ctx.scale(k, k); ctx.translate(-500, -GY); }
      if (st.mode === 'mix') {
        const p = st.p, tm = tMix(), Tcur = st.t2 + (tm * (st.loss ? 0.93 : 1) + st.t2 * (st.loss ? 0.07 : 0) - st.t2) * Math.min(1, p * 1.3);
        const hx = nar ? 360 : 260, cx = nar ? 620 : 600;
        // 热水杯（倾斜倒水）
        ctx.save(); ctx.translate(hx, GY - 140 - p * 60); ctx.rotate(-p * 1.25 * Math.min(1, p * 2));
        PS.beaker(ctx, 0, 70, 150, 150, { level: (st.m1 / 500) * 0.8 * (1 - p), water: PS.mixColor('#a5d8ff', '#ffc9b9', st.t1 / 100) });
        ctx.restore();
        if (p > 0.15 && p < 0.95) { ctx.strokeStyle = 'rgba(255,169,140,.85)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(hx + 70, GY - 230); ctx.quadraticCurveTo(cx - 40, GY - 260, cx - 20, GY - 120); ctx.stroke(); }
        const lv = (st.m2 + st.m1 * p) / 1000 / 0.8 * 0.8;
        PS.beaker(ctx, cx, GY, 220, 220, { level: Math.min(0.9, lv), water: PS.mixColor('#a5d8ff', '#ffc9b9', Tcur / 100) });
        TH.dthermo(ctx, cx, GY - 270, Tcur, { F: (q) => F(q) / k, fs: 18, label: p >= 1 ? '混合后的温度' : '冷水的温度' });
        D.text(ctx, '热水 ' + st.m1 + ' g、' + st.t1 + ' ℃', hx, TY, { size: Fd(15), weight: 800, align: 'center', color: TC.hot });
        D.text(ctx, '冷水 ' + st.m2 + ' g、' + st.t2 + ' ℃', cx, TY, { size: Fd(15), weight: 800, align: 'center', color: TC.cold });
      } else {
        // 沸水中的金属块 → 量热器
        const bx = nar ? 345 : 230, cx = nar ? 640 : 640;
        PS.beaker(ctx, bx, GY - 110, 200, 170, { level: 0.75, water: '#ffd8cc' });
        ctx.fillStyle = '#495057'; ctx.fillRect(bx - 110, GY - 110, 220, 8);
        PS.lamp(ctx, bx, GY, 0.85, { on: true, t });
        for (let i = 0; i < 8; i++) { const q = (t * 0.9 + i / 8) % 1; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(bx - 70 + ((i * 37) % 140), GY - 120 - q * 110, 3 + q * 4, 0, TAU); ctx.fill(); }
        D.text(ctx, '沸水 100 ℃', bx, GY - 300, { size: Fd(14), weight: 800, align: 'center', color: TC.hot });
        // 量热器
        const cw = 200, ch2 = 190, ctop = GY - ch2;
        ctx.fillStyle = '#ced4da'; D.roundRect(ctx, cx - cw / 2 - 18, ctop - 10, cw + 36, ch2 + 10, 10); ctx.fill();
        PS.beaker(ctx, cx, GY - 6, cw, ch2 - 20, { level: 0.6, water: PS.mixColor('#a5d8ff', '#ffc9b9', (st.T - 20) / 60) });
        ctx.fillStyle = '#868e96'; ctx.fillRect(cx - cw / 2 - 22, ctop - 22, cw + 44, 14);
        D.text(ctx, '量热器（水 200 g、20 ℃）', cx, GY + 22, { size: Fd(13), weight: 700, align: 'center', color: '#495057' });
        TH.dthermo(ctx, nar ? cx + 30 : cx + 170, nar ? ctop - 200 : ctop + 30, st.T, { F: (p) => F(p) / k, fs: 17, label: '水温', d: 1 });
        // 金属块的位置
        const p = st.phase === 0 ? 0 : st.phase === 1 ? st.p : 1;
        const ease = p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p);
        const x = bx + (cx - bx) * ease, y = PS.lerp(GY - 150, GY - 70, ease) - Math.sin(Math.PI * ease) * 190;
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y - 120); ctx.lineTo(x, y - 22); ctx.stroke();
        const mt = st.phase >= 2 ? st.Tm : 100;
        ctx.fillStyle = PS.mixColor('#868e96', '#ff8787', (mt - 20) / 160);
        D.roundRect(ctx, x - 26, y - 22, 52, 44, 6); ctx.fill(); ctx.strokeStyle = '#343a40'; ctx.stroke();
        D.text(ctx, '?', x, y + 8, { size: Fd(18), weight: 800, align: 'center', color: '#fff' });
        D.text(ctx, '金属块 200 g' + (st.phase >= 2 ? '，' + PS.fmtT(mt, 1) : ''), x, y - 30, { size: Fd(13), weight: 800, align: 'center', color: '#343a40' });
      }
      ctx.restore();
    }
    build();
  });
})();
