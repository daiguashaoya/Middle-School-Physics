/* 第16章第2节：串、并联电路中电压的规律——电压的“高度”图 volt-hill、电路故障的判断 fault-find、
 * 电压的计算随机练习 volt-quiz（{set:'meter'} / {set:'law'} / {set:'r'}）。依赖 circuit.js、energy.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, EL = PS.el, EN = PS.en;
  const TAU = Math.PI * 2;
  const f1 = (x) => PS.fmt(x, 1);

  /* ================= 电压的“高度”图 ================= */
  PS.register('volt-hill', function (el) {
    const st = { mode: 'series', R1: 10, R2: 20, n: 2, t: 0 };
    const modeSeg = PS.ui.seg([{ value: 'series', label: '串联电路' }, { value: 'parallel', label: '并联电路' }], 'series', (v) => { st.mode = v; upd(); });
    const nSeg = PS.ui.seg([1, 2, 3].map((v) => ({ value: v, label: v + ' 节干电池' })), 2, (v) => { st.n = v; upd(); });
    const s1 = PS.ui.slider({ label: 'L1 的规格（电阻）', min: 5, max: 30, step: 1, value: 10, unit: 'Ω', onInput: (v) => { st.R1 = v; upd(); } });
    const s2 = PS.ui.slider({ label: 'L2 的规格（电阻）', min: 5, max: 30, step: 1, value: 20, unit: 'Ω', onInput: (v) => { st.R2 = v; upd(); } });
    const msg = h('div', { class: 'el-msg ok' });
    const view = h('div');
    el.append(h('div', { class: 'controls' }, modeSeg.el, nSeg.el), h('div', { class: 'controls' }, s1.el, s2.el), view, msg);
    const S = EN.stage(view, { VW: 1000, vh: (w) => (EN.narrow(w) ? 1260 : 500), draw });
    let C = null, V = {};
    function upd() {
      const E = 1.5 * st.n;
      const desc = st.mode === 'series' ? { s: [{ k: 'L1', R: st.R1, label: 'L1', pos: 0.3, seg: 2, ls: -1 }, { k: 'L2', R: st.R2, label: 'L2', pos: 0.75, seg: 2, ls: -1 }] } : { b: [[{ k: 'L1', R: st.R1, label: 'L1', ls: -1 }], [{ k: 'L2', R: st.R2, label: 'L2', ls: -1 }]] };
      C = EL.circuit(EL.layout(desc, { x: -160, y: -110, w: 320, h: 230, Lc: 60, bat: { n: st.n, E, r: 0.001 } }));
      C.solve();
      const u = (id) => { const e = C.el(id); return C.sol.V[e.a] - C.sol.V[e.b]; };
      V = { U: E, U1: u('L1'), U2: u('L2'), I: Math.abs(C.sol.out.E || 0) };
      msg.innerHTML = st.mode === 'series'
        ? '串联：U₁ = ' + f1(V.U1) + ' V，U₂ = ' + f1(V.U2) + ' V，U₁ + U₂ = ' + f1(V.U1 + V.U2) + ' V = 电源电压 U。电源把电荷“举高” ' + f1(E) + ' V，电荷依次经过 L1、L2，每经过一个用电器“降低”一部分，两次降低的总和等于升高的。<b>串联电路两端的总电压等于各部分电路两端电压之和：U = U₁ + U₂</b>。电阻（规格）大的灯泡分得的电压大；两灯规格相同时电压相等。'
        : '并联：电荷从电源“举高” ' + f1(E) + ' V 后，无论走哪一条支路，都要“降低”同样的高度回到负极。<b>并联电路中各支路两端的电压相等，都等于电源电压：U = U₁ = U₂</b>（' + f1(V.U1) + ' V = ' + f1(V.U2) + ' V）。不论两灯规格是否相同都是这样。';
      S.render();
    }
    const loop = PS.loop((dt) => { st.t += dt; if (C) C.step(dt); S.render(); }, view);
    /** 沿回路的“电位”剖面：返回 [{ x0, x1, y0, y1, kind, name }] */
    function profile(branch) {
      const E = V.U, segs = [], put = (w, y0, y1, kind, name) => { const x0 = segs.length ? segs[segs.length - 1].x1 : 0; segs.push({ x0, x1: x0 + w, y0, y1, kind, name }); };
      put(1, 0, E, 'bat', '电源');
      put(0.6, E, E, 'wire', '');
      if (st.mode === 'series') { put(1.4, E, E - V.U1, 'L1', 'L1'); put(0.6, E - V.U1, E - V.U1, 'wire', ''); put(1.4, E - V.U1, 0, 'L2', 'L2'); }
      else if (branch === 1) { put(1.7, E, 0, 'L1', 'L1'); put(1.7, 0, 0, 'wire', ''); }
      else { put(1.7, E, E, 'wire', ''); put(1.7, E, 0, 'L2', 'L2'); }
      put(0.6, 0, 0, 'wire', '');
      return segs;
    }
    const COL = { bat: '#e8590c', L1: '#1c7ed6', L2: '#7048e8', wire: '#868e96' };
    function chart(ctx, F, x0, y0, w, hh) {
      const tot = profile(1).reduce((m, s) => Math.max(m, s.x1), 0), Ymax = 4.5;
      const X = (x) => x0 + (x / tot) * w, Y = (v) => y0 + hh - (v / Ymax) * hh;
      ctx.fillStyle = '#fff'; ctx.fillRect(x0 - 10, y0 - 10, w + 20, hh + 20);
      ctx.strokeStyle = '#e9ecef'; ctx.lineWidth = 1;
      for (let v = 0; v <= Ymax + 1e-9; v += 1.5) { ctx.beginPath(); ctx.moveTo(x0, Y(v)); ctx.lineTo(x0 + w, Y(v)); ctx.stroke(); D.text(ctx, f1(v), x0 - 8, Y(v) + 4, { size: F(11), align: 'right', color: '#868e96' }); }
      D.text(ctx, '“电位”/V', x0 - 8, y0 - 14, { size: F(11), weight: 700, align: 'right', color: '#495057' });
      D.arrow(ctx, x0, y0 + hh, x0, y0 - 6, { color: '#495057', width: 1.6, head: 7 });
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x0, y0 + hh); ctx.lineTo(x0 + w, y0 + hh); ctx.stroke();
      const branches = st.mode === 'series' ? [1] : [1, 2];
      branches.forEach((b) => {
        const segs = profile(b);
        segs.forEach((s) => {
          ctx.strokeStyle = COL[s.kind]; ctx.lineWidth = s.kind === 'wire' ? 3 : 6; ctx.lineCap = 'round';
          if (b === 2) ctx.setLineDash([10, 7]);
          ctx.beginPath(); ctx.moveTo(X(s.x0), Y(s.y0) + (b === 2 ? 0 : 0)); ctx.lineTo(X(s.x1), Y(s.y1)); ctx.stroke(); ctx.setLineDash([]);
          if (s.name && s.kind !== 'bat') D.text(ctx, s.name, X((s.x0 + s.x1) / 2) + F(12) * 1.2, Y((s.y0 + s.y1) / 2), { size: F(12), weight: 800, align: 'center', baseline: 'middle', color: COL[s.kind], bg: 'rgba(255,255,255,.85)' });
        });
        // 沿剖面移动的“电荷”
        const L = segs[segs.length - 1].x1, sp = 0.35 * Math.tanh(V.I / 0.3) + 0.05;
        for (let k = 0; k < 8; k++) {
          const p = (((st.t * sp + k / 8 + (b === 2 ? 0.06 : 0)) % 1) + 1) % 1 * L;
          const s = segs.find((g) => p >= g.x0 && p <= g.x1) || segs[0], f = (p - s.x0) / (s.x1 - s.x0 || 1);
          ctx.fillStyle = b === 2 ? '#ae3ec9' : '#f08c00'; ctx.beginPath(); ctx.arc(X(p), Y(s.y0 + (s.y1 - s.y0) * f) - 7, 5.5, 0, TAU); ctx.fill();
        }
      });
      // 标出 U、U1、U2
      const E = V.U, xr = x0 + w + 14;
      const vArrow = (x, a, b, t, c) => { if (Math.abs(a - b) < 0.05) return; D.arrow(ctx, x, Y((a + b) / 2), x, Y(a) + 1, { color: c, width: 2, head: 7 }); D.arrow(ctx, x, Y((a + b) / 2), x, Y(b) - 1, { color: c, width: 2, head: 7 }); D.text(ctx, t, x + 6, Y((a + b) / 2) + 4, { size: F(12), weight: 800, color: c, bg: 'rgba(255,255,255,.9)' }); };
      if (st.mode === 'series') { vArrow(xr, E, E - V.U1, 'U₁=' + f1(V.U1) + 'V', COL.L1); vArrow(xr, E - V.U1, 0, 'U₂=' + f1(V.U2) + 'V', COL.L2); }
      else { vArrow(xr, E, 0, 'U₁=U₂=' + f1(E) + 'V', COL.L1); }
      vArrow(xr + (st.nar ? 150 : 92), 0, E, (st.nar ? 'U=' : '电源 U=') + f1(E) + 'V', COL.bat);
    }
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, 1000, VH), nar = VH > 700;
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, 1000, VH);
      if (!C) return;
      st.nar = nar;
      const k = nar ? 1.7 : 1, cx = nar ? 500 : 215, cy = nar ? 345 : 260;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
      ctx.fillStyle = '#fff'; D.roundRect(ctx, -200, -175, 400, 345, 14); ctx.fill();
      C.draw(ctx, { F: (p) => F(p) / k, dots: true, size: 28, lw: 2.6 });
      const tag = (id, t) => { const e = C.el(id), a = C.spec.pos[e.a], b = C.spec.pos[e.b], vert = Math.abs(a[0] - b[0]) < 1; D.text(ctx, t, (a[0] + b[0]) / 2 + (vert ? 46 : 0), (a[1] + b[1]) / 2 + (vert ? 0 : 38), { size: F(12) / k, weight: 800, align: 'center', baseline: 'middle', color: '#0c8599', bg: 'rgba(255,255,255,.9)' }); };
      tag('L1', 'U₁=' + f1(V.U1) + 'V'); tag('L2', 'U₂=' + f1(V.U2) + 'V');
      D.text(ctx, '电源 U=' + f1(V.U) + 'V', 0, 158, { size: F(12) / k, weight: 800, align: 'center', color: '#e8590c' });
      ctx.restore();
      if (nar) chart(ctx, F, 175, 760, 470, 400);
      else chart(ctx, F, 510, 70, 270, 360);
      if (nar) { D.text(ctx, '电路中各点的“电位”（类比为高度）', 500, 650, { size: F(13), weight: 800, align: 'center', color: '#495057' }); D.text(ctx, '电压就是两点“电位”之差', 500, 650 + F(13) * 1.3, { size: F(13), weight: 800, align: 'center', color: '#495057' }); }
      else D.text(ctx, '电路中各点的“电位”（类比为高度）：电压就是两点“电位”之差', 700, 30, { size: F(13), weight: 800, align: 'center', color: '#495057' });
    }
    upd();
    loop.start();
    el._st = st; el._V = () => V;
  });

  /* ================= 电路故障的判断 ================= */
  const FW = (id, a, b, via) => ({ id, t: 'wire', a, b, via: via || [] });
  const FBASE = {
    pos: { bp: [340, 380], bn: [280, 380], aa: [520, 320], ab: [520, 240], l1a: [450, 120], l1b: [370, 120], m: [310, 120], l2a: [250, 120], l2b: [170, 120], sa: [100, 200], sb: [100, 290] },
    els: [{ id: 'E', t: 'bat', a: 'bp', b: 'bn', n: 2, E: 3, r: 0.5 }, FW('w1', 'bp', 'aa', [[520, 380]]), { id: 'A', t: 'amm', a: 'aa', b: 'ab', label: '' }, FW('w2', 'ab', 'l1a', [[520, 120]]),
      { id: 'L1', t: 'bulb', a: 'l1a', b: 'l1b', label: 'L1', ls: 1 }, FW('w3', 'l1b', 'm'), FW('w4', 'm', 'l2a'), { id: 'L2', t: 'bulb', a: 'l2a', b: 'l2b', label: 'L2', ls: 1 }, FW('w5', 'l2b', 'sa', [[100, 120]]),
      { id: 'S', t: 'sw', a: 'sa', b: 'sb', on: true, label: 'S', ls: -1 }, FW('w6', 'sb', 'bn', [[100, 380]])],
  };
  const VPOS = {
    L1: { pos: { va: [450, 48], vb: [370, 48] }, els: [FW('v1', 'l1a', 'va'), { id: 'V', t: 'vm', a: 'va', b: 'vb', label: '' }, FW('v2', 'vb', 'l1b')] },
    L2: { pos: { va: [250, 48], vb: [170, 48] }, els: [FW('v1', 'l2a', 'va'), { id: 'V', t: 'vm', a: 'va', b: 'vb', label: '' }, FW('v2', 'vb', 'l2b')] },
    E: { pos: { va: [340, 440], vb: [280, 440] }, els: [FW('v1', 'bp', 'va'), { id: 'V', t: 'vm', a: 'va', b: 'vb', label: '' }, FW('v2', 'vb', 'bn')] },
  };
  const FAULTS = [
    { k: 'L1o', n: 'L1 断路', why: '两灯都不亮、电流表几乎无示数，说明电路<b>断路</b>；电压表接在 L1 两端时示数接近电源电压，说明电压表经过 L2、电流表、开关与电源连通了——断开的地方就在电压表所并联的 <b>L1</b> 处（此时电压表相当于串联在电路中）。' },
    { k: 'L2o', n: 'L2 断路', why: '两灯都不亮、电流表几乎无示数，说明电路<b>断路</b>；电压表接在 L2 两端时示数接近电源电压，接在 L1 两端时示数为零——断开的地方在 <b>L2</b> 处。' },
    { k: 'L1s', n: 'L1 短路', why: 'L2 亮、L1 不亮，电流表有示数（而且比正常时大），说明电路是通的，是<b>短路</b>；电压表接在 L1 两端时示数为零（L1 两端被导线连通），接在 L2 两端时示数接近电源电压——<b>L1 被短路</b>。' },
    { k: 'L2s', n: 'L2 短路', why: 'L1 亮、L2 不亮，电流表示数变大，说明是<b>短路</b>；电压表接在 L2 两端时示数为零，接在 L1 两端时示数接近电源电压——<b>L2 被短路</b>。' },
  ];
  PS.register('fault-find', function (el) {
    const st = { f: null, vp: 'L1', done: false, n: 0, ok: 0, t: 0, last: -1 };
    const vSeg = PS.ui.seg([{ value: 'L1', label: '电压表接在 L1 两端' }, { value: 'L2', label: '接在 L2 两端' }, { value: 'E', label: '接在电源两端' }], 'L1', (v) => { st.vp = v; build(); });
    const view = h('div');
    const obs = h('div', { class: 'el-msg info' });
    const opts = h('div', { class: 'el-chips' });
    const fb = h('div', { class: 'el-msg info' });
    const score = h('div', { class: 'small muted' });
    el.append(h('div', { class: 'el-pair ff-pair' }, h('div', null, h('div', { class: 'controls' }, vSeg.el), view),
      h('div', null, h('div', { class: 'panel' }, h('h4', null, '① 闭合开关，观察现象'), obs), h('div', { class: 'panel' }, h('h4', null, '② 故障出在哪里？'), opts, fb, h('div', { class: 'controls', style: { marginTop: '6px' } }, PS.ui.button('换一个故障', next, 'btn btn-ghost btn-sm')), score))));
    FAULTS.forEach((f) => opts.append(PS.ui.button(f.n, () => answer(f.k), 'btn btn-sm')));
    const S = PS.stage(view, { ratio: '600 / 470', draw });
    let C = null, net = null;
    function spec(withFault, show) {
      const v = VPOS[st.vp];
      const sp = { pos: Object.assign({}, FBASE.pos, v.pos), els: FBASE.els.concat(v.els).map((e) => Object.assign({}, e)) };
      if (withFault && st.f) {
        const id = st.f.slice(0, 2), lamp = sp.els.find((e) => e.id === id);
        if (st.f[2] === 'o') lamp.open = true;
        else sp.els.push(FW('F', lamp.a, lamp.b, id === 'L1' ? [[450, 178], [370, 178]] : [[250, 178], [170, 178]]));
        if (show) { const fw = sp.els.find((e) => e.id === 'F'); if (fw) fw.hlw = '#e03131'; }
      }
      return sp;
    }
    function build() {
      net = spec(true);
      C = EL.circuit(spec(true, st.done));
      if (!st.done) { const shown = spec(false); C = EL.circuit(shown); }
      C.sol = EL.solve(net);
      C.deg = {}; C.spec.els.forEach((e) => { C.deg[e.a] = (C.deg[e.a] || 0) + 1; C.deg[e.b] = (C.deg[e.b] || 0) + 1; });
      const lit = (id) => Math.max(0, (C.sol.P[id] || 0) / 0.75);
      const Ia = Math.abs(C.sol.I.A || 0), Uv = EL.vread(net, C.sol, 'V');
      const lamp = (id) => (lit(id) > 0.45 ? '比正常时更亮' : lit(id) > 0.04 ? '发光' : '<b>不亮</b>');
      obs.className = 'el-msg info';
      obs.innerHTML = 'L1 ' + lamp('L1') + '，L2 ' + lamp('L2') + '；<br>电流表示数 <b>' + PS.fmt(EL.reading(Ia, 0.6), 2) + ' A</b>（正常时约 0.14 A）；<br>电压表（' + { L1: '接在 L1 两端', L2: '接在 L2 两端', E: '接在电源两端' }[st.vp] + '）示数 <b>' + PS.fmt(EL.reading(Math.max(0, Uv), 3), 1) + ' V</b>。' + (st.done ? '' : '<br><span class="muted">把电压表改接到别的位置，再看看。</span>');
      S.render();
    }
    function next() {
      let i; do { i = PS.randInt(0, FAULTS.length - 1); } while (i === st.last);
      st.last = i; st.f = FAULTS[i].k; st.done = false; st.vp = 'L1'; vSeg.set('L1', true);
      fb.className = 'el-msg info'; fb.innerHTML = '电路中只有一处故障（某个灯泡断路或短路）。先看两灯和电流表：都不亮、电流表无示数 → 断路；一灯亮、电流表有示数 → 短路。再用电压表找出是哪一个。';
      build();
    }
    function answer(k) {
      if (st.done) return;
      const f = FAULTS.find((x) => x.k === st.f), good = k === st.f;
      st.done = true; st.n++; if (good) st.ok++;
      fb.className = 'el-msg ' + (good ? 'ok' : 'bad');
      fb.innerHTML = (good ? '✔ 正确！故障是 ' : '✘ 不对，故障是 ') + '<b>' + f.n + '</b>（图中已用红色标出）。' + f.why;
      score.innerHTML = '已做 ' + st.n + ' 题，答对 ' + st.ok + ' 题。'; good ? PS.sound.good() : PS.sound.bad();
      build();
    }
    const loop = PS.loop((dt) => { st.t += dt; if (C) C.step(dt); S.render(); }, view);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, 600, 470);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 600, 470);
      if (!C) return;
      C.draw(ctx, { F, size: 30, lw: 2.6, dots: true, gap: 26, r: 3.4 });
      const Ia = Math.abs(C.sol.I.A || 0), Uv = Math.max(0, EL.vread(net, C.sol, 'V'));
      D.text(ctx, PS.fmt(EL.reading(Ia, 0.6), 2) + ' A', 462, 280, { size: F(13), weight: 800, align: 'center', baseline: 'middle', color: '#3b5bdb', bg: 'rgba(255,255,255,.92)' });
      const vp = VPOS[st.vp].pos, vx = (vp.va[0] + vp.vb[0]) / 2, vy = vp.va[1];
      D.text(ctx, PS.fmt(EL.reading(Uv, 3), 1) + ' V', vx + 78, vy, { size: F(13), weight: 800, align: 'center', baseline: 'middle', color: '#0c8599', bg: 'rgba(255,255,255,.92)' });
      if (st.done && st.f[2] === 'o') { const p = C.spec.pos[st.f.slice(0, 2) === 'L1' ? 'l1a' : 'l2a']; D.text(ctx, '断路', p[0] - 40, 165, { size: F(13), weight: 900, align: 'center', color: '#e03131' }); }
      if (st.done && st.f[2] === 's') D.text(ctx, '短路', st.f.slice(0, 2) === 'L1' ? 410 : 210, 200, { size: F(13), weight: 900, align: 'center', color: '#e03131' });
      D.text(ctx, '电源 3 V，L1、L2 规格相同，开关已闭合', 12, 462, { size: F(11), color: '#868e96' });
    }
    next();
    loop.start();
    el._st = st; el._answer = answer;
  });

  /* ================= 电压的计算随机练习 ================= */
  PS.register('volt-quiz', function (el, opts) {
    const box = h('div', { class: 'el-q', style: { marginTop: 0 } });
    const dialV = h('div', { style: { maxWidth: '240px', display: 'none' } });
    const inp = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', autocomplete: 'off', placeholder: '答案' });
    const unit = h('span', null, 'V');
    const fb = h('div', { class: 'el-msg info' });
    const score = h('div', { class: 'small muted', style: { marginTop: '6px' } });
    el.append(box, dialV, h('div', { class: 'el-ans' }, inp, unit, PS.ui.button('提交', check, 'btn btn-primary btn-sm'), PS.ui.button('换一题', next, 'btn btn-ghost btn-sm')), fb, score);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    const DS = PS.stage(dialV, { ratio: '1 / 0.86', draw: (ctx, w, hh) => { if (!Q || !Q.dial) return; const F = PS.virtual(ctx, w, hh, 300, 258); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 300, 258); EL.dial(ctx, 150, 112, 250, { v: Q.dial.v, range: Q.dial.range, ranges: [3, 15], unit: 'V', body: '#2f3d4a', terms: true, sel: ['-', String(Q.dial.range)], F }); } });
    let Q = null, n = 0, ok = 0;
    const pick = PS.pick, r1 = (x) => PS.round(x, 1);
    const GEN = {
      unit: () => { const t = pick([0, 1, 2, 3]); if (t === 0) { const a = pick([10, 35, 110, 500]); return { q: a + ' kV = ? V', a: a * 1000, u: 'V', sol: '1 kV = 10³ V，' + a + ' kV = ' + a * 1000 + ' V。' }; } if (t === 1) { const m = pick([500, 1500, 3700, 80]); return { q: m + ' mV = ? V', a: m / 1000, u: 'V', sol: '1 mV = 10⁻³ V，' + m + ' mV = ' + m / 1000 + ' V。' }; } if (t === 2) { const v = pick([1.5, 0.2, 3.7, 0.05]); return { q: v + ' V = ? mV', a: PS.round(v * 1000, 3), u: 'mV', sol: '1 V = 10³ mV，' + v + ' V = ' + PS.round(v * 1000, 3) + ' mV。' }; } return { q: '家庭电路的电压 220 V = ? kV', a: 0.22, u: 'kV', sol: '1 V = 10⁻³ kV，220 V = 0.22 kV。' }; },
      cells: () => { const t = pick([0, 1, 2]); if (t === 0) { const k = pick([2, 3, 4, 6]); return { q: k + ' 节新干电池串联组成的电池组，电压是多少？', a: 1.5 * k, u: 'V', sol: '一节新干电池的电压是 1.5 V，串联电池组的电压等于各节电池电压之和：' + k + ' × 1.5 V = ' + 1.5 * k + ' V。' }; } if (t === 1) { const U = pick([3, 4.5, 6, 9]); return { q: '要得到 ' + U + ' V 的电压，需要把几节新干电池串联起来？', a: U / 1.5, u: '节', sol: U + ' V ÷ 1.5 V = ' + U / 1.5 + '（节）。' }; } const k = pick([3, 6]); return { q: k + ' 个铅蓄电池串联，电压是多少？', a: 2 * k, u: 'V', sol: '一个铅蓄电池的电压是 2 V，' + k + ' × 2 V = ' + 2 * k + ' V。' }; },
      read: () => { const range = pick([3, 15]), k = PS.randInt(4, 28); return { q: '电压表接“−”和“' + range + '”两个接线柱，指针位置如下图所示，示数是多少？', a: r1((k * range) / 30), u: 'V', dial: { v: (k * range) / 30, range }, sol: '0~' + range + ' V 量程每小格 ' + range / 30 + ' V，指针偏过 ' + k + ' 小格：' + k + ' × ' + range / 30 + ' V = ' + r1((k * range) / 30) + ' V。' }; },
      series: () => { const U = pick([3, 4.5, 6, 9, 12]), U1 = r1(U * pick([0.3, 0.4, 0.45, 0.6, 0.7])); return { q: '灯泡 L1、L2 串联接在电压为 ' + U + ' V 的电源上，L1 两端的电压为 ' + U1 + ' V，L2 两端的电压是多少？', a: r1(U - U1), u: 'V', sol: '串联电路中 U = U₁ + U₂，U₂ = U − U₁ = ' + U + ' V − ' + U1 + ' V = ' + r1(U - U1) + ' V。' }; },
      lights: () => { if (pick([0, 1])) { const v = pick([6, 8, 9, 12]); const nn = Math.ceil(220 / v); return { q: '节日小彩灯接在 220 V 的家庭电路中，每只小彩灯两端的电压不能超过 ' + v + ' V，至少要串联多少只小彩灯？', a: nn, u: '只', sol: '串联时总电压等于各灯电压之和：220 V ÷ ' + v + ' V ≈ ' + PS.round(220 / v, 2) + '，只能取整数且要“至少”，所以要' + (220 % v ? '进一法取 ' : '') + nn + ' 只。' }; } const k = pick([20, 22, 44, 55]); return { q: k + ' 只相同的小彩灯串联接在 220 V 的电路中，每只小彩灯两端的电压是多少？', a: PS.round(220 / k, 3), u: 'V', sol: '规格相同的灯泡串联，电压平均分配：220 V ÷ ' + k + ' = ' + PS.round(220 / k, 3) + ' V。' }; },
      parallel: () => { const k = pick([2, 3, 4]); return { q: '灯泡 L1、L2 并联后接在由 ' + k + ' 节新干电池串联组成的电源上，L1 比 L2 亮。L2 两端的电压是多少？', a: 1.5 * k, u: 'V', sol: '并联电路中各支路两端的电压相等，都等于电源电压：U₂ = U = ' + k + ' × 1.5 V = ' + 1.5 * k + ' V（与灯泡亮暗无关）。' }; },
      switch: () => { const U = pick([4.5, 6, 3]), U1 = r1(U * pick([0.3, 0.4, 0.6, 2 / 3])); return { q: 'L1、L2 串联。开关 S1 闭合、S2 断开时，电压表测 L1 和 L2 两端的总电压，示数为 ' + U + ' V；S1 断开、S2 闭合时，电压表测 L1 两端的电压，示数为 ' + U1 + ' V。L2 两端的电压是多少？', a: r1(U - U1), u: 'V', sol: '电源电压不变，U = ' + U + ' V，U₁ = ' + U1 + ' V，所以 U₂ = U − U₁ = ' + r1(U - U1) + ' V。' }; },
      dial: () => { const k = PS.randInt(8, 28), v = k / 10; return { q: '电源由 3 节新干电池串联组成，L1、L2 串联，电压表测 L1 两端的电压（接“−”和“3”接线柱），示数如下图所示。L2 两端的电压是多少？', a: r1(4.5 - v), u: 'V', dial: { v, range: 3 }, sol: '电源电压 U = 3 × 1.5 V = 4.5 V；电压表 0~3 V 量程，分度值 0.1 V，U₁ = ' + v + ' V；U₂ = U − U₁ = ' + r1(4.5 - v) + ' V。' }; },
      wrong: () => { const k = PS.randInt(8, 28), v = k / 10; return { q: '用电压表 0~3 V 的量程测灯泡两端的电压，某同学却按 0~15 V 的刻度读成了 ' + r1(v * 5) + ' V。灯泡两端的电压实际是多少？', a: v, u: 'V', sol: '同一指针位置，0~15 V 量程的读数是 0~3 V 量程的 5 倍：' + r1(v * 5) + ' V ÷ 5 = ' + v + ' V。' }; },
      runit: () => { const t = pick([0, 1, 2, 3]); if (t === 0) { const a = pick([2.2, 4.7, 10, 0.5]); return { q: a + ' kΩ = ? Ω', a: PS.round(a * 1000, 3), u: 'Ω', sol: '1 kΩ = 10³ Ω，' + a + ' kΩ = ' + PS.round(a * 1000, 3) + ' Ω。' }; } if (t === 1) { const a = pick([1, 2, 0.5]); return { q: a + ' MΩ = ? Ω', a: a * 1e6, u: 'Ω', sol: '1 MΩ = 10⁶ Ω，' + a + ' MΩ = ' + a + ' × 10⁶ Ω。' }; } if (t === 2) { const a = pick([4700, 1500, 330]); return { q: a + ' Ω = ? kΩ', a: a / 1000, u: 'kΩ', sol: '1 Ω = 10⁻³ kΩ，' + a + ' Ω = ' + a / 1000 + ' kΩ。' }; } const a = pick([3, 5]); return { q: a + ' MΩ = ? kΩ', a: a * 1000, u: 'kΩ', sol: '1 MΩ = 10³ kΩ，' + a + ' MΩ = ' + a * 1000 + ' kΩ。' }; },
    };
    const SETS = { meter: ['unit', 'unit', 'cells', 'read', 'read'], law: ['series', 'lights', 'parallel', 'switch', 'dial', 'wrong', 'cells'], r: ['runit'] };
    const keys = SETS[opts.set] || Object.keys(GEN);
    function next() {
      Q = GEN[pick(keys)]();
      box.innerHTML = '<b>计算：</b>' + Q.q; unit.textContent = Q.u;
      dialV.style.display = Q.dial ? '' : 'none';
      inp.value = ''; inp.disabled = false;
      fb.className = 'el-msg info'; fb.innerHTML = '串联：U = U₁ + U₂；并联：U = U₁ = U₂；1 kV = 10³ V，1 V = 10³ mV；一节新干电池 1.5 V。';
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
    el._q = () => Q;
  });

  if (!document.getElementById('vl-style')) document.head.append(h('style', { id: 'vl-style' }, `
    .ff-pair{grid-template-columns:minmax(0,1fr) minmax(0,320px)}
    @media (max-width:680px){.ff-pair{grid-template-columns:minmax(0,1fr)}}
  `));
})();
