/* 第6章第3节：测量物质的密度——量筒读数（俯视、仰视）、测量盐水的密度、测量小石块的密度、密度小于水的物体怎样测体积（针压法、沉锤法）。依赖 mass.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, M = PS.mass;
  const TAU = Math.PI * 2;
  const WATER = 'rgba(116,192,252,.45)', SALT = 'rgba(150,205,245,.55)';

  /** 量筒刻度的放大窗口：x, y 左上角，w, hh 宽高，k 每 mL 的像素；o.V 真实液面，o.show 看到的示数（俯视、仰视时不同）；o.div、o.every */
  function cylZoom(ctx, F, x, y, w, hh, o, k) {
    const V = o.show == null ? o.V : o.show; // 以看到的示数为窗口中心
    const yOf = (v) => y + hh / 2 - (v - V) * k;
    ctx.save();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 1.5; D.roundRect(ctx, x - 6, y - 6, w + 12, hh + 12, 10); ctx.fill(); ctx.stroke();
    D.roundRect(ctx, x, y, w, hh, 6); ctx.clip();
    ctx.fillStyle = 'rgba(235,244,252,.7)'; ctx.fillRect(x, y, w, hh);
    const ly = yOf(V), m = hh * 0.07;
    ctx.fillStyle = o.liquid || WATER;
    ctx.beginPath(); ctx.moveTo(x, ly - m); ctx.quadraticCurveTo(x + 6, ly, x + w * 0.28, ly); ctx.lineTo(x + w * 0.72, ly); ctx.quadraticCurveTo(x + w - 6, ly, x + w, ly - m); ctx.lineTo(x + w, y + hh); ctx.lineTo(x, y + hh); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(28,126,214,.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, ly - m); ctx.quadraticCurveTo(x + 6, ly, x + w * 0.28, ly); ctx.lineTo(x + w * 0.72, ly); ctx.quadraticCurveTo(x + w - 6, ly, x + w, ly - m); ctx.stroke();
    ctx.strokeStyle = '#1b2333'; ctx.fillStyle = '#1b2333'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.font = PS.font(F(15), 700);
    const span = hh / k;
    const n0 = Math.ceil((V - span / 2 - o.div) / o.div), n1 = Math.floor((V + span / 2 + o.div) / o.div);
    for (let i = n0; i <= n1; i++) {
      const v = PS.round(i * o.div, 4); if (v <= 0) continue;
      const yy = yOf(v), big = Math.abs(v / o.every - Math.round(v / o.every)) < 1e-6, mid = !big && Math.abs((2 * v) / o.every - Math.round((2 * v) / o.every)) < 1e-6;
      ctx.lineWidth = big ? 2.2 : 1.4;
      ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w * (big ? 0.42 : mid ? 0.3 : 0.2), yy); ctx.stroke();
      if (big) ctx.fillText(String(v), x + w * 0.46, yy);
    }
    ctx.font = PS.font(F(12), 700); ctx.textAlign = 'right'; ctx.fillText('mL', x + w - 6, y + 14);
    ctx.restore();
  }

  /* ================= 量筒的使用 ================= */
  const CYLS = [
    { cap: 50, div: 1, every: 10, span: 16, label: '50 mL 量筒' },
    { cap: 100, div: 2, every: 10, span: 30, label: '100 mL 量筒' },
    { cap: 10, div: 0.2, every: 1, span: 3.2, label: '10 mL 量筒' },
  ];
  PS.register('cylinder-read', function (el) {
    const VW = 1000, VH = 440;
    const st = { ci: 0, V: 36, eye: 0, done: false };
    const cSeg = PS.ui.seg(CYLS.map((c, i) => ({ value: i, label: c.label })), 0, (v) => { st.ci = v; newV(); });
    const eSeg = PS.ui.seg([{ value: 1, label: '俯视' }, { value: 0, label: '平视' }, { value: -1, label: '仰视' }], 0, (v) => { st.eye = v; S.render(); upd(); });
    el.append(PS.ui.row(cSeg.el, eSeg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const inp = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', placeholder: '读数', autocomplete: 'off' });
    const msg = h('div', { class: 'ms-msg' });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    el.append(h('div', { class: 'ms-ans' }, h('b', null, '量筒中液体的体积 V ='), inp, h('span', null, 'mL'), PS.ui.button('提交', check, 'btn btn-primary btn-sm'), PS.ui.button('换一个液面 →', newV, 'btn btn-ghost btn-sm')), msg);
    const C = () => CYLS[st.ci];
    const shift = () => st.eye * 3 * C().div; // 俯视、仰视时看到的示数偏差（示意，夸大）
    function newV() {
      const c = C(), n = Math.round(c.cap / c.div);
      st.V = PS.round(PS.randInt(Math.round(n * 0.2), Math.round(n * 0.85)) * c.div, 2);
      st.done = false; inp.value = ''; inp.disabled = false;
      upd(); S.render();
    }
    function upd() {
      const c = C();
      msg.className = 'ms-msg';
      msg.innerHTML = '这个量筒的量程是 <b>' + c.cap + ' mL</b>，分度值是 <b>' + c.div + ' mL</b>（1 mL = 1 cm³）。读数时视线要与<b>凹液面的底部相平</b>。' + (st.eye ? '<br>⚠️ 现在是<b>' + (st.eye > 0 ? '俯视' : '仰视') + '</b>：看到液面对准 ' + PS.round(st.V + shift(), 2) + ' mL，读数偏' + (st.eye > 0 ? '大' : '小') + '。' : '');
    }
    function check() {
      if (st.done) return;
      const x = parseFloat(inp.value.replace(/[，,\s]/g, ''));
      if (isNaN(x)) { inp.focus(); return; }
      st.done = true; inp.disabled = true;
      const ok = Math.abs(x - st.V) < 1e-6, c = C();
      let why = '';
      if (!ok && st.eye && Math.abs(x - (st.V + shift())) < 1e-6) why = '这是' + (st.eye > 0 ? '俯视' : '仰视') + '读出的数，偏' + (st.eye > 0 ? '大' : '小') + '。读数时视线要与凹液面底部相平。';
      else if (!ok && Math.abs(Math.abs(x - st.V) - c.div) < 1e-6) why = '差了一格：分度值是 ' + c.div + ' mL，数清楚格数。';
      else if (!ok) why = '先找分度值（' + c.div + ' mL），再看凹液面底部对准哪条刻度线。';
      msg.className = 'ms-msg ' + (ok ? 'ok' : 'bad');
      msg.innerHTML = (ok ? '✔ 正确！' : '✘ 正确读数是 <b>' + st.V + ' mL</b>。' + why) + ' V = ' + st.V + ' mL = ' + st.V + ' cm³。';
      ok ? PS.sound.good() : PS.sound.bad();
    }
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#e9e1d3'; ctx.fillRect(0, VH - 20, 560, 20);
      const c = C();
      // 侧面示意：左边是眼睛，近处筒壁上有刻度
      const cx = 360, by = VH - 20, cw = 110, chh = 330;
      const info = M.cylinder(ctx, F, cx, by, cw, chh, { cap: c.cap, div: c.div, V: st.V, every: c.every, numbers: true });
      // 眼睛与视线
      const ly = info.level, ex = 70, ey = ly - st.eye * 130;
      const wallX = info.left; // 刻度在靠近眼睛的筒壁上
      const tx = cx, ty = ly;   // 凹液面底部（筒的中央）
      const cross = ey + ((ty - ey) * (wallX - ex)) / (tx - ex);
      ctx.save();
      ctx.strokeStyle = st.eye ? '#e03131' : '#2b8a3e'; ctx.lineWidth = 2; ctx.setLineDash([7, 5]);
      ctx.beginPath(); ctx.moveTo(ex + 18, ey); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(wallX, cross, 5, 0, TAU); ctx.fill();
      ctx.restore();
      eye(ctx, ex, ey);
      D.text(ctx, st.eye > 0 ? '俯视' : st.eye < 0 ? '仰视' : '平视', ex, ey - 26, { size: F(14), weight: 800, color: st.eye ? '#e03131' : '#2b8a3e', align: 'center' });
      if (st.eye) D.text(ctx, '视线与筒壁交点对准的刻度偏' + (st.eye > 0 ? '大' : '小'), 210, st.eye > 0 ? cross - 18 : cross + 26, { size: F(12), weight: 700, color: '#e03131', align: 'center', bg: 'rgba(255,255,255,.9)' });
      D.text(ctx, '侧面示意（俯视、仰视的偏差已放大）', 20, 26, { size: F(12), color: '#868e96' });
      // 放大的刻度
      const zx = 640, zy = 70, zw = 300, zh = 300;
      D.text(ctx, '凹液面附近（放大）', zx, 44, { size: F(14), weight: 700, color: '#495057' });
      cylZoom(ctx, F, zx, zy, zw, zh, { V: st.V, show: st.V + shift(), div: c.div, every: c.every }, zh / c.span);
      // 视线（放大图中的读数线）
      const sy = zy + zh / 2;
      ctx.strokeStyle = st.eye ? '#e03131' : '#2b8a3e'; ctx.lineWidth = 1.6; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(zx - 16, sy); ctx.lineTo(zx + zw + 16, sy); ctx.stroke(); ctx.setLineDash([]);
      D.text(ctx, '👁', zx - 26, sy + 1, { size: 22, align: 'center', baseline: 'middle' });
      D.text(ctx, st.eye ? (st.eye > 0 ? '俯视：读数偏大' : '仰视：读数偏小') : '视线与凹液面底部相平', zx + zw / 2, zy + zh + 34, { size: F(13), weight: 700, color: st.eye ? '#e03131' : '#2b8a3e', align: 'center' });
    }
    function eye(ctx, x, y) {
      ctx.save(); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y, 18, 11, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1b2333'; ctx.beginPath(); ctx.arc(x + 6, y, 6, 0, TAU); ctx.fill(); ctx.restore();
    }
    newV();
  });

  /* ================= 实验通用：分步读数 ================= */
  function stepper(el, steps, onStep) {
    const list = h('ol', { class: 'ms-steps' });
    const inp = h('input', { type: 'text', class: 'num', inputmode: 'decimal' });
    const unit = h('span');
    const label = h('b');
    const msg = h('div', { class: 'ms-msg' });
    const actB = PS.ui.button('', () => api.act(), 'btn btn-primary btn-sm');
    const ansRow = h('div', { class: 'ms-ans' }, label, inp, unit, PS.ui.button('提交', () => api.check(), 'btn btn-primary btn-sm'));
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') api.check(); });
    const api = { i: 0, vals: {}, list, msg, ansRow, actB };
    api.render = function () {
      list.innerHTML = '';
      steps.forEach((s, k) => list.append(h('li', { class: k < api.i ? 'done' : k === api.i ? 'cur' : '' }, h('span', { class: 'n' }, k < api.i ? '✓' : String(k + 1)), h('span', { html: s.t + (k < api.i && s.key ? '：<b>' + api.vals[s.key] + ' ' + s.unit + '</b>' : '') }))));
      const s = steps[api.i];
      if (!s) { ansRow.style.display = 'none'; actB.style.display = 'none'; return; }
      if (s.ask) { ansRow.style.display = ''; label.innerHTML = s.ask; unit.innerHTML = s.unit; inp.value = ''; inp.disabled = false; } else ansRow.style.display = 'none';
      if (s.act) { actB.style.display = ''; actB.innerHTML = s.act; } else actB.style.display = 'none';
    };
    api.act = function () { const s = steps[api.i]; if (s && s.act && s.onAct) s.onAct(() => { api.i++; api.render(); onStep(); }); };
    api.check = function () {
      const s = steps[api.i]; if (!s || !s.ask) return;
      const x = parseFloat(inp.value.replace(/[，,\s]/g, ''));
      if (isNaN(x)) { inp.focus(); return; }
      const ans = s.answer();
      const ok = Math.abs(x - ans) <= (s.tol || 1e-6);
      if (!ok) { msg.className = 'ms-msg bad'; msg.innerHTML = '✘ ' + (s.hint ? s.hint(x, ans) : '再仔细看看。') ; PS.sound.bad(); return; }
      api.vals[s.key] = PS.round(ans, 3);
      msg.className = 'ms-msg ok'; msg.innerHTML = '✔ ' + (s.okMsg ? s.okMsg(ans) : '正确，已记录。');
      PS.sound.good();
      api.i++; api.render(); onStep();
    };
    api.reset = function () { api.i = 0; api.vals = {}; msg.className = 'ms-msg'; msg.innerHTML = ''; api.render(); };
    return api;
  }
  function balanceHint(mass) { return (x, ans) => { const W = M.decompose(ans).w.reduce((a, b) => a + b, 0); return Math.abs(x - W) < 1e-6 ? '别忘了加上游码的示数（看游码左边缘）。' : '读数 = 砝码总质量 + 游码示数。看看砝码和游码的放大图。' + (mass ? '' : ''); }; }
  function cylHint(div) { return (x, ans) => (Math.abs(Math.abs(x - ans) - div) < 1e-6 ? '差了一格：分度值是 ' + div + ' mL。' : '看凹液面底部对准的刻度（分度值 ' + div + ' mL）。'); }

  /** 天平 + 放大的砝码与游码（读数用） */
  function balanceView(ctx, F, x, y, s, m, left, zoomX, zoomY) {
    const d = M.decompose(m);
    M.balance(ctx, F, { x, y, s, tilt: 0, rider: d.r, left: { draw: left }, right: { w: d.w } });
    // 放大
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#dee2e6'; ctx.lineWidth = 1.2; D.roundRect(ctx, zoomX, zoomY, 380, 130, 10); ctx.fill(); ctx.stroke();
    D.text(ctx, '砝码', zoomX + 12, zoomY + 22, { size: F(12), weight: 700, color: '#868e96' });
    let xx = zoomX + 16; const k = 1.5;
    d.w.forEach((g) => { const ww = M.weightSize(g)[0] * k; ctx.save(); ctx.translate(xx + ww / 2, zoomY + 112); ctx.scale(k, k); M.weight(ctx, 0, 0, g); ctx.restore(); xx += ww + 8; });
    if (!d.w.length) D.text(ctx, '（没有用砝码）', zoomX + 20, zoomY + 80, { size: F(12), color: '#868e96' });
    M.rider(ctx, F, zoomX + 200, zoomY + 100, 150, { rider: d.r });
  }

  /* ================= 测量盐水的密度 ================= */
  const SALT_SET = [[1.1, 40], [1.1, 30], [1.15, 40], [1.2, 30], [1.2, 40], [1.05, 40], [1.2, 50]];
  PS.register('liquid-density', function (el) {
    const VW = 1000, VH = 450, CYL = { cap: 100, div: 1, every: 10, span: 20 };
    const st = { rho: 1.1, V: 40, m2: 60, m1: 104, phase: 0, pour: 0, beakerAt: 'bal' };
    el._st = st; // 便于调试
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const steps = [
      { t: '用天平测出<b>烧杯和盐水的总质量 m₁</b>', ask: '烧杯和盐水的总质量 m₁ =', unit: 'g', key: 'm1', answer: () => st.m1, hint: balanceHint() },
      { t: '把烧杯中的<b>一部分</b>盐水倒入量筒', act: '⤵ 倒入量筒', onAct: (done) => pour(done) },
      { t: '读出量筒中盐水的<b>体积 V</b>', ask: '量筒中盐水的体积 V =', unit: 'cm³', key: 'V', answer: () => st.V, hint: cylHint(1) },
      { t: '用天平测出<b>烧杯和剩余盐水的质量 m₂</b>', ask: '烧杯和剩余盐水的质量 m₂ =', unit: 'g', key: 'm2', answer: () => st.m2, hint: balanceHint() },
      { t: '计算盐水的密度 <b>ρ = (m₁ − m₂)/V</b>', ask: '盐水的密度 ρ =', unit: 'g/cm³', key: 'rho', answer: () => st.rho, tol: 0.006, hint: (x) => '倒入量筒的盐水质量 m = m₁ − m₂ = ' + M.fmt(st.m1 - st.m2) + ' g，再除以体积 V = ' + st.V + ' cm³。', okMsg: (r) => '盐水的密度 ρ = ' + r + ' g/cm³ = ' + PS.round(r * 1000, 1) + ' kg/m³。实验完成！' },
    ];
    const sp = stepper(el, steps, () => { st.phase = sp.i; S.render(); });
    el.append(sp.msg, h('div', { class: 'ms-pair', style: { marginTop: '10px' } },
      h('div', null, h('div', { class: 'controls', style: { marginTop: 0 } }, sp.actB, PS.ui.button('↺ 换一杯盐水重做', newRun, 'btn btn-ghost btn-sm')), sp.ansRow),
      h('div', { class: 'panel' }, h('h4', null, '实验步骤'), sp.list)));
    // 方案比较
    const cmp = h('div', { class: 'ms-q' });
    el.append(cmp);
    const PLANS = [
      ['方案乙：先测空烧杯质量 m₀，再测烧杯和盐水总质量 m₁，然后把盐水<b>全部</b>倒入量筒测体积 V，ρ = (m₁ − m₀)/V。测出的密度', ['偏大', '偏小', '准确'], 0, '烧杯内壁会<b>沾着一些盐水</b>倒不干净，量筒中盐水的体积 V 偏小，而 m₁ − m₀ 是全部盐水的质量，所以 ρ 偏<b>大</b>。'],
      ['方案丙：先用量筒测盐水的体积 V，再把量筒里的盐水全部倒入烧杯测质量。测出的密度', ['偏大', '偏小', '准确'], 1, '量筒内壁会<b>沾着一些盐水</b>，倒入烧杯的盐水质量偏小，所以 ρ 偏<b>小</b>（而且量筒不能直接放在天平上称）。'],
      ['我们用的方案甲（测总质量 → 倒入一部分 → 测剩余质量），测出的密度', ['偏大', '偏小', '基本准确'], 2, '倒入量筒的盐水的质量 m₁ − m₂ 和体积 V 是<b>同一部分盐水</b>的，烧杯壁上沾的盐水不影响结果，误差小。'],
    ];
    PLANS.forEach(([q, opts, ans, why]) => {
      const fb = h('div', { class: 'feedback' });
      const ob = h('div', { class: 'q-options cols-3' }, opts.map((o, i) => {
        const b = h('button', { type: 'button', class: 'q-opt', html: o });
        b.addEventListener('click', () => {
          if (fb.classList.contains('show')) return;
          ob.querySelectorAll('.q-opt').forEach((x, j) => { x.disabled = true; if (j === ans) x.classList.add('right'); });
          if (i !== ans) b.classList.add('wrong');
          fb.className = 'feedback show ' + (i === ans ? 'ok' : 'bad'); fb.innerHTML = (i === ans ? '✔ ' : '✘ ') + why;
          i === ans ? PS.sound.good() : PS.sound.bad();
        });
        return b;
      }));
      cmp.append(h('div', { html: '<b>想一想</b>　' + q + '（　）', style: { marginTop: '6px' } }), ob, fb);
    });

    let anim = null;
    const loop = PS.loop((dt) => {
      if (anim) { anim.t = Math.min(1, anim.t + dt / 2.4); st.pour = anim.t; if (anim.t >= 1) { const f = anim.done; anim = null; st.beakerAt = 'bal2'; f(); } }
      S.render();
      if (!anim) loop.stop();
    }, el);
    function pour(done) { anim = { t: 0, done }; st.beakerAt = 'pour'; loop.start(); }
    function newRun() {
      const [rho, V] = PS.pick(SALT_SET);
      st.rho = rho; st.V = V;
      st.m2 = PS.round(PS.randInt(250, 400) * 0.2, 1); // 烧杯和剩余盐水 50~80 g
      st.m1 = PS.round(st.m2 + rho * V, 1);
      st.pour = 0; st.beakerAt = 'bal';
      sp.reset(); st.phase = 0;
      sp.msg.innerHTML = '实验原理：<b>ρ = m/V</b>。器材：天平、量筒、烧杯、盐水。';
      S.render();
    }
    const beakerDraw = (lev) => (ctx, x, y) => M.beaker(ctx, x, y, 70, 82, { level: lev, liquid: SALT, marks: true });
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#e9e1d3'; ctx.fillRect(0, VH - 20, VW, 20);
      const lev1 = 0.78, lev2 = 0.78 * (st.m2 - 30) / (st.m1 - 30); // 烧杯约 30 g
      const p = st.phase;
      const onBal = st.beakerAt !== 'pour';
      const m = p <= 1 ? st.m1 : st.m2;
      const lev = p <= 1 && st.beakerAt === 'bal' ? lev1 : lev2;
      // 天平
      if (onBal && (p === 0 || p >= 3)) balanceView(ctx, F, 210, VH - 20, 1.02, p === 0 ? st.m1 : st.m2, beakerDraw(p === 0 ? lev1 : lev2), 20, 16);
      else M.balance(ctx, F, { x: 210, y: VH - 20, s: 1.02, tilt: 0, rider: 0 });
      if (p === 2) { M.beaker(ctx, 470, VH - 20, 70, 82, { level: lev2, liquid: SALT, marks: true }); D.text(ctx, '烧杯和剩余盐水', 470, VH - 112, { size: F(11), color: '#868e96', align: 'center' }); }
      void m; void lev;
      // 量筒
      const cx = 600, V = p >= 2 ? st.V : st.V * st.pour;
      M.cylinder(ctx, F, cx, VH - 20, 64, 300, { cap: CYL.cap, div: CYL.div, every: CYL.every, V, liquid: SALT, numbers: true });
      // 倒盐水
      if (st.beakerAt === 'pour') {
        const t = st.pour, bx = cx - 70 + 0 * t, byy = 70;
        ctx.save(); ctx.translate(bx, byy); ctx.rotate(-0.9 * Math.min(1, t * 3));
        M.beaker(ctx, 0, 41, 70, 82, { level: lev1 - (lev1 - lev2) * t, liquid: SALT });
        ctx.restore();
        if (t > 0.2 && t < 0.95) { ctx.strokeStyle = 'rgba(28,126,214,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 20, 64); ctx.quadraticCurveTo(cx - 4, 90, cx - 2, 260); ctx.stroke(); }
      }
      // 量筒放大
      if (p >= 2) {
        D.text(ctx, '量筒液面（放大）', 700, 40, { size: F(13), weight: 700, color: '#495057' });
        cylZoom(ctx, F, 700, 60, 260, 240, { V: st.V, div: CYL.div, every: CYL.every, liquid: SALT }, 240 / CYL.span);
      } else {
        D.text(ctx, '量筒：100 mL，分度值 1 mL', 700, 60, { size: F(13), weight: 700, color: '#495057' });
      }
      // 数据
      const v = sp.vals, ty = 340;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#dee2e6'; D.roundRect(ctx, 700, ty - 18, 280, 108, 10); ctx.fill(); ctx.stroke();
      D.text(ctx, 'm₁ = ' + (v.m1 != null ? M.fmt(v.m1) + ' g' : '?') + '　m₂ = ' + (v.m2 != null ? M.fmt(v.m2) + ' g' : '?'), 714, ty + 8, { size: F(14), weight: 700 });
      D.text(ctx, 'V = ' + (v.V != null ? v.V + ' cm³' : '?'), 714, ty + 38, { size: F(14), weight: 700 });
      D.text(ctx, 'ρ = ' + (v.rho != null ? v.rho + ' g/cm³' : '?'), 714, ty + 70, { size: F(16), weight: 800, color: v.rho != null ? '#2b8a3e' : '#868e96' });
    }
    newRun();
  });

  /* ================= 测量小石块的密度 ================= */
  const STONES = [[26.8, 10], [32.4, 12], [39.2, 14], [42.4, 16], [52, 20]];
  PS.register('stone-density', function (el) {
    const VW = 1000, VH = 450, CYL = { cap: 100, div: 2, every: 10, span: 30 };
    const st = { m: 26.8, V: 10, V1: 40, sink: 0, sunk: false, mode: 'ok' };
    el._st = st; // 便于调试
    const mSeg = PS.ui.seg([{ value: 'ok', label: '规范操作' }, { value: 'wet', label: '先测体积，再测质量' }, { value: 'soak', label: '石块会吸水' }], 'ok', (v) => { st.mode = v; newRun(); });
    el.append(PS.ui.row(mSeg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const wetM = () => (st.mode === 'wet' ? PS.round(st.m + 0.8, 1) : st.m); // 先测体积：石块沾了水
    const V2 = () => st.V1 + st.V - (st.mode === 'soak' ? 2 : 0);          // 吸水：液面少升高
    const S_M = { id: 'm', t: '用天平测出小石块的<b>质量 m</b>', ask: '小石块的质量 m =', unit: 'g', key: 'm', answer: () => wetM(), hint: balanceHint() };
    const S_V1 = { id: 'V1', t: '在量筒中倒入<b>适量</b>的水，读出<b>体积 V₁</b>', ask: '水的体积 V₁ =', unit: 'cm³', key: 'V1', answer: () => st.V1, hint: cylHint(2) };
    const S_SINK = { id: 'sink', t: '用细线系住石块，<b>浸没</b>在水中', act: '⬇ 把石块浸没在水中', onAct: (done) => sinkIt(done) };
    const S_V2 = { id: 'V2', t: '读出水和石块的<b>总体积 V₂</b>', ask: '总体积 V₂ =', unit: 'cm³', key: 'V2', answer: () => V2(), hint: cylHint(2) };
    const S_R = { id: 'rho', t: '计算 <b>ρ = m/(V₂ − V₁)</b>', ask: '小石块的密度 ρ =', unit: 'g/cm³', key: 'rho', answer: () => PS.round(wetM() / (V2() - st.V1), 2), tol: 0.011, hint: () => '石块的体积 V = V₂ − V₁ = ' + (V2() - st.V1) + ' cm³，ρ = m/V。', okMsg: (r) => result(r) };
    const steps = [];
    const sp = stepper(el, steps, () => S.render());
    el.append(sp.msg, h('div', { class: 'ms-pair', style: { marginTop: '10px' } },
      h('div', null, h('div', { class: 'controls', style: { marginTop: 0 } }, sp.actB, PS.ui.button('↺ 换一块石块', newRun, 'btn btn-ghost btn-sm')), sp.ansRow,
        h('div', { class: 'tip small', style: { marginTop: '10px' }, html: '<b>“适量”的水</b>：既能<b>浸没</b>石块，浸没后液面又不超过量筒的<b>量程</b>。形状不规则的固体用<b>排水法</b>测体积：V = V₂ − V₁。' })),
      h('div', { class: 'panel' }, h('h4', null, '实验步骤'), sp.list)));
    function result(r) {
      const trueR = PS.round(st.m / st.V, 2);
      if (st.mode === 'ok') return '小石块的密度 ρ = ' + r + ' g/cm³ = ' + PS.round(r * 1000, 0) + ' kg/m³，与花岗岩的密度（2.6~2.8 g/cm³）接近。';
      if (st.mode === 'wet') return '算出 ρ = ' + r + ' g/cm³，但石块的真实密度是 ' + trueR + ' g/cm³——<b>偏大</b>！先测体积，石块上<b>沾了水</b>，测得的质量偏大。所以要<b>先测质量，再测体积</b>。';
      return '算出 ρ = ' + r + ' g/cm³，但石块的真实密度是 ' + trueR + ' g/cm³——<b>偏大</b>！石块<b>吸了一些水</b>，液面上升得少，测得的体积 V₂ − V₁ 偏小。可以先让石块吸足水再测。';
    }
    let anim = null;
    const loop = PS.loop((dt) => {
      if (anim) { anim.t = Math.min(1, anim.t + dt / 2); st.sink = anim.t; if (anim.t >= 1) { const f = anim.done; anim = null; st.sunk = true; f(); } }
      S.render();
      if (!anim) loop.stop();
    }, el);
    function sinkIt(done) { anim = { t: 0, done }; loop.start(); }
    function newRun() {
      const [m, V] = PS.pick(STONES);
      st.m = m; st.V = V; st.V1 = PS.pick([40, 50, 60]); st.sink = 0; st.sunk = false;
      steps.splice(0, steps.length, ...(st.mode === 'wet' ? [S_V1, S_SINK, S_V2, S_M, S_R] : [S_M, S_V1, S_SINK, S_V2, S_R]));
      sp.reset();
      sp.msg.innerHTML = st.mode === 'wet' ? '这一次<b>先</b>用排水法测体积，再把石块从水里拿出来，<b>直接</b>放到天平上称质量（石块上沾着水）。' : st.mode === 'soak' ? '这一次的小石块是一块会<b>吸水</b>的砂岩，浸没在水中时会吸进一些水。' : '实验原理：<b>ρ = m/V</b>。器材：天平、量筒、水、细线、小石块。';
      S.render();
    }
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#e9e1d3'; ctx.fillRect(0, VH - 20, VW, 20);
      const cur = steps[sp.i] ? steps[sp.i].id : 'end';
      const mDone = sp.vals.m != null;
      const wetOut = st.mode === 'wet' && (cur === 'm' || mDone); // 测完体积后拿出来称
      const stone = (ctx2, x, y) => { M.stone(ctx2, x, y, 20, { seed: 4 }); if (st.mode === 'wet') { ctx2.fillStyle = 'rgba(28,126,214,.75)'; [[-10, -14], [6, -20], [12, -8]].forEach(([dx, dy]) => { ctx2.beginPath(); ctx2.ellipse(x + dx, y + dy, 2.5, 3.5, 0, 0, TAU); ctx2.fill(); }); } };
      if (cur === 'm' || wetOut) balanceView(ctx, F, 210, VH - 20, 1.02, wetM(), stone, 20, 16);
      else M.balance(ctx, F, { x: 210, y: VH - 20, s: 1.02, tilt: 0, rider: 0, left: wetOut ? { draw: stone } : null });
      const inCyl = (st.sunk || anim) && !wetOut;
      const cx = 600, sink = st.sunk ? 1 : st.sink;
      const Vnow = inCyl ? st.V1 + (V2() - st.V1) * Math.max(0, Math.min(1, (sink - 0.45) / 0.45)) : st.V1;
      M.cylinder(ctx, F, cx, VH - 20, 70, 300, { cap: CYL.cap, div: CYL.div, every: CYL.every, V: Vnow, numbers: true,
        inside: (c2, inf) => {
          if (!inCyl) return;
          const yTop = 40, yBot = inf.y0 - 2, sy = yTop + (yBot - yTop) * Math.min(1, sink);
          c2.strokeStyle = '#495057'; c2.lineWidth = 1.2; c2.beginPath(); c2.moveTo(cx, 0); c2.lineTo(cx, sy - 30); c2.stroke();
          M.stone(c2, cx, sy, 20, { seed: 4 });
        } });
      if (!inCyl && !wetOut && cur !== 'm') { M.stone(ctx, 470, VH - 20, 20, { seed: 4 }); D.text(ctx, '小石块（系好细线）', 470, VH - 64, { size: F(11), color: '#868e96', align: 'center' }); }
      if (cur !== 'm' || mDone) {
        D.text(ctx, '量筒液面（放大）', 700, 40, { size: F(13), weight: 700, color: '#495057' });
        cylZoom(ctx, F, 700, 60, 260, 240, { V: Math.round(Vnow / 2) * 2, div: CYL.div, every: CYL.every }, 240 / CYL.span);
      } else D.text(ctx, '量筒：100 mL，分度值 2 mL', 700, 60, { size: F(13), weight: 700, color: '#495057' });
      const v = sp.vals, ty = 340;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#dee2e6'; D.roundRect(ctx, 700, ty - 18, 280, 108, 10); ctx.fill(); ctx.stroke();
      D.text(ctx, 'm = ' + (v.m != null ? M.fmt(v.m) + ' g' : '?'), 714, ty + 8, { size: F(14), weight: 700 });
      D.text(ctx, 'V₁ = ' + (v.V1 != null ? v.V1 : '?') + '　V₂ = ' + (v.V2 != null ? v.V2 : '?') + ' cm³', 714, ty + 38, { size: F(14), weight: 700 });
      D.text(ctx, 'ρ = ' + (v.rho != null ? v.rho + ' g/cm³' : '?'), 714, ty + 70, { size: F(16), weight: 800, color: v.rho != null ? (st.mode === 'ok' ? '#2b8a3e' : '#e03131') : '#868e96' });
    }
    newRun();
  });

  /* ================= 密度小于水的物体：针压法、沉锤法 ================= */
  PS.register('float-volume', function (el) {
    const VW = 1000, VH = 400;
    const st = { mode: 'pin', k: 0, t: 1 };
    const M_WAX = 9, V_WAX = 10;
    const SEQ = {
      pin: [['量筒中倒入适量的水，读出体积 V₁', 50], ['放入蜡块：蜡块<b>漂浮</b>在水面上，没有浸没，不能这样读体积', 59], ['用细针把蜡块<b>压入</b>水中，使它刚好浸没，读出总体积 V₂', 60]],
      sink: [['用细线把铁块（重锤）系在蜡块下面，<b>只让铁块浸没</b>，读出体积 V₁', 56], ['再把蜡块和铁块<b>一起浸没</b>，读出总体积 V₂', 66]],
    };
    const seg = PS.ui.seg([{ value: 'pin', label: '针压法（压入法）' }, { value: 'sink', label: '沉锤法（悬垂法）' }], 'pin', (v) => { st.mode = v; st.k = 0; st.t = 1; upd(); });
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const msg = h('div', { class: 'ms-msg' });
    const nb = PS.ui.button('下一步 →', () => { const L = SEQ[st.mode]; if (st.k < L.length - 1) { st.k++; st.t = 0; loop.start(); upd(); } }, 'btn btn-primary btn-sm');
    el.append(PS.ui.row(nb, PS.ui.button('↺ 重来', () => { st.k = 0; st.t = 1; upd(); }, 'btn btn-ghost btn-sm')), msg);
    const loop = PS.loop((dt) => { st.t = Math.min(1, st.t + dt / 1.4); S.render(); if (st.t >= 1) loop.stop(); }, el);
    function upd() {
      const L = SEQ[st.mode], last = st.k === L.length - 1;
      msg.className = 'ms-msg' + (last ? ' ok' : '');
      msg.innerHTML = '第 ' + (st.k + 1) + ' 步：' + L[st.k][0] + '。' + (last ? '<br>蜡块的体积 V = V₂ − V₁ = ' + L[L.length - 1][1] + ' mL − ' + L[0][1] + ' mL = <b>' + V_WAX + ' cm³</b>；蜡块质量 ' + M_WAX + ' g，ρ = ' + M_WAX + ' g ÷ ' + V_WAX + ' cm³ = <b>0.9 g/cm³</b>。' : '');
      S.render();
    }
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#e9e1d3'; ctx.fillRect(0, VH - 18, VW, 18);
      const L = SEQ[st.mode], e = st.t;
      const prevV = st.k > 0 ? L[st.k - 1][1] : L[0][1], V = prevV + (L[st.k][1] - prevV) * e;
      const cx = 330;
      M.cylinder(ctx, F, cx, VH - 18, 90, 300, { cap: 100, div: 2, every: 10, V, numbers: true,
        inside: (c2, inf) => {
          const lvl = inf.y0 - V * inf.ppm, s = 34;
          if (st.mode === 'pin') {
            if (st.k === 0) return;
            const yFloat = lvl + s * 0.9 - s, ySub = lvl + 6;
            const y = st.k === 1 ? -40 + (yFloat + 40) * e : yFloat + (ySub - yFloat) * e;
            M.block(c2, cx - s / 2, y + s, s, s, PS.MAT.wax, { d: 0 });
            if (st.k === 2) { c2.strokeStyle = '#495057'; c2.lineWidth = 1.5; c2.beginPath(); c2.moveTo(cx + 2, y); c2.lineTo(cx + 40, y - 140); c2.stroke(); D.text(c2, '细针', cx + 46, y - 120, { size: F(12), color: '#495057' }); }
          } else {
            const bot = inf.y0 - 4;
            const ironY = st.k === 0 ? bot - 2 : bot - 2;
            const waxY = st.k === 0 ? lvl - 12 : (lvl - 12) + ((ironY - 26) - (lvl - 12)) * e;
            c2.strokeStyle = '#495057'; c2.lineWidth = 1.2; c2.beginPath(); c2.moveTo(cx, 0); c2.lineTo(cx, ironY - 20); c2.stroke();
            M.block(c2, cx - s / 2, waxY, s, s, PS.MAT.wax, { d: 0 });
            M.block(c2, cx - 12, ironY, 24, 20, PS.MAT.iron, { d: 0 });
          }
        } });
      D.text(ctx, st.mode === 'pin' ? '蜡块的密度比水小，放入水中会漂浮' : '铁块（重锤）把蜡块拉入水中', cx, 26, { size: F(14), weight: 700, color: '#495057', align: 'center' });
      // 右侧放大与记录
      D.text(ctx, '量筒液面（放大）', 620, 40, { size: F(13), weight: 700, color: '#495057' });
      cylZoom(ctx, F, 620, 60, 220, 200, { V: Math.round(V), div: 2, every: 10 }, 200 / 30);
      const ty = 300;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#dee2e6'; D.roundRect(ctx, 600, ty, 380, 80, 10); ctx.fill(); ctx.stroke();
      D.text(ctx, 'V₁ = ' + L[0][1] + ' mL', 620, ty + 30, { size: F(15), weight: 700 });
      D.text(ctx, 'V₂ = ' + (st.k === L.length - 1 && e >= 1 ? L[L.length - 1][1] + ' mL' : '?'), 790, ty + 30, { size: F(15), weight: 700 });
      D.text(ctx, 'V蜡 = V₂ − V₁' + (st.k === L.length - 1 && e >= 1 ? ' = ' + V_WAX + ' cm³' : ''), 620, ty + 62, { size: F(15), weight: 800, color: '#2b8a3e' });
    }
    upd();
  });
})();
