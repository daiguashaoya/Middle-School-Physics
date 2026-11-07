/* 第16章第1节：电压——水压与电压 water-voltage、电压的作用与常见的电压 voltage-scale、电压表读数 voltmeter-read、
 * 电压表的使用 voltmeter-use、填电表与电压表测谁的电压 meter-judge。依赖 circuit.js、energy.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, EL = PS.el, EN = PS.en, REAL = EL.real;
  const TAU = Math.PI * 2;
  const VR = [3, 15];
  const vdial = (o) => Object.assign({ ranges: VR, unit: 'V' }, o);

  /* ================= 水压与电压（类比） ================= */
  PS.register('water-voltage', function (el) {
    const st = { pump: false, valve: true, lv: 2, d: 0, q: 0, p: 0, t: 0, wheel: 0, key: '' };
    const pumpBtn = PS.ui.button('▶ 开动抽水机', () => { st.pump = !st.pump; PS.sound.clack(); ui(); }, 'btn btn-primary btn-sm');
    const valveBtn = PS.ui.button('关上阀门', () => { st.valve = !st.valve; PS.sound.tick(); ui(); }, 'btn btn-sm');
    const lvSeg = PS.ui.seg([1, 2, 3].map((v) => ({ value: v, label: '抽水机 ' + v + ' 档 ↔ ' + v + ' 节干电池' })), 2, (v) => { st.lv = v; ui(); });
    const msg = h('div', { class: 'el-msg info' });
    const view = h('div');
    el.append(h('div', { class: 'controls' }, pumpBtn, valveBtn), h('div', { class: 'controls' }, lvSeg.el), view, msg);
    const S = EN.stage(view, { VW: 1000, vh: (w) => (EN.narrow(w) ? 1430 : 480), draw });
    function ui() {
      pumpBtn.innerHTML = st.pump ? '⏸ 停止抽水机' : '▶ 开动抽水机';
      valveBtn.innerHTML = st.valve ? '关上阀门' : '打开阀门';
      st.key = ''; tell();
    }
    const U = () => (st.pump ? 1.5 * st.lv : 0);
    const I = () => (st.pump && st.valve ? U() / (10 + 0.5 * st.lv) : 0);
    function tell() {
      let k, s, c = 'info';
      if (st.pump && st.valve) { k = 'run' + st.lv; c = 'ok'; s = '抽水机不断把水从乙抽到甲，使甲、乙之间保持<b>水位差</b>，水管中就有<b>持续的水流</b>，推动水轮机转动。同样，<b>电源</b>使电路两端保持<b>电压</b>，电路中就有持续的<b>电流</b>，小灯泡发光。抽水机越“强”，水位差越大；电池节数越多，电压越高（现在 ' + U() + ' V），电流越大，灯泡越亮。'; }
      else if (st.pump) { k = 'shut'; s = '阀门关上了：虽然有水位差，水也不能流动。同样，开关断开（电路断开），即使有电压，也没有电流。所以，电路中有持续电流的条件是：<b>有电源（电压）</b>，<b>电路是通路</b>。'; }
      else if (st.d > 3 && st.valve) { k = 'fall'; s = '抽水机停了，水位差越来越小，水流越来越弱，最后停止。没有电源，电路两端就没有电压，也就没有电流。'; }
      else { k = 'idle'; s = '甲、乙两边的水面相平，没有水位差，水不流动，水轮机不转。点“开动抽水机”试试。右边是对应的电路：抽水机 ↔ 电源，水轮机 ↔ 小灯泡，阀门 ↔ 开关，水管 ↔ 导线。'; }
      if (k === st.key) return;
      st.key = k; msg.className = 'el-msg ' + c; msg.innerHTML = s;
    }
    const loop = PS.loop((dt) => {
      st.t += dt;
      const target = 45 * st.lv;
      st.q = st.valve ? 0.7 * Math.max(0, st.d) : 0;
      st.p = st.pump ? Math.max(0, st.q + 1.3 * (target - st.d)) : 0;
      st.d = PS.clamp(st.d + 2 * (st.p - st.q) * dt, 0, 240);
      st.wheel += st.q * dt * 0.06;
      tell();
      S.render();
    }, view);

    function pipe(ctx, pts, w, flow, col) {
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = '#868e96'; ctx.lineWidth = w + 8; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
      ctx.strokeStyle = flow > 0.5 ? '#a5d8ff' : '#d0ebff'; ctx.lineWidth = w; ctx.stroke();
      ctx.restore();
      if (flow > 0.5) EL.dots(ctx, pts, st.t * Math.min(260, flow * 2.4), { gap: 24, r: 4.2, color: col || '#1971c2' });
    }
    function tank(ctx, x, w, hWater, name, F) {
      const yb = 400, yt = 120;
      ctx.fillStyle = 'rgba(165,216,255,.75)'; ctx.fillRect(x, yb - hWater, w, hWater);
      ctx.strokeStyle = '#1c7ed6'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, yb - hWater); ctx.lineTo(x + w, yb - hWater); ctx.stroke();
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, yt); ctx.lineTo(x, yb); ctx.lineTo(x + w, yb); ctx.lineTo(x + w, yt); ctx.stroke();
      D.text(ctx, name, x + w / 2, yb + F(15) + 6, { size: F(15), weight: 800, align: 'center', color: '#1b2333' });
    }
    function water(ctx, F) {
      const H0 = 130, hA = H0 + st.d / 2, hB = H0 - st.d / 2;
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, 600, 470);
      tank(ctx, 40, 150, hA, '甲', F); tank(ctx, 380, 150, hB, '乙', F);
      // 底部水管（经过阀门和水轮机）
      pipe(ctx, [[190, 385], [380, 385]], 20, st.q);
      // 阀门
      ctx.fillStyle = st.valve ? '#2b8a3e' : '#e03131'; ctx.fillRect(222, 368, 10, 34);
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(227, 368); ctx.lineTo(227, 350); ctx.stroke();
      ctx.save(); ctx.translate(227, 348); ctx.rotate(st.valve ? 0 : Math.PI / 2); ctx.fillStyle = '#495057'; ctx.fillRect(-14, -3, 28, 6); ctx.restore();
      D.text(ctx, '阀门', 227, 338 - F(12) * 0.6, { size: F(12), weight: 700, align: 'center', color: '#495057' });
      // 水轮机
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#495057'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(300, 385, 30, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.translate(300, 385); ctx.rotate(st.wheel);
      ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 4; for (let i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(25, 0); ctx.stroke(); ctx.fillStyle = '#e8590c'; ctx.fillRect(18, -6, 8, 12); }
      ctx.restore();
      D.text(ctx, '水轮机', 300, 432 + F(12) * 0.4, { size: F(12), weight: 700, align: 'center', color: '#e8590c' });
      // 抽水管：从乙的水中抽到甲的上方
      pipe(ctx, [[500, 380], [500, 70], [110, 70], [110, 112]], 16, st.p, '#1864ab');
      if (st.p > 0.5) { ctx.fillStyle = 'rgba(77,171,247,.7)'; ctx.fillRect(105, 112, 10, Math.max(0, 400 - hA - 112)); }
      // 抽水机
      ctx.fillStyle = '#495057'; D.roundRect(ctx, 250, 44, 100, 52, 10); ctx.fill();
      ctx.save(); ctx.translate(300, 70); ctx.rotate(st.p > 0.5 || st.pump ? st.t * 6 : 0); ctx.strokeStyle = '#ffd43b'; ctx.lineWidth = 4; for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(17, 0); ctx.stroke(); } ctx.restore();
      D.text(ctx, '抽水机' + (st.pump ? '（工作中）' : ''), 300, 30 - F(12) * 0.2, { size: F(12), weight: 800, align: 'center', color: st.pump ? '#2b8a3e' : '#495057' });
      // 水位差
      const yA = 400 - hA, yB = 400 - hB;
      if (st.d > 4) {
        ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = '#1c7ed6'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(190, yA); ctx.lineTo(560, yA); ctx.stroke(); ctx.restore();
        D.arrow(ctx, 556, yA + 2, 556, yB - 2, { color: '#1c7ed6', width: 2.5, head: 9 });
        D.arrow(ctx, 556, yB - 2, 556, yA + 2, { color: '#1c7ed6', width: 2.5, head: 9 });
        D.text(ctx, '水位差', 556, (yA + yB) / 2 - F(12) * 0.7, { size: F(12), weight: 800, align: 'center', color: '#1c7ed6', bg: 'rgba(255,255,255,.9)' });
        D.text(ctx, '（水压）', 556, (yA + yB) / 2 + F(12) * 0.7, { size: F(12), weight: 700, align: 'center', color: '#1c7ed6', bg: 'rgba(255,255,255,.9)' });
      }
    }
    function circuit(ctx, F, k) {
      ctx.fillStyle = '#fff'; D.roundRect(ctx, -170, -190, 340, 380, 14); ctx.fill();
      ctx.strokeStyle = '#dee2e6'; ctx.lineWidth = 1.5; ctx.stroke();
      const C = EL.circuit(EL.layout({ s: [{ k: 'S', on: st.valve, label: '开关', seg: 3, pos: 0.5 }, { k: 'L', label: '小灯泡', seg: 2, pos: 0.5 }] }, { x: -120, y: -120, w: 240, h: 220, Lc: 58, bat: { n: st.lv, E: U(), r: st.pump ? 0.5 * st.lv : 1e3 } }));
      C.solve();
      C.spec.els.forEach((e) => { C.ph[e.id] = st.t * EL.speed(I()); });
      C.draw(ctx, { F: (p) => F(p) / k, dots: st.pump && st.valve, size: 26, lw: 2.6 });
      const bx = 0, by = 100;
      if (!st.pump) {
        ctx.fillStyle = 'rgba(248,249,250,.92)'; D.roundRect(ctx, bx - 44, by - 26, 88, 52, 8); ctx.fill();
        D.text(ctx, '没有电源', bx, by, { size: F(13) / k, weight: 800, align: 'center', baseline: 'middle', color: '#868e96' });
      } else D.text(ctx, '电源 ' + U() + ' V', bx, by + 26 + F(13) / k, { size: F(13) / k, weight: 800, align: 'center', color: '#e8590c' });
      D.text(ctx, '对应的电路', 0, -160 + F(14) / k * 0.4, { size: F(14) / k, weight: 800, align: 'center', color: '#3b5bdb' });
      D.text(ctx, '电流 ' + PS.fmt(I(), 2) + ' A', 0, 178 - F(13) / k * 0.3, { size: F(13) / k, weight: 700, align: 'center', color: '#e8590c' });
    }
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, 1000, VH), nar = VH > 600;
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, 1000, VH);
      if (!nar) {
        ctx.save(); water(ctx, F); ctx.restore();
        ctx.save(); ctx.translate(800, 245); circuit(ctx, F, 1); ctx.restore();
      } else {
        const k = 1000 / 600;
        ctx.save(); ctx.scale(k, k); water(ctx, (p) => F(p) / k); ctx.restore();
        const k2 = 1.6;
        ctx.save(); ctx.translate(500, 810 + 190 * k2); ctx.scale(k2, k2); circuit(ctx, F, k2); ctx.restore();
      }
    }
    ui();
    loop.start();
    el._st = st;
  });

  /* ================= 电压的作用与常见的电压 ================= */
  PS.register('voltage-scale', function (el) {
    const st = { mode: 'cells', n: 2, t: 0 };
    const a = h('div'), b = h('div', { style: { display: 'none' } });
    const modeSeg = PS.ui.seg([{ value: 'cells', label: '电压的作用' }, { value: 'ladder', label: '常见的电压' }], 'cells', (v) => { st.mode = v; a.style.display = v === 'cells' ? '' : 'none'; b.style.display = v === 'ladder' ? '' : 'none'; });
    const nSeg = PS.ui.seg([1, 2, 3].map((v) => ({ value: v, label: v + ' 节干电池' })), 2, (v) => { st.n = v; tell(); });
    const msg = h('div', { class: 'el-msg info' });
    const view = h('div');
    a.append(h('div', { class: 'controls' }, nSeg.el), view, msg);
    el.append(h('div', { class: 'controls' }, modeSeg.el), a, b);
    const S = EN.stage(view, { VW: 1000, vh: (w) => (EN.narrow(w) ? 960 : 470), draw });
    const R = 12.7, Pn = 1.14;
    const I = () => (1.5 * st.n) / (R + 0.5 * st.n);
    function tell() {
      msg.className = 'el-msg ok';
      msg.innerHTML = st.n + ' 节干电池串联，电压是 <b>' + 1.5 * st.n + ' V</b>，小灯泡' + ['较暗', '较亮', '很亮'][st.n - 1] + '（电流约 ' + PS.fmt(I(), 2) + ' A）。电源两端的<b>电压越高</b>，电路中的<b>电流越大</b>。电压是使电路中形成电流的原因，<b>电源</b>是提供电压的装置。';
      S.render();
    }
    const loop = PS.loop((dt) => { st.t += dt; S.render(); }, view);
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, 1000, VH), nar = VH > 600, k = nar ? 1.25 : 1;
      ctx.fillStyle = '#f3ede2'; ctx.fillRect(0, 0, 1000, VH);
      const i = I(), lit = (i * i * R) / Pn;
      ctx.save();
      if (nar) { ctx.translate(500, 0); ctx.scale(k, k); ctx.translate(-500, 0); }
      const cx = nar ? 500 : 380;
      const bt = REAL.battery(ctx, cx, 405, 100 + st.n * 75, { n: st.n });
      const bl = REAL.bulb(ctx, cx, 205, 150, lit, {});
      const w1 = REAL.wire(ctx, bt.pos, bl.t2, { color: '#e03131', c1: [bt.pos[0] + 120, bt.pos[1]], c2: [bl.t2[0] + 160, bl.t2[1] + 40] });
      const w2 = REAL.wire(ctx, bl.t1, bt.neg, { color: '#212529', c1: [bl.t1[0] - 160, bl.t1[1] + 40], c2: [bt.neg[0] - 120, bt.neg[1]] });
      EL.dots(ctx, w1, st.t * EL.speed(i), { gap: 30, r: 4.5 }); EL.dots(ctx, w2, st.t * EL.speed(i), { gap: 30, r: 4.5 });
      ctx.restore();
      const range = st.n < 3 ? 3 : 15, dx = nar ? 500 : 800, dy = nar ? 760 : 230, dw = nar ? 300 : 250;
      const dl = EL.dial(ctx, dx, dy, dw, vdial({ v: 1.5 * st.n, range, terms: true, sel: ['-', String(range)], F, body: '#2f3d4a' }));
      D.text(ctx, '电压表测电池两端的电压（量程 0~' + range + ' V）', dx, dy - dw * 0.41 - 8, { size: F(13), weight: 800, align: 'center', color: '#1b2333' });
      const T = {}; dl.terms.forEach((t) => { T[t.k] = [t.x, t.y]; });
      const tr = (p) => (nar ? [500 + (p[0] - 500) * k, p[1] * k] : p);
      const bp = tr(bt.pos), bn = tr(bt.neg), tp = T[String(range)], tm = T['-'];
      if (nar) {
        REAL.wire(ctx, tp, bp, { color: '#ae3ec9', w: 4, c1: [tp[0] + 260, tp[1] + 40], c2: [bp[0] + 220, bp[1] + 40] });
        REAL.wire(ctx, tm, bn, { color: '#0c8599', w: 4, c1: [tm[0] - 230, tm[1] + 40], c2: [bn[0] - 220, bn[1] + 40] });
      } else {
        REAL.wire(ctx, tp, bp, { color: '#ae3ec9', w: 4, c1: [tp[0], tp[1] + 80], c2: [bp[0] + 80, bp[1] + 40] });
        REAL.wire(ctx, tm, bn, { color: '#0c8599', w: 4, c1: [tm[0] - 20, tm[1] + 100], c2: [bn[0] - 40, bn[1] + 70] });
      }
      D.text(ctx, '电压越高 → 电流越大 → 灯泡越亮', nar ? 500 : 380, F(14) + 12, { size: F(14), weight: 800, align: 'center', color: '#e8590c' });
    }
    const SUPN = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
    const L = EN.ladder(b, {
      items: [['心电图机测到的心脏电信号', 1e-3, '❤️', '约 1 mV'], ['一节干电池', 1.5, '🔋', '1.5 V'], ['一个铅蓄电池（汽车上用）', 2, '🚗', '2 V'], ['手机电池', 3.7, '📱', '约 3.7 V'], ['对人体安全的电压', 36, '✋', '不高于 36 V'], ['家庭电路', 220, '🏠', '220 V'], ['无轨电车的电源', 600, '🚎', '550～600 V'], ['特高压输电线路', 1e6, '⚡', '可达 1 000 kV（10⁶ V）'], ['发生闪电时云层之间', 1e8, '🌩️', '可达 10⁸ V 以上']],
      lmin: -4, lmax: 9, on: 1,
      tick: (e) => '10' + String(e).split('').map((c) => SUPN[c]).join('') + ' V',
      caption: '电压（V，对数刻度：每一格是前一格的 10 倍）', hint: '点一点图标', fmt: (it) => it[3],
    });
    L.msg.className = 'el-msg info';
    tell();
    loop.start();
  });

  /* ================= 电压表读数练习 ================= */
  PS.register('voltmeter-read', function (el) {
    const view = h('div', { style: { maxWidth: '420px' } });
    const q = h('div', { class: 'el-q' });
    const inp = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', autocomplete: 'off', placeholder: '读数' });
    const fb = h('div', { class: 'el-msg info' });
    const score = h('div', { class: 'small muted' });
    el.append(h('div', { class: 'el-pair' }, view, h('div', null, q, h('div', { class: 'el-ans' }, inp, h('span', null, 'V'), PS.ui.button('提交', check, 'btn btn-primary btn-sm'), PS.ui.button('换一题', next, 'btn btn-ghost btn-sm')), fb, score)));
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    const S = PS.stage(view, { ratio: '1 / 0.86', draw });
    let Q = null, n = 0, ok = 0;
    function next() {
      const range = PS.pick(VR), k = PS.randInt(3, 29);
      Q = { range, v: (k * range) / 30, done: false };
      q.innerHTML = '电压表接的是“<b>−</b>”和“<b>' + range + '</b>”两个接线柱（黄色圆圈）。示数是多少？';
      inp.value = ''; inp.disabled = false;
      fb.className = 'el-msg info'; fb.innerHTML = '读数步骤：① 看量程；② 确定分度值（0~3 V 每小格 0.1 V，0~15 V 每小格 0.5 V）；③ 数指针偏过了几大格、几小格。';
      S.render();
    }
    function check() {
      if (!Q || Q.done) return;
      if (isNaN(parseFloat(inp.value))) { inp.focus(); return; }
      const r = EL.judge(parseFloat(inp.value), Q.v, Q.range, 'V');
      Q.done = true; n++; if (r.ok) ok++; inp.disabled = true;
      fb.className = 'el-msg ' + (r.ok ? 'ok' : 'bad');
      fb.innerHTML = r.ok ? r.hint : r.hint + '<br>正确读数：<b>' + PS.fmt(EL.reading(Q.v, Q.range), 1) + ' V</b>（每小格 ' + PS.round(Q.range / 30, 2) + ' V）。';
      score.innerHTML = '已做 ' + n + ' 题，答对 ' + ok + ' 题。'; r.ok ? PS.sound.good() : PS.sound.bad();
    }
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, 400, 344);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 400, 344);
      if (Q) EL.dial(ctx, 200, 150, 340, vdial({ v: Q.v, range: Q.range, terms: true, sel: ['-', String(Q.range)], F, body: '#2f3d4a' }));
    }
    next();
    el._q = () => Q;
  });

  /* ================= 电压表的使用 ================= */
  const CONN = [
    { value: 'ok', label: '与灯泡并联' },
    { value: 'rev', label: '正、负接线柱接反了' },
    { value: 'series', label: '串联在电路中' },
    { value: 'bat', label: '直接接在电源两极' },
  ];
  PS.register('voltmeter-use', function (el) {
    const st = { conn: 'ok', range: 3, n: 2, on: false, tap: 0, t: 0 };
    const cSeg = PS.ui.seg(CONN, 'ok', (v) => { st.conn = v; st.on = false; solve(); });
    const rSeg = PS.ui.seg([{ value: 3, label: '量程 0~3 V' }, { value: 15, label: '量程 0~15 V' }], 3, (v) => { st.range = v; solve(); });
    const nSeg = PS.ui.seg([{ value: 2, label: '2 节干电池' }, { value: 3, label: '3 节干电池' }], 2, (v) => { st.n = v; st.on = false; solve(); });
    const swBtn = PS.ui.button('闭合开关', () => { st.on = !st.on; st.tap = 0; PS.sound.clack(); solve(); }, 'btn btn-primary btn-sm');
    const tapBtn = PS.ui.button('⚡ 试触（迅速闭合、断开）', () => { st.on = true; st.tap = 0.7; PS.sound.clack(); solve(); }, 'btn btn-sm');
    const msg = h('div', { class: 'el-msg info' });
    const view = h('div');
    el.append(h('div', { class: 'controls' }, h('span', { class: 'small' }, '电压表的接法：'), cSeg.el), h('div', { class: 'controls' }, rSeg.el, nSeg.el), view, h('div', { class: 'controls', style: { marginTop: '6px' } }, swBtn, tapBtn), msg);
    const S = EN.stage(view, { VW: 1000, vh: (w) => (EN.narrow(w) ? 700 : 540), draw });
    let sol = null, nets = null;
    /* 节点：p、n 电池正负极，s1、s2 开关，l1、l2 灯泡（电流从 l2 流入），vP 电压表所选量程的“+”接线柱，vM “−”接线柱 */
    const MAIN = [['wA', 'p', 's1'], ['wL', 's2', 'l2'], ['wN', 'l1', 'n']];
    const WIRES = {
      ok: MAIN.concat([['wP', 'l2', 'vP'], ['wQ', 'vM', 'l1']]),
      rev: MAIN.concat([['wP', 'l2', 'vM'], ['wQ', 'vP', 'l1']]),
      series: [['wA', 'p', 'vP'], ['wB', 'vM', 's1'], ['wL', 's2', 'l2'], ['wN', 'l1', 'n']],
      bat: MAIN.concat([['wP', 'p', 'vP'], ['wQ', 'vM', 'n']]),
    };
    function net() {
      const els = [{ id: 'E', t: 'bat', a: 'p', b: 'n', E: 1.5 * st.n, r: 0.25 * st.n }, { id: 'S', t: 'sw', a: 's1', b: 's2', on: st.on },
        { id: 'L', t: 'bulb', a: 'l2', b: 'l1', R: 10, Pn: 0.9 }, { id: 'V', t: 'vm', a: 'vP', b: 'vM' }];
      WIRES[st.conn].forEach(([id, a, b]) => els.push({ id, t: 'wire', a, b }));
      return { els };
    }
    const Uv = () => EL.vread(nets, sol, 'V');
    function solve() {
      nets = net(); sol = EL.solve(nets);
      swBtn.innerHTML = st.on && !st.tap ? '断开开关' : '闭合开关';
      const v = Uv(), E = 1.5 * st.n, rd = (x) => PS.fmt(EL.reading(x, st.range), 1);
      let s, c = 'info';
      const live = st.on || st.conn === 'bat';
      if (!live) s = { ok: '电压表与灯泡<b>并联</b>，“+”接线柱接在靠近电源正极的一端。闭合开关看看。不知道电压大小时，先用<b>大量程“试触”</b>。', rev: '电压表与灯泡并联，但电流将从“−”接线柱流入。闭合开关（或试触）看看会怎样。', series: '电压表像电流表那样<b>串联</b>在电路中了。闭合开关看看会怎样。' }[st.conn];
      else if (st.conn === 'rev') { s = '⚠️ 指针<b>反向偏转</b>（向零刻度线左边偏），可能打弯指针、损坏电压表！电流必须从“+”接线柱流入、从“−”接线柱流出：“+”接线柱要接在靠近电源正极的一端。'; c = 'bad'; }
      else if (v > st.range) { s = '⚠️ 指针偏转<b>超过了量程</b>（打到头），会损坏电压表。' + (st.tap ? '试触发现电压较高，应改用 <b>0~15 V</b> 的大量程。' : '应断开开关，改用 0~15 V 的大量程。') + (st.n === 3 ? '（3 节干电池串联，电压约 4.5 V，超过了 3 V。）' : ''); c = 'bad'; }
      else if (st.conn === 'series') { s = '灯泡<b>不亮</b>，电压表的示数约 ' + rd(v) + ' V，<b>接近电源电压</b>。电压表的电阻很大，串联在电路中时电路中几乎没有电流。电压表不会被烧坏，但测不出灯泡两端的电压——电压表要与被测用电器<b>并联</b>。'; c = 'bad'; }
      else if (st.range === 15 && v < 3) { s = '示数约 ' + rd(v) + ' V。指针偏转角度很小，读数不精确。' + (st.tap ? '试触发现电压小于 3 V，应改用 <b>0~3 V</b> 的小量程。' : '电压小于 3 V 时应改用 0~3 V 的小量程，读数更精确。'); }
      else if (st.conn === 'bat') { s = '✔ 电压表直接接在电源两极上，测的是<b>电源两端的电压</b>：<b>' + rd(v) + ' V</b>' + (st.on ? '' : '（开关断开时也有示数，约等于 ' + E + ' V）') + '。电压表<b>可以</b>直接接在电源两极上——这一点和电流表正好相反。'; c = 'ok'; }
      else { s = '✔ 电压表的示数是 <b>' + rd(v) + ' V</b>，这是<b>灯泡两端的电压</b>（量程 0~' + st.range + ' V，分度值 ' + PS.round(st.range / 30, 2) + ' V）。'; c = 'ok'; }
      msg.className = 'el-msg ' + c; msg.innerHTML = s;
      S.render();
    }
    const loop = PS.loop((dt) => {
      st.t += dt;
      if (st.tap > 0) { st.tap -= dt; if (st.tap <= 0) { st.tap = 0; st.on = false; solve(); } }
      S.render();
    }, view);
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, 1000, VH), nar = VH > 600, k = nar ? 1.2 : 1;
      ctx.fillStyle = '#f3ede2'; ctx.fillRect(0, 0, 1000, VH);
      ctx.save(); ctx.translate(500, 0); ctx.scale(k, k); ctx.translate(-500, 0);
      const fs = F(14) / k, I = (id) => (sol ? sol.I[id] || 0 : 0);
      const bt = REAL.battery(ctx, 250, 480, 120 + st.n * 45, { n: st.n });
      const sw = REAL.sw(ctx, 780, 480, 160, st.on, { label: '开关', fs });
      const lit = Math.max(0, (sol ? sol.P.L || 0 : 0) / 0.9);
      const ld = REAL.bulb(ctx, 400, 330, 150, lit, {});
      D.text(ctx, '小灯泡', 400, 205, { size: fs, weight: 800, align: 'center', color: '#1b2333' });
      const ax = 720, ay = 150, aw = 190;
      const dl = EL.dial(ctx, ax, ay, aw, vdial({ v: Uv(), range: st.range, terms: true, sel: ['-', String(st.range)], F: (p) => p, body: '#2f3d4a' }));
      const T = {}; dl.terms.forEach((t) => { T[t.k] = [t.x, t.y]; });
      const POS = { p: bt.pos, n: bt.neg, s1: sw.t1, s2: sw.t2, l1: ld.t1, l2: ld.t2, vP: T[String(st.range)], vM: T['-'] };
      const CP = {
        'p-s1': [[bt.pos[0] + 120, bt.pos[1] + 40], [sw.t1[0] - 120, sw.t1[1] + 40]],
        's2-l2': [[sw.t2[0] + 60, sw.t2[1] - 90], [ld.t2[0] + 110, ld.t2[1] + 70]], 'l1-n': [[ld.t1[0] - 90, ld.t1[1] + 30], [bt.neg[0] - 50, bt.neg[1] - 60]],
        'l2-vP': [[ld.t2[0] + 70, ld.t2[1] - 50], [POS.vP[0] - 30, POS.vP[1] + 55]], 'l2-vM': [[ld.t2[0] + 60, ld.t2[1] - 50], [POS.vM[0] - 20, POS.vM[1] + 55]],
        'vM-l1': [[POS.vM[0] - 20, POS.vM[1] + 110], [ld.t1[0] - 40, ld.t1[1] + 90]], 'vP-l1': [[POS.vP[0] - 20, POS.vP[1] + 120], [ld.t1[0] - 40, ld.t1[1] + 100]],
        'p-vP': [[bt.pos[0] + 140, bt.pos[1] - 70], [POS.vP[0], POS.vP[1] + 90]], 'vM-s1': [[POS.vM[0] - 20, POS.vM[1] + 90], [sw.t1[0] - 30, sw.t1[1] - 70]],
        'vM-n': [[POS.vM[0] - 30, POS.vM[1] + 140], [bt.neg[0] - 90, bt.neg[1] + 50]],
      };
      const COL = { wA: '#e03131', wB: '#f59f00', wL: '#1c7ed6', wN: '#212529', wP: '#ae3ec9', wQ: '#0c8599' };
      WIRES[st.conn].forEach(([id, a, b]) => {
        const cp = CP[a + '-' + b], cur = I(id);
        const pts = REAL.wire(ctx, POS[a], POS[b], Object.assign({ color: COL[id] }, cp ? { c1: cp[0], c2: cp[1] } : { sag: 30 }));
        if (Math.abs(cur) > 0.003) EL.dots(ctx, pts, st.t * EL.speed(cur), { gap: 30, r: 4 });
      });
      D.text(ctx, '电压表', ax, ay - aw * 0.52, { size: fs, weight: 800, align: 'center', color: '#1b2333' });
      ctx.restore();
    }
    solve();
    loop.start();
    el._st = st; el._U = Uv;
  });

  /* ================= 填电表、电压表测谁的电压 ================= */
  /* 电路用固定坐标画（虚拟画布 600 × 440），X1、X2… 是待填的圆圈；电压表 V 的 a 端为“+”接线柱 */
  const W = (id, a, b, via) => ({ id, t: 'wire', a, b, via: via || [] });
  const FILL = [
    { n: '一个灯泡', note: '与灯泡串联的是电流表，与灯泡并联的是电压表。', ans: { X1: 'amm', X2: 'vm' },
      pos: { bp: [330, 370], bn: [270, 370], x1a: [520, 300], x1b: [520, 200], la: [350, 110], lb: [250, 110], sa: [100, 200], sb: [100, 300], x2a: [350, 40], x2b: [250, 40] },
      els: [{ id: 'E', t: 'bat', a: 'bp', b: 'bn', n: 2 }, W('w1', 'bp', 'x1a', [[520, 370]]), { id: 'X1', t: 'x', a: 'x1a', b: 'x1b' }, W('w2', 'x1b', 'la', [[520, 110]]), { id: 'L', t: 'bulb', a: 'la', b: 'lb', label: 'L' }, W('w3', 'lb', 'sa', [[100, 110]]), { id: 'S', t: 'sw', a: 'sa', b: 'sb', on: true, label: 'S', ls: -1 }, W('w4', 'sb', 'bn', [[100, 370]]), W('w5', 'la', 'x2a'), { id: 'X2', t: 'x', a: 'x2a', b: 'x2b' }, W('w6', 'x2b', 'lb')] },
    { n: '两灯串联', note: 'X1 与 L1 并联，是电压表（测 L1 两端的电压）；X2 串联在电路中，是电流表。', ans: { X1: 'vm', X2: 'amm' },
      pos: { bp: [330, 370], bn: [270, 370], x2a: [520, 300], x2b: [520, 200], l1a: [450, 110], l1b: [370, 110], l2a: [250, 110], l2b: [170, 110], sa: [100, 200], sb: [100, 300], x1a: [450, 40], x1b: [370, 40] },
      els: [{ id: 'E', t: 'bat', a: 'bp', b: 'bn', n: 2 }, W('w1', 'bp', 'x2a', [[520, 370]]), { id: 'X2', t: 'x', a: 'x2a', b: 'x2b' }, W('w2', 'x2b', 'l1a', [[520, 110]]), { id: 'L1', t: 'bulb', a: 'l1a', b: 'l1b', label: 'L1' }, W('w3', 'l1b', 'l2a'), { id: 'L2', t: 'bulb', a: 'l2a', b: 'l2b', label: 'L2' }, W('w4', 'l2b', 'sa', [[100, 110]]), { id: 'S', t: 'sw', a: 'sa', b: 'sb', on: true, label: 'S', ls: -1 }, W('w5', 'sb', 'bn', [[100, 370]]), W('w6', 'l1a', 'x1a'), { id: 'X1', t: 'x', a: 'x1a', b: 'x1b' }, W('w7', 'x1b', 'l1b')] },
    { n: '两灯并联', note: 'X1 在干路上，是电流表（测干路电流）；X2 与 L1 并联，是电压表。', ans: { X1: 'amm', X2: 'vm' },
      pos: { bp: [330, 370], bn: [270, 370], x1a: [520, 340], x1b: [520, 260], jr: [520, 220], jl: [100, 220], l1a: [350, 110], l1b: [250, 110], l2a: [350, 220], l2b: [250, 220], sa: [100, 260], sb: [100, 340], x2a: [350, 40], x2b: [250, 40] },
      els: [{ id: 'E', t: 'bat', a: 'bp', b: 'bn', n: 2 }, W('w1', 'bp', 'x1a', [[520, 370]]), { id: 'X1', t: 'x', a: 'x1a', b: 'x1b' }, W('w2', 'x1b', 'jr'), W('w3', 'jr', 'l1a', [[520, 110]]), { id: 'L1', t: 'bulb', a: 'l1a', b: 'l1b', label: 'L1' }, W('w4', 'l1b', 'jl', [[100, 110]]), W('w5', 'jr', 'l2a'), { id: 'L2', t: 'bulb', a: 'l2a', b: 'l2b', label: 'L2', ls: -1 }, W('w6', 'l2b', 'jl'), W('w7', 'jl', 'sa'), { id: 'S', t: 'sw', a: 'sa', b: 'sb', on: true, label: 'S', ls: -1 }, W('w8', 'sb', 'bn', [[100, 370]]), W('w9', 'l1a', 'x2a'), { id: 'X2', t: 'x', a: 'x2a', b: 'x2b' }, W('w10', 'x2b', 'l1b')] },
    { n: '三个圆圈', note: 'X1 与 L1 并联，是电压表；X2 并联在 L1 和 L2 两端，也是电压表；X3 串联在电路中，是电流表。', ans: { X1: 'vm', X2: 'vm', X3: 'amm' },
      pos: { bp: [330, 390], bn: [270, 390], x3a: [520, 330], x3b: [520, 240], l1a: [450, 150], l1b: [370, 150], l2a: [250, 150], l2b: [170, 150], sa: [100, 240], sb: [100, 330], x1a: [450, 85], x1b: [370, 85], x2a: [350, 28], x2b: [270, 28] },
      els: [{ id: 'E', t: 'bat', a: 'bp', b: 'bn', n: 2 }, W('w1', 'bp', 'x3a', [[520, 390]]), { id: 'X3', t: 'x', a: 'x3a', b: 'x3b' }, W('w2', 'x3b', 'l1a', [[520, 150]]), { id: 'L1', t: 'bulb', a: 'l1a', b: 'l1b', label: 'L1', ls: -1 }, W('w3', 'l1b', 'l2a'), { id: 'L2', t: 'bulb', a: 'l2a', b: 'l2b', label: 'L2' }, W('w4', 'l2b', 'sa', [[100, 150]]), { id: 'S', t: 'sw', a: 'sa', b: 'sb', on: true, label: 'S', ls: -1 }, W('w5', 'sb', 'bn', [[100, 390]]), W('w6', 'l1a', 'x1a'), { id: 'X1', t: 'x', a: 'x1a', b: 'x1b' }, W('w7', 'x1b', 'l1b'), W('w8', 'x1a', 'x2a', [[450, 28]]), { id: 'X2', t: 'x', a: 'x2a', b: 'x2b' }, W('w9', 'x2b', 'l2b', [[170, 28]])] },
  ];
  /* 电压表测谁的电压：L1 10 Ω、L2 20 Ω，电源 3 V（U1 = 1 V、U2 = 2 V） */
  const BASE = {
    pos: { bp: [340, 380], bn: [280, 380], r: [430, 380], q: [200, 380], l1a: [450, 120], l1b: [370, 120], m: [310, 120], l2a: [250, 120], l2b: [170, 120], sa: [100, 200], sb: [100, 290] },
    els: [{ id: 'E', t: 'bat', a: 'bp', b: 'bn', n: 2, E: 3, r: 0.001 }, W('b1', 'bp', 'r'), W('b2', 'r', 'l1a', [[520, 380], [520, 120]]), { id: 'L1', t: 'bulb', a: 'l1a', b: 'l1b', R: 10, label: 'L1', ls: -1 }, W('b3', 'l1b', 'm'), W('b4', 'm', 'l2a'), { id: 'L2', t: 'bulb', a: 'l2a', b: 'l2b', R: 20, label: 'L2', ls: -1 }, W('b5', 'l2b', 'sa', [[100, 120]]), { id: 'S', t: 'sw', a: 'sa', b: 'sb', on: true, label: 'S', ls: -1 }, W('b6', 'sb', 'q', [[100, 380]]), W('b7', 'q', 'bn')],
  };
  const WHO = [
    { ans: 'L1', pos: { va: [450, 50], vb: [370, 50] }, els: [W('v1', 'l1a', 'va'), { id: 'V', t: 'vm', a: 'va', b: 'vb', label: '' }, W('v2', 'vb', 'l1b')], note: '电压表的两端直接接在 L1 的两端，测 L1 两端的电压。' },
    { ans: 'L2', pos: { va: [200, 190], vb: [200, 290] }, els: [W('v1', 'm', 'va', [[310, 160], [200, 160]]), { id: 'V', t: 'vm', a: 'va', b: 'vb', label: '' }, W('v2', 'vb', 'q')], note: '从电压表的两端出发，沿导线走到用电器：一端到 L1、L2 之间，另一端经过闭合的开关 S 到 L2 的另一端——电压表与 <b>L2</b> 并联（开关两端的电压几乎为零）。' },
    { ans: 'L1', pos: { va: [430, 300], vb: [430, 200] }, els: [W('v1', 'r', 'va'), { id: 'V', t: 'vm', a: 'va', b: 'vb', label: '' }, W('v2', 'vb', 'm', [[430, 160], [310, 160]])], note: '电压表的一端接在电源正极与 L1 之间（导线上各点相当于同一点），另一端接在 L1、L2 之间——它与 <b>L1</b> 并联，不是测电源电压。' },
    { ans: 'both', pos: { va: [350, 50], vb: [270, 50] }, els: [W('v1', 'l1a', 'va', [[450, 50]]), { id: 'V', t: 'vm', a: 'va', b: 'vb', label: '' }, W('v2', 'vb', 'l2b', [[170, 50]])], note: '电压表的两端分别接在 L1 右边的一端和 L2 左边的一端，与 L1、L2 整体并联，测的是 L1 和 L2 两端的总电压，也就是电源电压。' },
    { ans: 'L2', pos: { va: [250, 200], vb: [170, 200] }, els: [W('v1', 'l2a', 'va'), { id: 'V', t: 'vm', a: 'va', b: 'vb', label: '' }, W('v2', 'vb', 'l2b')], note: '电压表直接并联在 L2 两端，测 L2 两端的电压。' },
  ];
  const WHO_OPT = [['L1', 'L1 两端'], ['L2', 'L2 两端'], ['both', 'L1 和 L2 两端（电源电压）']];

  PS.register('meter-judge', function (el) {
    const st = { mode: 'fill', i: 0, pick: {}, done: false, sol: null, spec: null, n: 0, ok: 0, order: { fill: [], who: [] } };
    const modeSeg = PS.ui.seg([{ value: 'fill', label: '填电表（A 还是 V）' }, { value: 'who', label: '电压表测谁的电压' }], 'fill', (v) => { st.mode = v; next(); });
    const view = h('div');
    const q = h('div', { class: 'el-q' });
    const opts = h('div', { class: 'el-chips' });
    const fb = h('div', { class: 'el-msg info' });
    const score = h('div', { class: 'small muted' });
    el.append(h('div', { class: 'controls' }, modeSeg.el), h('div', { class: 'el-pair mj-pair' }, view, h('div', null, q, opts, fb, h('div', { class: 'controls', style: { marginTop: '6px' } }, PS.ui.button('换一题', next, 'btn btn-ghost btn-sm')), score)));
    const S = PS.stage(view, { ratio: '600 / 440', draw });
    const VW = 600, VH = 440;
    function take(mode) {
      const list = st.order[mode], N = mode === 'fill' ? FILL.length : WHO.length;
      if (!list.length) { for (let i = 0; i < N; i++) list.push(i); for (let i = N - 1; i > 0; i--) { const j = PS.randInt(0, i); const t = list[i]; list[i] = list[j]; list[j] = t; } }
      return list.shift();
    }
    function build() {
      if (st.mode === 'fill') {
        const P = FILL[st.i];
        st.spec = { pos: Object.assign({}, P.pos), els: P.els.map((e) => (e.t === 'x' ? Object.assign({}, e, { t: st.pick[e.id] || 'vm', x: true }) : Object.assign({}, e))) };
      } else {
        const P = WHO[st.i];
        st.spec = { pos: Object.assign({}, BASE.pos, P.pos), els: BASE.els.concat(P.els).map((e) => Object.assign({}, e)) };
      }
      st.C = EL.circuit(st.spec);
      st.sol = st.C.solve();
    }
    function next() {
      st.i = take(st.mode); st.pick = {}; st.done = false;
      build();
      opts.innerHTML = '';
      if (st.mode === 'fill') {
        const P = FILL[st.i], xs = Object.keys(P.ans);
        q.innerHTML = '<b>' + P.n + '：</b>点一点电路图中的圆圈 ' + xs.join('、') + '，填入电流表 Ⓐ 或电压表 Ⓥ，使开关闭合后' + (P.n === '一个灯泡' ? '灯泡' : '两灯都') + '能发光、电表都能正常测量。';
        opts.append(PS.ui.button('闭合开关检验', check, 'btn btn-primary btn-sm'));
        fb.className = 'el-msg info'; fb.innerHTML = '判断方法：与用电器<b>串联</b>的是电流表，与用电器<b>并联</b>的是电压表。电流表相当于一根导线，电压表相当于断开的。';
      } else {
        q.innerHTML = '开关闭合后，电压表测的是哪部分电路两端的电压？';
        WHO_OPT.forEach(([k, t]) => opts.append(PS.ui.button(t, () => answer(k), 'btn btn-sm')));
        fb.className = 'el-msg info'; fb.innerHTML = '方法：从电压表的两个接线柱出发，沿导线走（可以经过闭合的开关、电流表，不经过电源和用电器），看它的两端分别到了哪里，电压表就与这两点之间的用电器<b>并联</b>。';
      }
      S.render();
    }
    function check() {
      const P = FILL[st.i], xs = Object.keys(P.ans);
      if (xs.some((x) => !st.pick[x])) { fb.className = 'el-msg bad'; fb.innerHTML = '还有圆圈没有填。点一下圆圈，在 Ⓐ 和 Ⓥ 之间切换。'; return; }
      build(); st.done = true;
      const sol = st.sol, find = EL.groups(st.spec);
      const bulbs = st.spec.els.filter((e) => e.t === 'bulb');
      const lines = bulbs.map((b) => b.label + (st.C.lit(b.id) > 0.04 ? ' 发光' : ' 不亮') + (find(b.a) === find(b.b) ? '（被电流表短路）' : ''));
      st.spec.els.filter((e) => e.x).forEach((e) => {
        if (e.t === 'amm') lines.push(e.id + '（电流表）示数 ' + PS.fmt(Math.abs(sol.I[e.id] || 0), 2) + ' A');
        else lines.push(e.id + '（电压表）示数 ' + PS.fmt((sol.V[e.a] || 0) - (sol.V[e.b] || 0), 1) + ' V');
      });
      const good = xs.every((x) => st.pick[x] === P.ans[x]);
      st.n++; if (good) st.ok++;
      const why = xs.filter((x) => st.pick[x] !== P.ans[x]).map((x) => P.ans[x] === 'vm' ? x + ' 处若是电流表，它与用电器并联，会把用电器短路（甚至造成电源短路）。' : x + ' 处若是电压表，它串联在电路中，电路中几乎没有电流，灯泡不亮。');
      fb.className = 'el-msg ' + (good ? 'ok' : 'bad');
      fb.innerHTML = (good ? '✔ 正确！' : '✘ 不对。') + lines.join('；') + (sol.short.length ? '；⚠️ 电源被短路了！' : '') + '。<br>' + (good ? P.note : why.join('') + '<br>正确答案：' + xs.map((x) => x + ' 是' + (P.ans[x] === 'amm' ? '电流表' : '电压表')).join('，') + '。');
      score.innerHTML = '已做 ' + st.n + ' 题，答对 ' + st.ok + ' 题。'; good ? PS.sound.good() : PS.sound.bad();
      S.render();
    }
    function answer(k) {
      if (st.done) return;
      const P = WHO[st.i], good = k === P.ans;
      st.done = true; st.n++; if (good) st.ok++;
      const sol = st.sol, U = (a, b) => PS.fmt((sol.V[a] || 0) - (sol.V[b] || 0), 1);
      const name = { L1: 'L1 两端的电压', L2: 'L2 两端的电压', both: 'L1 和 L2 两端的总电压（电源电压）' };
      fb.className = 'el-msg ' + (good ? 'ok' : 'bad');
      fb.innerHTML = (good ? '✔ 正确！' : '✘ 不对，测的是' + name[P.ans] + '。') + P.note + '<br>数据验证：U₁ = ' + U('l1a', 'l1b') + ' V，U₂ = ' + U('l2a', 'l2b') + ' V，电压表的示数 = ' + U(st.spec.els.find((e) => e.id === 'V').a, st.spec.els.find((e) => e.id === 'V').b) + ' V。';
      score.innerHTML = '已做 ' + st.n + ' 题，答对 ' + st.ok + ' 题。'; good ? PS.sound.good() : PS.sound.bad();
      S.render();
    }
    const xEls = () => (st.mode === 'fill' ? FILL[st.i].els.filter((e) => e.t === 'x') : []);
    const xc = (e) => { const a = st.spec.pos[e.a], b = st.spec.pos[e.b]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
    PS.drag(S, { VW, VH, hit: (p) => { const e = xEls().find((x) => Math.hypot(p.x - xc(x)[0], p.y - xc(x)[1]) < 30); return e || null; }, start: (e) => { if (st.done) { st.done = false; } st.pick[e.id] = st.pick[e.id] === 'amm' ? 'vm' : 'amm'; PS.sound.tick(); build(); fb.className = 'el-msg info'; fb.innerHTML = '填好后点“闭合开关检验”。'; S.render(); }, move() {} });
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, VW, VH);
      if (!st.C) return;
      const fill = st.mode === 'fill', skip = {};
      if (fill) st.spec.els.forEach((e) => { if (e.x) skip[e.id] = true; });
      const hl = {};
      if (!fill && st.done) { const a = WHO[st.i].ans; if (a !== 'L2') hl.L1 = '#f08c00'; if (a !== 'L1') hl.L2 = '#f08c00'; }
      st.C.step(0);
      st.C.draw(ctx, { F, size: 30, lw: 2.6, skip, hl, labels: true });
      if (fill) xEls().forEach((x, i) => {
        const e = st.spec.els.find((y) => y.id === x.id), a = st.spec.pos[e.a], b = st.spec.pos[e.b], c = xc(x);
        const pk = st.pick[x.id];
        if (pk) EL.sym(ctx, pk, a[0], a[1], b[0], b[1], { F, size: 30, lw: 2.6 });
        else {
          EL.sym(ctx, 'wire', a[0], a[1], b[0], b[1], { lw: 2.6 });
          ctx.fillStyle = '#fff3bf'; ctx.strokeStyle = '#f08c00'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(c[0], c[1], 18, 0, TAU); ctx.fill(); ctx.stroke();
          D.text(ctx, '?', c[0], c[1] + 1, { size: F(16), weight: 900, align: 'center', baseline: 'middle', color: '#e8590c' });
        }
        const vert = Math.abs(a[0] - b[0]) < 1;
        D.text(ctx, x.id, c[0] + (vert ? 34 : 0), c[1] + (vert ? 0 : -30), { size: F(13), weight: 800, align: 'center', baseline: 'middle', color: '#e8590c' });
      });
      if (!fill && st.done) {
        const sol = st.sol, U = (a, b) => PS.fmt((sol.V[a] || 0) - (sol.V[b] || 0), 1) + ' V';
        D.text(ctx, 'U₁ = ' + U('l1a', 'l1b'), 410, 160, { size: F(13), weight: 800, align: 'center', color: '#e8590c', bg: 'rgba(255,255,255,.9)' });
        D.text(ctx, 'U₂ = ' + U('l2a', 'l2b'), 210, 160, { size: F(13), weight: 800, align: 'center', color: '#e8590c', bg: 'rgba(255,255,255,.9)' });
      }
      D.text(ctx, fill ? '点圆圈切换 Ⓐ / Ⓥ' : '开关 S 已闭合', 12, VH - 12, { size: F(12), color: '#868e96' });
    }
    next();
    el._st = st; el._check = check; el._answer = answer;
  });

  if (!document.getElementById('vt-style')) document.head.append(h('style', { id: 'vt-style' }, `
    .mj-pair{grid-template-columns:minmax(0,1fr) minmax(0,320px)}
    @media (max-width:680px){.mj-pair{grid-template-columns:minmax(0,1fr)}}
  `));
})();
