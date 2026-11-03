/* 第14章第2节：热机的效率——燃料的热值表与 Q = mq、热机的能量流向与效率、测量燃气灶烧水的效率、能否提高热机的效率、热值和效率的计算随机练习。
 * 依赖 heat.js、energy.js、thermal.js（PS.FUEL） */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, TH = PS.th, EN = PS.en, FU = PS.FUEL;
  const TAU = Math.PI * 2;
  const P = (x, sig) => PS.pretty(PS.round(x, 9), sig || 3);
  /** 热值的教材写法：3.0×10⁷、1.4×10⁸ */
  const qTxt = (k) => { const f = FU[k]; if (f.range) return '约' + f.range; const e = Math.floor(Math.log10(f.q) + 1e-9), m = f.q / Math.pow(10, e); return (f.approx ? '约' : '') + m.toFixed(1) + '×10' + String(e).split('').map((c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]).join(''); };
  const qUnit = (k) => (FU[k].gas ? 'J/m³' : 'J/kg');
  PS.th.qTxt = qTxt;

  /* ================= 燃料的热值 ================= */
  PS.register('fuel-table', function (el) {
    const VW = 1000, K = PS.FUEL_ORDER, SOL = K.filter((k) => !FU[k].gas), GAS = K.filter((k) => FU[k].gas);
    const st = { on: 'alcohol', m: 1, hl: null };
    const RULES = [
      ['热值最大的是氢', ['h2'], '<b>氢的热值最大</b>（1.4×10⁸ J/kg），所以运载火箭常用液态氢作燃料：相同质量的燃料，氢完全燃烧放出的热量最多。'],
      ['热值相同的燃料', ['petrol', 'kerosene', 'alcohol', 'coke'], '汽油和煤油的热值相同，酒精和焦炭的热值也相同——不能仅凭热值鉴别燃料。'],
      ['气体燃料的单位', ['coalgas', 'biogas', 'natgas'], '气体燃料的热值常用 <b>J/m³</b> 作单位：每立方米的气体燃料完全燃烧放出的热量，计算时用 <b>Q放 = Vq</b>。'],
    ];
    const chips = h('div', { class: 'th-chips' });
    RULES.forEach((r, i) => chips.append(PS.ui.button(r[0], () => { st.hl = st.hl === i ? null : i; chips.querySelectorAll('.btn').forEach((b, j) => b.classList.toggle('on', j === st.hl)); tell(); }, 'btn btn-sm')));
    el.append(h('div', { class: 'small muted' }, '从表中能发现什么？'), chips);
    const S = EN.stage(el, { VW, vh: (w) => lay(w).VH, draw });
    const msg = h('div', { class: 'th-msg info' });
    const sl = PS.ui.slider({ label: '质量', min: 0.1, max: 5, step: 0.1, value: 1, unit: 'kg', onInput: (v) => { st.m = v; tell(); } });
    sl.el.classList.add('wide');
    const calc = h('div', { class: 'th-msg' });
    el.append(msg, PS.ui.row(sl.el), calc);
    PS.drag(S, { VW, get VH() { return S.VH; }, hit: (p) => { const L = lay(S.w || 1000), r = L.rows.find((r) => Math.abs(p.y - r.y) < L.rh / 2); return r ? r.k : null; }, start: (k) => { st.on = k; st.hl = null; chips.querySelectorAll('.btn').forEach((b) => b.classList.remove('on')); PS.sound.tick(); tell(); }, move() {} });
    function lay(w) {
      const n = EN.narrow(w), rh = n ? 66 : 32, hd = n ? 70 : 40;
      const rows = []; let y = hd;
      SOL.forEach((k) => { rows.push({ k, y: y + rh / 2 }); y += rh; });
      const gasY = y;
      y += hd;
      GAS.forEach((k) => { rows.push({ k, y: y + rh / 2 }); y += rh; });
      return { n, rh, hd, rows, gasY, VH: y + 8 };
    }
    function tell() {
      const f = FU[st.on], gas = !!f.gas;
      if (st.hl != null) { msg.className = 'th-msg ok'; msg.innerHTML = RULES[st.hl][2]; }
      else { msg.className = 'th-msg info'; msg.innerHTML = '<b>' + f.n + '</b>的热值是 ' + qTxt(st.on) + ' ' + qUnit(st.on) + '，它表示：<b>' + (gas ? '1 m³ ' : '1 kg ') + f.n + '完全燃烧放出的热量' + (f.approx ? '约' : '') + '是 ' + qTxt(st.on).replace('约', '') + ' J</b>。点击其他燃料比较。'; }
      sl.el.querySelector('.slider-label').innerHTML = gas ? '体积 V' : '质量 m';
      const m = st.m, Q = m * f.q, need = 4200 * 2 * 80 / f.q;
      sl.el.querySelector('output').innerHTML = PS.fmt(m, 1) + (gas ? ' m³' : ' kg');
      calc.innerHTML = '完全燃烧 ' + PS.fmt(m, 1) + (gas ? ' m³ ' : ' kg ') + f.n + '：' + (gas ? 'Q放 = Vq = ' : 'Q放 = mq = ') + PS.fmt(m, 1) + (gas ? ' m³' : ' kg') + ' × ' + (f.range ? '8.0×10⁷' : qTxt(st.on).replace('约', '')) + ' ' + qUnit(st.on) + ' = <b>' + P(Q) + ' J</b>' + (f.range ? '（热值取 8.0×10⁷ J/m³）' : '')
        + '<br><span class="muted">把一壶水（2 kg，20 ℃）烧开要吸收 6.72×10⁵ J 的热量，如果放出的热量全部被水吸收，需要完全燃烧' + f.n + ' ' + (gas ? P(need * 1000, 3) + ' L（' + P(need, 2) + ' m³）' : P(need * 1000, 3) + ' g') + '。</span>';
      S.render();
    }
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, VW, VH), L = lay(w), n = L.n;
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const nameW = n ? 190 : 140, x0 = nameW + 14, x1 = n ? 760 : 820;
      D.text(ctx, '固体、液体燃料（单位：J/kg）', 16, L.hd - F(13) * 0.6, { size: F(13), weight: 800, color: '#495057' });
      D.text(ctx, '气体燃料（单位：J/m³）', 16, L.gasY + L.hd - F(13) * 0.6, { size: F(13), weight: 800, color: '#495057' });
      const hlSet = st.hl != null ? RULES[st.hl][1] : null;
      L.rows.forEach(({ k, y }) => {
        const f = FU[k], max = f.gas ? 9e7 : 1.4e8, on = k === st.on && !hlSet, hi = hlSet && hlSet.includes(k);
        if (on || hi) { ctx.fillStyle = hi ? '#ebfbee' : '#fff4e6'; ctx.fillRect(4, y - L.rh / 2 + 2, VW - 8, L.rh - 4); }
        D.text(ctx, f.ico + ' ' + f.n, nameW, y, { size: F(13), weight: on || hi ? 800 : 600, align: 'right', baseline: 'middle', color: '#343a40' });
        const bw = ((x1 - x0) * f.q) / max, bh = L.rh * 0.56;
        ctx.fillStyle = f.col; D.roundRect(ctx, x0, y - bh / 2, Math.max(4, bw), bh, 5); ctx.fill();
        if (f.range) { ctx.globalAlpha = 0.35; D.roundRect(ctx, x0 + ((x1 - x0) * 7.1e7) / max, y - bh / 2, ((x1 - x0) * 1.7e7) / max, bh, 5); ctx.fill(); ctx.globalAlpha = 1; }
        if (on || hi) { ctx.strokeStyle = hi ? '#2b8a3e' : '#e8590c'; ctx.lineWidth = 2.5; D.roundRect(ctx, x0, y - bh / 2, Math.max(4, bw), bh, 5); ctx.stroke(); }
        D.text(ctx, qTxt(k), x0 + bw + 8, y, { size: F(12), weight: 700, baseline: 'middle', color: '#495057' });
      });
    }
    tell();
  });

  /* ================= 热机的能量流向与效率 ================= */
  const FLOW = {
    petrol: { n: '汽油机', loss: [['未完全燃烧', 5, '#adb5bd'], ['废气带走', 35, '#868e96'], ['冷却和散热', 26, '#4dabf7'], ['克服摩擦', 6, '#f59f00']], use: '有用功', imp: [['使燃料充分燃烧', 0], ['保持良好的润滑，减小摩擦', 3], ['利用废气的能量', 1]] },
    diesel: { n: '柴油机', loss: [['未完全燃烧', 3, '#adb5bd'], ['废气带走', 30, '#868e96'], ['冷却和散热', 22, '#4dabf7'], ['克服摩擦', 6, '#f59f00']], use: '有用功', imp: [['使燃料充分燃烧', 0], ['保持良好的润滑，减小摩擦', 3], ['利用废气的能量', 1]] },
    steam: { n: '蒸汽机', loss: [['未完全燃烧', 8, '#adb5bd'], ['烟气带走', 30, '#868e96'], ['锅炉、管道和废汽散热', 45, '#4dabf7'], ['克服摩擦', 7, '#f59f00']], use: '有用功', imp: [['使燃料充分燃烧', 0], ['保持良好的润滑，减小摩擦', 3], ['利用废汽的能量', 2]] },
    stove: { n: '燃气灶烧水', loss: [['未完全燃烧', 5, '#adb5bd'], ['烟气带走', 25, '#868e96'], ['锅（壶）吸热', 8, '#f59f00'], ['散失到空气中', 22, '#4dabf7']], use: '水吸收的热量', imp: [['使燃料充分燃烧', 0], ['加防风圈，减少散热', 3]] },
  };
  PS.register('energy-flow', function (el) {
    const VW = 1000;
    const st = { k: 'petrol', imp: [] };
    const seg = PS.ui.seg(Object.keys(FLOW).map((k) => ({ value: k, label: FLOW[k].n })), st.k, (v) => { st.k = v; st.imp = []; build(); });
    seg.el.style.flexWrap = 'wrap';
    const impBox = h('div', { class: 'th-chips' });
    el.append(PS.ui.row(seg.el), h('div', { class: 'small muted', style: { marginTop: '4px' } }, '怎样提高效率？点一点：'), impBox);
    const S = EN.stage(el, { VW, vh: (w) => (EN.narrow(w) ? 900 : 470), draw });
    const msg = h('div', { class: 'th-msg info' });
    el.append(msg);
    // 识图练习
    const q = h('div', { class: 'th-q' }), inp = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', autocomplete: 'off', placeholder: '答案' }), qfb = h('div', { class: 'th-msg' });
    el.append(q, h('div', { class: 'th-ans' }, inp, h('span', null, '%'), PS.ui.button('提交', check, 'btn btn-primary btn-sm'), PS.ui.button('换一题', ask, 'btn btn-ghost btn-sm')), qfb);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    let QA = null;
    function ask() {
      const a = PS.randInt(25, 40), b = PS.randInt(20, 33), c = PS.randInt(4, 9), u = 100 - a - b - c;
      QA = u;
      q.innerHTML = '<b>识图：</b>某内燃机工作时的能量流向是：燃料完全燃烧放出的能量为 100%，废气带走 ' + a + '%，冷却水带走 ' + b + '%，克服摩擦等机械损耗 ' + c + '%。这台内燃机的效率是多少？';
      inp.value = ''; inp.disabled = false; qfb.className = 'th-msg'; qfb.innerHTML = '';
    }
    function check() {
      if (QA == null || inp.disabled) return;
      const v = TH.parse(inp.value); if (isNaN(v)) return;
      const good = Math.abs(v - QA) < 0.01; inp.disabled = true;
      qfb.className = 'th-msg ' + (good ? 'ok' : 'bad'); qfb.innerHTML = (good ? '✔ 正确！' : '✘ 答案是 ' + QA + '%。') + '用来做有用功的能量 = 100% − 各种损失 = ' + QA + '%，所以 η = ' + QA + '%。';
      good ? PS.sound.good() : PS.sound.bad();
    }
    function data() {
      const Fd = FLOW[st.k], loss = Fd.loss.map((x) => ({ n: x[0], v: x[1], c: x[2] }));
      let use = 100 - loss.reduce((s, x) => s + x.v, 0);
      if (st.imp.includes(0)) { const u = loss[0].v; loss[0].v = 0; const rest = 100 - u; loss.forEach((x, i) => { if (i) x.v += (u * x.v) / rest; }); use += (u * use) / rest; }
      if (st.imp.includes(3)) { const x = loss[3], d = x.v * (st.k === 'stove' ? 0.4 : 0.5); x.v -= d; use += d; }
      if (st.imp.includes(1)) { const x = loss[1], d = x.v * 0.3; x.v -= d; use += d; }
      if (st.imp.includes(2)) { const x = loss[2], d = x.v * 0.3; x.v -= d; use += d; }
      return { loss, use };
    }
    function build() {
      impBox.innerHTML = '';
      FLOW[st.k].imp.forEach(([t, i]) => impBox.append(PS.ui.button(t, () => { st.imp = st.imp.includes(i) ? st.imp.filter((x) => x !== i) : st.imp.concat(i); build(); }, 'btn btn-sm' + (st.imp.includes(i) ? ' on' : ''))));
      const d = data(), Fd = FLOW[st.k];
      const eta = PS.round(d.use, 1);
      const big = d.loss.reduce((a, b) => (b.v > a.v ? b : a));
      msg.className = 'th-msg ' + (st.imp.length ? 'ok' : 'info');
      msg.innerHTML = (st.k === 'stove' ? '燃气灶的效率' : Fd.n + '的效率') + ' η = <span class="frac"><span>' + (st.k === 'stove' ? 'Q吸' : 'W有') + '</span><span>Q放</span></span> × 100% ≈ <b>' + eta + '%</b>。'
        + (st.imp.length ? '采取措施后效率提高了，但各种损失不可能完全消除，效率<b>总小于 100%</b>。' : '各种损失中，<b>' + big.n + '</b>的能量最多' + (st.k === 'stove' ? '。' : '——设法利用废气的能量，是提高燃料利用率的重要措施。'));
      S.render();
    }
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, VW, VH), n = EN.narrow(w);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const d = data(), Fd = FLOW[st.k];
      const x0 = 30, y0 = n ? 150 : 86, H = n ? 300 : 210, yb = VH - (n ? 190 : 100), gap = n ? 170 : 150, xs0 = n ? 150 : 250, r = 18;
      const tl = ['燃料完全燃烧放出的能量 Q放', '（' + (st.k === 'stove' ? '天然气' : '燃料') + '的化学能转化为内能）100%'];
      (n ? tl : [tl.join('')]).forEach((s, i) => D.text(ctx, s, x0, y0 - 14 - (n ? (1 - i) * F(14) * 1.3 : 0), { size: F(14), weight: 800, color: '#e8590c' }));
      let rem = H;
      const xEnd = VW - 40;
      // 主干先画成整体，分支再叠上去
      d.loss.forEach((L, i) => {
        const t = (L.v / 100) * H, xs = xs0 + i * gap, ya = y0 + rem - t, ybb = y0 + rem;
        if (t > 0.3) {
          ctx.fillStyle = L.c; ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.moveTo(xs, ya);
          ctx.arc(xs, ybb + r, r + t, -Math.PI / 2, 0);
          ctx.lineTo(xs + r + t, yb);
          ctx.lineTo(xs + r, yb);
          ctx.arc(xs, ybb + r, r, 0, -Math.PI / 2, true);
          ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
          ctx.fillStyle = L.c; ctx.beginPath(); ctx.moveTo(xs + r - 8, yb); ctx.lineTo(xs + r + t + 8, yb); ctx.lineTo(xs + r + t / 2, yb + 18); ctx.closePath(); ctx.fill();
        }
        // 这一段主干
        ctx.fillStyle = '#ffa94d'; ctx.globalAlpha = 0.8;
        ctx.fillRect(i ? xs0 + (i - 1) * gap : x0, y0, i ? gap : xs0 - x0, rem); ctx.globalAlpha = 1;
        rem -= t;
        const names = n ? splitName(L.n) : [L.n];
        const lx = xs + r + t / 2;
        names.forEach((s, j) => D.text(ctx, s, lx, yb + 22 + F(13) * (1.05 + j * 1.2), { size: F(13), weight: 700, align: 'center', color: '#343a40' }));
        D.text(ctx, PS.fmt(L.v, 1).replace(/\.0$/, '') + '%', lx, yb + 22 + F(13) * (1.15 + names.length * 1.2), { size: F(13), weight: 800, align: 'center', color: '#495057' });
      });
      const xl = xs0 + (d.loss.length - 1) * gap;
      ctx.fillStyle = '#2b8a3e'; ctx.globalAlpha = 0.85; ctx.fillRect(xl, y0, xEnd - xl - 20, rem); ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.moveTo(xEnd - 20, y0 - 10); ctx.lineTo(xEnd + 10, y0 + rem / 2); ctx.lineTo(xEnd - 20, y0 + rem + 10); ctx.closePath(); ctx.fill();
      const ux = n ? 820 : 880, uy = y0 + rem + F(14) * 1.6;
      D.text(ctx, Fd.use, ux, uy, { size: F(14), weight: 800, align: 'center', color: '#2b8a3e' });
      D.text(ctx, PS.fmt(d.use, 1).replace(/\.0$/, '') + '%', ux, uy + F(14) * 1.3, { size: F(15), weight: 800, align: 'center', color: '#2b8a3e' });
    }
    function splitName(s) { if (s.length <= 3) return [s]; if (s.length <= 6) return [s.slice(0, Math.ceil(s.length / 2)), s.slice(Math.ceil(s.length / 2))]; return [s.slice(0, 4), s.slice(4, 8), s.slice(8)].filter(Boolean); }
    build(); ask();
  });

  /* ================= 测量燃气灶烧水的效率 ================= */
  PS.register('stove-eff', function (el) {
    const VW = 1000, Q_GAS = 8.0e7;
    const st = {};
    const S = EN.stage(el, { VW, vh: (w) => (EN.narrow(w) ? 800 : 430), draw });
    const list = h('ol', { class: 'fu-steps' }), ask = h('div', { class: 'th-q' }), fb = h('div', { class: 'th-msg info' });
    const inp = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', autocomplete: 'off', placeholder: '读数或答案' }), unit = h('span');
    const okB = PS.ui.button('确定', check, 'btn btn-primary btn-sm'), actB = PS.ui.button('🔥 点火加热', heat, 'btn btn-primary btn-sm');
    const ans = h('div', { class: 'th-ans' }, inp, unit, okB, actB);
    el.append(h('div', { class: 'small muted', style: { margin: '6px 0' } }, '天然气的热值取 q = 8.0×10⁷ J/m³，水的比热容 c = 4.2×10³ J/(kg·℃)。'), list, ask, ans, fb, PS.ui.row(PS.ui.button('换一组数据', setup, 'btn btn-ghost btn-sm')));
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    const STEPS = [
      { t: '读出加热前燃气表的示数 V₁', u: 'm³', a: () => st.V1, tol: 0.0004, rd: true },
      { t: '读出水的初温 t₀', u: '℃', a: () => st.t0, tol: 0.01, rd: true },
      { t: '点火加热，水温升高到 ' + '…' + ' 时关火', act: true },
      { t: '读出水的末温 t', u: '℃', a: () => st.t1, tol: 0.01, rd: true },
      { t: '读出加热后燃气表的示数 V₂', u: 'm³', a: () => st.V2, tol: 0.0004, rd: true },
      { t: '计算水吸收的热量 Q吸 = cm(t − t₀)', u: 'J', a: () => st.Qw, rel: 0.006 },
      { t: '计算消耗的天然气完全燃烧放出的热量 Q放 = (V₂ − V₁)q', u: 'J', a: () => st.Qg, rel: 0.006 },
      { t: '计算燃气灶烧水的效率 η = Q吸/Q放', u: '%', a: () => st.eta * 100, tol: 0.6 },
    ];
    function setup() {
      const m = PS.pick([1, 1.5, 2, 2.5, 3]), t0 = PS.pick([15, 16, 18, 20, 22, 25]), t1 = PS.pick([60, 65, 70, 75, 80, 85]);
      const Qw = 4200 * m * (t1 - t0), eta0 = PS.rand(0.35, 0.55);
      const V = Math.max(0.006, PS.round(Qw / (eta0 * Q_GAS), 3));
      const V1 = PS.round(PS.randInt(1000, 3999) + PS.randInt(0, 999) / 1000, 3);
      Object.assign(st, { m, t0, t1, Qw, V, V1, V2: PS.round(V1 + V, 3), Qg: V * Q_GAS, eta: Qw / (V * Q_GAS), T: t0, Vnow: V1, on: false, step: 0, tries: 0, done: false });
      STEPS[2].t = '点火加热，水温升高到 ' + t1 + ' ℃ 时关火';
      show();
    }
    function show() {
      list.innerHTML = '';
      STEPS.forEach((s, i) => list.append(h('li', { class: i < st.step ? 'done' : i === st.step ? 'on' : '', html: s.t + (i < st.step && !s.act ? '：<b>' + fmtAns(i) + '</b>' : '') })));
      const s = STEPS[st.step];
      if (st.done) { ask.innerHTML = '🎉 完成！这次燃气灶烧水的效率约为 <b>' + PS.fmt(st.eta * 100, 1) + '%</b>。'; ans.style.display = 'none'; }
      else {
        ans.style.display = '';
        ask.innerHTML = '<b>第 ' + (st.step + 1) + ' 步：</b>' + s.t + (s.rd ? '（看左边的画面）' : '');
        inp.style.display = s.act ? 'none' : ''; okB.style.display = s.act ? 'none' : ''; unit.textContent = s.act ? '' : s.u; actB.style.display = s.act ? '' : 'none'; actB.disabled = st.on;
        inp.value = ''; inp.disabled = false;
      }
      S.render();
    }
    function fmtAns(i) { const s = STEPS[i], v = s.a(); return (s.u === 'J' ? P(v, 3) : s.u === 'm³' ? v.toFixed(3) : PS.fmt(v, s.u === '%' ? 1 : 0)) + ' ' + s.u; }
    function heat() { if (st.on) return; st.on = true; actB.disabled = true; fb.className = 'th-msg info'; fb.innerHTML = '加热中……水温升高到 ' + st.t1 + ' ℃ 时自动关火。'; }
    function check() {
      const s = STEPS[st.step]; if (!s || s.act || inp.disabled) return;
      const v = TH.parse(inp.value); if (isNaN(v)) { inp.focus(); return; }
      const a = s.a(), good = s.rel ? Math.abs(v - a) <= Math.abs(a) * s.rel : Math.abs(v - a) <= s.tol;
      if (good) { PS.sound.good(); fb.className = 'th-msg ok'; fb.innerHTML = '✔ 正确。' + explain(st.step); st.step++; st.tries = 0; if (st.step >= STEPS.length) st.done = true; show(); return; }
      st.tries++; PS.sound.bad(); fb.className = 'th-msg bad';
      fb.innerHTML = '✘ ' + hint(st.step, v, a);
      if (st.tries >= 2) fb.append(h('br'), '正确答案是 ', h('b', { html: fmtAns(st.step) }), '　', PS.ui.button('填入并继续', () => { inp.value = String(PS.round(a, 6)); st.tries = 0; check(); }, 'btn btn-sm'));
    }
    function hint(i, v, a) {
      if (i === 0 || i === 4) return Math.abs(v - a) < 1 ? '整数部分对了，再看看红色的小数部分（读到 0.001 m³）。' : '燃气表的示数：黑色数字是整数部分，红色数字是小数部分。';
      if (i === 1 || i === 3) return '看数字温度计的示数。';
      if (i === 5) return Math.abs(v - a * 1000) < a * 10 ? '质量的单位要用 kg。' : 'Q吸 = cm(t − t₀) = 4.2×10³ J/(kg·℃) × ' + st.m + ' kg × (' + st.t1 + ' ℃ − ' + st.t0 + ' ℃)。';
      if (i === 6) return '消耗的天然气 V = V₂ − V₁ = ' + st.V.toFixed(3) + ' m³，Q放 = Vq。';
      return 'η = Q吸 / Q放 × 100%。';
    }
    function explain(i) {
      if (i === 5) return 'Q吸 = 4.2×10³ J/(kg·℃) × ' + st.m + ' kg × ' + (st.t1 - st.t0) + ' ℃ = ' + P(st.Qw) + ' J。';
      if (i === 6) return 'V = ' + st.V2.toFixed(3) + ' m³ − ' + st.V1.toFixed(3) + ' m³ = ' + st.V.toFixed(3) + ' m³，Q放 = Vq = ' + st.V.toFixed(3) + ' m³ × 8.0×10⁷ J/m³ = ' + P(st.Qg) + ' J。';
      if (i === 7) return 'η = ' + P(st.Qw) + ' J ÷ ' + P(st.Qg) + ' J × 100% ≈ ' + PS.fmt(st.eta * 100, 1) + '%。天然气放出的热量只有一部分被水吸收：一部分被烟气带走、一部分被锅吸收、一部分散失到空气中，还有天然气没有完全燃烧。';
      return '';
    }
    PS.loop((dt) => {
      if (st.on) {
        st.T = Math.min(st.t1, st.T + dt * 9);
        st.Vnow = st.V1 + (st.V * (st.T - st.t0)) / (st.t1 - st.t0);
        if (st.T >= st.t1) { st.on = false; st.Vnow = st.V2; PS.sound.ping(); st.step = 3; fb.className = 'th-msg ok'; fb.innerHTML = '水温达到 ' + st.t1 + ' ℃，已关火。读出末温和燃气表的示数。'; show(); }
      }
      S.render();
    }, el).start();
    function meter(ctx, F, x, y, w, V) {
      ctx.fillStyle = '#dee2e6'; ctx.strokeStyle = '#868e96'; ctx.lineWidth = 3; D.roundRect(ctx, x, y, w, w * 0.62, 14); ctx.fill(); ctx.stroke();
      D.text(ctx, '燃气表', x + w / 2, y + F(13) * 1.3, { size: F(13), weight: 800, align: 'center', color: '#495057' });
      const n = 8, cw = (w - 40) / n, dy = y + w * 0.3, dh = cw * 1.35;
      const iv = Math.floor(V + 1e-9), frac = V - iv, s = String(iv).padStart(5, '0') + String(Math.floor(frac * 1000 + 1e-6)).padStart(3, '0');
      const roll = (frac * 1000) % 1;
      for (let i = 0; i < n; i++) {
        const cx = x + 20 + i * cw;
        ctx.fillStyle = i >= 5 ? '#c92a2a' : '#212529'; ctx.fillRect(cx + 2, dy, cw - 4, dh);
        ctx.save(); ctx.beginPath(); ctx.rect(cx + 2, dy, cw - 4, dh); ctx.clip();
        const d = +s[i], off = i === n - 1 && st.on ? roll : 0;
        [d, (d + 1) % 10].forEach((v, j) => D.text(ctx, String(v), cx + cw / 2, dy + dh / 2 + (j - off) * dh + 2, { size: cw * 0.8, weight: 800, align: 'center', baseline: 'middle', color: '#fff' }));
        ctx.restore();
      }
      ctx.fillStyle = '#212529'; ctx.beginPath(); ctx.arc(x + 20 + 5 * cw, dy + dh - 2, 4, 0, TAU); ctx.fill();
      D.text(ctx, 'm³', x + w - 16, dy + dh + F(13) * 1.2, { size: F(13), weight: 700, align: 'right', color: '#495057' });
    }
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, VW, VH), n = EN.narrow(w), t = performance.now() / 1000;
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      if (!st.m) return;
      const sx = n ? 330 : 280, sy = n ? 720 : 360;
      // 灶台与火焰
      ctx.fillStyle = '#343a40'; D.roundRect(ctx, sx - 170, sy, 340, 50, 8); ctx.fill();
      ctx.fillStyle = '#868e96'; [-1, 1].forEach((k) => ctx.fillRect(sx + k * 112 - 5, sy - 34, 10, 34));
      if (st.on) for (let i = 0; i < 10; i++) { const fx = sx - 90 + i * 20, fh = 24 + 6 * Math.sin(t * 15 + i * 2); ctx.fillStyle = 'rgba(77,121,255,.75)'; ctx.beginPath(); ctx.moveTo(fx - 7, sy - 4); ctx.quadraticCurveTo(fx, sy - 4 - fh * 1.3, fx + 7, sy - 4); ctx.fill(); }
      // 锅
      const pw = 280, ph = 150, py = sy - 36;
      ctx.fillStyle = '#ced4da'; ctx.beginPath(); ctx.moveTo(sx - pw / 2, py - ph); ctx.lineTo(sx - pw / 2 + 10, py); ctx.lineTo(sx + pw / 2 - 10, py); ctx.lineTo(sx + pw / 2, py - ph); ctx.closePath(); ctx.fill();
      ctx.fillStyle = PS.waterColor(st.T); ctx.fillRect(sx - pw / 2 + 8, py - ph * 0.75, pw - 16, ph * 0.75 - 4);
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(sx - pw / 2, py - ph); ctx.lineTo(sx - pw / 2 + 10, py); ctx.lineTo(sx + pw / 2 - 10, py); ctx.lineTo(sx + pw / 2, py - ph); ctx.stroke();
      ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(sx - pw / 2 - 40, py - ph + 10); ctx.lineTo(sx - pw / 2, py - ph + 10); ctx.moveTo(sx + pw / 2, py - ph + 10); ctx.lineTo(sx + pw / 2 + 40, py - ph + 10); ctx.stroke();
      if (st.T > 50) for (let i = 0; i < 5; i++) { const u = (t * 0.5 + i / 5) % 1; ctx.fillStyle = 'rgba(206,212,218,' + 0.5 * (1 - u) * (st.T - 50) / 40 + ')'; ctx.beginPath(); ctx.arc(sx - 80 + i * 40, py - ph - 20 - u * 80, 10 + u * 16, 0, TAU); ctx.fill(); }
      D.text(ctx, '水 ' + st.m + ' kg', sx, py - ph * 0.35, { size: F(15), weight: 800, align: 'center', color: '#1864ab' });
      // 温度计探头
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sx + 70, py - 30); ctx.lineTo(sx + 70, py - ph - 50); ctx.lineTo(sx + 190, py - ph - 50); ctx.stroke();
      TH.dthermo(ctx, sx + (n ? 250 : 240), py - ph - 50, st.T, { F, fs: 20, d: 0, label: '水温' });
      // 燃气表
      meter(ctx, F, n ? 500 : 640, n ? 20 : 40, n ? 460 : 320, st.Vnow);
      D.text(ctx, '燃气管 → 灶', n ? 730 : 800, n ? 335 : 270, { size: F(12), color: '#868e96', align: 'center' });
    }
    el._st = st;
    setup();
  });

  /* ================= 分一分：能否提高热机的效率 ================= */
  PS.register('eff-sort', function (el) {
    PS.sortCards(el, [
      ['使燃料燃烧得更充分', 0, '燃料充分燃烧，放出的能量中被利用的更多。'],
      ['设法利用废气带走的能量', 0, '废气带走的能量最多，利用它是提高燃料利用率的重要措施。'],
      ['保持良好的润滑，减小机械部件间的摩擦', 0, '减少克服摩擦损失的能量。'],
      ['减少热机工作时的散热损失', 0, ''],
      ['换用热值更大的燃料', 1, '热值大只说明相同质量的燃料放出的热量多，被利用的比例不一定提高。'],
      ['增加燃料的质量', 1, '燃料多了，放出的总能量和损失都增加，效率不变。'],
      ['让热机工作更长的时间', 1, '工作时间与效率无关。'],
      ['增大热机的功率', 1, '功率表示做功的快慢，与效率是两回事。'],
      ['采用电子燃油喷射，让燃料和空气混合得更好', 0, '燃料燃烧更充分。'],
      ['让热机做更多的有用功（同时消耗更多燃料）', 1, '效率是有用功与燃料完全燃烧放出能量的比值，比值不一定变大。'],
    ], ['能提高热机效率', '不能提高热机效率']);
  });

  /* ================= 热值和热机效率的计算随机练习 ================= */
  PS.register('eff-quiz', function (el, opts) {
    const box = h('div', { class: 'th-q', style: { marginTop: 0 } });
    const inp = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', autocomplete: 'off', placeholder: '答案' });
    const unit = h('span', null, 'J');
    const fb = h('div', { class: 'th-msg' }), score = h('div', { class: 'small muted', style: { marginTop: '6px' } });
    el.append(box, h('div', { class: 'th-ans' }, inp, unit, PS.ui.button('提交', check, 'btn btn-primary btn-sm'), PS.ui.button('换一题', next, 'btn btn-ghost btn-sm')), h('div', { class: 'small muted' }, '大数可以写成 4.6×10^7 或 46000000；百分数只填数字。'), fb, score);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    let Q = null, n = 0, ok = 0;
    const pick = PS.pick, cw = '4.2×10³ J/(kg·℃)';
    const LIQ = ['alcohol', 'petrol', 'diesel', 'kerosene', 'coke', 'charcoal', 'h2'];
    const qs = (k) => qTxt(k).replace('约', '') + ' J/kg';
    const GEN = {
      mq: () => { const k = pick(LIQ), m = pick([0.2, 0.5, 2, 3, 5, 10]); return { q: '完全燃烧 ' + m + ' kg ' + FU[k].n + '，放出多少热量？（q = ' + qs(k) + '）', a: m * FU[k].q, u: 'J', sol: 'Q放 = mq = ' + m + ' kg × ' + qs(k) + ' = ' + P(m * FU[k].q) + ' J。' }; },
      vq: () => { const V = pick([0.02, 0.05, 0.1, 0.5, 2]), q = pick([7.5e7, 8.0e7]); return { q: '完全燃烧 ' + V + ' m³ 的天然气，放出多少热量？（天然气的热值取 ' + P(q, 2) + ' J/m³）', a: V * q, u: 'J', sol: '气体燃料：Q放 = Vq = ' + V + ' m³ × ' + P(q, 2) + ' J/m³ = ' + P(V * q) + ' J。' }; },
      mneed: () => { const k = pick(['alcohol', 'coke', 'petrol']), m = pick([0.1, 0.2, 0.5, 1.5, 2]), Qv = m * FU[k].q; return { q: '要放出 ' + P(Qv) + ' J 的热量，需要完全燃烧多少千克的' + FU[k].n + '？（q = ' + qs(k) + '）', a: m, u: 'kg', sol: 'm = Q放/q = ' + P(Qv) + ' J ÷ ' + qs(k) + ' = ' + m + ' kg。' }; },
      ideal: () => { const mg = pick([4.2, 8.4, 2.1, 6.3]), M = pick([1, 2, 3]), Qv = mg / 1000 * 3.0e7, dt = Qv / (4200 * M); return { q: '完全燃烧 ' + mg + ' g 酒精（q = 3.0×10⁷ J/kg），若放出的热量全部被 ' + M + ' kg 的水吸收，水的温度升高多少？', a: dt, u: '℃', sol: 'Q放 = mq = ' + mg / 1000 + ' kg × 3.0×10⁷ J/kg = ' + P(Qv) + ' J；Δt = Q吸/(cm) = ' + P(Qv) + ' J ÷ (' + cw + ' × ' + M + ' kg) = ' + P(dt) + ' ℃。' }; },
      stove: () => { const M = pick([2, 3, 5]), t0 = 20, t1 = pick([70, 80, 100]), q = 8.0e7, Qw = 4200 * M * (t1 - t0), V = PS.round(Qw / (pick([0.35, 0.4, 0.42, 0.5, 0.6]) * q), 3), Qg = V * q; return { q: '用天然气灶把 ' + M + ' kg、20 ℃ 的水加热到 ' + t1 + ' ℃，消耗了 ' + V + ' m³ 的天然气（q = 8.0×10⁷ J/m³）。燃气灶烧水的效率是多少（%）？', a: Qw / Qg * 100, u: '%', sol: 'Q吸 = cm(t − t₀) = ' + cw + ' × ' + M + ' kg × ' + (t1 - t0) + ' ℃ = ' + P(Qw) + ' J；Q放 = Vq = ' + V + ' m³ × 8.0×10⁷ J/m³ = ' + P(Qg) + ' J；η = Q吸/Q放 = ' + PS.fmt(Qw / Qg * 100, 1) + '%。' }; },
      engine: () => { const k = pick(['diesel', 'petrol']), m = pick([2, 4, 5, 10, 40]), eta = pick([0.25, 0.3, 0.35, 0.4]), W = m * FU[k].q * eta; return { q: '某' + (k === 'diesel' ? '柴油机' : '汽油机') + '消耗了 ' + m + ' kg ' + FU[k].n + '（q = ' + qs(k) + '），做了 ' + P(W) + ' J 的有用功。它的效率是多少（%）？', a: Math.round(eta * 100), u: '%', sol: 'Q放 = mq = ' + m + ' kg × ' + qs(k) + ' = ' + P(m * FU[k].q) + ' J；η = W有/Q放 = ' + P(W) + ' J ÷ ' + P(m * FU[k].q) + ' J = ' + Math.round(eta * 100) + '%。' }; },
      car: () => { const s = pick([4.6, 9.2, 23]), Fr = pick([1000, 1500, 2000]), eta = pick([0.25, 0.3]), W = Fr * s * 1000, m = W / eta / 4.6e7; return { q: '一辆汽车在平直公路上匀速行驶 ' + s + ' km，受到的阻力是 ' + Fr + ' N，消耗汽油 ' + P(m, 3) + ' kg（q = 4.6×10⁷ J/kg）。汽车发动机的效率是多少（%）？', a: Math.round(eta * 100), u: '%', sol: '匀速行驶，牵引力 F = f = ' + Fr + ' N，W有 = Fs = ' + Fr + ' N × ' + s * 1000 + ' m = ' + P(W) + ' J；Q放 = mq = ' + P(m, 3) + ' kg × 4.6×10⁷ J/kg = ' + P(m * 4.6e7) + ' J；η = W有/Q放 = ' + Math.round(eta * 100) + '%。' }; },
      heater: () => { const M = pick([50, 100]), dt = pick([20, 30, 40]), eta = pick([0.5, 0.6, 0.7, 0.84]), q = pick([4.2e7, 8.4e7]), Qw = 4200 * M * dt, V = Qw / eta / q; return { q: '燃气热水器把 ' + M + ' kg 的水升高 ' + dt + ' ℃，热水器的效率是 ' + Math.round(eta * 100) + '%，需要完全燃烧多少立方米的燃气？（燃气的热值取 ' + P(q, 2) + ' J/m³）', a: V, u: 'm³', sol: 'Q吸 = cmΔt = ' + P(Qw) + ' J；Q放 = Q吸/η = ' + P(Qw / eta) + ' J；V = Q放/q = ' + P(V) + ' m³。' }; },
    };
    const SETS = { q: ['mq', 'vq', 'mneed', 'ideal'] };
    const keys = SETS[opts.set] || Object.keys(GEN);
    function next() {
      Q = GEN[pick(keys)]();
      box.innerHTML = '<b>计算：</b>' + Q.q; unit.textContent = Q.u;
      inp.value = ''; inp.disabled = false;
      fb.className = 'th-msg'; fb.innerHTML = '固体、液体燃料 Q放 = mq，气体燃料 Q放 = Vq；效率 η = W有/Q放 或 Q吸/Q放。';
    }
    function check() {
      if (!Q || inp.disabled) return;
      const v = TH.parse(inp.value);
      if (isNaN(v)) { inp.focus(); return; }
      const good = Math.abs(v - Q.a) <= Math.abs(Q.a) * 0.01 + 1e-9;
      n++; if (good) ok++;
      inp.disabled = true;
      fb.className = 'th-msg ' + (good ? 'ok' : 'bad');
      fb.innerHTML = (good ? '✔ 正确！' : '✘ 答案是 ' + P(Q.a, 3) + ' ' + Q.u + '。') + '<br>' + Q.sol;
      score.innerHTML = '已做 ' + n + ' 题，答对 ' + ok + ' 题。';
      good ? PS.sound.good() : PS.sound.bad();
    }
    next();
  });

  if (!document.getElementById('fu-style')) document.head.append(h('style', { id: 'fu-style' }, `
    .fu-steps{margin:6px 0 0;padding-left:1.4em;font-size:.92rem;line-height:1.75}
    .fu-steps li{color:var(--muted)}
    .fu-steps li.on{color:var(--text);font-weight:700}
    .fu-steps li.done{color:#2b8a3e}
  `));
})();
