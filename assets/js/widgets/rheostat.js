/* 第16章第4节：变阻器——用铅笔芯改变灯泡的亮度 pencil-lead、滑动变阻器的接法 rheostat-connect、
 * 电阻箱 resist-box、电位器 potentiometer。依赖 circuit.js、energy.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, EL = PS.el, EN = PS.en, REAL = EL.real;
  const TAU = Math.PI * 2;
  const LAMP = { R: 8.3, Pn: 0.75 };
  const Iof = (R) => 3 / (LAMP.R + 0.5 + R);
  const litOf = (I) => (I * I * LAMP.R) / LAMP.Pn;

  /** 画一段绕在瓷管上的电阻丝（侧视）：x0~x1，中心 y，半径 r；hl = [起点, 终点] 高亮的部分 */
  function coil(ctx, x0, x1, y, r, hl) {
    const g = ctx.createLinearGradient(0, y - r, 0, y + r);
    g.addColorStop(0, '#fffaf0'); g.addColorStop(0.5, '#e9e3d6'); g.addColorStop(1, '#b8ad98');
    ctx.fillStyle = g; ctx.fillRect(x0, y - r, x1 - x0, 2 * r);
    ctx.strokeStyle = '#7d6e5a'; ctx.lineWidth = 1.6;
    for (let x = x0 + 3; x < x1 - 2; x += 5.5) { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + 3, y + r); ctx.stroke(); }
    if (hl && hl[1] - hl[0] > 1) { ctx.fillStyle = 'rgba(240,140,0,.38)'; ctx.fillRect(hl[0], y - r - 2, hl[1] - hl[0], 2 * r + 4); }
  }

  /* ================= 用铅笔芯改变灯泡的亮度 ================= */
  PS.register('pencil-lead', function (el) {
    const st = { mode: 'pencil', f: 0.6, t: 0 };
    const MODES = { pencil: { n: '铅笔芯', R: 6 }, coil: { n: '镍铬合金丝（绕在瓷管上）', R: 20 } };
    const mSeg = PS.ui.seg([{ value: 'pencil', label: '铅笔芯' }, { value: 'coil', label: '镍铬合金丝绕成的线圈' }], 'pencil', (v) => { st.mode = v; tell(); });
    const sl = PS.ui.slider({ label: '接入电路的长度', min: 5, max: 100, step: 1, value: 60, unit: '%', onInput: (v) => { st.f = v / 100; tell(); } });
    sl.el.classList.add('wide');
    const msg = h('div', { class: 'el-msg info' });
    const view = h('div');
    el.append(h('div', { class: 'controls' }, mSeg.el), view, h('div', { class: 'controls' }, sl.el), msg);
    const S = EN.stage(view, { VW: 1000, vh: (w) => (EN.narrow(w) ? 540 : 460), draw });
    const R = () => MODES[st.mode].R * st.f, I = () => Iof(R());
    function tell() {
      msg.className = 'el-msg ok';
      msg.innerHTML = '接入电路的' + MODES[st.mode].n + '长 ' + Math.round(st.f * 100) + '%，电阻约 ' + PS.fmt(R(), 1) + ' Ω，电流 ' + PS.fmt(I(), 2) + ' A。拖动夹子：接入的长度越<b>长</b>，电阻越大，电流越小，灯泡越<b>暗</b>；长度越短，灯泡越亮。' + (st.mode === 'coil' ? '<br>把电阻丝绕在绝缘瓷管上，在不大的地方就能有很长的电阻丝，电阻的变化范围更大——这就是<b>滑动变阻器</b>的原理：通过改变接入电路中电阻丝的<b>长度</b>来改变电阻。' : '<br>铅笔芯的电阻不大，灯泡亮度的变化不太明显。想让变化更明显，可以换用更长的电阻丝。');
      S.render();
    }
    let lay = null;
    const loop = PS.loop((dt) => { st.t += dt; S.render(); }, view);
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, 1000, VH), nar = VH > 500, k = 1, i = I();
      ctx.fillStyle = '#f3ede2'; ctx.fillRect(0, 0, 1000, VH);
      ctx.save();
      const ox = 0, oy = nar ? 50 : 0;
      ctx.translate(ox, oy); ctx.scale(k, k);
      const fs = F(13) / k;
      const bt = REAL.battery(ctx, 200, 400, 200, { n: 2 });
      const bl = REAL.bulb(ctx, 200, 200, 130, litOf(i), { label: '小灯泡', fs });
      const dl = EL.dial(ctx, 480, 150, 170, { v: i, range: 0.6, terms: true, sel: ['-', '0.6'], F: (p) => p });
      const T = {}; dl.terms.forEach((t) => { T[t.k] = [t.x, t.y]; });
      D.text(ctx, '电流表', 480, 150 - 85 - 6, { size: fs, weight: 800, align: 'center', color: '#1b2333' });
      // 木板与导体
      const x0 = 580, x1 = 940, y = 340;
      ctx.fillStyle = '#e9c98f'; D.roundRect(ctx, x0 - 30, y - 40, x1 - x0 + 60, 80, 10); ctx.fill();
      const xc = x0 + (x1 - x0) * st.f;
      if (st.mode === 'pencil') {
        ctx.fillStyle = '#ffd43b'; ctx.fillRect(x0, y - 9, x1 - x0, 18);
        ctx.fillStyle = '#343a40'; ctx.fillRect(x0, y - 4, x1 - x0, 8);
        ctx.fillStyle = 'rgba(240,140,0,.45)'; ctx.fillRect(x0, y - 10, xc - x0, 20);
      } else coil(ctx, x0, x1, y, 16, [x0, xc]);
      D.text(ctx, MODES[st.mode].n, (x0 + x1) / 2, y + 40 + fs, { size: fs, weight: 800, align: 'center', color: '#1b2333' });
      const ca = [x0, y], cb = [xc, y];
      const w1 = REAL.wire(ctx, bt.pos, cb, { color: '#e03131', c1: [bt.pos[0] + 160, bt.pos[1] + 40], c2: [cb[0], cb[1] + 120] });
      const w2 = REAL.wire(ctx, ca, T['0.6'], { color: '#f59f00', c1: [ca[0] - 60, ca[1] - 30], c2: [T['0.6'][0] + 20, T['0.6'][1] + 80] });
      const w3 = REAL.wire(ctx, T['-'], bl.t2, { color: '#1c7ed6', c1: [T['-'][0] - 30, T['-'][1] + 70], c2: [bl.t2[0] + 90, bl.t2[1] + 50] });
      const w4 = REAL.wire(ctx, bl.t1, bt.neg, { color: '#212529', c1: [bl.t1[0] - 100, bl.t1[1] + 40], c2: [bt.neg[0] - 90, bt.neg[1] - 20] });
      REAL.clip(ctx, ca[0], ca[1], Math.PI * 0.85, 15, '#f59f00');
      REAL.clip(ctx, cb[0], cb[1] - 2, Math.PI * 0.5, 17, '#e03131');
      PS.handle(ctx, cb[0], cb[1] - 44, 13, '#e03131', null, (p) => F(p) / k);
      D.text(ctx, '拖动夹子', cb[0], cb[1] - 66, { size: F(12) / k, weight: 700, align: 'center', color: '#e03131' });
      [w1, w2, w3, w4].forEach((p) => EL.dots(ctx, p, st.t * EL.speed(i), { gap: 30, r: 4 }));
      ctx.restore();
      lay = { x0, x1, y, k, ox, oy };
    }
    PS.drag(S, { VW: 1000, get VH() { return S.VH; },
      hit: (p) => { if (!lay) return null; const x = (p.x - lay.ox) / lay.k, y = (p.y - lay.oy) / lay.k, xc = lay.x0 + (lay.x1 - lay.x0) * st.f; return Math.abs(x - xc) < 40 && y > lay.y - 80 && y < lay.y + 30 ? 1 : null; },
      start() {}, move(_, p) { const x = (p.x - lay.ox) / lay.k; st.f = PS.clamp((x - lay.x0) / (lay.x1 - lay.x0), 0.05, 1); sl.set(Math.round(st.f * 100), true); tell(); } });
    tell();
    loop.start();
    el._st = st;
  });

  /* ================= 滑动变阻器的接法 ================= */
  const RMAX = 20;
  const PAIRS6 = ['AC', 'AD', 'BC', 'BD', 'AB', 'CD'];
  /** 接入电路的电阻：ks 为两个接线柱，p 为滑片位置（0 在 A 端，1 在 B 端） */
  function rheoR(ks, p) {
    const lo = ks.filter((k) => k === 'A' || k === 'B'), up = ks.filter((k) => k === 'C' || k === 'D');
    if (lo.length === 2) return RMAX;
    if (up.length === 2) return 0;
    return lo[0] === 'A' ? p * RMAX : (1 - p) * RMAX;
  }
  /** 滑动变阻器（侧视，教材插图的样子）：返回各接线柱的位置 */
  function rheoDraw(ctx, o) {
    const { x0, x1, y, p, sel, F } = o, yr = y - 92;
    // 支架
    ctx.fillStyle = '#4c6ef5';
    [x0 - 26, x1 + 6].forEach((x) => { D.roundRect(ctx, x, y - 120, 20, 168, 4); ctx.fill(); });
    const xs = x0 + (x1 - x0) * p, lo = sel.filter((k) => k === 'A' || k === 'B'), up = sel.filter((k) => k === 'C' || k === 'D');
    let hl = null;
    if (sel.length === 2 && lo.length === 1) hl = lo[0] === 'A' ? [x0, xs] : [xs, x1];
    else if (lo.length === 2) hl = [x0, x1];
    coil(ctx, x0, x1, y, 24, hl);
    // 金属杆
    const gr = ctx.createLinearGradient(0, yr - 6, 0, yr + 6); gr.addColorStop(0, '#f1f3f5'); gr.addColorStop(0.5, '#adb5bd'); gr.addColorStop(1, '#6c757d');
    ctx.fillStyle = gr; ctx.fillRect(x0 - 16, yr - 6, x1 - x0 + 32, 12);
    if (up.length && sel.length === 2) { ctx.fillStyle = 'rgba(240,140,0,.45)'; const a = up.length === 2 ? [x0 - 16, x1 + 16] : up[0] === 'C' ? [x0 - 16, xs] : [xs, x1 + 16]; ctx.fillRect(a[0], yr - 7, a[1] - a[0], 14); }
    // 滑片
    ctx.fillStyle = '#495057'; D.roundRect(ctx, xs - 22, yr - 18, 44, 30, 6); ctx.fill();
    ctx.strokeStyle = '#ced4da'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(xs - 8, yr + 12); ctx.quadraticCurveTo(xs - 14, y - 34, xs, y - 24); ctx.moveTo(xs + 8, yr + 12); ctx.quadraticCurveTo(xs + 14, y - 34, xs, y - 24); ctx.stroke();
    ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(xs, yr - 22, 9, 0, TAU); ctx.fill();
    D.text(ctx, 'P', xs, yr - 40, { size: F(14), weight: 900, align: 'center', color: '#e03131' });
    // 接线柱
    const T = { A: [x0 - 16, y + 40], B: [x1 + 16, y + 40], C: [x0 - 16, yr - 30], D: [x1 + 16, yr - 30] };
    Object.keys(T).forEach((k) => {
      const [x, yy] = T[k], on = sel.indexOf(k) >= 0;
      if (on) { ctx.fillStyle = 'rgba(255,212,59,.8)'; ctx.beginPath(); ctx.arc(x, yy, 22, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#212529'; ctx.beginPath(); ctx.arc(x, yy, 12, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ced4da'; ctx.beginPath(); ctx.arc(x, yy, 5, 0, TAU); ctx.fill();
      D.text(ctx, k, x + (x < (x0 + x1) / 2 ? -30 : 30), yy + 6, { size: F(16), weight: 900, align: 'center', color: on ? '#e8590c' : '#1b2333' });
    });
    return T;
  }
  PS.register('rheostat-connect', function (el) {
    const st = { mode: 'free', sel: ['A', 'C'], p: 0.5, Q: null, done: false, n: 0, ok: 0 };
    const modeSeg = PS.ui.seg([{ value: 'free', label: '认一认' }, { value: 'quiz', label: '考一考' }], 'free', (v) => { st.mode = v; if (v === 'quiz') next(); else { st.Q = null; tell(); } quizBox.style.display = v === 'quiz' ? '' : 'none'; free.style.display = v === 'free' ? '' : 'none'; });
    const pairSeg = PS.ui.seg(PAIRS6.map((k) => ({ value: k, label: k[0] + ' 和 ' + k[1] })), 'AC', (v) => { st.sel = v.split(''); tell(); });
    const sl = PS.ui.slider({ label: '滑片 P 的位置', min: 0, max: 100, step: 1, value: 50, unit: '%', onInput: (v) => { st.p = v / 100; tell(); } });
    sl.el.classList.add('wide');
    const free = h('div', null, h('div', { class: 'controls' }, h('span', { class: 'small' }, '接入电路的两个接线柱：'), pairSeg.el), h('div', { class: 'controls' }, sl.el));
    const q = h('div', { class: 'el-q' }), opts = h('div', { class: 'el-chips' }), fb = h('div', { class: 'el-msg info' }), score = h('div', { class: 'small muted' });
    const quizBox = h('div', { style: { display: 'none' } }, q, opts, fb, h('div', { class: 'controls', style: { marginTop: '6px' } }, PS.ui.button('换一题', next, 'btn btn-ghost btn-sm')), score);
    const view = h('div');
    const msg = h('div', { class: 'el-msg info' });
    el.append(h('div', { class: 'controls' }, modeSeg.el), free, view, msg, quizBox);
    const S = EN.stage(view, { VW: 1000, vh: (w) => (EN.narrow(w) ? 760 : 430), draw });
    function tell() {
      const ks = st.sel, R = rheoR(ks, st.p), lo = ks.filter((k) => k === 'A' || k === 'B');
      let s;
      if (lo.length === 2) s = '接 A 和 B（“同下”）：整根电阻丝都接入电路，电阻是最大值 ' + RMAX + ' Ω，移动滑片<b>不能改变</b>电阻——相当于一个定值电阻。';
      else if (lo.length === 0) s = '接 C 和 D（“同上”）：电流只经过金属杆，电阻几乎为<b>零</b>，移动滑片也不起作用——相当于一根导线。';
      else s = '“<b>一上一下</b>”：接入电路的是' + lo[0] + '端到滑片 P 之间的电阻丝（橙色），电阻约 ' + PS.fmt(R, 1) + ' Ω。滑片向' + (lo[0] === 'A' ? '右' : '左') + '移动（<b>远离</b>下面所接的接线柱 ' + lo[0] + '），接入的电阻丝变长，电阻<b>变大</b>；靠近 ' + lo[0] + ' 时电阻变小。上面接 C 还是 D，效果相同。';
      if (st.mode === 'free') { msg.className = 'el-msg ' + (lo.length === 1 ? 'ok' : 'info'); msg.innerHTML = s; }
      else msg.style.display = 'none';
      if (st.mode === 'free') msg.style.display = '';
      S.render();
    }
    function next() {
      const pair = PS.pick(PAIRS6), dir = PS.pick([1, -1]), kind = PS.pick(['R', 'I']);
      st.sel = pair.split(''); st.p = 0.5; st.done = false;
      const lo = st.sel.filter((k) => k === 'A' || k === 'B');
      const dR = lo.length !== 1 ? 0 : (lo[0] === 'A' ? dir : -dir);
      const ans = kind === 'R' ? dR : -dR;
      st.Q = { pair, dir, kind, ans };
      q.innerHTML = kind === 'R' ? '如图，把滑动变阻器的 <b>' + pair[0] + '、' + pair[1] + '</b> 两个接线柱接入电路。当滑片 P 向<b>' + (dir > 0 ? '右' : '左') + '</b>移动时，接入电路的电阻将怎样变化？'
        : '把滑动变阻器与电流表、小灯泡串联，<b>' + pair[0] + '</b> 接 M、<b>' + pair[1] + '</b> 接 N。当滑片 P 向<b>' + (dir > 0 ? '右' : '左') + '</b>移动时，电流表的示数将怎样变化？';
      opts.innerHTML = '';
      [['变大', 1], ['变小', -1], ['不变', 0]].forEach(([t, v]) => opts.append(PS.ui.button(t, () => answer(v), 'btn btn-sm')));
      fb.className = 'el-msg info'; fb.innerHTML = '先看下面接的是哪个接线柱：滑片远离它，接入的电阻丝变长，电阻变大。';
      tell();
    }
    function answer(v) {
      if (!st.Q || st.done) return;
      const Q = st.Q, good = v === Q.ans, lo = st.sel.filter((k) => k === 'A' || k === 'B');
      st.done = true; st.n++; if (good) st.ok++;
      const why = lo.length === 2 ? '接 A、B 两个下接线柱，整根电阻丝接入电路，电阻不变' : lo.length === 0 ? '接 C、D 两个上接线柱，接入的电阻几乎为零且不变' : '下面接 ' + lo[0] + '，滑片向' + (Q.dir > 0 ? '右' : '左') + '移动时' + ((lo[0] === 'A') === (Q.dir > 0) ? '远离' : '靠近') + ' ' + lo[0] + '，接入的电阻丝变' + ((lo[0] === 'A') === (Q.dir > 0) ? '长，电阻变大' : '短，电阻变小');
      fb.className = 'el-msg ' + (good ? 'ok' : 'bad');
      fb.innerHTML = (good ? '✔ 正确！' : '✘ 不对，答案是“' + ({ 1: '变大', '-1': '变小', 0: '不变' })[Q.ans] + '”。') + why + (Q.kind === 'I' && lo.length === 1 ? '，电路中的电流' + (Q.ans > 0 ? '变大' : '变小') : Q.kind === 'I' ? '，电流不变' : '') + '。';
      score.innerHTML = '已做 ' + st.n + ' 题，答对 ' + st.ok + ' 题。'; good ? PS.sound.good() : PS.sound.bad();
      st.anim = { from: 0.5, to: 0.5 + Q.dir * 0.35, t: 0 };
    }
    const loop = PS.loop((dt) => { if (st.anim) { st.anim.t = Math.min(1, st.anim.t + dt / 1.2); st.p = st.anim.from + (st.anim.to - st.anim.from) * st.anim.t; if (st.anim.t >= 1) st.anim = null; S.render(); } }, view);
    let T = null, lay = null;
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, 1000, VH), nar = VH > 600;
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, 1000, VH);
      const k = nar ? 1.25 : 1, x0 = nar ? 140 : 120, x1 = nar ? 660 : 640, y = 250;
      ctx.save(); if (nar) { ctx.translate(500 - 400 * k, 10); ctx.scale(k, k); }
      T = rheoDraw(ctx, { x0, x1, y, p: st.p, sel: st.sel, F: (p) => F(p) / k });
      ctx.restore();
      lay = { k, ox: nar ? 500 - 400 * k : 0, oy: nar ? 10 : 0, x0, x1 };
      const R = rheoR(st.sel, st.p), lo = st.sel.filter((q) => q === 'A' || q === 'B');
      // 电阻读数与电路符号
      const bx = nar ? 500 : 840, by = nar ? 520 : 150;
      ctx.fillStyle = '#fff'; D.roundRect(ctx, bx - 130, by - 60, 260, 120, 14); ctx.fill(); ctx.strokeStyle = '#dee2e6'; ctx.lineWidth = 1.5; ctx.stroke();
      D.text(ctx, '接入电路的电阻', bx, by - 30, { size: F(13), weight: 700, align: 'center', color: '#495057' });
      D.text(ctx, st.mode === 'quiz' && !st.done ? '?' : PS.fmt(R, 1) + ' Ω', bx, by + 22, { size: F(26), weight: 900, align: 'center', color: '#e8590c' });
      D.text(ctx, '铭牌：“' + RMAX + ' Ω 2 A”', bx, by + 60 + F(12) * 1.2, { size: F(12), weight: 700, align: 'center', color: '#868e96' });
      const sy = nar ? 680 : 330;
      if (lo.length === 1) EL.sym(ctx, 'rheo', bx - 90, sy, bx + 90, sy, { size: 40, sp: st.p, tail: lo[0] === 'A' ? 1 : -1, F, label: '电路图中的画法', ls: -1, fs: F(12) });
      else EL.sym(ctx, lo.length === 2 ? 'res' : 'wire', bx - 90, sy, bx + 90, sy, { size: 40, F, label: lo.length === 2 ? '相当于定值电阻' : '相当于导线', ls: -1, fs: F(12) });
      if (st.mode === 'free' && !nar) D.text(ctx, '点接线柱或用上面的按钮选择接法；拖动滑片 P', 16, VH - 14, { size: F(12), color: '#868e96' });
    }
    PS.drag(S, { VW: 1000, get VH() { return S.VH; },
      hit: (p) => {
        if (!lay || st.mode !== 'free') return null;
        const x = (p.x - lay.ox) / lay.k, y = (p.y - lay.oy) / lay.k;
        const key = Object.keys(T).find((q) => Math.hypot(x - T[q][0], y - T[q][1]) < 30);
        if (key) return { key };
        const xs = lay.x0 + (lay.x1 - lay.x0) * st.p;
        return Math.abs(x - xs) < 34 && y > 105 && y < 200 ? { p: 1 } : null;
      },
      start(o) { if (o.key) { if (st.sel.indexOf(o.key) < 0) { st.sel = [st.sel[1], o.key]; } const s2 = st.sel.slice().sort().join(''); pairSeg.set(s2, true); PS.sound.tick(); tell(); } },
      move(o, p) { if (!o.p) return; const x = (p.x - lay.ox) / lay.k; st.p = PS.clamp((x - lay.x0) / (lay.x1 - lay.x0), 0, 1); sl.set(Math.round(st.p * 100), true); tell(); },
    });
    tell();
    loop.start();
    el._st = st; el._answer = answer;
  });

  /* ================= 电阻箱 ================= */
  const MUL = [1000, 100, 10, 1];
  PS.register('resist-box', function (el) {
    const st = { d: [0, 4, 2, 7], mode: 'free', target: null, ans: null, done: false, n: 0, ok: 0 };
    const modeSeg = PS.ui.seg([{ value: 'free', label: '认一认' }, { value: 'read', label: '读一读' }, { value: 'set', label: '调一调' }], 'free', (v) => { st.mode = v; next(); });
    const view = h('div', { style: { maxWidth: '760px' } });
    const q = h('div', { class: 'el-q' });
    const inp = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', autocomplete: 'off', placeholder: '读数' });
    const ans = h('div', { class: 'el-ans' }, inp, h('span', null, 'Ω'), PS.ui.button('提交', check, 'btn btn-primary btn-sm'));
    const fb = h('div', { class: 'el-msg info' });
    const score = h('div', { class: 'small muted' });
    el.append(h('div', { class: 'controls' }, modeSeg.el), view, q, ans, fb, h('div', { class: 'controls', style: { marginTop: '6px' } }, PS.ui.button('换一题', next, 'btn btn-ghost btn-sm')), score);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    const S = PS.stage(view, { ratio: '760 / 440', draw });
    const val = () => st.d.reduce((s, d, i) => s + d * MUL[i], 0);
    const expr = () => st.d.map((d, i) => d + '×' + MUL[i].toLocaleString('en').replace(',', ' ') + ' Ω').join(' + ') + ' = ' + val() + ' Ω';
    function next() {
      st.done = false; inp.value = ''; inp.disabled = false;
      ans.style.display = st.mode === 'read' ? '' : 'none';
      if (st.mode === 'read') { st.d = MUL.map(() => PS.randInt(0, 9)); if (Math.random() < 0.4) st.d[PS.randInt(0, 3)] = 0; q.innerHTML = '这个电阻箱接入电路的电阻是多少？'; fb.className = 'el-msg info'; fb.innerHTML = '读数方法：每个旋钮的小三角所对的数字乘以旁边的倍数，再加起来。'; }
      else if (st.mode === 'set') { st.target = PS.randInt(1, 9999); q.innerHTML = '调节旋钮，使电阻箱接入电路的电阻为 <b>' + st.target + ' Ω</b>。（点旋钮的右半边加 1，左半边减 1）'; fb.className = 'el-msg info'; fb.innerHTML = '现在是 ' + val() + ' Ω。'; }
      else { q.innerHTML = '电阻箱是能够表示出接入电路电阻值的变阻器，在电路图中的符号如右下角所示。点旋钮的右半边加 1、左半边减 1，可以得到 0～9 999 Ω 之间的任意整数电阻值。'; fb.className = 'el-msg ok'; fb.innerHTML = '读数：' + expr() + '。'; }
      S.render();
    }
    function check() {
      if (st.mode !== 'read' || st.done) return;
      const x = parseFloat(String(inp.value).replace(/[\s，,]/g, ''));
      if (isNaN(x)) { inp.focus(); return; }
      const good = x === val();
      st.done = true; st.n++; if (good) st.ok++; inp.disabled = true;
      fb.className = 'el-msg ' + (good ? 'ok' : 'bad');
      fb.innerHTML = (good ? '✔ 正确！' : '✘ 不对。') + expr() + '。';
      score.innerHTML = '已做 ' + st.n + ' 题，答对 ' + st.ok + ' 题。'; good ? PS.sound.good() : PS.sound.bad();
    }
    function turn(i, dd) {
      if (st.mode === 'read') return;
      st.d[i] = (st.d[i] + dd + 10) % 10; PS.sound.tick();
      if (st.mode === 'free') { fb.innerHTML = '读数：' + expr() + '。'; }
      else if (!st.done) {
        if (val() === st.target) { st.done = true; st.n++; st.ok++; fb.className = 'el-msg ok'; fb.innerHTML = '✔ 调好了！' + expr() + '。'; score.innerHTML = '已调好 ' + st.ok + ' 个。'; PS.sound.good(); }
        else { fb.className = 'el-msg info'; fb.innerHTML = '现在是 ' + val() + ' Ω，目标 ' + st.target + ' Ω。'; }
      }
      S.render();
    }
    const KN = MUL.map((m, i) => ({ x: 110 + i * 180, y: 200, r: 70 }));
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, 760, 440);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, 760, 440);
      ctx.fillStyle = '#343a40'; D.roundRect(ctx, 14, 40, 732, 330, 18); ctx.fill();
      ctx.fillStyle = '#212529'; D.roundRect(ctx, 24, 50, 712, 310, 14); ctx.fill();
      KN.forEach((k, i) => {
        const d = st.d[i];
        ctx.fillStyle = '#495057'; ctx.beginPath(); ctx.arc(k.x, k.y, k.r + 10, 0, TAU); ctx.fill();
        ctx.fillStyle = '#e9ecef'; ctx.beginPath(); ctx.arc(k.x, k.y, k.r, 0, TAU); ctx.fill();
        for (let n = 0; n < 10; n++) {
          const a = -Math.PI / 2 + (n - d) * (TAU / 10);
          D.text(ctx, String(n), k.x + Math.cos(a) * k.r * 0.74, k.y + Math.sin(a) * k.r * 0.74, { size: F(16), weight: n === d ? 900 : 700, align: 'center', baseline: 'middle', color: n === d ? '#e03131' : '#495057' });
        }
        ctx.fillStyle = '#868e96'; ctx.beginPath(); ctx.arc(k.x, k.y, k.r * 0.38, 0, TAU); ctx.fill();
        ctx.fillStyle = '#343a40'; ctx.fillRect(k.x - k.r * 0.32, k.y - 7, k.r * 0.64, 14);
        // 小三角
        ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.moveTo(k.x, k.y - k.r - 6); ctx.lineTo(k.x - 10, k.y - k.r - 24); ctx.lineTo(k.x + 10, k.y - k.r - 24); ctx.closePath(); ctx.fill();
        D.text(ctx, '×' + MUL[i], k.x, k.y + k.r + 32, { size: F(16), weight: 800, align: 'center', color: '#f8f9fa' });
      });
      // 接线柱
      [[300, 395], [460, 395]].forEach(([x, y]) => { ctx.fillStyle = '#c92a2a'; ctx.beginPath(); ctx.arc(x, y, 16, 0, TAU); ctx.fill(); ctx.fillStyle = '#ced4da'; ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill(); });
      D.text(ctx, '电阻箱 0～9 999 Ω', 380, 26, { size: F(14), weight: 800, align: 'center', color: '#1b2333' });
      EL.sym(ctx, 'rbox', 600, 410, 720, 410, { size: 34, F });
      if (st.mode !== 'read' || st.done) D.text(ctx, '= ' + val() + ' Ω', 120, 412, { size: F(18), weight: 900, align: 'center', color: '#e8590c' });
    }
    PS.drag(S, { VW: 760, VH: 440, hit: (p) => { const i = KN.findIndex((k) => Math.hypot(p.x - k.x, p.y - k.y) < k.r + 12); return i >= 0 ? { i, right: p.x > KN[i].x } : null; }, start: (o) => turn(o.i, o.right ? 1 : -1), move() {} });
    next();
    el._st = st; el._val = val; el._turn = turn;
  });

  /* ================= 电位器 ================= */
  PS.register('potentiometer', function (el) {
    const RP = 30;
    const st = { pair: 'AO', th: 90, t: 0 };
    const pSeg = PS.ui.seg([{ value: 'AO', label: '接 A 和 O（左边和中间）' }, { value: 'OB', label: '接 O 和 B（中间和右边）' }, { value: 'AB', label: '接 A 和 B（两边）' }], 'AO', (v) => { st.pair = v; tell(); });
    const sl = PS.ui.slider({ label: '旋钮转过的角度（顺时针）', min: 0, max: 270, step: 1, value: 90, unit: '°', onInput: (v) => { st.th = v; tell(); } });
    sl.el.classList.add('wide');
    const msg = h('div', { class: 'el-msg info' });
    const view = h('div');
    el.append(h('div', { class: 'controls' }, pSeg.el), view, h('div', { class: 'controls' }, sl.el), msg);
    const S = EN.stage(view, { VW: 1000, vh: (w) => (EN.narrow(w) ? 1080 : 460), draw });
    const R = () => (st.pair === 'AB' ? RP : st.pair === 'AO' ? (st.th / 270) * RP : (1 - st.th / 270) * RP);
    const I = () => Iof(R());
    function tell() {
      msg.className = 'el-msg ok';
      msg.innerHTML = '接入电路的电阻约 ' + PS.fmt(R(), 1) + ' Ω，台灯' + (litOf(I()) > 0.9 ? '很亮' : litOf(I()) > 0.4 ? '较亮' : litOf(I()) > 0.12 ? '较暗' : '很暗') + '。' +
        (st.pair === 'AB' ? '接两边的接线柱 A、B：整段电阻丝都接入电路，转动旋钮<b>不能</b>改变电阻。' : '电位器的接法是“<b>中间固定，两边接一边</b>”。接 ' + (st.pair === 'AO' ? 'A 和 O 时，接入电路的是左侧（A 到滑片）的电阻丝，<b>顺时针</b>转动，电阻变<b>大</b>，灯变暗' : 'O 和 B 时，接入电路的是右侧（滑片到 B）的电阻丝，<b>顺时针</b>转动，电阻变<b>小</b>，灯变亮') + '。') +
        '收音机的音量旋钮、调光台灯的旋钮里都有电位器；数字电位器则用数字信号控制电阻（集成电路）。';
      S.render();
    }
    const loop = PS.loop((dt) => { st.t += dt; S.render(); }, view);
    const ang = (th) => -Math.PI / 2 - (135 * Math.PI) / 180 + (th * Math.PI) / 180;
    let lay = null;
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, 1000, VH), nar = VH > 600, i = I();
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, 1000, VH);
      const cx = nar ? 500 : 290, cy = nar ? 300 : 205, Rr = nar ? 200 : 130;
      // 外壳与电阻片
      ctx.fillStyle = '#ced4da'; ctx.beginPath(); ctx.arc(cx, cy, Rr + 26, 0, TAU); ctx.fill();
      ctx.fillStyle = '#495057'; ctx.beginPath(); ctx.arc(cx, cy, Rr + 14, 0, TAU); ctx.fill();
      const a0 = ang(0), a1 = ang(270), aw = ang(st.th);
      ctx.lineCap = 'butt'; ctx.strokeStyle = '#5c3d1e'; ctx.lineWidth = 26; ctx.beginPath(); ctx.arc(cx, cy, Rr * 0.8, a0, a1); ctx.stroke();
      if (st.pair !== 'AB') { ctx.strokeStyle = 'rgba(255,169,77,.85)'; ctx.lineWidth = 26; ctx.beginPath(); if (st.pair === 'AO') ctx.arc(cx, cy, Rr * 0.8, a0, aw); else ctx.arc(cx, cy, Rr * 0.8, aw, a1); ctx.stroke(); }
      else { ctx.strokeStyle = 'rgba(255,169,77,.85)'; ctx.lineWidth = 26; ctx.beginPath(); ctx.arc(cx, cy, Rr * 0.8, a0, a1); ctx.stroke(); }
      // 端点引线与接线柱
      const T = { A: [cx - Rr * 0.55, cy + Rr + 60], O: [cx, cy + Rr + 60], B: [cx + Rr * 0.55, cy + Rr + 60] };
      ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 8; ctx.lineCap = 'round';
      const pe = (a) => [cx + Math.cos(a) * Rr * 0.8, cy + Math.sin(a) * Rr * 0.8];
      [[pe(a0), T.A], [pe(a1), T.B]].forEach(([p, t]) => { ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(t[0], t[1] - 20); ctx.stroke(); });
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(T.O[0], T.O[1] - 20); ctx.stroke();
      // 滑片（与旋钮一起转）
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(aw);
      ctx.fillStyle = '#e9ecef'; ctx.fillRect(0, -9, Rr * 0.86, 18); ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(Rr * 0.8, 0, 12, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#343a40'; ctx.beginPath(); ctx.arc(cx, cy, Rr * 0.36, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(aw); ctx.fillStyle = '#ffd43b'; ctx.fillRect(Rr * 0.08, -4, Rr * 0.26, 8); ctx.restore();
      Object.keys(T).forEach((k) => {
        const on = st.pair.indexOf(k) >= 0, [x, y] = T[k];
        if (on) { ctx.fillStyle = 'rgba(255,212,59,.85)'; ctx.beginPath(); ctx.arc(x, y, 24, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#868e96'; ctx.fillRect(x - 10, y - 22, 20, 30);
        D.text(ctx, k, x, y + 34, { size: F(16), weight: 900, align: 'center', color: on ? '#e8590c' : '#1b2333' });
      });
      D.text(ctx, '顺时针 ↻', cx + Rr + 40, cy - Rr - 4, { size: F(13), weight: 800, align: 'center', color: '#495057' });
      D.text(ctx, '拖动旋钮转一转', cx, cy - Rr - 34, { size: F(12), color: '#868e96', align: 'center' });
      // 台灯电路
      const lx = nar ? 500 : 760, ly = nar ? 865 : 200, k = nar ? 1.25 : 1;
      ctx.save(); ctx.translate(lx, ly); ctx.scale(k, k);
      const C = EL.circuit(EL.layout({ s: [{ k: 'S', on: true, label: '' }, { k: 'R', t: 'rheo', R: R(), label: '电位器', sp: st.pair === 'AB' ? 0.5 : st.th / 270, tail: st.pair === 'AO' ? 1 : st.pair === 'OB' ? -1 : 0 }, { k: 'L', label: '灯' }] }, { x: -130, y: -110, w: 260, h: 200, Lc: 64, bat: { n: 2, E: 3, r: 0.5 } }));
      C.solve();
      C.spec.els.forEach((e) => { C.ph[e.id] = st.t * EL.speed(i); });
      ctx.fillStyle = '#fff'; D.roundRect(ctx, -175, -165, 350, 315, 14); ctx.fill();
      C.draw(ctx, { F: (p) => F(p) / k, dots: true, size: 30, lw: 2.6 });
      D.text(ctx, '调光台灯的电路', 0, -138, { size: F(13) / k, weight: 800, align: 'center', color: '#3b5bdb' });
      D.text(ctx, 'R = ' + PS.fmt(R(), 1) + ' Ω   I = ' + PS.fmt(i, 2) + ' A', 0, 136, { size: F(12) / k, weight: 800, align: 'center', color: '#e8590c' });
      ctx.restore();
      lay = { cx, cy, Rr };
    }
    PS.drag(S, { VW: 1000, get VH() { return S.VH; },
      hit: (p) => (lay && Math.hypot(p.x - lay.cx, p.y - lay.cy) < lay.Rr + 20 ? 1 : null),
      start() {}, move(_, p) {
        let a = Math.atan2(p.y - lay.cy, p.x - lay.cx) - ang(0);
        a = ((a % TAU) + TAU) % TAU; let th = (a * 180) / Math.PI;
        if (th > 270) th = th > 315 ? 0 : 270;
        st.th = Math.round(th); sl.set(st.th, true); tell();
      } });
    tell();
    loop.start();
    el._st = st;
  });
})();
