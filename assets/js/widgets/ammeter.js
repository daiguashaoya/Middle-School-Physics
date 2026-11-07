/* 第15章第4、5节：电流的测量、串并联电路中电流的规律——电流的强弱 current-strength、电流表读数 ammeter-read、
 * 电流表的使用 ammeter-use、水流类比 water-analogy、电流的计算随机练习 current-quiz。依赖 circuit.js、energy.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, EL = PS.el, EN = PS.en, REAL = EL.real;
  const TAU = Math.PI * 2;

  /* ================= 电流的强弱 ================= */
  PS.register('current-strength', function (el) {
    const st = { mode: 'cells', n: 2, t: 0 };
    const modeSeg = PS.ui.seg([{ value: 'cells', label: '灯泡的亮暗' }, { value: 'ladder', label: '常见的电流' }], 'cells', (v) => { st.mode = v; a.style.display = v === 'cells' ? '' : 'none'; b.style.display = v === 'ladder' ? '' : 'none'; });
    const a = h('div'), b = h('div', { style: { display: 'none' } });
    const nSeg = PS.ui.seg([1, 2, 3].map((v) => ({ value: v, label: v + ' 节干电池' })), 2, (v) => { st.n = v; tell(); });
    const msg = h('div', { class: 'el-msg info' });
    const view = h('div');
    a.append(h('div', { class: 'controls' }, nSeg.el), view, msg);
    el.append(h('div', { class: 'controls' }, modeSeg.el), a, b);
    const S = EN.stage(view, { VW: 1000, vh: (w) => (EN.narrow(w) ? 620 : 470), draw });
    const I = () => (1.5 * st.n) / (10 + 0.5 * st.n);
    function tell() {
      msg.className = 'el-msg ok';
      msg.innerHTML = '用 ' + st.n + ' 节干电池时，小灯泡' + ['较暗', '正常发光', '很亮'][st.n - 1] + '。电池节数越多，通过灯泡的电流越大，灯泡越亮——<b>电流有强弱</b>。电流看不见、摸不着，我们通过它产生的<b>效应</b>（如灯泡的亮暗）来认识它，这是<b>转换法</b>。';
      S.render();
    }
    const loop = PS.loop((dt) => { st.t += dt; S.render(); }, view);
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, 1000, VH), nar = VH > 520, k = nar ? 1.25 : 1;
      ctx.fillStyle = '#f3ede2'; ctx.fillRect(0, 0, 1000, VH);
      ctx.save(); ctx.translate(500, 0); ctx.scale(k, k); ctx.translate(-500, 0);
      const i = I(), lit = (i * i * 10) / 0.75;
      const bt = REAL.battery(ctx, 500, 405, 100 + st.n * 75, { n: st.n });
      const bl = REAL.bulb(ctx, 500, 215, 150, lit, {});
      const w1 = REAL.wire(ctx, bt.pos, bl.t2, { color: '#e03131', c1: [bt.pos[0] + 120, bt.pos[1]], c2: [bl.t2[0] + 160, bl.t2[1] + 40] });
      const w2 = REAL.wire(ctx, bl.t1, bt.neg, { color: '#212529', c1: [bl.t1[0] - 160, bl.t1[1] + 40], c2: [bt.neg[0] - 120, bt.neg[1]] });
      [w1].forEach((p) => EL.dots(ctx, p, st.t * EL.speed(i), { gap: 30, r: 4.5 }));
      EL.dots(ctx, w2, st.t * EL.speed(i), { gap: 30, r: 4.5 });
      ctx.restore();
      D.text(ctx, '电流越大 → 小圆点移动越快、灯泡越亮', 500, F(14) + 12, { size: F(14), weight: 800, align: 'center', color: '#e8590c' });
    }
    const SUPN = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶' };
    const L = EN.ladder(b, {
      items: [['液晶显示电子计算器', 1.3e-4, '🔢', '约 130 μA'], ['半导体收音机', 0.05, '📻', '约 50 mA'], ['家用节能灯', 0.1, '💡', '约 0.1 A'], ['手电筒', 0.2, '🔦', '约 200 mA'], ['家用电冰箱', 1.4, '❄️', '约 1.1～1.7 A'], ['家用空调', 5, '🌀', '约 5 A'], ['三峡电站向华东电网输出的电流', 6000, '⚡', '高达 6 000 A'], ['雷电', 2e5, '🌩️', '可达 2×10⁵ A']],
      lmin: -4, lmax: 6, on: 4,
      tick: (e) => '10' + String(e).split('').map((c) => SUPN[c]).join('') + ' A',
      caption: '电流（A，对数刻度：每一格是前一格的 10 倍）', hint: '点一点图标', fmt: (it) => it[3],
    });
    L.msg.className = 'el-msg info';
    tell();
    loop.start();
  });

  /* ================= 电流表读数练习 ================= */
  PS.register('ammeter-read', function (el) {
    const view = h('div', { style: { maxWidth: '420px' } });
    const q = h('div', { class: 'el-q' });
    const inp = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', autocomplete: 'off', placeholder: '读数' });
    const fb = h('div', { class: 'el-msg info' });
    const score = h('div', { class: 'small muted' });
    el.append(h('div', { class: 'el-pair' }, view, h('div', null, q, h('div', { class: 'el-ans' }, inp, h('span', null, 'A'), PS.ui.button('提交', check, 'btn btn-primary btn-sm'), PS.ui.button('换一题', next, 'btn btn-ghost btn-sm')), fb, score)));
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    const S = PS.stage(view, { ratio: '1 / 0.86', draw });
    let Q = null, n = 0, ok = 0;
    function next() {
      const range = PS.pick([0.6, 3]), div = range / 30, k = PS.randInt(3, 29);
      Q = { range, v: k * div, done: false };
      q.innerHTML = '电流表接的是“<b>−</b>”和“<b>' + range + '</b>”两个接线柱（黄色圆圈）。示数是多少？';
      inp.value = ''; inp.disabled = false;
      fb.className = 'el-msg info'; fb.innerHTML = '读数步骤：① 看量程；② 确定分度值（每小格表示多少）；③ 数指针偏过了几大格、几小格。电流表读数<b>不需要估读</b>。';
      S.render();
    }
    function check() {
      if (!Q || Q.done) return;
      const r = EL.judge(parseFloat(inp.value), Q.v, Q.range);
      if (isNaN(parseFloat(inp.value))) { inp.focus(); return; }
      Q.done = true; n++; if (r.ok) ok++; inp.disabled = true;
      fb.className = 'el-msg ' + (r.ok ? 'ok' : 'bad');
      fb.innerHTML = r.ok ? r.hint : r.hint + '<br>正确读数：<b>' + PS.fmt(EL.reading(Q.v, Q.range), Q.range < 1 ? 2 : 1) + ' A</b>（每小格 ' + PS.round(Q.range / 30, 2) + ' A）。';
      score.innerHTML = '已做 ' + n + ' 题，答对 ' + ok + ' 题。'; r.ok ? PS.sound.good() : PS.sound.bad();
    }
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, 400, 344);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 400, 344);
      if (Q) EL.dial(ctx, 200, 150, 340, { v: Q.v, range: Q.range, terms: true, sel: ['-', String(Q.range)], F });
    }
    next();
    el._q = () => Q;
  });

  /* ================= 电流表的使用 ================= */
  const CONN = [
    { value: 'ok', label: '串联，电流从“+”接线柱流入' },
    { value: 'rev', label: '正、负接线柱接反了' },
    { value: 'par', label: '与灯泡并联' },
    { value: 'bat', label: '直接接在电源两极' },
  ];
  PS.register('ammeter-use', function (el) {
    const st = { conn: 'ok', range: 0.6, load: 'bulb', on: false, tap: 0, burn: 0, broken: false, t: 0, spin: 0 };
    const cSeg = PS.ui.seg(CONN, 'ok', (v) => { st.conn = v; st.on = false; st.burn = 0; solve(); });
    const rSeg = PS.ui.seg([{ value: 0.6, label: '量程 0~0.6 A' }, { value: 3, label: '量程 0~3 A' }], 0.6, (v) => { st.range = v; solve(); });
    const lSeg = PS.ui.seg([{ value: 'bulb', label: '💡 小灯泡' }, { value: 'motor', label: '⚙️ 小电动机' }], 'bulb', (v) => { st.load = v; st.on = false; solve(); });
    const swBtn = PS.ui.button('闭合开关', () => { st.on = !st.on; st.tap = 0; PS.sound.clack(); solve(); }, 'btn btn-primary btn-sm');
    const tapBtn = PS.ui.button('⚡ 试触（迅速闭合、断开）', () => { st.on = true; st.tap = 0.6; PS.sound.clack(); solve(); }, 'btn btn-sm');
    const newBtn = PS.ui.button('换一个新电流表', () => { st.broken = false; st.burn = 0; st.on = false; solve(); }, 'btn btn-ghost btn-sm');
    const msg = h('div', { class: 'el-msg info' });
    const view = h('div');
    el.append(h('div', { class: 'controls' }, h('span', { class: 'small' }, '电流表的接法：'), cSeg.el), h('div', { class: 'controls' }, rSeg.el, lSeg.el), view, h('div', { class: 'controls', style: { marginTop: '6px' } }, swBtn, tapBtn, newBtn), msg);
    const S = EN.stage(view, { VW: 1000, vh: (w) => (EN.narrow(w) ? 700 : 540), draw });
    let sol = null;
    /* 节点：p、n 电池正负极，s1、s2 开关，l1、l2 用电器，aP 电流表的“+”（所选量程）接线柱，aM “−”接线柱；每根导线都是一个元件 */
    const WIRES = {
      ok: [['wA', 'p', 'aP'], ['wB', 'aM', 's1'], ['wL', 's2', 'l2'], ['wN', 'l1', 'n']],
      rev: [['wA', 'p', 'aM'], ['wB', 'aP', 's1'], ['wL', 's2', 'l2'], ['wN', 'l1', 'n']],
      par: [['wA', 'p', 's1'], ['wL', 's2', 'l2'], ['wN', 'l1', 'n'], ['wP', 'l2', 'aP'], ['wQ', 'aM', 'l1']],
      bat: [['wA', 'p', 's1'], ['wL', 's2', 'l2'], ['wN', 'l1', 'n'], ['wP', 's2', 'aP'], ['wQ', 'aM', 'n']],
    };
    function net() {
      const els = [{ id: 'E', t: 'bat', a: 'p', b: 'n', E: 3, r: 0.5 }, { id: 'S', t: 'sw', a: 's1', b: 's2', on: st.on },
        st.load === 'bulb' ? { id: 'L', t: 'bulb', a: 'l2', b: 'l1', R: 10 } : { id: 'L', t: 'motor', a: 'l2', b: 'l1', R: 3.2 },
        { id: 'A', t: 'amm', a: 'aP', b: 'aM', R: st.range < 1 ? 0.12 : 0.03, open: st.broken }];
      WIRES[st.conn].forEach(([id, a, b]) => els.push({ id, t: 'wire', a, b }));
      return { els };
    }
    function solve() {
      sol = EL.solve(net());
      swBtn.innerHTML = st.on && !st.tap ? '断开开关' : '闭合开关';
      const v = sol.I.A || 0, a = Math.abs(v);
      let s, c = 'info';
      if (st.broken) { s = '💥 电流表被<b>烧坏</b>了！电流表的电阻很小，' + (st.conn === 'bat' ? '直接接在电源两极上' : '与用电器并联') + '时电路中的电流很大。点“换一个新电流表”。'; c = 'bad'; }
      else if (!st.on) s = { ok: '电流表与灯泡<b>串联</b>，电流从“' + st.range + '”（+）接线柱流入、从“−”接线柱流出。闭合开关看看。不知道电流大小时，先用<b>大量程“试触”</b>。', rev: '电流从“−”接线柱流入了。闭合开关（或试触）看看会怎样。', par: '电流表与灯泡<b>并联</b>了。试触一下看看会怎样。', bat: '电流表直接接在电源两极上（没有经过用电器）。试触一下看看。' }[st.conn];
      else if (st.conn === 'rev') { s = '⚠️ 指针<b>反向偏转</b>（向零刻度线左边偏），可能打弯指针、损坏电流表！电流必须从“+”接线柱流入、从“−”接线柱流出。'; c = 'bad'; }
      else if (st.conn === 'par' || st.conn === 'bat') { s = '⚠️ 指针<b>迅速偏到头</b>！电流表的电阻很小，相当于一根导线，' + (st.conn === 'par' ? '与灯泡并联时把灯泡<b>短路</b>了，灯泡熄灭，' : '直接接在电源两极上，') + '电路中的电流很大（约 ' + PS.fmt(a, 1) + ' A），会<b>烧坏电流表和电源</b>。绝对不允许！' + (st.tap ? '幸好是试触，赶快断开了。' : ''); c = 'bad'; }
      else if (a > st.range) { s = '⚠️ 指针偏转<b>超过了量程</b>（打到头），会损坏电流表。' + (st.tap ? '试触发现电流较大，应改用 <b>0~3 A</b> 的大量程。' : '应断开开关，改用 0~3 A 的大量程。'); c = 'bad'; }
      else if (st.range === 3 && a < 0.6) { s = '示数约 ' + PS.fmt(EL.reading(v, 3), 1) + ' A。指针偏转角度很小，读数不精确。' + (st.tap ? '试触发现电流小于 0.6 A，应改用 <b>0~0.6 A</b> 的小量程。' : '电流小于 0.6 A 时应改用 0~0.6 A 的小量程，读数更精确。'); }
      else { s = '✔ 电流表的示数是 <b>' + PS.fmt(EL.reading(v, st.range), st.range < 1 ? 2 : 1) + ' A</b>（量程 0~' + st.range + ' A，分度值 ' + PS.round(st.range / 30, 2) + ' A）。'; c = 'ok'; }
      msg.className = 'el-msg ' + c; msg.innerHTML = s;
      S.render();
    }
    const loop = PS.loop((dt) => {
      st.t += dt;
      if (st.tap > 0) { st.tap -= dt; if (st.tap <= 0) { st.tap = 0; st.on = false; solve(); } }
      if (st.on && !st.broken && (st.conn === 'par' || st.conn === 'bat')) { st.burn += dt; if (st.burn > 1.4) { st.broken = true; st.on = false; PS.sound.bad(); solve(); } }
      if (st.load === 'motor' && sol && Math.abs(sol.I.L || 0) > 0.05) st.spin += dt * 25;
      S.render();
    }, view);
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, 1000, VH), nar = VH > 600, k = nar ? 1.2 : 1;
      ctx.fillStyle = '#f3ede2'; ctx.fillRect(0, 0, 1000, VH);
      ctx.save(); ctx.translate(500, 0); ctx.scale(k, k); ctx.translate(-500, 0);
      const fs = F(14) / k, I = (id) => (sol ? sol.I[id] || 0 : 0);
      const bt = REAL.battery(ctx, 250, 470, 200, { n: 2, hot: sol && sol.short.length > 0 });
      const sw = REAL.sw(ctx, 780, 470, 160, st.on, { label: '开关', fs });
      const lit = st.load === 'bulb' ? Math.max(0, (sol ? sol.P.L || 0 : 0) / 0.75) : 0;
      const ld = st.load === 'bulb' ? REAL.bulb(ctx, 470, 180, 150, lit, { label: '小灯泡', fs }) : REAL.motor(ctx, 470, 180, 150, st.spin, { label: '小电动机', fs });
      const ax = 800, ay = 220, aw = 190;
      const v = st.broken ? 0 : I('A');
      const dl = EL.dial(ctx, ax, ay, aw, { v, range: st.range, terms: true, sel: ['-', String(st.range)], F: (p) => p });
      if (st.broken) { for (let i = 0; i < 4; i++) { const ph = (st.t * 0.5 + i / 4) % 1; ctx.fillStyle = 'rgba(73,80,87,' + 0.4 * (1 - ph) + ')'; ctx.beginPath(); ctx.arc(ax - 20 + i * 14, ay - 80 - ph * 90, 12 + ph * 16, 0, TAU); ctx.fill(); } D.text(ctx, '烧坏了', ax, ay, { size: F(18) / k, weight: 900, align: 'center', color: '#e03131', bg: 'rgba(255,255,255,.85)' }); }
      const T = {}; dl.terms.forEach((t) => { T[t.k] = [t.x, t.y]; });
      const POS = { p: bt.pos, n: bt.neg, s1: sw.t1, s2: sw.t2, l1: ld.t1, l2: ld.t2, aP: T[String(st.range)], aM: T['-'] };
      const CP = {
        'p-aP': [[bt.pos[0] + 200, bt.pos[1] + 20], [ax - 160, ay + 220]], 'p-aM': [[bt.pos[0] + 200, bt.pos[1] + 20], [ax - 160, ay + 220]],
        'aM-s1': [[ax - 60, ay + 200], [sw.t1[0] - 60, sw.t1[1] - 60]], 'aP-s1': [[ax - 20, ay + 200], [sw.t1[0] - 60, sw.t1[1] - 60]],
        's2-l2': [[sw.t2[0] + 80, sw.t2[1] - 120], [ld.t2[0] + 200, ld.t2[1] + 60]], 'l1-n': [[ld.t1[0] - 200, ld.t1[1] + 40], [bt.neg[0] - 120, bt.neg[1] - 40]],
        'l2-aP': [[ld.t2[0] + 120, ld.t2[1] - 60], [POS.aP[0] - 30, POS.aP[1] + 90]], 'aM-l1': [[POS.aM[0] - 40, POS.aM[1] + 140], [ld.t1[0] - 120, ld.t1[1] - 120]],
        's2-aP': [[sw.t2[0] + 40, sw.t2[1] - 80], [POS.aP[0] + 10, POS.aP[1] + 90]], 'aM-n': [[POS.aM[0] - 120, POS.aM[1] + 180], [bt.neg[0] - 100, bt.neg[1] + 60]],
      };
      const COL = { wA: '#e03131', wB: '#f59f00', wL: '#1c7ed6', wN: '#212529', wP: '#ae3ec9', wQ: '#0c8599' };
      WIRES[st.conn].forEach(([id, a, b]) => {
        const cp = CP[a + '-' + b], cur = I(id);
        const pts = REAL.wire(ctx, POS[a], POS[b], Object.assign({ color: COL[id], hot: sol && sol.short.length && Math.abs(cur) > 1 }, cp ? { c1: cp[0], c2: cp[1] } : { sag: 30 }));
        if (Math.abs(cur) > 0.003) EL.dots(ctx, pts, st.t * EL.speed(cur), { gap: 30, r: 4 });
      });
      D.text(ctx, '电流表', ax, ay - aw * 0.52, { size: fs, weight: 800, align: 'center', color: '#1b2333' });
      ctx.restore();
    }
    solve();
    loop.start();
    el._st = st;
  });

  /* ================= 水流类比 ================= */
  PS.register('water-analogy', function (el) {
    const st = { mode: 'series', t: 0, ps: [] };
    const seg = PS.ui.seg([{ value: 'series', label: '串联：水流只有一条路' }, { value: 'parallel', label: '并联：水流分成两路' }], 'series', (v) => { st.mode = v; tell(); });
    const msg = h('div', { class: 'el-msg info' });
    const view = h('div');
    el.append(h('div', { class: 'controls' }, seg.el), view, msg);
    const S = EN.stage(view, { VW: 1000, vh: (w) => (EN.narrow(w) ? 1180 : 470), draw });
    function tell() {
      msg.className = 'el-msg ok';
      msg.innerHTML = st.mode === 'series' ? '水流只有一条通道，在相同时间内流过 A、B、C 三处的水量<b>相等</b>。同样，串联电路中电流只有一条路径，<b>各处的电流相等</b>：I<sub>A</sub> = I<sub>B</sub> = I<sub>C</sub>。'
        : '主干道中的水流在分支处分成两路，又在汇合处汇合，主干道中的水量<b>等于</b>两条支流的水量之和。同样，并联电路中<b>干路电流等于各支路电流之和</b>：I<sub>A</sub> = I<sub>B</sub> + I<sub>C</sub>。';
      S.render();
    }
    const loop = PS.loop((dt) => { st.t += dt; S.render(); }, view);
    /** 管道：折线 pts，宽 w，流量 q（每秒流过的“水滴”数） */
    function pipe(ctx, pts, w, q, t) {
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = '#868e96'; ctx.lineWidth = w + 8; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
      ctx.strokeStyle = '#a5d8ff'; ctx.lineWidth = w; ctx.stroke();
      ctx.restore();
      EL.dots(ctx, pts, t * (q * 40) / (w / 20), { gap: 26, r: Math.min(5, w * 0.18), color: '#1971c2' });
    }
    function meter(ctx, x, y, name, q, F) {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1c7ed6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 22, 0, TAU); ctx.fill(); ctx.stroke();
      D.text(ctx, name, x, y + 1, { size: F(15), weight: 900, align: 'center', baseline: 'middle', color: '#1c7ed6' });
      D.text(ctx, q + ' L/s', x, y + 22 + F(13) * 1.1, { size: F(13), weight: 800, align: 'center', color: '#1b2333', bg: 'rgba(255,255,255,.85)' });
    }
    function pump(ctx, x, y, F) {
      ctx.fillStyle = '#495057'; D.roundRect(ctx, x - 50, y - 32, 100, 64, 12); ctx.fill();
      ctx.save(); ctx.translate(x, y); ctx.rotate(st.t * 4); ctx.strokeStyle = '#ffd43b'; ctx.lineWidth = 4; for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(20, 0); ctx.stroke(); } ctx.restore();
      D.text(ctx, '水泵', x, y + 32 + F(13) * 1.1, { size: F(13), weight: 800, align: 'center', color: '#495057' });
    }
    function wheel(ctx, x, y, r, q, name, F) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(st.t * q * 1.6);
      ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
      for (let i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r, 0); ctx.stroke(); }
      ctx.restore();
      D.text(ctx, name, x, y - r - 8, { size: F(13), weight: 800, align: 'center', color: '#e8590c' });
    }
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, 1000, VH), nar = VH > 600;
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, 1000, VH);
      const sc = nar ? 1.6 : 1;
      ctx.save(); if (nar) { ctx.translate(500, 0); ctx.scale(sc, sc); ctx.translate(-500, 0); ctx.translate(0, 10); }
      const G = (px) => F(px) / sc;
      const ox = nar ? 190 : 0;
      ctx.save(); ctx.translate(ox, 0);
      if (st.mode === 'series') {
        const q = 3;
        pipe(ctx, [[350, 360], [480, 360], [480, 90], [300, 90]], 26, q, st.t);
        pipe(ctx, [[300, 90], [120, 90], [120, 360], [250, 360]], 26, q, st.t);
        pump(ctx, 300, 360, G);
        wheel(ctx, 400, 90, 26, q, '水轮机 1', G); wheel(ctx, 200, 90, 26, q, '水轮机 2', G);
        meter(ctx, 480, 220, 'A', q, G); meter(ctx, 300, 90, 'B', q, G); meter(ctx, 120, 220, 'C', q, G);
      } else {
        pipe(ctx, [[350, 380], [480, 380], [480, 250]], 30, 3, st.t);
        pipe(ctx, [[480, 250], [480, 80], [120, 80], [120, 250]], 22, 2, st.t);
        pipe(ctx, [[480, 250], [120, 250]], 14, 1, st.t);
        pipe(ctx, [[120, 250], [120, 380], [250, 380]], 30, 3, st.t);
        pump(ctx, 300, 380, G);
        wheel(ctx, 240, 80, 26, 2, '水轮机 1', G); wheel(ctx, 240, 250, 20, 1, '水轮机 2', G);
        meter(ctx, 480, 320, 'A', 3, G); meter(ctx, 400, 80, 'B', 2, G); meter(ctx, 400, 250, 'C', 1, G);
      }
      ctx.restore();
      ctx.restore();
      // 对应的电路
      const cx = nar ? 500 : 790, cy = nar ? 950 : 230, k = nar ? 1.25 : 1;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
      const d = st.mode === 'series' ? { s: [{ k: 'A', label: 'A' }, { k: 'L1' }, { k: 'B', t: 'amm', label: 'B', id: 'B' }, { k: 'L2' }, { k: 'C', t: 'amm', label: 'C', id: 'C' }] }
        : { t: [{ k: 'A', label: 'A', side: 'R' }], b: [[{ k: 'B', t: 'amm', id: 'B' }, 'L1'], [{ k: 'C', t: 'amm', id: 'C' }, 'L2']] };
      const C = EL.circuit(EL.layout(d, { x: -150, y: -130, w: 300, h: 230, Lc: 46 }));
      C.solve();
      C.spec.els.forEach((e) => { C.ph[e.id] = st.t * EL.speed(C.I(e.id)); });
      ctx.fillStyle = '#fff'; D.roundRect(ctx, -190, -170, 380, 330, 14); ctx.fill();
      C.draw(ctx, { F: (p) => F(p) / k, dots: true, lw: 2.4, size: 22, gap: 24, r: 3.4 });
      ctx.restore();
      D.text(ctx, '对应的电路', cx, cy - 175 * k - 8, { size: F(14), weight: 800, align: 'center', color: '#3b5bdb' });
    }
    tell();
    loop.start();
  });

  /* ================= 电流的计算随机练习 ================= */
  PS.register('current-quiz', function (el, opts) {
    const box = h('div', { class: 'el-q', style: { marginTop: 0 } });
    const dialV = h('div', { style: { maxWidth: '240px', display: 'none' } });
    const inp = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', autocomplete: 'off', placeholder: '答案' });
    const unit = h('span', null, 'A');
    const fb = h('div', { class: 'el-msg info' });
    const score = h('div', { class: 'small muted', style: { marginTop: '6px' } });
    el.append(box, dialV, h('div', { class: 'el-ans' }, inp, unit, PS.ui.button('提交', check, 'btn btn-primary btn-sm'), PS.ui.button('换一题', next, 'btn btn-ghost btn-sm')), fb, score);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    const DS = PS.stage(dialV, { ratio: '1 / 0.86', draw: (ctx, w, hh) => { if (!Q || !Q.dial) return; const F = PS.virtual(ctx, w, hh, 300, 258); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 300, 258); EL.dial(ctx, 150, 112, 250, { v: Q.dial.v, range: Q.dial.range, terms: true, sel: ['-', String(Q.dial.range)], F }); } });
    let Q = null, n = 0, ok = 0;
    const pick = PS.pick, f2 = (x) => PS.fmt(x, 2).replace(/\.?0+$/, '');
    const GEN = {
      unit: () => { const t = pick([0, 1, 2, 3]); if (t === 0) { const a = pick([0.2, 0.25, 0.3, 0.45, 1.2, 0.05]); return { q: a + ' A = ? mA', a: a * 1000, u: 'mA', sol: '1 A = 10³ mA，' + a + ' A = ' + a + ' × 10³ mA = ' + PS.round(a * 1000, 3) + ' mA。' }; } if (t === 1) { const m = pick([150, 300, 450, 80, 1200]); return { q: m + ' mA = ? A', a: m / 1000, u: 'A', sol: '1 mA = 10⁻³ A，' + m + ' mA = ' + m + ' × 10⁻³ A = ' + PS.round(m / 1000, 4) + ' A。' }; } if (t === 2) { const m = pick([0.2, 0.5, 1.5, 3]); return { q: m + ' mA = ? μA', a: m * 1000, u: 'μA', sol: '1 mA = 10³ μA，' + m + ' mA = ' + PS.round(m * 1000, 3) + ' μA。' }; } const u = pick([130, 500, 2000, 50000]); return { q: u + ' μA = ? A', a: u / 1e6, u: 'A', sol: '1 μA = 10⁻⁶ A，' + u + ' μA = ' + PS.round(u / 1e6, 6) + ' A。' }; },
      series: () => { const i = pick([0.12, 0.16, 0.2, 0.24, 0.3, 0.36, 0.4]); const n2 = pick([2, 3]); return { q: n2 + ' 个规格不同的小灯泡串联在电路中，通过第 1 个灯泡的电流是 ' + i + ' A，通过第 ' + n2 + ' 个灯泡的电流是多少？', a: i, u: 'A', sol: '串联电路中电流处处相等，与灯泡的规格无关：I = ' + i + ' A。' }; },
      seriesMA: () => { const m = pick([150, 200, 250, 320, 400]); return { q: '节日小彩灯由 20 个小灯泡串联而成，如果电源插头处的电流为 ' + m + ' mA，那么通过每个小灯泡的电流是多少安？', a: m / 1000, u: 'A', sol: '串联电路中电流处处相等，I = ' + m + ' mA = ' + m / 1000 + ' A。' }; },
      par: () => { const i1 = pick([0.2, 0.24, 0.3, 0.36, 0.4, 0.5]), i2 = pick([0.18, 0.22, 0.26, 0.3, 0.44]); const t = pick([0, 1]); if (t === 0) return { q: '两灯并联，通过 L1 的电流为 ' + i1 + ' A，通过 L2 的电流为 ' + i2 + ' A，干路电流是多少？', a: PS.round(i1 + i2, 3), u: 'A', sol: '并联电路中干路电流等于各支路电流之和：I = I₁ + I₂ = ' + i1 + ' A + ' + i2 + ' A = ' + f2(i1 + i2) + ' A。' }; const I = PS.round(i1 + i2, 3); return { q: '两灯并联，干路电流为 ' + I + ' A，通过 L1 的电流为 ' + i1 + ' A，通过 L2 的电流是多少？', a: i2, u: 'A', sol: 'I₂ = I − I₁ = ' + I + ' A − ' + i1 + ' A = ' + f2(i2) + ' A。' }; },
      dial: () => { const k = PS.randInt(12, 27), v = (k * 0.6) / 30, I = PS.round(v + pick([0.4, 0.5, 0.6, 0.7, 0.8]), 2); return { q: '如图所示的并联电路中，电流表 A₁ 测干路电流，示数为 ' + I + ' A；电流表 A₂ 测 L₂ 所在支路的电流，示数如下图所示（接“−”和“0.6”接线柱）。通过 L₁ 的电流是多少？', a: PS.round(I - v, 3), u: 'A', dial: { v, range: 0.6 }, sol: 'A₂ 的量程为 0~0.6 A，分度值 0.02 A，示数 I₂ = ' + f2(v) + ' A；I₁ = I − I₂ = ' + I + ' A − ' + f2(v) + ' A = ' + f2(I - v) + ' A。' }; },
      wrong: () => { const k = PS.randInt(7, 25), v = (k * 0.6) / 30; return { q: '探究串联电路电流特点时，某同学记录的 A、B 两处电流都是 ' + f2(v) + ' A，C 处却记录为 ' + f2(v * 5) + ' A。C 处的电流实际应为多少？', a: PS.round(v, 3), u: 'A', sol: '串联电路中电流处处相等，C 处的电流也是 ' + f2(v) + ' A。记录为 ' + f2(v * 5) + ' A 是因为<b>看错了量程</b>（按 0~3 A 量程读了 0~0.6 A 量程的示数），大量程的读数正好是小量程的 5 倍。' }; },
    };
    const SETS = { measure: ['unit', 'unit', 'dial', 'wrong'], law: ['series', 'seriesMA', 'par', 'par', 'dial', 'wrong'] };
    const keys = SETS[opts.set] || Object.keys(GEN);
    function next() {
      Q = GEN[pick(keys)]();
      box.innerHTML = '<b>计算：</b>' + Q.q; unit.textContent = Q.u;
      dialV.style.display = Q.dial ? '' : 'none';
      inp.value = ''; inp.disabled = false;
      fb.className = 'el-msg info'; fb.innerHTML = '串联：I = I₁ = I₂；并联：I = I₁ + I₂；1 A = 10³ mA = 10⁶ μA。';
      DS.render();
    }
    function check() {
      if (!Q || inp.disabled) return;
      const v = PS.en.parse(String(inp.value).replace(/，/g, ''));
      if (isNaN(v)) { inp.focus(); return; }
      const good = Math.abs(v - Q.a) <= Math.abs(Q.a) * 0.006 + 1e-9;
      n++; if (good) ok++;
      inp.disabled = true;
      fb.className = 'el-msg ' + (good ? 'ok' : 'bad');
      fb.innerHTML = (good ? '✔ 正确！' : '✘ 答案是 ' + PS.round(Q.a, 6) + ' ' + Q.u + '。') + '<br>' + Q.sol;
      score.innerHTML = '已做 ' + n + ' 题，答对 ' + ok + ' 题。';
      good ? PS.sound.good() : PS.sound.bad();
    }
    next();
  });
})();
