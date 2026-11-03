/* 第10章第2节：阿基米德原理——王冠之谜、四次测量与误差分析、V排与 F浮 = ρ液gV排、F–h 图像题、浮力计算随机练习。依赖 force.js、dynamics.js、pressure.js、buoyancy.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, FO = PS.force, FC = PS.FC, FL = PS.fl;
  const TAU = Math.PI * 2;
  const P = (x) => PS.pretty(x);

  /** 一道小选择题（用随堂练习的样式） */
  function miniChoice(q, options, ans, explain, onDone) {
    const box = h('div', { class: 'q-options cols-2' });
    const ex = h('div', { class: 'q-explain', html: '<b>解析：</b>' + explain });
    let done = false;
    options.forEach((o, k) => {
      const b = h('button', { type: 'button', class: 'q-opt', html: '<span class="q-letter">' + 'ABCD'[k] + '</span>' + o });
      b.addEventListener('click', () => {
        if (done) return; done = true;
        box.querySelectorAll('.q-opt').forEach((x, j) => { x.disabled = true; if (j === ans) x.classList.add('right'); });
        if (k !== ans) b.classList.add('wrong');
        ex.classList.add('show');
        k === ans ? PS.sound.good() : PS.sound.bad();
        if (onDone) onDone(k === ans);
      });
      box.append(b);
    });
    return h('div', { class: 'fc-q' }, h('div', { html: q }), box, ex);
  }
  const parse = (s) => parseFloat(String(s).replace(/[，,\s]/g, '').replace(/[×xX*]10\^?([−-]?\d+)/, 'e$1').replace('−', '-'));
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  /* ================= 王冠之谜 ================= */
  function crownShape(ctx, cx, bot, w, alpha) {
    ctx.save();
    if (alpha != null) ctx.globalAlpha = alpha;
    const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
    g.addColorStop(0, '#e8a400'); g.addColorStop(0.45, '#ffe066'); g.addColorStop(1, '#c27c00');
    ctx.fillStyle = g; ctx.strokeStyle = '#a06000'; ctx.lineWidth = 1.6;
    const hh = w * 0.6;
    ctx.beginPath(); ctx.moveTo(cx - w / 2, bot);
    for (let i = 0; i <= 4; i++) { const x = cx - w / 2 + (i * w) / 4; ctx.lineTo(x, bot - hh); if (i < 4) ctx.lineTo(x + w / 8, bot - hh * 0.45); }
    ctx.lineTo(cx + w / 2, bot); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(cx, bot - hh * 0.22, w * 0.06, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1c7ed6'; [-0.28, 0.28].forEach((k) => { ctx.beginPath(); ctx.arc(cx + k * w, bot - hh * 0.22, w * 0.045, 0, TAU); ctx.fill(); });
    ctx.restore();
  }
  function goldBar(ctx, cx, bot, w, alpha) {
    ctx.save();
    if (alpha != null) ctx.globalAlpha = alpha;
    const hh = w * 0.42, g = ctx.createLinearGradient(0, bot - hh, 0, bot);
    g.addColorStop(0, '#fff3bf'); g.addColorStop(0.5, '#fcc419'); g.addColorStop(1, '#c27c00');
    ctx.fillStyle = g; ctx.strokeStyle = '#a06000'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(cx - w / 2, bot); ctx.lineTo(cx - w / 2 + w * 0.15, bot - hh); ctx.lineTo(cx + w / 2 - w * 0.15, bot - hh); ctx.lineTo(cx + w / 2, bot); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#a06000'; ctx.font = PS.font(w * 0.16, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('纯金', cx, bot - hh * 0.5);
    ctx.restore();
  }
  PS.register('crown', function (el) {
    const VW = 1000, VH = 440, M = 1000, RG = 19.3, RS = 10.5;
    const st = { k: 'over', x: 0.2, t: 0, go: false, judged: false, tilt: 0, up: 0 };
    const vol = (x) => (M * (1 - x)) / RG + (M * x) / RS;
    const seg = PS.ui.seg([{ value: 'over', label: '方法一：比较溢出的水' }, { value: 'weigh', label: '方法二：在水中称' }], st.k, (v) => { st.k = v; reset(); });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const goB = PS.ui.button('把它们浸入水中', () => { st.go = true; tell(); }, 'btn btn-primary btn-sm');
    const j1 = PS.ui.button('王冠是纯金的', () => judge(false), 'btn btn-sm');
    const j2 = PS.ui.button('王冠掺了银', () => judge(true), 'btn btn-sm');
    const newB = PS.ui.button('换一顶王冠', () => { st.x = PS.pick([0, 0, 0.1, 0.2, 0.3]); reset(); }, 'btn btn-ghost btn-sm');
    const msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(goB, h('span', { class: 'small muted' }, '你的判断：'), j1, j2, newB), msg);
    function reset() { st.t = 0; st.go = false; st.judged = false; st.tilt = 0; st.up = 0; tell(); }
    function tell() {
      let s;
      if (!st.go) s = st.k === 'over' ? '王冠和金块的质量都是 <b>1000 g</b>。把它们分别放进两个<b>装满水</b>的溢水杯，用量筒接住溢出的水——溢出的水的体积就是物体的体积。' : '用细线把王冠和同样重的金块挂在等臂杠杆（天平）的两端，在空气中<b>平衡</b>。把它们同时浸没在水中，会怎样？';
      else s = st.k === 'over' ? '比较两个量筒中溢出的水：体积大的那个，物体的体积大。质量相同，体积越大，密度越<b>小</b>。王冠是纯金的吗？' : '浸没在水中后，体积大的物体排开的水多，受到的浮力大，那一端会<b>上升</b>。王冠是纯金的吗？';
      if (st.judged) {
        const V = vol(st.x), V0 = vol(0);
        s = (st.x ? '王冠掺了 <b>' + Math.round(st.x * 100) + '%</b> 的银' : '王冠是<b>纯金</b>的') + '。王冠的体积约 ' + PS.fmt(V, 1) + ' cm³，同质量纯金的体积约 ' + PS.fmt(V0, 1) + ' cm³；王冠的密度 ρ = m/V ≈ <b>' + PS.fmt(M / V, 1) + ' g/cm³</b>（金 19.3 g/cm³，银 10.5 g/cm³）。' + (st.x ? '掺了密度较小的银，体积变大，排开的水多，浮力大。' : '');
      }
      msg.className = 'fc-msg ' + (st.judged ? 'ok' : 'info'); msg.innerHTML = s;
      goB.disabled = st.go; j1.disabled = j2.disabled = !st.go || st.judged;
      S.render();
    }
    function judge(mixed) {
      st.judged = true; tell();
      const ok = mixed === st.x > 0;
      msg.className = 'fc-msg ' + (ok ? 'ok' : 'bad'); msg.innerHTML = (ok ? '✔ 判断正确！' : '✘ 判断错了。') + msg.innerHTML;
      ok ? PS.sound.good() : PS.sound.bad();
    }
    const loop = PS.loop((dt) => {
      if (!st.go) return;
      if (st.k === 'over') { if (st.t < 1) { st.t = Math.min(1, st.t + dt * 0.35); S.render(); } }
      else {
        if (st.up < 1) st.up = Math.min(1, st.up + dt * 0.6);
        const tg = st.up >= 1 ? PS.clamp((vol(st.x) - vol(0)) * 0.01, 0, 0.07) : 0;
        st.tilt += (tg - st.tilt) * Math.min(1, dt * 2.5);
        S.render();
      }
    }, el);
    function cylinder(ctx, F, x, top, bot, v) {
      const k = (bot - top) / 100;
      FL.vessel(ctx, x, top, 46, bot - top, { part: 'back' });
      if (v > 0.3) FL.water(ctx, x, top, 46, bot - top, bot - 2 - v * k, 'water');
      FL.vessel(ctx, x, top, 46, bot - top, { part: 'front', width: 2 });
      ctx.save(); ctx.strokeStyle = 'rgba(73,80,87,.7)'; ctx.fillStyle = '#495057'; ctx.font = PS.font(F(10), 600); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (let i = 0; i <= 100; i += 5) { const y = bot - 2 - i * k; ctx.lineWidth = i % 10 ? 0.8 : 1.3; ctx.beginPath(); ctx.moveTo(x + 46, y); ctx.lineTo(x + 46 - (i % 10 ? 7 : 13), y); ctx.stroke(); if (i % 20 === 0) ctx.fillText(String(i), x - 4, y); }
      ctx.restore();
      D.text(ctx, 'mL', x + 23, top - 8, { size: F(11), color: '#495057', align: 'center' });
    }
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#e9d8bd'; ctx.fillRect(30, 410, 940, 14);
      if (st.k === 'over') {
        const t = st.t, V = vol(st.x), V0 = vol(0);
        [[90, '王冠', V, crownShape], [520, '金块', V0, goldBar]].forEach(([x, name, Vx, fn]) => {
          const top = 170, bot = 410, cw = 180, lv = top + 18;
          const y0 = 140, y1 = bot - 4, oy = y0 + (y1 - y0) * Math.min(1, t * 1.15);
          const sub = PS.clamp((oy - lv) / 64, 0, 1);
          FL.vessel(ctx, x, top, cw, bot - top, { part: 'back' });
          fn(ctx, x + cw / 2, oy, 92);
          FL.water(ctx, x, top, cw, bot - top, lv, 'water');
          FL.vessel(ctx, x, top, cw, bot - top, { part: 'front', spout: 14 });
          const flowing = st.go && t < 1 && sub > 0 && sub < 1;
          if (flowing) { ctx.strokeStyle = 'rgba(77,171,247,.8)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + cw + 26, top + 30); ctx.quadraticCurveTo(x + cw + 44, top + 50, x + cw + 50, 300); ctx.stroke(); }
          cylinder(ctx, F, x + cw + 28, 200, 410, Vx * sub);
          D.text(ctx, name + '（1000 g）', x + cw / 2, 50, { size: F(14), weight: 800, align: 'center', color: '#5c3a0e' });
          if (t >= 1) D.text(ctx, '约 ' + Math.round(Vx) + ' mL', x + cw + 51, 190, { size: F(13), weight: 800, color: '#1864ab', align: 'center', bg: 'rgba(255,255,255,.9)' });
        });
      } else {
        const px = 500, py = 64, L = 300, a = st.tilt;
        ctx.fillStyle = '#868e96'; ctx.fillRect(px - 6, py, 12, 340); ctx.fillRect(px - 60, 400, 120, 10);
        const lx = px - L * Math.cos(a), ly = py - L * Math.sin(a), rx = px + L * Math.cos(a), ry = py + L * Math.sin(a);
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(rx, ry); ctx.stroke();
        ctx.fillStyle = '#343a40'; ctx.beginPath(); ctx.arc(px, py, 9, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#e03131'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - Math.sin(a) * 90, py + Math.cos(a) * 90); ctx.stroke();
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(px, py, 96, Math.PI / 2 - 0.25, Math.PI / 2 + 0.25); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px, py + 92); ctx.lineTo(px, py + 102); ctx.stroke();
        const Lt = 150;
        [[lx, ly, crownShape, '王冠'], [rx, ry, goldBar, '金块']].forEach(([x, y, fn, name]) => {
          ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.4; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + Lt); ctx.stroke();
          fn(ctx, x, y + Lt + 60, 90);
          D.text(ctx, name, x + (x < px ? -64 : 64), y + Lt + 40, { size: F(14), weight: 800, align: 'center', color: '#5c3a0e' });
        });
        const bTop = 262 - st.up * 102;
        [lx, rx].forEach((x) => {
          const bx = x - 85;
          ctx.fillStyle = '#adb5bd'; ctx.fillRect(bx + 30, bTop + 148, 110, 410 - bTop - 148);
          FL.vessel(ctx, bx, bTop, 170, 148, { part: 'back' });
          FL.water(ctx, bx, bTop, 170, 148, bTop + 20, 'water');
          FL.vessel(ctx, bx, bTop, 170, 148, { part: 'front' });
        });
        D.text(ctx, st.go ? (Math.abs(a) > 0.01 ? '王冠一侧上升了！' : '仍然平衡') : '在空气中平衡', px, 30, { size: F(16), weight: 800, align: 'center', color: st.go && Math.abs(a) > 0.01 ? '#e8590c' : '#2b8a3e' });
      }
    }
    reset(); loop.start();
  });

  /* ================= 四次测量与误差分析 ================= */
  const STEPS = [
    { id: 'bucket', name: '测空小桶的重力', short: 'G桶' },
    { id: 'obj', name: '测物体的重力', short: 'G物' },
    { id: 'in', name: '物体浸没在装满水的溢水杯中', short: 'F示' },
    { id: 'total', name: '测小桶和溢出的水的总重', short: 'G总' },
  ];
  const ERRS = {
    ok: { name: '规范操作' },
    notfull: { name: '溢水杯中的水没装满' },
    order: { name: '先测桶和水的总重，倒掉水再测空桶' },
    touch: { name: '物体碰到了溢水杯底' },
    half: { name: '物体只浸入一半' },
  };
  PS.register('archi-steps', function (el) {
    const VW = 1000, VH = 480, SUB = '₁₂₃₄', NAMES = '甲乙丙丁', DK = 460;
    const st = { err: 'ok' };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const eSeg = PS.ui.seg(Object.keys(ERRS).map((k) => ({ value: k, label: ERRS[k].name })), st.err, (v) => { st.err = v; tell(); });
    eSeg.el.style.flexWrap = 'wrap';
    const msg = h('div', { class: 'fc-msg' });
    const qbox = h('div');
    el.append(qbox, h('div', { class: 'small muted', style: { margin: '10px 0 4px' } }, '如果操作不当，会怎样？'), eSeg.el, msg, PS.ui.row(PS.ui.button('换一组数据', gen, 'btn btn-ghost btn-sm')));
    let V; // 当前数据
    function gen() {
      const Gb = PS.randInt(3, 6) / 10, Fb = PS.randInt(3, 6) * 2 / 10, Go = PS.randInt(Math.ceil(Fb * 10) + 10, 32) / 10;
      const order = shuffle([0, 1, 2, 3]); // order[i] = 第 i 个图（甲乙丙丁）是哪一步
      V = { Gb, Fb, Go, order };
      st.err = 'ok'; eSeg.set('ok', true);
      buildQ(); tell();
    }
    function vals(err) {
      const { Gb, Fb, Go } = V;
      let b = Gb, o = Go, f = Go - Fb, t = Gb + Fb;
      if (err === 'notfull') t = Gb + Fb - 0.2;
      if (err === 'order') b = Gb + 0.1;
      if (err === 'touch') f = Go - Fb - 0.4;
      if (err === 'half') { f = Go - Fb / 2; t = Gb + Fb / 2; }
      return [b, o, f, t].map((x) => PS.round(x, 2));
    }
    const lab = (step) => 'F' + SUB[V.order.indexOf(step)]; // 第 step 步用的是哪个 F
    const fig = (step) => NAMES[V.order.indexOf(step)];
    function buildQ() {
      qbox.innerHTML = '';
      const e = (a, b) => lab(a) + ' − ' + lab(b);
      const opts1 = shuffle([e(1, 2), e(3, 0), e(1, 0), e(3, 2)]);
      qbox.append(miniChoice('<b>1.</b> 物体受到的浮力 F浮 = ？', opts1, opts1.indexOf(e(1, 2)), '称重法：F浮 = G物 − F示，G物 是' + fig(1) + '图的示数 ' + lab(1) + '，F示 是' + fig(2) + '图的示数 ' + lab(2) + '。'));
      const opts2 = shuffle([e(3, 0), e(1, 2), e(3, 1), e(2, 0)]);
      qbox.append(miniChoice('<b>2.</b> 物体排开的水所受的重力 G排 = ？', opts2, opts2.indexOf(e(3, 0)), 'G排 = G总 − G桶，G总 是' + fig(3) + '图的示数 ' + lab(3) + '，G桶 是' + fig(0) + '图的示数 ' + lab(0) + '。'));
      const seq = (arr) => arr.map((s) => fig(s)).join('');
      const good = seq([0, 1, 2, 3]);
      const opts3 = shuffle([good, seq([1, 2, 3, 0]), seq([2, 1, 0, 3]), seq([3, 0, 1, 2])]);
      qbox.append(miniChoice('<b>3.</b> 为了减小误差，最合理的实验顺序是（　）', opts3, opts3.indexOf(good), '先测<b>空小桶</b>（桶是干的），再测<b>物体</b>的重力（物体是干的），然后把物体浸没在溢水杯中，最后测桶和水的总重：' + good + '。若最后才测空桶，桶内沾有水，G桶 偏大，G排 偏小。'));
      const iF = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', placeholder: 'F浮' }), iG = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', placeholder: 'G排' }), fb = h('span', { class: 'q-fb' });
      const chk = () => {
        const [b, o, f, t] = vals('ok'), a = parse(iF.value), c = parse(iG.value);
        const ok = Math.abs(a - (o - f)) < 0.01 && Math.abs(c - (t - b)) < 0.01;
        fb.className = 'q-fb ' + (ok ? 'ok' : 'bad'); fb.innerHTML = ok ? '✔ 正确！F浮 = G排，浮力的大小等于物体排开的水所受的重力。' : '✘ F浮 = ' + PS.fmt(o, 1) + ' N − ' + PS.fmt(f, 1) + ' N = ' + PS.fmt(o - f, 1) + ' N，G排 = ' + PS.fmt(t, 1) + ' N − ' + PS.fmt(b, 1) + ' N = ' + PS.fmt(t - b, 1) + ' N。';
        ok ? PS.sound.good() : PS.sound.bad();
      };
      qbox.append(h('div', { class: 'fc-q' }, h('div', { html: '<b>4.</b> 根据图中的数据（规范操作），F浮 和 G排 各是多少？' }), h('div', { class: 'fc-ans' }, 'F浮 =', iF, 'N　G排 =', iG, 'N', PS.ui.button('核对', chk, 'btn btn-primary btn-sm'), fb)));
    }
    function tell() {
      const [b, o, f, t] = vals(st.err), Fm = o - f, Gm = t - b;
      const T = {
        ok: ['ok', '测得 F浮 = ' + PS.fmt(Fm, 1) + ' N，G排 = ' + PS.fmt(Gm, 1) + ' N，二者<b>相等</b>。浸在液体中的物体所受的浮力，大小等于它排开的液体所受的重力（阿基米德原理）。'],
        notfull: ['bad', '溢水杯没装满，物体浸入后水面要先升到溢水口才开始溢出，流进小桶的水<b>偏少</b>：G排 = ' + PS.fmt(Gm, 1) + ' N < F浮 = ' + PS.fmt(Fm, 1) + ' N，会得出“浮力大于排开的水重”的错误结论。'],
        order: ['bad', '倒掉水后，小桶内壁还<b>沾有水</b>，测得的 G桶 偏大，G排 = G总 − G桶 = ' + PS.fmt(Gm, 1) + ' N <b>偏小</b>（F浮 = ' + PS.fmt(Fm, 1) + ' N）。'],
        touch: ['bad', '物体碰到杯底，杯底对物体有支持力，测力计的示数 F示 <b>偏小</b>，算出的 F浮 = ' + PS.fmt(Fm, 1) + ' N <b>偏大</b>（G排 = ' + PS.fmt(Gm, 1) + ' N）。'],
        half: ['ok', '物体只浸入一半：F浮 = ' + PS.fmt(Fm, 1) + ' N，G排 = ' + PS.fmt(Gm, 1) + ' N，二者仍然<b>相等</b>——阿基米德原理对“部分浸入”同样成立，只是 V排 变小了。'],
      }[st.err];
      msg.className = 'fc-msg ' + T[0]; msg.innerHTML = '<b>' + ERRS[st.err].name + '：</b>' + T[1];
      S.render();
    }
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      if (!V) return;
      const vv = vals(st.err), L = 100, MAX = 5;
      ctx.fillStyle = '#e9d8bd'; ctx.fillRect(0, DK, VW, 20);
      const t1 = 8 + F(15), t2 = t1 + F(14) * 1.3, ry = t2 + 26;
      for (let i = 0; i < 4; i++) {
        const step = V.order[i], x0 = i * 250, sx = x0 + 96, Fv = vv[step];
        if (i) { ctx.strokeStyle = '#dee2e6'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, 10); ctx.lineTo(x0, DK - 2); ctx.stroke(); }
        D.text(ctx, NAMES[i], x0 + 125, t1, { size: F(15), weight: 800, align: 'center', color: '#1b2333' });
        D.text(ctx, 'F' + SUB[i] + ' = ' + PS.fmt(Fv, 1) + ' N', x0 + 125, t2, { size: F(14), weight: 800, align: 'center', color: '#1c7ed6' });
        const hk = FO.scale(ctx, { x: sx, y: ry, max: MAX, div: 0.2, L, F: Fv, w: 54, F2: F, fs: Math.min(F(11), 18) });
        const hx = hk.hook.x, hy = hk.hook.y;
        const wet = st.err === 'order' && step === 0;
        if (step === 0 || step === 3) {
          const fill = step === 3 ? Math.min(0.9, ((vv[3] - vv[0]) / 1.2) * 0.9 + 0.08) : wet ? 0.06 : 0;
          FL.bucket(ctx, hx, hy + 54, 46, 40, fill);
          ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(hx, hy - 2); ctx.lineTo(hx, hy + 54 - 40 - 15); ctx.stroke();
        } else {
          const top = hy + 22, bh = 46;
          if (step === 2) {
            const touch = st.err === 'touch', half = st.err === 'half';
            const btop = touch ? DK - 2 - bh : top, level = half ? btop + bh / 2 : Math.min(DK - 120, btop - 10), ctop = level - 12, cx0 = hx - 52;
            FL.vessel(ctx, cx0, ctop, 104, DK - ctop, { part: 'back' });
            ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(hx, hy - 2); ctx.lineTo(hx, btop - 13); ctx.stroke();
            FL.metal(ctx, hx, btop, 38, bh, 'stone');
            FL.water(ctx, cx0, ctop, 104, DK - ctop, level, 'water');
            FL.vessel(ctx, cx0, ctop, 104, DK - ctop, { part: 'front', spout: 10 });
            FL.bucket(ctx, cx0 + 104 + 52, DK, 40, 36, st.err === 'notfull' || half ? 0.3 : 0.55);
          } else {
            ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(hx, hy - 2); ctx.lineTo(hx, top - 13); ctx.stroke();
            FL.metal(ctx, hx, top, 38, bh, 'stone');
          }
        }
      }
    }
    gen();
  });

  /* ================= V排 与 F浮 = ρ液gV排 ================= */
  PS.register('vpai', function (el) {
    const VW = 1000, VH = 430, BX = 150, BW = 240, BTOP = 170, BBOT = 412, LV0 = 236, BWID = 80, BHT = 100, VB = 200, AB = 150; // 物体 200 cm³（底面积 20 cm²，高 10 cm）；烧杯底面积 150 cm²
    const MATS = { fe: '铁块', al: '铝块', stone: '石块' };
    const st = { d: 4, liq: 'water', mat: 'fe' };
    const lSeg = PS.ui.seg(['water', 'alcohol', 'salt'].map((k) => ({ value: k, label: PS.LIQ[k].name })), st.liq, (v) => { st.liq = v; upd(); });
    const mSeg = PS.ui.seg(Object.keys(MATS).map((k) => ({ value: k, label: MATS[k] })), st.mat, (v) => { st.mat = v; upd(); });
    el.append(PS.ui.row(mSeg.el, lSeg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const sD = PS.ui.slider({ label: '物体浸入液体的深度', min: 0, max: 14, step: 1, value: st.d, unit: 'cm', onInput: (v) => { st.d = v; upd(); } });
    sD.el.classList.add('wide');
    const eq = h('div', { class: 'fl-eq' }), msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(sD.el), eq, msg);
    const Vp = () => 20 * PS.clamp(st.d, 0, 10);
    const rho = () => PS.LIQ[st.liq].rho;
    function upd() {
      const V = Vp(), r = rho(), Fb = (r * 10 * V) / 1e6, G = (PS.MATL[st.mat].rho * VB * 10) / 1000;
      eq.innerHTML = 'F浮 = G排 = m排g = ρ液gV排 = ' + P(r) + ' kg/m³ × 10 N/kg × ' + (V ? P(V * 1e-6) : '0') + ' m³ = <b>' + PS.fmt(Fb, 2) + ' N</b>';
      let s;
      if (V === 0) s = '物体还没有浸入液体，V排 = 0，不受浮力。';
      else if (st.d < 10) s = '物体<b>部分浸入</b>：V排 = V浸 = ' + V + ' cm³ <b>&lt;</b> V物 = 200 cm³。浸入得越多，排开的液体越多，浮力越大。';
      else s = '物体<b>浸没</b>：V排 = V物 = 200 cm³。再往深处放，V排 不变，浮力也<b>不变</b>。';
      s += '<br>' + MATS[st.mat] + '重 ' + PS.fmt(G, 1) + ' N——换成别的材料，重力变了，但 V排 相同时浮力<b>不变</b>：浮力只跟 <b>ρ液</b> 和 <b>V排</b> 有关，跟物体的密度、形状、浸没的深度无关。';
      msg.className = 'fc-msg ' + (st.d >= 10 ? 'ok' : 'info'); msg.innerHTML = s;
      S.render();
    }
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const V = Vp(), lv = LV0 - (V / AB) * 10, bot = lv + st.d * 10, top = bot - BHT, cx = BX + BW / 2, M = PS.MATL[st.mat];
      ctx.fillStyle = '#e9d8bd'; ctx.fillRect(30, BBOT, 940, 14);
      ctx.fillStyle = '#495057'; ctx.fillRect(BX - 30, 22, BW + 60, 8);
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(cx, 30); ctx.lineTo(cx, top); ctx.stroke();
      FL.vessel(ctx, BX, BTOP, BW, BBOT - BTOP, { part: 'back' });
      const g = ctx.createLinearGradient(cx - BWID / 2, 0, cx + BWID / 2, 0); g.addColorStop(0, M.c2); g.addColorStop(0.45, M.c1); g.addColorStop(1, M.c2);
      ctx.fillStyle = g; ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1.4; ctx.fillRect(cx - BWID / 2, top, BWID, BHT); ctx.strokeRect(cx - BWID / 2, top, BWID, BHT);
      if (V > 0) { ctx.fillStyle = 'rgba(47,158,68,.3)'; ctx.fillRect(cx - BWID / 2, Math.max(top, lv), BWID, bot - Math.max(top, lv)); }
      FL.water(ctx, BX, BTOP, BW, BBOT - BTOP, lv, st.liq);
      FL.vessel(ctx, BX, BTOP, BW, BBOT - BTOP, { part: 'front' });
      ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#1864ab'; ctx.beginPath(); ctx.moveTo(BX - 14, LV0); ctx.lineTo(BX + 6, LV0); ctx.stroke(); ctx.restore();
      D.text(ctx, MATS[st.mat], cx, top + 18, { size: F(13), weight: 800, align: 'center', color: '#1b2333' });
      if (V > 0) { D.text(ctx, 'V排 = ' + V + ' cm³', cx + BWID / 2 + 10, (Math.max(top, lv) + bot) / 2 + 4, { size: F(13), weight: 800, color: FC.B, bg: 'rgba(255,255,255,.85)' }); }
      D.text(ctx, 'V物 = 200 cm³', cx + 8, top - 8, { size: F(12), weight: 700, color: '#495057', bg: 'rgba(255,255,255,.85)' });
      const Fb = (rho() * 10 * V) / 1e6;
      if (Fb > 0) FO.arrow(ctx, cx - 18, bot - 8, -Math.PI / 2, 14 + Fb * 22, { color: FC.B, label: 'F浮', F, labelSide: 1 });
      // 被排开的液体放在电子秤上
      const ex = 560, ew = BWID, eb = 350, eh = (V / 20) * 10;
      D.text(ctx, '被排开的' + PS.LIQ[st.liq].name, ex + ew / 2, 70, { size: F(15), weight: 800, align: 'center', color: '#1864ab' });
      if (eh > 0) { const Lq = PS.LIQ[st.liq]; ctx.fillStyle = Lq.c; ctx.strokeStyle = Lq.c2; ctx.lineWidth = 1.5; ctx.fillRect(ex, eb - eh, ew, eh); ctx.strokeRect(ex, eb - eh, ew, eh); D.text(ctx, V + ' cm³', ex + ew / 2, eb - eh / 2 + 5, { size: F(12), weight: 700, align: 'center', color: '#1864ab' }); }
      ctx.fillStyle = '#495057'; D.roundRect(ctx, ex - 30, eb, ew + 60, 40, 6); ctx.fill();
      ctx.fillStyle = '#d3f9d8'; ctx.fillRect(ex - 14, eb + 9, ew + 28, 22);
      ctx.fillStyle = '#1b2333'; ctx.font = PS.font(F(14), 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('G排 = ' + PS.fmt(Fb, 2) + ' N', ex + ew / 2, eb + 20);
      // 等号
      D.text(ctx, 'F浮 = G排', 840, 210, { size: F(22), weight: 800, align: 'center', color: FC.B });
      D.text(ctx, '= ' + PS.fmt(Fb, 2) + ' N', 840, 210 + F(22) * 1.4, { size: F(20), weight: 800, align: 'center', color: '#1b2333' });
    }
    upd();
  });

  /* ================= F–h 图像题 ================= */
  const GF = [[6, 2], [8, 2], [8, 4], [9, 3], [10, 4], [12, 4], [12, 5], [6, 4], [10, 2], [9, 2], [8, 5], [12, 3], [6, 3], [10, 5]];
  PS.register('buoy-graph', function (el) {
    const VW = 1000, VH = 460, PXC = 12, LV = 280, BX = 80, BW = 300, BBOT = 452, CX = 230, CW = 64;
    const st = { t: 0, play: false, pts: [] };
    let Q;
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const playB = PS.ui.button('▶ 开始下降', () => { if (st.t >= Q.hmax) { st.t = 0; st.pts = []; } st.play = true; }, 'btn btn-primary btn-sm');
    const newB = PS.ui.button('换一题', gen, 'btn btn-ghost btn-sm');
    const qbox = h('div', { class: 'fc-q' });
    el.append(PS.ui.row(playB, newB, h('span', { class: 'small muted' }, '圆柱体从水面上方匀速下降，不计液面的变化；g 取 10 N/kg。')), qbox);
    function gen() {
      const [G, Fb] = PS.pick(GF), Hc = PS.pick([4, 5, 6, 8]), g0 = PS.pick([2, 3, 4]);
      Q = { G, Fb, Hc, g0, hmax: g0 + Hc + PS.pick([3, 4]) };
      st.t = 0; st.pts = []; st.play = false;
      buildQ(); S.render();
    }
    const Fat = (x) => Q.G - Q.Fb * PS.clamp((x - Q.g0) / Q.Hc, 0, 1);
    function buildQ() {
      const V = Q.Fb / 1e4, rho = Q.G / 10 / V;
      const items = [
        ['圆柱体的重力 G', Q.G, 'N', 'h < ' + Q.g0 + ' cm 时圆柱体在空气中，示数等于重力：G = ' + Q.G + ' N。'],
        ['浸没时受到的浮力 F浮', Q.Fb, 'N', '浸没后示数不变，为 ' + (Q.G - Q.Fb) + ' N：F浮 = G − F示 = ' + Q.G + ' N − ' + (Q.G - Q.Fb) + ' N = ' + Q.Fb + ' N。'],
        ['圆柱体的高度', Q.Hc, 'cm', '从 h = ' + Q.g0 + ' cm 开始浸入，到 h = ' + (Q.g0 + Q.Hc) + ' cm 刚好浸没，高度为 ' + Q.Hc + ' cm（不计液面变化）。'],
        ['圆柱体的体积 V', Q.Fb * 100, 'cm³', '浸没时 V = V排 = F浮/(ρ水g) = ' + Q.Fb + ' N ÷ (1.0×10³ kg/m³ × 10 N/kg) = ' + P(V) + ' m³ = ' + Q.Fb * 100 + ' cm³。'],
        ['圆柱体的密度 ρ', rho, 'kg/m³', 'm = G/g = ' + PS.fmt(Q.G / 10, 1) + ' kg，ρ = m/V = ' + PS.fmt(Q.G / 10, 1) + ' kg ÷ ' + P(V) + ' m³ = ' + P(rho) + ' kg/m³（也可以用 ρ = G/F浮 × ρ水）。'],
        ['刚浸没时下表面受到水的压强 p', 1e4 * Q.Hc / 100, 'Pa', 'p = ρ水gh = 1.0×10³ kg/m³ × 10 N/kg × ' + PS.fmt(Q.Hc / 100, 2) + ' m = ' + PS.fmt(1e4 * Q.Hc / 100, 0) + ' Pa。'],
      ];
      qbox.innerHTML = '<b>看图像回答：</b>（先点“开始下降”画出图像）';
      const rows = items.map(([t, a, u, sol]) => {
        const inp = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal' }), fb = h('div', { class: 'small', style: { flexBasis: '100%' } });
        const row = h('div', { class: 'fc-ans' }, h('span', { style: { minWidth: '13em' } }, t + ' ='), inp, u, fb);
        row._chk = () => { const v = parse(inp.value); const ok = !isNaN(v) && Math.abs(v - a) <= Math.abs(a) * 0.01 + 1e-9; fb.innerHTML = (ok ? '<span style="color:var(--green)">✔ </span>' : '<span style="color:var(--red)">✘ 答案 ' + P(a) + ' ' + u + '。</span>') + sol; return ok; };
        qbox.append(row); return row;
      });
      qbox.append(h('div', { class: 'fc-ans' }, PS.ui.button('核对', () => { const n = rows.filter((r) => r._chk()).length; n === rows.length ? PS.sound.good() : PS.sound.bad(); }, 'btn btn-primary btn-sm'), h('span', { class: 'small muted' }, '可以写成 2.5×10^3 这样的形式')));
    }
    const loop = PS.loop((dt) => {
      if (!st.play) return;
      st.t = Math.min(Q.hmax, st.t + dt * 2.2);
      st.pts.push([st.t, Fat(st.t)]);
      if (st.t >= Q.hmax) st.play = false;
      S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      if (!Q) return;
      const Hp = Q.Hc * PXC, bot = LV - Q.g0 * PXC + st.t * PXC, top = bot - Hp, Fv = Fat(st.t);
      FL.vessel(ctx, BX, 250, BW, BBOT - 250, { part: 'back' });
      // 拉力传感器（数显测力计）：细线足够长，传感器始终在水面以上
      const sy = 10 + st.t * PXC;
      ctx.fillStyle = '#868e96'; ctx.fillRect(CX - 3, 0, 6, sy);
      ctx.fillStyle = '#343a40'; D.roundRect(ctx, CX - 46, sy, 92, 44, 8); ctx.fill();
      ctx.fillStyle = '#d3f9d8'; ctx.fillRect(CX - 36, sy + 8, 72, 28);
      ctx.fillStyle = '#1b2333'; ctx.font = PS.font(F(15), 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(PS.fmt(Fv, 1) + ' N', CX, sy + 22);
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(CX, sy + 44); ctx.lineTo(CX, top - 13); ctx.stroke();
      FL.metal(ctx, CX, top, CW, Hp, 'al', { label: '圆柱体', fs: F(12) });
      FL.water(ctx, BX, 250, BW, BBOT - 250, LV, 'water');
      FL.vessel(ctx, BX, 250, BW, BBOT - 250, { part: 'front' });
      D.text(ctx, '下降高度 h = ' + PS.fmt(st.t, 1) + ' cm', 940, 4 + F(14), { size: F(14), weight: 700, color: '#1864ab', align: 'right' });
      const ch = PS.dyn.chart(ctx, { x: 520, y: 60, w: 420, h: 300, xmax: Q.hmax, ymax: Math.ceil((Q.G + 1) / 2) * 2, xstep: 1, ystep: 1, xlab: Q.hmax > 12 || F(11) > 16 ? 2 : 1, ylab: 2, xl: 'h/cm', yl: 'F/N', F, series: [{ pts: st.pts, color: '#1c7ed6', width: 3 }] });
      if (st.pts.length) { ctx.fillStyle = '#1c7ed6'; ctx.beginPath(); ctx.arc(ch.X(st.t), ch.Y(Fv), 6, 0, TAU); ctx.fill(); }
    }
    gen(); loop.start();
  });

  /* ================= 浮力计算随机练习 ================= */
  PS.register('buoy-quiz', function (el, opts) {
    const box = h('div', { class: 'fc-q', style: { marginTop: 0 } });
    const inp = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', autocomplete: 'off', placeholder: '答案' });
    const unit = h('span', null, 'N');
    const fb = h('div', { class: 'fc-msg' });
    const score = h('div', { class: 'small muted', style: { marginTop: '6px' } });
    el.append(box, h('div', { class: 'fc-ans' }, inp, unit, PS.ui.button('提交', check, 'btn btn-primary btn-sm'), PS.ui.button('换一题', next, 'btn btn-ghost btn-sm')), h('div', { class: 'small muted' }, 'g 取 10 N/kg，ρ水 = 1.0×10³ kg/m³；可以写成 1.2×10^3 或 1200。'), fb, score);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    let Q = null, n = 0, ok = 0;
    const pick = PS.pick, LQ = [['水', 1e3], ['酒精', 0.8e3], ['煤油', 0.8e3], ['盐水', 1.2e3]];
    const GEN = {
      weigh: () => { const G = pick([5, 6, 8, 10, 12]), F = G - pick([1, 2, 3, 4]); return { q: '用弹簧测力计在空气中称得一物体重 ' + G + ' N，把它浸没在水中时，测力计的示数为 ' + F + ' N。物体受到的浮力是多少？', a: G - F, u: 'N', sol: '称重法：F浮 = G − F示 = ' + G + ' N − ' + F + ' N = ' + (G - F) + ' N。' }; },
      arch: () => { const V = pick([50, 100, 200, 300, 500]), L = pick(LQ); return { q: '体积为 ' + V + ' cm³ 的铁块浸没在' + L[0] + '（ρ = ' + P(L[1]) + ' kg/m³）中，受到的浮力是多少？', a: (L[1] * 10 * V) / 1e6, u: 'N', sol: '浸没时 V排 = V = ' + V + ' cm³ = ' + P(V * 1e-6) + ' m³，F浮 = ρ液gV排 = ' + P(L[1]) + ' kg/m³ × 10 N/kg × ' + P(V * 1e-6) + ' m³ = ' + PS.round((L[1] * 10 * V) / 1e6, 3) + ' N。' }; },
      part: () => { const V = pick([200, 400, 600, 1000]), k = pick([[1, 4], [1, 5], [2, 5], [1, 2]]), Vp = (V * (k[1] - k[0])) / k[1]; return { q: '体积为 ' + V + ' cm³ 的木块漂浮在水面上，有 ' + k[0] + '/' + k[1] + ' 的体积露出水面。木块受到的浮力是多少？', a: Vp * 1e-2, u: 'N', sol: 'V排 = (1 − ' + k[0] + '/' + k[1] + ') × ' + V + ' cm³ = ' + Vp + ' cm³ = ' + P(Vp * 1e-6) + ' m³，F浮 = ρ水gV排 = ' + PS.round(Vp * 1e-2, 2) + ' N。' }; },
      vol: () => { const Fb = pick([0.5, 1, 2, 3, 5]); return { q: '一个石块浸没在水中时受到的浮力为 ' + Fb + ' N，它的体积是多少？（单位：cm³）', a: Fb * 100, u: 'cm³', sol: 'V = V排 = F浮/(ρ水g) = ' + Fb + ' N ÷ (1.0×10³ kg/m³ × 10 N/kg) = ' + P(Fb * 1e-4) + ' m³ = ' + Fb * 100 + ' cm³。' }; },
      rho: () => { const [G, Fb] = pick(GF); const F = G - Fb, r = (G / Fb) * 1e3; return { q: '在空气中用弹簧测力计称得某金属块重 ' + G + ' N，浸没在水中称时示数为 ' + F + ' N。这种金属的密度是多少？（单位：kg/m³）', a: r, u: 'kg/m³', sol: 'F浮 = G − F示 = ' + Fb + ' N；V = V排 = F浮/(ρ水g) = ' + P(Fb * 1e-4) + ' m³；ρ = m/V = G/(gV) = ' + P(r) + ' kg/m³（ρ = G/F浮 × ρ水）。' }; },
      liq: () => { const G = pick([4, 5, 6]), Fw = pick([1, 2]), L = pick([['酒精', 0.8], ['盐水', 1.2], ['某液体', 1.1], ['某液体', 0.9]]); const Fl = PS.round(Fw * L[1], 2); return { q: '一个石块在空气中重 ' + G + ' N，浸没在水中时测力计示数为 ' + (G - Fw) + ' N，浸没在' + L[0] + '中时示数为 ' + PS.round(G - Fl, 2) + ' N。' + L[0] + '的密度是多少？（单位：kg/m³）', a: L[1] * 1e3, u: 'kg/m³', sol: '在水中 F浮 = ' + Fw + ' N，在' + L[0] + '中 F浮′ = ' + Fl + ' N。V排 相同，浮力与液体密度成正比：ρ液 = F浮′/F浮 × ρ水 = ' + P(L[1] * 1e3) + ' kg/m³。' }; },
      diff: () => { const F1 = pick([2, 3, 5, 8]), dF = pick([4, 5, 6, 10]); return { q: '一个正方体浸没在水中，上表面受到水的压力为 ' + F1 + ' N，下表面受到水的压力为 ' + (F1 + dF) + ' N。正方体受到的浮力是多少？', a: dF, u: 'N', sol: '压力差法：F浮 = F向上 − F向下 = ' + (F1 + dF) + ' N − ' + F1 + ' N = ' + dF + ' N。' }; },
      float: () => { const m = pick([0.2, 0.5, 0.6, 1.5, 2]); return { q: '质量为 ' + m + ' kg 的木块漂浮在水面上，它受到的浮力是多少？', a: m * 10, u: 'N', sol: '漂浮：F浮 = G = mg = ' + m + ' kg × 10 N/kg = ' + PS.round(m * 10, 2) + ' N。' }; },
      fs: () => { const m = pick([60, 80, 120, 150, 270]), V = pick([100, 200]); const sink = m > V; const Fb = sink ? V / 100 : m / 100; return { q: '把一个质量为 ' + m + ' g、体积为 ' + V + ' cm³ 的实心物体轻轻放入足够深的水中，静止时它受到的浮力是多少？', a: Fb, u: 'N', sol: 'ρ物 = m/V = ' + PS.round(m / V, 2) + ' g/cm³ ' + (sink ? '> ρ水，物体下沉到水底，F浮 = ρ水gV = ' + Fb + ' N。' : '< ρ水，物体漂浮，F浮 = G = mg = ' + Fb + ' N。') }; },
      ship: () => { const t = pick([1000, 5000, 1e4, 2e4]); return { q: '一艘轮船的排水量是 ' + P(t) + ' t，它满载时受到的浮力是多少？', a: t * 1e4, u: 'N', sol: '排水量是满载时排开水的质量：F浮 = G排 = m排g = ' + P(t * 1e3) + ' kg × 10 N/kg = ' + P(t * 1e4) + ' N。' }; },
    };
    const keys = opts.set === 's2' ? ['weigh', 'arch', 'part', 'vol', 'rho', 'liq', 'diff'] : Object.keys(GEN);
    function next() {
      Q = GEN[pick(keys)]();
      box.innerHTML = '<b>计算：</b>' + Q.q; unit.textContent = Q.u;
      inp.value = ''; inp.disabled = false;
      fb.className = 'fc-msg'; fb.innerHTML = '想一想用哪种方法：称重法 F浮 = G − F示；压力差法 F浮 = F向上 − F向下；阿基米德原理 F浮 = ρ液gV排；漂浮、悬浮 F浮 = G。';
    }
    function check() {
      if (!Q || inp.disabled) return;
      const v = parse(inp.value);
      if (isNaN(v)) { inp.focus(); return; }
      const good = Math.abs(v - Q.a) <= Math.abs(Q.a) * 0.006 + 1e-9;
      n++; if (good) ok++;
      inp.disabled = true;
      fb.className = 'fc-msg ' + (good ? 'ok' : 'bad');
      fb.innerHTML = (good ? '✔ 正确！' : '✘ 答案是 ' + P(Q.a) + ' ' + Q.u + '。') + '<br>' + Q.sol;
      score.innerHTML = '已做 ' + n + ' 题，答对 ' + ok + ' 题。';
      good ? PS.sound.good() : PS.sound.bad();
    }
    next();
  });
})();
