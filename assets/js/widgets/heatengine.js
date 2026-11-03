/* 第14章第1节：热机——水蒸气冲开软木塞、热机家族、认识四个冲程（认一认 / 排一排）、汽油机和柴油机、转速与做功次数、汽油机还是柴油机。
 * 提供 PS.STROKES（四个冲程）、PS.th.engine(ctx, o)（四冲程内燃机的剖面图）。依赖 heat.js、energy.js、thermal.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, TH = PS.th, EN = PS.en;
  const TAU = Math.PI * 2;

  /* 四个冲程：iv / ev 进气门、排气门是否打开，up 活塞是否向上运动 */
  const STROKES = PS.STROKES = [
    { n: '吸气冲程', s: '吸气', iv: 1, ev: 0, up: 0, E: '无', c: '#1c7ed6' },
    { n: '压缩冲程', s: '压缩', iv: 0, ev: 0, up: 1, E: '机械能转化为内能', c: '#7048e8' },
    { n: '做功冲程', s: '做功', iv: 0, ev: 0, up: 0, E: '内能转化为机械能', c: '#e03131' },
    { n: '排气冲程', s: '排气', iv: 0, ev: 1, up: 1, E: '无', c: '#868e96' },
  ];

  /**
   * 四冲程内燃机的剖面图：o.x 汽缸中心 x，o.y 火花塞顶部附近的 y（图高约 455·s），o.s 缩放，
   * o.phi 曲轴转角（度，0~720；0 为吸气冲程开始、活塞在最高处），o.type 'petrol' | 'diesel'，o.mirror 进气门画在右边，
   * o.F 字号函数，o.labels 部件名称，o.arrow 活塞运动方向的箭头，o.fly 飞轮，o.clr 余隙（越小压缩程度越大），
   * o.spark 做功冲程中一直画出电火花（识图题），o.plain 燃气不着色（识图题只能看气门和活塞），o.hl 圈出气门和箭头（讲解），o.flow 进气 / 排气的箭头
   * 返回 { pTop, yC, top, bottom }（已乘缩放、加上 o.y 的画布坐标）
   */
  TH.engine = function (ctx, o) {
    const s = o.s || 1, F = o.F || ((v) => v), phi = ((o.phi % 720) + 720) % 720, diesel = o.type === 'diesel';
    const k = Math.min(3, Math.floor(phi / 180)), f = (phi - k * 180) / 180, th = (phi * Math.PI) / 180;
    const B = 150, WT = 16, HEAD = 40, r = 55, l = 150, clr = o.clr || (diesel ? 18 : 26), PH = 72, PIN = 42;
    const m = o.mirror ? -1 : 1, iX = -40 * m, eX = 40 * m;
    const cTop = HEAD, yPin0 = cTop + clr + PIN, yC = yPin0 + l + r;
    const yPin = yC - (r * Math.cos(th) + Math.sqrt(l * l - r * r * Math.sin(th) ** 2));
    const pTop = yPin - PIN, cBot = cTop + clr + 2 * r + PH + 8;
    const lift = (a, b) => (phi >= a && phi <= b ? Math.sin((Math.PI * (phi - a)) / (b - a)) : 0);
    const iL = lift(0, 180) * 20, eL = lift(540, 720) * 20;
    const fs = (px) => F(px) / s;
    ctx.save();
    ctx.translate(o.x, o.y); ctx.scale(s, s);
    // 飞轮（在后面）
    if (o.fly !== false) {
      ctx.save(); ctx.translate(0, yC); ctx.rotate(th);
      ctx.fillStyle = '#dee2e6'; ctx.strokeStyle = '#868e96'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 96, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f1f3f5'; ctx.beginPath(); ctx.arc(0, 0, 80, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 10;
      for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2 + 0.4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 82, Math.sin(a) * 82); ctx.stroke(); }
      ctx.fillStyle = '#e8590c'; ctx.beginPath(); ctx.arc(0, -88, 5, 0, TAU); ctx.fill(); // 飞轮上的记号
      ctx.restore();
    }
    // 曲轴（平衡块 + 曲柄）
    const cpx = r * Math.sin(th), cpy = yC - r * Math.cos(th);
    ctx.save(); ctx.translate(0, yC); ctx.rotate(th);
    ctx.fillStyle = '#495057';
    ctx.beginPath(); ctx.arc(0, 0, r + 14, Math.PI * 0.2, Math.PI * 0.8); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5c6670'; D.roundRect(ctx, -16, -r - 14, 32, r + 30, 14); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#212529'; ctx.beginPath(); ctx.arc(0, yC, 10, 0, TAU); ctx.fill();
    // 汽缸内部
    ctx.fillStyle = '#f8f9fa'; ctx.fillRect(-B / 2, cTop, B, cBot - cTop);
    // 燃气
    const fresh = diesel ? '#d0ebff' : '#c3fae8';
    let gc, ga = 0.9;
    if (o.plain) { gc = '#e7f5ff'; ga = 0.9; }
    else if (k === 0) { gc = fresh; ga = 0.45 + 0.45 * f; }
    else if (k === 1) gc = PS.mixColor(fresh, '#ffc078', f * (diesel ? 1 : 0.75));
    else if (k === 2) gc = f < 0.06 ? '#ffe066' : PS.mixColor('#ff6b3d', '#ced4da', Math.min(1, (f - 0.06) * 1.25));
    else { gc = '#adb5bd'; ga = 0.85 - 0.55 * f; }
    ctx.globalAlpha = ga; ctx.fillStyle = gc; ctx.fillRect(-B / 2, cTop, B, pTop - cTop); ctx.globalAlpha = 1;
    if (!o.plain && (k === 2 && f < 0.3 || o.spark && k === 2)) {
      const a = o.spark && k === 2 ? 0.55 : 1 - f / 0.3, cy = cTop + 12;
      const g = ctx.createRadialGradient(0, cy, 4, 0, cy, B * 0.7);
      g.addColorStop(0, 'rgba(255,250,200,' + a + ')'); g.addColorStop(0.5, 'rgba(255,170,60,' + a * 0.8 + ')'); g.addColorStop(1, 'rgba(255,100,40,0)');
      ctx.fillStyle = g; ctx.fillRect(-B / 2, cTop, B, pTop - cTop);
    }
    // 连杆
    ctx.strokeStyle = '#868e96'; ctx.lineWidth = 16; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, yPin); ctx.lineTo(cpx, cpy); ctx.stroke();
    ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(0, yPin); ctx.lineTo(cpx, cpy); ctx.stroke();
    ctx.fillStyle = '#343a40'; ctx.beginPath(); ctx.arc(cpx, cpy, 7, 0, TAU); ctx.fill();
    // 活塞
    const pg = ctx.createLinearGradient(-B / 2, 0, B / 2, 0);
    pg.addColorStop(0, '#868e96'); pg.addColorStop(0.45, '#dee2e6'); pg.addColorStop(1, '#868e96');
    ctx.fillStyle = pg; ctx.fillRect(-B / 2 + 3, pTop, B - 6, PH);
    ctx.strokeStyle = '#495057'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-B / 2 + 3, pTop + 9 + i * 8); ctx.lineTo(B / 2 - 3, pTop + 9 + i * 8); ctx.stroke(); }
    ctx.fillStyle = '#343a40'; ctx.beginPath(); ctx.arc(0, yPin, 9, 0, TAU); ctx.fill();
    // 汽缸壁
    const wg = ctx.createLinearGradient(0, 0, WT, 0);
    wg.addColorStop(0, '#868e96'); wg.addColorStop(1, '#ced4da');
    [-1, 1].forEach((sd) => { ctx.save(); ctx.translate(sd * (B / 2 + WT / 2), 0); ctx.scale(sd, 1); ctx.translate(-WT / 2, 0); ctx.fillStyle = wg; ctx.fillRect(0, cTop - 2, WT, cBot - cTop + 2); ctx.restore(); });
    // 汽缸盖与气道
    ctx.fillStyle = '#6c757d'; ctx.fillRect(-B / 2 - WT, 0, B + 2 * WT, cTop);
    const port = (x, sd, open, col) => {
      ctx.strokeStyle = open ? col : '#e9ecef'; ctx.lineWidth = 30; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(x, cTop + 1); ctx.lineTo(x, 14); ctx.lineTo(sd * (B / 2 + WT + 40), 14); ctx.stroke();
    };
    port(iX, -m, iL > 0.5, o.plain ? '#e7f5ff' : fresh); port(eX, m, eL > 0.5, o.plain ? '#e7f5ff' : '#ced4da');
    // 气门（弹簧、气门杆、气门头）
    [[iX, iL], [eX, eL]].forEach(([x, L]) => {
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 2;
      ctx.beginPath(); for (let i = 0; i <= 8; i++) { const yy = -30 + L * 0.45 + (i * (22 - L * 0.45)) / 8; ctx.lineTo(x + (i % 2 ? 9 : -9), yy); } ctx.stroke();
      ctx.fillStyle = '#343a40'; ctx.fillRect(x - 12, -34 + L, 24, 5);
      ctx.fillStyle = '#495057'; ctx.fillRect(x - 3, -32 + L, 6, cTop + 32 - 4);
      ctx.beginPath(); ctx.moveTo(x - 22, cTop + L); ctx.lineTo(x + 22, cTop + L); ctx.lineTo(x + 12, cTop + L - 7); ctx.lineTo(x - 12, cTop + L - 7); ctx.closePath(); ctx.fill();
    });
    // 火花塞 / 喷油嘴
    if (!diesel) {
      ctx.fillStyle = '#f8f9fa'; ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 1.5;
      D.roundRect(ctx, -8, -46, 16, 34, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#868e96'; ctx.fillRect(-11, -14, 22, 12);
      ctx.fillStyle = '#495057'; ctx.fillRect(-4, -2, 8, cTop + 4);
      ctx.fillRect(-1.5, cTop + 2, 3, 6);
      const sparkOn = phi >= 354 && phi <= 376 || o.spark && k === 2;
      if (sparkOn) {
        ctx.strokeStyle = '#fff3bf'; ctx.lineWidth = 3;
        for (let i = 0; i < 8; i++) { const a = (i * TAU) / 8 + (o.t || 0) * 9; ctx.beginPath(); ctx.moveTo(0, cTop + 10); ctx.lineTo(Math.cos(a) * 15, cTop + 10 + Math.sin(a) * 15); ctx.stroke(); }
        ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(0, cTop + 10, 6, 0, TAU); ctx.fill();
      }
    } else {
      ctx.fillStyle = '#343a40'; D.roundRect(ctx, -9, -50, 18, 40, 4); ctx.fill();
      ctx.fillStyle = '#495057'; ctx.fillRect(-5, -10, 10, cTop + 8);
      ctx.fillStyle = '#212529'; ctx.beginPath(); ctx.moveTo(-5, cTop - 2); ctx.lineTo(5, cTop - 2); ctx.lineTo(0, cTop + 6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ced4da'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(9, -40); ctx.lineTo(30, -40); ctx.lineTo(30, -66); ctx.stroke(); // 油管
      const inj = phi >= 348 && phi <= 380 || o.spark && k === 2;
      if (inj) {
        ctx.fillStyle = 'rgba(181,137,0,.75)';
        for (let i = 0; i < 26; i++) { const a = Math.PI / 2 + (((i * 37) % 13) / 13 - 0.5) * 1.6, d = 8 + ((i * 53) % 29); ctx.beginPath(); ctx.arc(Math.cos(a) * d, cTop + 6 + Math.sin(a) * d, 2, 0, TAU); ctx.fill(); }
      }
    }
    // 进气 / 排气的箭头
    if (o.flow !== false) {
      if (iL > 6) D.arrow(ctx, -m * (B / 2 + WT + 34), 14, iX, cTop + 26, { color: '#1c7ed6', width: 3, head: 11 });
      if (eL > 6) D.arrow(ctx, eX, cTop + 26, m * (B / 2 + WT + 38), 14, { color: '#495057', width: 3, head: 11 });
    }
    // 活塞运动方向
    const up = Math.sin(th) < 0 || Math.abs(Math.sin(th)) < 1e-6 && Math.cos(th) < 0;
    if (o.arrow) {
      const ax = B / 2 + WT + 26, ay = pTop + PH / 2;
      D.arrow(ctx, ax, ay + (up ? 30 : -30), ax, ay + (up ? -30 : 30), { color: '#e8590c', width: 5, head: 15 });
    }
    if (o.hl) {
      ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 3;
      [iX, eX].forEach((x) => { ctx.beginPath(); ctx.arc(x, cTop - 2, 30, 0, TAU); ctx.stroke(); });
      if (o.arrow) { ctx.beginPath(); ctx.arc(B / 2 + WT + 26, pTop + PH / 2, 42, 0, TAU); ctx.stroke(); }
      ctx.restore();
    }
    // 部件名称
    if (o.labels) {
      const lab = (t, tx, ty, px, py, al) => {
        ctx.strokeStyle = '#868e96'; ctx.lineWidth = 1.2 / s * 1.4; ctx.beginPath(); ctx.moveTo(tx + (al === 'right' ? 4 : al === 'left' ? -4 : 0), ty - fs(13) * 0.35); ctx.lineTo(px, py); ctx.stroke();
        D.text(ctx, t, tx, ty, { size: fs(13), weight: 700, align: al === 'right' ? 'right' : al === 'left' ? 'left' : 'center', color: '#343a40', bg: 'rgba(255,255,255,.85)' });
      };
      const L = -B / 2 - WT - 30, R = B / 2 + WT + 30;
      lab('进气门', m > 0 ? L - 34 : R + 34, -26, iX, cTop - 6, m > 0 ? 'right' : 'left');
      lab('排气门', m > 0 ? R + 34 : L - 34, -26, eX, cTop - 6, m > 0 ? 'left' : 'right');
      lab(diesel ? '喷油嘴' : '火花塞', 0, -58, 0, -48, 'center');
      lab('汽缸', R + 10, cTop + clr + 64, B / 2 + WT - 2, cTop + clr + 50, 'left');
      lab('活塞', L - 6, pTop + PH / 2 + 5, -B / 2 + 14, pTop + PH / 2, 'right');
      lab('连杆', L - 6, (yPin + cpy) / 2 + 30, (cpx) / 2 - 4, (yPin + cpy) / 2, 'right');
      lab('曲轴', R + 10, yC + 30, 12, yC + 4, 'left');
      if (o.fly !== false) lab('飞轮', R + 10, yC + 84, 70, yC + 62, 'left');
    }
    ctx.restore();
    return { pTop: o.y + pTop * s, yC: o.y + yC * s, top: o.y - 50 * s, bottom: o.y + (yC + 96) * s, up, k };
  };

  /* ================= 试管中的水蒸气冲开软木塞 ================= */
  PS.register('cork-steam', function (el) {
    const VW = 1000, SPEED = 24, M = 0.01, PW = 30, T0 = 20;
    const A = -0.49, CA = Math.cos(A), SA = Math.sin(A), BX = 330, BY = 340, LEN = 300, RR = 22, WY = 312;
    const st = { on: false, T: T0, p: 1, popAt: 1.3, pop: false, cork: null, fog: 0, bub: [], ph: 0 };
    const S = EN.stage(el, { VW, vh: (w) => (EN.narrow(w) ? 720 : 520), draw });
    const lampB = PS.ui.button('🔥 点燃酒精灯', () => { st.on = !st.on; lampB.innerHTML = st.on ? '熄灭酒精灯' : '🔥 点燃酒精灯'; tell(); }, 'btn btn-primary btn-sm');
    const chain = h('div', { class: 'he-chain' }), msg = h('div', { class: 'th-msg info' });
    el.append(PS.ui.row(lampB, PS.ui.button('塞好软木塞，重来', reset, 'btn btn-ghost btn-sm')), chain, msg);
    const W2 = (x, y) => [BX + x * CA - y * SA, BY + x * SA + y * CA]; // 试管坐标 → 画布坐标
    function reset() {
      Object.assign(st, { T: T0, p: 1, popAt: PS.round(PS.rand(1.25, 1.4), 2), pop: false, cork: null, fog: 0, bub: [] });
      tell();
    }
    function tell() {
      const ph = st.pop ? 3 : st.T >= 99.5 ? 2 : st.on || st.T > T0 + 0.5 ? 1 : 0;
      st.ph = ph;
      const steps = [['酒精的化学能', 'g'], ['火焰的内能', 'o'], ['水和水蒸气的内能', 'r'], ['软木塞的机械能', 'b']];
      const on = [st.on || st.T > T0 + 0.5, st.on || st.T > T0 + 0.5, st.T > 30, st.pop];
      chain.innerHTML = steps.map((s, i) => (i ? '<span class="he-arr' + (on[i] ? ' on' : '') + '">' + ['', '燃烧', '热传递', '做功'][i] + ' →</span>' : '') + '<span class="he-box ' + s[1] + (on[i] ? ' on' : '') + '">' + s[0] + '</span>').join('');
      let s, cls = 'info';
      if (st.pop) { s = '软木塞被冲出去了！<b>水蒸气对软木塞做功</b>，水蒸气的<b>内能转化为软木塞的机械能</b>。管口的“白气”是水蒸气对外做功后内能减少、温度降低，<b>液化</b>成的小水滴。'; cls = 'ok'; }
      else if (ph === 2) s = '水沸腾了，产生大量的水蒸气，管内水蒸气的压强越来越大……';
      else if (ph === 1) s = st.on ? '酒精燃烧，把<b>化学能转化为内能</b>；通过<b>热传递</b>，水的温度升高、内能增加。' : '酒精灯熄灭了，水的温度慢慢降低。';
      else s = '试管里装有少量的水，用软木塞塞住管口。点燃酒精灯给水加热，观察会发生什么。';
      msg.className = 'th-msg ' + cls; msg.innerHTML = s;
    }
    PS.loop((dt, t) => {
      const Tb = 100 + 28 * (st.p - 1);
      if (st.on) {
        if (st.T < Tb) st.T = Math.min(Tb, st.T + (PW * dt * SPEED) / (4200 * M));
        else if (!st.pop) st.p += dt * 0.12;
        else st.T = Tb;
      } else { st.T += (T0 - st.T) * dt * 0.05; if (!st.pop && st.p > 1) st.p = Math.max(1, st.p - dt * 0.05); }
      if (!st.pop && st.p >= st.popAt) {
        st.pop = true; st.p = 1; st.fog = 1; st.T = 100; PS.sound.clack(); setTimeout(() => PS.sound.ping(), 50);
        const [mx, my] = W2(LEN + 8, 0);
        st.cork = { x: mx, y: my, vx: 720 * CA, vy: 720 * SA, a: A, w: 9 };
        tell();
      }
      if (st.cork) {
        const c = st.cork;
        if (c.y < 488) { c.vy += 1400 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.a += c.w * dt; }
        else { c.y = 488; c.vx *= 0.9; c.x += c.vx * dt; c.w = 0; }
      }
      st.fog = Math.max(0, st.fog - dt / 3.5);
      // 气泡
      if (st.T >= 99.5 && st.on && Math.random() < dt * 40) st.bub.push({ x: PS.rand(BX + 10, BX + 100), y: PS.rand(330, 345), r: PS.rand(2, 5) });
      st.bub.forEach((b) => { b.y -= dt * 60; b.r += dt * 2; });
      st.bub = st.bub.filter((b) => b.y > WY + 2);
      const ph = st.pop ? 3 : st.T >= 99.5 ? 2 : st.on || st.T > T0 + 0.5 ? 1 : 0;
      if (ph !== st.ph || Math.floor(st.T / 10) !== st.k10) { st.k10 = Math.floor(st.T / 10); tell(); }
      S.render();
    }, el).start();
    function tubePath(ctx) {
      ctx.beginPath(); ctx.moveTo(LEN, -RR); ctx.lineTo(RR, -RR); ctx.arc(RR, 0, RR, -Math.PI / 2, Math.PI / 2, true); ctx.lineTo(LEN, RR);
    }
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, VW, VH), nar = EN.narrow(w), t = performance.now() / 1000;
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#e9dcc6'; ctx.fillRect(0, 498, VW, 22);
      // 铁架台
      ctx.fillStyle = '#495057'; D.roundRect(ctx, 50, 478, 260, 20, 4); ctx.fill();
      ctx.fillStyle = '#868e96'; ctx.fillRect(94, 110, 12, 370);
      // 酒精灯
      PS.lamp(ctx, 385, 478, 1.15, { on: st.on, t, cap: false });
      // 试管
      ctx.save(); ctx.translate(BX, BY); ctx.rotate(A);
      ctx.fillStyle = 'rgba(240,247,255,.75)'; tubePath(ctx); ctx.fill();
      ctx.restore();
      // 水（水平液面）
      ctx.save();
      ctx.save(); ctx.translate(BX, BY); ctx.rotate(A); tubePath(ctx); ctx.closePath(); ctx.restore();
      ctx.clip();
      ctx.fillStyle = PS.waterColor(Math.min(100, st.T), 0.95); ctx.fillRect(0, WY, VW, 200);
      ctx.strokeStyle = 'rgba(28,126,214,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, WY); ctx.lineTo(VW, WY); ctx.stroke();
      st.bub.forEach((b) => { ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke(); });
      // 管内的水蒸气
      const vap = st.pop ? 0.25 : PS.clamp((st.T - 70) / 30, 0, 1) * (0.3 + 0.5 * PS.clamp((st.p - 1) / (st.popAt - 1), 0, 1));
      if (vap > 0.01) for (let i = 0; i < 40; i++) { const u = ((i * 47) % 100) / 100, v = ((i * 71) % 100) / 100 - 0.5; const [x, y] = W2(70 + u * (LEN - 80) + Math.sin(t * 2 + i) * 6, v * RR * 1.6); if (y < WY - 3) { ctx.fillStyle = 'rgba(255,255,255,' + vap + ')'; ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill(); } }
      ctx.restore();
      ctx.save(); ctx.translate(BX, BY); ctx.rotate(A);
      ctx.strokeStyle = '#7d8ca3'; ctx.lineWidth = 2.5; tubePath(ctx); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(LEN, 0, 4, RR + 2, 0, 0, TAU); ctx.stroke();
      // 试管夹
      ctx.fillStyle = '#c92a2a'; ctx.fillRect(222, -RR - 7, 16, RR * 2 + 14);
      // 软木塞（未冲出时）
      if (!st.cork) { ctx.fillStyle = '#c08a4a'; ctx.beginPath(); ctx.moveTo(LEN - 10, -RR + 1); ctx.lineTo(LEN + 26, -RR - 3); ctx.lineTo(LEN + 26, RR + 3); ctx.lineTo(LEN - 10, RR - 1); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 1.5; ctx.stroke(); }
      ctx.restore();
      // 夹子的臂
      const [jx, jy] = W2(230, -RR - 7);
      ctx.strokeStyle = '#868e96'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(100, 220); ctx.lineTo(jx - 4, 220); ctx.lineTo(jx, jy); ctx.stroke();
      ctx.fillStyle = '#495057'; ctx.fillRect(90, 212, 22, 16);
      // 冲出的软木塞
      if (st.cork && st.cork.x < VW + 40) {
        const c = st.cork;
        ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a);
        ctx.fillStyle = '#c08a4a'; ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-18, -RR + 1); ctx.lineTo(18, -RR - 3); ctx.lineTo(18, RR + 3); ctx.lineTo(-18, RR - 1); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      // 管口的“白气”
      const [mx, my] = W2(LEN + 10, 0);
      if (st.fog > 0.01 || st.pop && st.on) {
        const a = Math.max(st.fog, st.pop && st.on ? 0.35 : 0);
        for (let i = 0; i < 16; i++) {
          const u = (t * 0.6 + i / 16) % 1, d = 30 + u * 150 * (st.fog > 0.5 ? 1.4 : 1);
          ctx.fillStyle = 'rgba(233,236,239,' + (a * (1 - u) * 0.9) + ')';
          ctx.beginPath(); ctx.arc(mx + CA * d + Math.sin(i * 2.3) * 12 * u, my + SA * d - u * 40 + Math.cos(i * 1.7) * 10 * u, 10 + u * 26, 0, TAU); ctx.fill();
        }
        if (a > 0.3) D.text(ctx, '“白气”', mx + 120, my - 110, { size: F(14), weight: 800, color: '#495057', bg: 'rgba(255,255,255,.85)' });
      }
      D.text(ctx, '水', ...W2(70, RR * 0.4).map((v, i) => v + (i ? 14 : 0)), { size: F(13), weight: 700, color: '#1c7ed6', align: 'center' });
      // 读数
      const rx = nar ? 260 : 800, ry = nar ? 600 : 120;
      TH.dthermo(ctx, rx, ry, st.T, { F, fs: 20, label: '水温', d: 0 });
      const gx = nar ? 560 : 680, gy = nar ? 580 : 230, gw = nar ? 380 : 250, gh = 24;
      D.text(ctx, '管内气压', gx, gy - 10, { size: F(13), weight: 700, color: '#495057' });
      ctx.fillStyle = '#e9ecef'; D.roundRect(ctx, gx, gy, gw, gh, 8); ctx.fill();
      const fp = PS.clamp((st.p - 1) / 0.45, 0, 1);
      ctx.fillStyle = PS.mixColor('#74c0fc', '#f03e3e', fp); D.roundRect(ctx, gx, gy, Math.max(10, gw * (0.08 + 0.92 * fp)), gh, 8); ctx.fill();
      D.text(ctx, st.p > 1.005 ? '大于 1 个标准大气压' : '约 1 个标准大气压', gx, gy + gh + F(13) * 1.25, { size: F(12), color: '#495057' });
      if (!nar) D.text(ctx, '时间加快 24 倍', 990, 505, { size: F(11), color: '#868e96', align: 'right' });
    }
    reset();
  });

  /* ================= 热机家族 ================= */
  PS.register('engine-family', function (el) {
    const VW = 1000;
    const INFO = {
      steam: { n: '蒸汽机', where: '汽缸外面的锅炉中（外燃机）', push: '高温高压的水蒸气推动活塞往复运动', use: '早期的火车、轮船和工厂，引发了第一次工业革命', eta: '很低，约 6%～15%' },
      ice: { n: '内燃机', where: '汽缸内部（内燃机）', push: '高温高压的燃气推动活塞往复运动', use: '汽车、摩托车、拖拉机、轮船、发电机组', eta: '汽油机约 20%～30%，柴油机约 30%～45%' },
      turbine: { n: '汽轮机', where: '锅炉中（外燃机）', push: '高温高压的水蒸气冲击叶轮，使叶轮高速转动', use: '火力发电站、核电站、大型轮船', eta: '比蒸汽机高得多' },
      jet: { n: '喷气发动机', where: '燃烧室中，利用吸进的空气助燃', push: '燃气从尾部高速向后喷出，产生向前的推力', use: '喷气式飞机', eta: '—' },
      rocket: { n: '火箭发动机', where: '燃烧室中，自带助燃剂（液态氧），能在没有空气的太空中工作', push: '燃气从尾部高速向后喷出，产生巨大的推力', use: '运载火箭、导弹', eta: '—' },
    };
    const st = { k: 'steam' };
    const seg = PS.ui.seg(Object.keys(INFO).map((k) => ({ value: k, label: INFO[k].n })), st.k, (v) => { st.k = v; tell(); });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el));
    const S = EN.stage(el, { VW, vh: (w) => (EN.narrow(w) ? 640 : 440), draw });
    const info = h('div', { class: 'th-msg info' });
    el.append(info);
    function tell() {
      const I = INFO[st.k];
      info.innerHTML = '<b>' + I.n + '</b><br>燃料在哪里燃烧：' + I.where + '<br>怎样做功：' + I.push + '<br>能量转化：燃料的<b>化学能</b> → <b>内能</b> → <b>机械能</b><br>用途：' + I.use + (I.eta !== '—' ? '<br>效率：' + I.eta : '');
    }
    PS.loop(() => S.render(), el).start();
    const lab = (ctx, F, t, x, y, px, py, al) => {
      if (px != null) { ctx.strokeStyle = '#868e96'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y - F(13) * 0.35); ctx.lineTo(px, py); ctx.stroke(); }
      D.text(ctx, t, x, y, { size: F(13), weight: 700, align: al || 'center', color: '#343a40', bg: 'rgba(255,255,255,.88)' });
    };
    const flame = (ctx, x, y, w, hh, t, i) => {
      const fh = hh * (1 + 0.15 * Math.sin(t * 13 + i * 2));
      ctx.fillStyle = 'rgba(255,146,43,.85)'; ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.quadraticCurveTo(x - w * 0.3, y - fh * 0.6, x, y - fh); ctx.quadraticCurveTo(x + w * 0.3, y - fh * 0.6, x + w / 2, y); ctx.fill();
      ctx.fillStyle = 'rgba(255,224,102,.9)'; ctx.beginPath(); ctx.moveTo(x - w / 4, y); ctx.quadraticCurveTo(x, y - fh * 0.7, x + w / 4, y); ctx.fill();
    };
    function steam(ctx, F, t) {
      // 锅炉
      ctx.fillStyle = '#495057'; ctx.fillRect(120, 70, 36, 90);
      for (let i = 0; i < 4; i++) { const u = (t * 0.4 + i / 4) % 1; ctx.fillStyle = 'rgba(134,142,150,' + 0.5 * (1 - u) + ')'; ctx.beginPath(); ctx.arc(138 + u * 30, 60 - u * 50, 12 + u * 16, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#c92a2a'; D.roundRect(ctx, 80, 150, 270, 170, 30); ctx.fill();
      ctx.save(); D.roundRect(ctx, 92, 162, 246, 146, 22); ctx.clip();
      ctx.fillStyle = '#e7f5ff'; ctx.fillRect(92, 162, 246, 146);
      ctx.fillStyle = '#74c0fc'; ctx.fillRect(92, 240, 246, 70);
      for (let i = 0; i < 10; i++) { const u = (t * 0.7 + i / 10) % 1; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(110 + ((i * 47) % 210), 305 - u * 65, 3 + u * 3, 0, TAU); ctx.stroke(); }
      ctx.restore();
      ctx.fillStyle = '#343a40'; ctx.fillRect(90, 320, 250, 70);
      for (let i = 0; i < 7; i++) flame(ctx, 110 + i * 34, 372, 30, 42, t, i);
      lab(ctx, F, '锅炉（燃料在这里燃烧）', 215, 420);
      // 蒸汽管
      ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 16; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(300, 150); ctx.lineTo(300, 110); ctx.lineTo(560, 110); ctx.lineTo(560, 168); ctx.stroke();
      // 汽缸（水平）
      const th = t * 4.2, r = 45, L = 150, cx = 860, cy = 240;
      const xch = cx + r * Math.cos(th) - Math.sqrt(L * L - (r * Math.sin(th)) ** 2), xp = xch - 150;
      ctx.fillStyle = '#868e96'; ctx.fillRect(470, 168, 180, 14); ctx.fillRect(470, 298, 180, 14);
      ctx.fillRect(458, 168, 14, 144); ctx.fillRect(648, 168, 12, 52); ctx.fillRect(648, 260, 12, 52);
      const right = Math.sin(th) < 0; // 活塞向右运动时，左边进汽
      ctx.fillStyle = right ? 'rgba(255,201,201,.9)' : 'rgba(222,226,230,.8)'; ctx.fillRect(472, 182, xp - 10 - 472, 116);
      ctx.fillStyle = right ? 'rgba(222,226,230,.8)' : 'rgba(255,201,201,.9)'; ctx.fillRect(xp + 10, 182, 648 - xp - 10, 116);
      ctx.fillStyle = '#495057'; ctx.fillRect(xp - 10, 182, 20, 116);
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(xp, cy); ctx.lineTo(xch, cy); ctx.stroke();
      const px = cx + r * Math.cos(th), py = cy + r * Math.sin(th);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(th);
      ctx.fillStyle = '#dee2e6'; ctx.strokeStyle = '#495057'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 100, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 8; for (let i = 0; i < 6; i++) { const a = (i * TAU) / 6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 96, Math.sin(a) * 96); ctx.stroke(); }
      ctx.restore();
      ctx.strokeStyle = '#343a40'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(xch, cy); ctx.lineTo(px, py); ctx.stroke();
      ctx.fillStyle = '#212529'; ctx.beginPath(); ctx.arc(px, py, 8, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(xch, cy, 7, 0, TAU); ctx.fill();
      lab(ctx, F, '水蒸气', 430, 96, 520, 110);
      lab(ctx, F, '汽缸和活塞', 560, 355, 560, 312);
      lab(ctx, F, '飞轮', 860, 375, 860, 340);
    }
    function ice(ctx, F, t) {
      TH.engine(ctx, { x: 500, y: 26, s: 0.84, phi: t * 150, type: 'petrol', F, t, fly: true, flow: true });
      lab(ctx, F, '燃料在汽缸内燃烧', 680, 120, 560, 120, 'left');
      lab(ctx, F, '燃气推动活塞', 680, 200, 570, 200, 'left');
    }
    function turbine(ctx, F, t) {
      ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 34; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(60, 230); ctx.lineTo(380, 230); ctx.stroke();
      ctx.fillStyle = 'rgba(206,212,218,.35)'; ctx.strokeStyle = '#868e96'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(380, 130); ctx.lineTo(700, 80); ctx.lineTo(700, 380); ctx.lineTo(380, 330); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#495057'; ctx.fillRect(380, 222, 560, 16);
      [440, 530, 620].forEach((x, i) => {
        const hh = 190 + i * 50;
        ctx.save(); ctx.beginPath(); ctx.rect(x - 16, 230 - hh / 2, 32, hh); ctx.clip();
        ctx.fillStyle = '#ced4da'; ctx.fillRect(x - 16, 230 - hh / 2, 32, hh);
        ctx.fillStyle = '#868e96'; for (let y = -40; y < hh + 40; y += 16) { const yy = 230 - hh / 2 + ((y + t * 260) % (hh + 32)) - 16; ctx.fillRect(x - 16, yy, 32, 6); }
        ctx.restore();
      });
      for (let i = 0; i < 42; i++) {
        const u = (t * 0.45 + i / 42) % 1, x = 70 + u * 640, sp = (i * 37) % 11 / 11 - 0.5, y = 230 + sp * (x < 380 ? 24 : 24 + (x - 380) * 0.55);
        ctx.fillStyle = PS.mixColor('#ff8787', '#dee2e6', PS.clamp((x - 380) / 320, 0, 1)); ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#1971c2'; D.roundRect(ctx, 770, 160, 160, 140, 12); ctx.fill();
      D.text(ctx, '发电机', 850, 238, { size: F(15), weight: 800, color: '#fff', align: 'center' });
      lab(ctx, F, '高温高压的水蒸气', 210, 180);
      lab(ctx, F, '叶轮', 530, 70, 530, 112);
      lab(ctx, F, '转轴', 740, 360, 730, 238);
    }
    function jet(ctx, F, t) {
      ctx.fillStyle = '#e9ecef'; ctx.strokeStyle = '#868e96'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(120, 140); ctx.lineTo(700, 150); ctx.lineTo(860, 195); ctx.lineTo(860, 285); ctx.lineTo(700, 330); ctx.lineTo(120, 340); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#868e96'; ctx.beginPath(); ctx.moveTo(200, 240); ctx.quadraticCurveTo(210, 210, 240, 210); ctx.lineTo(680, 215); ctx.lineTo(760, 240); ctx.lineTo(680, 265); ctx.lineTo(240, 270); ctx.quadraticCurveTo(210, 270, 200, 240); ctx.fill();
      const blades = (x0, x1, c) => { for (let x = x0; x <= x1; x += 22) { ctx.save(); ctx.beginPath(); ctx.rect(x, 150, 10, 180); ctx.clip(); ctx.fillStyle = c; ctx.fillRect(x, 150, 10, 180); ctx.fillStyle = '#495057'; for (let y = 140; y < 340; y += 14) ctx.fillRect(x, y + (t * 300) % 14, 10, 5); ctx.restore(); } };
      blades(240, 370, '#adb5bd'); blades(600, 670, '#adb5bd');
      [[400, 160], [400, 285]].forEach(([x, y]) => { ctx.fillStyle = 'rgba(255,169,77,.35)'; ctx.fillRect(x, y, 180, 36); for (let i = 0; i < 6; i++) flame(ctx, x + 18 + i * 30, y + 34, 22, 30, t, i); });
      for (let i = 0; i < 70; i++) {
        const u = (t * 0.32 + i / 70) % 1, x = 60 + u * 940, sp = ((i * 41) % 13) / 13 - 0.5;
        const half = x < 700 ? 80 : x < 860 ? 80 - (x - 700) * 0.28 : 35 + (x - 860) * 0.12;
        const xx = x < 700 ? x : 700 + (x - 700) * 1.0;
        ctx.fillStyle = x < 400 ? '#74c0fc' : PS.mixColor('#ff922b', '#ced4da', PS.clamp((x - 700) / 300, 0, 1)); ctx.beginPath(); ctx.arc(xx, 240 + sp * 2 * half, x > 700 ? 6 : 4.5, 0, TAU); ctx.fill();
      }
      lab(ctx, F, '进气口', 120, 110);
      lab(ctx, F, '压气机', 305, 380, 305, 330);
      lab(ctx, F, '燃烧室', 490, 110, 490, 160);
      lab(ctx, F, '涡轮', 635, 380, 635, 330);
      lab(ctx, F, '尾喷管', 800, 140, 800, 195);
      D.arrow(ctx, 110, 405, 20, 405, { color: '#2b8a3e', width: 4, head: 14 });
      D.text(ctx, '推力', 120, 410, { size: F(13), weight: 800, color: '#2b8a3e' });
    }
    function rocket(ctx, F, t) {
      const x = 500;
      for (let i = 0; i < 40; i++) { const u = (t * 0.9 + i / 40) % 1, sp = ((i * 41) % 13) / 13 - 0.5; ctx.fillStyle = PS.mixColor('#ffe066', '#ced4da', u); ctx.globalAlpha = 1 - u * 0.7; ctx.beginPath(); ctx.arc(x + sp * (40 + u * 160), 340 + u * 120, 6 + u * 10, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
      flame(ctx, x, 345, 70, -80, t, 0);
      ctx.fillStyle = '#dee2e6'; ctx.strokeStyle = '#868e96'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 60, 90); ctx.quadraticCurveTo(x - 50, 40, x, 20); ctx.quadraticCurveTo(x + 50, 40, x + 60, 90); ctx.lineTo(x + 60, 270); ctx.lineTo(x - 60, 270); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#a5d8ff'; ctx.fillRect(x - 50, 100, 100, 70);
      ctx.fillStyle = '#c5f6fa'; ctx.fillRect(x - 50, 180, 100, 70);
      ctx.fillStyle = '#495057'; ctx.beginPath(); ctx.moveTo(x - 30, 270); ctx.lineTo(x + 30, 270); ctx.lineTo(x + 50, 340); ctx.lineTo(x - 50, 340); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e03131'; [[-1], [1]].forEach(([sd]) => { ctx.beginPath(); ctx.moveTo(x + sd * 60, 220); ctx.lineTo(x + sd * 100, 290); ctx.lineTo(x + sd * 60, 270); ctx.closePath(); ctx.fill(); });
      lab(ctx, F, '燃料（液态氢）', 700, 140, 550, 135, 'left');
      lab(ctx, F, '助燃剂（液态氧）', 700, 220, 550, 215, 'left');
      lab(ctx, F, '燃烧室和喷管', 700, 300, 530, 300, 'left');
      lab(ctx, F, '高温高压的燃气', 300, 400, 470, 390, 'right');
    }
    const DRAW = { steam, ice, turbine, jet, rocket };
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, VW, VH), t = performance.now() / 1000;
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      if (VH > 500) { ctx.save(); ctx.translate(0, (VH - 440) / 2); }
      DRAW[st.k](ctx, F, t);
      if (VH > 500) ctx.restore();
    }
    tell();
  });

  /* ================= 认识四个冲程：认一认 / 排一排 ================= */
  PS.register('stroke-quiz', function (el) {
    const VW = 1000, GAN = ['甲', '乙', '丙', '丁'];
    const st = { mode: 'one', k: 0, phi: 90, mirror: false, type: 'petrol', step: 0, pick: null, ok: 0, n: 0, order: [], clicks: [], done: false };
    const seg = PS.ui.seg([{ value: 'one', label: '认一认：这是哪个冲程' }, { value: 'four', label: '排一排：一个工作循环' }], st.mode, (v) => { st.mode = v; next(); });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el));
    const S = EN.stage(el, { VW, vh, draw });
    function vh(w) { const n = EN.narrow(w); return st.mode === 'one' ? (n ? 700 : 470) : (n ? 1060 : 430); }
    const q = h('div', { class: 'th-q' }), fb = h('div', { class: 'th-msg info' }), score = h('div', { class: 'small muted', style: { marginTop: '6px' } });
    el.append(q, fb, PS.ui.row(PS.ui.button('换一题', next, 'btn btn-ghost btn-sm')), score);
    PS.drag(S, { VW, get VH() { return S.VH; }, hit: (p) => { if (st.mode !== 'four' || st.done) return null; const i = figAt(p); return i == null ? null : i; }, start: (i) => clickFig(i), move() {} });
    function figAt(p) {
      const L = lay4(S.w || 1000);
      for (let i = 0; i < 4; i++) { const c = L[i]; if (Math.abs(p.x - c.x) < c.w / 2 && p.y > c.y0 && p.y < c.y1) return i; }
      return null;
    }
    function lay4(w) {
      const n = EN.narrow(w);
      return [0, 1, 2, 3].map((i) => n ? { x: 250 + (i % 2) * 500, y0: 20 + Math.floor(i / 2) * 520, y1: 20 + Math.floor(i / 2) * 520 + 500, w: 480, s: 0.88 } : { x: 125 + i * 250, y0: 10, y1: 420, w: 240, s: 0.68 });
    }
    function next() {
      st.type = Math.random() < 0.7 ? 'petrol' : 'diesel'; st.mirror = Math.random() < 0.5; st.done = false; st.clicks = []; st.pick = null; st.step = 0;
      if (st.mode === 'one') {
        st.k = PS.randInt(0, 3); st.phi = st.k * 180 + PS.rand(50, 130);
        q.innerHTML = '<b>第 1 问：</b>图中是汽油机（或柴油机）的哪个冲程？';
        const ops = h('div', { class: 'q-options cols-4' });
        STROKES.forEach((s, i) => ops.append(h('button', { type: 'button', class: 'q-opt', html: '<span class="q-letter">' + 'ABCD'[i] + '</span>' + s.n, onclick: () => answer1(i, ops) })));
        q.append(ops);
        fb.className = 'th-msg info'; fb.innerHTML = '先看<b>两个气门</b>是打开还是关闭，再看<b>活塞</b>向上还是向下运动（橙色箭头）。';
      } else {
        st.order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
        st.phis = st.order.map((k) => k * 180 + PS.rand(60, 120));
        q.innerHTML = '<b>排一排：</b>甲、乙、丙、丁是一个工作循环的四个冲程，按<b>吸气 → 压缩 → 做功 → 排气</b>的顺序，依次<b>点击</b>四幅图。';
        fb.className = 'th-msg info'; fb.innerHTML = '已点击：—';
      }
      const v = Math.round(vh(S.w || 1000));
      if (v !== S.VH) S.stage.style.aspectRatio = VW + ' / ' + v;
      S.render();
    }
    function answer1(i, ops) {
      if (st.pick != null) return;
      st.pick = i; st.n++;
      const good = i === st.k; if (good) st.ok++;
      ops.querySelectorAll('.q-opt').forEach((b, j) => { b.disabled = true; if (j === st.k) b.classList.add('right'); if (j === i && !good) b.classList.add('wrong'); });
      good ? PS.sound.good() : PS.sound.bad();
      const s = STROKES[st.k];
      fb.className = 'th-msg ' + (good ? 'ok' : 'bad');
      fb.innerHTML = (good ? '✔ 正确！' : '✘ 这是<b>' + s.n + '</b>。') + '判断依据：' + (s.iv || s.ev ? '<b>一个气门打开</b>' : '<b>两个气门都关闭</b>') + '，活塞<b>向' + (s.up ? '上' : '下') + '</b>运动' + (st.k === 2 ? (st.type === 'diesel' ? '（喷油嘴喷油）' : '（火花塞产生电火花）') : '') + '。';
      score.innerHTML = '已做 ' + st.n + ' 题，答对 ' + st.ok + ' 题。';
      // 第 2 问：能量转化
      const ops2 = h('div', { class: 'q-options' });
      const C = ['机械能转化为内能', '内能转化为机械能', '没有这两种能量转化'], ans = st.k === 1 ? 0 : st.k === 2 ? 1 : 2;
      C.forEach((c, j) => ops2.append(h('button', { type: 'button', class: 'q-opt', html: '<span class="q-letter">' + 'ABC'[j] + '</span>' + c, onclick: () => {
        if (ops2.dataset.done) return; ops2.dataset.done = 1;
        ops2.querySelectorAll('.q-opt').forEach((b, x) => { b.disabled = true; if (x === ans) b.classList.add('right'); if (x === j && j !== ans) b.classList.add('wrong'); });
        j === ans ? PS.sound.good() : PS.sound.bad();
        fb.innerHTML += '<br>' + (j === ans ? '✔' : '✘') + ' ' + STROKES[st.k].n + '：' + (ans === 2 ? '靠飞轮的惯性完成，不发生机械能和内能的相互转化。' : ans === 0 ? '活塞压缩气体，对气体做功，<b>机械能转化为内能</b>，气体的温度升高。' : '高温高压的燃气推动活塞做功，<b>内能转化为机械能</b>。这是唯一对外做功的冲程。');
      } })));
      q.append(h('div', { style: { marginTop: '10px' }, html: '<b>第 2 问：</b>这个冲程中能量怎样转化？' }), ops2);
      S.render();
    }
    function clickFig(i) {
      if (st.clicks.includes(i)) return;
      st.clicks.push(i); PS.sound.tick();
      fb.innerHTML = '已点击：' + st.clicks.map((j) => GAN[j]).join(' → ');
      if (st.clicks.length === 4) {
        st.done = true; st.n++;
        const right = st.order.map((k, j) => [k, j]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
        const good = st.clicks.every((j, x) => j === right[x]); if (good) st.ok++;
        fb.className = 'th-msg ' + (good ? 'ok' : 'bad');
        fb.innerHTML = (good ? '✔ 正确！' : '✘ 正确的顺序是 ') + right.map((j) => GAN[j]).join(' → ') + '。' + right.map((j) => GAN[j] + '：' + STROKES[st.order[j]].n).join('，') + '。其中对外做功的是<b>' + GAN[right[2]] + '</b>（' + (st.type === 'diesel' ? '喷油嘴喷油' : '火花塞点火') + '，两个气门关闭，活塞向下）。';
        good ? PS.sound.good() : PS.sound.bad();
        score.innerHTML = '已做 ' + st.n + ' 题，答对 ' + st.ok + ' 题。';
      }
      S.render();
    }
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, VW, VH), n = EN.narrow(w), t = performance.now() / 1000;
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      if (st.mode === 'one') {
        const s = n ? 1.28 : 0.95;
        TH.engine(ctx, { x: 500, y: 52 * s + 6, s, phi: st.phi, type: st.type, mirror: st.mirror, F, arrow: true, spark: true, plain: true, flow: false, hl: st.pick != null, labels: false, t });
      } else {
        lay4(w).forEach((c, i) => {
          const sel = st.clicks.indexOf(i);
          ctx.fillStyle = sel >= 0 ? '#fff4e6' : '#fff'; ctx.strokeStyle = sel >= 0 ? '#e8590c' : '#dee2e6'; ctx.lineWidth = 2;
          D.roundRect(ctx, c.x - c.w / 2, c.y0, c.w, c.y1 - c.y0, 12); ctx.fill(); ctx.stroke();
          TH.engine(ctx, { x: c.x, y: c.y0 + 54 * c.s, s: c.s, phi: st.phis[i], type: st.type, mirror: st.mirror, F, arrow: true, spark: true, plain: true, flow: false, t });
          D.text(ctx, GAN[i] + (sel >= 0 ? '（第 ' + (sel + 1) + ' 个）' : ''), c.x, c.y1 - 10, { size: F(15), weight: 800, align: 'center', color: sel >= 0 ? '#e8590c' : '#343a40' });
        });
      }
    }
    next();
  });

  /* ================= 汽油机和柴油机 ================= */
  PS.register('pd-compare', function (el) {
    const VW = 1000;
    const st = { phi: 0, run: true, speed: 60, target: null };
    const runB = PS.ui.button('⏸ 暂停', () => { st.run = !st.run; st.target = null; runB.innerHTML = st.run ? '⏸ 暂停' : '▶ 运转'; }, 'btn btn-primary btn-sm');
    const sp = PS.ui.seg([{ value: 30, label: '很慢' }, { value: 60, label: '慢' }, { value: 140, label: '快' }], st.speed, (v) => { st.speed = v; });
    el.append(PS.ui.row(runB, PS.ui.button('下一个冲程 ⏭', () => { st.run = false; runB.innerHTML = '▶ 运转'; st.target = (Math.floor(st.phi / 180 + 1e-6) + 1) * 180 + 90; }, 'btn btn-sm'), sp.el));
    const S = EN.stage(el, { VW, vh: (w) => (EN.narrow(w) ? 720 : 590), draw });
    const TXT = {
      petrol: ['吸入<b>汽油和空气的混合物</b>', '压缩混合物，温度升高', '火花塞产生<b>电火花</b>，点燃混合物（<b>点燃式</b>）；燃气推动活塞做功', '排出废气'],
      diesel: ['只吸入<b>空气</b>', '压缩空气，压缩程度更大，温度更高（超过柴油的燃点）', '喷油嘴喷出<b>雾状柴油</b>，遇到高温空气自动燃烧（<b>压燃式</b>）；燃气推动活塞做功', '排出废气'],
    };
    const msg = h('div', { class: 'he-two' });
    const mp = h('div', { class: 'th-msg' }), md = h('div', { class: 'th-msg' });
    msg.append(mp, md); el.append(msg);
    let lastK = -1;
    PS.loop((dt) => {
      if (st.run) st.phi = (st.phi + st.speed * dt) % 720;
      else if (st.target != null) { st.phi += Math.min(st.target - st.phi, 200 * dt); if (st.phi >= st.target - 1e-6) { st.phi = st.target % 720; st.target = null; } }
      const k = Math.floor(st.phi / 180);
      if (k !== lastK) { lastK = k; mp.innerHTML = '<b>汽油机 · ' + STROKES[k].n + '</b><br>' + TXT.petrol[k]; md.innerHTML = '<b>柴油机 · ' + STROKES[k].n + '</b><br>' + TXT.diesel[k]; }
      S.render();
    }, el).start();
    // 汽缸内气体温度（示意）：绝热压缩 T ∝ V^(1−γ)
    function gasT(phi, diesel) {
      const k = Math.floor(phi / 180), f = (phi % 180) / 180, eps = diesel ? 16 : 8;
      const v = (p) => { const th = (p * Math.PI) / 180, x = 1 - Math.cos(th); return 1 / eps + (1 - 1 / eps) * x / 2; };
      if (k === 0) return 300;
      if (k === 1) return 300 * Math.pow(1 / v(phi), 0.4);
      if (k === 2) { const T3 = 2300; return T3 * Math.pow((1 / eps) / v(phi), 0.4); }
      return 900 - 300 * f;
    }
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, VW, VH), n = EN.narrow(w), t = performance.now() / 1000;
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const s = n ? 0.95 : 0.88, y0 = n ? 150 : 112;
      [['petrol', '汽油机', 250], ['diesel', '柴油机', 750]].forEach(([type, name, x]) => {
        D.text(ctx, name, x - 30, n ? 50 : 36, { size: F(18), weight: 800, align: 'center', color: type === 'petrol' ? '#e8590c' : '#495057' });
        TH.engine(ctx, { x: x - 30, y: y0, s, phi: st.phi, type, F, labels: !n, arrow: true, t, fly: true });
        if (n) D.text(ctx, type === 'petrol' ? '火花塞' : '喷油嘴', x - 30, y0 - 60 * s, { size: F(13), weight: 700, align: 'center', color: '#343a40' });
        // 温度条（示意）
        const T = gasT(st.phi, type === 'diesel'), bx = x + 175, by0 = y0 + 30, bh = n ? 300 : 340;
        ctx.fillStyle = '#e9ecef'; D.roundRect(ctx, bx - 12, by0, 24, bh, 10); ctx.fill();
        const fr = PS.clamp((T - 250) / 2000, 0.02, 1);
        ctx.fillStyle = TH.heatColor(fr); D.roundRect(ctx, bx - 12, by0 + bh * (1 - fr), 24, bh * fr, 10); ctx.fill();
        D.text(ctx, '缸内', bx, by0 + bh + F(13) * 1.2, { size: F(12), weight: 700, align: 'center', color: '#495057' });
        D.text(ctx, '温度', bx, by0 + bh + F(13) * 2.4, { size: F(12), weight: 700, align: 'center', color: '#495057' });
      });
      const k = Math.floor(st.phi / 180), S0 = STROKES[k];
      D.text(ctx, S0.n + (k === 1 || k === 2 ? '：' + S0.E : '：靠飞轮的惯性完成'), 500, VH - 16, { size: F(15), weight: 800, align: 'center', color: S0.c, bg: 'rgba(255,255,255,.9)' });
    }
  });

  /* ================= 转速与做功次数 ================= */
  PS.register('rpm-count', function (el) {
    const VW = 1000, COLS = 30;
    const st = { n: 1800, play: 0, t: 0, dur: 6 };
    const sl = PS.ui.slider({ label: '飞轮转速', min: 600, max: 3600, step: 600, value: st.n, unit: 'r/min', onInput: (v) => { st.n = v; st.play = 0; st.t = 0; const r = Math.round(vh(S.w || 1000)); if (r !== S.VH) S.stage.style.aspectRatio = VW + ' / ' + r; S.render(); tell(); } });
    const playB = PS.ui.button('▶ 慢放这 1 s', () => { st.play = 1; st.t = 0; st.dur = 3 + st.n / 600; }, 'btn btn-primary btn-sm');
    el.append(PS.ui.row(sl.el, playB));
    const vh = (w) => { const rows = Math.ceil(st.n / 30 / (EN.narrow(w) ? 20 : COLS)); return EN.narrow(w) ? 700 + rows * 56 : Math.max(320, 300 + rows * 34); };
    const S = EN.stage(el, { VW, vh, draw });
    const msg = h('div', { class: 'th-msg info' });
    el.append(msg);
    const q = h('div', { class: 'th-q' }), inp = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', autocomplete: 'off', placeholder: '答案' }), unit = h('span', null, '次'), qfb = h('div', { class: 'th-msg' });
    el.append(q, h('div', { class: 'th-ans' }, inp, unit, PS.ui.button('提交', check, 'btn btn-primary btn-sm'), PS.ui.button('换一题', ask, 'btn btn-ghost btn-sm')), qfb);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    let Q = null;
    function ask() {
      const n = PS.pick([1200, 1800, 2400, 3000, 3600, 4800]), r = n / 60;
      const T = PS.pick([
        ['每秒对外做功多少次？', r / 2, '次', '飞轮每秒转 ' + r + ' 周；每转 2 周做功 1 次，所以每秒做功 ' + r / 2 + ' 次。'],
        ['每秒完成多少个冲程？', r * 2, '个', '飞轮每秒转 ' + r + ' 周；每转 1 周完成 2 个冲程，所以每秒完成 ' + r * 2 + ' 个冲程。'],
        ['每秒完成多少个工作循环？', r / 2, '个', '一个工作循环飞轮转 2 周，每秒转 ' + r + ' 周，完成 ' + r / 2 + ' 个工作循环。'],
        ['活塞每秒往复多少次？', r, '次', '飞轮转 1 周，活塞往复 1 次，所以活塞每秒往复 ' + r + ' 次。'],
        ['每分钟对外做功多少次？', n / 2, '次', '每转 2 周做功 1 次：' + n + ' ÷ 2 = ' + n / 2 + ' 次。'],
      ]);
      Q = { a: T[1], sol: T[3] };
      q.innerHTML = '<b>算一算：</b>一台四冲程汽油机的飞轮转速是 ' + n + ' r/min，它' + T[0];
      unit.textContent = T[2]; inp.value = ''; inp.disabled = false;
      qfb.className = 'th-msg'; qfb.innerHTML = '先把转速换算成每秒转多少周（÷ 60）。';
    }
    function check() {
      if (!Q || inp.disabled) return;
      const v = TH.parse(inp.value); if (isNaN(v)) return;
      const good = Math.abs(v - Q.a) < 1e-9; inp.disabled = true;
      qfb.className = 'th-msg ' + (good ? 'ok' : 'bad'); qfb.innerHTML = (good ? '✔ 正确！' : '✘ 答案是 ' + Q.a + '。') + Q.sol;
      good ? PS.sound.good() : PS.sound.bad();
    }
    function tell() {
      const r = st.n / 60;
      msg.innerHTML = '转速 ' + st.n + ' r/min = <b>' + r + ' r/s</b>：1 s 内飞轮转 <b>' + r + '</b> 周，活塞往复 <b>' + r + '</b> 次，完成 <b>' + r * 2 + '</b> 个冲程、<b>' + r / 2 + '</b> 个工作循环，对外做功 <b>' + r / 2 + '</b> 次。';
    }
    let lastS = -1;
    PS.loop((dt) => {
      if (st.play) {
        st.t = Math.min(st.dur, st.t + dt);
        const strokes = Math.floor(((st.t / st.dur) * st.n) / 30 + 1e-9);
        if (strokes !== lastS) { lastS = strokes; if (strokes % 4 === 3 && strokes > 0) PS.sound.tick(); }
        if (st.t >= st.dur) { st.play = 0; st.t = st.dur; PS.sound.ping(); }
      }
      S.render();
    }, el).start();
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, VW, VH), nar = EN.narrow(w), t = performance.now() / 1000;
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const r = st.n / 60, frac = st.dur ? st.t / st.dur : 0, revs = frac * r, total = r * 2;
      const done = Math.floor(revs * 2 + 1e-9), phi = revs * 360;
      TH.engine(ctx, { x: nar ? 250 : 150, y: nar ? 56 : 44, s: nar ? 0.95 : 0.62, phi, type: 'petrol', F, arrow: false, t, flow: false });
      D.text(ctx, '时间：' + PS.fmt(frac, 2) + ' s', nar ? 750 : 640, nar ? 60 : 48, { size: F(16), weight: 800, align: 'center', color: '#1b2333' });
      const items = [['飞轮转数', PS.fmt(Math.floor(revs + 1e-9), 0) + ' 周', '#495057'], ['活塞往复', PS.fmt(Math.floor(revs + 1e-9), 0) + ' 次', '#495057'], ['冲程数', done + ' 个', '#1c7ed6'], ['做功次数', Math.floor((done + 1) / 4 + 1e-9) + ' 次', '#e03131']];
      items.forEach(([a, b, c], i) => {
        const x = nar ? 560 + (i % 2) * 230 : 380 + i * 155, y = nar ? 140 + Math.floor(i / 2) * 170 : 90;
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#dee2e6'; ctx.lineWidth = 2; D.roundRect(ctx, x - (nar ? 105 : 70), y, nar ? 210 : 140, nar ? 150 : 100, 10); ctx.fill(); ctx.stroke();
        D.text(ctx, a, x, y + F(13) * 1.4, { size: F(13), weight: 700, align: 'center', color: '#868e96' });
        D.text(ctx, b, x, y + (nar ? 110 : 76), { size: F(20), weight: 800, align: 'center', color: c });
      });
      // 冲程时间线
      const x0 = nar ? 30 : 350, x1 = 970, y0 = nar ? 520 : 230, rh = nar ? 56 : 34, cols = nar ? 20 : COLS, cw = (x1 - x0) / cols;
      D.text(ctx, '1 s 内的冲程（吸 压 做 排 依次重复）：', x0, y0 - 12, { size: F(13), weight: 700, color: '#495057' });
      for (let i = 0; i < total; i++) {
        const kk = i % 4, x = x0 + (i % cols) * cw, y = y0 + Math.floor(i / cols) * rh;
        ctx.fillStyle = i < done ? STROKES[kk].c : '#e9ecef'; ctx.globalAlpha = i < done ? (kk === 2 ? 1 : 0.55) : 1;
        D.roundRect(ctx, x + 1.5, y, cw - 3, rh - 8, 4); ctx.fill(); ctx.globalAlpha = 1;
        if (kk === 2 && i < done && cw > 22) D.text(ctx, '做', x + cw / 2, y + (rh - 8) / 2 + 1, { size: F(11, 9), weight: 800, align: 'center', baseline: 'middle', color: '#fff' });
      }
      const ly = y0 + Math.ceil(total / cols) * rh + F(13) * 1.4;
      STROKES.forEach((s, i) => { const x = x0 + i * (nar ? 240 : 150); ctx.fillStyle = s.c; ctx.globalAlpha = i === 2 ? 1 : 0.55; ctx.fillRect(x, ly - F(12), F(12), F(12)); ctx.globalAlpha = 1; D.text(ctx, s.n, x + F(12) + 6, ly, { size: F(12), color: '#495057' }); });
      (nar ? ['一个工作循环：飞轮转 2 周，活塞往复 2 次，', '4 个冲程，对外做功 1 次。'] : ['一个工作循环：飞轮转 2 周，活塞往复 2 次，4 个冲程，对外做功 1 次。']).forEach((s, i) => D.text(ctx, s, nar ? 500 : 660, ly + F(14) * (1.9 + i * 1.3), { size: F(13), weight: 700, align: 'center', color: '#e8590c' }));
    }
    tell(); ask();
  });

  /* ================= 分一分：汽油机还是柴油机 ================= */
  PS.register('pd-sort', function (el) {
    PS.sortCards(el, [
      ['汽缸顶部有火花塞', 0, '汽油机用火花塞点火。'],
      ['汽缸顶部有喷油嘴', 1, '柴油机在压缩冲程末由喷油嘴喷出雾状柴油。'],
      ['吸气冲程吸入汽油和空气的混合物', 0, ''],
      ['吸气冲程只吸入空气', 1, ''],
      ['点火方式是点燃式', 0, '火花塞产生电火花，点燃混合物。'],
      ['点火方式是压燃式', 1, '压缩冲程末空气的温度超过柴油的燃点，柴油自动燃烧。'],
      ['一个工作循环由四个冲程组成', 2, '吸气、压缩、做功、排气。'],
      ['只有做功冲程对外做功，其余三个冲程靠飞轮的惯性完成', 2, ''],
      ['压缩冲程末，汽缸内气体的温度更高、压强更大', 1, '柴油机的压缩程度更大。'],
      ['比较轻巧，常用于小汽车、摩托车', 0, ''],
      ['比较笨重，功率大，常用于载重汽车、拖拉机、轮船', 1, ''],
      ['燃料在汽缸内燃烧，属于内燃机', 2, ''],
      ['效率较高，约 30%～45%', 1, '汽油机的效率约 20%～30%。'],
      ['压缩冲程把机械能转化为内能', 2, ''],
    ], ['汽油机', '柴油机', '两者都是']);
  });

  /* 本文件的样式 */
  if (!document.getElementById('he-style')) document.head.append(h('style', { id: 'he-style' }, `
    .he-chain{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:8px}
    .he-box{border:2px solid var(--line);background:var(--surface-2);color:var(--muted);border-radius:10px;padding:4px 10px;font-weight:700;font-size:.92rem;transition:all .3s}
    .he-arr{color:var(--line-2);font-size:.85rem;font-weight:700;transition:color .3s}
    .he-arr.on{color:#e8590c}
    .he-two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;margin-top:8px}
    .he-two .th-msg{margin:0}
    @media (max-width:560px){.he-two{grid-template-columns:minmax(0,1fr)}}
    .he-box.on.g{border-color:#2b8a3e;background:#ebfbee;color:#2b8a3e}
    .he-box.on.o{border-color:#e8590c;background:#fff4e6;color:#e8590c}
    .he-box.on.r{border-color:#e03131;background:#fff5f5;color:#e03131}
    .he-box.on.b{border-color:#3b5bdb;background:#edf2ff;color:#3b5bdb}
  `));
})();
