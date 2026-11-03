/* 第12章第3节：机械效率——三种方法把沙子运上三楼（有用功、额外功、总功）、机械效率计算器、η 与物重和动滑轮重的关系、测量斜面的机械效率。依赖 force.js、dynamics.js、energy.js、machine.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, MC = PS.mc, C = PS.MC, EN = PS.en;
  const TAU = Math.PI * 2;
  const P = (x, y) => ({ x, y });
  const CU = '#2f9e44', CE = '#e03131';

  /* ================= 三种方法把沙子运上三楼 ================= */
  const WAYS = [
    { t: '① 提着桶走上楼', s1: '提着桶', s2: '走上楼', ex: [['对桶做功', 20], ['克服自身重力做功', 400]] },
    { t: '② 用动滑轮提桶', s1: '动滑轮', s2: '+ 桶', ex: [['对桶做功', 20], ['对动滑轮做功', 10]] },
    { t: '③ 用动滑轮提口袋', s1: '动滑轮', s2: '+ 口袋', ex: [['对口袋做功', 5], ['对动滑轮做功', 10]] },
  ];
  PS.register('work-kinds', function (el) {
    const VW = 1000, HM = 6, GS = 100;
    const st = { k: 0, p: 0, t: -1, done: [false, false, false] };
    const seg = PS.ui.seg(WAYS.map((w, i) => ({ value: i, label: w.t })), st.k, (v) => { st.k = v; st.p = 0; st.t = -1; tell(); });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el, PS.ui.button('▶ 运沙子', () => { st.p = 0; st.t = 0; }, 'btn btn-primary btn-sm')));
    const S = EN.stage(el, { VW, vh: (w) => (EN.narrow(w) ? 960 : 520), draw });
    const msg = h('div', { class: 'fc-msg info' });
    el.append(h('div', { class: 'small muted', style: { marginTop: '6px' } }, '沙子重 100 N，桶重 20 N，口袋重 5 N，动滑轮重 10 N，人重 400 N；三楼地面离地 6 m。不计绳重和摩擦。'), msg);
    const W = (k) => { const e = WAYS[k].ex.reduce((s, x) => s + x[1] * HM, 0); return { u: GS * HM, e, t: GS * HM + e, eta: (GS * HM) / (GS * HM + e) }; };
    function tell() {
      const w = WAYS[st.k], r = W(st.k);
      if (!st.done[st.k]) { msg.className = 'fc-msg info'; msg.innerHTML = '目的是把沙子运上三楼。点“运沙子”，看看这种方法要做多少功。'; S.render(); return; }
      msg.className = 'fc-msg ok';
      msg.innerHTML = '<b>有用功</b>（为了达到目的必须做的功）：对沙子做的功 W有 = G沙h = 100 N × 6 m = <b>600 J</b>。<br><b>额外功</b>（不需要但又不得不做的功）：' + w.ex.map((x) => x[0] + ' ' + x[1] + ' N × 6 m = ' + x[1] * HM + ' J').join('，') + '，共 <b>' + r.e + ' J</b>。<br><b>总功</b> W总 = W有 + W额 = <b>' + r.t + ' J</b>，机械效率 η = W有/W总 ≈ <b>' + PS.fmt(r.eta * 100, 1) + '%</b>。'
        + (st.done.every(Boolean) ? '<br>三种方法的<b>有用功相同</b>，额外功越少，机械效率越高。' : '');
      S.render();
    }
    PS.loop((dt) => {
      if (st.t < 0) return;
      st.t += dt; st.p = Math.min(1, st.t / 3);
      if (st.p >= 1) { st.t = -1; st.done[st.k] = true; PS.sound.ping(); tell(); }
      S.render();
    }, el).start();
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, VW, VH), nar = EN.narrow(w);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const GY = 480, FH = 120, BX = nar ? 160 : 60, BW = 380, X2 = BX + BW;
      // 楼房（三层）
      ctx.fillStyle = '#fff4e6'; ctx.strokeStyle = '#d9480f'; ctx.lineWidth = 2;
      ctx.fillRect(BX, GY - 3 * FH - 20, BW, 3 * FH + 20); ctx.strokeRect(BX, GY - 3 * FH - 20, BW, 3 * FH + 20);
      ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 3;
      for (let i = 1; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(BX, GY - i * FH); ctx.lineTo(X2, GY - i * FH); ctx.stroke(); }
      PS.force.ground(ctx, BX - 50, X2 + 230, GY);
      ['一楼', '二楼', '三楼'].forEach((t, i) => D.text(ctx, t, BX + 10, GY - i * FH - 10, { size: F(13), weight: 700, color: '#c2410c' }));
      // 楼梯
      ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 3;
      for (let f = 0; f < 2; f++) { const y0 = GY - f * FH, dir = f % 2 ? -1 : 1, x0 = dir > 0 ? BX + 70 : X2 - 60; ctx.beginPath(); ctx.moveTo(x0, y0); for (let s = 1; s <= 8; s++) { const x = x0 + dir * s * 31, y = y0 - s * 15; ctx.lineTo(x - dir * 31, y); ctx.lineTo(x, y); } ctx.stroke(); }
      const k = st.k, p = st.p, hpx = 2 * FH;
      ctx.save(); ctx.translate(X2 + 210, GY - FH); ctx.rotate(-Math.PI / 2); D.dim(ctx, -FH, FH, 0, 'h = 6 m', { size: F(13), color: C.F2 }); ctx.restore();
      if (k === 0) {
        // 人提桶沿楼梯走上三楼
        const leg = p < 0.5 ? p * 2 : (p - 0.5) * 2, fl = p < 0.5 ? 0 : 1, dir = fl ? -1 : 1, x0 = dir > 0 ? BX + 70 : X2 - 60;
        const x = x0 + dir * leg * 248, y = GY - fl * FH - leg * FH;
        const hp = P(x + dir * 14, y - 40);
        PS.force.person(ctx, x, y, { h: 80, color: '#3b5bdb', dir, hand: hp, stride: 0.2 + 0.2 * Math.sin(st.t * 10) });
        bucket(ctx, hp.x, hp.y + 2, true);
      } else {
        // 站在三楼平台上，用动滑轮把桶 / 口袋拉上来
        const top = GY - hpx, beamY = top - 85, tx = X2 + 70, r = 16, cy = GY - 60 - p * hpx;
        ctx.fillStyle = '#868e96'; ctx.fillRect(X2, beamY - 6, 130, 10);
        ctx.fillStyle = '#ced4da'; ctx.fillRect(X2, top - 4, 80, 8);
        MC.rope(ctx, { segs: [[tx, beamY + 4, tx, cy], [tx + 2 * r, cy, tx + 2 * r, top - 62]], arcs: [{ x: tx + r, y: cy, r, a0: Math.PI, d: -Math.PI }] }, { w: 2.4 });
        MC.pulley(ctx, tx + r, cy, r, { rot: -p * 6 });
        const ly = cy + r + 4;
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx + r, cy); ctx.lineTo(tx + r, ly); ctx.stroke();
        if (k === 1) bucket(ctx, tx + r, ly, false); else bag(ctx, tx + r, ly);
        PS.force.person(ctx, X2 + 30, top, { h: 80, color: '#3b5bdb', dir: 1, hand: P(tx + 2 * r, top - 62 + 4 * Math.sin(st.t * 8)), hand2: P(tx + 2 * r, top - 50) });
      }
      // 功的柱状图
      const bx = nar ? 120 : 600, bw2 = nar ? 760 : 370, by = nar ? 560 : 40, bh = nar ? 360 : 420;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#dee2e6'; ctx.lineWidth = 1.2; D.roundRect(ctx, bx - 20, by, bw2 + 40, bh, 12); ctx.fill(); ctx.stroke();
      D.text(ctx, '功（J）', bx, by + F(14) + 8, { size: F(14), weight: 800, color: '#343a40' });
      D.text(ctx, '■ 有用功', bx + bw2 * 0.42, by + F(14) + 8, { size: F(13), weight: 700, color: CU });
      D.text(ctx, '■ 额外功', bx + bw2 * 0.72, by + F(14) + 8, { size: F(13), weight: 700, color: CE });
      const base = by + bh - F(13) * 2.6 - 14, topY = by + F(14) * 2.4 + 24, kpx = (base - topY) / 3120;
      WAYS.forEach((wy, i) => {
        const r = W(i), cx = bx + (bw2 / 3) * (i + 0.5), cw = Math.min(70, bw2 / 3 * 0.5);
        const showIt = st.done[i];
        ctx.globalAlpha = showIt ? 1 : 0.18;
        const hu = r.u * kpx, he = r.e * kpx;
        ctx.fillStyle = CU; ctx.fillRect(cx - cw / 2, base - hu, cw, hu);
        ctx.fillStyle = CE; ctx.fillRect(cx - cw / 2, base - hu - he, cw, he);
        ctx.globalAlpha = 1;
        if (showIt) D.text(ctx, r.t + ' J · ' + PS.fmt(r.eta * 100, 0) + '%', cx, base - hu - he - 8, { size: F(12), weight: 800, color: '#343a40', align: 'center' });
        D.text(ctx, wy.s1, cx, base + F(13) * 1.1 + 4, { size: F(13), weight: 700, color: i === k ? '#3b5bdb' : '#495057', align: 'center' });
        D.text(ctx, wy.s2, cx, base + F(13) * 2.3 + 4, { size: F(13), weight: 700, color: i === k ? '#3b5bdb' : '#495057', align: 'center' });
      });
      ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx, base); ctx.lineTo(bx + bw2, base); ctx.stroke();
    }
    function bucket(ctx, x, y, small) {
      const s = small ? 0.8 : 1;
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 14, 16, Math.PI, TAU); ctx.stroke();
      ctx.fillStyle = '#868e96'; ctx.beginPath(); ctx.moveTo(-17, 14); ctx.lineTo(17, 14); ctx.lineTo(13, 46); ctx.lineTo(-13, 46); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e9c48f'; ctx.fillRect(-15, 16, 30, 8);
      ctx.restore();
    }
    function bag(ctx, x, y) {
      ctx.fillStyle = '#e9c48f'; ctx.strokeStyle = '#b07d3a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.quadraticCurveTo(x - 24, y + 20, x - 18, y + 44); ctx.lineTo(x + 18, y + 44); ctx.quadraticCurveTo(x + 24, y + 20, x + 4, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    tell();
  });

  /* ================= 机械效率计算器 ================= */
  PS.register('eta-calc', function (el) {
    EN.calc(el, {
      top: { k: 'W有', short: ' W有', name: '有用功 W有', units: { J: 1, kJ: 1000 }, unit: 'J', v: '' },
      a: { k: 'η', short: ' η', name: '机械效率 η', units: { '%': 0.01, '（小数）': 1 }, unit: '%', v: '' },
      b: { k: 'W总', short: ' W总', name: '总功 W总', units: { J: 1, kJ: 1000 }, unit: 'J', v: '' },
      mode: 'a',
      hint: 'W有 = ηW总，η = W有/W总，W总 = W有/η。η 选“%”时填百分数中的数字。',
      extra: (k, v) => (k === 'a' ? ' = <b>' + PS.fmt(v * 100, 1) + '%</b>' + (v >= 1 ? '<br><span style="color:var(--red)">机械效率不可能大于或等于 100%，检查一下数据。</span>' : '') : ''),
      presets: [
        { t: '起重机（求 η）', mode: 'a', top: '1.44×10^4', b: '2.4×10^4', u: { top: 'J', b: 'J' }, note: 'W有 = Gh = 3 600 N × 4 m，W总 = W有 + W额 = 14 400 J + 9 600 J。' },
        { t: '滑轮组（求 W总）', mode: 'b', top: 600, a: 80, u: { top: 'J', a: '%' }, note: '提升重 300 N 的物体 2 m，W有 = Gh = 600 J。' },
        { t: '抽水机（求 W有）', mode: 'top', a: 75, b: 100, u: { a: '%', b: 'kJ' }, note: '总功 100 kJ 中只有 75% 用来提升水。' },
        { t: '斜面（求 η）', mode: 'a', top: 4, b: 5, u: { top: 'J', b: 'J' }, note: 'G = 16 N，h = 0.25 m：W有 = Gh = 4 J；F = 5 N，s = 1 m：W总 = Fs = 5 J。' },
      ],
    });
  });

  /* ================= η 与物重、动滑轮重的关系 ================= */
  PS.register('eta-graph', function (el) {
    const VW = 1000, GMAX = 20, GDS = [0.5, 1, 2];
    const st = { G: 4, gd: 1, fr: true };
    const gS = PS.ui.slider({ label: '物重 G', min: 0.5, max: 20, step: 0.5, value: st.G, unit: 'N', onInput: (v) => { st.G = v; tell(); } });
    const dSeg = PS.ui.seg(GDS.map((g) => ({ value: g, label: '动滑轮重 ' + g + ' N' })), st.gd, (v) => { st.gd = v; tell(); });
    dSeg.el.style.flexWrap = 'wrap';
    const fT = PS.ui.toggle('有摩擦（绳与轮之间）', true, (v) => { st.fr = v; tell(); });
    el.append(PS.ui.row(gS.el), PS.ui.row(dSeg.el, fT.el));
    const S = EN.stage(el, { VW, vh: (w) => (EN.narrow(w) ? 640 : 440), draw });
    const rd = { u: PS.ui.readout('有用功（提升 1 m）', '—', 'green'), e: PS.ui.readout('额外功', '—'), t: PS.ui.readout('总功', '—'), eta: PS.ui.readout('机械效率 η', '—', 'accent') };
    const msg = h('div', { class: 'fc-msg info' });
    el.append(h('div', { class: 'mc-read' }, rd.u.el, rd.e.el, rd.t.el, rd.eta.el), msg);
    const FR = 0.9;
    const eta = (G, gd, fr) => (G / (G + gd)) * (fr ? FR : 1);
    function tell() {
      const e = eta(st.G, st.gd, st.fr), Wt = st.G / e;
      rd.u.set(PS.fmt(st.G, 1) + ' J'); rd.e.set(PS.fmt(Wt - st.G, 2) + ' J'); rd.t.set(PS.fmt(Wt, 2) + ' J'); rd.eta.set(PS.fmt(e * 100, 1) + '%');
      msg.innerHTML = '用同一个滑轮组提升重物时，额外功主要是克服<b>动滑轮重</b>和<b>摩擦</b>做的功。<b>物重越大，有用功在总功中占的比例越大，η 越高</b>；动滑轮越轻、摩擦越小，η 越高。但额外功总是存在，<b>η 总小于 100%</b>，曲线只能越来越接近 ' + (st.fr ? '90%（摩擦损失 10%）' : '100%') + '。机械效率不是固定不变的。';
      S.render();
    }
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const pad = Math.max(70, F(13) * 3.4);
      const series = [];
      GDS.forEach((gd) => [false, true].forEach((fr) => {
        if (fr !== st.fr) return;
        const pts = []; for (let G = 0.25; G <= GMAX + 1e-9; G += 0.25) pts.push([G, eta(G, gd, fr) * 100]);
        const cols = { 0.5: '#2f9e44', 1: '#3b5bdb', 2: '#e8590c' };
        series.push({ pts, color: cols[gd], width: gd === st.gd ? 4 : 2, dash: gd === st.gd ? [] : [6, 5] });
      }));
      const ch = PS.dyn.chart(ctx, { x: pad, y: 40, w: VW - pad - 70, h: VH - 40 - F(12) * 2.6 - 30, xmax: GMAX, ymax: 100, xstep: 2, ystep: 10, xlab: 4, ylab: 20, xl: 'G/N', yl: 'η/%', F, series, padL: pad - 10 });
      const e = eta(st.G, st.gd, st.fr) * 100, x = ch.X(st.G), y = ch.Y(e);
      ctx.setLineDash([5, 4]); ctx.strokeStyle = '#868e96'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, ch.Y(0)); ctx.lineTo(x, y); ctx.lineTo(ch.X(0), y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill();
      D.text(ctx, PS.fmt(e, 1) + '%', x + 12, y - 12, { size: F(14), weight: 800, color: '#e03131', bg: 'rgba(255,255,255,.9)' });
      const lx = VW - 70;
      [[0.5, '#2f9e44'], [1, '#3b5bdb'], [2, '#e8590c']].forEach(([g, c], i) => D.text(ctx, 'G动 = ' + g + ' N', lx, ch.Y(55 - i * 9 * (F(13) / 13)) + 0, { size: F(13), weight: 800, color: c, align: 'right', bg: 'rgba(255,255,255,.85)' }));
    }
    tell();
  });

  /* ================= 测量斜面的机械效率 ================= */
  PS.register('incline-eta', function (el, opts) {
    const VW = 1000, VH = 520, L = 560, X0 = 80, Y0 = 470, SL = 110;
    const st = { hh: 0.3, surf: 'wood', G: 2, phase: 'ready', t: 0, p: 0, checked: false, rows: [] };
    const hSeg = PS.ui.seg([0.2, 0.3, 0.4, 0.5].map((v) => ({ value: v, label: 'h = ' + v + ' m' })), st.hh, (v) => { st.hh = v; ready(); });
    hSeg.el.style.flexWrap = 'wrap';
    const sSeg = PS.ui.seg(['wood', 'cotton', 'towel'].map((k) => ({ value: k, label: PS.SURF[k].name + '面' })), st.surf, (v) => { st.surf = v; ready(); });
    const gSeg = PS.ui.seg([{ value: 2, label: '木块（2 N）' }, { value: 4, label: '木块 + 钩码（4 N）' }], st.G, (v) => { st.G = v; ready(); });
    gSeg.el.style.flexWrap = 'wrap';
    el.append(h('div', { class: 'small muted' }, '斜面的倾斜程度（斜面长 s = 1 m）'), PS.ui.row(hSeg.el), PS.ui.row(sSeg.el, gSeg.el), PS.ui.row(PS.ui.button('▶ 沿斜面匀速拉动木块', pull, 'btn btn-primary btn-sm')));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const rd = { G: PS.ui.readout('物重 G', '—', 'primary'), h: PS.ui.readout('斜面高 h', '—'), F: PS.ui.readout('拉力 F', '—', 'accent'), s: PS.ui.readout('斜面长 s', '1.00 m') };
    const inp = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', autocomplete: 'off', placeholder: 'η' });
    const chkB = PS.ui.button('检查', check, 'btn btn-primary btn-sm'), recB = PS.ui.button('📝 记录', record, 'btn btn-green btn-sm');
    const msg = h('div', { class: 'fc-msg' });
    const tbody = h('tbody'), ana = h('div', { class: 'small' });
    el.append(h('div', { class: 'mc-read' }, rd.G.el, rd.h.el, rd.F.el, rd.s.el), h('div', { class: 'fc-ans' }, h('span', { html: 'η = <span class="frac"><span>Gh</span><span>Fs</span></span> =' }), inp, h('span', null, '%'), chkB, recB), msg);
    if (opts.lab !== false) el.append(h('div', { class: 'grid-2', style: { marginTop: '8px', alignItems: 'start' } },
      h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, ['h/m', '接触面', 'G/N', 'F/N', 's/m', 'W有/J', 'W总/J', 'η'].map((t) => h('th', null, t)))), tbody)),
      h('div', { class: 'panel' }, h('h4', null, '分析论证'), ana)));
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    const th = () => Math.asin(st.hh / 1);
    const Fr = () => PS.round(st.G * (Math.sin(th()) + PS.SURF[st.surf].mu * Math.cos(th())), 1);
    const eta = () => (st.G * st.hh) / (Fr() * 1);
    function ready() { st.phase = 'ready'; st.t = 0; st.p = 0; st.checked = false; inp.value = ''; tell(); }
    function pull() { if (st.phase === 'pull') return; ready(); st.phase = 'pull'; tell(); }
    function tell() {
      const done = st.phase === 'done';
      rd.G.set(st.G + ' N'); rd.h.set(PS.fmt(st.hh, 2) + ' m'); rd.F.set(st.phase === 'ready' ? '—' : PS.fmt(Fr(), 1) + ' N');
      chkB.disabled = !done; inp.disabled = !done; recB.disabled = !(done && st.checked);
      let t, c = 'info';
      if (st.phase === 'ready') t = '用弹簧测力计<b>沿斜面向上匀速</b>拉动木块，从斜面底端拉到顶端，读出拉力 F；用刻度尺测出斜面的高 h 和长 s。';
      else if (st.phase === 'pull') t = '匀速拉动中……弹簧测力计的示数稳定后读数。';
      else if (st.checked) { t = '✔ 计算正确。点“记录”，再改变斜面的倾斜程度、接触面或物重。'; c = 'ok'; }
      else t = '有用功 W有 = Gh（把木块直接提高 h 要做的功），总功 W总 = Fs（拉力做的功）。算出 η，填百分数（保留一位小数）。';
      msg.className = 'fc-msg ' + c; msg.innerHTML = t;
      S.render();
    }
    function check() {
      if (st.phase !== 'done') return;
      const v = EN.parse(inp.value.replace('%', '')), e = eta() * 100;
      if (isNaN(v)) { inp.focus(); return; }
      if (v < 1.01 && Math.abs(v * 100 - e) <= 0.15) { msg.className = 'fc-msg bad'; msg.innerHTML = '请填<b>百分数</b>中的数字：填 ' + PS.fmt(e, 1) + '。'; return; }
      st.checked = Math.abs(v - e) <= 0.15;
      st.checked ? PS.sound.good() : PS.sound.bad();
      if (!st.checked) { msg.className = 'fc-msg bad'; msg.innerHTML = '✘ 再算一算：W有 = Gh = ' + st.G + ' N × ' + st.hh + ' m = ' + PS.fmt(st.G * st.hh, 2) + ' J，W总 = Fs = ' + PS.fmt(Fr(), 1) + ' N × 1 m = ' + PS.fmt(Fr(), 1) + ' J，η = W有/W总。'; recB.disabled = true; return; }
      tell();
    }
    function record() {
      if (!st.checked) return;
      const key = [st.hh, st.surf, st.G].join('|');
      if (st.rows.some((r) => r.key === key)) { msg.className = 'fc-msg bad'; msg.innerHTML = '这组已经记录过了。'; PS.sound.bad(); return; }
      st.rows.push({ key, hh: st.hh, surf: st.surf, G: st.G, F: Fr(), eta: eta() });
      if (st.rows.length > 10) st.rows.shift();
      st.checked = false; PS.sound.good(); table(); tell();
      msg.className = 'fc-msg ok'; msg.innerHTML = '已记录。每次只改变一个因素（控制变量法），再测几次。';
    }
    function table() {
      tbody.innerHTML = '';
      st.rows.forEach((r) => tbody.append(h('tr', null, h('td', null, PS.fmt(r.hh, 1)), h('td', null, PS.SURF[r.surf].name), h('td', null, String(r.G)), h('td', null, PS.fmt(r.F, 1)), h('td', null, '1'), h('td', null, PS.fmt(r.G * r.hh, 2)), h('td', null, PS.fmt(r.F, 1)), h('td', null, h('b', null, PS.fmt(r.eta * 100, 1) + '%')))));
      if (!st.rows.length) tbody.append(h('tr', null, h('td', { colspan: 8, class: 'muted' }, '还没有数据')));
      const R = st.rows, line = (ok, t) => '<div>' + (ok ? '✔ ' : '○ ') + t + '</div>';
      const a = R.some((x) => R.some((y) => x.surf === y.surf && x.G === y.G && x.hh !== y.hh));
      const b = R.some((x) => R.some((y) => x.hh === y.hh && x.G === y.G && x.surf !== y.surf));
      const c = R.some((x) => R.some((y) => x.hh === y.hh && x.surf === y.surf && x.G !== y.G));
      ana.innerHTML = line(a, '接触面和物重相同时，斜面<b>越陡</b>，机械效率<b>越高</b>（拉力也越大，越费力）。')
        + line(b, '斜面的倾斜程度相同时，接触面<b>越粗糙</b>，机械效率<b>越低</b>。')
        + line(c, '（拓展）倾斜程度和接触面相同时，物重不同，机械效率<b>基本不变</b>。')
        + '<div class="muted" style="margin-top:4px">额外功是克服摩擦力做的功：W额 = W总 − W有 = fs。提高斜面机械效率的方法：增大倾斜程度、使接触面更光滑。</div>';
    }
    PS.loop((dt) => {
      if (st.phase !== 'pull') return;
      st.t += dt; st.p = Math.min(1, st.t / 3);
      if (st.p >= 1) { st.phase = 'done'; PS.sound.ping(); tell(); }
      S.render();
    }, el).start();
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const a = th(), ca = Math.cos(a), sa = Math.sin(a);
      const A = P(X0, Y0), B = P(X0 + L * ca, Y0 - L * sa);
      PS.force.ground(ctx, 20, 980, Y0 + 14);
      // 垫木
      ctx.fillStyle = '#c98d3e'; ctx.strokeStyle = '#8a5a1c'; ctx.lineWidth = 1.5;
      const wy = B.y + 8; ctx.fillRect(B.x - 40, wy, 50, Y0 + 14 - wy); ctx.strokeRect(B.x - 40, wy, 50, Y0 + 14 - wy);
      // 木板与接触面
      ctx.save(); ctx.translate(A.x, A.y); ctx.rotate(-a);
      ctx.fillStyle = '#d9a066'; ctx.strokeStyle = '#8a5a1c'; ctx.lineWidth = 1.5; ctx.fillRect(0, 0, L, 14); ctx.strokeRect(0, 0, L, 14);
      PS.dyn.surface(ctx, 0, L, 0, st.surf, { depth: 6 });
      // 木块与弹簧测力计（沿斜面）
      const bw = 70, bh = 44, x = 6 + (L - bw - 12) * st.p;
      PS.dyn.block(ctx, x, 0, bw, bh, { weights: st.G === 4 ? 1 : 0 });
      const Fv = st.phase === 'ready' ? 0 : Fr();
      const ring = x + bw + SL + 83 + (Fv / 5) * SL;
      PS.dyn.hscale(ctx, { x: ring, y: -bh / 2, max: 5, div: 0.1, L: SL, F: Fv, h: 26, labels: false });
      MC.hand(ctx, ring + 16, -bh / 2, { s: 1.1, ang: -Math.PI / 2 });
      ctx.restore();
      // 尺寸
      ctx.save(); ctx.translate((A.x + B.x) / 2, (A.y + B.y) / 2); ctx.rotate(-a); D.dim(ctx, -L / 2, L / 2, 34, 's = 1 m', { size: F(14), color: C.F1, below: true }); ctx.restore();
      ctx.save(); ctx.translate(B.x + 40, (A.y + B.y) / 2); ctx.rotate(-Math.PI / 2); D.dim(ctx, -(Y0 - B.y) / 2, (Y0 - B.y) / 2, 0, 'h = ' + st.hh + ' m', { size: F(14), color: C.F2 }); ctx.restore();
      ctx.setLineDash([5, 4]); ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x + 40, A.y); ctx.moveTo(B.x, B.y); ctx.lineTo(B.x + 40, B.y); ctx.stroke(); ctx.setLineDash([]);
      const nz = w < 560;
      PS.dyn.hzoom(ctx, Fv, { x: 30, y: nz ? 30 + F(12) : 40, w: nz ? 330 : 230, h: nz ? 130 : 90, max: 5, div: 0.1, F2: F, title: '🔍 弹簧测力计的示数' });
    }
    ready(); table();
  });
})();
