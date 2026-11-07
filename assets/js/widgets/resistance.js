/* 第16章第3节：电阻——导体对电流的阻碍作用与常见的电阻 resist-intro、影响电阻大小的因素 resist-factors、
 * 会改变导体的电阻吗 resist-sort、半导体和超导现象 semi-super。依赖 circuit.js、energy.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, EL = PS.el, EN = PS.en, REAL = EL.real;
  const TAU = Math.PI * 2;

  /* 教材表：长 1 m、横截面积 1 mm² 的导体在 20 ℃ 时的电阻（Ω）；a 为电阻的温度系数（/℃，示意） */
  const RHO = [
    { k: 'ag', n: '银', r: 0.016, a: 0.0038, c: '#ced4da' },
    { k: 'cu', n: '铜', r: 0.017, a: 0.0039, c: '#d9822b' },
    { k: 'al', n: '铝', r: 0.027, a: 0.0039, c: '#b8c2cc' },
    { k: 'w', n: '钨', r: 0.052, a: 0.0045, c: '#868e96' },
    { k: 'fe', n: '铁', r: 0.096, a: 0.005, c: '#5c636a' },
    { k: 'mn', n: '锰铜合金', r: 0.44, a: 0.00001, c: '#b08968' },
    { k: 'ni', n: '镍铬合金', r: 1.1, a: 0.0001, c: '#9aa3ad' },
  ];
  PS.RHO_TABLE = RHO;
  const fR = (R) => (R >= 100 ? PS.fmt(R, 0) : R >= 10 ? PS.fmt(R, 1) : R >= 1 ? PS.fmt(R, 2) : PS.fmt(R, 3));

  /** 画一段圆柱形导体（侧视）：从 x0 到 x1，中心 y，粗 d */
  function rod(ctx, x0, x1, y, d, col, o) {
    o = o || {};
    const g = ctx.createLinearGradient(0, y - d / 2, 0, y + d / 2);
    g.addColorStop(0, PS.mixColor(col, '#ffffff', 0.55)); g.addColorStop(0.45, col); g.addColorStop(1, PS.mixColor(col, '#000000', 0.35));
    ctx.fillStyle = g; ctx.fillRect(x0, y - d / 2, x1 - x0, d);
    ctx.fillStyle = PS.mixColor(col, '#000000', 0.15); ctx.beginPath(); ctx.ellipse(x1, y, Math.max(1.5, d * 0.18), d / 2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = PS.mixColor(col, '#ffffff', 0.25); ctx.beginPath(); ctx.ellipse(x0, y, Math.max(1.5, d * 0.18), d / 2, 0, 0, TAU); ctx.fill();
    if (o.glow > 0) { ctx.fillStyle = 'rgba(255,107,0,' + Math.min(0.6, o.glow) + ')'; ctx.fillRect(x0, y - d / 2, x1 - x0, d); }
  }

  /* ================= 导体对电流的阻碍作用、常见的电阻 ================= */
  const SAMPLES = [
    { k: 'cu', n: '铜丝', R: 0.17, c: '#d9822b', gam: 2.2, alloy: false, desc: '长 1 m、横截面积 0.1 mm² 的铜丝' },
    { k: 'fe', n: '铁丝', R: 0.96, c: '#5c636a', gam: 5, alloy: false, desc: '长 1 m、横截面积 0.1 mm² 的铁丝' },
    { k: 'ni', n: '镍铬合金丝', R: 11, c: '#9aa3ad', gam: 22, alloy: true, desc: '长 1 m、横截面积 0.1 mm² 的镍铬合金丝' },
    { k: 'pb', n: '铅笔芯', R: 4, c: '#343a40', gam: 11, alloy: true, desc: '一段铅笔芯（石墨）' },
  ];
  PS.register('resist-intro', function (el) {
    const st = { mode: 'block', s: 0, t: 0, es: [], ions: [], key: '' };
    const a = h('div'), b = h('div', { style: { display: 'none' } });
    const modeSeg = PS.ui.seg([{ value: 'block', label: '阻碍作用' }, { value: 'ladder', label: '常见的电阻' }], 'block', (v) => { st.mode = v; a.style.display = v === 'block' ? '' : 'none'; b.style.display = v === 'ladder' ? '' : 'none'; });
    const sSeg = PS.ui.seg(SAMPLES.map((s, i) => ({ value: i, label: s.n })), 0, (v) => { st.s = v; lattice(); tell(); });
    const msg = h('div', { class: 'el-msg info' });
    const view = h('div');
    a.append(h('div', { class: 'controls' }, h('span', { class: 'small' }, '接在两个夹子之间的导体：'), sSeg.el), view, msg);
    el.append(h('div', { class: 'controls' }, modeSeg.el), a, b);
    const S = EN.stage(view, { VW: 1000, vh: (w) => (EN.narrow(w) ? 1340 : 480), draw });
    const I = () => 3 / (8.3 + 0.5 + SAMPLES[st.s].R);
    function tell() {
      const s = SAMPLES[st.s], i = I();
      msg.className = 'el-msg ok';
      msg.innerHTML = '接入' + s.desc + '：电流约 <b>' + PS.fmt(i, 2) + ' A</b>，小灯泡' + (i > 0.3 ? '很亮' : i > 0.25 ? '较亮' : i > 0.2 ? '较暗' : '很暗') + '。电压相同时，换用不同的导体，电流不同——导体对电流有<b>阻碍作用</b>，阻碍作用越大，电流越小。在物理学中用<b>电阻</b>（R）表示导体对电流阻碍作用的大小。放大镜中：自由电子在定向移动时不断与金属离子“碰撞”' + (s.alloy ? '，合金、石墨中原子排列不整齐，碰撞更频繁，电阻更大' : '') + '（示意）。';
      S.render();
    }
    function lattice() {
      const s = SAMPLES[st.s];
      st.ions = [];
      for (let i = 0; i < 9; i++) for (let j = 0; j < 6; j++) {
        const jit = s.alloy ? 6 : 0;
        st.ions.push({ x: 30 + i * 36 + (j % 2) * 18 + PS.rand(-jit, jit), y: 28 + j * 34 + PS.rand(-jit, jit), big: s.alloy && Math.random() < 0.4 });
      }
      if (!st.es.length) for (let i = 0; i < 26; i++) st.es.push({ x: PS.rand(0, 340), y: PS.rand(10, 200), vx: PS.rand(-60, 60), vy: PS.rand(-60, 60), fl: 0 });
    }
    function micro(dt) {
      const s = SAMPLES[st.s], drift = -14 * I() / 0.3 * (2.2 / s.gam) * 3;
      st.es.forEach((e) => {
        if (Math.random() < s.gam * dt) { const a = Math.random() * TAU, v = PS.rand(30, 70); e.vx = Math.cos(a) * v; e.vy = Math.sin(a) * v; e.fl = 0.18; }
        e.x += (e.vx + drift * 4) * dt; e.y += e.vy * dt; e.fl = Math.max(0, e.fl - dt);
        if (e.y < 8) { e.y = 8; e.vy = Math.abs(e.vy); } if (e.y > 202) { e.y = 202; e.vy = -Math.abs(e.vy); }
        if (e.x < 0) e.x += 340; if (e.x > 340) e.x -= 340;
      });
    }
    const loop = PS.loop((dt) => { st.t += dt; if (st.mode === 'block') { micro(dt); S.render(); } }, view);
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, 1000, VH), nar = VH > 700, s = SAMPLES[st.s], i = I();
      ctx.fillStyle = '#f3ede2'; ctx.fillRect(0, 0, 1000, VH);
      const k = nar ? 1.55 : 1;
      ctx.save(); if (nar) { ctx.translate(500, 0); ctx.scale(k, k); ctx.translate(-500 + 175, 0); }
      const fs = F(13) / k;
      const bt = REAL.battery(ctx, 180, 400, 200, { n: 2 });
      const bl = REAL.bulb(ctx, 180, 200, 130, (i * i * 8.3) / 0.75, { label: '小灯泡', fs });
      // 夹子之间的导体（放在木板上）
      ctx.fillStyle = '#e9c98f'; D.roundRect(ctx, 380, 300, 260, 70, 10); ctx.fill();
      rod(ctx, 410, 610, 330, s.k === 'pb' ? 12 : 5, s.c);
      const ca = [410, 330], cb = [610, 330];
      const w1 = REAL.wire(ctx, bt.pos, cb, { color: '#e03131', c1: [bt.pos[0] + 120, bt.pos[1] + 40], c2: [cb[0] + 60, cb[1] + 90] });
      const w2 = REAL.wire(ctx, ca, bl.t2, { color: '#1c7ed6', c1: [ca[0] - 50, ca[1] - 40], c2: [bl.t2[0] + 120, bl.t2[1] + 60] });
      const w3 = REAL.wire(ctx, bl.t1, bt.neg, { color: '#212529', c1: [bl.t1[0] - 100, bl.t1[1] + 40], c2: [bt.neg[0] - 90, bt.neg[1] - 20] });
      REAL.clip(ctx, ca[0], ca[1], Math.PI * 0.8, 16, '#1c7ed6'); REAL.clip(ctx, cb[0], cb[1], Math.PI * 0.2, 16, '#e03131');
      [w1, w2, w3].forEach((p) => EL.dots(ctx, p, st.t * EL.speed(i), { gap: 30, r: 4 }));
      D.text(ctx, s.n, 510, 392, { size: fs, weight: 800, align: 'center', color: '#1b2333' });
      const ax = 510, ay = 150;
      EL.dial(ctx, ax, ay, 170, { v: i, range: 0.6, F: (p) => p });
      D.text(ctx, '电流表（0~0.6 A）', ax, ay - 80, { size: fs, weight: 800, align: 'center', color: '#1b2333' });
      ctx.restore();
      // 放大镜
      const mx = nar ? 500 : 830, my = nar ? 1000 : 245, R = nar ? 220 : 150;
      ctx.save();
      ctx.beginPath(); ctx.arc(mx, my, R, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.clip();
      const sc = (2 * R) / 360;
      ctx.translate(mx - R + 10 * sc, my - R + 75 * sc); ctx.scale(sc, sc);
      ctx.fillStyle = PS.mixColor(s.c, '#ffffff', 0.85); ctx.fillRect(-20, 0, 400, 210);
      st.ions.forEach((p) => {
        const jx = Math.sin(st.t * 9 + p.x) * 1.5, jy = Math.cos(st.t * 11 + p.y) * 1.5;
        ctx.fillStyle = p.big ? '#c2a25a' : PS.mixColor(s.c, '#495057', 0.3); ctx.beginPath(); ctx.arc(p.x + jx, p.y + jy, p.big ? 11 : 9, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('+', p.x + jx, p.y + jy + 0.5);
      });
      st.es.forEach((e) => {
        if (e.fl > 0) { ctx.fillStyle = 'rgba(255,212,59,' + e.fl * 4 + ')'; ctx.beginPath(); ctx.arc(e.x, e.y, 9, 0, TAU); ctx.fill(); }
        ctx.fillStyle = PS.ELC.neg; ctx.beginPath(); ctx.arc(e.x, e.y, 4.5, 0, TAU); ctx.fill();
      });
      ctx.restore();
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(mx, my, R, 0, TAU); ctx.stroke();
      D.text(ctx, '放大镜：' + s.n + '的内部（示意）', mx, my - R - 12, { size: F(13), weight: 800, align: 'center', color: '#1b2333' });
      D.text(ctx, '← 电子定向移动的方向', mx, my + R + F(13) + 8, { size: F(12), weight: 700, align: 'center', color: PS.ELC.neg });
      D.text(ctx, '黄色闪光：电子与离子“碰撞”', mx, my + R + F(13) * 2.3 + 8, { size: F(12), color: '#868e96', align: 'center' });
    }
    const SUPN = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷' };
    const L = EN.ladder(b, {
      items: [['实验室用的导线（每根）', 0.05, '🔌', '0.01～0.1 Ω'], ['实验用的小灯泡', 10, '💡', '5～50 Ω'], ['电热水壶的电热丝（1 500 W）', 32, '☕', '约 32 Ω'], ['人的双手间（潮湿）', 500, '💧', '200～800 Ω'], ['照明灯泡（工作时）', 1000, '🔆', '100～2 000 Ω'], ['人的双手间（干燥）', 3000, '✋', '1 000～5 000 Ω'], ['测电笔中的高值电阻', 1e6, '✏️', '约 1 MΩ（10⁶ Ω）以上']],
      lmin: -2, lmax: 7, on: 1,
      tick: (e) => '10' + String(e).split('').map((c) => SUPN[c]).join('') + ' Ω',
      caption: '电阻（Ω，对数刻度：每一格是前一格的 10 倍）。1 kΩ = 10³ Ω，1 MΩ = 10⁶ Ω', hint: '点一点图标', fmt: (it) => it[3],
    });
    L.msg.className = 'el-msg info';
    lattice(); tell();
    loop.start();
    el._st = st;
  });

  /* ================= 影响电阻大小的因素 ================= */
  const PAIRS = [
    { n: '粗细不同', a: { m: 6, L: 0.5, S: 0.5 }, b: { m: 6, L: 0.5, S: 0.2 }, say: 'a、b 材料、长度相同，b 的横截面积小，电阻大' },
    { n: '长短不同', a: { m: 6, L: 0.3, S: 0.3 }, b: { m: 6, L: 0.9, S: 0.3 }, say: 'a、b 材料、横截面积相同，b 较长，电阻大' },
    { n: '材料不同', a: { m: 1, L: 1, S: 0.05 }, b: { m: 6, L: 1, S: 1.5 }, say: '铜的电阻比镍铬合金小得多（这里 b 虽然粗得多，电阻还是比 a 大）' },
  ];
  PS.register('resist-factors', function (el) {
    const st = { mode: 'one', m: 6, L: 1, S: 1, T: 20, pair: 0, t: 0 };
    const one = h('div'), two = h('div', { style: { display: 'none' } });
    const modeSeg = PS.ui.seg([{ value: 'one', label: '改变一个导体' }, { value: 'two', label: '两个导体串联比一比' }], 'one', (v) => { st.mode = v; one.style.display = v === 'one' ? '' : 'none'; two.style.display = v === 'two' ? '' : 'none'; tell(); });
    const mSeg = PS.ui.seg(RHO.map((r, i) => ({ value: i, label: r.n })), 6, (v) => { st.m = v; tell(); });
    const sL = PS.ui.slider({ label: '长度 L', min: 0.2, max: 2, step: 0.1, value: 1, unit: 'm', fmt: (v) => PS.fmt(v, 1), onInput: (v) => { st.L = v; tell(); } });
    const sS = PS.ui.slider({ label: '横截面积 S', min: 0.2, max: 2, step: 0.1, value: 1, unit: 'mm²', fmt: (v) => PS.fmt(v, 1), onInput: (v) => { st.S = v; tell(); } });
    const sT = PS.ui.slider({ label: '温度', min: 20, max: 420, step: 10, value: 20, unit: '℃', onInput: (v) => { st.T = v; tell(); } });
    const set = (L, S) => { st.L = PS.clamp(PS.round(L, 2), 0.2, 2); st.S = PS.clamp(PS.round(S, 2), 0.2, 2); sL.set(st.L, true); sS.set(st.S, true); tell(); };
    one.append(h('div', { class: 'controls' }, h('span', { class: 'small' }, '材料：'), mSeg.el), h('div', { class: 'controls' }, sL.el, sS.el, sT.el),
      h('div', { class: 'controls' }, PS.ui.button('把它均匀拉长到原来的 2 倍', () => { if (st.L > 1) set(1, 1); set(st.L * 2, st.S / 2); }, 'btn btn-sm'), PS.ui.button('把它对折起来使用', () => { if (st.L < 0.4 || st.S > 1) set(1, 1); set(st.L / 2, st.S * 2); }, 'btn btn-sm'), PS.ui.button('复原', () => { sT.set(20, true); st.T = 20; set(1, 1); }, 'btn btn-ghost btn-sm')));
    const pSeg = PS.ui.seg(PAIRS.map((p, i) => ({ value: i, label: p.n })), 0, (v) => { st.pair = v; tell(); });
    two.append(h('div', { class: 'controls' }, pSeg.el));
    const view = h('div');
    const msg = h('div', { class: 'el-msg info' });
    el.append(h('div', { class: 'controls' }, modeSeg.el), one, two, view, msg);
    const S = EN.stage(view, { VW: 1000, vh: (w) => (EN.narrow(w) ? 1080 : 500), draw });
    const Rof = (o, T) => (RHO[o.m].r * o.L) / o.S * (1 + RHO[o.m].a * ((T == null ? 20 : T) - 20));
    let base = Rof({ m: 6, L: 1, S: 1 });
    function tell() {
      const R = Rof(st, st.T);
      if (st.mode === 'one') {
        const r = RHO[st.m];
        msg.className = 'el-msg ok';
        msg.innerHTML = '这根' + r.n + '导体：长 ' + PS.fmt(st.L, 1) + ' m、横截面积 ' + PS.fmt(st.S, 1) + ' mm²、温度 ' + st.T + ' ℃，电阻约 <b>' + fR(R) + ' Ω</b>。规律：<b>材料</b>不同，电阻不同；材料、横截面积相同时，导体越<b>长</b>，电阻越大；材料、长度相同时，横截面积越<b>大</b>（越粗），电阻越小；大多数金属温度越<b>高</b>，电阻越大' + (st.m >= 5 ? '（' + r.n + '的电阻几乎不随温度变化，常用来做电阻器）' : '') + '。' + (st.L === 2 && st.S === 0.5 ? '<br>拉长到 2 倍：长度变为 2 倍、横截面积变为一半，电阻变为原来的 <b>4 倍</b>。' : st.L === 0.5 && st.S === 2 ? '<br>对折：长度变为一半、横截面积变为 2 倍，电阻变为原来的 <b>1/4</b>。' : '');
      } else {
        const P = PAIRS[st.pair], Ra = Rof(P.a), Rb = Rof(P.b), I = 3 / (Ra + Rb + 0.5);
        msg.className = 'el-msg ok';
        msg.innerHTML = P.say + '。a、b 串联，通过它们的电流<b>相等</b>：I<sub>a</sub> = I<sub>b</sub> = ' + PS.fmt(I, 2) + ' A；电阻大的分得的电压大：U<sub>a</sub> = ' + PS.fmt(I * Ra, 2) + ' V，U<sub>b</sub> = ' + PS.fmt(I * Rb, 2) + ' V。';
      }
      S.render();
    }
    const loop = PS.loop((dt) => { st.t += dt; if (st.mode === 'two') S.render(); }, view);
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, 1000, VH), nar = VH > 700;
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, 1000, VH);
      if (st.mode === 'one') {
        const r = RHO[st.m], R = Rof(st, st.T);
        const x0 = 80, len = st.L * (nar ? 400 : 380), d = 8 + Math.sqrt(st.S) * 22, y = nar ? 200 : 140;
        const glow = (st.T - 20) / 600;
        rod(ctx, x0, x0 + len, y, d, r.c, { glow });
        D.dim(ctx, x0, x0 + len, y + d / 2 + 22, 'L = ' + PS.fmt(st.L, 1) + ' m', { size: F(12), below: true });
        D.text(ctx, r.n + ' · S = ' + PS.fmt(st.S, 1) + ' mm² · ' + st.T + ' ℃', x0, y - d / 2 - 16, { size: F(13), weight: 700, color: '#495057' });
        const bx = nar ? 500 : 880, by = nar ? 360 : 140;
        ctx.fillStyle = '#fff'; D.roundRect(ctx, bx - 110, by - 50, 220, 100, 14); ctx.fill(); ctx.strokeStyle = '#dee2e6'; ctx.lineWidth = 1.5; ctx.stroke();
        D.text(ctx, '电阻 R', bx, by - 22, { size: F(13), weight: 700, align: 'center', color: '#495057' });
        D.text(ctx, fR(R) + ' Ω', bx, by + 26, { size: F(26), weight: 900, align: 'center', color: '#e8590c' });
        D.text(ctx, '是原来的 ' + (R / base >= 10 ? PS.fmt(R / base, 0) : PS.fmt(R / base, 2)) + ' 倍', bx, by + 50 + F(12), { size: F(12), weight: 700, align: 'center', color: '#868e96' });
        // 教材表
        const tx = nar ? 220 : 160, ty = nar ? 520 : 300, tw = nar ? 700 : 760, rowH = nar ? 70 : 26;
        D.text(ctx, '长 1 m、横截面积 1 mm² 的导体在 20 ℃ 时的电阻（教材表）', nar ? 500 : 520, ty - 16, { size: F(13), weight: 800, align: 'center', color: '#1b2333' });
        RHO.forEach((m, i) => {
          const yy = ty + 6 + i * rowH, on = i === st.m, bw = (m.r / 1.1) * (tw - 110);
          D.text(ctx, m.n, tx - 10, yy + rowH * 0.5 + 4, { size: F(12), weight: on ? 800 : 600, align: 'right', color: on ? '#e8590c' : '#495057' });
          ctx.fillStyle = on ? '#ffa94d' : '#ced4da'; ctx.fillRect(tx, yy + rowH * 0.15, Math.max(2, bw), rowH * 0.7);
          D.text(ctx, m.r + ' Ω', tx + Math.max(2, bw) + 8, yy + rowH * 0.5 + 4, { size: F(12), weight: 700, color: on ? '#e8590c' : '#495057' });
        });
      } else {
        const P = PAIRS[st.pair], Ra = Rof(P.a), Rb = Rof(P.b), I = 3 / (Ra + Rb + 0.5);
        const k = nar ? 1.6 : 1;
        ctx.save(); if (nar) { ctx.translate(500, 40); ctx.scale(k, k); ctx.translate(-500, 0); }
        const y = 170, xa0 = 230, xa1 = xa0 + P.a.L * 300, xb0 = xa1, xb1 = xb0 + P.b.L * 300, da = 8 + Math.sqrt(P.a.S) * 22, db = 8 + Math.sqrt(P.b.S) * 22;
        const off = (1000 - (xb1 - xa0)) / 2 - xa0;
        ctx.translate(off, 0);
        rod(ctx, xa0, xa1, y, da, RHO[P.a.m].c); rod(ctx, xb0, xb1, y, db, RHO[P.b.m].c);
        const fs = F(13) / k;
        D.text(ctx, 'a（' + RHO[P.a.m].n + '）', (xa0 + xa1) / 2, y - 40, { size: fs, weight: 800, align: 'center', color: '#1b2333' });
        D.text(ctx, 'b（' + RHO[P.b.m].n + '）', (xb0 + xb1) / 2, y - 40, { size: fs, weight: 800, align: 'center', color: '#1b2333' });
        // 电池与导线
        const pts = [[xa0, y], [xa0 - 60, y], [xa0 - 60, y + 150], [xb1 + 60, y + 150], [xb1 + 60, y], [xb1, y]];
        ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 3; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
        const bxm = (xa0 + xb1) / 2;
        ctx.fillStyle = '#f8fafd'; ctx.fillRect(bxm - 30, y + 140, 60, 20);
        EL.sym(ctx, 'bat', bxm - 30, y + 150, bxm + 30, y + 150, { n: 2, size: 30 });
        EL.dots(ctx, [[bxm - 30, y + 150], [xa0 - 60, y + 150], [xa0 - 60, y], [xb1 + 60, y], [xb1 + 60, y + 150], [bxm + 30, y + 150]], st.t * EL.speed(I), { gap: 26, r: 4 });
        D.text(ctx, '电源 3 V', bxm, y + 150 + 34, { size: fs, weight: 700, align: 'center', color: '#495057' });
        D.text(ctx, 'R = ' + fR(Ra) + ' Ω', (xa0 + xa1) / 2, y + 48, { size: fs, weight: 700, align: 'center', color: '#495057' });
        D.text(ctx, 'R = ' + fR(Rb) + ' Ω', (xb0 + xb1) / 2, y + 48, { size: fs, weight: 700, align: 'center', color: '#495057' });
        D.text(ctx, 'Ia = ' + PS.fmt(I, 2) + ' A', (xa0 + xa1) / 2, y + 48 + fs * 1.3, { size: fs, weight: 800, align: 'center', color: '#e8590c' });
        D.text(ctx, 'Ib = ' + PS.fmt(I, 2) + ' A', (xb0 + xb1) / 2, y + 48 + fs * 1.3, { size: fs, weight: 800, align: 'center', color: '#e8590c' });
        D.text(ctx, 'Ua = ' + PS.fmt(I * Ra, 2) + ' V', (xa0 + xa1) / 2, y - 40 - fs * 1.4, { size: fs, weight: 800, align: 'center', color: '#0c8599' });
        D.text(ctx, 'Ub = ' + PS.fmt(I * Rb, 2) + ' V', (xb0 + xb1) / 2, y - 40 - fs * 1.4, { size: fs, weight: 800, align: 'center', color: '#0c8599' });
        ctx.restore();
      }
    }
    tell();
    loop.start();
    el._st = st;
  });

  /* ================= 会改变导体的电阻吗 ================= */
  PS.register('resist-sort', function (el) {
    PS.sortCards(el, [
      ['把一根导线均匀拉长', 0, '长度变长、横截面积变小，电阻变大。'],
      ['把一根导线对折起来使用', 0, '长度变短、横截面积变大，电阻变小。'],
      ['增大导线两端的电压', 1, '电阻是导体本身的一种性质，与电压无关。'],
      ['减小通过导线的电流', 1, '电阻与电流无关。'],
      ['把导线从电路中取下来', 1, '导体不接入电路时仍然有电阻。'],
      ['给导线加热，使温度升高', 0, '大多数导体温度越高，电阻越大。'],
      ['换用同样长、更粗的同种导线', 0, '横截面积越大，电阻越小。'],
      ['用同样长、同样粗的铜线换下铁线', 0, '材料不同，电阻不同。'],
      ['把导线盘成一卷（长度不变）', 1, '材料、长度、横截面积都没有变。'],
      ['把导线剪掉一半', 0, '长度变短，电阻变小。'],
      ['让导线中的电流方向反过来', 1, '电阻与电流的方向无关。'],
      ['把灯丝冷却到低温', 0, '温度降低，灯丝的电阻变小。'],
    ], ['会改变导体的电阻', '不会改变导体的电阻']);
  });

  /* ================= 半导体和超导现象 ================= */
  const SC = [
    { n: '汞', Tc: 4.2, R: 1, note: '1911 年荷兰科学家昂内斯发现：汞在 −269 ℃（4.2 K）时电阻突然变为零' },
    { n: '铅', Tc: 7.2, R: 1, note: '铅在 7.2 K（约 −266 ℃）以下成为超导体' },
    { n: '铌', Tc: 9.2, R: 1, note: '铌在 9.2 K（约 −264 ℃）以下成为超导体，常用来制造超导磁体' },
    { n: '钇钡铜氧（陶瓷）', Tc: 93, R: 1, note: '1987 年发现的“高温超导体”，在液氮的温度（77 K，约 −196 ℃）下就是超导体' },
  ];
  const APPS = [['远距离输电线', true, '没有电阻，输电时就没有电能损耗。'], ['电动机、发电机的线圈', true, '线圈不发热，可以做得更小、效率更高。'], ['磁悬浮列车的电磁铁', true, '超导线圈中可以通过很大的电流，产生很强的磁场。'], ['电饭锅的发热体', false, '电饭锅利用电流的热效应，电阻为零就不能发热了。'], ['电热水器的电热丝', false, '利用电流的热效应工作，不能用超导体。'], ['白炽灯的灯丝', false, '灯丝要靠电流发热到很高的温度才发光，不能用超导体。']];
  PS.register('semi-super', function (el) {
    const st = { mode: 'semi', kind: 'light', f: 0.5, T: 25, fwd: true, sc: 0, K: 293, t: 0 };
    const a = h('div'), b = h('div', { style: { display: 'none' } });
    const modeSeg = PS.ui.seg([{ value: 'semi', label: '半导体' }, { value: 'super', label: '超导现象' }], 'semi', (v) => { st.mode = v; a.style.display = v === 'semi' ? '' : 'none'; b.style.display = v === 'super' ? '' : 'none'; tell(); });
    const kSeg = PS.ui.seg([{ value: 'light', label: '光敏电阻' }, { value: 'heat', label: '热敏电阻' }, { value: 'diode', label: '二极管' }], 'light', (v) => { st.kind = v; sF.el.style.display = v === 'light' ? '' : 'none'; sTe.el.style.display = v === 'heat' ? '' : 'none'; dSeg.el.style.display = v === 'diode' ? '' : 'none'; tell(); });
    const sF = PS.ui.slider({ label: '光照', min: 0, max: 100, step: 1, value: 50, unit: '%', onInput: (v) => { st.f = v / 100; tell(); } });
    const sTe = PS.ui.slider({ label: '温度', min: 0, max: 100, step: 1, value: 25, unit: '℃', onInput: (v) => { st.T = v; tell(); } });
    const dSeg = PS.ui.seg([{ value: true, label: '正向接入（长脚接正极）' }, { value: false, label: '反向接入' }], true, (v) => { st.fwd = v; tell(); });
    sTe.el.style.display = 'none'; dSeg.el.style.display = 'none';
    a.append(h('div', { class: 'controls' }, kSeg.el), h('div', { class: 'controls' }, sF.el, sTe.el, dSeg.el));
    const scSeg = PS.ui.seg(SC.map((s, i) => ({ value: i, label: s.n })), 0, (v) => { st.sc = v; tell(); });
    const sK = PS.ui.slider({ label: '温度', min: 0, max: 300, step: 0.5, value: 293, fmt: (v) => PS.fmt(v, 1) + ' K（' + PS.fmt(v - 273, 0) + ' ℃）', onInput: (v) => { st.K = v; tell(); } });
    sK.el.classList.add('wide');
    const goK = (v) => { st.K = v; sK.set(v, true); tell(); };
    const apps = h('div', { class: 'el-chips' }), appMsg = h('div', { class: 'el-msg info' }, '下面哪些可以用超导材料来做？点一点。');
    APPS.forEach(([t, ok, why]) => { const bt = PS.ui.button(t, () => { appMsg.className = 'el-msg ' + (ok ? 'ok' : 'bad'); appMsg.innerHTML = (ok ? '✔ 可以：' : '✘ 不行：') + why; bt.classList.add('on'); PS.sound.tick(); }, 'btn btn-sm'); apps.append(bt); });
    b.append(h('div', { class: 'controls' }, h('span', { class: 'small' }, '材料：'), scSeg.el), h('div', { class: 'controls' }, sK.el), h('div', { class: 'controls' }, PS.ui.button('室温 293 K', () => goK(293), 'btn btn-sm'), PS.ui.button('液氮 77 K', () => goK(77), 'btn btn-sm'), PS.ui.button('液氦 4 K', () => goK(4), 'btn btn-sm'), PS.ui.button('2 K', () => goK(2), 'btn btn-sm')));
    const view = h('div');
    const msg = h('div', { class: 'el-msg info' });
    el.append(h('div', { class: 'controls' }, modeSeg.el), a, b, view, msg, h('div', { class: 'sm-apps', style: { display: 'none' } }, apps, appMsg));
    const appBox = el.querySelector('.sm-apps');
    const S = EN.stage(view, { VW: 1000, vh: (w) => (EN.narrow(w) ? 900 : 460), draw });
    const Rsemi = () => (st.kind === 'light' ? Math.pow(10, 6 - 3.3 * st.f) : st.kind === 'heat' ? 10000 * Math.exp(3950 * (1 / (st.T + 273.15) - 1 / 298.15)) : st.fwd ? 120 : 1e9);
    const Isemi = () => (st.kind === 'diode' ? (st.fwd ? (3 - 1.8) / 120 : 0) : 3 / (Rsemi() + 100));
    const Rsc = () => { const s = SC[st.sc]; return st.K < s.Tc ? 0 : s.R * (0.04 + 0.96 * st.K / 293); };
    const fmtR = (R) => (R >= 1e6 ? PS.fmt(R / 1e6, 2) + ' MΩ' : R >= 1000 ? PS.fmt(R / 1000, R >= 1e4 ? 1 : 2) + ' kΩ' : PS.fmt(R, 0) + ' Ω');
    function tell() {
      appBox.style.display = st.mode === 'super' ? '' : 'none';
      if (st.mode === 'semi') {
        msg.className = 'el-msg ok';
        msg.innerHTML = (st.kind === 'light' ? '光敏电阻：光照越强，电阻越小（现在约 ' + fmtR(Rsemi()) + '），电路中的电流越大。可用于光控路灯、照相机的自动测光。'
          : st.kind === 'heat' ? '热敏电阻：温度越高，电阻越小（现在约 ' + fmtR(Rsemi()) + '）——和金属导体正好相反。可用于电子温度计、温度报警器。'
            : st.fwd ? '二极管正向接入：电流可以通过，发光二极管（LED）发光。' : '二极管反向接入：电流几乎不能通过，LED 不发光。二极管具有<b>单向导电性</b>。')
          + '<br>锗、硅等材料的导电性能介于导体和绝缘体之间，叫做<b>半导体</b>。温度、光照、杂质等外界因素对半导体的导电性能影响很大。用半导体可以制作二极管、三极管和集成电路（芯片）。';
      } else {
        const s = SC[st.sc], R0 = Rsc() === 0;
        msg.className = 'el-msg ' + (R0 ? 'ok' : 'info');
        msg.innerHTML = (R0 ? '⚡ 电阻变为<b>零</b>！' + s.n + '进入超导状态，导线不再发热，电流通过时没有电能损耗。' : s.n + '的电阻随温度降低而减小，但还不是零。继续降温到 ' + s.Tc + ' K 以下试试。') + '<br>某些物质在很低的温度时，电阻就变成了零，这就是<b>超导现象</b>。' + s.note + '。';
      }
      S.render();
    }
    const loop = PS.loop((dt) => { st.t += dt; S.render(); }, view);
    function semiDraw(ctx, F, k) {
      const i = Isemi(), fs = F(13) / k;
      // 电路：电源（左下）— 元件（上）— 毫安表（右）
      const L = 150, Rr = 330, T0 = 90, B = 300;
      ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(L, B); ctx.lineTo(L, T0); ctx.lineTo(Rr + 120, T0); ctx.lineTo(Rr + 120, B); ctx.lineTo(L, B); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(255, B - 15, 70, 30);
      EL.sym(ctx, 'bat', 320, B, 260, B, { n: 2, size: 30, label: '3 V', F: (p) => p * (F(13) / 13) / k });
      ctx.fillRect(220, T0 - 25, 130, 50);
      if (st.kind === 'diode') EL.sym(ctx, 'led', 220, T0, 350, T0, { size: 40, lit: st.fwd ? 1 : 0 });
      else {
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 2.6; ctx.fillRect(235, T0 - 16, 100, 32); ctx.strokeRect(235, T0 - 16, 100, 32);
        ctx.beginPath(); ctx.moveTo(220, T0); ctx.lineTo(235, T0); ctx.moveTo(335, T0); ctx.lineTo(350, T0); ctx.stroke();
        ctx.strokeStyle = st.kind === 'light' ? '#e8590c' : '#c92a2a'; ctx.lineWidth = 2.5; ctx.beginPath();
        for (let x = 0; x <= 80; x += 2) { const y = T0 + Math.sin(x / 5) * 8; x ? ctx.lineTo(245 + x, y) : ctx.moveTo(245 + x, y); }
        ctx.stroke();
      }
      D.text(ctx, { light: '光敏电阻', heat: '热敏电阻', diode: '发光二极管' }[st.kind], 285, T0 - 34, { size: fs, weight: 800, align: 'center', color: '#1b2333' });
      if (st.kind !== 'diode') D.text(ctx, fmtR(Rsemi()), 285, T0 + 44, { size: fs, weight: 800, align: 'center', color: '#e8590c' });
      // 毫安表（数字）
      const mx = Rr + 120, my = 195;
      ctx.fillStyle = '#343a40'; D.roundRect(ctx, mx - 62, my - 34, 124, 68, 10); ctx.fill();
      ctx.fillStyle = '#c3fae8'; ctx.fillRect(mx - 52, my - 24, 104, 34);
      D.text(ctx, PS.fmt(i * 1000, i * 1000 < 1 ? 3 : 1), mx, my, { size: F(18) / k, weight: 900, align: 'center', baseline: 'middle', color: '#087f5b' });
      D.text(ctx, 'mA', mx, my + 24, { size: F(11) / k, weight: 800, align: 'center', color: '#f8f9fa' });
      if (i > 1e-5) EL.dots(ctx, [[L, B], [L, T0], [220, T0]], st.t * EL.speed(i * 60), { gap: 26, r: 4 });
      // 外界条件
      if (st.kind === 'light') {
        const sx = 285, sy = -40, b = st.f;
        ctx.fillStyle = PS.mixColor('#adb5bd', '#ffd43b', b); ctx.beginPath(); ctx.arc(sx, sy, 22, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(250,176,5,' + b + ')'; ctx.lineWidth = 3;
        for (let q = 0; q < 5; q++) { const x = 235 + q * 25; ctx.beginPath(); ctx.moveTo(sx + (x - sx) * 0.3, sy + 26); ctx.lineTo(x, T0 - 46); ctx.stroke(); }
      } else if (st.kind === 'heat') {
        const tx = 120, f = st.T / 100;
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; D.roundRect(ctx, tx - 9, -40, 18, 110, 9); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#e03131'; ctx.fillRect(tx - 4, 60 - 90 * f, 8, 90 * f + 4); ctx.beginPath(); ctx.arc(tx, 74, 12, 0, TAU); ctx.fill();
        D.text(ctx, st.T + ' ℃', tx + 18, 20, { size: fs, weight: 800, color: '#e03131' });
      }
    }
    function superDraw(ctx, F, x0, y0, w, hh) {
      const s = SC[st.sc], R = Rsc();
      const lx = (K) => x0 + (Math.log10(Math.max(1, K)) / Math.log10(300)) * w, ly = (r) => y0 + hh - (r / 1.05) * hh;
      ctx.fillStyle = '#fff'; ctx.fillRect(x0 - 10, y0 - 10, w + 20, hh + 20);
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + hh); ctx.lineTo(x0 + w, y0 + hh); ctx.stroke();
      [1, 2, 4, 10, 20, 40, 77, 100, 200, 300].forEach((K) => { ctx.strokeStyle = '#e9ecef'; ctx.beginPath(); ctx.moveTo(lx(K), y0); ctx.lineTo(lx(K), y0 + hh); ctx.stroke(); D.text(ctx, String(K), lx(K), y0 + hh + F(11) + 4, { size: F(11), align: 'center', color: '#868e96' }); });
      D.text(ctx, 'T/K（对数刻度）', x0 + w, y0 + hh + F(11) * 2.4 + 4, { size: F(11), align: 'right', color: '#495057' });
      D.text(ctx, '电阻（相对值）', x0, y0 - 14, { size: F(11), weight: 700, color: '#495057' });
      ctx.strokeStyle = '#7048e8'; ctx.lineWidth = 3.5; ctx.beginPath();
      for (let i = 0; i <= 200; i++) { const K = Math.pow(300, i / 200), r = K < s.Tc ? 0 : s.R * (0.04 + 0.96 * K / 293); const x = lx(K), y = ly(r); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#e03131'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(lx(s.Tc), y0); ctx.lineTo(lx(s.Tc), y0 + hh); ctx.stroke(); ctx.restore();
      D.text(ctx, 'T꜀ = ' + s.Tc + ' K', lx(s.Tc) + 6, y0 + 16, { size: F(12), weight: 800, color: '#e03131' });
      ctx.fillStyle = '#e8590c'; ctx.beginPath(); ctx.arc(lx(st.K), ly(R), 8, 0, TAU); ctx.fill();
      // 导线：发热（有电阻）或不发热（超导）
      const wy = y0 - 60, glow = Math.min(1, R * 1.2);
      ctx.strokeStyle = PS.mixColor('#adb5bd', '#ff6b00', glow); ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0 + 40, wy); ctx.lineTo(x0 + w - 40, wy); ctx.stroke();
      EL.dots(ctx, [[x0 + 40, wy], [x0 + w - 40, wy]], st.t * 120, { gap: 28, r: 4 });
      D.text(ctx, R === 0 ? '超导：电阻为零，导线不发热' : '有电阻：电流通过时导线发热，有电能损耗', x0 + w / 2, wy - 18, { size: F(13), weight: 800, align: 'center', color: R === 0 ? '#2b8a3e' : '#e8590c' });
    }
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, 1000, VH), nar = VH > 600;
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, 1000, VH);
      if (st.mode === 'semi') {
        const k = nar ? 1.7 : 1;
        ctx.save(); ctx.translate(nar ? 500 - 300 * k : 90, nar ? 140 : 100); ctx.scale(k, k); semiDraw(ctx, F, k); ctx.restore();
        if (!nar) {
          const x = 760, y = 120;
          D.text(ctx, '导电性能', x, y - 20, { size: F(13), weight: 800, align: 'center', color: '#1b2333' });
          [['导体（铜、铝）', '#2b8a3e', '很容易导电'], ['半导体（锗、硅）', '#e8590c', '介于两者之间'], ['绝缘体（橡胶、陶瓷）', '#868e96', '不容易导电']].forEach(([t, c, d], i) => {
            ctx.fillStyle = c; D.roundRect(ctx, x - 120, y + i * 70, 240, 54, 10); ctx.fill();
            D.text(ctx, t, x, y + i * 70 + 24, { size: F(13), weight: 800, align: 'center', color: '#fff' });
            D.text(ctx, d, x, y + i * 70 + 44, { size: F(11), align: 'center', color: '#fff' });
          });
        }
      } else if (nar) superDraw(ctx, F, 140, 260, 760, 520);
      else superDraw(ctx, F, 120, 140, 760, 250);
    }
    tell();
    loop.start();
    el._st = st;
  });
})();
