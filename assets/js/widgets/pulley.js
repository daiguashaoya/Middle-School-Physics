/* 第12章第2节：滑轮——定滑轮和动滑轮的实质（杠杆）、组装滑轮组（5 种绕法，竖直提升 / 水平拉动）、轮轴、斜面、分类。依赖 force.js、energy.js、machine.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, MC = PS.mc, C = PS.MC, EN = PS.en;
  const TAU = Math.PI * 2;
  const P = (x, y) => ({ x, y });

  /* ================= 定滑轮、动滑轮的实质 ================= */
  PS.register('pulley-lever', function (el) {
    const VW = 1000, VH = 520, r = 84, G = 10;
    const st = { kind: 'fixed', th: 0, lift: 0, t: -1, rot: 0, gd: false, lever: true };
    const kSeg = PS.ui.seg([{ value: 'fixed', label: '定滑轮' }, { value: 'moving', label: '动滑轮' }], st.kind, (v) => { st.kind = v; st.th = Math.min(st.th, 60); ang.set(st.th, true); ang.input.max = v === 'fixed' ? 90 : 60; st.lift = 0; tell(); });
    const ang = PS.ui.slider({ label: '拉力方向偏离竖直方向', min: 0, max: 90, step: 15, value: 0, unit: '°', onInput: (v) => { st.th = v; tell(); } });
    const gdT = PS.ui.toggle('动滑轮重 2 N', false, (v) => { st.gd = v; tell(); });
    const lvT = PS.ui.toggle('画出杠杆', true, (v) => { st.lever = v; S.render(); });
    el.append(PS.ui.row(kSeg.el, ang.el), PS.ui.row(PS.ui.button('▶ 拉动绳子', () => { st.t = 0; st.lift = 0; }, 'btn btn-primary btn-sm'), lvT.el, gdT.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const rd = { F: PS.ui.readout('拉力 F', '—', 'accent'), G: PS.ui.readout('物重 G', G + ' N', 'primary'), l1: PS.ui.readout('动力臂 l₁', '—'), l2: PS.ui.readout('阻力臂 l₂', '—') };
    const msg = h('div', { class: 'fc-msg info' });
    el.append(h('div', { class: 'mc-read' }, rd.F.el, rd.G.el, rd.l1.el, rd.l2.el), msg);
    const phi = () => (st.th * Math.PI) / 180;
    function force() { return st.kind === 'fixed' ? G : (G + (st.gd ? 2 : 0)) / (2 * Math.cos(phi())); }
    function tell() {
      gdT.el.style.display = st.kind === 'moving' ? '' : 'none';
      const f = phi();
      rd.F.set(PS.fmt(force(), 2) + ' N');
      if (st.kind === 'fixed') {
        rd.l1.set('r'); rd.l2.set('r');
        msg.innerHTML = '<b>定滑轮的实质是等臂杠杆</b>：支点 O 在轴上，动力臂和阻力臂都等于轮的半径 r，所以 <b>F = G</b>，不省力，也不省距离，但可以<b>改变力的方向</b>。' + (st.th ? '斜着拉时，力臂仍是半径 r（半径与绳子垂直），拉力不变。' : '');
      } else {
        rd.l1.set(st.th ? PS.fmt(2 * Math.cos(f) * Math.cos(f), 2) + ' r' : '2r'); rd.l2.set(st.th ? PS.fmt(Math.cos(f), 2) + ' r' : 'r');
        msg.innerHTML = '<b>动滑轮的实质是动力臂为阻力臂 2 倍的省力杠杆</b>：支点 O 在左边绳子与轮子相切的地方，l₁ = 2r（直径），l₂ = r，所以 F = <span class="frac"><span>G</span><span>2</span></span>' + (st.gd ? '（考虑动滑轮重：F = <span class="frac"><span>G + G动</span><span>2</span></span>）' : '') + '，省一半力，但费距离（s = 2h），不能改变力的方向。' + (st.th ? '<b>斜着拉时动力臂变短，拉力变大</b>，只有竖直向上拉才能省一半力。' : '');
      }
      S.render();
    }
    PS.loop((dt) => {
      if (st.t < 0) return;
      st.t += dt; const k = Math.min(1, st.t / 1.8);
      st.lift = 60 * (1 - Math.cos(k * Math.PI)) / 2;
      if (st.t > 2.6) st.t = -1;
      S.render();
    }, el).start();
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const f = phi(), Fv = force();
      MC.ceiling(ctx, 300, 700, 46);
      if (st.kind === 'fixed') {
        const Cc = P(500, 200), TL = P(Cc.x - r, Cc.y), T = P(Cc.x + r * Math.cos(f), Cc.y - r * Math.sin(f)), d = P(Math.sin(f), Math.cos(f));
        MC.strap(ctx, Cc.x, Cc.y, r, 58, -1);
        const ly = 340 - st.lift, Lf = 170 + st.lift, H = P(T.x + d.x * Lf, T.y + d.y * Lf);
        MC.rope(ctx, { segs: [[TL.x, TL.y, TL.x, ly], [T.x, T.y, H.x, H.y]], arcs: [{ x: Cc.x, y: Cc.y, r, a0: Math.PI, d: Math.PI - f }] });
        MC.pulley(ctx, Cc.x, Cc.y, r, { rot: st.lift / r });
        MC.load(ctx, TL.x, ly, 80, 70, { label: 'G', fs: F(16) });
        MC.hand(ctx, H.x, H.y, { s: 1.5 });
        if (st.lever) {
          ctx.strokeStyle = C.lever; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.globalAlpha = 0.85;
          ctx.beginPath(); ctx.moveTo(TL.x, TL.y); ctx.lineTo(Cc.x, Cc.y); ctx.lineTo(T.x, T.y); ctx.stroke(); ctx.globalAlpha = 1;
          MC.arm(ctx, Cc, TL, Math.PI / 2, { color: C.F2, label: 'l₂', line: false, F, size: F(16), labelSide: -1 });
          MC.arm(ctx, Cc, T, Math.atan2(d.y, d.x), { color: C.F1, label: 'l₁', line: false, F, size: F(16) });
          MC.pin(ctx, Cc.x, Cc.y, 6, { label: 'O', size: F(17), lx: 0, ly: -F(18) });
        }
        PS.force.arrow(ctx, TL.x, TL.y + 4, Math.PI / 2, 90, { color: C.F2, label: 'F₂ = G', F, size: F(15), labelSide: 1 });
        PS.force.arrow(ctx, T.x, T.y, Math.atan2(d.y, d.x), 90, { color: C.F1, label: 'F = ' + PS.fmt(Fv, 1) + ' N', F, size: F(15), labelSide: -1 });
      } else {
        const Cc = P(500, 320 - st.lift), TL = P(Cc.x - r * Math.cos(f), Cc.y + r * Math.sin(f)), TR = P(Cc.x + r * Math.cos(f), Cc.y + r * Math.sin(f));
        const uL = P(-Math.sin(f), -Math.cos(f)), uR = P(Math.sin(f), -Math.cos(f));
        const tieL = (TL.y - 46) / Math.cos(f), tie = P(TL.x + uL.x * tieL, 46);
        const Lr = 150 + 2 * st.lift, Hh = P(TR.x + uR.x * Lr, TR.y + uR.y * Lr);
        MC.rope(ctx, { segs: [[tie.x, tie.y, TL.x, TL.y], [TR.x, TR.y, Hh.x, Hh.y]], arcs: [{ x: Cc.x, y: Cc.y, r, a0: Math.PI - f, d: -(Math.PI - 2 * f) }] });
        const hy = MC.strap(ctx, Cc.x, Cc.y, r, 26, 1);
        MC.pulley(ctx, Cc.x, Cc.y, r, { rot: -st.lift / r });
        MC.load(ctx, Cc.x, hy - 4, 80, 64, { label: 'G', fs: F(16) });
        MC.hand(ctx, Hh.x, Hh.y, { s: 1.5 });
        if (st.lever) {
          ctx.strokeStyle = C.lever; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.globalAlpha = 0.85;
          ctx.beginPath(); ctx.moveTo(TL.x, TL.y); ctx.lineTo(Cc.x, Cc.y); ctx.lineTo(TR.x, TR.y); ctx.stroke(); ctx.globalAlpha = 1;
          MC.arm(ctx, TL, Cc, Math.PI / 2, { color: C.F2, label: 'l₂', line: false, F, size: F(16), labelSide: -1 });
          MC.arm(ctx, TL, TR, Math.atan2(uR.y, uR.x), { color: C.F1, label: 'l₁', line: false, F, size: F(16), labelSide: -1 });
          MC.pin(ctx, TL.x, TL.y, 6, { label: 'O', size: F(17), lx: -F(16), ly: F(6) });
        }
        PS.force.arrow(ctx, Cc.x, Cc.y, Math.PI / 2, 70, { color: C.F2, label: st.gd ? 'G + G动' : 'G', F, size: F(15), labelSide: -1, labelOff: 22 });
        PS.force.arrow(ctx, TR.x, TR.y, Math.atan2(uR.y, uR.x), 80, { color: C.F1, label: 'F = ' + PS.fmt(Fv, 1) + ' N', F, size: F(15) });
      }
      D.text(ctx, st.kind === 'fixed' ? '定滑轮：轴固定不动' : '动滑轮：轴随物体一起移动', 20, F(15) + 10, { size: F(15), weight: 800, color: '#343a40' });
    }
    tell();
  });

  /* ================= 组装滑轮组 ================= */
  const CFG = [
    { t: '一定一动（n = 2）', nf: 1, nm: 1, start: 'f' },
    { t: '一定一动（n = 3）', nf: 1, nm: 1, start: 'm' },
    { t: '两定一动（n = 3）', nf: 2, nm: 1, start: 'm' },
    { t: '两定两动（n = 4）', nf: 2, nm: 2, start: 'f' },
    { t: '两定两动（n = 5）', nf: 2, nm: 2, start: 'm' },
  ];
  /** 按绕法排出滑轮：返回 [{ top: 是否定滑轮 }]，以及 n */
  function layout(c) {
    const seq = []; let uf = 0, um = 0, nextTop = c.start === 'm';
    for (;;) {
      if (nextTop) { if (uf >= c.nf) break; uf++; seq.push(true); } else { if (um >= c.nm) break; um++; seq.push(false); }
      nextTop = !nextTop;
    }
    let n = 0;
    for (let i = 0; i <= seq.length; i++) { const a = i === 0 ? c.start === 'm' : !seq[i - 1], b = i < seq.length ? !seq[i] : false; if (a || b) n++; }
    return { seq, n };
  }
  PS.register('pulley-block', function (el) {
    const VW = 1000, VH = 620, r = 34, YC = 70, YF = 150, YM0 = 380, HPX = 40;
    const st = { c: 1, mode: 'v', G: 120, gd: 0, count: true, lift: 0, t: -1 };
    const cSeg = PS.ui.seg(CFG.map((c, i) => ({ value: i, label: c.t })), st.c, (v) => { st.c = v; reset(); });
    cSeg.el.style.flexWrap = 'wrap';
    const mSeg = PS.ui.seg([{ value: 'v', label: '竖直提升重物' }, { value: 'hz', label: '水平拉动物体（俯视图）' }], st.mode, (v) => { st.mode = v; reset(); });
    const gS = PS.ui.slider({ label: '物重 G', min: 30, max: 300, step: 30, value: st.G, unit: 'N', onInput: (v) => { st.G = v; tell(); } });
    const gdSeg = PS.ui.seg([{ value: 0, label: '不计动滑轮重' }, { value: 10, label: '每个动滑轮重 10 N' }], st.gd, (v) => { st.gd = v; tell(); });
    const cntT = PS.ui.toggle('数一数绳子的段数', true, (v) => { st.count = v; S.render(); });
    el.append(PS.ui.row(cSeg.el), PS.ui.row(mSeg.el, gdSeg.el), PS.ui.row(gS.el), PS.ui.row(PS.ui.button('▶ 拉动绳子', () => { if (st.t < 0) { st.lift = 0; st.t = 0; } }, 'btn btn-primary btn-sm'), PS.ui.button('复位', reset, 'btn btn-ghost btn-sm'), cntT.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const rd = { n: PS.ui.readout('承担的绳子段数 n', '—'), F: PS.ui.readout('拉力 F', '—', 'accent'), h: PS.ui.readout('物体移动 h', '0 m', 'primary'), s: PS.ui.readout('绳端移动 s', '0 m', 'primary') };
    const msg = h('div', { class: 'fc-msg info' });
    el.append(h('div', { class: 'mc-read' }, rd.n.el, rd.F.el, rd.h.el, rd.s.el), msg);
    const L = () => layout(CFG[st.c]);
    function reset() { st.lift = 0; st.t = -1; tell(); }
    function tell() {
      const { n, seq } = L(), c = CFG[st.c], hz = st.mode === 'hz';
      gS.el.querySelector('.slider-label').innerHTML = hz ? '物体受到的摩擦力 f' : '物重 G';
      gdSeg.el.style.display = hz ? 'none' : '';
      const Gt = st.G + (hz ? 0 : st.gd * c.nm), Fv = Gt / n;
      rd.n.set(String(n)); rd.F.set(PS.fmt(Fv, 1) + ' N');
      const hv = (st.lift / HPX) * 0.2;
      rd.h.set(PS.fmt(hv, 2) + ' m'); rd.s.set(PS.fmt(n * hv, 2) + ' m');
      const up = !seq[seq.length - 1];
      msg.innerHTML = hz
        ? '水平拉动时，滑轮组克服的是<b>摩擦力</b>：动滑轮上有 n = ' + n + ' 段绳子拉着物体，不计滑轮重和绳与轮的摩擦，<b>F = <span class="frac"><span>f</span><span>n</span></span> = ' + PS.fmt(Fv, 1) + ' N</b>，绳端移动的距离 s绳 = ns物。'
        : '动滑轮和重物由 <b>n = ' + n + '</b> 段绳子承担，' + (st.gd ? '拉力 <b>F = <span class="frac"><span>G + G动</span><span>n</span></span> = ' + PS.fmt(Fv, 1) + ' N</b>' : '不计动滑轮重和摩擦，拉力 <b>F = <span class="frac"><span>G</span><span>n</span></span> = ' + PS.fmt(Fv, 1) + ' N</b>') + '；绳子自由端移动的距离 <b>s = nh</b>。'
          + '绳子自由端向' + (up ? '<b>上</b>拉（没有改变力的方向）' : '<b>下</b>拉（改变了力的方向）') + '。数段数的方法：在定滑轮和动滑轮之间画一条线，数与动滑轮相连的绳子段数。' + (c.start === 'm' ? '绳子的起点在<b>动滑轮</b>上，n 是奇数。' : '绳子的起点在<b>定滑轮</b>上，n 是偶数（奇动偶定）。');
      S.render();
    }
    PS.loop((dt) => {
      if (st.t < 0) return;
      st.t += dt; const k = Math.min(1, st.t / 2.4);
      st.lift = HPX * (1 - Math.cos(k * Math.PI)) / 2;
      if (k >= 1) { st.t = -1; PS.sound.ping(); }
      tell();
    }, el).start();
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      const { seq, n } = L(), c = CFG[st.c], hz = st.mode === 'hz', m = seq.length;
      const cx = 490, cy = 320, Wm = (p) => (hz ? P(cx + (p.y - cy), cy - (p.x - cx)) : p), X0 = 470 - r * m;
      ctx.fillStyle = hz ? '#f3e5cf' : '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      if (hz) { ctx.strokeStyle = 'rgba(160,110,50,.18)'; ctx.lineWidth = 2; for (let y = 20; y < VH; y += 34) { ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(300, y + 6, 600, y - 6, VW, y); ctx.stroke(); } }
      const YM = YM0 - st.lift;
      const xs = []; for (let i = 0; i <= m; i++) xs.push(X0 + i * 2 * r);
      const pul = seq.map((top, j) => ({ x: xs[j] + r, y: top ? YF : YM, r, s: top ? 1 : -1, top }));
      const tie = c.start === 'f' ? P(xs[0], YC) : P(xs[0], YM);
      const lastTop = seq[m - 1], up = !lastTop;
      const s_px = n * st.lift;
      const freeEnd = lastTop ? P(xs[m], YF + 230 + s_px) : P(xs[m], YM - 120 - s_px);
      const path = MC.belt([tie].concat(pul, [freeEnd]));
      const hl = {};
      if (st.count && path) path.segs.forEach((sg, i) => { const a = i === 0 ? c.start === 'm' : !pul[i - 1].top, b = i < m ? !pul[i].top : false; if (a || b) hl[i] = '#2f9e44'; });
      ctx.save();
      if (hz) { ctx.translate(cx, cy); ctx.rotate(-Math.PI / 2); ctx.translate(-cx, -cy); }
      // 天花板 / 墙
      const fx = pul.filter((p) => p.top).map((p) => p.x);
      MC.ceiling(ctx, Math.min(xs[0], ...fx) - 50, Math.max(...fx) + 50, YC);
      pul.filter((p) => p.top).forEach((p) => MC.strap(ctx, p.x, p.y, r, YF - YC - r - 12, -1));
      // 动滑轮的框架和重物
      const mv = pul.filter((p) => !p.top), mx0 = Math.min(tie.x, ...mv.map((p) => p.x)), mx1 = Math.max(...mv.map((p) => p.x));
      ctx.fillStyle = '#868e96'; ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.2;
      D.roundRect(ctx, Math.min(mx0, mv[0].x) - 8, YM - 5, Math.max(mx1, mv[0].x) - Math.min(mx0, mv[0].x) + 16, 10, 4); ctx.fill(); ctx.stroke();
      const lx = (Math.min(mx0, mv[0].x) + mx1) / 2, ly = YM + r + 14;
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lx, YM); ctx.lineTo(lx, ly); ctx.stroke();
      if (!hz) MC.load(ctx, lx, ly, 96, 74, {});
      else { ctx.save(); PS.force.box(ctx, lx - 80, ly + 150, 160, 150, { c1: '#ced4da', c2: '#868e96' }); ctx.restore(); }
      if (c.start === 'm') { ctx.fillStyle = '#495057'; ctx.beginPath(); ctx.arc(tie.x, tie.y, 6, 0, TAU); ctx.fill(); }
      MC.rope(ctx, path, { hl, w: 3.2 });
      // 滑轮转角
      let sup = 0;
      pul.forEach((p, j) => {
        const a = j === 0 ? c.start === 'm' : !pul[j - 1].top, b = !p.top;
        if (a || b) sup++;
        MC.pulley(ctx, p.x, p.y, r, { rot: ((p.top ? 1 : -1) * sup * st.lift) / r });
      });
      MC.hand(ctx, freeEnd.x, freeEnd.y, { s: 1.3 });
      ctx.restore();
      // 文字（不随画面旋转）
      if (st.count && path) {
        let i0 = 0;
        path.segs.forEach((sg, i) => { if (!hl[i]) return; i0++; const q = Wm(P(sg[0], (sg[1] + sg[3]) / 2 + (i % 2 ? 22 : -22))); D.text(ctx, String(i0), q.x, q.y, { size: F(15), weight: 800, color: '#fff', align: 'center', baseline: 'middle', bg: '#2f9e44' }); });
        const yc = (YF + YM) / 2 + r * 0.2, a = Wm(P(xs[0] - 40, yc)), b = Wm(P(xs[m] + 40, yc));
        ctx.setLineDash([8, 6]); ctx.strokeStyle = '#2f9e44'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
      }
      const Gt = st.G + (hz ? 0 : st.gd * c.nm), Fv = Gt / n;
      const lp = Wm(P(lx, ly + 37));
      D.text(ctx, hz ? '物体' : 'G = ' + st.G + ' N', lp.x + (hz ? 75 : 0), lp.y, { size: F(14), weight: 800, color: '#343a40', align: 'center', baseline: 'middle', bg: 'rgba(255,255,255,.85)' });
      const fp = Wm(freeEnd), dirv = hz ? (up ? P(-1, 0) : P(1, 0)) : up ? P(0, -1) : P(0, 1);
      PS.force.arrow(ctx, fp.x + dirv.x * 22, fp.y + dirv.y * 22, Math.atan2(dirv.y, dirv.x), 70, { color: C.F1, label: 'F = ' + PS.fmt(Fv, 1) + ' N', F, size: F(15), labelSide: hz ? -1 : 1 });
      if (hz) { const ff = Wm(P(lx, ly + 75)); PS.force.arrow(ctx, ff.x + 82, ff.y, 0, 60, { color: '#c2255c', label: 'f = ' + st.G + ' N', F, size: F(14), labelSide: -1 }); }
      if (st.lift > 0.5) {
        const a0 = Wm(P(xs[m] + 20, freeEnd.y + (up ? s_px : -s_px))), a1 = Wm(P(xs[m] + 20, freeEnd.y));
        D.arrow(ctx, a0.x + (hz ? 0 : 26), a0.y + (hz ? 30 : 0), a1.x + (hz ? 0 : 26), a1.y + (hz ? 30 : 0), { color: C.F1, width: 2.5, head: 9 });
        const b0 = Wm(P(lx + 70, YM0 + r + 14)), b1 = Wm(P(lx + 70, YM + r + 14));
        D.arrow(ctx, b0.x, b0.y, b1.x, b1.y, { color: C.F2, width: 2.5, head: 9 });
        D.text(ctx, hz ? 's绳' : 's', (a0.x + a1.x) / 2 + (hz ? 0 : 40), (a0.y + a1.y) / 2 + (hz ? 50 : 0), { size: F(15), weight: 800, color: C.F1, align: 'center', baseline: 'middle' });
        D.text(ctx, hz ? 's物' : 'h', (b0.x + b1.x) / 2 + (hz ? 0 : 16), (b0.y + b1.y) / 2 + (hz ? 18 : 0), { size: F(15), weight: 800, color: C.F2, align: 'center', baseline: 'middle' });
      }
      D.text(ctx, CFG[st.c].t + (hz ? '　俯视图' : ''), VW - 20, F(15) + 10, { size: F(15), weight: 800, color: '#343a40', align: 'right' });
    }
    tell();
  });

  /* ================= 轮轴 ================= */
  PS.register('wheel-axle', function (el) {
    const VW = 1000, VH = 500, K = 3, Cc = P(500, 190), G = 300;
    const st = { R: 40, r: 10, swap: false, ang: 0, t: -1, lift: 0 };
    const rS = PS.ui.slider({ label: '轮半径 R', min: 20, max: 50, step: 5, value: st.R, unit: 'cm', onInput: (v) => { st.R = v; reset(); } });
    const aS = PS.ui.slider({ label: '轴半径 r', min: 5, max: 15, step: 1, value: st.r, unit: 'cm', onInput: (v) => { st.r = v; reset(); } });
    const sw = PS.ui.toggle('反过来用：动力作用在轴上', false, (v) => { st.swap = v; reset(); });
    el.append(PS.ui.row(rS.el, aS.el), PS.ui.row(PS.ui.button('▶ 转动一圈', () => { if (st.t < 0) { reset(); st.t = 0; } }, 'btn btn-primary btn-sm'), sw.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const rd = { F: PS.ui.readout('动力 F₁', '—', 'accent'), G: PS.ui.readout('阻力 F₂（水和桶重）', G + ' N', 'primary'), s1: PS.ui.readout('动力作用点移动', '—'), s2: PS.ui.readout('水桶升高', '—') };
    const msg = h('div', { class: 'fc-msg info' });
    el.append(h('div', { class: 'mc-read' }, rd.F.el, rd.G.el, rd.s1.el, rd.s2.el), msg);
    function reset() { st.ang = 0; st.t = -1; tell(); }
    const arms = () => (st.swap ? { l1: st.r, l2: st.R } : { l1: st.R, l2: st.r });
    function tell() {
      const a = arms(), Fv = (G * a.l2) / a.l1, turn = st.ang / TAU;
      rd.F.set(PS.fmt(Fv, 1) + ' N');
      rd.s1.set(PS.fmt(TAU * a.l1 * turn, 1) + ' cm'); rd.s2.set(PS.fmt(TAU * a.l2 * turn, 1) + ' cm');
      msg.innerHTML = '<b>轮轴</b>由轮和轴组成，能绕共同的轴线转动，实质是<b>可以连续转动的杠杆</b>：支点在轴线上，F₁' + (st.swap ? 'r' : 'R') + ' = F₂' + (st.swap ? 'R' : 'r') + '。'
        + (st.swap ? '动力作用在<b>轴</b>上时<b>费力，但省距离</b>（如自行车的后轮）。' : '动力作用在<b>轮</b>上，轮半径是轴半径的 ' + PS.fmt(st.R / st.r, 1) + ' 倍，动力就是阻力的 1/' + PS.fmt(st.R / st.r, 1) + '：<b>省力，但费距离</b>（如辘轳、方向盘、门把手、螺丝刀）。');
      S.render();
    }
    PS.loop((dt) => {
      if (st.t < 0) return;
      st.t += dt; st.ang = Math.min(TAU, (st.t / 3) * TAU);
      if (st.ang >= TAU) { st.t = -1; PS.sound.ping(); }
      tell();
    }, el).start();
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const Rp = st.R * K, rp = st.r * K, a = arms(), l1p = a.l1 * K, l2p = a.l2 * K;
      // 井和支架
      const wx = Cc.x - l2p;
      ctx.strokeStyle = '#8a5a1c'; ctx.lineWidth = 12; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(Cc.x - 190, 500); ctx.lineTo(Cc.x, Cc.y + 10); ctx.lineTo(Cc.x + 190, 500); ctx.stroke();
      ctx.fillStyle = '#ced4da'; ctx.strokeStyle = '#868e96'; ctx.lineWidth = 1.5;
      ctx.fillRect(wx - 75, 440, 150, 60); ctx.strokeRect(wx - 75, 440, 150, 60);
      for (let y = 440; y < 500; y += 20) { ctx.beginPath(); ctx.moveTo(wx - 75, y); ctx.lineTo(wx + 75, y); ctx.stroke(); }
      ctx.fillStyle = '#a5d8ff'; ctx.fillRect(wx - 62, 480, 124, 20);
      const turn = st.ang / TAU;
      // 绳子与物体：阻力绳在左侧（半径 l2），动力绳在右侧（半径 l1）
      const by = 360 - TAU * l2p * turn * 0.35, hy = 300 + TAU * l1p * turn * 0.3;
      ctx.fillStyle = '#e7f5ff'; ctx.strokeStyle = '#495057'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(Cc.x, Cc.y, Rp, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 4;
      for (let k = 0; k < 6; k++) { const q = st.ang + (k * Math.PI) / 3; ctx.beginPath(); ctx.moveTo(Cc.x + Math.cos(q) * rp, Cc.y + Math.sin(q) * rp); ctx.lineTo(Cc.x + Math.cos(q) * Rp * 0.96, Cc.y + Math.sin(q) * Rp * 0.96); ctx.stroke(); }
      const g = ctx.createRadialGradient(Cc.x - rp * 0.3, Cc.y - rp * 0.3, 1, Cc.x, Cc.y, rp); g.addColorStop(0, '#d9a066'); g.addColorStop(1, '#8a5a1c');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(Cc.x, Cc.y, rp, 0, TAU); ctx.fill();
      ctx.fillStyle = '#343a40'; ctx.beginPath(); ctx.arc(Cc.x, Cc.y, 5, 0, TAU); ctx.fill();
      D.text(ctx, '轮', Cc.x + Rp * 0.55, Cc.y - Rp * 0.62, { size: F(14), weight: 800, color: '#1864ab', align: 'center' });
      D.text(ctx, '轴', Cc.x, Cc.y - rp - 6, { size: F(13), weight: 800, color: '#5c3a0e', align: 'center' });
      MC.rope(ctx, { segs: [[Cc.x - l2p, Cc.y, Cc.x - l2p, by], [Cc.x + l1p, Cc.y, Cc.x + l1p, hy]], arcs: [] }, { w: 3 });
      // 水桶
      const bx = Cc.x - l2p;
      ctx.fillStyle = '#868e96'; ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(bx - 30, by + 10); ctx.lineTo(bx + 30, by + 10); ctx.lineTo(bx + 24, by + 70); ctx.lineTo(bx - 24, by + 70); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#74c0fc'; ctx.fillRect(bx - 27, by + 18, 54, 10);
      ctx.strokeStyle = '#495057'; ctx.beginPath(); ctx.arc(bx, by + 10, 30, Math.PI, TAU); ctx.stroke();
      MC.hand(ctx, Cc.x + l1p, hy + 14, { s: 1.4 });
      // 杠杆示意
      ctx.strokeStyle = C.lever; ctx.lineWidth = 6; ctx.globalAlpha = 0.85; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(Cc.x - l2p, Cc.y); ctx.lineTo(Cc.x + l1p, Cc.y); ctx.stroke(); ctx.globalAlpha = 1;
      MC.pin(ctx, Cc.x, Cc.y, 6, { label: 'O', size: F(16), lx: 0, ly: F(18) });
      D.dim(ctx, Cc.x, Cc.x + l1p, Cc.y - F(14) - 24, 'l₁ = ' + (st.swap ? 'r' : 'R'), { size: F(14), color: C.F1 });
      D.dim(ctx, Cc.x - l2p, Cc.x, Cc.y + F(14) + 34, 'l₂ = ' + (st.swap ? 'R' : 'r'), { size: F(14), color: C.F2, below: true });
      const Fv = (G * a.l2) / a.l1;
      PS.force.arrow(ctx, Cc.x + l1p, hy + 34, Math.PI / 2, PS.clamp((60 * Fv) / G, 22, 150), { color: C.F1, label: 'F₁ = ' + PS.fmt(Fv, 0) + ' N', F, size: F(15) });
      D.text(ctx, 'F₁l₁ = F₂l₂', 30, F(20) + 14, { size: F(20), weight: 800, color: '#1b2333' });
    }
    tell();
  });

  /* ================= 斜面 ================= */
  PS.register('incline-save', function (el) {
    const VW = 1000, VH = 460, K = 150, G = 600, H1 = 1, GY = 400, PX = 820;
    const st = { L: 2, t: -1, p: 0 };
    const seg = PS.ui.seg([{ value: 1, label: '竖直提上去' }, { value: 2, label: '斜面长 2 m' }, { value: 3, label: '斜面长 3 m' }, { value: 4, label: '斜面长 4 m' }], st.L, (v) => { st.L = v; st.p = 0; st.t = -1; tell(); });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el, PS.ui.button('▶ 把箱子推上去', () => { st.p = 0; st.t = 0; }, 'btn btn-primary btn-sm')));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const rd = { F: PS.ui.readout('推力 F', '—', 'accent'), s: PS.ui.readout('移动的距离 s', '—'), W: PS.ui.readout('推力做的功 W = Fs', '—', 'green') };
    const msg = h('div', { class: 'fc-msg info' });
    el.append(h('div', { class: 'mc-read' }, rd.F.el, rd.s.el, rd.W.el), msg);
    const Fv = () => (G * H1) / st.L;
    function tell() {
      rd.F.set(PS.fmt(Fv(), 0) + ' N'); rd.s.set(PS.fmt(st.L * st.p, 2) + ' m'); rd.W.set(PS.fmt(Fv() * st.L * st.p, 0) + ' J');
      msg.innerHTML = (st.L === 1 ? '直接把重 600 N 的箱子竖直提高 1 m，需要的力 F = G = 600 N。' : '不计摩擦时，沿斜面推箱子：Fs = Gh，F = <span class="frac"><span>Gh</span><span>L</span></span> = ' + PS.fmt(Fv(), 0) + ' N。')
        + '<b>斜面越长（越平缓）越省力，但移动的距离越长</b>；不管用哪种方法，推力做的功都是 Gh = 600 J——<b>使用任何机械都不省功</b>。盘山公路、螺丝钉的螺纹都是斜面。';
      S.render();
    }
    PS.loop((dt) => {
      if (st.t < 0) return;
      st.t += dt; st.p = Math.min(1, st.t / 2.4);
      if (st.p >= 1) { st.t = -1; PS.sound.ping(); }
      tell();
    }, el).start();
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const top = GY - H1 * K;
      PS.force.ground(ctx, 20, 980, GY);
      ctx.fillStyle = '#ced4da'; ctx.strokeStyle = '#868e96'; ctx.lineWidth = 1.5; ctx.fillRect(PX, top, 80, GY - top); ctx.strokeRect(PX, top, 80, GY - top);
      ctx.save(); ctx.translate(PX + 104, (GY + top) / 2); ctx.rotate(-Math.PI / 2); D.dim(ctx, -(GY - top) / 2, (GY - top) / 2, 0, 'h = 1 m', { size: F(14), color: C.F2 }); ctx.restore();
      const ext = st.L > 1 ? Math.sqrt(st.L * st.L - H1 * H1) * K : 0;
      const A = P(PX - ext, GY), B = P(PX, top), ang = Math.atan2(B.y - A.y, B.x - A.x);
      if (st.L > 1) {
        ctx.fillStyle = '#e3bf86'; ctx.strokeStyle = '#8a5a1c'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.lineTo(B.x, GY); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.save(); ctx.translate((A.x + B.x) / 2, (A.y + B.y) / 2); ctx.rotate(ang); D.dim(ctx, -Math.hypot(B.x - A.x, B.y - A.y) / 2, Math.hypot(B.x - A.x, B.y - A.y) / 2, 26, 'L = ' + st.L + ' m', { size: F(14), color: C.F1, below: true }); ctx.restore();
      }
      // 箱子
      const bw = 70, bh = 56;
      let cx, cy, a2;
      if (st.L > 1) { const Ls = Math.hypot(B.x - A.x, B.y - A.y), u = (bw * 0.6 + (Ls - bw) * st.p) / Ls; cx = A.x + (B.x - A.x) * u; cy = A.y + (B.y - A.y) * u; a2 = ang; } else { cx = PX - bw / 2 - 2; cy = GY - (GY - top) * st.p; a2 = 0; }
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a2);
      PS.force.box(ctx, st.L > 1 ? -bw * 0.6 : -bw / 2, 0, bw, bh, { c1: '#f08c00', c2: '#d9480f' });
      ctx.restore();
      const fa = st.L > 1 ? ang : -Math.PI / 2;
      const lx = -0.1 * bw, ly = -bh / 2;
      const ox = st.L > 1 ? cx + Math.cos(a2) * lx - Math.sin(a2) * ly : cx, oy = st.L > 1 ? cy + Math.sin(a2) * lx + Math.cos(a2) * ly : cy - bh;
      PS.force.arrow(ctx, ox, oy, fa, (Fv() / G) * 150 + 20, { color: C.F1, label: 'F = ' + PS.fmt(Fv(), 0) + ' N', F, size: F(15), labelSide: -1 });
      D.text(ctx, 'G = 600 N', 30, F(15) + 12, { size: F(15), weight: 800, color: '#343a40' });
    }
    tell();
  });

  /* ================= 分类：定滑轮 / 动滑轮 / 轮轴 / 斜面 ================= */
  PS.register('machine-sort', function (el) {
    PS.sortCards(el, [
      ['旗杆顶端的滑轮（升旗时轴不动）', 0, '轴固定不动，可以改变力的方向。'],
      ['起重机吊臂顶端固定的滑轮', 0, '轴固定在吊臂上。'],
      ['升降晾衣架顶上固定在天花板的滑轮', 0, '轴固定不动。'],
      ['起重机吊钩上随货物一起升降的滑轮', 1, '轴随货物一起移动。'],
      ['电动机通过绳子拉起的、挂着重物的滑轮', 1, '滑轮和重物一起移动，可以省力。'],
      ['井上打水的辘轳', 2, '摇把转动的半径大于轴的半径，省力。'],
      ['汽车的方向盘', 2, '方向盘是轮，转向轴是轴。'],
      ['门把手', 2, '把手是轮，门锁的转轴是轴。'],
      ['螺丝刀', 2, '手柄粗（轮），刀杆细（轴）。'],
      ['水龙头的开关', 2, '扳手是轮，阀门的转轴是轴。'],
      ['盘山公路', 3, '把很高的山路修成长长的斜坡，省力但费距离。'],
      ['螺丝钉的螺纹', 3, '螺纹相当于绕在圆柱上的斜面。'],
      ['搬运货物上车的木板跳板', 3, '倾斜的木板是斜面。'],
      ['残疾人通道（无障碍坡道）', 3, '坡道是斜面，越平缓越省力。'],
    ], ['定滑轮', '动滑轮', '轮轴', '斜面']);
  });
})();
